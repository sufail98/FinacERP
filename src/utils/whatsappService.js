/**
 * WhatsApp Service — Multi-document support
 * Supports: Sales Invoice, Sales Quotation, Sales Order,
 *           Proforma Invoice, Delivery Note, Sales Return
 */

import { getDomainBySlno } from "@/lib/baseUrl";

// ─── Route map ────────────────────────────────────────────────────────────────
const DOCUMENT_ROUTE_MAP = {
    'Sales Invoice':    'invoicepdf',
    'Sales Quotation':  'invoicepdf',
    'Sales Order':      'invoicepdf',
    'Proforma Invoice': 'invoicepdf',
    'Delivery Note':    'invoicepdf',
    'Sales Return':     'invoicepdf',
};

// ─── Emoji / label map ────────────────────────────────────────────────────────
const DOCUMENT_EMOJI_MAP = {
    'Sales Invoice':    '🧾',
    'Sales Quotation':  '📋',
    'Sales Order':      '📦',
    'Proforma Invoice': '📄',
    'Delivery Note':    '🚚',
    'Sales Return':     '↩️',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the 2-letter customer prefix from the stored slno code
 * e.g. 'TS123456' → 'TS'
 */
export const getCustomerPrefix = (slno) => {
    if (!slno || typeof slno !== 'string') return null;
    const match = slno.match(/^([A-Z]{2})/i);
    return match ? match[1].toUpperCase() : null;
};

/**
 * Build the shareable PDF-viewer URL for any supported document type.
 *
 * @param {number|string} masterId      - DB master ID
 * @param {string}        documentType  - One of the keys in DOCUMENT_ROUTE_MAP
 * @returns {string|null}
 */
export const generateDocumentPDFLink = (masterId, documentType = 'Sales Invoice') => {
    if (!masterId) {
        console.error('generateDocumentPDFLink: masterId is required');
        return null;
    }

    const routeSegment = DOCUMENT_ROUTE_MAP[documentType] ?? 'invoicepdf';

    const savedSlno = localStorage.getItem('customerSlno');
    const baseUrl   = getDomainBySlno(savedSlno);

    let url = `${baseUrl}/#/${routeSegment}/${masterId}`;

    if (savedSlno) {
        const prefix = getCustomerPrefix(savedSlno);
        if (prefix) url += `?c=${prefix}`;
    }

    return url;
};

/**
 * Backward-compatible alias used by SalesInvoiceSkin.
 */
export const generateInvoicePDFLink = (salesMasterId) =>
    generateDocumentPDFLink(salesMasterId, 'Sales Invoice');

// ─── PDF Generation & Upload ──────────────────────────────────────────────────

/**
 * Dynamically load an external script only once.
 * Resolves immediately if the script tag already exists.
 */
const loadScript = (src) =>
    new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script    = document.createElement('script');
        script.src      = src;
        script.onload   = resolve;
        script.onerror  = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });

/**
 * Ensure html2canvas and jsPDF are available on window.
 */
const ensurePDFLibraries = () =>
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]);

/**
 * Convert an HTML string into a PDF Blob.
 *
 * Strategy:
 *   1. Inject the HTML into a hidden, fixed-position iframe (same-origin).
 *   2. Wait for layout + images to settle.
 *   3. Iterate over every `.page` div (one per A4 sheet).
 *   4. Capture each page with html2canvas.
 *   5. Stitch captures into a jsPDF document and return as Blob.
 *
 * @param {string} htmlString - Full invoice HTML (including <html>, <head>, <body>)
 * @returns {Promise<Blob|null>}
 */
const htmlToPDFBlob = async (htmlString) => {
    try {
        await ensurePDFLibraries();

        return await new Promise((resolve) => {
            // ── Hidden iframe ────────────────────────────────────────────────
            const iframe = document.createElement('iframe');
            iframe.style.cssText = [
                'position:fixed',
                'top:-9999px',
                'left:-9999px',
                'width:794px',       // ≈ A4 at 96 dpi
                'height:auto',        // ✅ let content determine height — each .page div
    'min-height:1123px',  //    is independently captured; don't clip it
                'border:none',
                'visibility:hidden',
                'pointer-events:none',
            ].join(';');
            document.body.appendChild(iframe);

            const iDoc = iframe.contentDocument || iframe.contentWindow.document;
            iDoc.open();
            iDoc.write(htmlString);
            iDoc.close();

            // Give the browser time to render fonts, images, and layout.
            setTimeout(async () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({
                        orientation : 'portrait',
                        unit        : 'mm',
                        format      : 'a4',
                        compress    : true,
                    });

                    // Prefer individual .page divs; fall back to <body>.
                    const pageDivs = Array.from(iDoc.querySelectorAll('.page'));
                    const targets  = pageDivs.length > 0 ? pageDivs : [iDoc.body];

                   // ⚠️ SCALE must match the iframe viewport exactly.
  // Passing width/height DIFFERENT from the iframe size causes
  // html2canvas to rescale the layout → extra padding in cells.
  const PAGE_W_PX = 794;
  const PAGE_H_PX = 1123;
  const SCALE     = 2;   // 2× for sharp text — do NOT change
  for (let i = 0; i < targets.length; i++) {
  // AFTER
const canvas = await window.html2canvas(targets[i], {
    scale          : 2,
    useCORS        : true,
    allowTaint     : true,
    backgroundColor: '#ffffff',
    windowWidth    : 794,
    windowHeight   : 1123,
    logging        : false,
    // ✅ No width/height override — let html2canvas measure the element naturally
});

// And derive mm from actual canvas size:
const imgW   = canvas.width  / 2;   // ÷ scale
const imgH   = canvas.height / 2;
const pxToMm = 25.4 / 96;
pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgW * pxToMm, imgH * pxToMm);
  }

                    document.body.removeChild(iframe);
                    resolve(pdf.output('blob'));

                } catch (innerErr) {
                    console.error('htmlToPDFBlob render error:', innerErr);
                    document.body.removeChild(iframe);
                    resolve(null);
                }
            }, 1400); // 1.4 s — enough for web fonts + background images
        });

    } catch (err) {
        console.error('htmlToPDFBlob error:', err);
        return null;
    }
};

