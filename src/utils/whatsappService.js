/**
 * WhatsApp Service — Multi-document support
 * Supports: Sales Invoice, Sales Quotation, Sales Order,
 *           Proforma Invoice, Delivery Note, Sales Return
 */

import { getDomainBySlno } from "@/lib/baseUrl";
import { isElectron } from '@/utils/electronPrint';

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

export const getCustomerPrefix = (slno) => {
    if (!slno || typeof slno !== 'string') return null;
    const match = slno.match(/^([A-Z]{2})/i);
    return match ? match[1].toUpperCase() : null;
};

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

export const generateInvoicePDFLink = (salesMasterId) =>
    generateDocumentPDFLink(salesMasterId, 'Sales Invoice');

// ─── PDF Generation & Upload ──────────────────────────────────────────────────

const loadScript = (src) =>
    new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script    = document.createElement('script');
        script.src      = src;
        script.onload   = resolve;
        script.onerror  = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });

const ensurePDFLibraries = () =>
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]);

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PDF RENDERING STRATEGY
 * ─────────────────────────────────────────────────────────────────────────
 * html2canvas (the function below, htmlToPDFBlobViaCanvas) reproducibly
 * introduces a small uniform top-inset on every text line / cell — a known
 * class of html2canvas issue caused by its own text-metrics approximation
 * (it doesn't use the browser's real text layout engine), made worse at
 * scale:2 and with small font sizes (this invoice uses 9-11px text).
 * Timing fixes (waiting for images/fonts) do NOT fix this, because it's not
 * a race condition — it's how html2canvas draws text, full stop.
 *
 * The reliable fix is to stop asking html2canvas to draw text at all.
 * When running inside Electron, we instead render the HTML in a real
 * hidden Chromium window and ask Chromium itself to print it to PDF
 * natively (webContents.printToPDF, via a new main-process IPC handler:
 * 'render-html-to-pdf-buffer'). That's the exact same rendering engine
 * used for on-screen preview/print, so there is no approximation and no
 * offset bug.
 *
 * html2canvas is kept ONLY as a fallback for the plain-browser (non-Electron)
 * case, where there's no Chromium print API available to call directly.
 * ─────────────────────────────────────────────────────────────────────────
 */
const htmlToPDFBlob = async (htmlString) => {
    if (isElectron() && window.electronAPI?.renderHtmlToPdfBuffer) {
        try {
            // main.cjs returns { success, data } on success, matching the
            // existing save-pdf convention — not a raw buffer.
            const result = await window.electronAPI.renderHtmlToPdfBuffer(htmlString);

            if (!result?.success) {
                throw new Error(result?.error || 'render-html-to-pdf-buffer returned no data');
            }

            // Electron's IPC structured-clones a Node Buffer into the
            // renderer as a plain object with numeric keys / a Uint8Array-like
            // shape depending on version — normalize defensively either way.
            const raw = result.data;
            const bytes = raw instanceof Uint8Array
                ? raw
                : new Uint8Array(raw?.data ?? raw ?? []);

            if (!bytes.length) throw new Error('PDF buffer was empty');

            return new Blob([bytes], { type: 'application/pdf' });
        } catch (err) {
            console.error('Native Electron PDF render failed, falling back to html2canvas:', err);
            // fall through to html2canvas below
        }
    }

    return htmlToPDFBlobViaCanvas(htmlString);
};
/**
 * Wait until every <img> inside a document has actually finished loading
 * (or errored out) before we measure layout / capture anything.
 *
 * Why this matters: invoice pages with a full-bleed letterhead background
 * (position:absolute, object-fit:fill, height:100% of .page) only get their
 * correct final layout height AFTER that image has loaded — browsers may
 * report a transient/incorrect scrollHeight or bounding rect before then.
 * The old code used a blind 1.4s setTimeout, which is a race: large
 * letterhead images (often the biggest asset in the whole render) can take
 * longer than that on a slow connection or first load, causing the
 * measurement to happen against a not-yet-settled layout — which is what
 * produced the "banner, then big empty gap, then content" artifact.
 */
const waitForImagesToLoad = (doc) => {
    const images = Array.from(doc.querySelectorAll('img'));
    if (images.length === 0) return Promise.resolve();

    return Promise.all(
        images.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true }); // don't hang on a broken image
                // Safety net in case neither event fires for some reason
                setTimeout(done, 5000);
            });
        }),
    );
};

/**
 * Also wait for web fonts, if the iframe document exposes a FontFaceSet —
 * text reflow after font swap can shift layout heights too.
 */
const waitForFonts = (doc) => {
    if (doc.fonts && doc.fonts.ready) {
        return doc.fonts.ready.catch(() => {});
    }
    return Promise.resolve();
};

