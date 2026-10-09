import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Building2 } from 'lucide-react';
import useAuth from "@/redux/hook/auth/useAuth";
import { useLocation } from 'react-router-dom';

const BranchDropdown = ({ isOpen, onToggle, onClose }) => {
  const {
    branches,
    selectedBranchId,
    setBranch,
    currentFinancialYear,
    currentCurrency,
    currentCurrencyConversion
  } = useAuth();
  const location=useLocation();

  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    if (branches && branches.length > 0 && selectedBranchId) {
      const branch = branches.find(b => b.branchId === selectedBranchId);
      if (branch) {
        setSelectedBranch(branch);
      }
    }
  }, [branches, selectedBranchId]);

  if (!branches || branches.length === 0) return null;

  const handleBranchSelect = (branch) => {

    setSelectedBranch(branch);
    setBranch(branch.branchId);
    onClose();

    if (window.electronAPI) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'reload-loading';
      loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease-out forwards;
      `;
      loadingDiv.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 18px; color: #333; font-weight: 600; margin-bottom: 10px;">Switching branch...</div>
          <div style="color: #666; font-size: 14px;">Please wait</div>
          <div style="margin-top: 20px; display: flex; gap: 6px; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; animation: bounce 1.4s infinite;"></div>
            <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; animation: bounce 1.4s infinite 0.2s;"></div>
            <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; animation: bounce 1.4s infinite 0.4s;"></div>
          </div>
        </div>
        <style>
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
      `;
      document.body.appendChild(loadingDiv);
      sessionStorage.setItem('branchSwitching', 'true');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <style>{`
        /* Overlay animations */
        @keyframes overlayBranchFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes overlayBranchFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        /* Dropdown panel animations */
        @keyframes branchDropdownScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes branchDropdownScaleOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
        }

        /* Branch item animations */
        @keyframes branchItemSlideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Chevron rotation */
        @keyframes chevronBranchRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(180deg);
          }
        }

        @keyframes chevronBranchRotateBack {
          from {
            transform: rotate(180deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        /* Radio button pulse */
        @keyframes radioBranchScale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        /* Header animation */
        @keyframes headerSlideDown {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Footer animation */
        @keyframes footerSlideUp {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Building icon pulse */
        @keyframes buildingPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Staggered branch items */
        .branch-item {
          animation: branchItemSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
        }

        .branch-item:nth-child(1) { animation-delay: 0ms; }
        .branch-item:nth-child(2) { animation-delay: 50ms; }
        .branch-item:nth-child(3) { animation-delay: 100ms; }
        .branch-item:nth-child(4) { animation-delay: 150ms; }
        .branch-item:nth-child(5) { animation-delay: 200ms; }

        /* Animation classes */
        .overlay-branch-fade-in {
          animation: overlayBranchFadeIn 0.2s ease-out forwards;
        }

        .overlay-branch-fade-out {
          animation: overlayBranchFadeOut 0.2s ease-out forwards;
        }

        .branch-dropdown-enter {
          animation: branchDropdownScaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .branch-dropdown-exit {
          animation: branchDropdownScaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .chevron-branch-open {
          animation: chevronBranchRotate 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .chevron-branch-close {
          animation: chevronBranchRotateBack 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .radio-branch-selected {
          animation: radioBranchScale 0.4s ease-out;
        }

        .header-branch-animate {
          animation: headerSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .footer-branch-animate {
          animation: footerSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .building-icon-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .branch-button-group:hover .building-icon-hover {
          animation: buildingPulse 0.6s ease-in-out;
          transform: scale(1.1);
        }

        /* Smooth transitions */
        .branch-trigger-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .branch-trigger-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        /* Border accent animation */
        @keyframes borderAccentBranch {
          from {
            border-right-width: 0;
            opacity: 0;
          }
          to {
            border-right-width: 2px;
            opacity: 1;
          }
        }

        .border-accent-branch {
          animation: borderAccentBranch 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Scroll animations */
        @keyframes scrollFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .branch-list-container {
          animation: scrollFade 0.4s ease-out forwards;
        }
      `}</style>

      {/* ✅ FIX 1: Overlay uses onClose and has LOWER z-index */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 overlay-branch-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}

      {/* ✅ FIX 2: Main container has relative positioning and HIGH z-index */}
      <div className="relative z-50 cursor-pointer">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="branch-trigger-button flex items-center space-x-1 rounded-lg px-3 text-sm font-medium text-black transition-all duration-200"
        >
          <span className="truncate flex-1 text-left text-white transition-colors duration-300">
            {selectedBranch?.branchCode || 'Select Branch'}
          </span>
          <ChevronDown
            className={`text-white w-4 h-4 flex-shrink-0 transition-all duration-300 ${
              isOpen ? 'chevron-branch-open rotate-180' : 'chevron-branch-close'
            }`}
          />
        </button>

        {/* ✅ FIX 3: Dropdown has explicit z-50 and stopPropagation */}
        {isOpen && (
          <div
           className={`absolute top-full left-0 right-auto md:left-auto md:right-0 mt-3 shadow-2xl w-[280px] sm:w-80 bg-white border border-gray-200 rounded-xl z-50 branch-dropdown-enter`}
            onClick={(e) => e.stopPropagation()} // ✅ Prevent clicks from reaching overlay
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 header-branch-animate">
              <h3 className="font-semibold text-gray-800 mb-1 flex items-center space-x-2 transition-colors duration-200">
                <MapPin className="w-4 h-4 text-blue-600 transition-transform duration-300 hover:scale-110" />
                <span>Select Branch Location</span>
              </h3>
              {currentCurrency && (
                <div className="text-xs text-gray-500 mt-2 transition-all duration-300 hover:text-gray-700">
                  <span>
                    Currency: {currentCurrency.currencySymbol} (
                    {currentCurrency.currencyName})
                  </span>
                </div>
              )}
            </div>

            {/* ✅ FIX 4: Branch Options with proper click handling */}
            <div className="max-h-80 overflow-y-auto branch-list-container">
              {branches.map((branch) => (
                <button
                  key={branch.branchId}
                  type="button" // ✅ Explicit button type
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // ✅ Stop event bubbling
                    handleBranchSelect(branch);
                  }}
                  className={`branch-item branch-button-group w-full flex items-center space-x-3 px-4 py-3 text-left 
                    transition-all duration-150 cursor-pointer relative group
                    ${
                      selectedBranch?.branchId === branch.branchId
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 
                      transition-all duration-200 ${
                        selectedBranch?.branchId === branch.branchId
                          ? 'border-blue-500 bg-blue-500 radio-branch-selected'
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}
                  >
                    {selectedBranch?.branchId === branch.branchId && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 pointer-events-none building-icon-hover transition-all duration-300" /> {/* ✅ pointer-events-none on icon */}
                  <span
                    className={`text-sm truncate pointer-events-none transition-all duration-200 ${
                      selectedBranch?.branchId === branch.branchId
                        ? 'text-blue-700 font-medium'
                        : 'text-gray-900 group-hover:text-gray-900'
                    }`}
                  >
                    {branch.branchCode}
                  </span>

                  {/* Animated accent border */}
                  {selectedBranch?.branchId === branch.branchId && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 border-accent-branch" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl footer-branch-animate">
              <div className="flex flex-col space-y-1 text-xs text-gray-600 transition-all duration-300">
                <span className="transition-colors duration-200 hover:text-gray-800">
                  Company: {selectedBranch?.branchName}
                </span>
                {currentFinancialYear &&
                  (() => {
                    const fromYear = new Date(
                      currentFinancialYear.fromDate
                    ).getFullYear();
                    const toYear = new Date(
                      currentFinancialYear.toDate
                    ).getFullYear();
                    return (
                      <span className="transition-colors duration-200 hover:text-gray-800">
                        FIN YEAR:{' '}
                        {fromYear === toYear
                          ? fromYear
                          : `${fromYear} - ${toYear}`}
                      </span>
                    );
                  })()}
                {currentCurrencyConversion && (
                  <span className="transition-colors duration-200 hover:text-gray-800">
                    Rate: {parseFloat(currentCurrencyConversion.rate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BranchDropdown;