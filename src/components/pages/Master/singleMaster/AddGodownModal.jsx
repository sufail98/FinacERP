import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Card, CardContent } from "@/components/ui/card";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, useCallback } from "react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import Swal from "sweetalert2";
import { useSelector } from 'react-redux';

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "95%", sm: "95%", md: 500 },
  boxShadow: 24,
  borderRadius: 3,
  p: 2,
};

const AddGodownModal = ({ open, handleClose, mode = "add", id = null, onSaved }) => {
  const { selectedBranchId, user } = useAuth();
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    narration: "",
    branchId: "",
    isDefault: false,
  });

  // Track original isDefault value when editing
  const [originalIsDefault, setOriginalIsDefault] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  // Branch data
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Refs
  const nameInputRef = useRef(null);
  const saveButtonRef = useRef(null);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const response = await axiosInstance.get("branches");
      const branchData = response.data?.data || [];

      // Filter only active branches
      const activeBranches = branchData.filter(
        (branch) => branch.activeStatus === true || branch.activeStatus === 1
      );

      setBranches(activeBranches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // Fetch godown data for edit mode
  const fetchGodownData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(`get-godown-byId/${id}`);
      const data = response.data?.data;

      if (data) {
        const isDefaultValue = data.IsDefault === true || data.IsDefault === 1 || data.isDefault === true || data.isDefault === 1;
        
        setFormData({
          name: data.GodownName || data.godownName || "",
          narration: data.Narration || data.narration || "",
          branchId: String(data.branchId || data.BranchId || ""),
          isDefault: isDefaultValue,
        });
        
        // Store original isDefault value
        setOriginalIsDefault(isDefaultValue);
      }
    } catch (error) {
      console.error("Error fetching godown:", error);
      setApiError("Failed to load godown data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initialize when modal opens
  useEffect(() => {
    if (open) {
      // Reset states
      setErrors({});
      setApiError("");
      setOriginalIsDefault(false);

      // Always fetch branches when modal opens
      fetchBranches();

      if (mode === "edit" && id) {
        fetchGodownData();
      } else {
        // Reset form for add mode with default branch
        setFormData({
          name: "",
          narration: "",
          branchId: selectedBranchId ? String(selectedBranchId) : "",
          isDefault: false,
        });
      }

      // Focus on name input after a short delay
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 200);
    }
  }, [open, mode, id, selectedBranchId, fetchBranches, fetchGodownData]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({ name: "", narration: "", branchId: "", isDefault: false });
      setErrors({});
      setApiError("");
      setBranches([]);
      setOriginalIsDefault(false);
    }
  }, [open]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Show confirmation when setting as default in edit mode
   if (name === "isDefault" && type === "checkbox" && checked && mode === "edit" && !originalIsDefault) {
      Swal.fire({
        title: t("godown.alert.Confirmation"),
        text: t("godown.alert.title"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("godown.alert.confirmButtonText"),
        cancelButtonText: t("godown.alert.cancelButtonText"),
        customClass: {
          container: 'swal-high-zindex'
        },
        didOpen: () => {
          // Ensure SweetAlert2 appears above the modal
          const swalContainer = document.querySelector('.swal-high-zindex');
          if (swalContainer) {
            swalContainer.style.zIndex = '100000';
          }
        }
      }).then((result) => {
        if (result.isConfirmed) {
          setFormData((prev) => ({ 
            ...prev, 
            [name]: type === "checkbox" ? checked : value 
          }));
          setApiError("");
        }
      });
      return;
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
    setApiError("");

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle blur validation
  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (name === "name" && !value.trim()) {
      setErrors((prev) => ({ ...prev, name: "Godown name is required" }));
    }

    if (name === "branchId" && !value) {
      setErrors((prev) => ({ ...prev, branchId: "Branch is required" }));
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Godown name is required";
    }

    if (!formData.branchId) {
      newErrors.branchId = "Branch is required";
    }

    // Prevent unchecking default in edit mode
    if (mode === "edit" && originalIsDefault && !formData.isDefault) {
      setApiError(t("cannotUnsetDefault") || "Cannot unset default. Please select another godown as default from the list.");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  // Submit handler
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === "edit" && generalSettings?.askConfirmationEdit) {
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
} else if (mode === "add" && generalSettings?.askConfirmationSave) {
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
} else null;

    setSubmitLoading(true);
    setApiError("");

    const payload = {
      GodownName: formData.name.trim(),
      Narration: formData.narration.trim(),
      branchId: parseInt(formData.branchId, 10),
      IsDefault: formData.isDefault,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "edit" ? user?.userId : null,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post("save-godown", payload);
      } else {
        await axiosInstance.post(`update-godown/${id}`, payload);
      }

      // Success callback
      if (onSaved) {
        onSaved({
          type: "success",
          message: mode === "add" ? t("saveSuccess") : t("updateSuccess"),
        });
      }

      handleClose();
    } catch (error) {
      console.error("Error saving godown:", error);
      setApiError(error?.response?.data?.message || "Failed to save godown");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Check if checkbox should be disabled
  const isDefaultCheckboxDisabled = mode === "edit" && originalIsDefault;

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
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={async (event, reason) => {
        if (reason === "backdropClick") {
          setErrors({});
        }
        await handleModalClose();
      }}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
      style={{ zIndex: 99999 }}
    >
      <Fade in={open}>
        <Box
          sx={style}
          className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 transition-colors"
        >
          <Card className="border-none shadow-none p-0 bg-transparent dark:bg-transparent">
            <CardContent className="bg-transparent dark:bg-transparent p-0">
              {/* Header */}
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                {mode === "add"
                  ? t("addGodown") || "Add Godown"
                  : t("editGodown") || "Edit Godown"}
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    Loading...
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Godown Name */}
                  <TextInput
                    ref={nameInputRef}
                    label={t("godown.columns.godown") || "Godown Name"}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Enter godown name"
                    error={errors.name}
                    required
                  />

                  {/* Branch Selection */}
                  <div>
                    <Label
                      htmlFor="branchId"
                      className="text-[11px] font-medium mb- flex justify-between text-gray-700 dark:text-gray-300"
                    >
                      <div>
                        {t("branch") || "Branch"}{" "}
                        <span className="text-red-500 dark:text-red-400">*</span>
                      </div>
                    </Label>

                    {branchesLoading ? (
                      <div className="h-6 flex items-center px-2 border rounded-[3px] bg-gray-50 dark:bg-gray-800 border-gray-500 dark:border-gray-600">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Loading branches...
                        </span>
                      </div>
                    ) : (
                      <select
                        id="branchId"
                        name="branchId"
                        value={formData.branchId}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`h-6 rounded-[3px] text-sm w-full px-2
                          bg-white dark:bg-[#242424]
                          text-gray-900 dark:text-gray-100
                          border ${
                            errors.branchId
                              ? "border-red-500 dark:border-red-400"
                              : "border-gray-500 dark:border-gray-600"
                          }
                          focus:border-blue-500 dark:focus:border-blue-400
                          focus:outline-none
                          disabled:bg-gray-100 dark:disabled:bg-gray-700
                          disabled:cursor-not-allowed
                        `}
                      >
                        <option value="" className="text-gray-400">
                          {t("selectBranch") || "-- Select Branch --"}
                        </option>
                        {branches.map((branch) => (
                          <option
                            key={branch.branchId}
                            value={String(branch.branchId)}
                          >
                          <span>{branch.branchCode}</span> - <span className="text-xs">{branch.branchName}</span>
                          </option>
                        ))}
                      </select>
                    )}

                    {errors.branchId && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {errors.branchId}
                      </p>
                    )}

                    {!branchesLoading && branches.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">
                        No active branches found
                      </p>
                    )}
                  </div>

                  {/* Is Default Checkbox */}
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                      disabled={isDefaultCheckboxDisabled}
                      className={`h-4 w-4 rounded border-gray-300 dark:border-gray-600 
                        text-blue-600 dark:text-blue-500
                        focus:ring-blue-500 dark:focus:ring-blue-400
                        bg-white dark:bg-[#242424]
                        ${isDefaultCheckboxDisabled 
                          ? 'cursor-not-allowed opacity-60' 
                          : 'cursor-pointer'
                        }`}
                    />
                    <Label
                      htmlFor="isDefault"
                      className={`text-sm font-medium text-gray-700 dark:text-gray-300 select-none
                        ${isDefaultCheckboxDisabled 
                          ? 'cursor-not-allowed opacity-60' 
                          : 'cursor-pointer'
                        }`}
                    >
                      {t("setAsDefault") || "Set as Default Godown"}
                    </Label>
                  </div>

                  {/* Info message when isDefault is checked in ADD mode */}
                  {formData.isDefault && mode === "add" && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {t("defaultGodownInfo") || "This will be set as the default godown for the selected branch. Any existing default godown will be unset."}
                      </p>
                    </div>
                  )}

                  {/* API Error */}
                  {apiError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {apiError}
                      </p>
                    </div>
                  )}

                  {/* Narration */}
                  <TextArea
                    label={t("narration") || "Narration"}
                    name="narration"
                    value={formData.narration}
                    onChange={handleInputChange}
                    placeholder="Enter narration (optional)"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && !e.shiftKey) {
                        e.preventDefault();
                        saveButtonRef.current?.focus();
                      }
                    }}
                  />

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      tabIndex={-1}
                      type="button"
                      variant="outline"
                      onClick={handleModalClose}
                      className="bg-white dark:bg-[#242424]
                        border-gray-500 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-600
                        transition-colors"
                    >
                      {t("cancelBtn") || "Cancel"}
                    </Button>

                    <Button
                      ref={saveButtonRef}
                      type="submit"
                      disabled={submitLoading}
                      className="bg-[var(--main-bg)] dark:main-bg 
                        text-white 
                        flex items-center justify-center gap-2 
                        hover:opacity-90 dark:hover:bg-blue-500 
                        transition-colors
                        disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitLoading ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                          <span>{t("saving") || "Saving..."}</span>
                        </>
                      ) : (
                        <span>
                          {mode === "add"
                            ? t("save") || "Save"
                            : t("updateBtn") || "Update"}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Modal>
  );
};

AddGodownModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default AddGodownModal;