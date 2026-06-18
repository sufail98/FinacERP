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
 * Generate the sales order HTML - WITH LETTERHEAD BACKGROUND OR SEPARATE HEADER/FOOTER
 */
const generateOrderHTML = async (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);
    
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    
    // ✅ Get letterhead paths from Redux state
    const LETTERHEAD_IMAGE_PATH = generalSettings?.CompanyLetterPad || '';
    const HEADER_IMAGE = generalSettings?.branchHeader || '';
    const FOOTER_IMAGE = generalSettings?.branchFooter || '';

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(generalSettings.decimalPart)}`
            : Number(num).toFixed(generalSettings.decimalPart);
    
    // ✅ Determine which mode to use
    const useFullLetterhead = LETTERHEAD_IMAGE_PATH && LETTERHEAD_IMAGE_PATH.trim() !== '';
    const useSeparateHeaderFooter = !useFullLetterhead && (HEADER_IMAGE || FOOTER_IMAGE);
    
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const {
        invoiceNo,
        date,
        partyName:customerName,
        customerVATNo,
        CustomerAddress,
        paymentMode,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        customerData = {},
    } = invoiceData;

    // ✅ Dynamic padding based on mode
    const HEADER_PAD = useFullLetterhead ? '140px' : (useSeparateHeaderFooter ? '160px' : '20px');
    const FOOTER_PAD = useFullLetterhead ? '98px' : (useSeparateHeaderFooter ? '120px' : '20px');

    // Row configurations
    const FIRST_PAGE_ROWS = 19;
    const MIDDLE_PAGE_ROWS = 34;
    const LAST_PAGE_ROWS = 10;

    const productPages = splitIntoPages(salesDetails, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage } = pageData;

        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        return `
            <div class="page">
                ${useFullLetterhead ? `
                    <!-- ✅ Full Letterhead background -->
                    <img class="letterhead-bg" src="${LETTERHEAD_IMAGE_PATH}" alt="letterhead">
                ` : useSeparateHeaderFooter ? `
                    <!-- ✅ Separate Header Image -->
                    ${HEADER_IMAGE ? `<img class="header-img" src="${HEADER_IMAGE}" alt="header">` : ''}
                    
                    <!-- ✅ Separate Footer Image -->
                    ${FOOTER_IMAGE ? `<img class="footer-img" src="${FOOTER_IMAGE}" alt="footer">` : ''}
                ` : ''}

                <!-- ✅ Content wrapper — positioned over the white body area -->
                <div class="content-wrapper" style="padding-top: ${HEADER_PAD}; padding-bottom: ${FOOTER_PAD};">
                    ${isFirstPage ? `

                    <div class="invoice-header-row">
                        <div class="invoice-left">
                            <span class="inv-label">Order No:</span>
                            <span class="inv-number">${invoiceNo || ''}</span>
                        </div>
                        <div class="invoice-center">
                            <h2 class="heading">
                                <span>SALES ORDER</span>
                                <span style="margin: 0 5px;font-size: 18px;">/</span>
                                <span>أمر مبيعات</span>
                            </h2>
                        </div>
                        <div class="invoice-right">
                            <span class="inv-number-ar">${invoiceNo || ''}</span>
                            <span class="inv-label-ar">رقم الأمر</span>
                        </div>
                    </div>

                    <div class="client-details-box">
                        <div class="box-title">Client Details: <span class="ar">تفاصيل شركة العميل</span></div>
                        <table class="info-table">
                            <tr>
                                <td class="field-label" colspan="1">Name:</td>
                                <td class="field-value" colspan="7">${customerName || ''}</td>
                            </tr>
                            <tr>
                                <td class="field-value text-right" colspan="7">${customerData?.nameArb || ''}</td>
                                <td class="field-label-ar" colspan="1">الإسم:</td>
                            </tr>
                            <tr>
                                <td class="field-label">Street Name:</td>
                                <td class="field-value" colspan="3">${customerData?.StreetName || ''}</td>
                                <td class="field-value text-right" colspan="3">${customerData?.StreetNameArb || ''}</td>
                                <td class="field-label-ar">إسم الشارع</td>
                            </tr>
                            <tr>
                                <td class="field-label">Building No:</td>
                                <td class="field-value">${invoiceData?.customerData?.BuildingNo || ''}</td>
                                <td class="field-label">City:</td>
                                <td class="field-value">${invoiceData?.customerData?.CityName || ''}</td>
                                <td class="field-value text-right">${invoiceData?.customerData?.CountryArb || ''}</td>
                                <td class="field-label-ar">المدينة</td>
                                <td class="field-value text-right">${invoiceData.customerData?.BuildingNoArb || ''}</td>
                                <td class="field-label-ar">رقم المبنى</td>
                            </tr>
                            <tr>
                                <td class="field-label">District:</td>
                                <td class="field-value" colspan="3">${invoiceData.customerData?.District || ''}</td>
                                <td class="field-value text-right" colspan="3">${invoiceData.customerData?.DistrictArb || ''}</td>
                                <td class="field-label-ar">الحي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Postal Code:</td>
                                <td class="field-value">${invoiceData.customerData?.PostboxNo || ''}</td>
                                <td class="field-label">Addl. No:</td>
                                <td class="field-value">${invoiceData.customerData?.AdditionalNo || ''}</td>
                                <td class="field-value text-right">${invoiceData.customerData?.AdditionalNoArb || ''}</td>
                                <td class="field-label-ar">الرقم الإضافي</td>
                                <td class="field-value text-right">${invoiceData.customerData?.PostboxNoArb || ''}</td>
                                <td class="field-label-ar">الرمز البريدي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Country:</td>
                                <td class="field-value">${invoiceData.customerData?.Country || ''}</td>
                                <td class="field-label">Phone:</td>
                                <td class="field-value">${invoiceData.customerData?.phoneNo || ''}</td>
                                <td class="field-value text-right" colspan="3">${invoiceData.customerData?.CountryArb || ''}</td>
                                <td class="field-label-ar">البلد</td>
                            </tr>
                            <tr>
                                <td class="field-label">VAT Number:</td>
                                <td class="field-value" style="font-weight: 800;">${customerData?.tinNumber || ''}</td>
                                <td class="field-label">CRN:</td>
                                <td class="field-value">${customerData?.cstNumber || ''}</td>
                                <td class="field-value text-right">${customerData?.cstNumber || ''}</td>
                                <td class="field-label-ar">رقم السجل</td>
                                <td class="field-value text-right" style="font-weight: 800;">${customerData?.tinNumber || ''}</td>
                                <td class="field-label-ar">الرقم الضريبي</td>
                            </tr>
                        </table>
                    </div>

                    <div class="dates-section-box">
                        <table class="dates-full-table">
                            <tr>
                                <td class="date-header">تاريخ الفاتورة<br>Invoice Date</td>
                                <td class="date-header">تاريخ الصلاحية<br>Valid Until</td>
                                <td class="date-header">رقم امر الشراء<br>PO No / Contract</td>
                                <td class="date-header">رقم المرجع<br>Reference No / Project</td>
                            </tr>
                            <tr>
                                <td class="date-data">${formatDate(date)}</td>
                                <td class="date-data">${formatDate(invoiceData.validUntil || date)}</td>
                                <td class="date-data">${invoiceData.poNumber || ''}</td>
                                <td class="date-data">${invoiceData.referenceNo || ''}</td>
                            </tr>
                        </table>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>SALES ORDER (Continued)</span>
                        <span>أمر مبيعات (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold; font-size: 11px;">
                        Order No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}
                                                                      
                    <!-- PRODUCT DIV LAYOUT -->
                    <div class="product-container">
                        <div class="product-header">
                            <div class="col-no">رقم<br>SLNO</div>
                            <div class="col-code">الرمز<br>Code</div>
                            <div class="col-desc">الوصف<br>Item Description</div>
                            <div class="col-unit">وحدة<br>Unit</div>
                            <div class="col-qty">الكمية<br>Qty</div>
                            <div class="col-rate">سعر الوحدة<br>Rate</div>
                            <div class="col-total">المجموع<br>Net Value</div>
                            <div class="col-vat">ضريبة<br>VAT%</div>
                            <div class="col-vat-amt">مبلغ ضريبة<br>VAT Amount</div>
                            <div class="col-amount">الإجمالي<br>Total Amount</div>
                        </div>

                        <div class="product-rows">
                            ${pageProducts.length > 0 ? pageProducts.map((item, index) => {
                                const globalIndex = pageStartIndex + index;
                                return `
                                    <div class="product-row">
                                        <div class="col-no">${globalIndex + 1}</div>
                                        <div class="col-code">${item.productCode || ''}</div>
                                        <div class="col-desc">
                                            <div>${item.productName || ''}</div>
                                            ${item.productNameArb ? `<div>${item.productNameArb}</div>` : ''}
                                        </div>
                                        <div class="col-unit">${item.unitName || 'PCS'}</div>
                                        <div class="col-qty">${item.qty || 0}</div>
                                        <div class="col-rate">${Number(item.rate || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                        <div class="col-total">${Number((item.qty || 0) * (item.rate || 0)).toFixed(state.generalSettings.decimalPart)}</div>
                                        <div class="col-vat">${item.taxRate || 0}%</div>
                                        <div class="col-vat-amt">${Number(item.taxAmount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                        <div class="col-amount">${Number(item.amount || 0).toFixed(state.generalSettings.decimalPart)}</div>
                                    </div>
                                `;
                            }).join('') : ''}

                            ${!isLastPage && pageProducts.length > 0 ? `
                                <div class="continuation-row">
                                    <strong>Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</strong>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${isLastPage ? `
                    <div class="summary-section" style="margin-top: 15px;">
                        <table class="summary-table">
                            <tr>
                                <td class="summary-label">Total excl. VAT:</td>
                                <td class="summary-value">${fmt(subTotal)}</td>
                                <td class="summary-label-ar">الإجمالي غير شامل ضريبة القيمة المضافة</td>
                            </tr>
                            <tr>
                                <td class="summary-label">VAT Amount:</td>
                                <td class="summary-value">${fmt(totalTax)}</td>
                                <td class="summary-label-ar">ضريبة القيمة المضافة</td>
                            </tr>
                            <tr>
                                <td class="summary-label grand-total">Amount Incl. VAT:</td>
                                <td class="summary-value grand-total-value">${fmt(totalAmount)}</td>
                                <td class="summary-label-ar">المبلغ شامل ضريبة القيمة المضافة</td>
                            </tr>
                            <tr>
                                <td colspan="3" class="amount-words">
                                    <strong>Amount in Words: ${amountToWords(totalAmount || 0).english}</strong><br>
                                    <span class="ar">${amountToWords(totalAmount || 0).arabic}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    ` : ''}
                </div><!-- end content-wrapper -->
            </div><!-- end page -->
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SALES ORDER - ${invoiceNo}</title>
            <style>
                /* ── Reset ──────────────────────────────────────────────────── */
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }

                body {
                    background: #f0f0f0;
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                }

                /* ── Page shell — exactly A4 ────────────────────────────────── */
                .page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    overflow: hidden;
                    margin: 0 auto 10px;
                    page-break-after: always;
                }
                .page:last-child { margin-bottom: 0; }

                /* ✅ Full Letterhead background */
                .letterhead-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: fill;
                    z-index: 0;
                    display: block;
                }

                /* ✅ Separate Header Image */
                .header-img {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 150px;
                    object-fit: contain;
                    object-position: center top;
                    z-index: 1;
                    display: block;
                }

                /* ✅ Separate Footer Image */
                .footer-img {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 110px;
                    object-fit: contain;
                    object-position: center bottom;
                    z-index: 1;
                    display: block;
                }

                /* ✅ Content wrapper — sits above the background image */
                .content-wrapper {
                    position: relative;
                    z-index: 2;
                    padding-left: 15px;
                    padding-right: 15px;
                }

                /* ── Heading ────────────────────────────────────────────────── */
                .heading {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                }

                /* ── Invoice header row ─────────────────────────────────────── */
                .invoice-header-row {
                    display: flex;
                    margin-bottom: 10px;
                    align-items: center;
                    justify-content: space-between;
                    min-height: 20px;
                    margin-top: 10px;
                }
                .invoice-left {
                    flex: 1;
                    padding: 5px 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .invoice-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .invoice-right {
                    flex: 1;
                    padding: 5px 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .inv-label { font-weight: bold; font-size: 11px; }
                .inv-number { font-weight: bold; font-size: 13px; }
                .invoice-left .inv-label,
                .invoice-left .inv-number,
                .invoice-right .inv-number-ar,
                .invoice-right .inv-label-ar { color: brown; }
                .sale-type { font-weight: bold; font-size: 12px; }
                .inv-label-ar { font-weight: bold; font-size: 11px; }
                .inv-number-ar { font-weight: bold; font-size: 13px; }

                /* ── Client details box ─────────────────────────────────────── */
                .client-details-box {
                    border: 0.5px solid gray;
                    margin-bottom: 2px;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .box-title {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    font-size: 11px;
                }
                .box-title .ar { float: right; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td {
                    padding: 4px 6px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                }
                .field-label { font-weight: bold; background: #e8e8e8; }
                .field-value { font-weight: normal; }
                .field-label-ar { text-align: right; font-weight: bold; background: #e8e8e8; }
                .text-right { text-align: right; }

                /* ── Dates section ──────────────────────────────────────────── */
                .dates-section-box {
                    border: 0.5px solid gray;
                    margin-bottom: 2px;
                    margin-top: 2px;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .dates-full-table { width: 100%; border-collapse: collapse; }
                .dates-full-table td {
                    padding: 5px 8px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                    text-align: center;
                }
                .date-header {
                    font-weight: bold;
                    font-size: 9px;
                    line-height: 1.4;
                    background: #d0d0d0;
                }
                .date-data { text-align: center; font-size: 10px; font-weight: bold; }

                /* ========================================
                   PRODUCT DIV LAYOUT - NO BORDERS
                   ======================================== */
                .product-container {
                    margin-top: 2px;
                    border: 1px solid gray;
                    border-top: 1px solid gray;
                }

                .product-header {
                    display: grid;
                    grid-template-columns: 28px 55px auto 38px 35px 50px 50px 38px 50px 50px;
                    gap: 0;
                    background: #c0c0c0;
                    border-bottom: 1px solid gray;
                    padding: 0;
                }

                .product-header > div {
                    border-right: 1px solid gray;
                    padding: 6px 4px;
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                    line-height: 1.3;
                }

                .product-header > div:last-child {
                    border-right: none;
                }

                .product-rows {
                    display: block;
                }

                .product-row {
                    display: grid;
                    grid-template-columns: 28px 55px auto 38px 35px 50px 50px 38px 50px 50px;
                    gap: 0;
                    padding: 0;
                }

                .product-row > div {
                    border-right: 1px solid gray;
                    padding: 5px 6px;
                    font-size: 10px;
                    vertical-align: top;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                .product-row > div:last-child {
                    border-right: none;
                }

                /* Last row gets bottom border */
                .product-row:last-child > div {
                    border-bottom: 1px solid gray;
                }

                /* Column specific styles */
                .col-no {
                    text-align: center;
                    width: 28px;
                }

                .col-code {
                    text-align: center;
                    width: 55px;
                }

                .col-desc {
                    width: auto;
                    text-align: left;
                    line-height: 1.4;
                }

                .col-desc > div {
                    margin: 0;
                    padding: 0;
                }

                .col-unit {
                    text-align: center;
                    width: 38px;
                }

                .col-qty {
                    text-align: center;
                    width: 35px;
                }

                .col-rate {
                    text-align: right;
                    width: 50px;
                }

                .col-total {
                    text-align: right;
                    width: 50px;
                }

                .col-vat {
                    text-align: center;
                    width: 38px;
                }

                .col-vat-amt {
                    text-align: right;
                    width: 50px;
                }

                .col-amount {
                    text-align: right;
                    width: 50px;
                }

                /* Continuation row */
                .continuation-row {
                    background: #ffe6e6;
                    padding: 8px;
                    text-align: center;
                    font-weight: bold;
                    border-top: 1px solid gray;
                    border-bottom: 1px solid gray;
                }

                /* Bottom border for container */
                .product-container {
                    border-bottom: 1px solid gray;
                }

                /* ── Summary section ────────────────────────────────────────── */
                .summary-section {
                    position: relative;
                    z-index: 2;
                    border: 0.5px solid gray;
                    margin-top: 2px;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table td {
                    padding: 7px 10px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                }
                .summary-label { font-weight: bold; width: 35%; background: #e8e8e8; }
                .summary-value { text-align: right; font-weight: bold; width: 25%; }
                .summary-label-ar { text-align: right; font-size: 10px; background: #e8e8e8; width: 40%; }
                .grand-total { background: #e8e8e8; }
                .grand-total-value { background: #d0d0d0; font-size: 12px; }

                .amount-words {
                    padding: 8px 10px !important;
                    font-size: 9px !important;
                    line-height: 1.5;
                    background: #fff;
                }
                .amount-words .ar {
                    display: block;
                    text-align: right;
                    margin-top: 3px;
                }

                /* ── Print overrides ────────────────────────────────────────── */
                @media print {
                    body { 
                        background: white; 
                        padding: 0; 
                    }
                    .page { 
                        box-shadow: none; 
                        margin: 0;
                        width: 210mm;
                        height: 297mm;
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
 * Main print sales order function - SILENT PRINT
 */
export const salesOrderInvoicePrintFive = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    const invoiceHTML = await generateOrderHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                console.log('✅ [sales order] Printed successfully!');
            } else {
                console.error('❌ [sales order] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [sales order] Error:', error);
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

export default salesOrderInvoicePrintFive;