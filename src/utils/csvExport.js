// src/utils/csvExport.js

/**
 * CSV Export Utility for ERP Reports
 */

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

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // Check if value needs to be quoted
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Escape double quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
};

/**
 * Convert array of objects to CSV string
 */
const arrayToCSV = (headers, data) => {
    const headerRow = headers.map(h => escapeCSVValue(h)).join(',');
    
    const dataRows = data.map(row => 
        row.map(cell => escapeCSVValue(cell)).join(',')
    );
    
    return [headerRow, ...dataRows].join('\r\n');
};

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Export report data to CSV file
 * @param {Object} config - Configuration object
 */
export const exportReportToCsv = (config) => {
    const {
        fileName = 'Report',
        companyInfo = {},
        reportInfo = {},
        columns = [],
        data = [],
        footer = null,
        includeHeader = true,
        decimalPlaces = 2
    } = config;

    if (!data || data.length === 0) {
        console.warn('No data to export');
        return false;
    }

    let csvContent = '';

    // ==================== HEADER SECTION ====================
    
    if (includeHeader) {
        // Company Info
        if (companyInfo.name) {
            csvContent += `"${companyInfo.name}"\r\n`;
        }
        if (companyInfo.address) {
            csvContent += `"${companyInfo.address}"\r\n`;
        }
        if (companyInfo.phone) {
            csvContent += `"Phone: ${companyInfo.phone}"\r\n`;
        }
        
        csvContent += '\r\n';

        // Report Info
        if (reportInfo.title) {
            csvContent += `"${reportInfo.title}"\r\n`;
        }
        if (reportInfo.subtitle) {
            csvContent += `"${reportInfo.subtitle}"\r\n`;
        }
        if (reportInfo.fromDate && reportInfo.toDate) {
            csvContent += `"Period: ${formatDate(reportInfo.fromDate)} to ${formatDate(reportInfo.toDate)}"\r\n`;
        } else if (reportInfo.toDate) {
            csvContent += `"As on: ${formatDate(reportInfo.toDate)}"\r\n`;
        }
        csvContent += `"Generated: ${formatDate(new Date())}"\r\n`;
        
        csvContent += '\r\n';
    }

    // ==================== TABLE DATA ====================

    // Headers
    const headers = columns.map(col => col.label || col.key);

    // Data rows
    const tableData = data.map((row, index) => {
        return columns.map(col => {
            let value = row[col.key];
            
            if (col.key === 'SlNo' || col.key === 'SNo') {
                return index + 1;
            }
            
            if (col.type === 'currency' || col.type === 'number') {
                return typeof value === 'number' ? 
                    Number(value).toFixed(decimalPlaces) : 
                    value || '0.00';
            }
            
            if (col.type === 'date' && value) {
                return formatDate(value);
            }
            
            return value ?? '';
        });
    });

    // Add footer row if exists
    if (footer) {
        const footerRow = columns.map((col, index) => {
            if (index === 0) return footer.label || 'Total';
            return footer[col.key] ?? '';
        });
        tableData.push(footerRow);
    }

    // Convert to CSV
    csvContent += arrayToCSV(headers, tableData);

    // ==================== SAVE FILE ====================

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const finalFileName = `${fileName}_${formatDate(new Date()).replace(/-/g, '_')}.csv`;

    if (window.electronAPI && window.electronAPI.saveFileBase64) {
        const reader = new FileReader();
        reader.onloadend = () => {
            window.electronAPI.saveFileBase64(reader.result, finalFileName);
        };
        reader.readAsDataURL(blob);
    } else if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, finalFileName);
    } else {
        // Other browsers
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', finalFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return true;
};

// ==================== PRESET CONFIGURATIONS ====================

export const createCsvReportConfig = {
    /**
     * Account Ledger Report preset
     */
    accountLedger: (options) => ({
        fileName: options.fileName || 'Account_Ledger_Report',
        companyInfo: options.companyInfo,
        reportInfo: {
            title: options.title || 'Account Ledger Report',
            subtitle: options.subtitle || options.ledgerName,
            fromDate: options.fromDate,
            toDate: options.toDate
        },
        columns: options.columns || [
            { key: 'SlNo', label: '#' },
            { key: 'Date', label: 'Date', type: 'date' },
            { key: 'voucherType', label: 'Voucher Type' },
            { key: 'voucherNo', label: 'Voucher No' },
            { key: 'Narration', label: 'Narration' },
            { key: 'Debit', label: 'Debit', type: 'currency' },
            { key: 'Credit', label: 'Credit', type: 'currency' },
            { key: 'Balance', label: 'Balance' }
        ],
        data: options.data,
        footer: options.footer,
        decimalPlaces: options.decimalPlaces || 2
    }),

    /**
     * Account Group Report preset
     */
    accountGroup: (options) => ({
        fileName: options.fileName || 'Account_Group_Report',
        companyInfo: options.companyInfo,
        reportInfo: {
            title: options.title || 'Account Group Report',
            subtitle: options.subtitle || options.groupName,
            fromDate: options.fromDate,
            toDate: options.toDate
        },
        columns: options.columns || [
            { key: 'SNo', label: 'S.No' },
            { key: 'ledgerCode', label: 'Ledger Code' },
            { key: 'ledgerName', label: 'Ledger Name' },
            { key: 'opening', label: 'Opening', type: 'currency' },
            { key: 'debit', label: 'Debit', type: 'currency' },
            { key: 'credit', label: 'Credit', type: 'currency' },
            { key: 'balance', label: 'Balance' }
        ],
        data: options.data,
        footer: options.footer,
        decimalPlaces: options.decimalPlaces || 2
    }),

    /**
     * Generic Report preset
     */
    generic: (options) => ({
        fileName: options.fileName || 'Report',
        companyInfo: options.companyInfo,
        reportInfo: options.reportInfo,
        columns: options.columns,
        data: options.data,
        footer: options.footer,
        includeHeader: options.includeHeader !== false,
        decimalPlaces: options.decimalPlaces || 2
    })
};

export default exportReportToCsv;