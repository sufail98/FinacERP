import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const LanguageDropdown = ({ isOpen, onToggle, isMobile = false }) => {
  const { i18n } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState({
    code: i18n.language || "en",
    name: i18n.language === "ar" ? "العربية - AR" : "English - EN",
    flag: i18n.language === "ar" ? "🇸🇦" : "🇺🇸",
  });

  const languages = [
    { code: "en", name: "English - EN", flag: "🇺🇸" },
    { code: "ar", name: "العربية - AR", flag: "🇸🇦" },
  ];

  const currentLanguage = localStorage.getItem("selectedLanguage") || "en";

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    i18n.changeLanguage(language.code);
    localStorage.setItem("selectedLanguage", language.code);

    // Switch text direction
    document.documentElement.setAttribute(
      "dir",
      language.code === "ar" ? "rtl" : "ltr"
    );

    // ✅ Close the dropdown after selection - use setTimeout to ensure state updates
    setTimeout(() => {
      if (onToggle) {
        onToggle();
      }
    }, 100);
  };

  // Apply saved language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("selectedLanguage");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
      document.documentElement.setAttribute(
        "dir",
        savedLang === "ar" ? "rtl" : "ltr"
      );
      setSelectedLanguage(
        languages.find((lang) => lang.code === savedLang) || languages[0]
      );
    } else {
      document.documentElement.setAttribute(
        "dir",
        i18n.language === "ar" ? "rtl" : "ltr"
      );
    }
  }, []);

  // Mobile version - simplified without fixed positioning
  if (isMobile) {
    return (
      <>
        <style>{`
          @keyframes mobileLanguageSlideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
              max-height: 0;
            }
            to {
              opacity: 1;
              transform: translateY(0);
              max-height: 500px;
            }
          }

          @keyframes mobileLanguageSlideUp {
            from {
              opacity: 1;
              transform: translateY(0);
              max-height: 500px;
            }
            to {
              opacity: 0;
              transform: translateY(-10px);
              max-height: 0;
            }
          }

          @keyframes languageItemSlideIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .mobile-lang-dropdown-enter {
            animation: mobileLanguageSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          .mobile-lang-dropdown-exit {
            animation: mobileLanguageSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          .lang-item {
            animation: languageItemSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
          }

          .lang-item:nth-child(1) { animation-delay: 0ms; }
          .lang-item:nth-child(2) { animation-delay: 50ms; }

          @keyframes radioScale {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          .radio-selected {
            animation: radioScale 0.4s ease-out;
          }

          @keyframes chevronRotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(180deg);
            }
          }

          @keyframes chevronRotateBack {
            from {
              transform: rotate(180deg);
            }
            to {
              transform: rotate(0deg);
            }
          }

          .chevron-open {
            animation: chevronRotate 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          .chevron-close {
            animation: chevronRotateBack 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>

        <div className="w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggle) onToggle();
            }}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-white hover:bg-gray-700 rounded-lg transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                {selectedLanguage.flag}
              </span>
              <span className="text-sm font-medium transition-colors duration-200">
                {selectedLanguage.name}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-all duration-300 ${
                isOpen ? "chevron-open rotate-180" : "chevron-close"
              }`}
            />
          </button>

          {/* Mobile Dropdown Panel */}
          {isOpen && (
            <div className="mt-2 bg-gray-700 rounded-lg overflow-hidden mobile-lang-dropdown-enter">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageSelect(language);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-150 lang-item ${
                    selectedLanguage.code === language.code
                      ? "bg-gray-600 border-l-2 border-blue-400"
                      : "hover:bg-gray-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      selectedLanguage.code === language.code
                        ? "border-blue-400 bg-blue-400 radio-selected"
                        : "border-gray-400"
                    }`}
                  >
                    {selectedLanguage.code === language.code && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-lg transition-transform duration-300">
                    {language.flag}
                  </span>
                  <span
                    className={`text-sm transition-all duration-200 ${
                      selectedLanguage.code === language.code
                        ? "text-blue-300 font-medium"
                        : "text-gray-200"
                    }`}
                  >
                    {language.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // Desktop version - original with fixed positioning
  return (
    <>
      <style>{`
        @keyframes desktopLanguageSlideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes desktopLanguageSlideUp {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        @keyframes languageItemFadeIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes desktopLanguageScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes desktopLanguageScaleOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
        }

        @keyframes radioScalePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        @keyframes borderAccent {
          from {
            border-right-width: 0;
            opacity: 0;
          }
          to {
            border-right-width: 2px;
            opacity: 1;
          }
        }

        @keyframes chevronDesktopRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(180deg);
          }
        }

        @keyframes chevronDesktopRotateBack {
          from {
            transform: rotate(180deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        /* Desktop dropdown animations */
        .desktop-lang-dropdown-enter {
          animation: desktopLanguageScaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .desktop-lang-dropdown-exit {
          animation: desktopLanguageScaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .lang-item-desktop {
          animation: languageItemFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
        }

        .lang-item-desktop:nth-child(1) { animation-delay: 0ms; }
        .lang-item-desktop:nth-child(2) { animation-delay: 50ms; }

        .radio-selected-desktop {
          animation: radioScalePulse 0.4s ease-out;
        }

        .border-accent-animate {
          animation: borderAccent 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .chevron-desktop-open {
          animation: chevronDesktopRotate 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .chevron-desktop-close {
          animation: chevronDesktopRotateBack 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Overlay fade animation */
        @keyframes overlayFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes overlayFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .overlay-fade-in {
          animation: overlayFadeIn 0.2s ease-out forwards;
        }

        .overlay-fade-out {
          animation: overlayFadeOut 0.2s ease-out forwards;
        }

        /* Smooth transitions */
        .lang-button-trigger {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .lang-button-trigger:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Background overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 overlay-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle();
          }}
        />
      )}

      {/* Dropdown trigger */}
      <div
        className={`${currentLanguage === "ar" ? "left-[300px]" : "right-[100px]"} z-50 cursor-pointer`}
      >
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle();
          }}
        >
          <button className="lang-button-trigger flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-black">
            <span className="hidden sm:inline text-white transition-all duration-300">
              {selectedLanguage.code.toUpperCase()}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-white flex-shrink-0 ${
                isOpen ? "chevron-desktop-open" : "chevron-desktop-close"
              }`}
            />
          </button>

          {/* Dropdown panel */}
          <div
            className={`absolute top-full left-0 right-auto md:left-auto md:right-0 mt-2 shadow-2xl w-[280px] sm:w-80 bg-white border border-gray-200 rounded-xl ${
      isOpen
        ? "desktop-lang-dropdown-enter"
        : "desktop-lang-dropdown-exit pointer-events-none"
    }`}
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-1 transition-colors duration-200">
                Choose your language
              </h3>
              <p className="text-xs text-gray-500">
                Select your preferred language for the interface
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageSelect(language);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-150 lang-item-desktop group ${
                    selectedLanguage.code === language.code
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      selectedLanguage.code === language.code
                        ? "border-blue-500 bg-blue-500 radio-selected-desktop"
                        : "border-gray-300 group-hover:border-gray-400"
                    }`}
                  >
                    {selectedLanguage.code === language.code && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                    {language.flag}
                  </span>
                  <span
                    className={`text-sm transition-all duration-200 flex-1 ${
                      selectedLanguage.code === language.code
                        ? "text-blue-700 font-medium"
                        : "text-gray-700 group-hover:text-gray-900"
                    }`}
                  >
                    {language.name}
                  </span>

                  {/* Animated accent border */}
                  {selectedLanguage.code === language.code && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 border-accent-animate" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LanguageDropdown;