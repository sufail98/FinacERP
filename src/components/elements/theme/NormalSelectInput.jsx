import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { ChevronDown, Check } from "lucide-react";
import PropTypes from "prop-types";

const NormalSelectInput = ({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  error,
  required = false,
  className = "",
  disabled = false,
  readOnly = false,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [animateError, setAnimateError] = useState(false);

  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled || readOnly) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      setSearchTerm("");
    }
  };

  const handleOptionClick = (option) => {
    if (disabled || readOnly) return;
    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-[12px] font-medium text-secondary dark:text-secondary `}
        >
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
      )}

      <input type="hidden" id={id || name} name={name} value={value} onBlur={onBlur} />

      <div className="relative">
        <div
          className={`
            w-full border min-h-6 rounded-xs px-2 py-[1px] -mt-1 text-sm flex items-center justify-between 
            transition-all duration-200 
            ${error ? "border-red-500 dark:border-red-400" : "border-gray-500 dark:border-gray-600"}
            ${isOpen ? "ring-opacity-20" : ""}
            ${(disabled || readOnly)
              ? "bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 cursor-not-allowed"
              : "bg-white dark:bg-[#242424] cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
            }

            ${className} ${animateError ? "animate-shake" : ""}
          `}
          onClick={handleToggle}
          tabIndex={(disabled || readOnly) ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled || readOnly) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
        >
          <span className={selectedOption
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400"
          }>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""
              }`}
          />
        </div>

        {!disabled && (
          <div
            className={`
absolute top-full left-0 right-0 z-50 bg-white dark:bg-[#1e1e1e]
              border border-gray-500 dark:border-gray-600 rounded-md 
              shadow-lg dark:shadow-gray-900/50
              transition-all duration-200 origin-top
              ${isOpen
                ? "opacity-100 visible transform scale-y-100"
                : "opacity-0 invisible transform scale-y-95"
              }
            `}
            style={{
              transformOrigin: "top",
              marginTop: "4px",
            }}
          >
            {options.length > 5 && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded 
  bg-white dark:bg-[#242424]
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value || index}
                    className={`
                      px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                      transition-colors duration-150
                      hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400
                      ${value === option.value
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                      }
                    `}
                    onClick={() => handleOptionClick(option)}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};

NormalSelectInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
      ]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export default NormalSelectInput;