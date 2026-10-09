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
 * Generate the invoice HTML
 * ✅ Now async for QR generation, handles reprint qr_link
 */
const generateInvoiceHTML = async (invoiceData, branchData, time, currentCurrency) => {
    // console.log(invoiceData);
    
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
      const activateRoundoff = Boolean(generalSettings.RoundOff)
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
    totalTax = 0,
    totalAmount = 0,
    taxableAmt = 0,     // ✅ ADDED — fallback source when subTotal/totalAmount are empty
    ledgerBalance = 0,
    othercharge = 0,
    billDiscount = 0,
    roundOff = 0,
} = invoiceData;

    // ✅ Check if customer name contains 'cash' (case-insensitive)
    const isCashCustomer = customerName && customerName.toLowerCase().includes('cash');

    // ✅ Only generate QR if not an estimate
    let qrCodeSVG = '';
    let qrCodeDataURL = '';
    
    if (!isEstimate) {
        const qrData = resolveQRData(invoiceData, companyName, companyVatNo, time);
        qrCodeSVG = await generateQRCodeSVG(qrData, 110);
        qrCodeDataURL = await generateQRCodeDataURL(qrData, 500);
    }
const effectiveSubTotal = (subTotal !== undefined && subTotal !== null && Number(subTotal) !== 0)
    ? Number(subTotal)
    : Number(taxableAmt) || 0;
