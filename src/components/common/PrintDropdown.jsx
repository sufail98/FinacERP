import React, { useState, useRef, useEffect } from 'react';
import { PrinterIcon, ChevronDown, Printer, FileDown, Loader2, Mail } from 'lucide-react';
import { FaWhatsapp } from "react-icons/fa";
import { useTranslation } from 'react-i18next';

const PrintDropdown = ({ onPrintToPrinter, onPrintToPdf, onSendWhatsApp, onSendEmail }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null); // 'printer', 'pdf', 'whatsapp', 'email', null
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

    const handlePrintToPrinter = async () => {
        setLoadingAction('printer');
        setIsOpen(false);
        await onPrintToPrinter();
        setLoadingAction(null);
    };

    const handlePrintToPdf = async () => {
        setLoadingAction('pdf');
        setIsOpen(false);
        await onPrintToPdf();
        setLoadingAction(null);
    };

    const handleSendWhatsApp = async () => {
        setLoadingAction('whatsapp');
        setIsOpen(false);
        await onSendWhatsApp();
        setLoadingAction(null);
    };

    const handleSendEmail = async () => {
        setLoadingAction('email');
        setIsOpen(false);
        await onSendEmail();
        setLoadingAction(null);
    };

    const isLoading = loadingAction !== null;
    const isMainButtonLoading = loadingAction === 'printer';

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <div className="flex items-center">
                {/* Main print button - default action is Print to Printer */}
                <button
                    type="button"
                    onClick={handlePrintToPrinter}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-md
                               main-bg text-white
                               transition-opacity
                               ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                >
                    {isMainButtonLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <PrinterIcon className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                        {isMainButtonLoading ? t("Printing...") || "Printing..." : t("Print") || "Print"}
                    </span>
                </button>

                {/* Dropdown toggle arrow */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isLoading}
                    className={`flex items-center px-1.5 py-[9px] text-sm font-medium rounded-r-md
                               main-bg text-white
                               border-l border-white/30
                               transition-opacity
                               ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !isLoading && (
                <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
                    <div className="py-1">
                        {/* Print to Printer */}
                        <button
                            type="button"
                            onClick={handlePrintToPrinter}
                            disabled={isLoading}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingAction === 'printer' ? (
                                <Loader2 className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
                            ) : (
                                <Printer className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            )}
                            <span>
                                {loadingAction === 'printer'
                                    ? t("Printing...") || "Printing..."
                                    : t("Print To Printer") || "Print to Printer"}
                            </span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-0.5" />

                        {/* Print as PDF */}
                        <button
                            type="button"
                            onClick={handlePrintToPdf}
                            disabled={isLoading}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingAction === 'pdf' ? (
                                <Loader2 className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            )}
                            <span>
                                {loadingAction === 'pdf'
                                    ? t("Generating PDF...") || "Generating PDF..."
                                    : t("Print as PDF") || "Print as PDF"}
                            </span>
                        </button>

                        {/* Divider before WhatsApp */}
                        {onSendWhatsApp && <div className="border-t border-gray-200 dark:border-gray-700 my-0.5" />}

                        {/* Send via WhatsApp */}
                        {onSendWhatsApp && (
                            <button
                                type="button"
                                onClick={handleSendWhatsApp}
                                disabled={isLoading}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingAction === 'whatsapp' ? (
                                    <Loader2 className="w-4 h-4 text-green-500 dark:text-green-400 animate-spin" />
                                ) : (
                                    <FaWhatsapp className="w-4 h-4 text-green-500 dark:text-green-400" />
                                )}
                                <span>
                                    {loadingAction === 'whatsapp'
                                        ? t("Sending...") || "Sending..."
                                        : t("Send via WhatsApp") || "Send via WhatsApp"}
                                </span>
                            </button>
                        )}

                        {/* Divider before Email */}
                        {onSendEmail && <div className="border-t border-gray-200 dark:border-gray-700 my-0.5" />}

                        {/* Send via Email */}
                        {onSendEmail && (
                            <button
                                type="button"
                                onClick={handleSendEmail}
                                disabled={isLoading}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200
                                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer
                                           disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingAction === 'email' ? (
                                    <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                                ) : (
                                    <Mail className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                )}
                                <span>
                                    {loadingAction === 'email'
                                        ? t("Sending...") || "Sending..."
                                        : t("Send via Email") || "Send via Email"}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrintDropdown;