import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import TextInput from '@/components/elements/theme/TextInput'
import { Button } from '@/components/ui/button'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import { Fade, Modal, useMediaQuery } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddBankModal = ({ open, handleClose, onSuccess }) => {
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null)

    const isMobile = useMediaQuery("(max-width:600px)");
    
    const { t } = useTranslation();
    const { editId } = useParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState(null);
    const [accountGroups, setAccoutGroups] = useState([]);
    const { selectedBranchId, userId, currentFinancialYear, currentCurrencyConversion } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const [formData, setFormData] = useState({
        ledgerCode: "",
        ledgerName: "",
        groupId: "",
        openingBalance: "",
        crOrDr: "",
        accountNo: "",
        bankaccname: "",
        bankname: "",
        ibanno: "",
        bankBranchName: "",
        bankSwiftCode: "",
    });

    useEffect(() => {
        if (!selectedBranchId) return;
        fetchAccountGroupData();
    }, [selectedBranchId]);

    useEffect(() => {
        if (editId) fetchEditData(editId);
    }, [editId]);

    const fetchAccountGroupData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('bank-customer-supplier-accountgroups', { group_ids: [5, 6] });
            setAccoutGroups(response.data.data);
        } catch (error) {
            console.error("Error fetching account groups:", error);
            setAlert({ type: "error", message: "Error fetching account groups" });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEditData = async (id) => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${id}`);
            if (response.data?.data) {
                const ledger = response.data.data;
                setFormData({
                    ledgerCode: ledger.ledgerCode || "",
                    ledgerName: ledger.ledgerName || "",
                    groupId: ledger.groupId?.toString() || "",
                    openingBalance: ledger.openingBalance || "",
                    crOrDr: ledger.crOrDr === "Cr" ? "credit" : "debit",
                    accountNo: ledger.accountNo || "",
                    bankaccname: ledger.bankaccname || "",
                    bankname: ledger.bankname || "",
                    ibanno: ledger.ibanno || "",
                    bankBranchName: ledger.bankBranchName || "",
                    bankSwiftCode: ledger.bankSwiftCode || "",
                });
            }
        } catch (error) {
            console.error("Error fetching ledger data:", error);
            setAlert({ type: "error", message: "Error loading bank data" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.ledgerCode?.trim()) newErrors.ledgerCode = t("requiredFieldsError");
        if (!formData.ledgerName?.trim()) newErrors.ledgerName = t("requiredFieldsError");
        if (!formData.groupId) newErrors.groupId = t("requiredFieldsError");
        if (!formData.openingBalance) newErrors.openingBalance = t("requiredFieldsError");
        if (!formData.crOrDr) newErrors.crOrDr = t("requiredFieldsError");

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const prepareApiData = () => ({
        ledgerName: formData.ledgerName,
        groupId: parseInt(formData.groupId),
        affectInventory: true,
        openingBalance: parseFloat(formData.openingBalance),
        crOrDr: formData.crOrDr === 'credit' ? 'Cr' : 'Dr',
        narration: `Opening ${formData.ledgerName} account`,
        name: formData.ledgerName,
        accountNo: formData.accountNo,
        branchId: selectedBranchId,
        ledgerCode: formData.ledgerCode,
        bankaccname: formData.bankaccname,
        bankname: formData.bankname,
        ibanno: formData.ibanno,
        bankBranchName: formData.bankBranchName,
        bankSwiftCode: formData.bankSwiftCode,
        exchangeDate: currentCurrencyConversion.date,
        exchangeRate: currentCurrencyConversion.rate,
        currencyConversionId: currentCurrencyConversion.currencyConversionId,
        activeFinancialYear_fromDate: currentFinancialYear.fromDate,
        ...(editId ? { ModifiedUser: userId } : { CreatedUser: userId }),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

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
}else null;

        setIsSaving(true);
        setAlert(null);

        try {
            const apiData = prepareApiData();

            const response = editId
                ? await axiosInstance.post(`update-account-ledger/${editId}`, apiData)
                : await axiosInstance.post('save-account-ledger', apiData);

            if (!response.data.error) {
                setFormData({})
                onSuccess && onSuccess();
                handleClose && handleClose();
            } else {
                setAlert({
                    type: 'error',
                    message: response.data.message || 'Failed to save bank account'
                });
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Error deleting Department";
            const finalMessage = errorMessage
                .toLowerCase()
                .includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            setAlert({
                id: Date.now(),
                type: "error",
                message: finalMessage,
            });
            setSubmitError(error.response?.data?.message)
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeAfterTransition
            slotProps={{
                backdrop: {
                    timeout: 300,
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '.dark &': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        }
                    }
                }
            }}
            style={{ zIndex: "99999999999999999" }}
        >
            <Fade in={open}>
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: isMobile ? "95%" : "50%",
                    }}
                    className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl transition-colors p-4 max-h-[90vh] overflow-y-auto"
                >
                    {/* Title */}
                    <div className="mb-4 pb-3 border-b border-gray-300 dark:border-gray-600 text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                        Add Bank
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4" id='bank-form'>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* LEFT SECTION */}
                            <div className="space-y-4">
                                <TextInput
                                    name="ledgerCode"
                                    label={t("bank.form.ledgerCode")}
                                    value={formData.ledgerCode}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.ledgerCodePlaceholder")}
                                    required
                                    error={errors.ledgerCode}
                                />

                                <TextInput
                                    name="ledgerName"
                                    label={t("bank.form.ledgerName")}
                                    value={formData.ledgerName}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankNamePlaceholder")}
                                    required
                                    error={errors.ledgerName}
                                />

                                <SearchableDropdown
                                    name="groupId"
                                    id="groupId"
                                    label={t("bank.form.group")}
                                    value={formData.groupId}
                                    onChange={(val) => handleSelectChange("groupId", val)}
                                    placeholder={t("bank.form.selectGroup")}
                                    searchPlaceholder={t("bank.form.searchGroup")}
                                    clearable={true}
                                    options={
                                        accountGroups.map((group) => ({
                                            value: group.groupId?.toString(),
                                            label: group.accountGroupName
                                        }))
                                    }
                                    required
                                    error={errors.groupId}
                                />

                                <TextInput
                                    name="openingBalance"
                                    label={t("bank.form.openingBalance")}
                                    value={formData.openingBalance}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.openingBalancePlaceholder")}
                                    type="number"
                                    step="0.01"
                                    error={errors.openingBalance}
                                    required
                                />

                                <SearchableDropdown
                                    name="crOrDr"
                                    id="crOrDr"
                                    label={t("bank.form.creditOrDebit")}
                                    value={formData.crOrDr}
                                    onChange={(val) => handleSelectChange("crOrDr", val)}
                                    placeholder={t("bank.form.selectOption")}
                                    searchPlaceholder={t("bank.form.search")}
                                    options={[
                                        { value: "credit", label: t("bank.form.credit") },
                                        { value: "debit", label: t("bank.form.debit") },
                                    ]}
                                    required
                                    error={errors.crOrDr}
                                />
                            </div>

                            {/* RIGHT SECTION */}
                            <div className="space-y-4">
                                <TextInput
                                    name="accountNo"
                                    label={t("bank.form.accountNumber")}
                                    value={formData.accountNo}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.accountNumberPlaceholder")}
                                />

                                <TextInput
                                    name="bankaccname"
                                    label={t("bank.form.bankAccountName")}
                                    value={formData.bankaccname}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankAccountNamePlaceholder")}
                                />

                                <TextInput
                                    name="bankname"
                                    label={t("bank.form.bankName")}
                                    value={formData.bankname}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankNamePlaceholder")}
                                />

                                <TextInput
                                    name="ibanno"
                                    label={t("bank.form.ibanNumber")}
                                    value={formData.ibanno}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.ibanNumberPlaceholder")}
                                />

                                <TextInput
                                    name="bankBranchName"
                                    label={t("bank.form.bankBranchName")}
                                    value={formData.bankBranchName}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankBranchNamePlaceholder")}
                                />

                                <TextInput
                                    name="bankSwiftCode"
                                    label={t("bank.form.swiftCode")}
                                    value={formData.bankSwiftCode}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.swiftCodePlaceholder")}
                                />
                            </div>
                        </div>
                    </form>

                    {/* Error Message */}
                    {submitError && (
                        <div className="text-red-600 dark:text-red-400 text-sm animate-shake mt-3">
                            {submitError}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex pt-4 justify-end gap-3 border-t border-gray-300 dark:border-gray-600 mt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 rounded-md text-sm font-medium transition-colors
                                bg-white dark:bg-[#242424]
                                border border-gray-500 dark:border-gray-600
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                            {t("cancelBtn")}
                        </button>

                        <button
                            disabled={isSaving}
                            type="submit"
                            form="bank-form"
                            className="px-4 py-2 rounded-md text-sm font-medium transition-colors
                                bg-[var(--main-bg)] dark:main-bg
                                text-white
                                hover:opacity-90 dark:hover:bg-blue-500
                                disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSaving ? t("saving") : t("submitBtn")}
                        </button>
                    </div>
                </div>
            </Fade>
        </Modal>
    )
}

export default AddBankModal