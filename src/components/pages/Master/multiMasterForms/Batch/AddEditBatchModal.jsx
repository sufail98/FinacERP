import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import MultiMasterFormModal from '../MultiMasterFormModal';
import useAutoFocus from '@/lib/hooks/useAutoFocus';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import AlertBox from '@/components/common/AlertBox';
import { useTranslation } from 'react-i18next';
import TextInput from '@/components/elements/theme/TextInput';
import DateInput from '@/components/elements/theme/DateInput';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddEditBatchModal = ({
  open,
  handleClose,
  editData = null,
  onSuccess = () => { }
}) => {
  const { t } = useTranslation();
  const [alert, setAlert] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const isEditMode = Boolean(editData);
  const [errors, setErrors] = useState({});
  const focusInputRef = useAutoFocus(open, 200, 'input[name="batchName"]');

  const { selectedBranchId, userId } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);
  
  const [formData, setFormData] = useState({
    batchName: "",
    mfd: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Helper function to get today's date in API format (yyyy-MM-dd)
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Validate field
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "batchName":
        if (!value?.trim()) error = t("batch.validation.batchNameRequired");
        break;
      case "mfd":
        if (!value) error = t("batch.validation.mfdRequired");
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  // Fetch edit data if in edit mode
  const fetchEditData = async (id) => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(`get-batch-byId/${id}`);
      const data = response.data.data;

      // Format date properly - extract yyyy-MM-dd from ISO string
      let mfdValue = "";
      if (data.mfd) {
        // Handle both ISO string and date string formats
        const dateStr = data.mfd.includes('T') ? data.mfd.split('T')[0] : data.mfd;
        mfdValue = dateStr;
      }

      setFormData({
        batchName: data.batchName || "",
        mfd: mfdValue,
      });
    } catch (error) {
      console.error('Error fetching edit data:', error);
      setErrorMessage(t('batch.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setErrors({});
      
      if (isEditMode && editData?.id) {
        fetchEditData(editData.id);
      } else {
        // Set today's date as default for new batch
        setFormData({
          batchName: "",
          mfd: getTodayDate(),
        });
      }
    }
  }, [open, isEditMode, editData?.id]);

  // Handle text input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle date input change - Fixed to work with DateInput component
  const handleDateChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value || "" }));
    
    // Clear error when user selects date
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.batchName?.trim()) {
      newErrors.batchName = t("batch.validation.batchNameRequired");
    }
    if (!formData.mfd) {
      newErrors.mfd = t("batch.validation.mfdRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

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

    setSubmitLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        batchName: formData.batchName,
        mfd: formData.mfd,
        branchId: selectedBranchId,
      };

      if (isEditMode) {
        payload.ModifiedUser = userId;
        await axiosInstance.post(`update-batch/${editData.id}`, payload);
        setAlert({ id: Date.now(), type: "success", message: t("batch.alerts.updateSuccess") });
      } else {
        payload.CreatedUser = userId;
        await axiosInstance.post("save-batch", payload);
        setAlert({ id: Date.now(), type: "success", message: t("batch.alerts.createSuccess") });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(error?.response?.data?.message || t('batch.alerts.saveError'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleModalClose = async () => {
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
    setErrorMessage(null);
    handleClose();
};

  const modalTitle = isEditMode ? t("batch.modal.titleEdit") : t("batch.modal.titleCreate");
  const submitButtonText = isEditMode ? t("batch.modal.update") : t("batch.modal.save");

  return (
    <>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <MultiMasterFormModal 
        open={open} 
        onClose={(event, reason) => {
          if (reason === "backdropClick") {
            setErrors({});
          }
          handleModalClose();
        }} 
        title={modalTitle}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("batch.modal.loading")}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Batch Name */}
            <div className="space-y-1">
              <TextInput
                ref={focusInputRef}
                id="batchName"
                label={t("batch.fields.batchName")}
                name="batchName"
                placeholder={t("batch.placeholders.batchName")}
                value={formData.batchName}
                onChange={handleChange}
                required
                onBlur={(e) => validateField(e.target.name, e.target.value)}
                error={errors.batchName}
                className="border-gray-500"
              />
            </div>

            {/* Manufacturing Date */}
            <div className="space-y-1">
              <DateInput
                id="mfd"
                name="mfd"
                label={t("batch.fields.mfd")}
                value={formData.mfd}
                onChange={(e, apiValue) => handleDateChange('mfd', apiValue)}
                placeholder={t("batch.placeholders.mfd")}
                required
                error={errors.mfd}
                className="border-gray-500"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {errorMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={submitLoading}
              >
                {t("batch.modal.cancel")}
              </Button>
              <Button
                type="submit"
                className="main-bg text-white hover:opacity-90"
                disabled={submitLoading}
              >
                {submitLoading
                  ? (isEditMode ? t("batch.modal.updating") : t("batch.modal.saving"))
                  : submitButtonText}
              </Button>
            </div>
          </form>
        )}
      </MultiMasterFormModal>
    </>
  );
};

export default AddEditBatchModal;