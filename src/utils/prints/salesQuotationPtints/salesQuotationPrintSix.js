// salesQuotationPrintSix.js - OPTIMIZED VERSION with Maximum Rows

import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

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

/**
 * Converts number to Arabic words
 */
const numberToWordsArabic = (num) => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    if (num === 0) return 'صفر';

    const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) {
            const unit = n % 10;
            const ten = Math.floor(n / 10);
            return unit ? ones[unit] + ' و ' + tens[ten] : tens[ten];
        }
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        return hundreds[hundred] + (remainder ? ' و ' + convertLessThanThousand(remainder) : '');
    };

    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;

    let result = '';
    if (thousands) {
        if (thousands === 1) result += 'ألف';
        else if (thousands === 2) result += 'ألفان';
        else if (thousands <= 10) result += convertLessThanThousand(thousands) + ' آلاف';
        else result += convertLessThanThousand(thousands) + ' ألف';
    }
    if (remainder) {
        if (thousands) result += ' و ';
        result += convertLessThanThousand(remainder);
    }

    return result.trim();
};

/**
 * Converts amount to words with currency (English)
 */
const amountToWordsEnglish = (amount, currency = 'Saudi Riyal', subunit = 'Halala') => {
    const [whole, decimal] = amount.toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal?.padEnd(2, '0').substring(0, 2)) || 0;

    let words = '';

    if (wholeNum > 0) {
        words += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    }

    if (decimalNum > 0) {
        words += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    }

    words += ' Only';

    return words;
};

/**
 * Converts amount to words with currency (Arabic)
 */
const amountToWordsArabic = (amount) => {
    const [whole, decimal] = amount.toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal?.padEnd(2, '0').substring(0, 2)) || 0;

    let words = 'فقط ';

    if (wholeNum > 0) {
        words += numberToWordsArabic(wholeNum) + ' ريالاً سعودياً';
    }

    if (decimalNum > 0) {
        words += ' و ' + numberToWordsArabic(decimalNum) + ' هللة';
    }

    words += ' لا غير';

    return words;
};

/**
 * Formats date using settings format
 */
const formatDate = (date) => {
    if (!date) return '';
    const state = store.getState().settings;
    const dateFormat = state.generalSettings?.dateformat || 'dd-MM-yyyy';
    return formatDateUtil(date, dateFormat);
};



/**
 * Split array into pages with different row counts.
 *
 * IMPORTANT: the single-page case (isFirst && isLast) is NOT the same as the
 * "first page of a multi-page run" case. A single page has to fit the
 * customer/quotation detail boxes + greeting text at the TOP, and the totals
 * row + Amount-in-Words + footer terms/signature block at the BOTTOM, all on
 * one sheet. Reusing firstPageRows (sized only for "more content follows")
 * reserves too many table rows and squeezes/clips the totals section — which
 * is exactly the bug that was cutting off the Amount In Words block.
 * singlePageRows is a dedicated, smaller budget for this case.
 */
const splitIntoPages = (array, firstPageRows, middlePageRows, lastPageRows, singlePageRows) => {
    const totalItems = array.length;

    // Fallback keeps old behavior if a caller doesn't pass singlePageRows.
    const effectiveSingleRows = singlePageRows ?? lastPageRows;

    if (totalItems === 0) {
        return [{ items: [], isFirst: true, isLast: true, maxRows: effectiveSingleRows }];
    }

    if (totalItems <= effectiveSingleRows) {
        return [{ items: array, isFirst: true, isLast: true, maxRows: effectiveSingleRows }];
    }

    const pages = [];
    let currentIndex = 0;

    const firstPageItems = Math.min(firstPageRows, totalItems);
    pages.push({
        items: array.slice(0, firstPageItems),
        isFirst: true,
        isLast: false,
        maxRows: firstPageRows
    });
    currentIndex = firstPageItems;

    while (currentIndex < totalItems) {
        const remainingItems = totalItems - currentIndex;

        if (remainingItems <= lastPageRows) {
            pages.push({
                items: array.slice(currentIndex),
                isFirst: false,
                isLast: true,
                maxRows: lastPageRows
            });
            break;
        }

        const itemsAfterThisPage = remainingItems - middlePageRows;

        if (itemsAfterThisPage > 0 && itemsAfterThisPage <= lastPageRows) {
            pages.push({
                items: array.slice(currentIndex, currentIndex + middlePageRows),
                isFirst: false,
                isLast: false,
                maxRows: middlePageRows
            });
            currentIndex += middlePageRows;
        } else if (itemsAfterThisPage <= 0) {
            pages.push({
                items: array.slice(currentIndex),
                isFirst: false,
                isLast: true,
                maxRows: lastPageRows
            });
            break;
        } else {
            pages.push({
                items: array.slice(currentIndex, currentIndex + middlePageRows),
                isFirst: false,
                isLast: false,
                maxRows: middlePageRows
            });
            currentIndex += middlePageRows;
        }
    }

    if (pages.length > 0) {
        pages[pages.length - 1].isLast = true;
        pages[pages.length - 1].maxRows = lastPageRows;
    }

    return pages;
};

