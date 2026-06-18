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

/**
 * Converts amount to words with currency
 */
const amountToWords = (amount, currency = 'Saudi Riyal', subunit = 'Halala') => {
    const [whole, decimal] = amount.toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

    let words = '';

    if (wholeNum > 0) {
        words += `${currency} ${numberToWordsEnglish(wholeNum)}`;
    }

    if (decimalNum > 0) {
        words += ` And ${numberToWordsEnglish(decimalNum)} ${subunit}`;
    }

    words += ' Only';

    return words;
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
 * Generate the invoice HTML
 */
const generateInvoiceHTML = (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;

    const showCurrencyPrefix = companyData?.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(companyData?.decimalPart || 2)}`
            : Number(num).toFixed(companyData?.decimalPart || 2);

    const {
        invoiceNo,
        vendorInvoiceNo,
        date,
        partyName,
        partyVatNo,
        partyAddress,
        invoiceDate,
        purchaseDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
    } = invoiceData;

    // Generate QR code data
    const qrCodeData = generateQRCodeData(invoiceData, companyName, companyVatNo, time);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeData)}`;

    // Calculate totals
    const totalQty = purchaseDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalVAT = purchaseDetails.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);

    // Split products into pages (16 rows per page)
    const ROWS_PER_PAGE = 18;
    const productPages = chunkArray(purchaseDetails, ROWS_PER_PAGE);
    const totalPages = productPages.length || 1;

    // Generate pages HTML
    const pagesHTML = productPages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        const emptyRowsCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length - 3);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
            <div class="page">
               ${headerImage ? (
                `<div class="header-image">
                    <img src="${headerImage}" alt="header">
                </div>`
            ) : (
                `<div class="header-image-dummy" >
                    <div>LOGO</div>
                </div>`
            )}

                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>PURCHASE ORDER</span>
                        <span>أمر شراء</span>
                    </h2>

                    <table class="invoice-details-table">
                        <tr>
                            <td class="label">Customer Name <br><span class="rtl">اسم العميل</span></td>
                            <td><span class="bold">${partyName || ''}</span></td>
                            <td class="label rtl">رقم الفاتورة<br>INVOICE NO</td>
                            <td class="bold">${invoiceNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="label" rowspan="2">Customer VAT <br><span class="rtl">العميل ضريبة</span></td>
                            <td rowspan="2">${partyVatNo || ''}<br>${partyAddress || ''}</td>
                            <td class="label rtl">رقم فاتورة المورد <br>SUPPLIER INVOICE NO</td>
                            <td>${vendorInvoiceNo|| 'NA'}</td>
                        </tr>
                        <tr>
                            <td class="label rtl">تاريخ فاتورة المورد <br>SUPPLIER INVOICE DATE</td>
                            <td class="bold">${formatDate(invoiceDate)}</td>
                        </tr>
                        <tr>
                            <td class="label rtl"></td>
                            <td class="label rtl"></td>
                            <td class="label rtl">الرقم المرجعي<br>Ref No</td>
                            <td class="bold">${invoiceData?.RefNo||'NA'}</td>
                        </tr>
                    </table>
                    ` : `
                    <h2 class="heading">
                        <span>Purchase Order (Continued)</span>
                        <span>أمر الشراء (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Order No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                            <div class="col-sl"><div>رقم سي</div><div>SL No</div></div>
                            <div class="col-code"><div>رمز العنصر</div><div>ITEM CODE</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
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
                                        <div class="col-code">${item.productCode || ''}</div>
                                        <div class="col-product">
                                            <div style="font-weight: 600;">${item.productName || ''}</div>
                                            ${item.productNameArb ? `<div>${item.productNameArb}</div>` : ''}
                                        </div>
                                        <div class="col-qty">${item.qty || 0} ${item.productDetails?.UnitName || ''}</div>
                                        <div class="col-price">${item.rate || 0}</div>
                                        <div class="col-vat-percent">${item.taxRate || 0}%</div>
                                        <div class="col-vat-amt">${item.taxAmount || 0}</div>
                                        <div class="col-total">${item.netAmount || 0}</div>
                                    </div>
                                `;
                            }).join('')}
                            
                            ${emptyRows.map(() => `
                                <div class="product-row empty-row">
                                    <div class="col-sl"></div>
                                    <div class="col-code"></div>
                                    <div class="col-product"></div>
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
                            <div class="col-code"></div>
                            <div class="col-product" style="text-align: right; font-weight: 800;">
                                TOTAL / <span>المجموع</span>
                            </div>
                            <div class="col-qty">${totalQty.toFixed(0)}</div>
                            <div class="col-price"></div>
                            <div class="col-vat-percent"></div>
                            <div class="col-vat-amt">${fmt(totalVAT)}</div>
                            <div class="col-total">${fmt(subTotal)}</div>
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
                                <div style="margin-top: 10px;">${amountToWords(totalAmount || 0)}</div>
                            </div>
                        </div>
                        <div class="total-right-side">
                            <table>
                                <tr>
                                    <th style="text-align: left;">Sub Total</th>
                                    <th style="text-align: right;"><span>المجموع الفرعي</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(subTotal)}</th>
                                </tr>
                                <tr>
                                    <th style="text-align: left;">Discount Amount</th>
                                    <th style="text-align: right;"><span>مبلغ الخصم</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(billDiscount)}</th>
                                </tr>
                                <tr>
                                    <th style="text-align: left;">VAT Amount</th>
                                    <th style="text-align: right;"><span>مبلغ الضريبة</span> <span>:</span></th>
                                    <th style="text-align: right;">${fmt(totalTax)}</th>
                                </tr>
                                <tr>
                                    <th style="text-align: left; font-size: 20px; font-weight: 900;">Grand Total</th>
                                    <th style="text-align: right;"><span>المجموع الإجمالي</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 20px; font-weight: 900;">${fmt(totalAmount)}</th>
                                </tr>
                            </table>
                        </div>
                    </div>

               

                    <div class="signature-section">
                        <div style="font-weight: 900;">AUTHORIZED SIGNATURE</div>
                        <div style="font-weight: 900;">CUSTOMER SIGNATURE</div>
                    </div>
                </div>
                ` : ''}

              ${footerImage?(`
                  <div class="footer-image">
                    <img src="${footerImage}" alt="footer">
                </div>`):(
                    `  <div class="footer-image-dummy">
                    <div>LOGO</div>
                </div>`
                )}
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PURCHASE INVOICE - ${invoiceNo}</title>
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
                    font-family: 'Times New Roman', Times, serif;
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
                    padding: 200px 15px 100px 15px;
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                }
                .content-wrapper.last-page { padding-bottom: 320px; }
                .total-section-fixed {
                    position: absolute;
                    bottom: 110px;
                    left: 15px;
                    right: 15px;
                    z-index: 2;
                }
                .heading {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    font-size: 22px;
                    margin: 0 0 15px 0;
                    font-weight: bold;
                }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                td, th { border: 1px solid rgb(216, 216, 216); padding: 2px 10px; vertical-align: top; }
                .invoice-details-table { font-size: 10px; }
                .label { font-weight: bold; width: 140px; }
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
                .product-row { height: auto; }
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
                .col-code { width: 10%; text-align: center; justify-content: center; }
                .col-product { width: 45%; }
                .col-qty { width: 5%; text-align: center; justify-content: center; }
                .col-price { width: 9%; text-align: right; justify-content: flex-end; }
                .col-vat-percent { width: 7%; text-align: center; justify-content: center; }
                .col-vat-amt { width: 9%; text-align: right; justify-content: flex-end; }
                .col-total { width: 10%; text-align: right; justify-content: flex-end; }
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
                }
                .total-section .total-right-side {
                    width: 50%;
                    border: 1px solid rgb(216, 216, 216);
                }
                .total-right-side th { border: none; padding: 8px 10px; }
                .footer-content {
                    margin-top: 1rem;
                    padding-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #aaaaaa;
                }
                    .header-image-dummy{
                    height:90px;
                    background-color:rgb(216, 216, 216);;
                    width: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    display :flex;
                    align-items: center;
                    justify-content: center;
                    color:white;
                    font-weight:600;
                    font-size:20px;
                }
                .footer-image-dummy{
                    height:60px;
                    background-color:rgb(216, 216, 216);;
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    z-index: 1;
                    display :flex;
                    align-items: center;
                    justify-content: center;
                    color:white;
                    font-weight:600;
                    font-size:20px;
                }
                .qr-code-section {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 5px;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 4rem;
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
 * Main print invoice function - SILENT PRINT (No dialog, no preview)
 */
export const purchaseOrderPrintOne = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    
    // Generate HTML
    const invoiceHTML = generateInvoiceHTML(invoiceData, branchData, time, currentCurrency);

    // ✅ SILENT PRINT - No dialog, no preview
    if (isElectron()) {
        try {
            
            // Get saved printer preference for A4
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
        // Browser fallback - opens in new window
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

export default purchaseOrderPrintOne;