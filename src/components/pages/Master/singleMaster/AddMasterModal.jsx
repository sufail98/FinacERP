import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Card, CardContent } from "@/components/ui/card";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import TextArea from "@/components/elements/theme/TextArea";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import AlertBox from "@/components/common/AlertBox";
import TextInput from "@/components/elements/theme/TextInput";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { sanitize } from "@/lib/inputSanitizer";

// ✅ Updated style - removed bgcolor and border (will use classes instead)
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "95%", sm: "95%", md: 600 },
  boxShadow: 24,
  borderRadius: 3,
  p: 2,
};

// 🔹 API mapping for each master
const apiConfig = {
  "Cost Center": {
    save: "save-cost-centre",
    getById: (id) => `get-cost-centre-byId/${id}`,
    update: (id) => `update-cost-centre/${id}`,
    fields: { nameKey: "CostCentre", narrationKey: "Narration" },
  },
  "Unit": {
    save: "save-unit",
    getById: (id) => `get-unit-byId/${id}`,
    update: (id) => `update-unit/${id}`,
    fields: { nameKey: "UnitName", narrationKey: "Narration" },
  },
  "Brand": {
    save: "save-brand",
    getById: (id) => `get-brand-byId/${id}`,
    update: (id) => `update-brand/${id}`,
    fields: { nameKey: "brandName", narrationKey: "Narration" },
  },
  "Godown": {
    save: "save-godown",
    getById: (id) => `get-godown-byId/${id}`,
    update: (id) => `update-godown/${id}`,
    fields: { nameKey: "GodownName", narrationKey: "Narration" },
  },
  "Pricing Level": {
    save: "save-pricing-level",
    getById: (id) => `get-pricing-level-byId/${id}`,
    update: (id) => `update-pricing-level/${id}`,
    fields: { nameKey: "PricingLevelName", narrationKey: "Narration" },
  },
  "Route": {
    save: "save-route",
    getById: (id) => `get-route-byId/${id}`,
    update: (id) => `update-route/${id}`,
    fields: { nameKey: "RouteName", narrationKey: "Narration" },
  },
  "Area": {
    save: "save-area",
    getById: (id) => `get-area-byId/${id}`,
    update: (id) => `update-area/${id}`,
    fields: { nameKey: "AreaName", narrationKey: "Narration" },
  },
  "Market": {
    save: "save-market",
    getById: (id) => `get-market-byId/${id}`,
    update: (id) => `update-market/${id}`,
    fields: { nameKey: "MarketName", narrationKey: "Narration" },
  },
};

const AddMasterModal = ({ open, handleClose, title, mode = "add", id = null, onSaved }) => {
  const { selectedBranchId } = useAuth();
  const [formData, setFormData] = useState({ name: "", narration: "" });
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [alert, setAlert] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const saveButtonRef = useRef(null);
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState();

  const { user } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);

  const config = apiConfig[title];

  // 🔹 Auto focus when modal opens
  const focusInputRef = useAutoFocus(open, 200, 'input[name="name"]');

  useEffect(() => {
    if (mode === "edit" && !loading && open) {
      const timer = setTimeout(() => {
        const input = document.querySelector('input[name="name"]');
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, mode, open]);

  // ✅ Validation function
  const validateField = (name, value) => {
    let error = "";
    if (name === "name" && !value.trim()) {
      error = `${title} name is required`;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // ✅ Handle Enter key to move to next field in order
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

  // 🔹 Fetch data when editing
  useEffect(() => {
    if (mode === "edit" && id && config) {
      setLoading(true);
      axiosInstance.get(config.getById(id)).then((res) => {
        const data = res.data.data;

        setFormData({
          name: data[config.fields.nameKey] || "",
          narration: data[config.fields.narrationKey] || "",
        });
        setLoading(false);
      });
    } else {
      setFormData({ name: "", narration: "" });
    }
  }, [mode, id, config]);

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", narration: "" });
      setAlert(null);
    }
  }, [open]);

  const handleInputChange = (e) => {
    setFinalError("");
     const { name, value } = e.target;
     let updatedValue = value
     if(["name"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
     }
      setFormData((prev) => ({ ...prev, [name]: updatedValue }));
    // setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
  }, [open, formData, mode]);

  // 🔹 Save or Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    // validate before save
    const nameError = validateField("name", formData.name);
    if (nameError) {
      setErrors({ name: nameError });
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
}
    setSubmitLoading(true);

    const payload = {
      [config.fields.nameKey]: formData.name,
      [config.fields.narrationKey]: formData.narration,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "add" ? null : user?.userId,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post(config.save, payload);
      } else {
        await axiosInstance.post(config.update(id), payload);
      }

      // ✅ Notify parent about success, with message and type
      if (onSaved) onSaved({ type: "success", message: mode === "add" ? t("saveSuccess") : t("updateSuccess") });

      handleClose();
    } catch (err) {
      console.error("Error saving data:", err);
      setFinalError(err?.response?.data?.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      {alert?.message && <AlertBox type={alert?.type} message={alert?.message} />}

      <Modal
        open={open}
        onClose={(event, reason) => {
          if (reason === "backdropClick") {
            setErrors({});
          }
          handleClose();
        }}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { timeout: 500 } }}
        style={{ zIndex: "99999999999" }}
      >
        <Fade in={open}>
          <Box
            sx={style}
            className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <Card className="border-none shadow-none p-0 bg-transparent dark:bg-transparent">
              <CardContent className="bg-transparent dark:bg-transparent">
                {/* ✅ Added heading - shows "Add Cost Center" or "Edit Cost Center" etc. */}
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {mode === "add" ? `Add ${title}` : `Edit ${title}`}
                </h2>

                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
                    {/* Name */}
                    <TextInput
                      label={`${title}`}
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={`${title}`}
                      onBlur={handleBlur}
                      ref={focusInputRef}
                      error={errors.name}
                      required
                      autoFocus
                    />
                    {finalError && (
                      <div className="text-red-500 dark:text-red-400 text-sm flex justify-end animate-shake">
                        {finalError}
                      </div>
                    )}

                    {/* Narration */}
                    <TextArea
                      label={t("narration")}
                      name="narration"
                      value={formData.narration}
                      onChange={handleInputChange}
                      placeholder={t("narration")}
                      onKeyDown={(e) => {
                        // Detect Tab (without Shift)
                        if (e.key === "Tab" && !e.shiftKey) {
                          e.preventDefault();
                          saveButtonRef.current?.focus();
                        }
                      }}
                      rows={2}
                    />

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
  tabIndex={-1}
  type="button"
  variant="outline"
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
    setErrors({});
    handleClose();
  }}
  className="bg-white dark:bg-[#242424]
    border-gray-500 dark:border-gray-600 
    text-gray-700 dark:text-gray-300
    hover:bg-gray-100 dark:hover:bg-gray-600
    transition-colors"
>
  {t("cancelBtn")}
</Button>
                      <Button
                        ref={saveButtonRef}
                        type="submit"
                        className="bg-[var(--main-bg)] dark:main-bg 
    text-white 
    flex items-center justify-center gap-2 
    hover:opacity-90 dark:hover:bg-blue-500 
    transition-colors
    disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={submitLoading}
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
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>
                            <span>{mode === "add" ? t("saving") : t("saving")}</span>
                          </>
                        ) : (
                          <>{mode === "add" ? t("save") : t("updateBtn")}</>
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
    </>
  );
};

AddMasterModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
  title: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default AddMasterModal;