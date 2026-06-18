import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Card, CardContent } from "@/components/ui/card";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import DateInput from "@/components/elements/theme/DateInput";
import { useTranslation } from "react-i18next";
import AlertBox from "@/components/common/AlertBox";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";

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

const StaffHolidayRegisterForm = ({
  open,
  handleClose,
  mode = "add",
  id = null,
  onSaved,
}) => {
  const { selectedBranchId, user } = useAuth();
  const [formData, setFormData] = useState({
    date: "",
    holidayName: "",
    narration: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState("");
  const [alert, setAlert] = useState(null);
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);
  const saveButtonRef = useRef(null);
  const formRef = useRef(null);

  const focusInputRef = useAutoFocus(open, 200, 'input[name="date"]');

  // Auto focus when editing and data loaded
  useEffect(() => {
    if (mode === "edit" && !loading && open) {
      const timer = setTimeout(() => {
        const input = document.querySelector('input[name="date"]');
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, mode, open]);

  // Validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "date" && !value) {
      error = "Date is required";
    }
    if (name === "holidayName" && !value.trim()) {
      error = "Holiday name is required";
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Enter key navigation
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      const target = e.target;
      if (target.tagName === "TEXTAREA") return;
      if (target.tagName === "BUTTON") return;
      e.preventDefault();

      if (!formRef.current) return;

      const focusableSelectors =
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
      const focusableElements = Array.from(
        formRef.current.querySelectorAll(focusableSelectors)
      );
      const visibleElements = focusableElements.filter((el) => {
        return el.offsetParent !== null && !el.closest("[hidden]");
      });

      const currentIndex = visibleElements.indexOf(target);
      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        const nextElement = visibleElements[currentIndex + 1];
        nextElement.focus();
      }
    }
  };

  // Fetch data when editing
  useEffect(() => {
    if (mode === "edit" && id && open) {
      setLoading(true);
      axiosInstance
        .get(`get-staffholidayregisters-byId/${id}`)
        .then((res) => {
          const data = res.data.data;
          setFormData({
            date: data.date || "",
            holidayName: data.holidayName || "",
            narration: data.narration || "",
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching holiday data:", err);
          setLoading(false);
        });
    } else {
      setFormData({ date: "", holidayName: "", narration: "" });
    }
  }, [mode, id, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFormData({ date: "", holidayName: "", narration: "" });
      setAlert(null);
      setErrors({});
      setFinalError("");
    }
  }, [open]);

  const handleInputChange = (e) => {
    setFinalError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Ctrl+S shortcut
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

  // Save or Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const dateError = validateField("date", formData.date);
    const nameError = validateField("holidayName", formData.holidayName);
    if (dateError || nameError) {
      setErrors({ date: dateError, holidayName: nameError });
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
          if (container) {
            container.style.cssText += "; z-index: 2147483647 !important;";
          }
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
          if (container) {
            container.style.cssText += "; z-index: 2147483647 !important;";
          }
        },
      });
      if (!result.isConfirmed) return;
    }

    setSubmitLoading(true);

    const payload = {
      date: formData.date,
      holidayName: formData.holidayName,
      narration: formData.narration,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post("save-staffholidayregister", payload);
      } else {
        await axiosInstance.post(
          `update-staffholidayregister/${id}`,
          payload
        );
      }

      if (onSaved)
        onSaved({
          type: "success",
          message:
            mode === "add" ? t("saveSuccess") : t("updateSuccess"),
        });

      handleClose();
    } catch (err) {
      console.error("Error saving data:", err);
      setFinalError(err?.response?.data?.message || "Something went wrong");
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {mode === "add"
                    ? "Add Staff Holiday"
                    : "Edit Staff Holiday"}
                </h2>

                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                ) : (
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    className="space-y-2"
                  >
                    {/* Date */}
                    <DateInput
                      label="Date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      placeholder="Select date"
                      onBlur={handleBlur}
                      error={errors.date}
                      required
                      autoFocus
                    />

                    {/* Holiday Name */}
                    <TextInput
                      label="Holiday Name"
                      name="holidayName"
                      value={formData.holidayName}
                      onChange={handleInputChange}
                      placeholder="Holiday Name"
                      onBlur={handleBlur}
                      ref={focusInputRef}
                      error={errors.holidayName}
                      required
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
                              title: t("ConfirmCloseTitle"),
                              text: t("ConfirmCloseText"),
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#3085d6",
                              cancelButtonColor: "#d33",
                              confirmButtonText: t("YesClose"),
                              cancelButtonText: t("Cancel"),
                              didOpen: () => {
                                const container =
                                  document.querySelector(".swal2-container");
                                if (container) {
                                  container.style.cssText +=
                                    "; z-index: 2147483647 !important;";
                                }
                              },
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
                            <span>{t("saving")}</span>
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

StaffHolidayRegisterForm.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
  mode: PropTypes.oneOf(["add", "edit"]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default StaffHolidayRegisterForm;
