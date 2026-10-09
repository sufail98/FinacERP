import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import TextArea from "@/components/elements/theme/TextArea";
import TextInput from "@/components/elements/theme/TextInput";
import AlertBox from "@/components/common/AlertBox";
import MultiMasterFormModal from "../../multiMasterForms/MultiMasterFormModal"
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import { sanitize } from "@/lib/inputSanitizer";

const MarketForm = ({ open, handleClose, mode = "add", id = null, onSaved }) => {
  const { selectedBranchId, user } = useAuth();
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({ name: "", narration: "", areaId: "" });
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState("");
  const [alert, setAlert] = useState(null);

  const saveButtonRef = useRef(null);
  const formRef = useRef(null);
  const focusInputRef = useAutoFocus(open, 200, 'input[name="name"]');

  // ── Fetch areas for dropdown ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await axiosInstance.get("areas");
        setAreas(res.data.data || []);
      } catch (err) {
        console.error("Error fetching areas:", err);
      }
    };
    if (open) fetchAreas();
  }, [open]);

  // ── Fetch market data when editing ───────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && id && open) {
      setLoading(true);
      axiosInstance
        .get(`get-market-byId/${id}`)
        .then((res) => {
          const data = res.data.data;
          setFormData({
            name: data.MarketName || "",
            narration: data.Narration || "",
            areaId: data.AreaId || "",
          });
        })
        .catch((err) => console.error("Error fetching market:", err))
        .finally(() => setLoading(false));
    } else {
      setFormData({ name: "", narration: "", areaId: "" });
    }
  }, [mode, id, open]);

  // ── Reset state on close ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFormData({ name: "", narration: "", areaId: "" });
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
    if (name === "name" && !value.trim()) return t("market.validation.nameRequired", { defaultValue: "Market name is required" });
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
    const {name,value}= e.target
    let updatedValue = value
    if(["name"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }
    setFormData((prev) => ({ ...prev, [name]: updatedValue}));
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
      MarketName: formData.name,
      Narration: formData.narration,
      AreaId: formData.areaId || null,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "add" ? null : user?.userId,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post("save-market", payload);
      } else {
        await axiosInstance.post(`update-market/${id}`, payload);
      }

      if (onSaved) {
        onSaved({
          type: "success",
          message: mode === "add" ? t("saveSuccess") : t("updateSuccess"),
        });
      }
      handleClose();
    } catch (err) {
      console.error("Error saving market:", err);
      setFinalError(err?.response?.data?.message || t("errorOccurred", { defaultValue: "An error occurred" }));
    } finally {
      setSubmitLoading(false);
    }
  };

    const handleDropdownChange = (name, value) => {
 
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
        title={mode === "add" ? t("market.form.addTitle", { defaultValue: "Add Market" }) : t("market.form.editTitle", { defaultValue: "Edit Market" })}
        width="600px"
      >
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm py-4 text-center">
            {t("loading", { defaultValue: "Loading..." })}
          </p>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-3">
            {/* Market Name */}
            <TextInput
              label={t("market.columns.market", { defaultValue: "Market" })}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("market.columns.market", { defaultValue: "Market" })}
              onBlur={handleBlur}
              ref={focusInputRef}
              error={errors.name}
              required
              autoFocus
            />

            {/* Area Dropdown */}
            {/* <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("market.columns.area", { defaultValue: "Area" })}
              </label>
              <select
                name="areaId"
                value={formData.areaId}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-bg)] transition-colors"
              >
                <option value="">
                  {t("market.form.selectArea", { defaultValue: "-- Select Area --" })}
                </option>
                {areas.map((area) => (
                  <option key={area.AreaId} value={area.AreaId}>
                    {area.AreaName}
                  </option>
                ))}
              </select>
            </div> */}
            <SearchableDropdown
              name="areaId"
              label={t("market.columns.area", { defaultValue: "Area" })}
              options={areas?.map((data) => ({
                value: data.AreaId,
                label: data.AreaName,
              }))}
              value={formData.areaId}
             onChange={(value) => handleDropdownChange('areaId', value)}
              placeholder={t("market.columns.area", { defaultValue: "Area" })}
              searchPlaceholder={t("market.columns.area", { defaultValue: "Area" })}
              error={errors.areaId}
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

MarketForm.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSaved: PropTypes.func,
};

export default MarketForm;