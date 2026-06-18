import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Plus, HandCoins } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import AddMasterModal from "./AddMasterModal";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { checkPageAccess } from "@/lib/checkPrivilege";
import useAuth from "@/redux/hook/auth/useAuth";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import usePrivileges from "@/lib/hooks/usePrivileges";

const CostCenter = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation();
  const { selectedBranchId } = useAuth();

  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Cost Center");

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("cost-centres");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching cost centers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl+C to create new (only when no text selected)
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

        // Prevent default and open modal
        e.preventDefault();
        e.stopPropagation();

        if (open) return;

        if (!privileges?.can_add) {
          setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add cost centers' });
          return;
        }

        setMode("add");
        setSelectedId(null);
        setOpen(true);
        return;
      }

      // Escape - Close modal
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setSelectedId(null);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [privileges, open]);

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete cost centers" });
      return;
    }

    if (id === 1) {
      setAlert({ type: "error", message: t("DefaultDataMsg") });
      return;
    }

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
      const response = await axiosInstance.get(`delete-cost-centre/${id}`);
      if (!response.data.error) {
        setAlert({ type: "success", message: response.data.message });
        fetchData();
      }
    } catch (error) {
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

  const columns = [
    { key: "SNo", label: t("costCenter.columns.sno"), sortable: true },
    { key: "CostCentre", label: t("costCenter.columns.costCentre"), sortable: true },
    { key: "Narration", label: t("costCenter.columns.narration"), sortable: true }
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.costCentreId);
        setMode("edit");
        setOpen(true);
      },
      className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: "Edit",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => handleDelete(row.costCentreId),
      tooltip: "Delete",
    });
  }

  if (loading || privilegeLoading) return (
    <div>
      <BreadCrumb
        routes={[
          { title: t("costCenter.breadcrumb.master"), url: "#" },
          { title: t("costCenter.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: HandCoins, title: t("costCenter.heading") }}
        actions={[
          {
            label: "Create New",
            type: "primary",
            icon: Plus,
            onClick: () => {
              setMode("add");
              setSelectedId(null);
              setOpen(true);
            },
          },
        ]}
      />
      <Preloader />
    </div>
  );

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("costCenter.breadcrumb.master"), url: "#" },
            { title: t("costCenter.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: HandCoins, title: t("costCenter.heading") }}
          actions={
            privileges?.can_add
              ? [
                {
                  label: t("createNewBtn"),
                  type: "primary",
                  icon: Plus,
                  onClick: () => {
                    setMode("add");
                    setSelectedId(null);
                    setOpen(true);
                  },
                },
              ]
              : []
          }
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
          { title: t("costCenter.breadcrumb.master"), url: "#" },
          { title: t("costCenter.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: HandCoins, title: t("costCenter.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: `${t("createNewBtn")} (Ctrl+C)`,
                type: "primary",
                icon: Plus,
                onClick: () => {
                  setMode("add");
                  setSelectedId(null);
                  setOpen(true);
                },
              },
            ]
            : []
        }
      />

      {/* ✅ Updated wrapper with consistent dark mode colors */}
      <div className="w-full bg-white dark:bg-[#1e1e1e] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            searchable={true}
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
          />
        </div>
      </div>

      <AddMasterModal
        open={open}
        handleClose={() => setOpen(false)}
        title="Cost Center"
        heading="Add Cost Center"
        mode={mode}
        id={selectedId}
        onSaved={(alert) => {
          fetchData();
          setAlert(alert);
        }}
      />
    </div>
  );
};

export default CostCenter;