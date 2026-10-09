// TextInput.jsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PropTypes from "prop-types";
import { forwardRef, useEffect, useRef, useState } from "react";

const TextInput = forwardRef(({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = "",
  type = "text",
  readOnly = false,
  timeText = "",
  onKeyDown,
  onFocus,
  onBlur,
  disabled = false,
  step,
  labelBold,
  maxLength
}, ref) => {
  const [animateError, setAnimateError] = useState(false);

  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div>
      {label && (
        <Label
          htmlFor={id || name}
          className={`text-[11px] ${labelBold?'font-bold':'font-medium'}  mb- flex justify-between text-black dark:text-gray-30`}
        >
          <div>
            {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
          </div>
          {timeText && <span className="text-gray-500 dark:text-gray-400">{timeText}</span>}
        </Label>
      )}
      <Input
        ref={ref}
        type={type}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        step={step}
        onFocus={(e) => {
          if (type === "number") {
            e.target.select();
          }
          onFocus?.(e);
        }}
        onBlur={onBlur}
        className={`h-6 rounded-[3px] text-sm
    bg-white dark:bg-[#242424]
    ${!className?.includes('text-red') ? 'text-gray-900 dark:text-gray-100' : ''}
    border ${error ? "border-red-500 dark:border-red-400" : "border-gray-500 dark:border-gray-600"}
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:border-blue-500 dark:focus:border-blue-400
    disabled:bg-gray-100 dark:disabled:bg-gray-700
    disabled:cursor-not-allowed
    ${className} ${animateError ? "animate-shake" : ""}
  `}
      />

      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;