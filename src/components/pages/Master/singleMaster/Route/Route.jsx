import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Edit,
  Trash2,
  Plus,
  Route,
} from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import RouteForm from "./RouteForm"; // 👈 NEW: Import RouteForm
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import useAuth from "@/redux/hook/auth/useAuth";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import usePrivileges from "@/lib/hooks/usePrivileges";

const RouteMaster = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation()

  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Route");

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchData();
    }
  }, [hasAccess, privilegeLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("routes");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Delete handler
  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete route" });
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
      const response = await axiosInstance.get(`delete-route/${id}`);
      if (!response.data.error) {
        setAlert({ type: "success", message: "Route Deleted" });
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

  const columns = [
    { key: "SNo", label: "#", sortable: true },
    { key: "RouteName", label: t("route.columns.route"), sortable: true },
    { key: "MarketName", label: t("market.heading", { defaultValue: "Market" }), sortable: true }, // 👈 NEW: Market column
    { key: "Narration", label: t("route.columns.narration"), sortable: true },
  ];

  // 🔹 Actions based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.RouteId);
        setMode("edit");
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
      onClick: (row) => handleDelete(row.RouteId),
      tooltip: "Delete",
    });
  }

  const breadcrumbActions = privileges?.can_add
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
    : [];

  if (loading || privilegeLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("route.breadcrumb.master"), url: "#" },
            { title: t("route.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Route, title: t("route.heading") }}
          actions={breadcrumbActions}
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
            { title: t("route.breadcrumb.master"), url: "#" },
            { title: t("route.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Route, title: t("route.heading") }}
          actions={breadcrumbActions}
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
          { title: t("route.breadcrumb.master"), url: "#" },
          { title: t("route.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Route, title: t("route.heading") }}
        actions={breadcrumbActions}
      />
      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            searchable
            showPagination
          />
        </div>
      </div>

      {/* 👇 Replaced AddMasterModal with RouteForm */}
      <RouteForm
        open={open}
        handleClose={() => setOpen(false)}
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

export default RouteMaster;