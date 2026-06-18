import { useEffect, useState, useRef, useMemo } from 'react';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import BreadCrumb from '@/components/common/BreadCrumb';
import { Landmark, SaveAll, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import useFormValidation from '@/lib/hooks/useFormValidation';
import useSaveShortcut from '@/lib/hooks/useSaveShortcut';
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

const AddBankPage = () => {
  const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
  const { t } = useTranslation();
  const { editId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchGrpLoading, setFetchGrpLoading] = useState(false);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [accountGroups, setAccoutGroups] = useState([]);
  const [finalError, setFinalError] = useState(null);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchDetails, setBranchDetails] = useState({});
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const bankDropdownRef = useRef(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const groupDropdownRef = useRef(null);
  const formRef = useRef(null);
  const ledgerNameRef = useRef(null);

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

  // Auto-focus first field (ledgerName) when page loads and not editing
  useEffect(() => {
    if (!isLoading && !fetchGrpLoading && ledgerNameRef.current) {
      const timer = setTimeout(() => {
        ledgerNameRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, fetchGrpLoading]);

  // Handle Enter key to move to next field in order
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target;

      // Allow Enter in textarea for new lines
      if (target.tagName === 'TEXTAREA') return;

      // Don't intercept Enter on buttons (let submit work normally)
      if (target.tagName === 'BUTTON') return;

      // Don't intercept if inside a dropdown list
      if (target.closest('.absolute.z-50')) return;

      e.preventDefault();

      if (!formRef.current) return;

      // Get all focusable elements in form order
      const focusableSelectors = 'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])';
      const focusableElements = Array.from(formRef.current.querySelectorAll(focusableSelectors));

      // Also include the ledgerName input which is outside the form tag but inside formRef
      const allContainer = formRef.current;
      const allFocusable = Array.from(allContainer.querySelectorAll(focusableSelectors));

      // Filter out elements that are not visible
      const visibleElements = allFocusable.filter(el => {
        return el.offsetParent !== null && !el.closest('[hidden]');
      });

      const currentIndex = visibleElements.indexOf(target);

      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        const nextElement = visibleElements[currentIndex + 1];
        nextElement.focus();

        // If next element is inside a custom dropdown, trigger click to open it
        const dropdownTrigger = nextElement.closest('[data-searchable-dropdown]');
        if (dropdownTrigger) {
          nextElement.click();
        }
      }
    }
  };

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
    if (formData.groupId && !editId) {
      genarateLedgercode()
    }
  }, [formData.groupId])

  const genarateLedgercode = async () => {
    try {
      const res = await axiosInstance.post('generate-ledger-code', { branchId: selectedBranchId, groupId: formData.groupId })
      setFormData(prev => ({
        ...prev,
        ledgerCode: res.data.data
      }));
    } catch (error) {
      console.error('Error Ganarting ledger code', error)
    }
  }

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

  useEffect(() => {
    if (!selectedBranchId) return;
    fetchAccountGroupData();
  }, [selectedBranchId]);

  useEffect(() => {
    if (editId) fetchEditData(editId);
  }, [editId]);

  const fetchAccountGroupData = async () => {
    setFetchGrpLoading(true);
    try {
      const response = await axiosInstance.post('bank-customer-supplier-accountgroups', { group_ids: [5, 6] });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const fields = ["ledgerName", "ledgerCode", "groupId"];
  const validationRules = Object.fromEntries(
    fields.map((field) => [field, { required: true, label: t("requiredFieldsError") }])
  );

  const handleSubmit = async (e) => {
    e?.preventDefault();

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
        groupId: parseInt(formData.groupId) || 1,
        narration: `Opening ${formData.ledgerName} account`,
        ledgerCode: formData.ledgerCode,
        accountNo: formData.accountNo,
        bankaccname: formData.bankaccname,
        bankname: formData.bankname,
        ibanno: formData.ibanno,
        bankBranchName: formData.bankBranchName,
        bankSwiftCode: formData.bankSwiftCode,
        ModifiedUser:editId?userId:null,
        branchDetails: branchDetailsArray,
        ...(editId ? { ModifiedUser: userId } : { CreatedUser: userId }),
        extraDate: new Date().toISOString().split('T')[0],
      };

      const response = editId
        ? await axiosInstance.post(`update-account-ledger/${editId}`, apiPayload)
        : await axiosInstance.post('save-account-ledger', apiPayload);

      if (!response.data.error) {
        setAlert({
          type: 'success',
          message: editId
            ? 'Bank account updated successfully!'
            : 'Bank account created successfully!'
        });
        setTimeout(() => navigate('/master/bank'), 1000);
      } else {
        setFinalError(response.data.message || 'Failed to save bank account');
      }
    } catch (error) {
      console.error("Error saving bank account:", error);
      const errorMessage = error.response?.data?.message || error.message ||
        (editId ? "Failed to update bank account" : "Failed to save bank account");
      setFinalError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
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
    navigate('/master/bank');
};

  useSaveShortcut(handleSubmit);

  const showBranchGrid = activeBranches && activeBranches.length > 1;

  const breadcrumbConfig = {
    routes: [
      { title: t("bank.breadcrumb.master"), url: "#" },
      { title: t("bank.form.breadcrumb.bank"), url: "/master/bank" },
      { title: editId ? t("bank.form.breadcrumb.edit.title") : t("bank.form.breadcrumb.title"), url: "#" },
    ],
    heading: {
      icon: Landmark,
      title: editId ? t("bank.form.breadcrumb.edit.title") : t("bank.form.breadcrumb.title")
    },
    actions: [
      {
        label: t("cancel") || "Cancel",
        icon: X,
        type: "secondary",
        onClick: handleCancel,
        disabled: isSaving,
      },
      {
        label: isSaving ? (t("saving") || "Saving...") : (editId ? (t("update") || "Update") : (t("save") || "Save")),
        icon: SaveAll,
        type: "primary",
        onClick: handleSubmit,
        disabled: isSaving,
      },
    ],
  };

  if (isLoading || fetchGrpLoading) return (
    <div>
      <BreadCrumb {...breadcrumbConfig} />
      <Preloader />
    </div>
  );

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

  const branchPairs = [];
  if (activeBranches && activeBranches.length > 1) {
    for (let i = 0; i < activeBranches.length; i += 2) {
      branchPairs.push(activeBranches.slice(i, i + 2));
    }
  }

  return (
    <>
      <BreadCrumb {...breadcrumbConfig} />

      <div className="mx-auto px-4 py-2 dark:bg-[#121212] transition-colors">
        <div className="max-w-5xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">

          <div className="px-4 py-3" ref={formRef} onKeyDown={handleFormKeyDown}>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            {/* Bank Registered Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Bank Registered Name
              </label>
              <input
                ref={ledgerNameRef}
                type="text"
                name="ledgerName"
                value={formData.ledgerName}
                onChange={handleChange}
                onBlur={(e) => handleBlur(e, validationRules)}
                placeholder="Type Bank Name"
                required
                className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 
                         text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                         focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-2 transition-colors"
              />
              {errors.ledgerName && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.ledgerName}</p>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">

                {/* Left Column */}
                <div className="space-y-2">
                  {/* Bank */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors"
                        />
                        <div className="absolute right-0 flex items-center">
                          <button
                            type="button"
                            onClick={() => setShowBankDropdown(prev => !prev)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${showBankDropdown ? 'rotate-180' : ''}`}
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
                                       ${formData.bankname === bank ? 'bg-teal-50 dark:bg-teal-900/20 font-medium' : ''}`}
                            >
                              {bank}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Group <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={groupDropdownRef}>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          name="groupId"
                          value={accountGroups.find(g => g.groupId?.toString() === formData.groupId)?.accountGroupName || ""}
                          readOnly
                          placeholder="Select Group"
                          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
                          onClick={() => setShowGroupDropdown(prev => !prev)}
                        />
                        <div className="absolute right-0 flex items-center">
                          <button
                            type="button"
                            onClick={() => setShowGroupDropdown(prev => !prev)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${showGroupDropdown ? 'rotate-180' : ''}`}
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
                                         ${formData.groupId === group.groupId?.toString() ? 'bg-teal-50 dark:bg-teal-900/20 font-medium' : ''}`}
                            >
                              {group.accountGroupName}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.groupId && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.groupId}</p>
                      )}
                    </div>
                  </div>

                  {/* Code */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <div>
                      <input
                        type="text"
                        name="ledgerCode"
                        value={formData.ledgerCode}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur(e, validationRules)}
                        placeholder="Auto-generated or type code"
                        required
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                      />
                      {errors.ledgerCode && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.ledgerCode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* Bank Account Name */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bank Acc Name
                    </label>
                    <input
                      type="text"
                      name="bankaccname"
                      value={formData.bankaccname}
                      onChange={handleChange}
                      placeholder="Type bank account name"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>

                  {/* IBAN Number */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      IBAN Number
                    </label>
                    <input
                      type="text"
                      name="ibanno"
                      value={formData.ibanno}
                      onChange={handleChange}
                      placeholder="Type IBAN number"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>

                  {/* Bank Branch Name */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      name="bankBranchName"
                      value={formData.bankBranchName}
                      onChange={handleChange}
                      placeholder="Type bank branch name"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>

                  {/* Account Number */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="accountNo"
                      value={formData.accountNo}
                      onChange={handleChange}
                      placeholder="Type account number"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>

                  {/* SWIFT Code */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      SWIFT Code
                    </label>
                    <input
                      type="text"
                      name="bankSwiftCode"
                      value={formData.bankSwiftCode}
                      onChange={handleChange}
                      placeholder="Type SWIFT code"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Selection - Multiple branches, 2 per row */}
              {showBranchGrid && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("accountLedger.form.branches") || "Branches"} <span className="text-red-500">*</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
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
                        className={`grid grid-cols-1 lg:grid-cols-2 ${pairIndex < branchPairs.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}
                      >
                        <div className="lg:border-r border-gray-200 dark:border-gray-600">
                          {renderBranchRow(pair[0])}
                        </div>
                        {pair[1] ? (
                          <div>
                            {renderBranchRow(pair[1])}
                          </div>
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
                    {/* Header */}
                    <div className="grid grid-cols-[20px_1fr_180px_70px] items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-[#252525] border-b border-gray-300 dark:border-gray-600">
                      <span></span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opening Balance</span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cr/Dr</span>
                    </div>
                    {/* Row */}
                    {(() => {
                      const branch = activeBranches[0];
                      const branchIdStr = String(branch.branchId);
                      const isSelected = selectedBranches.includes(branchIdStr);
                      const crOrDrValue = branchDetails[branchIdStr]?.crOrDr || "";
                      const showCrDrWarning = isSelected && !crOrDrValue;

                      return (
                        <div
                          className={`grid grid-cols-[20px_1fr_180px_70px] items-center gap-3 px-3 py-2
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
                    })()}
                  </div>
                </div>
              )}

              {finalError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-2">
                  {finalError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddBankPage;