import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

/**
 * ============================================================================
 * JOURNAL VOUCHER PRINT — Type 1
 * Same architecture/design as PaymentVoucherPrintOne.js / ContraVoucherPrintOne.js
 * (which itself mirrors InvoicePrintOne.js) so every voucher/invoice in the app
 * shares one printing pipeline (silent print in Electron, browser print/PDF
 * fallback, amount in words, branch header/footer images). Layout differs from
 * Payment/Contra in one key way: Journal has separate Debit/Credit columns
 * instead of a single Amount column, and no Cash/Bank ledger line.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Number → words helpers (identical logic to Payment/Contra/Receipt/Sales
// prints — kept consistent across the whole app)
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

const toDataURL = async (url) => {
    if (!url || !url.trim()) return '';
    try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
        });
    } catch {
        return url;
    }
};

// ---------------------------------------------------------------------------
// HTML generator
// ---------------------------------------------------------------------------
export const generateJournalVoucherHTML = async (voucherData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings || {};
    const decimalPart = generalSettings.decimalPart ?? 2;
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num || 0).toFixed(decimalPart)}`
            : Number(num || 0).toFixed(decimalPart);

    const letterheadImage = generalSettings?.CompanyLetterPad || '';
    const headerImage = generalSettings?.branchHeader || '';
    const footerImage = generalSettings?.branchFooter || '';
    const [letterheadSrc, headerSrc, footerSrc] = await Promise.all([
        toDataURL(letterheadImage),
        toDataURL(headerImage),
        toDataURL(footerImage),
    ]);
    const useFullLetterhead = !!letterheadSrc;
    const useSeparateHeaderFooter = !useFullLetterhead && (headerSrc || footerSrc);
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || '';

    const {
        voucherNo,
        date,
        journalDetails = [],
        referenceNo,
        referenceDate,
        narration,
        debitTotal,
        creditTotal,
    } = voucherData;

    const grandDebitTotal = (debitTotal !== undefined && debitTotal !== null && Number(debitTotal) !== 0)
        ? Number(debitTotal)
        : journalDetails.reduce((sum, d) => sum + (parseFloat(d.debit) || 0), 0);

    const grandCreditTotal = (creditTotal !== undefined && creditTotal !== null && Number(creditTotal) !== 0)
        ? Number(creditTotal)
        : journalDetails.reduce((sum, d) => sum + (parseFloat(d.credit) || 0), 0);

    const rowsHTML = journalDetails.map((item, index) => {
        return `
        <tr class="particulars-row">
            <td class="col-sn">${index + 1}</td>
            <td class="col-particulars">
                <div class="ledger-name">${item.ledgerName || ''}</div>
                ${item.Narration ? `<div class="row-narration">${item.Narration}</div>` : ''}
                ${item.RefNo ? `<div class="row-narration">Ref No: ${item.RefNo}</div>` : ''}
            </td>
            <td class="col-amount">${parseFloat(item.debit) > 0 ? fmt(item.debit) : ''}</td>
            <td class="col-amount">${parseFloat(item.credit) > 0 ? fmt(item.credit) : ''}</td>
        </tr>
    `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Journal Voucher - ${voucherNo || ''}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #fff;
                    margin: 0;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-family: "Inter", sans-serif;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
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
                .header-image {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 150px;
                    z-index: 1;
                }
                .header-image img { width: 100%; height: 100%; object-fit: fill; display: block; }
                .footer-image {
                    position: absolute;
                    bottom: 0; left: 0;
                    width: 100%; height: 50px;
                    z-index: 1;
                }
                .footer-image img { width: 100%; height: 100%; object-fit: fill; display: block; }
                .header-text {
                    width: 100%;
                    padding: 20px 15px;
                    text-align: center;
                }
                .header-text .company-name { font-size: 20px; font-weight: 800; }
                .header-text .company-code,
                .header-text .company-vat { font-size: 12px; margin-top: 4px; }

                .content-wrapper {
                    position: relative;
                    z-index: 2;
                    padding: ${useFullLetterhead ? '200px' : (useSeparateHeaderFooter ? '160px' : '30px')} 25px ${useFullLetterhead ? '105px' : (useSeparateHeaderFooter ? '120px' : '25px')} 25px;
                }

                .heading {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    text-decoration: underline;
                    margin-bottom: 22px;
                }

                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 18px;
                }
                .details-table td {
                    padding: 4px 6px;
                    vertical-align: top;
                }
                .details-table .label { font-weight: normal; white-space: nowrap; }
                .details-table .bold { font-weight: bold; }
                .details-table .right-label { text-align: left; }

                .particulars-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    border: 1px solid #000;
                }
                .particulars-table th {
                    border: 1px solid #000;
                    background: #f2f2f2;
                    padding: 6px 8px;
                    font-weight: bold;
                    text-align: left;
                }
                .particulars-table td {
                    border: 1px solid #000;
                    padding: 8px;
                    vertical-align: top;
                }
                .col-sn { width: 6%; text-align: center; }
                .col-particulars { width: 58%; }
                .col-amount { width: 18%; text-align: right; }
                .particulars-table th.col-amount,
                .particulars-table th.col-sn { text-align: center; }

                .ledger-name { font-weight: 500; }
                .row-narration { font-size: 11px; color: #444; margin-top: 3px; }

                .particulars-table tfoot td {
                    border: 1px solid #000;
                    padding: 8px;
                    font-weight: bold;
                    font-size: 13px;
                }

                .amount-words {
                    margin-top: 16px;
                    font-size: 12px;
                }
                .amount-words-ar {
                    margin-top: 6px;
                    font-size: 12px;
                    direction: rtl;
                    text-align: right;
                }

                .narration {
                    margin-top: 16px;
                    font-size: 12px;
                }

                .print-timestamp {
                    position: absolute;
                    bottom: 10mm;
                    right: 3mm;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    transform: rotate(180deg);
                    font-size: 8px;
                    color: black;
                    opacity: 0.7;
                    z-index: 3;
                }

                @media print {
                    body { background: white; padding: 0; }
                    .page { width: 100%; min-height: 297mm; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                ${useFullLetterhead ? `
                    <img class="letterhead-bg" src="${letterheadSrc}" alt="letterhead">
                ` : useSeparateHeaderFooter ? `
                    ${headerSrc ? `<div class="header-image"><img src="${headerSrc}" alt="header"></div>` : ''}
                    ${footerSrc ? `<div class="footer-image"><img src="${footerSrc}" alt="footer"></div>` : ''}
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
                    <h2 class="heading">Journal Voucher</h2>

                    <table class="details-table">
                        <tr>
                            <td class="label" style="width:14%;">Journal No :</td>
                            <td class="bold" style="width:36%;">${voucherNo || ''}</td>
                            <td class="label right-label" style="width:14%;">Date:</td>
                            <td style="width:36%;">${formatDate(date)}</td>
                        </tr>
                        <tr>
                            <td class="label">Ref. No :</td>
                            <td>${referenceNo || ''}</td>
                            <td class="label right-label">Ref. Date:</td>
                            <td>${referenceDate ? formatDate(referenceDate) : ''}</td>
                        </tr>
                    </table>

                    <table class="particulars-table">
                        <thead>
                            <tr>
                                <th class="col-sn">SN</th>
                                <th class="col-particulars">Particulars</th>
                                <th class="col-amount">Debit</th>
                                <th class="col-amount">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="text-align:right;">Total:</td>
                                <td class="col-amount">${fmt(grandDebitTotal)}</td>
                                <td class="col-amount">${fmt(grandCreditTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="amount-words">
                        <strong>Amount in words :</strong> ${amountToWords(grandDebitTotal).english}
                    </div>
                    <div class="amount-words-ar">${amountToWords(grandDebitTotal).arabic}</div>

                    ${narration ? `<div class="narration"><strong>Narration :</strong> ${narration}</div>` : ''}
                </div>

            </div>
        </body>
        </html>
    `;
};

/**
 * Silent-print (Electron) or browser print fallback — same pattern as
 * printPaymentVoucher / printContraVoucher / printReceiptVoucher
 */
export const printJournalVoucher = async (voucherData, branchData, time, currentCurrency) => {
    const voucherHTML = await generateJournalVoucherHTML(voucherData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(voucherHTML, savedPrinter, 'a4');

            if (!result.success) {
                console.error('❌ [JOURNAL VOUCHER] Print failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [JOURNAL VOUCHER] Error:', error);
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
 * Save as PDF — same pattern as savePaymentVoucherAsPDF / saveContraVoucherAsPDF
 */
export const saveJournalVoucherAsPDF = async (voucherData, branchData, time, currentCurrency) => {
    const voucherHTML = await generateJournalVoucherHTML(voucherData, branchData, time, currentCurrency);
    const voucherNumber = voucherData.voucherNo || 'journal-voucher';
    const filename = `${voucherNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(voucherHTML, filename);
            if (!result.success) {
                console.error('❌ [JOURNAL VOUCHER] PDF save failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [JOURNAL VOUCHER] Error saving PDF:', error);
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

export default printJournalVoucher;