const htmlToPDFBlobViaCanvas = async (htmlString) => {
    try {
        await ensurePDFLibraries();

        const iframe = document.createElement('iframe');
        iframe.style.cssText = [
            'position:fixed',
            'top:0',
            'left:-9999px',      // keep off-screen horizontally only
            'width:794px',        // A4 width @ 96dpi
            'height:1123px',      // fixed viewport height for layout purposes
            'border:none',
            'visibility:hidden',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(iframe);

        try {
            const iDoc = iframe.contentDocument || iframe.contentWindow.document;
            iDoc.open();
            iDoc.write(htmlString);
            iDoc.close();

            // ✅ Wait for real layout completion instead of guessing with setTimeout.
            // Order matters: fonts first (can change text height/wrapping),
            // then images (can change background/letterhead height), then
            // one more animation-frame tick to let the browser finish
            // painting after those loads resolve.
            await waitForFonts(iDoc);
            await waitForImagesToLoad(iDoc);
            await new Promise((r) => iframe.contentWindow.requestAnimationFrame(() => r()));
            await new Promise((r) => iframe.contentWindow.requestAnimationFrame(() => r()));

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation : 'portrait',
                unit        : 'mm',
                format      : 'a4',
                compress    : true,
            });

            const pageDivs = Array.from(iDoc.querySelectorAll('.page'));
            const targets  = pageDivs.length > 0 ? pageDivs : [iDoc.body];

            const SCALE = 2; // 2x for sharp text — do NOT change
            const pxToMm = 25.4 / 96;

            // ✅ A4 page height in px at 96dpi. Pages in this app's CSS are
            // fixed at `.page { width:210mm; height:297mm; }`, so we trust
            // that fixed layout height rather than scrollHeight — scrollHeight
            // is unreliable here because .letterhead-bg is position:absolute
            // (absolutely positioned elements don't reliably contribute to
            // their parent's scrollHeight), so it doesn't accurately reflect
            // how tall the visual page actually is once the background image
            // has loaded and stretched to fill it.
            const A4_HEIGHT_PX = 1123;

            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];

                // ✅ Reset any inherited scroll before each capture —
                // a secondary cause of "content pushed down" bugs when
                // capturing elements inside off-screen iframes.
                iframe.contentWindow.scrollTo(0, 0);

                const rect = target.getBoundingClientRect();
                const actualWidth = Math.ceil(rect.width) || 794;
                // Prefer the CSS-fixed page height; fall back to measured
                // rect height only if the element is unusually short (e.g.
                // a genuinely shorter thermal-style layout, not A4).
                const actualHeight = rect.height >= A4_HEIGHT_PX - 5
                    ? A4_HEIGHT_PX
                    : Math.ceil(rect.height) || A4_HEIGHT_PX;

                const canvas = await window.html2canvas(target, {
                    scale          : SCALE,
                    useCORS        : true,
                    allowTaint     : true,
                    backgroundColor: '#ffffff',
                    windowWidth    : 794,
                    windowHeight   : actualHeight,
                    width          : actualWidth,
                    height         : actualHeight,
                    scrollX        : 0,
                    scrollY        : 0,
                    x              : 0,
                    y              : 0,
                    logging        : false,
                });

                const imgW = canvas.width  / SCALE;
                const imgH = canvas.height / SCALE;

                if (i > 0) pdf.addPage();
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    0,
                    0,
                    imgW * pxToMm,
                    imgH * pxToMm,
                );
            }

            return pdf.output('blob');

        } finally {
            document.body.removeChild(iframe);
        }

    } catch (err) {
        console.error('htmlToPDFBlob error:', err);
        return null;
    }
};

/**
 * Generate invoice HTML → PDF Blob → upload → return hosted URL.
 */
export const uploadInvoicePDFAndGetLink = async (
    generateInvoiceHTML,
    invoiceData,
    branchData,
    time,
) => {
    try {
        const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time);
        if (!invoiceHTML) throw new Error('generateInvoiceHTML returned empty content');

        const pdfBlob = await htmlToPDFBlob(invoiceHTML);
        if (!pdfBlob) throw new Error('htmlToPDFBlob returned null — check console for render errors');

        const invoiceNo = invoiceData.invoiceNo || 'invoice';
        const fileName  = `${invoiceNo}.pdf`;

        const formData = new FormData();
        formData.append('pdf', pdfBlob, fileName);

        const response = await fetch(
            'https://finacerp.com/invoice/public/api/save-pdfinvoice',
            {
                method : 'POST',
                body   : formData,
            },
        );

        if (!response.ok) {
            throw new Error(`Upload HTTP error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Server error: ${result.message || 'Unknown error'}`);
        }

        if (!result.url) {
            throw new Error('Server response did not include a url field');
        }

        return result.url;

    } catch (err) {
        console.error('uploadInvoicePDFAndGetLink error:', err);
        return null;
    }
};

// ─── Message formatting ───────────────────────────────────────────────────────

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

export const sendWhatsAppMessage = (phoneNumber, message) => {
    if (!phoneNumber || !message) {
        console.error('sendWhatsAppMessage: phone and message are required');
        return false;
    }

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