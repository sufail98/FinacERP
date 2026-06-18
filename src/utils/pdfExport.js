// src/utils/pdfExport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Professional PDF Export Utility for ERP Reports
 * Matches the styling of Excel exports
 */

// ==================== COLOR THEMES ====================
const THEMES = {
    blue: {
        primary: [27, 79, 114],
        secondary: [46, 134, 171],
        headerBg: [27, 79, 114],
        headerText: [255, 255, 255],
        footerBg: [213, 216, 220],
        alternateBg: [248, 249, 249],
        success: [39, 174, 96],
        danger: [231, 76, 60],
        text: [51, 51, 51],
        border: [189, 195, 199]
    },
    green: {
        primary: [30, 132, 73],
        secondary: [39, 174, 96],
        headerBg: [30, 132, 73],
        headerText: [255, 255, 255],
        footerBg: [213, 216, 220],
        alternateBg: [248, 249, 249],
        success: [39, 174, 96],
        danger: [231, 76, 60],
        text: [51, 51, 51],
        border: [189, 195, 199]
    },
    professional: {
        primary: [44, 62, 80],
        secondary: [52, 73, 94],
        headerBg: [44, 62, 80],
        headerText: [255, 255, 255],
        footerBg: [213, 216, 220],
        alternateBg: [248, 249, 249],
        success: [39, 174, 96],
        danger: [192, 57, 43],
        text: [51, 51, 51],
        border: [149, 165, 166]
    }
};

// ==================== UTILITY FUNCTIONS ====================

const formatDate = (date) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Export report data to a professionally styled PDF file
 * @param {Object} config - Configuration object
 */
export const exportReportToPdf = (config) => {
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
        pageSize = 'a4'
    } = config;

    if (!data || data.length === 0) {
        console.warn('No data to export');
        return false;
    }

    const themeColors = THEMES[theme] || THEMES.professional;
    
    // Create PDF document
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pageSize
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    let currentY = margin;

    // ==================== HEADER SECTION ====================
    
    // Company Name
    if (companyInfo.name) {
        doc.setFillColor(...themeColors.headerBg);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 12, 'F');
        
        doc.setTextColor(...themeColors.headerText);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.name, pageWidth / 2, currentY + 8, { align: 'center' });
        currentY += 12;
    }

    // Company Address & Phone
    if (companyInfo.address || companyInfo.phone) {
        doc.setFillColor(...themeColors.secondary);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
        
        doc.setTextColor(...themeColors.headerText);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const contactInfo = [
            companyInfo.address,
            companyInfo.phone ? `Phone: ${companyInfo.phone}` : ''
        ].filter(Boolean).join(' | ');
        
        doc.text(contactInfo, pageWidth / 2, currentY + 5, { align: 'center' });
        currentY += 8;
    }

    currentY += 2;

    // Report Title
    if (reportInfo.title) {
        doc.setFillColor(236, 240, 241);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
        
        doc.setTextColor(...themeColors.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(reportInfo.title, pageWidth / 2, currentY + 7, { align: 'center' });
        currentY += 10;
    }

    // Subtitle
    if (reportInfo.subtitle) {
        doc.setFillColor(236, 240, 241);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
        
        doc.setTextColor(...themeColors.text);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(reportInfo.subtitle, pageWidth / 2, currentY + 5, { align: 'center' });
        currentY += 7;
    }

    // Date Range
    if (reportInfo.fromDate || reportInfo.toDate) {
        doc.setFillColor(236, 240, 241);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
        
        doc.setTextColor(102, 102, 102);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
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

    // ==================== TABLE SECTION ====================

    // Prepare table data
    const tableHeaders = columns.map(col => col.label || col.key);
    
    const tableData = data.map((row, index) => {
        return columns.map(col => {
            let value = row[col.key];
            
            // Handle serial number columns
            if (col.key === 'SlNo' || col.key === 'SNo') {
                return String(index + 1);
            }
            
            // Handle currency and number columns
            if (col.type === 'currency' || col.type === 'number') {
                return formatCurrency(value, decimalPlaces);
            }
            
            // Handle date columns
            if (col.type === 'date' && value) {
                return formatDate(value);
            }
            
            // Handle balance column (preserve Cr/Dr suffix)
            if (col.key === 'Balance' || col.type === 'balance') {
                return String(value ?? '');
            }
            
            return String(value ?? '');
        });
    });

    // Add footer row if exists
    if (footer) {
        const footerRow = columns.map((col, index) => {
            if (index === 0) return String(footer.label || 'Total');
            if (footer[col.key] !== undefined && footer[col.key] !== null) {
                if (col.type === 'currency' || col.type === 'number') {
                    return formatCurrency(footer[col.key], decimalPlaces);
                }
                return String(footer[col.key]);
            }
            return '';
        });
        tableData.push(footerRow);
    }

    // Calculate column widths dynamically to use full page width
    const availableWidth = pageWidth - (margin * 2);
    const columnStyles = {};
    
    // Calculate total width from column definitions
    const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const hasDefinedWidths = totalDefinedWidth > 0;
    
    columns.forEach((col, index) => {
        const align = col.align || (col.type === 'currency' || col.type === 'number' ? 'right' : 'left');
        
        let cellWidth = 'auto';
        if (hasDefinedWidths && col.width) {
            // Distribute available width proportionally based on defined widths
            cellWidth = (col.width / totalDefinedWidth) * availableWidth;
        }
        
        columnStyles[index] = {
            halign: align,
            cellWidth: cellWidth,
            overflow: 'linebreak',
            cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }
        };
    });

    // Generate table using autoTable - use the imported function directly
    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: currentY,
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
            lineColor: themeColors.border,
            lineWidth: 0.1,
            textColor: themeColors.text,
            font: 'helvetica',
            overflow: 'linebreak',
            cellWidth: 'wrap'
        },
        headStyles: {
            fillColor: themeColors.headerBg,
            textColor: themeColors.headerText,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9,
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 }
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            minCellHeight: 6
        },
        alternateRowStyles: {
            fillColor: themeColors.alternateBg
        },
        columnStyles: columnStyles,
        didParseCell: (data) => {
            // Style footer row
            if (footer && data.row.index === tableData.length - 1 && data.section === 'body') {
                data.cell.styles.fillColor = themeColors.footerBg;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 9;
            }
            
            // Style balance cells with Cr/Dr
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
            // Footer with page number
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
                pageWidth / 2,
                pageHeight - 5,
                { align: 'center' }
            );
        }
    });

    // ==================== SAVE FILE ====================
    
    const finalFileName = `${fileName}_${formatDate(new Date()).replace(/-/g, '_')}.pdf`;
    doc.save(finalFileName);

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
        pageSize: options.pageSize || 'a4'
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
        pageSize: options.pageSize || 'a4'
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
        pageSize: options.pageSize || 'a4'
    })
};

export default exportReportToPdf;