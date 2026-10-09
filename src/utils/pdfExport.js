// src/utils/pdfExport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==================== THEME ====================
// Brand color #657e6a (RGB 101, 126, 106) — a muted sage/olive green.
// All theme variants now derive from this single brand color so header bars,
// accents, borders, and zebra-striping stay visually consistent.
const THEMES = {
    blue: {
        primary: [101, 126, 106], secondary: [126, 151, 131], headerBg: [101, 126, 106],
        headerText: [255, 255, 255], footerBg: [222, 228, 223], alternateBg: [245, 247, 246],
        success: [39, 174, 96], danger: [231, 76, 60], text: [51, 51, 51], border: [189, 199, 192]
    },
    green: {
        primary: [101, 126, 106], secondary: [126, 151, 131], headerBg: [101, 126, 106],
        headerText: [255, 255, 255], footerBg: [222, 228, 223], alternateBg: [245, 247, 246],
        success: [39, 174, 96], danger: [231, 76, 60], text: [51, 51, 51], border: [189, 199, 192]
    },
    professional: {
        primary: [101, 126, 106], secondary: [81, 101, 85], headerBg: [101, 126, 106],
        headerText: [255, 255, 255], footerBg: [222, 228, 223], alternateBg: [245, 247, 246],
        success: [39, 174, 96], danger: [192, 57, 43], text: [51, 51, 51], border: [189, 199, 192]
    }
};

// ==================== FONT (Inter) ====================
// jsPDF ships only Helvetica/Times/Courier natively. To actually render
// "Inter" in the PDF (not just fall back to Helvetica), we fetch the Inter
// TTF at runtime, convert it to base64, and register it with jsPDF's VFS.
// If the font fails to load (offline, blocked CDN, etc.) we gracefully fall
// back to 'helvetica' so exports never break.
const INTER_FONT_URLS = {
    normal: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'
};

let interFontLoadPromise = null;

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

const loadInterFont = async (doc) => {
    if (interFontLoadPromise) return interFontLoadPromise;

    interFontLoadPromise = (async () => {
        try {
            const [normalRes, boldRes] = await Promise.all([
                fetch(INTER_FONT_URLS.normal),
                fetch(INTER_FONT_URLS.bold)
            ]);

            if (!normalRes.ok || !boldRes.ok) throw new Error('Inter font fetch failed');

            const [normalBuf, boldBuf] = await Promise.all([
                normalRes.arrayBuffer(),
                boldRes.arrayBuffer()
            ]);

            const normalBase64 = arrayBufferToBase64(normalBuf);
            const boldBase64 = arrayBufferToBase64(boldBuf);

            doc.addFileToVFS('Inter-Regular.ttf', normalBase64);
            doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');

            doc.addFileToVFS('Inter-Bold.ttf', boldBase64);
            doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

            return true;
        } catch (err) {
            console.warn('Could not load Inter font, falling back to Helvetica:', err);
            return false;
        }
    })();

    return interFontLoadPromise;
};

const formatDate = (date) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatCurrency = (value, decimalPlaces = 2) => {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(decimalPlaces);
};

// Fetch a remote/relative image URL and convert to base64 data URL for jsPDF.
// Returns null on any failure so callers can gracefully fall back to text.
const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const format = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
                resolve({ dataUrl: canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg'), format, width: img.naturalWidth, height: img.naturalHeight });
            } catch (err) {
                console.warn('Could not convert header/footer image (CORS?):', err);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn('Could not load header/footer image:', url);
            resolve(null);
        };
        img.src = url;
    });
};

// ==================== MAIN EXPORT FUNCTION ====================

