import { useCallback, useState } from 'react';
import { showToast } from '@/utils/toast';
import {
    formatInvoiceMessageWithLink,
    generateDocumentPDFLink,
    sendWhatsAppMessage,
} from '@/utils/whatsappService';

/**
 * Reusable WhatsApp Modal
 *
 * Props:
 *   isOpen         {boolean}         - Controls visibility
 *   onClose        {function}        - Called when modal should close
 *   documentType   {string}          - e.g. 'Sales Invoice', 'Sales Quotation', 'Sales Order' …
 *   masterId       {number|string}   - DB master ID of the saved document
 *   invoiceNo      {string}          - Human-readable document number shown in the message
 *   formData       {object}          - Full form data (used to build the message body)
 *   defaultPhone   {string}          - Pre-filled phone (CustomerPhone / ContactNo …)
 */
const WhatsAppModal = ({
    isOpen,
    onClose,
    documentType = 'Sales Invoice',
    masterId,
    invoiceNo,
    formData = {},
    defaultPhone = '',
}) => {
    const [phone, setPhone] = useState(defaultPhone);

    // Keep phone in sync when defaultPhone changes (e.g. customer switched)
    // We only do this when the modal reopens, not while typing
    const handleOpen = useCallback(() => {
        setPhone(defaultPhone);
    }, [defaultPhone]);

    // Trigger sync on open
    if (isOpen && phone === '' && defaultPhone !== '') {
        setPhone(defaultPhone);
    }

    const isPhoneValid = phone.trim() !== '' && /\d{7,}/.test(phone);

    const handleSend = useCallback(() => {
        if (!isPhoneValid) {
            showToast.error('Please enter a valid phone number');
            return;
        }
        if (!masterId) {
            showToast.error('Please save the document first before sharing');
            return;
        }

        const pdfLink = generateDocumentPDFLink(masterId, documentType);
        if (!pdfLink) {
            showToast.error('Failed to generate PDF link');
            return;
        }

        const message = formatInvoiceMessageWithLink(formData, invoiceNo, pdfLink, documentType);

        try {
            sendWhatsAppMessage(phone, message);
            showToast.success('Opening WhatsApp…');
            onClose();
            setPhone('');
        } catch (err) {
            console.error('WhatsApp error:', err);
            showToast.error('Failed to open WhatsApp');
        }
    }, [isPhoneValid, masterId, documentType, formData, invoiceNo, phone, onClose]);

    const handleClose = useCallback(() => {
        onClose();
        setPhone('');
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center gap-2">
                            {/* WhatsApp icon */}
                            <svg viewBox="0 0 32 32" className="w-5 h-5 text-green-500 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 2C8.268 2 2 8.268 2 16c0 2.522.658 4.883 1.806 6.926L2 30l7.282-1.782A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.6a11.56 11.56 0 01-5.89-1.604l-.422-.252-4.322 1.058 1.09-4.21-.277-.434A11.563 11.563 0 014.4 16C4.4 9.594 9.594 4.4 16 4.4S27.6 9.594 27.6 16 22.406 27.6 16 27.6zm6.354-8.668c-.347-.174-2.053-1.013-2.373-1.129-.319-.116-.551-.174-.783.174-.232.347-.9 1.129-1.102 1.362-.203.232-.405.26-.752.087-.347-.174-1.464-.54-2.789-1.72-1.031-.918-1.727-2.053-1.93-2.4-.202-.347-.021-.535.152-.708.156-.155.347-.405.521-.608.174-.203.231-.347.347-.579.116-.231.058-.434-.029-.608-.087-.174-.783-1.888-1.073-2.586-.282-.678-.569-.587-.783-.597l-.666-.012c-.231 0-.608.087-.926.434-.318.347-1.217 1.189-1.217 2.9s1.246 3.365 1.42 3.597c.174.231 2.452 3.742 5.942 5.249.831.358 1.48.572 1.985.732.834.265 1.594.228 2.194.138.669-.099 2.053-.839 2.344-1.65.289-.81.289-1.505.202-1.65-.086-.145-.318-.231-.666-.405z"/>
                            </svg>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Send {documentType} via WhatsApp
                            </h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5">
                        {/* Document info pill */}
                        {invoiceNo && (
                            <div className="mb-4 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
                                Sharing: <span className="font-semibold">{documentType} #{invoiceNo}</span>
                            </div>
                        )}

                        <label
                            htmlFor="wa-phone"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                        >
                            WhatsApp Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="wa-phone"
                            type="tel"
                            autoFocus
                            placeholder="+966 50 123 4567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && isPhoneValid) handleSend(); }}
                            className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition text-sm
                                ${!phone || phone.trim() === ''
                                    ? 'border-red-300 dark:border-red-600 focus:ring-red-400'
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
                                }`}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                            Include country code for international numbers (e.g. +966…)
                        </p>
                        {phone && phone.trim() !== '' && !/\d{7,}/.test(phone) && (
                            <p className="text-xs text-red-500 mt-1">
                                Please enter a valid phone number (minimum 7 digits)
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!isPhoneValid}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition
                                ${isPhoneValid
                                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                            </svg>
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WhatsAppModal;