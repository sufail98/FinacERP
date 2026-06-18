import { useEffect, useState } from "react";
import {
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  Plus,
  Key,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import ErrorPage from "@/components/common/ErrorPage";
import AlertBox from "@/components/common/AlertBox";
import ChangePasswordModal from "./ChangePasswordModal";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

const UserList = () => {
  const { t } = useTranslation()
  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [passChangeId, setPassChangeId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  // ✅ Use privileges for User module
  const {
    privileges,
    loading: privilegeLoading,
    hasAccess,
    message,
  } = usePrivileges("Users");

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchAllUsers();
    }
  }, [hasAccess, privilegeLoading]);

  const fetchAllUsers = async () => {
    setFetchLoading(true);
    try {
      const response = await axiosInstance.get("users");
      
      setUsers(response.data.data);
    } catch (error) {
      setErrorMessage(
        `${error.response?.data?.message || "Error fetching users"}`
      );
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: t("userList.alerts.deletePermission") });
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
      await axiosInstance.get(`delete-user/${userId}`);
      setAlert({ type: "success", message: "User Deleted" });
      fetchAllUsers();
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

  // ✅ Dynamically build actions based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/edit-user/${row.userId}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    });
  }
  if (privileges?.can_edit) {
    actions.push({
      icon: <Key className="h-4 w-4" />,
      onClick: (row) => {
        setOpen(true);
        setPassChangeId(row.userId);
      },
      className: "text-blue-600 hover:text-blue-800",
      tooltip: "Change Password",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.userId),
      tooltip: "Delete",
    });
  }

  const columns = [
    { key: "SNo", label: "#", sortable: true },
    { key: "userName", label: t("userList.columns.userName"), sortable: true },
    { key: "phoneNo", label: t("userList.columns.contact"), sortable: true },
    { key: "Narration", label: t("userList.columns.narration"), sortable: false },
    { key: "userGroupName", label: t("userList.columns.role"), sortable: false },
    { key: "ActiveStatus", label: t("userList.columns.status"), sortable: true },
  ];

  const renderCell = (key, row) => {
    if (key === "phoneNo") {
      return (
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <Phone className="h-3 w-3" /> {row.phoneNo}
          </div>
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> {row.email}
          </div>
        </div>
      );
    }

    if (key === "ActiveStatus") {
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.ActiveStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {row.ActiveStatus ? t("userList.columns.active") : t("userList.columns.inactive")}
        </span>
      );
    }

    return row[key] ?? "-";
  };

  // ✅ Handle loading and no access
  if (privilegeLoading || fetchLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("userList.breadcrumb.user"), url: "#" },
            { title: t("userList.heading"), url: "#" },
          ]}
          heading={{ icon: User, title: t("userList.heading") }}
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
            { title: t("userList.breadcrumb.user"), url: "#" },
            { title: t("userList.heading"), url: "#" },
          ]}
          heading={{ icon: User, title: t("userList.heading") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  if (fetchError) {
    return <ErrorPage errorMessage={errorMessage} />;
  }

  return (
    <div>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <BreadCrumb
        routes={[
          { title: t("userList.breadcrumb.user"), url: "#" },
          { title: t("userList.heading"), url: "#" },
        ]}
        heading={{ icon: User, title: t("userList.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: t("userList.actions.addNew"),
                icon: Plus,
                type: "primary",
                onClick: () => navigate("/add-new-user"),
              },
            ]
            : []
        }
      />

      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors ">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={users}
            actions={actions}
            renderCell={renderCell}
            showPagination
            searchable
          />
        </div>
      </div>

      {(privileges?.can_edit || privileges?.can_add) && (
        <ChangePasswordModal
          open={open}
          handleClose={() => {
            setOpen(false);
            fetchAllUsers();
          }}
          passChangeId={passChangeId}
        />
      )}
    </div>
  );
};

export default UserList;
