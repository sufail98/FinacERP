import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MultiMasterFormModal from "../MultiMasterFormModal";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";


const AddCurrencyConversion = ({ open, handleClose, onSuccess, selectedId }) => {
  const { t } = useTranslation();
  const formRef = useRef(null);
  const dateInputRef = useRef(null); // <-- Add ref for date input
  const [errorMsg, setErrorMsg] = useState(null);
  const { selectedBranchId, user } = useAuth();

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    currencyId: "",
    date: getCurrentDate(),
    rate: "",
    narration: "",
    branchId: selectedBranchId,
    CreatedUser: user?.userId,
  });

  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Reset form when modal closes or opens for new entry
  useEffect(() => {
    if (!open) {
      setFormData({
        currencyId: "",
        date: getCurrentDate(),
        rate: "",
        narration: "",
      });
      setErrorMsg(null);
    } else if (open && !selectedId) {
      setFormData({
        currencyId: "",
        date: getCurrentDate(),
        rate: "",
        narration: "",
        branchId: selectedBranchId,
        CreatedUser: user?.userId,
      });
      setErrorMsg(null);
    }
  }, [open, selectedBranchId, user?.userId, selectedId]);

  // Fetch currencies for dropdown
  useEffect(() => {
    if (open) {
      fetchCurrencies();
    }
  }, [open]);

  // Auto-focus AND auto-open the currency dropdown when modal opens for new entry
  useEffect(() => {
    if (open && !selectedId && !loading && !loadingCurrencies && currencies.length > 0) {
      const timer = setTimeout(() => {
        const dropdownContainer = document.querySelector('[data-searchable-dropdown]');
        if (dropdownContainer) {
          const input = dropdownContainer.querySelector('input');
          if (input) {
            input.focus();
            input.click();
          }
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [open, selectedId, loading, loadingCurrencies, currencies]);

  const fetchCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      const response = await axiosInstance.get("currencies");
      if (!response.data?.error) {
        setCurrencies(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
      setErrorMsg("Failed to load currencies");
    } finally {
      setLoadingCurrencies(false);
    }
  };

  function formatDate(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return dateStr.split('T')[0].split(' ')[0];
  }

  // Fetch data if editing
  useEffect(() => {
    if (selectedId && open) {
      setLoading(true);
      axiosInstance
        .get(`get-currency-conversion-byId/${selectedId}`)
        .then((res) => {
          if (!res.data?.error) {
            const data = res.data.data;
            setFormData({
              currencyId: data.currencyId?.toString() || "",
              date: formatDate(data.date),
              rate: data.rate || "",
              narration: data.narration || "",
              branchId: data.branchId || selectedBranchId,
              CreatedUser: data.CreatedUser || user?.userId,
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching currency conversion data:", err);
          setErrorMsg("Failed to load currency conversion data");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedId, open, selectedBranchId, user?.userId]);

  // Handle Enter key to move to next field in order
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target;

      if (target.tagName === 'TEXTAREA') return;
      if (target.tagName === 'BUTTON') return;

      e.preventDefault();

      if (!formRef.current) return;

      const focusableSelectors = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
      const focusableElements = Array.from(formRef.current.querySelectorAll(focusableSelectors));

      const visibleElements = focusableElements.filter(el => {
        return el.offsetParent !== null && !el.closest('[hidden]');
      });

      const currentIndex = visibleElements.indexOf(target);

      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        const nextElement = visibleElements[currentIndex + 1];
        nextElement.focus();

        const dropdownTrigger = nextElement.closest('[data-searchable-dropdown]');
        if (dropdownTrigger) {
          nextElement.click();
        }
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value) || '') : value
    }));

    if (errorMsg) setErrorMsg(null);
  };

  // Updated handleSelectChange to focus date input after currency selection
  const handleSelectChange = (value, name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errorMsg) setErrorMsg(null);

    // Focus the date input after selecting a currency
    if (name === "currencyId" && value) {
      setTimeout(() => {
        if (dateInputRef.current) {
          dateInputRef.current.focus();
        }
      }, 100); // Small delay to allow dropdown to close first
    }
  };

  const validateForm = () => {
    if (!formData.currencyId) {
      setErrorMsg("Currency is required");
      return false;
    }
    if (!formData.date) {
      setErrorMsg("Date is required");
      return false;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      setErrorMsg("Rate is required and must be greater than 0");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const submitData = {
        currencyId: parseInt(formData.currencyId),
        date: formData.date,
        rate: parseFloat(formData.rate),
        narration: formData.narration,
        branchId: formData.branchId,
        CreatedUser: formData.CreatedUser,
      };

      if (selectedId) {
        await axiosInstance.post(`update-currency-conversion/${selectedId}`, {
          ...submitData,
          ModifiedUser: user?.userId,
        });
      } else {
        await axiosInstance.post("save-currency-conversion", submitData);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving currency conversion:", error);
      setErrorMsg(
        error.response?.data?.message ||
        "Failed to save currency conversion. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MultiMasterFormModal
      open={open}
      handleClose={handleClose}
      title={selectedId ? t("currencyConversion.form.editTitle") || "Edit Currency Conversion" : t("currencyConversion.form.title") || "Add Currency Conversion"}
    >
      {loading ? (
        <p className="text-center py-4">{t("loadingText") || "Loading..."}</p>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">

          {/* Currency Dropdown */}
          <div className="space-y-2">
            <SearchableDropdown
              id="currencyId"
              name="currencyId"
              label={t("currencyConversion.form.currency") || "Currency"}
              required
              placeholder={loadingCurrencies ? "Loading currencies..." : t("currencyConversion.form.currency")}
              searchPlaceholder="Search Currency..."
              options={currencies.map((currency) => ({
                value: currency.currencyId.toString(),
                label:`${currency.currencySymbol} - ${currency.currencyName} (${currency.narration})`,
              }))}
              value={formData.currencyId}
              onChange={(value) => handleSelectChange(value, "currencyId")}
              loading={loadingCurrencies}
              clearable
              disabled={loadingCurrencies}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">
              {t("currencyConversion.form.date") || "Date"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              ref={dateInputRef}
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <Label htmlFor="rate">
              {t("currencyConversion.form.rate") || "Rate"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rate"
              name="rate"
              type="number"
              step="0.00000001"
              min="0"
              value={formData.rate}
              onChange={handleChange}
              onKeyDown={(e) => {
                if(e.key === "-" || e.key === "+"){
                  e.preventDefault()
                }
              }}
              required
              className="w-full"
              placeholder="0.00"
            />
          </div>

          {/* Narration */}
          <div className="space-y-2">
            <Label htmlFor="narration">
              {t("currencyConversion.form.narration") || "Narration"}
            </Label>
            <Textarea
              id="narration"
              name="narration"
              value={formData.narration}
              onChange={handleChange}
              className="w-full"
              rows={3}
              placeholder={t("currencyConversion.form.narration")}
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("currencyConversion.form.cancel") || "Cancel"}
            </Button>
            <Button type="submit" className="main-bg text-white hover:opacity-90"
              disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {selectedId ?
                    (t("currencyConversion.form.updating") || "Updating...") :
                    (t("currencyConversion.form.saving") || "Saving...")
                  }
                </>
              ) : (
                selectedId ?
                  (t("currencyConversion.form.update") || "Update") :
                  (t("currencyConversion.form.save") || "Save")
              )}
            </Button>
          </div>
        </form>
      )}
    </MultiMasterFormModal>
  );
};

export default AddCurrencyConversion;