/**
 * Generate the quotation HTML
 */
/**
 * Extracts time from CreatedDate (e.g. "2026-07-22 23:32:02.99462")
 * and formats as 12-hour AM/PM time.
 */
const formatTimeFromCreatedDate = (createdDate) => {
    if (!createdDate) return '';
    // CreatedDate format: "2026-07-22 23:32:02.99462"
    const timePart = createdDate.split(' ')[1]; // "23:32:02.99462"
    if (!timePart) return '';

    const [hourStr, minuteStr] = timePart.split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = minuteStr;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 -> 12

    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};
export const generateQuotationHTML = (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);
    

    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const decimalPart = companyData.decimalPart || 2;

    const showCurrencyPrefix = state.generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(decimalPart)}`
            : Number(num).toFixed(decimalPart);

    const HEADER_HEIGHT = '120px';
    const FOOTER_HEIGHT = '80px';

    const {
        invoiceNo,
        date,
        CreatedDate,
        customerName,
        CustomerVatNo,
        CustomerAddress,
        CustomerPhone = '',
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

    // Calculate totals
    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalGrossValue = salesDetails.reduce((sum, item) => sum + (parseFloat(item.grossAmount) || 0), 0);
    const totalDiscount = salesDetails.reduce((sum, item) => sum + (parseFloat(item.discountAmount) || 0), 0);
    const totalTaxableAmt = salesDetails.reduce((sum, item) => {
        const gross = parseFloat(item.grossAmount) || 0;
        const disc = parseFloat(item.discountAmount) || 0;
        return sum + (gross - disc);
    }, 0);
  const totalVATAmt = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
const totalNetAmt = salesDetails.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

// ✅ FIX — subTotal/totalAmount sometimes come back empty/0 from invoiceData while the
// locally-summed line-item totals (totalTaxableAmt / totalNetAmt) are correct. Fall back
// to those computed sums using the raw number, not a formatted string.
const effectiveSubTotal = (subTotal !== undefined && subTotal !== null && Number(subTotal) !== 0)
    ? Number(subTotal)
    : totalTaxableAmt;
const effectiveGrandTotal = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) !== 0)
    ? Number(totalAmount)
    : totalNetAmt;

    const vatRate = salesDetails.length > 0 && salesDetails[0].taxRate ? salesDetails[0].taxRate : 15;

    const formattedDate = formatDate(date);
const formattedTime = formatTimeFromCreatedDate(CreatedDate);
const formattedDateTime = `${formattedDate} ${formattedTime}`.trim();
    const FIRST_PAGE_ROWS = 15;
    const MIDDLE_PAGE_ROWS = 25;
    const LAST_PAGE_ROWS = 10;
    // Dedicated budget for the "everything fits on one page" case — smaller
    // than FIRST_PAGE_ROWS because this single page must also carry the full
    // totals row, Amount-in-Words (EN + AR), and footer terms/signature block.
    const SINGLE_PAGE_ROWS = 10;

    const validProducts = salesDetails.filter(item => item.productCode);

    const productPages = splitIntoPages(validProducts, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS, SINGLE_PAGE_ROWS);
    const totalPages = productPages.length || 1;

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage, maxRows } = pageData;

        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        const emptyRowsCount = Math.max(0, maxRows - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

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
            <div class="timestamp-value">${new Date().toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            })} ${new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            })}</div>
        </div>
                <div class="content-wrapper ${isFirstPage ? 'first-page' : ''} ${isLastPage ? 'last-page' : ''} ${!isFirstPage && !isLastPage ? 'middle-page' : ''}">
                    <div class="content-main">
                        <div class="heading-section">
                            <span class="heading-en">Sales Quotation</span>
                            <span class="heading-ar">تسعيرة المبيعات</span>
                            ${!isFirstPage ? `<span class="page-indicator">(Page ${pageIndex + 1} of ${totalPages})</span>` : ''}
                        </div>

                        ${isFirstPage ? `
                        <div class="details-boxes">
                            <div class="detail-box left-box">
                                <div class="detail-row">
                                    <div class="detail-label">Customer Name</div>
                                    <div class="detail-value">: ${customerName || ''}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Customer VAT</div>
                                    <div class="detail-value">: ${CustomerVatNo || 'NA'}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Address</div>
                                    <div class="detail-value">:  ${invoiceData?.customerAddress ||
            [
                invoiceData?.customerData?.StreetName,
                invoiceData?.customerData?.BuildingNo,
                invoiceData?.customerData?.District,
                invoiceData?.customerData?.CityName,
                invoiceData?.customerData?.Country
            ].filter(Boolean).join(', ')
        }</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Phone</div>
                                    <div class="detail-value">: ${CustomerPhone || 'NA'}</div>
                                </div>
                            </div>

                            <div class="detail-box right-box">
                                <div class="detail-row">
                                    <div class="detail-label">Quotation No</div>
                                    <div class="detail-value">: ${invoiceNo || ''}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Date</div>
                                   <div class="detail-value">: ${formattedDateTime}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Sales Man</div>
                                    <div class="detail-value">: ${salesMan || ''}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Contact Person</div>
                                    <div class="detail-value">: ${contactPerson || ''}</div>
                                </div>
                                <div class="detail-row">
                                    <div class="detail-label">Contact No</div>
                                    <div class="detail-value">: ${contactNo || ''}</div>
                                </div>
                            </div>
                        </div>

                        <div class="greeting-section">
                            <p>Dear Sir / Madam,</p>
                            <p>We thank you for your enquiry for the following item and we are pleased to quote our best and competitive price...</p>
                        </div>
                        ` : `
                        <div class="page-info">
                            Quotation No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                        </div>
                        `}

                        <table class="product-table">
                            <thead>
                                <tr>
                                    <th class="col-slno">Sl No</th>
                                    <th class="col-code">Code</th>
                                    <th class="col-product">Product</th>
                                    <th class="col-qty">Qty</th>
                                    <th class="col-unitprice">Unit Price</th>
                                    <th class="col-gross">Gross Value</th>
                                    <th class="col-disc">Disc</th>
                                    <th class="col-taxable">Taxable Amt</th>
                                    <th class="col-vatperc">VAT %</th>
                                    <th class="col-vatamt">VAT Amt</th>
                                    <th class="col-total">Total Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageProducts.map((item, index) => {
                                    const globalIndex = pageStartIndex + index;
                                    const grossValue = parseFloat(item.grossAmount) || 0;
                                    const discAmt = parseFloat(item.discountAmount) || 0;
                                    const taxableAmt = grossValue - discAmt;
                                    return `
                                        <tr class="product-row">
                                            <td class="text-center">${globalIndex + 1}</td>
                                            <td class="text-center">${item.productCode || ''}</td>
                                           <td class="text-left">
  ${item.productName || ''}
  ${item.productNameArb ? `<br><span dir="rtl">${item.productNameArb}</span>` : ''}
</td>
                                            <td class="text-center">${item.qty || 0}</td>
                                            <td class="text-right">${parseFloat(item.rate || 0).toFixed(decimalPart)}</td>
                                            <td class="text-right">${grossValue.toFixed(decimalPart)}</td>
                                            <td class="text-right">${discAmt.toFixed(decimalPart)}</td>
                                            <td class="text-right">${taxableAmt.toFixed(decimalPart)}</td>
                                            <td class="text-center">${item.taxRate || 0}%</td>
                                            <td class="text-right">${parseFloat(item.taxAmount || 0).toFixed(decimalPart)}</td>
                                            <td class="text-right">${parseFloat(item.amount || 0).toFixed(decimalPart)}</td>
                                        </tr>
                                    `;
                                }).join('')}

                                ${emptyRows.map(() => `
                                    <tr class="empty-row">
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                    </tr>
                                `).join('')}

                                ${!isLastPage ? `
                                    <tr class="continuation-row">
                                        <td colspan="11" class="text-center">
                                            <strong>Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</strong>
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                            ${isLastPage ? `
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="3" class="total-label-cell">
                                        <strong>Total المجموع</strong>
                                    </td>
                                    <td class="text-center"><strong>${totalQty.toFixed(0)}</strong></td>
                                    <td></td>
                                    <td class="text-right"><strong>${totalGrossValue.toFixed(decimalPart)}</strong></td>
                                    <td class="text-right"><strong>${totalDiscount.toFixed(decimalPart)}</strong></td>
                                    <td class="text-right"><strong>${totalTaxableAmt.toFixed(decimalPart)}</strong></td>
                                    <td></td>
                                    <td class="text-right"><strong>${totalVATAmt.toFixed(decimalPart)}</strong></td>
                                    <td class="text-right"><strong>${totalNetAmt.toFixed(decimalPart)}</strong></td>
                                </tr>
                                <tr class="summary-row">
                                    <td colspan="4" class="summary-left-cell">
                                        <div class="words-label">Amount In Words المبلغ بالكلمات :-</div>
                                    <div class="words-english">${amountToWordsEnglish(effectiveGrandTotal)}</div>
<div class="words-arabic">${amountToWordsArabic(effectiveGrandTotal)}</div>
                                    </td>
                                    <td colspan="7" class="summary-right-cell">
                                  <div class="summary-item">
    <span class="summary-label">Sub Total</span>
    <span class="summary-label-ar">المجموع الفرعي</span>
    <span class="summary-value">${fmt(effectiveSubTotal)}</span>
</div>
                                     ${Number(othercharge)>0?`   <div class="summary-item">
                                            <span class="summary-label">Other Charge</span>
                                            <span class="summary-label-ar">رسوم أخرى</span>
                                            <span class="summary-value">${fmt(othercharge || 0)}</span>
                                        </div>`:""}
                                       ${Number(billDiscount)>0?` <div class="summary-item">
                                            <span class="summary-label">Discount Amount</span>
                                            <span class="summary-label-ar">مبلغ الخصم</span>
                                            <span class="summary-value">${fmt(billDiscount || 0)}</span>
                                        </div>`:""}
                                        <div class="summary-item">
                                            <span class="summary-label">Taxable Amount</span>
                                            <span class="summary-label-ar">المبلغ الخاضع للضريبة</span>
                                            <span class="summary-value">${fmt(Number(effectiveSubTotal) - Number(billDiscount)+Number(othercharge) || 0)}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">VAT @${vatRate}%</span>
                                            <span class="summary-label-ar">ضريبة القيمة المضافة</span>
                                            <span class="summary-value">${fmt(totalTax || 0)}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Round Off</span>
                                            <span class="summary-label-ar">التقريب</span>
                                            <span class="summary-value">${fmt(roundOff || 0)}</span>
                                        </div>
                                      <div class="summary-item grand-total-item">
                                            <span class="summary-label grand-total-label">Grand Total</span>
                                            <span class="summary-label-ar grand-total-label">المجموع الإجمالي</span>
                                            <span class="summary-value grand-total-value">${fmt(effectiveGrandTotal)}</span>
                                     </div>
                                    </td>
                                </tr>
                            </tfoot>
                            ` : ''}
                        </table>

                        ${isLastPage ? `
                           
                        <div class="footer-terms">
                            <div class="footer-left">
                                <div class="term-item">
                                    <span class="term-label">Payment Terms:</span>
                                    <span class="term-value">${paymentterms || '-'}</span>
                                </div>
                                <div class="term-item">
                                    <span class="term-label">Delivery Terms:</span>
                                    <span class="term-value">${DeliveryTerms || '-'}</span>
                                </div>
                                <div class="term-item">
                                    <span class="term-label">Validity:</span>
                                    <span class="term-value">${quatationvalidity || '-'}</span>
                                </div>
                                <div class="term-item">
                                    <span class="term-label">Remark:</span>
                                    <span class="term-value">${narration || '-'}</span>
                                </div>
                                <div class="term-item">
                                    <span class="term-label">Delivery Within:</span>
                                    <span class="term-value">${deliveredwithin || '-'}</span>
                                </div>
                                <div class="term-item">
                                    <span class="term-label">Delivery Site:</span>
                                    <span class="term-value">${deliverysite || '-'}</span>
                                </div>
                                <div class="term-item yours-faithfully">
                                    <span class="term-label">Yours Faithfully</span>
                                </div>
                            </div>
                            <div class="footer-right">
                                <div class="confirm-title">Confirmation and Acceptance:</div>
                                <div class="confirm-item">
                                    <span class="confirm-label">Authorized Signature:</span>
                                    <span class="confirm-dots">.................................</span>
                                </div>
                                <div class="confirm-item">
                                    <span class="confirm-label">Name:</span>
                                    <span class="confirm-dots">.................................</span>
                                </div>
                                <div class="confirm-item">
                                    <span class="confirm-label">Date:</span>
                                    <span class="confirm-dots">.................................</span>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${footerImage ? `
                    <div class="footer-image">
                        <img src="${footerImage}" alt="footer">
                    </div>
                ` : `
                    <div class="footer-imagre"></div>
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
            <title>Sales Quotation - ${invoiceNo}</title>
            <style>
                :root {
                    --header-height: ${HEADER_HEIGHT};
                    --footer-height: ${FOOTER_HEIGHT};
                    --content-padding-top: 10px;
                    --content-padding-bottom: 10px;
                    --content-padding-left: 40px;
                    --content-padding-right: 40px;
                    --page-width: 210mm;
                    --page-height: 297mm;
                    --row-height: 22px;
                }

                @page { 
                    size: A4; 
                    margin: 0; 
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

                        .timestamp-label {
                            font-weight: bold;
                            color: #444;
                        }

                        .timestamp-value {
                            font-weight: normal;
                            white-space: nowrap;
                        }

                        @media print {
                            body { background: white; }
                            .page {
                                box-shadow: none;
                                margin: 0;
                                width: 210mm;
                                height: 297mm;
                            }
                            
                            /* Ensure timestamp prints */
                            .print-timestamp {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                body {
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .page {
                    width: var(--page-width);
                    height: var(--page-height);
                    background: white;
                    position: relative;
                    margin: 0 auto;
                    page-break-after: always;
                }
                .page:last-child { 
                    margin-bottom: 0; 
                }

                .header-text {
                    width: 100%;
                    padding: 15px;
                    text-align: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    height: var(--header-height);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .header-text .company-name {
                    font-size: 18px;
                    font-weight: 800;
                }

                .header-text .company-code,
                .header-text .company-vat {
                    font-size: 11px;
                    margin-top: 3px;
                }

                .header-image { 
                    width: 100%; 
                    height: var(--header-height);
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    z-index: 1;
                }
                .header-image img { 
                    width: 100%; 
                    height: 100%;
                    object-position: top;
                    display: block; 
                }

                .footer-image { 
                    width: 100%; 
                    height: var(--footer-height);
                    position: absolute; 
                    bottom: 0; 
                    left: 0; 
                    z-index: 1;
                    overflow: hidden;
                }
                .footer-image img { 
                    width: 100%; 
                    height: 100%;
                    object-fit: cover;
                    object-position: bottom;
                    display: block; 
                }

                .content-wrapper {
                    position: absolute;
                    top: var(--header-height);
                    left: 0;
                    right: 0;
                    bottom: var(--footer-height);
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    padding: var(--content-padding-top) var(--content-padding-right) var(--content-padding-bottom) var(--content-padding-left);
                    overflow: hidden;
                }

                .content-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                .heading-section {
                    text-align: center;
                    margin-bottom: 6px;
                    flex-shrink: 0;
                }
                .heading-en {
                    font-size: 20px;
                    font-weight: bold;
                    margin-right: 12px;
                    color: #333;
                }
                .heading-ar {
                    font-size: 20px;
                    font-weight: bold;
                    direction: rtl;
                    color: #333;
                }
                .page-indicator {
                    font-size: 10px;
                    color: #666;
                    margin-left: 10px;
                }

                .page-info {
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                    margin-bottom: 8px;
                    padding: 4px;
                    background: #f5f5f5;
                    border-radius: 3px;
                    flex-shrink: 0;
                }

                .details-boxes {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 6px;
                    flex-shrink: 0;
                }
                .detail-box {
                    flex: 1;
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 8px 12px;
                }
                .detail-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .detail-row:last-child {
                    margin-bottom: 0;
                }
                .detail-label {
                    min-width: 100px;
                    font-weight: bold;
                    color: #333;
                }
                .detail-value {
                    flex: 1;
                    font-weight: 600;
                }

                .greeting-section {
                    margin-bottom: 6px;
                    font-size: 13px;
                    line-height: 1.3;
                    flex-shrink: 0;
                }
                .greeting-section p {
                    margin-bottom: 2px;
                }

                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    table-layout: fixed;
                }
                .product-table th {
                    border: 1px solid #333;
                    padding: 4px 3px;
                    font-weight: bold;
                    text-align: center;
                    background: #f0f0f0;
                }
                .product-table tbody td {
                    border-left: 1px solid #333;
                    border-right: 1px solid #333;
                    padding: 2px 3px;
                    font-size: 13px;
                    height: var(--row-height);
                    vertical-align: middle;
                }

                .col-slno { width: 4%; }
                .col-code { width: 8%; }
                .col-product { width: auto; }
                .col-qty { width: 6%; }
                .col-unitprice { width: 50px; }
                .col-gross { width: 50px; }
                .col-disc { width: 50px; }
                .col-taxable { width: 50px; }
                .col-vatperc { width: 6%; }
                .col-vatamt { width: 50px; }
                .col-total { width: 50px; }

                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }

                .product-row td {
                    height: var(--row-height);
                    border-bottom: 1px solid #333;
                }

                .empty-row td { 
                    height: var(--row-height);
                    border-bottom: none;
                }

                .continuation-row { 
                    background: #fff8f0; 
                }
                .continuation-row td {
                    border: 1px solid #333;
                    padding: 4px;
                    height: auto;
                }

                .total-row td {
                    border: 1px solid #333;
                    padding: 4px 3px;
                    background: #f5f5f5;
                }
                .total-label-cell {
                    text-align: center;
                }

                .summary-row td {
                    border: 1px solid #333;
                    padding: 6px 8px;
                    vertical-align: top;
                    height: auto;
                }
                .summary-left-cell {
                    width: 50%;
                    overflow: visible;
                }
                .summary-right-cell {
                    width: 50%;
                }
                .words-label {
                    font-weight: bold;
                    margin-bottom: 4px;
                    font-size: 10px;
                }
                .words-english {
                    margin-bottom: 3px;
                    font-size: 12px;
                    line-height: 1.3;
                    white-space: normal;
                    word-wrap: break-word;
                }
                .words-arabic {
                    direction: rtl;
                    text-align: right;
                    font-size: 12px;
                    line-height: 1.3;
                    white-space: normal;
                    word-wrap: break-word;
                }

                .summary-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 2px;
                    font-size: 12px;
                }
                .summary-label {
                    min-width: 90px;
                }
                .summary-label-ar {
                    flex: 1;
                    text-align: right;
                    direction: rtl;
                    margin-right: 6px;
                    font-size: 12px;
                }
                .summary-value {
                    min-width: 60px;
                    text-align: right;
                    font-weight: 600;
                }
                
                .grand-total-item {
                    margin-top: 4px;
                    padding-top: 4px;
                    border-top: 1px solid #333;
                }
                .grand-total-label {
                    font-weight: bold;
                    font-size: 13px;
                }
                .grand-total-value {
                    font-size: 13px;
                    font-weight: 900;
                    color: #000;
                }
   .bank-details { border: 1px solid black;border-top:none !important; }
                .section-title {
                    background: #d0d0d0;
                    padding: 4px 8px;
                    font-weight: bold;
                    border-bottom: 1px solid black;
                    font-size: 10px;
                }
         
                .footer-terms {
                    display: flex;
                    gap: 15px;
                    flex-shrink: 0;
                    margin-top: 4px;
                }
                .footer-left {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .footer-right {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    font-size:12px;
                }

                .term-item {
                    font-size: 12px;
                    margin-bottom: 3px;
                }
                .term-label {
                    font-weight: bold;
                }
                .term-value {
                    margin-left: 4px;
                }
                .yours-faithfully {
                    margin-top: 6px;
                    padding-top: 6px;
                }

                .confirm-title {
                    font-weight: bold;
                    font-size: 12px;
                    margin-bottom: 8px;
                }
                .confirm-item {
                    font-size: 12px;
                    margin-bottom: 8px;
                }
                .confirm-label {
                    font-weight: bold;
                }
                .confirm-dots {
                    margin-left: 4px;
                    color: #999;
                }

                @media print {
                    body { 
                        background: white; 
                        padding: 0;
                        margin: 0;
                    }
                    .page { 
                        box-shadow: none; 
                        width: 100%;
                        height: 100vh;
                        margin: 0;
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
 * Main print quotation function - SILENT PRINT
 */
export const salesQuotationPrintSix = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateQuotationHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                console.log('✅ [QUOTATION] Printed successfully!');
            } else {
                console.error('❌ [QUOTATION] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [QUOTATION] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        console.log('📄 [QUOTATION] Browser mode - opening new window');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            console.error('❌ [QUOTATION] Popup blocked');
            return { success: false, error: 'Popup blocked' };
        }
        return { success: true };
    }
};

/**
 * Save quotation as PDF - DIRECT DOWNLOAD (No new tab, no modal)
 * Uses html2pdf.js or Electron's built-in PDF generation
 */
export const saveQuotationAsPDF = async (invoiceData, branchData) => {
    const invoiceHTML = generateQuotationHTML(invoiceData, branchData);
    const quotationNumber = invoiceData.invoiceNo || 'quotation';
    const filename = `Sales_Quotation_${quotationNumber}.pdf`;

    if (isElectron()) {
        // Electron: Use built-in PDF generation with save dialog
        try {
            if (window.electronAPI && window.electronAPI.savePDF) {
                const result = await window.electronAPI.savePDF(invoiceHTML, filename);
                return result;
            } else if (window.electronAPI && window.electronAPI.printToPDF) {
                const result = await window.electronAPI.printToPDF(invoiceHTML, {
                    filename: filename,
                    pageSize: 'A4',
                    printBackground: true,
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });
                return result;
            } else {
                // Fallback to browser method
                return await generatePDFInBrowser(invoiceHTML, filename);
            }
        } catch (error) {
            console.error('❌ [QUOTATION] Error saving PDF:', error);
            return { success: false, error: error.message };
        }
    } else {
        // Browser: Use html2canvas + jsPDF for direct download
        return await generatePDFInBrowser(invoiceHTML, filename);
    }
};

/**
 * Scope CSS text so all selectors are prefixed with a container selector.
 * Prevents print/invoice styles from leaking into the main React app.
 */
const scopeCSSText = (cssText, containerSelector) => {
    // Remove @page rules (print-only, not needed for screen capture)
    cssText = cssText.replace(/@page\s*\{[^}]*\}/g, '');
    // Remove @media print blocks entirely
    cssText = cssText.replace(/@media\s+print\s*\{[\s\S]*?\}\s*\}/g, '');

    // Parse into individual rule blocks and scope each one
    const scopedRules = [];
    let buffer = '';
    let braceDepth = 0;

    for (let i = 0; i < cssText.length; i++) {
        const char = cssText[i];
        buffer += char;

        if (char === '{') braceDepth++;
        if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) {
                const rule = buffer.trim();
                if (rule) {
                    const braceIndex = rule.indexOf('{');
                    if (braceIndex !== -1) {
                        const selectorPart = rule.substring(0, braceIndex).trim();
                        const bodyPart = rule.substring(braceIndex);

                        const scopedSelectors = selectorPart.split(',').map(sel => {
                            sel = sel.trim();
                            if (!sel) return sel;
                            // :root / body / html → target the container itself
                            if (sel === ':root' || sel === 'body' || sel === 'html') return containerSelector;
                            // * → container and all its descendants
                            if (sel === '*') return `${containerSelector}, ${containerSelector} *`;
                            // Everything else: nest under container
                            return `${containerSelector} ${sel}`;
                        }).join(', ');

                        scopedRules.push(`${scopedSelectors} ${bodyPart}`);
                    }
                }
                buffer = '';
            }
        }
    }

    return scopedRules.join('\n');
};

/**
 * Generate PDF in browser using html2canvas and jsPDF.
 * Uses DOMParser + scoped CSS to prevent style leaking into main app.
 * Images render correctly because everything stays in the main document.
 */
const generatePDFInBrowser = async (htmlContent, filename) => {
    let container = null;
    let scopedStyleEl = null;

    const cleanup = () => {
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        if (scopedStyleEl && scopedStyleEl.parentNode) {
            document.head.removeChild(scopedStyleEl);
        }
        container = null;
        scopedStyleEl = null;
    };

    try {
        // Dynamically import libraries
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ]);

        // Parse the full HTML to separate body content from styles
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(htmlContent, 'text/html');

        // Extract only the body content (page divs — no <style> tags)
        const bodyContent = parsedDoc.body.innerHTML;

        // Extract all CSS and scope it under a unique container ID
        const uniqueId = `pdf-scope-${Date.now()}`;
        let allCSS = '';
        parsedDoc.querySelectorAll('style').forEach(el => {
            allCSS += el.textContent + '\n';
        });
        const scopedCSS = scopeCSSText(allCSS, `#${uniqueId}`);

        // Add scoped styles to <head> — they only target #uniqueId and its children
        scopedStyleEl = document.createElement('style');
        scopedStyleEl.setAttribute('data-pdf-scope', uniqueId);
        scopedStyleEl.textContent = scopedCSS;
        document.head.appendChild(scopedStyleEl);

        // Create hidden container with only the body content (no style tags)
        container = document.createElement('div');
        container.id = uniqueId;
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm;';
        container.innerHTML = bodyContent;
        document.body.appendChild(container);

        // Wait for layout to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wait for all images to finish loading
        const images = container.querySelectorAll('img');
        if (images.length > 0) {
            await Promise.all(
                Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 5000); // 5s timeout per image
                    });
                })
            );
            // Extra wait after images load for final paint
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Get all pages
        const pages = container.querySelectorAll('.page');

        if (pages.length === 0) {
            cleanup();
            return { success: false, error: 'No pages found to convert' };
        }

        // Create PDF (A4 size)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = 210;
        const pdfHeight = 297;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // Capture page as canvas — images work because we're in the main document
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: page.offsetWidth,
                height: page.offsetHeight
            });

            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Add new page if not first
            if (i > 0) {
                pdf.addPage();
            }

            // Add image to PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        // Clean up — removes container AND scoped styles from <head>
        cleanup();

        // Download PDF directly
        pdf.save(filename);

        console.log('✅ [QUOTATION] PDF downloaded successfully:', filename);
        return { success: true, filename };

    } catch (error) {
        console.error('❌ [QUOTATION] PDF generation error:', error);
        cleanup();

        // Fallback: If html2canvas/jspdf not available, use print method
        return await fallbackPDFGeneration(htmlContent, filename);
    }
};

