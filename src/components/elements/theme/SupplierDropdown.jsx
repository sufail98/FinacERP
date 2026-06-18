import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableDropdown = forwardRef(({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  className = '',
  disabled = false,
  clearable = false,
  name,
  id,
  label,
  labelClassName = '',
  loading = false,
  error = null,
  required = false,
  readOnly = false,
  onKeyDown,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [animateError, setAnimateError] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (buttonRef.current) {
        buttonRef.current.focus();
      }
    },
    blur: () => {
      if (buttonRef.current) {
        buttonRef.current.blur();
      }
    }
  }));

  const filteredOptions = options.filter(option =>
    option.label?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayValue = () => {
    if (!value) return '';
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : value;
  };

  const handleOptionSelect = (option) => {
    if (readOnly) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleKeyDownInternal = (e) => {
    // Handle Enter to open dropdown
    if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } 
    // Handle Escape to close dropdown
    else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
    // Pass other key events to parent
    else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-[12px] font-medium text-secondary dark:text-secondary ${labelClassName}`}
        >
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
      )}

      <div ref={dropdownRef} className="relative">
        <input type="hidden" name={name} value={value} />

        <div
          ref={buttonRef}
          id={id}
          tabIndex={disabled || readOnly ? -1 : 0}
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDownInternal}
          className={`
            w-full border py-[1px] -mt-1 rounded-[3px] px-2 text-sm font-[500] cursor-pointer flex items-center justify-between
            ${disabled 
              ? 'bg-gray-100 dark:bg-[#1a1a1a] cursor-not-allowed' 
              : 'bg-primary dark:bg-primary hover:border-gray-400 dark:hover:border-[#4a4a4a]'
            }
            ${isOpen 
              ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400' 
              : error 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-themed dark:border-themed'
            }
            ${animateError ? 'animate-shake' : ''}
            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
          `}
        >
          <span className={value ? 'text-primary dark:text-primary' : 'text-muted dark:text-muted font-[300] italic'}>
            {getDisplayValue() || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {clearable && value && !disabled && !readOnly && (
              <X
                size={16}
                className="text-muted dark:text-muted hover:text-secondary dark:hover:text-secondary"
                onClick={handleClear}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-muted dark:text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-themed dark:border-themed">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted dark:text-muted"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 border border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary rounded text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-muted dark:placeholder:text-muted"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center px-3 py-2">
                  <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    className={`px-3 py-2 cursor-pointer hover:bg-hover dark:hover:bg-hover text-sm ${
                      option.value === value 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'text-primary dark:text-primary'
                    }`}
                  >
                    {option.label}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-tertiary dark:text-tertiary text-sm">No options found</div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
});

SearchableDropdown.displayName = 'SearchableDropdown';

export default SearchableDropdown;