// src/utils/excelExport.js
import XLSX from 'xlsx-js-style';

/**
 * Professional Excel Export Utility for ERP Reports
 * Reusable across all report pages
 */

// ==================== COLOR THEMES ====================
const THEMES = {
  blue: {
    primary: '1B4F72',
    secondary: '2E86AB',
    accent: 'D4E6F1',
    headerBg: '1B4F72',
    headerText: 'FFFFFF',
    subHeaderBg: 'AED6F1',
    footerBg: 'D5D8DC',
    alternateBg: 'F8F9F9',
    success: '27AE60',
    danger: 'E74C3C',
    border: 'BDC3C7'
  },
  green: {
    primary: '1E8449',
    secondary: '27AE60',
    accent: 'D5F5E3',
    headerBg: '1E8449',
    headerText: 'FFFFFF',
    subHeaderBg: 'ABEBC6',
    footerBg: 'D5D8DC',
    alternateBg: 'F8F9F9',
    success: '27AE60',
    danger: 'E74C3C',
    border: 'BDC3C7'
  },
  purple: {
    primary: '6C3483',
    secondary: '8E44AD',
    accent: 'E8DAEF',
    headerBg: '6C3483',
    headerText: 'FFFFFF',
    subHeaderBg: 'D7BDE2',
    footerBg: 'D5D8DC',
    alternateBg: 'F8F9F9',
    success: '27AE60',
    danger: 'E74C3C',
    border: 'BDC3C7'
  },
  professional: {
    primary: '2C3E50',
    secondary: '34495E',
    accent: 'ECF0F1',
    headerBg: '2C3E50',
    headerText: 'FFFFFF',
    subHeaderBg: 'BDC3C7',
    footerBg: 'D5D8DC',
    alternateBg: 'F8F9F9',
    success: '27AE60',
    danger: 'C0392B',
    border: '95A5A6'
  }
};

// ==================== STYLE GENERATORS ====================

const createBorder = (color, style = 'thin') => ({
  top: { style, color: { rgb: color } },
  bottom: { style, color: { rgb: color } },
  left: { style, color: { rgb: color } },
  right: { style, color: { rgb: color } }
});

const createStyles = (theme) => ({
  companyHeader: {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.headerBg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: createBorder(theme.primary, 'medium')
  },

  companyDetails: {
    font: { sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.secondary }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: createBorder(theme.primary, 'thin')
  },

  reportTitle: {
    font: { bold: true, sz: 14, color: { rgb: theme.primary }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.accent }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  infoRow: {
    font: { bold: true, sz: 11, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.accent }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  infoLabel: {
    font: { bold: true, sz: 10, color: { rgb: '666666' }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  infoValue: {
    font: { bold: true, sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  columnHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.headerBg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: createBorder(theme.primary, 'thin')
  },

  dataLeft: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: createBorder(theme.border, 'thin')
  },

  dataCenter: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  dataRight: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  dataLeftAlt: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.alternateBg }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: createBorder(theme.border, 'thin')
  },

  dataCenterAlt: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.alternateBg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  dataRightAlt: {
    font: { sz: 10, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.alternateBg }, patternType: 'solid' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  positiveValue: {
    font: { sz: 10, color: { rgb: theme.success }, name: 'Calibri', bold: true },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  negativeValue: {
    font: { sz: 10, color: { rgb: theme.danger }, name: 'Calibri', bold: true },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.border, 'thin')
  },

  footer: {
    font: { bold: true, sz: 11, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.subHeaderBg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: createBorder(theme.primary, 'medium')
  },

  footerNumber: {
    font: { bold: true, sz: 11, color: { rgb: '333333' }, name: 'Calibri' },
    fill: { fgColor: { rgb: theme.subHeaderBg }, patternType: 'solid' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: createBorder(theme.primary, 'medium')
  },

  emptyWithBorder: {
    border: createBorder(theme.border, 'thin')
  }
});

// ==================== UTILITY FUNCTIONS ====================

const formatDate = (date, format = 'DD-MMM-YYYY') => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

const getColumnLetter = (colIndex) => {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
};

// ==================== MAIN EXPORT FUNCTION ====================

export const exportReportToExcel = (config) => {
  const {
    fileName = 'Report',
    sheetName = 'Report',
    companyInfo = {},
    reportInfo = {},
    columns = [],
    data = [],
    footer = null,
    theme = 'professional',
    decimalPlaces = 2,
    alternateRowColors = true
  } = config;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return false;
  }

  const themeColors = THEMES[theme] || THEMES.professional;
  const styles = createStyles(themeColors);
  const totalCols = columns.length;

  // ==================== BUILD WORKSHEET DATA ====================

  let wsData = [];
  let currentRow = 0;
  let merges = [];
  let rowHeights = [];

  // Row 0: Company Name
  wsData.push([companyInfo.name || 'Company Name']);
  rowHeights.push({ hpt: 30 });
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: totalCols - 1 } });
  currentRow++;

  // Row 1: Company Address
  if (companyInfo.address) {
    wsData.push([companyInfo.address]);
    rowHeights.push({ hpt: 20 });
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: totalCols - 1 } });
    currentRow++;
  }

  // Row 2: Company Phone/Email
  if (companyInfo.phone || companyInfo.email) {
    const contactInfo = [
      companyInfo.phone ? `Phone: ${companyInfo.phone}` : '',
      companyInfo.email ? `Email: ${companyInfo.email}` : ''
    ].filter(Boolean).join(' | ');
    wsData.push([contactInfo]);
    rowHeights.push({ hpt: 18 });
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: totalCols - 1 } });
    currentRow++;
  }

  // Row 3: Empty spacer
  wsData.push([]);
  rowHeights.push({ hpt: 10 });
  currentRow++;

  // Row 4: Report Title
  if (reportInfo.title) {
    wsData.push([reportInfo.title]);
    rowHeights.push({ hpt: 25 });
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: totalCols - 1 } });
    currentRow++;
  }

  // Row 5: Subtitle (e.g., Ledger Name, Group Name)
  if (reportInfo.subtitle) {
    wsData.push([reportInfo.subtitle]);
    rowHeights.push({ hpt: 22 });
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: totalCols - 1 } });
    currentRow++;
  }

  // Row 6: Date Range and Additional Info
  const dateRow = [];
  if (reportInfo.fromDate && reportInfo.toDate) {
    dateRow.push(`Period: ${formatDate(reportInfo.fromDate)} to ${formatDate(reportInfo.toDate)}`);
  }

  for (let i = dateRow.length; i < totalCols; i++) {
    if (i === totalCols - 2) {
      dateRow.push(`Generated: ${formatDate(new Date())}`);
    } else {
      dateRow.push('');
    }
  }

  wsData.push(dateRow);
  rowHeights.push({ hpt: 20 });

  if (reportInfo.fromDate && reportInfo.toDate) {
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: Math.floor(totalCols / 2) } });
    merges.push({ s: { r: currentRow, c: totalCols - 2 }, e: { r: currentRow, c: totalCols - 1 } });
  }
  currentRow++;

  // Row 7: Empty spacer
  wsData.push([]);
  rowHeights.push({ hpt: 8 });
  currentRow++;

  const headerRowIndex = currentRow;

  // Row 8: Column Headers
  const headerRow = columns.map(col => col.label || col.key);
  wsData.push(headerRow);
  rowHeights.push({ hpt: 25 });
  currentRow++;

  const dataStartRow = currentRow;

  // Data Rows
  data.forEach((row, index) => {
    const dataRow = columns.map(col => {
      let value = row[col.key];

      if (col.format && typeof col.format === 'function') {
        return col.format(value, row);
      }

      switch (col.type) {
        case 'number':
        case 'currency':
          return typeof value === 'number' ?
            Number(value).toFixed(decimalPlaces) :
            value;
        case 'date':
          return value ? formatDate(value) : '';
        default:
          return value ?? '';
      }
    });

    wsData.push(dataRow);
    rowHeights.push({ hpt: 20 });
    currentRow++;
  });

  const footerRowIndex = currentRow;

  // Footer Row
  if (footer) {
    const footerRow = columns.map((col, index) => {
      if (index === 0) return footer.label || 'Total';
      return footer[col.key] ?? '';
    });
    wsData.push(footerRow);
    rowHeights.push({ hpt: 25 });
    currentRow++;
  }

  // ==================== CREATE WORKSHEET ====================

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = columns.map(col => ({
    wch: col.width || 15
  }));

  ws['!rows'] = rowHeights;
  ws['!merges'] = merges;

  // ==================== APPLY STYLES ====================

  const applyStyle = (row, col, style) => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellRef]) {
      ws[cellRef] = { t: 's', v: '' };
    }
    ws[cellRef].s = style;
  };

  let styleRow = 0;

  // Company Name
  for (let c = 0; c < totalCols; c++) {
    applyStyle(styleRow, c, styles.companyHeader);
  }
  styleRow++;

  // Company Address
  if (companyInfo.address) {
    for (let c = 0; c < totalCols; c++) {
      applyStyle(styleRow, c, styles.companyDetails);
    }
    styleRow++;
  }

  // Company Contact
  if (companyInfo.phone || companyInfo.email) {
    for (let c = 0; c < totalCols; c++) {
      applyStyle(styleRow, c, styles.companyDetails);
    }
    styleRow++;
  }

  // Skip empty row
  styleRow++;

  // Report Title
  if (reportInfo.title) {
    for (let c = 0; c < totalCols; c++) {
      applyStyle(styleRow, c, styles.reportTitle);
    }
    styleRow++;
  }

  // Subtitle
  if (reportInfo.subtitle) {
    for (let c = 0; c < totalCols; c++) {
      applyStyle(styleRow, c, styles.infoRow);
    }
    styleRow++;
  }

  // Date range row
  for (let c = 0; c < totalCols; c++) {
    applyStyle(styleRow, c, styles.infoRow);
  }
  styleRow++;

  // Skip empty row
  styleRow++;

  // Column Headers
  for (let c = 0; c < totalCols; c++) {
    applyStyle(headerRowIndex, c, styles.columnHeader);
  }

  // Data rows
  data.forEach((row, rowIndex) => {
    const excelRow = dataStartRow + rowIndex;
    const isAlternate = alternateRowColors && rowIndex % 2 === 1;

    columns.forEach((col, colIndex) => {
      let style;
      const value = row[col.key];

      if (col.type === 'balance') {
        const strValue = String(value || '');
        const isCredit = strValue.includes('Cr') || parseFloat(strValue) < 0;
        style = isCredit ? styles.negativeValue : styles.positiveValue;

        if (isAlternate) {
          style = {
            ...style,
            fill: { fgColor: { rgb: themeColors.alternateBg }, patternType: 'solid' }
          };
        }
      } else {
        const align = col.align || (col.type === 'number' || col.type === 'currency' ? 'right' : 'left');

        if (align === 'right') {
          style = isAlternate ? styles.dataRightAlt : styles.dataRight;
        } else if (align === 'center') {
          style = isAlternate ? styles.dataCenterAlt : styles.dataCenter;
        } else {
          style = isAlternate ? styles.dataLeftAlt : styles.dataLeft;
        }
      }

      applyStyle(excelRow, colIndex, style);
    });
  });

  // Footer row
  if (footer) {
    columns.forEach((col, colIndex) => {
      const align = col.align || (col.type === 'number' || col.type === 'currency' ? 'right' : 'left');
      const style = align === 'right' ? styles.footerNumber : styles.footer;
      applyStyle(footerRowIndex, colIndex, style);
    });
  }

  // ==================== CREATE WORKBOOK AND SAVE ====================

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const finalFileName = `${fileName}_${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;

  XLSX.writeFile(wb, finalFileName);

  return true;
};

// ==================== PRESET CONFIGURATIONS ====================

export const createReportConfig = {
  /**
   * Account Ledger Report preset
   */
  accountLedger: (options) => ({
    fileName: options.fileName || 'Account_Ledger_Report',
    sheetName: options.sheetName || 'Account Ledger',
    companyInfo: options.companyInfo,
    reportInfo: {
      title: options.title || 'Account Ledger Report',
      subtitle: options.subtitle || options.ledgerName,
      fromDate: options.fromDate,
      toDate: options.toDate
    },
    columns: options.columns || [
      { key: 'SlNo', label: 'SI No', align: 'center', width: 8 },
      { key: 'Date', label: 'Date', align: 'center', width: 12, type: 'date' },
      { key: 'voucherType', label: 'Voucher Type', align: 'left', width: 16 },
      { key: 'voucherNo', label: 'Voucher No', align: 'center', width: 12 },
      { key: 'Narration', label: 'Narration', align: 'left', width: 35 },
      { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 15 },
      { key: 'Debit', label: 'Debit', align: 'right', width: 14, type: 'currency' },
      { key: 'Credit', label: 'Credit', align: 'right', width: 14, type: 'currency' },
      { key: 'Balance', label: 'Balance', align: 'right', width: 16, type: 'balance' }
    ],
    data: options.data,
    footer: options.footer,
    theme: options.theme || 'professional',
    decimalPlaces: options.decimalPlaces || 2,
    alternateRowColors: options.alternateRowColors !== false
  }),

  /**
   * Account Group Report preset
   */
  accountGroup: (options) => ({
    fileName: options.fileName || 'Account_Group_Report',
    sheetName: options.sheetName || 'Account Group',
    companyInfo: options.companyInfo,
    reportInfo: {
      title: options.title || 'Account Group Report',
      subtitle: options.subtitle || options.groupName,
      fromDate: options.fromDate,
      toDate: options.toDate
    },
    columns: options.columns || [
      { key: 'SNo', label: 'S.No', align: 'center', width: 8 },
      { key: 'ledgerCode', label: 'Ledger Code', align: 'center', width: 14 },
      { key: 'ledgerName', label: 'Ledger Name', align: 'left', width: 30 },
      { key: 'opening', label: 'Opening', align: 'right', width: 14, type: 'currency' },
      { key: 'debit', label: 'Debit', align: 'right', width: 14, type: 'currency' },
      { key: 'credit', label: 'Credit', align: 'right', width: 14, type: 'currency' },
      { key: 'balance', label: 'Balance', align: 'right', width: 16, type: 'balance' }
    ],
    data: options.data,
    footer: options.footer,
    theme: options.theme || 'professional',
    decimalPlaces: options.decimalPlaces || 2,
    alternateRowColors: options.alternateRowColors !== false
  }),

  /**
   * Trial Balance preset
   */
  trialBalance: (options) => ({
    fileName: options.fileName || 'Trial_Balance',
    sheetName: options.sheetName || 'Trial Balance',
    companyInfo: options.companyInfo,
    reportInfo: {
      title: options.title || 'Trial Balance',
      fromDate: options.fromDate,
      toDate: options.toDate
    },
    columns: options.columns || [
      { key: 'SlNo', label: 'SI No', align: 'center', width: 8 },
      { key: 'ledgerCode', label: 'Ledger Code', align: 'center', width: 12 },
      { key: 'ledgerName', label: 'Ledger Name', align: 'left', width: 30 },
      { key: 'groupName', label: 'Group', align: 'left', width: 20 },
      { key: 'openingBalance', label: 'Opening Balance', align: 'right', width: 16, type: 'currency' },
      { key: 'Debit', label: 'Debit', align: 'right', width: 14, type: 'currency' },
      { key: 'Credit', label: 'Credit', align: 'right', width: 14, type: 'currency' },
      { key: 'closingBalance', label: 'Closing Balance', align: 'right', width: 16, type: 'balance' }
    ],
    data: options.data,
    footer: options.footer,
    theme: options.theme || 'blue',
    decimalPlaces: options.decimalPlaces || 2
  }),

  /**
   * Sales Report preset
   */
  salesReport: (options) => ({
    fileName: options.fileName || 'Sales_Report',
    sheetName: options.sheetName || 'Sales Report',
    companyInfo: options.companyInfo,
    reportInfo: {
      title: options.title || 'Sales Report',
      subtitle: options.subtitle,
      fromDate: options.fromDate,
      toDate: options.toDate
    },
    columns: options.columns || [
      { key: 'SlNo', label: 'SI No', align: 'center', width: 8 },
      { key: 'date', label: 'Date', align: 'center', width: 12, type: 'date' },
      { key: 'invoiceNo', label: 'Invoice No', align: 'center', width: 14 },
      { key: 'customerName', label: 'Customer', align: 'left', width: 25 },
      { key: 'itemName', label: 'Item', align: 'left', width: 25 },
      { key: 'quantity', label: 'Qty', align: 'right', width: 10, type: 'number' },
      { key: 'rate', label: 'Rate', align: 'right', width: 12, type: 'currency' },
      { key: 'amount', label: 'Amount', align: 'right', width: 14, type: 'currency' }
    ],
    data: options.data,
    footer: options.footer,
    theme: options.theme || 'green'
  }),

  /**
   * Generic/Custom Report
   */
  generic: (options) => ({
    fileName: options.fileName || 'Report',
    sheetName: options.sheetName || 'Report',
    companyInfo: options.companyInfo,
    reportInfo: options.reportInfo,
    columns: options.columns,
    data: options.data,
    footer: options.footer,
    theme: options.theme || 'professional',
    decimalPlaces: options.decimalPlaces || 2,
    alternateRowColors: options.alternateRowColors !== false
  })
};

export default exportReportToExcel;