import { useState, useEffect } from "react";
import { SaveAll, X, Plus, Trash2, BadgeDollarSign } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import DateInput from "@/components/elements/theme/DateInput";
import TextArea from "@/components/elements/theme/TextArea";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import { Button } from "@/components/ui/button";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { showToast } from "@/utils/toast";

const BonusDeductionMasterForm = () => {
  const { bonusDeductionId } = useParams();
  const editMode = Boolean(bonusDeductionId);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedBranchId, user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState({});

  // Master form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    month: new Date().toISOString().split("T")[0].slice(0, 7) + "-01",
    narration: "",
  });

  // Detail rows
  const [details, setDetails] = useState([
    { employeeId: "", bonus: 0, deduction: 0, bonusNarration: "", deductionNarration: "" },
  ]);

  // Dropdown options
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranchId]);

  useEffect(() => {
    if (editMode && bonusDeductionId) {
      loadBonusDeductionMaster();
    }
  }, [editMode, bonusDeductionId]);

  // Keyboard shortcuts
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
  }, [formData, details, generalSettings]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const empRes = await axiosInstance.get("employees").catch(() => ({ data: { data: [] } }));
      const empOptions = (empRes?.data?.data || []).map((emp) => ({
        value: emp.employeeId || emp.EmployeeId,
        label: emp.employeeName || emp.EmployeeName || emp.name,
      }));
      setEmployees(empOptions);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBonusDeductionMaster = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`bonusdeductionmaster-byId/${bonusDeductionId}`);
      const data = res?.data?.data;

      if (data) {
        const master = data.master || {};
        const detailsArray = data.details || [];

        setFormData({
          date: master.date
            ? master.date.split("T")[0]
            : master.Date
            ? master.Date.split("T")[0]
            : new Date().toISOString().split("T")[0],
          month: master.month
            ? master.month.split("T")[0]
            : master.Month
            ? master.Month.split("T")[0]
            : new Date().toISOString().split("T")[0].slice(0, 7) + "-01",
          narration: master.narration || master.Narration || "",
        });

        if (detailsArray.length > 0) {
          const mappedDetails = detailsArray.map((d) => ({
            employeeId: d.employeeId || d.EmployeeId || "",
            bonus: d.bonus !== undefined ? Number(d.bonus) : 0,
            deduction: d.deduction !== undefined ? Number(d.deduction) : 0,
            bonusNarration: d.bonusNarration || d.BonusNarration || "",
            deductionNarration: d.deductionNarration || d.DeductionNarration || "",
          }));
          setDetails(mappedDetails);
        } else {
          setDetails([
            { employeeId: "", bonus: 0, deduction: 0, bonusNarration: "", deductionNarration: "" },
          ]);
        }
      }
    } catch (err) {
      console.error("Error loading bonus deduction master:", err);
      setAlert({
        id: Date.now(),
        type: "error",
        message: err?.response?.data?.message || "Failed to load bonus deduction master details",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleDetailChange = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);

    const errKey = `detail_${index}_${field}`;
    if (errors[errKey]) setErrors((prev) => ({ ...prev, [errKey]: "" }));
  };

  const addDetailRow = () => {
    setDetails([
      ...details,
      { employeeId: "", bonus: 0, deduction: 0, bonusNarration: "", deductionNarration: "" },
    ]);
  };

  const removeDetailRow = (index) => {
    if (details.length === 1) {
      setDetails([
        { employeeId: "", bonus: 0, deduction: 0, bonusNarration: "", deductionNarration: "" },
      ]);
      return;
    }
    setDetails(details.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.month) newErrors.month = "Month is required";

    if (details.length === 0) {
      newErrors.details = "At least one detail row is required";
    } else {
      details.forEach((detail, index) => {
        if (!detail.employeeId) {
          newErrors[`detail_${index}_employeeId`] = "Employee is required";
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

    const payload = {
      date: formData.date,
      month: formData.month,
      narration: formData.narration,
      branchId: selectedBranchId,
      ...(editMode
        ? { ModifiedUser: user?.userId || "admin" }
        : { CreatedUser: user?.userId || "admin" }),
      details: details.map((d) => ({
        employeeId: Number(d.employeeId),
        bonus: Number(d.bonus || 0),
        deduction: Number(d.deduction || 0),
        bonusNarration: d.bonusNarration || "",
        deductionNarration: d.deductionNarration || "",
      })),
    };

    try {
      const url = editMode
        ? `update-bonusdeductionmaster/${bonusDeductionId}`
        : "save-bonusdeductionmaster";
      const response = await axiosInstance.post(url, payload);

      if (!response.data.error) {
        showToast.success(
          editMode
            ? "Bonus & Deduction updated successfully"
            : "Bonus & Deduction saved successfully"
        );
        navigate("/payroll/bonus-deduction");
      } else {
        setAlert({
          id: Date.now(),
          type: "error",
          message: response.data.message || "Failed to save record.",
        });
      }
    } catch (err) {
      console.error("Error saving bonus deduction master:", err);
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
    navigate("/payroll/bonus-deduction");
  };

  // Summary calculations
  const totalBonus = details.reduce((sum, d) => sum + Number(d.bonus || 0), 0);
  const totalDeduction = details.reduce((sum, d) => sum + Number(d.deduction || 0), 0);
  const netAmount = totalBonus - totalDeduction;

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: "Payroll", url: "#" },
            { title: "Bonus & Deduction", url: "/payroll/bonus-deduction" },
            { title: editMode ? "Edit" : "Add New", url: "#" },
          ]}
          heading={{
            icon: BadgeDollarSign,
            title: editMode ? "Edit Bonus & Deduction" : "Create Bonus & Deduction",
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
          { title: "Bonus & Deduction", url: "/payroll/bonus-deduction" },
          { title: editMode ? "Edit" : "Add New", url: "#" },
        ]}
        heading={{
          icon: BadgeDollarSign,
          title: editMode ? "Edit Bonus & Deduction" : "Create Bonus & Deduction",
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
              Bonus & Deduction Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DateInput
                label="Date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                error={errors.date}
                required
              />

              <DateInput
                label="Month"
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                error={errors.month}
                required
                type="month"
              />

              <TextArea
                label="Narration"
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                placeholder="Enter narration notes here..."
                rows={2}
              />
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Bonus & Deduction Details
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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-gray-100 dark:border-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#252525] border-b border-gray-150 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <th className="px-3 py-2 w-12">S.No</th>
                    <th className="px-3 py-2 min-w-[180px]">Employee</th>
                    <th className="px-3 py-2 w-36 text-right">Bonus</th>
                    <th className="px-3 py-2 min-w-[160px]">Bonus Narration</th>
                    <th className="px-3 py-2 w-36 text-right">Deduction</th>
                    <th className="px-3 py-2 min-w-[160px]">Deduction Narration</th>
                    <th className="px-3 py-2 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((detail, index) => {
                    const employeeError = errors[`detail_${index}_employeeId`];

                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>

                        <td className="px-3 py-2 min-w-[180px]">
                          <SearchableDropdown
                            options={employees}
                            value={detail.employeeId}
                            onChange={(val) => handleDetailChange(index, "employeeId", val)}
                            error={employeeError}
                            placeholder="Select Employee"
                          />
                        </td>

                        {/* Bonus */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full max-w-[130px] bg-transparent border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-right font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                              value={detail.bonus === 0 ? "" : detail.bonus}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleDetailChange(index, "bonus", e.target.value)
                              }
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                handleDetailChange(index, "bonus", isNaN(val) ? 0 : val);
                              }}
                            />
                          </div>
                        </td>

                        {/* Bonus Narration */}
                        <td className="px-3 py-2 min-w-[160px]">
                          <input
                            type="text"
                            className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                            value={detail.bonusNarration}
                            placeholder="Bonus reason..."
                            onChange={(e) =>
                              handleDetailChange(index, "bonusNarration", e.target.value)
                            }
                          />
                        </td>

                        {/* Deduction */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full max-w-[130px] bg-transparent border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-right font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                              value={detail.deduction === 0 ? "" : detail.deduction}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleDetailChange(index, "deduction", e.target.value)
                              }
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                handleDetailChange(index, "deduction", isNaN(val) ? 0 : val);
                              }}
                            />
                          </div>
                        </td>

                        {/* Deduction Narration */}
                        <td className="px-3 py-2 min-w-[160px]">
                          <input
                            type="text"
                            className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                            value={detail.deductionNarration}
                            placeholder="Deduction reason..."
                            onChange={(e) =>
                              handleDetailChange(index, "deductionNarration", e.target.value)
                            }
                          />
                        </td>

                        <td className="px-3 py-2 text-center">
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

            {/* Summary Row */}
            <div className="flex justify-end gap-6 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Employees:{" "}
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {details.filter((d) => d.employeeId).length}
                </span>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Bonus:{" "}
                <span className="font-bold text-green-600 dark:text-green-400">
                  {totalBonus.toFixed(2)}
                </span>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total Deduction:{" "}
                <span className="font-bold text-red-500 dark:text-red-400">
                  {totalDeduction.toFixed(2)}
                </span>
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Net:{" "}
                <span
                  className={`font-bold ${
                    netAmount >= 0
                      ? "text-[var(--main-bg)]"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {netAmount.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BonusDeductionMasterForm;