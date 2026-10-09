import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

/**
 * ============================================================================
 * RECEIPT VOUCHER PRINT — Type 1 — A5
 * Same architecture and layout as ReceiptVoucherPrintOne.js (A4 version),
 * scaled down to fit an A5 page (148mm x 210mm) instead of A4 (210mm x 297mm).
 * All logic (amount-in-words, letterhead/header/footer resolution, silent
 * print, PDF export) is identical — only page size, paddings, image heights
 * and font sizes are adjusted to fit the smaller sheet.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Number → words helpers (identical to A4 version, kept in sync)
// ---------------------------------------------------------------------------
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

const numberToWordsArabic = (num) => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثماني مائة', 'تسعمائة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

    if (num === 0) return 'صفر';

    const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        let result = '';
        const h = Math.floor(n / 100);
        if (h > 0) result += hundreds[h];
        const remainder = n % 100;
        if (remainder >= 10 && remainder <= 19) {
            if (result) result += ' و ';
            result += teens[remainder - 10];
        } else {
            const t = Math.floor(remainder / 10);
            const o = remainder % 10;
            if (t > 0) { if (result) result += ' و '; result += tens[t]; }
            if (o > 0) { if (result) result += ' و '; result += ones[o]; }
        }
        return result;
    };

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (billions) result += convertLessThanThousand(billions) + ' مليار ';
    if (millions) result += convertLessThanThousand(millions) + ' مليون ';
    if (thousands) result += convertLessThanThousand(thousands) + ' ألف ';
    if (remainder) result += convertLessThanThousand(remainder);

    return result.trim();
};

const amountToWords = (amount, currency = 'Saudi Riyal', currencyAr = 'ريال سعودي', subunit = 'Halala', subunitAr = 'هللة') => {
    const [whole, decimal] = Number(amount || 0).toFixed(2).toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

    let wordsEn = '';
    let wordsAr = '';

    if (wholeNum > 0) wordsEn += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    if (decimalNum > 0) wordsEn += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    wordsEn += ' Only';

    if (wholeNum > 0) wordsAr += `${currencyAr} ${numberToWordsArabic(wholeNum)}`;
    if (decimalNum > 0) wordsAr += ` و ${numberToWordsArabic(decimalNum)} ${subunitAr}`;
    wordsAr += ' فقط';

    return { english: wordsEn, arabic: wordsAr };
};

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// ---------------------------------------------------------------------------
// Fetch helper (reuse from A4 version - converts image URL to base64 dataURL)
// ---------------------------------------------------------------------------
const toDataURL = async (url) => {
    if (!url || !url.trim()) return '';
    try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => resolve(url);
            r.readAsDataURL(blob);
        });
    } catch {
        return url;
    }
};

// ---------------------------------------------------------------------------
// HTML generator — A5
// ---------------------------------------------------------------------------
export const generateReceiptVoucherHTMLA5 = async (voucherData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings || {};

    const decimalPart = generalSettings.decimalPart ?? 2;
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num || 0).toFixed(decimalPart)}`
            : Number(num || 0).toFixed(decimalPart);

    // ✅ CompanyLetterPad check — same as A4 version
    const LETTERHEAD_IMAGE_PATH = generalSettings?.CompanyLetterPad || '';
    const HEADER_IMAGE = generalSettings?.branchHeader || '';
    const FOOTER_IMAGE = generalSettings?.branchFooter || '';

    const [letterheadSrc, headerSrc, footerSrc] = await Promise.all([
        toDataURL(LETTERHEAD_IMAGE_PATH),
        toDataURL(HEADER_IMAGE),
        toDataURL(FOOTER_IMAGE),
    ]);

    // ✅ if CompanyLetterPad not null -> use it (full letterhead)
    // else -> fall back to current header/footer setup
    const useFullLetterhead = !!letterheadSrc;
    const useSeparateHeaderFooter = !useFullLetterhead && (headerSrc || footerSrc);

    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || '';

    const {
        voucherNo, date, receiptDetails = [], ReferenceNo, ReferenceDate,
        narration, totalAmount, bankCashName,
    } = voucherData;

    const grandTotal = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) !== 0)
        ? Number(totalAmount)
        : receiptDetails.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const rowsHTML = receiptDetails.map((item, index) => {
        const hasCheque = (item.chequeNo && String(item.chequeNo).trim() !== '') ||
            (item.chequeDate && item.chequeDate !== '01-01-1753');
        return `
        <tr class="particulars-row">
            <td class="col-sn">${index + 1}</td>
            <td class="col-particulars">
                <div class="ledger-name">${item.ledgerName || ''}</div>
                ${item.Narration ? `<div class="row-narration">${item.Narration}</div>` : ''}
                ${hasCheque ? `
                <div class="cheque-line">
                    <span>Cheque No: ${item.chequeNo || ''}</span>
                    <span>Cheque Date: ${item.chequeDate && item.chequeDate !== '01-01-1753' ? formatDate(item.chequeDate) : '01-Jan-1753'}</span>
                </div>` : ''}
            </td>
            <td class="col-amount">${fmt(item.amount)}</td>
        </tr>
    `;
    }).join('');

    // A5 is roughly 70% the linear size of A4 — pads/image heights scaled down accordingly
    const HEADER_PAD = useFullLetterhead ? '140px' : (useSeparateHeaderFooter ? '112px' : '14px');
    const FOOTER_PAD = useFullLetterhead ? '74px' : (useSeparateHeaderFooter ? '84px' : '14px');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt Voucher - ${voucherNo || ''}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
            <style>
                @page { size: A5; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #fff;
                    margin: 0;
                    padding: 6px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-family: "Inter", sans-serif;
                }
                .page {
                    width: 148mm;
                    min-height: 210mm;
                    background: white;
                    position: relative;
                    overflow: hidden;
                }
                .letterhead-bg {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: fill;
                    z-index: 0;
                    display: block;
                }
                .header-img {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 105px;
                    object-fit: fill;
                    object-position: center top;
                    z-index: 1;
                    display: block;
                }
                .footer-img {
                    position: absolute;
                    bottom: 0; left: 0;
                    width: 100%; height: 35px;
                    object-fit: fill;
                    object-position: center bottom;
                    z-index: 1;
                    display: block;
                }
                .header-text {
                    width: 100%;
                    padding: 14px 10px;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                }
                .header-text .company-name { font-size: 15px; font-weight: 800; }
                .header-text .company-code,
                .header-text .company-vat { font-size: 9px; margin-top: 3px; }

                .content-wrapper {
                    position: relative;
                    z-index: 2;
                    padding: ${HEADER_PAD} 16px ${FOOTER_PAD} 16px;
                }

                .heading {
                    text-align: center;
                    font-size: 14px;
                    font-weight: bold;
                    text-decoration: underline;
                    margin-bottom: 15px;
                }

                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                    margin-bottom: 13px;
                }
                .details-table td { padding: 3px 4px; vertical-align: top; }
                .details-table .label { font-weight: normal; white-space: nowrap; }
                .details-table .bold { font-weight: bold; }
                .details-table .right-label { text-align: left; }

                .particulars-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                    border: 1px solid #000;
                }
                .particulars-table th {
                    border: 1px solid #000;
                    background: #f2f2f2;
                    padding: 4px 6px;
                    font-weight: bold;
                    text-align: left;
                }
                .particulars-table td {
                    border: 1px solid #000;
                    padding: 6px;
                    vertical-align: top;
                }
                .col-sn { width: 6%; text-align: center; }
                .col-particulars { width: 68%; }
                .col-amount { width: 26%; text-align: right; }
                .particulars-table th.col-amount,
                .particulars-table th.col-sn { text-align: center; }

                .ledger-name { font-weight: 500; }
                .row-narration { font-size: 8px; color: #444; margin-top: 2px; }
                .cheque-line {
                    display: flex;
                    justify-content: flex-start;
                    gap: 20px;
                    font-size: 8px;
                    color: #333;
                    margin-top: 4px;
                }

                .particulars-table tfoot td {
                    border: 1px solid #000;
                    padding: 6px;
                    font-weight: bold;
                    font-size: 10px;
                }

                .amount-words { margin-top: 12px; font-size: 9px; }
                .amount-words-ar {
                    margin-top: 5px;
                    font-size: 9px;
                    direction: rtl;
                    text-align: right;
                }
                .narration { margin-top: 12px; font-size: 9px; }

                .print-timestamp {
                    position: absolute;
                    bottom: 7mm;
                    right: 2mm;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    transform: rotate(180deg);
                    font-size: 6px;
                    color: black;
                    opacity: 0.7;
                    z-index: 3;
                }

                @media print {
                    body { background: white; padding: 0; }
                    .page { width: 100%; min-height: 210mm; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                ${useFullLetterhead ? `
                    <img class="letterhead-bg" src="${letterheadSrc}" alt="letterhead">
                ` : useSeparateHeaderFooter ? `
                    ${headerSrc ? `<img class="header-img" src="${headerSrc}" alt="header">` : ''}
                    ${footerSrc ? `<img class="footer-img" src="${footerSrc}" alt="footer">` : ''}
                ` : `
                    <div class="header-text">
                        <div class="company-name">${companyName}</div>
                        <div class="company-code">${companyCode}</div>
                        ${companyVatNo ? `<div class="company-vat">VAT No: ${companyVatNo}</div>` : ''}
                    </div>
                `}

                <div class="print-timestamp">
                    Printed on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>

                <div class="content-wrapper">
                    <h2 class="heading">Receipt Voucher</h2>

                    <table class="details-table">
                        <tr>
                            <td class="label" style="width:14%;">Receipt No :</td>
                            <td class="bold" style="width:36%;">${voucherNo || ''}</td>
                            <td class="label right-label" style="width:14%;">Date:</td>
                            <td style="width:36%;">${formatDate(date)}</td>
                        </tr>
                        <tr>
                            <td class="label">Cash/Bank :</td>
                            <td class="bold">${bankCashName || ''}</td>
                            <td class="label right-label">Ref. No :</td>
                            <td>${ReferenceNo || ''}</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                            <td class="label right-label">Ref. Date:</td>
                            <td>${ReferenceDate ? formatDate(ReferenceDate) : ''}</td>
                        </tr>
                    </table>

                    <table class="particulars-table">
                        <thead>
                            <tr>
                                <th class="col-sn">SN</th>
                                <th class="col-particulars">Particulars</th>
                                <th class="col-amount">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="text-align:right;">Total:</td>
                                <td class="col-amount">${fmt(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="amount-words">
                        <strong>Amount in words :</strong> ${amountToWords(grandTotal,currentCurrency?.currencyName,currentCurrency?.currencyNameAr,currentCurrency?.subunitName,currentCurrency?.subunitNameAr).english}
                    </div>
                   

                    ${narration ? `<div class="narration"><strong>Narration :</strong> ${narration}</div>` : ''}
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Silent-print (Electron) or browser print fallback — A5
 */
export const printReceiptVoucherA5 = async (voucherData, branchData, time, currentCurrency) => {
    const voucherHTML = await generateReceiptVoucherHTMLA5(voucherData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a5');
            const result = await printSilent(voucherHTML, savedPrinter, 'a5');

            if (!result.success) {
                console.error('❌ [RECEIPT VOUCHER A5] Print failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [RECEIPT VOUCHER A5] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(voucherHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

/**
 * Save as PDF — A5
 */
export const saveReceiptVoucherAsPDFA5 = async (voucherData, branchData, time, currentCurrency) => {
    const voucherHTML = await generateReceiptVoucherHTMLA5(voucherData, branchData, time, currentCurrency);
    const voucherNumber = voucherData.voucherNo || 'receipt-voucher';
    const filename = `${voucherNumber}-a5.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(voucherHTML, filename);
            if (!result.success) {
                console.error('❌ [RECEIPT VOUCHER A5] PDF save failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [RECEIPT VOUCHER A5] Error saving PDF:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(voucherHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

export default printReceiptVoucherA5;