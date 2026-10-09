import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

// Row capacity per page type (same scheme as the purchase invoice print)
const ROWS_FIRST_PAGE = 20;
const ROWS_MIDDLE_PAGE = 25;
const ROWS_LAST_PAGE = 17;

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
 * Converts amount to words with currency
 */
const amountToWords = (amount, currency = 'Saudi Riyal', subunit = 'Halala') => {
    const [whole, decimal] = amount.toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

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
 * Paginate products with different row counts per page type.
 *
 *  - fits ROWS_FIRST_PAGE                      → one page ('only')
 *  - fits ROWS_FIRST_PAGE + ROWS_LAST_PAGE     → 'first' + 'last'
 *  - more                                      → 'first' + 'middle'(s) + 'last'
 */
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
const generateInvoiceHTML = (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const saleSettings = state.saleSettings;
    const activateRoundoff = Boolean(companyData.RoundOff);
    const showLineDiscount = saleSettings?.showLineDiscount || false;

    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;

    const showCurrencyPrefix = companyData?.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(companyData?.decimalPart || 2)}`
            : Number(num).toFixed(companyData?.decimalPart || 2);

    const {
        invoiceNo,
        vendorInvoiceNo,
        partyName,
        partyVatNo,
        partyAddress,
        invoiceDate,
        purchaseDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        taxType,
        othercharge = 0,
        roundoff = 0,
    } = invoiceData;

    const calcLineDiscount = (item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const grossAmt = qty * rate;
        const discPercent = Number(item.discountPercentage || 0);
        return grossAmt * (discPercent / 100);
    };

    const showTaxColumn = state.generalSettings?.ActivateTax && taxType === 'Applicable to product';

    // Redistribute VAT columns' width (7% + 9% = 16%) across other columns when tax is hidden
    const colWidths = showTaxColumn
        ? {
            sl: 5, code: 10, product: 45, qty: 5, price: 9,
            vatPercent: 7, vatAmt: 9, total: 10
        }
        : {
            sl: 5, code: 10, product: 50, qty: 6, price: 11,
            vatPercent: 0, vatAmt: 0, total: 18
        };

    // Totals
    const totalQty = purchaseDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = purchaseDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const totalDiscount = purchaseDetails.reduce((sum, item) => sum + calcLineDiscount(item), 0);
    const totalNetValue = purchaseDetails.reduce((sum, item) =>
        sum + ((Number(item.qty || 0) * Number(item.rate || 0)) - calcLineDiscount(item)), 0);
    const totalLineAmount = purchaseDetails.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    );

    // Paginate with per-page-type row limits
    const productPages = paginateProducts(purchaseDetails);
    const totalPages = productPages.length;

    // Generate pages HTML
    const pagesHTML = productPages.map(({ items: pageProducts, pageType }, pageIndex) => {
        const isFirstPage = pageType === 'only' || pageType === 'first';
        const isLastPage = pageType === 'only' || pageType === 'last';

        return `
            <div class="page">
               ${headerImage ? (
                `<div class="header-image">
                    <img src="${headerImage}" alt="header">
                </div>`
            ) : (
                `<div class="header-image-dummy">
                    <div>LOGO</div>
                </div>`
            )}

                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>MATERIAL RECEIPT</span>
                        <span>إيصال المواد</span>
                    </h2>

                    <table class="invoice-details-table">
                        <tr>
                            <td class="label">Customer Name <br><span class="rtl">اسم العميل</span></td>
                            <td><span class="bold">${partyName || ''}</span></td>
                            <td class="label rtl">رقم الفاتورة<br>INVOICE NO</td>
                            <td class="bold">${invoiceNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="label" rowspan="2">Customer VAT <br><span class="rtl">العميل ضريبة</span></td>
                            <td rowspan="2">${partyVatNo || ''}<br>${partyAddress || ''}</td>
                            <td class="label rtl">رقم فاتورة المورد <br>SUPPLIER INVOICE NO</td>
                            <td>${vendorInvoiceNo || 'NA'}</td>
                        </tr>
                        <tr>
                            <td class="label rtl">تاريخ فاتورة المورد <br>SUPPLIER INVOICE DATE</td>
                            <td class="bold">${formatDate(invoiceDate)}</td>
                        </tr>
                        <tr>
                            <td class="label rtl"></td>
                            <td class="label rtl"></td>
                            <td class="label rtl">الرقم المرجعي<br>Ref No</td>
                            <td class="bold">${invoiceData?.RefNo || 'NA'}</td>
                        </tr>
                    </table>
                    ` : `
                    <h2 class="heading">
                        <span>Material Receipt (Continued)</span>
                        <span>إيصال المواد (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Receipt No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                            <div class="col-sl"><div>رقم سي</div><div>SL No</div></div>
                            <div class="col-code"><div>رمز العنصر</div><div>ITEM CODE</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
                            <div class="col-price"><div>سعر الوحدة</div><div>UNIT PRICE</div></div>
                            ${showLineDiscount ? `<div class="col-disc-amt"><div>مبلغ الخصم</div><div>DISC AMT</div></div>` : ''}
                            <div class="col-net"><div>صافي القيمة</div><div>NET VALUE</div></div>
                            ${showTaxColumn ? `<div class="col-vat-percent"><div>ضريبة %</div><div>VAT %</div></div>
                            <div class="col-vat-amt"><div>مبلغ الضريبة</div><div>VAT AMT</div></div>` : ''}
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
                                        <div class="col-sl">${globalIndex + 1}</div>
                                        <div class="col-code">${item.productCode || ''}</div>
                                        <div class="col-product">
                                            <div style="font-weight: 600; font-size: 10px;">${item.productName || ''}</div>
                                            ${item.productNameArb ? `<div style="font-size: 10px;">${item.productNameArb}</div>` : ''}
                                            ${item.productDescription ? `<div style="font-size: 10px;">${item.productDescription}</div>` : ''}
                                        </div>
                                        <div class="col-qty">${item.qty || 0} ${item.unitName || item.productDetails?.UnitName || ''}</div>
                                        <div class="col-price">${item.rate || 0}</div>
                                        ${showLineDiscount ? `<div class="col-disc-amt">${discAmt.toFixed(state.generalSettings.decimalPart)}</div>` : ''}
                                        <div class="col-net">${netAmt.toFixed(state.generalSettings.decimalPart)}</div>
                                        ${showTaxColumn ? `<div class="col-vat-percent">15%</div>
                                        <div class="col-vat-amt">${parseFloat(item.taxAmount).toFixed(2) || 0}</div>` : ''}
                                        <div class="col-total">${Number(item.amount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                    </div>
                                `;
                            }).join('')}

                            <!-- Single filler row: stretches to fill the free space so the
                                 column lines run all the way down to the TOTAL row -->
                            <div class="product-row filler-row">
                                <div class="col-sl"></div>
                                <div class="col-code"></div>
                                <div class="col-product"></div>
                                <div class="col-qty"></div>
                                <div class="col-price"></div>
                                ${showLineDiscount ? `<div class="col-disc-amt"></div>` : ''}
                                <div class="col-net"></div>
                                ${showTaxColumn ? `<div class="col-vat-percent"></div>
                                <div class="col-vat-amt"></div>` : ''}
                                <div class="col-total"></div>
                            </div>

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page...</div>
                            ` : ''}
                        </div>

                        ${isLastPage ? `
                        <div class="product-footer">
                            <div class="col-sl"></div>
                            <div class="col-code"></div>
                            <div class="col-product" style="text-align: right; font-weight: 800;">
                                TOTAL / <span>المجموع</span>
                            </div>
                            <div class="col-qty">${totalQty.toFixed(0)}</div>
                            <div class="col-price"></div>
                            ${showLineDiscount ? `<div class="col-disc-amt">${fmt(totalDiscount)}</div>` : ''}
                            <div class="col-net">${fmt(totalNetValue)}</div>
                            ${showTaxColumn ? `<div class="col-vat-percent"></div>
                            <div class="col-vat-amt">${fmt(totalVAT)}</div>` : ''}
                            <div class="col-total">${fmt(totalLineAmount)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${isLastPage ? `
                <div class="total-section-fixed">
                    <div class="total-section">
                        <div class="total-left-side">
                            <div>
                                <div style="font-weight: 900;">Amount In Words <span>المبلغ بالكلمات</span> :-</div>
                                <div style="margin-top: 10px;">${amountToWords(totalAmount || 0)}</div>
                            </div>
                        </div>
                        <div class="total-right-side">
                            <table>
                                <tr>
                                    <th style="text-align: left;">Sub Total</th>
                                    <th style="text-align: right;"><span>المجموع الفرعي</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(subTotal)}</th>
                                </tr>
                                ${Number(othercharge) !== 0 ? `<tr>
                                    <th style="text-align: left;">Other Charge </th>
                                    <th style="text-align: right;"><span>رسوم اخرى</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(othercharge)}</th>
                                </tr>` : ""}
                                ${((saleSettings?.showBillDiscountAmount || saleSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0) ? `
                                <tr>
                                    <th style="text-align: left;">Discount Amount</th>
                                    <th style="text-align: right;"><span>مبلغ الخصم</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(billDiscount)}</th>
                                </tr>` : ""}
                                <tr>
                                    <th style="text-align: left;">Taxable Amount</th>
                                    <th style="text-align: right;">ا لمبلغ الخاضع للضريبة <span>:</span> </th>
                                    <th style="text-align: right;">
                                        ${fmt(
                                            Number(subTotal || 0) -
                                            Number(invoiceData?.billDiscount || 0) +
                                            Number(othercharge || 0)
                                        )}
                                    </th>
                                </tr>
                                ${showTaxColumn ? `<tr>
                                    <th style="text-align: left;">VAT Amount</th>
                                    <th style="text-align: right;"><span>مبلغ الضريبة</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(totalTax)}</th>
                                </tr>` : ''}
                                ${(activateRoundoff && Number(roundoff) !== 0) ? `
                                <tr>
                                    <th style="text-align: left;">Round Off:</th>
                                    <th style="text-align: right;"><span>تقريب</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(roundoff)}</th>
                                </tr>` : ""}
                                <tr>
                                    <th style="text-align: left; font-size: 20px; font-weight: 900;">Grand Total</th>
                                    <th style="text-align: right;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 20px; font-weight: 900;">${fmt(totalAmount)}</th>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div class="signature-section">
                        <div style="font-weight: 900;">AUTHORIZED SIGNATURE</div>
                        <div style="font-weight: 900;">CUSTOMER SIGNATURE</div>
                    </div>
                </div>
                ` : ''}

                ${footerImage ? (`
                <div class="footer-image">
                    <img src="${footerImage}" alt="footer">
                </div>`) : (
                `<div class="footer-image-dummy">
                    <div>LOGO</div>
                </div>`
                )}
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MATERIAL RECEIPT - ${invoiceNo}</title>
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
                    font-family: 'Times New Roman', Times, serif;
                }

                /* Page is a flex column: content grows, totals section sits at the bottom */
                .page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    padding-bottom: 80px; /* clears the footer image (60px + 10px offset) */
                }
                .page:last-child { margin-bottom: 0; }

                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; height: 120px; overflow: hidden; }
                .header-image img { width: 100%; display: block; height: 120px; object-fit: fill; }
                .footer-image { width: 100%; position: absolute; bottom: 10px; left: 0; z-index: 1; height: 60px; overflow: hidden; }
                .footer-image img { width: 100%; display: block; height: 60px; object-fit: fill; }

                /* Content area grows to fill the page above the totals section */
                .content-wrapper {
                    flex: 1 1 auto;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    width: 100%;
                    padding: 120px 15px 0 15px;
                    position: relative;
                    z-index: 2;
                }
                .content-wrapper.last-page { padding-bottom: 0; }

                .total-section-fixed {
                    flex-shrink: 0;
                    width: 100%;
                    margin-top: 10px;
                    z-index: 2;
                    padding: 0 15px;
                    box-sizing: border-box;
                }

                .heading {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    font-size: 22px;
                    margin: 0 0 15px 0;
                    font-weight: bold;
                }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                td, th { border: 1px solid rgb(216, 216, 216); padding: 2px 10px; vertical-align: top; }
                .invoice-details-table { font-size: 10px; }
                .label { font-weight: bold; width: 140px; }
                .rtl { direction: rtl; text-align: right; }
                .bold { font-weight: bold; }

                /* Product grid stretches down to the totals section */
                .product-table {
                    width: 100%;
                    border: 1px solid rgb(216, 216, 216);
                    font-size: 14px;
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
                .product-footer {
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: none;
                    font-weight: bold;
                }
                .product-header {
                    background-color: rgb(221, 221, 221);
                    font-size: 8px;
                    font-weight: bold;
                }
                .product-header > div {
                    padding: 2px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .product-body {
                    display: flex;
                    flex-direction: column;
                    flex: 1 1 auto;
                    width: 100%;
                    min-height: 0;
                }
                .product-row { height: auto; }
                .product-row > div {
                    padding: 2px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                /* One stretchy empty row so column lines reach the TOTAL row */
                .filler-row { flex: 1 1 auto; border-bottom: none; }

                .product-footer > div {
                    padding: 8px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                .col-sl { width: ${colWidths.sl}%; text-align: center; justify-content: center; }
                .col-product { width: ${colWidths.product}%; }
                .col-code { width: ${colWidths.code}%; text-align: center; justify-content: center; }
                .col-qty { width: ${colWidths.qty}%; text-align: center; justify-content: center; }
                .col-price { width: ${colWidths.price}%; text-align: right; justify-content: flex-end; }
                .col-vat-percent { width: ${colWidths.vatPercent}%; text-align: center; justify-content: center; }
                .col-vat-amt { width: ${colWidths.vatAmt}%; text-align: right; justify-content: flex-end; }
                .col-total { width: ${colWidths.total}%; text-align: right; justify-content: flex-end; }
                .col-product { width: ${showLineDiscount ? '30%' : '38%'}; }
                .col-disc-amt { width: 8%; text-align: right; justify-content: flex-end; }
                .col-net { width: 9%; text-align: right; justify-content: flex-end; }

                .product-header > div:last-child,
                .product-row > div:last-child,
                .product-footer > div:last-child { border-right: none; }
                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 10px;
                    border-top: 1px solid rgb(216, 216, 216);
                    flex-shrink: 0;
                }
                .total-section { display: flex; margin-top: 10px; }
                .total-section .total-left-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                    padding: 10px;
                }
                .total-section .total-right-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                }
                .total-right-side th { border: none; padding: 8px 10px; }
                .header-image-dummy {
                    height: 90px;
                    background-color: rgb(216, 216, 216);
                    width: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 20px;
                }
                .footer-image-dummy {
                    height: 60px;
                    background-color: rgb(216, 216, 216);
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 20px;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 4rem;
                    margin-top: 10px;
                }
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
 * Main print function - SILENT PRINT (No dialog, no preview)
 */
export const materialRecieptPrintOne = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (!result.success) {
                console.error('❌ [MATERIAL RECEIPT] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [MATERIAL RECEIPT] Error:', error);
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

export default materialRecieptPrintOne;