const effectiveGrandTotal = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) !== 0)
    ? Number(totalAmount)
    : Number(taxableAmt) || 0;

    const totalLineDiscount = salesDetails.reduce((sum, item) => {
    const gross = Number(item.qty || 0) * Number(item.rate || 0);
    const discPercent = Number(item.discountPercentage || 0);
    const discAmt = gross * (discPercent / 100);
    return sum + discAmt;
}, 0);

    const FIRST_PAGE_ROWS = 23;
    const MIDDLE_PAGE_ROWS = 34;
    const LAST_PAGE_ROWS = 10;

    const productPages = splitIntoPages(salesDetails, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;

const HEADER_HEIGHT = 120; // px, fixed
const FOOTER_HEIGHT = 80; // px, fixed

const topPadding = headerImage ? `${HEADER_HEIGHT}px` : '90px';
const bottomPadding = footerImage ? `${FOOTER_HEIGHT}px` : '100px';
const lastPageBottomPadding = footerImage ? `${FOOTER_HEIGHT + 280}px` : '320px';
    let cumulativeIndex = 0;

    // ✅ Determine heading text
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
                        <div class="company-code">C.R ${companyCode}</div>
                        <div class="company-vat">س ت ${companyVatNo}</div>
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
                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}" style="padding: ${topPadding} 25px ${isLastPage ? lastPageBottomPadding : bottomPadding} 25px;">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>${headingEn}</span>
                        <span>${headingAr}</span>
                    </h2>

                    <div class="invoice-header-row">
                        <div class="invoice-left">
                            <span class="inv-label">Invoice No:</span>
                            <span class="inv-number">${invoiceNo || ''}</span>
                        </div>
                        <div class="invoice-center">
                            <span class="sale-type">${paymentMode === 'cash' ? 'Cash Sale' : 'Credit Sale'}</span>
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
                                <td class="field-label">Name:</td>
                                <td class="field-value" colspan="4">${customerName || ''}</td>
                                <td class="field-label-ar">الإسم</td>
                            </tr>
                            <tr>
                                <td class="field-label">Street Name:</td>
                                <td class="field-value" colspan="4">${CustomerAddress || ''}</td>
                                <td class="field-label-ar">إسم الشارع</td>
                            </tr>
                            <tr>
                                <td class="field-label">Building No:</td>
                                <td class="field-value">${invoiceData.customerData?.BuildingNo || ''}</td>
                                <td class="field-label">City:</td>
                                <td class="field-value">${invoiceData.customerData?.CityName || ''}</td>
                                <td class="field-label-ar">المدينة</td>
                                <td class="field-label-ar">رقم المبنى</td>
                            </tr>
                            <tr>
                                <td class="field-label">Addl. No:</td>
                                <td class="field-value">${invoiceData.customerData?.AdditionalNo || ''}</td>
                                <td class="field-label">District:</td>
                                <td class="field-value">${invoiceData.customerData?.District || ''}</td>
                                <td class="field-label-ar">الحي</td>
                                <td class="field-label-ar">الرقم الإضافي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Postal Code:</td>
                                <td class="field-value">${invoiceData.customerData?.PostboxNo || ''}</td>
                                <td class="field-label">Country:</td>
                                <td class="field-value">${invoiceData.customerData?.Country || 'N/A'}</td>
                                <td class="field-label-ar">البلد</td>
                                <td class="field-label-ar">الرمز البريدي</td>
                            </tr>
                            <tr>
                                <td class="field-label">VAT Number:</td>
                                <td class="field-value">${customerVATNo || ''}</td>
                                <td class="field-label">CRN:</td>
                                <td class="field-value">${invoiceData.crn || ''}</td>
                                <td class="field-label-ar">رقم السجل</td>
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
                        <span>${headingEn} (Continued)</span>
                        <span>${headingAr} (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Invoice No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}
                                                                      
                    <table class="product-table">
                        <thead>
                            <tr>
                                <th class="col-no">رقم<br>SLNO</th>
                                <th class="col-desc">الوصف<br>Item Description</th>
                                <th class="col-unit">وحدة<br>Unit</th>
                                <th class="col-qty">الكمية<br>Qty</th>
                                <th class="col-rate">سعر الوحدة<br>Unit Rate</th>
                                ${showLineDiscount ? `
                                    <th class="col-disc-percent">خصم %<br>Disc %</th>
                                    <th class="col-disc-amt">مبلغ الخصم<br>Disc Amt</th>
                                ` : ''}         
                                <th class="col-total">المجموع<br>Total Price</th>
                                ${showTax ? `
                                <th class="col-vat">ضريبة<br>VAT%</th>
                                <th class="col-vat-amt">مبلغ ضريبة<br>VAT Amount</th>
                                ` : ''}
                                <th class="col-amount">الإجمالي<br>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageProducts.length > 0 ? pageProducts.map((item, index) => {
                                const globalIndex = pageStartIndex + index;

                                             const qty = Number(item.qty || 0);
                                            const rate = Number(item.rate || 0);
                                            const grossAmt = qty * rate;
                                            const discPercent = Number(item.discountPercentage || 0);
                                            const discAmt = grossAmt * (discPercent / 100);

                                return `
                                  <tr>
            <td class="text-center">${globalIndex + 1}</td>
            <td class="text-left">
            ${item.productName || ''}
            <div>${item.productDescription || ''}</div>
            </td>
            <td class="text-center">${item.unitName || 'N/A'}</td>
            <td class="text-center">${item.qty || 0}</td>
            <td class="text-right">${rate.toFixed(state.generalSettings.decimalPart)}</td>
            ${showLineDiscount ? `
            <td class="text-center">${discPercent.toFixed(2)}%</td>
            <td class="text-right">${discAmt.toFixed(state.generalSettings.decimalPart)}</td>
            ` : ''}
            <td class="text-right">${grossAmt.toFixed(state.generalSettings.decimalPart)}</td>
            ${showTax ? `
            <td class="text-center">${item.taxRate || 0}%</td>
            <td class="text-right">${Number(item.taxAmount || 0).toFixed(state.generalSettings.decimalPart)}</td>
            ` : ''}
            <td class="text-right">${Number(item.amount || 0).toFixed(state.generalSettings.decimalPart)}</td>
        </tr>
                                `;
                            }).join('') : ''}

                            ${emptyRows.map(() => {
                                 const discCols = showLineDiscount ? '<td>&nbsp;</td><td>&nbsp;</td>' : '';
                                const taxCols = showTax ? '<td>&nbsp;</td><td>&nbsp;</td>' : '';
                                return `
                                    <tr class="empty-row">
                                        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        ${discCols}
                                        <td>&nbsp;</td>
                                        ${taxCols}
                                        <td>&nbsp;</td>
                                    </tr>
                                `;
                            }).join('')}

                            ${!isLastPage && pageProducts.length > 0 ? `
                                <tr class="continuation-row">
        <td colspan="${(showTax ? 9 : 7) + (showLineDiscount ? 2 : 0)}" class="text-center">
            <strong>Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</strong>
        </td>
    </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>

                ${isLastPage ? `
                <div class="summary-section-fixed">
                    <div class="summary-qr-container">
                        <table class="summary-table">
                            <tr>
                                <td class="summary-label">Total excl. VAT (SAR):</td>
                               <td class="summary-value">${fmt(effectiveSubTotal)}</td>
                                <td class="summary-label-ar">الإجمالي غير شامل ضريبة القيمة المضافة</td>
                                ${!isEstimate ? `
                                <td class="qr-cell" rowspan="${showTax ? (isCashCustomer ? '4' : '5') : (isCashCustomer ? '3' : '4')}">
                                    ${qrCodeSVG ? qrCodeSVG : `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-code">`}
                                </td>
                                ` : ''}
                            </tr>
                              ${Number(othercharge) !== 0 ? ` <tr>
                                    <td class="summary-label">Other Charge:</td>
                                    <td class="summary-value">${fmt(othercharge)}</td>
                                    <td class="summary-label-ar"><span>رسوم اخرى</span> </td>
                                    
                                </tr>` : ""}      
                               

                                ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <tr>
                                    <td class="summary-label">Discount Amt:</td>
                                    <td class="summary-value">${fmt(billDiscount)}</td>
                                    <td class="summary-label-ar"><span>مقدار الخصم</span> </td>
                                    
                                </tr>` : ""}

                                <tr>
                                    <td class="summary-label">Taxable Amount:</td>
                                    <td class="summary-value">
                                            ${fmt(
                                                Number(subTotal || 0) -
                                                Number(invoiceData?.billDiscount || 0) +
                                                Number(othercharge || 0)
                                            )}
                                    </td>
                                      <td class="summary-label-ar">المبلغ الخاضع للضريبة</td>
                                 </tr>

                            ${showTax ? `
                            <tr>
                                <td class="summary-label">VAT Amount (SAR):</td>
                                <td class="summary-value">${fmt(totalTax)}</td>
                                <td class="summary-label-ar">ضريبة القيمة المضافة</td>
                            </tr>
                            ` : ''}
                                ${(activateRoundoff && Number(roundOff) !== 0) ? `
                                    <tr>
                                    <td class="summary-label">Round Off:</td>
                                    <td class="summary-value">${fmt( roundOff )}</td>
                                    <td class="summary-label-ar"><span>مبلغ الضريبة</span></td>
                                    
                                </tr>` : ""}
                            <tr>
                                <td class="summary-label grand-total">Amount Incl. VAT (SAR):</td>
                              <td class="summary-value grand-total-value">${fmt(effectiveGrandTotal)}</td>
                                <td class="summary-label-ar">المبلغ شامل ضريبة القيمة المضافة</td>
                            </tr>
                        ${(!isCashCustomer&&salesSettings.showCustomerBalanceBill) ? `
        <tr class="customer-balance-row">
            <td style="text-align: left;">Customer Balance</td>
            <td style="text-align: right;padding-right:15px;"><span>رصيد العميل</span> <span>:</span></td>
            <td style="text-align: right;">${fmt(ledgerBalance)}</td>
        </tr>
        ` : ''}
                            <tr>
                                <td colspan="3" class="amount-words">
                                  <strong>Amount in Words: ${amountToWords(effectiveGrandTotal).english}</strong><br>
<span class="ar">${amountToWords(effectiveGrandTotal).arabic}</span>
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
            <link href="https://fonts.googleapis.com/css2?family=Arial&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #fff;
                    margin: 0;
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                }
                .page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    margin-bottom: 10px;
                    page-break-after: always;
                    border: 0.5px solid #000;
                }
                    /* ✅ Vertical Print Timestamp in Right Corner */
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
                .page:last-child { margin-bottom: 0; }
                
          .header-image { 
    width: 100%; 
    height: 120px;
    position: absolute; 
    top: 0; 
    left: 0; 
    z-index: 1; 
    overflow: hidden;
}
.header-image img { 
    width: 100%; 
    height: 100%;
    display: block; 
    object-fit: fill;
}

