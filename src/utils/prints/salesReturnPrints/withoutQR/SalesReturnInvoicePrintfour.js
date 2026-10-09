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
        if (h > 0) {
            result += hundreds[h];
        }

        const remainder = n % 100;

        if (remainder >= 10 && remainder <= 19) {
            if (result) result += ' و ';
            result += teens[remainder - 10];
        } else {
            const t = Math.floor(remainder / 10);
            const o = remainder % 10;

            if (t > 0) {
                if (result) result += ' و ';
                result += tens[t];
            }

            if (o > 0) {
                if (result) result += ' و ';
                result += ones[o];
            }
        }

        return result;
    };

    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';

    if (billions) {
        result += convertLessThanThousand(billions) + ' مليار ';
    }
    if (millions) {
        result += convertLessThanThousand(millions) + ' مليون ';
    }
    if (thousands) {
        result += convertLessThanThousand(thousands) + ' ألف ';
    }
    if (remainder) {
        result += convertLessThanThousand(remainder);
    }

    return result.trim();
};

const amountToWords = (amount, currency = 'Saudi Riyal', currencyAr = 'ريال سعودي', subunit = 'Halala', subunitAr = 'هللة') => {
    const [whole, decimal] = amount.toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

    let wordsEn = '';
    let wordsAr = '';

    if (wholeNum > 0) {
        wordsEn += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    }
    if (decimalNum > 0) {
        wordsEn += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    }
    wordsEn += ' Only';

    if (wholeNum > 0) {
        wordsAr += `${currencyAr} ${numberToWordsArabic(wholeNum)}`;
    }
    if (decimalNum > 0) {
        wordsAr += ` و ${numberToWordsArabic(decimalNum)} ${subunitAr}`;
    }
    wordsAr += ' فقط';

    return {
        english: wordsEn,
        arabic: wordsAr
    };
};

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Generate Sales Return HTML - SalesReturnInvoicePrintFour (No QR)
 */
const generateSalesReturnFourHTML = (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const {
        invoiceNo,
        date,
        customerName,
        customerVATNo,
        CustomerAddress,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        againstInvoiceNo = ''
    } = invoiceData;

    const totalQty = salesDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = salesDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);

    const showCurrencyPrefix = state.generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(state.generalSettings.decimalPart)}`
            : Number(num).toFixed(state.generalSettings.decimalPart);

    const ROWS_PER_PAGE = 19;
    const productPages = chunkArray(salesDetails, ROWS_PER_PAGE);
    const totalPages = productPages.length || 1;

    const topPadding = headerImage ? '140px' : '15px';
    const bottomPadding = footerImage ? '100px' : '100px';
    const lastPageBottomPadding = footerImage ? '320px' : '235px';

    const pagesHTML = productPages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const emptyRowsCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
            <div class="page">
               ${headerImage ? `
                <div class="header-image">
                    <img src="${headerImage}" alt="header">
                </div>
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
                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}" style="padding: ${topPadding} 15px ${isLastPage ? lastPageBottomPadding : bottomPadding} 15px;">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>TAX CREDIT NOTE</span>
                        <span>سند ائتمان ضريبي</span>
                    </h2>

                    <div class="header-section">
                        <div class="invoice-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">CREDIT NOTE NO<br><span class="rtl">رقم مذكرة الائتمان</span></td>
                                    <td class="bold">${invoiceNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">DATE<br><span class="rtl">تاريخ</span></td>
                                    <td>${formatDate(date)} ${time || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Ref Invoice No<br><span class="rtl">رقم الفاتورة المرجعية</span></td>
                                    <td class="bold">${againstInvoiceNo || ''}</td>
                                </tr>
                            </table>
                        </div>

                        <div class="customer-details-section">
                            <table class="details-table">
                                <tr>
                                    <td class="label">Customer Name<br><span class="rtl">اسم العميل</span></td>
                                    <td class="bold">${customerName || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Customer VAT<br><span class="rtl">العميل ضريبة</span></td>
                                    <td>${customerVATNo || ''}</td>
                                </tr>
                                <tr>
                                    <td class="label">Address<br><span class="rtl">عنوان</span></td>
                                    <td>${CustomerAddress || ''}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>Tax Credit Note (Continued)</span>
                        <span>سند ائتمان ضريبي (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Credit Note No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                            <div class="col-sl"><div>رقم سي</div><div>SL No</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
                            <div class="col-qty"><div>وحدة</div><div>UNIT</div></div>
                            <div class="col-price"><div>سعر الوحدة</div><div>UNIT PRICE</div></div>
                            <div class="col-vat-percent"><div>ضريبة %</div><div>VAT %</div></div>
                            <div class="col-vat-amt"><div>مبلغ الضريبة</div><div>VAT AMT</div></div>
                            <div class="col-total"><div>المبلغ الإجمالي</div><div>TOTAL AMT</div></div>
                        </div>

                        <div class="product-body">
                            ${pageProducts.map((item, index) => {
                                const globalIndex = pageIndex * ROWS_PER_PAGE + index;
                                return `
                                    <div class="product-row">
                                        <div class="col-sl">${globalIndex + 1}</div>
                                        <div class="col-product">
                                            <div style="font-weight: 600;">${item.productName || ''}</div>
                                            ${item.productNameArb ? `<div>${item.productNameArb}</div>` : ''}
                                        </div>
                                        <div class="col-qty">${item.qty || 0}</div>
                                        <div class="col-qty">${item.unitName || 'PCS'}</div>
                                        <div class="col-price">${(item.rate.toFixed(state.generalSettings.decimalPart)) || 0}</div>
                                        <div class="col-vat-percent">${item.taxRate || 0}%</div>
                                        <div class="col-vat-amt">${item.taxAmount || 0}</div>
                                        <div class="col-total" style="text-align:right;">${Number(item.amount || 0).toFixed(state.generalSettings.decimalPart)}</div>
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
                                    <div class="col-vat-percent"></div>
                                    <div class="col-vat-amt"></div>
                                    <div class="col-total"></div>
                                </div>
                            `).join('')}

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page...</div>
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
                            <div class="col-vat-percent"></div>
                            <div class="col-vat-amt">${fmt(totalVAT)}</div>
                            <div class="col-total">${fmt(totalAmount)}</div>
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
                                    <td style="text-align: right;">${fmt(subTotal) || 0}</td>
                                </tr>
                                <tr>
                                    <td style="text-align: left;">Discount Amount</td>
                                    <td style="text-align: right;padding-right:15px;"><span>مبلغ الخصم</span> <span>:</span></td>
                                    <td style="text-align: right;">${Number(billDiscount).toFixed(state.generalSettings.decimalPart) || 0}</td>
                                </tr>
                                <tr>
                                    <td style="text-align: left;">VAT Amount</td>
                                    <td style="text-align: right;padding-right:15px;"><span>مبلغ الضريبة</span> <span>:</span></td>
                                    <td style="text-align: right;">${fmt(totalTax) || 0}</td>
                                </tr>
                                <tr>
                                    <th style="text-align: left; font-size: 20px;">Grand Total</th>
                                    <th style="text-align: right;padding-right:15px;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 20px;">${fmt(totalAmount) || 0}</th>
                                </tr>
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
                  <div class="footer-image">
                </div>
              ` }
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TAX CREDIT NOTE - ${invoiceNo}</title>
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
                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; }
                .header-image img { width: 100%; display: block; }
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
                }
                .header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                    gap: 15px;
                }
                .invoice-details-section {
                    flex: 1;
                }
                .customer-details-section {
                    flex: 1;
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
                .details-table .label {
                    font-weight: bold;
                    width: 120px;
                }
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
                .product-row { height: 22px; }
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
                .col-sl { width: 5%; text-align: center; justify-content: center; }
                .col-product { width: 45%; }
                .col-qty { width: 5%; text-align: center; justify-content: center; }
                .col-price { width: 14%; text-align: right; justify-content: flex-end; }
                .col-vat-percent { width: 7%; text-align: center; justify-content: center; }
                .col-vat-amt { width: 9%; text-align: right; justify-content: flex-end; }
                .col-total { width: 15%; text-align: right; justify-content: flex-end; }
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
                    align-items-center;
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
 * Main print sales return function - SalesReturnInvoicePrintFour (No QR)
 */
export const SalesReturnInvoicePrintFour = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateSalesReturnFourHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            getPrinterPreference('a4').then(savedPrinter => {
                printSilent(invoiceHTML, savedPrinter, 'a4').then(result => {
                    if (!result.success) {
                        console.error('❌ [SALES RETURN FOUR] Print failed:', result.error);
                    }
                });
            });
            return { success: true };
        } catch (error) {
            console.error('❌ [SALES RETURN FOUR] Error:', error);
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
        } else {
            console.error('❌ [SALES RETURN FOUR] Popup blocked');
            return { success: false, error: 'Popup blocked' };
        }
        return { success: true };
    }
};

/**
 * Save Sales Return as PDF - SalesReturnInvoicePrintFour (No QR)
 */
export const saveSalesReturnFourAsPDF = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateSalesReturnFourHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}_return_four.pdf`;

    if (isElectron()) {
        try {
            return window.electronAPI.savePDF(invoiceHTML, filename).then(result => {
                if (!result.success) {
                    console.error('❌ [SALES RETURN FOUR] PDF save failed:', result.error);
                }
                return result;
            });
        } catch (error) {
            console.error('❌ [SALES RETURN FOUR] Error saving PDF:', error);
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

export default SalesReturnInvoicePrintFour;