export const exportReportToPdf = async (config) => {
    const {
        fileName = 'Report',
        companyInfo = {},
        reportInfo = {},
        columns = [],
        data = [],
        footer = null,
        theme = 'professional',
        decimalPlaces = 2,
        orientation = 'portrait',
        pageSize = 'a4',
        headerImage = null,
        footerImage = null,
        showHeaderImage = false,
        showFooterImage = false,
        branchFallbackData = {}
    } = config;

    if (!data || data.length === 0) {
        console.warn('No data to export');
        return false;
    }

    const themeColors = THEMES[theme] || THEMES.professional;

    const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

    // Try to load Inter; if it fails, fall back to Helvetica everywhere below.
    const interLoaded = await loadInterFont(doc);
    const FONT = interLoaded ? 'Inter' : 'helvetica';

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Pre-load images (async) before drawing anything
    const [headerImgData, footerImgData] = await Promise.all([
        showHeaderImage ? loadImageAsBase64(headerImage) : Promise.resolve(null),
        showFooterImage ? loadImageAsBase64(footerImage) : Promise.resolve(null)
    ]);

    // Draws the header (image or text) + title/subtitle/date block.
    // Called once up front (page 1) AND from didDrawPage for every subsequent page.
    // Returns the Y position where content (the table) should start.
    const drawHeader = () => {
        let currentY = margin;

        if (headerImgData) {
            const drawH = 90 / 96 * 25.4; // 90px @ 96dpi → mm
            const drawW = pageWidth - margin * 2;
            const x = margin;
            doc.addImage(headerImgData.dataUrl, headerImgData.format, x, currentY, drawW, drawH);
            currentY += drawH + 2;
        } else {
            const name = companyInfo.name || branchFallbackData.branchName || '';
            const address = companyInfo.address || branchFallbackData.branchAddress || '';
            const phone = companyInfo.phone || branchFallbackData.branchPhone || '';

            if (name) {
                doc.setFillColor(...themeColors.headerBg);
                doc.rect(margin, currentY, pageWidth - margin * 2, 12, 'F');
                doc.setTextColor(...themeColors.headerText);
                doc.setFontSize(16);
                doc.setFont(FONT, 'bold');
                doc.text(name, pageWidth / 2, currentY + 8, { align: 'center' });
                currentY += 12;
            }

            if (address || phone) {
                doc.setFillColor(...themeColors.secondary);
                doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
                doc.setTextColor(...themeColors.headerText);
                doc.setFontSize(9);
                doc.setFont(FONT, 'normal');
                const contactInfo = [address, phone ? `Phone: ${phone}` : ''].filter(Boolean).join(' | ');
                doc.text(contactInfo, pageWidth / 2, currentY + 5, { align: 'center' });
                currentY += 8;
            }
        }

        currentY += 2;

        if (reportInfo.title) {
            doc.setFillColor(236, 240, 237);
            doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
            doc.setTextColor(...themeColors.primary);
            doc.setFontSize(14);
            doc.setFont(FONT, 'bold');
            doc.text(reportInfo.title, pageWidth / 2, currentY + 7, { align: 'center' });
            currentY += 10;
        }

        if (reportInfo.subtitle) {
            doc.setFillColor(236, 240, 237);
            doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setTextColor(...themeColors.text);
            doc.setFontSize(11);
            doc.setFont(FONT, 'bold');
            doc.text(reportInfo.subtitle, pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 7;
        }

        if (reportInfo.fromDate || reportInfo.toDate) {
            doc.setFillColor(236, 240, 237);
            doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setTextColor(102, 102, 102);
            doc.setFontSize(9);
            doc.setFont(FONT, 'normal');

            let dateText = '';
            if (reportInfo.fromDate && reportInfo.toDate) {
                dateText = `Period: ${formatDate(reportInfo.fromDate)} to ${formatDate(reportInfo.toDate)}`;
            } else if (reportInfo.toDate) {
                dateText = `As on: ${formatDate(reportInfo.toDate)}`;
            }

            doc.text(dateText, margin + 5, currentY + 5);
            doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - margin - 5, currentY + 5, { align: 'right' });
            currentY += 7;
        }

        currentY += 2;
        return currentY;
    };

    // Draw header once for page 1 and capture the starting Y for the table
    const tableStartY = drawHeader();

    // ==================== TABLE SECTION ====================

    const tableHeaders = columns.map(col => col.label || col.key);

    const tableData = data.map((row, index) => {
        return columns.map(col => {
            let value = row[col.key];
            if (col.key === 'SlNo' || col.key === 'SNo') return String(index + 1);
            if (col.type === 'currency' || col.type === 'number') return formatCurrency(value, decimalPlaces);
            if (col.type === 'date' && value) return formatDate(value);
            if (col.key === 'Balance' || col.type === 'balance') return String(value ?? '');
            return String(value ?? '');
        });
    });

    if (footer) {
        const footerRow = columns.map((col, index) => {
            if (index === 0) return String(footer.label || 'Total');
            if (footer[col.key] !== undefined && footer[col.key] !== null) {
                if (col.type === 'currency' || col.type === 'number') return formatCurrency(footer[col.key], decimalPlaces);
                return String(footer[col.key]);
            }
            return '';
        });
        tableData.push(footerRow);
    }

    const availableWidth = pageWidth - margin * 2;
    const columnStyles = {};
    const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const hasDefinedWidths = totalDefinedWidth > 0;

    columns.forEach((col, index) => {
        const align = col.align || (col.type === 'currency' || col.type === 'number' ? 'right' : 'left');
        let cellWidth = 'auto';
        if (hasDefinedWidths && col.width) {
            cellWidth = (col.width / totalDefinedWidth) * availableWidth;
        }
        columnStyles[index] = {
            halign: align,
            cellWidth,
            overflow: 'linebreak',
            cellPadding: { top: 1, right: 1, bottom: 1, left: 1 }
        };
    });

    const footerImageHeight = footerImgData
        ? Math.min(20, (availableWidth) / (footerImgData.width / footerImgData.height))
        : 0;
    const bottomMargin = margin + (footerImgData ? footerImageHeight + 4 : 0);

    // Reserve top margin on pages 2+ equal to the header block height,
    // so autoTable doesn't draw rows under the repeated header.
    const headerBlockHeight = tableStartY - margin;

    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: tableStartY,
        margin: { left: margin, right: margin, bottom: bottomMargin, top: margin + headerBlockHeight },
        tableWidth: 'auto',
        theme: 'grid',
        styles: {
            fontSize: 11,
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
            lineColor: themeColors.border,
            lineWidth: 0.1,
            textColor: themeColors.text,
            font: FONT,
            overflow: 'linebreak',
            cellWidth: 'wrap'
        },
        headStyles: {
            fillColor: themeColors.headerBg,
            textColor: themeColors.headerText,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9,
            font: FONT,
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 }
        },
        bodyStyles: { fillColor: [255, 255, 255], minCellHeight: 6, font: FONT },
        alternateRowStyles: { fillColor: themeColors.alternateBg },
        columnStyles,
        didParseCell: (data) => {
            if (footer && data.row.index === tableData.length - 1 && data.section === 'body') {
                data.cell.styles.fillColor = themeColors.footerBg;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 9;
            }
            if (data.section === 'body') {
                const cellValue = String(data.cell.text[0] || '');
                if (cellValue.includes('Cr')) {
                    data.cell.styles.textColor = themeColors.danger;
                    data.cell.styles.fontStyle = 'bold';
                } else if (cellValue.includes('Dr')) {
                    data.cell.styles.textColor = themeColors.success;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        didDrawPage: (data) => {
            // Redraw header on every page except page 1 (already drawn above)
            if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
                drawHeader();
            }

            // Page number
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.setFont(FONT, 'normal');
            doc.text(
                `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
                pageWidth / 2,
                pageHeight - margin - (footerImgData ? footerImageHeight + 2 : 0),
                { align: 'center' }
            );

            // Footer image on every page, or fallback footer text
            if (footerImgData) {
                const drawW = availableWidth;
                const drawH = footerImageHeight;
                const x = margin;
                const y = pageHeight - margin - drawH;
                doc.addImage(footerImgData.dataUrl, footerImgData.format, x, y, drawW, drawH);
            } else if (branchFallbackData && (branchFallbackData.branchAddress || branchFallbackData.branchPhone || branchFallbackData.branchEmail)) {
                doc.setFontSize(7);
                doc.setTextColor(120, 120, 120);
                const line = [
                    branchFallbackData.branchAddress,
                    branchFallbackData.branchPhone ? `Phone: ${branchFallbackData.branchPhone}` : '',
                    branchFallbackData.branchEmail ? `Email: ${branchFallbackData.branchEmail}` : ''
                ].filter(Boolean).join(' | ');
                if (line) doc.text(line, pageWidth / 2, pageHeight - 2, { align: 'center' });
            }
        }
    });

    // ==================== SAVE FILE ====================

    const finalFileName = `${fileName}_${formatDate(new Date()).replace(/-/g, '_')}.pdf`;
    
    if (window.electronAPI && window.electronAPI.saveFileBase64) {
        const base64Data = doc.output('datauristring');
        window.electronAPI.saveFileBase64(base64Data, finalFileName);
    } else {
        doc.save(finalFileName);
    }

    return true;
};
// ==================== PRESET CONFIGURATIONS ====================

export const createPdfReportConfig = {
    accountLedger: (options) => ({
        fileName: options.fileName || 'Account_Ledger_Report',
        companyInfo: options.companyInfo,
        reportInfo: {
            title: options.title || 'A/C Ledger Report',
            subtitle: options.subtitle || options.ledgerName,
            fromDate: options.fromDate,
            toDate: options.toDate
        },
        columns: options.columns || [
            { key: 'SlNo', label: '#', align: 'center', width: 15 },
            { key: 'Date', label: 'Date', align: 'center', width: 25, type: 'date' },
            { key: 'voucherType', label: 'Voucher Type', align: 'left', width: 40 },
            { key: 'ledgerCode', label: 'Ledger Code', align: 'center', width: 25 },
            { key: 'voucherNo', label: 'Voucher No', align: 'center', width: 25 },
            { key: 'costCentre', label: 'Cost Centre', align: 'left', width: 30 },
            { key: 'Narration', label: 'Narration', align: 'left', width: 50 },
            { key: 'Debit', label: 'Debit', align: 'right', width: 30, type: 'currency' },
            { key: 'Credit', label: 'Credit', align: 'right', width: 30, type: 'currency' },
            { key: 'Balance', label: 'Balance', align: 'right', width: 35, type: 'balance' }
        ],
        data: options.data,
        footer: options.footer,
        theme: options.theme || 'professional',
        decimalPlaces: options.decimalPlaces || 2,
        orientation: options.orientation || 'landscape',
        pageSize: options.pageSize || 'a4',
        headerImage: options.headerImage || null,
        footerImage: options.footerImage || null,
        showHeaderImage: !!options.showHeaderImage,
        showFooterImage: !!options.showFooterImage,
        branchFallbackData: options.branchFallbackData || {}
    }),

    accountGroup: (options) => ({
        fileName: options.fileName || 'Account_Group_Report',
        companyInfo: options.companyInfo,
        reportInfo: {
            title: options.title || 'A/C Group Report',
            subtitle: options.subtitle || options.groupName,
            fromDate: options.fromDate,
            toDate: options.toDate
        },
        columns: options.columns || [
            { key: 'SNo', label: 'S.No', align: 'center', width: 10 },
            { key: 'ledgerCode', label: 'Ledger Code', align: 'center', width: 20 },
            { key: 'ledgerName', label: 'Ledger Name', align: 'left', width: 40 },
            { key: 'opening', label: 'Opening', align: 'right', width: 25, type: 'currency' },
            { key: 'debit', label: 'Debit', align: 'right', width: 20, type: 'currency' },
            { key: 'credit', label: 'Credit', align: 'right', width: 20, type: 'currency' },
            { key: 'balance', label: 'Balance', align: 'right', width: 25, type: 'balance' }
        ],
        data: options.data,
        footer: options.footer,
        theme: options.theme || 'professional',
        decimalPlaces: options.decimalPlaces || 2,
        orientation: options.orientation || 'landscape',
        pageSize: options.pageSize || 'a4',
        headerImage: options.headerImage || null,
        footerImage: options.footerImage || null,
        showHeaderImage: !!options.showHeaderImage,
        showFooterImage: !!options.showFooterImage,
        branchFallbackData: options.branchFallbackData || {}
    }),

    generic: (options) => ({
        fileName: options.fileName || 'Report',
        companyInfo: options.companyInfo,
        reportInfo: options.reportInfo,
        columns: options.columns,
        data: options.data,
        footer: options.footer,
        theme: options.theme || 'professional',
        decimalPlaces: options.decimalPlaces || 2,
        orientation: options.orientation || 'portrait',
        pageSize: options.pageSize || 'a4',
        headerImage: options.headerImage || null,
        footerImage: options.footerImage || null,
        showHeaderImage: !!options.showHeaderImage,
        showFooterImage: !!options.showFooterImage,
        branchFallbackData: options.branchFallbackData || {}
    })
};

export default exportReportToPdf;