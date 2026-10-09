import { useState, useEffect, useRef } from "react";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TextInput from "@/components/elements/theme/TextInput";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import { useTranslation } from "react-i18next";
import AlertBox from "@/components/common/AlertBox";
import Swal from "sweetalert2";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { Plus, Trash2 } from "lucide-react";
import { sanitize } from "@/lib/inputSanitizer";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "95%", sm: "95%", md: 750 },
  boxShadow: 24,
  borderRadius: 3,
  p: 2,
  maxHeight: "90vh",
  overflowY: "auto",
};

const EMPTY_DETAIL = {
  payheadId: "",
  AmtOrPer: "",
  amount: "",
  payheadIdOf: "",
};

const SalarySettingsForm = ({
  open,
  handleClose,
  mode = "add",
  id = null,
  onSaved,
}) => {
  const { selectedBranchId, user } = useAuth();
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({
    employeeId: "",
    date: "",
  });

  const [details, setDetails] = useState([{ ...EMPTY_DETAIL }]);
  const [payheads, setPayheads] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [detailErrors, setDetailErrors] = useState([{}]);
  const [finalError, setFinalError] = useState("");
  const [alert, setAlert] = useState(null);

  const saveButtonRef = useRef(null);
  const formRef = useRef(null);

  const focusInputRef = useAutoFocus(open, 200, 'input[name="employeeId"]');

  // Fetch employees and payheads for dropdowns
  useEffect(() => {
    if (open) {
      const fetchDropdowns = async () => {
        try {
          const [empRes, payheadRes] = await Promise.all([
            axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
            axiosInstance.get(`getall-payhead/${selectedBranchId}`).catch(() => ({ data: { data: [] } }))
          ]);

          const empOptions = (empRes?.data?.data || []).map((emp) => ({
            value: emp.employeeId || emp.EmployeeId,
            label: emp.employeeName || emp.EmployeeName || emp.name,
          }));
          setEmployees(empOptions);

          setPayheads(payheadRes.data.data || []);
        } catch (err) {
          console.error("Error fetching dropdowns:", err);
        }
      };

      fetchDropdowns();
    }
  }, [open, selectedBranchId]);

  // Auto focus when editing
  useEffect(() => {
    if (mode === "edit" && !loading && open) {
      const timer = setTimeout(() => {
        const input = document.querySelector('input[name="employeeId"]');
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, mode, open]);

  // Fetch edit data - UPDATED
  useEffect(() => {
    if (mode === "edit" && id && open) {
      setLoading(true);
      axiosInstance
        .get(`salarysettings-byId/${id}`)
        .then((res) => {
          const responseData = res.data.data || {};
          const masterData = responseData.master || {};
          const detailsData = responseData.details || [];

          // Set form data from master
          setFormData({
            employeeId: (masterData.employeeId || ""),
            date: masterData.date ? masterData.date.substring(0, 10) : "",
          });

          // Set details data
          if (detailsData.length > 0) {
            const transformedDetails = detailsData.map((detail) => ({
              salarySettingsDetailsId: detail.salarySettingsDetailsId,
              payheadId: String(detail.payheadId || ""),
              AmtOrPer: detail.AmtOrPer || "",
              amount: detail.amount || "",
              payheadIdOf: detail.payheadIdOf ? String(detail.payheadIdOf) : "",
            }));
            setDetails(transformedDetails);
            setDetailErrors(transformedDetails.map(() => ({})));
          } else {
            setDetails([{ ...EMPTY_DETAIL }]);
            setDetailErrors([{}]);
          }
        })
        .catch((err) => {
          console.error("Error fetching salary settings:", err);
          setFinalError(
            err?.response?.data?.message || "Failed to load data"
          );
        })
        .finally(() => setLoading(false));
    } else if (mode === "add" && open) {
      // Reset for add mode
      setFormData({ employeeId: "", date: "" });
      setDetails([{ ...EMPTY_DETAIL }]);
      setDetailErrors([{}]);
    }
  }, [mode, id, open]);

  // Reset when close
  useEffect(() => {
    if (!open) {
      setFormData({ employeeId: "", date: "" });
      setDetails([{ ...EMPTY_DETAIL }]);
      setDetailErrors([{}]);
      setAlert(null);
      setErrors({});
      setFinalError("");
    }
  }, [open]);

  // --- Validation ---
  const validateField = (name, value) => {
    let error = "";
    if (name === "employeeId" && !String(value).trim()) {
      error = t("salarySettings.employeeRequired") || "Employee is required";
    }
    if (name === "date" && !value) {
      error = t("salarySettings.dateRequired") || "Date is required";
    }
    return error;
  };

  const validateDetailField = (name, value) => {
    let error = "";
    if (name === "payheadId" && !String(value).trim()) {
      error = t("salarySettings.payheadRequired") || "Payhead is required";
    }
    if (name === "AmtOrPer" && !String(value).trim()) {
      error = t("salarySettings.amtOrPerRequired") || "Amt/Per is required";
    }
    if (name === "amount" && (value === "" || value === null || value === undefined)) {
      error = t("salarySettings.amountRequired") || "Amount is required";
    }
    return error;
  };

  const handleBlur = (name, value) => {
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e) => {
    setFinalError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name, value) => {
    setFinalError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // --- Detail row handlers ---
  const handleDetailChange = (index, e) => {
    setFinalError("");
    const { name, value } = e.target;
    let updatedValue = value
    if(["AmtOrPer"].includes(name)){
     if (updatedValue === "" || /^\d*\.?\d{0,2}$/.test(updatedValue)) {
    // Valid
  } else {
    return;
  }
    }
    setDetails((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [name]: updatedValue } : row))
    );
  };

  const handleDetailBlur = (index, e) => {
    const { name, value } = e.target;
    const error = validateDetailField(name, value);
    setDetailErrors((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [name]: error } : row))
    );
  };

  const addDetailRow = () => {
    setDetails((prev) => [...prev, { ...EMPTY_DETAIL }]);
    setDetailErrors((prev) => [...prev, {}]);
  };

  // const removeDetailRow = (index) => {
  //   if (details.length === 1) return;
  //   setDetails((prev) => prev.filter((_, i) => i !== index));
  //   setDetailErrors((prev) => prev.filter((_, i) => i !== index));
  // };
  const removeDetailRow = (index) => {
    if (details.length === 1) {
        // Only one row left — clear it instead of removing it
        setDetails([{ ...EMPTY_DETAIL }]);
        setDetailErrors([{}]);
        return;
    }
    setDetails((prev) => prev.filter((_, i) => i !== index));
    setDetailErrors((prev) => prev.filter((_, i) => i !== index));
};

  // Enter key navigation
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      const target = e.target;
      if (target.tagName === "TEXTAREA") return;
      if (target.tagName === "BUTTON") return;
      if (target.tagName === "SELECT") return;

      e.preventDefault();
      if (!formRef.current) return;

      const focusableSelectors =
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

      const focusableElements = Array.from(
        formRef.current.querySelectorAll(focusableSelectors)
      );
      const visibleElements = focusableElements.filter(
        (el) => el.offsetParent !== null && !el.closest("[hidden]")
      );
      const currentIndex = visibleElements.indexOf(target);
      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        visibleElements[currentIndex + 1].focus();
      }
    }
  };

  // Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formData, details, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate header
    const newErrors = {};
    Object.entries(formData).forEach(([key, val]) => {
      const err = validateField(key, val);
      if (err) newErrors[key] = err;
    });

    // Validate details
    const newDetailErrors = details.map((row) => {
      const rowErrors = {};
      ["payheadId", "AmtOrPer", "amount"].forEach((key) => {
        const err = validateDetailField(key, row[key]);
        if (err) rowErrors[key] = err;
      });
      return rowErrors;
    });

    const hasDetailErrors = newDetailErrors.some(
      (row) => Object.keys(row).length > 0
    );

    if (Object.keys(newErrors).length || hasDetailErrors) {
      setErrors(newErrors);
      setDetailErrors(newDetailErrors);
      return;
    }

    // Confirmation
    if (mode === "edit" && generalSettings?.askConfirmationEdit) {
      const result = await Swal.fire({
        title: t("salarySettings.ConfirmUpdateTitle") || "Confirm Update",
        text: t("salarySettings.ConfirmUpdateText") || "Do you want to update this record?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("salarySettings.YesUpdate") || "Yes, Update",
        cancelButtonText: t("salarySettings.Cancel") || "Cancel",
        didOpen: () => {
          const container = document.querySelector(".swal2-container");
          if (container) container.style.cssText += "; z-index: 2147483647 !important;";
        },
      });
      if (!result.isConfirmed) return;
    } else if (mode === "add" && generalSettings?.askConfirmationSave) {
      const result = await Swal.fire({
        title: t("salarySettings.ConfirmSaveTitle") || "Confirm Save",
        text: t("salarySettings.ConfirmSaveText") || "Do you want to save this record?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("salarySettings.YesSave") || "Yes, Save",
        cancelButtonText: t("salarySettings.Cancel") || "Cancel",
        didOpen: () => {
          const container = document.querySelector(".swal2-container");
          if (container) container.style.cssText += "; z-index: 2147483647 !important;";
        },
      });
      if (!result.isConfirmed) return;
    }

    setSubmitLoading(true);

    const payload = {
      employeeId: Number(formData.employeeId),
      date: formData.date,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "edit" ? user?.userId : null,
      details: details.map((d) => ({
        payheadId: Number(d.payheadId),
        AmtOrPer: d.AmtOrPer,
        amount: parseFloat(d.amount),
        payheadIdOf: d.payheadIdOf ? Number(d.payheadIdOf) : Number(d.payheadId),
        CreatedUser: user?.userId,
      ModifiedUser: mode === "edit" ? user?.userId : null,
      })),
    };

    try {
      if (mode === "add") {
        await axiosInstance.post("save-salarysettingsanddetaiils", payload);
        onSaved &&
          onSaved({
            type: "success",
            message: t("salarySettings.saveSuccess") || "Salary settings saved successfully",
          });
      } else {
        await axiosInstance.post(`update-salarysettingsanddetails/${id}`, payload);
        onSaved &&
          onSaved({
            type: "success",
            message: t("salarySettings.updateSuccess") || "Salary settings updated successfully",
          });
      }
      handleClose();
    } catch (err) {
      console.error("Error saving salary settings:", err);
      setFinalError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      {alert?.message && <AlertBox type={alert?.type} message={alert?.message} />}

      <Modal
        open={open}
        onClose={(event, reason) => {
          if (reason === "backdropClick") setErrors({});
          handleClose();
        }}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { timeout: 500 } }}
        style={{ zIndex: "99999999999" }}
      >
        <Fade in={open}>
          <Box
            sx={style}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <Card className="border-none shadow-none p-0 bg-transparent dark:bg-transparent">
              <CardContent className="bg-transparent dark:bg-transparent">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {mode === "add"
                    ? t("salarySettings.addTitle") || "Add Salary Settings"
                    : t("salarySettings.editTitle") || "Edit Salary Settings"}
                </h2>

                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("salarySettings.loading") || "Loading..."}
                  </p>
                ) : (
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    className="space-y-4"
                  >
                    {/* Header fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SearchableDropdown
                        label={t("salarySettings.employeeLabel") || "Employee"}
                        options={employees}
                        value={formData.employeeId}
                        onChange={(val) => handleDropdownChange("employeeId", val)}
                        onBlur={() => handleBlur("employeeId", formData.employeeId)}
                        error={errors.employeeId}
                        placeholder={t("salarySettings.selectEmployee") || "Select Employee"}
                        required
                      />

                      <TextInput
                        label={t("salarySettings.dateLabel") || "Date"}
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        onBlur={(e) => handleBlur(e.target.name, e.target.value)}
                        error={errors.date}
                        required
                      />
                    </div>

                    {/* Details section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t("salarySettings.detailsLabel") || "Payhead Details"}
                        </h3>
                        <button
                          type="button"
                          onClick={addDetailRow}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded
                            bg-[var(--main-bg)] text-white hover:opacity-80 transition-opacity"
                        >
                          <Plus className="h-3 w-3" />
                          {t("salarySettings.addRow") || "Add Row"}
                        </button>
                      </div>

                      
                      {/* Table header */}
<div className="hidden sm:grid grid-cols-12 gap-2 mb-1 px-1">
    <div className="col-span-4 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("salarySettings.payheadLabel") || "Payhead"} <span className="text-red-500">*</span>
    </div>
    <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("salarySettings.amtOrPerLabel") || "Amt / Per"} <span className="text-red-500">*</span>
    </div>
    <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("salarySettings.amountLabel") || "Amount"} <span className="text-red-500">*</span>
    </div>
    <div className="col-span-3 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("salarySettings.payheadOfLabel") || "Of"}
    </div>
    <div className="col-span-1" />
