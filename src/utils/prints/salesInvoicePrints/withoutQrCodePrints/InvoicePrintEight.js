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
 * Estimate how many wrapped lines a product row will take.
 */
const CHARS_PER_LINE = 40;

const estimateRowLines = (item) => {
    let lines = 0;
    if (item.productName) lines += Math.max(1, Math.ceil(String(item.productName).length / CHARS_PER_LINE));
    if (item.productNameArb) lines += Math.max(1, Math.ceil(String(item.productNameArb).length / CHARS_PER_LINE));
    if (item.productDescription) lines += Math.max(1, Math.ceil(String(item.productDescription).length / CHARS_PER_LINE));
    return Math.max(1, lines);
};

const ROW_BASE_HEIGHT = 19;
const ROW_LINE_HEIGHT = 12;
const ROW_VERTICAL_PADDING = 8;

const estimateRowHeight = (item) => {
    const lines = estimateRowLines(item);
    if (lines <= 1) return ROW_BASE_HEIGHT;
    return Math.max(ROW_BASE_HEIGHT, lines * ROW_LINE_HEIGHT + ROW_VERTICAL_PADDING);
};

/**
 * Height-based pagination.
 */
const splitIntoPagesByHeight = (array, firstPageHeight, middlePageHeight, lastPageHeight) => {
    if (array.length === 0) {
        return [{ items: [], isFirst: true, isLast: true }];
    }

    const heights = array.map(estimateRowHeight);
    const totalHeight = heights.reduce((s, h) => s + h, 0);

    if (totalHeight <= lastPageHeight) {
        return [{ items: array, isFirst: true, isLast: true }];
    }

    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    let pageIndex = 0;
    let i = 0;

    while (i < array.length) {
        const item = array[i];
        const itemHeight = heights[i];
        const capacity = pageIndex === 0 ? firstPageHeight : middlePageHeight;

        if (currentPage.length === 0 || currentHeight + itemHeight <= capacity) {
            currentPage.push(item);
            currentHeight += itemHeight;
            i++;
        } else {
            pages.push({ items: currentPage, isFirst: pageIndex === 0, isLast: false });
            currentPage = [];
            currentHeight = 0;
            pageIndex++;
        }
    }

    if (currentPage.length > 0) {
        pages.push({ items: currentPage, isFirst: pageIndex === 0, isLast: false });
    }

    if (pages.length > 0) {
        pages[pages.length - 1].isLast = true;
    }

    let last = pages[pages.length - 1];
    let lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight(it), 0);

    while (lastContentHeight > lastPageHeight && last.items.length > 1) {
        const overflowItem = last.items.pop();
        lastContentHeight -= estimateRowHeight(overflowItem);

        last.isLast = false;
        pages.push({ items: [overflowItem], isFirst: false, isLast: true });
        last = pages[pages.length - 1];
        lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight(it), 0);
    }

    return pages;
};

/**
 * Generate the invoice HTML
 */
