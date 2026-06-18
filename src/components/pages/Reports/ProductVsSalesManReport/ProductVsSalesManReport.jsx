// src/components/pages/Reports/ProductVsSalesManReport/ProductVsSalesManReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replaces ProductVsSalesManReportGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Package } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductVsSalesManReportFilter from './ProductVsSalesManReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const ProductVsSalesManReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [productGroupData, setProductGroupData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [brandData, setBrandData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Vs Salesman Report");
    const { generalSettings } = useSelector((state) => state.settings);
const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.ID) return;

        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.ID}`);
    };

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
        groupId: 'All',
        productCode: 'All',
        brandId: 0,
        mode: 'Detailed',
        isAccountsPosting: false
    });

    // ── Columns (same schema for both Detailed / Summary modes) ───────────
    const columns = useMemo(() => [
        { key: 'SNo',        label: '#',                                                               align: 'center', width: '50'  },
        { key: 'Date',       label: t('productVsSalesManReport.grid.columns.date'),                    align: 'center', width: '100' },
        { key: 'VoucherNo',  label: t('productVsSalesManReport.grid.columns.voucherNo'),               align: 'left',   width: '120' },
        { key: 'PartNo',     label: t('productVsSalesManReport.grid.columns.partNo'),                  align: 'center', width: '110' },
        { key: 'Item',       label: t('productVsSalesManReport.grid.columns.item'),                    align: 'left'                 },
        { key: 'SalesMan',   label: t('productVsSalesManReport.grid.columns.salesman'),                align: 'left',   width: '130' },
        { key: 'Qty',        label: t('productVsSalesManReport.grid.columns.qty'),                     align: 'right',  width: '90'  },
        { key: 'Free',       label: t('productVsSalesManReport.grid.columns.free'),                    align: 'right',  width: '90'  },
        { key: 'Rate',       label: t('productVsSalesManReport.grid.columns.rate'),                    align: 'right',  width: '100' },
        { key: 'Amount',     label: t('productVsSalesManReport.grid.columns.amount'),                  align: 'right',  width: '120' },
    ], [t]);

    // ── renderCell ─────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        switch (key) {
            case 'Date':      return row['Date']       || '-';
            case 'VoucherNo': return row['Voucher No'] || '-';
            case 'PartNo':    return row['PartNo']     || '-';
            case 'Item':      return row['Item']       || '-';
            case 'SalesMan':  return row['SalesMan']   || '-';
            case 'Qty':       return Number(row['Qty']    || 0).toFixed(3);
            case 'Free':      return Number(row['Free']   || 0).toFixed(3);
            case 'Rate':      return Number(row['Rate']   || 0).toFixed(decimalPart);
            case 'Amount':    return Number(row['Amount'] || 0).toFixed(decimalPart);
            default:          return row[key] ?? '-';
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
        const sum = (key) => reportData.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
        return {
            SNo:    t('productVsSalesManReport.grid.total') || 'Total',
            Qty:    sum('Qty').toFixed(3),
            Free:   sum('Free').toFixed(3),
            Amount: sum('Amount').toFixed(decimalPart),
        };
    }, [reportData, decimalPart, t]);

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [productGroupRes, productRes, brandRes] = await Promise.all([
                axiosInstance.get("product-groups").catch(() => ({ data: { data: [] } })),
                axiosInstance.get(`products-grid-fill?branchId=${selectedBranchId}`).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } }))
            ]);
            setProductGroupData(productGroupRes.data.data || []);
            setProductData(productRes.data.data || []);
            setBrandData(brandRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const productGroupOptions = useMemo(() => [
        { label: t('productVsSalesManReport.filters.all'), value: 'All' },
        ...productGroupData.map(g => ({ label: g.groupName, value: g.groupId }))
    ], [productGroupData, t]);

    const productOptions = useMemo(() => {
        let filtered = productData;
        if (filters.groupId && filters.groupId !== 'All') {
            filtered = productData.filter(p => p.group1Id === filters.groupId);
        }
        const unique = filtered.reduce((acc, p) => {
            if (!acc.find(x => x.productCode === p.productCode)) acc.push(p);
            return acc;
        }, []);
        return [
            { label: t('productVsSalesManReport.filters.all'), value: 'All' },
            ...unique.map(p => ({ label: `${p.productCode} - ${p.productName}`, value: p.productCode }))
        ];
    }, [productData, filters.groupId, t]);

    const brandOptions = useMemo(() => [
        { label: t('productVsSalesManReport.filters.all'), value: 0 },
        ...brandData.map(b => ({ label: b.brandName || b.BrandName, value: b.brandId || b.BrandId }))
    ], [brandData, t]);

    const modeOptions = [
        { label: t('productVsSalesManReport.filters.detailed'), value: 'Detailed' },
        { label: t('productVsSalesManReport.filters.summary'),  value: 'Summary'  },
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
                fromDate:          formatDateTimeForAPI(filters.fromDate, false),
                toDate:            formatDateTimeForAPI(filters.toDate, true),
                groupId:           filters.groupId,
                productCode:       filters.productCode,
                branchId:          Number(selectedBranchId),
                brandId:           filters.brandId,
                mode:              filters.mode,
                isAccountsPosting: filters.isAccountsPosting
            };
            const response = await axiosInstance.post("product-vs-salesman", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({ id: Date.now(), type: 'info', message: t('productVsSalesManReport.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching product vs salesman report:", error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'groupId') next.productCode = 'All';
            return next;
        });
        if (field === 'mode') { setReportData(null); setAlert(null); }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, groupId: 'All', productCode: 'All', brandId: 0, mode: 'Detailed', isAccountsPosting: false });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!reportData?.length) return null;
        return {
            fileName:      'Product_Vs_Salesman_Report',
            sheetName:     'Product Vs Salesman',
            title:         t('productVsSalesManReport.breadcrumb.title'),
            subtitle:      `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Mode: ${filters.mode}`,
            data: reportData.map((row, i) => ({
                SNo:       i + 1,
                Date:      row['Date']       || '-',
                VoucherNo: row['Voucher No'] || '-',
                PartNo:    row['PartNo']     || '-',
                Item:      row['Item']       || '-',
                SalesMan:  row['SalesMan']   || '-',
                Qty:       Number(row['Qty']    || 0).toFixed(3),
                Free:      Number(row['Free']   || 0).toFixed(3),
                Rate:      Number(row['Rate']   || 0).toFixed(decimalPart),
                Amount:    Number(row['Amount'] || 0).toFixed(decimalPart),
            })),
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',       label: '#',                                                               align: 'center', width: 5  },
                { key: 'Date',      label: t('productVsSalesManReport.grid.columns.date'),                    align: 'center', width: 10 },
                { key: 'VoucherNo', label: t('productVsSalesManReport.grid.columns.voucherNo'),               align: 'center', width: 10 },
                { key: 'PartNo',    label: t('productVsSalesManReport.grid.columns.partNo'),                  align: 'center', width: 10 },
                { key: 'Item',      label: t('productVsSalesManReport.grid.columns.item'),                    align: 'left',   width: 18 },
                { key: 'SalesMan',  label: t('productVsSalesManReport.grid.columns.salesman'),                align: 'left',   width: 12 },
                { key: 'Qty',       label: t('productVsSalesManReport.grid.columns.qty'),                     align: 'right',  width: 8  },
                { key: 'Free',      label: t('productVsSalesManReport.grid.columns.free'),                    align: 'right',  width: 8  },
                { key: 'Rate',      label: t('productVsSalesManReport.grid.columns.rate'),                    align: 'right',  width: 10 },
                { key: 'Amount',    label: t('productVsSalesManReport.grid.columns.amount'),                  align: 'right',  width: 12 },
            ]
        };
    };

    const handleExportExcel = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('productVsSalesManReport.messages.noDataToExport') }); return; } exportGenericToExcel(o); };
    const handleExportPdf   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('productVsSalesManReport.messages.noDataToExport') }); return; } exportGenericToPdf({ ...o, orientation: 'landscape' }); };
    const handleExportCsv   = () => { const o = getExportOptions(); if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('productVsSalesManReport.messages.noDataToExport') }); return; } exportGenericToCsv(o); };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("productVsSalesManReport.breadcrumb.group"), url: "#" },
        { title: t("productVsSalesManReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: Package, title: t("productVsSalesManReport.breadcrumb.title") };

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
                    label: t('productVsSalesManReport.export.label')
                } : null}
            />

            <div className="px-1">
                <ProductVsSalesManReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    productGroupOptions={productGroupOptions}
                    productOptions={productOptions}
                    brandOptions={brandOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId={`product-vs-salesman-${filters.mode.toLowerCase()}`}
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

export default ProductVsSalesManReport;