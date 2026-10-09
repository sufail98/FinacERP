import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import TextInput from "@/components/elements/theme/TextInput";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@mui/material";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { showToast } from "@/utils/toast";
import { sanitize } from "@/lib/inputSanitizer";

const UserGroupAddModal = ({ open, handleClose, onSuccess, editId }) => {
    const isMobile = useMediaQuery("(max-width:600px)");

    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "90%" : '600px',
        boxShadow: 24,
        borderRadius: 3,
        p: 2,
    };

    const { userId } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const focusInputRef = useAutoFocus(open, 200, 'input[name="groupName"]');
    const { t } = useTranslation();
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        groupName: "",
        status: "active",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);

    useEffect(() => {
        if (editId && open) {
            fetchUserGroupById(editId);
        } else if (!editId) {
            setFormData({ groupName: "", status: "active" });
        }
    }, [editId, open]);

    const fetchUserGroupById = async (id) => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-user-group-byId/${id}`);
            const data = response.data.data;
            setFormData({
                groupName: data.usergroupName || "",
                status: data.activeStatus === true ? "active" : "inactive",
            });
        } catch (error) {
            console.error("Error fetching group:", error);
            showToast.error(t('userGroup.alerts.fetchError'));
        } finally {
            setFetchLoading(false);
        }
    };

    const validateField = (name, value) => {
        let message = "";
        if (name === "groupName" && !value.trim()) {
            message = t('requiredFieldsError');
        }
        setErrors(prev => ({ ...prev, [name]: message }));
        return message === "";
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        validateField(name, value);
    };

    const handleInputChange = (e) => {
        const {name,value} = e.target
        let updatedValue = value
        if(["groupName"].includes(name)){
            updatedValue = sanitize.alphaNumericSpace(value)
        }
        setFormData({ ...formData, [name]: updatedValue });
    };

    const handleStatusChange = (e) => {
        setFormData({ ...formData, status: e.target.value });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (open && !isLoading) {
                    handleSubmit(new Event("submit"));
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, isLoading, formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isGroupNameValid = validateField("groupName", formData.groupName);
        if (!isGroupNameValid) return;

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
                if (container) container.style.cssText += '; z-index: 2147483647 !important;';
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
                if (container) container.style.cssText += '; z-index: 2147483647 !important;';
            }
        });
        if (!result.isConfirmed) return;
    }
        setIsLoading(true);
        try {
            const apiPayload = {
                usergroupName: formData.groupName.trim(),
                activeStatus: formData.status === "active" ? 1 : 0,
                CreatedUser: userId,
                 ModifiedUser: editId ? userId : null,
            };

            if (editId) {
                await axiosInstance.post(`update-user-group/${editId}`, apiPayload);
                    showToast.success(t('userGroup.alerts.updateSuccess'));
            } else {
                await axiosInstance.post("save-user-group", apiPayload);
                    showToast.success(t('userGroup.alerts.saveSuccess'));
            }

            setFormData({ groupName: "", status: "active" });

            if (onSuccess) onSuccess();

            handleClose();

        } catch (error) {
            console.error("Failed to save user group:", error);
            if (error.response?.data?.message=== "User Group already exists") {
                showToast.warning(t('userGroup.alerts.alreadyExists'));
            } else {
                showToast.error(t('userGroup.alerts.saveError'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalClose = () => {
        if (!isLoading) {
            setFormData({ groupName: "", status: "active" });
            handleClose();
        }
    };

    return (
        <>
            
            <Modal
                aria-labelledby="transition-modal-title"
                aria-describedby="transition-modal-description"
                open={open}
                onClose={handleModalClose}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{ 
                    backdrop: { 
                        timeout: 500,
                        sx: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '.dark &': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            }
                        }
                    } 
                }}
                style={{ zIndex: "9999999" }}
            >
                <Fade in={open}>
                    <Box sx={style} className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 transition-colors">
                        <Card className="border-none shadow-none p-0 bg-transparent dark:bg-transparent">
                            <CardContent className="bg-transparent dark:bg-transparent">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                                    {editId ? t('userGroup.form.editTitle') : t('userGroup.form.title')}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <TextInput
                                        id="groupName"
                                        name="groupName"
                                        label={t('userGroup.form.groupName')}
                                        value={formData.groupName}
                                        onChange={handleInputChange}
                                        placeholder={t('userGroup.form.placeholders.groupName')}
                                        required
                                        disabled={isLoading || fetchLoading}
                                        inputRef={focusInputRef}
                                        error={errors.groupName}
                                        onBlur={handleBlur}
                                    />

                                    <NormalSelectInput
                                        id="status"
                                        name="status"
                                        label={t('userGroup.form.status')}
                                        value={formData.status}
                                        onChange={handleStatusChange}
                                        options={[
                                            { value: "active", label: t('userGroup.status.active') },
                                            { value: "inactive", label: t('userGroup.status.inactive') },
                                        ]}
                                        placeholder={t('userGroup.form.placeholders.status')}
                                        required
                                        disabled={isLoading || fetchLoading}
                                    />
                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={handleModalClose} 
                                            disabled={isLoading}
                                            className="bg-white dark:bg-[#242424]
                                              border-gray-500 dark:border-gray-600
                                              text-gray-700 dark:text-gray-300
                                              hover:bg-gray-100 dark:hover:bg-gray-600
                                              transition-colors"
                                        >
                                            {t('userGroup.form.actions.cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-[var(--main-bg)] dark:main-bg
                                              text-white
                                              hover:opacity-90 dark:hover:bg-blue-500
                                              transition-colors
                                              disabled:opacity-60 disabled:cursor-not-allowed"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? t('userGroup.form.actions.saving') : editId ? t('userGroup.form.actions.update') : t('userGroup.form.actions.save')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </Box>
                </Fade>
            </Modal>
        </>
    );
};

export default UserGroupAddModal;

UserGroupAddModal.propTypes = {
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    editId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};