export const generateInvoiceEightHTML = async (invoiceData, branchData, time, currentCurrency) => {

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

    const FIRST_PAGE_HEIGHT = headerImage ? 480 : 540;
    const MIDDLE_PAGE_HEIGHT = 950;
    const LAST_PAGE_HEIGHT = footerImage ? 420 : 520;

    const productPages = splitIntoPagesByHeight(salesDetails, FIRST_PAGE_HEIGHT, MIDDLE_PAGE_HEIGHT, LAST_PAGE_HEIGHT);
    const totalPages = productPages.length || 1;

    const topPadding = headerImage ? '140px' : '90px';
    const bottomPadding = footerImage ? '100px' : '100px';
    const lastPageBottomPadding = footerImage ? '320px' : '235px';

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage } = pageData;

        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        const emptyRowsCount = isLastPage ? 2 : 0;
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
                        <span>${isEstimate ? 'ESTIMATE' : (invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'SIMPLIFIED TAX INVOICE')}</span>
                        <div><span class="heading-ar">${isEstimate ? 'تقدير' : (invoiceData.formType === 'Tax Invoice' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة')}</span></div>
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
                                            ? `${CustomerAddress}, ${invoiceData?.customerData?.AddressArabic || ''}`
                                            : [
                                                invoiceData?.customerData?.BuildingNo,
                                                invoiceData?.customerData?.BuildingNoArb,
                                                invoiceData?.customerData?.StreetName,
                                                invoiceData?.customerData?.StreetNameArb,
                                                invoiceData?.customerData?.CityName,
                                                invoiceData?.customerData?.CityNameArb,
                                                invoiceData?.customerData?.District,
                                                invoiceData?.customerData?.DistrictArb,
                                                invoiceData?.customerData?.Country,
                                                invoiceData?.customerData?.CountryArb,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')
                                        }
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>${isEstimate ? 'ESTIMATE' : (invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'SIMPLIFIED TAX INVOICE')}</span>
                        <div><span class="heading-ar">${isEstimate ? 'تقدير' : (invoiceData.formType === 'Tax Invoice' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة')}</span></div>
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
                                        <div style="font-weight: 600;font-size: 10px;">${item.productName || ''}</div>
                                        ${item.productNameArb ? `<div style="font-size: 10px;">${item.productNameArb}</div>` : ''}
                                        ${item.productDescription ? `<div style="font-size: 10px;">${item.productDescription}</div>` : ''}
                                    </div>
                                    <div class="col-qty" style="font-size: 10px;">${item.qty || 0}</div>
                                    <div class="col-qty" style="font-size: 10px;">${item.unitName || 'PCS'}</div>
                                    <div class="col-price" style="font-size: 10px;">${rate.toFixed(state.generalSettings.decimalPart)}</div>
                                    ${showLineDiscount ? `
            <div class="col-disc-percent" style="font-size: 10px;">${discPercent.toFixed(2)}%</div>
            <div class="col-disc-amt" style="font-size: 10px;">${discAmt.toFixed(state.generalSettings.decimalPart)}</div>
        ` : ''}
                                    ${showTax ? `
                                        <div class="col-vat-percent" style="font-size: 10px;">${item?.taxRate || 0}%</div>
                                        <div class="col-vat-amt" style="font-size: 10px;">${item?.taxAmount || 0}</div>
                                    ` : ''}
                                    <div class="col-total" style="text-align:right;font-size: 10px;">${Number(item?.amount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                </div>
                                `;
                            }).join('')}

                            ${emptyRows.map(() => `
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
                                ${showTax ? `
                                    <div class="col-vat-percent"></div>
                                    <div class="col-vat-amt"></div>
                                ` : ''}
                                <div class="col-total"></div>
                            </div>
                            `).join('')}

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
                    ${invoiceData?.narration ? `<div class="narration">Remark : ${invoiceData?.narration}</div>` : ''}
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
                                    <td style="text-align: right;">${fmt(subTotal)}</td>
                                </tr>
                                ${Number(othercharge) !== 0 ? `  <tr>
                                    <td style="text-align: left;">Other Charge</td>
                                    <td style="text-align: right;padding-right:15px;"><span>رسوم اخرى</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(othercharge)}</td>
                                </tr>` : ""} 
                                 
                                ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <tr>
                                    <td style="text-align: left;">Discount Amount</td>
                                    <td style="text-align: right;padding-right:15px;"><span>مبلغ الخصم</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(billDiscount)}</td>
                                </tr>` : ""}
                                   <tr>
                                    <td style="text-align: left;">Taxable Amount</td>
                                      <td  style="text-align: right;padding-right:15px;"> <span>للضريبة الخاضع المبلغ </span><span>:</span></td>
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
                                    <td style="text-align: left;">VAT Amount</td>
                                    <td style="text-align: right;padding-right:15px;"><span>مبلغ الضريبة</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(totalTax)}</td>
                                </tr>
                                ` : ''}
                                ${(activateRoundoff && Number(roundOff) !== 0) ? `
                                    <tr>
                                    <td style="text-align: left;">Round Off</td>
                                    <td style="text-align: right; padding-right:15px;""><span>مبلغ الضريبة</span>  <span>:</span></td>
                                    <td style="text-align: right;"">${fmt( roundOff )}</td>
                                </tr>` : ""}
                                <tr>
                                    <th style="text-align: left; font-size: 20px;">Grand Total</th>
                                    <th style="text-align: right;padding-right:15px;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 20px;">${fmt(totalAmount)}</th>
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
            <title>${isEstimate ? 'ESTIMATE' : 'TAX INVOICE'} - ${invoiceNo}</title>
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
                    overflow: hidden;
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
                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; height: 130px; overflow: hidden; }
                .header-image img { width: 100%; display: block; height: 130px; }
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
                    margin: 0 0 30px 0;
                    font-weight: bold;
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: 1px solid rgb(216, 216, 216);
                    padding-top: 5px;
                    padding-bottom: 5px;
                    text-align: center;
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
                    margin-bottom: 15px;
                    gap: 15px;
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
                .product-row {
                    min-height: 19px;
                    height: auto;
                }
                .product-row > div {
                    padding: 4px 2px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                .col-product {
                    flex-direction: column;
                    align-items: flex-start !important;
                    justify-content: center;
                    padding: 4px 6px;
                }
                .empty-row { border-bottom: none; }
                .product-footer { border-bottom: none; font-weight: bold; }
                .product-footer > div {
                    padding: 8px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                .col-sl { width: 5%; text-align: center; justify-content: center; }
                .col-product { width: 45%; }
                .col-qty { width: 5%; text-align: center; justify-content: center; }
                .col-price { width: 14%; text-align: right; justify-content: flex-end; }
                .col-vat-percent { width: 7%; text-align: center; justify-content: center; }
                .col-vat-amt { width: 9%; text-align: right; justify-content: flex-end; }
                .col-total { width: 15%; text-align: right; justify-content: flex-end; }
                ${showLineDiscount ? `
    .col-disc-percent { width: 6%; text-align: center; justify-content: center; }
    .col-disc-amt { width: 8%; text-align: right; justify-content: flex-end; }
    .col-product { width: 31%; }
` : ''}
                ${!showTax ? `
                    .col-sl { width: 5%; }
                    .col-product { width: 55%; }
                    .col-qty { width: 8%; }
                    .col-price { width: 17%; }
                    .col-total { width: 15%; }
                     ${showLineDiscount ? `
        .col-disc-percent { width: 7%; }
        .col-disc-amt { width: 9%; }
        .col-product { width: 39%; }
    ` : ''}
                ` : ''}
                .product-header > div:last-child,
                .product-row > div:last-child,
                .product-footer > div:last-child { border-right: none; }
                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 10px;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .total-section { display: flex; margin-top: 10px; }
                .total-section .total-left-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                }
                .total-section .total-right-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                    display: flex;
                    justify-content: end;
                    align-items: center;
                    padding: 10px;
                }
                .total-right-side th { border: none; padding-top: 0px; padding-bottom: 0px; }
                .total-right-side table { height: 100px; }
                .signature-section-compact {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid rgb(216, 216, 216);
                    margin-top: 10px;
                }
                .customer-balance-row {
                    background-color: #ffe6e6 !important;
                    color: #d9534f;
                }
                .customer-balance-row td {
                    color: #d9534f;
                    font-weight: bold;
                    border-color: #d9534f;
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
 * Main print invoice function - SILENT PRINT
 */
export const InvoicePrintEight = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceEightHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (!result.success) {
                console.error('❌ [SALES INVOICE] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [SALES INVOICE] Error:', error);
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
 * Save invoice as PDF
 */
export const saveInvoiceEightAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceEightHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (!result.success) {
                console.error('❌ [SALES INVOICE] PDF save failed:', result.error);
            }
            return result;
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

export default InvoicePrintEight;