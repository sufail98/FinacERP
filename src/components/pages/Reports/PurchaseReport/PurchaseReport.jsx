// src/components/pages/Reports/PurchaseReport/PurchaseReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingBag } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseReportFilter from './PurchaseReportFilter';
import useReportExport from '@/hooks/useReportExport';

const PurchaseReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [supplierData, setSupplierData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        ledgerId: 0,
        costCentreId: 0,
        condition: 'All',
        dueOn: null,
        isAccountOnly: false,
        isAccountsPosting: false,
        paymentMode: 'All',
        mode: 'Summary'
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [suppliersRes, costCentreRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } }))
            ]);
            setSupplierData(suppliersRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // ─── Column definitions ───────────────────────────────────────────────────────

    // Summary columns — one row per invoice, no product fields
    const summaryColumns = useMemo(() => [
        { key: 'PurchaseDate',      label: t('Date'),           align: 'center', width: '110' },
        { key: 'PurchaseNo',        label: t('Invoice No'),     align: 'left',   width: '100' },
        { key: 'AccountLedger',     label: t('Supplier'),       align: 'left',   width: '200' },
        { key: 'CostCentre',        label: t('Cost Centre'),    align: 'left',   width: '110' },
        { key: 'VendorInvoiceNo',   label: t('Vendor Inv No'),  align: 'left',   width: '110' },
        { key: 'PaymentMode',       label: t('Payment Mode'),   align: 'center', width: '110' },
        { key: 'TaxableAmt',        label: t('Taxable Amt'),    align: 'right',  width: '120' },
        { key: 'BillDiscount',      label: t('Discount'),       align: 'right',  width: '100' },
        { key: 'TotalTax',          label: t('Tax Amount'),     align: 'right',  width: '110' },
        { key: 'RoundOff',          label: t('Round Off'),      align: 'right',  width: '90'  },
        { key: 'BillAmount',        label: t('Bill Amount'),    align: 'right',  width: '120' },
        { key: 'PaidAmount',        label: t('Paid'),           align: 'right',  width: '110' },
        { key: 'Balance',           label: t('Balance'),        align: 'right',  width: '100' },
        { key: 'DueDate',           label: t('Due Date'),       align: 'center', width: '100' },
        { key: 'OrderNoOrReceiptNo',label: t('Ref Type'),       align: 'center', width: '100' },
    ], [t]);

    // Detailed columns — item-level rows, header fields will be merged
    const detailedColumns = useMemo(() => [
        { key: 'PurchaseDate',    label: t('Date'),         align: 'center', width: '110' },
        { key: 'PurchaseNo',      label: t('Invoice No'),   align: 'left',   width: '100' },
        { key: 'AccountLedger',   label: t('Supplier'),     align: 'left',   width: '170' },
        { key: 'CostCentre',      label: t('Cost Centre'),  align: 'left',   width: '100' },
        { key: 'ProductCode',     label: t('Item Code'),    align: 'left',   width: '100' },
        { key: 'productName',     label: t('Product'),      align: 'left',   width: '200' },
        { key: 'Unit',            label: t('Unit'),         align: 'center', width: '70'  },
        { key: 'qty',             label: t('Qty'),          align: 'right',  width: '80'  },
        { key: 'rate',            label: t('Rate'),         align: 'right',  width: '100' },
        { key: 'Gross',           label: t('Gross Amt'),    align: 'right',  width: '110' },
        { key: 'DiscPer',         label: t('Disc %'),       align: 'right',  width: '80'  },
        { key: 'TaxName',         label: t('Tax'),          align: 'left',   width: '100' },
        { key: 'TaxAmt',          label: t('Tax Amt'),      align: 'right',  width: '100' },
        { key: 'Amount',          label: t('Net Amount'),   align: 'right',  width: '110' },
        { key: 'BillAmount',      label: t('Bill Amt'),     align: 'right',  width: '110' },
    ], [t]);

    // All available columns for the column selector (Detailed mode only)
    const allColumns = [
        { key: 'PurchaseDate',      label: t('Date'),           defaultVisible: true,  minWidth: '90px',  align: 'center' },
        { key: 'PurchaseNo',        label: t('Invoice No'),     defaultVisible: true,  minWidth: '90px',  align: 'left' },
        { key: 'AccountLedger',     label: t('Supplier'),       defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'CostCentre',        label: t('Cost Centre'),    defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'ProductCode',       label: t('Item Code'),      defaultVisible: true,  minWidth: '90px',  align: 'left' },
        { key: 'BarCode',           label: t('Barcode'),        defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'partNo',            label: t('Part No'),        defaultVisible: false, minWidth: '80px',  align: 'left' },
        { key: 'productName',       label: t('Product'),        defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'Unit',              label: t('Unit'),           defaultVisible: true,  minWidth: '60px',  align: 'center' },
        { key: 'qty',               label: t('Qty'),            defaultVisible: true,  minWidth: '70px',  align: 'right' },
        { key: 'rate',              label: t('Rate'),           defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'Gross',             label: t('Gross Amt'),      defaultVisible: false, minWidth: '100px', align: 'right' },
        { key: 'DiscPer',           label: t('Disc %'),         defaultVisible: false, minWidth: '70px',  align: 'right' },
        { key: 'TaxName',           label: t('Tax'),            defaultVisible: false, minWidth: '90px',  align: 'left' },
        { key: 'TaxAmt',            label: t('Tax Amt'),        defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'Amount',            label: t('Net Amount'),     defaultVisible: true,  minWidth: '100px', align: 'right' },
        { key: 'BillAmount',        label: t('Bill Amt'),       defaultVisible: true,  minWidth: '100px', align: 'right' },
        { key: 'VendorInvoiceNo',   label: t('Vendor Inv No'),  defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'PaymentMode',       label: t('Payment Mode'),   defaultVisible: false, minWidth: '100px', align: 'center' },
        { key: 'DueDate',           label: t('Due Date'),       defaultVisible: false, minWidth: '90px',  align: 'center' },
        { key: 'OrderNoOrReceiptNo',label: t('Ref Type'),       defaultVisible: false, minWidth: '90px',  align: 'center' },
        { key: 'Narration',         label: t('Narration'),      defaultVisible: false, minWidth: '150px', align: 'left',  wrap: true },
    ];

    // Column visibility state (Detailed mode only)
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => { initial[col.key] = col.defaultVisible; });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    };

    // Active columns: Summary = fixed set, Detailed = filtered by visibility
    const activeColumns = useMemo(() => {
        if (filters.mode === 'Summary') return summaryColumns;
        return detailedColumns.filter(col => visibleColumns[col.key] !== false);
    }, [filters.mode, summaryColumns, detailedColumns, visibleColumns]);

    // ─── Columns merged (rowspan) in Detailed mode ────────────────────────────────
    // Invoice-header fields that are identical across all item rows of the same invoice
    const mergedColumnsInDetailed = [
        'SNo', 'PurchaseDate', 'PurchaseNo', 'AccountLedger', 'CostCentre',
        'VendorInvoiceNo', 'PaymentMode', 'BillAmount', 'PaidAmount',
        'Balance', 'DueDate', 'OrderNoOrReceiptNo', 'Narration'
    ];

    // ─── Fetch report ─────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                fromDate:          `${filters.fromDate} 00:00:00`,
                toDate:            `${filters.toDate} 23:59:59`,
                ledgerId:          filters.ledgerId || 0,
                branchId:          Number(selectedBranchId),
                orderMasterId:     0,
                receiptMasterId:   0,
                currencyId:        currentCurrency?.currencyId || 1,
                condition:         filters.condition,
                dueOn:             filters.condition === 'Due' && filters.dueOn
                                       ? `${filters.dueOn} 00:00:00`
                                       : null,
                isAccountOnly:     filters.isAccountOnly,
                userId:            userId || 0,
                costCentreId:      filters.costCentreId || 0,
                isAccountsPosting: filters.isAccountsPosting,
                paymentMode:       filters.paymentMode,
                mode:              filters.mode
            };

            const response = await axiosInstance.post("purchase-report", payload);
            const rawData = response.data?.data || [];

            if (Array.isArray(rawData) && rawData.length > 0) {
                const formattedData = rawData.map((row, index) => ({
                    ...row,
                    SNo: row.SlNo || (index + 1)
                }));
                setReportData(formattedData);
            } else {
                setReportData([]);
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('No purchase records found for the selected filters')
                });
            }
        } catch (error) {
            console.error("❌ Purchase Report Error:", error);
            setReportData(null);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || t('Failed to fetch purchase report')
            });
        } finally {
            setLoading(false);
        }
    };

    // ─── Footer totals ────────────────────────────────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const sumOf = (...keys) => reportData.reduce((acc, row) => {
            for (const k of keys) {
                const v = parseFloat(row[k]);
                if (!isNaN(v)) return acc + v;
            }
            return acc;
        }, 0);

        if (filters.mode === 'Summary') {
            return {
                SNo:              '',
                PurchaseDate:     '',
                PurchaseNo:       <strong>{t('Total')}</strong>,
                AccountLedger:    '',
                CostCentre:       '',
                VendorInvoiceNo:  '',
                PaymentMode:      '',
                TaxableAmt:       sumOf('TaxableAmt').toFixed(decimalPart),
                BillDiscount:     sumOf('BillDiscount').toFixed(decimalPart),
                TotalTax:         sumOf('TotalTax').toFixed(decimalPart),
                RoundOff:         sumOf('RoundOff').toFixed(decimalPart),
                BillAmount:       sumOf('BillAmount').toFixed(decimalPart),
                PaidAmount:       sumOf('PaidAmount').toFixed(decimalPart),
                Balance:          sumOf('Balance').toFixed(decimalPart),
                DueDate:          '',
                OrderNoOrReceiptNo: ''
            };
        }

        // Detailed — sum item-level numeric fields
        return {
            SNo:              '',
            PurchaseDate:     '',
            PurchaseNo:       <strong>{t('Total')}</strong>,
            AccountLedger:    '',
            CostCentre:       '',
            ProductCode:      '',
            BarCode:          '',
            partNo:           '',
            productName:      '',
            Unit:             '',
            qty:              sumOf('qty').toFixed(3),
            rate:             '',
            Gross:            sumOf('Gross').toFixed(decimalPart),
            DiscPer:          '',
            TaxName:          '',
            TaxAmt:           sumOf('TaxAmt').toFixed(decimalPart),
            Amount:           sumOf('Amount').toFixed(decimalPart),
            BillAmount:       sumOf('BillAmount').toFixed(decimalPart),
            VendorInvoiceNo:  '',
            PaymentMode:      '',
            DueDate:          '',
            OrderNoOrReceiptNo: '',
            Narration:        ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.mode]);

    // ─── Cell renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ── Numeric fields ──
        const itemNumericKeys   = ['qty', 'rate', 'Gross', 'DiscPer', 'TaxAmt', 'Amount'];
        const headerNumericKeys = ['TaxableAmt', 'BillDiscount', 'TotalTax', 'RoundOff', 'BillAmount', 'PaidAmount', 'Balance'];

        if (itemNumericKeys.includes(key) || headerNumericKeys.includes(key)) {
            const num = parseFloat(value);
            if (isNaN(num) || value === null) {
                return <div className="text-right text-gray-400">-</div>;
            }
            if (num === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            if (key === 'Amount' || key === 'BillAmount') {
                return (
                    <div className="text-right text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                        {num.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'TaxAmt' || key === 'TotalTax') {
                return (
                    <div className="text-right text-orange-600 dark:text-orange-400 tabular-nums">
                        {num.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'BillDiscount' || key === 'DiscPer') {
                return (
                    <div className="text-right text-green-600 dark:text-green-400 tabular-nums">
                        {num.toFixed(decimalPart)}{key === 'DiscPer' ? '%' : ''}
                    </div>
                );
            }
            if (key === 'Balance') {
                return (
                    <div className={`text-right tabular-nums font-medium ${num > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                        {num.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'PaidAmount') {
                return (
                    <div className="text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {num.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'qty') {
                return (
                    <div className="text-right text-purple-600 dark:text-purple-400 font-medium tabular-nums">
                        {num.toFixed(3)}
                    </div>
                );
            }
            return <div className="text-right tabular-nums">{num.toFixed(decimalPart)}</div>;
        }

        // ── Invoice / Purchase No ──
        if (key === 'PurchaseNo') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // ── Product Code / Barcode / Part No ──
        if (key === 'ProductCode' || key === 'BarCode' || key === 'partNo') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Vendor Invoice No ──
        if (key === 'VendorInvoiceNo') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Tax Name ──
        if (key === 'TaxName') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px]">
                    {value}
                </span>
            );
        }

        // ── Payment Mode ──
        if (key === 'PaymentMode') {
            if (!value) return <span className="text-gray-400">-</span>;
            const colorMap = {
                'cash':   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'bank':   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'credit': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            };
            const colorClass = colorMap[value?.toLowerCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${colorClass}`}>
                    {value}
                </span>
            );
        }

        // ── Ref Type (OrderNoOrReceiptNo) ──
        if (key === 'OrderNoOrReceiptNo') {
            if (!value || value === 'NA' || value === '') return <span className="text-gray-400">-</span>;
            const colorMap = {
                'Order':   'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                'Reciept': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
                'Receipt': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
            };
            const colorClass = colorMap[value] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {value}
                </span>
            );
        }

        // ── Cost Centre ──
        if (key === 'CostCentre') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px]">
                    {value}
                </span>
            );
        }

        // ── Date fields ──
        if (key === 'PurchaseDate' || key === 'DueDate') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ── Null-safe defaults ──
        if (key === 'AccountLedger' || key === 'Narration') {
            return value || <span className="text-gray-400">-</span>;
        }

        return value ?? '-';
    };

    // ─── Export ───────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.mode === 'Summary') {
            const exportData = reportData.map((row, index) => ({
                SNo:            index + 1,
                Date:           row.PurchaseDate      || '',
                InvoiceNo:      row.PurchaseNo         || '',
                Supplier:       row.AccountLedger      || '',
                CostCentre:     row.CostCentre         || '',
                VendorInvNo:    row.VendorInvoiceNo    || '',
                PaymentMode:    row.PaymentMode        || '',
                TaxableAmt:     Number(row.TaxableAmt   || 0).toFixed(decimalPart),
                Discount:       Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxAmount:      Number(row.TotalTax     || 0).toFixed(decimalPart),
                RoundOff:       Number(row.RoundOff     || 0).toFixed(decimalPart),
                BillAmount:     Number(row.BillAmount   || 0).toFixed(decimalPart),
                PaidAmount:     Number(row.PaidAmount   || 0).toFixed(decimalPart),
                Balance:        Number(row.Balance      || 0).toFixed(decimalPart),
                DueDate:        row.DueDate             || '',
                RefType:        row.OrderNoOrReceiptNo  || ''
            }));

            return {
                fileName:  'Purchase_Summary_Report',
                sheetName: 'Summary',
                title:     t('Purchase Summary Report'),
                subtitle:  `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo',          label: '#',             align: 'center', width: 5  },
                    { key: 'Date',         label: t('Date'),       align: 'center', width: 12 },
                    { key: 'InvoiceNo',    label: t('Invoice No'), align: 'left',   width: 10 },
                    { key: 'Supplier',     label: t('Supplier'),   align: 'left',   width: 20 },
                    { key: 'CostCentre',   label: t('Cost Centre'),align: 'left',   width: 12 },
                    { key: 'VendorInvNo',  label: t('Vendor Inv'), align: 'left',   width: 10 },
                    { key: 'PaymentMode',  label: t('Payment'),    align: 'center', width: 10 },
                    { key: 'TaxableAmt',   label: t('Taxable'),    align: 'right',  width: 12 },
                    { key: 'Discount',     label: t('Discount'),   align: 'right',  width: 10 },
                    { key: 'TaxAmount',    label: t('Tax Amt'),    align: 'right',  width: 10 },
                    { key: 'RoundOff',     label: t('Round Off'),  align: 'right',  width: 9  },
                    { key: 'BillAmount',   label: t('Bill Amt'),   align: 'right',  width: 12 },
                    { key: 'PaidAmount',   label: t('Paid'),       align: 'right',  width: 10 },
                    { key: 'Balance',      label: t('Balance'),    align: 'right',  width: 10 },
                    { key: 'DueDate',      label: t('Due Date'),   align: 'center', width: 10 },
                    { key: 'RefType',      label: t('Ref Type'),   align: 'center', width: 9  }
                ]
            };
        }

        // Detailed export — only visible columns
        const visibleColumnsList = allColumns.filter(col => visibleColumns[col.key]);

        const exportData = reportData.map((row, index) => {
            const exportRow = { SNo: row.SNo || index + 1 };
            visibleColumnsList.forEach(col => {
                const numericKeys = ['qty', 'rate', 'Gross', 'DiscPer', 'TaxAmt', 'Amount', 'BillAmount'];
                if (numericKeys.includes(col.key)) {
                    exportRow[col.key] = Number(row[col.key] || 0).toFixed(
                        col.key === 'qty' ? 3 : decimalPart
                    );
                } else {
                    exportRow[col.key] = row[col.key] || '';
                }
            });
            return exportRow;
        });

        return {
            fileName:  'Purchase_Detailed_Report',
            sheetName: 'Detailed',
            title:     t('Purchase Detailed Report'),
            subtitle:  `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                ...visibleColumnsList.map(col => ({
                    key:   col.key,
                    label: col.label,
                    align: col.align || 'left',
                    width: Math.max(8, Math.round(parseInt(col.minWidth) / 6))
                }))
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); return; }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); return; }
        exportGenericToCsv(options);
    };

    // ─── Filter handlers ──────────────────────────────────────────────────────────
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate:          dates.fromDate,
            toDate:            dates.toDate,
            ledgerId:          0,
            costCentreId:      0,
            condition:         'All',
            dueOn:             null,
            isAccountOnly:     false,
            isAccountsPosting: false,
            paymentMode:       'All',
            mode:              'Summary'
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Dropdown options ─────────────────────────────────────────────────────────
    const supplierOptions = useMemo(() => [
        { label: t('All Suppliers'), value: 0 },
        ...supplierData.map(s => ({ label: s.ledgerName, value: s.ledgerId }))
    ], [supplierData, t]);

    const costCentreOptions = useMemo(() => [
        { label: t('All Cost Centres'), value: 0 },
        ...costCentreData.map(cc => ({
            label: cc.CostCentre || cc.costCentreName || cc.CostCentreName,
            value: cc.costCentreId || cc.CostCentreId
        }))
    ], [costCentreData, t]);

    const conditionOptions = [
        { label: t('All'),     value: 'All'     },
        { label: t('Paid'),    value: 'Full'    },
        { label: t('Partial'), value: 'Partial' },
        { label: t('Unpaid'),  value: 'Unpaid'  },
        { label: t('Due'),     value: 'Due'     }
    ];

    const paymentModeOptions = [
        { label: t('All'),    value: 'All'    },
        { label: t('Cash'),   value: 'Cash'   },
        { label: t('Bank'),   value: 'Bank'   },
        { label: t('Credit'), value: 'Credit' }
    ];

    const reportTitle = filters.mode === 'Summary'
        ? t('Purchase Summary Report')
        : t('Purchase Detailed Report');

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("Reports"), url: "#" }, { title: t("Purchase Report"), url: "#" }]}
                    heading={{ icon: ShoppingBag, title: t("Purchase Report") }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("Reports"), url: "#" }, { title: t("Purchase Report"), url: "#" }]}
                    heading={{ icon: ShoppingBag, title: t("Purchase Report") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: t("Reports"), url: "#" }, { title: t("Purchase Report"), url: "#" }]}
                heading={{ icon: ShoppingBag, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label:         t('Export Report')
                } : null}
            />

            <div className="flex gap-2 px-1">

                {/* ✅ Column Selector Sidebar — only in Detailed mode */}
                {filters.mode === 'Detailed' && (
                    <div className="w-[130px] flex-shrink-0">
                        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 border border-gray-200 dark:border-gray-700 sticky top-2">
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                    {t('Columns')}
                                </span>
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                    {checkedCount}
                                </span>
                            </div>
                            <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {allColumns.map((column) => (
                                    <label
                                        key={column.key}
                                        className="flex items-center gap-1.5 py-1 px-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[column.key]}
                                            onChange={() => toggleColumn(column.key)}
                                            className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0"
                                        />
                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate">
                                            {column.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ Main Content */}
                <div className="flex-1 min-w-0">
                    <PurchaseReportFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        supplierOptions={supplierOptions}
                        costCentreOptions={costCentreOptions}
                        conditionOptions={conditionOptions}
                        paymentModeOptions={paymentModeOptions}
                        loading={loading}
                        resetFilters={resetFilters}
                    />

                    <ContentTable
                        columns={[
                            { key: 'SNo', label: '#', align: 'center', width: '50' },
                            ...activeColumns
                        ]}
                        data={reportData || []}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        staticSearchable={true}
                        serverPagination={false}
                        tableId="purchase-report-table"
                        pageSize={80}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 280px)"
                        stickyActions={false}
                        // ✅ Row merging only in Detailed mode — group by PurchaseNo
                        groupBy={filters.mode === 'Detailed' ? 'PurchaseNo' : null}
                        mergedColumns={filters.mode === 'Detailed' ? mergedColumnsInDetailed : []}
                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseReport;