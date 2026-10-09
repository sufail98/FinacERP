// src/components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWise.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Search } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductSearchVoucherWiseFilter from './ProductSearchVoucherWiseFilter';
import useReportExport from '@/hooks/useReportExport';

const ProductSearchVoucherWise = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [searchData, setSearchData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [productData, setProductData] = useState([]);
    const [productGroupData, setProductGroupData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [employeeData, setEmployeeData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Product wise Voucher Search");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const getDefaultDates = () => {
        const today = new Date();
        return {
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        startDate: defaultDates.startDate,
        endDate: defaultDates.endDate,
        productCode: 'All',
        voucherType: 'All',
        groupId: 'All',
        ledgerId: 'All',
        employeeId: 'All',
        startText: ''
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [productRes, productGroupRes, ledgerRes, employeeRes] = await Promise.all([
                axiosInstance.get("products-grid-fill?branchId=" + selectedBranchId).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("product-groups").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer", "Supplier", "Customer&Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } }))
            ]);

            setProductData(productRes.data.data || []);
            setProductGroupData(productGroupRes.data.data || []);
            setLedgerData(ledgerRes.data.data || []);
            setEmployeeData(employeeRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const productOptions = useMemo(() => {
        const uniqueProducts = productData.reduce((acc, product) => {
            if (!acc.find(p => p.productCode === product.productCode)) {
                acc.push(product);
            }
            return acc;
        }, []);

        return [
            { label: t('productSearchVoucherWise.filters.all'), value: 'All' },
            ...uniqueProducts.map(product => ({
                label: `${product.productCode} - ${product.productName}`,
                value: product.productCode
            }))
        ];
    }, [productData, t]);

    const productGroupOptions = useMemo(() => {
        return [
            { label: t('productSearchVoucherWise.filters.all'), value: 'All' },
            ...productGroupData.map(group => ({
                label: group.groupName,
                value: group.groupId
            }))
        ];
    }, [productGroupData, t]);

    const ledgerOptions = useMemo(() => {
        return [
            { label: t('productSearchVoucherWise.filters.all'), value: 'All' },
            ...ledgerData.map(ledger => ({
                label: ledger.ledgerName,
                value: ledger.ledgerId
            }))
        ];
    }, [ledgerData, t]);

    const employeeOptions = useMemo(() => {
        return [
            { label: t('productSearchVoucherWise.filters.all'), value: 'All' },
            ...employeeData.map(emp => ({
                label: emp.employeeName || emp.name,
                value: emp.employeeId || emp.id
            }))
        ];
    }, [employeeData, t]);

    const voucherTypeOptions = [
        { label: t('productSearchVoucherWise.filters.all'), value: 'All' },
        { label: t('productSearchVoucherWise.filters.salesInvoice'), value: 'Sales Invoice' },
        { label: t('productSearchVoucherWise.filters.salesReturn'), value: 'Sales Return' },
        { label: t('productSearchVoucherWise.filters.purchaseInvoice'), value: 'Purchase Invoice' },
        { label: t('productSearchVoucherWise.filters.purchaseReturn'), value: 'Purchase Return' },
        { label: t('productSearchVoucherWise.filters.deliveryNote'), value: 'Delivery Note' },
        { label: t('productSearchVoucherWise.filters.salesOrder'), value: 'Sales Order' },
        { label: t('productSearchVoucherWise.filters.purchaseOrder'), value: 'Purchase Order' },
        { label: t('productSearchVoucherWise.filters.materialReceipt'), value: 'Material Receipt' }
    ];

    const fetchData = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                branchId: Number(selectedBranchId),
                startDate: filters.startDate,
                endDate: filters.endDate,
                productCode: filters.productCode,
                voucherType: filters.voucherType,
                groupId: filters.groupId,
                ledgerId: filters.ledgerId,
                employeeId: filters.employeeId,
                startText: filters.startText
            };

            const response = await axiosInstance.post("product-search-vocuher-wise", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('productSearchVoucherWise.messages.noDataFound')
                });
                setSearchData([]);
            } else {
                setSearchData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching product search data:", error);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || error.message
            });
            setSearchData(null);
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        if (!searchData || !Array.isArray(searchData) || searchData.length === 0) {
            return null;
        }

        const totalInwardQty = searchData.reduce((sum, row) => sum + parseFloat(row['inwardQty'] || 0), 0);
        const totalOutwardQty = searchData.reduce((sum, row) => sum + parseFloat(row['outwardQty'] || 0), 0);
        const totalAmount = searchData.reduce((sum, row) => sum + parseFloat(row['cost'] || 0), 0);

        return {
            totalInwardQty: totalInwardQty.toFixed(3),
            totalOutwardQty: totalOutwardQty.toFixed(3),
            totalQty: (totalOutwardQty - totalInwardQty).toFixed(3),
            totalAmount: totalAmount.toFixed(decimalPart),
            count: searchData.length
        };
    }, [searchData, decimalPart]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            startDate: dates.startDate,
            endDate: dates.endDate,
            productCode: 'All',
            voucherType: 'All',
            groupId: 'All',
            ledgerId: 'All',
            employeeId: 'All',
            startText: ''
        });
        setSearchData(null);
        setAlert(null);
    };

    /* ------------------------------ Grid columns / cell rendering ------------------------------ */
    const formatDate = (value) => {
        if (!value) return '-';
        const datePart = String(value).split(' ')[0];
        const [y, m, d] = datePart.split('-');
        if (!y || !m || !d) return datePart;
        return `${d}-${m}-${y}`;
    };

    const formatNumber = (value, decimals = 3) => {
        
        const num = Number(value);
        
        if (isNaN(num)) return '-';
        return num.toFixed(decimals);
    };

    const columns = useMemo(() => ([
        { key: 'SNo', label: t('productSearchVoucherWise.grid.columns.slNo'), align: 'center', width: '50' },
        { key: 'date', label: t('productSearchVoucherWise.grid.columns.date'), align: 'center', width: '110' },
        { key: 'voucherType', label: t('productSearchVoucherWise.grid.columns.voucherType'), align: 'center', width: '110' },
        { key: 'voucherNo', label: t('productSearchVoucherWise.grid.columns.voucherNo'), align: 'center', width: '90' },
        { key: 'productCode', label: t('productSearchVoucherWise.grid.columns.productCode'), align: 'center', width: '100' },
        { key: 'productName', label: t('productSearchVoucherWise.grid.columns.productName'), align: 'left' },
        { key: 'UnitName', label: t('productSearchVoucherWise.grid.columns.Unit'), align: 'center', width: '80' },
        { key: 'inwardQty', label: t('productSearchVoucherWise.grid.columns.qty') + ' (In)', align: 'right', width: '100' },
        { key: 'outwardQty', label: t('productSearchVoucherWise.grid.columns.qty') + ' (Out)', align: 'right', width: '100' },
        { key: 'rate', label: t('productSearchVoucherWise.grid.columns.rate'), align: 'right', width: '100' },
        { key: 'cost', label: t('productSearchVoucherWise.grid.columns.amount'), align: 'right', width: '120' },
    ]), [t]);

    const renderCell = (key, row) => {
        switch (key) {
            case 'date':
                return formatDate(row.date);
            case 'Type':
                return row.Type || '-';
            case 'voucherNo':
                return row.voucherNo ?? '-';
            case 'productCode':
                return row.productCode ?? '-';
            case 'productName':
                return row.productName || '-';
            case 'UnitName':
                return row.UnitName || '-';
            case 'inwardQty':
                return formatNumber(row.inwardQty, 3);
            case 'outwardQty':
                return formatNumber(row.outwardQty, 3);
            case 'rate':
                return formatNumber(row.rate, decimalPart);
            case 'cost':
                return formatNumber(row.cost, decimalPart);
            default:
                return row[key] ?? '-';
        }
    };

    const footerData = totals ? {
        label: t('productSearchVoucherWise.grid.total'),
        productName: t('productSearchVoucherWise.grid.total'),
        inwardQty: totals.totalInwardQty,
        outwardQty: totals.totalOutwardQty,
        cost: totals.totalAmount,
    } : null;

    /* ------------------------------ Export ------------------------------ */
    const getExportOptions = () => {
        if (!searchData || searchData.length === 0) return null;

        const exportData = searchData.map((row, index) => ({
            SNo: index + 1,
            Date: formatDate(row.date),
            VoucherType: row.Type || '-',
            VoucherNo: row.voucherNo || '-',
            ProductCode: row.productCode || '-',
            ProductName: row.productName || '-',
            InwardQty: Number(row.inwardQty || 0).toFixed(3),
            OutwardQty: Number(row.outwardQty || 0).toFixed(3),
            Rate: Number(row.rate || 0).toFixed(decimalPart),
            Amount: Number(row.Cost || 0).toFixed(decimalPart)
        }));

        return {
            fileName: 'Product_Search_Voucher_Wise',
            sheetName: 'Product Search',
            title: t('productSearchVoucherWise.breadcrumb.title'),
            subtitle: `${t('common.fromDate')}: ${filters.startDate} - ${t('common.toDate')}: ${filters.endDate}`,
            data: exportData,
            footer: totals,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: t('productSearchVoucherWise.grid.columns.slNo'), align: 'center', width: 5 },
                { key: 'Date', label: t('productSearchVoucherWise.grid.columns.date'), align: 'center', width: 10 },
                { key: 'VoucherType', label: t('productSearchVoucherWise.grid.columns.voucherType'), align: 'center', width: 12 },
                { key: 'VoucherNo', label: t('productSearchVoucherWise.grid.columns.voucherNo'), align: 'center', width: 10 },
                { key: 'ProductCode', label: t('productSearchVoucherWise.grid.columns.productCode'), align: 'center', width: 10 },
                { key: 'ProductName', label: t('productSearchVoucherWise.grid.columns.productName'), align: 'left', width: 18 },
                { key: 'InwardQty', label: t('productSearchVoucherWise.grid.columns.qty') + ' (In)', align: 'right', width: 8 },
                { key: 'OutwardQty', label: t('productSearchVoucherWise.grid.columns.qty') + ' (Out)', align: 'right', width: 8 },
                { key: 'Rate', label: t('productSearchVoucherWise.grid.columns.rate'), align: 'right', width: 10 },
                { key: 'Amount', label: t('productSearchVoucherWise.grid.columns.amount'), align: 'right', width: 12 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productSearchVoucherWise.messages.noDataToExport') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productSearchVoucherWise.messages.noDataToExport') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productSearchVoucherWise.messages.noDataToExport') });
            return;
        }
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("productSearchVoucherWise.breadcrumb.group"), url: "#" },
                        { title: t("productSearchVoucherWise.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Search, title: t("productSearchVoucherWise.breadcrumb.title") }}
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
                        { title: t("productSearchVoucherWise.breadcrumb.group"), url: "#" },
                        { title: t("productSearchVoucherWise.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Search, title: t("productSearchVoucherWise.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && (
                <AlertBox
                    key={alert.id}
                    message={alert.message}
                    type={alert.type}
                />
            )}

            <BreadCrumb
                routes={[
                    { title: t("productSearchVoucherWise.breadcrumb.group"), url: "#" },
                    { title: t("productSearchVoucherWise.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Search, title: t("productSearchVoucherWise.breadcrumb.title") }}
                exportConfig={searchData && searchData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('productSearchVoucherWise.export.label')
                } : null}
            />

            <div className="px-1">
                <ProductSearchVoucherWiseFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onSearch={fetchData}
                    productOptions={productOptions}
                    productGroupOptions={productGroupOptions}
                    ledgerOptions={ledgerOptions}
                    employeeOptions={employeeOptions}
                    voucherTypeOptions={voucherTypeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                    initialLoading={initialLoading}
                />

                <ContentTable
                    columns={columns}
                    data={searchData || []}
                    renderCell={renderCell}
                    loading={loading}
                    footerData={footerData}
                    staticSearchable={true}
                    sortable={true}
                    tableId="product-search-voucher-wise"
                    pageSize={100}
                    maxHeight="calc(100vh - 320px)"
                />
            </div>
        </div>
    );
};

export default ProductSearchVoucherWise;