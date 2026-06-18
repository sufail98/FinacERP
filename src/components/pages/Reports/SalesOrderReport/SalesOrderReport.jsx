// src/components/pages/Reports/SalesOrderReport/SalesOrderReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ClipboardList } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesOrderReportFilters from './SalesOrderReportFilters';
import useReportExport from '@/hooks/useReportExport';
import ContentTable from '@/components/common/ContentTable';
import { useNavigate } from 'react-router-dom';

const SalesOrderReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data
    const [partyData, setPartyData] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);
    const [areaData, setAreaData] = useState([]);
    const [userData, setUserData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Order Report");
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.orderMasterId) return;
        navigate(`/transaction/sales-order/edit-sales-order/${row.orderMasterId}`);
    };
    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

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
        ledgerId: null,
        salesManId: null,
        areaId: null,
        userId: null,
        status: 'Pending',
        partyName: 'All',
        mode: 'Summary'
    });

    // ─── Column definitions ───────────────────────────────────────────────────────

    // Summary columns (order-level, no product details)
    const summaryColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), align: 'center', width: '100' },
        { key: 'OrderNo', label: t('Order No'), align: 'left', width: '100' },
        { key: 'CustomerName', label: t('Customer'), align: 'left', width: '180' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'SubTotal', label: t('Sub Total'), align: 'right', width: '120' },
        { key: 'BillDiscount', label: t('Discount'), align: 'right', width: '100' },
        { key: 'TaxableAmt', label: t('Taxable Amt'), align: 'right', width: '120' },
        { key: 'TotalTax', label: t('Tax Amount'), align: 'right', width: '120' },
        { key: 'GrandAmount', label: t('Grand Total'), align: 'right', width: '120' },
        { key: 'DueDate', label: t('Due Date'), align: 'center', width: '100' },
        { key: 'Status', label: t('Status'), align: 'center', width: '100' },
    ], [t]);

    // Detailed columns (item-level with merged header fields)
    const detailedColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), align: 'center', width: '100' },
        { key: 'OrderNo', label: t('Order No'), align: 'left', width: '100' },
        { key: 'CustomerName', label: t('Customer'), align: 'left', width: '160' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'productCode', label: t('Item Code'), align: 'left', width: '100' },
        { key: 'productName', label: t('Product'), align: 'left', width: '200' },
        { key: 'unitName', label: t('Unit'), align: 'center', width: '70' },
        { key: 'qty', label: t('Qty'), align: 'right', width: '80' },
        { key: 'rate', label: t('Rate'), align: 'right', width: '100' },
        { key: 'grossAmount', label: t('Gross Amt'), align: 'right', width: '110' },
        { key: 'discountPercentage', label: t('Disc %'), align: 'right', width: '80' },
        { key: 'taxName', label: t('Tax'), align: 'left', width: '100' },
        { key: 'taxAmount', label: t('Tax Amt'), align: 'right', width: '100' },
        { key: 'netAmount', label: t('Net Amount'), align: 'right', width: '110' },
        { key: 'Status', label: t('Status'), align: 'center', width: '100' },
    ], [t]);

    // ✅ All available columns for the column selector (Detailed mode only)
    const allColumns = [
        { key: 'Date', label: t('Date'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'OrderNo', label: t('Order No'), defaultVisible: true, minWidth: '90px', align: 'left' },
        { key: 'CustomerName', label: t('Customer'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'CostCentre', label: t('Cost Centre'), defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'productCode', label: t('Product Code'), defaultVisible: true, minWidth: '100px', align: 'left' },
        { key: 'productName', label: t('Product'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'PartNo', label: t('Part No'), defaultVisible: false, minWidth: '80px', align: 'left' },
        { key: 'barcode', label: t('Barcode'), defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'unitName', label: t('Unit'), defaultVisible: true, minWidth: '60px', align: 'center' },
        { key: 'qty', label: t('Qty'), defaultVisible: true, minWidth: '70px', align: 'right' },
        { key: 'rate', label: t('Rate'), defaultVisible: true, minWidth: '90px', align: 'right' },
        { key: 'discountPercentage', label: t('Disc %'), defaultVisible: false, minWidth: '70px', align: 'right' },
        { key: 'grossAmount', label: t('Gross Amt'), defaultVisible: false, minWidth: '100px', align: 'right' },
        { key: 'taxName', label: t('Tax'), defaultVisible: false, minWidth: '80px', align: 'left' },
        { key: 'taxAmount', label: t('Tax Amt'), defaultVisible: true, minWidth: '90px', align: 'right' },
        { key: 'netAmount', label: t('Net Amount'), defaultVisible: true, minWidth: '100px', align: 'right' },
        { key: 'Status', label: t('Status'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'Salesman', label: t('Salesman'), defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'DueDate', label: t('Due Date'), defaultVisible: false, minWidth: '90px', align: 'center' },
        { key: 'Narration', label: t('Narration'), defaultVisible: false, minWidth: '150px', align: 'left', wrap: true }
    ];

    // ✅ Column visibility state (used only in Detailed mode)
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
    // These are the order-header fields repeated across item rows for the same order
    const mergedColumnsInDetailed = [
        'SNo', 'Date', 'OrderNo', 'CustomerName', 'CostCentre', 'Status',
        'Salesman', 'DueDate', 'Narration'
    ];

    // ─── Lifecycle ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        // If already formatted (e.g. "18-May-2026"), return as-is
        if (typeof dateString === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(dateString)) return dateString;
        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const format = generalSettings?.dateformat || 'dd-MM-yyyy';
        return format.replace('dd', dd).replace('MM', MM).replace('yyyy', yyyy);
    };

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [partyRes, salesmanRes, areaRes, userRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer", "Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("areas").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } }))
            ]);

            setPartyData(partyRes.data.data || []);
            setSalesmanData(salesmanRes.data.data || []);
            setAreaData(areaRes.data.data || []);
            setUserData(userRes.data.data || []);
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
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            dueOn: filters.dueOn || null,
            ledgerId: filters.ledgerId || null,
            branchId: parseInt(selectedBranchId) || 1,
            salesManId: filters.salesManId || null,
            currencyId: currentCurrency?.currencyId || 1,
            quotationMasterId: null,
            areaId: filters.areaId || null,
            userId: filters.userId || null,
            status: filters.status || 'Pending',
            partyName: filters.partyName || 'All',
            mode: filters.mode || 'Summary'
        };

        try {
            const res = await axiosInstance.post("sales-order-report", requestBody);

            const responseData = res.data.data || res.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: item.SlNO || (index + 1),
                Date: item.Date || '',   // API returns pre-formatted dates
                DueDate: item.DueDate || ''
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
            console.error("❌ Sales Order Report Error:", error);
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
                SNo: '',
                Date: '',
                OrderNo: <strong>{t('Total')}</strong>,
                CustomerName: '',
                CostCentre: '',
                SubTotal: sumOf('SubTotal').toFixed(decimalPart),
                BillDiscount: sumOf('BillDiscount').toFixed(decimalPart),
                TaxableAmt: sumOf('TaxableAmt').toFixed(decimalPart),
                TotalTax: sumOf('TotalTax').toFixed(decimalPart),
                GrandAmount: sumOf('GrandAmount').toFixed(decimalPart),
                DueDate: '',
                Status: ''
            };
        }

        // Detailed mode — sum item-level numeric fields
        return {
            SNo: '',
            Date: '',
            OrderNo: <strong>{t('Total')}</strong>,
            CustomerName: '',
            CostCentre: '',
            productCode: '',
            productName: '',
            unitName: '',
            qty: sumOf('qty').toFixed(3),
            rate: '',
            grossAmount: sumOf('grossAmount').toFixed(decimalPart),
            discountPercentage: '',
            taxName: '',
            taxAmount: sumOf('taxAmount').toFixed(decimalPart),
            netAmount: sumOf('netAmount', 'amount').toFixed(decimalPart),
            Status: '',
            Salesman: '',
            DueDate: '',
            Narration: ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.mode]);

    // ─── Cell renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ── Numeric fields ──
        const numericKeys = ['qty', 'rate', 'discountPercentage', 'grossAmount', 'taxAmount', 'netAmount',
            'SubTotal', 'BillDiscount', 'TaxableAmt', 'TotalTax', 'GrandAmount'];

        if (numericKeys.includes(key)) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue === null) {
                return <div className="text-right text-gray-400">-</div>;
            }
            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            if (key === 'netAmount' || key === 'GrandAmount') {
                return (
                    <div className="text-right text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'taxAmount' || key === 'TotalTax') {
                return (
                    <div className="text-right text-orange-600 dark:text-orange-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'discountPercentage' && numValue > 0) {
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

        // ── Status badge ──
        if (key === 'Status') {
            const colorMap = {
                'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                'Partial': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            };
            const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {value || '-'}
                </span>
            );
        }

        // ── Order No ──
        if (key === 'OrderNo') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // ── Product Code / barcode / PartNo ──
        if (key === 'productCode' || key === 'barcode' || key === 'PartNo') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Tax Name ──
        if (key === 'taxName') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-[10px]">
                    {value}
                </span>
            );
        }

        // ── Date fields ──
        if (key === 'Date' || key === 'DueDate') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ── Null-safe defaults ──
        if (key === 'Salesman' || key === 'CostCentre' || key === 'Narration') {
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
                SNo: index + 1,
                Date: row.Date || '',
                OrderNo: row.OrderNo || '',
                Customer: row.CustomerName || '',
                CostCentre: row.CostCentre || '',
                SubTotal: Number(row.SubTotal || 0).toFixed(decimalPart),
                BillDiscount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxableAmt: Number(row.TaxableAmt || 0).toFixed(decimalPart),
                TotalTax: Number(row.TotalTax || 0).toFixed(decimalPart),
                GrandAmount: Number(row.GrandAmount || 0).toFixed(decimalPart),
                DueDate: row.DueDate || '',
                Status: row.Status || ''
            }));

            return {
                fileName: 'Sales_Order_Summary_Report',
                sheetName: 'Summary',
                title: t('Sales Order Summary Report'),
                subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: 'Date', align: 'center', width: 12 },
                    { key: 'OrderNo', label: 'Order No', align: 'left', width: 12 },
                    { key: 'Customer', label: 'Customer', align: 'left', width: 20 },
                    { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 14 },
                    { key: 'SubTotal', label: 'Sub Total', align: 'right', width: 12 },
                    { key: 'BillDiscount', label: 'Discount', align: 'right', width: 10 },
                    { key: 'TaxableAmt', label: 'Taxable Amt', align: 'right', width: 12 },
                    { key: 'TotalTax', label: 'Tax Amount', align: 'right', width: 12 },
                    { key: 'GrandAmount', label: 'Grand Total', align: 'right', width: 12 },
                    { key: 'DueDate', label: 'Due Date', align: 'center', width: 12 },
                    { key: 'Status', label: 'Status', align: 'center', width: 10 }
                ]
            };
        }

        // Detailed export
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Date: row.Date || '',
            OrderNo: row.OrderNo || '',
            Customer: row.CustomerName || '',
            CostCentre: row.CostCentre || '',
            ItemCode: row.productCode || '',
            Product: row.productName || '',
            Unit: row.unitName || '',
            Qty: Number(row.qty || 0).toFixed(3),
            Rate: Number(row.rate || 0).toFixed(decimalPart),
            GrossAmount: Number(row.grossAmount || 0).toFixed(decimalPart),
            DiscountPct: row.discountPercentage != null ? Number(row.discountPercentage).toFixed(decimalPart) : '',
            Tax: row.taxName || '',
            TaxAmount: Number(row.taxAmount || 0).toFixed(decimalPart),
            NetAmount: Number(row.netAmount || row.amount || 0).toFixed(decimalPart),
            Status: row.Status || ''
        }));

        return {
            fileName: 'Sales_Order_Detailed_Report',
            sheetName: 'Detailed',
            title: t('Sales Order Detailed Report'),
            subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: 'Date', align: 'center', width: 12 },
                { key: 'OrderNo', label: 'Order No', align: 'left', width: 12 },
                { key: 'Customer', label: 'Customer', align: 'left', width: 20 },
                { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 14 },
                { key: 'ItemCode', label: 'Item Code', align: 'left', width: 10 },
                { key: 'Product', label: 'Product', align: 'left', width: 20 },
                { key: 'Unit', label: 'Unit', align: 'center', width: 8 },
                { key: 'Qty', label: 'Qty', align: 'right', width: 8 },
                { key: 'Rate', label: 'Rate', align: 'right', width: 10 },
                { key: 'GrossAmount', label: 'Gross Amt', align: 'right', width: 12 },
                { key: 'DiscountPct', label: 'Disc %', align: 'right', width: 8 },
                { key: 'Tax', label: 'Tax', align: 'left', width: 10 },
                { key: 'TaxAmount', label: 'Tax Amt', align: 'right', width: 10 },
                { key: 'NetAmount', label: 'Net Amount', align: 'right', width: 12 },
                { key: 'Status', label: 'Status', align: 'center', width: 10 }
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
        // Reset data when switching modes, same as DeliveryNoteDetailedReport
        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            dueOn: null,
            ledgerId: null,
            salesManId: null,
            areaId: null,
            userId: null,
            status: 'Pending',
            partyName: 'All',
            mode: 'Summary'
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Dropdown options ─────────────────────────────────────────────────────────
    const partyOptions = useMemo(() => [
        { label: t('All Parties'), value: null },
        ...partyData.map(party => ({
            label: `${party.ledgerName}${party.ledgerType ? ` (${party.ledgerType})` : ''}`,
            value: party.ledgerId
        }))
    ], [partyData, t]);

    const salesmanOptions = useMemo(() => [
        { label: t('All Salesmen'), value: null },
        ...salesmanData.map(salesman => ({
            label: salesman.employeeName || salesman.name,
            value: salesman.employeeId || salesman.id
        }))
    ], [salesmanData, t]);

    const areaOptions = useMemo(() => [
        { label: t('All Areas'), value: null },
        ...areaData.map(area => ({
            label: area.AreaName,
            value: area.AreaId
        }))
    ], [areaData, t]);

    const userOptions = useMemo(() => [
        { label: t('All Users'), value: null },
        ...userData.map(u => ({
            label: u.userName || u.username || u.name,
            value: u.userId || u.id
        }))
    ], [userData, t]);

    const statusOptions = useMemo(() => [
        { label: t('All'), value: 'All' },
        { label: t('Pending'), value: 'Pending' },
        { label: t('Partial'), value: 'Partial' },
        { label: t('Completed'), value: 'Completed' },
        { label: t('Cancelled'), value: 'Cancelled' }
    ], [t]);

    // Dynamic report title
    const reportTitle = filters.mode === 'Summary'
        ? t('Sales Order Summary Report')
        : t('Sales Order Detailed Report');

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Sales Order Report"), url: "#" }
                    ]}
                    heading={{ icon: ClipboardList, title: reportTitle }}
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
                        { title: t("Sales Order Report"), url: "#" }
                    ]}
                    heading={{ icon: ClipboardList, title: reportTitle }}
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
                    { title: t("Sales Order Report"), url: "#" }
                ]}
                heading={{ icon: ClipboardList, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className={`flex gap-2 px-1 ${filters.mode !== 'Detailed' ? '' : ''}`}>

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
                    <SalesOrderReportFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        partyOptions={partyOptions}
                        salesmanOptions={salesmanOptions}
                        areaOptions={areaOptions}
                        userOptions={userOptions}
                        statusOptions={statusOptions}
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
                        tableId="sales-order-report-table"
                        pageSize={50}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 280px)"
                        stickyActions={false}
                        // ✅ Row merging only in Detailed mode — mirrors DeliveryNoteDetailedReport
                        groupBy={filters.mode === 'Detailed' ? 'OrderNo' : null}
                        mergedColumns={filters.mode === 'Detailed' ? mergedColumnsInDetailed : []}
                        onRowClick={handleRowClick}

                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderReport;