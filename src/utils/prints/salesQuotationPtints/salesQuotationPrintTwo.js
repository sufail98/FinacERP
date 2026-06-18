// salesQuotationPrintTwo.js - TYPE 2 PRINT FORMAT (OPTIMIZED MULTI-PAGE SUPPORT)

import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

/**
 * Formats date using settings format
 */
const formatDate = (date) => {
    if (!date) return '';
    const state = store.getState().settings;
    const dateFormat = state.generalSettings?.dateformat || 'dd-MM-yyyy';
    return formatDateUtil(date, dateFormat);
};

/**
 * Split array into pages with different row counts
 * First page: fewer rows (has customer info, greeting)
 * Middle pages: maximum rows (no header info, no totals)
 * Last page: fewer rows (needs space for totals, terms, signatures)
 */
const splitIntoPages = (array, firstPageRows, middlePageRows, lastPageRows) => {
    const totalItems = array.length;
    
    if (totalItems === 0) {
        return [{ items: [], isFirst: true, isLast: true, maxRows: lastPageRows }];
    }
    
    // Single page case - if all items fit in lastPageRows (which is smallest)
    if (totalItems <= lastPageRows) {
        return [{ items: array, isFirst: true, isLast: true, maxRows: lastPageRows }];
    }
    
    // If fits in first page only (when first page is also last page)
    if (totalItems <= Math.min(firstPageRows, lastPageRows)) {
        return [{ items: array, isFirst: true, isLast: true, maxRows: Math.min(firstPageRows, lastPageRows) }];
    }
    
    const pages = [];
    let currentIndex = 0;
    
    // First page
    const firstPageItems = Math.min(firstPageRows, totalItems);
    pages.push({ 
        items: array.slice(0, firstPageItems), 
        isFirst: true, 
        isLast: false, 
        maxRows: firstPageRows 
    });
    currentIndex = firstPageItems;
    
    // Process remaining items
    while (currentIndex < totalItems) {
        const remainingItems = totalItems - currentIndex;
        
        // Check if remaining items fit in last page
        if (remainingItems <= lastPageRows) {
            pages.push({ 
                items: array.slice(currentIndex), 
                isFirst: false, 
                isLast: true, 
                maxRows: lastPageRows 
            });
            break;
        }
        
        // Add a middle page
        const itemsForThisPage = Math.min(middlePageRows, remainingItems);
        const itemsAfterThisPage = remainingItems - itemsForThisPage;
        
        // Check if after this page, remaining items fit in last page
        if (itemsAfterThisPage <= lastPageRows) {
            // This is a middle page
            pages.push({ 
                items: array.slice(currentIndex, currentIndex + itemsForThisPage), 
                isFirst: false, 
                isLast: false, 
                maxRows: middlePageRows 
            });
            currentIndex += itemsForThisPage;
        } else {
            // Regular middle page
            pages.push({ 
                items: array.slice(currentIndex, currentIndex + middlePageRows), 
                isFirst: false, 
                isLast: false, 
                maxRows: middlePageRows 
            });
            currentIndex += middlePageRows;
        }
    }
    
    // Ensure the last page is marked correctly
    if (pages.length > 0) {
        pages[pages.length - 1].isLast = true;
        pages[pages.length - 1].maxRows = lastPageRows;
    }
    
    return pages;
};

/**
 * Generate the quotation HTML - Type 2 (OPTIMIZED MULTI-PAGE SUPPORT)
 */
const generateQuotationHTML = (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);
    
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    
    // ========== Get header and footer images ==========
    const headerImage = companyData?.branchHeader;
    const footerImage = companyData?.branchFooter;
    
    
    
    // Define heights
    const HEADER_HEIGHT = headerImage ? '177px' : '80px';
    const FOOTER_HEIGHT = footerImage ? '70px' : '0px';
    
    const companyName = branchData?.branchName || '';
    const companyVatNo = branchData?.taxNo || '';
    const companyCR = branchData?.crNo || '';
    const companyPhone = branchData?.phone || '';
    const companyAddress = branchData?.address || '';

    const decimalPart = companyData?.decimalPart || 2;

    const showCurrencyPrefix = state.generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';
    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num).toFixed(decimalPart)}`
            : Number(num).toFixed(decimalPart);

    const {
        invoiceNo,
        date,
        customerName,
        customerVATNo,
        paymentterms = '',
        deliveredwithin = '',
        quatationvalidity = '',
        DeliveryTerms = '',
        narration = '',
        deliverysite = '',
        salesDetails = [],
        billDiscount = 0,
        totalTax = 0,
        totalAmount = 0,
        roundOff = 0,
    } = invoiceData;

    // Calculate totals
    const totalGrossValue = salesDetails.reduce((sum, item) => sum + (parseFloat(item.grossAmount) || 0), 0);

    const vatRate = salesDetails.length > 0 && salesDetails[0].taxRate ? salesDetails[0].taxRate : 15;
    const formattedDate = formatDate(date);

    // ========== OPTIMIZED MULTI-PAGE CONFIGURATION ==========
    // Row configurations based on footer availability
    const FIRST_PAGE_ROWS = 20;   // First page has customer info, greeting
    const MIDDLE_PAGE_ROWS = 27;  // Middle pages - maximum rows
    const LAST_PAGE_ROWS = 17;    // Last page needs space for totals, terms, signature

    const filteredProducts = salesDetails.filter(item => item.productCode);
    
    // Split products into pages with different row counts
    const productPages = splitIntoPages(filteredProducts, FIRST_PAGE_ROWS, MIDDLE_PAGE_ROWS, LAST_PAGE_ROWS);
    const totalPages = productPages.length || 1;


    // Track cumulative index for row numbering
    let cumulativeIndex = 0;

    // ========== GENERATE PAGES HTML ==========
    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage, maxRows } = pageData;
        
        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        // Calculate empty rows for this page
        const emptyRowsCount = Math.max(0, maxRows - pageProducts.length);

        return `
            <div class="page">
                <!-- ========== HEADER SECTION ========== -->
                ${headerImage ? `
                    <div class="header-image">
                        <img src="${headerImage}" alt="header">
                    </div>
                ` : `
                    <div class="header-text">
                        <div class="company-name-ar">مؤسسة  سهم المسار التجارية</div>
                        <div class="company-name-en">${companyName}</div>
                        <div class="company-details">VAT REG ${companyVatNo}  CR: ${companyCR}  Sales : ${companyPhone}</div>
                        <div class="company-details">${companyAddress}</div>
                    </div>
                `}

                <!-- ========== MAIN CONTENT ========== -->
                <div class="content-wrapper ${isFirstPage ? 'first-page' : ''} ${isLastPage ? 'last-page' : ''} ${!isFirstPage && !isLastPage ? 'middle-page' : ''}">
                    <div class="main-content">
                        <!-- Title with Blue Line -->
                        <div class="title-wrapper">
                            <div class="title-text">
                                Sales Quotation / تسعير المبيعات
                                ${!isFirstPage ? `<span class="page-indicator">(Page ${pageIndex + 1} of ${totalPages})</span>` : ''}
                            </div>
                            <div class="blue-line"></div>
                        </div>

                        ${isFirstPage ? `
                        <!-- Info Box - Only on first page -->
                        <div class="info-container">
                            <div class="left-section">
                                <div class="left-section-row">
                                    <div class="label-bold">CUSTOMER NAME & ADDRESS / <span class="label-ar">اسم العميل والعنوان</span></div>
                                </div>
                             <div class="left-section-row">
    <div style="font-weight: bold; font-size: 11px;">${customerName || ''}</div>
    <div style="font-weight: bold; font-size: 11px;">
        ${invoiceData?.customerAddress || 
            [
                invoiceData?.customerData?.StreetName,
                invoiceData?.customerData?.BuildingNo,
                invoiceData?.customerData?.District,
                invoiceData?.customerData?.CityName,
                invoiceData?.customerData?.Country
            ].filter(Boolean).join(', ')
        }
    </div>
    <div style="font-weight: bold; font-size: 11px;">${invoiceData?.customerPhone || ''}</div>
</div>
                                <div class="left-section-row">
                                    <div><span class="label-bold">TAX ID Number / </span><span class="label-ar">رقم التعريف الضريبي</span> ${customerVATNo || ''}</div>
                                </div>
                            </div>

                            <div class="right-section">
                                <div class="right-row">
                                    <div class="right-cell right-cell-left"><span class="label-ar">رقم الإقتباس</span><br>QUOTATION NO #</div>
                                    <div class="right-cell value-highlight">${invoiceNo || ''}</div>
                                </div>
                                <div class="right-row">
                                    <div class="right-cell right-cell-left"><span class="label-ar">تاريخ الإقتباس</span><br>QUOTATION DATE</div>
                                    <div class="right-cell">${formattedDate}</div>
                                </div>
                                <div class="right-row">
                                    <div class="right-cell right-cell-left"><span class="label-ar">رقم الطلب</span><br>REQUEST REF NO</div>
                                    <div class="right-cell">.</div>
                                </div>
                                <div class="right-row">
                                    <div class="right-cell right-cell-left"><span class="label-ar">تعليق</span><br>REMARK</div>
                                    <div class="right-cell">${narration || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Greeting -->
                        <div class="greeting">
                            <p>Dear Sir,</p>
                            <p>Thank you very much for inviting us to provide this quotation for the following items. Pls find our offer as follows:</p>
                        </div>
                        ` : `
                        <!-- Page Info - On continuation pages -->
                        <div class="page-info">
                            <span>Quotation No: <strong>${invoiceNo}</strong></span>
                            <span>Date: <strong>${formattedDate}</strong></span>
                            <span class="page-number">Page ${pageIndex + 1} of ${totalPages}</span>
                        </div>
                        `}

                        <!-- Product Table -->
                        <table class="product-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%;">رقم<br>SI.No</th>
                                    <th style="width: 12%;">الباركود<br>BARCODE</th>
                                    <th style="width: 33%;">وصف<br>DESCRIPTION</th>
                                    <th style="width: 8%;">وحدة<br>UNIT</th>
                                    <th style="width: 8%;">كمية<br>QTY</th>
                                    <th style="width: 12%;">سعر الوحدة<br>U/PRICE</th>
                                    <th style="width: 12%;">مجموع<br>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageProducts.map((item, index) => {
                                    const globalIndex = pageStartIndex + index;
                                    return `
                                        <tr class="product-row">
                                            <td class="text-center">${globalIndex + 1}</td>
                                            <td class="text-center">${item.barcode || ''}</td>
                                            <td class="text-left">${item.productName || ''}</td>
                                            <td class="text-center">${item.unitName || 'NA'}</td>
                                            <td class="text-center">${parseFloat(item.qty || 0).toFixed(0)}</td>
                                            <td class="text-right">${parseFloat(item.rate || 0).toFixed(decimalPart)}</td>
                                            <td class="text-right">${parseFloat(item.netAmount || 0).toFixed(decimalPart)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                
                                ${Array(emptyRowsCount).fill().map(() => `
                                    <tr class="empty-row">
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                `).join('')}

                                ${!isLastPage ? `
                                <tr class="continuation-row">
                                    <td colspan="7" class="text-center">
                                        <strong>Continued on next page... / يتبع في الصفحة التالية (Page ${pageIndex + 1} of ${totalPages})</strong>
                                    </td>
                                </tr>
                                ` : ''}
                            </tbody>
                        </table>

                        ${isLastPage ? `
                        <!-- Totals Section - Only on last page -->
                        <table class="totals-table">
                            <tr>
                                <td colspan="6" class="totals-label">Total / مجموع</td>
                                <td class="totals-value">${fmt(totalGrossValue)}</td>
                            </tr>
                            <tr>
                                <td colspan="6" class="totals-label">Discount / خصم</td>
                                <td class="totals-value">${fmt(billDiscount || 0)}</td>
                            </tr>
                            <tr>
                                <td colspan="6" class="totals-label">VAT @ ${vatRate}% / الضريبة</td>
                                <td class="totals-value">${fmt(totalTax || 0)}</td>
                            </tr>
                            <tr>
                                <td colspan="6" class="totals-label">Other Charge / رسوم أخرى ${invoiceData?.otherChargeLedgerName || ''}</td>
                                <td class="totals-value">${fmt(invoiceData?.othercharge || 0)}</td>
                            </tr>
                            <tr>
                                <td colspan="6" class="net-amount-label">Net Amount / المبلغ الإجمالي</td>
                                <td class="net-amount-value">${fmt(totalAmount || 0)}</td>
                            </tr>
                        </table>

                        <!-- Terms & Conditions - Only on last page -->
                        <div class="terms-section">
                            <div class="terms-title">TERMS & CONDITIONS:</div>
                            <div class="term-item">
                                <span class="term-label">Payment Terms:</span>
                                <span class="term-value">${paymentterms || '-'}</span>
                            </div>
                            <div class="term-item">
                                <span class="term-label">Delivery Terms:</span>
                                <span class="term-value">${DeliveryTerms || '-'}</span>
                            </div>
                            <div class="term-item">
                                <span class="term-label">Validity:</span>
                                <span class="term-value">${quatationvalidity || '-'}</span>
                            </div>
                          
                            <div class="term-item">
                                <span class="term-label">Delivery Within:</span>
                                <span class="term-value">${deliveredwithin || '-'}</span>
                            </div>
                            <div class="term-item">
                                <span class="term-label">Delivery Site:</span>
                                <span class="term-value">${deliverysite || '-'}</span>
                            </div>
                        </div>

                        <!-- Footer Content Section - Only on last page -->
                        <div class="footer-section">
                            <div class="footer-text">
                                We will be happy to supply any further information you may need and trust that you call on us to fill your order, which will receive our prompt and careful attention.<br>
                                Best regards,
                            </div>

                            <div class="signature">
                                Sales Manager
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- ========== FOOTER IMAGE SECTION ========== -->
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
            <title>Sales Quotation - ${invoiceNo}</title>
            <style>
                :root {
                    --header-height: ${HEADER_HEIGHT};
                    --footer-height: ${FOOTER_HEIGHT};
                    --row-height: 22px;
                }

                @page { 
                    size: A4; 
                    margin: 0; 
                }
                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box; 
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    line-height: 1.3;
                    color: #000;
                    background: white;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .page {
                    width: 210mm;
                    height: 297mm;
                    position: relative;
                    background: white;
                    overflow: hidden;
                    page-break-after: always;
                }
                .page:last-child {
                    page-break-after: avoid;
                }

                /* ========== HEADER IMAGE SECTION ========== */
                .header-image {
                    width: 100%;
                    height: var(--header-height);
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                }
                .header-image img {
                    width: 100%;
                    height: var(--header-height);
                    
                    object-position: top;
                }

                /* Text header fallback when no image */
                .header-text {
                    width: 100%;
                    height: var(--header-height);
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    padding: 12px 18px;
                    border-bottom: 2px solid #4472A8;
                }
                .company-name-ar {
                    font-size: 15px;
                    font-weight: bold;
                    direction: rtl;
                    text-align: left;
                }
                .company-name-en {
                    font-size: 13px;
                    font-weight: bold;
                }
                .company-details {
                    font-size: 9px;
                    font-weight: bold;
                    margin-top: 2px;
                }

                /* ========== FOOTER IMAGE SECTION ========== */
                .footer-image {
                    width: 100%;
                    height: var(--footer-height);
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    z-index: 1;
                }
                .footer-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: bottom;
                }

                /* ========== MAIN CONTENT WRAPPER ========== */
                .content-wrapper {
                    position: absolute;
                    top: var(--header-height);
                    left: 0;
                    right: 0;
                    bottom: var(--footer-height);
                    padding: 8px 15px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                /* Title Section with Blue Line */
                .title-wrapper {
                    margin-bottom: 8px;
                    flex-shrink: 0;
                }
                .title-text {
                    text-align: right;
                    color: #2E5C8A;
                    font-size: 16px;
                    font-weight: bold;
                    font-style: italic;
                    margin-bottom: 4px;
                    padding-right: 5px;
                }
                .page-indicator {
                    font-size: 10px;
                    color: #666;
                    font-style: normal;
                    margin-left: 10px;
                }
                .blue-line {
                    height: 3px;
                    background: #4472A8;
                }

                /* Page Info - For continuation pages */
                .page-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 10px;
                    background: #f0f0f0;
                    border: 1px solid #ccc;
                    margin-bottom: 8px;
                    font-size: 10px;
                    flex-shrink: 0;
                }
                .page-number {
                    color: #666;
                    font-style: italic;
                }

                /* Info Box */
                .info-container {
                    border: 2px solid #000;
                    margin-bottom: 6px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    flex-shrink: 0;
                }
                
                .left-section {
                    padding: 5px 8px;
                    border-right: 2px solid #000;
                }
                .left-section-row {
                    margin-bottom: 4px;
                    font-size: 13px;
                }
                .left-section-row:last-child {
                    margin-bottom: 0;
                }
                
                .right-section {
                    display: flex;
                    flex-direction: column;
                }
                .right-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    border-bottom: 1px solid #000;
                    flex: 1;
                }
                .right-row:last-child {
                    border-bottom: none;
                }
                .right-cell {
                    padding: 2px 5px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                }
                .right-cell-left {
                    border-right: 1px solid #000;
                }
                
                .label-bold {
                    font-weight: bold;
                }
                .label-ar {
                    direction: rtl;
                    text-align: right;
                    font-size: 13px;
                }
                .value-highlight {
                    color: #C00000;
                    font-weight: bold;
                    font-size: 15px;
                }

                /* Greeting */
                .greeting {
                    margin: 5px 0 6px 0;
                    font-size: 12px;
                    line-height: 1.3;
                    flex-shrink: 0;
                }

                /* Product Table */
                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 0;
                    flex-shrink: 0;
                }
                
                .product-table th {
                    border: 1px solid #000;
                    padding: 3px 2px;
                    font-size: 12px;
                    background: white;
                    font-weight: bold;
                    text-align: center;
                    line-height: 1.2;
                }
                
                .product-table td {
                    border-left: 1px solid #000;
                    border-right: 1px solid #000;
                    border-top: none;
                    border-bottom: none;
                    padding: 2px 3px;
                    font-size: 11px;
                }

                .product-row td {
                    height: var(--row-height);
                    vertical-align: middle;
                    border-bottom: 1px solid #000;  /* ← ADD THIS LINE */
                }

                .empty-row td {
                    height: var(--row-height);
                    border-bottom: none;
                }

                .continuation-row td {
                    border: 1px solid #000;
                    background: #fff8e6;
                    padding: 6px;
                    font-size: 10px;
                }
                
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }

                /* Totals Table */
                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                    flex-shrink: 0;
                }
                .totals-table td {
                    border: 1px solid #000;
                    padding: 3px 5px;
                    font-size: 12px;
                    font-weight: bold;
                }
                .totals-label {
                    text-align: right;
                }
                .totals-value {
                    text-align: right;
                    width: 12%;
                }
                .round-off-cell {
                    text-align: left;
                    width: 15%;
                    font-size: 12px;
                }
                .net-amount-label {
                    text-align: right;
                }
                .net-amount-value {
                    text-align: right;
                    font-size: 12px;
                }

                /* Terms Section */
                .terms-section {
                    margin-top: 8px;
                    flex-shrink: 0;
                }
                .terms-title {
                    font-weight: bold;
                    font-size: 11px;
                    margin-bottom: 3px;
                    text-decoration: underline;
                }
                .term-item {
                    margin-bottom: 2px;
                    font-size: 9px;
                    display: flex;
                }
                .term-label {
                    min-width: 100px;
                    font-weight: bold;
                }
                .term-value {
                    flex: 1;
                }

                /* Footer Section */
                .footer-section {
                    margin-top: auto;
                    padding-top: 8px;
                    flex-shrink: 0;
                }
                .footer-text {
                    font-size: 9px;
                    line-height: 1.4;
                }
                .signature {
                    margin-top: 20px;
                    font-size: 9px;
                }

                @media print {
                    body { 
                        margin: 0;
                        padding: 0;
                    }
                    .page {
                        width: 100%;
                        height: 100vh;
                    }
                }

                @media screen {
                    body {
                        background: #e0e0e0;
                        padding: 20px;
                    }
                    .page {
                        margin: 0 auto 20px auto;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
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
 * Main print quotation function - Type 2
 */
export const salesQuotationPrintTwo = async (invoiceData, branchData, time, currentCurrency) => {
    // Generate HTML
    const invoiceHTML = generateQuotationHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                console.log('✅ [QUOTATION TYPE 2] Printed successfully!');
            } else {
                console.error('❌ [QUOTATION TYPE 2] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [QUOTATION TYPE 2] Error:', error);
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
            console.error('❌ [QUOTATION TYPE 2] Popup blocked');
            return { success: false, error: 'Popup blocked' };
        }
        return { success: true };
    }
};

export const salesQuotationPrintTwoAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateQuotationHTML(invoiceData, branchData, time, currentCurrency);
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

export default salesQuotationPrintTwo;