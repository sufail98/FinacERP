import TextInput from '@/components/elements/theme/TextInput'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import { Fade, Modal, useMediaQuery } from '@mui/material'
import { ChevronDown } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const SAUDI_BANKS = [
    "Al Rajhi Bank",
    "Alinma Bank",
    "Arab National Bank (ANB)",
    "Bank AlJazira",
    "Banque Saudi Fransi (BSF)",
    "Gulf International Bank (GIB)",
    "Riyad Bank",
    "Saudi Awwal Bank (SAB)",
    "Saudi Investment Bank",
    "Saudi National Bank (SNB)",
];

const AddBankModal = ({ open, handleClose, onSuccess }) => {
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null)
    const [finalError, setFinalError] = useState(null);

    const isMobile = useMediaQuery("(max-width:600px)");

    const { t } = useTranslation();
    const { editId } = useParams();
    const [isLoading, setIsLoading] = useState(false);
    const [fetchGrpLoading, setFetchGrpLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState(null);
    const [accountGroups, setAccoutGroups] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [branchDetails, setBranchDetails] = useState({});
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const bankDropdownRef = useRef(null);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const groupDropdownRef = useRef(null);

    const { selectedBranchId, userId, currentFinancialYear, currentCurrencyConversion, branches } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const activeBranches = useMemo(() => {
        return branches?.filter(b => b.activeStatus) || [];
    }, [branches]);

    const [formData, setFormData] = useState({
        ledgerCode: "",
        ledgerName: "",
        groupId: "",
        accountNo: "",
        bankaccname: "",
        bankname: "",
        ibanno: "",
        bankBranchName: "",
        bankSwiftCode: "",
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
                setShowBankDropdown(false);
            }
            if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
                setShowGroupDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!selectedBranchId) return;
        fetchAccountGroupData();
    }, [selectedBranchId]);

    useEffect(() => {
        if (editId) fetchEditData(editId);
    }, [editId]);

    useEffect(() => {
        if (formData.groupId && !editId) {
            genarateLedgercode();
        }
    }, [formData.groupId]);

    useEffect(() => {
        if (!editId && activeBranches && activeBranches.length > 0) {
            const firstBranchId = String(activeBranches[0].branchId);
            setSelectedBranches([firstBranchId]);
            setBranchDetails({
                [firstBranchId]: {
                    openingBalance: "",
                    crOrDr: "2"
                }
            });
        }
    }, [editId, activeBranches]);

    const fetchAccountGroupData = async () => {
        setFetchGrpLoading(true);
        try {
            const response = await axiosInstance.post('bank-customer-supplier-accountgroups', { group_ids: [5] });
            setAccoutGroups(response.data.data);
        } catch (error) {
            console.error("Error fetching account groups:", error);
            setAlert({ type: "error", message: "Error fetching account groups" });
        } finally {
            setFetchGrpLoading(false);
        }
    };

    const fetchEditData = async (id) => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${id}`);
            if (response.data?.data) {
                const data = response.data.data;

                if (data.branchId && Array.isArray(data.branchId)) {
                    const branchIds = data.branchId.map(bd => String(bd.branchId));
                    setSelectedBranches(branchIds);

                    const details = {};
                    data.branchId.forEach(bd => {
                        details[String(bd.branchId)] = {
                            openingBalance: bd.openingBalance?.toString() || "",
                            crOrDr: bd.crOrDr === "Cr" ? "1" : "2"
                        };
                    });
                    setBranchDetails(details);
                } else if (data.branchId) {
                    const branchArray = Array.isArray(data.branchId) ? data.branchId : [data.branchId];
                    const branchIds = branchArray.map(id => String(id));
                    setSelectedBranches(branchIds);

                    const details = {};
                    branchIds.forEach(id => {
                        details[id] = {
                            openingBalance: data.openingBalance?.toString() || "",
                            crOrDr: data.crOrDr === "Cr" ? "1" : "2"
                        };
                    });
                    setBranchDetails(details);
                }

                setFormData({
                    ledgerCode: data.ledgerCode || "",
                    ledgerName: data.ledgerName || "",
                    groupId: data.groupId?.toString() || "",
                    accountNo: data.accountNo || "",
                    bankaccname: data.bankaccname || "",
                    bankname: data.bankname || "",
                    ibanno: data.ibanno || "",
                    bankBranchName: data.bankBranchName || "",
                    bankSwiftCode: data.bankSwiftCode || "",
                });
            }
        } catch (error) {
            console.error("Error fetching ledger data:", error);
            setAlert({ type: "error", message: "Error loading bank data" });
        } finally {
            setIsLoading(false);
        }
    };

    const genarateLedgercode = async () => {
        try {
            const res = await axiosInstance.post('generate-ledger-code', {
                branchId: selectedBranchId,
                groupId: formData.groupId
            });
            setFormData(prev => ({
                ...prev,
                ledgerCode: res.data.data
            }));
        } catch (error) {
            console.error('Error generating ledger code', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        let updatedValue = value;

        // Fields: letters, numbers, and spaces
        if (["ledgerName", "bankaccname", "bankBranchName"].includes(name)) {
            updatedValue = value.replace(/[^A-Za-z0-9 ]/g, "");
        }
        // Fields: letters and numbers only, uppercase
        else if (["ledgerCode", "bankSwiftCode"].includes(name)) {
            updatedValue = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        }
        // Fields: IBAN and Account Number
        else if (["ibanno", "accountNo"].includes(name)) {
            updatedValue = value
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase()
                .slice(0, 34);
        }

        setFormData((prev) => ({ ...prev, [name]: updatedValue }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBankSelect = (bankName) => {
        setFormData(prev => ({ ...prev, bankname: bankName }));
        setShowBankDropdown(false);
    };

    const handleBranchToggle = (branchId) => {
        const branchIdStr = String(branchId);
        setSelectedBranches(prev => {
            if (prev.includes(branchIdStr)) {
                const newBranches = prev.filter(id => id !== branchIdStr);
                setBranchDetails(prevDetails => {
                    const newDetails = { ...prevDetails };
                    delete newDetails[branchIdStr];
                    return newDetails;
                });
                return newBranches;
            } else {
                setBranchDetails(prevDetails => ({
                    ...prevDetails,
                    [branchIdStr]: {
                        openingBalance: "",
                        crOrDr: "2"
                    }
                }));
                return [...prev, branchIdStr];
            }
        });

        if (errors.branches) {
            setErrors(prev => ({ ...prev, branches: '' }));
        }
        setFinalError(null);
    };

    const handleBranchDetailChange = (branchId, field, value) => {
        if (field === "openingBalance") {
            if (value !== "" && (value === "-" || Number(value) < 0)) {
                return; // reject negative values no matter how they got in
            }
        }

        setBranchDetails(prev => ({
            ...prev,
            [branchId]: {
                ...prev[branchId],
                [field]: value
            }
        }));

        setFinalError(null);
    };

    const handleBranchDetailBlur = (branchId, field) => {
        setBranchDetails(prev => {
            const raw = prev[branchId]?.[field];
            if (raw === "" || raw === undefined) return prev;

            const formatted = parseFloat(raw).toFixed(generalSettings.decimalPart);

            return {
                ...prev,
                [branchId]: {
                    ...prev[branchId],
                    [field]: formatted
                }
            };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.ledgerCode?.trim()) newErrors.ledgerCode = t("requiredFieldsError");
        if (!formData.ledgerName?.trim()) newErrors.ledgerName = t("requiredFieldsError");
        if (!formData.groupId) newErrors.groupId = t("requiredFieldsError");

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const prepareApiData = () => {
        const branchDetailsArray = selectedBranches.map(branchId => ({
            branchId: parseInt(branchId),
            openingBalance:
                parseFloat(
                    (parseFloat(branchDetails[branchId]?.openingBalance) || 0)
                        .toFixed(generalSettings.decimalPart)
                ),
            crOrDr: branchDetails[branchId]?.crOrDr === "1" ? "Cr" : "Dr"
        }));

        return {
            exchangeDate: currentCurrencyConversion?.date || '',
            exchangeRate: currentCurrencyConversion?.rate || '',
            currencyConversionId: currentCurrencyConversion?.currecyConversionId || '',
            activeFinancialYear_fromDate: currentFinancialYear?.fromDate || '',
            ledgerName: formData.ledgerName,
            groupId: parseInt(formData.groupId) || 1,
            ledgerCode: formData.ledgerCode,
            accountNo: formData.accountNo,
            bankaccname: formData.bankaccname,
            bankname: formData.bankname,
            ibanno: formData.ibanno,
            bankBranchName: formData.bankBranchName,
            bankSwiftCode: formData.bankSwiftCode,
            branchDetails: branchDetailsArray,
            ...(editId ? { ModifiedUser: userId } : { CreatedUser: userId }),
            extraDate: new Date().toISOString().split('T')[0],
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBranches || selectedBranches.length === 0) {
            setFinalError(t("accountLedger.form.branchRequired") || "Please select at least one branch");
            return;
        }

        for (const branchId of selectedBranches) {
            const details = branchDetails[branchId];
            if (!details || !details.crOrDr) {
                setFinalError(`Please select Cr/Dr for all selected branches`);
                return;
            }
        }

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
        }

        setIsSaving(true);
        setAlert(null);
        setFinalError(null);

        try {
            const apiData = prepareApiData();

            const response = editId
                ? await axiosInstance.post(`update-account-ledger/${editId}`, apiData)
                : await axiosInstance.post('save-account-ledger', apiData);

            if (!response.data.error) {
                setFormData({
                    ledgerCode: "",
                    ledgerName: "",
                    groupId: "",
                    accountNo: "",
                    bankaccname: "",
                    bankname: "",
                    ibanno: "",
                    bankBranchName: "",
                    bankSwiftCode: "",
                });
                setSelectedBranches([]);
                setBranchDetails({});
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
                error.response?.data?.message || error.message ||
                (editId ? "Failed to update bank account" : "Failed to save bank account");
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
            setSubmitError(error.response?.data?.message);
        } finally {
            setIsSaving(false);
        }
    };

    const showBranchGrid = activeBranches && activeBranches.length > 1;

    const branchPairs = [];
    if (activeBranches && activeBranches.length > 1) {
        for (let i = 0; i < activeBranches.length; i += 2) {
            branchPairs.push(activeBranches.slice(i, i + 2));
        }
    }

    const renderBranchRow = (branch) => {
        const branchIdStr = String(branch.branchId);
        const isSelected = selectedBranches.includes(branchIdStr);
        const crOrDrValue = branchDetails[branchIdStr]?.crOrDr || "";
        const showCrDrWarning = isSelected && !crOrDrValue;

        return (
            <div
                key={branch.branchId}
                className={`grid grid-cols-[20px_1fr_120px_70px] items-center gap-2 px-3 py-2
                   ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBranchToggle(branch.branchId)}
                    disabled={isLoading}
                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                />
                <span
                    className="text-xs text-gray-900 dark:text-gray-100 font-medium truncate"
                    title={branch.branchCode}
                >
                    {branch.branchCode}
                </span>
                <input
                    type="number"
                    step={1 / Math.pow(10, generalSettings.decimalPart)}
                    value={branchDetails[branchIdStr]?.openingBalance || ""}
                    onChange={(e) => handleBranchDetailChange(branchIdStr, 'openingBalance', e.target.value)}
                    onBlur={() => handleBranchDetailBlur(branchIdStr, 'openingBalance')}
                    onKeyDown={(e) => {
                        if (["-", "+", "e", "E"].includes(e.key)) {
                            e.preventDefault();
                        }
                    }}
                    disabled={!isSelected || isLoading}
                    className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
                    placeholder={(0).toFixed(generalSettings.decimalPart)}
                />
                <select
                    value={crOrDrValue}
                    onChange={(e) => handleBranchDetailChange(branchIdStr, 'crOrDr', e.target.value)}
                    disabled={!isSelected || isLoading}
                    className={`w-full px-1 py-1 text-xs rounded border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed
                     ${showCrDrWarning
                            ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600'}`}
                >
                    <option value="">Cr/Dr</option>
                    <option value="1">Cr</option>
                    <option value="2">Dr</option>
                </select>
            </div>
        );
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
                        width: isMobile ? "95%" : "60%",
                    }}
                    className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl transition-colors p-4 max-h-[90vh] overflow-y-auto"
                >
                    {/* Title */}
                    <div className="mb-4 pb-3 border-b border-gray-300 dark:border-gray-600 text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                        {editId ? t("bank.form.breadcrumb.edit.title") || "Edit Bank" : t("bank.form.breadcrumb.title") || "Add Bank"}
                    </div>

                    {alert && (
                        <div
                            className={`text-sm rounded px-2 py-1.5 mb-3 border ${alert.type === "error"
                                ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                : "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                }`}
                        >
                            {alert.message}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4" id='bank-form'>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* LEFT SECTION */}
                            <div className="space-y-3">
                                {/* Bank */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                        Bank
                                    </label>
                                    <div className="relative" ref={bankDropdownRef}>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                name="bankname"
                                                value={formData.bankname}
                                                onChange={handleChange}
                                                placeholder="Type bank name or select from list"
                                                className="w-full px-2 py-1.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:ring-1 focus:ring-teal-500 pr-8 text-sm transition-colors"
                                            />
                                            <div className="absolute right-0 flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBankDropdown((prev) => !prev)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5"
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={`transition-transform duration-200 ${showBankDropdown ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        {showBankDropdown && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                                {SAUDI_BANKS.map((bank) => (
                                                    <button
                                                        key={bank}
                                                        type="button"
                                                        onClick={() => handleBankSelect(bank)}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                                       text-gray-900 dark:text-gray-100 transition-colors
                                       ${formData.bankname === bank ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                                                    >
                                                        {bank}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Group */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                        Group <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={groupDropdownRef}>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                name="groupId"
                                                value={
                                                    accountGroups.find(
                                                        (g) => g.groupId?.toString() === formData.groupId,
                                                    )?.accountGroupName || ""
                                                }
                                                readOnly
                                                placeholder="Select Group"
                                                className="w-full px-2 py-1.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:ring-1 focus:ring-teal-500 pr-8 text-sm transition-colors cursor-pointer"
                                                onClick={() => setShowGroupDropdown((prev) => !prev)}
                                            />
                                            <div className="absolute right-0 flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGroupDropdown((prev) => !prev)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5"
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={`transition-transform duration-200 ${showGroupDropdown ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        {showGroupDropdown && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                                {accountGroups.map((group) => (
                                                    <button
                                                        key={group.groupId}
                                                        type="button"
                                                        onClick={() => {
                                                            handleSelectChange("groupId", group.groupId?.toString());
                                                            setShowGroupDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                                         text-gray-900 dark:text-gray-100 transition-colors
                                         ${formData.groupId === group.groupId?.toString() ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                                                    >
                                                        {group.accountGroupName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {errors.groupId && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                            {errors.groupId}
                                        </p>
                                    )}
                                </div>

                                {/* Ledger Name */}
                                <TextInput
                                    name="ledgerName"
                                    label={t("bank.form.ledgerName") || "Ledger Name"}
                                    value={formData.ledgerName}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankNamePlaceholder") || "Type Bank Name"}
                                    required
                                    error={errors.ledgerName}
                                />

                                {/* Code */}
                                <TextInput
                                    name="ledgerCode"
                                    label={t("bank.form.ledgerCode") || "Code"}
                                    value={formData.ledgerCode}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.ledgerCodePlaceholder") || "Auto-generated or type code"}
                                    required
                                    error={errors.ledgerCode}
                                />
                            </div>

                            {/* RIGHT SECTION */}
                            <div className="space-y-3">
                                <TextInput
                                    name="bankaccname"
                                    label={t("bank.form.bankAccountName") || "Bank Acc Name"}
                                    value={formData.bankaccname}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankAccountNamePlaceholder") || "Type bank account name"}
                                />

                                <TextInput
                                    name="ibanno"
                                    label={t("bank.form.ibanNumber") || "IBAN Number"}
                                    value={formData.ibanno}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.ibanNumberPlaceholder") || "Type IBAN number"}
                                    maxLength={34}
                                />

                                <TextInput
                                    name="bankBranchName"
                                    label={t("bank.form.bankBranchName") || "Branch Name"}
                                    value={formData.bankBranchName}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.bankBranchNamePlaceholder") || "Type bank branch name"}
                                />

                                <TextInput
                                    name="accountNo"
                                    label={t("bank.form.accountNumber") || "Account Number"}
                                    value={formData.accountNo}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.accountNumberPlaceholder") || "Type account number"}
                                    maxLength={34}
                                />

                                <TextInput
                                    name="bankSwiftCode"
                                    label={t("bank.form.swiftCode") || "SWIFT Code"}
                                    value={formData.bankSwiftCode}
                                    onChange={handleChange}
                                    placeholder={t("bank.form.swiftCodePlaceholder") || "Type SWIFT code"}
                                />
                            </div>
                        </div>

                        {/* Branch Selection - Multiple branches, 2 per row */}
                        {showBranchGrid && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t("accountLedger.form.branches") || "Branches"}{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedBranches.length === activeBranches.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const allBranchIds = activeBranches.map((b) => String(b.branchId));
                                                    setSelectedBranches(allBranchIds);
                                                    const newDetails = {};
                                                    allBranchIds.forEach((id) => {
                                                        newDetails[id] = branchDetails[id] || {
                                                            openingBalance: "",
                                                            crOrDr: "2",
                                                        };
                                                    });
                                                    setBranchDetails(newDetails);
                                                } else {
                                                    setSelectedBranches([]);
                                                    setBranchDetails({});
                                                }
                                            }}
                                            disabled={isLoading}
                                            className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                                        />
                                        Select All
                                    </label>
                                </div>

                                <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                                    {/* Header */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 bg-gray-50 dark:bg-[#252525] border-b border-gray-300 dark:border-gray-600">
                                        <div className="grid grid-cols-[20px_1fr_120px_70px] items-center gap-2 px-3 py-1.5 lg:border-r border-gray-300 dark:border-gray-600">
                                            <span></span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cr/Dr</span>
                                        </div>
                                        <div className="hidden lg:grid grid-cols-[20px_1fr_120px_70px] items-center gap-2 px-3 py-1.5">
                                            <span></span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</span>
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cr/Dr</span>
                                        </div>
                                    </div>

                                    {/* Body - 2 branches per row */}
                                    {branchPairs.map((pair, pairIndex) => (
                                        <div
                                            key={pairIndex}
                                            className={`grid grid-cols-1 lg:grid-cols-2 ${pairIndex < branchPairs.length - 1 ? "border-b border-gray-200 dark:border-gray-600" : ""}`}
                                        >
                                            <div className="lg:border-r border-gray-200 dark:border-gray-600">
                                                {renderBranchRow(pair[0])}
                                            </div>
                                            {pair[1] ? (
                                                <div>{renderBranchRow(pair[1])}</div>
                                            ) : (
                                                <div className="hidden lg:block"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {selectedBranches.length === 0 && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                        Please select at least one branch
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Single Branch - Full width row */}
                        {!showBranchGrid && activeBranches && activeBranches.length === 1 && (
                            <div className="mt-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                    Branch
                                </label>
                                <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                                    <div className="grid grid-cols-[20px_1fr_180px_70px] items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-[#252525] border-b border-gray-300 dark:border-gray-600">
                                        <span></span>
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opening Balance</span>
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cr/Dr</span>
                                    </div>
                                    {renderBranchRow(activeBranches[0])}
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Error Message */}
                    {finalError && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">
                            {finalError}
                        </div>
                    )}
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