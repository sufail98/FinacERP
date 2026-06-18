// E:\Users\Roshan\Finac\Web-FinacERP\src\utils\prints\deliveryNotePrints\deliveryNotePrintOne.js

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
    try {
        return formatDateUtil(date, dateFormat);
    } catch {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }
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
 * Get branch name from store
 */
const getBranchName = () => {
    try {
        const state = store.getState();
        const authState = state.auth;
        const settingsState = state.settings;
        
        const branches = authState?.branches;
        const selectedBranchId = authState?.selectedBranchId;
        
        if (branches && selectedBranchId) {
            const selectedBranch = branches.find(branch => branch.branchId === selectedBranchId);
            if (selectedBranch?.branchName) {
                return selectedBranch.branchName;
            }
        }
        
        if (settingsState?.generalSettings?.companyName) {
            return settingsState.generalSettings.companyName;
        }
        
        return 'EAST COAST ADVERTISING AGENCY';
    } catch (error) {
        console.error('Error getting branch name:', error);
        return 'EAST COAST ADVERTISING AGENCY';
    }
};

/**
 * Generate Delivery Note HTML
 */
const generateDeliveryNoteHTML = (invoiceData, branchData, currentCurrency) => {
    console.log(invoiceData,);
    
    const state = store.getState().settings;
    const companyData = state.generalSettings;
    const headerImage = companyData.branchHeader;
    const footerImage = companyData.branchFooter;
    const companyName = branchData?.branchName || '';
    const companyCode = branchData?.branchCode || '';
    const companyVatNo = branchData?.taxNo || 300000000000003;
    const branchName = getBranchName();

    const {
        invoiceNo,
        date,
        customerName,
        CustomerAddress,
        LPONo,
        LPODate,
        employeeId,
        employeeName,
        driverName,
        contactNo,
        deliveryVehicleNo,
        salesDetails = [],
    } = invoiceData;

    const salesmanName = employeeName || employeeId || '';
    const formattedDate = formatDate(date);
    const formattedLPODate = formatDate(LPODate);

    const ROWS_PER_PAGE = 15;
    const filteredProducts = salesDetails.filter(item => item.productCode);
    const productPages = chunkArray(filteredProducts, ROWS_PER_PAGE);
    const totalPages = productPages.length || 1;

    if (productPages.length === 0) {
        productPages.push([]);
    }

    const pagesHTML = productPages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        const emptyRowsCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);
        const emptyRows = Array(emptyRowsCount).fill(null);

        return `
            <div class="page">
                <!-- Header Image - Fixed 2 inch height, full width stretched -->
                <div class="header-image">
                    ${headerImage 
                        ? `<img src="${headerImage}" alt="header">` 
                        :  `
    <div class="header-text">
        <div class="company-name">${companyName}</div>
        <div class="company-code">${companyCode}</div>
        <div class="company-vat">VAT No: ${companyVatNo}</div>
    </div>
`
                    }
                </div>

                <!-- Content Area -->
                <div class="content-wrapper ${isLastPage ? 'last-page' : ''}">
                    
                    <!-- Section 1: Heading with curved border -->
                    <div class="heading-container">
                        <h2 class="heading">
                            <span>Delivery Note</span>
                            <span class="heading-ar">مذكرة التسليم</span>
                        </h2>
                    </div>

                    ${isFirstPage ? `
                    <!-- Section 2: Two Boxes -->
                    <div class="info-section">
                        <!-- Left Box - Buyer/Customer Address -->
                        <div class="info-box left-box">
                            <table class="buyer-table">
                                <tr>
                                    <td class="label-cell">
                                        <strong>Buyer</strong><br>
                                        <span class="arabic-text">المشتري</span>
                                    </td>
                                    <td class="value-cell">
                                        <strong>${customerName || 'Cash Customer'}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="label-cell">
                                        <strong>Address</strong><br>
                                        <span class="arabic-text">عنوان</span>
                                    </td>
                                    <td class="value-cell">${CustomerAddress || '—'}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Right Box - Document Details -->
                        <div class="info-box right-box">
                            <table class="doc-table">
                                <tr>
                                    <td class="label-cell"><strong>Date</strong></td>
                                    <td class="value-cell">${formattedDate}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell"><strong>DO No.</strong></td>
                                    <td class="value-cell">${invoiceNo || 'NA'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell"><strong>LPO Number</strong></td>
                                    <td class="value-cell">${LPONo || 'NA'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell"><strong>LPO Date</strong></td>
                                    <td class="value-cell">${formattedLPODate || 'NA'}</td>
                                </tr>
                                <tr>
                                    <td class="label-cell"><strong>Sales Man</strong></td>
                                    <td class="value-cell">${salesmanName || 'NA'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <!-- Continuation Header -->
                    <div class="page-info">
                        DO No: ${invoiceNo} | Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <!-- Section 3: Product Table -->
                    <table class="product-table">
                        <thead>
                            <tr>
                                <th class="col-slno">
                                    <div class="th-ar">رقم</div>
                                    <div>SL No</div>
                                </th>
                                <th class="col-code">
                                    <div class="th-ar">رمز</div>
                                    <div>ITEM CODE</div>
                                </th>
                                <th class="col-product">
                                    <div class="th-ar">وصف</div>
                                    <div>DESCRIPTION</div>
                                </th>
                                <th class="col-qty">
                                    <div class="th-ar">الكمية</div>
                                    <div>QTY</div>
                                </th>
                                <th class="col-unit">
                                    <div class="th-ar">وحدة</div>
                                    <div>UNIT</div>
                                </th>
                                <th class="col-remark">
                                    <div class="th-ar">ملاحظة</div>
                                    <div>Remarks</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageProducts.map((item, index) => {
                                const globalIndex = pageIndex * ROWS_PER_PAGE + index;
                                
                                const productName = item.productName || '';
                                const productNameArb = item.productNameArb || '';
                                const description = item.productDescription || '';
                                const fullDescription = description 
                                    ? `${productName} - ${description}` 
                                    : productName;
                                
                                return `
                                    <tr>
                                        <td class="text-center">${globalIndex + 1}</td>
                                        <td class="text-center">${item.productCode || ''}</td>
                                        <td class="text-left product-cell">
                                        ${productName} <br/>
                                        ${productNameArb}
                                        </td>
                                        <td class="text-center">${item.qty || 0}</td>
                                        <td class="text-center">${item.unitName || item.productDetails?.UnitName || ''}</td>
                                        <td class="text-left">${item.Remark || ''}</td>
                                    </tr>
                                `;
                            }).join('')}

                            ${emptyRows.map(() => `
                                <tr class="empty-row">
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                </tr>
                            `).join('')}

                            ${!isLastPage ? `
                                <tr class="continuation-row">
                                    <td colspan="6" class="text-center"><strong>Continued on next page...</strong></td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>

                ${isLastPage ? `
                <!-- Fixed Bottom Section -->
                <div class="bottom-section">
                    <!-- Section 4 & 5: Responsibility Boxes -->
                    <div class="responsibility-section">
                        <div class="responsibility-left">
                            THE DRIVER IS RESPONSIBLE FOR TAKING THE MATERIAL SAFELY TO THE DESTINATION
                        </div>
                        <div class="responsibility-right">
                            GOODS HAVE BEEN RECEIVED IN GOOD CONDITION
                        </div>
                    </div>

                    <!-- Receiver Signature -->
                    <div class="receiver-signature-section">
                        <div class="signature-line"></div>
                        <div class="signature-label">Receiver Signature</div>
                    </div>

                    <!-- Section 6: Branch Name & Driver Info -->
                    <div class="footer-info">
                        <div class="footer-left">
                            <div class="branch-name">For ${branchName}</div>
                        </div>
                        <div class="footer-right">
                            <div class="driver-row">
                                <span class="driver-label">Name:</span>
                                <span class="driver-value">${driverName || ''}</span>
                            </div>
                            <div class="driver-row">
                                <span class="driver-label">Contact No:</span>
                                <span class="driver-value">${contactNo || ''}</span>
                            </div>
                            <div class="driver-row">
                                <span class="driver-label">Vehicle No:</span>
                                <span class="driver-value">${deliveryVehicleNo || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Footer Image - Fixed 1 inch height, full width stretched -->
                <div class="footer-image">
                    ${footerImage 
                        ? `<img src="${footerImage}" alt="footer">` 
                        : '<div class="footer-placeholder"></div>'
                    }
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
            <title>Delivery Note - ${invoiceNo}</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
            <style>
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
                    background: #fff;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
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
                }
                .page:last-child { 
                    margin-bottom: 0; 
                }
  .header-text {
    width: 100%;
    padding: 20px 15px;
    text-align: center;
    // border-bottom: 1px solid rgb(216, 216, 216);
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.header-text .company-name {
    font-size: 20px;
    font-weight: 800;
}

.header-text .company-code,
.header-text .company-vat {
    font-size: 12px;
    margin-top: 4px;
}

                /* ========== HEADER IMAGE - FIXED 2 INCH HEIGHT, FULL WIDTH ========== */
                .header-image { 
                    width: 210mm;
                    height: 2in;
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    z-index: 1;
                    overflow: hidden;
                    background: #fff;
                }
                .header-image img { 
                    width: 210mm !important;
                    height: 2in !important;
                    object-fit: fill !important;
                    display: block; 
                }
                .header-placeholder {
                    width: 210mm;
                    height: 2in;
                    background: #f0f0f0;
                }

                /* ========== FOOTER IMAGE - FIXED 1 INCH HEIGHT, FULL WIDTH ========== */
                .footer-image { 
                    width: 210mm;
                    height: 1in;
                    position: absolute; 
                    bottom: 0; 
                    left: 0; 
                    z-index: 1;
                    overflow: hidden;
                    background: #fff;
                }
                .footer-image img { 
                    width: 210mm !important;
                    height: 1in !important;
                    object-fit: fill !important;
                    display: block; 
                }
                .footer-placeholder {
                    width: 210mm;
                    height: 1in;
                    background: #f0f0f0;
                }

                /* Content Wrapper */
                .content-wrapper {
                    flex: 1;
                    padding: calc(2in + 10px) 15px calc(1in + 10px) 15px;
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                }
                .content-wrapper.last-page {
                    padding-bottom: calc(1in + 180px);
                }

                /* Section 1: Heading with curved border */
                .heading-container {
                    border: 2px solid #000;
                    border-radius: 12px;
                    padding: 10px 20px;
                    margin-bottom: 12px;
                }
                .heading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                    font-size: 20px;
                    margin: 0;
                    font-weight: bold;
                }
                .heading-ar {
                    direction: rtl;
                }

                /* Page Info */
                .page-info {
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                    margin-bottom: 12px;
                    padding: 6px;
                    background: #f5f5f5;
                    border-radius: 6px;
                }

                /* Section 2: Info Section with curved borders */
                .info-section {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .info-box {
                    border: 2px solid #000;
                    border-radius: 12px;
                    padding: 10px;
                }
                .left-box {
                    flex: 60%;
                }
                .right-box {
                    flex: 40%;
                }
                .buyer-table,
                .doc-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .buyer-table td,
                .doc-table td {
                    padding: 4px 6px;
                    border: none;
                    vertical-align: top;
                    font-size: 10px;
                }
                .label-cell {
                    width: 25%;
                }
                .value-cell {
                    width: 75%;
                }
                .doc-table .label-cell {
                    width: 45%;
                }
                .doc-table .value-cell {
                    width: 55%;
                }
                .arabic-text {
                    font-size: 9px;
                    color: #555;
                }

                /* Section 3: Product Table */
                .product-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }
                .product-table th {
                    border: 2px solid #000;
                    padding: 6px 4px;
                    font-weight: bold;
                    text-align: center;
                    font-size: 8px;
                    background: #ddd;
                }
                .product-table tbody td {
                    border-left: 2px solid #000;
                    border-right: 2px solid #000;
                    border-top: none;
                    border-bottom: none;
                    padding: 4px 5px;
                }
                .product-table tbody tr:last-child td {
                    border-bottom: 2px solid #000;
                }
                .th-ar {
                    font-size: 7px;
                    direction: rtl;
                }

                /* Column Widths */
                .col-slno { width: 6%; }
                .col-code { width: 12%; }
                .col-product { width: 35%; }
                .col-qty { width: 10%; }
                .col-unit { width: 10%; }
                .col-remark { width: 27%; }

                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }

                .product-cell {
                    font-weight: 500;
                }

                .empty-row td { 
                    height: 20px; 
                }
                .continuation-row { 
                    background: #fff5f5; 
                }
                .continuation-row td {
                    border-bottom: 2px solid #000 !important;
                }

                /* Bottom Section - Fixed */
                .bottom-section {
                    position: absolute;
                    bottom: calc(1in + 10px);
                    left: 15px;
                    right: 15px;
                    z-index: 2;
                }

                /* Section 4 & 5: Responsibility */
                .responsibility-section {
                    display: flex;
                    border: 2px solid #000;
                    border-radius: 10px;
                    margin-bottom: 12px;
                    overflow: hidden;
                }
                .responsibility-left,
                .responsibility-right {
                    flex: 1;
                    padding: 10px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 10px;
                    line-height: 1.3;
                }
                .responsibility-left {
                    border-right: 2px solid #000;
                }

                /* Receiver Signature */
                .receiver-signature-section {
                    text-align: right;
                    margin-bottom: 15px;
                    padding-right: 50px;
                }
                .signature-line {
                    display: inline-block;
                    width: 200px;
                    border-bottom: 1px dotted #000;
                    height: 22px;
                }
                .signature-label {
                    font-size: 11px;
                    margin-top: 4px;
                }

                /* Section 6: Footer Info */
                .footer-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .footer-left {
                    flex: 1;
                }
                .branch-name {
                    font-weight: bold;
                    font-size: 12px;
                }
                .footer-right {
                    flex: 1;
                    text-align: left;
                    padding-left: 50px;
                }
                .driver-row {
                    margin-bottom: 6px;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                }
                .driver-label {
                    font-weight: bold;
                    min-width: 85px;
                }
                .driver-value {
                    flex: 1;
                    border-bottom: 1px dotted #000;
                    min-width: 110px;
                    padding-bottom: 2px;
                }

                @media print {
                    body { 
                        background: white; 
                        padding: 0;
                        margin: 0;
                    }
                    .page { 
                        box-shadow: none; 
                        width: 210mm; 
                        height: 297mm; 
                        margin-bottom: 0;
                    }
                    .header-image {
                        width: 210mm !important;
                        height: 2in !important;
                    }
                    .header-image img {
                        width: 210mm !important;
                        height: 2in !important;
                        object-fit: fill !important;
                    }
                    .footer-image {
                        width: 210mm !important;
                        height: 1in !important;
                    }
                    .footer-image img {
                        width: 210mm !important;
                        height: 1in !important;
                        object-fit: fill !important;
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
 * Main print delivery note function - SILENT PRINT
 */
export const deliveryNotePrintOne = async (invoiceData, branchData, time, invoiceQr, currentCurrency) => {
    
    // Generate HTML
    const invoiceHTML = generateDeliveryNoteHTML(invoiceData, branchData, currentCurrency);

    if (isElectron()) {
        try {
            
            const savedPrinter = await getPrinterPreference('a4');
            
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');
            
            if (result.success) {
                console.log('✅ [DELIVERY NOTE] Printed successfully!');
            } else {
                console.error('❌ [DELIVERY NOTE] Print failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ [DELIVERY NOTE] Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        console.log('📄 [DELIVERY NOTE] Browser mode - opening new window');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            console.error('❌ [DELIVERY NOTE] Popup blocked');
            return { success: false, error: 'Popup blocked' };
        }
        return { success: true };
    }
};

export default deliveryNotePrintOne;