/**
 * Generate invoice HTML → PDF Blob → upload → return hosted URL.
 *
 * @param {Function} generateInvoiceHTML  - Async fn(invoiceData, branchData, time) → HTML string
 *                                          Import from your active print file (e.g. invoicePrintSix)
 * @param {object}   invoiceData          - Full invoice form data (same object passed to print fns)
 * @param {object}   branchData           - selectedBranchDetails from useAuth
 * @param {string}   time                 - Current time string (e.g. "03:45 PM")
 * @returns {Promise<string|null>}         - Hosted PDF URL on success, null on failure
 */
export const uploadInvoicePDFAndGetLink = async (
    generateInvoiceHTML,
    invoiceData,
    branchData,
    time,
) => {
    try {
        // 1. Render invoice HTML using the same generator the print buttons use
        const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time);
        if (!invoiceHTML) throw new Error('generateInvoiceHTML returned empty content');

        // 2. Convert rendered HTML → PDF Blob
        const pdfBlob = await htmlToPDFBlob(invoiceHTML);
        if (!pdfBlob) throw new Error('htmlToPDFBlob returned null — check console for render errors');

        // 3. Upload the Blob to the server
        const invoiceNo = invoiceData.invoiceNo || 'invoice';
        const fileName  = `${invoiceNo}.pdf`;

        const formData = new FormData();
        formData.append('pdf', pdfBlob, fileName);

        const response = await fetch(
            'https://finacerp.com/invoice/public/api/save-pdfinvoice',
            {
                method : 'POST',
                body   : formData,
                // Do NOT set Content-Type manually — the browser sets the
                // correct multipart/form-data boundary automatically.
            },
        );

        if (!response.ok) {
            throw new Error(`Upload HTTP error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Server schema: { status, error, message, path, url }
        if (result.error) {
            throw new Error(`Server error: ${result.message || 'Unknown error'}`);
        }

        if (!result.url) {
            throw new Error('Server response did not include a url field');
        }

        return result.url; // e.g. "https://finacerp.com/invoice/public/storage/pdfinvoices/invoice_xxx.pdf"

    } catch (err) {
        console.error('uploadInvoicePDFAndGetLink error:', err);
        return null;
    }
};

// ─── Message formatting ───────────────────────────────────────────────────────

/**
 * Format the WhatsApp message body.
 *
 * @param {object} formData      - Full document form data
 * @param {string} documentNo    - Human-readable document number
 * @param {string} pdfLink       - Shareable PDF URL (hosted or viewer)
 * @param {string} documentType  - Document type label
 * @returns {string}
 */
export const formatInvoiceMessageWithLink = (
    formData,
    documentNo,
    pdfLink,
    documentType = 'Sales Invoice',
) => {
    const emoji   = DOCUMENT_EMOJI_MAP[documentType] ?? '📄';
    let   message = `${emoji} *${documentType}: ${documentNo || 'N/A'}*\n\n`;
    message      += `View / Download PDF:\n${pdfLink}`;
    return message;
};

// ─── WhatsApp openers ─────────────────────────────────────────────────────────

/**
 * Open WhatsApp Web with a pre-filled message.
 * Uses Electron's openExternal when available; falls back to window.open.
 *
 * @param {string} phoneNumber - Raw phone number (any format)
 * @param {string} message
 * @returns {boolean}
 */
export const sendWhatsAppMessage = (phoneNumber, message) => {
    if (!phoneNumber || !message) {
        console.error('sendWhatsAppMessage: phone and message are required');
        return false;
    }

    // Strip spaces, dashes, parentheses, and leading zeros / plus signs
    const clean = phoneNumber
        .replace(/[\s\-\(\)]/g, '')
        .replace(/^[0+]+/, '');

    const url = `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;

    if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank');
    }

    return true;
};

/**
 * wa.me variant — works better on mobile devices.
 *
 * @param {string} phoneNumber
 * @param {string} message
 * @returns {boolean}
 */
export const sendWhatsAppMessageMobile = (phoneNumber, message) => {
    if (!phoneNumber || !message) return false;

    const clean = phoneNumber
        .replace(/[\s\-\(\)]/g, '')
        .replace(/^[0+]+/, '');

    window.open(
        `https://wa.me/${clean}?text=${encodeURIComponent(message)}`,
        '_blank',
    );

    return true;
};