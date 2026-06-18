import { useEffect, useState } from "react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, PackageSearch, Plus, Trash2 } from "lucide-react";
import AddProdGroup from "./AddProdMainGroup";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

const ProductMainGroup = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  // ✅ Use privilege hook
  const {
    privileges,
    loading: privilegeLoading,
    hasAccess,
    message,
  } = usePrivileges("Product Main Group");
  

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      getData();
    }
  }, [hasAccess, privilegeLoading]);

  const getData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("product-main-groups");
      setData(response.data.data);
    } catch (error) {
      console.error(error);
      setAlert({ type: "error", message: t("productMainGroup.alerts.fetchError") });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
        setAlert({ type: "error", message: t("productMainGroup.alerts.deletePermission") });
        return;
      }
   
  if (id === 1) {
    setAlert({ type: "error", message: t("DefaultDataMsg") });
    return;
  }
      const result = await Swal.fire({
        title: t("productMainGroup.deleteConfirm.title"),
        text: t("productMainGroup.deleteConfirm.text"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("productMainGroup.deleteConfirm.confirm"),
        cancelButtonText: t("productMainGroup.deleteConfirm.cancel"),
      });
  
      if (!result.isConfirmed) return;
    try {
      const response = await axiosInstance.get(`delete-product-main-group/${id}`);
      if (!response.error) {
        getData();
        setAlert({ type: "success", message: t("productMainGroup.alerts.deleteSuccess") });
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

  const handleEdit = (row) => {
    if (!privileges?.can_edit) {
      setAlert({ type: "error", message: t("productMainGroup.alerts.editPermission") });
      return;
    }
    setEditId(row.groupCode);
    setOpen(true);
  };

  // ✅ Build actions dynamically
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      className: "text-green-600 hover:text-green-800",
      tooltip: t("productMainGroup.actions.edit"),
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.groupCode),
      tooltip: t("productMainGroup.actions.delete"),
    });
  }

  // ✅ Loading (privilege + data)
  if (privilegeLoading || loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("productMainGroup.breadcrumb.master"), url: "#" },
            { title: t("productMainGroup.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: PackageSearch, title: t("productMainGroup.heading") }}
        />
        <Preloader />
      </div>
    );
  }

  // ✅ No Access case
  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("productMainGroup.breadcrumb.master"), url: "#" },
            { title: t("productMainGroup.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: PackageSearch, title: t("productMainGroup.heading") }}
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
          { title: t("productMainGroup.breadcrumb.master"), url: "#" },
          { title: t("productMainGroup.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: PackageSearch, title: t("productMainGroup.heading") }}
        actions={
          privileges?.can_add
            ? [
                {
                  label: t("createNewBtn"),
                  icon: Plus,
                  type: "primary",
                  onClick: () => {
                    setEditId(null);
                    setOpen(true);
                  },
                },
              ]
            : []
        }
      />

      <div className="w-full  dark:bg-[#121212] px-2 pt-2 transition-colors">
            <ContentTable
              columns={[
                { key: "SNo", label: t("productMainGroup.columns.sno"), sortable: true },
                { key: "groupCode", label: t("productMainGroup.columns.groupCode"), sortable: true },
                { key: "groupName", label: t("productMainGroup.columns.groupName"), sortable: true },
                { key: "productCodeLength", label: t("productMainGroup.columns.productCodeLength"), sortable: true },
                { key: "nextNumber", label: t("productMainGroup.columns.nextNumber"), sortable: true },
              ]}
              data={data}
              actions={actions}
              showPagination={false}
              searchable
            />
      </div>

      {/* Modal only if user can add/edit */}
      {(privileges?.can_add || privileges?.can_edit) && (
        <AddProdGroup
          open={open}
          handleClose={() => setOpen(false)}
          onSuccess={getData}
          editId={editId}
        />
      )}
    </div>
  );
};

export default ProductMainGroup;