</div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {details.map((row, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-12 gap-2 items-start bg-gray-50 dark:bg-[#2a2a2a] rounded-md p-2 border border-gray-200 dark:border-gray-700"
                          >
                            {/* Payhead select */}
                            <div className="col-span-12 sm:col-span-4">
                              <label className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                                {t("salarySettings.payheadLabel") || "Payhead"} *
                              </label>
                              <select
                                name="payheadId"
                                value={row.payheadId}
                                onChange={(e) => handleDetailChange(index, e)}
                                onBlur={(e) => handleDetailBlur(index, e)}
                                className={`w-full text-sm rounded-md border px-2 py-1.5 bg-white dark:bg-[#1e1e1e]
                                  text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500
                                  transition-colors
                                  ${detailErrors[index]?.payheadId
                                    ? "border-red-500 dark:border-red-400"
                                    : "border-gray-300 dark:border-gray-600"
                                  }`}
                              >
                                <option value="">
                                  {t("salarySettings.selectPayhead") || "-- Select --"}
                                </option>
                                {payheads.map((ph) => (
                                  <option
                                    key={ph.payheadId || ph.PayheadId || ph.id}
                                    value={ph.payheadId || ph.PayheadId || ph.id}
                                  >
                                    {ph.payheadName}
                                  </option>
                                ))}
                              </select>
                              {detailErrors[index]?.payheadId && (
                                <p className="text-red-500 dark:text-red-400 text-xs mt-0.5">
                                  {detailErrors[index].payheadId}
                                </p>
                              )}
                            </div>

                            {/* AmtOrPer input */}
                            <div className="col-span-6 sm:col-span-2">
                              <label className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                                {t("salarySettings.amtOrPerLabel") || "Amt/Per"} *
                              </label>
                              <input
                                type="text"
                                name="AmtOrPer"
                                value={row.AmtOrPer}
                                onChange={(e) => handleDetailChange(index, e)}
                                onBlur={(e) => handleDetailBlur(index, e)}
                                 min="0"
                                  step="0.01"
                                placeholder={t("salarySettings.amtOrPerPlaceholder") || "e.g. amt"}
                                className={`w-full text-sm rounded-md border px-2 py-1.5 bg-white dark:bg-[#1e1e1e]
                                  text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500
                                  placeholder-gray-400 dark:placeholder-gray-500 transition-colors
                                  ${detailErrors[index]?.AmtOrPer
                                    ? "border-red-500 dark:border-red-400"
                                    : "border-gray-300 dark:border-gray-600"
                                  }`}
                              />
                              {detailErrors[index]?.AmtOrPer && (
                                <p className="text-red-500 dark:text-red-400 text-xs mt-0.5">
                                  {detailErrors[index].AmtOrPer}
                                </p>
                              )}
                            </div>

                            {/* Amount input */}
                            <div className="col-span-6 sm:col-span-2">
                              <label className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                                {t("salarySettings.amountLabel") || "Amount"} *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                name="amount"
                                value={row.amount}
                                onChange={(e) => handleDetailChange(index, e)}
                                onBlur={(e) => handleDetailBlur(index, e)}
                                onKeyDown={(e) => {
                                  if(e.key === "-") e.preventDefault()
                                }}
                                placeholder="0.00"
                                className={`w-full text-sm rounded-md border px-2 py-1.5 bg-white dark:bg-[#1e1e1e]
                                  text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500
                                  placeholder-gray-400 dark:placeholder-gray-500 transition-colors
                                  ${detailErrors[index]?.amount
                                    ? "border-red-500 dark:border-red-400"
                                    : "border-gray-300 dark:border-gray-600"
                                  }`}
                              />
                              {detailErrors[index]?.amount && (
                                <p className="text-red-500 dark:text-red-400 text-xs mt-0.5">
                                  {detailErrors[index].amount}
                                </p>
                              )}
                            </div>

                        
                           {/* payheadIdOf select */}
<div className="col-span-11 sm:col-span-3">
    <label className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 block">
        {t("salarySettings.payheadOfLabel") || "Of"}
    </label>
    <select
        name="payheadIdOf"
        value={row.payheadIdOf}
        onChange={(e) => handleDetailChange(index, e)}
        title={
            payheads.find(
                (ph) => String(ph.payheadId || ph.PayheadId || ph.id) === String(row.payheadIdOf)
            )?.payheadName || (t("salarySettings.payheadOfTooltip") || "Payhead Of (optional)")
        }
        className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600
          px-2 py-1.5 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors
          truncate"
    >
        <option value="">-</option>
        {payheads.map((ph) => (
            <option
                key={ph.payheadId || ph.PayheadId || ph.id}
                value={ph.payheadId || ph.PayheadId || ph.id}
                title={ph.payheadName}
            >
                {ph.payheadName}
            </option>
        ))}
    </select>
</div>

                            {/* Delete row */}
                            <div className="col-span-1 flex items-center justify-center pt-1">
    <button
        type="button"
        onClick={() => removeDetailRow(index)}
        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        title={details.length === 1 ? "Clear row" : "Remove row"}
    >
        <Trash2 className="h-4 w-4" />
    </button>
</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {finalError && (
                      <div className="text-red-500 dark:text-red-400 text-sm flex justify-end animate-shake">
                        {finalError}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        tabIndex={-1}
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (generalSettings?.askConfirmationClose) {
                            const result = await Swal.fire({
                              title: t("salarySettings.ConfirmCloseTitle") || "Close?",
                              text: t("salarySettings.ConfirmCloseText") || "Unsaved changes will be lost.",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#3085d6",
                              cancelButtonColor: "#d33",
                              confirmButtonText: t("salarySettings.YesClose") || "Yes, Close",
                              cancelButtonText: t("salarySettings.Cancel") || "Cancel",
                              didOpen: () => {
                                const container = document.querySelector(".swal2-container");
                                if (container)
                                  container.style.cssText += "; z-index: 2147483647 !important;";
                              },
                            });
                            if (!result.isConfirmed) return;
                          }
                          setErrors({});
                          handleClose();
                        }}
                        className="bg-white dark:bg-[#242424]
                          border-gray-500 dark:border-gray-600
                          text-gray-700 dark:text-gray-300
                          hover:bg-gray-100 dark:hover:bg-gray-600
                          transition-colors"
                      >
                        {t("salarySettings.cancelBtn") || "Cancel"}
                      </Button>

                      <Button
                        ref={saveButtonRef}
                        type="submit"
                        disabled={submitLoading}
                        className="bg-[var(--main-bg)] dark:main-bg
                          text-white
                          flex items-center justify-center gap-2
                          hover:opacity-90 dark:hover:bg-blue-500
                          transition-colors
                          disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitLoading ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            <span>{t("salarySettings.saving") || "Saving..."}</span>
                          </>
                        ) : (
                          <>
                            {mode === "add"
                              ? t("salarySettings.saveBtn") || "Save"
                              : t("salarySettings.updateBtn") || "Update"}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

SalarySettingsForm.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSaved: PropTypes.func,
};

export default SalarySettingsForm;