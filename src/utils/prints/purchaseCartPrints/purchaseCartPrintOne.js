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
 * Generate the purchase cart HTML
 */
const generateCartHTML = (cartData, branchData) => {
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';

    const {
        voucherNo = '',
        PurchaseCartNo = '',
        date = new Date(),
        CustomerName = '',
        CustomerPhone = '',
        Narration = '',
        Status = 'Pending',
        details = [],
    } = cartData;

    // Calculate totals
    const totalQty = details.reduce((sum, item) => sum + (parseFloat(item.Qty) || 0), 0);
    const totalExpectedPrice = details.reduce((sum, item) => sum + ((parseFloat(item.Qty) || 0) * (parseFloat(item.expectedPrice) || 0)), 0);

    // Split products into pages (16 rows per page)
    const ROWS_PER_PAGE = 18;
    const productPages = chunkArray(details, ROWS_PER_PAGE);
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
                        <span>PURCHASE CART</span>
                        <span>سلة الشراء</span>
                    </h2>

                    <table class="invoice-details-table">
                        <tr>
                            <td class="label">Customer Name <br><span class="rtl">اسم العميل</span></td>
                            <td><span class="bold">${CustomerName || ''}</span></td>
                            <td class="label rtl">رقم السلة<br>CART NO</td>
                            <td class="bold">${PurchaseCartNo || ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Customer Phone <br><span class="rtl">هاتف العميل</span></td>
                            <td>${CustomerPhone || ''}</td>
                            <td class="label rtl">التاريخ<br>DATE</td>
                            <td class="bold">${formatDate(date)}</td>
                        </tr>
                        <tr>
                            <td class="label">Status <br><span class="rtl">الحالة</span></td>
                            <td colspan="3"><span class="bold">${Status || 'Pending'}</span></td>
                        </tr>
                        ${Narration ? `
                        <tr>
                            <td class="label">Narration <br><span class="rtl">ملاحظات</span></td>
                            <td colspan="3">${Narration || ''}</td>
                        </tr>
                        ` : ''}
                    </table>
                    ` : `
                    <h2 class="heading">
                        <span>Purchase Cart (Continued)</span>
                        <span>سلة الشراء (تابع)</span>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Cart No: ${PurchaseCartNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                            <div class="col-sl"><div>رقم سي</div><div>SL No</div></div>
                            <div class="col-code"><div>رمز العنصر</div><div>ITEM CODE</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
                            <div class="col-price"><div>السعر المتوقع</div><div>EXPECTED PRICE</div></div>
                            <div class="col-priority"><div>الأولوية</div><div>PRIORITY</div></div>
                            <div class="col-status"><div>الحالة</div><div>STATUS</div></div>
                            <div class="col-total"><div>المجموع</div><div>TOTAL</div></div>
                        </div>

                        <div class="product-body">
                            ${pageProducts.map((item, index) => {
                                const globalIndex = pageIndex * ROWS_PER_PAGE + index;
                                const itemTotal = (parseFloat(item.Qty) || 0) * (parseFloat(item.expectedPrice) || 0);
                                const itemName = item.productName || item.manualItemName || '';
                                const itemCode = item.productCode || 'MANUAL';
                                return `
                                    <div class="product-row">
                                        <div class="col-sl">${globalIndex + 1}</div>
                                        <div class="col-code">${itemCode}</div>
                                        <div class="col-product">
                                            <div style="font-weight: 600;">${itemName}</div>
                                            ${item.manualItemDescription ? `<div><small>${item.manualItemDescription}</small></div>` : ''}
                                        </div>
                                        <div class="col-qty">${item.Qty || 0}</div>
                                        <div class="col-price">${item.expectedPrice || 0}</div>
                                        <div class="col-priority">${item.Priority || '-'}</div>
                                        <div class="col-status">${item.status || 'Pending'}</div>
                                        <div class="col-total">${itemTotal.toFixed(2)}</div>
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
                                    <div class="col-priority"></div>
                                    <div class="col-status"></div>
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
                            <div class="col-priority"></div>
                            <div class="col-status"></div>
                            <div class="col-total">${Number(totalExpectedPrice).toFixed(2)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${isLastPage ? `
                <div class="total-section-fixed">
                    <div class="total-section">
                        <div class="total-left-side">
                            <div style="font-weight: 900;">Additional Information:</div>
                            <div style="margin-top: 10px;">
                                <p><strong>Total Items:</strong> ${details.length}</p>
                                <p><strong>Total Quantity:</strong> ${totalQty.toFixed(2)}</p>
                                <p><strong>Estimated Total Cost:</strong> ${Number(totalExpectedPrice).toFixed(2)}</p>
                            </div>
                        </div>
                        <div class="total-right-side">
                            <table>
                                <tr>
                                    <th style="text-align: left;">Total Items</th>
                                    <th style="text-align: right;"><span>إجمالي العناصر</span> <span>:</span></th>
                                    <th style="text-align: right;">${details.length}</th>
                                </tr>
                                <tr>
                                    <th style="text-align: left;">Total Quantity</th>
                                    <th style="text-align: right;"><span>الكمية الإجمالية</span> <span>:</span></th>
                                    <th style="text-align: right;">${totalQty.toFixed(2)}</th>
                                </tr>
                                <tr>
                                    <th style="text-align: left; font-size: 20px; font-weight: 900;">Estimated Total</th>
                                    <th style="text-align: right;"><span>الإجمالي المقدر</span> <span>:</span></th>
                                    <th style="text-align: right; font-size: 20px; font-weight: 900;">${Number(totalExpectedPrice).toFixed(2)}</th>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div class="signature-section">
                        <div style="font-weight: 900;">AUTHORIZED SIGNATURE</div>
                        <div style="font-weight: 900;">PREPARED BY</div>
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
            <title>PURCHASE CART - ${PurchaseCartNo}</title>
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
                .col-product { width: 35%; }
                .col-qty { width: 8%; text-align: center; justify-content: center; }
                .col-price { width: 10%; text-align: right; justify-content: flex-end; }
                .col-priority { width: 8%; text-align: center; justify-content: center; }
                .col-status { width: 8%; text-align: center; justify-content: center; }
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
 * Main print cart function - SILENT PRINT (No dialog, no preview)
 */
export const purchaseCartPrintOne = async (cartData, branchData) => {
    
    // Generate HTML
    const cartHTML = generateCartHTML(cartData, branchData);

    // ✅ SILENT PRINT - No dialog, no preview
    if (isElectron()) {
        try {
            
            // Get saved printer preference for A4
            const savedPrinter = await getPrinterPreference('a4');
            
            const result = await printSilent(cartHTML, savedPrinter, 'a4');
            
            if (result.success) {
                // console.log('✅ [PURCHASE CART] Printed successfully!');
            } else {
                console.error('❌ [PURCHASE CART] Print failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ [PURCHASE CART] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        // Browser fallback - opens in new window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(cartHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

export default purchaseCartPrintOne;
