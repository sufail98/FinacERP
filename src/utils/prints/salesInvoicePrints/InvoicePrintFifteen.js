import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';
import QRCode from 'qrcode';

/**
 * ============================================================
 *  PRINT TYPE: FIFTEEN
 *  Exact replica of the "TECHZERA" style Tax Invoice PDF layout
 *  — now with height-based multi-page pagination (ported from
 *  printInvoiceOne.js) so large item lists no longer overflow
 *  or collide with the totals/signature block.
 * ============================================================
 */

/* ---------------------------------------------------------------
 *  Shared helpers (kept identical to printInvoiceOne.js so numeric
 *  / QR / date behaviour matches exactly across print types)
 * ------------------------------------------------------------- */

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

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

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

/* ---------------------------------------------------------------
 *  ✅ NEW — Height-based pagination (ported from printInvoiceOne.js)
 *  Instead of dumping every row into a single table, rows are
 *  packed into pages based on ESTIMATED RENDERED HEIGHT so long
 *  product/description text (which wraps to multiple lines)
 *  doesn't break the layout or collide with the totals block.
 * ------------------------------------------------------------- */

const CHARS_PER_LINE_15 = 45; // tune against .c-desc column width / 11px font

const estimateRowLines15 = (item) => {
    let lines = 0;
    if (item.productName) lines += Math.max(1, Math.ceil(String(item.productName).length / CHARS_PER_LINE_15));
    if (item.productNameArb) lines += Math.max(1, Math.ceil(String(item.productNameArb).length / CHARS_PER_LINE_15));
    if (item.productDescription) lines += Math.max(1, Math.ceil(String(item.productDescription).length / CHARS_PER_LINE_15));
    return Math.max(1, lines);
};

const ROW_BASE_HEIGHT_15 = 18;    // matches a single .prod-row at 11px font + padding
const ROW_LINE_HEIGHT_15 = 11;    // extra px per wrapped line
const ROW_VERTICAL_PADDING_15 = 6;

const estimateRowHeight15 = (item) => {
    const lines = estimateRowLines15(item);
    if (lines <= 1) return ROW_BASE_HEIGHT_15;
    return Math.max(ROW_BASE_HEIGHT_15, lines * ROW_LINE_HEIGHT_15 + ROW_VERTICAL_PADDING_15);
};

const splitIntoPagesByHeight15 = (array, firstPageHeight, middlePageHeight, lastPageHeight) => {
    if (array.length === 0) {
        return [{ items: [], isFirst: true, isLast: true }];
    }

    const heights = array.map(estimateRowHeight15);
    const totalHeight = heights.reduce((s, h) => s + h, 0);

    // Everything fits on a single page (first-page layout + totals/signature)
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

    // Ensure the last page's content (rows) still leaves room for the
    // totals / amount-in-words / signature block that renders below it.
    let last = pages[pages.length - 1];
    let lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight15(it), 0);

    while (lastContentHeight > lastPageHeight && last.items.length > 1) {
        const overflowItem = last.items.pop();
        lastContentHeight -= estimateRowHeight15(overflowItem);

        last.isLast = false;
        pages.push({ items: [overflowItem], isFirst: false, isLast: true });
        last = pages[pages.length - 1];
        lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight15(it), 0);
    }

    return pages;
};

/* ---------------------------------------------------------------
 *  MAIN TEMPLATE — now generates one `.page` block per pagination
 *  chunk. First page carries the title / meta / QR / customer
 *  details block; every page carries the product table; only the
 *  LAST page carries the totals strip, amount-in-words, and
 *  signature row.
 * ------------------------------------------------------------- */
export const generateInvoiceFifteenHTML = async (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);


    const state = store.getState().settings;
    const generalSettings = state.generalSettings;

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const currencyCode = currentCurrency ? (currentCurrency.currencyCode || 'SAR') : 'SAR';
    const decimalPart = state.generalSettings.decimalPart;

    const showTax = invoiceData.taxType !== "NA";
    const isEstimate = invoiceData.taxType === "NA";

    const fmtPlain = (num) => Number(num || 0).toFixed(decimalPart);
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${fmtPlain(num)}`
            : fmtPlain(num);
    const fmtCur = (num) => `${fmtPlain(num)} ${currencyCode}`;

    const companyData = state.generalSettings;
    const salesSettings = state.saleSettings;
    const activateRoundoff = Boolean(companyData.RoundOff);

    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || companyData.taxNo || '';

    const {
        invoiceNo,
        refNo,
        date,
        customerName,
        customerVATNo,
        crNumber,
        CustomerAddress,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        taxableAmt = 0,
        othercharge = 0,
        roundOff = 0,
        narration,
        bankDetails = {},
    } = invoiceData;

    /* QR (ZATCA) — same generation approach as printType One */
    let qrCodeDataURL = '';
    if (!isEstimate) {
        let qrData;
        if (invoiceData.qr_link && invoiceData.qr_link.trim() !== '') {
            if (invoiceData.qr_link.startsWith('http')) {
                try {
                    const url = new URL(invoiceData.qr_link);
                    qrData = decodeURIComponent(url.searchParams.get('data') || '');
                } catch {
                    qrData = invoiceData.qr_link;
                }
            } else {
                qrData = invoiceData.qr_link;
            }
        } else {
            qrData = generateQRCodeData(invoiceData, companyName, companyVatNo, time);
        }
        qrCodeDataURL = await generateQRCodeDataURL(qrData, 500);
    }

    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const totalLineDiscount = salesDetails.reduce((sum, item) => {
        const gross = Number(item.qty || 0) * Number(item.rate || 0);
        const disc = gross - Number(item.netAmount || 0);
        return sum + Math.max(0, disc);
    }, 0);

    const effectiveSubTotal = (subTotal !== undefined && subTotal !== null && Number(subTotal) !== 0)
        ? Number(subTotal)
        : Number(taxableAmt) || 0;

    const effectiveGrandTotal = (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) !== 0)
        ? Number(totalAmount)
        : Number(taxableAmt) || 0;

    const itemCount = salesDetails.length;

    const amountWords = amountToWords(effectiveGrandTotal, currencyCode === 'SAR' ? 'Saudi Riyal' : currencyCode, 'ريال سعودي');

    /* ---------------- Bank details table (key : value) ----------------
     *  Pulled from invoiceData.bankDetails (bankname, bankBranchName,
     *  accountNo, ibanno). Rendered as a compact key/value table that
     *  sits on the LEFT half of the signature strip on the last page.
     * ------------------------------------------------------------- */
    const bankRows = [
        { key: 'Bank Name', keyAr: 'اسم البنك', val: bankDetails.bankname },
        { key: 'Branch Name', keyAr: 'اسم الفرع', val: bankDetails.bankBranchName },
        { key: 'Account No', keyAr: 'رقم الحساب', val: bankDetails.accountNo },
        { key: 'IBAN No', keyAr: 'رقم الآيبان', val: bankDetails.ibanno },
    ].filter(row => row.val !== undefined && row.val !== null && String(row.val).trim() !== '');

    const bankTableHTML = bankRows.length ? `
        <table class="bank-table">
            <tr class="banktableheading">
                <th>
                    Bank Details
                </th>
                <th>
                   تفاصيل البنك
                </th>
            </tr>
            ${bankRows.map(row => `
                <tr>
                    <td class="bank-key">${row.key}</td>
                    <td class="bank-val">${row.val}</td>
                </tr>
            `).join('')}
        </table>
    ` : '';

    // Match printInvoiceOne's header/footer image reserved space
    const topPadding = headerImage ? '110px' : '20px';
    const bottomPadding = footerImage ? '90px' : '20px';

    /* ---------------- Height-based page budgets (px) ----------------
     * FIRST page carries: invoice title + meta rows + QR/customer box,
     *   so less room remains for product rows.
     * MIDDLE pages are pure product table, full page.
     * LAST page must reserve room below the table for the totals /
     *   amount-in-words / signature block.
     * Tune these against your real A4 rendering if pages overflow/underflow.
     * ------------------------------------------------------------- */
    const FIRST_PAGE_HEIGHT_15 = headerImage ? 430 : 500;
    const MIDDLE_PAGE_HEIGHT_15 = 700;
    const LAST_PAGE_HEIGHT_15 = footerImage ? 230 : 300;

    const productPages = splitIntoPagesByHeight15(
        salesDetails,
        FIRST_PAGE_HEIGHT_15,
        MIDDLE_PAGE_HEIGHT_15,
        LAST_PAGE_HEIGHT_15
    );
    const totalPages = productPages.length || 1;

    let cumulativeIndex = 0;

    const buildRowsHTML = (pageProducts, pageStartIndex) => pageProducts.map((item, index) => {
        const globalIndex = pageStartIndex + index;
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const grossAmt = qty * rate;
        const discAmt = Math.max(0, grossAmt - Number(item.netAmount || 0));

        return `
            <tr class="prod-row">
                <td class="c-sl">${globalIndex + 1}</td>
                <td class="c-code">
                    ${item.productCode || item.itemCode || ''}
                </td>
                <td class="c-desc">
                    ${item.productName || ''}${item?.productDescription ? ` - ${item.productDescription}` : ''}
                    ${item.productNameArb ? `<div class="desc-sub">${item.productNameArb}</div>` : ''}
                </td>
                <td class="c-unit">${item.unitName || 'PCS'}</td>
                <td class="c-qty">${qty.toFixed(decimalPart || 2)}</td>
                <td class="c-price">${rate.toFixed(decimalPart || 2)}</td>
                <td class="c-disc">${discAmt.toFixed(decimalPart || 2)}</td>
                ${showTax ? `<td class="c-vatp">${item?.taxRate || 0}%</td>
                <td class="c-vatamt">${Number(item?.taxAmount || 0).toFixed(decimalPart || 2)}</td>` : ''}
                <td class="c-total">${Number(item?.amount || 0).toFixed(decimalPart || 2)}</td>
            </tr>
        `;
    }).join('');

    const tableHeadHTML = `
        <thead>
            <tr>
                <th><span class="ar">متسلسل</span><span class="en">Sr.No</span></th>
                <th><span class="ar">رقم الصنف</span><span class="en">Item Code</span></th>
                <th><span class="ar">وصف الصنف</span><span class="en">Description</span></th>
                <th><span class="ar">وحدة</span><span class="en">Unit</span></th>
                <th><span class="ar">الكمية</span><span class="en">Qty</span></th>
                <th><span class="ar">السعر</span><span class="en">Price</span></th>
                <th><span class="ar">خصم</span><span class="en">Discount</span></th>
                ${showTax ? `<th><span class="ar">ضريبة %</span><span class="en">VAT%</span></th>
                <th><span class="ar">قيمة الضريبة</span><span class="en">VAT Amount</span></th>` : ''}
                <th><span class="ar">السعر الإجمالي</span><span class="en">Total Price</span></th>
            </tr>
        </thead>
    `;

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
                    <div class="header-text">
                        <div class="company-name">${companyName}</div>
                        <div class="company-code">${companyCode}</div>
                        <div class="company-vat">VAT No: ${companyVatNo}</div>
                    </div>
                `}

                <div class="content-wrapper">

                ${isFirstPage ? `
                <div class="invoice-title">
                    <div>${isEstimate ? 'ESTIMATE / تقدير' : `${(invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'TAX INVOICE')} / فاتورة ضريبية`}</div>
                </div>

                <div class="meta-row">
                <div><span class="lbl">Invoice Date</span> <span style="font-weight:600;">${formatDate(date)} ${time || ''}</span> &nbsp;&nbsp;<span class="lbl">تاريخ الفاتورة</span></div>
                <div><span class="lbl">Invoice No</span><span style="font-weight:600;"> ${invoiceNo || ''}</span>  &nbsp;&nbsp;<span class="lbl">رقم الفاتورة</span></div>
                </div>
                <div class="meta-row" style="justify-content:flex-end;">
                    <div><span class="lbl">Reference No</span> ${refNo || ''} &nbsp;&nbsp;<span class="lbl">رقم المرجع</span></div>
                </div>

                <div class="qr-customer-row">
                    <div class="qr-box">
                        ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code">` : ''}
                    </div>
                    <div class="cust-box">
                        <div class="cust-hdr"><span>Customer Details</span><span>تفاصيل العميل</span></div>
                       <div class="cust-box-inner">
                        <div class="cust-line"><span class="cust-name">NAME ${customerName || ''}</span><span>اسم العميل</span></div>
                        <div class="cust-line"><span>VAT No ${customerVATNo || ''}</span><span>${customerVATNo || ''} رقم ضريبة</span></div>
                        <div class="cust-line"><span>CR Number ${crNumber || ''}</span><span>${crNumber || ''} السجل التجاري</span></div>
                        <div class="cust-line"><span>${CustomerAddress || ''}</span><span></span></div>
                       </div>
                    </div>
                </div>
                ` : `
                <div class="invoice-title" style="font-size:14px;">
                    <div>${isEstimate ? 'ESTIMATE / تقدير' : `${(invoiceData.formType === 'Tax Invoice' ? 'TAX INVOICE' : 'TAX INVOICE')} / فاتورة ضريبية`}</div>
                </div>
                <div class="cont-meta">
                    Invoice No: ${invoiceNo || ''} &nbsp;|&nbsp; Page ${pageIndex + 1} of ${totalPages}
                </div>
                `}

                <table class="prod-table">
                    ${tableHeadHTML}
                    <tbody>
                        ${buildRowsHTML(pageProducts, pageStartIndex)}
                    </tbody>
                </table>

                ${!isLastPage ? `
                    <div class="continuation-note">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>
                ` : `<div class="prod-body-fill"></div>`}

                ${isLastPage ? `
                <div class="totals-wrap">
                    <div class="totals-left">
                    <div class="totals-wrap-top">
                        <div class="note-lbl">Note / ملحوظة</div>
                        <div>${narration || ''}</div>
                    </div>
                    <div class="totals-wrap-bottom">
                       <div class="words-strip">
                            <div>${amountWords.english}</div>
                            <div class="ar">${amountWords.arabic}</div>
                        </div>
                    </div>
                    </div>
                    <div class="totals-right">
                        <div class="t-row"><div class="t-lbl-en">Item Solid Total</div><div class="t-lbl-ar">عدد الأصناف المباعة</div><div class="t-val">${itemCount}</div></div>
                        <div class="t-row"><div class="t-lbl-en">Sub Total</div><div class="t-lbl-ar">إجمالي المبلغ</div><div class="t-val">${fmtCur(effectiveSubTotal)}</div></div>
                        <div class="t-row"><div class="t-lbl-en">Total Discounts</div><div class="t-lbl-ar">إجمالي الخصم</div><div class="t-val">${fmtCur(totalLineDiscount || billDiscount)}</div></div>
                        ${showTax ? `<div class="t-row"><div class="t-lbl-en">Total VAT</div><div class="t-lbl-ar">إجمالي الضريبة</div><div class="t-val">${fmtCur(totalTax)}</div></div>` : ''}
                        ${(activateRoundoff && Number(roundOff) !== 0) ? `<div class="t-row"><div class="t-lbl-en">Round Off</div><div class="t-lbl-ar">تقريب</div><div class="t-val">${fmtCur(roundOff)}</div></div>` : ''}
                        <div class="t-row row-grand"><div class="t-lbl-en">Total Invoice</div><div class="t-lbl-ar">إجمالي الفاتورة</div><div class="t-val">${fmtCur(effectiveGrandTotal)}</div></div>
                    </div>
                </div>

                <div class="sig-bank-row">
                    <div class="sig-bank-left">
                        ${bankTableHTML}
                    </div>
                    <div class="sig-bank-right">
                        <div><div class="en">Recived By</div><div class="ar">استلمت من قبل</div></div>
                        <div><div class="en">Prepared By</div><div class="ar">اعدت بواسطة</div></div>
                    </div>
                </div>
                ` : ''}

                <div class="page-flex-spacer"></div>

                <div style="text-align:center;font-size:9px;color:#666;padding-bottom:4px;">${pageIndex + 1}/${totalPages}</div>

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
            <title>${isEstimate ? 'ESTIMATE' : 'TAX INVOICE'} - ${invoiceNo}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Inter", Arial, sans-serif; }
                body { background: #fff; display: flex; flex-direction: column; align-items: center;
                 -webkit-print-color-adjust: exact !important;
                 print-color-adjust: exact !important;
                 color-adjust: exact !important;
                 }

                .page {
                    width: 210mm;
                    min-height: 297mm;
                    background: #fff;
                    position: relative;
                    padding: ${topPadding} 18px ${bottomPadding} 18px;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    overflow: hidden;
                }
                .page:last-child { page-break-after: auto; margin-bottom: 0; }

                /* Header image (letterhead) */
                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; height: 110px; overflow: hidden; }
                .header-image img { width: 100%; display: block; height: 110px; object-fit: fill; }
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

                /* Footer image */
                .footer-image { width: 100%; position: absolute; bottom: 10px; left: 0; z-index: 1; height: 70px; overflow: hidden; }
                .footer-image img { width: 100%; display: block; height: 70px; object-fit: fill; }

                .content-wrapper { position: relative; z-index: 2; display: flex; flex-direction: column; flex: 1; }

                /* Title */
                .invoice-title { text-align: center; font-size: 17px; font-weight: 700; padding: 10px 0 8px 0; }

                .cont-meta { text-align: center; font-size: 12px; font-weight: 700; padding-bottom: 8px; }

                /* Meta row: invoice no / date / ref */
                .meta-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #333; margin-bottom: 8px; }
                .meta-row .lbl { font-weight: 700; color: red; }

                /* QR + customer box */
                .qr-customer-row { display: flex; gap: 10px; margin-bottom: 8px; }
                .qr-box { width: 150px; height: 150px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
                .qr-box img { width: 100%; height: 100%; object-fit: contain; }
                .cust-box { flex: 1; overflow: hidden; }
                .cust-box-inner { flex: 1; border: 1px solid #333; border-radius: 10px; overflow: hidden; background: #f2f2f2; margin-top: 10px; min-height: 120px; }
                .cust-box .cust-hdr { display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; }
                .cust-box .cust-line { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 8px; }
                .cust-box .cust-line:last-child { border-bottom: none; }
                .cust-box .cust-name { font-weight: 700; }

                /* Product table */
                table.prod-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 0; border: 1px solid black; }
                table.prod-table thead th {
                    background: #ddd; padding: 3px 4px; font-size: 9px; font-weight: 700; text-align: center; vertical-align: middle; border-bottom: 1px solid #333;
                }
                table.prod-table thead th .ar { display: block; font-size: 9px; font-weight: 400; }
                table.prod-table thead th .en { display: block; }
                table.prod-table td { padding: 3px 4px; font-size: 11px; vertical-align: middle; border-bottom: 1px solid #333; }
                td.c-sl { width: 4%; text-align: center; }
                td.c-code { width: 8%; text-align: center; }
                td.c-desc { width: 30%; }
                td.c-unit { width: 6%; text-align: center; }
                td.c-qty { width: 7%; text-align: center; }
                td.c-price { width: 9%; text-align: right; }
                td.c-disc { width: 9%; text-align: right; }
                td.c-vatp { width: 6%; text-align: center; }
                td.c-vatamt { width: 8%; text-align: right; }
                td.c-total { width: 10%; text-align: right; font-weight: 600; }
                .ar-sub, .desc-sub { font-size: 10px; color: #333; direction: rtl; text-align: left; }

                .prod-body-fill {
                    border: 1px solid #333;
                    border-top: none;
                    flex: 1 1 auto;
                    min-height: 361px;
                }

                .continuation-note {
                    text-align: center;
                    font-weight: 700;
                    font-size: 11px;
                    padding: 8px;
                    border: 1px solid #333;
                    border-top: none;
                }

                /* Totals strip */
                .totals-wrap { display: flex; border: 1px solid #333; font-size: 12px; background: #f2f2f2; }
                .totals-wrap-top { height: 50px; padding: 6px 8px; }
                .totals-wrap-bottom { border-top: 1px solid black; padding: 6px 8px; }
                .totals-left { width: 45%; border-right: 1px solid #333; }
                .totals-left .note-lbl { font-weight: 700; font-size: 11px; }
                .totals-right { width: 55%; }
                .totals-right .t-row { display: flex; border-bottom: 1px solid #333; }
                .totals-right .t-row:last-child { border-bottom: none; }
                .totals-right .t-row > div { padding: 3px 8px; }
                .totals-right .t-lbl-en { flex: 1; font-weight: 600; border-right: 1px solid #333; order: 1 }
                .totals-right .t-lbl-ar { font-weight: 600; flex: 1.3; text-align: center; direction: rtl; order: 3; border-left: 1px solid #333; }
                .totals-right .t-val { flex: 1; text-align: center; font-weight: 700; order: 2 }
                .totals-right .row-grand .t-val { color: red; font-weight: 800; }
                .totals-right .row-grand div { font-size: 13px; }

                /* Amount in words */
                .words-strip { font-size: 11px; }
                .words-strip .ar { direction: rtl; text-align: right; margin-top: 2px; }

                /* Signature + Bank details row — split 50/50 */
                .sig-bank-row {
                    display: flex;
                    align-items: stretch;
                    border: 1px solid #333;
                    border-top: none;
                }
                .sig-bank-left {
                    width: 45%;
                    border-right: 1px solid #333;
                    display: flex;
                    align-items: center;
                }
                .sig-bank-right {
                    width: 55%;
                    display: flex;
                    justify-content: space-between;
                    padding: 26px 10px 6px 10px;
                    font-size: 11px;
                    text-align: center;
                }
                .sig-bank-right > div { flex: 1; }
                .sig-bank-right .en { font-weight: 600; }
                .sig-bank-right .ar { direction: rtl; font-size: 11px; color: #444; }

                /* Bank details key/value table */
                table.bank-table { width: 100%; border-collapse: collapse; font-size: 11px; }
               
             
                 table.bank-table .banktableheading th {
    background: #f2f2f2;
    padding: 2px;
    border: 1px solid black;
}
                table.bank-table .arabic-bank { direction: rtl; font-weight: 700; }
                table.bank-table .eng-bank {  font-weight: 700; }
                table.bank-table .bank-key {
                    font-weight: 600;
                    padding: 2px 6px 2px 4px;
                    white-space: nowrap;
                    width: 40%;
                    border-bottom: 1px dashed #ccc;
                }
                table.bank-table .bank-key .ar { font-weight: 400; color: #555; font-size: 9px; display: block; direction: rtl; text-align: left; }
                table.bank-table .bank-val {
                    padding: 2px 4px;
                    border-bottom: 1px dashed #ccc;
                }
                table.bank-table tr:last-child .bank-key,
                table.bank-table tr:last-child .bank-val { border-bottom: none; }

                .page-flex-spacer { flex: 1 1 auto; }

                .prod-body-fill, table.prod-table, .totals-wrap {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                @media print {
                    body { padding: 0; }
                    .page { width: 100%; min-height: 297mm; box-shadow: none; margin-bottom: 0; }
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
 * Silent print — Fifteen layout
 */
export const printInvoiceFifteen = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceFifteenHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');
            if (!result.success) {
                console.error('❌ [SALES INVOICE - FIFTEEN] Print failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [SALES INVOICE - FIFTEEN] Error:', error);
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
 * Save as PDF — Fifteen layout
 */
export const saveInvoiceFifteenAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceFifteenHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (!result.success) {
                console.error('❌ [SALES INVOICE - FIFTEEN] PDF save failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [SALES INVOICE - FIFTEEN] Error saving PDF:', error);
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

export default printInvoiceFifteen;