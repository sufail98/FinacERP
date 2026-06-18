import { useEffect, useState } from "react";
import { Edit, Trash2, Plus, Warehouse, Star } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import AddGodownModal from "./AddGodownModal";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import Preloader from "@/components/common/Preloader";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import useAuth from "@/redux/hook/auth/useAuth";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Switch from "@mui/material/Switch";

const Godown = () => {
  const { selectedBranchId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [message, setMessage] = useState("");
  const { t } = useTranslation();
  const { privileges, loading: privilegeLoading, hasAccess } = usePrivileges("Godown");

  useEffect(() => {
    if (selectedBranchId) {
      fetchData();
    }
  }, [selectedBranchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`godowns/${selectedBranchId}`);
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching godowns:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle setting a godown as default
  const handleSetDefault = async (godownId, currentIsDefault) => {
    // If already default, don't allow unchecking (must select another one)
    if (currentIsDefault) {
      setAlert({
        id: Date.now(),
        type: "warning",
        message: t("cannotUnsetDefault") || "Cannot unset default. Please select another godown as default.",
      });
      return;
    }

    // Confirm before setting as default
    const result = await Swal.fire({
      title: t("setAsDefaultTitle") || "Set as Default?",
      text: t("setAsDefaultText") || "This will set this godown as the default for this branch. Continue?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes") || "Yes",
      cancelButtonText: t("cancelBtn") || "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      // Get the godown data first
      const godownRes = await axiosInstance.get(`get-godown-byId/${godownId}`);
      const godownData = godownRes.data?.data;

      if (!godownData) {
        throw new Error("Godown not found");
      }

      // Update with IsDefault: true
      const payload = {
        GodownName: godownData.GodownName || godownData.godownName,
        Narration: godownData.Narration || godownData.narration || "",
        branchId: parseInt(godownData.branchId || godownData.BranchId, 10),
        IsDefault: true,
        CreatedUser: godownData.CreatedUser || user?.userId,
        ModifiedUser: user?.userId,
      };

      await axiosInstance.post(`update-godown/${godownId}`, payload);

      setAlert({
        id: Date.now(),
        type: "success",
        message: t("defaultSetSuccess") || "Default godown updated successfully",
      });

      // Refresh the list
      fetchData();
    } catch (error) {
      console.error("Error setting default:", error);
      setAlert({
        id: Date.now(),
        type: "error",
        message: error?.response?.data?.message || t("defaultSetError") || "Failed to set default godown",
      });
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete godowns" });
      return;
    }

    if (id === 1) {
      setAlert({ type: "error", message: t("DefaultDataMsg") });
      return;
    }

    // Check if this is the default godown
    const godown = data.find(g => g.GodownId === id);
    if (godown?.IsDefault || godown?.isDefault) {
      setAlert({
        id: Date.now(),
        type: "error",
        message: t("cannotDeleteDefault") || "Cannot delete the default godown. Please set another godown as default first.",
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
      const response = await axiosInstance.get(`delete-godown/${id}`);
      if (!response.data.error) {
        setAlert({ type: "success", message: "Godown Deleted" });
        fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      const finalMessage = errorMessage?.toLowerCase().includes("foreign key violation")
        ? t("foreeignKeyError")
        : errorMessage;

      setAlert({
        id: Date.now(),
        type: "error",
        message: finalMessage,
      });
    }
  };

  const handleOpenAdd = () => {
    setMode("add");
    setSelectedId(null);
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    setSelectedId(row.GodownId);
    setMode("edit");
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelectedId(null);
  };

  const handleSaved = (alertData) => {
    fetchData();
    setAlert(alertData);
  };

  const columns = [
    { key: "SNo", label: "#",},
    { key: "GodownName", label: t("godown.columns.godown"), width:'600px' },
    { key: "IsDefault", label: t("default") || "Default", sortable: true },
    { key: "Narration", label: t("godown.columns.narration"), sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: handleOpenEdit,
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.GodownId),
      tooltip: "Delete",
    });
  }

  if (loading || privilegeLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("godown.breadcrumb.master"), url: "#" },
            { title: t("godown.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Warehouse, title: t("godown.heading") }}
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
            { title: t("godown.breadcrumb.master"), url: "#" },
            { title: t("godown.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Warehouse, title: t("godown.heading") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  return (
    <div>
      {alert && (
        <AlertBox
          key={alert.id || Date.now()}
          message={alert.message}
          type={alert.type}
        />
      )}

      <BreadCrumb
        routes={[
          { title: t("godown.breadcrumb.master"), url: "#" },
          { title: t("godown.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Warehouse, title: t("godown.heading") }}
        actions={
          privileges?.can_add
            ? [
                {
                  label: t("createNewBtn"),
                  type: "primary",
                  icon: Plus,
                  onClick: handleOpenAdd,
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
            showPagination={false}
            searchable
            renderCell={(key, row) => {
              // Custom render for IsDefault column
              if (key === "IsDefault") {
                const isDefault = row.IsDefault === true || row.IsDefault === 1 || row.isDefault === true || row.isDefault === 1;
                
                return (
                  <div className="flex items-center gap-2">
                    {/* Option 1: Using Switch */}
                    <Switch
                      checked={isDefault}
                      onChange={() => handleSetDefault(row.GodownId, isDefault)}
                      color="primary"
                      size="small"
                      disabled={!privileges?.can_edit}
                    />
                    
                   
                  </div>
                );

                // Option 2: Using Badge style (alternative)
                // return (
                //   <div 
                //     onClick={() => privileges?.can_edit && handleSetDefault(row.GodownId, isDefault)}
                //     className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors
                //       ${isDefault 
                //         ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                //         : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900'
                //       }`}
                //   >
                //     {isDefault && <Star className="h-3 w-3 fill-current" />}
                //     {isDefault ? 'Default' : 'Set Default'}
                //   </div>
                // );
              }

              // Custom render for GodownName to show default badge inline
              if (key === "GodownName") {
                const isDefault = row.IsDefault === true || row.IsDefault === 1 || row.isDefault === true || row.isDefault === 1;
                
                return (
                  <div className="flex items-center gap-2">
                    <span>{row.GodownName}</span>
                    {isDefault && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Default
                      </span>
                    )}
                  </div>
                );
              }

              return row[key] ?? "-";
            }}
          />
        </div>
      </div>

      {/* Godown Modal */}
      <AddGodownModal
        open={open}
        handleClose={handleCloseModal}
        mode={mode}
        id={selectedId}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default Godown;