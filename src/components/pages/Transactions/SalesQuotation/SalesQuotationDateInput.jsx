// SalesQuotationDateInput.jsx
// Isolated DateInput for Sales Quotation — timezone-safe version

import { Label } from "@/components/ui/label";
import PropTypes from "prop-types";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

const SalesQuotationDateInput = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = "",
  readOnly = false,
  timeText = "",
  onKeyDown,
  onFocus,
  onBlur,
  disabled = false,
  min,
  max,
  autoFocus = false,
}) => {
  const [animateError, setAnimateError] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const isInternalUpdate = useRef(false);
  const lastValidValue = useRef("");

  const { generalSettings } = useSelector((state) => state.settings);
  const dateFormat = generalSettings?.dateformat || "dd-MM-yyyy";
  const separator = dateFormat.includes("/") ? "/" : "-";
  const formatParts = dateFormat.split(separator);

  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const valueToDisplay = (val) => {
    if (!val) return "";

    let dd, mm, yyyy;

    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "";
      dd = String(val.getDate()).padStart(2, "0");
      mm = String(val.getMonth() + 1).padStart(2, "0");
      yyyy = String(val.getFullYear());
    } else {
      const str = String(val).split("T")[0].split(" ")[0];
      const date = new Date(str + "T00:00:00");
      if (isNaN(date.getTime())) return "";
      dd = String(date.getDate()).padStart(2, "0");
      mm = String(date.getMonth() + 1).padStart(2, "0");
      yyyy = String(date.getFullYear());
    }

    return dateFormat.replace("dd", dd).replace("MM", mm).replace("yyyy", yyyy);
  };

  const displayToValue = (display) => {
    if (!display || display.length !== 10) return null;

    const parts = display.split(separator);
    if (parts.length !== 3) return null;

    let dd, mm, yyyy;
    formatParts.forEach((part, i) => {
      if (part === "dd") dd = parseInt(parts[i], 10);
      else if (part === "MM") mm = parseInt(parts[i], 10);
      else if (part === "yyyy") yyyy = parseInt(parts[i], 10);
    });

    if (!dd || !mm || !yyyy) return null;
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900 || yyyy > 2100) return null;

    const date = new Date(yyyy, mm - 1, dd);
    if (date.getDate() !== dd || date.getMonth() !== mm - 1) return null;

    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  };

  const formatDigits = (digits) => {
    if (digits.length !== 8) return null;

    let formatted = "";
    let pos = 0;

    formatParts.forEach((part, index) => {
      const len = part === "yyyy" ? 4 : 2;
      formatted += digits.slice(pos, pos + len);
      pos += len;
      if (index < formatParts.length - 1) {
        formatted += separator;
      }
    });

    return formatted;
  };

  const autoFormatInput = (input) => {
    const digits = input.replace(/\D/g, "");

    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + separator + digits.slice(2);
    if (digits.length <= 8) {
      return digits.slice(0, 2) + separator + digits.slice(2, 4) + separator + digits.slice(4);
    }

    return digits.slice(0, 2) + separator + digits.slice(2, 4) + separator + digits.slice(4, 8);
  };

  useEffect(() => {
    if (!isInternalUpdate.current && !isTyping) {
      const newDisplay = valueToDisplay(value);
      setDisplayText(newDisplay);
      if (newDisplay) {
        if (value instanceof Date) {
          if (!isNaN(value.getTime())) {
            const y = value.getFullYear();
            const m = String(value.getMonth() + 1).padStart(2, "0");
            const d = String(value.getDate()).padStart(2, "0");
            lastValidValue.current = `${y}-${m}-${d}`;
          }
        } else if (value) {
          const str = String(value).split("T")[0].split(" ")[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            lastValidValue.current = str;
          }
        }
      }
    } else {
      isInternalUpdate.current = false;
    }
  }, [value, dateFormat, isTyping]);

  const updateParent = (apiValue) => {
    isInternalUpdate.current = true;
    if (apiValue) {
      lastValidValue.current = apiValue;
    }
    onChange({ target: { name, value: apiValue || "" } }, apiValue || "");
  };

  const applyDate = () => {
    setIsTyping(false);
    let text = displayText.trim();

    if (!text) {
      if (value) updateParent("");
      return false;
    }

    const digits = text.replace(/\D/g, "");

    if (digits.length === 8) {
      const formatted = formatDigits(digits);
      const apiVal = displayToValue(formatted);

      if (apiVal) {
        setDisplayText(formatted);
        updateParent(apiVal);
        return true;
      }
    }

    if (text.length === 10) {
      const apiVal = displayToValue(text);
      if (apiVal) {
        updateParent(apiVal);
        return true;
      }
    }

    if (lastValidValue.current) {
      setDisplayText(valueToDisplay(lastValidValue.current));
    } else if (value) {
      setDisplayText(valueToDisplay(value));
    } else {
      setDisplayText("");
      updateParent("");
    }

    return false;
  };

  const handleInputChange = (e) => {
    setIsTyping(true);
    let input = e.target.value;

    input = input.replace(new RegExp(`[^0-9${separator === "-" ? "\\-" : separator}]`, "g"), "");

    if (input.length > 10) {
      input = input.slice(0, 10);
    }

    const digits = input.replace(/\D/g, "");
    if (digits.length > 0 && digits.length <= 8 && !input.includes(separator)) {
      input = autoFormatInput(input);
    }

    setDisplayText(input);

    if (input.length === 10) {
      const apiVal = displayToValue(input);
      if (apiVal) {
        updateParent(apiVal);
      }
    }
  };

  const getCursorPart = (cursorPos) => {
    let pos = 0;
    for (let i = 0; i < formatParts.length; i++) {
      const partLen = formatParts[i] === "yyyy" ? 4 : 2;
      const partEnd = pos + partLen;

      if (cursorPos <= partEnd) {
        return formatParts[i];
      }

      pos = partEnd + 1;
    }

    return formatParts[formatParts.length - 1];
  };

  const adjustDate = (delta) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const part = getCursorPart(cursorPos);

    let day, month, year;

    if (displayText.length === 10) {
      const parts = displayText.split(separator);
      formatParts.forEach((formatPart, i) => {
        if (formatPart === "dd") day = parseInt(parts[i], 10);
        else if (formatPart === "MM") month = parseInt(parts[i], 10);
        else if (formatPart === "yyyy") year = parseInt(parts[i], 10);
      });
    }

    if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
      let apiVal = value;
      if (!apiVal) {
        const today = new Date();
        apiVal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      }

      if (apiVal instanceof Date) {
        year = apiVal.getFullYear();
        month = apiVal.getMonth() + 1;
        day = apiVal.getDate();
      } else {
        const dateStr = String(apiVal).split("T")[0].split(" ")[0];
        const [yearStr, monthStr, dayStr] = dateStr.split("-");
        year = parseInt(yearStr, 10);
        month = parseInt(monthStr, 10);
        day = parseInt(dayStr, 10);
      }
    }

    if (part === "dd") {
      day += delta;
      if (day > 31) day = 1;
      if (day < 1) day = 31;
    } else if (part === "MM") {
      month += delta;
      if (month > 12) month = 1;
      if (month < 1) month = 12;
    } else if (part === "yyyy") {
      year += delta;
      if (year < 1900) year = 1900;
      if (year > 2100) year = 2100;
    }

    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const newDisplay = dateFormat.replace("dd", dd).replace("MM", mm).replace("yyyy", yyyy);
    setDisplayText(newDisplay);

    const testDate = new Date(year, month - 1, day);
    const isValidDate =
      testDate.getDate() === day &&
      testDate.getMonth() === month - 1 &&
      testDate.getFullYear() === year;

    if (isValidDate) {
      const newApiVal = `${yyyy}-${mm}-${dd}`;
      updateParent(newApiVal);
    }

    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleKeyDown = (e) => {
    if (disabled || readOnly) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      adjustDate(1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      adjustDate(-1);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      applyDate();
      return;
    }

    if (e.key === "Escape") {
      setShowCalendar(false);
      if (value) {
        setDisplayText(valueToDisplay(value));
      }
      return;
    }

    if (e.key === "Tab") {
      applyDate();
      setShowCalendar(false);
    }

    if (onKeyDown) onKeyDown(e);
  };

  const handleFocus = (e) => {
    setIsTyping(false);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      return;
    }

    setTimeout(() => {
      applyDate();
    }, 150);

    if (onBlur) onBlur(e);
  };

  const handleCalendarChange = (date) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const apiVal = `${yyyy}-${mm}-${dd}`;

      setDisplayText(valueToDisplay(apiVal));
      updateParent(apiVal);
    }
    setShowCalendar(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCalendar]);

  const getSelectedDate = () => {
    const apiVal = displayToValue(displayText) || value;
    if (!apiVal) return null;

    if (apiVal instanceof Date) {
      return isNaN(apiVal.getTime()) ? null : apiVal;
    }

    const str = String(apiVal).split("T")[0].split(" ")[0];
    const date = new Date(str + "T00:00:00");
    return isNaN(date.getTime()) ? null : date;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <Label
          htmlFor={id || name}
          className="text-[11px] font-medium flex justify-between text-black dark:text-gray-300"
        >
          <div>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </div>
          {timeText && <span className="text-gray-500 dark:text-gray-400">{timeText}</span>}
        </Label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id || name}
          name={name}
          value={displayText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder || dateFormat.toLowerCase()}
          maxLength={10}
          className={`
            h-6 w-full rounded-[3px] text-sm px-2 pr-8
            bg-white dark:bg-[#242424]
            text-gray-900 dark:text-gray-100
            border ${error ? "border-red-500" : "border-gray-500 dark:border-gray-600"}
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed
            ${className} ${animateError ? "animate-shake" : ""}
          `}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          onClick={() => setShowCalendar(!showCalendar)}
          title="Open calendar"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <Calendar className="h-4 w-4" />
        </button>

        {showCalendar && !disabled && !readOnly && (
          <div className="absolute z-[9999] mt-1 left-0">
            <DatePicker
              selected={getSelectedDate()}
              onChange={handleCalendarChange}
              inline
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              minDate={min ? new Date(min) : undefined}
              maxDate={max ? new Date(max) : undefined}
              todayButton="Today"
            />
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}

      <style>{`
        .react-datepicker {
          font-family: inherit;
          font-size: 13px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .react-datepicker__header {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 10px;
        }
        .react-datepicker__day--selected {
          background: #2563eb !important;
          color: white !important;
        }
        .react-datepicker__day--today {
          font-weight: bold;
          color: #2563eb;
        }
        .react-datepicker__day:hover {
          background: #e5e7eb;
        }
        .react-datepicker__today-button {
          background: #f3f4f6;
          border-top: 1px solid #e5e7eb;
          padding: 10px;
          color: #2563eb;
        }
        .dark .react-datepicker {
          background: #1f2937;
          border-color: #374151;
        }
        .dark .react-datepicker__header {
          background: #111827;
          border-color: #374151;
        }
        .dark .react-datepicker__day {
          color: #e5e7eb;
        }
        .dark .react-datepicker__day:hover {
          background: #374151;
        }
        .dark .react-datepicker__today-button {
          background: #111827;
          color: #60a5fa;
        }
      `}</style>
    </div>
  );
};

SalesQuotationDateInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  timeText: PropTypes.string,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  onKeyDown: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  min: PropTypes.string,
  max: PropTypes.string,
  autoFocus: PropTypes.bool,
};

export default SalesQuotationDateInput;