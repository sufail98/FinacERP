import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const CustomerDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select Customer',
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
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [animateError, setAnimateError] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Returns a match "score" for ranking, or -1 if no match at all.
  // Lower score = better/more relevant match.
  const getMatchScore = (text, searchQuery) => {
    if (!text) return -1;
    if (!searchQuery) return 0;

    const normalizedText = text.toLowerCase().trim();
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (!normalizedQuery) return 0;

    // 0: exact match
    if (normalizedText === normalizedQuery) return 0;

    // 1: text starts with query (e.g. "lamar" -> "lamar saudi trading company")
    if (normalizedText.startsWith(normalizedQuery)) return 1;

    // 2: a word inside the text starts with the query (e.g. "trading lamar" -> "lamar")
    const words = normalizedText.split(/\s+/);
    if (words.some(w => w.startsWith(normalizedQuery))) return 2;

    // 3: plain substring match anywhere
    if (normalizedText.includes(normalizedQuery)) return 3;

    // 4: no-space substring match (e.g. "mohammedshamil")
    const textNoSpaces = normalizedText.replace(/\s+/g, '');
    const queryNoSpaces = normalizedQuery.replace(/\s+/g, '');
    if (queryNoSpaces.length >= 3 && textNoSpaces.includes(queryNoSpaces)) return 4;

    // 5: initials match (e.g. "ms" or "m s" -> "Mohammed Shamil")
    const initials = words.map(w => w[0]).join('');
    if (queryNoSpaces.length >= 2 && initials.includes(queryNoSpaces)) return 5;

    // 6: multi-word query where each part matches the start of a word in order
    // (e.g. "m shamil" -> "Mohammed Shamil")
    const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
    if (queryParts.length > 1) {
      let wordIndex = 0;
      let allPartsMatch = true;
      for (const part of queryParts) {
        let partMatched = false;
        for (let j = wordIndex; j < words.length; j++) {
          if (words[j].startsWith(part)) {
            partMatched = true;
            wordIndex = j + 1;
            break;
          }
        }
        if (!partMatched) {
          allPartsMatch = false;
          break;
        }
      }
      if (allPartsMatch) return 6;
    }

    // No match — do NOT fall back to loose fuzzy matching; it produces
    // irrelevant results (e.g. "lamar" matching "Afaq Al Naseem...").
    return -1;
  };

  const getBestScore = (option, searchQuery) => {
    const fields = [
      option.customerName || option.label || '',
      option.code || '',
      option.vatNo || '',
      option.phoneNo || '',
      option.address || '',
      option.searchAddress || '',
    ];

    let best = -1;
    for (const field of fields) {
      const safeValue = field != null ? field.toString() : '';
      const score = getMatchScore(safeValue, searchQuery);
      if (score !== -1 && (best === -1 || score < best)) {
        best = score;
      }
    }
    return best;
  };

  const filteredOptions = (() => {
    if (!searchTerm) return options;

    return options
      .map(option => ({ option, score: getBestScore(option, searchTerm) }))
      .filter(({ score }) => score !== -1)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        // tie-break alphabetically for stable, predictable ordering
        const aLabel = (a.option.customerName || a.option.label || '').toLowerCase();
        const bLabel = (b.option.customerName || b.option.label || '').toLowerCase();
        return aLabel.localeCompare(bLabel);
      })
      .map(({ option }) => option);
  })();

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
        <input type="hidden" name={name} value={value} autoFocus={autoFocus} />

        <div
          id={id}
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
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
          `}
        >
          <span className={value ? 'text-primary dark:text-primary' : 'text-muted dark:text-muted font-[300] italic'}>
            {getDisplayValue() || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {clearable && value && !disabled && !readOnly && (
              <X
                size={16}
                className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                onClick={handleClear}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-secondary dark:text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-themed dark:border-themed">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-secondary dark:text-secondary"
                />
                <input
                  ref={inputRef}
                  autoFocus={autoFocus}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 border border-themed dark:border-themed rounded text-sm bg-primary dark:bg-primary text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
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
                    className={`px-3 py-2 cursor-pointer hover:bg-hover dark:hover:bg-hover text-sm ${option.value === value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-primary dark:text-primary'
                      }`}
                  >
                    <div className="font-bold">{option.label}</div>
                    <div className="text-xs text-tertiary dark:text-tertiary">
                      {[
                        option.vatNo && <span><strong>VAT: {option.vatNo}</strong></span>,
                        option.phoneNo && <span><strong>{option.phoneNo}</strong></span>,
                        option.code && <span>{option.code}</span>,
                        option.balance && <span>Balance: {option.balance}</span>,
                        option.address && <span>{option.address}</span>,
                      ].filter(Boolean).reduce((acc, el, i) => [
                        ...acc, i > 0 && <span key={`sep-${i}`}> | </span>, el
                      ], [])}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-muted dark:text-muted text-sm">No customers found</div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
};

export default CustomerDropdown;