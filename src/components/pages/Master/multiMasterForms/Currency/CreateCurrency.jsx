import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../MultiMasterFormModal";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";

const CreateCurrency = ({ open, handleClose, editId, onSaved }) => {
  const { t } = useTranslation();
  const [alert, setAlert] = useState(null);
  const { userId, selectedBranchId } = useAuth();
  const focusInputRef = useAutoFocus(open, 200, 'input[name="currencySymbol"]');
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState(null);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    currencySymbol: "",
    currencyName: "",
    subunitName: "",
    noOfDecimalPlace: "",
    narration: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editId && open) {
      const fetchCurrency = async () => {
        try {
          const response = await axiosInstance.get(`get-currency-byId/${editId}`);
          setFormData(response.data.data);
        } catch (error) {
          console.error("Error fetching currency:", error);
        }
      };
      fetchCurrency();
    } else {
      setFormData({
        currencySymbol: "",
        currencyName: "",
        subunitName: "",
        noOfDecimalPlace: "",
        narration: "",
      });
    }
    // Reset errors when modal opens/closes
    if (open) {
      setErrors({});
      setFinalError(null);
    }
  }, [editId, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Enter key to move to next field in order
  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target;

      // Allow Enter in textarea for new lines
      if (target.tagName === 'TEXTAREA') return;

      // Don't intercept Enter on buttons (let submit work normally)
      if (target.tagName === 'BUTTON') return;

      e.preventDefault();

      if (!formRef.current) return;

      // Get all focusable elements in form order
      const focusableSelectors = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
      const focusableElements = Array.from(formRef.current.querySelectorAll(focusableSelectors));

      // Filter out elements that are not visible
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

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!formData.currencySymbol) newErrors.currencySymbol = t("requiredFieldsError");
    if (!formData.currencyName) newErrors.currencyName = t("requiredFieldsError");
    if (!formData.noOfDecimalPlace) newErrors.noOfDecimalPlace = t("requiredFieldsError");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFinalError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        branchId: selectedBranchId,
        [editId ? "ModifiedUser" : "CreatedUser"]: userId,
      };

      if (editId) {
        await axiosInstance.post(`update-currency/${editId}`, payload);
        setAlert({ type: "success", message: t("currencyForm.alert.updateSuccess") });
      } else {
        await axiosInstance.post("save-currency", payload);
        setAlert({ type: "success", message: t("currencyForm.alert.createSuccess") });
      }

      // Call onSaved callback to refresh data in parent
      if (onSaved) {
        onSaved();
      }
      handleClose();
    } catch (error) {
      console.error("Error saving currency:", error);
      setFinalError(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <MultiMasterFormModal
        open={open}
        handleClose={handleClose}
        title={editId ? t("currencyForm.modal.editTitle") : t("currencyForm.modal.addTitle")}
      >
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
          <div className="space-y-1">
            <TextInput
              ref={focusInputRef}
              label={t("currencyForm.form.currencySymbol")}
              id="currencySymbol"
              name="currencySymbol"
              placeholder={t("currencyForm.form.currencySymbolPlaceholder")}
              value={formData.currencySymbol}
              onChange={handleChange}
              required
              className="border-gray-500"
              error={errors.currencySymbol}
            />
          </div>

          <div className="space-y-1">
            <TextInput
              id="currencyName"
              label={t("currencyForm.form.currencyName")}
              name="currencyName"
              placeholder={t("currencyForm.form.currencyNamePlaceholder")}
              value={formData.currencyName}
              onChange={handleChange}
              required
              className="border-gray-500"
              error={errors.currencyName}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="subunitName">{t("currencyForm.form.subunitName")}</Label>
            <TextInput
              id="subunitName"
              name="subunitName"
              placeholder={t("currencyForm.form.subunitNamePlaceholder")}
              value={formData.subunitName}
              onChange={handleChange}
              className="border-gray-500"
            />
          </div>

          <div className="space-y-1">
            <TextInput
              type="number"
              label={t("currencyForm.form.noOfDecimalPlace")}
              id="noOfDecimalPlace"
              name="noOfDecimalPlace"
              placeholder={t("currencyForm.form.noOfDecimalPlacePlaceholder")}
              value={formData.noOfDecimalPlace}
              onChange={handleChange}
              required
              className="border-gray-500"
              error={errors.noOfDecimalPlace}
            />
          </div>

          <div className="space-y-1">
            <TextArea
              label={t("currencyForm.form.narration")}
              id="narration"
              name="narration"
              placeholder={t("currencyForm.form.narrationPlaceholder")}
              rows={3}
              value={formData.narration}
              onChange={handleChange}
              className="border-gray-500"
            />
          </div>
          {finalError && (<div className="text-red-500 text-sm text-end">{finalError}</div>)}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {t("currencyForm.form.cancelBtn")}
            </Button>
            <Button type="submit" className="main-bg text-white hover:opacity-90" disabled={loading}>
              {loading ? t("currencyForm.form.saving") : editId ? t("currencyForm.form.updateBtn") : t("currencyForm.form.saveBtn")}
            </Button>
          </div>
        </form>
      </MultiMasterFormModal>
    </>
  );
};

export default CreateCurrency;