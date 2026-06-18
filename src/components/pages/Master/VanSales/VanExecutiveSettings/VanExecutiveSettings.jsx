import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Settings2, Plus, Trash2 } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import Swal from "sweetalert2";
import useAuth from "@/redux/hook/auth/useAuth";

const VanExecutiveSettings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { selectedBranchId } = useAuth();

  const columns = [
    { key: "SNo", label: "#", sortable: true },
    { key: "executiveName", label: "Executive", sortable: true },
    { key: "cashAccountName", label: "Cash Account", sortable: true },
    { key: "salesAccountName", label: "Sales Account", sortable: true },
    { key: "bankAccountName", label: "Bank Account", sortable: true },
    { key: "salesTargetAmount", label: "Target Amount", sortable: true },
  ];

  useEffect(() => {
    if (selectedBranchId) fetchData();
  }, [selectedBranchId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) return;
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA"
        ) {
          if (activeElement.selectionStart !== activeElement.selectionEnd) return;
        }
        e.preventDefault();
        e.stopPropagation();
        navigate("/master/van-sales/van-executive-settings/create");
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate]);

  const getRowId = (row) => {
    // Try every possible ID field name
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase();
      if (
        keyLower.includes("settingsid") ||
        keyLower.includes("settings_id") ||
        keyLower === "id"
      ) {
        return row[key];
      }
    }
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch settings + executives + ledgers in parallel
      const [settingsRes, execRes, generalRes, bankRes] = await Promise.all([
        axiosInstance.get(`van-exicutive-settings/${selectedBranchId}`),
        axiosInstance.get(`van-exicutive/${selectedBranchId}`),
        axiosInstance.post("account-ledgers", {
          group_ids: [5, 6, 28, 29],
          branchId: selectedBranchId,
        }),
        axiosInstance.post("bank-account-ledgers", {
          group_ids: [5, 6],
          branchId: selectedBranchId,
        }),
      ]);

      const settings = settingsRes.data?.data || [];
      const executives = execRes.data?.data || [];
      const generalLedgers = generalRes.data?.data || [];
      const bankLedgers = bankRes.data?.data || [];

 

      // Build lookup maps
      const execMap = {};
      executives.forEach((e) => {
        execMap[e.ExecutiveId] = e.ExecutiveName;
      });

      const ledgerMap = {};
      [...generalLedgers, ...bankLedgers].forEach((l) => {
        if (l.ledgerId && !ledgerMap[l.ledgerId]) {
          ledgerMap[l.ledgerId] = l.ledgerName;
        }
      });

      // Enrich settings data with resolved names
      const enriched = settings.map((item) => {
        // Handle both camelCase and PascalCase field names from API
        const execId = item.executiveId ?? item.ExecutiveId;
        const cashId = item.cashAccountLedgerId ?? item.CashAccountLedgerId;
        const salesId = item.salesAccountLedgerId ?? item.SalesAccountLedgerId;
        const bankId = item.bankAccountLedgerId ?? item.BankAccountLedgerId;
        const targetAmt = item.salesTargetAmount ?? item.SalesTargetAmount;

        return {
          ...item,
          executiveName: execMap[execId] || `ID: ${execId}`,
          cashAccountName: ledgerMap[cashId] || `ID: ${cashId}`,
          salesAccountName: ledgerMap[salesId] || `ID: ${salesId}`,
          bankAccountName: ledgerMap[bankId] || `ID: ${bankId}`,
          salesTargetAmount: targetAmt,
        };
      });

      setData(enriched);
    } catch (err) {
      console.error("Error fetching van executive settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    const id = getRowId(row);
    if (!id) {
      console.error("Cannot find ID. Row keys:", Object.keys(row));
      setAlert({
        id: Date.now(),
        type: "error",
        message: "Cannot identify record ID",
      });
      return;
    }

    const result = await Swal.fire({
      title: t("delete.title") || "Are you sure?",
      text: t("delete.text") || "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("delete.confirm") || "Yes, delete it!",
      cancelButtonText: t("delete.cancel") || "Cancel",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await axiosInstance.get(
        `van-exicutive-settings/delete/${id}`
      );
      if (!res.data.error) {
        setAlert({
          id: Date.now(),
          type: "success",
          message: "Settings deleted successfully!",
        });
        fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete";
      const finalMessage = errorMessage
        .toLowerCase()
        .includes("foreign key violation")
        ? t("foreeignKeyError") || "Cannot delete: record is in use"
        : errorMessage;
      setAlert({ id: Date.now(), type: "error", message: finalMessage });
    }
  };

  const handleEdit = (row) => {
    const id = getRowId(row);
    if (!id) {
      console.error("Cannot find ID. Row keys:", Object.keys(row));
      setAlert({
        id: Date.now(),
        type: "error",
        message: "Cannot identify record ID",
      });
      return;
    }
    navigate(`/master/van-sales/van-executive-settings/edit/${id}`);
  };

  const actions = [
    {
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleEdit(row),
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row),
      tooltip: "Delete",
    },
  ];

  const breadcrumbConfig = {
    routes: [
      { title: t("bank.breadcrumb.master") || "Master", url: "#" },
      { title: "Van Sales", url: "#" },
      { title: "Van Executive Settings", url: "#" },
    ],
    heading: { icon: Settings2, title: "Van Executive Settings" },
    actions: [
      {
        label: `${t("createNewBtn") || "Create New"} (Ctrl+C)`,
        icon: Plus,
        type: "primary",
        onClick: () =>
          navigate("/master/van-sales/van-executive-settings/create"),
      },
    ],
  };

  if (loading) {
    return (
      <div>
        <BreadCrumb {...breadcrumbConfig} />
        <Preloader />
      </div>
    );
  }

  return (
    <div>
      {alert && (
        <AlertBox key={alert.id} message={alert.message} type={alert.type} />
      )}
      <BreadCrumb {...breadcrumbConfig} />

      <div className="w-full dark:bg-[#121212] p-1 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
            renderCell={(key, row) => {
              if (key === "salesTargetAmount") {
                const val = Number(row[key] || 0);
                return (
                  <span className="font-mono">
                    {val.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                );
              }

              const value = row[key];
              if (value === null || value === undefined) return "-";
              if (typeof value === "boolean") return value ? "Yes" : "No";
              return String(value);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default VanExecutiveSettings;