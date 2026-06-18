// src/components/pages/Reports/AreaWiseSalesReport/AreaWiseSalesReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replaces AreaWiseSalesReportGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { MapPin } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import AreaWiseSalesReportFilter from './AreaWiseSalesReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const AreaWiseSalesReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [employeeData, setEmployeeData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);
    const [routeData, setRouteData] = useState([]);
    const [marketData, setMarketData] = useState([]);
    const [areaData, setAreaData] = useState([]);
    const [brandData, setBrandData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Areawise Sales Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.salesmasterid) return;

        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.salesmasterid}`);
    };


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
        employeeId: 0,
        mode: 'Voucher Wise',
        currencyId: 0,
        routeId: 0,
        marketId: 0,
        areaId: 0,
        brandId: 0,
        optional: false,
        isAccountsPosting: false
    });

    // ── Columns (same schema for both modes — API returns same fields) ─────
    const columns = useMemo(() => [
        { key: 'SNo',         label: '#',                                                              align: 'center', width: '50'  },
        { key: 'salesdate',   label: t('areaWiseSalesReport.grid.columns.date'),                       align: 'center', width: '100' },
        { key: 'invoiceno',   label: t('areaWiseSalesReport.grid.columns.invoiceNo'),                  align: 'left',   width: '120' },
        { key: 'productcode', label: t('areaWiseSalesReport.grid.columns.productCode'),                align: 'center', width: '110' },
        { key: 'productname', label: t('areaWiseSalesReport.grid.columns.productName'),                align: 'left'                 },
        { key: 'salesman',    label: t('areaWiseSalesReport.grid.columns.salesman'),                   align: 'left',   width: '130' },
        { key: 'qty',         label: t('areaWiseSalesReport.grid.columns.qty'),                        align: 'right',  width: '90'  },
        { key: 'freeqty',     label: t('areaWiseSalesReport.grid.columns.freeQty'),                    align: 'right',  width: '90'  },
        { key: 'rate',        label: t('areaWiseSalesReport.grid.columns.rate'),                       align: 'right',  width: '100' },
        { key: 'discount',    label: t('areaWiseSalesReport.grid.columns.discount'),                   align: 'right',  width: '100' },
        { key: 'grossamount', label: t('areaWiseSalesReport.grid.columns.grossAmount'),                align: 'right',  width: '120' },
    ], [t]);

    // ── renderCell ─────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        switch (key) {
            case 'salesdate':   return row.salesdate   || row.SalesDate   || '-';
            case 'invoiceno':   return row.invoiceno   || row.InvoiceNo   || '-';
            case 'productcode': return row.productcode || row.ProductCode || '-';
            case 'productname': return row.productname || row.ProductName || '-';
            case 'salesman':    return row.salesman    || row.Salesman    || '-';
            case 'qty':         return Number(row.qty      || row.Qty      || 0).toFixed(3);
            case 'freeqty':     return Number(row.freeqty  || row.FreeQty  || 0).toFixed(3);
            case 'rate':        return Number(row.rate      || row.Rate     || 0).toFixed(decimalPart);
            case 'discount':    return Number(row.discount  || row.Discount || 0).toFixed(decimalPart);
            case 'grossamount': return Number(row.grossamount || row.GrossAmount || 0).toFixed(decimalPart);
            default:            return row[key] ?? '-';
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
        const sum = (a, b) => reportData.reduce((s, r) => s + (parseFloat(r[a] || r[b]) || 0), 0);
        return {
            SNo:         t('areaWiseSalesReport.grid.total') || 'Total',
            qty:         sum('qty',         'Qty').toFixed(3),
            freeqty:     sum('freeqty',     'FreeQty').toFixed(3),
            discount:    sum('discount',    'Discount').toFixed(decimalPart),
            grossamount: sum('grossamount', 'GrossAmount').toFixed(decimalPart),
        };
    }, [reportData, decimalPart, t]);

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [employeeRes, currencyRes, routeRes, marketRes, areaRes, brandRes] = await Promise.all([
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("routes").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("markets").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("areas").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } }))
            ]);
            setEmployeeData(employeeRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
            setRouteData(routeRes.data.data || []);
            setMarketData(marketRes.data.data || []);
            setAreaData(areaRes.data.data || []);
            setBrandData(brandRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const employeeOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...employeeData.map(e => ({ label: e.employeeName || e.EmployeeName || e.name, value: e.employeeId || e.EmployeeId || e.id }))
    ], [employeeData, t]);

    const currencyOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...currencyData.map(c => ({ label: `${c.currencySymbol || c.CurrencySymbol} - ${c.currencyName || c.CurrencyName}`, value: c.currencyId || c.CurrencyId }))
    ], [currencyData, t]);

    const routeOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...routeData.map(r => ({ label: r.RouteName || r.routeName || r.name, value: r.RouteId || r.routeId || r.id }))
    ], [routeData, t]);

    const marketOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...marketData.map(m => ({ label: m.MarketName || m.marketName || m.name, value: m.MarketId || m.marketId || m.id }))
    ], [marketData, t]);

    const areaOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...areaData.map(a => ({ label: a.AreaName || a.areaName || a.name, value: a.AreaId || a.areaId || a.id }))
    ], [areaData, t]);

    const brandOptions = useMemo(() => [
        { label: t('areaWiseSalesReport.filters.all'), value: 0 },
        ...brandData.map(b => ({ label: b.brandName || b.BrandName, value: b.brandId || b.BrandId }))
    ], [brandData, t]);

    const modeOptions = [
        { label: t('areaWiseSalesReport.filters.all'),        value: null          },
        { label: t('areaWiseSalesReport.filters.voucherWise'), value: 'Voucher Wise' },
        { label: t('areaWiseSalesReport.filters.productWise'), value: 'Product Wise' },
    ];

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        try {
            const payload = {
                fromDate:          filters.fromDate,
                toDate:            filters.toDate,
                employeeId:        filters.employeeId || null,
                mode:              filters.mode       || null,
                branchId:          Number(selectedBranchId),
                optional:          filters.optional,
                currencyId:        filters.currencyId || null,
                routeId:           filters.routeId    || null,
                marketId:          filters.marketId   || null,
                areaId:            filters.areaId     || null,
                brandId:           filters.brandId    || null,
                decimalPoint:      decimalPart,
                isAccountsPosting: filters.isAccountsPosting
            };
            const response = await axiosInstance.post("areawise-sales-report", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({ id: Date.now(), type: 'info', message: t('areaWiseSalesReport.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching area wise sales report:", error);
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
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, employeeId: 0, mode: 'Voucher Wise', currencyId: 0, routeId: 0, marketId: 0, areaId: 0, brandId: 0, optional: false, isAccountsPosting: false });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!reportData?.length) return null;
        return {
            fileName:      'Area_Wise_Sales_Report',
            sheetName:     'Area Sales',
            title:         t('areaWiseSalesReport.breadcrumb.title'),
            subtitle:      `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Mode: ${filters.mode}`,
            data: reportData.map((row, i) => ({
                SNo:         row.slno        || i + 1,
                Date:        row.salesdate   || '-',
                InvoiceNo:   row.invoiceno   || '-',
                ProductCode: row.productcode || '-',
                ProductName: row.productname || '-',
                Salesman:    row.salesman    || '-',
                Qty:         Number(row.qty         || 0).toFixed(3),
                FreeQty:     Number(row.freeqty     || 0).toFixed(3),
                Rate:        Number(row.rate        || 0).toFixed(decimalPart),
                Discount:    Number(row.discount    || 0).toFixed(decimalPart),
                GrossAmount: Number(row.grossamount || 0).toFixed(decimalPart),
            })),
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',         label: '#',                                                              align: 'center', width: 5  },
                { key: 'Date',        label: t('areaWiseSalesReport.grid.columns.date'),                       align: 'center', width: 10 },
                { key: 'InvoiceNo',   label: t('areaWiseSalesReport.grid.columns.invoiceNo'),                  align: 'center', width: 10 },
                { key: 'ProductCode', label: t('areaWiseSalesReport.grid.columns.productCode'),                align: 'center', width: 10 },
                { key: 'ProductName', label: t('areaWiseSalesReport.grid.columns.productName'),                align: 'left',   width: 18 },
                { key: 'Salesman',    label: t('areaWiseSalesReport.grid.columns.salesman'),                   align: 'left',   width: 12 },
                { key: 'Qty',         label: t('areaWiseSalesReport.grid.columns.qty'),                        align: 'right',  width: 8  },
                { key: 'FreeQty',     label: t('areaWiseSalesReport.grid.columns.freeQty'),                    align: 'right',  width: 8  },
                { key: 'Rate',        label: t('areaWiseSalesReport.grid.columns.rate'),                       align: 'right',  width: 10 },
                { key: 'Discount',    label: t('areaWiseSalesReport.grid.columns.discount'),                   align: 'right',  width: 10 },
                { key: 'GrossAmount', label: t('areaWiseSalesReport.grid.columns.grossAmount'),                align: 'right',  width: 12 },
            ]
        };
    };

    const handleExportExcel = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('areaWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToExcel(o); };
    const handleExportPdf   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('areaWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToPdf({ ...o, orientation: 'landscape' }); };
    const handleExportCsv   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('areaWiseSalesReport.messages.noDataToExport') }); return; } exportGenericToCsv(o); };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("areaWiseSalesReport.breadcrumb.group"), url: "#" },
        { title: t("areaWiseSalesReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: MapPin, title: t("areaWiseSalesReport.breadcrumb.title") };

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
                    label: t('areaWiseSalesReport.export.label')
                } : null}
            />

            <div className="px-1">
                <AreaWiseSalesReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    employeeOptions={employeeOptions}
                    currencyOptions={currencyOptions}
                    routeOptions={routeOptions}
                    marketOptions={marketOptions}
                    areaOptions={areaOptions}
                    brandOptions={brandOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId={`area-wise-sales-${(filters.mode || 'all').replace(/\s/g, '-').toLowerCase()}`}
                    columns={columns}
                    data={reportDataWithSNo}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    pageSize={80}
                    maxHeight="calc(100vh - 350px)"
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
};

export default AreaWiseSalesReport;