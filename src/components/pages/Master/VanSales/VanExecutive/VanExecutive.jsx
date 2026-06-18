import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Truck, Plus, Trash2 } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import Swal from "sweetalert2";
import useAuth from "@/redux/hook/auth/useAuth";

const VanExecutive = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { selectedBranchId } = useAuth();

  const columns = [
    { key: "SNo", label: "#", sortable: true },
    { key: "ExecutiveName", label: "Executive Name", sortable: true },
    { key: "PhoneNo", label: "Phone No", sortable: true },
    { key: "Email", label: "Email", sortable: true },
    { key: "Address", label: "Address", sortable: true },
    { key: "userName", label: "Username", sortable: true },
    { key: "Status", label: "Status", sortable: true },
  ];

  useEffect(() => {
    if (selectedBranchId) fetchData();
  }, [selectedBranchId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) return;
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA"
        ) {
          if (activeElement.selectionStart !== activeElement.selectionEnd) return;
        }
        e.preventDefault();
        e.stopPropagation();
        navigate("/master/van-sales/van-executive/create");
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`van-exicutive/${selectedBranchId}`);
      setData(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching van executives:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: t("delete.title") || "Are you sure?",
      text: t("delete.text") || "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("delete.confirm") || "Yes, delete it!",
      cancelButtonText: t("delete.cancel") || "Cancel",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await axiosInstance.get(`van-exicutive/delete/${row.ExecutiveId}`);
      if (!res.data.error) {
        setAlert({
          id: Date.now(),
          type: "success",
          message: "Van executive deleted successfully!",
        });
        fetchData();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete";
      const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
        ? t("foreeignKeyError") || "Cannot delete: record is in use"
        : errorMessage;
      setAlert({ id: Date.now(), type: "error", message: finalMessage });
    }
  };

  const actions = [
    {
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/master/van-sales/van-executive/edit/${row.ExecutiveId}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit",
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row),
      tooltip: "Delete",
    },
  ];

  const breadcrumbConfig = {
    routes: [
      { title: t("bank.breadcrumb.master") || "Master", url: "#" },
      { title: "Van Sales", url: "#" },
      { title: "Van Executive", url: "#" },
    ],
    heading: { icon: Truck, title: "Van Executive" },
    actions: [
      {
        label: `${t("createNewBtn") || "Create New"} (Ctrl+C)`,
        icon: Plus,
        type: "primary",
        onClick: () => navigate("/master/van-sales/van-executive/create"),
      },
    ],
  };

  if (loading) {
    return (
      <div>
        <BreadCrumb {...breadcrumbConfig} />
        <Preloader />
      </div>
    );
  }

  return (
    <div>
      {alert && (
        <AlertBox key={alert.id} message={alert.message} type={alert.type} />
      )}
      <BreadCrumb {...breadcrumbConfig} />

      <div className="w-full dark:bg-[#121212] p-1 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
            renderCell={(key, row) => {
              if (key === "Status") {
                const isActive =
                  row.Status === true ||
                  row.Status === 1 ||
                  row.Status === "1" ||
                  row.Status === "true";

                return (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                );
              }

              const value = row[key];
              if (value === null || value === undefined) return "-";
              if (typeof value === "boolean") return value ? "Yes" : "No";
              return value;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default VanExecutive;