.header-text {
    width: 100%;
    height: 120px;
    padding: 15px;
    text-align: center;
    border-bottom: 1px solid #000;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    background: #001f5c;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
}

.footer-image { 
    width: 100%; 
    height: 100px;
    position: absolute; 
    bottom: 0; 
    left: 0; 
    z-index: 1; 
    overflow: hidden;
}
.footer-image img { 
    width: 100%; 
    height: 100%;
    display: block; 
    object-fit: fill;
}

                .content-wrapper {
                    position: relative;
                    z-index: 2;
                }

                .heading {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    padding: 8px;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                }

                .invoice-header-row {
                    display: flex;
                    border: 1px solid #000;
                    margin-bottom: 10px;
                    align-items: center;
                    min-height: 30px;
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
                .inv-label { font-weight: bold; font-size: 10px; }
                .inv-number { font-weight: bold; font-size: 12px; }
                .invoice-left .inv-label,
                .invoice-left .inv-number,
                .invoice-right .inv-number-ar,
                .invoice-right .inv-label-ar { color: red; }
                .sale-type { font-weight: bold; font-size: 11px; }
                .inv-label-ar { font-weight: bold; font-size: 10px; }
                .inv-number-ar { font-weight: bold; font-size: 12px; }

                .client-details-box {
                    border: 1px solid #000;
                    margin-bottom: 2px;
                }
                .box-title {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    font-size: 10px;
                }
                .box-title .ar { float: right; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td {
                    padding: 3px 6px;
                    border: 1px solid #000;
                    font-size: 9px;
                }
                .field-label { font-weight: bold; background: #e8e8e8; }
                .field-value { font-weight: normal; }
                .field-label-ar { text-align: right; font-weight: bold; background: #e8e8e8; }

                .dates-section-box {
                    border: 1px solid #000;
                    margin-bottom: 2px;
                    margin-top: 2px;
                }
                .dates-full-table { width: 100%; border-collapse: collapse; }
                .dates-full-table td {
                    padding: 5px 8px;
                    border: 1px solid #000;
                    font-size: 9px;
                    text-align: center;
                }
                .date-header {
                    font-weight: bold;
                    font-size: 8px;
                    line-height: 1.4;
                    background: #d0d0d0;
                }
                .date-data { text-align: center; font-size: 9px; font-weight: bold; }

                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #000;
                    margin-top: 2px;
                    margin-bottom: 2px;
                }
                .product-table thead { background: #c0c0c0; }
                .product-table th {
                    border: 1px solid #000;
                    padding: 5px 4px;
                    font-size: 8px;
                    font-weight: bold;
                    text-align: center;
                    line-height: 1.3;
                }
                .product-table td {
                    border: 1px solid #000;
                    padding: 4px 6px;
                    font-size: 9px;
                }
                
               /* ✅ Dynamic column widths based on tax + discount visibility */
${showTax && showLineDiscount ? `
    .col-no { width: 4%; }
    .col-desc { width: 24%; }
    .col-unit { width: 5%; }
    .col-qty { width: 5%; }
    .col-rate { width: 9%; }
    .col-disc-percent { width: 6%; }
    .col-disc-amt { width: 9%; }
    .col-total { width: 10%; }
    .col-vat { width: 5%; }
    .col-vat-amt { width: 10%; }
    .col-amount { width: 13%; }
` : showTax ? `
    .col-no { width: 4%; }
    .col-desc { width: 30%; }
    .col-unit { width: 6%; }
    .col-qty { width: 6%; }
    .col-rate { width: 12%; }
    .col-total { width: 12%; }
    .col-vat { width: 6%; }
    .col-vat-amt { width: 12%; }
    .col-amount { width: 12%; }
` : showLineDiscount ? `
    .col-no { width: 5%; }
    .col-desc { width: 32%; }
    .col-unit { width: 7%; }
    .col-qty { width: 7%; }
    .col-rate { width: 12%; }
    .col-disc-percent { width: 7%; }
    .col-disc-amt { width: 10%; }
    .col-total { width: 10%; }
    .col-amount { width: 10%; }
` : `
    .col-no { width: 5%; }
    .col-desc { width: 40%; }
    .col-unit { width: 8%; }
    .col-qty { width: 8%; }
    .col-rate { width: 15%; }
    .col-total { width: 12%; }
    .col-amount { width: 12%; }
`}
                
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .empty-row td { height: 20px; }
                .continuation-row { background: #ffe6e6; }

                .summary-section-fixed {
                    position: absolute;
                    bottom: ${footerImage ? '90px' : '90px'};
                    left: 15px;
                    right: 15px;
                    padding-right:16px;
                    padding-left:16px;
                    z-index: 2;
                }
                .summary-qr-container {
                    border: 0.5px solid #000;
                    margin-bottom: 2px;
                    margin-top: 2px;
                }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table td {
                    padding: 6px 10px;
                    border: 1px solid #000;
                    font-size: 9px;
                }
                .summary-label { font-weight: bold; width: 150px; background: #e8e8e8; }
                .summary-value { text-align: right; font-weight: bold; width: 100px; }
                .summary-label-ar { text-align: right; font-size: 9px; background: #e8e8e8; }
                .grand-total { background: #e8e8e8; }
                .grand-total-value { background: #d0d0d0; font-size: 11px; }

                /* ✅ Customer Balance Styling */
                .customer-balance-label { 
                    font-weight: bold; 
                    background: #ffe6e6 !important; 
                    color: #d9534f;
                }
                .customer-balance-value { 
                    background: #ffe6e6 !important; 
                    color: #d9534f; 
                    font-weight: bold; 
                    font-size: 10px;
                }

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
                    font-size: 8px !important;
                    line-height: 1.5;
                    background: #fff;
                }
                .amount-words .ar {
                    display: block;
                    text-align: right;
                    margin-top: 3px;
                }

                .bank-signature-section {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 10px;
                }
                .bank-details { border: 1px solid #000; }
                .section-title {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    font-size: 9px;
                }
                .bank-table { width: 100%; border-collapse: collapse; }
                .bank-table td {
                    padding: 4px 8px;
                    border-bottom: 1px solid #ddd;
                    font-size: 8px;
                }
                .bank-table tr:last-child td { border-bottom: none; }
                .bank-label { font-weight: bold; width: 90px; }
                .bank-value { font-weight: normal; }

                .signature-boxes {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    border: 1px solid #000;
                }
                .signature-box {
                    border: none;
                    display: flex;
                    flex-direction: column;
                    min-height: 80px;
                }
                .signature-box + .signature-box { border-left: 1px solid #000; }
                .sig-label {
                    background: #d0d0d0;
                    padding: 5px 10px;
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    font-size: 9px;
                    text-align: center;
                }
                .sig-space {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: 8px;
                    line-height: 1.5;
                    padding: 10px;
                    min-height: 50px;
                }

                @media print {
                    body { background: white; padding: 0; }
                    .page { 
                        box-shadow: none; 
                        width: 100%; 
                        height: 297mm; 
                        margin-bottom: 0;
                        border: none;
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
export const printInvoiceThree = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [SALES INVOICE TYPE 3] Printed successfully!');
            } else {
                console.error('❌ [SALES INVOICE TYPE 3] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [SALES INVOICE TYPE 3] Error:', error);
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

export const saveInvoiceThreeAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}_v3.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (result.success) {
                return result;
            } else {
                console.error('❌ [SALES INVOICE TWO] PDF save failed:', result.error);
                return result;
            }
        } catch (error) {
            console.error('❌ [SALES INVOICE TWO] Error saving PDF:', error);
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

export default printInvoiceThree;