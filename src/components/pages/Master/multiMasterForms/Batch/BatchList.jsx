import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import { Edit, Package, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AddEditBatchModal from "./AddEditBatchModal";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const BatchList = () => {
  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Batch");
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [data, setData] = useState([]);
  const [editData, setEditData] = useState(null);

  const columns = [
    { key: "SNo", label: "#", sortable: true },
    { key: "batchId", label: t("batch.columns.batchId"), sortable: true },
    { key: "batchName", label: t("batch.columns.batchName"), sortable: true },
    { key: "mfdFormatted", label: t("batch.columns.mfd"), sortable: true },
  ];

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      getData();
    }
  }, [hasAccess, privilegeLoading]);

  // Format date based on settings
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());

    const dateFormat = generalSettings?.dateformat || "dd-MM-yyyy";
    return dateFormat
      .replace("dd", dd)
      .replace("MM", mm)
      .replace("yyyy", yyyy);
  };

  const getData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('batches');
      // Add serial number and format date
      const dataWithSNo = response.data.data?.map((item, index) => ({
        ...item,
        SNo: index + 1,
        mfdFormatted: formatDate(item.mfd),
      })) || [];
      setData(dataWithSNo);
    } catch (error) {
      console.error("Error fetching batches:", error);
      setAlert({ id: Date.now(), type: 'error', message: t('batch.alerts.fetchError') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ id: Date.now(), type: "error", message: t("batch.alerts.noDeletePermission") });
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
      await axiosInstance.get(`delete-batch/${id}`);
      getData();
      setAlert({ id: Date.now(), type: "success", message: t("batch.alerts.deleteSuccess") });
    } catch (error) {
      console.error("Error deleting batch:", error);
      const errorMessage = error.response?.data?.message || t("batch.alerts.deleteError");
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

  const handleAddNew = () => {
    if (!privileges?.can_add) {
      setAlert({ id: Date.now(), type: 'error', message: t("batch.alerts.noAddPermission") });
      return;
    }
    setEditData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (row) => {
    if (!privileges?.can_edit) {
      setAlert({ id: Date.now(), type: 'error', message: t("batch.alerts.noEditPermission") });
      return;
    }
    setEditData({
      id: row.batchId,
      ...row
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  const handleSuccess = () => {
    getData();
    setAlert({
      id: Date.now(),
      type: 'success',
      message: editData ? t('batch.alerts.updateSuccess') : t('batch.alerts.createSuccess')
    });
  };

  // Build actions based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleEdit(row),
      className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: t('common.edit')
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => handleDelete(row.batchId),
      tooltip: t('common.delete')
    });
  }

  // Loading state
  if (privilegeLoading || loading) {
    return (
      <div className="bg-gray-50 dark:bg-[#121212] transition-colors">
        <BreadCrumb
          routes={[
            { title: t("batch.breadcrumb.master"), url: "#" },
            { title: t("batch.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Package, title: t("batch.heading") }}
        />
        <Preloader />
      </div>
    );
  }

  // No access state
  if (!hasAccess) {
    return (
      <div className="bg-gray-50 dark:bg-[#121212] transition-colors">
        <BreadCrumb
          routes={[
            { title: t("batch.breadcrumb.master"), url: "#" },
            { title: t("batch.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Package, title: t("batch.heading") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#121212] transition-colors">
      <BreadCrumb
        routes={[
          { title: t("batch.breadcrumb.master"), url: "#" },
          { title: t("batch.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Package, title: t("batch.heading") }}
        actions={
          privileges?.can_add
            ? [
                {
                  label: t("createNewBtn"),
                  icon: Plus,
                  type: "primary",
                  onClick: handleAddNew,
                },
              ]
            : []
        }
      />

      {/* Alert Message */}
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <div className="w-full bg-gray-50 dark:bg-[#121212] p-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(privileges?.can_add || privileges?.can_edit) && (
        <AddEditBatchModal
          open={isModalOpen}
          handleClose={handleCloseModal}
          editData={editData}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default BatchList;