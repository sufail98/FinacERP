// E:\Users\Roshan\Finac\Web-FinacERP\src\utils\prints\salesOrderPints\salesOrderInvoicePrintTwo.js

import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

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
 * Generate Sales Order HTML for A5 Landscape - Type 2
 * NO VERTICAL BORDERS - Only horizontal lines
 */
const generateSalesOrderHTML = (orderData, currentCurrency) => {
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;

    const {
        invoiceNo,
        date,
        partyName,
        partyMobile,
        partyAddress,
        dueDate,
        partyRefNo,
        salesDetails = [],
    } = orderData;

    // Split products into pages (12 rows per page for A5 landscape)
    const ROWS_PER_PAGE = 12;
    const productPages = chunkArray(salesDetails.filter(item => item.productCode), ROWS_PER_PAGE);
    const totalPages = productPages.length || 1;

    // If no products, create one page with empty table
    if (productPages.length === 0) {
        productPages.push([]);
    }

    // Generate pages HTML
    const pagesHTML = productPages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        // Calculate empty rows to fill the table
        const emptyRowsCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
            <div class="page">
                <!-- Header Image -->
                ${headerImage ? `
                <div class="header-image">
                    <img src="${headerImage}" alt="header" onload="this.parentElement.style.height = this.offsetHeight + 'px'">
                </div>
                ` : ''}

                <!-- Content Area -->
                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}">
                    
                    <!-- Heading Section - Both on same line with borders above and below -->
                   <div class="hr-line" style="height:0.5px;"></div>
<div class="heading-section">
    <span class="heading">Sales Order</span>
    <span class="heading-ar">طلب المبيعات</span>
