// src/components/elements/theme/DateInput.jsx

import { Label } from "@/components/ui/label";
import PropTypes from "prop-types";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

const DateInput = ({
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
  // NEW: when true, renders with the employee-form underline style instead of the box style
  underline = false,
}) => {
  const [animateError, setAnimateError] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const isInternalUpdate = useRef(false);
  const lastValidValue = useRef("");

  // const max = new Date().toISOString().split(("T")[0])

  const { generalSettings } = useSelector((state) => state.settings);
  const dateFormat = generalSettings?.dateformat || "dd-MM-yyyy";
  const separator = dateFormat.includes("/") ? "/" : "-";
  const formatParts = dateFormat.split(separator);

  // Error animation
  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Convert API value (yyyy-MM-dd) to display format
  const valueToDisplay = (val) => {
    if (!val) return "";

    const str =
      val instanceof Date
        ? val.toISOString().split("T")[0]
        : String(val).split("T")[0];

    const date = new Date(str + "T00:00:00");
    if (isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());

    return dateFormat.replace("dd", dd).replace("MM", mm).replace("yyyy", yyyy);
  };



  // Convert display format to API value (yyyy-MM-dd)
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
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900 || yyyy > 2100)
      return null;

    const date = new Date(yyyy, mm - 1, dd);
    if (date.getDate() !== dd || date.getMonth() !== mm - 1) return null;

    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  };

  // Check if an API-format date (yyyy-MM-dd) is within the allowed min/max range
