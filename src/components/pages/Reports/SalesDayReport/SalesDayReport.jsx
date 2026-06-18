// src/components/pages/Reports/SalesDayReport/SalesDayReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replace SalesDayReportGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { CalendarDays } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesDayReportFilter from './SalesDayReportFilter';
import useReportExport from '@/hooks/useReportExport';

const SalesDayReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Day Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    // ── Columns ────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        { key: 'SNo',         label: '#',                                               align: 'center', width: '60' },
        { key: 'Date',        label: t('salesDayReport.grid.columns.date'),             align: 'center', width: '140' },
        { key: 'TotalAmount', label: t('salesDayReport.grid.columns.totalAmount'),      align: 'right' },
        { key: 'TotalCost',   label: t('salesDayReport.grid.columns.totalCost'),        align: 'right' },
        { key: 'TotalTax',    label: t('salesDayReport.grid.columns.totalTax'),         align: 'right' },
        { key: 'TotalProfit', label: t('salesDayReport.grid.columns.totalProfit'),      align: 'right' },
    ], [t]);

    // ── renderCell ─────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        switch (key) {
            case 'Date':
                return row.Date || row.date || '-';
            case 'TotalAmount':
                return Number(row.TotalAmount || row.totalAmount || 0).toFixed(decimalPart);
            case 'TotalCost':
                return Number(row.TotalCost   || row.totalCost   || 0).toFixed(decimalPart);
            case 'TotalTax':
                return Number(row.TotalTax    || row.totalTax    || 0).toFixed(decimalPart);
            case 'TotalProfit':
                return Number(row.TotalProfit || row.totalProfit || 0).toFixed(decimalPart);
            default:
                return row[key] ?? '-';
        }
    };

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
        isAccountsPosting: false
    });

    const formatDateTimeForAPI = (dateString, isEndOfDay = false) => {
        if (!dateString) return null;
        return isEndOfDay ? `${dateString} 23:59:59` : `${dateString} 00:00:00`;
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        try {
            const payload = {
                fromDate: formatDateTimeForAPI(filters.fromDate, false),
                toDate: formatDateTimeForAPI(filters.toDate, true),
                branchId: Number(selectedBranchId),
                isAccountsPosting: filters.isAccountsPosting
            };
            const response = await axiosInstance.post("sales-day-report", payload);
            const data = response.data.data || response.data;
            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));
            if (!dataWithSNo.length) {
                setAlert({ id: Date.now(), type: 'info', message: t('salesDayReport.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        if (!reportData?.length) return null;
        const sum = (key) => reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);
        return {
            SNo:         t('salesDayReport.grid.total'),
            TotalAmount: (sum('TotalAmount') || sum('totalAmount')).toFixed(decimalPart),
            TotalCost:   (sum('TotalCost')   || sum('totalCost')).toFixed(decimalPart),
            TotalTax:    (sum('TotalTax')    || sum('totalTax')).toFixed(decimalPart),
            TotalProfit: (sum('TotalProfit') || sum('totalProfit')).toFixed(decimalPart),
        };
    }, [reportData, decimalPart, t]);

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, isAccountsPosting: false });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!reportData?.length) return null;
        return {
            fileName: 'Sales_Day_Report',
            sheetName: 'Sales Day Report',
            title: t('salesDayReport.breadcrumb.title'),
            subtitle: `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate}`,
            data: reportData.map((row, index) => ({
                SLNo: row.SLNo || index + 1,
                Date: row.Date || row.date || '',
                TotalAmount: Number(row.TotalAmount || row.totalAmount || 0).toFixed(decimalPart),
                TotalCost:   Number(row.TotalCost   || row.totalCost   || 0).toFixed(decimalPart),
                TotalTax:    Number(row.TotalTax    || row.totalTax    || 0).toFixed(decimalPart),
                TotalProfit: Number(row.TotalProfit || row.totalProfit || 0).toFixed(decimalPart),
            })),
            footer: totals ? {
                label: t('salesDayReport.grid.total'),
                TotalAmount: totals.TotalAmount,
                TotalCost:   totals.TotalCost,
                TotalTax:    totals.TotalTax,
                TotalProfit: totals.TotalProfit,
            } : null,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SLNo',        label: '#',                                          align: 'center', width: 8  },
                { key: 'Date',        label: t('salesDayReport.grid.columns.date'),        align: 'center', width: 15 },
                { key: 'TotalAmount', label: t('salesDayReport.grid.columns.totalAmount'), align: 'right',  width: 18 },
                { key: 'TotalCost',   label: t('salesDayReport.grid.columns.totalCost'),   align: 'right',  width: 18 },
                { key: 'TotalTax',    label: t('salesDayReport.grid.columns.totalTax'),    align: 'right',  width: 18 },
                { key: 'TotalProfit', label: t('salesDayReport.grid.columns.totalProfit'), align: 'right',  width: 18 },
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesDayReport.messages.noDataToExport') }); return; }
        exportGenericToExcel(options);
    };
    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesDayReport.messages.noDataToExport') }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesDayReport.messages.noDataToExport') }); return; }
        exportGenericToCsv(options);
    };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("salesDayReport.breadcrumb.group"), url: "#" },
        { title: t("salesDayReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: CalendarDays, title: t("salesDayReport.breadcrumb.title") };

    if (privilegeLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess)        return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={breadcrumbRoutes}
                heading={breadcrumbHeading}
                exportConfig={reportData?.length ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('salesDayReport.export.label')
                } : null}
            />

            <div className="px-1">
                <SalesDayReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId="sales-day-report"
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={totals}
                    staticSearchable
                    pageSize={80}
                    maxHeight="calc(100vh - 250px)"
                />
            </div>
        </div>
    );
};

export default SalesDayReport;