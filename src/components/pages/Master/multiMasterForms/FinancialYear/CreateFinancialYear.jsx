import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../MultiMasterFormModal";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import DateInput from "@/components/elements/theme/DateInput";

const CreateFinancialYear = ({ open, handleClose, onSuccess, selectedId, canClose }) => {
    const { t } = useTranslation();
    const focusInputRef = useAutoFocus(open, 200, 'input[name="fromDate"]');
    const [errorMsg, setErrorMsg] = useState(null);
    const { selectedBranchId, user } = useAuth();

    const [formData, setFormData] = useState({
        fromDate: "",
        toDate: "",
        closed: false,
        branchId: selectedBranchId,
        CreatedUser: user?.userId,
    });

    const [loading, setLoading] = useState(false);

    // ✅ Ref to always access latest formData (needed after async blur wait)
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setFormData({
                fromDate: "",
                toDate: "",
                closed: false,
                branchId: selectedBranchId,
                CreatedUser: user?.userId,
            });
            setErrorMsg(null);
        }
    }, [open, selectedBranchId, user?.userId]);

    function formatDate(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts[0].length === 4) return dateStr;
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    }

    // 🔄 Fetch data if editing
    useEffect(() => {
        if (selectedId && open) {
            setLoading(true);
            axiosInstance
                .get(`get-financial-year-byId/${selectedId}`)
                .then((res) => {
                    if (!res.data?.error) {
                        const data = res.data.data;
                        if (!res.data?.error) {
                            setFormData({
                                fromDate: formatDate(data.fromDate),
                                toDate: formatDate(data.toDate),
                                closed: data.closed || false,
                                branchId: data.branchId || selectedBranchId,
                                CreatedUser: data.CreatedUser || user?.userId,
                            });
                        }
                    }
                })
                .catch((err) => {
                    console.error("Error fetching financial year data:", err);
                    setErrorMsg("Failed to load financial year data");
                })
                .finally(() => setLoading(false));
        }
    }, [selectedId, open, selectedBranchId, user?.userId]);

    // ✅ FIXED: Guard against DateInput blur clearing valid values
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => {
            if (type === 'checkbox') return { ...prev, [name]: checked };
            // Protect date fields — don't let empty overwrite a valid value
            if ((name === 'fromDate' || name === 'toDate') && !value && prev[name]) {
                return prev;
            }
            return { ...prev, [name]: value };
        });
        if (errorMsg) setErrorMsg(null);
    };

    // ✅ FIXED: Distinguish "empty" vs "typed but invalid"
    const validateForm = () => {
        const currentData = formDataRef.current;

        // --- From Date ---
        if (!currentData.fromDate) {
            const fromInput = document.querySelector('input[name="fromDate"]');
            const hasText = fromInput && fromInput.value.trim().length > 0;
            setErrorMsg(
                hasText
                    ? (t("financialYear.form.invalidFromDate") || "Please enter a valid From Date (e.g., 01-04-2025)")
                    : (t("financialYear.form.fromDateRequired") || "From Date is required")
            );
            fromInput?.focus();
            return false;
        }

        // --- To Date ---
        if (!currentData.toDate) {
            const toInput = document.querySelector('input[name="toDate"]');
            const hasText = toInput && toInput.value.trim().length > 0;
            setErrorMsg(
                hasText
                    ? (t("financialYear.form.invalidToDate") || "Please enter a valid To Date (e.g., 31-03-2026)")
                    : (t("financialYear.form.toDateRequired") || "To Date is required")
            );
            toInput?.focus();
            return false;
        }

        // --- Date order ---
        if (new Date(currentData.fromDate) >= new Date(currentData.toDate)) {
            setErrorMsg(t("financialYear.form.dateOrderError") || "To Date must be after From Date");
            return false;
        }

        return true;
    };

    // ✅ FIXED: Blur active date input first, wait for DateInput processing
    const handleSubmit = async (e) => {
        e.preventDefault();

        // If user is still focused on a date input, blur it first
        // DateInput has 150ms setTimeout in handleBlur → wait 200ms
        const activeEl = document.activeElement;
        if (activeEl && ['fromDate', 'toDate'].includes(activeEl.name)) {
            activeEl.blur();
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!validateForm()) return;

        try {
            setLoading(true);
            setErrorMsg(null);

            const currentData = formDataRef.current;

            const submitData = {
                fromDate: currentData.fromDate,
                toDate: currentData.toDate,
                closed: currentData.closed,
                branchId: Number(currentData.branchId),
                CreatedUser: currentData.CreatedUser,
            };

            if (selectedId) {
                await axiosInstance.post(`update-financial-year/${selectedId}`, {
                    ...submitData,
                    ModifiedUser: user?.userId,
                });
            } else {
                await axiosInstance.post("save-financial-year", submitData);
            }

            onSuccess();
            handleClose();
        } catch (error) {
            console.error("Error saving financial year:", error);
            setErrorMsg(
                error.response?.data?.message ||
                "Failed to save financial year. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <MultiMasterFormModal
            open={open}
            handleClose={handleClose}
            title={selectedId ? t("financialYear.form.editTitle") : t("financialYear.form.title")}
        >
            {loading ? (
                <p className="text-center py-4 text-gray-600 dark:text-gray-400">{t("loadingText")}</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* From Date */}
                    <div className="space-y-2">
                        <DateInput
                            label={t("financialYear.form.fromDate")}
                            ref={focusInputRef}
                            id="fromDate"
                            name="fromDate"
                            type="date"
                            value={formData.fromDate}
                            onChange={handleChange}
                            required
                            className="w-full"
                        />
                    </div>

                    {/* To Date */}
                    <div className="space-y-2">
                        <DateInput
                            label={t("financialYear.form.toDate") || "To Date"}
                            id="toDate"
                            name="toDate"
                            type="date"
                            value={formData.toDate}
                            onChange={handleChange}
                            required
                            min={formData.fromDate}
                            className="w-full"
                        />
                    </div>

                    {/* Status Checkbox */}
                    {!selectedId && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="closed"
                                name="closed"
                                checked={formData.closed}
                                onChange={handleChange}
                                className="w-4 h-4 rounded 
                                    border-gray-300 dark:border-gray-600 
                                    text-blue-600 dark:text-blue-500
                                    bg-white dark:bg-gray-700
                                    focus:ring-blue-500 dark:focus:ring-blue-400
                                    focus:ring-2"
                            />
                            <Label htmlFor="closed" className="cursor-pointer text-gray-700 dark:text-gray-300">
                                {t("financialYear.form.closed")}
                            </Label>
                        </div>
                    )}

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="text-red-600 dark:text-red-400 text-sm animate-shake">
                            {errorMsg}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="bg-white dark:bg-[#242424]
                                border-gray-500 dark:border-gray-600
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-600
                                transition-colors"
                        >
                            {t("financialYear.form.cancel") || "Cancel"}
                        </Button>
                        <Button
                            type="submit"
                            className="main-bg dark:main-bg 
                                text-white 
                                hover:opacity-90 dark:hover:bg-blue-500
                                transition-colors
                                disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    {selectedId ?
                                        (t("financialYear.form.updating") || "Updating...") :
                                        (t("financialYear.form.saving") || "Saving...")
                                    }
                                </>
                            ) : (
                                selectedId ?
                                    (t("financialYear.form.update") || "Update") :
                                    (t("financialYear.form.save") || "Save")
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </MultiMasterFormModal>
    );
};

export default CreateFinancialYear;