import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../MultiMasterFormModal";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";

// ✅ Reusable Inputs
import TextInput from "@/components/elements/theme/TextInput";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { sanitize } from "@/lib/inputSanitizer";

const DepartmentForm = ({ open, handleClose, onSuccess, selectedId }) => {
    const { t } = useTranslation();
    const focusInputRef = useAutoFocus(open, 200, 'input[name="departmentName"]');
    const [errorMsg, setErrorMsg] = useState(null);
    const { selectedBranchId, user } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const [formData, setFormData] = useState({
        departmentName: "",
        branchId: selectedBranchId,
        CreatedUser: user?.userId,
    });

    const [loading, setLoading] = useState(false);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setFormData({
                departmentName: "",
                branchId: selectedBranchId,
                CreatedUser: user?.userId,
            });
            setErrorMsg(null);
        }
    }, [open, selectedBranchId, user?.userId]);

    // Fetch data if editing
    useEffect(() => {
        if (selectedId && open) {
            setLoading(true);
            axiosInstance
                .get(`get-department-byId/${selectedId}`)
                .then((res) => {
                    if (!res.data?.error) {
                        const data = res.data.data;
                        setFormData({
                            departmentName: data.departmentName || "",
                            branchId: data.branchId || selectedBranchId,
                            CreatedUser: data.CreatedUser || user?.userId,
                        });
                    }
                })
                .catch((err) => {
                    console.error("Error fetching department data:", err);
                    setErrorMsg("Failed to load department data");
                })
                .finally(() => setLoading(false));
        }
    }, [selectedId, open, selectedBranchId, user?.userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value
        if(["departmentName"].includes(name)){
            updatedValue = sanitize.alphaNumericSpace(value)
        }
        setFormData((prev) => ({
            ...prev,
            [name]: updatedValue,
        }));

        if (errorMsg) setErrorMsg(null);
    };

    const validateForm = () => {
        if (!formData.departmentName.trim()) {
            setErrorMsg("Department Name is required");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (selectedId && generalSettings?.askConfirmationEdit) {
    const result = await Swal.fire({
        title: t('ConfirmUpdateTitle'),
        text: t('ConfirmUpdateText'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t('YesUpdate'),
        cancelButtonText: t('Cancel'),
        didOpen: () => {
            const container = document.querySelector('.swal2-container');
            if (container) {
                container.style.cssText += '; z-index: 2147483647 !important;';
            }
        }
    });
    if (!result.isConfirmed) return;
} else if (!selectedId && generalSettings?.askConfirmationSave) {
    const result = await Swal.fire({
        title: t('ConfirmSaveTitle'),
        text: t('ConfirmSaveText'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t('YesSave'),
        cancelButtonText: t('Cancel'),
        didOpen: () => {
            const container = document.querySelector('.swal2-container');
            if (container) {
                container.style.cssText += '; z-index: 2147483647 !important;';
            }
        }
    });
    if (!result.isConfirmed) return;
}

        try {
            setLoading(true);
            setErrorMsg(null);

            const submitData = {
                departmentName: formData.departmentName.trim(),
                branchId: formData.branchId,
                CreatedUser: formData.CreatedUser,
            };

            if (selectedId) {
                await axiosInstance.post(`update-department/${selectedId}`, {
                    ...submitData,
                    ModifiedUser: user?.userId,
                });
            } else {
                await axiosInstance.post("save-department", submitData);
            }

            onSuccess();
            handleClose();
        } catch (error) {
            console.error("Error saving department:", error);
            setErrorMsg(
                error.response?.data?.message ||
                "Failed to save department. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = async () => {
    if (generalSettings?.askConfirmationClose) {
      const result = await Swal.fire({
        title: t('ConfirmCloseTitle'),
        text: t('ConfirmCloseText'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t('YesClose'),
        cancelButtonText: t('Cancel'),
        didOpen: () => {
          const container = document.querySelector('.swal2-container');
          if (container) {
            container.style.cssText += '; z-index: 2147483647 !important;';
          }
        }
      });
      if (!result.isConfirmed) return;
    }
    handleClose();
  };

    return (
        <MultiMasterFormModal
            open={open}
            handleClose={handleClose}
            title={
                selectedId
                    ? t("department.form.editTitle") || "Edit Department"
                    : t("department.form.title") || "Add Department"
            }
        >
            {loading ? (
                <p className="text-center py-4 text-gray-600 dark:text-gray-400">
                    {t("loadingText") || "Loading..."}
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Department Name */}
                    <TextInput
                        ref={focusInputRef}
                        id="departmentName"
                        name="departmentName"
                        label={t("department.form.departmentName") || "Department Name"}
                        required
                        value={formData.departmentName}
                        onChange={handleChange}
                        placeholder={
                            t("department.form.departmentNamePlaceholder") ||
                            "Enter department name"
                        }
                        error={
                            errorMsg?.includes("Department Name") ? errorMsg : undefined
                        }
                    />

                    {/* General error message */}
                    {errorMsg && !errorMsg.includes("Department Name") && (
                        <div className="text-red-600 dark:text-red-400 text-sm animate-shake">
                            {errorMsg}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleModalClose}
                            className="border-gray-300 dark:border-gray-600 
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {t("department.form.cancel") || "Cancel"}
                        </Button>
                        <Button 
                            type="submit" 
                            className="main-bg text-white hover:opacity-90 transition-opacity" 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    {selectedId
                                        ? t("department.form.updating") || "Updating..."
                                        : t("department.form.saving") || "Saving..."}
                                </>
                            ) : selectedId ? (
                                t("department.form.update") || "Update"
                            ) : (
                                t("department.form.save") || "Save"
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </MultiMasterFormModal>
    );
};

export default DepartmentForm;