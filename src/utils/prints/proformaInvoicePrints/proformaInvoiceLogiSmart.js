import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

/**
 * Converts number to words (English)
 */
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

/**
 * Converts amount to words with currency
 */
const amountToWords = (amount, currency = 'Saudi Riyal', currencyAr = 'ريال سعودي', subunit = 'Halala', subunitAr = 'هللة') => {
    const [whole, decimal] = amount.toString().split('.');
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

/**
 * Formats date to display format
 */
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Row-count based pagination, tuned separately for header/footer image presence.
 * (No QR box on the last page here, so slightly more room is left for totals.)
 */
const getPageCapacities = (headerImage, footerImage) => {
    const firstPage = headerImage ? 10 : 14;
    const otherPage = (headerImage && footerImage) ? 22 : 26;
    const lastPageReserve = footerImage ? 4 : 2; // rows subtracted from capacity on the last page to leave room for totals block
    return { firstPage, otherPage, lastPageReserve };
};

const splitRowsProforma = (array, headerImage, footerImage) => {
    const { firstPage, otherPage, lastPageReserve } = getPageCapacities(headerImage, footerImage);
    const lastPageCapacity = Math.max(4, otherPage - lastPageReserve);

    if (array.length <= firstPage) {
        return [{ items: array, isFirst: true, isLast: true }];
    }

    const pages = [];
    let i = 0;
    let pageIndex = 0;

    while (i < array.length) {
        const remaining = array.length - i;
        const capacity = pageIndex === 0 ? firstPage : otherPage;

        if (remaining <= capacity) {
            if (remaining > lastPageCapacity && pageIndex !== 0) {
                const chunk = array.slice(i, i + capacity);
                pages.push({ items: chunk, isFirst: pageIndex === 0, isLast: false });
                i += capacity;
                pageIndex++;
                continue;
            }
            pages.push({ items: array.slice(i), isFirst: pageIndex === 0, isLast: true });
            i = array.length;
        } else {
            const chunk = array.slice(i, i + capacity);
            pages.push({ items: chunk, isFirst: pageIndex === 0, isLast: false });
            i += capacity;
            pageIndex++;
        }
    }

    if (!pages[pages.length - 1].isLast) {
        pages[pages.length - 1].isLast = true;
    }

    return pages;
};

/**
 * Generate the Proforma Invoice HTML — same "Logismart" layout as Print Format 14,
 * but titled PROFORMA INVOICE and with no QR code block (proforma invoices are not
 * ZATCA-reportable tax documents, so no QR is generated or shown).
 */
export const generateProformaInvoiceHTML = async (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);


    const state = store.getState().settings;

    const showTax = invoiceData.taxType !== "NA";

    const fmtPlain = (num) => Number(num).toFixed(state.generalSettings.decimalPart);

    const companyData = state.generalSettings;
    const activateRoundoff = Boolean(companyData.RoundOff);

    // Header / Footer images — same source fields as printInvoiceOne
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;

    const companyLogo = companyData.branchLogo || companyData.companyLogo || '';
    const companyName = branchData?.branchName || companyData.companyName || '';
    const companyVatNo = branchData?.taxNo || companyData.vatNo || '';

    const {
        invoiceNo,
        date,
        dueDate,
        partyName: customerName,
        partyVatNo: customerVATNo,
        partyAddress: CustomerAddress,
        LPONO: orderRefNo,
        partyRefNo: referenceNo,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        taxableAmt = 0,
        roundOff = 0,
        paymentMade = 0,
        bankDetails = {}
    } = invoiceData;
    const bankIBAN = bankDetails.ibanno || branchData?.iban || companyData.iban || '';
    const bankAccNo = bankDetails.accountNo || branchData?.accountNo || companyData.accountNo || '';
    const bankSwiftCode = bankDetails.bankSwiftCode || branchData?.swiftCode || companyData.swiftCode || '';
    const bankName = bankDetails.bankname || '';

    const effectiveSubTotal = (subTotal !== undefined && subTotal !== null && Number(subTotal) !== 0)
        ? Number(subTotal)
        : Number(taxableAmt) || 0;

    const effectiveGrandTotal = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) !== 0)
        ? Number(totalAmount)
        : Number(taxableAmt) || 0;

    const productPages = splitRowsProforma(salesDetails, headerImage, footerImage);
    const totalPages = productPages.length || 1;

    // Padding compensates for the fixed-position header/footer images (same pattern as printInvoiceOne)
    const topPadding = headerImage ? '100px' : '0px';
    const bottomPadding = footerImage ? '80px' : '0px';

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage } = pageData;
        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        return `
            <div class="page">
                ${headerImage ? `
                    <div class="header-image">
                        <img src="${headerImage}" alt="header">
                    </div>
                ` : `
                    <div class="green-band">
                        <div class="logo-area">
                            ${companyLogo
                ? `<img src="${companyLogo}" alt="logo" class="company-logo">`
                : `<div class="company-name-text">${companyName}</div>`
            }
                        </div>
                        <div class="doc-title-area">
                            <div class="doc-title">PROFORMA INVOICE / فاتورة أولية</div>
                        </div>
                    </div>
                `}

                <div class="page-body" style="padding-top:${topPadding};padding-bottom:${bottomPadding};">
                    ${headerImage ? `
                    <div class="doc-title-standalone">
                        <span>PROFORMA INVOICE / فاتورة أولية</span>
                    </div>
                    ` : ''}

                    ${isFirstPage ? `
                    <div class="meta-section">
                        <div class="bill-to">
                            <div class="bill-to-label">Bill To <span class="rtl-small">تحت محاسبته على</span></div>
                            <div class="cust-name">${customerName || ''}</div>
                            <div class="cust-line">${CustomerAddress || ''}</div>
                            ${customerVATNo ? `<div class="cust-line">VAT No : ${customerVATNo}</div>` : `<div class="cust-line">VAT No :</div>`}
                            <div class="cust-line">CR Number : ${invoiceData?.customerData?.cstNumber || ''}</div>
                        </div>
                        <div class="invoice-meta">
                            <table class="meta-table">
                                <tr><td class="meta-label">Proforma Invoice No</td><td class="meta-value"><strong>${invoiceNo || ''}</strong></td><td class="meta-ar">رقم الفاتورة الأولية</td></tr>
                                <tr><td class="meta-label">Invoice Date</td><td class="meta-value">${formatDate(date)}</td><td class="meta-ar">تاريخ الفاتورة</td></tr>
                                <tr><td class="meta-label">Order Number</td><td class="meta-value">${orderRefNo || ''}</td><td class="meta-ar">رقم طلب الشراء</td></tr>
                                <tr><td class="meta-label">Reference No</td><td class="meta-value">${referenceNo || ''}</td><td class="meta-ar">رقم المرجع</td></tr>
                                <tr><td class="meta-label">Due Date</td><td class="meta-value">${dueDate ? formatDate(dueDate) : ''}</td><td class="meta-ar">تاريخ الاستحقاق</td></tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <div style="margin-bottom:10px;text-align:center;font-weight:bold;font-size:11px;">
                        Proforma Invoice No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="item-table">
                        <div class="item-header">
                            <div class="col-sl"><div>سي</div><div>SL</div></div>
                            <div class="col-code"><div>رمز</div><div>Item code</div></div>
                            <div class="col-desc"><div>وصف السلعة</div><div>Item Description</div></div>
                            <div class="col-qty"><div>كمية</div><div>Qty</div></div>
                            <div class="col-uom"><div>وحدة</div><div>UOM</div></div>
                            <div class="col-rate"><div>معدل الوحدة</div><div>Unit Rate</div></div>
                            <div class="col-total"><div>المجموع</div><div>Total</div></div>
                            ${showTax ? `<div class="col-vatp"><div>قيمة الضريبة</div><div>VAT (15%)</div></div>` : ''}
                            <div class="col-grand"><div>المجموع الإجمالي</div><div>Grand Total</div></div>
                        </div>
                        <div class="item-body">
                            ${pageProducts.map((item, index) => {
                const globalIndex = pageStartIndex + index;
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const lineTotal = Number(item.netAmount || (qty * rate));
                return `
                                <div class="item-row">
                                    <div class="col-sl">${globalIndex + 1}</div>
                                    <div class="col-code">${item.productCode || item.itemCode || ''}</div>
                                    <div class="col-desc">
                                        <div class="desc-en">${item.productName || ''}</div>
                                        ${item.productNameArb ? `<div class="desc-ar">${item.productNameArb}</div>` : ''}
                                        ${item.productDescription ? `<div class="desc-sub">${item.productDescription}</div>` : ''}
                                    </div>
                                    <div class="col-qty">${item.qty || 0}</div>
                                    <div class="col-uom">${item.unitName || 'NOS'}</div>
                                    <div class="col-rate">${fmtPlain(rate)}</div>
                                    <div class="col-total">${fmtPlain(lineTotal)}</div>
                                    ${showTax ? `<div class="col-vatp">${fmtPlain(item?.taxAmount || 0)}</div>` : ''}
                                    <div class="col-grand">${fmtPlain(item?.amount || 0)}</div>
                                </div>
                                `;
            }).join('')}
                            ${!isLastPage ? `<div class="continuation-note">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>` : ''}
                        </div>
                    </div>

                 ${isLastPage ? `
<div class="lower-section">
    <div class="lower-col lower-bank">
   <div class="bank-box">
     <div class="bank-title">Bank- ${bankName || ""}</div>
    ${bankIBAN ? `
    <div class="bank-row"><span class="bank-label">IBAN No</span></div>
    <div class="bank-row bank-val">${bankIBAN}</div>
    ` : ''}
    <table class="bank-mini-table">
        <tr>
            <td class="bank-mini-label">ACC No.</td>
            <td class="bank-mini-label">Swift Code</td>
        </tr>
        <tr>
            <td class="bank-mini-val">${bankAccNo}</td>
            <td class="bank-mini-val">${bankSwiftCode}</td>
        </tr>
    </table>
</div>
    </div>

    <div class="lower-col lower-summary">
        <table class="totals-table">
            <tr>
                <td class="tot-label">Subtotal</td>
                <td class="tot-ar">المجموع الفرعي</td>
                <td class="tot-val">${fmtPlain(effectiveSubTotal)}</td>
            </tr>
            <tr>
                <td class="tot-label">Discount</td>
                <td class="tot-ar">الخصم</td>
                <td class="tot-val">${fmtPlain(billDiscount)}</td>
            </tr>
            ${showTax ? `
            <tr>
                <td class="tot-label">VAT (15%)</td>
                <td class="tot-ar">ضريبة القيمة المضافة</td>
                <td class="tot-val">${fmtPlain(totalTax)}</td>
            </tr>
            ` : ''}
            ${(activateRoundoff && Number(roundOff) !== 0) ? `
            <tr>
                <td class="tot-label">Round Off</td>
                <td class="tot-ar">التقريب</td>
                <td class="tot-val">${fmtPlain(roundOff)}</td>
            </tr>
            ` : ''}
            <tr class="grand-row">
                <td class="tot-label">Total Amount in SAR</td>
                <td class="tot-ar">اجمالي المبلغ</td>
                <td class="tot-val">${fmtPlain(effectiveGrandTotal)}</td>
            </tr>
        </table>
    </div>
</div>
 <div class="words-band">
                        <div class="words-band-header">
                            <span>Total Amount In Words</span>
                            <span class="rtl-small">المبلغ الإجمالي بالكلمات</span>
                        </div>
                        <div class="words-band-body">
                            <span>${amountToWords(effectiveGrandTotal).english}</span>
                            <span class="rtl-small">${amountToWords(effectiveGrandTotal).arabic}</span>
                        </div>
                    </div>
` : ''}
                </div>

                ${footerImage ? `
                    <div class="footer-image">
                        <img src="${footerImage}" alt="footer">
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PROFORMA INVOICE - ${invoiceNo}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 0; }
                * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
}
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
                    height: 297mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    overflow: hidden;
                }
                .page:last-child { margin-bottom: 0; }

                .header-image {
                    width: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    height: 90px;
                    overflow: hidden;
                }
                .header-image img {
                    width: 100%;
                    display: block;
                    height: 90px;
                    object-fit: fill;
                }

                .footer-image {
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    z-index: 1;
                    height: 90px;
                    overflow: hidden;
                }
                .footer-image img {
                    width: 100%;
                    display: block;
                    height: 90px;
                    object-fit: fill;
                }

                .green-band {
                    background: #657e6a;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 20px;
                    position: relative;
                    z-index: 2;
                }
                .logo-area { display: flex; align-items: center; }
                .company-logo { max-height: 40px; }
                .company-name-text { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
                .doc-title-area {
                    background: #657e6a;
                    padding: 8px 18px;
                    border-radius: 4px;
                }
                .doc-title { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }

              .doc-title-standalone {
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    padding: 8px 0 14px 0;
    background: #657e6a;
    margin-bottom: 12px;
    color: white;
}
                .page-body {
                    padding-left: 22px;
                    padding-right: 22px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 2;
                }

                .meta-section {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 14px;
                }
                .bill-to { font-size: 10px; width: 40%; }
                .bill-to-label { font-weight: 800; font-size: 11px; margin-bottom: 4px; display:flex; gap:8px; }
                .rtl-small { direction: rtl; font-weight: normal; font-size: 10px; color:#333; }
                .cust-name { font-weight: 700; margin-bottom: 2px; }
                .cust-line { margin-bottom: 2px; color: #333; }

                .invoice-meta { width: 55%; }
                .meta-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .meta-table td { padding: 3px 4px; border-bottom: 1px solid #e0e0e0; }
                .meta-label { font-weight: 600; width: 35%; }
                .meta-value { font-weight: 400; }
                .meta-ar { direction: rtl; text-align: right; color: #444; width: 30%; }

                .item-table { border: 1px solid #cfcfcf; font-size: 9px; }
                .item-header, .item-row {
                    display: flex;
                }
                .item-header {
                    background-color: #657e6a;
                    color: #fff;
                    font-size: 8px;
                    font-weight: bold;
                }
                .item-header > div {
                    padding: 4px 6px;
                    border-right: 1px solid rgba(255,255,255,0.3);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .item-row > div {
                    padding: 5px 6px;
                    display: flex;
                    align-items: center;
                    word-break: break-word;
                }
                .item-header > div:last-child,
                .item-row > div:last-child { border-right: none; }

                .col-sl { width: 4%; text-align: center; justify-content: center; }
                .col-code { width: 8%; }
                .col-desc { width: 30%; flex-direction: column !important; align-items: flex-start !important; justify-content: center; }
                .desc-en { font-weight: 600; }
                .desc-ar { color: #444; }
                .desc-sub { color: #666; font-size: 8px; }
                .col-qty { width: 6%; text-align: center; justify-content: center; }
                .col-uom { width: 7%; text-align: center; justify-content: center; }
                .col-rate { width: 13%; text-align: right; justify-content: flex-end; }
                .col-total { width: 12%; text-align: right; justify-content: flex-end; }
                .col-vatp { width: 10%; text-align: right; justify-content: flex-end; }
                .col-grand { width: 12%; text-align: right; justify-content: flex-end; font-weight: 700; }

                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 8px;
                    font-size: 10px;
                }

            .lower-section {
    display: flex;
    margin-top: 16px;
    border: 1px solid #333;
}
.lower-col {
    border-right: 1px solid #333;
    padding: 0;
}
.lower-col:last-child { border-right: none; }

.lower-bank { width: 45%; }
.lower-summary { width: 55%; }

.bank-box {
    padding: 6px 8px;
    font-size: 9px;
    height: 100%;
}
.bank-title { font-weight: 800; margin-bottom: 4px; text-align:center; border-bottom:1px solid #333; padding-bottom:4px; }
.bank-company { font-weight: 700; margin-bottom: 4px; text-align:center; }
.bank-row { margin-bottom: 2px; text-align:center; }
.bank-label { font-weight: 600; }
.bank-val { font-weight: 700; letter-spacing: 0.3px; }
.bank-mini-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
.bank-mini-table td { border: 1px solid #cfcfcf; padding: 3px 5px; font-size: 8.5px; text-align:center; }

.totals-table { width: 100%; height:100%; border-collapse: collapse; font-size: 10px; }
.totals-table td { padding: 2px 2px; border: 1px solid #e5e5e5; }
.tot-label { text-align: left; width: 40%; }
.tot-ar { text-align: right; direction: rtl; color: #444; width: 35%; padding-right: 12px; }
.tot-val { text-align: right; width: 25%; }
.grand-row td { font-weight: 800; border-top: 1px solid #333; border-bottom: 1px solid #333; }
.balance-row td { font-weight: 800; background: #f2f2f2; border-bottom:none; }

                .words-band { margin-top: 14px; border: 1px solid #cfcfcf; }
                .words-band-header {
                    background: #657e6a;
                    color: #fff;
                    font-weight: 700;
                    font-size: 10px;
                    padding: 5px 10px;
                    display: flex;
                    justify-content: space-between;
                }
                .words-band-body {
                    padding: 6px 10px;
                    font-size: 9.5px;
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                }

                .proforma-note {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 9px;
                    font-style: italic;
                    color: #555;
                }

                .footer-info {
                    margin-top: auto;
                    padding-top: 20px;
                    padding-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    font-size: 8.5px;
                    color: #333;
                }
                .footer-check {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: #657e6a;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    flex-shrink: 0;
                }
                .footer-text { line-height: 1.4; }
                .footer-text.center { text-align: center; flex: 1; }
                .footer-text.right { text-align: right; }
@media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; width: 100%; height: 297mm; margin-bottom: 0; }

}

            </style>
        </head>
        <body>
            ${pagesHTML}
        </body>
        </html>
    `;
};

/**
 * Main print Proforma Invoice function - SILENT PRINT
 */
export const printProformaInvoiceLogismart = async (invoiceData, branchData, time, currentCurrency) => {

    const invoiceHTML = await generateProformaInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [PROFORMA INVOICE] Printed successfully!');
            } else {
                console.error('❌ [PROFORMA INVOICE] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [PROFORMA INVOICE] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

/**
 * Save Proforma Invoice as PDF
 */
export const saveProformaInvoiceLogismartAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateProformaInvoiceHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'proforma-invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (result.success) {
                return result;
            } else {
                console.error('❌ [PROFORMA INVOICE] PDF save failed:', result.error);
                return result;
            }
        } catch (error) {
            console.error('❌ [PROFORMA INVOICE] Error saving PDF:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

export default printProformaInvoiceLogismart;