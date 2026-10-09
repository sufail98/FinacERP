import { useState, useEffect, useRef } from "react";
import { SaveAll, X, Plus, Trash2, Receipt } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import DateInput from "@/components/elements/theme/DateInput";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import { Button } from "@/components/ui/button";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { showToast } from "@/utils/toast";

const SalaryMasterForm = () => {
  const { salaryMasterId } = useParams();
  const editMode = Boolean(salaryMasterId);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedBranchId, user, currentFinancialYear } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    VoucherNo: "",
    Date: new Date().toISOString().split("T")[0],
    Month: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}-01`;
    })(),
    Narration: "",
    LedgerId: "",
    EmployeeId: "",
    SalaryDate: new Date().toISOString().split("T")[0],
    Bonus: 0,
    Deduction: 0,
    Lop: 0,
    Salary: 0,
  });

  // Details Grid State (SalaryDetails2)
  const [salaryDetails, setSalaryDetails] = useState([{ PayheadId: "", Amount: 0 }]);

  // Dropdowns lists
  const [employees, setEmployees] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [payheads, setPayheads] = useState([]);

  // Fetch dropdowns on mount
  useEffect(() => {
    fetchDropdowns();
  }, [selectedBranchId]);

  // Load data for edit mode
  useEffect(() => {
    if (editMode && salaryMasterId) {
      loadSalaryMaster();
    }
  }, [editMode, salaryMasterId]);

  // Recalculate total Salary
  useEffect(() => {
    const sumOfDetails = salaryDetails.reduce((sum, item) => sum + Number(item.Amount || 0), 0);
    const calculatedSalary = sumOfDetails + Number(formData.Bonus || 0) - Number(formData.Deduction || 0) - Number(formData.Lop || 0);
    setFormData((prev) => ({
      ...prev,
      Salary: calculatedSalary >= 0 ? calculatedSalary : 0,
    }));
  }, [salaryDetails, formData.Bonus, formData.Deduction, formData.Lop]);

  // Keyboard shortcuts (Ctrl+S to save, Esc to cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(e);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData, salaryDetails, generalSettings]);

  const fetchDropdowns = async () => {
    try {
      setLoading(true);
      // Fetch Employees
      const empRes = await axiosInstance.get("employees").catch(() => ({ data: { data: [] } }));
      const empOptions = (empRes?.data?.data || []).map((emp) => ({
        value: emp.employeeId || emp.EmployeeId,
        label: emp.employeeName || emp.EmployeeName || emp.name,
      }));
      setEmployees(empOptions);

      // Fetch Ledgers
      const ledgerRes = await axiosInstance.get(`all-account-ledgers/${selectedBranchId}`).catch(() => ({ data: { data: [] } }));
      const ledgerOptions = (ledgerRes?.data?.data || []).map((l) => ({
        value: l.ledgerId || l.LedgerId,
        label: l.ledgerName || l.LedgerName || l.name,
      }));
      setLedgers(ledgerOptions);

      // Fetch Payheads with fallback endpoints
      const payheadOptions = await fetchPayheadsFallback();
      setPayheads(payheadOptions);

    } catch (err) {
      console.error("Error fetching dropdowns:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayheadsFallback = async () => {
      try {
        const response = await axiosInstance.get(`getall-payhead/${selectedBranchId}`);
        if (response?.data?.data) {
          const mapped = response.data.data.map((item) => {
            const id = item.payheadId || item.PayheadId || item.id || item.PayHeadId;
            const name = item.payheadName || item.PayheadName || item.name || item.holidayName || item.ledgerName;
            return { value: id, label: name };
          });
          if (mapped.length > 0) return mapped;
        }
      } catch (e) {
        console.warn(`Failed to fetch from`, e);
      }
    return [];
  };

  const loadSalaryMaster = async () => {
  try {
    setLoading(true);
    const res = await axiosInstance.get(`get-salarymaster-byId/${salaryMasterId}`);
    const data = res?.data?.data;
    
    if (data) {
      // Extract Master data
      const master = data.SalaryMaster || {};
      
      // Extract Details1 (contains Employee and Salary info)
      const details1Array = data.SalaryDetails1 || [];
      const details1 = details1Array.length > 0 ? details1Array[0] : {};
      
      // Extract Details2 (contains Payhead entries)
      const details2Object = data.SalaryDetails2 || {};
      
      // Get the first key from SalaryDetails2 object (e.g., "1")
      const details1Id = Object.keys(details2Object)[0];
      const details2Array = details1Id ? details2Object[details1Id] : [];

      // Populate Master form data
      setFormData({
        VoucherNo: master.VoucherNo || "",
        Date: master.Date ? master.Date.split("T")[0] : new Date().toISOString().split("T")[0],
        Month: master.Month ? master.Month.split("T")[0] : (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          return `${year}-${month}-01`;
        })(),
        Narration: master.Narration || "",
        LedgerId: master.LedgerId || "",
        EmployeeId: details1.EmployeeId || "",
        SalaryDate: details1.SalaryDate ? details1.SalaryDate.split("T")[0] : new Date().toISOString().split("T")[0],
        Bonus: details1.Bonus !== undefined ? Number(details1.Bonus) : 0,
        Deduction: details1.Deduction !== undefined ? Number(details1.Deduction) : 0,
        Lop: details1.Lop !== undefined ? Number(details1.Lop) : 0,
        Salary: details1.Salary !== undefined ? Number(details1.Salary) : 0,
      });

      // Populate SalaryDetails2 grid
      if (details2Array.length > 0) {
        const mappedDetails = details2Array.map((d) => ({
          PayheadId: d.PayheadId || "",
          Amount: d.Amount !== undefined ? Number(d.Amount) : 0,
        }));
        setSalaryDetails(mappedDetails);
      } else {
        setSalaryDetails([{ PayheadId: "", Amount: 0 }]);
      }
    }
  } catch (err) {
    console.error("Error loading salary master:", err);
    setAlert({ 
      id: Date.now(), 
      type: "error", 
      message: err?.response?.data?.message || "Failed to load salary master details" 
    });
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name] : "" }));
    }
  };

  const handleDropdownChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Detail Row Changes
  const handleDetailChange = (index, field, value) => {
    const updated = [...salaryDetails];
    updated[index][field] = value;
    setSalaryDetails(updated);

    const errKey = `detail_${index}_${field}`;
    if (errors[errKey]) {
      setErrors((prev) => ({ ...prev, [errKey]: "" }));
    }
  };

  const addDetailRow = () => {
    setSalaryDetails([...salaryDetails, { PayheadId: "", Amount: 0 }]);
  };

  const removeDetailRow = (index) => {
    if (salaryDetails.length === 1) {
      setSalaryDetails([{ PayheadId: "", Amount: 0 }]);
      return;
    }
    const updated = salaryDetails.filter((_, i) => i !== index);
    setSalaryDetails(updated);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.VoucherNo) newErrors.VoucherNo = "Voucher No is required";
    if (!formData.Date) newErrors.Date = "Date is required";
    if (!formData.Month) newErrors.Month = "Month is required";
    if (!formData.EmployeeId) newErrors.EmployeeId = "Employee is required";
    if (!formData.LedgerId) newErrors.LedgerId = "Ledger is required";

    if (salaryDetails.length === 0) {
      newErrors.details = "At least one salary detail row is required";
    } else {
      salaryDetails.forEach((detail, index) => {
        if (!detail.PayheadId) {
          newErrors[`detail_${index}_PayheadId`] = "Payhead is required";
        }
        if (Number(detail.Amount) <= 0) {
          newErrors[`detail_${index}_Amount`] = "Amount must be greater than 0";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validate()) {
      setAlert({
        id: Date.now(),
        type: "error",
        message: "Please fix the validation errors before saving.",
      });
      return;
    }

    // Confirmation dialog
    if (editMode && generalSettings?.askConfirmationEdit) {
      const result = await Swal.fire({
        title: t("ConfirmUpdateTitle") || "Confirm Update",
        text: t("ConfirmUpdateText") || "Do you want to update this record?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesUpdate") || "Yes, Update",
        cancelButtonText: t("Cancel") || "Cancel",
      });
      if (!result.isConfirmed) return;
    } else if (!editMode && generalSettings?.askConfirmationSave) {
      const result = await Swal.fire({
        title: t("ConfirmSaveTitle") || "Confirm Save",
        text: t("ConfirmSaveText") || "Do you want to save this record?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesSave") || "Yes, Save",
        cancelButtonText: t("Cancel") || "Cancel",
      });
      if (!result.isConfirmed) return;
    }

    setSubmitLoading(true);

    // Build payload (exact capitalization of payload properties is required)
    const payload = {
      VoucherNo: formData.VoucherNo,
      Date: formData.Date,
      Month: formData.Month,
      Narration: formData.Narration,
      FinancialYearId: currentFinancialYear?.yearId || currentFinancialYear?.FinancialYearId || 1,
      LedgerId: Number(formData.LedgerId),
      branchId: selectedBranchId,
      CreatedUser: user?.userId || "admin",
       ModifiedUser: editMode ? user?.userId : null,
      EmployeeId: Number(formData.EmployeeId),
      SalaryDate: formData.SalaryDate,
      Bonus: Number(formData.Bonus || 0),
      Deduction: Number(formData.Deduction || 0),
      Lop: Number(formData.Lop || 0),
      Salary: Number(formData.Salary || 0),
      SalaryDetails2: salaryDetails.map((d) => ({
        PayheadId: Number(d.PayheadId),
        Amount: Number(d.Amount || 0),
         CreatedUser: user?.userId || "admin",
       ModifiedUser: editMode ? user?.userId : null,
      })),
    };

    try {
      const url = editMode
        ? `update-salarymasteranddetails/${salaryMasterId}`
        : "save-salarymasteranddetails";
      const response = await axiosInstance.post(url, payload);

      if (!response.data.error) {
      showToast.success("Salary Master saved successfully");
        navigate("/payroll/salary-master");
      } else {
        setAlert({
          id: Date.now(),
          type: "error",
          message: response.data.message || "Failed to save record.",
        });
      }
    } catch (err) {
      console.error("Error saving salary master:", err);
      setAlert({
        id: Date.now(),
        type: "error",
        message: err.response?.data?.message || "Something went wrong while saving.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (generalSettings?.askConfirmationClose) {
      const result = await Swal.fire({
        title: t("ConfirmCloseTitle") || "Are you sure?",
        text: t("ConfirmCloseText") || "Unsaved changes will be lost.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesClose") || "Yes, Close",
        cancelButtonText: t("Cancel") || "Cancel",
      });
      if (!result.isConfirmed) return;
    }
    navigate("/payroll/salary-master");
  };

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: "Payroll", url: "#" },
            { title: "Salary Master", url: "/payroll/salary-master" },
            { title: editMode ? "Edit Salary Master" : "Add New", url: "#" },
          ]}
          heading={{
            icon: Receipt,
            title: editMode ? "Edit Salary Master" : "Create Salary Master",
          }}
        />
        <Preloader />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121212] transition-colors min-h-screen pb-12">
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <BreadCrumb
        routes={[
          { title: "Payroll", url: "#" },
          { title: "Salary Master", url: "/payroll/salary-master" },
          { title: editMode ? "Edit Salary Master" : "Add New", url: "#" },
        ]}
        heading={{
          icon: Receipt,
          title: editMode ? "Edit Salary Master" : "Create Salary Master",
        }}
        actions={[
          {
            label: "Cancel (Esc)",
            icon: X,
            type: "outline",
            onClick: handleCancel,
          },
          {
            label: submitLoading
              ? "Saving..."
              : editMode
              ? "Update (Ctrl+S)"
              : "Save (Ctrl+S)",
            icon: SaveAll,
            type: "primary",
            onClick: () => handleSubmit(),
            loading: submitLoading,
          },
        ]}
      />

      <div className="p-4 mx-auto max-w-7xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Master Form Section */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-2">
              Master Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput
                label="Voucher No"
                name="VoucherNo"
                value={formData.VoucherNo}
                onChange={handleInputChange}
                error={errors.VoucherNo}
                placeholder="Voucher Number"
                required
              />

              <DateInput
                label="Date"
                name="Date"
                value={formData.Date}
                onChange={handleInputChange}
                error={errors.Date}
                required
              />

              <DateInput
                label="Month"
                name="Month"
                value={formData.Month}
                onChange={handleInputChange}
                error={errors.Month}
                required
              />

              <SearchableDropdown
                label="Employee"
                options={employees}
                value={formData.EmployeeId}
                onChange={(val) => handleDropdownChange("EmployeeId", val)}
                error={errors.EmployeeId}
                placeholder="Select Employee"
                required
              />

              <SearchableDropdown
                label="Ledger"
                options={ledgers}
                value={formData.LedgerId}
                onChange={(val) => handleDropdownChange("LedgerId", val)}
                error={errors.LedgerId}
                placeholder="Select Ledger"
                required
              />

              <DateInput
                label="Salary Date"
                name="SalaryDate"
                value={formData.SalaryDate}
                onChange={handleInputChange}
                error={errors.SalaryDate}
              />
            </div>
          </div>

          {/* Details Form Section (SalaryDetails2) */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Salary Details
              </h3>
              <Button
                type="button"
                onClick={addDetailRow}
                className="bg-[var(--main-bg)] hover:opacity-90 text-white flex items-center gap-1 py-1 px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            {errors.details && (
              <div className="text-red-500 text-xs font-semibold">{errors.details}</div>
            )}

            <div className="">
              <table className="w-full text-left border-collapse border border-gray-100 dark:border-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#252525] border-b border-gray-150 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <th className="px-4 py-2 w-16">S.No</th>
                    <th className="px-4 py-2">Payhead</th>
                    <th className="px-4 py-2 w-48 text-right">Amount</th>
                    <th className="px-4 py-2 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryDetails.map((detail, index) => {
                    const payheadError = errors[`detail_${index}_PayheadId`];
                    const amountError = errors[`detail_${index}_Amount`];

                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 min-w-[200px]">
                          <SearchableDropdown
                            options={payheads}
                            value={detail.PayheadId}
                            onChange={(val) => handleDetailChange(index, "PayheadId", val)}
                            error={payheadError}
                            placeholder="Select Payhead"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              className={`w-full max-w-[180px] bg-transparent border rounded px-3 py-1.5 text-right font-mono outline-none 
                                ${
                                  amountError
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                } 
                                text-gray-900 dark:text-gray-100`}
                              value={detail.Amount === 0 ? "" : detail.Amount}
                              placeholder="0.00"
                              onChange={(e) => handleDetailChange(index, "Amount", e.target.value)}
                              onKeyDown={(e) => {
                                if(e.key === "-" || e.key === "+") e.preventDefault()
                              }}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                handleDetailChange(index, "Amount", isNaN(val) ? 0 : val);
                              }}
                            />
                            {amountError && (
                              <span className="text-red-500 text-[10px] mt-1">{amountError}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            type="button"
                            onClick={() => removeDetailRow(index)}
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 h-auto rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Narration Section */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Narration */}
              <div className="space-y-2">
                <TextArea
                  label="Narration"
                  name="Narration"
                  value={formData.Narration}
                  onChange={handleInputChange}
                  placeholder="Enter narration notes here..."
                  rows={4}
                />
              </div>

              {/* Right Column: Calculations */}
              <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-lg border border-gray-100 dark:border-gray-800 space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-1.5">
                  Calculation Summary
                </h4>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Bonus:</span>
                  <input
                    type="number"
                    name="Bonus"
                    className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-right font-mono text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={formData.Bonus === 0 ? "" : formData.Bonus}
                    placeholder="0.00"
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      setFormData((p) => ({ ...p, Bonus: isNaN(val) ? 0 : val }));
                    }}
                    onKeyDown={(e) => {
                      if(e.key === "-" || e.key === "+") e.preventDefault()
                    }}
                  />

                  <span className="text-gray-500 dark:text-gray-400">Deduction:</span>
                  <input
                    type="number"
                    name="Deduction"
                    className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-right font-mono text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={formData.Deduction === 0 ? "" : formData.Deduction}
                    placeholder="0.00"
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      setFormData((p) => ({ ...p, Deduction: isNaN(val) ? 0 : val }));
                    }}
                    onKeyDown={(e) => {
                      if(e.key === "-" || e.key === "+") e.preventDefault()
                    }}
                  />

                  <span className="text-gray-500 dark:text-gray-400">Lop (Loss of Pay):</span>
                  <input
                    type="number"
                    name="Lop"
                    className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-right font-mono text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={formData.Lop === 0 ? "" : formData.Lop}
                    placeholder="0.00"
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      setFormData((p) => ({ ...p, Lop: isNaN(val) ? 0 : val }));
                    }}
                     onKeyDown={(e) => {
                      if(e.key === "-" || e.key === "+") e.preventDefault()
                    }}
                  />

                  <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total Salary:</span>
                  <span className="text-right font-mono text-base font-bold text-[var(--main-bg)]">
                    {Number(formData.Salary).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryMasterForm;
