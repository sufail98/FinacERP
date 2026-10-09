import { useState, useEffect } from "react";
import { Edit, Trash2, Plus, DollarSign } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import SalarySettingsForm from "./SalarySettingsForm";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import useAuth from "@/redux/hook/auth/useAuth";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import NoAcessComponent from '@/components/common/NoAcessComponent';
import usePrivileges from '@/lib/hooks/usePrivileges';

const SalarySettingsList = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation();
  const { selectedBranchId } = useAuth();
   const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Salary Settings");

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`getall-salarysettings/${selectedBranchId}`);
      
      // Transform the API response to extract master data
      const transformedData = res.data.data?.map((item, index) => ({
        SNo: index + 1,
        salarySettingsId: item.master.salarySettingsId,
        employeeId: item.master.employeeId,
        employeeName: item.master.employeeName,
        date: item.master.date,
        totalAmount: calculateTotalAmount(item.details),
        branchId: item.master.branchId,
        details: item.details, // Keep details for reference if needed
      })) || [];
      
      setData(transformedData);
    } catch (err) {
      console.error("Error fetching salary settings:", err);
      setAlert({
        id: Date.now(),
        type: "error",
        message: "Failed to fetch salary settings",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount from details
  const calculateTotalAmount = (details) => {
    if (!details || details.length === 0) return "0.00";
    
    const total = details.reduce((sum, detail) => {
      return sum + parseFloat(detail.amount || 0);
    }, 0);
    
    return total.toFixed(2);
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

        if (open) return;

        setMode("add");
        setSelectedId(null);
        setOpen(true);
        return;
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setSelectedId(null);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

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
      const response = await axiosInstance.get(`delete-salarysettings/${id}`);
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
    { key: "employeeName", label: "Employee Name", sortable: true },
    { 
      key: "date", 
      label: "Date", 
      sortable: true,
      render: (value) => {
        // Format date to display nicely
        const date = new Date(value);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
      }
    },
    { 
      key: "totalAmount", 
      label: "Total Amount", 
      sortable: true,
      render: (value) => `₹${value}` // Add currency symbol
    },
  ];

  const actions = []
  if(privileges?.can_edit){
    actions.push({
       icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedId(row.salarySettingsId);
        setMode("edit");
        setOpen(true);
      },
      className:
        "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
      tooltip: "Edit",
    })
  }
  if(privileges?.can_delete){
    actions.push({
       icon: <Trash2 className="h-4 w-4" />,
      className:
        "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
      onClick: (row) => {
        handleDelete(row.salarySettingsId);
      },
      tooltip: "Delete",
    })
  }


  const breadcrumbProps = {
    routes: [
      { title: "Payroll", url: "#" },
      { title: "Salary Settings", url: "#" },
    ],
    heading: {
      icon: DollarSign,
      title: "Salary Settings",
    },
    actions : 
      privileges?.can_add 
      ? [
        {
          label: `${t("createNewBtn") || "Create New"} (Ctrl+C)`,
        type: "primary",
        icon: Plus,
        onClick: () => {
          setMode("add");
          setSelectedId(null);
          setOpen(true);
        },
        }
      ]
      : []
    
    
  };

  if (privilegeLoading || loading) {
        return <div>
          <BreadCrumb {...breadcrumbProps} />
            <Preloader />
        </div>
    }

     if (!hasAccess) {
        return (
            <div>
                <BreadCrumb {...breadcrumbProps} />
                <NoAcessComponent message={message} />
            </div>
        );
    }

 

  return (
    <div>
      {alert && (
        <AlertBox key={alert.id} message={alert.message} type={alert.type} />
      )}

      <BreadCrumb {...breadcrumbProps} />

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

      <SalarySettingsForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setSelectedId(null);
        }}
        mode={mode}
        id={selectedId}
        onSaved={(alertData) => {
          fetchData();
          setAlert(alertData);
        }}
      />
    </div>
  );
};

export default SalarySettingsList;