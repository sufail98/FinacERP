import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import MultiMasterFormModal from "../MultiMasterFormModal";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { sanitize } from "@/lib/inputSanitizer";

const AddProductGroup = ({ open, handleClose, onSuccess, selectedGroupId, selectedCategory = null }) => {
  const { t } = useTranslation();
  const focusInputRef = useAutoFocus(open, 200, 'input[name="groupName"]');
  const [errorMsg, setErrorMsg] = useState(null)
  const { selectedBranchId, user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    groupName: "",
    category: "",
    narration: "",
    branchId: selectedBranchId,
    CreatedUser: user?.userId,
  });

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        category: selectedCategory
      }));
    }
  }, [selectedCategory]);
  // 🔄 Fetch data if editing
  useEffect(() => {
    if (selectedGroupId && open) {
      setLoading(true);
      axiosInstance
        .get(`get-product-group-byId/${selectedGroupId}`)
        .then((res) => {
          if (res.data?.status === 200) {
            const data = res.data.data;
            setFormData({
              groupName: data.groupName || "",
              category: data.category || "",
              narration: data.narration || "",
              branchId: data.branchId || selectedBranchId,
              CreatedUser: data.CreatedUser || user?.userId,
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching group data:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedGroupId, open, selectedBranchId, user?.userId]);
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Check for Ctrl+S (or Cmd+S for Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // stop browser save
        handleSubmit(e);    // call your save function
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formData]); // rebind when modal opens or data changes
  const validateField = (name, value) => {
    let error = "";

    if (name === "groupName" && !value.trim()) {
      error = t("requiredFieldsError") || "Group Name is required";
    }

    if (name === "category" && !value) {
      error = t("requiredFieldsError") || "Category is required";
    }

    // Add other validations if needed
    // e.g., narration max length
    if (name === "narration" && value.length > 200) {
      error = "Narration cannot exceed 200 characters";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value
    if(["groupName"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  // Validate all fields first
  const isGroupNameValid = validateField("groupName", formData.groupName);
  const isCategoryValid = validateField("category", formData.category);

  if (!isGroupNameValid || !isCategoryValid) return; // stop submit if errors exist

  if (selectedGroupId && generalSettings?.askConfirmationEdit) {
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
} else if (!selectedGroupId && generalSettings?.askConfirmationSave) {
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
      if (selectedGroupId) {
        await axiosInstance.post(`update-product-group/${selectedGroupId}`, {
          ...formData,
          ModifiedUser: user?.userId,
        });
      } else {
        await axiosInstance.post("save-product-group", formData);

      }
      setFormData({
        groupName: "",
        category: "",
        narration: "",
        branchId: selectedBranchId,
        CreatedUser: user?.userId,
      })
      setErrorMsg(null)
      onSuccess()
      handleClose();
    } catch (error) {
      console.error("Error saving product group:", error);
      setErrorMsg(error.response.data.message)
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
    setFormData({
      groupName: "",
      category: "",
      narration: "",
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
    });
    setErrorMsg(null);
    handleClose();
  };

  return (
    <MultiMasterFormModal
  open={open}
  handleClose={handleModalClose}
  title={selectedGroupId ? t("productGroup.form.editTitle") : t("productGroup.form.addTitle")}
>
      {loading ? (
        <p className="text-center py-4">{t("productGroup.form.loading")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <NormalSelectInput
            name="category"
            label={t("productGroup.form.category")}
            value={formData.category}
            onChange={handleChange}
            placeholder={t("productGroup.form.selectCategory")}
            options={[
              { value: "category-1", label: "Category 1" },
              { value: "category-2", label: "Category 2" },
              { value: "category-3", label: "Category 3" },
              { value: "category-4", label: "Category 4" },
            ]}
            disabled={selectedCategory}
            onBlur={(e) => validateField(e.target.name, e.target.value)}
            required
          />

          {/* Group Name */}
          <div className="space-y-1">
            <TextInput
            onBlur={(e) => validateField(e.target.name, e.target.value)}
              ref={focusInputRef}
              label={t("productGroup.form.groupName")}
              id="groupName"
              name="groupName"
              placeholder={t("productGroup.form.enterGroupName")}
              value={formData.groupName}
              onChange={handleChange}
              className={`border-gray-500`}
              required
              error={errors.groupName}
            />
          </div>

          {/* Narration */}
          <div className="space-y-1">
            <Label htmlFor="narration">{t("productGroup.form.narration")}</Label>
            <Textarea
              id="narration"
              name="narration"
              placeholder={t("productGroup.form.enterNarration")}
              rows={3}
              value={formData.narration}
              onChange={handleChange}
              className={`border-gray-500`}
            />
          </div>
          {errorMsg && (<div className="text-red-500 text-sm -mt-2 flex justify-end">{errorMsg}</div>)}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={handleModalClose}>
    {t("productGroup.form.cancel")}
</Button>
<Button type="submit" className="main-bg text-white hover:opacity-90" disabled={loading}>
    {selectedGroupId ? t("productGroup.form.update") : t("productGroup.form.save")}
</Button>
          </div>
        </form>
      )}
    </MultiMasterFormModal>
  );
};

export default AddProductGroup;
