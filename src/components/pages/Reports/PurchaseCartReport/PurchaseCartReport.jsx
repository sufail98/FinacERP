// src/components/pages/Reports/PurchaseCartReport/PurchaseCartReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingCart } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseCartReportFilter from './PurchaseCartReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const PurchaseCartReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Cart Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
    
        return {
            fromDate: today.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        status: 'All',
        customerName: 'All',
        mode: 'summary'
    });

    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.PurchaseCartMasterId) return;
        navigate(`/transaction/purchase-cart/edit-purchase-cart/${row.PurchaseCartMasterId}`);
    };

    useEffect(() => {
        setInitialLoading(false);
    }, [selectedBranchId]);

    // ─── Column definitions ───────────────────────────────────────────────────────

    // Summary columns (cart-level, no item details)
    const summaryColumns = useMemo(() => [
        { key: 'Date', label: t('purchaseCartReport.grid.columns.date'), align: 'center', width: '120' },
        { key: 'PurchaseCartNo', label: t('purchaseCartReport.grid.columns.cartNo'), align: 'center', width: '100' },
        { key: 'VoucherNo', label: t('purchaseCartReport.grid.columns.voucherNo'), align: 'center', width: '100' },
        { key: 'CustomerName', label: t('purchaseCartReport.grid.columns.customer'), align: 'left', width: '200' },
        { key: 'CustomerPhone', label: t('purchaseCartReport.grid.columns.phone'), align: 'center', width: '120' },
        { key: 'Status', label: t('purchaseCartReport.grid.columns.status'), align: 'center', width: '120' },
        { key: 'Narration', label: t('purchaseCartReport.grid.columns.narration'), align: 'left', width: '200' },
        { key: 'DoneBy', label: t('purchaseCartReport.grid.columns.doneBy'), align: 'center', width: '100' },
    ], [t]);

    // Detailed columns (item-level with merged header fields)
    const detailedColumns = useMemo(() => [
        { key: 'Date', label: t('purchaseCartReport.grid.columns.date'), align: 'center', width: '110' },
        { key: 'PurchaseCartNo', label: t('purchaseCartReport.grid.columns.cartNo'), align: 'center', width: '90' },
        { key: 'VoucherNo', label: t('purchaseCartReport.grid.columns.voucherNo'), align: 'center', width: '90' },
        { key: 'CustomerName', label: t('purchaseCartReport.grid.columns.customer'), align: 'left', width: '140' },
        { key: 'CustomerPhone', label: t('purchaseCartReport.grid.columns.phone'), align: 'center', width: '110' },
        { key: 'productCode', label: t('purchaseCartReport.grid.columns.productCode'), align: 'center', width: '100' },
        { key: 'barcode', label: t('purchaseCartReport.grid.columns.barcode'), align: 'center', width: '110' },
        { key: 'manualItemName', label: t('purchaseCartReport.grid.columns.itemName'), align: 'left', width: '160' },
        { key: 'manualItemDescription', label: t('purchaseCartReport.grid.columns.description'), align: 'left', width: '160' },
        { key: 'Qty', label: t('purchaseCartReport.grid.columns.qty'), align: 'right', width: '80' },
        { key: 'expectedPrice', label: t('purchaseCartReport.grid.columns.expectedPrice'), align: 'right', width: '110' },
        { key: 'Priority', label: t('purchaseCartReport.grid.columns.priority'), align: 'center', width: '80' },
        { key: 'ItemStatus', label: t('purchaseCartReport.grid.columns.itemStatus'), align: 'center', width: '100' },
        { key: 'Status', label: t('purchaseCartReport.grid.columns.status'), align: 'center', width: '100' },
    ], [t]);

    // All available columns for the column selector (Detailed mode only)
    const allColumns = [
        { key: 'Date', label: t('purchaseCartReport.grid.columns.date'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'PurchaseCartNo', label: t('purchaseCartReport.grid.columns.cartNo'), defaultVisible: true, minWidth: '80px', align: 'center' },
        { key: 'VoucherNo', label: t('purchaseCartReport.grid.columns.voucherNo'), defaultVisible: true, minWidth: '80px', align: 'center' },
        { key: 'CustomerName', label: t('purchaseCartReport.grid.columns.customer'), defaultVisible: true, minWidth: '120px', align: 'left', wrap: true },
        { key: 'CustomerPhone', label: t('purchaseCartReport.grid.columns.phone'), defaultVisible: true, minWidth: '100px', align: 'center' },
        { key: 'productCode', label: t('purchaseCartReport.grid.columns.productCode'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'barcode', label: t('purchaseCartReport.grid.columns.barcode'), defaultVisible: false, minWidth: '100px', align: 'center' },
        { key: 'manualItemName', label: t('purchaseCartReport.grid.columns.itemName'), defaultVisible: true, minWidth: '130px', align: 'left', wrap: true },
        { key: 'manualItemDescription', label: t('purchaseCartReport.grid.columns.description'), defaultVisible: false, minWidth: '140px', align: 'left', wrap: true },
        { key: 'Qty', label: t('purchaseCartReport.grid.columns.qty'), defaultVisible: true, minWidth: '70px', align: 'right' },
        { key: 'expectedPrice', label: t('purchaseCartReport.grid.columns.expectedPrice'), defaultVisible: true, minWidth: '90px', align: 'right' },
        { key: 'Priority', label: t('purchaseCartReport.grid.columns.priority'), defaultVisible: true, minWidth: '70px', align: 'center' },
        { key: 'ItemStatus', label: t('purchaseCartReport.grid.columns.itemStatus'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'Status', label: t('purchaseCartReport.grid.columns.status'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'Narration', label: t('purchaseCartReport.grid.columns.narration'), defaultVisible: false, minWidth: '140px', align: 'left', wrap: true },
        { key: 'DoneBy', label: t('purchaseCartReport.grid.columns.doneBy'), defaultVisible: false, minWidth: '90px', align: 'center' },
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
        if (filters.mode === 'summary') return summaryColumns;
        return detailedColumns.filter(col => visibleColumns[col.key] !== false);
    }, [filters.mode, summaryColumns, detailedColumns, visibleColumns]);

    // ─── Columns that get merged (rowspan) in Detailed mode ──────────────────────
    // These are cart-header fields repeated across item rows for the same cart
    const mergedColumnsInDetailed = [
        'SNo', 'Date', 'PurchaseCartNo', 'VoucherNo', 'CustomerName',
        'CustomerPhone', 'Status', 'Narration', 'DoneBy'
    ];

    // ─── Fetch report ─────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                from_date: filters.fromDate,
                to_date: filters.toDate,
                branch_id: Number(selectedBranchId),
                status: filters.status,
                customer_name: filters.customerName,
                mode: filters.mode
            };

            const response = await axiosInstance.post("purchase-cart/report", payload);

            if (!response.data.status) {
                throw new Error(response.data.message || 'Failed to fetch report');
            }

            const responseData = response.data.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: item.SlNo || (index + 1)
            }));

            setReportData(dataWithSNo);

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('purchaseCartReport.messages.noDataFound')
                });
            }
        } catch (error) {
            console.error("❌ Purchase Cart Report Error:", error);
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

        const sumOf = (key) => reportData.reduce((acc, row) => {
            const v = parseFloat(row[key]);
            return acc + (isNaN(v) ? 0 : v);
        }, 0);

        if (filters.mode === 'summary') {
            // No numeric totals in summary mode
            return null;
        }

        // Detailed mode — sum item-level numeric fields
        return {
            SNo: '',
            Date: '',
            PurchaseCartNo: <strong>{t('purchaseCartReport.grid.total')}</strong>,
            VoucherNo: '',
            CustomerName: '',
            CustomerPhone: '',
            productCode: '',
            barcode: '',
            manualItemName: '',
            manualItemDescription: '',
            Qty: sumOf('Qty').toFixed(3),
            expectedPrice: sumOf('expectedPrice').toFixed(decimalPart),
            Priority: '',
            ItemStatus: '',
            Status: '',
            Narration: '',
            DoneBy: ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.mode]);

    // ─── Cell renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ── Numeric fields ──
        if (key === 'Qty') {
            const num = parseFloat(value);
            if (isNaN(num) || value === null) return <div className="text-right text-gray-400">-</div>;
            return (
                <div className="text-right text-purple-600 dark:text-purple-400 font-medium tabular-nums">
                    {num.toFixed(3)}
                </div>
            );
        }

        if (key === 'expectedPrice') {
            const num = parseFloat(value);
            if (isNaN(num) || value === null) return <div className="text-right text-gray-400">-</div>;
            if (num === 0) return <div className="text-right text-gray-400">0.00</div>;
            return (
                <div className="text-right text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                    {num.toFixed(decimalPart)}
                </div>
            );
        }

        // ── Status badge ──
        if (key === 'Status') {
            if (!value) return <span className="text-gray-400">-</span>;
            const colorMap = {
                'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            };
            const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {value}
                </span>
            );
        }

        // ── Item Status badge ──
        if (key === 'ItemStatus') {
            if (!value) return <span className="text-gray-400">-</span>;
            const colorMap = {
                'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                'Approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'Ordered': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
                'Received': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            };
            const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {value}
                </span>
            );
        }

        // ── Priority badge ──
        if (key === 'Priority') {
            if (!value) return <span className="text-gray-400">-</span>;
            const colorMap = {
                'High': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                'Medium': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                'Low': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            };
            const colorClass = colorMap[value] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {value}
                </span>
            );
        }

        // ── Cart No / Voucher No ──
        if (key === 'PurchaseCartNo' || key === 'VoucherNo') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // ── Product Code / Barcode ──
        if (key === 'productCode' || key === 'barcode') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Date field ──
        if (key === 'Date') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ── Null-safe defaults ──
        if (key === 'CustomerName' || key === 'Narration' || key === 'manualItemDescription' || key === 'DoneBy') {
            return value || <span className="text-gray-400">-</span>;
        }

        return value ?? '-';
    };

    // ─── Export ───────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.mode === 'summary') {
            const exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row.Date || '',
                CartNo: row.PurchaseCartNo || '',
                VoucherNo: row.VoucherNo || '',
                Customer: row.CustomerName || '',
                Phone: row.CustomerPhone || '',
                Status: row.Status || '',
                Narration: row.Narration || '',
                DoneBy: row.DoneBy || ''
            }));

            return {
                fileName: 'Purchase_Cart_Summary_Report',
                sheetName: 'Summary',
                title: t('purchaseCartReport.breadcrumb.title'),
                subtitle: `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate}`,
                data: exportData,
                footer: null,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: t('purchaseCartReport.grid.columns.date'), align: 'center', width: 12 },
                    { key: 'CartNo', label: t('purchaseCartReport.grid.columns.cartNo'), align: 'center', width: 10 },
                    { key: 'VoucherNo', label: t('purchaseCartReport.grid.columns.voucherNo'), align: 'center', width: 10 },
                    { key: 'Customer', label: t('purchaseCartReport.grid.columns.customer'), align: 'left', width: 20 },
                    { key: 'Phone', label: t('purchaseCartReport.grid.columns.phone'), align: 'center', width: 12 },
                    { key: 'Status', label: t('purchaseCartReport.grid.columns.status'), align: 'center', width: 10 },
                    { key: 'Narration', label: t('purchaseCartReport.grid.columns.narration'), align: 'left', width: 25 },
                    { key: 'DoneBy', label: t('purchaseCartReport.grid.columns.doneBy'), align: 'center', width: 10 }
                ]
            };
        }

        // Detailed export
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Date: row.Date || '',
            CartNo: row.PurchaseCartNo || '',
            VoucherNo: row.VoucherNo || '',
            Customer: row.CustomerName || '',
            Phone: row.CustomerPhone || '',
            ProductCode: row.productCode || '',
            Barcode: row.barcode || '',
            ItemName: row.manualItemName || '',
            Description: row.manualItemDescription || '',
            Qty: row.Qty != null ? Number(row.Qty).toFixed(3) : '',
            Price: row.expectedPrice != null ? Number(row.expectedPrice).toFixed(decimalPart) : '',
            Priority: row.Priority || '',
            ItemStatus: row.ItemStatus || '',
            Status: row.Status || ''
        }));

        return {
            fileName: 'Purchase_Cart_Detailed_Report',
            sheetName: 'Detailed',
            title: t('purchaseCartReport.breadcrumb.title'),
            subtitle: `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: t('purchaseCartReport.grid.columns.date'), align: 'center', width: 10 },
                { key: 'CartNo', label: t('purchaseCartReport.grid.columns.cartNo'), align: 'center', width: 8 },
                { key: 'VoucherNo', label: t('purchaseCartReport.grid.columns.voucherNo'), align: 'center', width: 8 },
                { key: 'Customer', label: t('purchaseCartReport.grid.columns.customer'), align: 'left', width: 15 },
                { key: 'Phone', label: t('purchaseCartReport.grid.columns.phone'), align: 'center', width: 10 },
                { key: 'ProductCode', label: t('purchaseCartReport.grid.columns.productCode'), align: 'center', width: 10 },
                { key: 'Barcode', label: t('purchaseCartReport.grid.columns.barcode'), align: 'center', width: 10 },
                { key: 'ItemName', label: t('purchaseCartReport.grid.columns.itemName'), align: 'left', width: 15 },
                { key: 'Description', label: t('purchaseCartReport.grid.columns.description'), align: 'left', width: 20 },
                { key: 'Qty', label: t('purchaseCartReport.grid.columns.qty'), align: 'right', width: 8 },
                { key: 'Price', label: t('purchaseCartReport.grid.columns.expectedPrice'), align: 'right', width: 10 },
                { key: 'Priority', label: t('purchaseCartReport.grid.columns.priority'), align: 'center', width: 8 },
                { key: 'ItemStatus', label: t('purchaseCartReport.grid.columns.itemStatus'), align: 'center', width: 10 },
                { key: 'Status', label: t('purchaseCartReport.grid.columns.status'), align: 'center', width: 10 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('purchaseCartReport.messages.noDataToExport') }); return; }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('purchaseCartReport.messages.noDataToExport') }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('purchaseCartReport.messages.noDataToExport') }); return; }
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
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            status: 'All',
            customerName: 'All',
            mode: 'summary'
        });
        setReportData(null);
        setAlert(null);
    };

    // Status & mode options
    const statusOptions = [
        { label: t('purchaseCartReport.filters.statusAll'), value: 'All' },
        { label: t('purchaseCartReport.filters.statusPending'), value: 'Pending' },
        { label: t('purchaseCartReport.filters.statusCompleted'), value: 'Completed' },
        { label: t('purchaseCartReport.filters.statusCancelled'), value: 'Cancelled' }
    ];

    const modeOptions = [
        { label: t('purchaseCartReport.filters.modeSummary'), value: 'summary' },
        { label: t('purchaseCartReport.filters.modeDetailed'), value: 'detailed' }
    ];

    // Dynamic report title
    const reportTitle = filters.mode === 'summary'
        ? t('purchaseCartReport.breadcrumb.title') + ' - ' + t('purchaseCartReport.filters.modeSummary')
        : t('purchaseCartReport.breadcrumb.title') + ' - ' + t('purchaseCartReport.filters.modeDetailed');

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("purchaseCartReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseCartReport.breadcrumb.title"), url: "#" }
                    ]}
                    heading={{ icon: ShoppingCart, title: t("purchaseCartReport.breadcrumb.title") }}
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
                        { title: t("purchaseCartReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseCartReport.breadcrumb.title"), url: "#" }
                    ]}
                    heading={{ icon: ShoppingCart, title: t("purchaseCartReport.breadcrumb.title") }}
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
                    { title: t("purchaseCartReport.breadcrumb.group"), url: "#" },
                    { title: t("purchaseCartReport.breadcrumb.title"), url: "#" }
                ]}
                heading={{ icon: ShoppingCart, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('purchaseCartReport.export.label')
                } : null}
            />

            <div className="flex gap-2 px-1">


                {/* ✅ Main Content */}
                <div className="flex-1 min-w-0">
                    <PurchaseCartReportFilter
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        statusOptions={statusOptions}
                        modeOptions={modeOptions}
                        loading={loading}
                        resetFilters={resetFilters}
                    />

                    <ContentTable
                        columns={[
                            { key: 'SNo', label: '#', align: 'center', width: '50' },
                            ...activeColumns
                        ]}
                        onRowClick={handleRowClick}

                        data={reportData || []}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        staticSearchable={true}
                        serverPagination={false}
                        tableId="purchase-cart-report-table"
                        pageSize={50}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 270px)"
                        stickyActions={false}
                        // ✅ Row merging only in Detailed mode — group by PurchaseCartNo
                        groupBy={filters.mode === 'detailed' ? 'PurchaseCartNo' : null}
                        mergedColumns={filters.mode === 'detailed' ? mergedColumnsInDetailed : []}
                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseCartReport;