import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import { Card, CardContent } from "@/components/ui/card";
import { CircleDollarSign, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import CreateCurrency from "./CreateCurrency";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

const CurrencyList = () => {
  const { privileges, loading: privilegeLoading, hasAccess, message } =
    usePrivileges("Currency");
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [data, setData] = useState([]);

  // ✅ Fetch currencies only if user has access
  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      getData();
    }
  }, [hasAccess, privilegeLoading]);

  const getData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("currencies");
      setData(response.data.data);
    } catch (error) {
      console.error(error);
      setAlert({ type: "error", message: "Error fetching currencies" });
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
          setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add currencies' });
          return;
        }

        setEditId(null);
        setOpen(true);
        return;
      }

      // Escape - Close modal
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setEditId(null);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [privileges, open]);

  const columns = [
    { key: "SNo", label: t("currency.columns.sno"), sortable: true },
    { key: "currencySymbol", label: t("currency.columns.currencySymbol"), sortable: true },
    { key: "currencyName", label: t("currency.columns.currencyName"), sortable: true },
    { key: "subunitName", label: t("currency.columns.subunitName"), sortable: true },
    { key: "noOfDecimalPlace", label: t("currency.columns.noOfDecimalPlace"), sortable: true },
    { key: "narration", label: t("currency.columns.narration"), sortable: true },
  ];

  const handleDelete = async (id) => {
    const currency = data.find((item) => item.currencyId === id);

    if (currency?.default) {
      setAlert({ id: Date.now(), type: "error", message: "This is marked as default and cannot be deleted" });
      return;
    }

    if (!privileges?.can_delete) {
      setAlert({
        type: "error",
        message: "You do not have permission to delete currencies",
      });
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
      await axiosInstance.get(`delete-currency/${id}`);
      getData();
      setAlert({ type: "success", message: "Currency deleted successfully" });
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
      console.error(error);
    }
  };

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setEditId(row.currencyId);
        setOpen(true);
      },
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.currencyId),
      tooltip: "Delete",
    });
  }

  // ✅ Loading State (Privilege + API)
  if (privilegeLoading || loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("currency.breadcrumb.master"), url: "#" },
            { title: t("currency.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: CircleDollarSign, title: t("currency.heading") }}
          actions={
            privileges?.can_add
              ? [
                {
                  label: t("createNewBtn"),
                  icon: Plus,
                  type: "primary",
                  onClick: () => {
                    setEditId(null);
                    setOpen(true);
                  },
                },
              ]
              : []
          }
        />

        <Preloader />
      </div>
    );
  }

  // ✅ No Access State
  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("currency.breadcrumb.master"), url: "#" },
            { title: t("currency.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: CircleDollarSign, title: t("currency.heading") }}
          actions={
            privileges?.can_add
              ? [
                {
                  label: t("currency.createNewBtn"),
                  icon: Plus,
                  type: "primary",
                  onClick: () => {
                    setEditId(null);
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
    <div className="">
      {/* Alert */}
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <BreadCrumb
        routes={[
          { title: t("currency.breadcrumb.master"), url: "#" },
          { title: t("currency.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: CircleDollarSign, title: t("currency.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: `${t("currency.createNewBtn")} (Ctrl+C)`,
                icon: Plus,
                type: "primary",
                onClick: () => {
                  setEditId(null);
                  setOpen(true);
                },
              },
            ]
            : []
        }
      />

      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            searchable
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
          />
        </div>
      </div>

      {/* Add/Edit Modal Only if user has add/edit privilege */}
      {(privileges?.can_add || privileges?.can_edit) && (
        <CreateCurrency
          open={open}
          editId={editId}
          handleClose={() => {
            setOpen(false);
            setEditId(null);
          }}
          onSaved={() => {
            getData();
          }}
        />
      )}
    </div>
  );
};

export default CurrencyList;