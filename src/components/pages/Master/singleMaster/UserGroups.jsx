import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Switch from "@mui/material/Switch";
import {
  Edit,
  Trash2,
  UserRoundCog,
  Plus,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import UserGroupAddModal from "./UserGroupAddModal";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import ErrorPage from "@/components/common/ErrorPage";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import useAuth from "@/redux/hook/auth/useAuth";
import { checkPageAccess } from "@/lib/checkPrivilege";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import usePrivileges from "@/lib/hooks/usePrivileges";

const UserGroups = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alert, setAlert] = useState(null);
  const [users, setUsers] = useState([]);
  const { t } = useTranslation();

  const navigate = useNavigate();

  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("User Group");

  const handleOpenEdit = (id) => {
    setEditId(id);
    setOpen(true);
  };
  useEffect(() => {
    fetchAllUserGroup()
  }, [])

  const fetchAllUserGroup = async () => {
    setFetchLoading(true);
    try {
      const response = await axiosInstance.get('user-groups');
      setUsers(response.data.data);
    } catch (error) {
      setErrorMessage(`${error.response.data.message}, Line : ${error.response.data.line}, File : ${error.response.data.file}`);
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  };

  const deleteUserGroup = async (userGrpid) => {
    if (userGrpid === 1) {
      setAlert({
        id: new Date(),
        type: "warning",
        message: t("DefaultDataMsg"),
      });
      return;
    }

    if (!privileges?.can_delete) {
      setAlert({ id: new Date(), type: "error", message: t("userGroup.alerts.deletePermission") });
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
      const response = await axiosInstance.get(`delete-user-group/${userGrpid}`);
      if (!response.data.error) {
        setAlert({ id: new Date(), type: "success", message: t("userGroup.alerts.deleteSuccess") });
        fetchAllUserGroup();
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

  const columns = [
    { key: "SNo", label: t('userGroup.columns.sno'), sortable: true },
    { key: "usergroupName", label: t('userGroup.columns.userGroup'), sortable: true },
    { key: "activeStatus", label: t('userGroup.columns.status'), sortable: true },
  ];

  const handleSetPrivilege = (usergroupId) => {
    navigate(`/master/user-group/set-privilege/${usergroupId}`);
  };

  // 🔹 Actions based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleOpenEdit(row.usergroupId),
      className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: t('userGroup.actions.edit'),
    });
  }
  if (privileges?.can_edit) {
    actions.push({
      icon: <ShieldCheck className="h-4 w-4" />,
      onClick: (row) => handleSetPrivilege(row.usergroupId),
      className: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
      tooltip: t('userGroup.actions.setPrivileges'),
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => deleteUserGroup(row.usergroupId),
      tooltip: t('userGroup.actions.delete'),
    });
  }

  const renderCell = (key, row) => {
    if (key === "activeStatus") {
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.activeStatus
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
            }`}
        >
          {row.activeStatus ? t('userGroup.status.active') : t('userGroup.status.inactive')}
        </span>
      );
    }

    return row[key] ?? "-";
  };

  if (fetchLoading || privilegeLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('userGroup.breadcrumb.title'), url: "#" },
          ]}
          heading={{ icon: UserRoundCog, title: t('userGroup.heading') }}
          actions={
            privileges?.can_add
              ? [
                {
                  label: t('userGroup.actions.createNew'),
                  type: "primary",
                  icon: Plus,
                  onClick: () => {
                    setOpen(true);
                    setEditId(null);
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

  if (fetchError) {
    return <ErrorPage errorMessage={errorMessage} />;
  }

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('userGroup.breadcrumb.title'), url: "#" },
          ]}
          heading={{ icon: UserRoundCog, title: t('userGroup.heading') }}
          actions={
            privileges?.can_add
              ? [
                {
                  label: t('userGroup.actions.createNew'),
                  type: "primary",
                  icon: Plus,
                  onClick: () => {
                    setOpen(true);
                    setEditId(null);
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
          { title: t('userGroup.breadcrumb.title'), url: "#" },
        ]}
        heading={{ icon: UserRoundCog, title: t('userGroup.heading') }}
        actions={
          privileges?.can_add
            ? [
              {
                label: t('userGroup.actions.createNew'),
                type: "primary",
                icon: Plus,
                onClick: () => {
                  setOpen(true);
                  setEditId(null);
                },
              },
            ]
            : []
        }
      />
      <div className="w-full bg-white dark:bg-[#1e1e1e] px-2 py-2 transition-colors">
              <ContentTable
                columns={columns}
                data={users}
                actions={actions}
                renderCell={renderCell}
                itemsPerPage={5}
                showPagination
                searchable
              />
      </div>

      <UserGroupAddModal
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditId(null);
        }}
        editId={editId}
        onSuccess={() => fetchAllUserGroup()}
      />
    </div>
  );
};

export default UserGroups;