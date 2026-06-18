// src/components/pages/Reports/SalesmanWiseSalesReport/SalesmanWiseSalesReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replaces SalesmanWiseSalesReportGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { UserCheck } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesmanWiseSalesReportFilter from './SalesmanWiseSalesReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesmanWiseSalesReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [employeeData, setEmployeeData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);
    const [brandData, setBrandData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Salesman Wise Sales Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const [filters, setFilters] = useState({
        fromDate: getDefaultDates().fromDate,
        toDate: getDefaultDates().toDate,
        employeeId: null,
        mode: 'Voucher wise',
        currencyId: 'All',
        brandId: 'All',
        isAccountsPosting: false
    });

    // ── Mode-dependent columns ─────────────────────────────────────────────
    const columns = useMemo(() => {
        if (filters.mode === 'Voucher wise') {
            return [
                { key: 'SNo',          label: '#',                                                               align: 'center', width: '50'  },
                { key: 'Date',         label: t('salesmanWiseSalesReport.grid.columns.date'),                    align: 'center', width: '100' },
                { key: 'VoucherNo',    label: t('salesmanWiseSalesReport.grid.columns.voucherNo'),               align: 'left',   width: '120' },
                { key: 'Customer',     label: t('salesmanWiseSalesReport.grid.columns.customer'),                align: 'left'                 },
                { key: 'DoneBy',       label: t('salesmanWiseSalesReport.grid.columns.doneBy'),                  align: 'left',   width: '140' },
                { key: 'BillAmount',   label: t('salesmanWiseSalesReport.grid.columns.billAmount'),              align: 'right',  width: '120' },
            ];
        }
        // Product wise / Salesman wise
        return [
            { key: 'SNo',  label: '#',                                                   align: 'center', width: '50'  },
            { key: 'Code', label: t('salesmanWiseSalesReport.grid.columns.code'),        align: 'center', width: '120' },
            { key: 'Item', label: t('salesmanWiseSalesReport.grid.columns.item'),        align: 'left'                 },
            { key: 'Qty',  label: t('salesmanWiseSalesReport.grid.columns.qty'),         align: 'right',  width: '110' },
            { key: 'Free', label: t('salesmanWiseSalesReport.grid.columns.free'),        align: 'right',  width: '110' },
        ];
    }, [filters.mode, t]);

    // ── Mode-dependent renderCell ──────────────────────────────────────────
    const renderCell = (key, row) => {
        if (filters.mode === 'Voucher wise') {
            switch (key) {
                case 'Date':       return row['Date']       || '-';
                case 'VoucherNo':  return row['Voucher No'] || '-';
                case 'Customer':   return row['Customer']   || '-';
                case 'DoneBy':     return row['Done by']    || '-';
                case 'BillAmount': return Number(row['Bill Amount'] || row['BillAmount'] || row['billAmount'] || 0).toFixed(decimalPart);
                default:           return row[key] ?? '-';
            }
        }
        // Product wise / Salesman wise
        switch (key) {
            case 'Code': return row['Code'] || '-';
            case 'Item': return row['Item'] || '-';
            case 'Qty':  return Number(row['Qty']  || row['qty']  || 0).toFixed(3);
            case 'Free': return Number(row['Free'] || row['free'] || 0).toFixed(3);
            default:     return row[key] ?? '-';
        }
    };

    // ── reportData with SNo stamped ────────────────────────────────────────
    const reportDataWithSNo = useMemo(() => {
        if (!reportData?.length) return [];
        return reportData.map((item, index) => ({ ...item, SNo: index + 1 }));
    }, [reportData]);

    // ── footerData keyed to match columns ─────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData?.length) return null;

        if (filters.mode === 'Voucher wise') {
            const billAmount = reportData.reduce((s, r) => s + (parseFloat(r['Bill Amount'] || r['BillAmount'] || r['billAmount']) || 0), 0);
            return {
                SNo:        t('salesmanWiseSalesReport.grid.total') || 'Total',
                BillAmount: billAmount.toFixed(decimalPart),
            };
        }

        // Product wise / Salesman wise
        const totalQty  = reportData.reduce((s, r) => s + (parseFloat(r['Qty']  || r['qty'])  || 0), 0);
        const totalFree = reportData.reduce((s, r) => s + (parseFloat(r['Free'] || r['free']) || 0), 0);
        return {
            SNo:  t('salesmanWiseSalesReport.grid.total') || 'Total',
            Qty:  totalQty.toFixed(3),
            Free: totalFree.toFixed(3),
        };
    }, [reportData, filters.mode, decimalPart, t]);

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [employeeRes, currencyRes, brandRes] = await Promise.all([
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } }))
            ]);
            setEmployeeData(employeeRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
            setBrandData(brandRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const employeeOptions = useMemo(() => employeeData.map(emp => ({
        label: emp.employeeName || emp.name,
        value: emp.employeeId || emp.id
    })), [employeeData]);

    const currencyOptions = useMemo(() => [
        { label: t('salesmanWiseSalesReport.filters.all'), value: 'All' },
        ...currencyData.map(c => ({ label: `${c.currencySymbol} - ${c.currencyName}`, value: c.currencyId }))
    ], [currencyData, t]);

    const brandOptions = useMemo(() => [
        { label: t('salesmanWiseSalesReport.filters.all'), value: 'All' },
        ...brandData.map(b => ({ label: b.brandName || b.BrandName, value: b.brandId || b.BrandId }))
    ], [brandData, t]);

    const modeOptions = [
        { label: t('salesmanWiseSalesReport.filters.voucherWise'),  value: 'Voucher wise'  },
        { label: t('salesmanWiseSalesReport.filters.productWise'),  value: 'Product wise'  },
        { label: t('salesmanWiseSalesReport.filters.salesmanWise'), value: 'Salesman wise' },
    ];

    const formatDateTimeForAPI = (dateString, isEndOfDay = false) => {
        if (!dateString) return null;
        return isEndOfDay ? `${dateString} 23:59:59` : `${dateString} 00:00:00`;
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        try {
            const payload = {
                from_date:           formatDateTimeForAPI(filters.fromDate, false),
                to_date:             formatDateTimeForAPI(filters.toDate, true),
                employee_id:         filters.employeeId || null,
                mode:                filters.mode,
                branch_id:           Number(selectedBranchId),
                currency_id:         filters.currencyId,
                brand_id:            filters.brandId,
                is_accounts_posting: filters.isAccountsPosting
            };
            const response = await axiosInstance.post("sales-man-wise-sales-report", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({ id: Date.now(), type: 'info', message: t('salesmanWiseSalesReport.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching salesman wise sales report:", error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'mode') { setReportData(null); setAlert(null); }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, employeeId: null, mode: 'Voucher wise', currencyId: 'All', brandId: 'All', isAccountsPosting: false });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!reportData?.length) return null;
        const mode = filters.mode;

        let exportData, exportColumns;

        if (mode === 'Voucher wise') {
            exportData = reportData.map((row, i) => ({
                SNo:        row['Sl NO'] || i + 1,
                Date:       row['Date']       || '-',
                VoucherNo:  row['Voucher No'] || '-',
                Customer:   row['Customer']   || '-',
                DoneBy:     row['Done by']    || '-',
                BillAmount: Number(row['Bill Amount'] || 0).toFixed(decimalPart),
            }));
            exportColumns = [
                { key: 'SNo',        label: '#',                                                               align: 'center', width: 5  },
                { key: 'Date',       label: t('salesmanWiseSalesReport.grid.columns.date'),                    align: 'center', width: 10 },
                { key: 'VoucherNo',  label: t('salesmanWiseSalesReport.grid.columns.voucherNo'),               align: 'center', width: 12 },
                { key: 'Customer',   label: t('salesmanWiseSalesReport.grid.columns.customer'),                align: 'left',   width: 18 },
                { key: 'DoneBy',     label: t('salesmanWiseSalesReport.grid.columns.doneBy'),                  align: 'left',   width: 15 },
                { key: 'BillAmount', label: t('salesmanWiseSalesReport.grid.columns.billAmount'),              align: 'right',  width: 12 },
            ];
        } else {
            exportData = reportData.map((row, i) => ({
                SNo:  row['Sl NO'] || i + 1,
                Code: row['Code'] || '-',
                Item: row['Item'] || '-',
                Qty:  Number(row['Qty']  || 0).toFixed(3),
                Free: Number(row['Free'] || 0).toFixed(3),
            }));
            exportColumns = [
                { key: 'SNo',  label: '#',                                                   align: 'center', width: 5  },
                { key: 'Code', label: t('salesmanWiseSalesReport.grid.columns.code'),        align: 'center', width: 15 },
                { key: 'Item', label: t('salesmanWiseSalesReport.grid.columns.item'),        align: 'left',   width: 25 },
                { key: 'Qty',  label: t('salesmanWiseSalesReport.grid.columns.qty'),         align: 'right',  width: 12 },
                { key: 'Free', label: t('salesmanWiseSalesReport.grid.columns.free'),        align: 'right',  width: 12 },
            ];
        }

        return {
            fileName:      'Salesman_Wise_Sales_Report',
            sheetName:     'Salesman Sales',
            title:         t('salesmanWiseSalesReport.breadcrumb.title'),
            subtitle:      `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Mode: ${mode}`,
            data:          exportData,
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns:       exportColumns,
        };
    };
     const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.ID) return;

        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.ID}`);
    };

    const handleExportExcel = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('salesmanWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToExcel(o); };
    const handleExportPdf   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('salesmanWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToPdf({ ...o, orientation: 'landscape' }); };
    const handleExportCsv   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('salesmanWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToCsv(o); };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("salesmanWiseSalesReport.breadcrumb.group"), url: "#" },
        { title: t("salesmanWiseSalesReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: UserCheck, title: t("salesmanWiseSalesReport.breadcrumb.title") };

    if (privilegeLoading || initialLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

    /* ── Main Render ────────────────────────────────────────────────────── */
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
                    label: t('salesmanWiseSalesReport.export.label')
                } : null}
            />

            <div className="px-1">
                <SalesmanWiseSalesReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    employeeOptions={employeeOptions}
                    currencyOptions={currencyOptions}
                    brandOptions={brandOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId={`salesman-wise-sales-${filters.mode.replace(/\s/g, '-').toLowerCase()}`}
                    columns={columns}
                    data={reportDataWithSNo}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    onRowClick={handleRowClick}
                    pageSize={80}
                    maxHeight="calc(100vh - 300px)"
                />
            </div>
        </div>
    );
};

export default SalesmanWiseSalesReport;