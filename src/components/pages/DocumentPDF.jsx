
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Preloader from '@/components/common/Preloader';
import useAuth from '@/redux/hook/auth/useAuth';
import { parseDateFromAPI } from '@/lib/dateFormat';
import { getCustomerCodeFromQuery, getDomainBySlno } from '@/lib/baseUrl';

// ── Print-file imports ───────────────────────────────────────────────────────
// Each print file must export:
//   - generateInvoiceHTML(data, branchDetails, time)  → Promise<string> | string
//   - a default print function(data, branchDetails, time, qrLink)
//
// Import the default + named export together:
import printInvoiceSix,    { generateInvoiceHTML as invoiceHTML }    from '@/utils/prints/salesInvoicePrints/invoicePrintSix';
import printQuotationOne,  { generateQuotationHTML as quotationHTML }  from '@/utils/prints/salesQuotationPtints/salesQuotationPrintOne';
// ↓ Add more as you create PDF-capable print files:
// import printSalesOrder,    { generateQuotationHTML as salesOrderHTML }  from '@/utils/prints/salesOrderPrints/salesOrderPrintOne';
// import printProforma,      { generateQuotationHTML as proformaHTML }     from '@/utils/prints/proformaPrints/proformaPrintOne';
// import printDeliveryNote,  { generateQuotationHTML as deliveryNoteHTML } from '@/utils/prints/deliveryNotePrints/deliveryNotePrintOne';
// import printSalesReturn,   { generateQuotationHTML as salesReturnHTML }  from '@/utils/prints/salesReturnPrints/salesReturnPrintOne';

// ── Document configuration map ────────────────────────────────────────────────
/**
 * Each entry describes how to fetch + render a specific document type.
 *
 * apiPath      {string|fn}  – path after the base domain  OR  a function
 *                             (masterId) => string  for dynamic paths.
 * taxApiPath   {string}     – public endpoint that returns tax masters.
 * detailsKey   {string}     – key inside data that holds the line items array.
 * numberField  {string}     – field name that holds the human-readable doc number.
 * htmlFn       {fn}         – async (data, branchDetails, time) => HTML string.
 * printFn      {fn}         – (data, branchDetails, time, qrLink) => void.
 */
const DOCUMENT_CONFIG = {
    'Sales Invoice': {
        apiPath:     (id) => `get-sales-byId-print/${id}`,
        taxApiPath:  'tax-masters-print',
        detailsKey:  'salesDetails',
        numberField: 'invoiceNo',
        htmlFn:      invoiceHTML,
        printFn:     printInvoiceSix,
    },
    'Sales Quotation': {
        apiPath:     (id) => `get-sales-quotation-byId-print/${id}`,
        taxApiPath:  'tax-masters-print',
        detailsKey:  'quotationDetails',
        numberField: 'quotationNo',
        htmlFn:      quotationHTML,
        printFn:     printQuotationOne,
    },
    // ── Uncomment / add when the corresponding print files are ready ──────────
    // 'Sales Order': {
    //     apiPath:     (id) => `get-sales-order-byId-print/${id}`,
    //     taxApiPath:  'tax-masters-print',
    //     detailsKey:  'orderDetails',
    //     numberField: 'orderNo',
    //     htmlFn:      salesOrderHTML,
    //     printFn:     printSalesOrder,
    // },
    // 'Proforma Invoice': {
    //     apiPath:     (id) => `get-proforma-byId-print/${id}`,
    //     taxApiPath:  'tax-masters-print',
    //     detailsKey:  'proformaDetails',
    //     numberField: 'proformaNo',
    //     htmlFn:      proformaHTML,
    //     printFn:     printProforma,
    // },
    // 'Delivery Note': {
    //     apiPath:     (id) => `get-delivery-note-byId-print/${id}`,
    //     taxApiPath:  'tax-masters-print',
    //     detailsKey:  'deliveryNoteDetails',
    //     numberField: 'deliveryNoteNo',
    //     htmlFn:      deliveryNoteHTML,
    //     printFn:     printDeliveryNote,
    // },
    // 'Sales Return': {
    //     apiPath:     (id) => `get-sales-return-byId-print/${id}`,
    //     taxApiPath:  'tax-masters-print',
    //     detailsKey:  'returnDetails',
    //     numberField: 'returnNo',
    //     htmlFn:      salesReturnHTML,
    //     printFn:     printSalesReturn,
    // },
};

