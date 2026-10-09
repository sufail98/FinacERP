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
        if (h > 0) {
            result += hundreds[h];
        }

        const remainder = n % 100;

        if (remainder >= 10 && remainder <= 19) {
            if (result) result += ' و ';
            result += teens[remainder - 10];
        } else {
            const t = Math.floor(remainder / 10);
            const o = remainder % 10;

            if (t > 0) {
                if (result) result += ' و ';
                result += tens[t];
            }

            if (o > 0) {
                if (result) result += ' و ';
                result += ones[o];
            }
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

    if (wholeNum > 0) {
        wordsEn += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    }
    if (decimalNum > 0) {
        wordsEn += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    }
    wordsEn += ' Only';

    if (wholeNum > 0) {
        wordsAr += `${currencyAr} ${numberToWordsArabic(wholeNum)}`;
    }
    if (decimalNum > 0) {
        wordsAr += ` و ${numberToWordsArabic(decimalNum)} ${subunitAr}`;
    }
    wordsAr += ' فقط';

    return {
        english: wordsEn,
        arabic: wordsAr
    };
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
 * Time from CreatedDate "2026-07-22 23:32:02.99462" -> "11:32 PM"
 */
const formatTimeFromCreatedDate = (createdDate) => {
    if (!createdDate) return '';
    const timePart = String(createdDate).split(' ')[1];
    if (!timePart) return '';

    const [hourStr, minuteStr] = timePart.split(':');
    let hours = parseInt(hourStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${String(hours).padStart(2, '0')}:${minuteStr} ${ampm}`;
};

/**
 * Shrinks the font as the number gets longer so it always fits its cell
 */
const fitFont = (str, base = 10) => {
    const len = String(str).length;
    if (len <= 11) return base;
    if (len <= 13) return base - 1;
    if (len <= 15) return base - 2;
    return base - 3;
};
const fitCell = (str) => `<span style="font-size:${fitFont(str)}px">${str}</span>`;

/**
 * Pagination: first page / middle pages / last page have different capacities
 * because the last page also holds the totals box.
 */
const ROWS_FIRST_PAGE = 19;   // first page has header details + LPO row
const ROWS_MIDDLE_PAGE = 25;
const ROWS_LAST_PAGE = 15;    // totals box is taller here (Arabic words + signatures)

const paginateProducts = (items) => {
    const total = items.length;

    if (total <= ROWS_FIRST_PAGE) {
        return [{ items: items.slice(0, ROWS_FIRST_PAGE), pageType: 'only' }];
    }
    if (total <= ROWS_FIRST_PAGE + ROWS_LAST_PAGE) {
        return [
            { items: items.slice(0, ROWS_FIRST_PAGE), pageType: 'first' },
            { items: items.slice(ROWS_FIRST_PAGE), pageType: 'last' },
        ];
    }

    const pages = [];
    let cursor = 0;
    pages.push({ items: items.slice(cursor, cursor + ROWS_FIRST_PAGE), pageType: 'first' });
    cursor += ROWS_FIRST_PAGE;

    while (cursor + ROWS_LAST_PAGE < total) {
        const remaining = total - cursor;
        if (remaining <= ROWS_MIDDLE_PAGE + ROWS_LAST_PAGE) {
            const middleCount = remaining - ROWS_LAST_PAGE;
            pages.push({ items: items.slice(cursor, cursor + middleCount), pageType: 'middle' });
            cursor += middleCount;
            break;
        }
        pages.push({ items: items.slice(cursor, cursor + ROWS_MIDDLE_PAGE), pageType: 'middle' });
        cursor += ROWS_MIDDLE_PAGE;
    }

    pages.push({ items: items.slice(cursor), pageType: 'last' });
    return pages;
};

/**
 * Generate QR code data for Saudi Arabia ZATCA compliance
 */
export const generateQRCodeData = (invoiceData, companyName, vatNo, time) => {
    const formatDateForQR = (date, time) => {
        if (!date) return "";

        let dateStr = date;
        if (date instanceof Date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const finalTime = time || "00:00:00";
            return `${year}-${month}-${day}T${finalTime}`;
        }

        dateStr = String(date);
        let parts;
        if (dateStr.includes("-")) {
            parts = dateStr.split("-");
        } else if (dateStr.includes("/")) {
            parts = dateStr.split("/");
        } else {
            return "";
        }

        let day, month, year;
        if (parts[0].length === 2) {
            day = parts[0];
            month = parts[1];
            year = parts[2];
        } else {
            year = parts[0];
            month = parts[1];
            day = parts[2];
        }

        month = String(month).padStart(2, "0");
        day = String(day).padStart(2, "0");
        const finalTime = time || "00:00:00";
        return `${year}-${month}-${day}T${finalTime}`;
    };

    const lenCompanyName = new TextEncoder().encode(companyName || '').length;
    const lenVatNo = new TextEncoder().encode(vatNo || '').length;
    const invoiceTotal = String(invoiceData.totalAmount || 0);
    const lenInvoiceTotal = new TextEncoder().encode(invoiceTotal).length;
    const invoiceVatAmount = String(invoiceData.totalTax || 0);
    const lenInvoiceVatAmount = new TextEncoder().encode(invoiceVatAmount).length;
    const invoiceDate = formatDateForQR(invoiceData.date, time);
    const lenInvoiceDate = new TextEncoder().encode(invoiceDate).length;

    let qrString = '';

    qrString += String.fromCharCode(1);
    qrString += String.fromCharCode(lenCompanyName);
    qrString += companyName || '';

    qrString += String.fromCharCode(2);
    qrString += String.fromCharCode(lenVatNo);
    qrString += vatNo || '';

    qrString += String.fromCharCode(3);
    qrString += String.fromCharCode(lenInvoiceDate);
    qrString += invoiceDate;

    qrString += String.fromCharCode(4);
    qrString += String.fromCharCode(lenInvoiceTotal);
    qrString += invoiceTotal;

    qrString += String.fromCharCode(5);
    qrString += String.fromCharCode(lenInvoiceVatAmount);
    qrString += invoiceVatAmount;

    const utf8Bytes = new TextEncoder().encode(qrString);
    const base64String = btoa(String.fromCharCode(...utf8Bytes));

    return base64String;
};

/**
 * Generate the invoice HTML
 */
const generateInvoiceHTML = (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const salesSettings = state.saleSettings;
    const showLineDiscount = salesSettings?.showLineDiscount || false;

    const activateRoundoff = Boolean(generalSettings.RoundOff);
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const dpRaw = Number(generalSettings.decimalPart);
    const dp = Number.isFinite(dpRaw) ? dpRaw : 2;

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(dp)}`
            : Number(num).toFixed(dp);
    const num2 = (num) => Number(num || 0).toFixed(dp);

    const {
        invoiceNo,
        date,
        partyName,
        CreatedDate,
        partyVatNo,
        LPONO,
        partyAddress,
        paymentMode,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        othercharge = 0,
        roundOff = 0,
    } = invoiceData;

    const calcLineDiscount = (item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const grossAmt = qty * rate;
        const discPercent = Number(item.discountPercentage || 0);
        return grossAmt * (discPercent / 100);
    };

    // Totals
    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const totalDiscount = salesDetails.reduce((sum, item) => sum + calcLineDiscount(item), 0);
    const totalNetValue = salesDetails.reduce((sum, item) =>
        sum + ((Number(item.qty || 0) * Number(item.rate || 0)) - calcLineDiscount(item)), 0);

    // Pagination
    const productPages = paginateProducts(salesDetails);
    const totalPages = productPages.length;

    const formattedDateTime = `${formatDate(date)} ${formatTimeFromCreatedDate(CreatedDate)}`.trim();

    const printedOn = `${new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    })} ${new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
    })}`;

    const pagesHTML = productPages.map(({ items: pageProducts, pageType }, pageIndex) => {

        const isFirstPage = pageType === 'only' || pageType === 'first';
        const isLastPage = pageType === 'only' || pageType === 'last';

        return `
            <div class="page">
                ${headerImage ? `
                    <div class="header-image">
                        <img src="${headerImage}" alt="header">
                    </div>
                ` : `
                    <div class="header-text">
                        <div class="company-name">${companyName}</div>
                        <div class="company-code">${companyCode}</div>
                        <div class="company-vat">VAT No: ${companyVatNo}</div>
                    </div>
                `}

                <div class="print-timestamp">
                    <div class="timestamp-label">Printed on:</div>
                    <div class="timestamp-value">${printedOn}</div>
                </div>

                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>PROFORMA INVOICE</span>
                        <span>فاتورة مبدئية</span>
                    </h2>
                    <div class="header-section">
                        <div class="invoice-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">INVOICE NO<br><span class="rtl">رقم الفاتورة</span></td>
                                    <td class="bold" colspan="3">${invoiceNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">DATE<br><span class="rtl">تاريخ</span></td>
                                    <td colspan="3">${formattedDateTime}</td>
                                </tr>
                                <tr>
                                    <td class="label">SALES TYPE<br><span class="rtl">نوع المبيعات</span></td>
                                    <td class="bold">${paymentMode === 'cash' ? 'Cash Sale' : 'Credit Sale'}</td>
                                    <td class="label">LPO NO<br><span class="rtl">رقم أمر الشراء</span></td>
                                    <td class="bold">${LPONO || ''}</td>
                                </tr>
                            </table>
                        </div>

                        <div class="customer-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">Customer Name<br><span class="rtl">اسم العميل</span></td>
                                    <td class="bold">${partyName || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Customer VAT<br><span class="rtl">العميل ضريبة</span></td>
                                    <td>${partyVatNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Address<br><span class="rtl">عنوان</span></td>
                                    <td>${partyAddress || ''}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>PROFORMA INVOICE (Continued)</span>
                        <span>(تابع) فاتورة مبدئية</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Invoice No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                            <div class="col-sl"><div>رقم سي</div><div>SL No</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
                            <div class="col-qty"><div>وحدة</div><div>UNIT</div></div>
                            <div class="col-price"><div>سعر الوحدة</div><div>UNIT PRICE</div></div>
                            ${showLineDiscount ? `<div class="col-disc-amt"><div>مبلغ الخصم</div><div>DISC AMT</div></div>` : ''}
                            <div class="col-net"><div>صافي القيمة</div><div>NET VALUE</div></div>
                            <div class="col-vat-percent"><div>ضريبة %</div><div>VAT %</div></div>
                            <div class="col-vat-amt"><div>مبلغ الضريبة</div><div>VAT AMT</div></div>
                            <div class="col-total"><div>المبلغ الإجمالي</div><div>TOTAL AMT</div></div>
                        </div>

                        <div class="product-body">
                            ${pageProducts.map((item, index) => {
                                const globalIndex = pageIndex === 0
                                    ? index
                                    : ROWS_FIRST_PAGE + (pageIndex - 1) * ROWS_MIDDLE_PAGE + index;

                                const discAmt = calcLineDiscount(item);
                                const netAmt = (Number(item.qty || 0) * Number(item.rate || 0)) - discAmt;

                                return `
                                    <div class="product-row">
                                        <div class="col-sl" style="font-size: 10px;">${globalIndex + 1}</div>
                                        <div class="col-product">
                                            <div style="font-weight: 600; font-size: 10px;">
                                                ${item.productName || ''}${item.productNameArb ? ' ' + item.productNameArb : ''}
                                            </div>
                                            ${item.productDescription ? `<div style="font-size: 10px; color: #555;">${item.productDescription}</div>` : ''}
                                        </div>
                                        <div class="col-qty" style="font-size: 10px;">${item.qty || 0}</div>
                                        <div class="col-qty" style="font-size: 10px;">${item.unitName || 'PCS'}</div>
                                        <div class="col-price" style="font-size: 10px;">${fitCell(num2(item.rate))}</div>
                                        ${showLineDiscount ? `<div class="col-disc-amt" style="font-size: 10px;">${fitCell(num2(discAmt))}</div>` : ''}
                                        <div class="col-net" style="font-size: 10px;">${fitCell(num2(netAmt))}</div>
                                        <div class="col-vat-percent" style="font-size: 10px;">${item.taxRate || 0}%</div>
                                        <div class="col-vat-amt" style="font-size: 10px;">${fitCell(num2(item.taxAmount))}</div>
                                        <div class="col-total" style="font-size: 10px;">${fitCell(num2(item.amount))}</div>
                                    </div>
                                `;
                            }).join('')}

                            <!-- one filler row stretches to fill the remaining height,
                                 so the table (and its column borders) always reaches the footer -->
                            <div class="product-row filler-row">
                                <div class="col-sl"></div>
                                <div class="col-product"></div>
                                <div class="col-qty"></div>
                                <div class="col-qty"></div>
                                <div class="col-price"></div>
                                ${showLineDiscount ? `<div class="col-disc-amt"></div>` : ''}
                                <div class="col-net"></div>
                                <div class="col-vat-percent"></div>
                                <div class="col-vat-amt"></div>
                                <div class="col-total"></div>
                            </div>

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page...</div>
                            ` : ''}
                        </div>

                        ${isLastPage ? `
                        <div class="product-footer">
                            <div class="col-sl"></div>
                            <div class="col-product" style="font-weight: 800;">
                                TOTAL / <span>المجموع</span>
                            </div>
                            <div class="col-qty">${totalQty.toFixed(0)}</div>
                            <div class="col-qty"></div>
                            <div class="col-price"></div>
                            ${showLineDiscount ? `<div class="col-disc-amt">${fitCell(fmt(totalDiscount))}</div>` : ''}
                            <div class="col-net">${fitCell(fmt(totalNetValue))}</div>
                            <div class="col-vat-percent"></div>
                            <div class="col-vat-amt">${fitCell(fmt(totalVAT))}</div>
                            <div class="col-total">${fitCell(fmt(totalAmount))}</div>
                        </div>
                        ` : ''}
                    </div>

                    ${isLastPage ? `
                    <div class="total-section-fixed">
                        <div class="total-section">
                            <div class="total-left-side">
                                <div>
                                    <div style="font-weight: 900;">Amount In Words <span>المبلغ بالكلمات</span> :-</div>
                                    <div style="margin-top: 10px;">${amountToWords(totalAmount || 0).english}</div>
                                    <div style="margin-top: 10px;text-align:right;">${amountToWords(totalAmount || 0).arabic}</div>
                                </div>
                                <div class="signature-section-compact">
                                    <div><span style="font-size: 9px; font-weight: 700;">AUTHORIZED SIGNATURE</span></div>
                                    <div><span style="font-size: 9px; font-weight: 700;">CUSTOMER SIGNATURE</span></div>
                                </div>
                            </div>
                            <div class="total-right-side">
                                <table>
                                    <tr>
                                        <td style="text-align: left;">Sub Total</td>
                                        <td style="text-align: right;padding-right:15px;"><span>المجموع الفرعي</span> <span>:</span></td>
                                        <td style="text-align: right;">${fmt(subTotal || 0)}</td>
                                    </tr>
                                    ${Number(othercharge) !== 0 ? `
                                    <tr>
                                        <td style="text-align: left;">Other Charge</td>
                                        <td style="text-align: right;padding-right:15px;"><span>رسوم اخرى</span> <span>:</span></td>
                                        <td style="text-align: right;">${fmt(othercharge)}</td>
                                    </tr>` : ""}

                                    ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0) ? `
                                    <tr>
                                        <td style="text-align: left;">Discount Amount</td>
                                        <td style="text-align: right;padding-right:15px;"><span>مبلغ الخصم</span> <span>:</span></td>
                                        <td style="text-align: right;">${fmt(billDiscount || 0)}</td>
                                    </tr>` : ""}

                                    <tr>
                                        <td style="text-align: left;">Taxable Amount</td>
                                        <td style="text-align: right;padding-right:15px;"><span>المبلغ الخاضع للضريبة</span> <span>:</span></td>
                                        <td style="text-align: right;">
                                            ${fmt(
                                                Number(subTotal || 0) -
                                                Number(billDiscount || 0) +
                                                Number(othercharge || 0)
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: left;">VAT Amount</td>
                                        <td style="text-align: right;padding-right:15px;"><span>مبلغ الضريبة</span> <span>:</span></td>
                                        <td style="text-align: right;">${fmt(totalTax || 0)}</td>
                                    </tr>
                                    ${activateRoundoff && Number(roundOff) !== 0 ? `
                                    <tr>
                                        <td style="text-align: left;">Round Off</td>
                                        <td style="text-align: right;padding-right:15px;"><span>تقريب</span> <span>:</span></td>
                                        <td style="text-align: right;">${fmt(roundOff || 0)}</td>
                                    </tr>` : ""}

                                    <tr>
                                        <th style="text-align: left; font-size: 20px;">Grand Total</th>
                                        <th style="text-align: right;padding-right:15px;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                        <th style="text-align: right; font-size: 20px;">${fmt(totalAmount || 0)}</th>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${footerImage ? `
                    <div class="footer-image">
                        <img src="${footerImage}" alt="footer">
                    </div>
                ` : `
                    <div class="footer-image"></div>
                `}
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

                /* ---------- PAGE LAYOUT ---------- */
                .page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    padding-bottom: 100px;   /* room for the footer image */
                }
                .page:last-child { margin-bottom: 0; }

                .header-image { width: 100%; flex: 0 0 auto; position: relative; z-index: 1; line-height: 0; height: 120px; overflow: hidden; }
                .header-image img { width: 100%; height: 100%; display: block; object-fit: fill; }
                .header-text { width: 100%; flex: 0 0 auto; position: relative; z-index: 1; padding: 20px 15px; text-align: center; }
                .header-text .company-name { font-size: 20px; font-weight: 800; }
                .header-text .company-code,
                .header-text .company-vat { font-size: 12px; margin-top: 4px; }

                .footer-image { width: 100%; position: absolute; bottom: 10px; left: 0; z-index: 1; height: 80px; overflow: hidden; }
                .footer-image img { width: 100%; height: 100%; display: block; object-fit: fill; }

                .content-wrapper {
                    flex: 1 1 auto;
                    min-height: 0;
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    padding: 10px 25px 0 25px;
                }

                /* totals box is now in normal flow, directly under the table */
                .total-section-fixed {
                    flex-shrink: 0;
                    margin: 10px 0 0 0;
                    z-index: 2;
                }

                .print-timestamp {
                    position: absolute;
                    bottom: 15mm;
                    right: 10mm;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    transform: rotate(180deg);
                    font-size: 8px;
                    color: black;
                    z-index: 10;
                    display: flex;
                    gap: 3px;
                    opacity: 0.8;
                }
                .timestamp-label { font-weight: bold; color: #444; }
                .timestamp-value { font-weight: normal; white-space: nowrap; }

                /* ---------- HEADING + DETAILS ---------- */
                .heading {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    font-size: 22px;
                    margin: 0 0 30px 0;
                    font-weight: bold;
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: 1px solid rgb(216, 216, 216);
                    padding-top: 5px;
                    padding-bottom: 5px;
                }
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                    gap: 15px;
                }
                .invoice-details-section { flex: 1; }
                .customer-details-section { flex: 1; }
                .details-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .details-table td {
                    border: 1px solid rgb(216, 216, 216);
                    padding: 4px 8px;
                    vertical-align: top;
                }
                .details-table .label { font-weight: bold; width: 100px; }
                .rtl { direction: rtl; text-align: right; }
                .bold { font-weight: bold; }

                /* ---------- PRODUCT TABLE (fills remaining page height) ---------- */
                .product-table {
                    border: 1px solid rgb(216, 216, 216);
                    font-size: 14px;
                    display: flex;
                    flex-direction: column;
                    flex: 1 1 auto;
                    min-height: 0;
                }
                .product-body {
                    display: flex;
                    flex-direction: column;
                    flex: 1 1 auto;
                    min-height: 0;
                }
                .product-header, .product-row, .product-footer {
                    flex-shrink: 0;
                    display: flex;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .filler-row { flex: 1 1 auto; border-bottom: none; }

                .product-header {
                    background-color: rgb(221, 221, 221);
                    font-size: 8px;
                    font-weight: bold;
                }
                .product-header > div {
                    padding: 2px 4px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .product-row { height: auto; }
                .product-row > div {
                    padding: 2px 4px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                .product-row > .col-product {
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                }

                .product-footer {
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: none;
                    font-weight: bold;
                }
                .product-footer > div {
                    padding: 6px 4px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                    font-size: 10px;
                }
                .product-footer > .col-product { justify-content: flex-end; }

                /* every cell obeys its % width and never grows with content */
                .product-header > div,
                .product-row > div,
                .product-footer > div {
                    flex: 0 0 auto;
                    min-width: 0;
                    box-sizing: border-box;
                }
                /* numeric cells never wrap */
                .col-qty, .col-price, .col-disc-amt, .col-net,
                .col-vat-percent, .col-vat-amt, .col-total {
                    white-space: nowrap;
                }

                /* widths ALWAYS sum to 100%
                   with discount:    4+22+6+6+11+11+12+5+11+12 = 100
                   without discount: 4+33+6+6+11+12+5+11+12    = 100 */
                .col-sl          { width: 4%;  text-align: center; justify-content: center; }
                .col-product     { width: ${showLineDiscount ? '22%' : '33%'}; }
                .col-qty         { width: 6%;  text-align: center; justify-content: center; }
                .col-price       { width: 11%; text-align: right;  justify-content: flex-end; }
                .col-disc-amt    { width: 11%; text-align: right;  justify-content: flex-end; }
                .col-net         { width: 12%; text-align: right;  justify-content: flex-end; }
                .col-vat-percent { width: 5%;  text-align: center; justify-content: center; }
                .col-vat-amt     { width: 11%; text-align: right;  justify-content: flex-end; }
                .col-total       { width: 12%; text-align: right;  justify-content: flex-end; }

                .product-header > div:last-child,
                .product-row > div:last-child,
                .product-footer > div:last-child { border-right: none; }

                .continuation-note {
                    flex-shrink: 0;
                    text-align: center;
                    font-weight: bold;
                    padding: 10px;
                    border-top: 1px solid rgb(216, 216, 216);
                }

                /* ---------- TOTALS BOX ---------- */
                .total-section { display: flex; }
                .total-section .total-left-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .total-section .total-right-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding: 10px;
                }
                .total-right-side th { border: none; padding-top: 0; padding-bottom: 0; }
                .total-right-side table { height: 100px; }
                .signature-section-compact {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid rgb(216, 216, 216);
                    margin-top: 10px;
                }

                @media print {
                    body { background: white; padding: 0; }
                    .page { box-shadow: none; margin: 0; width: 210mm; height: 297mm; }
                    .print-timestamp {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
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
 * Main print invoice function - SILENT PRINT (No dialog, no preview)
 */
export const profrmaInvoicePrintOne = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, invoiceQr, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (!result.success) {
                console.error('❌ [PROFORMA INVOICE] Print failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [PROFORMA INVOICE] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        // Browser fallback - opens in new window
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
 * Save invoice as PDF with invoice number as filename
 */
export const saveInvoiceAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, undefined, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);

            if (!result.success) {
                console.error('❌ [PROFORMA INVOICE] PDF save failed:', result.error);
            }
            return result;
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

export default profrmaInvoicePrintOne;