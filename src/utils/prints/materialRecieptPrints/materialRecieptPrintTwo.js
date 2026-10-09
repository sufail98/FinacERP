import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

/* ------------------------------------------------------------------ */
/* Number to words                                                     */
/* ------------------------------------------------------------------ */
const numberToWordsEnglish = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const lt1000 = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + lt1000(n % 100) : '');
    };

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (billions) result += lt1000(billions) + ' Billion ';
    if (millions) result += lt1000(millions) + ' Million ';
    if (thousands) result += lt1000(thousands) + ' Thousand ';
    if (remainder) result += lt1000(remainder);
    return result.trim();
};

const numberToWordsArabic = (num) => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثماني مائة', 'تسعمائة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

    if (num === 0) return 'صفر';

    const lt1000 = (n) => {
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
    if (billions) result += lt1000(billions) + ' مليار ';
    if (millions) result += lt1000(millions) + ' مليون ';
    if (thousands) result += lt1000(thousands) + ' ألف ';
    if (remainder) result += lt1000(remainder);
    return result.trim();
};

const amountToWords = (amount, currency = 'Saudi Riyal', currencyAr = 'ريال سعودي', subunit = 'Halala', subunitAr = 'هللة') => {
    const [whole, decimal] = Number(amount || 0).toFixed(2).split('.');
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const toDataURL = async (url) => {
    if (!url || !url.trim()) return '';
    try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => resolve(url);
            r.readAsDataURL(blob);
        });
    } catch {
        return url;
    }
};

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
};

const estimateRowHeight = (product) => {
    const baseHeight = 28;
    const englishLines = Math.ceil((product.productName || '').length / 45);
    const arabicLines = Math.ceil((product.productNameArb || '').length / 45);
    const maxLines = Math.max(englishLines, arabicLines);
    return baseHeight + Math.max(0, maxLines - 1) * 14;
};

const splitIntoPagesByHeight = (array, firstPageBudget, middlePageRowCount) => {
    const totalItems = array.length;

    if (totalItems === 0) {
        return [{ items: [], isFirst: true, isLast: true }];
    }

    const pages = [];
    let currentIndex = 0;
    let firstPageItems = [];
    let firstPageHeight = 0;

    while (currentIndex < totalItems) {
        const rowHeight = estimateRowHeight(array[currentIndex]);
        if (firstPageHeight + rowHeight > firstPageBudget && firstPageItems.length > 0) break;
        firstPageItems.push(array[currentIndex]);
        firstPageHeight += rowHeight;
        currentIndex++;
    }

    pages.push({ items: firstPageItems, isFirst: true, isLast: currentIndex >= totalItems });
    if (currentIndex >= totalItems) return pages;

    while (currentIndex < totalItems) {
        const remaining = totalItems - currentIndex;
        const pageSize = Math.min(middlePageRowCount, remaining);
        const isLastPage = currentIndex + pageSize >= totalItems;

        pages.push({
            items: array.slice(currentIndex, currentIndex + pageSize),
            isFirst: false,
            isLast: isLastPage,
        });
        currentIndex += pageSize;
    }

    return pages;
};

