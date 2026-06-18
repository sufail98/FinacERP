import { useState, useEffect } from "react";
import { Edit, Trash2, Plus, Receipt } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import useAuth from "@/redux/hook/auth/useAuth";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import FormattedDate from "@/components/common/FormattedDate";
import { useNavigate } from "react-router-dom";

const SalaryMasterList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation();
  const { selectedBranchId, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("salarymasters", {
        branchId: selectedBranchId,
        userId: user?.userId || "admin",
      });
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching salary masters:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl+C to create new
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) return;

        const activeElement = document.activeElement;
        const isInputField =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (isInputField) {
          const selectionStart = activeElement.selectionStart;
          const selectionEnd = activeElement.selectionEnd;
          if (selectionStart !== selectionEnd) return;
        }

        e.preventDefault();
        e.stopPropagation();

        navigate("/payroll/salary-master/add-new");
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate]);

  const handleDelete = async (id) => {
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
      const response = await axiosInstance.get(`delete-salarymaster/${id}`);
      if (!response.data.error) {
        setAlert({
          id: Date.now(),
          type: "success",
          message: response.data.message || "Deleted successfully",
        });
        fetchData();
      } else {
        setAlert({
          id: Date.now(),
          type: "error",
          message: response.data.message || "Delete failed",
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Delete failed";
      setAlert({
        id: Date.now(),
        type: "error",
        message: errorMessage,
      });
    }
  };

  const columns = [
    { key: "SNo", label: "S.No", sortable: true },
    { key: "VoucherNo", label: "Voucher No", sortable: true },
    {
      key: "Date",
      label: "Date",
      sortable: true,
      render: (row) => <FormattedDate value={row.Date || row.date} />,
    },
    {
      key: "Month",
      label: "Month",
      sortable: true,
      render: (row) => {
        const monthVal = row.Month || row.month;
        if (!monthVal) return "-";
        try {
          const date = new Date(monthVal);
          return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } catch {
          return monthVal;
        }
      },
    },
    {
      key: "EmployeeId",
      label: "Employee",
      sortable: true,
      render: (row) => row.employeeName || row.employeeCode || row.EmployeeId || "-",
    },
    {
      key: "Salary",
      label: "Salary",
      sortable: true,
      className: "text-right",
      render: (row) => {
        const amt = row.Salary !== undefined ? row.Salary : row.salary;
        return amt !== undefined ? Number(amt).toFixed(2) : "0.00";
      },
    },
    { key: "Narration", label: "Narration", sortable: true },
  ];

  const actions = [
    {
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        const id = row.SalaryMasterId || row.salaryMasterId || row.id;
        navigate(`/payroll/salary-master/edit-salary-master/${id}`);
      },
      className:
        "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: "Edit",
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      className:
        "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => {
        const id = row.SalaryMasterId || row.salaryMasterId || row.id;
        handleDelete(id);
      },
      tooltip: "Delete",
    },
  ];

  if (loading)
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: "Payroll", url: "#" },
            { title: "Salary Master", url: "#" },
          ]}
          heading={{
            icon: Receipt,
            title: "Salary Master List",
          }}
          actions={[
            {
              label: "Create New",
              type: "primary",
              icon: Plus,
              onClick: () => navigate("/payroll/salary-master/add-new"),
            },
          ]}
        />
        <Preloader />
      </div>
    );

  return (
    <div>
      {alert && (
        <AlertBox
          key={alert.id}
          message={alert.message}
          type={alert.type}
        />
      )}

      <BreadCrumb
        routes={[
          { title: "Payroll", url: "#" },
          { title: "Salary Master", url: "#" },
        ]}
        heading={{
          icon: Receipt,
          title: "Salary Master List",
        }}
        actions={[
          {
            label: `${t("createNewBtn") || "Create New"} (Ctrl+C)`,
            type: "primary",
            icon: Plus,
            onClick: () => navigate("/payroll/salary-master/add-new"),
          },
        ]}
      />

      <div className="w-full bg-white dark:bg-[#1e1e1e] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={data}
            actions={actions}
            showPagination={true}
            searchable={true}
            staticSearchable
            pageSize={20}
            autoFocusSearch={true}
          />
        </div>
      </div>
    </div>
  );
};

export default SalaryMasterList;