const isWithinRange = (apiVal) => {
  if (!apiVal) return true;
  if (min && apiVal < min) return false;
  if (max && apiVal > max) return false;
  return true;
};

  // Format digits to display format
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

  // Auto-format input as user types — respects formatParts order
  // formatParts is e.g. ["MM","dd","yyyy"] or ["dd","MM","yyyy"]
  // Part sizes: first two-char part = 2 digits, second two-char part = 2 digits, "yyyy" = 4 digits
  const autoFormatInput = (input) => {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 0) return "";

    // Build part lengths from formatParts
    const partLengths = formatParts.map((p) => (p === "yyyy" ? 4 : 2));
    // partLengths e.g. [2, 2, 4] for any order

    let result = "";
    let pos = 0;
    for (let i = 0; i < partLengths.length; i++) {
      const len = partLengths[i];
      const chunk = digits.slice(pos, pos + len);
      if (!chunk) break;
      result += chunk;
      pos += len;
      // Add separator after each part except the last, only if more digits follow
      if (i < partLengths.length - 1 && digits.length > pos) {
        result += separator;
      }
    }
    return result;
  };

  // Sync with external value
  useEffect(() => {
    if (!isInternalUpdate.current && !isTyping) {
      const newDisplay = valueToDisplay(value);
      setDisplayText(newDisplay);
      if (newDisplay) {
        lastValidValue.current = value;
      }
    } else {
      isInternalUpdate.current = false;
    }
  }, [value, dateFormat, isTyping]);

  // Update parent
  const updateParent = (apiValue) => {
    isInternalUpdate.current = true;
    if (apiValue) {
      lastValidValue.current = apiValue;
    }
    onChange({ target: { name, value: apiValue || "" } }, apiValue || "");
  };

  // Apply/Confirm the date
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

       if (apiVal && isWithinRange(apiVal)) {
    setDisplayText(formatted);
    updateParent(apiVal);
    return true;
  }
    }

    if (text.length === 10) {
      const apiVal = displayToValue(text);
      if (apiVal && isWithinRange(apiVal)) {
    updateParent(apiVal);
    return true;
  }
    }

    // Could not parse — revert display to last known good value.
    // NEVER call updateParent("") here when a valid value already exists:
    // doing so would clear formData even though the date was already saved.
    const revertTo = lastValidValue.current || value || "";
    if (revertTo) {
      setDisplayText(valueToDisplay(revertTo));
      // Do NOT call updateParent here — the parent already holds revertTo.
    } else {
      // Genuinely no value anywhere — clear both display and parent.
      setDisplayText("");
      updateParent("");
    }

    return false;
  };

  // Handle input change
  const handleInputChange = (e) => {
    setIsTyping(true);
    let input = e.target.value;

    input = input.replace(
      new RegExp(`[^0-9${separator === "-" ? "\\-" : separator}]`, "g"),
      ""
    );

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
      // if (apiVal) {
      //   updateParent(apiVal);
      // }
      if (apiVal && isWithinRange(apiVal)) {
    updateParent(apiVal);
  }
    }
  };

  // Get cursor part (dd, MM, or yyyy) based on cursor position
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

  // Adjust date part independently
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
      const dateStr = String(apiVal).split("T")[0];
      const [yearStr, monthStr, dayStr] = dateStr.split("-");
      year = parseInt(yearStr, 10);
      month = parseInt(monthStr, 10);
      day = parseInt(dayStr, 10);
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

    const newDisplay = dateFormat
      .replace("dd", dd)
      .replace("MM", mm)
      .replace("yyyy", yyyy);
    setDisplayText(newDisplay);

    const testDate = new Date(year, month - 1, day);
    const isValidDate =
      testDate.getDate() === day &&
      testDate.getMonth() === month - 1 &&
      testDate.getFullYear() === year;

    // if (isValidDate) {
    //   const newApiVal = `${yyyy}-${mm}-${dd}`;
    //   updateParent(newApiVal);
    // }

    if (isValidDate) {
  const newApiVal = `${yyyy}-${mm}-${dd}`;
  if (isWithinRange(newApiVal)) {
    updateParent(newApiVal);
  } else {
    // don't commit, and don't leave displayText showing an out-of-range value
    setDisplayText(valueToDisplay(value || lastValidValue.current));
  }
}

    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  // Handle key events
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
      if (value) setDisplayText(valueToDisplay(value));
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
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) return;

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
    const date = new Date(apiVal + "T00:00:00");
    return isNaN(date.getTime()) ? null : date;
  };

  /* ── Styles ── */

  // Underline style: matches UnderlineInput in the employee form
  const underlineInputClass = `
    w-full px-0 py-1.5 pr-6 bg-transparent border-0 border-b
    ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
    text-gray-900 dark:text-gray-100
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:outline-none focus:border-gray-900 dark:focus:border-gray-300
    text-sm transition-colors
    disabled:bg-transparent disabled:cursor-not-allowed
    ${className} ${animateError ? "animate-shake" : ""}
  `;

  // Box style: original DateInput appearance
  const boxInputClass = `
    h-6 w-full rounded-[3px] text-sm px-2 pr-8
    bg-white dark:bg-[#242424]
    text-gray-900 dark:text-gray-100
    border ${error ? "border-red-500" : "border-gray-500 dark:border-gray-600"}
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
    disabled:bg-gray-100 dark:disabled:bg-[#1a1a1a] disabled:cursor-not-allowed
    ${className} ${animateError ? "animate-shake" : ""}
  `;

  // Calendar icon button — underline variant sits flush right with no box
  const calendarBtnClass = underline
    ? "absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
    : "absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50";

  return (
    <div ref={containerRef} className="relative">
      {/* Label — only shown in box mode (underline mode uses InputRow label) */}
      {label && !underline && (
        <Label
          htmlFor={id || name}
          className="text-[11px] font-medium flex justify-between text-black dark:text-gray-300"
        >
          <div>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </div>
          {timeText && (
            <span className="text-gray-500 dark:text-gray-400">{timeText}</span>
          )}
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
          className={underline ? underlineInputClass : boxInputClass}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          onClick={() => setShowCalendar(!showCalendar)}
          title="Open calendar"
          className={calendarBtnClass}
        >
          <Calendar className={underline ? "h-3.5 w-3.5" : "h-4 w-4"} />
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

      {error && !underline && (
        <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
      )}

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

DateInput.propTypes = {
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
  underline: PropTypes.bool,
};

export default DateInput;