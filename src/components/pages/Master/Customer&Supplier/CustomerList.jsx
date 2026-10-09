import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Plus, Trash2, UsersRound, Phone, Mail } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import { checkPageAccess } from "@/lib/checkPrivilege";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import axiosInstance from "@/lib/axiosConfig";
import TableSearchBar from "@/components/elements/theme/TableSearchBar";
import usePrivileges from "@/lib/hooks/usePrivileges";
import { useSelector } from "react-redux";

const CustomerList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedBranchId } = useAuth();
  (selectedBranchId);
  const { generalSettings } = useSelector((state) => state.settings);


  // Helper function to get branch-specific opening balance
  const getBranchOpeningBalance = (branchArray) => {
    if (!branchArray || !Array.isArray(branchArray)) return { balance: 0, crOrDr: "" };

    const branchData = branchArray.find(b => b.branchId === Number(selectedBranchId));
    if (!branchData) return { balance: 0, crOrDr: "" };

    return {
      balance: branchData.openingBalance || 0,
      crOrDr: branchData.crOrDr || ""
    };
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();

    return data.filter((item) => {
      const branchBalance = getBranchOpeningBalance(item.branchId);

      return (
        item.ledgerCode?.toString().toLowerCase().includes(lowerSearch) ||
        item.ledgerName?.toLowerCase().includes(lowerSearch) ||
        item.ledgerType?.toLowerCase().includes(lowerSearch) ||
        item.groupId?.toString().toLowerCase().includes(lowerSearch) ||
        branchBalance.balance?.toString().toLowerCase().includes(lowerSearch) ||
        branchBalance.crOrDr?.toLowerCase().includes(lowerSearch) ||
        item.email?.toLowerCase().includes(lowerSearch) ||
        item.tinNumber?.toLowerCase().includes(lowerSearch) ||
        item.phoneNo?.toString().toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, searchTerm, selectedBranchId]);

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const columns = [
    { key: "SNo", label: t("customer.columns.sno"), sortable: true },
    { key: "ledgerCode", label: t("customer.columns.code"), width: "100px" },
    { key: "ledgerName", label: t("customer.columns.name"), sortable: true },
    { key: "tinNumber", label: t("customer.columns.tinNumber"), },
    { key: "openingBalance", label: t("customer.columns.openingBalance"), align: "right" },
    { key: "email", label: t("Email"), sortable: false },

    { key: "phoneNo", label: t("customer.columns.contact"), sortable: false },
  ];

  // ✅ Privilege check first
  const { privileges, loading: privilegeLoading, hasAccess, message } =
    usePrivileges("Customer");

  // ✅ Custom renderCell function
  const renderCell = (key, row) => {
    if (key === "openingBalance") {
      const { balance, crOrDr } = getBranchOpeningBalance(row.branchId);
      const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
      
      const val = parseFloat(balance) || 0;
      const absVal = Math.abs(val);

      if (isCrDr) {
        return (
          <div className="text-sm flex justify-end items-center pr-4">
            <span className="font-medium">{absVal.toFixed(generalSettings?.decimalPart || 2)}</span>
            {crOrDr && (
              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${crOrDr === "Dr"
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                }`}>
                {crOrDr}
              </span>
            )}
          </div>
        );
      } else {
        const isNeg = val < 0 || (crOrDr === "Cr" && absVal !== 0);
        return (
          <div className="text-sm font-medium flex justify-end pr-4">
            {isNeg ? "-" : ""}{absVal.toFixed(generalSettings?.decimalPart || 2)}
          </div>
        );
      }
    }

    if (key === "contact") {
      return (
        <div className="text-sm">
          {row.phoneNo && (
            <>
              <div className="flex items-center gap-1 mb-1">
                <Phone className="h-3 w-3 text-gray-500" />
                <span>{row.phoneNo}</span>
              </div>
            </>
          )}
          {row.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-gray-500" />
              <span className="truncate max-w-[200px]" title={row.email}>
                {row.email}
              </span>
            </div>
          )}
          {!row.phoneNo && !row.email && (
            <span className="text-gray-400 text-sm">{t("customer.noContactInfo")}</span>
          )}
        </div>
      );
    }
    return row[key] ?? "-";
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]); // Re-fetch when branch changes

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("customer-supplier-account-ledgers", {
        ledgerTypes: ["Customer","Customer&Supplier"],
        branchId: selectedBranchId
      });
      if (res.data && !res.data.error) {

        setData(res.data.data);
      } else {
        console.error("API Error:", res.data.message);
      }
    } catch (err) {
      console.error("Error fetching Account Ledgers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const accountLedger = data.find((item) => item.ledgerId === id);

    if (accountLedger?.default) {
      setAlert({
        id: Date.now(),
        type: "error",
        message: "This is marked as default and cannot be deleted"
      });
      return;
    }

    if (!privileges?.can_delete) return;

    const result = await Swal.fire({
      title: t("delete.title"),
      text: t("delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("delete.confirm"),
      cancelButtonText: t("delete.cancel"),
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axiosInstance.get(`delete-account-ledger/${id}`);
      if (!res.data.error) {
        setAlert({ type: "success", message: t("deleteSuccess") });
        fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Error deleting Product";
      const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
        ? t("foreeignKeyError")
        : errorMessage;

      setAlert({
        id: Date.now(),
        type: "error",
        message: finalMessage,
      });
      console.error(error);
    }
  };

  // ✅ Build actions dynamically based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) =>
        navigate(`/master/customer/edit-customer/${row.ledgerId}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: t("edit"),
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.ledgerId),
      tooltip: t("delete.title"),
    });
  }

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("customer.breadcrumb.master"), url: "#" },
            { title: t("customer.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: UsersRound, title: t("customer.heading") }}
        />
        <Preloader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("customer.breadcrumb.master"), url: "#" },
            { title: t("customer.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: UsersRound, title: t("customer.heading") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  return (
    <div>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <BreadCrumb
        routes={[
          { title: t("customer.breadcrumb.master"), url: "#" },
          { title: t("customer.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: UsersRound, title: t("customer.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: t("createNewBtn"),
                icon: Plus,
                type: "primary",
                onClick: () => navigate("/master/customer/add-customer"),
              },
            ]
            : []
        }
      />
      <div className="w-full dark:bg-[#121212] p-1 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={filteredData}
            actions={actions}
            showPagination={true}
            renderCell={renderCell}
            staticSearchable
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerList;