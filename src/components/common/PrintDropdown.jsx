import React, { useState, useRef, useEffect } from 'react';
import { PrinterIcon, ChevronDown, Printer, FileDown, MessageCircle } from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";
import { useTranslation } from 'react-i18next';

const PrintDropdown = ({ onPrintToPrinter, onPrintToPdf, onSendWhatsApp }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <div className="flex items-center">
                {/* Main print button - default action is Print to Printer */}
                <button
                    type="button"
                    onClick={() => {
                        onPrintToPrinter();
                        setIsOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-md
                               main-bg text-white
                               hover:opacity-90 transition-opacity cursor-pointer"
                >
                    <PrinterIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("Print") || "Print"}</span>
                </button>

                {/* Dropdown toggle arrow */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center px-1.5 py-[9px] text-sm font-medium rounded-r-md
                               main-bg text-white
                               border-l border-white/30
                               hover:opacity-90 transition-opacity cursor-pointer"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
                    <div className="py-1">
                        {/* Print to Printer */}
                        <button
                            type="button"
                            onClick={() => {
                                onPrintToPrinter();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                            <Printer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>{t("print To Printer") || "Print to Printer"}</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-0.5" />

                        {/* Print as PDF */}
                        <button
                            type="button"
                            onClick={() => {
                                onPrintToPdf();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                            <FileDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>{t("Print as PDF") || "Print as PDF"}</span>
                        </button>

                        {/* Divider */}
                        {onSendWhatsApp && <div className="border-t border-gray-200 dark:border-gray-700 my-0.5" />}

                        {/* Send via WhatsApp */}
                        {onSendWhatsApp && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSendWhatsApp();
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                                <FaWhatsapp className="w-4 h-4 text-green-500 dark:text-green-400" />
                                <span>{t("Send via WhatsApp") || "Send via WhatsApp"}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrintDropdown;