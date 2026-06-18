import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useMemo } from 'react';
import MultiMasterFormModal from '../multiMasterForms/MultiMasterFormModal';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import AlertBox from '@/components/common/AlertBox';
import useAuth from '@/redux/hook/auth/useAuth';
import useFormValidation from '@/lib/hooks/useFormValidation';
import { ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddAccountLedger = ({ open, handleClose, editId, onSuccess }) => {
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();

    const isEditMode = Boolean(editId);
    const [isDefaultLedger, setIsDefaultLedger] = useState(false);
    const [finalError, setFinalError] = useState(null);
    const { currentFinancialYear, currentCurrencyConversion } = useAuth();

    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [accountGroups, setAccoutGroups] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [branchDetails, setBranchDetails] = useState({});
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const groupDropdownRef = useRef(null);
    const formRef = useRef(null);
    const groupInputRef = useRef(null);
    const [groupSearch, setGroupSearch] = useState('');
    const groupSearchRef = useRef(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownListRef = useRef(null);

    const { selectedBranchId, userId, branches } = useAuth();

    const { generalSettings } = useSelector((state) => state.settings);


    const activeBranches = useMemo(() => {
        return branches?.filter(b => b.activeStatus) || [];
    }, [branches]);

    const [formData, setFormData] = useState({
        ledgerCode: "",
        ledgerName: "",
        nameArb: "",
        groupId: "",
        narration: "",
    });


    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
                setShowGroupDropdown(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Ctrl+S to save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const fakeEvent = { preventDefault: () => { } };
                handleSubmit(fakeEvent);
            }
        };

        if (open) {
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, formData, editId, selectedBranches, branchDetails]);

    // Fetch account groups on mount
    useEffect(() => {
        fetchAccountGroupData();
    }, []);

    // Initialize with first branch selected by default
    useEffect(() => {
        if (open && !isEditMode && activeBranches && activeBranches.length > 0) {
            const firstBranchId = String(activeBranches[0].branchId);
            setSelectedBranches([firstBranchId]);
            setBranchDetails({
                [firstBranchId]: {
                    openingBalance: "",
                    crOrDr: "2"
                }
            });
        }
    }, [open, isEditMode, activeBranches]);

    // Auto generate ledger code when group changes
    useEffect(() => {
        if (formData.groupId && !isEditMode) {
            genarateLedgercode();
        }
    }, [formData.groupId]);

    // Focus group dropdown when modal opens for new entry
    const ledgerNameRef = useRef(null);

    useEffect(() => {
        if (open && !isEditMode && !isLoading) {
            const timer = setTimeout(() => {
                if (ledgerNameRef.current) {
                    ledgerNameRef.current.focus();
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [open, isEditMode,]);

    const genarateLedgercode = async () => {
        try {
            const res = await axiosInstance.post('generate-ledger-code', { branchId: selectedBranchId, groupId: formData.groupId });
            setFormData(prev => ({
                ...prev,
                ledgerCode: res.data.data
            }));
        } catch (error) {
            console.error('Error Generating ledger code', error);
        }
    };

    const fetchAccountGroupData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get('accountgroups');

            setAccoutGroups(response.data.data);
        } catch (error) {
            console.error("Error fetching account groups:", error);
            setAlert({ key: new Date(), type: 'error', message: 'Error fetching account groups' });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch edit data when editId is provided
    useEffect(() => {
        const fetchEditData = async () => {
            if (!editId || !open || !isEditMode) return;

            setIsLoading(true);
            try {
                const response = await axiosInstance.get(`get-account-ledger-byId/${editId}`);
                if (response.data && response.data.data) {
                    const data = response.data.data;

                    setIsDefaultLedger(data.default === true);

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
                        nameArb: data.nameArb || "",       // ← add this
                        groupId: data.groupId?.toString() || "",
                        narration: data.narration || ""
                    });
                }
            } catch (error) {
                console.error("Error fetching edit data:", error);
                const errorMessage = error.response?.data?.message || "Failed to fetch ledger data";
                setAlert({
                    key: new Date(),
                    type: "error",
                    message: errorMessage
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEditData();
    }, [editId, open]);

    // Reset form when modal is closed or opened for new entry
    useEffect(() => {
        if (open && !isEditMode) {
            setFormData({
                ledgerCode: "",
                ledgerName: "",
                groupId: "",
                nameArb: "",
                narration: ""
            });
            if (activeBranches && activeBranches.length > 0) {
                const firstBranchId = String(activeBranches[0].branchId);
                setSelectedBranches([firstBranchId]);
                setBranchDetails({
                    [firstBranchId]: {
                        openingBalance: "",
                        crOrDr: "2"
                    }
                });
            } else {
                setSelectedBranches([]);
                setBranchDetails({});
            }
            setErrors({});
            setAlert(null);
            setFinalError(null);
        }
    }, [open, isEditMode, activeBranches]);

    // Enter key to navigate to next field
    const handleFormKeyDown = (e) => {
        if (e.key === 'Enter') {
            const target = e.target;
            if (target.tagName === 'TEXTAREA') return;
            if (target.tagName === 'BUTTON') return;
            if (showGroupDropdown) return;

            e.preventDefault();

            if (!formRef.current) return;

            const focusableSelectors = 'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
            const focusableElements = Array.from(formRef.current.querySelectorAll(focusableSelectors));

            const visibleElements = focusableElements.filter(el => {
                return el.offsetParent !== null && !el.closest('[hidden]');
            });

            const currentIndex = visibleElements.indexOf(target);

            if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
                const nextElement = visibleElements[currentIndex + 1];
                nextElement.focus();
            }
        }
    };

    // Arrow key navigation in dropdown
    const handleGroupDropdownKeyDown = (e) => {
        if (!showGroupDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setShowGroupDropdown(true);
            setHighlightedIndex(
                formData.groupId
                    ? accountGroups.findIndex(g => g.groupId?.toString() === formData.groupId)
                    : 0
            );
            return;
        }

        if (!showGroupDropdown) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => {
                    const next = prev < accountGroups.length - 1 ? prev + 1 : 0;
                    scrollToHighlighted(next);
                    return next;
                });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => {
                    const next = prev > 0 ? prev - 1 : accountGroups.length - 1;
                    scrollToHighlighted(next);
                    return next;
                });
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < accountGroups.length) {
                    const group = accountGroups[highlightedIndex];
                    handleSelectChange("groupId", group.groupId?.toString());
                    setShowGroupDropdown(false);
                    setHighlightedIndex(-1);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowGroupDropdown(false);
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setShowGroupDropdown(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const scrollToHighlighted = (index) => {
        if (dropdownListRef.current) {
            const items = dropdownListRef.current.children;
            if (items[index]) {
                items[index].scrollIntoView({ block: 'nearest' });
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Force ledgerCode to uppercase
        if (name === 'ledgerCode') {
            setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: '' }));
            }
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
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
        let processedValue = value;

        if (field === "openingBalance") {
            processedValue =
                value === ""
                    ? ""
                    : parseFloat(value).toFixed(generalSettings.decimalPart);
        }

        setBranchDetails(prev => ({
            ...prev,
            [branchId]: {
                ...prev[branchId],
                [field]: processedValue
            }
        }));

        setFinalError(null);
    };

    const validationRules = {
        ledgerCode: { required: true, label: t("requiredFieldsError") },
        ledgerName: { required: true, label: t("requiredFieldsError") },
        groupId: { required: true, label: t("requiredFieldsError") },
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

        if (!validateForm(formData, validationRules)) return;
        if (isEditMode && generalSettings?.askConfirmationEdit) {
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
        } else if (!isEditMode && generalSettings?.askConfirmationSave) {
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

        setIsSubmitting(true);

        try {
            const branchDetailsArray = selectedBranches.map(branchId => ({
                branchId: parseInt(branchId),
                openingBalance:
                    parseFloat(
                        (parseFloat(branchDetails[branchId]?.openingBalance) || 0)
                            .toFixed(generalSettings.decimalPart)
                    ),
                crOrDr: branchDetails[branchId]?.crOrDr === "1" ? "Cr" : "Dr"
            }));

            const apiPayload = {
                exchangeDate: currentCurrencyConversion?.date || '',
                exchangeRate: currentCurrencyConversion?.rate || '',
                currencyConversionId: currentCurrencyConversion?.currecyConversionId || '',
                activeFinancialYear_fromDate: currentFinancialYear?.fromDate || '',
                ledgerName: formData.ledgerName,
                nameArb: formData.nameArb,
                groupId: parseInt(formData.groupId) || 1,
                narration: formData.narration,
                ledgerCode: formData.ledgerCode,
                branchDetails: branchDetailsArray,
                ...(isEditMode ? { ModifiedUser: userId } : { CreatedUser: userId }),
                extraDate: new Date().toISOString().split('T')[0],
            };

            const response = isEditMode
                ? await axiosInstance.post(`update-account-ledger/${editId}`, apiPayload)
                : await axiosInstance.post("save-account-ledger", apiPayload);

            if (response) {
                onSuccess();
                handleClose();
            }
        } catch (error) {
            console.error("Error saving Account Ledger:", error);
            const errorMessage = error.response?.data?.message || error.message ||
                (isEditMode ? "Failed to update account ledger" : "Failed to save account ledger");
            setFinalError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalClose = async () => {
        if (isSubmitting || isLoading) return;

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

        setFormData({
            ledgerCode: "",
            ledgerName: "",
            groupId: "",
            narration: ""
        });
        setSelectedBranches([]);
        setBranchDetails({});
        setErrors({});
        setAlert(null);
        setFinalError(null);
        setShowGroupDropdown(false);
        setHighlightedIndex(-1);
        handleClose();
    };

    const showBranchGrid = activeBranches && activeBranches.length > 1;
const filteredGroups = useMemo(() => {
    return accountGroups
        .filter(group => ![28, 29].includes(group.groupUnder))
        .filter(group =>
            !groupSearch ||
            group.accountGroupName?.toLowerCase().includes(groupSearch.toLowerCase())
        );
}, [accountGroups, groupSearch]);
    // Branch row renderer
    const renderBranchRow = (branch) => {
        const branchIdStr = String(branch.branchId);
        const isSelected = selectedBranches.includes(branchIdStr);
        const crOrDrValue = branchDetails[branchIdStr]?.crOrDr || "";
        const showCrDrWarning = isSelected && !crOrDrValue;

        return (
            <div
                key={branch.branchId}
                className={`grid grid-cols-[18px_1fr_80px_46px] items-center gap-1 px-2 py-1.5
                           ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBranchToggle(branch.branchId)}
                    disabled={isLoading}
                    className="h-3 w-3 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                />
                <span
                    className="text-[11px] text-gray-900 dark:text-gray-100 font-medium truncate"
                    title={branch.branchCode}
                >
                    {branch.branchCode}
                </span>
                <input
                    type="number"
                    step="0.01"
                    value={branchDetails[branchIdStr]?.openingBalance || ""}
                    onChange={(e) => handleBranchDetailChange(branchIdStr, 'openingBalance', e.target.value)}
                    disabled={!isSelected || isLoading}
                    className="w-full px-1 py-0.5 text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
                    placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                />
                <select
                    value={crOrDrValue}
                    onChange={(e) => handleBranchDetailChange(branchIdStr, 'crOrDr', e.target.value)}
                    disabled={!isSelected || isLoading}
                    className={`w-full px-0.5 py-0.5 text-[11px] rounded border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed
                               ${showCrDrWarning
                            ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-600'}`}
                >
                    <option value="">-</option>
                    <option value="1">Cr</option>
                    <option value="2">Dr</option>
                </select>
            </div>
        );
    };

    // Branch section component
    const renderBranchSection = () => {
        if (showBranchGrid) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t("accountLedger.form.branches") || "Branches"} <span className="text-red-500">*</span>
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedBranches.length === activeBranches.length}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const allBranchIds = activeBranches.map(b => String(b.branchId));
                                        setSelectedBranches(allBranchIds);
                                        const newDetails = {};
                                        allBranchIds.forEach(id => {
                                            newDetails[id] = branchDetails[id] || { openingBalance: "", crOrDr: "2" };
                                        });
                                        setBranchDetails(newDetails);
                                    } else {
                                        setSelectedBranches([]);
                                        setBranchDetails({});
                                    }
                                }}
                                disabled={isLoading}
                                className="h-3 w-3 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                            />
                            All
                        </label>
                    </div>

                    <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden flex-1 flex flex-col">
                        {/* Sticky header */}
                        <div className="grid grid-cols-[18px_1fr_80px_46px] items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-[#252525] border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
                            <span></span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
                        </div>

                        {/* Scrollable body — fills remaining space */}
                        <div className="divide-y divide-gray-200 dark:divide-gray-600 overflow-y-auto flex-1">
                            {activeBranches.map((branch) => renderBranchRow(branch))}
                        </div>
                    </div>

                    {selectedBranches.length === 0 && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                            {t("accountLedger.form.branchRequired") || "Please select at least one branch"}
                        </p>
                    )}
                </div>
            );
        }

        if (activeBranches && activeBranches.length === 1) {
            const branch = activeBranches[0];
            const branchIdStr = String(branch.branchId);
            const isSelected = selectedBranches.includes(branchIdStr);
            const crOrDrValue = branchDetails[branchIdStr]?.crOrDr || "";
            const showCrDrWarning = isSelected && !crOrDrValue;

            return (
                <div className="flex flex-col h-full">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        {t("accountLedger.form.branch") || "Branch"}
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                        <div className="grid grid-cols-[18px_1fr_90px_46px] items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-[#252525] border-b border-gray-300 dark:border-gray-600">
                            <span></span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</span>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
                        </div>
                        <div
                            className={`grid grid-cols-[18px_1fr_90px_46px] items-center gap-1.5 px-2 py-1.5
                                       ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleBranchToggle(branch.branchId)}
                                disabled={isLoading}
                                className="h-3 w-3 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-[11px] text-gray-900 dark:text-gray-100 font-medium truncate" title={branch.branchCode}>
                                {branch.branchCode}
                            </span>
                            <input
                                type="number"
                                step={1 / Math.pow(10, generalSettings.decimalPart)}
                                value={branchDetails[branchIdStr]?.openingBalance || ""}
                                onChange={(e) => handleBranchDetailChange(branchIdStr, 'openingBalance', e.target.value)}
                                disabled={!isSelected || isLoading}
                                className="w-full px-1.5 py-0.5 text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed"
                                placeholder={(0).toFixed(generalSettings.decimalPart)}
                            />
                            <select
                                value={crOrDrValue}
                                onChange={(e) => handleBranchDetailChange(branchIdStr, 'crOrDr', e.target.value)}
                                disabled={!isSelected || isLoading}
                                className={`w-full px-0.5 py-0.5 text-[11px] rounded border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed
                                           ${showCrDrWarning
                                        ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">-</option>
                                <option value="1">Cr</option>
                                <option value="2">Dr</option>
                            </select>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <MultiMasterFormModal
                open={open}
                handleClose={handleModalClose}
                title={isEditMode ? t("accountLedger.form.editTitle") || "Edit Account Ledger" : t("accountLedger.form.title")}
                width="900px"
            >
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading ledger data...</div>
                    </div>
                ) : (
                    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-3" noValidate>

                        {/* Ledger Name - Full width top */}
                        <div className="mb-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                {t("accountLedger.form.ledgerName") || "Ledger Name"} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="ledgerName"
                                 ref={ledgerNameRef}  
                                value={formData.ledgerName}
                                onChange={handleChange}
                                onBlur={(e) => handleBlur(e, validationRules)}
                                placeholder={t("accountLedger.form.ledgerNamePlaceholder") || "Type Ledger Name"}
                                required
                                disabled={isLoading}
                                readOnly={isEditMode && isDefaultLedger}
                                className="w-full text-lg font-semibold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 
                                         text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                         focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-1 transition-colors
                                         disabled:opacity-50 read-only:opacity-70"
                            />
                            {errors.ledgerName && (
                                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.ledgerName}</p>
                            )}
                            <input
                                type="text"
                                name="nameArb"
                                value={formData.nameArb}
                                onChange={handleChange}
                                placeholder={t("accountLedger.form.nameArbPlaceholder") || "الاسم بالعربية"}
                                disabled={isLoading}
                                readOnly={isEditMode && isDefaultLedger}
                                dir="rtl"
                                className="w-full mt-2 text-lg font-semibold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 
                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                 focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-1 transition-colors
                 disabled:opacity-50 read-only:opacity-70"
                            />
                        </div>

                        {/* TWO COLUMNS — Left: fields, Right: branches */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 items-stretch">

                            {/* LEFT COLUMN — Group, Code, Narration */}
                            <div className="flex flex-col space-y-3">
                                {/* Group */}
                                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        {t("accountLedger.form.group") || "Group"} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative" ref={groupDropdownRef}>
                                        <div className="relative flex items-center">
                                            <input
                                                ref={groupInputRef}
                                                type="text"
                                                name="groupId"
                                                value={accountGroups.find(g => g.groupId?.toString() === formData.groupId)?.accountGroupName || ""}
                                                readOnly
                                                placeholder={t("accountLedger.form.selectGroup") || "Select Group"}
                                                disabled={isLoading || (isEditMode && isDefaultLedger)}
                                                className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                                                         text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                         focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer
                                                         disabled:opacity-50 disabled:cursor-not-allowed"
                                              onClick={() => {
    if (!isLoading && !(isEditMode && isDefaultLedger)) {
        const opening = !showGroupDropdown;
        setShowGroupDropdown(opening);
        if (opening) {
            setHighlightedIndex(formData.groupId
                ? filteredGroups.findIndex(g => g.groupId?.toString() === formData.groupId)
                : 0);
            setTimeout(() => groupSearchRef.current?.focus(), 50);
        }
    }
}}
                                                onKeyDown={handleGroupDropdownKeyDown}
                                            />
                                            <div className="absolute right-0 flex items-center">
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() => {
                                                        if (!isLoading && !(isEditMode && isDefaultLedger)) {
                                                            setShowGroupDropdown(prev => !prev);
                                                            if (!showGroupDropdown) {
                                                                const currentIdx = accountGroups.findIndex(g => g.groupId?.toString() === formData.groupId);
                                                                setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
                                                            }
                                                            groupInputRef.current?.focus();
                                                        }
                                                    }}
                                                    disabled={isLoading || (isEditMode && isDefaultLedger)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 disabled:opacity-50"
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={`transition-transform duration-200 ${showGroupDropdown ? 'rotate-180' : ''}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                       {showGroupDropdown && (
    <div
        ref={dropdownListRef}
        className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-56 flex flex-col overflow-hidden"
    >
        {/* Search input */}
        <div className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
            <input
                ref={groupSearchRef}
                type="text"
                value={groupSearch}
                onChange={(e) => {
                    setGroupSearch(e.target.value);
                    setHighlightedIndex(0);
                }}
                placeholder="Search..."
                className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setShowGroupDropdown(false);
                        setGroupSearch('');
                        setHighlightedIndex(-1);
                        groupInputRef.current?.focus();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex(prev => Math.min(prev + 1, filteredGroups.length - 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (highlightedIndex >= 0 && highlightedIndex < filteredGroups.length) {
                            const group = filteredGroups[highlightedIndex];
                            handleSelectChange("groupId", group.groupId?.toString());
                            setShowGroupDropdown(false);
                            setGroupSearch('');
                            setHighlightedIndex(-1);
                        }
                    }
                }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
        {/* List */}
        <div ref={dropdownListRef} className="overflow-y-auto flex-1">
            {filteredGroups.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No results</div>
            ) : (
                filteredGroups.map((group, index) => (
                    <button
                        key={group.groupId}
                        type="button"
                        onClick={() => {
                            handleSelectChange("groupId", group.groupId?.toString());
                            setShowGroupDropdown(false);
                            setGroupSearch('');
                            setHighlightedIndex(-1);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors
                            text-gray-900 dark:text-gray-100
                            ${formData.groupId === group.groupId?.toString() ? 'bg-teal-50 dark:bg-teal-900/20 font-medium' : ''}
                            ${index === highlightedIndex ? 'bg-teal-100 dark:bg-teal-900/40' : 'hover:bg-teal-50 dark:hover:bg-teal-900/30'}`}
                    >
                        {group.accountGroupName}
                    </button>
                ))
            )}
        </div>
    </div>
)}
                                        {errors.groupId && (
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.groupId}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Code */}
                                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        {t("accountLedger.form.ledgerCode") || "Code"} <span className="text-red-500">*</span>
                                    </label>
                                    <div>
                                        <input
                                            type="text"
                                            name="ledgerCode"
                                            value={formData.ledgerCode}
                                            onChange={handleChange}
                                            onBlur={(e) => handleBlur(e, validationRules)}
                                            placeholder={t("accountLedger.form.ledgerCodePlaceholder") || "Auto-generated"}
                                            required
                                            disabled={isLoading}
                                            readOnly={isEditMode && isDefaultLedger}
                                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                                                     text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                     focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors
                                                     disabled:opacity-50 read-only:opacity-70 uppercase"
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                        {errors.ledgerCode && (
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.ledgerCode}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Narration — flex-1 fills remaining height */}
                                <div className="grid grid-cols-[80px_1fr] items-start gap-2 flex-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2">
                                        {t("narration") || "Narration"}
                                    </label>
                                    <textarea
                                        name="narration"
                                        value={formData.narration}
                                        onChange={handleChange}
                                        placeholder={t("accountLedger.form.narrationPlaceholder") || "Enter narration..."}
                                        rows={2}
                                        disabled={isLoading}
                                        className="w-full h-full px-2 py-1.5 bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded
                                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm transition-colors resize-none
                                                 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a]"
                                        style={{ minHeight: '60px' }}
                                    />
                                </div>
                            </div>

                            {/* RIGHT COLUMN — Branches */}
                            <div className="flex flex-col">
                                {renderBranchSection()}
                            </div>
                        </div>

                        {finalError && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5">
                                {finalError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleModalClose}
                                disabled={isSubmitting || isLoading}
                                className="border-gray-500 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                           hover:bg-gray-100 dark:hover:bg-[#242424]"
                            >
                                {t("cancelBtn")}
                            </Button>
                            <Button
                                type="submit"
                                className="main-bg text-white hover:opacity-90"
                                disabled={isSubmitting || isLoading}
                            >
                                {isSubmitting ?
                                    (t("saving") || "Saving...") :
                                    isEditMode ?
                                        (t("update") || "Update") :
                                        (t("save") || "Save")
                                }
                            </Button>
                        </div>

                    </form>
                )}
            </MultiMasterFormModal>
        </>
    );
};

export default AddAccountLedger;

AddAccountLedger.propTypes = {
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    editId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onSuccess: PropTypes.func.isRequired
};