/**
 * Fallback PDF generation using iframe and print
 */
const fallbackPDFGeneration = async (htmlContent, filename) => {
    return new Promise((resolve) => {
        try {
            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow.print();

                        // Remove iframe after print dialog closes
                        setTimeout(() => {
                            if (iframe.parentNode) {
                                document.body.removeChild(iframe);
                            }
                        }, 1000);

                        resolve({
                            success: true,
                            message: 'Print dialog opened. Select "Save as PDF" to download.',
                            filename
                        });
                    } catch (e) {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                        resolve({ success: false, error: e.message });
                    }
                }, 500);
            };
        } catch (error) {
            resolve({ success: false, error: error.message });
        }
    });
};

/**
 * Get quotation HTML for preview
 */
export const getQuotationHTML = (invoiceData, branchData) => {
    return generateQuotationHTML(invoiceData, branchData);
};

/**
 * Preview quotation in new window
 */
export const previewQuotation = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateQuotationHTML(invoiceData, branchData, time, currentCurrency);

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
        previewWindow.document.write(invoiceHTML);
        previewWindow.document.close();
        return { success: true };
    } else {
        return { success: false, error: 'Popup blocked' };
    }
};
export const salesQuotationPrintSixAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateQuotationHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (result.success) {
                return result;
            } else {
                console.error('❌ [SALES INVOICE] PDF save failed:', result.error);
                return result;
            }
        } catch (error) {
            console.error('❌ [SALES INVOICE] Error saving PDF:', error);
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

export default salesQuotationPrintSix;