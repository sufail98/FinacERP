import { Label } from "@/components/ui/label";
import PropTypes from "prop-types";
import { forwardRef } from "react";

const TextArea = forwardRef(({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  rows = 3,
  className = "",
  readOnly = false,
}, ref) => {  // ← ref comes from forwardRef, not props
  return (
    <div>
      {label && (
        <Label
          htmlFor={id || name}
          className="text-xs font-medium block text-black dark:text-gray-300"
        >
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </Label>
      )}
      <textarea
        id={id || name}
        name={name}
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className={`text-sm w-full border rounded-[3px] p-2 
          bg-white dark:bg-[#242424]
          text-gray-900 dark:text-gray-100
          border-gray-500 dark:border-gray-600
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          focus:border-blue-500 dark:focus:border-blue-400
          focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400
          disabled:bg-gray-100 dark:disabled:bg-gray-700
          disabled:cursor-not-allowed
          ${error ? "border-red-500 dark:border-red-400" : ""} 
          ${className}`}
      />
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
});

TextArea.displayName = 'TextArea';  // helpful for React DevTools

TextArea.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  rows: PropTypes.number,
  className: PropTypes.string,
  readOnly: PropTypes.bool
};

export default TextArea;