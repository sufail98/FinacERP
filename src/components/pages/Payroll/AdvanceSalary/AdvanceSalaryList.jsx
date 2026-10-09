import { useState, useEffect } from "react";
import { Edit, Trash2, Plus, Wallet } from "lucide-react";
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
import NoAcessComponent from '@/components/common/NoAcessComponent';
import usePrivileges from '@/lib/hooks/usePrivileges';

const AdvanceSalaryList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation();
  const { selectedBranchId } = useAuth();
  const navigate = useNavigate();

   const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Advance Salary");


  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`getall-salaryadvancepayment/${selectedBranchId}`);
      ("Fetched advance salary payments:", res.data);
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching advance salary payments:", err);
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
        navigate("/payroll/advance-salary/add-new");
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate]);

  const handleDelete = async (id) => {

     if (!privileges?.can_delete) {
            setAlert({ key: new Date(), type: "error", message: t("deletePermission") });
            return;
        }

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
      const response = await axiosInstance.get(`delete-salaryadvancepayment/${id}`);
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
      setAlert({
        id: Date.now(),
        type: "error",
        message: error.response?.data?.message || "Delete failed",
      });
    }
  };

  const columns = [
    { key: "SNo", label: "S.No", sortable: true },
    {
      key: "voucherNo",
      label: "Voucher No",
      sortable: true,
      render: (row) => row.voucherNo || row.VoucherNo || "-",
    },
    {
      key: "advanceNo",
      label: "Advance No",
      sortable: true,
      render: (row) => row.advanceNo || row.AdvanceNo || "-",
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => <FormattedDate value={row.date || row.Date} />,
    },
    {
      key: "month",
      label: "Month",
      sortable: true,
      render: (row) => {
        const val = row.month || row.Month;
        if (!val) return "-";
        const d = new Date(val);
        return d.toLocaleString("default", { month: "long", year: "numeric" });
      },
    },
    {
      key: "employeeName",
      label: "Employee",
      sortable: true,
      render: (row) => row.employeeName || row.EmployeeName || "-",
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row) => {
        const amt = row.amount || row.Amount;
        return amt !== undefined ? Number(amt).toFixed(2) : "-";
      },
    },
    {
      key: "narration",
      label: "Narration",
      sortable: true,
      render: (row) => row.narration || row.Narration || "-",
    },
  ];

  const actions = []
  if(privileges?.can_edit){
    actions.push( {
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        const id =
          row.advanceMasterId ;
        navigate(`/payroll/advance-salary/edit/${id}`);
      },
      className:
        "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: "Edit",
    },)
  }
  if(privileges?.can_delete){
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className:
        "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => {
        const id =
          row.advanceMasterId;
        handleDelete(id);
      },
      tooltip: "Delete",
    },)
  }
 
  if (privilegeLoading || loading) {
        return <div>
           <BreadCrumb
          routes={[
            { title: "Payroll", url: "#" },
            { title: "Advance Salary", url: "#" },
          ]}
          heading={{ icon: Wallet, title: "Advance Salary List" }}
        />
            <Preloader />
        </div>
    }
     if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
          routes={[
            { title: "Payroll", url: "#" },
            { title: "Advance Salary", url: "#" },
          ]}
          heading={{ icon: Wallet, title: "Advance Salary List" }}
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
          { title: "Payroll", url: "#" },
          { title: "Advance Salary", url: "#" },
        ]}
        heading={{ icon: Wallet, title: "Advance Salary List" }}
        actions={ 
          privileges?.can_add ? [
          {
            label: `${t("createNewBtn") || "Create New"} (Ctrl+C)`,
            type: "primary",
            icon: Plus,
            onClick: () => navigate("/payroll/advance-salary/add-new"),
          },
        ] : [] }
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

export default AdvanceSalaryList;