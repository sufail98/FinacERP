import BreadCrumb from "@/components/common/BreadCrumb"
import ContentTable from "@/components/common/ContentTable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Edit, Plus, Search, Trash2, User, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AddEditAccountGroupModal from "./AddNewAccountGroup";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import useAuth from "@/redux/hook/auth/useAuth";
import ErrorPage from "@/components/common/ErrorPage";

const AccountGroups = () => {
  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Account Group");
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [data, setData] = useState([]);
  const [editData, setEditData] = useState(null);
  const { selectedBranchId } = useAuth()
   const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  

  const columns = [
    { key: "SNo", label: "#", sortable: true, width: "60px" },
    { key: "AccountGroupCode", label: t("accountGroups.columns.code"), sortable: true, width: "110px" },
    { key: "accountGroupName", label: t("accountGroups.columns.name"), sortable: true },
    { key: "groupUnderName", label: t("accountGroups.columns.groupUnder"), sortable: true },
  ];

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      getData();
    }
  }, [hasAccess, privilegeLoading, selectedBranchId]);

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
          // Check if text is selected inside the input
          const selectionStart = activeElement.selectionStart;
          const selectionEnd = activeElement.selectionEnd;
          
          // If there's a selection range (text is highlighted), allow normal copy
          if (selectionStart !== selectionEnd) {
            return; // Allow normal copy
          }
        }

        // Prevent default and open modal
        e.preventDefault();
        e.stopPropagation();
        
        if (isModalOpen) return;
        
        if (!privileges?.can_add) {
          setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add account groups' });
          return;
        }
        
        setEditData(null);
        setIsModalOpen(true);
        return;
      }

      // Escape - Close modal
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        setIsModalOpen(false);
        setEditData(null);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [privileges, isModalOpen]);

  const getData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('accountgroups');
      setData(response.data.data);
    } catch (error) {
      setFetchError(true);
        setErrorMessage(
        `${error.response?.data?.message}, Line : ${error.response?.data?.line}, File : ${error.response?.data?.file}`
      );
      console.error("Error fetching account groups:", error);
      setAlert({ type: 'error', message: 'Error fetching account groups' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const accountGroup = data.find((item) => item.groupId === id);

    if (accountGroup?.default) {
      setAlert({ id: Date.now(), type: "error", message: "This is marked as default and cannot be deleted" });
      return;
    }

    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete account groups" });
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
      await axiosInstance.get(`delete-accountgroup/${id}`);
      getData();
      setAlert({ type: "success", message: "Account group deleted successfully" });
    } catch (error) {
      console.error("Error deleting account group:", error);
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

  const handleAddNew = () => {
    if (!privileges?.can_add) {
      setAlert({ type: 'error', message: 'You do not have permission to add account groups' });
      return;
    }
    setEditData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (row) => {
    if (!privileges?.can_edit) {
      setAlert({ type: 'error', message: 'You do not have permission to edit account groups' });
      return;
    }
    setEditData({
      id: row.groupId,
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
      type: 'success',
      message: editData ? 'Account group updated successfully' : 'Account group created successfully'
    });
  };

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleEdit(row),
      className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: 'Edit'
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => handleDelete(row.groupId),
      tooltip: 'Delete'
    });
  }

  if (privilegeLoading || loading) {
    return (
      <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
        <BreadCrumb
          routes={[
            { title: t("accountGroups.breadcrumb.master"), url: "#" },
            { title: t("accountGroups.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: User, title: t("accountGroups.heading") }}
        />
        <Preloader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
        <BreadCrumb
          routes={[
            { title: t("accountGroups.breadcrumb.master"), url: "#" },
            { title: t("accountGroups.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: User, title: t("accountGroups.heading") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }
 if (fetchError) return <ErrorPage errorMessage={errorMessage} />;
  return (
    <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
      <BreadCrumb
        routes={[
          { title: t("accountGroups.breadcrumb.master"), url: "#" },
          { title: t("accountGroups.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: User, title: t("accountGroups.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: `${t("createNewBtn")} (Ctrl+C)`,
                icon: Plus,
                type: "primary",
                onClick: handleAddNew,
              },
            ]
            : []
        }
      />

      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <div className="w-full bg-gray-50 dark:bg-[#121212] p-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            minColumnWidth={80}
            staticSearchable={true}
            pageSize={20}
            autoFocusSearch={true}
          />
        </div>
      </div>

      {(privileges?.can_add || privileges?.can_edit) && (
        <AddEditAccountGroupModal
          open={isModalOpen}
          handleClose={handleCloseModal}
          editData={editData}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default AccountGroups;