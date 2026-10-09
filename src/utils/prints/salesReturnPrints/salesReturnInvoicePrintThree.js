import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';
import QRCode from 'qrcode';

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
        if (dateStr.includes("-")) parts = dateStr.split("-");
        else if (dateStr.includes("/")) parts = dateStr.split("/");
        else return "";

        let day, month, year;
        if (parts[0].length === 2) { day = parts[0]; month = parts[1]; year = parts[2]; }
        else { year = parts[0]; month = parts[1]; day = parts[2]; }

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
 * ✅ Generate high-quality QR code as SVG string
 */
const generateQRCodeSVG = async (data, size = 110) => {
    try {
        const svgString = await QRCode.toString(data, {
            type: 'svg',
            width: size,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        });
        return svgString;
    } catch (error) {
        console.error('QR Code SVG generation failed:', error);
        return '';
    }
};

/**
 * ✅ Generate high-quality QR code as PNG data URL (fallback)
 */
const generateQRCodeDataURL = async (data, size = 500) => {
    try {
        const dataUrl = await QRCode.toDataURL(data, {
            width: size,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        });
        return dataUrl;
    } catch (error) {
        console.error('QR Code DataURL generation failed:', error);
        return '';
    }
};

/**
 * ✅ Resolve QR data — reprint uses saved qr_link, new invoice generates fresh
 */
const resolveQRData = (invoiceData, companyName, companyVatNo, time) => {
    if (invoiceData.qr_link && invoiceData.qr_link.trim() !== '') {
        if (invoiceData.qr_link.startsWith('http')) {
            try {
                const url = new URL(invoiceData.qr_link);
                return decodeURIComponent(url.searchParams.get('data') || '');
            } catch {
                return invoiceData.qr_link;
            }
        } else {
            return invoiceData.qr_link;
        }
    } else {
        return generateQRCodeData(invoiceData, companyName, companyVatNo, time);
    }
};

/**
 * Generate the invoice HTML - WITH LETTERHEAD BACKGROUND OR SEPARATE HEADER/FOOTER
 */
const generateInvoiceHTML = async (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const saleSettings = state.saleSettings;
        const activateRoundoff = Boolean(generalSettings.RoundOff)
     const showLineDiscount = saleSettings?.showLineDiscount || false;

    
    
    // ✅ Get letterhead paths from Redux state
    const LETTERHEAD_IMAGE_PATH = generalSettings?.CompanyLetterPad || '';
    const HEADER_IMAGE = generalSettings?.branchHeader || '';
    const FOOTER_IMAGE = generalSettings?.branchFooter || '';
    
    // ✅ Determine which mode to use
    const useFullLetterhead = LETTERHEAD_IMAGE_PATH && LETTERHEAD_IMAGE_PATH.trim() !== '';
    const useSeparateHeaderFooter = !useFullLetterhead && (HEADER_IMAGE || FOOTER_IMAGE);
    
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
        customerData = {},
        roundOff = 0,
    } = invoiceData;

     const calcLineDiscount = (item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const grossAmt = qty * rate;
        const discPercent = Number(item.discountPercentage || 0);
        return grossAmt * (discPercent / 100);
    };

    const qrData = resolveQRData(invoiceData, companyName, companyVatNo, time);
    const qrCodeSVG = await generateQRCodeSVG(qrData, 110);
    const qrCodeDataURL = await generateQRCodeDataURL(qrData, 500);

    const showCurrencyPrefix = state.generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(state.generalSettings.decimalPart)}`
            : Number(num).toFixed(state.generalSettings.decimalPart);

    // ✅ Dynamic padding based on mode
    const HEADER_PAD = useFullLetterhead ? '140px' : (useSeparateHeaderFooter ? '160px' : '20px');
    const FOOTER_PAD = useFullLetterhead ? '98px' : (useSeparateHeaderFooter ? '120px' : '20px');

    // Row configurations
    const FIRST_PAGE_ROWS = 23;
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
                <!-- ✅ Content wrapper — positioned over the white body area -->
                <div class="content-wrapper" style="padding-top: ${HEADER_PAD}; padding-bottom: ${FOOTER_PAD};">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>TAX CREDIT NOTE</span>
                        <span style="margin: 0 5px;font-size: 18px;">/</span>
                        <span>سند ائتمان ضريبي</span>
                    </h2>

                    <div class="invoice-header-row">
                        <div class="invoice-left">
                            <span class="inv-label">Return No:</span>
                            <span class="inv-number">${invoiceNo || ''}</span>
                        </div>
                     
                        <div class="invoice-right">
                            <span class="inv-number-ar">${invoiceNo || ''}</span>
                            <span class="inv-label-ar">رقم الفاتورة</span>
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
                                <td class="field-value text-right" colspan="7">${customerData.nameArb || ''}</td>
                                <td class="field-label-ar" colspan="1">الإسم:</td>
                            </tr>
                            <tr>
                                <td class="field-label">Street Name:</td>
                                <td class="field-value" colspan="3">${customerData.StreetName || ''}</td>
                                <td class="field-value text-right" colspan="3">${customerData.StreetNameArb || ''}</td>
                                <td class="field-label-ar">إسم الشارع</td>
                            </tr>
                            <tr>
                                <td class="field-label">Building No:</td>
                                <td class="field-value">${invoiceData.customerData?.BuildingNo || ''}</td>
                                <td class="field-label">City:</td>
                                <td class="field-value">${invoiceData.customerData?.CityName || ''}</td>
                                <td class="field-value text-right">${invoiceData.customerData?.CountryArb || ''}</td>
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
                                <td class="field-value" style="font-weight: 800;">${customerVATNo || ''}</td>
                                <td class="field-label">CRN:</td>
                                <td class="field-value">${customerData.cstNumber || ''}</td>
                                <td class="field-value text-right">${customerData.cstNumber || ''}</td>
                                <td class="field-label-ar">رقم السجل</td>
                                <td class="field-value text-right" style="font-weight: 800;">${customerVATNo || ''}</td>
                                <td class="field-label-ar">الرقم الضريبي</td>
                            </tr>
                        </table>
                    </div>

                    <div class="dates-section-box">
                        <table class="dates-full-table">
                            <tr>
                                <td class="date-header">تاريخ الفاتورة<br>Invoice Date</td>
                                <td class="date-header">تاريخ التسليم<br>Supply Date</td>
                                <td class="date-header">رقم امر الشراء<br>PO No / Contract</td>
                                <td class="date-header">رقم المرجع<br>Reference No / Project</td>
                            </tr>
                            <tr>
                                <td class="date-data">${formatDate(date)}</td>
                                <td class="date-data">${formatDate(date)}</td>
                                <td class="date-data"></td>
                                <td class="date-data"></td>
                            </tr>
                        </table>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>TAX CREDIT NOTE (Continued)</span>
                        <span>(تابع) سند ائتمان ضريبي</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold; font-size: 11px;">
                        Return No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
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
                            ${showLineDiscount ? `<div class="col-disc-amt">مبلغ الخصم<br>Disc Amt</div>` : ''}
                            <div class="col-total">المجموع<br>Net Value</div>
                            <div class="col-vat">ضريبة<br>VAT%</div>
                            <div class="col-vat-amt">مبلغ ضريبة<br>VAT Amount</div>
                            <div class="col-amount">الإجمالي<br>Total Amount</div>
                        </div>

                        <div class="product-rows">
                            ${pageProducts.length > 0 ? pageProducts.map((item, index) => {
                                const globalIndex = pageStartIndex + index;
                                const discAmt = calcLineDiscount(item);
                                const netAmt = (Number(item.qty || 0) * Number(item.rate || 0)) - discAmt;
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
                                        ${showLineDiscount ? `<div class="text-right">${discAmt.toFixed(generalSettings.decimalPart)}</div>` : ''}
                                        <div class="text-right">${netAmt.toFixed(generalSettings.decimalPart)}</div>
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
                        <div class="summary-qr-container">
                            <table class="summary-table">
                                <tr>
                                    <td class="summary-label">Total excl. VAT (SAR):</td>
                                    <td class="summary-value">${fmt(subTotal)}</td>
                                    <td class="summary-label-ar">الإجمالي غير شامل ضريبة القيمة المضافة</td>
                                    <td class="qr-cell" rowspan="4">
                                        ${qrCodeSVG ? qrCodeSVG : `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-code">`}
                                    </td>
                                </tr>
                                 ${((saleSettings?.showBillDiscountAmount || saleSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <tr>
                                    <td class="summary-label">Discount Amount:</td>
                                    <td class="summary-value">${fmt(billDiscount)}</td>
                                    <td class="summary-label-ar"><span>مقدار الخصم</span></td>
                                    
                                </tr>` : ""}
                                 <tr>
                                    <td class="summary-label">Taxable Amount:</td>
                                    <td class="summary-value">
                                            ${fmt(
                                                Number(subTotal || 0) -
                                                Number(invoiceData?.billDiscount || 0) 
                                            )}
                                    </td>
                                      <td class="summary-label-ar">المبلغ الخاضع للضريبة</td>
                                 </tr>
                                <tr>
                                    <td class="summary-label">VAT Amount (SAR):</td>
                                    <td class="summary-value">${fmt(totalTax)}</td>
                                    <td class="summary-label-ar">ضريبة القيمة المضافة</td>
                                </tr>
                                 ${activateRoundoff && Number(roundOff) !== 0 ? `
                                             <tr>
                                    <td class="summary-label grand-total">Round Off:</td>
                                    <td class="summary-value grand-total-value">${fmt( roundOff|| 0)}</td>
                                    <td class="summary-label-ar"><span>مبلغ الضريبة</span> </td>
                                </tr>` : ""}
                                <tr>
                                    <td class="summary-label grand-total">Amount Incl. VAT (SAR):</td>
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

                        <div class="bank-signature-section">
                            <div class="bank-details">
                                <div class="section-title">Bank Details / التفاصيل المصرفية</div>
                                <table class="bank-table">
                                    <tr>
                                        <td class="bank-label">Bank Name</td>
                                        <td class="bank-value">${branchData?.bankName || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Account Name</td>
                                        <td class="bank-value">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Account No.</td>
                                        <td class="bank-value">${branchData?.accountNo || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">IBAN</td>
                                        <td class="bank-value">${branchData?.iban || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Branch</td>
                                        <td class="bank-value">${branchData?.branch || ''}</td>
                                    </tr>
                                </table>
                            </div>

                            <div class="signature-boxes">
                                <div class="signature-box">
                                    <div class="sig-label">Prepared By</div>
                                    <div class="sig-space">التوقيع مع الختم<br>Signature with stamp</div>
                                </div>
                                <div class="signature-box">
                                    <div class="sig-label">Received By</div>
                                    <div class="sig-space">التوقيع مع الختم<br>Signature with stamp</div>
                                </div>
                            </div>
                        </div>
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
            <title>TAX CREDIT NOTE - ${invoiceNo}</title>
            <style>
                /* ── Reset ──────────────────────────────────────────────────── */
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }

                body {
                    background: #f0f0f0;
                    font-family: Arial, sans-serif;
                    font-size: 11px;
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
                    height: 120px;
                    object-fit: fill;
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
                    height: 90px;
                    object-fit: fill;
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
                    margin-bottom: 10px;
                    padding: 8px;
                    width: 95%;
                    margin: auto;
                }

                /* ── Invoice header row ─────────────────────────────────────── */
                .invoice-header-row {
                    display: flex;
                    margin-bottom: 10px;
                    align-items: center;
                    min-height: 20px;
                }
                .invoice-left {
                    flex: 1;
                    padding: 5px 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .invoice-center {
                    flex: 0 0 auto;
                    padding: 5px 20px;
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
                    grid-template-columns: ${showLineDiscount
                        ? '28px 55px auto 38px 35px 50px 50px 50px 38px 50px 50px'
                        : '28px 55px auto 38px 35px 50px 50px 38px 50px 50px'};
                    gap: 0;
                    background: #c0c0c0;
                    border-bottom: 1px solid gray;
                    padding: 0
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
                    grid-template-columns: ${showLineDiscount
                        ? '28px 55px auto 38px 35px 50px 50px 50px 38px 50px 50px'
                        : '28px 55px auto 38px 35px 50px 50px 38px 50px 50px'};
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
                 .col-disc-amt{
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
                }
                .summary-qr-container {
                    border: 0.5px solid gray;
                    margin-bottom: 2px;
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
                .summary-label { font-weight: bold; width: 150px; background: #e8e8e8; }
                .summary-value { text-align: right; font-weight: bold; width: 100px; }
                .summary-label-ar { text-align: right; font-size: 10px; background: #e8e8e8; }
                .grand-total { background: #e8e8e8; }
                .grand-total-value { background: #d0d0d0; font-size: 12px; }

                .qr-cell {
                    width: 130px;
                    text-align: center;
                    vertical-align: middle;
                    background: #fff;
                }
                .qr-cell svg {
                    width: 110px;
                    height: 110px;
                    display: inline-block;
                    shape-rendering: crispEdges;
                    image-rendering: pixelated;
                }
                .qr-cell img.qr-code {
                    width: 110px;
                    height: 110px;
                    image-rendering: pixelated;
                    -ms-interpolation-mode: nearest-neighbor;
                }

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

                /* ── Bank + signature ───────────────────────────────────────── */
                .bank-signature-section {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 10px;
                    margin-top: 10px;
                }
                .bank-details { border: 1px solid gray; }
                .section-title {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    border-bottom: 1px solid gray;
                    font-size: 10px;
                }
                .bank-table { width: 100%; border-collapse: collapse; }
                .bank-table td {
                    padding: 5px 8px;
                    border-bottom: 1px solid gray;
                    font-size: 9px;
                }
                .bank-table tr:last-child td { border-bottom: none; }
                .bank-label { font-weight: bold; width: 90px; }
                .bank-value { font-weight: normal; }

                .signature-boxes {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    border: 1px solid gray;
                }
                .signature-box {
                    border: none;
                    display: flex;
                    flex-direction: column;
                    min-height: 80px;
                }
                .signature-box + .signature-box { border-left: 1px solid gray; }
                .sig-label {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    border-bottom: 1px solid gray;
                    font-size: 10px;
                    text-align: center;
                }
                .sig-space {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: 9px;
                    line-height: 1.5;
                    padding: 10px;
                    min-height: 50px;
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
                    .qr-cell svg {
                        shape-rendering: crispEdges;
                        image-rendering: pixelated;
                    }
                    .qr-cell img {
                        image-rendering: pixelated;
                        -ms-interpolation-mode: nearest-neighbor;
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
 * Main print invoice function - SILENT PRINT
 */
export const salesReturnInvoicePrintThree = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [SALES RETURN TYPE 3] Printed successfully!');
            } else {
                console.error('❌ [SALES RETURN TYPE 3] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [SALES RETURN TYPE 3] Error:', error);
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

export default salesReturnInvoicePrintThree;