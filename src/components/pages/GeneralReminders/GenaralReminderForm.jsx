import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, Plus } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import { Card, CardContent } from "@/components/ui/card";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import Preloader from "@/components/common/Preloader";
import useAuth from "@/redux/hook/auth/useAuth";
import useCtrlSave from "@/lib/hooks/useCtrlSave";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import DateInput from "@/components/elements/theme/DateInput";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import { sanitize } from "@/lib/inputSanitizer";

const GenaralReminderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userId, selectedBranchId } = useAuth();
  const isEditMode = Boolean(id);

  const [alert, setAlert] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Get current time in HH:mm format
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    start_time: getCurrentTime(),
    end_date: "",
    end_time: "",
    all_day: false,
    recurrence: "none",
    reminder_before: "30",
    priority: "Medium",
    status: "Pending",
    userId: userId,
    branchId: selectedBranchId,
    CreatedUser: userId,
  });

  useCtrlSave(handleSave);

  useEffect(() => {
    if (isEditMode) {
      fetchReminderData();
    }
  }, [id, isEditMode]);

  const fetchReminderData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`general-reminder/show-byId/${id}`);
      const reminderData = response.data.data[0];

      // Parse datetime strings to separate date and time
      const parseDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return { date: "", time: "" };
        // Expected format: "2026-02-17 10:00:00" or "2026-02-17T10:00:00"
        const parts = dateTimeStr.replace("T", " ").split(" ");
        if (parts.length >= 2) {
          const date = parts[0]; // YYYY-MM-DD
          const time = parts[1].substring(0, 5); // HH:mm (extract first 5 chars from HH:mm:ss)
          return { date, time };
        }
        return { date: "", time: "" };
      };

      const { date: startDate, time: startTime } = parseDateTime(reminderData.start_date);
      const { date: endDate, time: endTime } = parseDateTime(reminderData.end_date);

      setFormData({
        ...formData,
        ...reminderData,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
      });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }
    if (!formData.start_time) {
      newErrors.start_time = "Start time is required";
    }
    // End date and time are optional - only require if one is partially filled
    if (formData.end_date && !formData.end_time) {
      newErrors.end_time = "End time is required when end date is filled";
    }
    if (formData.end_time && !formData.end_date) {
      newErrors.end_date = "End date is required when end time is filled";
    }

    // Validate end date is not before start date (if end date is provided)
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFieldOnBlur = (fieldName) => {
    const newErrors = { ...errors };

    if (
      ["title", "description", "start_date", "start_time"].includes(
        fieldName
      )
    ) {
      if (!formData[fieldName]) {
        newErrors[fieldName] = `${fieldName.replace("_", " ")} is required`;
      } else {
        delete newErrors[fieldName];
      }
    }

    // For optional end_date and end_time fields
    if (fieldName === "end_date" && formData.end_date && formData.start_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = "End date must be after start date";
      } else {
        delete newErrors.end_date;
      }
    }
    if (fieldName === "end_time" && formData.end_date && !formData.end_time) {
      newErrors.end_time = "End time is required when end date is filled";
    } else if (fieldName === "end_time" && formData.end_time) {
      delete newErrors.end_time;
    }
    if (fieldName === "end_date" && formData.end_time && !formData.end_date) {
      newErrors.end_date = "End date is required when end time is filled";
    } else if (fieldName === "end_date" && formData.end_date) {
      delete newErrors.end_date;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedValue = value
    if(["title"].includes(name)){
      updatedValue = sanitize.alphaNumericSpace(value)
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : updatedValue,
    }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validateEndDateTime = (data) => {
  const newErrors = {};

  if (
    data.start_date &&
    data.start_time &&
    data.end_date &&
    data.end_time
  ) {
    const start = new Date(`${data.start_date}T${data.start_time}`);
    const end = new Date(`${data.end_date}T${data.end_time}`);

    if (end <= start) {
      newErrors.end_time =
        "End date and time must be later than the start date and time.";
    }
  }

  setErrors((prev) => ({
    ...prev,
    ...newErrors,
  }));

  return Object.keys(newErrors).length === 0;
};

  async function handleSave() {
    if (!validateForm()) {
      setAlert({
        type: "error",
        message: "Please fix all errors before submitting",
      });
      return;
    }

     // Validate start/end date and time
  if (!validateEndDateTime(formData)) {
    return;
  }

    setSubmitLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        start_date: `${formData.start_date} ${formData.start_time}:00`,
        start_time: formData.start_time,
        end_date: formData.end_date ? `${formData.end_date} ${formData.end_time}:00` : "",
        end_time: formData.end_time || "",
        all_day: formData.all_day,
        recurrence: formData.recurrence,
        reminder_before: parseInt(formData.reminder_before),
        priority: formData.priority,
        status: formData.status,
        userId: userId,
        branchId: selectedBranchId,
        CreatedUser: userId,
      };

      if (isEditMode) {
        await axiosInstance.post(`general-reminder/update/${id}`, payload);
        setAlert({
          type: "success",
          message: "Reminder updated successfully",
        });
      } else {
        await axiosInstance.post("general-reminder/store", payload);
        setAlert({
          type: "success",
          message: "Reminder created successfully",
        });
      }

        navigate("/general/reminders");
    } catch (error) {
      setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to save reminder",
      });
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("common.general") || "General", url: "#" },
            { title: "Reminders", url: "#" },
            { title: isEditMode ? "Edit" : "Create", url: "#" },
          ]}
          heading={{ icon: Clock, title: isEditMode ? "Edit Reminder" : "New Reminder" }}
        />
        <Preloader />
      </div>
    );
  }

  return (
    <div>
      {alert && (
        <AlertBox key={alert.id || Date.now()} message={alert.message} type={alert.type} />
      )}

      <BreadCrumb
        routes={[
          { title: t("common.general") || "General", url: "#" },
          { title: "Reminders", url: "/general/reminders" },
          { title: isEditMode ? "Edit" : "Create", url: "#" },
        ]}
        heading={{ icon: Clock, title: isEditMode ? "Edit Reminder" : "New Reminder" }}
        actions={[
          {
            label: isEditMode ? t("updateBtn") : t("submitBtn"),
            icon: Plus,
            type: "primary",
            onClick: handleSave,
            loading: submitLoading,
            loadingText: t("loadingText"),
          },
          {
            label: "Cancel",
            type: "secondary",
            onClick: () => navigate("/general/reminders"),
          },
        ]}
      />

      <div className="w-full  dark:bg-[#121212] p-1 transition-colors">
        <div className="max-w-5xl mx-auto">
              <div className="grid gap-1">
                {/* Title */}
                <TextInput
                  id="title"
                  name="title"
                  label="Title"
                  placeholder="e.g., Client Meeting"
                  value={formData.title}
                  onChange={handleInputChange}
                  onBlur={() => validateFieldOnBlur("title")}
                  error={errors.title}
                  required={true}
                />

                {/* Description */}
                <TextArea
                  id="description"
                  name="description"
                  label="Description"
                  placeholder="Enter reminder description"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={errors.description}
                  required={true}
                  rows={4}
                />

                {/* Start Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
                  <DateInput
                    id="start_date"
                    name="start_date"
                    label="Start Date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    onBlur={() => validateFieldOnBlur("start_date")}
                   max={new Date().toISOString().split('T')[0]}
                    error={errors.start_date}
                    required={true}
                  />
                  <TextInput
                    id="start_time"
                    name="start_time"
                    type="time"
                    label="Start Time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    onBlur={() => validateFieldOnBlur("start_time")}
                    error={errors.start_time}
                    required={true}
                  />

                {/* End Date and Time */}
                  <DateInput
                    id="end_date"
                    name="end_date"
                    label="End Date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                   onBlur={() => {
                    validateFieldOnBlur("end_date");
                    validateEndDateTime();
                    }}
                    error={errors.end_date}
                    min={formData.start_date}
                    required={false}
                  />
                  <TextInput
                    id="end_time"
                    name="end_time"
                    type="time"
                    label="End Time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    onBlur={() => {
                      validateFieldOnBlur("end_time");
                      validateEndDateTime();
                      }}
                    error={errors.end_time}
                    required={false}
                  />
                </div>

                {/* All Day Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    id="all_day"
                    name="all_day"
                    type="checkbox"
                    checked={formData.all_day}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                  />
                  <label htmlFor="all_day" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                    All Day Event
                  </label>
                </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                   {/* Recurrence */}
                <NormalSelectInput
                  id="recurrence"
                  name="recurrence"
                  label="Recurrence"
                  value={formData.recurrence}
                  onChange={handleSelectChange}
                  options={[
                    { value: "none", label: "None" },
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                  placeholder="Select recurrence"
                />

                {/* Reminder Before */}
                <TextInput
                  id="reminder_before"
                  name="reminder_before"
                  type="number"
                  label="Reminder Before (minutes)"
                  placeholder="e.g., 30"
                  value={formData.reminder_before}
                  onChange={handleInputChange}
                />

                {/* Priority */}
                <NormalSelectInput
                  id="priority"
                  name="priority"
                  label="Priority"
                  value={formData.priority}
                  onChange={handleSelectChange}
                  options={[
                    { value: "Low", label: "Low" },
                    { value: "Medium", label: "Medium" },
                    { value: "High", label: "High" },
                  ]}
                  placeholder="Select priority"
                />

                {/* Status */}
                <NormalSelectInput
                  id="status"
                  name="status"
                  label="Status"
                  value={formData.status}
                  onChange={handleSelectChange}
                  options={[
                    { value: "Pending", label: "Pending" },
                    { value: "Active", label: "Active" },
                    { value: "Completed", label: "Completed" },
                    { value: "Cancelled", label: "Cancelled" },
                  ]}
                  placeholder="Select status"
                />
             </div>


              </div>
          
        </div>
      </div>
    </div>
  );
};

export default GenaralReminderForm;