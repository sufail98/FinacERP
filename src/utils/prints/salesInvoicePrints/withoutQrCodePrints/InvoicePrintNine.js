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
 * Split array into pages with different row counts
 */
const splitIntoPages = (array, firstPageRows, middlePageRows, lastPageRows) => {
    const totalItems = array.length;

    if (totalItems === 0) {
        return [{ items: [], isFirst: true, isLast: true, maxRows: lastPageRows }];
    }

    if (totalItems <= lastPageRows) {
        return [{ items: array, isFirst: true, isLast: true, maxRows: lastPageRows }];
    }

    if (totalItems <= firstPageRows) {
        return [{ items: array, isFirst: true, isLast: true, maxRows: firstPageRows }];
    }

    const pages = [];
    let currentIndex = 0;

    const firstPageItems = Math.min(firstPageRows, totalItems);
    pages.push({ items: array.slice(0, firstPageItems), isFirst: true, isLast: false, maxRows: firstPageRows });
    currentIndex = firstPageItems;

    while (currentIndex < totalItems) {
        const remainingItems = totalItems - currentIndex;

        if (remainingItems <= lastPageRows) {
            pages.push({ items: array.slice(currentIndex), isFirst: false, isLast: true, maxRows: lastPageRows });
            break;
        }

        const itemsAfterThisPage = remainingItems - middlePageRows;

        if (itemsAfterThisPage > 0 && itemsAfterThisPage <= lastPageRows) {
            pages.push({ items: array.slice(currentIndex, currentIndex + middlePageRows), isFirst: false, isLast: false, maxRows: middlePageRows });
            currentIndex += middlePageRows;
        } else if (itemsAfterThisPage <= 0) {
            pages.push({ items: array.slice(currentIndex), isFirst: false, isLast: true, maxRows: lastPageRows });
            break;
        } else {
            pages.push({ items: array.slice(currentIndex, currentIndex + middlePageRows), isFirst: false, isLast: false, maxRows: middlePageRows });
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
 * Generate the invoice HTML - InvoicePrintNine
 */
const generateInvoiceNineHTML = (invoiceData, branchData, time, currentCurrency) => {

    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
        const activateRoundoff = Boolean(generalSettings.RoundOff)
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';

    const showTax = invoiceData.taxType !== "NA";
    const isEstimate = invoiceData.taxType === "NA";

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(state.generalSettings.decimalPart)}`
            : Number(num).toFixed(state.generalSettings.decimalPart);

    const companyData = state.generalSettings;
    const salesSettings = state.saleSettings;
    const showLineDiscount = salesSettings?.showLineDiscount || false;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const {
        invoiceNo,
        date,
        customerName,
        customerVATNo,
        CustomerAddress,
        paymentMode,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        ledgerBalance = 0,
        othercharge = 0,
    roundOff = 0,
    } = invoiceData;

    const isCashCustomer = customerName && customerName.toLowerCase().includes('cash');

    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);

    const totalLineDiscount = salesDetails.reduce((sum, item) => {
    const gross = Number(item.qty || 0) * Number(item.rate || 0);
    const disc = gross - Number(item.netAmount || 0);
    return sum + Math.max(0, disc);
}, 0);

    const FIRST_PAGE_ROWS = 22;
    const MIDDLE_PAGE_ROWS = 30;
    const LAST_PAGE_ROWS = 14;

    const productPages = splitIntoPages(salesDetails, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;

    const topPadding = headerImage ? '140px' : '90px';
    const bottomPadding = footerImage ? '100px' : '100px';
    const lastPageBottomPadding = footerImage ? '320px' : '235px';

    let cumulativeIndex = 0;

    const headingEn = isEstimate ? 'ESTIMATE' : (invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'SIMPLIFIED TAX INVOICE');
    const headingAr = isEstimate ? 'تقدير' : (invoiceData.formType === 'Tax Invoice' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة');

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
                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}" style="padding: ${topPadding} 15px ${isLastPage ? lastPageBottomPadding : bottomPadding} 15px;">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>${headingEn}</span>
                        <span class="heading-ar">${headingAr}</span>
                    </h2>

                    <div class="header-section">
                        <div class="invoice-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">INVOICE NO<br><span class="rtl">رقم الفاتورة</span></td>
                                    <td class="bold">${invoiceNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">DATE<br><span class="rtl">تاريخ</span></td>
                                    <td>${formatDate(date)} ${time || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">SALES TYPE<br><span class="rtl">نوع المبيعات</span></td>
                                    <td class="bold">
                                        ${paymentMode === 'cash'
                                            ? 'Cash Sale'
                                            : paymentMode === 'bank'
                                                ? 'Bank Sale'
                                                : 'Credit Sale'
                                        }
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div class="customer-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">Customer Name<br><span class="rtl">اسم العميل</span></td>
                                    <td class="bold">${customerName || ''} </br>
                                    ${invoiceData?.customerData?.nameArb || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label">Customer VAT<br><span class="rtl">العميل ضريبة</span></td>
                                    <td>${customerVATNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Address<br><span class="rtl">عنوان</span></td>
                                    <td>
                                        ${CustomerAddress
                                            ? `${CustomerAddress}<br>${invoiceData?.customerData?.AddressArabic || ''}`
                                            : `
                                                ${invoiceData?.customerData?.BuildingNo || ''}<br>
                                                ${invoiceData?.customerData?.BuildingNoArb ? `${invoiceData?.customerData?.BuildingNoArb}<br>` : ''}
                                                ${invoiceData?.customerData?.StreetName || ''}<br>
                                                ${invoiceData?.customerData?.StreetNameArb ? `${invoiceData?.customerData?.StreetNameArb}<br>` : ''}
                                                ${invoiceData?.customerData?.CityName || ''}<br>
                                                ${invoiceData?.customerData?.CityNameArb ? `${invoiceData?.customerData?.CityNameArb}<br>` : ''}
                                                ${invoiceData?.customerData?.District || ''}<br>
                                                ${invoiceData?.customerData?.DistrictArb ? `${invoiceData?.customerData?.DistrictArb}<br>` : ''}
                                                ${invoiceData?.customerData?.Country || ''}<br>
                                                ${invoiceData?.customerData?.CountryArb ? `${invoiceData?.customerData?.CountryArb}<br>` : ''}
                                            `
                                        }
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>${headingEn} (Continued)</span>
                        <span>${headingAr} (تابع)</span>
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
                            ${showLineDiscount ? `
    <div class="col-disc-percent"><div>خصم %</div><div>DISC %</div></div>
    <div class="col-disc-amt"><div>مبلغ الخصم</div><div>DISC AMT</div></div>
` : ''}
                            ${showTax ? `
                            <div class="col-vat-percent"><div>ضريبة %</div><div>VAT %</div></div>
                            <div class="col-vat-amt"><div>مبلغ الضريبة</div><div>VAT AMT</div></div>
                            ` : ''}
                            <div class="col-total"><div>المبلغ الإجمالي</div><div>TOTAL AMT</div></div>
                        </div>

                        <div class="product-body">
                            ${pageProducts.map((item, index) => {
                                const globalIndex = pageStartIndex + index;

                                 const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const grossAmt = qty * rate;
    const discPercent = Number(item.discountPercentage || 0);
    const discAmt = Math.max(0, grossAmt - Number(item.netAmount || 0));


                                return `
                                <div class="product-row">
                                    <div class="col-sl" style="font-size: 10px;">${globalIndex + 1}</div>
                                    <div class="col-product">
                                        <div style="font-weight: 600;font-size: 10px;">${item.productName || ''}</div><br/>
                                        ${item.productNameArb ? `<div style="font-size: 10px;">${item.productNameArb}</div>` : ''}<br/>
                                        ${item.productDescription ? `<div style="font-size: 10px;">${item.productDescription}</div>` : ''}
                                    </div>
                                    <div class="col-qty" style="font-size: 10px;">${item?.qty || 0}</div>
                                    <div class="col-qty" style="font-size: 10px;">${item?.unitName || 'PCS'}</div>
<div class="col-price" style="font-size: 10px;">${rate.toFixed(state.generalSettings.decimalPart)}</div>
        ${showLineDiscount ? `
            <div class="col-disc-percent" style="font-size: 10px;">${discPercent.toFixed(2)}%</div>
            <div class="col-disc-amt" style="font-size: 10px;">${discAmt.toFixed(state.generalSettings.decimalPart)}</div>
        ` : ''} 
                                    ${showTax ? `
                                    <div class="col-vat-percent" style="font-size: 10px;">${item?.taxRate || 0}%</div>
                                    <div class="col-vat-amt" style="font-size: 10px;">${Number(item?.taxAmount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                    ` : ''}
                                    <div class="col-total" style="text-align:right;font-size: 10px;">${Number(item?.amount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                </div>
                                `;
                            }).join('')}

                            ${emptyRows.map(() => {
                                const taxCols = showTax ? '<div class="col-vat-percent"></div><div class="col-vat-amt"></div>' : '';
                                return `
                                <div class="product-row empty-row">
                                    <div class="col-sl"></div>
                                    <div class="col-product"></div>
                                    <div class="col-qty"></div>
                                    <div class="col-qty"></div>
                                    <div class="col-price"></div>
                                     ${showLineDiscount ? `
            <div class="col-disc-percent"></div>
            <div class="col-disc-amt"></div>
        ` : ''}
                                    ${taxCols}
                                    <div class="col-total"></div>
                                </div>
                                `;
                            }).join('')}

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>
                            ` : ''}
                        </div>

                        ${isLastPage ? `
                        <div class="product-footer">
                            <div class="col-sl"></div>
                            <div class="col-product" style="text-align: right; font-weight: 800;">
                                TOTAL / <span>المجموع</span>
                            </div>
                            <div class="col-qty">${totalQty.toFixed(0)}</div>
                            <div class="col-qty"></div>
                            <div class="col-price"></div>
                             ${showLineDiscount ? `
        <div class="col-disc-percent"></div>
        <div class="col-disc-amt">${totalLineDiscount.toFixed(state.generalSettings.decimalPart)}</div>
    ` : ''}
                            ${showTax ? `
                            <div class="col-vat-percent"></div>
                            <div class="col-vat-amt">${Number(totalVAT).toFixed(state.generalSettings.decimalPart)}</div>
                            ` : ''}
                            <div class="col-total">${Number(totalAmount).toFixed(state.generalSettings.decimalPart)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${isLastPage ? `
                <div class="total-section-fixed">
                    <div class="total-section-two">
                        <div class="description-section">
                            ${invoiceData?.narration ? `<div style="font-weight: bold; margin-bottom: 10px;">Description: ${invoiceData?.narration}</div>` : ''}
                        </div>
                        <div class="totals-section">
                            <table class="totals-table">
                                <tr>
                                    <td style="text-align: left;">Sub Total</td>
                                    <td style="text-align: right;padding-right:15px;"><span>المجموع الفرعي</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(subTotal)}</td>
                                </tr>
                                   ${Number(othercharge) !== 0 ? `   <tr>
                                    <td style="text-align: left;">Other Charge</td>
                                    <td style="text-align: right;padding-right:15px;"><span>رسوم اخرى</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(othercharge)}</td>
                                </tr>` : ""}
                             
                                 ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <tr>
                                    <td style="text-align: left;">Discount Amt</td>
                                    <td style="text-align: right;padding-right:15px;"><span>مقدار الخصم</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(billDiscount)}</td>
                                </tr>` : ""}
                                    <tr>
                                    <td style="text-align: left;">Taxable Amount</td>
                                      <td  style="text-align: right;padding-right:15px;" > <span>للضريبة الخاضع المبلغ</span><span>:</span></td>
                                    <td style="text-align: right;">
                                            ${fmt(
                                                Number(subTotal || 0) -
                                                Number(invoiceData?.billDiscount || 0) +
                                                Number(othercharge || 0)
                                            )}
                                    </td>
          
                                 </tr>
                                ${showTax ? `
                                <tr>
                                    <td style="text-align: left;">Vat @ 15%</td>
                                    <td style="text-align: right;padding-right:15px;"><span>ضريبة القيمة المضافة</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(totalTax)}</td>
                                </tr>
                                ` : ''}
                                ${(activateRoundoff && Number(roundOff) !== 0) ? `
                                    <tr>
                                    <td style="text-align: left;">Round Off</td>
                                    <td style="text-align: right; padding-right:15px;""><span>مبلغ الضريبة</span>  <span>:</span></td>
                                    <td style="text-align: right;"">${fmt( roundOff )}</td>
                                </tr>` : ""}
                                <tr class="grand-total-row">
                                    <th style="text-align: left; font-size: 16px;">Grand Total</th>
                                    <th style="text-align: right;padding-right:15px;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 16px;">${fmt(totalAmount)}</th>
                                </tr>
                                ${(!isCashCustomer && salesSettings.showCustomerBalanceBill) ? `
                                <tr class="customer-balance-row">
                                    <td style="text-align: left;">Customer Balance</td>
                                    <td style="text-align: right;padding-right:15px;"><span>رصيد العميل</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(ledgerBalance)}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>

                    <div class="amount-words-section">
                        <div style="font-weight: 900; margin-bottom: 5px;">Amount In Words <span>المبلغ بالكلمات</span> :-</div>
                        <div style="margin-top: 5px;">${amountToWords(totalAmount || 0).english}</div>
                        <div style="margin-top: 5px; text-align:right;">${amountToWords(totalAmount || 0).arabic}</div>
                    </div>

                    <div class="signature-section">
                        <div><span style="font-size: 10px; font-weight: 700;">AUTHORIZED SIGNATORY</span></div>
                        <div><span style="font-size: 10px; font-weight: 700;">CUSTOMER SIGNATURE</span></div>
                    </div>
                </div>
                ` : ''}

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
            <title>${headingEn} - ${invoiceNo}</title>
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
                    height: 297mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                }
                    .print-timestamp {
    position: absolute;
    bottom: 15mm;
    right: 3mm;
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
                .page:last-child { margin-bottom: 0; }
                .header-image { width: 100%; height: 130px; position: absolute; top: 0; left: 0; z-index: 1; }
                .header-image img { width: 100%; display: block; height: 100%; }
                .footer-image { width: 100%; position: absolute; bottom: 10px; left: 0; z-index: 1; }
                .footer-image img { width: 100%; display: block; }
                .content-wrapper {
                    flex: 1;
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                }
                .total-section-fixed {
                    position: absolute;
                    bottom: ${footerImage ? '90px' : '90px'};
                    left: 15px;
                    right: 15px;
                    z-index: 2;
                }
                .heading {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    font-size: 19px;
                    margin: 0 0 10px 0;
                    text-align: center;
                    font-weight: bold;
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: 1px solid rgb(216, 216, 216);
                    padding-top: 5px;
                    padding-bottom: 5px;
                }
                .heading-ar { font-size: 16px; }
                .header-text {
                    width: 100%;
                    padding: 20px 15px;
                    text-align: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                }
                .header-text .company-name { font-size: 20px; font-weight: 800; }
                .header-text .company-code,
                .header-text .company-vat { font-size: 12px; margin-top: 4px; }
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .invoice-details-section { flex: 1; }
                .customer-details-section { flex: 1; }
                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }
                .details-table td {
                    border: 1px solid rgb(216, 216, 216);
                    padding: 4px 8px;
                    vertical-align: top;
                }
                .details-table .label { font-weight: bold; width: 120px; }
                .rtl { direction: rtl; text-align: right; }
                .bold { font-weight: bold; }
                .product-table { border: 1px solid rgb(216, 216, 216); font-size: 14px; }
                .product-header, .product-row, .product-footer {
                    display: flex;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .product-footer { border-top: 1px solid rgb(216, 216, 216); }
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
                .product-row { height: 19px; }
                .product-row > div {
                    padding: 2px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                .empty-row { border-bottom: none; }
                .product-footer { border-bottom: none; font-weight: bold; }
                .product-footer > div {
                    padding: 8px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                ${showTax ? `
                    .col-sl { width: 5%; text-align: center; justify-content: center; }
    .col-product { width: 33%; font-size: 10px; }
    .col-qty { width: 5%; text-align: center; justify-content: center; }
    .col-price { width: 12%; text-align: right; justify-content: flex-end; }
    .col-disc-percent { width: 6%; text-align: center; justify-content: center; }
    .col-disc-amt { width: 8%; text-align: right; justify-content: flex-end; }
    .col-vat-percent { width: 7%; text-align: center; justify-content: center; }
    .col-vat-amt { width: 9%; text-align: right; justify-content: flex-end; }
    .col-total { width: 15%; text-align: right; justify-content: flex-end; }
` : `
    .col-sl { width: 6%; text-align: center; justify-content: center; }
    .col-product { width: 40%; font-size: 10px; }
    .col-qty { width: 6%; text-align: center; justify-content: center; }
    .col-price { width: 14%; text-align: right; justify-content: flex-end; }
    .col-disc-percent { width: 7%; text-align: center; justify-content: center; }
    .col-disc-amt { width: 9%; text-align: right; justify-content: flex-end; }
    .col-total { width: 18%; text-align: right; justify-content: flex-end; }
                `}

                    

                .product-header > div:last-child,
                .product-row > div:last-child,
                .product-footer > div:last-child { border-right: none; }
                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 10px;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .total-section-two {
                    display: flex;
                    border: 1px solid rgb(216, 216, 216);
                    margin-bottom: 10px;
                }
                .description-section {
                    width: 50%;
                    border-right: 1px solid rgb(216, 216, 216);
                    padding: 10px;
                }
                .totals-section {
                    width: 50%;
                    padding: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .totals-table tr td,
                .totals-table tr th {
                    padding: 3px 0;
                    font-size: 11px;
                }
                .totals-table .grand-total-row {
                    border-top: 2px solid rgb(216, 216, 216);
                    padding-top: 5px;
                }
                .totals-table .customer-balance-row {
                    background-color: #ffe6e6;
                    color: #d9534f;
                    font-weight: bold;
                    border-bottom: 2px solid rgb(216, 216, 216);
                }
                .totals-table .customer-balance-row td {
                    color: #d9534f;
                }
                .amount-words-section {
                    border: 1px solid rgb(216, 216, 216);
                    border-top: none;
                    padding: 10px;
                    font-size: 11px;
                    margin-bottom: 10px;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    border: 1px solid rgb(216, 216, 216);
                    border-top: none;
                    padding: 10px 15px;
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
 * Main print invoice function - InvoicePrintNine
 */
export const InvoicePrintNine = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceNineHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            getPrinterPreference('a4').then(savedPrinter => {
                printSilent(invoiceHTML, savedPrinter, 'a4').then(result => {
                    if (!result.success) {
                        console.error('❌ [INVOICE NINE] Print failed:', result.error);
                    }
                });
            });
            return { success: true };
        } catch (error) {
            console.error('❌ [INVOICE NINE] Error:', error);
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
 * Save invoice as PDF - InvoicePrintNine
 */
export const saveInvoiceNineAsPDF = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceNineHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}_nine.pdf`;

    if (isElectron()) {
        try {
            return window.electronAPI.savePDF(invoiceHTML, filename).then(result => {
                if (!result.success) {
                    console.error('❌ [INVOICE NINE] PDF save failed:', result.error);
                }
                return result;
            });
        } catch (error) {
            console.error('❌ [INVOICE NINE] Error saving PDF:', error);
            return Promise.resolve({ success: false, error: error.message });
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
        return Promise.resolve({ success: true });
    }
};

export default InvoicePrintNine;