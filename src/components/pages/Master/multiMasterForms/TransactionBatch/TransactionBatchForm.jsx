import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import MultiMasterFormModal from '../MultiMasterFormModal';
import useAutoFocus from '@/lib/hooks/useAutoFocus';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import AlertBox from '@/components/common/AlertBox';
import { useTranslation } from 'react-i18next';
import TextInput from '@/components/elements/theme/TextInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const TransactionBatchForm = ({
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

  // Batch options from API
  const [batchOptions, setBatchOptions] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Voucher type options
  const voucherTypeOptions = [
    { value: "Sales Invoice", label: t("transactionBatch.voucherTypes.salesInvoice") },
    { value: "Sales Quotation", label: t("transactionBatch.voucherTypes.salesQuotation") },
    { value: "Proforma Invoice", label: t("transactionBatch.voucherTypes.proformaInvoice") },
    { value: "Sales Order", label: t("transactionBatch.voucherTypes.salesOrder") },
    { value: "Sales Return", label: t("transactionBatch.voucherTypes.salesReturn") },
    { value: "Purchase Quotation", label: t("transactionBatch.voucherTypes.purchaseQuotation") },
    { value: "Purchase Order", label: t("transactionBatch.voucherTypes.purchaseOrder") },
    { value: "Purchase Invoice", label: t("transactionBatch.voucherTypes.purchaseInvoice") },
    { value: "Purchase Return", label: t("transactionBatch.voucherTypes.purchaseReturn") },
    { value: "Material Receipt", label: t("transactionBatch.voucherTypes.materialReceipt") },
    { value: "Delivery Note", label: t("transactionBatch.voucherTypes.deliveryNote") },
  ];

  const [formData, setFormData] = useState({
    voucherType: "",
    batchName: "",
    batchId: null,
  });

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch batches from API
  const fetchBatches = async () => {
    // setBatchLoading(true);
    try {
      const response = await axiosInstance.get('batches');
      const batches = response.data.data || [];
      
      // Transform to options format
      const options = batches.map((batch) => ({
        value: batch.batchId,
        label: batch.batchName,
      }));
      
      setBatchOptions(options);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setErrorMessage(t('transactionBatch.alerts.batchLoadError'));
    } finally {
      // setBatchLoading(false);
    }
  };

  // Validate field
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "voucherType":
        if (!value?.trim()) error = t("transactionBatch.validation.voucherTypeRequired");
        break;
      case "batchName":
        if (!value?.trim()) error = t("transactionBatch.validation.batchNameRequired");
        break;
      case "batchId":
        if (!value) error = t("transactionBatch.validation.batchRequired");
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
      const response = await axiosInstance.get(`transaction-batch/show-byId/${id}`);
      const data = response.data.data;

      setFormData({
        voucherType: data.voucherType || data.vouchertype || "",
        batchName: data.batchName || data.batchname || "",
        batchId: data.batchId || data.batchid || "",
      });
    } catch (error) {
      console.error('Error fetching edit data:', error);
      setErrorMessage(t('transactionBatch.alerts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Initialize form data when modal opens
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setErrors({});
      
      // Fetch batches when modal opens
      fetchBatches();

      if (isEditMode && editData?.id) {
        fetchEditData(editData.id);
      } else {
        // Reset form for new entry
        setFormData({
          voucherType: "",
          batchName: "",
          batchId: "",
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

  // Handle select input change
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user selects
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.voucherType?.trim()) {
      newErrors.voucherType = t("transactionBatch.validation.voucherTypeRequired");
    }
    if (!formData.batchName?.trim()) {
      newErrors.batchName = t("transactionBatch.validation.batchNameRequired");
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
        voucherType: formData.voucherType,
        batchName: formData.batchName,
        batchId: formData.batchId,
        branchId: selectedBranchId,
      };

      if (isEditMode) {
        payload.modifiedUser = userId;
        await axiosInstance.post(`transaction-batch/update/${editData.id}`, payload);
        setAlert({ id: Date.now(), type: "success", message: t("transactionBatch.alerts.updateSuccess") });
      } else {
        payload.createdUser = userId;
        await axiosInstance.post("transaction-batch/store", payload);
        setAlert({ id: Date.now(), type: "success", message: t("transactionBatch.alerts.createSuccess") });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(error?.response?.data?.message || t('transactionBatch.alerts.saveError'));
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

  const modalTitle = isEditMode ? t("transactionBatch.modal.titleEdit") : t("transactionBatch.modal.titleCreate");
  const submitButtonText = isEditMode ? t("transactionBatch.modal.update") : t("transactionBatch.modal.save");

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
            <div className="text-gray-500">{t("transactionBatch.modal.loading")}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Voucher Type */}
            <div className="space-y-1">
              <SearchableDropdown
                id="voucherType"
                name="voucherType"
                label={t("transactionBatch.fields.voucherType")}
                placeholder={t("transactionBatch.placeholders.voucherType")}
                value={formData.voucherType}
                onChange={(value) => handleSelectChange('voucherType', value)}
                options={voucherTypeOptions}
                required
                error={errors.voucherType}
                className="border-gray-500"
              />
            </div>

          

            {/* Batch Name / Transaction Batch Name */}
            <div className="space-y-1">
              <TextInput
                ref={focusInputRef}
                id="batchName"
                label={t("transactionBatch.fields.batchName")}
                name="batchName"
                placeholder={t("transactionBatch.placeholders.batchName")}
                value={formData.batchName}
                onChange={handleChange}
                required
                onBlur={(e) => validateField(e.target.name, e.target.value)}
                error={errors.batchName}
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
                {t("transactionBatch.modal.cancel")}
              </Button>
              <Button
                type="submit"
                className="main-bg text-white hover:opacity-90"
                disabled={submitLoading || batchLoading}
              >
                {submitLoading
                  ? (isEditMode ? t("transactionBatch.modal.updating") : t("transactionBatch.modal.saving"))
                  : submitButtonText}
              </Button>
            </div>
          </form>
        )}
      </MultiMasterFormModal>
    </>
  );
};

export default TransactionBatchForm;