// ── Normalise line-item numbers ────────────────────────────────────────────────
const normaliseDetails = (items, taxes) =>
    (items || []).map((item) => {
        const taxInfo = taxes.find((t) => t.taxId === item.taxId);
        return {
            ...item,
            productName:        item?.productname || item?.productName || '',
            taxRate:            taxInfo ? parseFloat(taxInfo.rate) : 0,
            qty:                parseFloat(item.qty)               || 0,
            freeQty:            item.freeQty ? parseFloat(item.freeQty) : null,
            rate:               parseFloat(item.rate)              || 0,
            lineDiscountWithTax:parseFloat(item.lineDiscountWithTax) || 0,
            inclusiveRate:      item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
            discountPercentage: parseFloat(item.discountPercentage) || 0,
            PurchaseRate:       parseFloat(item.PurchaseRate)       || 0,
            taxAmount:          parseFloat(item.taxAmount)          || 0,
            grossAmount:        parseFloat(item.grossAmount)        || 0,
            netAmount:          parseFloat(item.netAmount)          || 0,
            amount:             parseFloat(item.amount)             || 0,
        };
    });

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {string} props.documentType  - Must be a key of DOCUMENT_CONFIG
 */
const DocumentPDF = ({ documentType = 'Sales Invoice' }) => {
    const { masterId } = useParams();           // route param name must be :masterId
    const { selectedBranchDetails } = useAuth();
    const iframeRef = useRef(null);

    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);
    const [docData,     setDocData]     = useState(null);
    const [htmlContent, setHtmlContent] = useState('');

    const customerCode  = getCustomerCodeFromQuery();
    const CURRENT_DOMAIN = getDomainBySlno(`${customerCode}123456`);

    const config = DOCUMENT_CONFIG[documentType];

    // ── 1. Fetch document data ────────────────────────────────────────────────
    useEffect(() => {
        if (!masterId || !config) return;

        const fetch = async () => {
            try {
                setLoading(true);

                const [docRes, taxRes] = await Promise.all([
                    axios.get(`${CURRENT_DOMAIN}/Api/public/api/${config.apiPath(masterId)}`),
                    axios.get(`${CURRENT_DOMAIN}/Api/public/api/${config.taxApiPath}`),
                ]);
                

                const raw   = docRes.data.data;
                const taxes = taxRes.data.data;

                const processed = {
                    ...raw,
                    date:           parseDateFromAPI(raw.date),
                    [config.detailsKey]: normaliseDetails(raw[config.detailsKey], taxes),
                };

                setDocData(processed);
            } catch (err) {
                console.error('DocumentPDF fetch error:', err);
                setError('Failed to load document. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetch();
    }, [masterId, config, CURRENT_DOMAIN]);

    // ── 2. Build preview HTML ─────────────────────────────────────────────────
    useEffect(() => {
        if (!docData || loading || !config) return;

        const build = async () => {
            const time = new Date(docData.date).toLocaleTimeString('en-US', {
                hour12: true, hour: '2-digit', minute: '2-digit',
            });
            try {
                const html = await config.htmlFn(docData, selectedBranchDetails, time);
                setHtmlContent(html);
            } catch (err) {
                console.error('DocumentPDF HTML build error:', err);
                setError('Failed to render document preview.');
            }
        };

        build();
    }, [docData, loading, selectedBranchDetails, config]);

    // ── 3. Write HTML into iframe ─────────────────────────────────────────────
    useEffect(() => {
        if (!htmlContent || !iframeRef.current) return;
        const doc =
            iframeRef.current.contentDocument ||
            iframeRef.current.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(htmlContent);
            doc.close();
        }
    }, [htmlContent]);

    // ── 4. Print handler ──────────────────────────────────────────────────────
    const handlePrint = () => {
        if (!docData || !config) return;
        const time = new Date(docData.date).toLocaleTimeString('en-US', {
            hour12: true, hour: '2-digit', minute: '2-digit',
        });
        config.printFn(docData, selectedBranchDetails, time, docData.qr_link);
    };

    // ── 5. Render ─────────────────────────────────────────────────────────────
    if (!config) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Unknown Document Type</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        "{documentType}" is not configured in DocumentPDF.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className=""><Preloader /></div>;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700 dark:text-gray-300">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const docNumber = docData?.[config.numberField];

    return (
        <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex flex-col">
            {/* Top action bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 shadow">
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {documentType}:&nbsp;
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{docNumber}</span>
                </span>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print / Download PDF
                </button>
            </div>

            {/* Invoice iframe preview */}
            <div className="flex-1 flex justify-center py-6 px-4">
                {htmlContent ? (
                    <iframe
                        ref={iframeRef}
                        title={`${documentType} Preview`}
                        style={{
                            width:     '210mm',
                            minHeight: '297mm',
                            height:    'auto',
                            border:    'none',
                            background:'white',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                            borderRadius: '4px',
                            display:   'block',
                        }}
                        scrolling="no"
                        onLoad={(e) => {
                            try {
                                const body = e.target.contentDocument?.body;
                                if (body) e.target.style.height = body.scrollHeight + 'px';
                            } catch (_) {}
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center" style={{ minHeight: '297mm' }}>
                        <Preloader />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentPDF;