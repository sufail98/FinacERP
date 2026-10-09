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

/**
 * Converts amount to words with currency
 */
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
 * Split array into chunks
 */
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
        if (dateStr.includes("-")) {
            parts = dateStr.split("-");
        } else if (dateStr.includes("/")) {
            parts = dateStr.split("/");
        } else {
            return "";
        }

        let day, month, year;
        if (parts[0].length === 2) {
            day = parts[0];
            month = parts[1];
            year = parts[2];
        } else {
            year = parts[0];
            month = parts[1];
            day = parts[2];
        }

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
 * Generate the invoice HTML for dot matrix printer
 */
const generateInvoiceHTML = (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);
    
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
        const activateRoundoff = Boolean(generalSettings.RoundOff)
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(state.generalSettings.decimalPart)}`
            : Number(num).toFixed(state.generalSettings.decimalPart);

    const companyName = branchData?.branchName || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;
    const companyMobile = branchData?.mobile || '';
        const salesSettings = state.saleSettings;


    const {
        invoiceNo,
        date,
        customerName,
        
        customerVATNo,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        paymentMode,
        othercharge = 0,
         roundOff = 0,
    } = invoiceData;

    // Generate QR code data
    const qrCodeData = generateQRCodeData(invoiceData, companyName, companyVatNo, time);

    // Split products into pages (25 rows per page for dot matrix)
    const ROWS_PER_PAGE = 25;
    const productPages = chunkArray(salesDetails, ROWS_PER_PAGE);
    const totalPages = productPages.length || 1;

    // Generate pages HTML
    const pagesHTML = productPages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        const emptyRowsCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
            <div class="page">
                ${isFirstPage ? `
                <div class="header-section">
                    <div class="barcode-notice">Control's boundaries<br>are too small for the<br>barcode</div>
                    <div class="header-info">
                        <div class="vat-row">
                            <span class="label">VAT NO :</span>
                            <span class="value">${companyVatNo}</span>
                            <span class="label-ar">الرقم الضريبي</span>
                        </div>
                    </div>
                </div>
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
                <div class="company-invoice-section">
                    <div class="company-details">
                        <div class="company-name-ar">شركة فيصل فهد حسين الكاري للتقليات</div>
                        <div class="company-name-en">${customerName || 'Faisal Fahad Hussain Al-Kari Transportation Co.'}</div>
                        <div class="company-extra">
                            <span>${branchData?.taxNo || '310434457200003'}</span>
                            <span class="label-ar">الرقم الضريبي</span>
                        </div>
                        <div class="company-extra">
                            <span>${companyMobile || '0592166745'}</span>
                            <span class="label-ar">رقم الجوال</span>
                        </div>
                    </div>

                    <div class="invoice-meta">
                        <div class="invoice-type">
                            <span>TAX</span>
                            <span>INVOICE</span>
                            <span class="ar">فاتورة</span>
                            <span class="ar">الضريبة</span>
                        </div>
                        <div class="credit-info">
                            <span>${paymentMode === 'cash' ? 'Credit' : 'Credit'}</span>
                        </div>
                    </div>

                    <div class="invoice-details">
                        <div class="detail-row">
                            <span class="label">Invoice #</span>
                            <span class="value">${invoiceNo || ''}</span>
                            <span class="label-ar">الفاتورة</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Date</span>
                            <span class="value">${formatDate(date)}</span>
                            <span class="label-ar">تاريخ</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">LPO No</span>
                            <span class="value"></span>
                        </div>
                    </div>
                </div>
                ` : `
                <div class="continuation-header">
                    <h3>Tax Invoice (Continued) - Page ${pageIndex + 1} of ${totalPages}</h3>
                    <div>Invoice No: ${invoiceNo}</div>
                </div>
                `}

                <div class="products-section">
                    ${pageProducts.map((item, index) => {
                        const globalIndex = pageIndex * ROWS_PER_PAGE + index;
                        return `
                            <div class="product-line">
                                <span class="col-no">${globalIndex + 1}</span>
                                <span class="col-desc">
                                ${item.productName || ''} <br/>
                                 <div>${item.productDescription || ''}</div>

                                </span>
                                <span class="col-qty">${item.qty || 0}</span>
                                <span class="col-price">${Number(item.rate || 0).toFixed(state.generalSettings.decimalPart)}</span>
                                <span class="col-total">${Number((item.qty || 0) * (item.rate || 0)).toFixed(state.generalSettings.decimalPart)}</span>
                            </div>
                        `;
                    }).join('')}
                    
                    ${emptyRows.map(() => `
                        <div class="product-line empty">
                            <span class="col-no"></span>
                            <span class="col-desc"></span>
                            <span class="col-qty"></span>
                            <span class="col-price"></span>
                            <span class="col-total"></span>
                        </div>
                    `).join('')}

                    ${!isLastPage ? `
                        <div class="continuation-note">-- Continued on next page --</div>
                    ` : ''}
                </div>

                ${isLastPage ? `
                <div class="footer-section">
                    <div class="amount-words">
                        <div class="words-ar">فقط مئتان و ثلاثون ريالا سعودياً لا غير</div>
                        <div class="words-en">${amountToWords(totalAmount || 0).english}</div>
                    </div>

                    <div class="summary-section">
                        <div class="bank-details">
                            <div class="bank-line">
                                <span class="bank-label">COMPANY NAME</span>
                                <span class="bank-value">${companyName}</span>
                            </div>
                            <div class="bank-line">
                                <span class="bank-label">BANK NAME</span>
                                <span class="bank-value">${branchData?.bankName || 'AL RAJHI BANK'}</span>
                            </div>
                            <div class="bank-line">
                                <span class="bank-label">ACCOUNT NO</span>
                                <span class="bank-value">${branchData?.accountNo || '514608010012440'}</span>
                            </div>
                            <div class="bank-line">
                                <span class="bank-label">IBAN NO</span>
                                <span class="bank-value">${branchData?.iban || 'SA 7280000514608010012440'}</span>
                            </div>
                        </div>

                        <div class="totals-section">
                            <div class="total-line">
                                <span class="total-value">${fmt(subTotal)}</span>
                            </div>
                            ${Number(othercharge) !== 0 ? `<div class="total-line">
                                <span class="total-value">${fmt(othercharge)}</span>
                            </div>` : ""}
                             
                            ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !==0)?`
                                <div class="total-line">
                                <span class="total-value">${fmt(billDiscount)}</span>
                            </div> ` : ""}

                              <div class="total-line">
                                        <span class="total-value"> ${fmt(
                                                Number(subTotal || 0) -
                                                Number(invoiceData?.billDiscount || 0) +
                                                Number(othercharge || 0)
                                        )}</span>
                            </div>

                            <div class="total-line vat-line">
                                <span class="total-label">15%</span>
                                <span class="total-value">${fmt(totalTax)}</span>
                            </div>
                            ${(activateRoundoff && Number(roundOff) !== 0) ? `
                               <div class="total-line">
                                <span class="total-value">${fmt(roundOff)}</span>
                            </div> ` : ""}
                            
                            <div class="total-line grand-total">
                                <span class="total-value">${fmt(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
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
            <title>TAX INVOICE - ${invoiceNo}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: 10mm 5mm;
                }
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                body {
                    background: #fff;
                    margin: 0;
                    padding: 10px;
                    font-family: "Courier New", Courier, monospace;
                    font-size: 11px;
                    line-height: 1.3;
                    color: #000;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    margin-bottom: 10px;
                    page-break-after: always;
                    padding: 0;
                }
                    /* ✅ Vertical Print Timestamp in Right Corner */
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
                .page:last-child { 
                    margin-bottom: 0; 
                }

                .header-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding: 0 10px;
                }

                .barcode-notice {
                    font-size: 9px;
                    text-align: center;
                    line-height: 1.2;
                }

                .header-info {
                    flex: 1;
                    text-align: right;
                }

                .vat-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 20px;
                    font-size: 11px;
                    font-weight: bold;
                }

                .label {
                    font-weight: bold;
                }

                .label-ar {
                    font-weight: bold;
                    direction: rtl;
                }

                .company-invoice-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 0 10px;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    padding-top: 10px;
                    padding-bottom: 10px;
                }

                .company-details {
                    flex: 1;
                }

                .company-name-ar {
                    font-size: 10px;
                    direction: rtl;
                    text-align: right;
                    margin-bottom: 3px;
                }

                .company-name-en {
                    font-size: 10px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }

                .company-extra {
                    font-size: 9px;
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                }

                .invoice-meta {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0 20px;
                }

                .invoice-type {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-weight: bold;
                    font-size: 12px;
                    margin-bottom: 5px;
                }

                .invoice-type .ar {
                    font-size: 11px;
                }

                .credit-info {
                    font-weight: bold;
                    font-size: 11px;
                }

                .invoice-details {
                    text-align: right;
                }

                .detail-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-bottom: 3px;
                    font-size: 10px;
                }

                .detail-row .value {
                    min-width: 100px;
                    text-align: left;
                }

                .products-section {
                    padding: 0 10px;
                    margin-bottom: 20px;
                }

                .product-line {
                    display: flex;
                    justify-content: space-between;
                    padding: 3px 0;
                    border-bottom: 1px dotted #ccc;
                    font-size: 10px;
                }

                .product-line.empty {
                    border-bottom: none;
                    min-height: 18px;
                }

                .col-no {
                    width: 5%;
                    text-align: left;
                }

                .col-desc {
                    width: 55%;
                    text-align: left;
                }

                .col-qty {
                    width: 10%;
                    text-align: center;
                }

                .col-price {
                    width: 15%;
                    text-align: right;
                }

                .col-total {
                    width: 15%;
                    text-align: right;
                }

                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    margin: 20px 0;
                    font-size: 11px;
                }

                .continuation-header {
                    text-align: center;
                    padding: 20px 0;
                    border-bottom: 2px solid #000;
                    margin-bottom: 20px;
                }

                .continuation-header h3 {
                    font-size: 14px;
                    margin-bottom: 5px;
                }

                .footer-section {
                    padding: 0 10px;
                    border-top: 2px solid #000;
                    padding-top: 15px;
                }

                .amount-words {
                    margin-bottom: 15px;
                }

                .words-ar {
                    direction: rtl;
                    text-align: right;
                    font-size: 10px;
                    margin-bottom: 3px;
                }

                .words-en {
                    font-size: 10px;
                    font-weight: bold;
                }

                .summary-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .bank-details {
                    flex: 1;
                }

                .bank-line {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 5px;
                    font-size: 10px;
                }

                .bank-label {
                    font-weight: bold;
                    min-width: 120px;
                }

                .bank-value {
                    flex: 1;
                }

                .totals-section {
                    text-align: right;
                    min-width: 150px;
                }

                .total-line {
                    margin-bottom: 5px;
                    font-size: 12px;
                    font-weight: bold;
                }

                .vat-line {
                    display: flex;
                    justify-content: flex-end;
                    gap: 30px;
                    align-items: center;
                }

                .grand-total {
                    font-size: 14px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    margin-top: 5px;
                }

                .total-value {
                    display: inline-block;
                    min-width: 80px;
                    text-align: right;
                }

                @media print {
                    body { 
                        background: white; 
                        padding: 0; 
                    }
                    .page { 
                        box-shadow: none; 
                        width: 100%; 
                        margin-bottom: 0;
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
 * Main print invoice function - SILENT PRINT (No dialog, no preview)
 */
export const printInvoiceFive = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [SALES INVOICE TYPE 5 - DOT MATRIX] Printed successfully!');
            } else {
                console.error('❌ [SALES INVOICE TYPE 5 - DOT MATRIX] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [SALES INVOICE TYPE 5 - DOT MATRIX] Error:', error);
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

export const saveInvoiceFiveAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);
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

export default printInvoiceFive;