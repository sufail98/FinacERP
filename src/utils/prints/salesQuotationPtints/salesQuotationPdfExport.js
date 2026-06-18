// salesQuotationPdfExport.js - Clean Professional PDF (English Only)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { store } from "@/redux/store";
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

// ===== UTILITY FUNCTIONS =====

const formatDate = (date) => {
    if (!date) return '';
    const state = store.getState().settings;
    const dateFormat = state.generalSettings?.dateformat || 'dd-MM-yyyy';
    return formatDateUtil(date, dateFormat);
};

const numberToWordsEnglish = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (billions) result += convertLessThanThousand(billions) + ' Billion ';
    if (millions) result += convertLessThanThousand(millions) + ' Million ';
    if (thousands) result += convertLessThanThousand(thousands) + ' Thousand ';
    if (remainder) result += convertLessThanThousand(remainder);

    return result.trim();
};

const amountToWordsEnglish = (amount, currency = 'Saudi Riyal', subunit = 'Halala') => {
    const num = parseFloat(amount) || 0;
    const [whole, decimal] = num.toFixed(2).split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

    let words = '';
    if (wholeNum > 0) {
        words += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    } else {
        words += `${currency} Zero`;
    }
    if (decimalNum > 0) {
        words += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    }
    words += ' Only';
    return words;
};

const getPrintedDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} ${time}`;
};

// ===== COLOR THEME =====
const COLORS = {
    primary: [27, 79, 114],       // Dark blue
    secondary: [46, 134, 171],    // Medium blue
    headerBg: [27, 79, 114],
    headerText: [255, 255, 255],
    darkText: [33, 33, 33],
    mediumText: [80, 80, 80],
    lightText: [128, 128, 128],
    tableBorder: [180, 180, 180],
    tableHeaderBg: [27, 79, 114],
    tableAltRow: [245, 248, 252],
    totalRowBg: [220, 230, 240],
    lightBg: [245, 245, 245],
    white: [255, 255, 255],
};

/**
 * Draw a simple horizontal line
 */
const drawLine = (doc, x1, y, x2, color = COLORS.tableBorder, width = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x1, y, x2, y);
};

/**
 * Export Sales Quotation as downloadable PDF - English Only, Clean Layout
 */
export const salesQuotationExportPdf = (invoiceData, branchData) => {
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const decimalPart = companyData?.decimalPart || 2;

    const companyName = branchData?.branchName || companyData?.companyName || 'Company Name';
    const companyAddress = branchData?.address || '';
    const companyPhone = branchData?.phone || '';
    const companyVatNo = branchData?.taxNo || '';

    const {
        invoiceNo = '',
        date,
        customerName = '',
        customerVATNo = '',
        CustomerAddress = '',
        customerPhone = '',
        salesMan = '',
        contactPerson = '',
        contactNo = '',
        deliveredwithin = '',
        deliverysite = '',
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        additionalCost = 0,
        roundOff = 0,
        othercharge = 0,
        paymentterms = '',
        DeliveryTerms = '',
        quatationvalidity = '',
        narration = '',
    } = invoiceData;

    const formattedDate = formatDate(date);
    const validProducts = salesDetails.filter(item => item.productCode);

    // Create PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // ========================================
    // HEADER - Company Info
    // ========================================

    // Company name bar
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(margin, y, contentWidth, 11, 'F');
    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, y + 7.5, { align: 'center' });
    y += 11;

    // Company contact bar
    const contactParts = [companyAddress, companyPhone ? `Tel: ${companyPhone}` : '', companyVatNo ? `VAT: ${companyVatNo}` : ''].filter(Boolean);
    if (contactParts.length > 0) {
        doc.setFillColor(...COLORS.secondary);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
        doc.setTextColor(...COLORS.headerText);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(contactParts.join('  |  '), pageWidth / 2, y + 4.2, { align: 'center' });
        y += 6.5;
    }

    y += 3;

    // ========================================
    // TITLE
    // ========================================
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SALES QUOTATION', pageWidth / 2, y + 6.5, { align: 'center' });
    y += 12;

    // ========================================
    // CUSTOMER & QUOTATION INFO - Two columns
    // ========================================
    const colGap = 6;
    const colWidth = (contentWidth - colGap) / 2;
    const boxStartY = y;
    const boxHeight = 32;

    // --- Left Column: Customer Details ---
    doc.setDrawColor(...COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxStartY, colWidth, boxHeight, 1.5, 1.5, 'S');

    // Title bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, boxStartY, colWidth, 6, 1.5, 1.5, 'F');
    // Cover bottom corners of title bar
    doc.rect(margin, boxStartY + 4, colWidth, 2, 'F');

    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', margin + 3, boxStartY + 4.2);

    // Customer info rows
    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8);

    const leftRows = [
        { label: 'Name', value: customerName },
        { label: 'VAT No', value: customerVATNo },
        { label: 'Address', value: String(CustomerAddress || '').substring(0, 50) },
        { label: 'Phone', value: customerPhone },
    ];

    let rowY = boxStartY + 10.5;
    leftRows.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.mediumText);
        doc.text(row.label + ':', margin + 3, rowY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        doc.text(String(row.value || '-'), margin + 22, rowY);
        rowY += 5;
    });

    // --- Right Column: Quotation Details ---
    const rightX = margin + colWidth + colGap;
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(rightX, boxStartY, colWidth, boxHeight, 1.5, 1.5, 'S');

    // Title bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(rightX, boxStartY, colWidth, 6, 1.5, 1.5, 'F');
    doc.rect(rightX, boxStartY + 4, colWidth, 2, 'F');

    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION DETAILS', rightX + 3, boxStartY + 4.2);

    const rightRows = [
        { label: 'Quotation No', value: invoiceNo },
        { label: 'Date', value: formattedDate },
        { label: 'Sales Man', value: salesMan },
        { label: 'Contact', value: contactPerson + (contactNo ? ` / ${contactNo}` : '') },
    ];

    rowY = boxStartY + 10.5;
    rightRows.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.mediumText);
        doc.text(row.label + ':', rightX + 3, rowY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        doc.text(String(row.value || '-'), rightX + 28, rowY);
        rowY += 5;
    });

    y = boxStartY + boxHeight + 4;

    // ========================================
    // PRODUCT TABLE
    // ========================================
    const tableColumns = [
        { header: '#', dataKey: 'sl' },
        { header: 'Product Description', dataKey: 'product' },
        { header: 'Qty', dataKey: 'qty' },
        { header: 'Unit Price', dataKey: 'unitPrice' },
        { header: 'Gross Amt', dataKey: 'grossValue' },
        { header: 'Discount', dataKey: 'disc' },
        { header: 'Taxable', dataKey: 'taxableAmt' },
        { header: 'VAT %', dataKey: 'vatPerc' },
        { header: 'VAT Amt', dataKey: 'vatAmt' },
        { header: 'Net Amt', dataKey: 'totalAmt' },
    ];

    const tableData = validProducts.map((item, index) => {
        const grossValue = parseFloat(item.grossAmount) || 0;
        const discAmt = parseFloat(item.discountAmount) || 0;
        const taxableAmt = grossValue - discAmt;
        return {
            sl: String(index + 1),
            product: item.productName || '',
            qty: String(item.qty || 0),
            unitPrice: parseFloat(item.rate || 0).toFixed(decimalPart),
            grossValue: grossValue.toFixed(decimalPart),
            disc: discAmt.toFixed(decimalPart),
            taxableAmt: taxableAmt.toFixed(decimalPart),
            vatPerc: `${item.taxRate || 0}%`,
            vatAmt: parseFloat(item.taxAmount || 0).toFixed(decimalPart),
            totalAmt: parseFloat(item.amount || 0).toFixed(decimalPart),
        };
    });

    // Totals
    const totalQty = validProducts.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalGrossValue = validProducts.reduce((sum, item) => sum + (parseFloat(item.grossAmount) || 0), 0);
    const totalDiscount = validProducts.reduce((sum, item) => sum + (parseFloat(item.discountAmount) || 0), 0);
    const totalTaxableAmt = validProducts.reduce((sum, item) => {
        return sum + ((parseFloat(item.grossAmount) || 0) - (parseFloat(item.discountAmount) || 0));
    }, 0);
    const totalVATAmt = validProducts.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const totalNetAmt = validProducts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Total row
    tableData.push({
        sl: '',
        product: 'TOTAL',
        qty: totalQty.toFixed(0),
        unitPrice: '',
        grossValue: totalGrossValue.toFixed(decimalPart),
        disc: totalDiscount.toFixed(decimalPart),
        taxableAmt: totalTaxableAmt.toFixed(decimalPart),
        vatPerc: '',
        vatAmt: totalVATAmt.toFixed(decimalPart),
        totalAmt: totalNetAmt.toFixed(decimalPart),
    });

    autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
            fontSize: 7.5,
            cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
            lineColor: COLORS.tableBorder,
            lineWidth: 0.15,
            textColor: COLORS.darkText,
            font: 'helvetica',
            overflow: 'linebreak',
            minCellHeight: 7,
        },
        headStyles: {
            fillColor: COLORS.tableHeaderBg,
            textColor: COLORS.headerText,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7.5,
            cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        },
        alternateRowStyles: {
            fillColor: COLORS.tableAltRow,
        },
        columnStyles: {
            sl: { halign: 'center', cellWidth: 8 },
            product: { halign: 'left', cellWidth: 'auto' },
            qty: { halign: 'center', cellWidth: 13 },
            unitPrice: { halign: 'right', cellWidth: 18 },
            grossValue: { halign: 'right', cellWidth: 19 },
            disc: { halign: 'right', cellWidth: 15 },
            taxableAmt: { halign: 'right', cellWidth: 19 },
            vatPerc: { halign: 'center', cellWidth: 12 },
            vatAmt: { halign: 'right', cellWidth: 17 },
            totalAmt: { halign: 'right', cellWidth: 20 },
        },
        didParseCell: (data) => {
            // Style total row (last row)
            if (data.row.index === tableData.length - 1 && data.section === 'body') {
                data.cell.styles.fillColor = COLORS.totalRowBg;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 8;
            }
        },
    });

    y = doc.lastAutoTable.finalY + 5;

    // ========================================
    // AMOUNT IN WORDS + SUMMARY - Side by side
    // ========================================

    // Check if we need a new page
    if (y > pageHeight - 85) {
        doc.addPage();
        y = margin;
    }

    const wordsWidth = contentWidth * 0.52;
    const summaryWidth = contentWidth * 0.45;
    const summaryX = margin + contentWidth - summaryWidth;
    const sectionStartY = y;

    // --- Amount in words (Left side) ---
    doc.setDrawColor(...COLORS.tableBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, sectionStartY, wordsWidth, 22, 1.5, 1.5, 'S');

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, sectionStartY, wordsWidth, 5.5, 1.5, 1.5, 'F');
    doc.rect(margin, sectionStartY + 4, wordsWidth, 1.5, 'F');

    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT IN WORDS', margin + 3, sectionStartY + 4);

    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const wordsText = amountToWordsEnglish(totalAmount || 0);
    const wrappedWords = doc.splitTextToSize(wordsText, wordsWidth - 6);
    doc.text(wrappedWords, margin + 3, sectionStartY + 10);

    // --- Summary (Right side) ---
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(summaryX, sectionStartY, summaryWidth, 42, 1.5, 1.5, 'S');

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(summaryX, sectionStartY, summaryWidth, 5.5, 1.5, 1.5, 'F');
    doc.rect(summaryX, sectionStartY + 4, summaryWidth, 1.5, 'F');

    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', summaryX + 3, sectionStartY + 4);

    const vatRate = validProducts.length > 0 && validProducts[0].taxRate ? validProducts[0].taxRate : 15;

    const summaryItems = [
        { label: 'Sub Total', value: parseFloat(subTotal || 0).toFixed(decimalPart) },
        { label: `VAT @${vatRate}%`, value: parseFloat(totalTax || 0).toFixed(decimalPart) },
        { label: 'Other Charges', value: parseFloat(othercharge || 0).toFixed(decimalPart) },
        { label: 'Discount', value: parseFloat(billDiscount || 0).toFixed(decimalPart) },
        { label: 'Round Off', value: parseFloat(roundOff || 0).toFixed(decimalPart) },
    ];

    let sumY = sectionStartY + 10;
    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8);

    summaryItems.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, summaryX + 3, sumY);
        doc.text(item.value, summaryX + summaryWidth - 4, sumY, { align: 'right' });
        sumY += 5;
    });

    // Grand total separator
    drawLine(doc, summaryX + 3, sumY - 1, summaryX + summaryWidth - 3, COLORS.primary, 0.5);
    sumY += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text('GRAND TOTAL', summaryX + 3, sumY);
    doc.text(parseFloat(totalAmount || 0).toFixed(decimalPart), summaryX + summaryWidth - 4, sumY, { align: 'right' });

    y = sectionStartY + 46;

    // ========================================
    // TERMS & CONDITIONS
    // ========================================
    const termsData = [
        { label: 'Payment Terms', value: paymentterms },
        { label: 'Delivery Terms', value: DeliveryTerms },
        { label: 'Quotation Validity', value: quatationvalidity },
        { label: 'Delivery Within', value: deliveredwithin },
        { label: 'Delivery Site', value: deliverysite },
        { label: 'Remarks', value: narration },
    ].filter(item => item.value && String(item.value).trim());

    if (termsData.length > 0) {
        if (y > pageHeight - 50) {
            doc.addPage();
            y = margin;
        }

        const termsBoxHeight = 7.5 + (termsData.length * 5.5) + 2;

        doc.setDrawColor(...COLORS.tableBorder);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, y, contentWidth, termsBoxHeight, 1.5, 1.5, 'S');

        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(margin, y, contentWidth, 5.5, 1.5, 1.5, 'F');
        doc.rect(margin, y + 4, contentWidth, 1.5, 'F');

        doc.setTextColor(...COLORS.headerText);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('TERMS & CONDITIONS', margin + 3, y + 4);

        let termY = y + 11;
        doc.setFontSize(8);

        termsData.forEach(item => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.mediumText);
            doc.text(item.label + ':', margin + 4, termY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.darkText);
            const termValueText = doc.splitTextToSize(String(item.value), contentWidth - 60);
            doc.text(termValueText, margin + 42, termY);
            termY += 5.5;
        });

        y += termsBoxHeight + 5;
    }

    // ========================================
    // SIGNATURE SECTION
    // ========================================
    if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
    }

    const sigColWidth = (contentWidth - 30) / 2;

    // Left: Company signature
    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + companyName, margin, y);

    y += 18;
    drawLine(doc, margin, y, margin + sigColWidth, COLORS.tableBorder, 0.3);
    y += 3;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumText);
    doc.text('Authorized Signatory', margin, y);

    // Right: Customer acceptance
    const acceptX = pageWidth - margin - sigColWidth;
    let acceptY = y - 21;

    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Confirmation & Acceptance', acceptX, acceptY);
    acceptY += 8;

    const acceptItems = [
        'Authorized Signature',
        'Name',
        'Date',
    ];

    doc.setFontSize(7.5);
    acceptItems.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.mediumText);
        doc.text(item + ':', acceptX, acceptY);
        drawLine(doc, acceptX + 30, acceptY, acceptX + sigColWidth, [200, 200, 200], 0.2);
        acceptY += 6;
    });

    // ========================================
    // FOOTER - Printed on + Page numbers
    // ========================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.lightText);
        doc.setFont('helvetica', 'normal');

        // Left: printed on
        doc.text(`Printed on: ${getPrintedDateTime()}`, margin, pageHeight - 7);

        // Center: page number
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

        // Bottom border line
        drawLine(doc, margin, pageHeight - 10, pageWidth - margin, COLORS.tableBorder, 0.2);
    }

    // ========================================
    // SAVE / DOWNLOAD
    // ========================================
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Sales_Quotation_${invoiceNo || 'Draft'}_${dateStr}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
};

export default salesQuotationExportPdf;