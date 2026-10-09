// src/components/pages/Reports/ContraReport/ContraReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ContraReportFilter from './ContraReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const ContraReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [userData, setUserData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Contra Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    /* ------------------------------ Default dates ------------------------------ */
    const getDefaultDates = () => {
        const today = new Date();
        
        return {
            fromDate: today.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.contraMasterId) return;
        navigate(`/transaction/contra-voucher/edit-contra-voucher/${row.contraMasterId}`);
    };
    const [filters, setFilters] = useState({
        ...getDefaultDates(),
        ledgerId: null,
        ledgerName: '',
        costCentreId: null,
        userId: null,
        mode: 'Summary',   // 'Summary' | 'Detailed'
        condition: 'All'
    });

    /* ------------------------------ Dropdown bootstrap ------------------------------ */
    useEffect(() => { fetchDropdownData(); }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [costCentreRes, ledgerRes, usersRes] = await Promise.all([
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("bank-account-ledgers", {
                    group_ids: [5, ],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } }))
            ]);
            setCostCenterData(costCentreRes.data.data || []);
            setLedgerData(ledgerRes.data.data || []);
            setUserData(usersRes.data.data || []);
        } catch (err) {
            console.error("❌ [fetchDropdownData] Error:", err);
        } finally {
            setInitialLoading(false);
        }
    };

    /* ------------------------------ Fetch report ------------------------------ */
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const isDetailed = filters.mode === 'Detailed';

        try {
            const payload = {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                postedStatus: null,
                ledgerId: filters.ledgerId ? Number(filters.ledgerId) : null,
                branchId: Number(selectedBranchId),
                currencyId: currentCurrency?.currencyId || 30,
                detailed: isDetailed,   // true → Detailed, false → Summary
                userId: filters.userId ? Number(filters.userId) : null,
                costCentreId: filters.costCentreId ? Number(filters.costCentreId) : null,
                condition: filters.condition || 'All',
            };

            const res = await axiosInstance.post("contra-report", payload);
            const raw = Array.isArray(res.data.data || res.data)
                ? (res.data.data || res.data)
                : [];

            if (raw.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('contraReport.messages.noDataFound') || 'No data found for the selected filters.'
                });
                setReportData([]);
                return;
            }

            /*
             * API response field names (exact casing):
             *   contraMasterId, SlNO, Date, VoucherNo, Ledger,
             *   FromLedger, ToLedger, Amount, Narration, DoneBy, CostCentre
             *
             * Detailed — multiple rows share the same contraMasterId (one voucher):
             *   Merged columns  : SlNO, Date, VoucherNo, Ledger, FromLedger, Narration, DoneBy, CostCentre
             *   Per-line columns: ToLedger, Amount   ← unique per line
             *
             * Summary — one row per voucher, Amount = voucher total.
             */
            setReportData(
                isDetailed
                    ? raw
                    : raw.map((item, index) => ({ ...item, SlNO: index + 1 }))
            );
        } catch (error) {
            console.error("❌ Contra Report Error:", error);
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

    /* ------------------------------ Totals ------------------------------ */
    const totals = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const dp = generalSettings?.decimalPart || 2;
        const total = reportData.reduce((acc, row) => acc + (parseFloat(row.Amount) || 0), 0);
        return {
            amount: total.toFixed(dp),
            count: reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    /* ------------------------------ Columns per mode ------------------------------ */
    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            /*
             * Detailed columns:
             *   Merged  : SlNO, Date, VoucherNo, Ledger, FromLedger, Narration, CostCentre, DoneBy
             *   Per-line: ToLedger, Amount
             */
            return [
                { key: 'SlNO', label: t('contraReport.columns.SNo') || '#', align: 'center', width: '55' },
                { key: 'Date', label: t('contraReport.columns.Date') || 'Date', align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('contraReport.columns.VoucherNo') || 'Voucher No', align: 'center', width: '120' },
                { key: 'Ledger', label: t('contraReport.columns.Ledger') || 'Ledger', align: 'left', width: '160' },
                { key: 'ToLedger', label: t('contraReport.columns.ToLedger') || 'To Ledger', align: 'left', width: '160' },
                { key: 'Amount', label: t('contraReport.columns.Amount') || 'Amount', align: 'right', width: '110' },
                { key: 'Narration', label: t('contraReport.columns.Narration') || 'Narration', align: 'left', width: '140' },
                { key: 'CostCentre', label: t('contraReport.columns.CostCentre') || 'Cost Centre', align: 'center', width: '110' },
                { key: 'DoneBy', label: t('contraReport.columns.DoneBy') || 'Done By', align: 'center', width: '110' },
            ];
        }

        // Summary
        return [
            { key: 'SlNO', label: t('contraReport.columns.SNo') || '#', align: 'center', width: '60' },
            { key: 'Date', label: t('contraReport.columns.Date') || 'Date', align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('contraReport.columns.VoucherNo') || 'Voucher No', align: 'center', width: '130' },
            { key: 'Ledger', label: t('contraReport.columns.Ledger') || 'Ledger', align: 'left', width: '180' },
            { key: 'ToLedger', label: t('contraReport.columns.ToLedger') || 'To Ledger', align: 'left', width: '160' },
            { key: 'Amount', label: t('contraReport.columns.Amount') || 'Amount', align: 'right', width: '130' },
            { key: 'Narration', label: t('contraReport.columns.Narration') || 'Narration', align: 'left' },
            { key: 'CostCentre', label: t('contraReport.columns.CostCentre') || 'Cost Centre', align: 'center', width: '120' },
            { key: 'DoneBy', label: t('contraReport.columns.DoneBy') || 'Done By', align: 'center', width: '110' },
        ];
    }, [filters.mode, t]);

    /* ------------------------------ Footer ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;
        return {
            label: t('common.total') || 'Total',
            Amount: totals.amount
        };
    }, [totals, reportData, t]);

    /* ------------------------------ renderCell ------------------------------ */
    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === 'Amount') {
            return (
                <div className="text-right">
                    {Number(row.Amount || 0).toFixed(dp)}
                </div>
            );
        }

        // All other keys: return as-is (Date already formatted by API)
        return row[key] ?? '-';
    };

    /* ------------------------------ Export ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const dp = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => ({
            SlNO: row.SlNO || index + 1,
            Date: row.Date || '',
            VoucherNo: row.VoucherNo || '',
            Ledger: row.Ledger || '',
            ToLedger: row.ToLedger || '',
            Narration: row.Narration || '',
            DoneBy: row.DoneBy || '',
            CostCentre: row.CostCentre || '',
            Amount: Number(row.Amount || 0).toFixed(dp)
        }));

        const footer = totals ? { label: t('Total'), Amount: totals.amount } : null;

        const detailedColumns = [
            { key: 'SlNO', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'Ledger', label: 'Ledger', align: 'left', width: 18 },
            { key: 'ToLedger', label: 'To Ledger', align: 'left', width: 18 },
            { key: 'Amount', label: 'Amount', align: 'right', width: 12, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 20 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'center', width: 12 },
            { key: 'DoneBy', label: 'Done By', align: 'center', width: 12 },
        ];

        const summaryColumns = [
            { key: 'SlNO', label: '#', align: 'center', width: 8 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 14 },
            { key: 'Ledger', label: 'Ledger', align: 'left', width: 18 },
            { key: 'ToLedger', label: 'To Ledger', align: 'left', width: 18 },
            { key: 'Amount', label: 'Amount', align: 'right', width: 14, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 20 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 15 },
            { key: 'DoneBy', label: 'Done By', align: 'left', width: 15 },
        ];

        const title = isDetailed
            ? t('contraReport.breadcrumb.detailedTitle') || 'Contra Detailed Report'
            : t('contraReport.breadcrumb.title') || 'Contra Report';

        return {
            fileName: isDetailed ? 'Contra_Detailed_Report' : 'Contra_Report',
            sheetName: isDetailed ? 'Contra Detailed' : 'Contra Summary',
            title,
            subtitle: `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer,
            theme: 'professional',
            decimalPlaces: dp,
            columns: isDetailed ? detailedColumns : summaryColumns
        };
    };

    const handleExportExcel = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('contraReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(o);
    };
    const handleExportPdf = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('contraReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...o, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('contraReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToCsv(o);
    };

    /* ------------------------------ Filter handlers ------------------------------ */
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        setFilters({ ...getDefaultDates(), ledgerId: null, ledgerName: '', costCentreId: null, userId: null, mode: 'Summary', condition: 'All' });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Dropdown options ------------------------------ */
    const costCenterOptions = useMemo(() => costCenterData.map(c => ({ label: c.CostCentre, value: c.costCentreId })), [costCenterData]);
    const ledgerOptions = useMemo(() => ledgerData.map(l => ({ label: l.ledgerName, value: l.ledgerId })), [ledgerData]);
    const userOptions = useMemo(() => userData.map(u => ({ label: u.userName || u.name, value: u.userId })), [userData]);

    /* ------------------------------ Report title ------------------------------ */
    const reportTitle = filters.mode === 'Detailed'
        ? t('contraReport.breadcrumb.detailedTitle') || 'Contra Detailed Report'
        : t('contraReport.breadcrumb.title') || 'Contra Report';

    /* ------------------------------ Guards ------------------------------ */
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("contraReport.breadcrumb.group"), url: "#" }, { title: t("contraReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Wallet, title: reportTitle }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("contraReport.breadcrumb.group"), url: "#" }, { title: t("contraReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Wallet, title: reportTitle }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    /* ------------------------------ Render ------------------------------ */
    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: t("contraReport.breadcrumb.group"), url: "#" }, { title: t("contraReport.breadcrumb.title"), url: "#" }]}
                heading={{ icon: Wallet, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                   label: t('contraReport.export.label', {
  defaultValue: 'Export Report',
})
                } : null}
            />

            <div className="px-1">
                <ContraReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    costCenterOptions={costCenterOptions}
                    ledgerOptions={ledgerOptions}
                    userOptions={userOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    tableId="contra-report"
                    pageSize={80}
                    onRowClick={handleRowClick}
                    // ── Grouping: active only in Detailed mode ──
                    // Group by `contraMasterId` — exact API field name (camelCase)
                    groupBy={filters.mode === 'Detailed' ? 'contraMasterId' : null}
                    // Merged columns: same value on every line of a voucher.
                    // `ToLedger` and `Amount` are NOT merged — they differ per line.
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNO', 'Date', 'VoucherNo', 'Ledger', 'FromLedger', 'Narration', 'CostCentre', 'DoneBy'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default ContraReport;