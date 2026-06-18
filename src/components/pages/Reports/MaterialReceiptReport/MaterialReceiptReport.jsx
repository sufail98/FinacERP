// src/components/pages/Reports/MaterialReceiptReport/MaterialReceiptReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { PackageCheck } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import MaterialReceiptReportFilters from './MaterialReceiptReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const MaterialReceiptReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data
    const [partyData, setPartyData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);
    const [userData, setUserData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Material Receipt Report");
    const { generalSettings } = useSelector((state) => state.settings);

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
        condition: 'All',
        ledgerId: null,
        orderId: null,
        costCentreId: null,
        userId: null,
        isAccountsPosting: false,
        mode: 'Detailed'
    });

    // ─── Detailed columns with default visibility ─────────────────────────────────
    const allColumns = [
        { key: 'Date',               label: t('Date'),         defaultVisible: true,  minWidth: '90px',  align: 'center' },
        { key: 'ReceiptNo',          label: t('Receipt No'),   defaultVisible: true,  minWidth: '90px',  align: 'left' },
        { key: 'Ledger',             label: t('Supplier'),     defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'CostCentre',         label: t('Cost Centre'),  defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'productCode',        label: t('Product Code'), defaultVisible: true,  minWidth: '100px', align: 'left' },
        { key: 'productName',        label: t('Product'),      defaultVisible: true,  minWidth: '150px', align: 'left',  wrap: true },
        { key: 'partNo',             label: t('Part No'),      defaultVisible: false, minWidth: '80px',  align: 'left' },
        { key: 'barcode',            label: t('Barcode'),      defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'UnitName',           label: t('Unit'),         defaultVisible: true,  minWidth: '60px',  align: 'center' },
        { key: 'qty',                label: t('Qty'),          defaultVisible: true,  minWidth: '70px',  align: 'right' },
        { key: 'rate',               label: t('Rate'),         defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'grossAmount',        label: t('Gross Amt'),    defaultVisible: false, minWidth: '100px', align: 'right' },
        { key: 'discountPercentage', label: t('Disc %'),       defaultVisible: false, minWidth: '70px',  align: 'right' },
        { key: 'taxRate',            label: t('Tax %'),        defaultVisible: false, minWidth: '70px',  align: 'right' },
        { key: 'taxAmount',          label: t('Tax Amt'),      defaultVisible: true,  minWidth: '90px',  align: 'right' },
        { key: 'netAmount',          label: t('Net Amount'),   defaultVisible: false, minWidth: '100px', align: 'right' },
        { key: 'TotalAmount',        label: t('Total Amount'), defaultVisible: true,  minWidth: '110px', align: 'right' },
        { key: 'AgainstNo',          label: t('Against No'),   defaultVisible: false, minWidth: '90px',  align: 'left' },
        { key: 'Narration',          label: t('Narration'),    defaultVisible: false, minWidth: '150px', align: 'left',  wrap: true },
    ];

    // ─── Summary columns (fixed, no toggle needed) ────────────────────────────────
    const summaryColumns = [
        { key: 'Date',         label: t('Date'),         minWidth: '90px',  align: 'center' },
        { key: 'ReceiptNo',    label: t('Receipt No'),   minWidth: '90px',  align: 'left' },
        { key: 'Ledger',       label: t('Supplier'),     minWidth: '150px', align: 'left', wrap: true },
        { key: 'CostCentre',   label: t('Cost Centre'),  minWidth: '100px', align: 'left' },
        { key: 'SubTotal',     label: t('Sub Total'),    minWidth: '100px', align: 'right' },
        { key: 'BillDiscount', label: t('Bill Disc'),    minWidth: '90px',  align: 'right' },
        { key: 'OtherCharge',  label: t('Other Charge'), minWidth: '100px', align: 'right' },
        { key: 'TaxableAmt',   label: t('Taxable Amt'),  minWidth: '100px', align: 'right' },
        { key: 'TotalTax',     label: t('Total Tax'),    minWidth: '90px',  align: 'right' },
        { key: 'RoundOff',     label: t('Round Off'),    minWidth: '80px',  align: 'right' },
        { key: 'TotalAmount',  label: t('Total Amount'), minWidth: '110px', align: 'right' },
    ];

    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.receiptMasterId) return;
        navigate(`/transaction/material-receipt/edit/${row.receiptMasterId}`);
    };

    // ─── Column visibility state (only used in Detailed mode) ────────────────────
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => { initial[col.key] = col.defaultVisible; });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    };

    // ─── Active columns — Summary uses fixed set, Detailed uses toggle state ──────
    const activeColumns = useMemo(() => {
        if (filters.mode === 'Summary') return summaryColumns;
        return allColumns.filter(col => visibleColumns[col.key]);
    }, [visibleColumns, filters.mode]);

    // ─── Columns that get merged (rowspan) — receipt-header fields ────────────────
    const mergedColumns = [
        'SNo', 'Date', 'ReceiptNo', 'Ledger', 'CostCentre',
        'AgainstNo', 'Narration', 'TotalAmount'
    ];

    // ─── Lifecycle ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [partyRes, costCentreRes, userRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } }))
            ]);

            setPartyData(partyRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
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
            fromDate:          filters.fromDate,
            toDate:            filters.toDate,
            condition:         filters.condition || 'All',
            branchId:          parseInt(selectedBranchId) || 1,
            ledgerId:          filters.ledgerId || 0,
            orderId:           filters.orderId || 0,
            costCentreId:      filters.costCentreId || 0,
            currencyId:        currentCurrency?.currencyId || 1,
            userId:            filters.userId ? String(filters.userId) : "",
            isAccountsPosting: filters.isAccountsPosting || false,
            mode:              filters.mode || 'Detailed'
        };

        try {
            const res = await axiosInstance.post("material-receipt-report", requestBody);
            const responseData = res.data.data || res.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: item.SlNo || (index + 1)
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
            console.error("❌ Material Receipt Report Error:", error);
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

        // ── Summary footer ──
        if (filters.mode === 'Summary') {
            return {
                Date:         '',
                ReceiptNo:    <strong>{t('Total')}</strong>,
                Ledger:       '',
                CostCentre:   '',
                SubTotal:     sumOf('SubTotal').toFixed(decimalPart),
                BillDiscount: sumOf('BillDiscount').toFixed(decimalPart),
                OtherCharge:  sumOf('OtherCharge').toFixed(decimalPart),
                TaxableAmt:   sumOf('TaxableAmt').toFixed(decimalPart),
                TotalTax:     sumOf('TotalTax').toFixed(decimalPart),
                RoundOff:     sumOf('RoundOff').toFixed(decimalPart),
                TotalAmount:  sumOf('TotalAmount').toFixed(decimalPart),
            };
        }

        // ── Detailed footer ──
        return {
            SNo:               '',
            Date:              '',
            ReceiptNo:         <strong>{t('Total')}</strong>,
            Ledger:            '',
            CostCentre:        '',
            productCode:       '',
            productName:       '',
            partNo:            '',
            barcode:           '',
            UnitName:          '',
            qty:               sumOf('qty').toFixed(3),
            rate:              '',
            grossAmount:       sumOf('grossAmount').toFixed(decimalPart),
            discountPercentage:'',
            taxRate:           '',
            taxAmount:         sumOf('taxAmount').toFixed(decimalPart),
            netAmount:         sumOf('netAmount').toFixed(decimalPart),
            TotalAmount:       sumOf('TotalAmount').toFixed(decimalPart),
            AgainstNo:         '',
            Narration:         ''
        };
    }, [reportData, generalSettings?.decimalPart, filters.mode, t]);

    // ─── Cell renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ── Summary-only numeric fields ──
        const summaryNumericKeys = ['SubTotal', 'BillDiscount', 'OtherCharge', 'TaxableAmt', 'TotalTax', 'RoundOff'];
        if (summaryNumericKeys.includes(key)) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || value === null) {
                return <div className="text-right text-gray-400">-</div>;
            }
            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }
            if (key === 'TotalTax') {
                return (
                    <div className="text-right text-orange-600 dark:text-orange-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'BillDiscount') {
                return (
                    <div className="text-right text-green-600 dark:text-green-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            return <div className="text-right tabular-nums">{numValue.toFixed(decimalPart)}</div>;
        }

        // ── Detailed numeric fields ──
        const numericKeys = [
            'qty', 'rate', 'grossAmount', 'discountPercentage',
            'taxRate', 'taxAmount', 'netAmount', 'TotalAmount'
        ];

        if (numericKeys.includes(key)) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || value === null) {
                return <div className="text-right text-gray-400">-</div>;
            }
            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            if (key === 'TotalAmount' || key === 'netAmount') {
                return (
                    <div className="text-right text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'taxAmount') {
                return (
                    <div className="text-right text-orange-600 dark:text-orange-400 tabular-nums">
                        {numValue.toFixed(decimalPart)}
                    </div>
                );
            }
            if (key === 'taxRate' || key === 'discountPercentage') {
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

        // ── Receipt No ──
        if (key === 'ReceiptNo') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // ── Product Code / barcode / partNo ──
        if (key === 'productCode' || key === 'barcode' || key === 'partNo') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                    {value}
                </span>
            );
        }

        // ── Against No ──
        if (key === 'AgainstNo') {
            if (!value) return <span className="text-gray-400">-</span>;
            return (
                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-mono">
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

        // ── Date field ──
        if (key === 'Date') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ── Null-safe defaults ──
        if (key === 'Narration' || key === 'Ledger') {
            return value || <span className="text-gray-400">-</span>;
        }

        return value ?? '-';
    };

    // ─── Export ───────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        const isSummary = filters.mode === 'Summary';

        const visibleColumnsList = isSummary
            ? summaryColumns
            : allColumns.filter(col => visibleColumns[col.key]);

        const summaryNumericKeys = ['SubTotal', 'BillDiscount', 'OtherCharge', 'TaxableAmt', 'TotalTax', 'RoundOff'];
        const detailedNumericKeys = ['qty', 'rate', 'grossAmount', 'discountPercentage', 'taxRate', 'taxAmount', 'netAmount', 'TotalAmount'];

        const exportData = reportData.map((row, index) => {
            const exportRow = { SNo: row.SNo || index + 1 };
            visibleColumnsList.forEach(col => {
                const isNumeric = isSummary
                    ? summaryNumericKeys.includes(col.key) || col.key === 'TotalAmount'
                    : detailedNumericKeys.includes(col.key);

                if (isNumeric) {
                    exportRow[col.key] = Number(row[col.key] || 0).toFixed(
                        col.key === 'qty' ? 3 : decimalPart
                    );
                } else {
                    exportRow[col.key] = row[col.key] || '';
                }
            });
            return exportRow;
        });

        const exportColumns = [
            { key: 'SNo', label: '#', align: 'center', width: 5 },
            ...visibleColumnsList.map(col => ({
                key: col.key,
                label: col.label,
                align: col.align || 'left',
                width: Math.max(10, Math.round(parseInt(col.minWidth) / 6))
            }))
        ];

        return {
            fileName:  `Material_Receipt_Report_${filters.fromDate}_to_${filters.toDate}`,
            sheetName: 'Material Receipt Report',
            title:     t('Material Receipt Report'),
            subtitle:  `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: exportColumns
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
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate:          dates.fromDate,
            toDate:            dates.toDate,
            condition:         'All',
            ledgerId:          null,
            orderId:           null,
            costCentreId:      null,
            userId:            null,
            isAccountsPosting: false,
            mode:              'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Dropdown options ─────────────────────────────────────────────────────────
    const partyOptions = useMemo(() => [
        { label: t('All Suppliers'), value: null },
        ...partyData.map(party => ({
            label: party.ledgerName,
            value: party.ledgerId
        }))
    ], [partyData, t]);

    const costCentreOptions = useMemo(() => [
        { label: t('All Cost Centres'), value: null },
        ...costCentreData.map(cc => ({
            label: cc.CostCentre,
            value: cc.costCentreId
        }))
    ], [costCentreData, t]);

    const userOptions = useMemo(() => [
        { label: t('All Users'), value: null },
        ...userData.map(u => ({
            label: u.userName || u.username || u.name,
            value: u.userId || u.id
        }))
    ], [userData, t]);

    const conditionOptions = useMemo(() => [
        { label: t('All'),       value: 'All'       },
        { label: t('Pending'),   value: 'Pending'   },
        { label: t('Partial'),   value: 'Partial'   },
        { label: t('Completed'), value: 'Completed' },
        { label: t('Cancelled'), value: 'Cancelled' }
    ], [t]);

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;
    const isDetailed = filters.mode === 'Detailed';

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Material Receipt Report"), url: "#" }
                    ]}
                    heading={{ icon: PackageCheck, title: t("Material Receipt Report") }}
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
                        { title: t("Material Receipt Report"), url: "#" }
                    ]}
                    heading={{ icon: PackageCheck, title: t("Material Receipt Report") }}
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
                    { title: t("Material Receipt Report"), url: "#" }
                ]}
                heading={{ icon: PackageCheck, title: t("Material Receipt Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="flex gap-2 px-1">

                {/* ✅ Column Selector Sidebar — only visible in Detailed mode */}
                {isDetailed && (
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
                    <MaterialReceiptReportFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        partyOptions={partyOptions}
                        costCentreOptions={costCentreOptions}
                        userOptions={userOptions}
                        conditionOptions={conditionOptions}
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
                        tableId="material-receipt-report-table"
                        pageSize={50}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 280px)"
                        stickyActions={false}
                        // ✅ Row merging only applies in Detailed mode
                        groupBy={isDetailed ? "ReceiptNo" : undefined}
                        mergedColumns={isDetailed ? mergedColumns : undefined}
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default MaterialReceiptReport;