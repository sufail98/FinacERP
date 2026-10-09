import { useEffect, useState, useRef } from "react";
import BreadCrumb from "@/components/common/BreadCrumb";
import { Truck, SaveAll, X, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import { useNavigate, useParams } from "react-router-dom";
import useFormValidation from "@/lib/hooks/useFormValidation";
import useSaveShortcut from "@/lib/hooks/useSaveShortcut";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { sanitize } from "@/lib/inputSanitizer";

const AddVanExecutive = () => {
  const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
  const { t } = useTranslation();
  const { editId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [godownLoading, setGodownLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [finalError, setFinalError] = useState(null);
  const [godowns, setGodowns] = useState([]);
  const [showGodownDropdown, setShowGodownDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const godownDropdownRef = useRef(null);
  const formRef = useRef(null);
  const executiveNameRef = useRef(null);
  const navigate = useNavigate();

  const { selectedBranchId, userId, selectedBranchDetails } = useAuth();
  const { generalSettings } = useSelector((state) => state.settings);

  const [formData, setFormData] = useState({
    ExecutiveName: "",
    Address: "",
    Email: "",
    PhoneNo: "",
    GodownId: "",
    userName: "",
    password: "",
    Status: true,
  });

  // Auto-focus first field
  useEffect(() => {
    if (!isLoading && !godownLoading && executiveNameRef.current) {
      const timer = setTimeout(() => {
        executiveNameRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, godownLoading]);

  // Enter key navigation
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      const target = e.target;
      if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
      if (target.closest(".absolute.z-50")) return;
      e.preventDefault();
      if (!formRef.current) return;

      const focusableSelectors =
        'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])';
      const allFocusable = Array.from(
        formRef.current.querySelectorAll(focusableSelectors)
      );
      const visibleElements = allFocusable.filter(
        (el) => el.offsetParent !== null && !el.closest("[hidden]")
      );
      const currentIndex = visibleElements.indexOf(target);
      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        visibleElements[currentIndex + 1].focus();
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        godownDropdownRef.current &&
        !godownDropdownRef.current.contains(event.target)
      ) {
        setShowGodownDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch godowns
  useEffect(() => {
    if (selectedBranchId) {
      fetchGodowns();
    }
  }, [selectedBranchId]);

  // Fetch edit data
  useEffect(() => {
    if (editId) fetchEditData(editId);
  }, [editId]);

  const fetchGodowns = async (preserveGodownId = null) => {
    setGodownLoading(true);
    try {
      const isMainBranch = selectedBranchDetails?.mainBranch === true;
      const branchIdParam = isMainBranch ? null : selectedBranchId;
      const { data } = await axiosInstance.get(`godowns/${branchIdParam}`);
      const godownList = data.data || [];
      setGodowns(godownList);

      if (preserveGodownId !== null && preserveGodownId !== undefined) {
        setFormData((prev) => ({
          ...prev,
          GodownId: String(preserveGodownId),
        }));
      } else if (!editId && godownList.length > 0 && !formData.GodownId) {
        let defaultGodown;
        if (isMainBranch) {
          defaultGodown = godownList.find(
            (g) =>
              (g.IsDefault === true || g.IsDefault === 1) &&
              (g.branchId == selectedBranchId || g.BranchId == selectedBranchId)
          );
          if (!defaultGodown) {
            defaultGodown = godownList.find(
              (g) => g.branchId == selectedBranchId || g.BranchId == selectedBranchId
            );
          }
        } else {
          defaultGodown = godownList.find(
            (g) => g.IsDefault === true || g.IsDefault === 1
          );
        }

        if (defaultGodown) {
          setFormData((prev) => ({ ...prev, GodownId: String(defaultGodown.GodownId) }));
        } else if (godownList.length > 0) {
          setFormData((prev) => ({ ...prev, GodownId: String(godownList[0].GodownId) }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch godowns:", err);
    } finally {
      setGodownLoading(false);
    }
  };

  const fetchEditData = async (id) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`van-exicutive/show-byId/${id}`);
      
      // API may return single object or array
      let d = res.data?.data;
      if (Array.isArray(d)) {
        d = d[0];
      }
      
      if (d) {
        
        setFormData({
          ExecutiveName: d.ExecutiveName || "",
          Address: d.Address || "",
          Email: d.Email || "",
          PhoneNo: d.PhoneNo || "",
          GodownId: d.GodownId?.toString() || "",
          userName: d.userName || "",
          password: "",
          Status: d.Status ?? true,
        });

        // Re-fetch godowns and preserve the saved GodownId
        if (d.GodownId) {
          await fetchGodowns(d.GodownId);
        }
      }
    } catch (error) {
      console.error("Error fetching executive data:", error);
      setAlert({ 
        id: Date.now(), 
        type: "error", 
        message: error.response?.data?.message || "Error loading executive data" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedValue = value
    if(["ExecutiveName"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }
    if(["PhoneNo"].includes(name)){
      updatedValue = sanitize.numbers(value)
    }
    if(["Email"].includes(name)){
      updatedValue = value.replace(/[^a-zA-Z0-9@._-]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : updatedValue,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setFinalError(null);
  };

  const validationRules = {
    ExecutiveName: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
    userName: {
      required: true,
      label: t("requiredFieldsError") || "This field is required",
    },
    ...(!editId && {
      password: {
        required: true,
        label: t("requiredFieldsError") || "This field is required",
      },
    }),
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm(formData, validationRules)) return;

     // Email format validation (only if email is provided, since it's optional)
    if (formData.Email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.Email)) {
        setErrors((prev) => ({
          ...prev,
          Email: t("invalidEmailError") || "Please enter a valid email address",
        }));
        return;
      }
    }

    
    if (editId && generalSettings?.askConfirmationEdit) {
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
} else if (!editId && generalSettings?.askConfirmationSave) {
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

    setIsSaving(true);
    setAlert(null);
    setFinalError(null);

    try {
      const payload = {
        ExecutiveName: formData.ExecutiveName,
        Address: formData.Address,
        Email: formData.Email,
        PhoneNo: formData.PhoneNo,
        GodownId: formData.GodownId ? parseInt(formData.GodownId) : null,
        userName: formData.userName,
        Status: formData.Status,
        branchId: selectedBranchId,
      };

      if (editId) {
        payload.ModifiedUser = userId;
        if (formData.password) {
          payload.password = formData.password;
        }
      } else {
        payload.CreatedUser = userId;
        payload.password = formData.password;
      }

      const response = editId
        ? await axiosInstance.post(`van-exicutive/update/${editId}`, payload)
        : await axiosInstance.post("van-exicutive/store", payload);

      if (!response.data.error) {
        setAlert({
          id: Date.now(),
          type: "success",
          message: editId
            ? "Van executive updated successfully!"
            : "Van executive created successfully!",
        });
        setTimeout(() => navigate("/master/van-sales/van-executive"), 1000);
      } else {
        setFinalError(response.data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving van executive:", error);
      setFinalError(
        error.response?.data?.message ||
          error.message ||
          "Failed to save van executive"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
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
    navigate("/master/van-sales/van-executive");
  };

  useSaveShortcut(handleSubmit);

  const breadcrumbConfig = {
    routes: [
      { title: t("bank.breadcrumb.master") || "Master", url: "#" },
      { title: "Van Sales", url: "#" },
      { title: "Van Executive", url: "/master/van-sales/van-executive" },
      { title: editId ? "Edit Van Executive" : "Add Van Executive", url: "#" },
    ],
    heading: {
      icon: Truck,
      title: editId ? "Edit Van Executive" : "Add Van Executive",
    },
    actions: [
      {
        label: t("cancel") || "Cancel",
        icon: X,
        type: "secondary",
        onClick: handleCancel,
        disabled: isSaving,
      },
      {
        label: isSaving
          ? t("saving") || "Saving..."
          : editId
          ? t("update") || "Update"
          : t("save") || "Save",
        icon: SaveAll,
        type: "primary",
        onClick: handleSubmit,
        disabled: isSaving,
      },
    ],
  };

  if (isLoading || godownLoading) {
    return (
      <div>
        <BreadCrumb {...breadcrumbConfig} />
        <Preloader />
      </div>
    );
  }

  const selectedGodownName =
    godowns.find((g) => String(g.GodownId) === formData.GodownId)?.GodownName || "";

  return (
    <>
      <BreadCrumb {...breadcrumbConfig} />

      <div className="mx-auto px-4 py-2 dark:bg-[#121212] transition-colors">
        <div className="max-w-5xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3" ref={formRef} onKeyDown={handleFormKeyDown}>
            {alert && (
              <AlertBox key={alert.id} message={alert.message} type={alert.type} />
            )}

            {/* Executive Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Executive Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={executiveNameRef}
                type="text"
                name="ExecutiveName"
                value={formData.ExecutiveName}
                onChange={handleChange}
                onBlur={(e) => handleBlur(e, validationRules)}
                placeholder="Type Executive Name"
                required
                className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-2 transition-colors"
              />
              {errors.ExecutiveName && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                  {errors.ExecutiveName}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                {/* Left Column */}
                <div className="space-y-2">
                  {/* Address */}
                  <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1.5">
                      Address
                    </label>
                    <textarea
                      name="Address"
                      value={formData.Address}
                      onChange={handleChange}
                      placeholder="Type address"
                      rows={2}
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors resize-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="Email"
                      value={formData.Email}
                      onChange={handleChange}
                      placeholder="Type email address"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>
                  {errors.Email && (
  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
    {errors.Email}
  </p>
)}

                  {/* Phone No */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone No
                    </label>
                    <input
                      type="text"
                      name="PhoneNo"
                      value={formData.PhoneNo}
                      maxLength={10}
                      onChange={handleChange}
                      placeholder="Type phone number"
                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                    />
                  </div>

                  {/* Godown */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Godown
                    </label>
                    <div className="relative" ref={godownDropdownRef}>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={selectedGodownName}
                          readOnly
                          placeholder="Select Godown"
                          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                     text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                     focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
                          onClick={() => setShowGodownDropdown((prev) => !prev)}
                        />
                        <div className="absolute right-0 flex items-center">
                          <button
                            type="button"
                            onClick={() => setShowGodownDropdown((prev) => !prev)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${
                                showGodownDropdown ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      {showGodownDropdown && (
                        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                          {godowns.length > 0 ? (
                            godowns.map((godown) => {
                              const gId = String(godown.GodownId);
                              const isDefault =
                                godown.IsDefault === true || godown.IsDefault === 1;

                              return (
                                <button
                                  key={gId}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, GodownId: gId }));
                                    setShowGodownDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30
                                             text-gray-900 dark:text-gray-100 transition-colors
                                             ${formData.GodownId === gId ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                                >
                                  <span>{godown.GodownName}</span>
                                  {isDefault && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                      Default
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-400">
                              No godowns found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* Username */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <div>
                      <input
                        type="text"
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur(e, validationRules)}
                        placeholder="Type username"
                        required
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                      />
                      {errors.userName && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                          {errors.userName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password {!editId && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur(e, validationRules)}
                        placeholder={editId ? "Leave blank to keep current" : "Type password"}
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {errors.password && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                          {errors.password}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <div className="flex items-center gap-3 py-1.5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="Status"
                          checked={formData.Status}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.Status ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {finalError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">
                  {finalError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddVanExecutive;