import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';

const SearchableDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
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
  onBlur,
  multiple = false,
  onEnter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [animateError, setAnimateError] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : value;

  const filteredOptions = options.filter(option => {
    const label = typeof option === 'string' ? option : option?.label;
    if (!label) return false;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getDisplayValue = () => {
    if (multiple) {
      if (!selectedValues || selectedValues.length === 0) return '';
      const selectedLabels = selectedValues.map(val => {
        const selectedOption = options.find(option => {
          const optionValue = typeof option === 'string' ? option : option?.value;
          return optionValue === val;
        });
        return selectedOption
          ? (typeof selectedOption === 'string' ? selectedOption : selectedOption?.label || '')
          : val;
      });
      return selectedLabels.join(', ');
    } else {
      if (!value) return '';
      const selectedOption = options.find(option => {
        const optionValue = typeof option === 'string' ? option : option?.value;
        return optionValue === value;
      });
      return selectedOption
        ? (typeof selectedOption === 'string' ? selectedOption : selectedOption?.label || '')
        : value;
    }
  };

  const isOptionSelected = (option) => {
    const optionValue = typeof option === 'string' ? option : option?.value;
    if (multiple) {
      return selectedValues.includes(optionValue);
    }
    return optionValue === value;
  };

  const handleOptionSelect = (option) => {
    if (readOnly) return;
    const optionValue = typeof option === 'string' ? option : option?.value;

    if (multiple) {
      let newValues;
      if (selectedValues.includes(optionValue)) {
        newValues = selectedValues.filter(v => v !== optionValue);
      } else {
        newValues = [...selectedValues, optionValue];
      }
      onChange(newValues);
      setSearchTerm('');
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  const handleRemoveTag = (e, valueToRemove) => {
    if (readOnly || disabled) return;
    e.stopPropagation();
    const newValues = selectedValues.filter(v => v !== valueToRemove);
    onChange(newValues);
  };

  const handleClear = (e) => {
    if (readOnly) return;
    e.stopPropagation();
    onChange(multiple ? [] : '');
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleOkClick = (e) => {
    e.stopPropagation();
    if (onEnter) onEnter(selectedValues);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (multiple && onEnter && selectedValues.length > 0) {
          onEnter(selectedValues);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'Backspace':
        if (multiple && searchTerm === '' && selectedValues.length > 0) {
          e.preventDefault();
          const newValues = selectedValues.slice(0, -1);
          onChange(newValues);
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) {
      setAnimateError(true);
      const timer = setTimeout(() => setAnimateError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  const getOptionLabel = (val) => {
    const option = options.find(opt => {
      const optValue = typeof opt === 'string' ? opt : opt?.value;
      return optValue === val;
    });
    return option ? (typeof option === 'string' ? option : option?.label || '') : val;
  };

  const hasValue = multiple ? selectedValues.length > 0 : !!value;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label
          htmlFor={id}
          className={`text-[11px] font-medium flex text-black dark:text-gray-300 ${labelClassName}`}
        >
          {label}{required && <span className="text-red-500 dark:text-red-400">*</span>}
        </Label>
      )}

      <div ref={dropdownRef} className="relative">
        <input
          type="hidden"
          name={name}
          value={multiple ? JSON.stringify(selectedValues) : (value || '')}
          onBlur={onBlur}
        />

        <div
          tabIndex={0}
          id={id}
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (disabled || readOnly) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={`
            w-full border min-h-[26px] rounded-[3px] -mt-1 px-2 text-sm font-[500] cursor-pointer flex items-center justify-between
            transition-colors duration-200
            ${disabled
              ? 'bg-gray-100 dark:bg-[#1a1a1a] cursor-not-allowed text-gray-500 dark:text-gray-400'
              : 'bg-white dark:bg-[#242424] hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100'
            }
            ${isOpen
              ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400'
              : error
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-500 dark:border-gray-600'
            }
            ${animateError ? 'animate-shake' : ''}
            ${multiple && selectedValues.length > 0 ? 'py-1' : 'py-[1px]'}
          `}
        >
          <div className="flex-1 flex flex-wrap gap-1 items-center min-w-0">
            {multiple && selectedValues.length > 0 ? (
              <>
                {selectedValues.map((val, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs max-w-[150px]"
                  >
                    <span className="">{getOptionLabel(val)}</span>
                    {!disabled && !readOnly && (
                      <X
                        size={12}
                        className="flex-shrink-0 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100"
                        onClick={(e) => handleRemoveTag(e, val)}
                      />
                    )}
                  </span>
                ))}
              </>
            ) : (
              <span className={hasValue
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500 font-[300] italic'
              }>
                {getDisplayValue() || placeholder}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {clearable && hasValue && !disabled && !readOnly && (
              <X
                size={16}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={handleClear}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900/50 max-h-60 overflow-hidden flex flex-col">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-8 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm
                    bg-white dark:bg-[#242424]
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* Select All / Clear All for multiple */}
            {multiple && filteredOptions.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const allValues = filteredOptions.map(opt =>
                      typeof opt === 'string' ? opt : opt?.value
                    );
                    onChange(allValues);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options list */}
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {loading ? (
                <div className="flex items-center justify-center px-3 py-2">
                  <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option?.value;
                  const optionLabel = typeof option === 'string' ? option : option?.label || 'N/A';
                  const isSelected = isOptionSelected(option);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={index}
                      ref={el => optionRefs.current[index] = el}
                      onClick={() => handleOptionSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`
                        px-3 py-2 cursor-pointer text-sm transition-colors flex items-center justify-between
                        ${isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                          : isHighlighted
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span>{optionLabel}</span>
                      {multiple && isSelected && (
                        <Check size={16} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  No options found
                </div>
              )}
            </div>

            {/* Footer: count + OK button — only in multiple mode */}
            {multiple && selectedValues.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedValues.length} item{selectedValues.length > 1 ? 's' : ''} selected
                </span>
                {onEnter && (
                  <button
                    type="button"
                    onClick={handleOkClick}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    OK
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
};

export default SearchableDropdown;