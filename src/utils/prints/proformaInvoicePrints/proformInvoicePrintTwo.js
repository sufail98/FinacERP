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
 * ✅ Estimate row height based on product name length (SAME AS INVOICE)
 */
const estimateRowHeight = (product) => {
    const baseHeight = 28;
    const englishName = product.productName || '';
    const arabicName = product.productNameArb || '';
    
    const englishLines = Math.ceil(englishName.length / 45);
    const arabicLines = Math.ceil(arabicName.length / 45);
    
    const maxLines = Math.max(englishLines, arabicLines);
    
    return baseHeight + Math.max(0, maxLines - 1) * 14;
};

/**
 * ✅ Smart pagination with FIXED middle page row count (SAME AS INVOICE)
 */
const splitIntoPagesByHeight = (array, firstPageBudget, middlePageRowCount, lastPageBudget) => {
    const totalItems = array.length;

    if (totalItems === 0) {
        return [{ items: [], isFirst: true, isLast: true, maxRows: 0 }];
    }

    const pages = [];
    let currentIndex = 0;

    let firstPageItems = [];
    let firstPageHeight = 0;
    
    while (currentIndex < totalItems) {
        const rowHeight = estimateRowHeight(array[currentIndex]);
        
        if (firstPageHeight + rowHeight > firstPageBudget && firstPageItems.length > 0) {
            break;
        }
        
        firstPageItems.push(array[currentIndex]);
        firstPageHeight += rowHeight;
        currentIndex++;
    }

    pages.push({
        items: firstPageItems,
        isFirst: true,
        isLast: currentIndex >= totalItems,
        maxRows: firstPageItems.length
    });

    if (currentIndex >= totalItems) {
        return pages;
    }

    while (currentIndex < totalItems) {
        const remainingItems = totalItems - currentIndex;
        const pageSize = Math.min(middlePageRowCount, remainingItems);
        const isLastPage = (currentIndex + pageSize >= totalItems);

        if (isLastPage) {
            pages.push({
                items: array.slice(currentIndex),
                isFirst: false,
                isLast: true,
                maxRows: remainingItems
            });
            currentIndex += remainingItems;
        } else {
            pages.push({
                items: array.slice(currentIndex, currentIndex + pageSize),
                isFirst: false,
                isLast: false,
                maxRows: pageSize
            });
            currentIndex += pageSize;
        }
    }

    return pages;
};

/**
 * Generate the proforma invoice HTML - WITH LETTERHEAD BACKGROUND OR SEPARATE HEADER/FOOTER
 */
