// src/components/pages/Reports/PurchaseOrderReport/PurchaseOrderReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingCart } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseOrderReportFilter from './PurchaseOrderReportFilter';
import useReportExport from '@/hooks/useReportExport';
import ContentTable from '@/components/common/ContentTable';
import { useNavigate } from 'react-router-dom';

const PurchaseOrderReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data
    const [supplierData, setSupplierData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Order Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();
 const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.ordermasterid) return;
        navigate(`/transaction/purchase-order/edit-purchase-order/${row.ordermasterid}`);
    };
    const getDefaultDates = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDayOfMonth.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        dueOn: null,
        ledgerId: 'All',
        costCentreId: 'All',
        mode: 'Summary'
    });

    // ─── Column definitions ───────────────────────────────────────────────────────

    // Summary columns (order-level, no product details)
    const summaryColumns = useMemo(() => [
        { key: 'orderdate',    label: t('Date'),         align: 'center', width: '100' },
        { key: 'orderno',      label: t('Order No'),     align: 'left',   width: '100' },
        { key: 'ledgername',   label: t('Supplier'),     align: 'left',   width: '180' },
        { key: 'costcentre',   label: t('Cost Centre'),  align: 'left',   width: '120' },
        { key: 'subtotal',     label: t('Sub Total'),    align: 'right',  width: '120' },
        { key: 'billdiscount', label: t('Discount'),     align: 'right',  width: '100' },
        { key: 'taxableamt',   label: t('Taxable Amt'),  align: 'right',  width: '120' },
        { key: 'totaltax',     label: t('Tax Amount'),   align: 'right',  width: '120' },
        { key: 'roundoff',     label: t('Round Off'),    align: 'right',  width: '100' },
        { key: 'totalamount',  label: t('Grand Total'),  align: 'right',  width: '120' },
        { key: 'duedate',      label: t('Due Date'),     align: 'center', width: '100' },
        { key: 'pendingstatus',label: t('Status'),       align: 'center', width: '100' },
    ], [t]);

    // Detailed columns (item-level with merged header fields)
    const detailedColumns = useMemo(() => [
        { key: 'orderdate',          label: t('Date'),         align: 'center', width: '100' },
        { key: 'orderno',            label: t('Order No'),     align: 'left',   width: '100' },
        { key: 'ledgername',         label: t('Supplier'),     align: 'left',   width: '160' },
        { key: 'costcentre',         label: t('Cost Centre'),  align: 'left',   width: '120' },
        { key: 'productcode',        label: t('Item Code'),    align: 'left',   width: '100' },
        { key: 'productname',        label: t('Product'),      align: 'left',   width: '200' },
        { key: 'unitname',           label: t('Unit'),         align: 'center', width: '70'  },
        { key: 'qty',                label: t('Qty'),          align: 'right',  width: '80'  },
        { key: 'rate',               label: t('Rate'),         align: 'right',  width: '100' },
        { key: 'grossamount',        label: t('Gross Amt'),    align: 'right',  width: '110' },
        { key: 'discountpercentage', label: t('Disc %'),       align: 'right',  width: '80'  },
        { key: 'taxamount',          label: t('Tax Amt'),      align: 'right',  width: '100' },
        { key: 'netamount',          label: t('Net Amount'),   align: 'right',  width: '110' },
        { key: 'pendingstatus',      label: t('Status'),       align: 'center', width: '100' },
    ], [t]);

    // All available columns for the column selector (Detailed mode only)
    const allColumns = [
        { key: 'orderdate',          label: t('Date'),         defaultVisible: true,  minWidth: '90px',  align: 'center' },
        { key: 'orderno',            label: t('Order No'),     defaultVisible: true,  minWidth: '90px',  align: 'left' },
        { key: 'ledgername',         label: t('Supplier'),     defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'costcentre',         label: t('Cost Centre'),  defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'productcode',        label: t('Product Code'), defaultVisible: true,  minWidth: '100px', align: 'left' },
        { key: 'productname',        label: t('Product'),      defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'partno',             label: t('Part No'),      defaultVisible: false, minWidth: '80px',  align: 'left' },
        { key: 'barcode',            label: t('Barcode'),      defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'unitname',           label: t('Unit'),         defaultVisible: true,  minWidth: '60px',  align: 'center' },
        { key: 'qty',                label: t('Qty'),          defaultVisible: true,  minWidth: '70px',  align: 'right' },
        { key: 'rate',               label: t('Rate'),         defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'discountpercentage', label: t('Disc %'),       defaultVisible: false, minWidth: '70px',  align: 'right' },
        { key: 'grossamount',        label: t('Gross Amt'),    defaultVisible: false, minWidth: '100px', align: 'right' },
        { key: 'taxamount',          label: t('Tax Amt'),      defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'netamount',          label: t('Net Amount'),   defaultVisible: true,  minWidth: '100px', align: 'right' },
        { key: 'pendingstatus',      label: t('Status'),       defaultVisible: true,  minWidth: '90px',  align: 'center' },
        { key: 'duedate',            label: t('Due Date'),     defaultVisible: false, minWidth: '90px',  align: 'center' },
        { key: 'narration',          label: t('Narration'),    defaultVisible: false, minWidth: '150px', align: 'left',  wrap: true },
        { key: 'createduser',        label: t('Created By'),   defaultVisible: false, minWidth: '100px', align: 'left' },
    ];

    // Column visibility state (used only in Detailed mode)
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => { initial[col.key] = col.defaultVisible; });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    };

    // Active columns: Summary uses fixed set, Detailed respects visibility toggles
    const activeColumns = useMemo(() => {
        if (filters.mode === 'Summary') return summaryColumns;
        return detailedColumns.filter(col => visibleColumns[col.key] !== false);
    }, [filters.mode, summaryColumns, detailedColumns, visibleColumns]);

    // ─── Columns that get merged (rowspan) in Detailed mode ──────────────────────
    const mergedColumnsInDetailed = [
        'SNo', 'orderdate', 'orderno', 'ledgername', 'costcentre', 'pendingstatus',
        'duedate', 'narration', 'createduser'
    ];

    // ─── Lifecycle ────────────────────────────────────────────────────────────────
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
            console.error("❌ Error fetching dropdown data:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // ─── Fetch report ─────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const requestBody = {
            fromDate:     filters.fromDate,
            toDate:       filters.toDate,
            condition:    'All',
            dueOn:        filters.dueOn || null,
            ledgerId:     filters.ledgerId,
            branchId:     Number(selectedBranchId),
            currencyId:   currentCurrency?.currencyId || 1,
            userId:       userId || 1,
            costCentreId: filters.costCentreId,
            mode:         filters.mode || 'Summary'
        };

        try {
            const res = await axiosInstance.post("purchase-order-report", requestBody);
            const responseData = res.data.data || res.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: item.rowno || (index + 1)
            }));

            setReportData(dataWithSNo);

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("❌ Purchase Order Report Error:", error);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || error.message
            });
            setReportData(null);
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
                SNo:          '',
                orderdate:    '',
                orderno:      <strong>{t('Total')}</strong>,
                ledgername:   '',
                costcentre:   '',
                subtotal:     sumOf('subtotal').toFixed(decimalPart),
                billdiscount: sumOf('billdiscount').toFixed(decimalPart),
                taxableamt:   sumOf('taxableamt').toFixed(decimalPart),
                totaltax:     sumOf('totaltax').toFixed(decimalPart),
                roundoff:     sumOf('roundoff').toFixed(decimalPart),
                totalamount:  sumOf('totalamount').toFixed(decimalPart),
                duedate:      '',
                pendingstatus:''
            };
        }

        // Detailed mode — sum item-level numeric fields
        return {
            SNo:                '',
            orderdate:          '',
            orderno:            <strong>{t('Total')}</strong>,
            ledgername:         '',
            costcentre:         '',
            productcode:        '',
            productname:        '',
            unitname:           '',
            qty:                sumOf('qty').toFixed(3),
            rate:               '',
            grossamount:        sumOf('grossamount').toFixed(decimalPart),
            discountpercentage: '',
            taxamount:          sumOf('taxamount').toFixed(decimalPart),
            netamount:          sumOf('netamount', 'amount').toFixed(decimalPart),
            pendingstatus:      '',
            duedate:            '',
            narration:          '',
            createduser:        ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.mode]);

    // ─── Cell renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ── Numeric fields ──
        const numericKeys = [
            'qty', 'rate', 'discountpercentage', 'grossamount', 'taxamount', 'netamount',
            'subtotal', 'billdiscount', 'taxableamt', 'totaltax', 'roundoff', 'totalamount'
        ];

        if (numericKeys.includes(key)) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || value === null) {
                return <div className="text-right text-gray-400">-</div>;
            }
            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            if (key === 'netamount' || key === 'totalamount') {
                return (
                    <div className="text-right text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'taxamount' || key === 'totaltax') {
                return (
                    <div className="text-right text-orange-600 dark:text-orange-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'discountpercentage' && numValue > 0) {
                return (
                    <div className="text-right text-green-600 dark:text-green-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}%
                    </div>
                );
            }
            if (key === 'qty') {
                return (
                    <div className="text-right text-purple-600 dark:text-purple-400 font-medium tabular-nums">
                        {numValue.toFixed(3)}
                    </div>
                );
            }
            return <div className="text-right tabular-nums">{numValue.toFixed(decimalPart)}</div>;
        }

        // ── Status badge (pendingstatus is boolean from API) ──
        if (key === 'pendingstatus') {
            // In Summary mode the API returns boolean; in Detailed it's also boolean
            let label = '-';
            let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

            if (value === true || value === 'true') {
                label = t('Pending');
                colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            } else if (value === false || value === 'false') {
                label = t('Completed');
                colorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            } else if (typeof value === 'string') {
                // Handle string status values if API ever returns them
                const colorMap = {
                    'Pending':   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                    'Partial':   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                };
                label = value;
                colorClass = colorMap[value] || colorClass;
            }

            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {label}
                </span>
            );
        }

        // ── Order No ──
        if (key === 'orderno') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // ── Product Code / barcode / partno ──
        if (key === 'productcode' || key === 'barcode' || key === 'partno') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Date fields ──
        if (key === 'orderdate' || key === 'duedate') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ── Null-safe defaults ──
        if (key === 'costcentre' || key === 'narration' || key === 'createduser') {
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
                SNo:          index + 1,
                OrderDate:    row.orderdate    || '',
                OrderNo:      row.orderno      || '',
                Supplier:     row.ledgername   || '',
                CostCentre:   row.costcentre   || '',
                SubTotal:     Number(row.subtotal     || 0).toFixed(decimalPart),
                BillDiscount: Number(row.billdiscount || 0).toFixed(decimalPart),
                TaxableAmt:   Number(row.taxableamt   || 0).toFixed(decimalPart),
                TotalTax:     Number(row.totaltax     || 0).toFixed(decimalPart),
                RoundOff:     Number(row.roundoff     || 0).toFixed(decimalPart),
                GrandAmount:  Number(row.totalamount  || 0).toFixed(decimalPart),
                DueDate:      row.duedate   || '',
                Status:       row.pendingstatus === true ? t('Pending') : row.pendingstatus === false ? t('Completed') : (row.pendingstatus || '')
            }));

            return {
                fileName:  'Purchase_Order_Summary_Report',
                sheetName: 'Summary',
                title:     t('Purchase Order Summary Report'),
                subtitle:  `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo',         label: '#',           align: 'center', width: 5  },
                    { key: 'OrderDate',   label: 'Date',        align: 'center', width: 12 },
                    { key: 'OrderNo',     label: 'Order No',    align: 'left',   width: 12 },
                    { key: 'Supplier',    label: 'Supplier',    align: 'left',   width: 20 },
                    { key: 'CostCentre',  label: 'Cost Centre', align: 'left',   width: 14 },
                    { key: 'SubTotal',    label: 'Sub Total',   align: 'right',  width: 12 },
                    { key: 'BillDiscount',label: 'Discount',    align: 'right',  width: 10 },
                    { key: 'TaxableAmt',  label: 'Taxable Amt', align: 'right',  width: 12 },
                    { key: 'TotalTax',    label: 'Tax Amount',  align: 'right',  width: 12 },
                    { key: 'RoundOff',    label: 'Round Off',   align: 'right',  width: 10 },
                    { key: 'GrandAmount', label: 'Grand Total', align: 'right',  width: 12 },
                    { key: 'DueDate',     label: 'Due Date',    align: 'center', width: 12 },
                    { key: 'Status',      label: 'Status',      align: 'center', width: 10 }
                ]
            };
        }

        // Detailed export
        const exportData = reportData.map((row, index) => ({
            SNo:               index + 1,
            OrderDate:         row.orderdate         || '',
            OrderNo:           row.orderno           || '',
            Supplier:          row.ledgername        || '',
            CostCentre:        row.costcentre        || '',
            ItemCode:          row.productcode       || '',
            Product:           row.productname       || '',
            Unit:              row.unitname          || '',
            Qty:               Number(row.qty              || 0).toFixed(3),
            Rate:              Number(row.rate             || 0).toFixed(decimalPart),
            GrossAmount:       Number(row.grossamount      || 0).toFixed(decimalPart),
            DiscountPct:       row.discountpercentage != null ? Number(row.discountpercentage).toFixed(decimalPart) : '',
            TaxAmount:         Number(row.taxamount        || 0).toFixed(decimalPart),
            NetAmount:         Number(row.netamount || row.amount || 0).toFixed(decimalPart),
            Status:            row.pendingstatus === true ? t('Pending') : row.pendingstatus === false ? t('Completed') : (row.pendingstatus || '')
        }));

        return {
            fileName:  'Purchase_Order_Detailed_Report',
            sheetName: 'Detailed',
            title:     t('Purchase Order Detailed Report'),
            subtitle:  `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',        label: '#',           align: 'center', width: 5  },
                { key: 'OrderDate',  label: 'Date',        align: 'center', width: 12 },
                { key: 'OrderNo',    label: 'Order No',    align: 'left',   width: 12 },
                { key: 'Supplier',   label: 'Supplier',    align: 'left',   width: 20 },
                { key: 'CostCentre', label: 'Cost Centre', align: 'left',   width: 14 },
                { key: 'ItemCode',   label: 'Item Code',   align: 'left',   width: 10 },
                { key: 'Product',    label: 'Product',     align: 'left',   width: 20 },
                { key: 'Unit',       label: 'Unit',        align: 'center', width: 8  },
                { key: 'Qty',        label: 'Qty',         align: 'right',  width: 8  },
                { key: 'Rate',       label: 'Rate',        align: 'right',  width: 10 },
                { key: 'GrossAmount',label: 'Gross Amt',   align: 'right',  width: 12 },
                { key: 'DiscountPct',label: 'Disc %',      align: 'right',  width: 8  },
                { key: 'TaxAmount',  label: 'Tax Amt',     align: 'right',  width: 10 },
                { key: 'NetAmount',  label: 'Net Amount',  align: 'right',  width: 12 },
                { key: 'Status',     label: 'Status',      align: 'center', width: 10 }
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
            fromDate:     dates.fromDate,
            toDate:       dates.toDate,
            dueOn:        null,
            ledgerId:     'All',
            costCentreId: 'All',
            mode:         'Summary'
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Dropdown options ─────────────────────────────────────────────────────────
    const supplierOptions = useMemo(() => [
        { label: t('All Suppliers'), value: 'All' },
        ...supplierData.map(supplier => ({
            label: supplier.ledgerName,
            value: supplier.ledgerId
        }))
    ], [supplierData, t]);

    const costCentreOptions = useMemo(() => [
        { label: t('All Cost Centres'), value: 'All' },
        ...costCentreData.map(cc => ({
            label: cc.CostCentre || cc.costCentreName || cc.CostCentreName,
            value: cc.costCentreId || cc.CostCentreId
        }))
    ], [costCentreData, t]);

    // Dynamic report title
    const reportTitle = filters.mode === 'Summary'
        ? t('Purchase Order Summary Report')
        : t('Purchase Order Detailed Report');

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Purchase Order Report"), url: "#" }
                    ]}
                    heading={{ icon: ShoppingCart, title: reportTitle }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Purchase Order Report"), url: "#" }
                    ]}
                    heading={{ icon: ShoppingCart, title: reportTitle }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Purchase Order Report"), url: "#" }
                ]}
                heading={{ icon: ShoppingCart, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="flex gap-2 px-1">

                {/* ✅ Column Selector Sidebar — only shown in Detailed mode */}
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
                    <PurchaseOrderReportFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        supplierOptions={supplierOptions}
                        costCentreOptions={costCentreOptions}
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
                        tableId="purchase-order-report-table"
                        pageSize={50}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 280px)"
                        stickyActions={false}
                        // ✅ Row merging only in Detailed mode
                        groupBy={filters.mode === 'Detailed' ? 'orderno' : null}
                        mergedColumns={filters.mode === 'Detailed' ? mergedColumnsInDetailed : []}
                                            onRowClick={handleRowClick}

                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderReport;