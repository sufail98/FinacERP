import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../MultiMasterFormModal";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

// ✅ Reusable Inputs
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";

const AddDesignation = ({ open, handleClose, onSuccess, selectedId }) => {
  const { t } = useTranslation();
  const focusInputRef = useAutoFocus(open, 200, 'input[name="designationName"]');
  const [errorMsg, setErrorMsg] = useState(null);
  const { selectedBranchId, user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings)

  const [formData, setFormData] = useState({
    designationName: "",
    leaveDays: "",
    advancePercentage: "",
    narration: "",
    branchId: selectedBranchId,
    CreatedUser: user?.userId,
  });

  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        designationName: "",
        leaveDays: "",
        advancePercentage: "",
        narration: "",
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
        .get(`get-designation-byId/${selectedId}`)
        .then((res) => {
          if (!res.data?.error) {
            const data = res.data.data;
            setFormData({
              designationName: data.designationName || "",
              leaveDays: data.leaveDays?.toString() || "",
              advancePercentage: data.advancePercentage?.toString() || "",
              narration: data.narration || "",
              branchId: data.branchId || selectedBranchId,
              CreatedUser: data.CreatedUser || user?.userId,
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching designation data:", err);
          setErrorMsg("Failed to load designation data");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedId, open, selectedBranchId, user?.userId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    let processedValue = value;
    if (type === "number") {
      if (value === "") {
        processedValue = "";
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (name === "leaveDays") {
  processedValue = value === "" ? "" : parseInt(value);
} else if (name === "advancePercentage") {
  processedValue =
    value === ""
      ? ""
      : parseFloat(value).toFixed(generalSettings.decimalPart);
} else {
  processedValue = value === "" ? "" : parseFloat(value);
}

        } else {
          processedValue = "";
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    if (errorMsg) setErrorMsg(null);
  };

  const validateForm = () => {
    if (!formData.designationName.trim()) {
      setErrorMsg("Designation Name is required");
      return false;
    }
    if (formData.leaveDays === "" || parseInt(formData.leaveDays) < 0)
 {
      setErrorMsg("Leave Days is required and must be 0 or greater");
      return false;
    }
    if (formData.advancePercentage === "" || parseFloat(formData.advancePercentage) < 0)
 {
      setErrorMsg("Advance Percentage is required and must be 0 or greater");
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
        designationName: formData.designationName.trim(),
        leaveDays: parseInt(formData.leaveDays),
        advancePercentage: parseFloat(formData.advancePercentage),
        narration: formData.narration.trim(),
        branchId: formData.branchId,
        CreatedUser: formData.CreatedUser,
      };

      if (selectedId) {
        await axiosInstance.post(`update-designation/${selectedId}`, {
          ...submitData,
          ModifiedUser: user?.userId,
        });
      } else {
        await axiosInstance.post("save-designation", submitData);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving designation:", error);
      setErrorMsg(
        error.response?.data?.message ||
          "Failed to save designation. Please try again."
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
          ? t("designation.form.editTitle") || "Edit Designation"
          : t("designation.form.title") || "Add Designation"
      }
    >
      {loading ? (
        <p className="text-center py-4">{t("loadingText") || "Loading..."}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Designation Name */}
          <TextInput
            ref={focusInputRef}
            id="designationName"
            name="designationName"
            label={t("designation.form.designationName") || "Designation Name"}
            required
            value={formData.designationName}
            onChange={handleChange}
            placeholder={
              t("designation.form.designationNamePlaceholder") ||
              "Enter designation name"
            }
            error={
              errorMsg?.includes("Designation Name") ? errorMsg : undefined
            }
          />

          {/* Leave Days */}
          <TextInput
            id="leaveDays"
            name="leaveDays"
            type="number"
            label={t("designation.form.leaveDays") || "Leave Days"}
            required
            value={formData.leaveDays}
            onChange={handleChange}
            placeholder="0"
            error={errorMsg?.includes("Leave Days") ? errorMsg : undefined}
          />

          {/* Advance Percentage */}
          <TextInput
            id="advancePercentage"
            name="advancePercentage"
            type="number"
            label={t("designation.form.advancePercentage") || "Advance Percentage"}
            required
            value={formData.advancePercentage}
            onChange={handleChange}
            placeholder="0.00"
            error={
              errorMsg?.includes("Advance Percentage") ? errorMsg : undefined
            }
          />

          {/* Narration */}
          <TextArea
            id="narration"
            name="narration"
            label={t("designation.form.narration") || "Narration"}
            value={formData.narration}
            onChange={handleChange}
            placeholder={
              t("designation.form.narrationPlaceholder") ||
              "Enter description or notes"
            }
            rows={3}
          />

          {/* General error message */}
          {errorMsg &&
            !(
              errorMsg.includes("Designation Name") ||
              errorMsg.includes("Leave Days") ||
              errorMsg.includes("Advance Percentage")
            ) && <div className="text-red-700">{errorMsg}</div>}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleModalClose}>
              {t("designation.form.cancel") || "Cancel"}
            </Button>
            <Button type="submit" className="main-bg text-white hover:opacity-90" 
 disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {selectedId
                    ? t("designation.form.updating") || "Updating..."
                    : t("designation.form.saving") || "Saving..."}
                </>
              ) : selectedId ? (
                t("designation.form.update") || "Update"
              ) : (
                t("designation.form.save") || "Save"
              )}
            </Button>
          </div>
        </form>
      )}
    </MultiMasterFormModal>
  );
};

export default AddDesignation;