/* ------------------------------------------------------------------ */
/* HTML generator                                                      */
/* ------------------------------------------------------------------ */
export const generateMaterialRecieptHTML = async (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);
    
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const salesSettings = state.saleSettings;
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const activateRoundoff = Boolean(generalSettings.RoundOff);
    const decimals = generalSettings?.decimalPart || 2;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const showLineDiscount = salesSettings?.showLineDiscount || false;

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num || 0).toFixed(decimals)}`
            : Number(num || 0).toFixed(decimals);

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

    // Vendor master data
    const vendorData = invoiceData.supplierData || {};

    const showTax = Boolean(generalSettings?.ActivateTax) && taxType === 'Applicable to product';

    // Images (full letterhead OR separate header / footer)
    const LETTERHEAD_IMAGE = generalSettings?.CompanyLetterPad || '';
    const HEADER_IMAGE = generalSettings?.branchHeader || '';
    const FOOTER_IMAGE = generalSettings?.branchFooter || '';

    const [letterheadSrc, headerSrc, footerSrc] = await Promise.all([
        toDataURL(LETTERHEAD_IMAGE),
        toDataURL(HEADER_IMAGE),
        toDataURL(FOOTER_IMAGE),
    ]);

    const useFullLetterhead = !!letterheadSrc;
    const useSeparateHeaderFooter = !useFullLetterhead && (headerSrc || footerSrc);

    const companyVatNo = branchData?.taxNo || 'NA';

    const FIRST_PAGE_HEIGHT = 250;
    const productPages = splitIntoPagesByHeight(purchaseDetails, FIRST_PAGE_HEIGHT, 11);
    const totalPages = productPages.length || 1;

    const HEADER_PAD = useFullLetterhead ? '140px' : (useSeparateHeaderFooter ? '160px' : '20px');
    const FOOTER_PAD = useFullLetterhead ? '105px' : (useSeparateHeaderFooter ? '120px' : '20px');

    const headingEn = 'MATERIAL RECEIPT';
    const headingAr = 'إيصال استلام مواد';

    const calcLine = (item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const gross = qty * rate;
        const discPercent = Number(item.discountPercentage || 0);
        const discAmt = gross * (discPercent / 100);
        return { qty, rate, discPercent, discAmt, netAmt: gross - discAmt };
    };

    const totalNet = purchaseDetails.reduce((s, i) => s + calcLine(i).netAmt, 0);
    const totalDisc = purchaseDetails.reduce((s, i) => s + calcLine(i).discAmt, 0);
    const totalVAT = purchaseDetails.reduce((s, i) => s + (Number(i.taxAmount) || 0), 0);
    const totalQty = purchaseDetails.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalLine = purchaseDetails.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const colSpanAll = 8 + (showTax ? 2 : 0) + (showLineDiscount ? 2 : 0);
    const colSpanBeforeTotals = colSpanAll - (1 + (showTax ? 2 : 0) + (showLineDiscount ? 2 : 0) + 1) ; // description area for footer label

    const words = amountToWords(totalAmount || 0);
    const printedOn = `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage } = pageData;
        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        return `
            <div class="page">
                ${useFullLetterhead ? `
                    <img class="letterhead-bg" src="${letterheadSrc}" alt="letterhead">
                ` : useSeparateHeaderFooter ? `
                    ${headerSrc ? `<img class="header-img" src="${headerSrc}" alt="header">` : ''}
                    ${footerSrc ? `<img class="footer-img" src="${footerSrc}" alt="footer">` : ''}
                ` : ''}

                <div class="print-timestamp">
                    <div class="timestamp-label">Printed on:</div>
                    <div class="timestamp-value">${printedOn}</div>
                </div>

                <div class="content-wrapper" style="padding-top: ${HEADER_PAD}; padding-bottom: ${FOOTER_PAD};">

                    ${isFirstPage ? `
                    <div class="vat-no-section">
                        <div>VAT NO : ${companyVatNo}</div>
                        <div>${companyVatNo} : الرقم الضريبي</div>
                    </div>
                    <h2 class="heading">
                        <span>${headingEn}</span>
                        <span style="font-size: 18px;">/</span>
                        <span>${headingAr}</span>
                    </h2>

                    <div class="invoice-header-row">
                        <div class="invoice-left">
                            <span class="inv-label">Receipt No:</span>
                            <span class="inv-number">${invoiceNo || ''}</span>
                        </div>
                       
                        <div class="invoice-right">
                            <span class="inv-number-ar">${invoiceNo || ''}</span>
                            <span class="inv-label-ar">رقم الإيصال</span>
                        </div>
                    </div>

                    <div class="client-details-box">
                        <div class="box-title">Vendor Details: <span class="ar">تفاصيل المورد</span></div>
                        <table class="info-table">
                            <tr>
                                <td class="field-label" colspan="1">Name:</td>
                                <td class="field-value" colspan="7">${partyName || ''}</td>
                            </tr>
                            <tr>
                                <td class="field-value text-right" colspan="7">${vendorData?.nameArb || ''}</td>
                                <td class="field-label-ar" colspan="1">الإسم:</td>
                            </tr>
                            <tr>
                                <td class="field-label">Street Name:</td>
                                <td class="field-value" colspan="3">${vendorData?.StreetName || partyAddress || ''}</td>
                                <td class="field-value text-right" colspan="3">${vendorData?.StreetNameArb || ''}</td>
                                <td class="field-label-ar">إسم الشارع</td>
                            </tr>
                            <tr>
                                <td class="field-label">Building No:</td>
                                <td class="field-value">${vendorData?.BuildingNo || ''}</td>
                                <td class="field-label">City:</td>
                                <td class="field-value">${vendorData?.CityName || ''}</td>
                                <td class="field-value text-right">${vendorData?.CityNameArb || ''}</td>
                                <td class="field-label-ar">المدينة</td>
                                <td class="field-value text-right">${vendorData?.BuildingNoArb || ''}</td>
                                <td class="field-label-ar">رقم المبنى</td>
                            </tr>
                            <tr>
                                <td class="field-label">District:</td>
                                <td class="field-value" colspan="3">${vendorData?.District || ''}</td>
                                <td class="field-value text-right" colspan="3">${vendorData?.DistrictArb || ''}</td>
                                <td class="field-label-ar">الحي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Postal Code:</td>
                                <td class="field-value">${vendorData?.PostboxNo || ''}</td>
                                <td class="field-label">Addl. No:</td>
                                <td class="field-value">${vendorData?.AdditionalNo || ''}</td>
                                <td class="field-value text-right">${vendorData?.AdditionalNoArb || ''}</td>
                                <td class="field-label-ar">الرقم الإضافي</td>
                                <td class="field-value text-right">${vendorData?.PostboxNoArb || ''}</td>
                                <td class="field-label-ar">الرمز البريدي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Country:</td>
                                <td class="field-value">${vendorData?.Country || ''}</td>
                                <td class="field-label">Phone:</td>
                                <td class="field-value">${vendorData?.phone || ''}</td>
                                <td class="field-value text-right" colspan="3">${vendorData?.CountryArb || ''}</td>
                                <td class="field-label-ar">البلد</td>
                            </tr>
                            <tr>
                                <td class="field-label">VAT Number:</td>
                                <td class="field-value" style="font-weight: 800;">${partyVatNo || ''}</td>
                                <td class="field-label">CRN:</td>
                                <td class="field-value">${vendorData?.cstNumber || ''}</td>
                                <td class="field-value text-right">${vendorData?.cstNumber || ''}</td>
                                <td class="field-label-ar">رقم السجل</td>
                                <td class="field-value text-right" style="font-weight: 800;">${partyVatNo || ''}</td>
                                <td class="field-label-ar">الرقم الضريبي</td>
                            </tr>
                        </table>
                    </div>

                    <div class="dates-section-box">
                        <table class="dates-full-table">
                            <tr>
                                <td class="date-header">تاريخ الفاتورة<br>Invoice Date</td>
                                <td class="date-header">رقم فاتورة المورد<br>Supplier ID</td>
                                <td class="date-header">تاريخ فاتورة المورد<br>Reference Date</td>
                                <td class="date-header">الرقم المرجعي<br>Reference No</td>
                            </tr>
                            <tr>
                                <td class="date-data">${formatDate(invoiceDate)}</td>
                                <td class="date-data">${vendorInvoiceNo || vendorData?.ledgerCode || 'NA'}</td>
                                <td class="date-data">NA</td>
                                <td class="date-data">${invoiceData?.RefNo || 'NA'}</td>
                            </tr>
                        </table>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>${headingEn} (Continued)</span>
                        <span>${headingAr} (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold; font-size: 11px;">
                        Receipt No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table-wrapper">
                        <table class="product-table">
                            <thead>
                                <tr>
                                    <th class="col-no">رقم<br>SLNO</th>
                                    <th class="col-code">الرمز<br>Code</th>
                                    <th class="col-desc">الوصف<br>Item Description</th>
                                    <th class="col-unit">وحدة<br>Unit</th>
                                    <th class="col-qty">الكمية<br>Qty</th>
                                    <th class="col-rate">سعر الوحدة<br>Rate</th>
                                    ${showLineDiscount ? `
                                        <th class="col-disc-percent">خصم %<br>Disc %</th>
                                        <th class="col-disc-amt">مبلغ الخصم<br>Disc Amt</th>
                                    ` : ''}
                                    <th class="col-total">المجموع<br>Net Value</th>
                                    ${showTax ? `
                                        <th class="col-vat">ضريبة<br>VAT%</th>
                                        <th class="col-vat-amt">مبلغ ضريبة<br>VAT Amount</th>
                                    ` : ''}
                                    <th class="col-amount">الإجمالي<br>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageProducts.map((item, index) => {
                                    const { rate, discPercent, discAmt, netAmt } = calcLine(item);
                                    return `
                                        <tr>
                                            <td class="text-center">${pageStartIndex + index + 1}</td>
                                            <td class="text-center">${item.productCode || ''}</td>
                                            <td class="text-left">
                                                ${item.productName || ''}
                                                ${item.productNameArb ? `<br/>${item.productNameArb}` : ''}
                                                ${item.productDescription ? `<br/>${item.productDescription}` : ''}
                                            </td>
                                            <td class="text-center">${item.unitName || item.UnitName || item.productDetails?.UnitName || 'PCS'}</td>
                                            <td class="text-center">${item.qty || 0}</td>
                                            <td class="text-right">${rate.toFixed(2)}</td>
                                            ${showLineDiscount ? `
                                                <td class="text-center">${discPercent.toFixed(2)}%</td>
                                                <td class="text-right">${discAmt.toFixed(2)}</td>
                                            ` : ''}
                                            <td class="text-right">${netAmt.toFixed(2)}</td>
                                            ${showTax ? `
                                                <td class="text-center">${item.taxRate ?? 15}%</td>
                                                <td class="text-right">${Number(item.taxAmount || 0).toFixed(2)}</td>
                                            ` : ''}
                                            <td class="text-right">${Number(item.amount || 0).toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}

                                ${!isLastPage && pageProducts.length > 0 ? `
                                    <tr class="continuation-row">
                                        <td colspan="${colSpanAll}" class="text-center">
                                            <strong>Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</strong>
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>

                    ${isLastPage ? `
                    <div class="summary-section">
                        <div class="summary-qr-container">
                            <table class="summary-table">
                                <tr>
                                    <td class="summary-label">Total excl. VAT (SAR):</td>
                                    <td class="summary-value">${fmt(subTotal)}</td>
                                    <td class="summary-label-ar">الإجمالي غير شامل ضريبة القيمة المضافة</td>
                                </tr>
                                ${Number(othercharge) !== 0 ? `
                                <tr>
                                    <td class="summary-label">Other Charge:</td>
                                    <td class="summary-value">${fmt(othercharge)}</td>
                                    <td class="summary-label-ar"><span>رسوم اخرى</span> <span>:</span></td>
                                </tr>` : ''}
                                ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0) ? `
                                <tr>
                                    <td class="summary-label">Discount Amount:</td>
                                    <td class="summary-value">${fmt(billDiscount)}</td>
                                    <td class="summary-label-ar"><span>مقدار الخصم</span> <span>:</span></td>
                                </tr>` : ''}
                                <tr>
                                    <td class="summary-label">Taxable Amount:</td>
                                    <td class="summary-value">${fmt(Number(subTotal || 0) - Number(billDiscount || 0) + Number(othercharge || 0))}</td>
                                    <td class="summary-label-ar">المبلغ الخاضع للضريبة</td>
                                </tr>
                                ${showTax ? `
                                <tr>
                                    <td class="summary-label">VAT Amount (SAR):</td>
                                    <td class="summary-value">${fmt(totalTax)}</td>
                                    <td class="summary-label-ar">ضريبة القيمة المضافة</td>
                                </tr>` : ''}
                                ${(activateRoundoff && Number(roundoff) !== 0) ? `
                                <tr>
                                    <td class="summary-label">Round Off:</td>
                                    <td class="summary-value">${fmt(roundoff)}</td>
                                    <td class="summary-label-ar"><span>تقريب</span> <span>:</span></td>
                                </tr>` : ''}
                                <tr>
                                    <td class="summary-label grand-total">Amount Incl. VAT (SAR):</td>
                                    <td class="summary-value grand-total-value">${fmt(totalAmount)}</td>
                                    <td class="summary-label-ar">المبلغ شامل ضريبة القيمة المضافة</td>
                                </tr>
                                <tr>
                                    <td colspan="3" class="amount-words">
                                        <strong>Amount in Words: ${words.english}</strong><br>
                                        <span class="ar">${words.arabic}</span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div class="signature-section-wrap">
                            <div class="signature-boxes">
                                <div class="signature-box">
                                    <div class="sig-label">Prepared By</div>
                                    <div class="sig-space">التوقيع مع الختم<br>Signature with stamp</div>
                                </div>
                                <div class="signature-box">
                                    <div class="sig-label">Authorized By</div>
                                    <div class="sig-space">التوقيع مع الختم<br>Signature with stamp</div>
                                </div>
                                <div class="signature-box">
                                    <div class="sig-label">Vendor Acknowledgement</div>
                                    <div class="sig-space">التوقيع مع الختم<br>Signature with stamp</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
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
            <style>
                @page { size: A4; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }

                body { background: #f0f0f0; font-family: sans-serif; font-size: 11px; }

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

                ${!showTax ? `
                    .col-no { width: 35px; } .col-code { width: 65px; } .col-desc { width: auto; }
                    .col-unit { width: 45px; } .col-qty { width: 45px; } .col-rate { width: 65px; }
                    .col-total { width: 70px; } .col-amount { width: 70px; }
                ` : `
                    .col-no { width: 28px; } .col-code { width: 55px; } .col-desc { width: auto; }
                    .col-unit { width: 38px; } .col-qty { width: 35px; } .col-rate { width: 50px; }
                    .col-total { width: 50px; } .col-vat { width: 38px; }
                    .col-vat-amt { width: 50px; } .col-amount { width: 50px; }
                `}
                ${showLineDiscount ? `
                    .col-disc-percent { width: ${showTax ? '38px' : '45px'}; }
                    .col-disc-amt { width: ${showTax ? '48px' : '55px'}; }
                ` : ''}

                .letterhead-bg {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    object-fit: fill; z-index: 0; display: block;
                }
                .header-img {
                    position: absolute; top: 0; left: 0; width: 100%; height: 150px;
                    object-fit: fill; object-position: center top; z-index: 1; display: block;
                }
                .footer-img {
                    position: absolute; bottom: 0; left: 0; width: 100%; height: 50px;
                    object-fit: fill; object-position: center bottom; z-index: 1; display: block;
                }

                .content-wrapper { position: relative; z-index: 2; padding-left: 25px; padding-right: 25px; }
                .vat-no-section {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 12px; font-weight: bold; margin-top: 8px;
                }
                .heading {
                    text-align: center; font-size: 16px; font-weight: bold;
                    margin-bottom: 8px; padding: 6px; width: 100%; margin: auto;
                    border-bottom: 2px solid black;
                }

                .invoice-header-row { display: flex; margin-bottom: 8px; align-items: center; min-height: 20px; }
                .invoice-left { flex: 1; padding: 4px 8px; display: flex; align-items: center; gap: 8px; }
                .invoice-center { flex: 0 0 auto; padding: 4px 16px; display: flex; align-items: center; justify-content: center; }
                .invoice-right { flex: 1; padding: 4px 8px; display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
                .inv-label, .inv-label-ar { font-weight: bold; font-size: 11px; }
                .inv-number, .inv-number-ar { font-weight: bold; font-size: 13px; }
                .invoice-left .inv-label, .invoice-left .inv-number,
                .invoice-right .inv-number-ar, .invoice-right .inv-label-ar { color: brown; }
                .sale-type { font-weight: bold; font-size: 12px; }

                .client-details-box { border: 0.5px solid gray; margin-bottom: 2px; border-radius: 6px; overflow: hidden; }
                .box-title { background: #d0d0d0; padding: 4px 8px; font-weight: bold; font-size: 11px; }
                .box-title .ar { float: right; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td { padding: 3px 5px; border: 0.5px solid gray; font-size: 10px; }
                .field-label { font-weight: bold; background: #e8e8e8; white-space: nowrap; }
                .field-value { font-weight: normal; }
                .field-label-ar { text-align: right; font-weight: bold; background: #e8e8e8; white-space: nowrap; }

                .dates-section-box { border: 0.5px solid gray; margin: 2px 0; border-radius: 6px; overflow: hidden; }
                .dates-full-table { width: 100%; border-collapse: collapse; }
                .dates-full-table td { padding: 4px 6px; border: 0.5px solid gray; font-size: 10px; text-align: center; }
                .date-header { font-weight: bold; font-size: 9px; line-height: 1.4; background: #d0d0d0; }
                .date-data { text-align: center; font-size: 10px; font-weight: bold; }

                .product-table-wrapper {
                    margin-top: 2px; min-height: 190px;
                    border-right: 1px solid gray; border-left: 1px solid gray; border-bottom: 1px solid gray;
                }
                .product-table { width: 100%; border-collapse: collapse; border: 1px solid gray; table-layout: fixed; }
                .product-table thead { background: #c0c0c0; }
                .product-table th {
                    border: 1px solid gray; padding: 5px 3px; font-size: 9px;
                    font-weight: bold; text-align: center; line-height: 1.3;
                }
                .product-table td {
                    border: 1px solid gray; padding: 4px 5px; font-size: 10px;
                    vertical-align: top; word-wrap: break-word; overflow-wrap: break-word;
                }
                .product-table tbody { vertical-align: top; }
                .product-table tbody tr { height: auto !important; }
                .col-desc { white-space: normal; line-height: 1.4; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .continuation-row { background: #ffe6e6; }

                .summary-section { position: relative; z-index: 2; margin-top: 2px; }
                .summary-qr-container { border: 0.5px solid gray; margin-bottom: 2px; border-radius: 6px; overflow: hidden; }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table td { padding: 6px 8px; border: 0.5px solid gray; font-size: 10px; }
                .summary-label { font-weight: bold; width: 150px; background: #e8e8e8; }
                .summary-value { text-align: right; font-weight: bold; width: 100px; }
                .summary-label-ar { text-align: right; font-size: 10px; background: #e8e8e8; }
                .grand-total { background: #e8e8e8; }
                .grand-total-value { background: #d0d0d0; font-size: 12px; }

                .amount-words { padding: 6px 8px !important; font-size: 9px !important; line-height: 1.5; }
                .amount-words .ar { display: block; text-align: right; margin-top: 3px; }

                .signature-section-wrap { margin-top: 8px; }
                .signature-boxes { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid gray; }
                .signature-box { display: flex; flex-direction: column; min-height: 70px; }
                .signature-box + .signature-box { border-left: 1px solid gray; }
                .sig-label {
                    background: #d0d0d0; padding: 4px 8px; font-weight: bold;
                    border-bottom: 1px solid gray; font-size: 10px; text-align: center;
                }
                .sig-space {
                    flex: 1; display: flex; align-items: center; justify-content: center;
                    text-align: center; font-size: 9px; line-height: 1.5; padding: 8px;
                }

                @media print {
                    body { background: white; }
                    .page { box-shadow: none; margin: 0; width: 210mm; height: 297mm; }
                    .print-timestamp { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            ${pagesHTML}
        </body>
        </html>
    `;
};

/* ------------------------------------------------------------------ */
/* Print / PDF                                                         */
/* ------------------------------------------------------------------ */
const browserPrint = (html) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    }
    return { success: true };
};

export const materialRecieptPrintTwo = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    const html = await generateMaterialRecieptHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(html, savedPrinter, 'a4');
            if (!result.success) {
                console.error('❌ [MATERIAL RECEIPT] Print failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [MATERIAL RECEIPT] Error:', error);
            return { success: false, error: error.message };
        }
    }
    return browserPrint(html);
};

export default materialRecieptPrintTwo;
