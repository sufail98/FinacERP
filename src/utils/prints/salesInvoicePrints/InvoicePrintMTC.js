import { store } from "@/redux/store";
import { isElectron, printSilent, getPrinterPreference } from '@/utils/electronPrint';

/**
 * Converts number to words (English) — same logic as printInvoiceOne
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
 * Amount to words — Total (whole) + decimal as "Halala" (matches PDF sample:
 * "THIRTY THOUSAND TWO HUNDRED SEVEN FORTY-EIGHT HALALA")
 */
const amountToWords = (amount, currency = 'RIYAL', subunit = 'HALALA') => {
    const [whole, decimal] = Number(amount || 0).toFixed(2).toString().split('.');
    const wholeNum = parseInt(whole) || 0;
    const decimalNum = parseInt(decimal) || 0;

    let words = '';
    if (wholeNum > 0) words += `${numberToWordsEnglish(wholeNum)} ${currency}`;
    if (decimalNum > 0) words += `${words ? ' AND ' : ''}${numberToWordsEnglish(decimalNum)} ${subunit}`;

    return words.trim().toUpperCase();
};

/**
 * Formats date to DD/MM/YYYY — matches PDF sample "DATE: 02/09/2026"
 */
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * ✅ Fetch any URL (same-origin or CORS-enabled) and return a base64 data URL.
 * Falls back to the original URL string so regular printing still works.
 * (Ported from printInvoiceSix — needed so letterhead/header/footer images
 * embed reliably in silent/Electron print output.)
 */
const toDataURL = async (url) => {
    if (!url || !url.trim()) return '';
    try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => resolve(url);  // fallback
            r.readAsDataURL(blob);
        });
    } catch {
        return url;
    }
};

/**
 * ✅ Row height estimation — same approach as printInvoiceOne, tuned for
 * this table's DESCRIPTION column (fixed 300px width)
 */
const CHARS_PER_LINE = 48;

const estimateRowLines = (item) => {
    let lines = 0;
    if (item.description || item.productName) {
        lines += Math.max(1, Math.ceil(String(item.description || item.productName).length / CHARS_PER_LINE));
    }
    return Math.max(1, lines);
};

const ROW_BASE_HEIGHT = 22;
const ROW_LINE_HEIGHT = 13;
const ROW_VERTICAL_PADDING = 8;

const estimateRowHeight = (item) => {
    const lines = estimateRowLines(item);
    if (lines <= 1) return ROW_BASE_HEIGHT;
    return Math.max(ROW_BASE_HEIGHT, lines * ROW_LINE_HEIGHT + ROW_VERTICAL_PADDING);
};

/**
 * ✅ Height-based pagination — identical logic to printInvoiceOne's
 * splitIntoPagesByHeight, reused as-is for the KTC export invoice table.
 */
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
 * Generate the KTC export invoice HTML.
 * Design matches the reference PDF:
 *  - Bilingual company header block (EN left / AR right) with green rule
 *  - "TAX INVOICE" boxed heading
 *  - CONSIGNEE / customer block left, DATE / INVNO block right
 *  - Table: SL | DESCRIPTION | HS CODE | ORIGIN | QTY | UNIT | WEIGHT-KG | UNIT RATE | Total Amount
 *  - GROSS AMOUNT / TOTAL AMOUNT summary rows inside the table (last page only)
 *  - Amount in words line
 *  - Bilingual footer block with brand logos strip + address, in a bordered box
 *
 * ✅ Column widths are FIXED (px), not percentage-based:
 *    SL: 30px | DESCRIPTION: 200px | HS CODE: 70px | ORIGIN: 70px |
 *    QTY: 50px | UNIT: 50px | WEIGHT-KG: 80px | UNIT RATE: 60px | Total Amount: 80px
 *
 *    Summary rows (GROSS AMOUNT / TOTAL AMOUNT / Amount in words), rendered
 *    ONLY on the last page, reuse these same fixed widths so borders line up
 *    exactly with the item rows:
 *      - merged label cell = SL + DESCRIPTION + HS CODE + ORIGIN + QTY + UNIT + WEIGHT-KG
 *                           = 30 + 200 + 70 + 70 + 50 + 50 + 80 = 550px
 *      - currency cell     = UNIT RATE width = 60px
 *      - value cell         = Total Amount width = 80px
 *
 * ✅ Letterhead logic (ported from printInvoiceSix):
 *   1. CompanyLetterPad (full-page letterhead image) — if set, it's drawn as a
 *      full-bleed background image and BOTH the text header/footer AND the
 *      separate header/footer images are suppressed.
 *   2. branchHeader / branchFooter (separate header/footer images) — used only
 *      when no full letterhead is set. Each is drawn independently, so it's
 *      fine to have only one of the two configured.
 *   3. Text-based header/footer — the bilingual block built from branch/company
 *      data, used only when neither of the above is configured.
 * All image URLs are converted to base64 data URLs via toDataURL() before
 * embedding, matching printInvoiceSix, so silent/Electron print output embeds
 * them reliably instead of relying on a live URL fetch at print time.
 */
export const generateInvoiceMTCHTML = async (invoiceData, branchData, time, currentCurrency) => {
    console.log(invoiceData);

    const state = store.getState().settings;
    const generalSettings = state.generalSettings;

    const showCurrencyPrefix = generalSettings.showCurrencyprefix;
    const currencySymbol = currentCurrency ? currentCurrency.currencySymbol : 'SAR';
    const decimalPart = state.generalSettings.decimalPart;

    const fmt = (num) =>
        showCurrencyPrefix
            ? `${currencySymbol} ${Number(num || 0).toFixed(decimalPart)}`
            : Number(num || 0).toFixed(decimalPart);

    const companyData = state.generalSettings;

    // ✅ Letterhead logic — mirrors printInvoiceSix: a full letterhead image
    // (CompanyLetterPad) takes priority over separate header/footer images
    // (branchHeader/branchFooter), which take priority over the text-based
    // header/footer built from branch/company data.
    const LETTERHEAD_IMAGE_PATH = companyData?.CompanyLetterPad || '';
    const HEADER_IMAGE = companyData?.branchHeader || '';
    const FOOTER_IMAGE = companyData?.branchFooter || '';

    const [letterheadSrc, headerSrc, footerSrc] = await Promise.all([
        toDataURL(LETTERHEAD_IMAGE_PATH),
        toDataURL(HEADER_IMAGE),
        toDataURL(FOOTER_IMAGE),
    ]);

    const useFullLetterhead = !!letterheadSrc;
    const useSeparateHeaderFooter = !useFullLetterhead && (headerSrc || footerSrc);
    const useTextHeaderFooter = !useFullLetterhead && !useSeparateHeaderFooter;

    const companyName = branchData?.branchName || 'Multi Tower Trading & Contracting Co.';
    const companyNameArb = branchData?.branchNameArb || 'شركة مولتي تاور للتجار والمقاولات';
    const companyCR = branchData?.crNo || '';
    const companyMobile = branchData?.mobileNo || '';
    const companyVatNo = branchData?.taxNo || '';
    const companyEmail = branchData?.email || '';
    const companyWebsite = branchData?.website || '';
    const companyAddress = branchData?.address || '';

    const {
        invoiceNo,
        date,
        consignee = '-',
        customerName,
        customerAddress,
        salesDetails = [],
    } = invoiceData;

    // Normalize export invoice line items (works whether upstream uses
    // description/hsCode/origin/weight/unitRate keys or the generic
    // productName/rate keys used elsewhere in the app)
 const items = salesDetails.map((item) => ({
    description: item.description || item.productName || '',
    hsCode: item.barcode || item.hsCode || item.hsCodeNo || '',
    origin: item.Origin || item.countryOfOrigin || '',
    qty: Number(item.qty || 0),
    unitName:
        item.unitName ||
        item.unit ||
        item.UnitName ||
        item.productDetails?.UnitName ||
        item.availableUnits?.find(u => u.unitid === item.unitId)?.unitname ||
        'PCS',
    weight: Number(item.Weight || item.weightKg || 0),
    unitRate: Number(item.unitRate || item.rate || 0),
    amount: Number(item.amount ?? (Number(item.qty || 0) * Number(item.unitRate ?? item.rate ?? 0))),
}));

    const grossAmount = items.reduce((sum, it) => sum + it.amount, 0);
    const totalAmount = Number(invoiceData.totalAmount || grossAmount);

    // ✅ Height-based page budgets — first page has heading + consignee/date block,
    // so less room for table rows; middle pages are pure table; last page reserves
    // room for GROSS/TOTAL rows + amount-in-words line below the table.
    // Padding differs by letterhead mode, so budgets follow the same tiers.
    const FIRST_PAGE_HEIGHT = useFullLetterhead ? 600 : (useSeparateHeaderFooter ? 640 : 720);
    const MIDDLE_PAGE_HEIGHT = 1000;
    const LAST_PAGE_HEIGHT = useFullLetterhead ? 520 : (useSeparateHeaderFooter ? 560 : 640);

    const productPages = splitIntoPagesByHeight(items, FIRST_PAGE_HEIGHT, MIDDLE_PAGE_HEIGHT, LAST_PAGE_HEIGHT);
    const totalPages = productPages.length || 1;

    const topPadding = useFullLetterhead ? '160px' : (useSeparateHeaderFooter ? '110px' : '25px');
    const bottomPadding = useFullLetterhead ? '105px' : (useSeparateHeaderFooter ? '160px' : '25px');

    let cumulativeIndex = 0;

    const pagesHTML = productPages.map((pageData, pageIndex) => {
        const { items: pageItems, isFirst: isFirstPage, isLast: isLastPage } = pageData;
        const pageStartIndex = cumulativeIndex;
        cumulativeIndex += pageItems.length;

        return `
            <div class="page">
                ${useFullLetterhead ? `
                    <img class="letterhead-bg" src="${letterheadSrc}" alt="letterhead">
                ` : useSeparateHeaderFooter ? `
                    ${headerSrc ? `<div class="header-image"><img src="${headerSrc}" alt="header"></div>` : ''}
                ` : `
                    <div class="header-text">
                        <div class="header-row">
                            <div class="header-left">
                                <div class="company-name-en">${companyName}</div>
                                ${companyCR ? `<div class="header-line"><strong>CR No:</strong> ${companyCR}</div>` : ''}
                                ${companyMobile ? `<div class="header-line"><strong>Mobile No:</strong> ${companyMobile}</div>` : ''}
                                ${companyVatNo ? `<div class="header-line"><strong>VAT NO:</strong> ${companyVatNo}</div>` : ''}
                            </div>
                            <div class="header-logo">
                                ${companyData.logo ? `<img src="${companyData.logo}" alt="logo">` : ''}
                            </div>
                            <div class="header-right rtl">
                                <div class="company-name-ar">${companyNameArb}</div>
                                ${companyCR ? `<div class="header-line">رقم السجل التجاري: ${companyCR}</div>` : ''}
                                ${companyMobile ? `<div class="header-line">رقم الهاتف المحمول: ${companyMobile}</div>` : ''}
                                ${companyVatNo ? `<div class="header-line">رقم الضريبة: ${companyVatNo}</div>` : ''}
                            </div>
                        </div>
                        <div class="header-rule"></div>
                    </div>
                `}

                <div class="content-wrapper" style="padding: ${topPadding} 25px ${bottomPadding} 25px;">

                    <div class="tax-invoice-box">TAX INVOICE</div>

                    ${isFirstPage ? `
                    <div class="info-section">
                        <div class="info-left">
                            <div class="info-row"><span class="info-label">CONSIGNEE:</span> ${consignee || '-'}</div>
                            <div class="info-row bold">${customerName || ''}</div>
                            <div class="info-row bold">${customerAddress || ''}</div>
                        </div>
                        <div class="info-right">
                            <div class="info-row"><span class="info-label">DATE:</span> ${formatDate(date)}</div>
                            <div class="info-row"><span class="info-label">INVNO:</span> ${invoiceNo || ''}</div>
                        </div>
                    </div>
                    ` : `
                    <div style="margin-bottom: 12px; text-align: center; font-weight: bold; font-size: 11px;">
                        Invoice No: ${invoiceNo || ''} &nbsp;|&nbsp; Page ${pageIndex + 1} of ${totalPages}
                    </div>
                    `}

                    <div class="ktc-table">
                        <div class="ktc-header-row">
                            <div class="col-sl">SL</div>
                            <div class="col-desc">DESCRIPTION</div>
                            <div class="col-hs">HS CODE</div>
                            <div class="col-origin">ORIGIN</div>
                            <div class="col-qty">QTY</div>
                            <div class="col-unit">UNIT</div>
                            <div class="col-weight">WEIGHT-KG</div>
                            <div class="col-rate">UNIT<br>RATE</div>
                            <div class="col-amount">Total Amount</div>
                        </div>

                        <div class="ktc-body">
                            ${pageItems.map((item, index) => {
                                const globalIndex = pageStartIndex + index;
                                return `
                                <div class="ktc-row">
                                    <div class="col-sl">${globalIndex + 1}</div>
                                    <div class="col-desc">${item.description}</div>
                                    <div class="col-hs">${item.hsCode}</div>
                                    <div class="col-origin">${item.origin}</div>
                                    <div class="col-qty">${item.qty}</div>
                                    <div class="col-unit">${item.unitName}</div>
                                    <div class="col-weight">${item.weight ? item.weight.toFixed(2) : '0.00'}</div>
                                    <div class="col-rate">${item.unitRate.toFixed(2)}</div>
                                    <div class="col-amount">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                                `;
                            }).join('')}

                            ${!isLastPage ? `
                                <div class="continuation-note">Continued on next page... (Page ${pageIndex + 1} of ${totalPages})</div>
                            ` : ''}

                            ${isLastPage ? `
                            <div class="ktc-row summary-row">
                                <div class="col-merged-label">GROSS AMOUNT</div>
                                <div class="col-rate summary-currency">${currencySymbol}</div>
                                <div class="col-amount summary-value">${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div class="ktc-row summary-row total">
                                <div class="col-merged-label">TOTAL AMOUNT</div>
                                <div class="col-rate summary-currency">${currencySymbol}</div>
                                <div class="col-amount summary-value">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div class="ktc-row words-row">
                                <div class="col-merged-full">Amount in words:${amountToWords(totalAmount, currencySymbol === 'SAR' ? 'RIYAL' : currencySymbol, 'HALALA')}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${useFullLetterhead ? '' : useSeparateHeaderFooter ? `
                    ${footerSrc ? `<div class="footer-image"><img src="${footerSrc}" alt="footer"></div>` : ''}
                ` : `
                    <div class="footer-text">
                        <div class="footer-rule"></div>
                        <div class="footer-row">
                            <div class="footer-brands">
                                ${companyData.brandLogos ? companyData.brandLogos.map(b => `<img src="${b}" alt="brand">`).join('') : ''}
                            </div>
                            <div class="footer-contact rtl-right">
                                ${companyEmail ? `<div>${companyEmail}${companyWebsite ? `,${companyWebsite}` : ''}</div>` : ''}
                                ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                            </div>
                        </div>
                    </div>
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
            <title>TAX INVOICE - ${invoiceNo}</title>
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
                .page:last-child { margin-bottom: 0; }

                /* ✅ Full-page letterhead background image (CompanyLetterPad) */
                .letterhead-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: fill;
                    z-index: 0;
                    display: block;
                }

                /* Header image (separate branchHeader) */
                .header-image { width: 100%; position: absolute; top: 0; left: 0; z-index: 1; height: 110px; overflow: hidden; }
                .header-image img { width: 100%; display: block; height: 110px; object-fit: fill; }

                /* Footer image (separate branchFooter) */
                .footer-image { width: 100%; position: absolute; bottom: 0; left: 0; z-index: 1; height: 150px; overflow: hidden; }
                .footer-image img { width: 100%; display: block; height: 150px; object-fit: fill; }

                /* Text header (matches PDF: bilingual, green rule) */
                .header-text {
                    width: 100%;
                    padding: 15px 20px 0 20px;
                    position: relative;
                    z-index: 1;
                }
                .header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 10px;
                }
                .header-left { flex: 1; text-align: left; }
                .header-right { flex: 1; text-align: right; }
                .header-logo { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 10px; }
                .header-logo img { max-height: 46px; }
                .company-name-en { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
                .company-name-ar { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
                .header-line { font-size: 10px; font-weight: 700; margin-top: 2px; }
                .header-rule { height: 4px; background: #1e6b3a; margin-top: 10px; }
                .rtl { direction: rtl; }

                /* Text footer (matches PDF: green rule, brand strip, contact block) */
                .footer-text {
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    z-index: 1;
                    padding: 0 20px 15px 20px;
                }
                .footer-rule { height: 4px; background: #1e6b3a; margin-bottom: 10px; }
                .footer-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid #1e6b3a;
                    border-radius: 30px;
                    padding: 8px 20px;
                    gap: 15px;
                }
                .footer-brands { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                .footer-brands img { height: 26px; }
                .footer-contact { font-size: 9px; text-align: right; line-height: 1.5; }

                .content-wrapper {
                    flex: 1;
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                }

                .tax-invoice-box {
                    border: 1px solid #333;
                    text-align: center;
                    font-weight: bold;
                    font-size: 12px;
                    padding: 6px;
                    margin-bottom: 25px;
                }

                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 25px;
                    font-size: 11px;
                }
                .info-left, .info-right { flex: 1; }
                .info-right { text-align: left; }
                .info-row { margin-bottom: 6px; }
                .info-row.bold { font-weight: bold; }
                .info-label { font-weight: bold; }

                /* ✅ Fixed-width table: total width = 30+300+70+70+50+50+80+60+80 = 744px */
                .ktc-table {
                    border: 1px solid #333;
                    font-size: 10px;
                    width: 744px;
                }
                .ktc-header-row, .ktc-row {
                    display: flex;
                    border-bottom: 1px solid #333;
                }
                .ktc-header-row {
                    font-weight: bold;
                    font-size: 9px;
                }
                .ktc-header-row > div, .ktc-row > div {
                    padding: 5px 6px;
                    border-right: 1px solid #333;
                    display: flex;
                    align-items: center;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }
                .ktc-header-row > div:last-child, .ktc-row > div:last-child { border-right: none; }

                /* ✅ Fixed pixel widths per column */
                .col-sl { width: 30px; justify-content: center; text-align: center; }
                .col-desc { width: 270px; word-break: break-word; }
                .col-hs { width: 70px; word-break: break-word; }
                .col-origin { width: 70px; word-break: break-word; }
                .col-qty { width: 30px; justify-content: center; text-align: center; }
                .col-unit { width: 40px; justify-content: center; text-align: center; }
                .col-weight { width: 60px; justify-content: flex-end; text-align: right; }
                .col-rate { width: 60px; justify-content: flex-end; text-align: right; }
             /* Balance = 744 - (30+270+70+70+30+40+60+60) = 114px */
.col-amount { width: 114px; justify-content: flex-end; text-align: right; font-weight: 600; }

                .continuation-note {
                    text-align: center;
                    font-weight: bold;
                    padding: 8px;
                    border-bottom: 1px solid #333;
                    width: 790px;
                    box-sizing: border-box;
                }

                /* ✅ Summary rows (last page only) — reuse fixed column widths so
                   borders align exactly with the item rows above them.
                   Merged label = SL(30) + DESC(270) + HS(70) + ORIGIN(70) + QTY(30) + UNIT(40) + WEIGHT(60) = 570px
                   Currency cell = UNIT RATE width = 60px
                   Value cell    = Total Amount width = 60px */
                .summary-row { font-weight: bold; }
                .summary-row.total { font-size: 11px; }

                .col-merged-label {
                    width: 570px;
                    padding: 5px 6px;
                    border-right: 1px solid #333;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    text-align: right;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }

                .col-merged-full {
                    width: 744px;
                    padding: 5px 6px;
                    display: flex;
                    align-items: center;
                    font-size: 10px;
                    font-weight: bold;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }

                .words-row { border-bottom: 1px solid #333; }

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
 * Main print invoice function - SILENT PRINT (MTC export invoice design)
 */
export const printInvoiceMTC = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceMTCHTML(invoiceData, branchData, time, currentCurrency);

    if (isElectron()) {
        try {
            const savedPrinter = await getPrinterPreference('a4');
            const result = await printSilent(invoiceHTML, savedPrinter, 'a4');

            if (result.success) {
                // console.log('✅ [MTC INVOICE] Printed successfully!');
            } else {
                console.error('❌ [MTC INVOICE] Print failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ [MTC INVOICE] Error:', error);
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
 * Save MTC invoice as PDF
 */
export const saveInvoiceMTCAsPDF = async (invoiceData, branchData, time, currentCurrency) => {
    const invoiceHTML = await generateInvoiceMTCHTML(invoiceData, branchData, time, currentCurrency);
    const invoiceNumber = invoiceData.invoiceNo || 'invoice';
    const filename = `${invoiceNumber}.pdf`;

    if (isElectron()) {
        try {
            const result = await window.electronAPI.savePDF(invoiceHTML, filename);
            if (result.success) {
                return result;
            } else {
                console.error('❌ [MTC INVOICE] PDF save failed:', result.error);
                return result;
            }
        } catch (error) {
            console.error('❌ [MTC INVOICE] Error saving PDF:', error);
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

export default printInvoiceMTC;