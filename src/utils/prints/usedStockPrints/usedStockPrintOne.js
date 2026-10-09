import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const CHARS_PER_LINE = 30;

const estimateRowLines = (item) => {
    let lines = 0;
    if (item.productName) lines += Math.max(1, Math.ceil(String(item.productName).length / CHARS_PER_LINE));
    return Math.max(1, lines);
};

const ROW_BASE_HEIGHT = 19;
const ROW_LINE_HEIGHT = 12;
const ROW_VERTICAL_PADDING = 8;

const estimateRowHeight = (item) => {
    const lines = estimateRowLines(item);
    if (lines <= 1) return ROW_BASE_HEIGHT;
    return Math.max(ROW_BASE_HEIGHT, lines * ROW_LINE_HEIGHT + ROW_VERTICAL_PADDING);
};

const splitIntoPagesByHeight = (array, firstPageHeight, middlePageHeight, lastPageHeight) => {
    if (array.length === 0) {
        return [{ items: [], isFirst: true, isLast: true }];
    }

    const heights = array.map(estimateRowHeight);
    const totalHeight = heights.reduce((s, h) => s + h, 0);

    if (totalHeight <= lastPageHeight) {
        return [{ items: array, isFirst: true, isLast: true }];
    }

    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    let pageIndex = 0;
    let i = 0;

    while (i < array.length) {
        const item = array[i];
        const itemHeight = heights[i];
        const capacity = pageIndex === 0 ? firstPageHeight : middlePageHeight;

        if (currentPage.length === 0 || currentHeight + itemHeight <= capacity) {
            currentPage.push(item);
            currentHeight += itemHeight;
            i++;
        } else {
            pages.push({ items: currentPage, isFirst: pageIndex === 0, isLast: false });
            currentPage = [];
            currentHeight = 0;
            pageIndex++;
        }
    }

    if (currentPage.length > 0) {
        pages.push({ items: currentPage, isFirst: pageIndex === 0, isLast: false });
    }

    if (pages.length > 0) {
        pages[pages.length - 1].isLast = true;
    }

    let last = pages[pages.length - 1];
    let lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight(it), 0);

    while (lastContentHeight > lastPageHeight && last.items.length > 1) {
        const overflowItem = last.items.pop();
        lastContentHeight -= estimateRowHeight(overflowItem);

        last.isLast = false;
        pages.push({ items: [overflowItem], isFirst: false, isLast: true });
        last = pages[pages.length - 1];
        lastContentHeight = last.items.reduce((s, it) => s + estimateRowHeight(it), 0);
    }

    return pages;
};

/**
 * Generate the Used Stock voucher HTML.
 *
 * Expected stockData shape:
 * {
 *   voucherNo, date, narration,
 *   stockDetails: [{ barcode, productName, qty, rate, amount }, ...]
 * }
 */
export const generateUsedStockHTML = (stockData, branchData, time, currentCurrency) => {
    const state = store.getState().settings;
    const generalSettings = state.generalSettings;
    const decimalPart = generalSettings?.decimalPart ?? 2;
    const showCurrencyPrefix = generalSettings?.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : '';

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num || 0).toFixed(decimalPart)}`
            : Number(num || 0).toFixed(decimalPart);

    const companyData = generalSettings;
    const headerImage = companyData?.branchHeader;
    const footerImage = companyData?.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || '';
    const companyAddress = [branchData?.buildingNo, branchData?.streetName, branchData?.district, branchData?.cityName]
        .filter(Boolean)
        .join(', ');
    const companyPhone = branchData?.phoneNo || branchData?.mobileNo || '';

    const {
        voucherNo = '',
        date,
        narration = '',
        stockDetails = [],
    } = stockData;

    const totalQty = stockDetails.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalAmount = stockDetails.reduce((sum, item) => sum + (parseFloat(item.amount ?? ((item.qty || 0) * (item.rate || 0))) || 0), 0);

    const FIRST_PAGE_HEIGHT = headerImage ? 850 : 920;
    const MIDDLE_PAGE_HEIGHT = 1050;
    const LAST_PAGE_HEIGHT = footerImage ? 650 : 720;

    const productPages = splitIntoPagesByHeight(stockDetails, FIRST_PAGE_HEIGHT, MIDDLE_PAGE_HEIGHT, LAST_PAGE_HEIGHT);
    const totalPages = productPages.length || 1;

    const topPadding = headerImage ? '110px' : '90px';
    const bottomPadding = footerImage ? '70px' : '100px';
    const lastPageBottomPadding = footerImage ? '160px' : '120px';

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageProducts, isFirst: isFirstPage, isLast: isLastPage } = pageData;

        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageProducts.length;

        return `
            <div class="page">
                ${headerImage ? `
                    <div class="header-image">
                        <img src="${headerImage}" alt="header">
                    </div>
                ` : `
                    <div class="header-text">
                        <div class="company-name">${companyName}</div>
                        ${companyCode ? `<div class="company-code">${companyCode}</div>` : ''}
                        ${companyAddress ? `<div class="company-meta">${companyAddress}</div>` : ''}
                        ${companyPhone ? `<div class="company-meta">${companyPhone}</div>` : ''}
                        ${companyVatNo ? `<div class="company-meta">VAT No: ${companyVatNo}</div>` : ''}
                    </div>
                `}

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

                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}" style="padding: ${topPadding} 25px ${isLastPage ? lastPageBottomPadding : bottomPadding} 25px;">
                    ${isFirstPage ? `
                    <h2 class="heading">
                        <span>USED STOCK</span>
                        <div><span class="heading-ar">المخزون المستخدم</span></div>
                    </h2>
                    <div class="header-section">
                        <table class="details-table">
                            <tr>
                                <td class="label">VOUCHER NO<br><span class="rtl">رقم السند</span></td>
                                <td class="bold">${voucherNo || ''}</td>
                                <td class="label">DATE<br><span class="rtl">تاريخ</span></td>
                                <td class="bold">${formatDate(date)} ${time || ''}</td>
                            </tr>
                            ${narration ? `
                            <tr>
                                <td class="label">NARRATION<br><span class="rtl">ملاحظة</span></td>
                                <td class="bold" colspan="3">${narration}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    ` : `
                    <h2 class="heading">
                        <span>USED STOCK</span>
                        <div><span class="heading-ar">المخزون المستخدم</span></div>
                    </h2>
                    <div style="margin-bottom: 15px; text-align: center; font-weight: bold;">
                        Voucher No: ${voucherNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="product-table">
                        <div class="product-header">
                          <div class="col-sino"><div>م</div><div>S.No</div></div>
                            <div class="col-barcode"><div>باركود</div><div>BARCODE</div></div>
                            <div class="col-product"><div>منتج</div><div>PRODUCT NAME</div></div>
                            <div class="col-qty"><div>الكمية</div><div>QTY</div></div>
                            <div class="col-price"><div>سعر</div><div>RATE</div></div>
                            <div class="col-total"><div>الإجمالي</div><div>TOTAL</div></div>
                        </div>

                        <div class="product-body">
                            ${pageProducts.map((item, index) => {
            const globalIndex = pageStartIndex + index;
            const lineAmount = item.amount ?? ((item.qty || 0) * (item.rate || 0));
            return `
                                <div class="product-row">
                                  <div class="col-sino" style="font-size: 10px;">${globalIndex + 1}</div>
                                    <div class="col-barcode" style="font-size: 10px;">${item.barcode || ''}</div>
                                    <div class="col-product" style="font-size: 10px; font-weight: 600;">${item.productName || ''}</div>
                                    <div class="col-qty" style="font-size: 10px;">${item.qty ?? 0}</div>
                                    <div class="col-price" style="font-size: 10px;">${fmt(item.rate)}</div>
                                    <div class="col-total" style="text-align:right;font-size: 10px;">${fmt(lineAmount)}</div>
                                </div>
                                `;
        }).join('')}

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>
                            ` : ''}
                        </div>

                        ${isLastPage ? `
                        <div class="product-footer">
                           <div class="col-sino"></div>
                            <div class="col-barcode"></div>
                            <div class="col-product" style="text-align: right; font-weight: 800;">TOTAL / <span>المجموع</span></div>
                            <div class="col-qty">${totalQty}</div>
                            <div class="col-price"></div>
                            <div class="col-total">${fmt(totalAmount)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${isLastPage ? `
                <div class="total-section-fixed">
                    <div class="signature-section-compact">
                        <div><span style="font-size: 9px; font-weight: 700;">AUTHORIZED SIGNATURE</span><br><span style="font-size: 8px;">التوقيع المعتمد</span></div>
                    </div>
                </div>
                ` : ''}

                ${footerImage ? `
                    <div class="footer-image">
                        <img src="${footerImage}" alt="footer">
                    </div>
                ` : `
                    <div class="footer-image"></div>
                `}
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>USED STOCK - ${voucherNo}</title>
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
                .page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 10px;
                    page-break-after: always;
                    overflow: hidden;
                }
                .print-timestamp {
                    position: absolute;
                    bottom: 70mm;
                    right: 5mm;
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
                .page:last-child { margin-bottom: 0; }
                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; height: 110px; overflow: hidden; }
                .header-image img { width: 100%; display: block; height: 110px; object-fit: fill; }
                .footer-image { width: 100%; position: absolute; bottom: 10px; left: 0; z-index: 1; height: 70px; overflow: hidden; }
                .footer-image img { width: 100%; display: block; height: 70px; object-fit: fill; }
                .content-wrapper { flex: 1; position: relative; z-index: 2; display: flex; flex-direction: column; }
                .total-section-fixed {
                    position: absolute;
                    bottom: ${footerImage ? '110px' : '90px'};
                    left: 15px;
                    right: 15px;
                    z-index: 2;
                }
                .heading {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    font-size: 19px;
                    margin: 0 0 10px 0;
                    font-weight: bold;
                    border-top: 1px solid rgb(216, 216, 216);
                    border-bottom: 1px solid rgb(216, 216, 216);
                    padding-top: 5px;
                    padding-bottom: 5px;
                    text-align: center;
                }
                .heading-ar { font-size: 16px; }
                .header-text {
                    width: 100%;
                    padding: 20px 15px;
                    text-align: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                }
                .header-text .company-name { font-size: 20px; font-weight: 800; }
                .header-text .company-code,
                .header-text .company-meta { font-size: 12px; margin-top: 4px; }
                .header-section { margin-bottom: 15px; }
                .details-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .details-table td { border: 1px solid rgb(216, 216, 216); padding: 4px 8px; vertical-align: top; }
                .details-table .label { font-weight: bold; width: 110px; }
                .rtl { direction: rtl; text-align: right; }
                .bold { font-weight: bold; }
                .product-table { border: 1px solid rgb(216, 216, 216); font-size: 14px; }
                .product-header, .product-row, .product-footer {
                    display: flex;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .product-footer { border-top: 1px solid rgb(216, 216, 216); border-bottom: none; font-weight: bold; }
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
                .product-row { min-height: 19px; height: auto; }
                .product-row > div {
                    padding: 4px 6px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                .product-footer > div {
                    padding: 8px 10px;
                    border-right: 1px solid rgb(216, 216, 216);
                    display: flex;
                    align-items: center;
                }
                .col-barcode { width: 18%; }
                .col-product { width: 42%; }
                .col-qty { width: 12%; text-align: center; justify-content: center; }
                .col-price { width: 14%; text-align: right; justify-content: flex-end; }
                .col-total { width: 15%; text-align: right; justify-content: flex-end; }
                .col-sino { width: 6%; text-align: center; justify-content: center; }
                .product-header > div:last-child,
                .product-row > div:last-child,
                .product-footer > div:last-child { border-right: none; }
                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 10px;
                    border-bottom: 1px solid rgb(216, 216, 216);
                }
                .signature-section-compact {
                    display: flex;
                    justify-content: flex-end;
                    border-top: 1px solid rgb(216, 216, 216);
                    margin-top: 30px;
                    padding-top: 10px;
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
 * Print used stock voucher (silent print in Electron, browser print otherwise)
 */
export const printUsedStock = async (stockData, branchData, time, currentCurrency) => {
    const voucherHTML = generateUsedStockHTML(stockData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(voucherHTML, savedPrinter, 'a4');

            if (!result.success) {
                console.error('❌ [USED STOCK] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [USED STOCK] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(voucherHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

/**
 * Save used stock voucher as PDF
 */
export const saveUsedStockAsPDF = async (stockData, branchData, time, currentCurrency) => {
    const voucherHTML = generateUsedStockHTML(stockData, branchData, time, currentCurrency);
    const voucherNumber = stockData.voucherNo || 'used-stock';
    const filename = `${voucherNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(voucherHTML, filename);
            if (!result.success) {
                console.error('❌ [USED STOCK] PDF save failed:', result.error);
            }
            return result;
        } catch (error) {
            console.error('❌ [USED STOCK] Error saving PDF:', error);
            return { success: false, error: error.message };
        }
    } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(voucherHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
        return { success: true };
    }
};

export default printUsedStock;