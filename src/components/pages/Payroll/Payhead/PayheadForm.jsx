import { useState, useEffect, useRef } from "react";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import { useTranslation } from "react-i18next";
import AlertBox from "@/components/common/AlertBox";
import Swal from "sweetalert2";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import useAutoFocus from "@/lib/hooks/useAutoFocus";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { sanitize } from "@/lib/inputSanitizer";

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

const PayheadForm = ({
  open,
  handleClose,
  mode = "add",
  id = null,
  onSaved,
}) => {
  const { selectedBranchId, user } = useAuth();
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({
    payheadName: "",
    type: "",
    narration: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [finalError, setFinalError] = useState("");
  const [alert, setAlert] = useState(null);

  const saveButtonRef = useRef(null);
  const formRef = useRef(null);

  const focusInputRef = useAutoFocus(
    open,
    200,
    'input[name="payheadName"]'
  );

  // Auto focus when editing
  useEffect(() => {
    if (mode === "edit" && !loading && open) {
      const timer = setTimeout(() => {
        const input = document.querySelector(
          'input[name="payheadName"]'
        );
        input?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading, mode, open]);

  // Fetch edit data
  useEffect(() => {
    if (mode === "edit" && id && open) {
      setLoading(true);

      axiosInstance
        .get(`payhead-byId/${id}`)
        .then((res) => {
          const data = res.data.data || {};

          setFormData({
            payheadName: data.payheadName || "",
            type: data.type || "",
            narration: data.narration || "",
          });
        })
        .catch((err) => {
          console.error("Error fetching payhead:", err);

          setFinalError(
            err?.response?.data?.message ||
              "Failed to load data"
          );
        })
        .finally(() => setLoading(false));
    } else if (mode === "add" && open) {
      setFormData({
        payheadName: "",
        type: "",
        narration: "",
      });
    }
  }, [mode, id, open]);

  // Reset when close
  useEffect(() => {
    if (!open) {
      setFormData({
        payheadName: "",
        type: "",
        narration: "",
      });

      setAlert(null);
      setErrors({});
      setFinalError("");
    }
  }, [open]);

  const validateField = (name, value) => {
    let error = "";

    if (name === "payheadName" && !value.trim()) {
      error = t("payHead.payheadNameRequired");
    }

    if (name === "type" && !value.trim()) {
      error = t("payHead.typeRequired");
    }

    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    const error = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleInputChange = (e) => {
    setFinalError("");

    const { name, value } = e.target;
    let updatedValue = value
    if(["payheadName","type"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }
    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));
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
        return (
          el.offsetParent !== null &&
          !el.closest("[hidden]")
        );
      });

      const currentIndex =
        visibleElements.indexOf(target);

      if (
        currentIndex !== -1 &&
        currentIndex < visibleElements.length - 1
      ) {
        const nextElement =
          visibleElements[currentIndex + 1];

        nextElement.focus();
      }
    }
  };

  // Ctrl + S
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
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, formData, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    Object.entries(formData).forEach(([key, val]) => {
      const err = validateField(key, val);

      if (err) {
        newErrors[key] = err;
      }
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    // Confirmation
    if (
      mode === "edit" &&
      generalSettings?.askConfirmationEdit
    ) {
      const result = await Swal.fire({
        title: t("payHead.ConfirmUpdateTitle"),
        text: t("payHead.ConfirmUpdateText"),
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("payHead.YesUpdate"),
        cancelButtonText: t("payHead.Cancel"),

        didOpen: () => {
          const container = document.querySelector(
            ".swal2-container"
          );

          if (container) {
            container.style.cssText +=
              "; z-index: 2147483647 !important;";
          }
        },
      });

      if (!result.isConfirmed) return;
    } else if (
      mode === "add" &&
      generalSettings?.askConfirmationSave
    ) {
      const result = await Swal.fire({
        title: t("payHead.ConfirmSaveTitle"),
        text: t("payHead.ConfirmSaveText"),
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("payHead.YesSave"),
        cancelButtonText: t("payHead.Cancel"),

        didOpen: () => {
          const container = document.querySelector(
            ".swal2-container"
          );

          if (container) {
            container.style.cssText +=
              "; z-index: 2147483647 !important;";
          }
        },
      });

      if (!result.isConfirmed) return;
    }

    setSubmitLoading(true);

    const payload = {
      ...formData,
      branchId: selectedBranchId,
      CreatedUser: user?.userId,
      ModifiedUser: mode === "edit" ? user?.userId : null,
    };

    try {
      if (mode === "add") {
        await axiosInstance.post(
          "save-payhead",
          payload
        );

        onSaved &&
          onSaved({
            type: "success",
            message: t(
              "payHead.payheadSaveSuccess"
            ),
          });
      } else {
        await axiosInstance.post(
          `update-payhead/${id}`,
          payload
        );

        onSaved &&
          onSaved({
            type: "success",
            message: t(
              "payHead.payheadUpdateSuccess"
            ),
          });
      }

      handleClose();
    } catch (err) {
      console.error(
        "Error saving payhead:",
        err
      );

      setFinalError(
        err?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      {alert?.message && (
        <AlertBox
          type={alert?.type}
          message={alert?.message}
        />
      )}

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
        slotProps={{
          backdrop: { timeout: 500 },
        }}
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
                    ? t("payHead.addPayhead")
                    : t("payHead.editPayhead")}
                </h2>

                {loading ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("payHead.loading")}
                  </p>
                ) : (
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    className="space-y-2"
                  >
                    <TextInput
                      label={t(
                        "payHead.payheadNameLabel"
                      )}
                      name="payheadName"
                      value={formData.payheadName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={errors.payheadName}
                      ref={focusInputRef}
                      required
                      autoFocus
                    />

                    <TextInput
                      label={t(
                        "payHead.typeLabel"
                      )}
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      error={errors.type}
                      required
                    />

                    {finalError && (
                      <div className="text-red-500 dark:text-red-400 text-sm flex justify-end animate-shake">
                        {finalError}
                      </div>
                    )}

                    <TextArea
                      label={t(
                        "payHead.narrationLabel"
                      )}
                      name="narration"
                      value={formData.narration}
                      onChange={handleInputChange}
                      rows={3}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Tab" &&
                          !e.shiftKey
                        ) {
                          e.preventDefault();

                          saveButtonRef.current?.focus();
                        }
                      }}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        tabIndex={-1}
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (
                            generalSettings?.askConfirmationClose
                          ) {
                            const result =
                              await Swal.fire({
                                title: t(
                                  "payHead.ConfirmCloseTitle"
                                ),
                                text: t(
                                  "payHead.ConfirmCloseText"
                                ),
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor:
                                  "#3085d6",
                                cancelButtonColor:
                                  "#d33",
                                confirmButtonText: t(
                                  "payHead.YesClose"
                                ),
                                cancelButtonText:
                                  t(
                                    "payHead.Cancel"
                                  ),

                                didOpen: () => {
                                  const container =
                                    document.querySelector(
                                      ".swal2-container"
                                    );

                                  if (container) {
                                    container.style.cssText +=
                                      "; z-index: 2147483647 !important;";
                                  }
                                },
                              });

                            if (
                              !result.isConfirmed
                            )
                              return;
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
                        {t("payHead.cancelBtn")}
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
                              ></circle>

                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>

                            <span>
                              {t("payHead.saving")}
                            </span>
                          </>
                        ) : (
                          <>
                            {mode === "add"
                              ? t("payHead.saveBtn")
                              : t(
                                  "payHead.updateBtn"
                                )}
                          </>
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

PayheadForm.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf([
    "add",
    "edit",
  ]),
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onSaved: PropTypes.func,
};

export default PayheadForm;