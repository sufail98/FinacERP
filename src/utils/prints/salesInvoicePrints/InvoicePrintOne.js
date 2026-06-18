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
 * ✅ Generate high-quality QR code as SVG string (inline, no external API)
 */
const generateQRCodeSVG = async (data, size = 120) => {
    try {
        const svgString = await QRCode.toString(data, {
            type: 'svg',
            width: size,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
        });
        return svgString;
    } catch (error) {
        console.error('QR Code SVG generation failed:', error);
        return '';
    }
};

/**
 * ✅ Generate high-quality QR code as PNG data URL (high DPI fallback)
 */
const generateQRCodeDataURL = async (data, size = 500) => {
    try {
        const dataUrl = await QRCode.toDataURL(data, {
            width: size,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
        });
        return dataUrl;
    } catch (error) {
        console.error('QR Code DataURL generation failed:', error);
        return '';
    }
};

/**
 * Generate the invoice HTML — ✅ Now async for QR generation
 */
const generateInvoiceHTML = async (invoiceData, branchData, time, currentCurrency) => {


    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    // ✅ Check if tax should be displayed
    const showTax = invoiceData.taxType !== "NA";
    // ✅ Check if this is an estimate
    const isEstimate = invoiceData.taxType === "NA";

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(state.generalSettings.decimalPart)}`
            : Number(num).toFixed(state.generalSettings.decimalPart);
    const companyData = state.generalSettings;
    const salesSettings = state.saleSettings;
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
        ledgerBalance = 0,  // ✅ Added ledgerBalance
    } = invoiceData;

    // ✅ Check if customer name contains 'cash' (case-insensitive)
    const isCashCustomer = customerName && customerName.toLowerCase().includes('cash');

    // ✅ NEW — use saved qr_link in reprint mode, generate fresh for new invoices
    let qrCodeSVG = '';
    let qrCodeDataURL = '';

    if (!isEstimate) {
        let qrData;

        if (invoiceData.qr_link && invoiceData.qr_link.trim() !== '') {
            // REPRINT MODE — use saved QR data from database
            if (invoiceData.qr_link.startsWith('http')) {
                // Phase 1: qr_link is a URL like:
                // https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BASE64_TLV
                // Extract the 'data' param which is the actual QR content
                try {
                    const url = new URL(invoiceData.qr_link);
                    qrData = decodeURIComponent(url.searchParams.get('data') || '');
                } catch {
                    qrData = invoiceData.qr_link;
                }
            } else {
                // Phase 2: qr_link is a direct base64 string (ZATCA QrCodeBase64)
                qrData = invoiceData.qr_link;
            }
        } else {
            // NEW INVOICE — no saved QR link, generate fresh
            qrData = generateQRCodeData(invoiceData, companyName, companyVatNo, time);
        }

        // Generate high-quality QR code from the data (works for both modes)
        qrCodeSVG = await generateQRCodeSVG(qrData, 120);
        qrCodeDataURL = await generateQRCodeDataURL(qrData, 500);
    }

    // Calculate totals
    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);

    // Row configurations
    const FIRST_PAGE_ROWS = 21;
    const MIDDLE_PAGE_ROWS = 30;
    const LAST_PAGE_ROWS = 18;

    // Split products into pages
    const productPages = splitIntoPages(salesDetails, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;

    // Calculate padding
    const topPadding = headerImage ? '140px' : '90px';
    const bottomPadding = footerImage ? '100px' : '100px';
    const lastPageBottomPadding = footerImage ? '320px' : '235px';

    // Track cumulative index
    let cumulativeIndex = 0;

    // Generate pages HTML
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

                    <div class="content-wrapper ${isLastPage ? 'last-page' : ''}" style="padding: ${topPadding} 15px ${isLastPage ? lastPageBottomPadding : bottomPadding} 15px;">
                        ${isFirstPage ? `
                        <h2 class="heading">
                            <span>${isEstimate ? 'ESTIMATE' : (invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'SIMPLIFIED TAX INVOICE')}</span>
                            <span>${isEstimate ? 'تقدير' : (invoiceData.formType === 'Tax Invoice' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة')}</span>
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
                    : paymentMode === 'card'
                        ? 'Bank Sale'
                        : 'Credit Sale'
                }
    </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- ✅ QR Code Section - Hidden for Estimate, SVG with PNG fallback -->
                            ${!isEstimate ? `
                            <div class="qr-section">
                                ${qrCodeSVG ? qrCodeSVG : `<img src="${qrCodeDataURL}" alt="QR Code">`}
                            </div>
                            ` : `
                            <div class="qr-section" style="background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #999; font-size: 11px;">No QR Code for Estimate</span>
                            </div>
                            `}

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
    <td class="label">
        Address<br><span class="rtl">عنوان</span>
    </td>
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
                            <span>${isEstimate ? 'ESTIMATE (Continued)' : (invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE (Continued)' : 'SIMPLIFIED TAX INVOICE (Continued)')}</span>
                            <span>${isEstimate ? '(تابع) تقدير' : (invoiceData.formType === 'Tax Invoice' ? '(تابع) فاتورة ضريبية' : 'فاتورة ضريبية مبسطة (تابع)')}</span>
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
    ${showTax ? `
        <div class="col-vat-percent"><div>ضريبة %</div><div>VAT %</div></div>
        <div class="col-vat-amt"><div>مبلغ الضريبة</div><div>VAT AMT</div></div>
    ` : ''}
    <div class="col-total"><div>المبلغ الإجمالي</div><div>TOTAL AMT</div></div>
</div>

                            <div class="product-body">
                             ${pageProducts.map((item, index) => {
                    const globalIndex = pageStartIndex + index;
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
            <div class="col-price" style="font-size: 10px;">${(Number(item?.rate).toFixed(state.generalSettings.decimalPart)) || 0}</div>
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
        <tr>
            <td style="text-align: left;">Discount Amount</td>
            <td style="text-align: right;padding-right:15px;"><span>مبلغ الخصم</span> <span>:</span></td>
            <td style="text-align: right;">${fmt(billDiscount)}</td>
        </tr>
        ${showTax ? `
        <tr>
            <td style="text-align: left;">VAT Amount</td>
            <td style="text-align: right;padding-right:15px;"><span>مبلغ الضريبة</span> <span>:</span></td>
            <td style="text-align: right;">${fmt(totalTax)}</td>
        </tr>
        ` : ''}
        <tr>
            <th style="text-align: left; font-size: 20px;">Grand Total</th>
            <th style="text-align: right;padding-right:15px;"><span>المجموع الإجمالي</span> <span>:</span></th>
            <th style="text-align: right; font-size: 20px;">${fmt(totalAmount)}</th>
        </tr>
      ${(!isCashCustomer&&salesSettings.showCustomerBalanceBill) ? `
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

                    /* ✅ QR Section - supports both SVG and IMG */
                    .qr-section {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .qr-section svg {
                        width: 130px;
                        height: 130px;
                        display: block;
                        shape-rendering: crispEdges;
                        image-rendering: pixelated;
                    }
                    .qr-section img {
                        width: 130px;
                        height: 130px;
                        display: block;
                        image-rendering: pixelated;
                        -ms-interpolation-mode: nearest-neighbor;
                    }

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
                        padding: 2px;
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
                 /* Default widths with tax */
.col-sl { width: 5%; text-align: center; justify-content: center; }
.col-product { width: 45%; }
.col-qty { width: 5%; text-align: center; justify-content: center; }
.col-price { width: 14%; text-align: right; justify-content: flex-end; }
.col-vat-percent { width: 7%; text-align: center; justify-content: center; }
.col-vat-amt { width: 9%; text-align: right; justify-content: flex-end; }
.col-total { width: 15%; text-align: right; justify-content: flex-end; }
 ${!showTax ? `
        /* Adjusted widths when tax is hidden */
        .col-sl { width: 5%; }
        .col-product { width: 55%; }
        .col-qty { width: 8%; }
        .col-price { width: 17%; }
        .col-total { width: 15%; }
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
                    /* ✅ Customer Balance Row Styling */
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

                        /* ✅ Ensure QR prints sharp */
                        .qr-section svg {
                            shape-rendering: crispEdges;
                            image-rendering: pixelated;
                        }
                        .qr-section img {
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
 * ✅ No longer needs invoiceQr parameter — generates it internally
 */
export const printInvoiceOne = async (invoiceData, branchData, time, currentCurrency) => {


    // ✅ generateInvoiceHTML is now async (QR generation)
    const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [SALES INVOICE] Printed successfully!');
            } else {
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
 * ✅ Also updated to use local QR generation
 */
export const saveInvoiceAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);
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

export default printInvoiceOne;