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

const getPrintedDateTime = () => {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    const timePart = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    return `${datePart} ${timePart}`;
};

/**
 * Generate thermal invoice HTML - thermalTwo (No QR)
 */
const generateThermalTwoHTML = (invoiceData, branchData, time, currentCurrency) => {
console.log(invoiceData);

    const isNA = invoiceData.taxType === 'NA';

    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const salesSettings = state.saleSettings;
    const showLineDiscount = salesSettings?.showLineDiscount || false; 
    const activateRoundoff = Boolean(generalSettings.RoundOff)
    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(generalSettings.decimalPart)}`
            : Number(num).toFixed(generalSettings.decimalPart);

    const companyData = generalSettings;
    const companyName = branchData?.branchName || '';
    const companyNameFL = branchData?.branchNameFL || '';
    const addressFL = branchData?.addressFL || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;
    const companyAddress = branchData?.address || '';
    const companyPhone = branchData?.phoneNo || '';
    const TaxNo = branchData?.taxNo || '';
    const companyEmail = companyData?.email || '';

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
        narration = '',
        ledgerBalance = 0,
        othercharge = 0,
         roundOff = 0,

    } = invoiceData;

    const isCashCustomer = customerName && customerName.toLowerCase().includes('cash');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice - ${invoiceNo}</title>
            <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: "Inter", sans-serif;
                }

                body {
                    width: 80mm;
                    font-size: 11px;
                    line-height: 1.2;
                    padding: 5px 5mm;
                    margin: 0 auto;
                }

                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                }

                .company-name {
                    font-size: 19px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .company-address { font-size: 14px; }

                .company-info {
                    font-size: 16px;
                    line-height: 1.3;
                }

                .invoice-title {
                    font-size: 14px;
                    font-weight: semi-bold;
                    text-align: center;
                    margin: 5px 0;
                }

                .info-section {
                    margin-bottom: 2px;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 2px;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                    font-size: 10px;
                }

                .info-row-split {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                    font-size: 10px;
                }

                .info-row-split > div { flex: 1; }
                .info-row-split > div:last-child { text-align: right; }

                .info-label {
                    font-weight: bold;
                    font-size: 12px;
                }

                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .products-table th {
                    font-weight: bold;
                    border-bottom: 1px solid #000;
                    font-size: 10px;
                    text-align: left;
                }

                .products-table th:nth-child(1) { width: 40%; }
                .products-table th:nth-child(2) { width: 15%; text-align: center; }
                .products-table th:nth-child(3) { width: 20%; text-align: right; }
                .products-table th:nth-child(4) { width: 25%; text-align: right; }

                .products-table td {
                    padding: 2px;
                    border-bottom: 1px dotted #ccc;
                    font-size: 10px;
                }

                .product-name { font-weight: bold; }
                .product-name-arb { font-size: 9px; color: #333; }
                .product-code { font-size: 9px; color: #666; }
                .vat-info { font-size: 9px; color: #666; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }

                .totals-section {
                    margin-top: 5px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }

                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    font-size: 11px;
                }

                .grand-total {
                    font-size: 13px;
                    font-weight: bold;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    padding: 2px 0;
                    margin-top: 2px;
                }

                .customer-balance {
                    font-size: 12px;
                    font-weight: bold;
                    color: #d9534f;
                    border-top: 1px dashed #000;
                    padding-top: 5px;
                    margin-top: 5px;
                }

                .amount-words {
                    margin-top: 1px;
                    font-size: 12px;
                    text-align: center;
                    padding-top: 1px;
                }

                .footer {
                    text-align: center;
                    margin-top: 8px;
                    border-top: 2px dashed #000;
                    padding-top: 2px;
                    font-size: 10px;
                }

                .thank-you {
                    font-weight: bold;
                    font-size: 11px;
                    margin-bottom: 1px;
                }

                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body { padding: 5px 5mm; }
                }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <div class="company-name">${companyNameFL}</div>
                <div class="company-address">${addressFL}</div>
                ${!isNA ? `
                <div class="company-info">
                    الرقم الضريبي : ${TaxNo}
                </div>
                ` : ''}
            </div>

            <!-- Invoice Title -->
            <div class="invoice-title">
                ${isNA
                    ? 'ESTIMATE'
                    : (invoiceData.formType === 'Tax Invoice' ? 'Tax Invoice' : 'Simplified Tax Invoice')}
            </div>
            <div class="invoice-title" style="font-size: 14px;">
                ${isNA
                    ? 'تقدير'
                    : (invoiceData.formType === 'Tax Invoice' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة')}
            </div>

            <!-- Invoice Info -->
            <div class="info-section">
                <div class="info-row-split">
                    <div>
                        <span class="info-label">Invoice No:</span>
                        <span class="info-label">${invoiceNo || ''}</span>
                    </div>
                    <div>
                        <span class="info-label">Date:</span>
                        <span>${formatDate(date)}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment: <span style="font-weight:300">${paymentMode === 'cash' ? 'Cash' : 'Credit'}</span></span>
                    <span class="info-label">Time: <span style="font-weight:300">${time || ''}</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Printed On:</span>
                    <span style="font-weight:300">${getPrintedDateTime()}</span>
                </div>
            </div>

            <!-- Customer Info -->
            <div class="info-section">
                <div class="info-row">
                    <span class="info-label">Customer:<span style="font-weight:300"> ${customerName || ''}</span></span>
                </div>
                ${!isNA && customerVATNo ? `
                <div class="info-row">
                    <span class="info-label">Customer VAT: <span style="font-weight:300">${customerVATNo}</span></span>
                </div>
                ` : ''}
            </div>

            <!-- Products Table -->
            <table class="products-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width: 8%; text-align: center; vertical-align: middle;"></th>
                        <th colspan="${isNA ? 4 : 5}" style="padding-bottom: 1px; border-bottom: none;">
                            <table style="width: 100%; border: none;">
                                <tr>
                                    <th style="width: ${isNA ? '35%' : '30%'}; text-align: left; border: none; padding: 0;">الوصف</th>
                                    <th style="width: 13%; text-align: center; border: none; padding: 0;">الكمية</th>
                                    <th style="width: ${isNA ? '27%' : '24%'}; text-align: center; border: none; padding: 0;">معدل</th>
                                    ${!isNA ? `<th style="width: 13%; text-align: center; border: none; padding: 0;">ضريبة</th>` : ''}
                                    <th style="width: ${isNA ? '25%' : '22%'}; text-align: right; border: none; padding: 0;">المجموع</th>
                                </tr>
                            </table>
                        </th>
                    </tr>
                    <tr>
                        <th style="width: ${isNA ? '35%' : '30%'}; text-align: left;">Barcode</th>
                        <th style="width: 13%; text-align: center;">Qty</th>
                        <th style="width: ${isNA ? '27%' : '24%'}; text-align: center;">Rate</th>
                        ${!isNA ? `<th style="width: 13%; text-align: center;">Vat</th>` : ''}
                        <th style="width: ${isNA ? '25%' : '22%'}; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${salesDetails.map((item, index) => {
                        const hasArabicName = item.productNameArb && item.productNameArb.trim() !== '';
                        const rowSpan = hasArabicName ? 3 : 2;
                        const detailColspan = isNA ? 4 : 5;

                         const discPercent = Number(item.discountPercentage || 0);
    const grossAmt = Number(item.qty || 0) * Number(item.rate || 0);
    const discAmt = Number(item.descAmt) > 0
        ? Number(item.descAmt)
        : (grossAmt * discPercent) / 100;
    const hasLineDiscount = showLineDiscount && (discPercent > 0 || discAmt > 0);

                        return `
                          <tr>
        <td rowspan="${rowSpan}" style="text-align: center; vertical-align: middle; font-weight: bold; font-size: 11px; border-right: 1px solid #ddd;">${index + 1}</td>
        <td colspan="${detailColspan}" style="padding: 3px 2px 0px 2px; border: none;">
            <div class="product-name" style="font-size: 11px;">${item.productName || ''}</div>
        </td>
    </tr>
    ${hasArabicName ? `
    <tr>
        <td colspan="${detailColspan}" style="padding: 0px 2px 2px 2px; border: none;">
            <div class="product-name" style="text-align: left; font-size: 11px;">${item.productNameArb}</div>
        </td>
    </tr>
    ` : ''}
    <tr style="border-bottom: ${hasLineDiscount ? 'none' : '1px dashed #ccc'};">
        <td style="text-align: left; font-size:11px; padding: 2px;">${item.productCode || item.barcode || 'N/A'}</td>
        <td style="text-align: center; font-size: 11px;">${item.qty || 0}</td>
        <td style="text-align: center; font-size: 11px;">${Number(item.rate || 0).toFixed(2)}</td>
        ${!isNA ? `<td style="text-align: center; font-size: 11px;">${Number(item.taxAmount || 0).toFixed(2)}</td>` : ''}
        <td style="text-align: right; font-size: 11px; font-weight: bold;">${Number(item.amount || 0).toFixed(2)}</td>
    </tr>
    ${hasLineDiscount ? `
    <tr style="border-bottom: 1px dashed #ccc;">
        <td colspan="${detailColspan + 1}" style="text-align: right; padding: 0px 2px 2px 2px; border: none;">
            <span class="vat-info">Disc: ${discPercent.toFixed(2)}% (-${discAmt.toFixed(2)})</span>
        </td>
    </tr>
    ` : ''}
                        `;
                    }).join('')}
                </tbody>
            </table>

            <!-- Totals -->
            <div class="totals-section">
                <div class="total-row">
                    <span>Sub Total:</span>
                    <span>${fmt(subTotal)}</span>
                </div>
                 ${Number(othercharge) !== 0 ? ` <div class="total-row">
                    <span>Other Charge:</span>
                    <span>${fmt(othercharge)}</span>
                </div>` : ""}
                  ${((salesSettings?.showBillDiscountAmount || salesSettings?.showBillDiscountPerc) && Number(billDiscount) !==0)?`
                               <div class="total-row">
                    <span>Discount:</span>
                    <span>- ${fmt(billDiscount)}</span>
                </div> ` : ""}

                <div class="total-row">
                    <span>Taxable Amount:</span>
                    <span>${fmt(
                                 Number(subTotal || 0) -
                                 Number(invoiceData?.billDiscount || 0) +
                                 Number(othercharge || 0)
                            )}</span>
                </div>
                ${!isNA ? `
                <div class="total-row">
                    <span>VAT Amount:</span>
                    <span>${fmt(totalTax)}</span>
                </div>
                ` : ''}
                ${(activateRoundoff && Number(roundOff) !== 0) ? `
                               <div class="total-row">
                               <span>Round Off:</span>
                                <span >${fmt(roundOff)}</span>
                </div> ` : ""}
                <div class="total-row grand-total">
                    <span>GRAND TOTAL:</span>
                    <span>${fmt(totalAmount)}</span>
                </div>

                ${!isCashCustomer ? `
                <div class="total-row customer-balance">
                    <span>Customer Balance:</span>
                    <span>${fmt(ledgerBalance)}</span>
                </div>
                ` : ''}
            </div>

            <!-- Amount in Words -->
            <div class="amount-words">
                <strong style="font-size: 9px;">Amount in Words:</strong><br>
                ${amountToWords(totalAmount || 0)}
            </div>

            ${narration ? `
            <div style="margin-top: 10px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px;">
                <strong>Note:</strong> ${narration}
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
                <div class="thank-you">THANK YOU!</div>
                <div>شكراً لك</div>
                <div style="margin-top: 8px; font-size: 9px;">Please visit again</div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Main thermal print invoice function - thermalTwo (No QR)
 */
export const printThermalInvoiceTwo = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateThermalTwoHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('thermal');
            const result = await printSilent(invoiceHTML, savedPrinter, 'thermal');

            if (!result.success) {
                console.error('❌ [THERMAL TWO] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [THERMAL TWO] Error:', error);
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
 * Save invoice as PDF - thermalTwo (No QR)
 */
export const saveInvoiceThermalTwoAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateThermalTwoHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}_thermal_two.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (!result.success) {
                console.error('❌ [THERMAL TWO] PDF save failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [THERMAL TWO] Error saving PDF:', error);
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

export default printThermalInvoiceTwo;