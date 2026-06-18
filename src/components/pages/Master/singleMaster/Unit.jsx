import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Plus, Gpu } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import AddMasterModal from "./AddMasterModal";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import Preloader from "@/components/common/Preloader";
import { checkPageAccess } from "@/lib/checkPrivilege";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import useAuth from "@/redux/hook/auth/useAuth";
import usePrivileges from "@/lib/hooks/usePrivileges";

const Unit = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { user } = useAuth();

  const { privileges, loading: privilegeLoading,hasAccess } = usePrivileges("Unit");
useEffect(() => {
    fetchData();
  }, []);
  

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("units");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching units:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete unit" });
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
      const response = await axiosInstance.get(`delete-unit/${id}`);
      if (!response.data.error) {
        setAlert({ type: "success", message: "Unit Deleted" });
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
    { key: "SNo", label: "#", sortable: true },
    { key: "UnitName", label: t("unit.columns.unit"), sortable: true },
    { key: "Narration", label: t("unit.columns.narration"), sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.unitId);
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
      onClick: (row) => handleDelete(row.unitId),
      tooltip: "Delete",
    });
  }

  if (loading||privilegeLoading) return (
    <div>
      <BreadCrumb
        routes={[
          { title: t("unit.breadcrumb.master"), url: "#" },
          { title: t("unit.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Gpu, title: t("unit.breadcrumb.title") }}
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
      <Preloader />
    </div>
  );

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("unit.breadcrumb.master"), url: "#" },
            { title: t("unit.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Gpu, title: t("unit.breadcrumb.title") }}
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
          { title: t("unit.breadcrumb.master"), url: "#" },
          { title: t("unit.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Gpu, title: t("unit.breadcrumb.title") }}
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

      {/* ✅ Updated wrapper with consistent dark mode colors */}
      <div className="w-full bg-white dark:bg-[#1e1e1e] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={false}
            searchable
          />
        </div>
      </div>

      <AddMasterModal
        open={open}
        handleClose={() => setOpen(false)}
        title={t("unit.breadcrumb.title")}
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

export default Unit;