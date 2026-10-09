// src/components/pages/Reports/ProductWiseSalesSummaryReport/ProductWiseSalesSummaryReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replaces ProductWiseSalesSummaryReportGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BarChart3 } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductWiseSalesSummaryReportFilter from './ProductWiseSalesSummaryReportFilter';
import useReportExport from '@/hooks/useReportExport';

const ProductWiseSalesSummaryReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [categoryData, setCategoryData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Wise Sales Summary");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    // ── Columns ────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        { key: 'SNo',         label: '#',                                                                    align: 'center', width: '50'  },
        { key: 'PRODUCTCODE', label: t('productWiseSalesSummaryReport.grid.columns.productCode'),            align: 'center', width: '110' },
        { key: 'PRODUCTNAME', label: t('productWiseSalesSummaryReport.grid.columns.productName'),            align: 'left'                 },
        { key: 'CATGROUPNAME',label: t('productWiseSalesSummaryReport.grid.columns.category'),               align: 'left',   width: '130' },
        { key: 'TotQty',      label: t('productWiseSalesSummaryReport.grid.columns.qty'),                    align: 'right',  width: '100' },
        { key: 'TotSales',    label: t('productWiseSalesSummaryReport.grid.columns.sales'),                  align: 'right',  width: '120' },
        { key: 'TotTax',      label: t('productWiseSalesSummaryReport.grid.columns.tax'),                    align: 'right',  width: '110' },
        { key: 'Total',       label: t('productWiseSalesSummaryReport.grid.columns.total'),                  align: 'right',  width: '120' },
    ], [t]);

    // ── renderCell ─────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        switch (key) {
            case 'PRODUCTCODE':
                return row.PRODUCTCODE || '-';
            case 'PRODUCTNAME':
                return row.PRODUCTNAME || '-';
            case 'CATGROUPNAME':
                return row.CATGROUPNAME || row.CATEGORY || '-';
            case 'TotQty':
                return Number(row.TotQty || 0).toFixed(3);
            case 'TotSales':
                return Number(row.TotSales || 0).toFixed(decimalPart);
            case 'TotTax':
                return Number(row.TotTax || 0).toFixed(decimalPart);
            case 'Total':
                return Number(row.Total || 0).toFixed(decimalPart);
            default:
                return row[key] ?? '-';
        }
    };

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
        category: null
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const categoryRes = await axiosInstance.get("product-groups").catch(() => ({ data: { data: [] } }));
            setCategoryData(categoryRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const categoryOptions = useMemo(() => [
        { label: t('productWiseSalesSummaryReport.filters.all'), value: null },
        ...categoryData.map(cat => ({
            label: cat.groupName || cat.name,
            value: cat.groupId
        }))
    ], [categoryData, t]);

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        try {
            const payload = {
                fromdate: filters.fromDate,
                todate: filters.toDate,
                branchid: Number(selectedBranchId),
                category: null
            };
            const response = await axiosInstance.post("product-wise-sales-summary-report", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({ id: Date.now(), type: 'info', message: t('productWiseSalesSummaryReport.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching product wise sales summary report:", error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Frontend filtering by category
    const filteredData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) return null;
        if (filters.category === null) return reportData;
        return reportData.filter(row => row.CATGROUPID === filters.category);
    }, [reportData, filters.category]);

    // Add SNo to filtered data
    const filteredDataWithSNo = useMemo(() => {
        if (!filteredData) return null;
        return filteredData.map((item, index) => ({ ...item, SNo: index + 1 }));
    }, [filteredData]);

    // Totals → footerData keyed to match column keys
    const footerData = useMemo(() => {
        if (!filteredData?.length) return null;
        const totalQty   = filteredData.reduce((s, r) => s + (parseFloat(r.TotQty)   || 0), 0);
        const totalSales = filteredData.reduce((s, r) => s + (parseFloat(r.TotSales) || 0), 0);
        const totalTax   = filteredData.reduce((s, r) => s + (parseFloat(r.TotTax)   || 0), 0);
        const grandTotal = filteredData.reduce((s, r) => s + (parseFloat(r.Total)    || 0), 0);

        return {
            SNo:      t('productWiseSalesSummaryReport.grid.total') || 'Total',
            TotQty:   totalQty.toFixed(3),
            TotSales: totalSales.toFixed(decimalPart),
            TotTax:   totalTax.toFixed(decimalPart),
            Total:    grandTotal.toFixed(decimalPart),
        };
    }, [filteredData, decimalPart, t]);

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, category: null });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!filteredData?.length) return null;

        const selectedCat  = categoryOptions.find(c => c.value === filters.category);
        const categoryLabel = selectedCat ? selectedCat.label : 'All';

        return {
            fileName:  'Product_Wise_Sales_Summary_Report',
            sheetName: 'Product Sales Summary',
            title:     t('productWiseSalesSummaryReport.breadcrumb.title'),
            subtitle:  `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Category: ${categoryLabel}`,
            data: filteredData.map((row) => ({
                SNo:         row.SlNo || '-',
                ProductCode: row.PRODUCTCODE  || '-',
                ProductName: row.PRODUCTNAME  || '-',
                Category:    row.CATGROUPNAME || row.CATEGORY || '-',
                Qty:         Number(row.TotQty   || 0).toFixed(3),
                Sales:       Number(row.TotSales || 0).toFixed(decimalPart),
                Tax:         Number(row.TotTax   || 0).toFixed(decimalPart),
                Total:       Number(row.Total    || 0).toFixed(decimalPart),
            })),
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',         label: '#',                                                             align: 'center', width: 5  },
                { key: 'ProductCode', label: t('productWiseSalesSummaryReport.grid.columns.productCode'),     align: 'center', width: 12 },
                { key: 'ProductName', label: t('productWiseSalesSummaryReport.grid.columns.productName'),     align: 'left',   width: 20 },
                { key: 'Category',    label: t('productWiseSalesSummaryReport.grid.columns.category'),        align: 'left',   width: 12 },
                { key: 'Qty',         label: t('productWiseSalesSummaryReport.grid.columns.qty'),             align: 'right',  width: 10 },
                { key: 'Sales',       label: t('productWiseSalesSummaryReport.grid.columns.sales'),           align: 'right',  width: 12 },
                { key: 'Tax',         label: t('productWiseSalesSummaryReport.grid.columns.tax'),             align: 'right',  width: 10 },
                { key: 'Total',       label: t('productWiseSalesSummaryReport.grid.columns.total'),           align: 'right',  width: 12 },
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesSummaryReport.messages.noDataToExport') }); return; }
        exportGenericToExcel(options);
    };
    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesSummaryReport.messages.noDataToExport') }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesSummaryReport.messages.noDataToExport') }); return; }
        exportGenericToCsv(options);
    };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("productWiseSalesSummaryReport.breadcrumb.group"), url: "#" },
        { title: t("productWiseSalesSummaryReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: BarChart3, title: t("productWiseSalesSummaryReport.breadcrumb.title") };

    if (privilegeLoading || initialLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

    /* ── Main Render ────────────────────────────────────────────────────── */
    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={breadcrumbRoutes}
                heading={breadcrumbHeading}
                exportConfig={filteredData?.length ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('productWiseSalesSummaryReport.export.label')
                } : null}
            />

            <div className="px-1">
                <ProductWiseSalesSummaryReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    categoryOptions={categoryOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId="product-wise-sales-summary"
                    columns={columns}
                    data={filteredDataWithSNo || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    pageSize={80}
                    maxHeight='calc(100vh - 250px)'
                />
            </div>
        </div>
    );
};

export default ProductWiseSalesSummaryReport;