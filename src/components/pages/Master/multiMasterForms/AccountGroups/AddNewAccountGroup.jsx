import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useRef } from 'react';
import MultiMasterFormModal from '../MultiMasterFormModal';
import useAutoFocus from '@/lib/hooks/useAutoFocus';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import AlertBox from '@/components/common/AlertBox';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import TextInput from '@/components/elements/theme/TextInput';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const INITIAL_FORM_DATA = {
  AccountGroupCode: "",
  accountGroupName: "",
  groupUnder: "",
  narration: "",
  LedgerNextNo: "1",
};

const AddEditAccountGroupModal = ({
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
  const focusInputRef = useAutoFocus(open, 200, 'input[name="AccountGroupCode"]');
  const formRef = useRef(null);

  const { selectedBranchId, userId } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  const [groupOptions, setGroupOptions] = useState([]);
  const [groupOptionsLoaded, setGroupOptionsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

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

        // If next element is inside SearchableDropdown, trigger click to open it
        const dropdownTrigger = nextElement.closest('[data-searchable-dropdown]');
        if (dropdownTrigger) {
          nextElement.click();
        }
      }
    }
  };

  // Fetch group options for dropdown
  const fetchGroupOptions = async () => {
    try {
      const response = await axiosInstance.get('accountgroups');

      const options = response.data.data.map(group => ({
        value: group.groupId.toString(),
        label: group.accountGroupName
      }));
      setGroupOptions(options);
      setGroupOptionsLoaded(true);
    } catch (error) {
      console.error('Error fetching group options:', error);
      setGroupOptionsLoaded(true);
    }
  };

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "AccountGroupCode":
        if (!value.trim()) error = t("requiredFieldsError");
        break;
      case "accountGroupName":
        if (!value.trim()) error = t("requiredFieldsError");
        break;
      case "LedgerNextNo":
        if (!value) error = t("requiredFieldsError");
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
      const response = await axiosInstance.get(`get-accountgroup-byId/${id}`);
      const data = response.data.data;

      setFormData({
        AccountGroupCode: data.AccountGroupCode || "",
        accountGroupName: data.accountGroupName || "",
        groupUnder: data.groupUnder?.toString() || "",
        narration: data.narration || "",
        LedgerNextNo: data.LedgerNextNo || "",
      });
    } catch (error) {
      console.error('Error fetching edit data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setErrors({});
      setErrorMessage(null);

      if (isEditMode && editData?.id) {
        setFormData({ ...INITIAL_FORM_DATA });
      } else {
        setFormData({ ...INITIAL_FORM_DATA });
      }

      const init = async () => {
        if (!groupOptionsLoaded) {
          await fetchGroupOptions();
        }

        if (isEditMode && editData?.id) {
          await fetchEditData(editData.id);
        }
      };

      init();
    } else {
      setFormData({ ...INITIAL_FORM_DATA });
      setErrors({});
      setErrorMessage(null);
    }
  }, [open, isEditMode, editData?.id]);

  // Prefetch group options on mount so dropdown is ready
  useEffect(() => {
    fetchGroupOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'AccountGroupCode') {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLedgerKeyDown = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleLedgerPaste = (e) => {
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d+$/.test(pastedData)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    try {
      const payload = {
        AccountGroupCode: formData.AccountGroupCode,
        accountGroupName: formData.accountGroupName,
        groupUnder: formData.groupUnder || "0",
        narration: formData.narration,
        LedgerNextNo: formData.LedgerNextNo,
        branchId: selectedBranchId,
        CreatedUser: userId
      };

      if (isEditMode) {
        await axiosInstance.post(`update-accountgroup/${editData.id}`, payload);
        setAlert({ type: "success", message: t("accountGroupsModal.alerts.updateSuccess") });
      } else {
        await axiosInstance.post("save-accountgroup", payload);
        setAlert({ type: "success", message: t("accountGroupsModal.alerts.createSuccess") });
      }

      onSuccess();
      handleClose();
      setAlert({
        id: Date.now(),
        type: "success",
        message: "Saved"
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(error?.response?.data?.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const modalTitle = isEditMode
    ? t("accountGroupsModal.title.edit")
    : t("accountGroupsModal.title.create");

  const submitButtonText = isEditMode
    ? t("accountGroupsModal.buttons.update")
    : t("accountGroupsModal.buttons.save");

  return (
    <>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <MultiMasterFormModal open={open} onClose={(event, reason) => {
        if (reason === "backdropClick") {
          setErrors({});
        }
        handleClose();
      }} title={modalTitle}>
        {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t("accountGroupsModal.loading")}</div>
          </div>
        ) : (
          <div className="flex justify-center">
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              onKeyDown={handleFormKeyDown}
              className="w-full max-w-md space-y-3 px-2"
            >
              {/* Account Group Code */}
              <div className="space-y-0.5">
                <TextInput
                  ref={focusInputRef}
                  id="AccountGroupCode"
                  label={t("accountGroupsModal.fields.code")}
                  name="AccountGroupCode"
                  placeholder={t("accountGroupsModal.placeholders.code")}
                  value={formData.AccountGroupCode}
                  onChange={handleChange}
                  required
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  error={errors.AccountGroupCode}
                  className="border-gray-500 uppercase h-8 text-sm"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* Account Group Name */}
              <div className="space-y-0.5">
                <TextInput
                  id="accountGroupName"
                  label={t("accountGroupsModal.fields.name")}
                  name="accountGroupName"
                  placeholder={t("accountGroupsModal.placeholders.name")}
                  value={formData.accountGroupName}
                  onChange={handleChange}
                  required
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  error={errors.accountGroupName}
                  className="border-gray-500 h-8 text-sm"
                />
              </div>

              {/* Group Under Dropdown */}
              <div className="space-y-0.5">
                <SearchableDropdown
                  id="groupUnder"
                  name="groupUnder"
                  label={t("accountGroupsModal.fields.groupUnder")}
                  value={formData.groupUnder}
                  onChange={(value) => setFormData(prev => ({ ...prev, groupUnder: value }))}
                  options={groupOptions}
                  placeholder={!groupOptionsLoaded ? "Loading..." : t("accountGroupsModal.placeholders.groupUnder")}
                  searchPlaceholder={t("accountGroupsModal.placeholders.searchGroup")}
                  clearable={true}
                  className="h-8 text-sm"
                  required
                  labelClassName="text-blue-600"
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  error={errors.groupUnder}
                />
              </div>

              {/* Narration */}
              <div className="space-y-0.5">
                <Label htmlFor="narration" className="text-xs font-medium">
                  {t("accountGroupsModal.fields.narration")}
                </Label>
                <Textarea
                  id="narration"
                  name="narration"
                  placeholder={t("accountGroupsModal.placeholders.narration")}
                  rows={2}
                  value={formData.narration}
                  onChange={handleChange}
                  className="border-gray-500 resize-none overflow-y-auto text-sm"
                  style={{ height: '60px', maxHeight: '60px', minHeight: '60px' }}
                />
              </div>

              {/* Ledger Next No */}
              <div className="space-y-0.5">
                <Label htmlFor="LedgerNextNo" className="text-xs font-medium">
                  {t("accountGroupsModal.fields.ledgerNextNo")}
                </Label>
                <Input
                  type="number"
                  id="LedgerNextNo"
                  name="LedgerNextNo"
                  placeholder={t("accountGroupsModal.placeholders.ledgerNextNo")}
                  value={formData.LedgerNextNo}
                  onChange={handleChange}
                  onKeyDown={handleLedgerKeyDown}
                  onPaste={handleLedgerPaste}
                  required
                  min="1"
                  className="border-gray-500 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-500">{errorMessage}</div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={async () => {
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
    handleClose();
    setErrors({});
    setErrorMessage('');
  }}
  disabled={submitLoading}
>
  {t("accountGroupsModal.buttons.cancel")}
</Button>
                <Button
                  type="submit"
                  size="sm"
                  className="main-bg text-white hover:opacity-90"
                  disabled={submitLoading}
                >
                  {submitLoading
                    ? (isEditMode
                      ? t("accountGroupsModal.buttons.updating")
                      : t("accountGroupsModal.buttons.saving"))
                    : submitButtonText}
                </Button>
              </div>
            </form>
          </div>
        )}
      </MultiMasterFormModal>
    </>
  );
};

export default AddEditAccountGroupModal;