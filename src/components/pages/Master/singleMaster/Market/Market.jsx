import { useEffect, useState } from "react";
import { Edit, Trash2, Plus, Store } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import MarketForm from "./MarketForm"; // 👈 new form component
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";

const Market = () => {
  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Market");
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchData();
    }
  }, [hasAccess, privilegeLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("markets");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching markets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete market" });
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
      const response = await axiosInstance.get(`delete-market/${id}`);
      if (!response.data.error) {
        setAlert({ type: "success", message: "Market Deleted" });
        fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      const finalMessage =
        errorMessage?.toLowerCase().includes("foreign key violation")
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
    { key: "MarketName", label: t("market.columns.market"), sortable: true },
    { key: "AreaName", label: t("market.columns.area", { defaultValue: "Area" }), sortable: true }, // 👈 new column
    { key: "Narration", label: t("market.columns.narration"), sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.MarketId);
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
      onClick: (row) => handleDelete(row.MarketId),
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

  if (privilegeLoading || loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("market.breadcrumb.master"), url: "#" },
            { title: t("market.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Store, title: t("market.heading") }}
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
            { title: t("market.breadcrumb.master"), url: "#" },
            { title: t("market.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Store, title: t("market.heading") }}
          actions={[]}
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
          { title: t("market.breadcrumb.master"), url: "#" },
          { title: t("market.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Store, title: t("market.heading") }}
        actions={breadcrumbActions}
      />

      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination
            searchable
          />
        </div>
      </div>

      {/* 👇 Replaced AddMasterModal with MarketForm */}
      <MarketForm
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

export default Market;