import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import MultiMasterFormModal from "../MultiMasterFormModal";
import { Button } from "@/components/ui/button";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import TextInput from "@/components/elements/theme/TextInput";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import AlertBox from "@/components/common/AlertBox";
import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddProdGroup = ({ open, handleClose, onSuccess, editId }) => {
    const { t } = useTranslation();
    const focusInputRef = useAutoFocus(open, 200, 'input[name="groupCode"]');
    const { user, selectedBranchId } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [finalError, setFinalError] = useState(null);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        groupCode: "",
        groupName: "",
        scaleGroup: false,
        productCodeLength: "",
        nextNumber: "",
    });

    const fetchSingleData = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`get-product-main-group-byId/${id}`);
            const data = res.data.data;
            setFormData({
                groupCode: data.groupCode,
                groupName: data.groupName || "",
                scaleGroup: data.scaleGroup || false,
                productCodeLength: data.productCodeLength || "",
                nextNumber: data.nextNumber || "",
            });
        } catch (err) {
            console.error(t("productMainGroup.alerts.fetchSingleError"), err);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (editId && open) {
            fetchSingleData(editId);
        } else {
            resetForm();
        }
    }, [editId, open, fetchSingleData]);

    const resetForm = () => {
        setFormData({
            groupCode: "",
            groupName: "",
            scaleGroup: false,
            productCodeLength: "",
            nextNumber: "",
        });
        setFinalError(null);
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (finalError) setFinalError(null);
        
        // Clear error for the changed field
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        
        // Also clear productCodeLength error if groupCode changes
        if (name === "groupCode" && errors.productCodeLength) {
            setErrors((prev) => ({ ...prev, productCodeLength: "" }));
        }
    };

    const handleCheckboxChange = (checked) => {
        setFormData((prev) => ({ ...prev, scaleGroup: checked }));
    };

    const validateField = (name, value) => {
        let error = "";

        if (["groupCode", "groupName"].includes(name)) {
            if (!value || value.toString().trim() === "") {
                error = t("requiredFieldsError");
            }
        }

        // Validate productCodeLength against groupCode length
        if (name === "productCodeLength") {
            const productCodeLength = Number(value);
            const groupCodeLength = formData.groupCode ? formData.groupCode.toString().length : 0;
            
            if (productCodeLength > 0 && groupCodeLength > 0 && productCodeLength <= groupCodeLength) {
                error = t("productMainGroup.form.fields.productCodeLength.error") || 
                        `Product code length must be greater than group code length (${groupCodeLength})`;
            }
        }

        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Validate required fields
        Object.keys(formData).forEach((key) => {
            if (["groupCode", "groupName"].includes(key)) {
                const err = validateField(key, formData[key]);
                if (err) newErrors[key] = err;
            }
        });

        // Validate productCodeLength against groupCode length
        const productCodeLength = Number(formData.productCodeLength);
        const groupCodeLength = formData.groupCode ? formData.groupCode.toString().length : 0;
        
        if (productCodeLength > 0 && groupCodeLength > 0 && productCodeLength <= groupCodeLength) {
            newErrors.productCodeLength = t("productMainGroup.form.fields.productCodeLength.error") || 
                                         `Product code length must be greater than group code length (${groupCodeLength})`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ✅ Helper function for user-friendly error messages
    const getErrorMessage = (error) => {
        const errorMessage = error?.response?.data?.message || error?.message || "";
        const errorMessageLower = errorMessage.toLowerCase();

        // Foreign key violation - Group Code is in use
        if (
            errorMessageLower.includes("foreign key") ||
            errorMessageLower.includes("still referenced") ||
            errorMessage.includes("23503")
        ) {
            return t("productMainGroup.alerts.groupCodeInUse");
        }

        // Duplicate entry
        if (
            errorMessageLower.includes("duplicate") ||
            errorMessageLower.includes("already exists") ||
            errorMessageLower.includes("unique")
        ) {
            return t("productMainGroup.alerts.duplicateGroupCode");
        }

        return errorMessage || t("productMainGroup.alerts.saveError");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        
        if (editId && generalSettings?.askConfirmationEdit) {
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
        } else if (!editId && generalSettings?.askConfirmationSave) {
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

        setSubmitting(true);
        setFinalError(null);

        try {
            const payload = {
                groupCode: formData.groupCode,
                groupName: formData.groupName,
                scaleGroup: formData.scaleGroup,
                productCodeLength: Number(formData.productCodeLength) || 0,
                nextNumber: Number(formData.nextNumber) || 0,
                branchId: selectedBranchId,
                ...(editId ? { ModifiedUser: user?.userId } : { CreatedUser: user?.userId }),
            };

            let res;
            if (editId) {
                res = await axiosInstance.post(`update-product-main-group/${editId}`, payload);
            } else {
                res = await axiosInstance.post("save-product-main-group", payload);
            }

            if (res.data) {
                setAlert({
                    key: new Date(),
                    type: "success",
                    message: editId
                        ? t("productMainGroup.alerts.updateSuccess")
                        : t("productMainGroup.alerts.createSuccess"),
                });
                if (onSuccess) onSuccess();
                handleClose();
            } else {
                setAlert({ key: new Date(), type: "error", message: t("productMainGroup.alerts.saveError") });
            }
        } catch (err) {
            console.error(err);
            const friendlyMessage = getErrorMessage(err);
            setFinalError(friendlyMessage);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (open && !submitting) {
                    const fakeEvent = { preventDefault: () => { } };
                    handleSubmit(fakeEvent);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, formData, submitting]);

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
        <>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <MultiMasterFormModal 
                open={open} 
                handleClose={handleModalClose} 
                title={editId ? t("productMainGroup.form.title.edit") : t("productMainGroup.form.title.add")}
            >
                {loading ? (
                    <p className="text-center py-4">{t("productMainGroup.form.loading")}</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TextInput
                            id="groupCode"
                            name="groupCode"
                            label={t("productMainGroup.form.fields.groupCode.label")}
                            value={formData.groupCode}
                            onChange={handleChange}
                            placeholder={t("productMainGroup.form.fields.groupCode.placeholder")}
                            className="border-gray-500"
                            required
                            error={errors.groupCode}
                            onBlur={(e) => validateField(e.target.name, e.target.value)}
                        />

                        <TextInput
                            id="groupName"
                            name="groupName"
                            label={t("productMainGroup.form.fields.groupName.label")}
                            value={formData.groupName}
                            onChange={handleChange}
                            placeholder={t("productMainGroup.form.fields.groupName.placeholder")}
                            className="border-gray-500"
                            required
                            error={errors.groupName}
                            onBlur={(e) => validateField(e.target.name, e.target.value)}
                        />

                        <TextInput
                            id="productCodeLength"
                            name="productCodeLength"
                            label={t("productMainGroup.form.fields.productCodeLength.label")}
                            value={formData.productCodeLength}
                            onChange={handleChange}
                            placeholder={t("productMainGroup.form.fields.productCodeLength.placeholder")}
                            className="border-gray-500"
                            type="number"
                            error={errors.productCodeLength}
                            onBlur={(e) => validateField(e.target.name, e.target.value)}
                        />

                        <TextInput
                            id="nextNumber"
                            name="nextNumber"
                            label={t("productMainGroup.form.fields.nextNumber.label")}
                            value={formData.nextNumber}
                            onChange={handleChange}
                            placeholder={t("productMainGroup.form.fields.nextNumber.placeholder")}
                            className="border-gray-500"
                            type="number"
                        />

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="scaleGroup"
                                checked={formData.scaleGroup}
                                onCheckedChange={handleCheckboxChange}
                            />
                            <label htmlFor="scaleGroup">{t("productMainGroup.form.fields.scaleGroup")}</label>
                        </div>

                        {finalError && (
                            <div className="text-red-500 text-sm text-end">{finalError}</div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={handleModalClose}>
                                {t("productMainGroup.form.buttons.cancel")}
                            </Button>
                            <Button 
                                type="submit" 
                                className="main-bg text-white hover:opacity-90" 
                                disabled={submitting}
                            >
                                {submitting
                                    ? (editId ? t("productMainGroup.form.buttons.updating") : t("productMainGroup.form.buttons.saving"))
                                    : (editId ? t("productMainGroup.form.buttons.update") : t("productMainGroup.form.buttons.save"))
                                }
                            </Button>
                        </div>
                    </form>
                )}
            </MultiMasterFormModal>
        </>
    );
};

export default AddProdGroup;