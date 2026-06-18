import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { store } from "@/redux/store";
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

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
    const convert = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    };
    const bil = Math.floor(num / 1000000000);
    const mil = Math.floor((num % 1000000000) / 1000000);
    const thou = Math.floor((num % 1000000) / 1000);
    const rem = num % 1000;
    let r = '';
    if (bil) r += convert(bil) + ' Billion ';
    if (mil) r += convert(mil) + ' Million ';
    if (thou) r += convert(thou) + ' Thousand ';
    if (rem) r += convert(rem);
    return r.trim();
};

const amountToWords = (amount, currency = 'Saudi Riyal', subunit = 'Halala') => {
    const num = parseFloat(amount) || 0;
    const [whole, decimal] = num.toFixed(2).split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;
    let words = wholeNum > 0 ? `${currency} ${numberToWordsEnglish(wholeNum)}` : `${currency} Zero`;
    if (decimalNum > 0) words += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    words += ' Only';
    return words;
};

const getPrintedDateTime = () => {
    const now = new Date();
    const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d} ${t}`;
};

const COLORS = {
    primary: [153, 27, 27],
    secondary: [185, 28, 28],
    headerText: [255, 255, 255],
    darkText: [33, 33, 33],
    mediumText: [80, 80, 80],
    lightText: [128, 128, 128],
    tableBorder: [180, 180, 180],
    tableHeaderBg: [153, 27, 27],
    tableAltRow: [254, 245, 245],
    totalRowBg: [254, 226, 226],
    lightBg: [254, 242, 242],
};

const drawLine = (doc, x1, y, x2, color = COLORS.tableBorder, width = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x1, y, x2, y);
};

/**
 * Export Sales Return / Credit Note as downloadable PDF
 */
export const salesReturnExportPdf = (invoiceData, branchData, time = '') => {
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
        CustomerPhone = '',
        narration = '',
        againstInvoiceNo = '',
        reason = '',
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        additionalCost = 0,
        roundOff = 0,
        othercharge = 0,
        OtherChargeRemark = '',
        paymentMode = 'cash',
        CashAmount = 0,
        BankAmount = 0,
        BillBalanceAmount = 0,
    } = invoiceData;

    const formattedDate = formatDate(date);
    const validProducts = salesDetails.filter(item => item.productCode);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // ========== HEADER ==========
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentWidth, 11, 'F');
    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, y + 7.5, { align: 'center' });
    y += 11;

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

    // ========== TITLE ==========
    doc.setFillColor(...COLORS.lightBg);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX CREDIT NOTE / SALES RETURN', pageWidth / 2, y + 6.5, { align: 'center' });
    y += 12;

    // ========== CUSTOMER & RETURN INFO ==========
    const colGap = 6;
    const colWidth = (contentWidth - colGap) / 2;
    const boxStartY = y;
    const boxHeight = 36;

    // Left - Customer
    doc.setDrawColor(...COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxStartY, colWidth, boxHeight, 1.5, 1.5, 'S');

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, boxStartY, colWidth, 6, 1.5, 1.5, 'F');
    doc.rect(margin, boxStartY + 4, colWidth, 2, 'F');
    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', margin + 3, boxStartY + 4.2);

    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8);
    const leftRows = [
        { label: 'Name', value: customerName },
        { label: 'VAT No', value: customerVATNo },
        { label: 'Address', value: String(CustomerAddress || '').substring(0, 50) },
        { label: 'Phone', value: CustomerPhone },
    ];
    let rowY = boxStartY + 10.5;
    leftRows.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.mediumText);
        doc.text(row.label + ':', margin + 3, rowY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        doc.text(String(row.value || '-'), margin + 22, rowY);
        rowY += 5.5;
    });

    // Right - Return Details
    const rightX = margin + colWidth + colGap;
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(rightX, boxStartY, colWidth, boxHeight, 1.5, 1.5, 'S');

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(rightX, boxStartY, colWidth, 6, 1.5, 1.5, 'F');
    doc.rect(rightX, boxStartY + 4, colWidth, 2, 'F');
    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CREDIT NOTE DETAILS', rightX + 3, boxStartY + 4.2);

    const rightRows = [
        { label: 'Credit Note No', value: invoiceNo },
        { label: 'Date', value: formattedDate },
        { label: 'Time', value: time || '' },
        { label: 'Ref Invoice', value: againstInvoiceNo },
        { label: 'Payment', value: paymentMode ? paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1) : '' },
    ];
    rowY = boxStartY + 10.5;
    rightRows.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.mediumText);
        doc.text(row.label + ':', rightX + 3, rowY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        doc.text(String(row.value || '-'), rightX + 30, rowY);
        rowY += 5;
    });

    y = boxStartY + boxHeight + 4;

    // ========== PRODUCT TABLE ==========
    const tableColumns = [
        { header: '#', dataKey: 'sl' },
        { header: 'Product Description', dataKey: 'product' },
        { header: 'Qty', dataKey: 'qty' },
        { header: 'Unit', dataKey: 'unit' },
        { header: 'Unit Price', dataKey: 'unitPrice' },
        { header: 'VAT %', dataKey: 'vatPerc' },
        { header: 'VAT Amt', dataKey: 'vatAmt' },
        { header: 'Net Amt', dataKey: 'totalAmt' },
    ];

    const tableData = validProducts.map((item, index) => ({
        sl: String(index + 1),
        product: item.productName || '',
        qty: String(item.qty || 0),
        unit: item.productDetails?.UnitName || 'PCS',
        unitPrice: parseFloat(item.rate || 0).toFixed(decimalPart),
        vatPerc: `${item.taxRate || 0}%`,
        vatAmt: parseFloat(item.taxAmount || 0).toFixed(decimalPart),
        totalAmt: parseFloat(item.amount || 0).toFixed(decimalPart),
    }));

    const totalQty = validProducts.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);
    const totalVAT = validProducts.reduce((s, i) => s + (parseFloat(i.taxAmount) || 0), 0);
    const totalNet = validProducts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    tableData.push({
        sl: '', product: 'TOTAL', qty: totalQty.toFixed(0), unit: '',
        unitPrice: '', vatPerc: '',
        vatAmt: totalVAT.toFixed(decimalPart), totalAmt: totalNet.toFixed(decimalPart),
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
            lineColor: COLORS.tableBorder, lineWidth: 0.15,
            textColor: COLORS.darkText, font: 'helvetica',
            overflow: 'linebreak', minCellHeight: 7,
        },
        headStyles: {
            fillColor: COLORS.tableHeaderBg, textColor: COLORS.headerText,
            fontStyle: 'bold', halign: 'center', fontSize: 7.5,
            cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        },
        alternateRowStyles: { fillColor: COLORS.tableAltRow },
        columnStyles: {
            sl: { halign: 'center', cellWidth: 8 },
            product: { halign: 'left', cellWidth: 'auto' },
            qty: { halign: 'center', cellWidth: 14 },
            unit: { halign: 'center', cellWidth: 16 },
            unitPrice: { halign: 'right', cellWidth: 22 },
            vatPerc: { halign: 'center', cellWidth: 14 },
            vatAmt: { halign: 'right', cellWidth: 20 },
            totalAmt: { halign: 'right', cellWidth: 22 },
        },
        didParseCell: (data) => {
            if (data.row.index === tableData.length - 1 && data.section === 'body') {
                data.cell.styles.fillColor = COLORS.totalRowBg;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 8;
            }
        },
    });

    y = doc.lastAutoTable.finalY + 5;

    // ========== WORDS + SUMMARY ==========
    if (y > pageHeight - 85) { doc.addPage(); y = margin; }

    const wordsWidth = contentWidth * 0.52;
    const summaryWidth = contentWidth * 0.45;
    const summaryX = margin + contentWidth - summaryWidth;
    const sectionStartY = y;

    // Words box
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
    const wordsText = amountToWords(totalAmount || 0);
    const wrappedWords = doc.splitTextToSize(wordsText, wordsWidth - 6);
    doc.text(wrappedWords, margin + 3, sectionStartY + 10);

    // Summary box
    const summaryBoxHeight = 38;
    doc.roundedRect(summaryX, sectionStartY, summaryWidth, summaryBoxHeight, 1.5, 1.5, 'S');
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(summaryX, sectionStartY, summaryWidth, 5.5, 1.5, 1.5, 'F');
    doc.rect(summaryX, sectionStartY + 4, summaryWidth, 1.5, 'F');
    doc.setTextColor(...COLORS.headerText);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RETURN SUMMARY', summaryX + 3, sectionStartY + 4);

    const summaryItems = [
        { label: 'Sub Total', value: parseFloat(subTotal || 0).toFixed(decimalPart) },
        { label: 'Discount', value: parseFloat(billDiscount || 0).toFixed(decimalPart) },
        { label: 'VAT Amount', value: parseFloat(totalTax || 0).toFixed(decimalPart) },
        { label: 'Other Charges', value: parseFloat(othercharge || 0).toFixed(decimalPart) },
        { label: 'Round Off', value: parseFloat(roundOff || 0).toFixed(decimalPart) },
    ];

    let sumY = sectionStartY + 10;
    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8);
    summaryItems.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, summaryX + 3, sumY);
        doc.text(item.value, summaryX + summaryWidth - 4, sumY, { align: 'right' });
        sumY += 4.5;
    });

    drawLine(doc, summaryX + 3, sumY - 1, summaryX + summaryWidth - 3, COLORS.primary, 0.5);
    sumY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text('CREDIT TOTAL', summaryX + 3, sumY);
    doc.text(parseFloat(totalAmount || 0).toFixed(decimalPart), summaryX + summaryWidth - 4, sumY, { align: 'right' });

    y = sectionStartY + summaryBoxHeight + 4;

    // ========== REASON ==========
    if (reason && String(reason).trim()) {
        if (y > pageHeight - 30) { doc.addPage(); y = margin; }
        doc.setTextColor(...COLORS.mediumText);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Reason for Return:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        doc.text(String(reason), margin + 32, y);
        y += 6;
    }

    // ========== NARRATION ==========
    if (narration && String(narration).trim()) {
        if (y > pageHeight - 25) { doc.addPage(); y = margin; }
        doc.setTextColor(...COLORS.mediumText);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Remarks:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.darkText);
        const narrationLines = doc.splitTextToSize(String(narration), contentWidth - 25);
        doc.text(narrationLines, margin + 20, y);
        y += 4 + (narrationLines.length * 3.5);
    }

    // ========== SIGNATURE ==========
    if (y > pageHeight - 35) { doc.addPage(); y = margin; }
    y += 5;
    const sigColWidth = (contentWidth - 30) / 2;

    doc.setTextColor(...COLORS.darkText);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', margin, y);
    drawLine(doc, margin, y + 18, margin + sigColWidth, COLORS.tableBorder, 0.3);

    const acceptX = pageWidth - margin - sigColWidth;
    doc.text('Customer Signature', acceptX, y);
    drawLine(doc, acceptX, y + 18, acceptX + sigColWidth, COLORS.tableBorder, 0.3);

    // ========== PAGE NUMBERS ==========
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.lightText);
        doc.setFont('helvetica', 'normal');
        doc.text(`Printed on: ${getPrintedDateTime()}`, margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        drawLine(doc, margin, pageHeight - 10, pageWidth - margin, COLORS.tableBorder, 0.2);
    }

    // ========== SAVE ==========
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Sales_Return_${invoiceNo || 'Draft'}_${dateStr}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
};

export default salesReturnExportPdf;