const generateProformaInvoiceHTML = async (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const salesSettings = state.saleSettings;
    const activateRoundoff = Boolean(generalSettings.RoundOff)
     const showLineDiscount = salesSettings?.showLineDiscount || false;



   
    // ✅ Get letterhead paths from Redux state
    const LETTERHEAD_IMAGE_PATH = generalSettings?.CompanyLetterPad || '';
    const HEADER_IMAGE = generalSettings?.branchHeader || '';
    const FOOTER_IMAGE = generalSettings?.branchFooter || '';
    
    // ✅ Determine which mode to use
    const useFullLetterhead = LETTERHEAD_IMAGE_PATH && LETTERHEAD_IMAGE_PATH.trim() !== '';
    const useSeparateHeaderFooter = !useFullLetterhead && (HEADER_IMAGE || FOOTER_IMAGE);

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(generalSettings.decimalPart)}`
            : Number(num).toFixed(generalSettings.decimalPart);

    const {
        invoiceNo,
        CreatedDate,
        date,
        partyName:customerName,
        partyVatNo:customerVATNo,
        paymentMode,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        customerData = {},
        othercharge = 0,
        roundOff = 0,
    } = invoiceData;

     const calcLineDiscount = (item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const grossAmt = qty * rate;
        const discPercent = Number(item.discountPercentage || 0);
        return grossAmt * (discPercent / 100);
    };

    // ✅ Dynamic padding based on mode
    const HEADER_PAD = useFullLetterhead ? '140px' : (useSeparateHeaderFooter ? '160px' : '20px');
    const FOOTER_PAD = useFullLetterhead ? '105px' : (useSeparateHeaderFooter ? '120px' : '20px');

    const FIRST_PAGE_HEIGHT = 300;
    const MIDDLE_PAGE_HEIGHT = 1000;
    const LAST_PAGE_HEIGHT = 300;

    const productPages = splitIntoPagesByHeight(
        salesDetails,
        FIRST_PAGE_HEIGHT,
        15,
        LAST_PAGE_HEIGHT
    );

    const totalPages = productPages.length || 1;
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
        const formattedTime = formatTimeFromCreatedDate(CreatedDate);
        const formattedDate = formatDate(date);
        const formattedDateTime = `${formattedDate} ${formattedTime}`.trim();
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
                    <div class="invoice-header-row">
                        <div class="invoice-left">
                            <span class="inv-label">Invoice No:</span>
                            <span class="inv-number">${invoiceNo || ''}</span>
                        </div>
                        <div class="invoice-center">
                            <h2 class="heading">
                                <span>PROFORMA INVOICE</span>
                                <span style="margin: 0 5px; font-size: 18px;">/</span>
                                <span>فاتورة أولية</span>
                            </h2>
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
                                <td class="field-value">${customerData?.BuildingNo || ''}</td>
                                <td class="field-label">City:</td>
                                <td class="field-value">${customerData?.CityName || ''}</td>
                                <td class="field-value text-right">${customerData?.CountryArb || ''}</td>
                                <td class="field-label-ar">المدينة</td>
                                <td class="field-value text-right">${customerData?.BuildingNoArb || ''}</td>
                                <td class="field-label-ar">رقم المبنى</td>
                            </tr>
                            <tr>
                                <td class="field-label">District:</td>
                                <td class="field-value" colspan="3">${customerData?.District || ''}</td>
                                <td class="field-value text-right" colspan="3">${customerData?.DistrictArb || ''}</td>
                                <td class="field-label-ar">الحي</td>
                            </tr>
                            <tr>
                                <td class="field-label">Postal Code:</td>
                                <td class="field-value">${customerData?.PostboxNo || ''}</td>
                                <td class="field-label">Addl. No:</td>
                                <td class="field-value">${customerData?.AdditionalNo || ''}</td>
                                <td class="field-value text-right">${customerData?.AdditionalNoArb || ''}</td>
                                <td class="field-label-ar">الرقم الإضافي</td>
                                <td class="field-value text-right">${customerData?.PostboxNoArb || ''}</td>
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
                                <td class="field-value text-right" style="font-weight: 800;">${customerVATNo || ''}</td>
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
                                <td class="date-data">${formattedDateTime}</td>
                                <td class="date-data">${formatDate(invoiceData.validUntil || date)}</td>
                                <td class="date-data">${invoiceData.poNumber || ''}</td>
                                <td class="date-data">${invoiceData.referenceNo || ''}</td>
                            </tr>
                        </table>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>PROFORMA INVOICE (Continued)</span>
                        <span style="margin: 0 5px; font-size: 18px;">/</span>
                        <span>فاتورة أولية (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold; font-size: 11px;">
                        Invoice No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}
                                                                      
                    <table class="product-table">
                        <thead>
                            <tr>
                                <th class="col-no">رقم<br>SLNO</th>
                                <th class="col-code">الرمز<br>Code</th>
                                <th class="col-desc">الوصف<br>Item Description</th>
                                <th class="col-unit">وحدة<br>Unit</th>
                                <th class="col-qty">الكمية<br>Qty</th>
                                <th class="col-rate">سعر الوحدة<br>Rate</th>
                                ${showLineDiscount ? `<th class="col-disc-amt">مبلغ الخصم<br>Disc Amt</th>` : ''}
                                <th class="col-total">المجموع<br>Net Value</th>
                                <th class="col-vat">ضريبة<br>VAT%</th>
                                <th class="col-vat-amt">مبلغ ضريبة<br>VAT Amount</th>
                                <th class="col-amount">الإجمالي<br>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageProducts.length > 0 ? pageProducts.map((item, index) => {
                                const globalIndex = pageStartIndex + index;
                                const discAmt = calcLineDiscount(item);
                                const netAmt = (Number(item.qty || 0) * Number(item.rate || 0)) - discAmt;
                                return `
                                    <tr>
                                        <td class="text-center">${globalIndex + 1}</td>
                                        <td class="text-center">${item.productCode || ''}</td>
                                        <td class="text-left">
                                            ${item.productName || ''}<br/>
                                            ${item.productNameArb || ''} <br/>
                                             ${item.productDescription ? `<br/>${item.productDescription}` : ''}
                                        </td>
                                        <td class="text-center">${item.unitName || 'PCS'}</td>
                                        <td class="text-center">${item.qty || 0}</td>
                                        <td class="text-right">${Number(item.rate || 0).toFixed(generalSettings.decimalPart)}</td>
                                         ${showLineDiscount ? `<td class="text-right">${discAmt.toFixed(generalSettings.decimalPart)}</td>` : ''}
                                        <td class="text-right">${netAmt.toFixed(generalSettings.decimalPart)}</td>
                                        <td class="text-center">${item.taxRate || 0}%</td>
                                        <td class="text-right">${Number(item.taxAmount || 0).toFixed(generalSettings.decimalPart)}</td>
                                        <td class="text-right">${Number(item.amount || 0).toFixed(generalSettings.decimalPart)}</td>
                                    </tr>
                                `;
                            }).join('') : ''}

                            ${!isLastPage && pageProducts.length > 0 ? `
                                <tr class="continuation-row">
                                    <td colspan="${showLineDiscount ? 11 : 10}" class="text-center"><strong>Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</strong></td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>

                    ${isLastPage ? `
                    <div class="summary-section" style="margin-top: 7px;">
                        <div class="summary-container">
                            <table class="summary-table">
                                <tr>
                                    <td class="summary-label">Total excl. VAT (SAR):</td>
                                    <td class="summary-value">${fmt(subTotal)}</td>
                                    <td class="summary-label-ar">الإجمالي غير شامل ضريبة القيمة المضافة</td>
                                </tr>
                                ${Number(othercharge) !== 0 ? `
                                    <tr>
                                    <td class="summary-label">Other Charge</td>
                                    <td class="summary-value">${fmt(othercharge)}</td>
                                    <td class="summary-label-ar"><span>رسوم اخرى</span> </td>
                                    
                                </tr>` : ""}
                                   ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <tr>
                                    <td class="summary-label">Discount (SAR):</td>
                                    <td class="summary-value">${fmt(billDiscount)}</td>
                                    <td class="summary-label-ar">الخصم</td>
                                </tr> ` : ""}
                                <tr>
                                    <td class="summary-label">Taxable Amount</td>
                                    <td class="summary-value">
                                            ${fmt(
                                                Number(subTotal || 0) -
                                                Number(invoiceData?.billDiscount || 0) +
                                                Number(othercharge || 0)
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
                                    <td class="summary-label">Round Off</td>
                                    <td class="summary-value">${fmt( roundOff|| 0)}</td>
                                    <td class="summary-label-ar"><span>مبلغ الضريبة</span></td>
                                </tr>` : ""}
                                 
                                <tr>
                                    <td class="summary-label grand-total">Amount Incl. VAT (SAR):</td>
                                    <td class="summary-value grand-total-value">${fmt(totalAmount)}</td>
                                    <td class="summary-label-ar grand-total">المبلغ شامل ضريبة القيمة المضافة</td>
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
                                        <td class="bank-value">Alinma Bank</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Account Name</td>
                                        <td class="bank-value">${branchData?.bankdata?.bankaccname || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Account No.</td>
                                        <td class="bank-value">${branchData?.bankdata?.accountNo || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">IBAN</td>
                                        <td class="bank-value">${branchData?.bankdata?.ibanno || ''}</td>
                                    </tr>
                                    <tr>
                                        <td class="bank-label">Branch</td>
                                        <td class="bank-value">${branchData?.bankdata?.bankBranchName || ''}</td>
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
            <title>PROFORMA INVOICE - ${invoiceNo}</title>
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
                    .print-timestamp {
    position: absolute;
    bottom: 15mm;
    right:10mm;
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
                    padding-left: 25px;
                    padding-right: 25px;
                }

                /* ── Invoice heading ────────────────────────────────────────── */
                .heading {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    padding: 6px;
                    width: 95%;
                    margin: auto;
                }

                /* ── Invoice number row ─────────────────────────────────────── */
                .invoice-header-row {
                    display: flex;
                    margin-bottom: 8px;
                    align-items: center;
                    min-height: 20px;
                }
                .invoice-left  { flex: 1; padding: 4px 8px; display: flex; align-items: center; gap: 8px; }
                .invoice-center{ flex: 0 0 auto; padding: 4px 16px; display: flex; align-items: center; justify-content: center; }
                .invoice-right { flex: 1; padding: 4px 8px; display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
                .inv-label, .inv-label-ar { font-weight: bold; font-size: 11px; }
                .inv-number, .inv-number-ar { font-weight: bold; font-size: 13px; }
                .invoice-left .inv-label,
                .invoice-left .inv-number,
                .invoice-right .inv-number-ar,
                .invoice-right .inv-label-ar { color: brown; }

                /* ── Client details box ─────────────────────────────────────── */
                .client-details-box {
                    border: 0.5px solid gray;
                    margin-bottom: 2px;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .box-title {
                    background: #d0d0d0;
                    padding: 4px 8px;
                    font-weight: bold;
                    font-size: 11px;
                }
                .box-title .ar { float: right; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td {
                    padding: 3px 5px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                }
                .field-label     { font-weight: bold; background: #e8e8e8; white-space: nowrap; }
                .field-value     { font-weight: normal; }
                .field-label-ar  { text-align: right; font-weight: bold; background: #e8e8e8; white-space: nowrap; }
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
                    padding: 4px 6px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                    text-align: center;
                }
                .date-header { font-weight: bold; font-size: 9px; line-height: 1.4; background: #d0d0d0; }
                .date-data   { text-align: center; font-size: 10px; font-weight: bold; }

                /* ── Product table ──────────────────────────────────────────── */
                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid gray;
                    margin-top: 2px;
                }
                .product-table thead { background: #c0c0c0; }
                .product-table th {
                    border: 1px solid gray;
                    padding: 5px 3px;
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                    line-height: 1.3;
                }
                .product-table td {
                    border: 1px solid gray;
                    padding: 4px 5px;
                    font-size: 10px;
                    vertical-align: top;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .col-no      { width: 28px;  }
                .col-code    { width: 55px;  }
                .col-desc    { 
                    width: auto;
                    white-space: normal;
                    line-height: 1.4;
                }
                .col-unit    { width: 38px;  }
                .col-qty     { width: 35px;  }
                .col-rate    { width: 50px;  }
                .col-total   { width: 50px;  }
                .col-vat     { width: 38px;  }
                .col-vat-amt { width: 50px;  }
                .col-amount  { width: 50px;  }
                .col-disc-amt { width: 50px; }

                .text-center { text-align: center; }
                .text-left   { text-align: left;   }
                .text-right  { text-align: right;  }
                .continuation-row { background: #ffe6e6; }

                /* ── Summary section ────────────────────────────────────────── */
                .summary-section { position: relative; z-index: 2; }
                .summary-container {
                    border: 0.5px solid gray;
                    margin-bottom: 2px;
                    margin-top: 2px;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table td {
                    padding: 6px 8px;
                    border: 0.5px solid gray;
                    font-size: 10px;
                }
                .summary-label    { font-weight: bold; width: 150px; background: #e8e8e8; }
                .summary-value    { text-align: right; font-weight: bold; width: 100px; }
                .summary-label-ar { text-align: right; font-size: 10px; background: #e8e8e8; }
                .grand-total      { background: #e8e8e8; }
                .grand-total-value{ background: #d0d0d0; font-size: 12px; }

                .amount-words {
                    padding: 6px 8px !important;
                    font-size: 9px !important;
                    line-height: 1.5;
                }
                .amount-words .ar { display: block; text-align: right; margin-top: 3px; }

                /* ── Bank + signature ───────────────────────────────────────── */
                .bank-signature-section {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 8px;
                    margin-top: 8px;
                }
                .bank-details { border: 1px solid gray; }
                .section-title {
                    background: #d0d0d0;
                    padding: 4px 8px;
                    font-weight: bold;
                    border-bottom: 1px solid gray;
                    font-size: 10px;
                }
                .bank-table { width: 100%; border-collapse: collapse; }
                .bank-table td { padding: 4px 6px; border-bottom: 1px solid gray; font-size: 9px; }
                .bank-table tr:last-child td { border-bottom: none; }
                .bank-label { font-weight: bold; width: 90px; }

                .signature-boxes {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    border: 1px solid gray;
                }
                .signature-box { display: flex; flex-direction: column; min-height: 70px; }
                .signature-box + .signature-box { border-left: 1px solid gray; }
                .sig-label {
                    background: #d0d0d0;
                    padding: 4px 8px;
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
                    padding: 8px;
                }

                /* ── Print overrides ────────────────────────────────────────── */
                @media print {
                    body { background: white; }
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
 * Main print proforma invoice function - SILENT PRINT
 */
export const proformInvoicePrintTwo = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateProformaInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                console.log('✅ [PROFORMA INVOICE] Printed successfully!');
            } else {
                console.error('❌ [PROFORMA INVOICE] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [PROFORMA INVOICE] Error:', error);
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

export default proformInvoicePrintTwo;