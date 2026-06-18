import { useEffect, useState } from "react";
import { Edit, Trash2, Plus, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import axiosInstance from "@/lib/axiosConfig";
import ErrorPage from "@/components/common/ErrorPage";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import Swal from "sweetalert2";
import usePrivileges from "@/lib/hooks/usePrivileges";
import useAuth from "@/redux/hook/auth/useAuth";

const GernalReminderList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedBranchId } = useAuth();

  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alert, setAlert] = useState(null);
  const [reminders, setReminders] = useState([]);

  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("GeneralReminders");

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchAllReminders();
    }
  }, [hasAccess, privilegeLoading]);

  const fetchAllReminders = async () => {
    setFetchLoading(true);
    try {
      const response = await axiosInstance.get(`general-reminder/${selectedBranchId}`);
      setReminders(response.data.data || []);
    } catch (error) {
      setErrorMessage(
        `${error.response?.data?.message || "Error fetching reminders"}, Line: ${error.response?.data?.line}, File: ${error.response?.data?.file}`
      );
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  };

  const deleteReminder = async (reminderId) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: t("common.noPermission") || "No permission to delete" });
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
      await axiosInstance.delete(`general-reminder/delete/${reminderId}`);
      setAlert({ type: "success", message: "Reminder deleted successfully" });
      fetchAllReminders();
    } catch (error) {
      setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to delete reminder",
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-yellow-600";
      case "active":
        return "text-green-600";
      case "completed":
        return "text-blue-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "low":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const columns = [
    { key: "SNo", label: "S.No", sortable: true },
    { key: "title", label: "Title", sortable: true },
    { key: "priority", label: "Priority", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "start_date", label: "Start Date", sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/general-reminder/edit/${row.id}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit Reminder",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => deleteReminder(row.id),
      tooltip: "Delete Reminder",
    });
  }

  if (fetchLoading || privilegeLoading)
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("common.general") || "General", url: "#" },
            { title: "Reminders", url: "#" },
          ]}
          heading={{ icon: Clock, title: "General Reminders" }}
        />
        <Preloader />
      </div>
    );

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("common.general") || "General", url: "#" },
            { title: "Reminders", url: "#" },
          ]}
          heading={{ icon: Clock, title: "General Reminders" }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  if (fetchError) return <ErrorPage errorMessage={errorMessage} />;

  return (
    <div>
      {alert && (
        <AlertBox key={alert.id || Date.now()} message={alert.message} type={alert.type} />
      )}

      <BreadCrumb
        routes={[
          { title: t("common.general") || "General", url: "#" },
          { title: "Reminders", url: "#" },
        ]}
        heading={{ icon: Clock, title: "General Reminders" }}
        actions={
          privileges?.can_add
            ? [
                {
                  label: "Add New Reminder",
                  icon: Plus,
                  type: "primary",
                  onClick: () => navigate("/general-reminder/create"),
                },
              ]
            : []
        }
      />

      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={reminders}
            actions={actions}
            renderCell={(key, row) => {
              if (key === "priority") {
                return (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(row.priority)}`}>
                    {row.priority}
                  </span>
                );
              }
              if (key === "status") {
                return (
                  <span className={`font-medium ${getStatusColor(row.status)}`}>
                    {row.status}
                  </span>
                );
              }
              if (key === "start_date") {
                return (
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {new Date(row.start_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">{row.start_time}</div>
                  </div>
                );
              }
              return row[key] ?? "-";
            }}
            showPagination={false}
            searchable={true}
          />
        </div>
      </div>
    </div>
  );
};

export default GernalReminderList;