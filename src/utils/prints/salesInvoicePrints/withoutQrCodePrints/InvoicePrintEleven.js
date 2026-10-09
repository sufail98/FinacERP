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

const amountToWords = (amount) => {
    const parts = Number(amount).toFixed(2).toString().split('.');
    const wholeNum = parseInt(parts[0]) || 0;
    const decimalNum = parseInt(parts[1]) || 0;

    let wordsEn = '';
    if (wholeNum > 0) wordsEn += `${numberToWordsEnglish(wholeNum)} Riyal`;
    if (decimalNum > 0) wordsEn += ` and ${numberToWordsEnglish(decimalNum)} Halala`;
    wordsEn = wordsEn || 'Zero Riyal';

    return { english: `${wordsEn} Only` };
};

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

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
 * Generate the invoice HTML - InvoicePrintEleven (No QR)
 */
const generateInvoiceElevenHTML = (invoiceData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
      const activateRoundoff = Boolean(generalSettings.RoundOff)

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';

    const showTax = invoiceData.taxType !== "NA";
    const isEstimate = invoiceData.taxType === "NA";

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(generalSettings.decimalPart)}`
            : Number(num).toFixed(generalSettings.decimalPart);

    const saleSettings = state.saleSettings;
    const companyData = state.generalSettings;

    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;

    const companyName = branchData?.branchName || '';
    const companyNameAr = branchData?.branchNameFL || '';
    const companyVatNo = branchData?.taxNo || '';
    const companyCR = branchData?.crNo || '';

    const companyAddress = [
        branchData?.buildingNo,
        branchData?.streetName,
        branchData?.district,
        branchData?.cityName,
        branchData?.country,
        branchData?.postalCode
    ].filter(Boolean).join(', ');

    const companyAddressAr = [
        branchData?.buildingNoFL,
        branchData?.streetNameFL,
        branchData?.districtFL,
        branchData?.cityNameFL,
        branchData?.countryFL,
        branchData?.postalCode
    ].filter(Boolean).join(', ');

    const companyEmail = branchData?.email || '';
    const companyPhone = branchData?.phoneNo || '';
    const companyPostalCode = branchData?.postalCode || '';

    const {
        invoiceNo,
        date,
        customerName,
        customerVATNo,
        CustomerPhone,
        paymentMode,
        salesDetails = [],
        subTotal = 0,
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        orderRefNo,
        dnNumber,
        crNumber,
        customerEmail,
        customerCode,
        dueDate,
        supplyDate,
        ledgerBalance = 0,
        othercharge = 0,
    roundOff = 0,

    } = invoiceData;

    const isCashCustomer = customerName && customerName.toLowerCase().includes('cash');

    const dp = 2;

    const FIRST_PAGE_ROWS = 25;
    const MIDDLE_PAGE_ROWS = 35;
    const LAST_PAGE_ROWS = 12;

    const productPages = splitIntoPages(salesDetails, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;

    let cumulativeIndex = 0;

    const invoiceTypeEn = isEstimate ? 'ESTIMATE' : (invoiceData.formType !== 'Tax Invoice' ? 'SIMPLIFIED TAX INVOICE' : 'TAX INVOICE');
    const invoiceTypeAr = isEstimate ? 'تقدير' : (invoiceData.formType !== 'Tax Invoice' ? 'فاتورة ضريبية مبسطة' : 'فاتورة ضريبية');

    const customerData = invoiceData?.customerData || {};

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage, maxRows } = pageData;

        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        const emptyRowsCount = Math.max(0, maxRows - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
        <div class="page">

            <!-- ===== HEADER ===== -->
            <div class="page-header">
                ${headerImage ? `<img src="${headerImage}" class="header-img" alt="header">` : `
                <div class="header-inner">
                    <div class="company-left">
                        <div class="company-name-en">${companyName}</div>
                        <div class="company-meta">C.R : ${companyCR}</div>
                        <div class="company-meta">Postal Code : ${companyPostalCode}</div>
                        <div class="company-meta">${companyAddress}</div>
                        <div class="company-meta">E Mail : ${companyEmail}</div>
                        <div class="company-meta">VAT No: ${companyVatNo}</div>
                        <div class="company-meta">Contact number : ${companyPhone}</div>
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
                    <div class="company-center">
                        <div class="logo-box">
                            ${branchData.logo
                                ? `<img src="${branchData.logo}" class="logo-img" alt="logo">`
                                : `<div class="logo-text">${companyName.split(' ').slice(0, 3).join('<br>')}</div>`
                            }
                        </div>
                        <div class="invoice-type-header">
                            <div class="invoice-type-en">${invoiceTypeEn}</div>
                            <div class="invoice-type-ar">${invoiceTypeAr}</div>
                        </div>
                    </div>

                    <div class="company-right">
                        <div class="company-name-ar">${companyNameAr}</div>
                        <div class="company-meta-ar">س ت : ${companyCR}</div>
                        <div class="company-meta-ar">${companyAddressAr}</div>
                        <div class="company-meta-ar">البريد الإلكتروني : ${companyEmail}</div>
                        <div class="company-meta-ar">رقم ضريبة القيمة المضافة : ${companyVatNo}</div>
                        <div class="company-meta-ar">رقم الاتصال : ${companyPhone}</div>
                    </div>
                </div>
                `}
            </div>

            ${isFirstPage ? `
            <div class="info-wrapper">
                <div class="company-title-bar">${companyName}</div>

                <div class="buyer-bar">
                    <span class="info-label">BUYER NAME / اسم العميل :</span>
                    <span class="buyer-value">${customerName || ''}</span>
                </div>

                <div class="info-grid">
                    <table class="info-table">
                        <tr>
                            <td class="info-label">VAT Number / الرقم الضريبي</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerVATNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Building No. / رقم المبنى</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.BuildingNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Street Name / اسم الشارع</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.StreetName || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">District / الحي</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.District || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">City / مدينة</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.CityName || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Country / بلد</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.Country || 'Saudi Arabia'}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Postal Code / رمز بريدي</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.PostalCode || companyPostalCode || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Additional Code / رقم إضافي</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerData.AdditionalCode || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Contact Number / رقم الاتصال</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${CustomerPhone || ''}</td>
                        </tr>
                    </table>

                    <table class="info-table info-table-right">
                        <tr>
                            <td class="info-label">Invoice Date / تاريخ الفاتورة</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${formatDate(date)}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Date of Supply / تاريخ التوريد</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${supplyDate ? formatDate(supplyDate) : formatDate(date)}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Invoice Number / رقم الفاتورة</td>
                            <td class="info-colon">:</td>
                            <td class="info-value bold">${invoiceNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">PO Number / رقم طلب شراء</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${orderRefNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Invoice Type / نوع الفاتورة</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${paymentMode === 'cash' ? 'Cash' : 'Credit'}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Payment Due Date / تاريخ استحقاق الدفع</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${dueDate ? formatDate(dueDate) : ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">DN Number / رقم سند الإشعار</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${dnNumber || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">CR Number / رقم التجاري</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${crNumber || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Email / بريد الكتروني</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerEmail || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Customer Code / رقم العميل</td>
                            <td class="info-colon">:</td>
                            <td class="info-value">${customerCode || ''}</td>
                        </tr>
                    </table>
                </div>
            </div>
            ` : `
            <div class="continuation-header">
                <span>${invoiceTypeEn} (Continued) | Invoice No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}</span>
                <span>${invoiceTypeAr} (تابع)</span>
            </div>
            `}

            <!-- ===== PRODUCT TABLE ===== -->
            <table class="product-table">
                <thead>
                    <tr>
                        <th class="col-sl">
                            <div>SI No.</div>
                            <div class="th-ar">رقم</div>
                        </th>
                        <th class="col-code">
                            <div>Item Code</div>
                            <div class="th-ar">رمز المنتج</div>
                        </th>
                        <th class="col-prod" style="text-align:left; padding-left:6px;">
                            <div>Nature of Goods &amp; Services</div>
                            <div class="th-ar">طبيعة السلع والخدمات</div>
                        </th>
                        <th class="col-qty">
                            <div>Qty</div>
                            <div class="th-ar">كمية</div>
                        </th>
                        <th class="col-unit">
                            <div>Unit</div>
                            <div class="th-ar">وحدة</div>
                        </th>
                        <th class="col-uprice">
                            <div>Unit Price</div>
                            <div class="th-ar">سعر الوحدة</div>
                        </th>
                        <th class="col-iprice">
                            <div>Item Price</div>
                            <div class="th-ar">سعر السلعة</div>
                        </th>
                      ${saleSettings?.showLineDiscount ? `
                        <th class="col-disc">
                            <div>Disc %</div>
                            <div class="th-ar">خصم %</div>
                        </th>
                        <th class="col-discamt">
                            <div>Disc Amt</div>
                            <div class="th-ar">مبلغ الخصم</div>
                        </th>
                        ` : ''}
                        ${showTax ? `
                        <th class="col-taxpct">
                            <div>Tax %</div>
                            <div class="th-ar">الضريبة %</div>
                        </th>
                        <th class="col-taxamt">
                            <div>Tax</div>
                            <div class="th-ar">الضريبة</div>
                        </th>
                        ` : ''}
                        <th class="col-total">
                            <div>Total</div>
                            <div class="th-ar">مجموع</div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${pageProducts.map((item, index) => {
                        const globalIndex = pageStartIndex + index;
                        const itemPrice = Number(item.itemPrice || (parseFloat(item.qty) * parseFloat(item.rate)) || 0);
                        const discountPercentage = parseFloat(item.discountPercentage || 0);
                        const discountAmount = Number(item.descAmt || ((itemPrice * discountPercentage) / 100) || 0);

                        return `
                        <tr class="product-row">
                            <td class="td-center">${globalIndex + 1}</td>
                            <td class="td-center td-code">${item.productCode || item.itemCode || ''}</td>
                            <td class="td-product">
                                <div class="item-name-en">${item.productName || ''}</div>
                                ${item.productNameArb ? `<div class="item-name-ar">${item.productNameArb}</div>` : ''}
                                <div class="item-name-en">${item.productDescription || ''}</div>
                            </td>
                            <td class="td-center">${parseFloat(item.qty || 0).toFixed(0)}</td>
                            <td class="td-center">${item.unitName || item.unit || 'ctn'}</td>
                            <td class="td-right">${Number(item.rate || 0).toFixed(dp)}</td>
                            <td class="td-right">${itemPrice.toFixed(dp)}</td>
                            ${saleSettings?.showLineDiscount ? `
                            <td class="td-center">${discountPercentage.toFixed(2)}%</td>
                            <td class="td-right">${discountAmount.toFixed(dp)}</td>
                            ` : ''}
                            ${showTax ? `
                            <td class="td-center">${item.taxRate || 0}%</td>
                            <td class="td-right">${Number(item.taxAmount || 0).toFixed(dp)}</td>
                            ` : ''}
                            <td class="td-right">${Number(item.amount || 0).toFixed(dp)}</td>
                        </tr>
                        `;
                    }).join('')}

                    ${emptyRows.map(() => {
                        const discCols = saleSettings?.showLineDiscount  ? '<td></td><td></td>' : '';
                        const taxCols = showTax ? '<td></td><td></td>' : '';
                        return `
                        <tr class="product-row empty-row">
                            <td></td><td></td><td></td><td></td><td></td>
                            <td></td><td></td>
                            ${discCols}
                            ${taxCols}
                            <td></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            ${!isLastPage ? `
            <div class="page-continued">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>
            ` : ''}

            ${isLastPage ? `
            <div class="footer-totals-wrapper">
                <div class="footer-totals-col" style="width: 100%;">
                    <div class="totals-row-item">
                        <div class="totals-en">TOTAL (EXCLUDING VAT)</div>
                        <div class="totals-ar">الإجمالي ( غير شاملة ضريبة القيمة المضافة )</div>
                        <div class="totals-value">${fmt(subTotal)}</div>
                    </div>
                     ${Number(othercharge) !== 0 ? `<div class="totals-row-item">
                        <div class="totals-en">OTHER CHARGE</div>
                        <div class="totals-ar">رسوم اخرى</div>
                        <div class="totals-value">${fmt(othercharge)}</div>
                    </div>` : ""}
                    
                    ${((saleSettings?.showBillDiscountAmount || saleSettings?.showBillDiscountPerc) && Number(billDiscount) !== 0)?`
                                 <div class="totals-row-item">
                        <div class="totals-en">DISCOUNT</div>
                        <div class="totals-ar">مجموع الخصومات</div>
                        <div class="totals-value">${fmt(billDiscount)}</div>
                    </div>` : ""}
                   
                    <div class="totals-row-item">
                        <div class="totals-en">TOTAL TAXABLE AMOUNT (EXCL. VAT)</div>
                        <div class="totals-ar">الإجمالي الخاضع للضريبة ( غير شاملة ضريبة القيمة المضافة )</div>
                        <div class="totals-value">${fmt(Number(subTotal) - Number(invoiceData?.billDiscount || 0) + Number(othercharge || 0))}</div>
                    </div>
                    
                    ${showTax ? `
                    <div class="totals-row-item">
                        <div class="totals-en">TOTAL VAT (15%)</div>
                        <div class="totals-ar">مجموع ضريبة القيمة المضافة</div>
                        <div class="totals-value">${fmt(totalTax)}</div>
                    </div>
                    ` : ''}
                    ${(activateRoundoff && Number(roundOff) !== 0) ? `
                                    <div class="totals-row-item">
                                    <div class="totals-en">ROUND OFF</div>
                                    <div class="totals-ar">مبلغ الضريبة </div>
                                    <div class="totals-value">${fmt( roundOff )}</div>
                        </div>` : ""}
                    <div class="totals-row-item grand">
                        <div class="totals-en">TOTAL AMOUNT DUE</div>
                        <div class="totals-ar">إجمالي المبلغ المستحق</div>
                        <div class="totals-value">${showCurrencyPrefix ? `${currencySymbol} ${Number(totalAmount).toFixed(generalSettings.decimalPart)}` : `SAR ${Number(totalAmount).toFixed(generalSettings.decimalPart)}`}</div>
                    </div>
                    ${(!isCashCustomer && saleSettings.showCustomerBalanceBill) ? `
                    <div class="totals-row-item customer-balance">
                        <div class="totals-en">CUSTOMER BALANCE</div>
                        <div class="totals-ar">رصيد العميل</div>
                        <div class="totals-value">${fmt(ledgerBalance)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="bottom-section">
                <div class="amount-words-box">
                    <span class="amount-words-label">Amount in Words: </span>
                    <span>${amountToWords(totalAmount).english}</span>
                </div>

                <div class="bank-details-box">
                    <div class="bank-title">Bank Details:</div>
                    <div class="bank-line">
                        <span style="font-weight:bold;">${branchData?.bankName || '-'}:</span> ${branchData?.bankAccountNo || '-'}
                        <span class="bank-sep">|</span>
                        <span style="font-weight:bold;">IBAN:</span> ${branchData?.iban || '-'}
                        ${invoiceData?.narration ? `<span class="bank-sep">|</span><span style="font-weight:bold;">Remark:</span> ${invoiceData.narration}` : ''}
                    </div>
                </div>

                <div class="prepared-receiver-row">
                    <div class="sig-block" style="align-items:flex-start;">
                        <div class="sig-label">PREPARED BY</div>
                        <div class="sig-name">${branchData?.preparedBy || ''}</div>
                        <div class="sig-line" style="width:160px;"></div>
                    </div>
                    <div class="sig-block" style="align-items:flex-end; text-align:right;">
                        <div class="sig-label">RECEIVER SIGN:</div>
                        <div class="sig-line" style="width:160px;"></div>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="page-footer">
                ${footerImage ? `<img src="${footerImage}" class="footer-img" alt="footer">` : ''}
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
        <title>${invoiceTypeEn} - ${invoiceNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
                font-family: Arial, sans-serif;
                background: #fff;
                color: #000;
                font-size: 9px;
            }

            .page {
                width: 210mm;
                min-height: 297mm;
                background: white;
                position: relative;
                display: flex;
                flex-direction: column;
                page-break-after: always;
                overflow: hidden;
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
            .page:last-child { page-break-after: auto; }

            .page-header { width: 100%; }
            .header-img { width: 100%; display: block; }
            .header-inner {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding: 10px 0;
                gap: 8px;
            }
            .company-left { flex: 1; text-align: left; }
            .company-right { flex: 1; text-align: right; direction: rtl; }
            .company-center {
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            .company-name-en { font-size: 15px; font-weight: 900; margin-bottom: 3px; }
            .company-name-ar { font-size: 15px; font-weight: 900; margin-bottom: 3px; }
            .company-meta, .company-meta-ar { font-size: 10px; line-height: 1.5; }

            .logo-box {
                width: 72px;
                height: 72px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #fff;
            }
            .logo-img { width: 100%; height: 100%; object-fit: contain; }
            .logo-text {
                font-size: 7px;
                font-weight: 900;
                text-align: center;
                line-height: 1.2;
                color: #333;
                padding: 4px;
            }
            .invoice-type-header { text-align: center; }
            .invoice-type-en { font-size: 15px; font-weight: 900; letter-spacing: 0.3px; }
            .invoice-type-ar { font-size: 10px; font-weight: 700; direction: rtl; }

            .info-wrapper {
                border: 1px solid #000;
                margin: 12px 0;
            }
            .company-title-bar {
                text-align: center;
                font-size: 14px;
                font-weight: 900;
                padding: 4px 12px;
                border-bottom: 1px solid #000;
            }
            .buyer-bar {
                padding: 4px 12px;
                font-size: 9.5px;
                font-weight: bold;
                border-bottom: 1px solid #000;
            }
            .buyer-value {
                margin-left: 6px;
                font-weight: 900;
                text-transform: uppercase;
                font-size: 10px;
            }
            .info-grid { display: flex; }
            .info-table {
                flex: 1;
                border-collapse: collapse;
                font-size: 8.5px;
            }
            .info-table-right { border-left: 1px solid #000; }
            .info-table td {
                padding: 2.5px 7px;
                vertical-align: top;
                border-bottom: 0.5px solid #ccc;
            }
            .info-label { font-weight: bold; width: 52%; white-space: nowrap; }
            .info-colon { width: 8px; text-align: center; }
            .info-value { font-size: 8.5px; }
            .info-value.bold { font-weight: bold; }

            .continuation-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 10px;
                padding: 6px 12px;
                border-bottom: 1px solid #000;
            }

            .product-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
            }
            .product-table th {
                background: #e8e8e8;
                border: 1px solid #000;
                padding: 3px 4px;
                text-align: center;
                font-weight: bold;
                vertical-align: middle;
                line-height: 1.3;
            }
            .th-ar { font-size: 7.5px; direction: rtl; font-weight: 500; }
            .product-table td {
                border: 1px solid #aaa;
                padding: 2.5px 4px;
                vertical-align: middle;
                font-size: 8.5px;
                height: 22px;
            }

            ${(() => {
                const hasDiscount = saleSettings?.showLineDiscount;
                const hasTax = showTax;

                if (hasDiscount && hasTax) {
                    return `
                        .col-sl    { width: 3%; }
                        .col-code  { width: 6%; }
                        .col-prod  { width: 24%; }
                        .col-qty   { width: 4%; }
                        .col-unit  { width: 4%; }
                        .col-uprice{ width: 8%; }
                        .col-iprice{ width: 8%; }
                        .col-disc  { width: 6%; }
                        .col-discamt{ width: 8%; }
                        .col-taxpct{ width: 5%; }
                        .col-taxamt{ width: 7%; }
                        .col-total { width: 8%; }
                    `;
                } else if (hasDiscount && !hasTax) {
                    return `
                        .col-sl    { width: 4%; }
                        .col-code  { width: 7%; }
                        .col-prod  { width: 30%; }
                        .col-qty   { width: 5%; }
                        .col-unit  { width: 5%; }
                        .col-uprice{ width: 10%; }
                        .col-iprice{ width: 10%; }
                        .col-disc  { width: 7%; }
                        .col-discamt{ width: 10%; }
                        .col-total { width: 12%; }
                    `;
                } else if (!hasDiscount && hasTax) {
                    return `
                        .col-sl    { width: 4%; }
                        .col-code  { width: 7%; }
                        .col-prod  { width: 30%; }
                        .col-qty   { width: 5%; }
                        .col-unit  { width: 5%; }
                        .col-uprice{ width: 9%; }
                        .col-iprice{ width: 9%; }
                        .col-taxpct{ width: 5%; }
                        .col-taxamt{ width: 8%; }
                        .col-total { width: 8%; }
                    `;
                } else {
                    return `
                        .col-sl    { width: 5%; }
                        .col-code  { width: 8%; }
                        .col-prod  { width: 40%; }
                        .col-qty   { width: 6%; }
                        .col-unit  { width: 6%; }
                        .col-uprice{ width: 12%; }
                        .col-iprice{ width: 12%; }
                        .col-total { width: 11%; }
                    `;
                }
            })()}

            .td-center { text-align: center; }
            .td-right  { text-align: right; }
            .td-code   { font-size: 8px; }
            .td-product{ padding-left: 6px !important; }
            .item-name-en { font-size: 8.5px; font-weight: 600; }
            .item-name-ar { font-size: 8px; direction: rtl; color: #444; }
            .product-row { height: 22px; }
            .empty-row td { border-color: transparent; }

            .page-continued {
                text-align: center;
                font-weight: bold;
                padding: 8px;
                border-top: 1px solid #ccc;
                font-size: 9px;
            }

            .footer-totals-wrapper {
                display: flex;
                border: 1px solid #000;
                margin-top: 12px;
            }
            .footer-totals-col { flex: 1; }

            .totals-row-item {
                display: flex;
                align-items: stretch;
                border-bottom: 0.5px solid #aaa;
                min-height: 18px;
            }
            .totals-row-item.grand {
                border-bottom: none;
                color: #000;
                min-height: 22px;
            }
            .totals-row-item.customer-balance {
                background: #ffe6e6;
                border-bottom: none;
                min-height: 20px;
            }
            .totals-row-item.customer-balance .totals-en,
            .totals-row-item.customer-balance .totals-ar,
            .totals-row-item.customer-balance .totals-value {
                color: #d9534f;
                font-weight: bold;
            }
            .totals-en {
                flex: 1;
                font-size: 8px;
                font-weight: bold;
                padding: 3px 8px;
                display: flex;
                align-items: center;
                border-right: 0.5px solid #ccc;
            }
            .totals-row-item.grand .totals-en { font-size: 10px; font-weight: 900; border-right-color: #555; }
            .totals-ar {
                flex: 1;
                font-size: 8px;
                direction: rtl;
                padding: 3px 8px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                border-right: 0.5px solid #ccc;
                color: #333;
            }
            .totals-row-item.grand .totals-ar { color: #333; font-size: 9px; border-right-color: #555; }
            .totals-value {
                width: 90px;
                text-align: right;
                font-weight: bold;
                font-size: 9px;
                padding: 3px 8px;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-shrink: 0;
            }
            .totals-row-item.grand .totals-value { font-size: 12px; font-weight: 900; }

            .bottom-section {
                padding: 6px 12px;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 5px;
                border-top: 1px solid #ccc;
            }
            .amount-words-box {
                font-size: 9px;
                border-bottom: 0.5px solid #ccc;
                padding-bottom: 5px;
            }
            .amount-words-label { font-weight: bold; }

            .bank-details-box { font-size: 9px; }
            .bank-title { font-weight: bold; margin-bottom: 3px; }
            .bank-line { margin-bottom: 2px; }
            .bank-sep { display: inline-block; margin: 0 8px; color: #aaa; }

            .prepared-receiver-row {
                display: flex;
                justify-content: space-between;
                padding-top: 4px;
                margin-top: auto;
            }
            .sig-block {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 160px;
            }
            .sig-label { font-weight: bold; font-size: 9px; }
            .sig-name {
                font-size: 16px;
                font-weight: 900;
                font-style: italic;
                font-family: Georgia, serif;
                margin-top: 2px;
            }
            .sig-line {
                width: 100%;
                border-bottom: 1px solid #000;
                margin-top: 20px;
            }

            .page-footer { width: 100%; margin-top: auto; }
            .footer-img { width: 100%; display: block; }

            @media print {
                body { background: white; padding: 0; }
                .page { box-shadow: none; width: 210mm; min-height: 297mm; margin: 0; }
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
 * Main print function - InvoicePrintEleven (No QR)
 */
export const InvoicePrintEleven = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceElevenHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            getPrinterPreference('a4').then(savedPrinter => {
                printSilent(invoiceHTML, savedPrinter, 'a4').then(result => {
                    if (!result.success) {
                        console.error('❌ [INVOICE ELEVEN] Print failed:', result.error);
                    }
                });
            });
            return { success: true };
        } catch (error) {
            console.error('❌ [INVOICE ELEVEN] Error:', error);
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
 * Save as PDF - InvoicePrintEleven (No QR)
 */
export const saveInvoiceElevenAsPDF = (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = generateInvoiceElevenHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}_eleven.pdf`;

    if (isElectron()) {
        try {
            return window.electronAPI.savePDF(invoiceHTML, filename).then(result => {
                if (!result.success) {
                    console.error('❌ [INVOICE ELEVEN] PDF save failed:', result.error);
                }
                return result;
            });
        } catch (error) {
            console.error('❌ [INVOICE ELEVEN] Error saving PDF:', error);
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

export default InvoicePrintEleven;