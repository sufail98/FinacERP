import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import { Edit, PackageSearch, Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import AddTaxMatser from "./AddTaxMatser";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

const TaxMaster = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const {
    privileges,
    loading: privilegeLoading,
    hasAccess,
    message,
  } = usePrivileges("Tax Master");
  
  const getData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("tax-masters");
      setData(response.data.data || []);
    } catch (error) {
      console.error(error);
      setAlert({ type: "error", message: t("taxMaster.alerts.fetchError") });
    } finally {
      setLoading(false);
    }
  }, [t, setLoading, setData, setAlert]);
  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      getData();
    }
  }, [hasAccess, privilegeLoading, getData]);



  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: t("taxMaster.alerts.deletePermission") });
      return;
    }
 
  if (id === 1) {
    setAlert({ type: "error", message: t("DefaultDataMsg") });
    return;
  }
    const result = await Swal.fire({
      title: t("taxMaster.deleteConfirm.title"),
      text: t("taxMaster.deleteConfirm.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("taxMaster.deleteConfirm.confirm"),
      cancelButtonText: t("taxMaster.deleteConfirm.cancel"),
    });

    if (!result.isConfirmed) return;
    try {
      await axiosInstance.get(`delete-tax-master/${id}`);
      getData();
      setAlert({ type: "success", message: t("taxMaster.alerts.deleteSuccess") });
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

  const handleEdit = (row) => {
    if (!privileges?.can_edit) {
      setAlert({ type: "error", message: t("taxMaster.alerts.editPermission") });
      return;
    }
    setEditId(row.taxId);
    setOpen(true);
  };

  // ✅ Build actions dynamically
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      className: "text-green-600 hover:text-green-800",
      tooltip: t("taxMaster.actions.edit"),
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.taxId),
      tooltip: t("taxMaster.actions.delete"),
    });
  }

  if (privilegeLoading || loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: "Master", url: "#" },
            { title: "Tax Master", url: "#" },
          ]}
          heading={{ icon: PackageSearch, title: "Tax Master" }}
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
            { title: t("taxMaster.breadcrumb.master"), url: "#" },
            { title: t("taxMaster.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: PackageSearch, title: t("taxMaster.heading") }}
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
          { title: t("taxMaster.breadcrumb.master"), url: "#" },
          { title: t("taxMaster.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: PackageSearch, title: t("taxMaster.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: t("taxMaster.actions.createNew"),
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
      <div className="p-2">
        <ContentTable
          columns={[
            { key: "SNo", label: t("taxMaster.columns.sno"), sortable: true },
            { key: "taxName", label: t("taxMaster.columns.taxName"), sortable: true },
            { key: "rate", label: t("taxMaster.columns.rate"), sortable: true },
            { key: "calculatingMode", label: t("taxMaster.columns.calculatingMode"), sortable: true },
            { key: "narration", label: t("taxMaster.columns.narration"), sortable: true },
          ]}
          data={data}
          actions={actions}
          showPagination
          searchable
        />
      </div>
      {(privileges?.can_add || privileges?.can_edit) && (
        <AddTaxMatser
          open={open}
          handleClose={() => setOpen(false)}
          onSuccess={getData}
          editId={editId}
        />
      )}
    </div>
  );
};

export default TaxMaster;
