import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Landmark, Plus, Trash2 } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import Swal from "sweetalert2";
import TableSearchBar from "@/components/elements/theme/TableSearchBar";
import useAuth from "@/redux/hook/auth/useAuth";

const Bank = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Bank");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { selectedBranchId } = useAuth()

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((item) =>
      item.ledgerCode?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bankname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bankBranchName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  const handleClearSearch = () => {
    setSearchTerm("");
  };
  const columns = [
    { key: "SNo", label: t("bank.columns.sno"), sortable: true },
    { key: "ledgerCode", label: t("bank.columns.ledgerCode"), sortable: true },
    { key: "ledgerName", label: t("bank.columns.bankName"), sortable: true },
    { key: "bankBranchName", label: t("bank.columns.bankBranchName"), sortable: true },
  ];

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchData();
    }
  }, [hasAccess, privilegeLoading, selectedBranchId]);

  // Keyboard shortcut: Ctrl+C to create new bank
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+C - Create New (only if no text is selected)
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {

        // Check if any text is selected on page
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) {
          return; // Allow normal copy
        }

        // Check if user is in an input/textarea with text selected
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA';

        if (isInputField) {
          const selectionStart = activeElement.selectionStart;
          const selectionEnd = activeElement.selectionEnd;

          if (selectionStart !== selectionEnd) {
            return; // Allow normal copy
          }
        }

        // Prevent default and navigate to create
        e.preventDefault();
        e.stopPropagation();

        if (!privileges?.can_add) {
          setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add banks' });
          return;
        }

        navigate("/master/bank/create");
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [privileges, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [5, 6], branchId: selectedBranchId });
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
      setAlert({ id: Date.now(), type: "error", message: "This is marked as default and cannot be deleted" });
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
        setAlert({ type: "success", message: t("bank.delete.success") });
        fetchData()
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message;
      const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
        ? t("foreeignKeyError")
        : errorMessage;

      setAlert({
        id: Date.now(),
        type: "error",
        message: finalMessage,
      });
    }
  };


  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/master/bank/edit-bank/${row.ledgerId}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.ledgerId),
      tooltip: "Delete",
    });
  }

  if (privilegeLoading || loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("bank.breadcrumb.master"), url: "#" },
            { title: t("bank.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Landmark, title: t("bank.heading") }}
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
            { title: t("bank.breadcrumb.master"), url: "#" },
            { title: t("bank.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Landmark, title: t("bank.heading") }}
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
          { title: t("bank.breadcrumb.master"), url: "#" },
          { title: t("bank.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Landmark, title: t("bank.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: `${t("createNewBtn")} (Ctrl+C)`,
                icon: Plus,
                type: "primary",
                onClick: () => navigate("/master/bank/create"),
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
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
          />

        </div>
      </div>
    </div>
  );
};

export default Bank;