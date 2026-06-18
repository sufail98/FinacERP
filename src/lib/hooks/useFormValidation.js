import { useState } from "react";

/**
 * Custom hook for reusable form validation.
 * @returns {object} { errors, validateForm, handleBlur, setErrors }
 */
const useFormValidation = () => {
  const [errors, setErrors] = useState({});

  /**
   * Validate all fields based on rules
   * @param {object} formData - Form values
   * @param {object} rules - Validation rules { fieldName: { required: true, label: "Field Label" } }
   * @returns {boolean} - True if form is valid
   */
  const validateForm = (formData, rules) => {
    const newErrors = {};

    Object.keys(rules).forEach((field) => {
      const value = formData[field];
      const { required, label } = rules[field];

      if (required && (!value || value.toString().trim() === "")) {
        newErrors[field] = `${label || field}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Validate a single field onBlur
   */
  const handleBlur = (e, rules) => {
    const { name, value } = e.target;
    const rule = rules[name];

    if (!rule) return; // Skip fields without rules

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (rule.required && (!value || value.trim() === "")) {
        newErrors[name] = `${rule.label || name}`;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
  };

  return { errors, validateForm, handleBlur, setErrors };
};

export default useFormValidation;
