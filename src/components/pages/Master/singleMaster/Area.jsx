import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Plus, LandPlot } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import AddMasterModal from "./AddMasterModal";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { checkPageAccess } from "@/lib/checkPrivilege";
import useAuth from "@/redux/hook/auth/useAuth";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import usePrivileges from "@/lib/hooks/usePrivileges";

const Area = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false); // start with loader
  const [alert, setAlert] = useState(null);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState([]);
  const { t } = useTranslation()


  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Area");

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("areas");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching areas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete Brand" });
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
      const response = await axiosInstance.get(`delete-area/${id}`);

      if (!response.data.error) {
        setAlert({ type: "success", message: "Area Deleted" });
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
    { key: "AreaName", label: t("area.columns.area"), sortable: true },
    { key: "Narration", label: t("area.columns.narration"), sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.AreaId);
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
      onClick: (row) => handleDelete(row.AreaId),
      tooltip: "Delete",
    });
  }

  if (loading || privilegeLoading) return <div>
    <BreadCrumb
      routes={[
        { title: t("area.breadcrumb.master"), url: "#" },
        { title: t("area.breadcrumb.title"), url: "#" },
      ]}
      heading={{ icon: LandPlot, title: t("area.heading") }}
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
  </div>;

  if (!hasAccess) {
    return (
      <div className="">
        <BreadCrumb
          routes={[
            { title: t("area.breadcrumb.master"), url: "#" },
            { title: t("area.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: LandPlot, title: t("area.heading") }}
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
          { title: t("area.breadcrumb.master"), url: "#" },
          { title: t("area.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: LandPlot, title: t("area.heading") }}
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

      <AddMasterModal
        open={open}
        handleClose={() => setOpen(false)}
        title={t("area.heading")}
        mode={mode}
        id={selectedId}
        onSaved={(alert) => {
          fetchData();
          setAlert(alert); // ✅ show alert in parent
        }}
      />
    </div>
  );
};

export default Area;
