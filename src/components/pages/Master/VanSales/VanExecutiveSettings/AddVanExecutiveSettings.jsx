import { useEffect, useState, useRef } from "react";
import BreadCrumb from "@/components/common/BreadCrumb";
import { Settings2, SaveAll, X, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { useNavigate, useParams } from "react-router-dom";
import useFormValidation from "@/lib/hooks/useFormValidation";
import useSaveShortcut from "@/lib/hooks/useSaveShortcut";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddVanExecutiveSettings = () => {
  const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
  const { t } = useTranslation();
  const { editId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [finalError, setFinalError] = useState(null);

  const [executives, setExecutives] = useState([]);
  const [allLedgers, setAllLedgers] = useState([]);

  const [showExecDropdown, setShowExecDropdown] = useState(false);
  const [showCashDropdown, setShowCashDropdown] = useState(false);
  const [showSalesDropdown, setShowSalesDropdown] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const [execSearch, setExecSearch] = useState("");
  const [cashSearch, setCashSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [bankSearch, setBankSearch] = useState("");

  const execDropdownRef = useRef(null);
  const cashDropdownRef = useRef(null);
  const salesDropdownRef = useRef(null);
  const bankDropdownRef = useRef(null);
  const formRef = useRef(null);

  const navigate = useNavigate();
  const { selectedBranchId, userId } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({
    executiveId: "",
    cashAccountLedgerId: "",
    salesAccountLedgerId: "",
    salesTargetAmount: (0).toFixed(generalSettings?.decimalPart ?? 2),
    bankAccountLedgerId: "",
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (execDropdownRef.current && !execDropdownRef.current.contains(event.target))
        setShowExecDropdown(false);
      if (cashDropdownRef.current && !cashDropdownRef.current.contains(event.target))
        setShowCashDropdown(false);
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(event.target))
        setShowSalesDropdown(false);
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target))
        setShowBankDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      const target = e.target;
      if (target.tagName === "BUTTON") return;
      if (target.closest(".absolute.z-50")) return;
      e.preventDefault();
      if (!formRef.current) return;

      const selectors =
        'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled])';
      const allFocusable = Array.from(formRef.current.querySelectorAll(selectors));
      const visible = allFocusable.filter(
        (el) => el.offsetParent !== null && !el.closest("[hidden]")
      );
      const idx = visible.indexOf(target);
      if (idx !== -1 && idx < visible.length - 1) {
        visible[idx + 1].focus();
      }
    }
  };

  useEffect(() => {
    if (selectedBranchId) fetchDropdownData();
  }, [selectedBranchId]);

  useEffect(() => {
    if (editId) fetchEditData(editId);
  }, [editId]);

  const fetchDropdownData = async () => {
    setFetchLoading(true);
    try {
      const execRes = await axiosInstance.get(`van-exicutive/${selectedBranchId}`);
      setExecutives(execRes.data?.data || []);

      const [generalRes, bankRes] = await Promise.all([
        axiosInstance.post("account-ledgers", {
          group_ids: [5, 6, 28, 29],
          branchId: selectedBranchId,
        }),
        axiosInstance.post("bank-account-ledgers", {
          group_ids: [5, 6],
          branchId: selectedBranchId,
        }),
      ]);

      const generalLedgers = generalRes.data?.data || [];
      const bankLedgers = bankRes.data?.data || [];

      const combinedMap = new Map();
      [...generalLedgers, ...bankLedgers].forEach((ledger) => {
        const id = ledger.ledgerId;
        if (id && !combinedMap.has(id)) {
          combinedMap.set(id, ledger);
        }
      });

      setAllLedgers(Array.from(combinedMap.values()));
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      setAlert({
        id: Date.now(),
        type: "error",
        message: "Error loading dropdown data",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchEditData = async (id) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`van-exicutive-settings/show-byId/${id}`);

      let d = res.data?.data;
      if (Array.isArray(d)) d = d[0];

      if (d) {

        setFormData({
          executiveId: (d.executiveId ?? d.ExecutiveId)?.toString() || "",
          cashAccountLedgerId: (d.cashAccountLedgerId ?? d.CashAccountLedgerId)?.toString() || "",
          salesAccountLedgerId: (d.salesAccountLedgerId ?? d.SalesAccountLedgerId)?.toString() || "",
          salesTargetAmount: (parseFloat(d.salesTargetAmount ?? d.SalesTargetAmount) || 0)
  .toFixed(generalSettings?.decimalPart ?? 2),
          bankAccountLedgerId: (d.bankAccountLedgerId ?? d.BankAccountLedgerId)?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings data:", error);
      setAlert({
        id: Date.now(),
        type: "error",
        message: error.response?.data?.message || "Error loading settings data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value
     if (name === "salesTargetAmount") {
    if (Number(value) < 0) {
      return; // Ignore negative values
    }
  }

    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setFinalError(null);
  };

  const handleAmountBlur = (e) => {
  const { name, value } = e.target;
  const formatted = (parseFloat(value) || 0).toFixed(generalSettings?.decimalPart ?? 2);
  setFormData((prev) => ({ ...prev, [name]: formatted }));
};

  const validationRules = {
    executiveId: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
    cashAccountLedgerId: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
    salesAccountLedgerId: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
    bankAccountLedgerId: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
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
      const payload = {
        executiveId: parseInt(formData.executiveId),
        cashAccountLedgerId: parseInt(formData.cashAccountLedgerId),
        salesAccountLedgerId: parseInt(formData.salesAccountLedgerId),
        salesTargetAmount: parseFloat(
  (parseFloat(formData.salesTargetAmount) || 0)
    .toFixed(generalSettings?.decimalPart ?? 2)
),
        bankAccountLedgerId: parseInt(formData.bankAccountLedgerId),
        branchId: selectedBranchId,
        ...(editId ? { ModifiedUser: userId } : { CreatedUser: userId }),
      };

      let response;
      if (editId) {
        // Try POST with ID in URL first (same pattern as van-executive update)
        try {
          response = await axiosInstance.post(
            `van-exicutive-settings/update/${editId}`,
            payload
          );
        } catch (postError) {
          // If POST with ID fails, try GET with query params
          if (postError.response?.status === 405) {
            const queryParams = new URLSearchParams();
            Object.entries(payload).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                queryParams.append(key, value);
              }
            });
            response = await axiosInstance.get(
              `van-exicutive-settings/update/${editId}?${queryParams.toString()}`
            );
          } else {
            throw postError;
          }
        }
      } else {
        response = await axiosInstance.post(
          "van-exicutive-settings/store",
          payload
        );
      }

      if (!response.data.error) {
        setAlert({
          id: Date.now(),
          type: "success",
          message: editId
            ? "Settings updated successfully!"
            : "Settings created successfully!",
        });
        setTimeout(
          () => navigate("/master/van-sales/van-executive-settings"),
          1000
        );
      } else {
        setFinalError(response.data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setFinalError(
        error.response?.data?.message ||
          error.message ||
          "Failed to save settings"
      );
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
    navigate("/master/van-sales/van-executive-settings");
  };

  useSaveShortcut(handleSubmit);

  const SearchableDropdownField = ({
    label,
    required,
    items,
    value,
    fieldName,
    displayKey,
    valueKey,
    showDropdown,
    setShowDropdown,
    searchTerm,
    setSearchTerm,
    dropdownRef,
    placeholder,
  }) => {
    const selectedItem = items.find(
      (item) => item[valueKey]?.toString() === value
    );
    const filteredItems = items.filter((item) =>
      (item[displayKey] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    return (
      <div className="grid grid-cols-[180px_1fr] items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={
                showDropdown ? searchTerm : selectedItem?.[displayKey] || ""
              }
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!showDropdown) setShowDropdown(true);
              }}
              onFocus={() => {
                setShowDropdown(true);
                setSearchTerm("");
              }}
              placeholder={placeholder}
              className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                         text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                         focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors"
            />
            <div className="absolute right-0 flex items-center">
              <button
                type="button"
                onClick={() => setShowDropdown((prev) => !prev)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const itemId = item[valueKey]?.toString();
                  return (
                    <button
                      key={itemId}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          [fieldName]: itemId,
                        }));
                        setShowDropdown(false);
                        setSearchTerm("");
                        if (errors[fieldName])
                          setErrors((prev) => ({ ...prev, [fieldName]: "" }));
                        setFinalError(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30
                                 text-gray-900 dark:text-gray-100 transition-colors
                                 ${
                                   value === itemId
                                     ? "bg-teal-50 dark:bg-teal-900/20 font-medium"
                                     : ""
                                 }`}
                    >
                      {item[displayKey]}
                      {item.ledgerCode && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({item.ledgerCode})
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-gray-400">
                  No results found
                </div>
              )}
            </div>
          )}
          {errors[fieldName] && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
              {errors[fieldName]}
            </p>
          )}
        </div>
      </div>
    );
  };

  const breadcrumbConfig = {
    routes: [
      { title: t("bank.breadcrumb.master") || "Master", url: "#" },
      { title: "Van Sales", url: "#" },
      {
        title: "Van Executive Settings",
        url: "/master/van-sales/van-executive-settings",
      },
      { title: editId ? "Edit Settings" : "Add Settings", url: "#" },
    ],
    heading: {
      icon: Settings2,
      title: editId
        ? "Edit Van Executive Settings"
        : "Add Van Executive Settings",
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
        label: isSaving
          ? t("saving") || "Saving..."
          : editId
          ? t("update") || "Update"
          : t("save") || "Save",
        icon: SaveAll,
        type: "primary",
        onClick: handleSubmit,
        disabled: isSaving,
      },
    ],
  };

  if (isLoading || fetchLoading) {
    return (
      <div>
        <BreadCrumb {...breadcrumbConfig} />
        <Preloader />
      </div>
    );
  }

  return (
    <>
      <BreadCrumb {...breadcrumbConfig} />

      <div className="mx-auto px-4 py-2 dark:bg-[#121212] transition-colors">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-4" ref={formRef} onKeyDown={handleFormKeyDown}>
            {alert && (
              <AlertBox key={alert.id} message={alert.message} type={alert.type} />
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <SearchableDropdownField
                  label="Van Executive"
                  required
                  items={executives}
                  value={formData.executiveId}
                  fieldName="executiveId"
                  displayKey="ExecutiveName"
                  valueKey="ExecutiveId"
                  showDropdown={showExecDropdown}
                  setShowDropdown={setShowExecDropdown}
                  searchTerm={execSearch}
                  setSearchTerm={setExecSearch}
                  dropdownRef={execDropdownRef}
                  placeholder="Search & select executive"
                />

                <SearchableDropdownField
                  label="Cash Account Ledger"
                  required
                  items={allLedgers}
                  value={formData.cashAccountLedgerId}
                  fieldName="cashAccountLedgerId"
                  displayKey="ledgerName"
                  valueKey="ledgerId"
                  showDropdown={showCashDropdown}
                  setShowDropdown={setShowCashDropdown}
                  searchTerm={cashSearch}
                  setSearchTerm={setCashSearch}
                  dropdownRef={cashDropdownRef}
                  placeholder="Search & select cash account"
                />

                <SearchableDropdownField
                  label="Sales Account Ledger"
                  required
                  items={allLedgers}
                  value={formData.salesAccountLedgerId}
                  fieldName="salesAccountLedgerId"
                  displayKey="ledgerName"
                  valueKey="ledgerId"
                  showDropdown={showSalesDropdown}
                  setShowDropdown={setShowSalesDropdown}
                  searchTerm={salesSearch}
                  setSearchTerm={setSalesSearch}
                  dropdownRef={salesDropdownRef}
                  placeholder="Search & select sales account"
                />

                <SearchableDropdownField
                  label="Bank Account Ledger"
                  required
                  items={allLedgers}
                  value={formData.bankAccountLedgerId}
                  fieldName="bankAccountLedgerId"
                  displayKey="ledgerName"
                  valueKey="ledgerId"
                  showDropdown={showBankDropdown}
                  setShowDropdown={setShowBankDropdown}
                  searchTerm={bankSearch}
                  setSearchTerm={setBankSearch}
                  dropdownRef={bankDropdownRef}
                  placeholder="Search & select bank account"
                />

                <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sales Target Amount
                  </label>
                  <input
  type="number"
  step={1 / Math.pow(10, generalSettings?.decimalPart ?? 2)}
  name="salesTargetAmount"
  value={formData.salesTargetAmount}
onChange={handleChange}
onBlur={handleAmountBlur}
onKeyDown={(e) => {
  if(e.key === "-") e.preventDefault()
}}
  placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                               text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                  />
                </div>
              </div>

              {finalError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">
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

export default AddVanExecutiveSettings;