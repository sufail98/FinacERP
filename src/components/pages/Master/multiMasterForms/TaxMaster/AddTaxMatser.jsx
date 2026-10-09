import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import MultiMasterFormModal from "../MultiMasterFormModal";
import { Button } from "@/components/ui/button";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import useAuth from "@/redux/hook/auth/useAuth";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import useFormValidation from "@/lib/hooks/useFormValidation";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';


const AddTaxMaster = ({ open, handleClose, onSuccess, editId }) => {
  const { errors, validateForm, handleBlur, setErrors } = useFormValidation();

  const { t } = useTranslation();
  const focusInputRef = useAutoFocus(open, 200, 'input[name="taxName"]');
  const [alert, setAlert] = useState(null);
  const { selectedBranchId, user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);
  const [loading, setLoading] = useState(false);
  const [finalError, setFinalError] = useState(null);

  const [formData, setFormData] = useState({
    taxName: "",
    rate: "",
    calculatingMode: "",
    active: true,
    narration: "",
    branchId: selectedBranchId,
  });

  const validationRules = {
    taxName: { required: true, label: t("requiredFieldsError") },
    rate: { required: true, label: t("requiredFieldsError") },
    calculatingMode: { required: true, label: t("requiredFieldsError") },
  };

  // ✅ Clear all errors and reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // Clear errors every time modal opens
      setErrors({});
      setFinalError(null);
      setAlert(null);

      if (editId) {
        const fetchTaxMaster = async () => {
          setLoading(true);
          try {
            const response = await axiosInstance.get(
              `get-tax-master-byId/${editId}`
            );
            if (response.data?.data) {
              setFormData({
                taxName: response.data.data.taxName || "",
                rate: response.data.data.rate || "",
                calculatingMode: response.data.data.calculatingMode || "",
                active: response.data.data.active ?? true,
                narration: response.data.data.narration || "",
                branchId: response.data.data.branchId || selectedBranchId,
              });
            }
          } catch (error) {
            console.error("Error fetching tax master:", error);
            setAlert({
              type: "error",
              message: t("taxMaster.alerts.fetchError"),
            });
          } finally {
            setLoading(false);
          }
        };
        fetchTaxMaster();
      } else {
        // Reset form when creating new
        setFormData({
          taxName: "",
          rate: "",
          calculatingMode: "",
          active: true,
          narration: "",
          branchId: selectedBranchId,
        });
      }
    } else {
      // ✅ Also clear errors when modal closes
      setErrors({});
      setFinalError(null);
      setAlert(null);
    }
  }, [editId, open, selectedBranchId, setErrors, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value
    if (["taxName"].includes(name)) {
      updatedValue = value.replace(/[^A-Za-z0-9@%\- ]/g, "");
    }
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));

    // ✅ Clear the specific field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  };

  // ✅ Wrap handleClose to clear errors before closing
  const onClose = async () => {
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
    setErrors({});
    setFinalError(null);
    setAlert(null);
    handleClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFinalError(null);

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

    try {
      if (editId) {
        await axiosInstance.post(`update-tax-master/${editId}`, {
          ModifiedUser: user.userId,
          ...formData,
        });
        setAlert({
          type: "success",
          message: t("taxMaster.alerts.updateSuccess"),
        });
      } else {
        await axiosInstance.post("save-tax-master", {
          CreatedUser: user.userId,
          ...formData,
        });
        setAlert({
          type: "success",
          message: t("taxMaster.alerts.createSuccess"),
        });
      }
      onSuccess();
      onClose(); // ✅ Use onClose instead of handleClose
    } catch (error) {
      console.error("Error saving tax master:", error);
      setFinalError(error.response?.data?.message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
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
  }, [open, formData, editId]);

  return (
    <MultiMasterFormModal
      open={open}
      handleClose={onClose} // ✅ Use onClose here
      title={t(
        editId ? "taxMaster.form.title.edit" : "taxMaster.form.title.add"
      )}
    >
      {alert && (
        <AlertBox key={alert.id} message={alert.message} type={alert.type} />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tax Name */}
        <div className="space-y-1">
          <TextInput
            ref={focusInputRef}
            label={t("taxMaster.form.fields.taxName.label")}
            id="taxName"
            name="taxName"
            placeholder={t("taxMaster.form.fields.taxName.placeholder")}
            value={formData.taxName}
            onChange={handleChange}
            className={`border-gray-500`}
            disabled={loading}
            required
            onBlur={(e) => handleBlur(e, validationRules)}
            error={errors.taxName}
          />
        </div>

        {/* Rate */}
        <div className="space-y-1">
          <TextInput
            label={t("taxMaster.form.fields.rate.label")}
            type="number"
            id="rate"
            name="rate"
            placeholder={t("taxMaster.form.fields.rate.placeholder")}
            value={formData.rate}
            onChange={handleChange}
            className={`border-gray-500`}
            disabled={loading}
            required
            onBlur={(e) => handleBlur(e, validationRules)}
            error={errors.rate}
          />
        </div>

        {/* Calculating Mode */}
        <NormalSelectInput
          name="calculatingMode"
          label={t("taxMaster.form.fields.calculatingMode.label")}
          value={formData.calculatingMode}
          onChange={handleChange}
          placeholder={t(
            "taxMaster.form.fields.calculatingMode.placeholder"
          )}
          options={[
            {
              value: "product",
              label: t(
                "taxMaster.form.fields.calculatingMode.options.product"
              ),
            },
            {
              value: "bill",
              label: t(
                "taxMaster.form.fields.calculatingMode.options.bill"
              ),
            },
          ]}
          required
          onBlur={(e) => handleBlur(e, validationRules)}
          error={errors.calculatingMode}
        />

        {/* Narration */}
        <div className="space-y-1">
          <TextArea
            label={t("taxMaster.form.fields.narration.label")}
            id="narration"
            name="narration"
            placeholder={t("taxMaster.form.fields.narration.placeholder")}
            value={formData.narration}
            onChange={handleChange}
            className={`border-gray-500`}
            disabled={loading}
          />
        </div>

        {/* Active Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            checked={formData.active}
            onCheckedChange={handleCheckboxChange}
            disabled={loading}
          />
          <Label htmlFor="active">
            {t("taxMaster.form.fields.active")}
          </Label>
        </div>
        {finalError && (
          <div className="text-red-500 text-sm text-end">{finalError}</div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose} // ✅ Use onClose here
            disabled={loading}
          >
            {t("taxMaster.form.buttons.cancel")}
          </Button>
          <Button
            type="submit"
            className="main-bg text-white hover:opacity-90"
            disabled={loading}
          >
            {loading
              ? t("taxMaster.form.buttons.saving")
              : t(
                editId
                  ? "taxMaster.form.buttons.update"
                  : "taxMaster.form.buttons.save"
              )}
          </Button>
        </div>
      </form>
    </MultiMasterFormModal>
  );
};

AddTaxMaster.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  editId: PropTypes.string,
};

export default AddTaxMaster;