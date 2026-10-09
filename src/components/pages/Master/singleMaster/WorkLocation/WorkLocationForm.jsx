import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../../multiMasterForms/MultiMasterFormModal";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";

// ✅ Reusable Inputs
import TextInput from "@/components/elements/theme/TextInput";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { sanitize } from "@/lib/inputSanitizer";

const WorkLocationForm = ({ open, handleClose, onSuccess, selectedId }) => {
  const { t } = useTranslation();
  const focusInputRef = useAutoFocus(open, 200, 'input[name="workLocationName"]');
  const [errorMsg, setErrorMsg] = useState(null);
  const { selectedBranchId, user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);
  

  const [formData, setFormData] = useState({
    workLocationName: "",
    branchId: selectedBranchId,
    CreatedUser: user?.userId,
  });

  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        workLocationName: "",
        branchId: selectedBranchId,
        CreatedUser: user?.userId,
      });
      setErrorMsg(null);
    }
  }, [open, selectedBranchId, user?.userId]);

  // Fetch data if editing
  useEffect(() => {
    if (selectedId && open) {
      setLoading(true);
      axiosInstance
        .get(`get-worklocation-byId/${selectedId}`)
        .then((res) => {
          if (!res.data?.error) {
            const data = res.data.data;
            setFormData({
              workLocationName: data.workLocationName || "",
              branchId: data.branchId || selectedBranchId,
              CreatedUser: data.CreatedUser || user?.userId,
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching work location data:", err);
          setErrorMsg("Failed to load work location data");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedId, open, selectedBranchId, user?.userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
  let updatedValue = value
  if(["workLocationName"].includes(name)){
    updatedValue = sanitize.alphaNumericSpace(value)
  }
    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));

    if (errorMsg) setErrorMsg(null);
  };

  const validateForm = () => {
    if (!formData.workLocationName.trim()) {
      setErrorMsg("Work Location Name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (selectedId && generalSettings?.askConfirmationEdit) {
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
} else if (!selectedId && generalSettings?.askConfirmationSave) {
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
      setLoading(true);
      setErrorMsg(null);

      const submitData = {
        workLocationName: formData.workLocationName.trim(),
        branchId: formData.branchId,
        CreatedUser: formData.CreatedUser,
      };

      if (selectedId) {
        await axiosInstance.post(`update-worklocation/${selectedId}`, {
          ...submitData,
          ModifiedUser: user?.userId,
        });
      } else {
        await axiosInstance.post("save-worklocation", submitData);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving work location:", error);
      setErrorMsg(
        error.response?.data?.message ||
          "Failed to save work location. Please try again."
      );
    } finally {
      setLoading(false);
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
    handleClose();
  };

  return (
    <MultiMasterFormModal
      open={open}
      handleClose={handleClose}
      title={
        selectedId
          ? t("worklocation.form.editTitle") || "Edit Work Location"
          : t("worklocation.form.title") || "Add Work Location"
      }
    >
      {loading ? (
        <p className="text-center py-4">
          {t("loadingText") || "Loading..."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Work Location Name */}
          <TextInput
            ref={focusInputRef}
            id="workLocationName"
            name="workLocationName"
            label={t("worklocation.form.locationName") || "Work Location Name"}
            required
            value={formData.workLocationName}
            onChange={handleChange}
            placeholder={t("worklocation.form.locationNamePlaceholder")}
            error={
              errorMsg?.includes("Work Location Name") ? errorMsg : undefined
            }
          />

          {/* General error message */}
          {errorMsg && !errorMsg.includes("Work Location Name") && (
            <div className="text-red-700">{errorMsg}</div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
           <Button type="button" variant="outline" onClick={handleModalClose}>
              {t("worklocation.form.cancel") || "Cancel"}
            </Button>
            <Button type="submit" className="main-bg text-white hover:opacity-90" 
 disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {selectedId
                    ? t("worklocation.form.updating") || "Updating..."
                    : t("worklocation.form.saving") || "Saving..."}
                </>
              ) : selectedId ? (
                t("worklocation.form.update") || "Update"
              ) : (
                t("worklocation.form.save") || "Save"
              )}
            </Button>
          </div>
        </form>
      )}
    </MultiMasterFormModal>
  );
};

export default WorkLocationForm;