</div>
<div class="hr-line" style="height:0.5px;"></div>


                    ${isFirstPage ? `
                    <!-- Details Section - Split in 2 -->
                    <div class="details-section">
                        <div class="details-left">
                            <div class="detail-row">
                                <span class="detail-label">Job No</span>
                                <span class="detail-value">${invoiceNo || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Customer Name</span>
                                <span class="detail-value">${partyName || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Contact No</span>
                                <span class="detail-value">${partyMobile || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Address</span>
                                <span class="detail-value">${partyAddress || ''}</span>
                            </div>
                        </div>
                        <div class="details-right">
                            <div class="detail-row">
                                <span class="detail-label">Order Date</span>
                                <span class="detail-value">${formatDate(date)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Delivery Date</span>
                                <span class="detail-value">${formatDate(dueDate || date)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Delivery Time</span>
                                <span class="detail-value">${orderData.deliveryTime || ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Ref No</span>
                                <span class="detail-value">${partyRefNo || ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="hr-line"></div>
                    ` : `
                    <!-- Continuation Header -->
                    <div class="page-info">
                        Job No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    <div class="hr-line"></div>
                    `}

                    <!-- Product Table Header -->
                    <div class="table-header-row">
                        <span class="col-slno">Sl No</span>
                        <span class="col-product">Product</span>
                        <span class="col-qty">Qty</span>
                        <span class="col-remark">Remark</span>
                    </div>
                    <div class="hr-line"></div>

                    <!-- Product Rows -->
                    <div class="table-body">
                        ${pageProducts.map((item, index) => {
                            const globalIndex = pageIndex * ROWS_PER_PAGE + index;
                            return `
                                <div class="table-row">
                                    <span class="col-slno">${globalIndex + 1}</span>
                                    <span class="col-product">${item.productName || ''}</span>
                                    <span class="col-qty">${item.qty || 0} ${item.unitName || ''}</span>
                                    <span class="col-remark">${item.productDescription || ''}</span>
                                </div>
                            `;
                        }).join('')}

                        ${emptyRows.map(() => `
                            <div class="table-row empty-row">
                                <span class="col-slno">&nbsp;</span>
                                <span class="col-product">&nbsp;</span>
                                <span class="col-qty">&nbsp;</span>
                                <span class="col-remark">&nbsp;</span>
                            </div>
                        `).join('')}

                        ${!isLastPage ? `
                            <div class="table-row continuation-row">
                                <span class="col-full">Continued on next page...</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="hr-line"></div>

                    ${isLastPage ? `
                    <!-- Signature Section - Right below the horizontal line -->
                    <div class="signature-section">
                        <div class="signature-row">
                            <div class="signature-box">
                                <span class="sig-label">Designed by</span>
                            </div>
                            <div class="signature-box">
                                <span class="sig-label">Prepared by</span>
                            </div>
                        </div>
                        <div class="signature-row-bottom">
                            <div class="signature-box">
                                <span class="sig-label">Delivered by</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Footer Image -->
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
            <title>Sales Order - ${invoiceNo}</title>
            <style>
                @page { 
                    size: A5 landscape; 
                    margin: 0; 
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
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                }
                .page {
                    width: 210mm;
                    height: 148mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    overflow: hidden;
                }
                .page:last-child { 
                    margin-bottom: 0; 
                }

                /* Header Image - Part of flow, not absolute */
                .header-image { 
                    width: 100%;
                    flex-shrink: 0;
                }
                .header-image img { 
                    width: 100%; 
                    height: auto;
                    display: block; 
                }

                /* Footer Image - Part of flow, pushed to bottom */
                .footer-image { 
                    width: 100%;
                    flex-shrink: 0;
                    margin-top: auto;
                }
                .footer-image img { 
                    width: 100%; 
                    height: auto;
                    display: block; 
                }

                /* Content Wrapper - Flexible, takes remaining space */
                .content-wrapper {
                    flex: 1;
                    padding: 5px 20px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .content-wrapper.last-page {
                    padding-bottom: 5px;
                }

                /* Horizontal Line - NO VERTICAL BORDERS */
                .hr-line {
                    width: 100%;
                    height: 1px;
                    background-color: #000;
                    flex-shrink: 0;
                }

                /* Heading Section - SAME LINE */
                .heading-section {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                    padding: 6px 0;
                    flex-shrink: 0;
                }
                .heading {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 0;
                }
                .heading-ar {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 0;
                    direction: rtl;
                }

                /* Page Info for continuation */
                .page-info {
                    text-align: center;
                    font-weight: bold;
                    font-size: 10px;
                    padding: 5px 0;
                    flex-shrink: 0;
                }

                /* Details Section - Split in 2 */
                .details-section {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    flex-shrink: 0;
                }
                .details-left,
                .details-right {
                    width: 48%;
                }
                .detail-row {
                    display: flex;
                    margin-bottom: 4px;
                    font-size: 10px;
                }
                .detail-label {
                    font-weight: bold;
                    min-width: 100px;
                }
                .detail-value {
                    flex: 1;
                }

                /* Table Header Row - Tight spacing */
                .table-header-row {
                    display: flex;
                    font-weight: bold;
                    padding: 3px 0;
                    font-size: 10px;
                    flex-shrink: 0;
                }

                /* Table Body - Clean, no dotted lines */
                .table-body {
                    flex: 1;
                    overflow: hidden;
                }
                .table-row {
                    display: flex;
                    padding: 2px 0;
                    font-size: 9px;
                }
                .empty-row {
                    height: 16px;
                }
                .continuation-row {
                    justify-content: center;
                    font-weight: bold;
                    background: #fff5f5;
                    padding: 5px 0;
                }

                /* Column Widths */
                .col-slno {
                    width: 8%;
                    text-align: center;
                }
                .col-product {
                    width: 50%;
                    text-align: left;
                    padding-left: 5px;
                }
                .col-qty {
                    width: 15%;
                    text-align: center;
                }
                .col-remark {
                    width: 27%;
                    text-align: left;
                    padding-left: 5px;
                }
                .col-full {
                    width: 100%;
                    text-align: center;
                }

                /* Signature Section - Right below the hr-line, NO extra spacing */
                .signature-section {
                    margin-top: 5px;
                    flex-shrink: 0;
                }
                .signature-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                }
                .signature-row-bottom {
                    display: flex;
                    justify-content: flex-start;
                }
                .signature-box {
                    width: 45%;
                }
                .sig-label {
                    font-weight: bold;
                    font-size: 10px;
                }

                @media print {
                    body { 
                        background: white; 
                        padding: 0; 
                    }
                    .page { 
                        box-shadow: none; 
                        width: 100%; 
                        height: 148mm; 
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
 * Main print sales order function - SILENT PRINT
 */
export const salesOrderInvoicePrintTwo = async (orderData, branchData, time, invoiceQr, currentCurrency) => {
    const invoiceHTML = generateSalesOrderHTML(orderData, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a5');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a5');

            if (result.success) {
                console.log('✅ [SALES ORDER TYPE 2] Printed successfully!');
            } else {
                console.error('❌ [SALES ORDER TYPE 2] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [SALES ORDER TYPE 2] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        console.log('📄 [SALES ORDER TYPE 2] Browser mode - opening new window');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            console.error('❌ [SALES ORDER TYPE 2] Popup blocked');
            return { success: false, error: 'Popup blocked' };
        }
        return { success: true };
    }
};

export default salesOrderInvoicePrintTwo;