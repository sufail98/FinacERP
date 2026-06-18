import React, { useState, useEffect } from 'react';
import { Eraser, SaveAll, Settings2, Trash2 } from 'lucide-react';
import BreadCrumb from '@/components/common/BreadCrumb';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { useTranslation } from 'react-i18next';
import TextInput from '@/components/elements/theme/TextInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { voucherItems } from '../../../../public/assets/js/voucherTypes';
import { useSelector } from 'react-redux';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import axiosInstance from '@/lib/axiosConfig';
import AlertBox from '@/components/common/AlertBox';
import Preloader from '@/components/common/Preloader';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import useCtrlSave from '@/lib/hooks/useCtrlSave';
import { showToast } from '@/utils/toast';

const SuffixPrefixSettings = () => {
    const { privileges, hasAccess, message, loading: privilageLoading } = usePrivileges("Suffix Prefix Settings");
    const { selectedBranchId, userId, currentFinancialYear } = useAuth();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        suffixPrefixId: null,
        yearId: Number(currentFinancialYear?.yearId) || null,
        voucherType: '',
        startIndex: '',
        prefix: '',
        suffix: '',
        addWithZero: false,
        noOfZero: 0,
        branchId: selectedBranchId,
        CreatedUser: userId,
    });

    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ type: "", message: "" });

    // Fetch suffix-prefix if voucherType changes
    useEffect(() => {
        const fetchSuffixPrefix = async () => {
            if (!formData.voucherType || !currentFinancialYear?.yearId) return;
            try {
                const res = await axiosInstance.get(
                    `suffix-prefix-by-voucherType-yearId?voucherType=${formData.voucherType}&yearId=${currentFinancialYear?.yearId}&branchId=${selectedBranchId}`
                );

                if (!res.data.error && res.data.data) {
                    setFormData((prev) => ({
                        ...prev,
                        ...res.data.data,
                    }));
                } else {
                    setFormData((prev) => ({
                        ...prev,
                        suffixPrefixId: null,
                        startIndex: '',
                        prefix: '',
                        suffix: '',
                        addWithZero: false,
                        noOfZero: 0,
                    }));
                }
            } catch (error) {
                console.error("Fetch suffix prefix error:", error);
            }
        };

        fetchSuffixPrefix();
    }, [formData.voucherType, formData.yearId]);

    const handleInputChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCheckboxChange = (checked) => {
        setFormData((prev) => ({
            ...prev,
            addWithZero: checked,
        }));
    };

    const handleSaveOrUpdate = async () => {
        try {
            setSaving(true);

            const payload = {
                ...formData,
                startIndex: Number(formData.startIndex) || 0,
                noOfZero: Number(formData.noOfZero) || 0,
            };

            let res;
            if (formData.suffixPrefixId) {
                res = await axiosInstance.post(`update-suffix-prefix/${formData.suffixPrefixId}`, payload);
            } else {
                res = await axiosInstance.post("save-suffix-prefix", payload);
            }

            if (!res.data.error) {
                showToast.success(t("saveSuccess") || "Saved successfully");
                handleClear();
                if (res.data.data?.suffixPrefixId) {
                    setFormData((prev) => ({
                        ...prev,
                        suffixPrefixId: res.data.data.suffixPrefixId,
                    }));
                }
            } else {
               showToast.error(res.data?.message || t("saveFailed") || "Save failed");
            }
        } catch (error) {
          showToast.error(error.response?.data?.message || error.message || t("saveFailed") || "Save failed");
            console.error("Save/update error:", error);
        } finally {
            setSaving(false);
        }
    };
    useCtrlSave(handleSaveOrUpdate, [formData]);

    const handleClear = () => {
        setFormData({
            suffixPrefixId: null,
            voucherType: '',
            startIndex: '',
            prefix: '',
            suffix: '',
            addWithZero: false,
            noOfZero: 0,
        });
    };

    const handleDelete = async () => {
        if (!privileges?.can_delete) return;

        const result = await Swal.fire({
            title: t("delete.title"),
            text: t("delete.text"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("delete.confirm"),
            cancelButtonText: t("delete.cancel"),
        });

        if (!result.isConfirmed) return;
        try {
            setSaving(true);

            const res = await axiosInstance.get(`delete-suffix-prefix/${formData.suffixPrefixId}`);

            if (!res.data.error) {
                showToast.success(t("deleteSuccess") || "Deleted successfully");
                handleClear();
            } else {
                showToast.error(res.data?.message || t("deleteFailed") || "Delete failed");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Product";
            const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            showToast.error(finalMessage);
            console.error("Delete error:", error);
        } finally {
            setSaving(false);
        }
    };

    if (privilageLoading) {
        return (
<div className=" bg-white dark:bg-[#1e1e1e] transition-colors">
                <BreadCrumb
                    routes={[
                        { title: t("suffixPrefix.breadcrumb.settings"), url: "#" },
                        { title: t("suffixPrefix.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Settings2, title: t("suffixPrefix.heading") }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
<div className=" bg-white dark:bg-[#1e1e1e] transition-colors">
                <BreadCrumb
                    routes={[
                        { title: t("suffixPrefix.breadcrumb.settings"), url: "#" },
                        { title: t("suffixPrefix.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Settings2, title: t("suffixPrefix.heading") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
<div className=" bg-white dark:bg-[#1e1e1e] transition-colors">
            <BreadCrumb
                routes={[
                    { title: t("suffixPrefix.breadcrumb.settings"), url: "#" },
                    { title: t("suffixPrefix.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Settings2, title: t("suffixPrefix.heading") }}
                actions={[
                    {
                        label: t("clearBtn"),
                        icon: Eraser,
                        type: "secondary",
                        onClick: handleClear,
                    },
                    ...(formData.suffixPrefixId
                        ? [
                            {
                                label: saving ? t("deleting") : t("deleteBtn") || "Delete",
                                icon: Trash2,
                                type: "danger",
                                onClick: handleDelete,
                                disabled: saving,
                            },
                        ]
                        : []),
                    ...(privileges?.can_add || privileges?.can_edit
                        ? [
                            {
                                label: saving
                                    ? t("saving")
                                    : formData.suffixPrefixId
                                        ? t("updateBtn") || "Update"
                                        : t("save") || "Save",
                                icon: SaveAll,
                                type: "primary",
                                onClick: handleSaveOrUpdate,
                                disabled: saving,
                            },
                        ]
                        : []),
                ]}
            />

            <div className="p-6">
                {alert.message && <AlertBox key={alert.key} type={alert.type} message={alert.message} />}

<div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm dark:shadow-gray-900/50 border border-gray-300 dark:border-gray-600 p-6 max-w-2xl mx-auto transition-colors">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <TextInput
                                name="fromDate"
                                label={t("suffixPrefix.form.fromDate")}
                                value={currentFinancialYear?.fromDate}
                                readOnly={true}
                            />
                         <TextInput
    label={t("suffixPrefix.form.toDate")}
    value={currentFinancialYear?.toDate}
    className="bg-gray-50 dark:bg-[#242424]"
    readOnly={true}
/>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <SearchableDropdown
                            label={t("suffixPrefix.form.voucherType")}
                            value={formData.voucherType}
                            onChange={(value) => handleInputChange("voucherType", value)}
                            options={voucherItems.map((value) => ({
                                label: value,
                                value: value,
                            }))}
                            placeholder={t("suffixPrefix.form.voucherType")}
                            searchPlaceholder={t("suffixPrefix.form.voucherTypeSearch")}
                            className="w-full"
                        />

                        <div className="space-y-4">
                            <TextInput
                                name="startIndex"
                                label={t("suffixPrefix.form.startIndex")}
                                value={formData.startIndex}
                                onChange={(e) => handleInputChange("startIndex", e.target.value)}
                                type="text"
                            />
                            <TextInput
                                name="prefix"
                                label={t("suffixPrefix.form.prefix")}
                                value={formData.prefix}
                                onChange={(e) => handleInputChange("prefix", e.target.value)}
                            />
                            <TextInput
                                name="suffix"
                                label={t("suffixPrefix.form.suffix")}
                                value={formData.suffix}
                                onChange={(e) => handleInputChange("suffix", e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="addWithZero"
                                    checked={formData.addWithZero}
                                    onCheckedChange={handleCheckboxChange}
                                    className="border-gray-300 dark:border-gray-600 
                                        data-[state=checked]:main-bg dark:data-[state=checked]:bg-blue-500
                                        data-[state=checked]:border-blue-600 dark:data-[state=checked]:border-blue-500"
                                />
                                <Label 
                                    htmlFor="addWithZero" 
                                    className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                    {t("suffixPrefix.form.addWithZero")}
                                </Label>
                            </div>

                            {formData.addWithZero && (
                                <div className="ml-6">
                                    <TextInput
                                        name="noOfZero"
                                        label={t("suffixPrefix.form.noOfZeros")}
                                        value={formData.noOfZero}
                                        onChange={(e) => handleInputChange("noOfZero", e.target.value)}
                                        type="number"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuffixPrefixSettings;