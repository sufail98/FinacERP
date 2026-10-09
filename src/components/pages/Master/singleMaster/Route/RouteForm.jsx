import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import TextArea from "@/components/elements/theme/TextArea";
import TextInput from "@/components/elements/theme/TextInput";
import AlertBox from "@/components/common/AlertBox";
import MultiMasterFormModal from "../../multiMasterForms/MultiMasterFormModal";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import { sanitize } from "@/lib/inputSanitizer";

const RouteForm = ({ open, handleClose, mode = "add", id = null, onSaved }) => {
  const { selectedBranchId, user } = useAuth();
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({ name: "", narration: "", marketId: "" });
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState("");
  const [alert, setAlert] = useState(null);

  const saveButtonRef = useRef(null);
  const formRef = useRef(null);
  const focusInputRef = useAutoFocus(open, 200, 'input[name="name"]');

  // ── Fetch markets for dropdown ──────────────────────────────────────────────
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await axiosInstance.get("markets");
        setMarkets(res.data.data || []);
      } catch (err) {
        console.error("Error fetching markets:", err);
      }
    };
    if (open) fetchMarkets();
  }, [open]);

  // ── Fetch route data when editing ───────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && id && open) {
      setLoading(true);
      axiosInstance
        .get(`get-route-byId/${id}`)
        .then((res) => {
          const data = res.data.data;
          setFormData({
            name: data.RouteName || "",
            narration: data.Narration || "",
            marketId: data.MarketId || "",
          });
        })
        .catch((err) => console.error("Error fetching route:", err))
        .finally(() => setLoading(false));
    } else {
      setFormData({ name: "", narration: "", marketId: "" });
    }
  }, [mode, id, open]);

  // ── Reset state on close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFormData({ name: "", narration: "", marketId: "" });
      setErrors({});
      setFinalError("");
      setAlert(null);
    }
  }, [open]);

  // ── Ctrl+S shortcut ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formData, mode]);

  // ── Auto-focus fix for edit mode ─────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && !loading && open) {
      const timer = setTimeout(() => {
        document.querySelector('input[name="name"]')?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, mode, open]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateField = (name, value) => {
    if (name === "name" && !value.trim()) return t("route.validation.nameRequired", { defaultValue: "Route name is required" });
    return "";
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // ── Enter key navigation ─────────────────────────────────────────────────
  const handleFormKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
    e.preventDefault();
    if (!formRef.current) return;

    const focusable = Array.from(
      formRef.current.querySelectorAll(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      )
    ).filter((el) => el.offsetParent !== null && !el.closest("[hidden]"));

    const currentIndex = focusable.indexOf(target);
    if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus();
    }
  };

  const handleInputChange = (e) => {
    setFinalError("");
    const {name,value} = e.target
    let updatedValue = value
    if(["name"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }

    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
  };

  // ── Handle dropdown change ────────────────────────────────────────────────
  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault();

    const nameError = validateField("name", formData.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Confirmation dialogs
    if (mode === "edit" && generalSettings?.askConfirmationEdit) {
      const result = await Swal.fire({
        title: t("ConfirmUpdateTitle"),
        text: t("ConfirmUpdateText"),
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesUpdate"),
        cancelButtonText: t("Cancel"),
        didOpen: () => {
          const container = document.querySelector(".swal2-container");
          if (container) container.style.cssText += "; z-index: 2147483647 !important;";
        },
      });
      if (!result.isConfirmed) return;
    } else if (mode === "add" && generalSettings?.askConfirmationSave) {
      const result = await Swal.fire({
        title: t("ConfirmSaveTitle"),
        text: t("ConfirmSaveText"),
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesSave"),
        cancelButtonText: t("Cancel"),
        didOpen: () => {
          const container = document.querySelector(".swal2-container");
          if (container) container.style.cssText += "; z-index: 2147483647 !important;";
        },
      });
      if (!result.isConfirmed) return;
    }

    setSubmitLoading(true);

    const payload = {
      RouteName: formData.name,
      Narration: formData.narration,
      MarketId: formData.marketId || null,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "add" ? null : user?.userId,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post("save-route", payload);
      } else {
        await axiosInstance.post(`update-route/${id}`, payload);
      }

      if (onSaved) {
        onSaved({
          type: "success",
          message: mode === "add" ? t("saveSuccess") : t("updateSuccess"),
        });
      }
      handleClose();
    } catch (err) {
      console.error("Error saving route:", err);
      setFinalError(err?.response?.data?.message || t("errorOccurred", { defaultValue: "An error occurred" }));
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Close handler with confirmation ──────────────────────────────────────
  const handleCloseWithConfirm = async () => {
    if (generalSettings?.askConfirmationClose) {
      const result = await Swal.fire({
        title: t("ConfirmCloseTitle"),
        text: t("ConfirmCloseText"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("YesClose"),
        cancelButtonText: t("Cancel"),
        didOpen: () => {
          const container = document.querySelector(".swal2-container");
          if (container) container.style.cssText += "; z-index: 2147483647 !important;";
        },
      });
      if (!result.isConfirmed) return;
    }
    setErrors({});
    handleClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {alert?.message && <AlertBox type={alert.type} message={alert.message} />}

      <MultiMasterFormModal
        open={open}
        handleClose={handleCloseWithConfirm}
        title={mode === "add" ? t("route.form.addTitle", { defaultValue: "Add Route" }) : t("route.form.editTitle", { defaultValue: "Edit Route" })}
        width="600px"
      >
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm py-4 text-center">
            {t("loading", { defaultValue: "Loading..." })}
          </p>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-3">
            {/* Route Name */}
            <TextInput
              label={t("route.columns.route", { defaultValue: "Route" })}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("route.columns.route", { defaultValue: "Route" })}
              onBlur={handleBlur}
              ref={focusInputRef}
              error={errors.name}
              required
              autoFocus
            />

            {/* Market Dropdown */}
            <SearchableDropdown
              name="marketId"
              label={t("market.heading", { defaultValue: "Market" })}
              options={markets?.map((data) => ({
                value: data.MarketId,
                label: data.MarketName,
              }))}
              value={formData.marketId}
              onChange={(value) => handleDropdownChange('marketId', value)}
              placeholder={t("market.heading", { defaultValue: "Market" })}
              searchPlaceholder={t("market.heading", { defaultValue: "Market" })}
              error={errors.marketId}
              clearable={true}
              className="w-full"
            />

            {/* Narration */}
            <TextArea
              label={t("narration")}
              name="narration"
              value={formData.narration}
              onChange={handleInputChange}
              placeholder={t("narration")}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  saveButtonRef.current?.focus();
                }
              }}
              rows={2}
            />

            {/* Final error message */}
            {finalError && (
              <div className="text-red-500 dark:text-red-400 text-sm flex justify-end animate-shake">
                {finalError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                tabIndex={-1}
                type="button"
                variant="outline"
                onClick={handleCloseWithConfirm}
                className="bg-white dark:bg-[#242424] border-gray-500 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                {t("cancelBtn")}
              </Button>

              <Button
                ref={saveButtonRef}
                type="submit"
                disabled={submitLoading}
                className="bg-[var(--main-bg)] dark:main-bg text-white flex items-center justify-center gap-2 hover:opacity-90 dark:hover:bg-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>{t("saving")}</span>
                  </>
                ) : (
                  <>{mode === "add" ? t("save") : t("updateBtn")}</>
                )}
              </Button>
            </div>
          </form>
        )}
      </MultiMasterFormModal>
    </>
  );
};

RouteForm.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSaved: PropTypes.func,
};

export default RouteForm;