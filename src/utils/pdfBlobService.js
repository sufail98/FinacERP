import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

/**
 * Renders an invoice to a PDF and returns it as a Blob (no upload, no link).
 *
 * @param {Function} generateHtmlFn - e.g. generateInvoiceOneHTML, builds the invoice's HTML string
 * @param {Object} invoiceData - invoice data for print
 * @param {Object} branchDetails - selected branch details
 * @param {String} billTime - bill time string
 * @returns {Promise<Blob|null>} PDF blob, or null on failure
 */
export const generateInvoicePdfBlob = async (
    generateHtmlFn,
    invoiceData,
    branchDetails,
    billTime
) => {
    let container = null;
    try {
        // 1. Build the invoice HTML the same way the printer/upload path does
        const htmlString = await generateHtmlFn(invoiceData, branchDetails, billTime);
        // 2. Render it off-screen so html2canvas can rasterize it
        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-9999px';
        container.style.width = '794px'; // ~A4 width at 96dpi; adjust to your template
        container.style.background = '#ffffff'; // avoid transparent -> oklch parent bleed-through
        container.innerHTML = htmlString;
        document.body.appendChild(container);

        // Give images/fonts a beat to load before rasterizing
        await new Promise((resolve) => setTimeout(resolve, 200));

        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        // 3. Convert canvas -> PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

        // 4. Return as Blob instead of saving/uploading
        return pdf.output('blob');
    } catch (error) {
        console.error('Error generating invoice PDF blob:', error);
        return null;
    } finally {
        if (container) {
            document.body.removeChild(container);
        }
    }
};