// src/components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWise.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Search } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductSearchVoucherWiseFilter from './ProductSearchVoucherWiseFilter';
import ProductSearchVoucherWiseGrid from './ProductSearchVoucherWiseGrid';
import useReportExport from '@/hooks/useReportExport';

const ProductSearchVoucherWise = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [searchData, setSearchData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [productData, setProductData] = useState([]);
    const [productGroupData, setProductGroupData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [employeeData, setEmployeeData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Search Voucher Wise");
    const { generalSettings } = useSelector((state) => state.settings);

    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            startDate: firstDay.toISOString().split('T')[0],
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
                    ledgerTypes: ["Customer", "Supplier"],
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

    // Dropdown options
    const productOptions = useMemo(() => {
        // Remove duplicates
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

    // Search/Fetch Data
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

    // Calculate totals
    const totals = useMemo(() => {
        if (!searchData || !Array.isArray(searchData) || searchData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;

        const totalQty = searchData.reduce((sum, row) => {
            const value = parseFloat(row['Qty'] || row['qty'] || 0);
            return sum + value;
        }, 0);

        const totalAmount = searchData.reduce((sum, row) => {
            const value = parseFloat(row['Amount'] || row['amount'] || row['TotalAmount'] || 0);
            return sum + value;
        }, 0);

        return {
            totalQty: totalQty.toFixed(3),
            totalAmount: totalAmount.toFixed(decimalPart),
            count: searchData.length
        };
    }, [searchData, generalSettings?.decimalPart]);

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

    /* ------------------------------ Export ------------------------------ */
    const getExportOptions = () => {
        if (!searchData || searchData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = searchData.map((row, index) => ({
            SNo: row['SlNo'] || row['Sl NO'] || index + 1,
            Date: row['Date'] || row['date'] || '-',
            VoucherType: row['VoucherType'] || row['Voucher Type'] || '-',
            VoucherNo: row['VoucherNo'] || row['Voucher No'] || row['BillNo'] || '-',
            ProductCode: row['ProductCode'] || row['productCode'] || '-',
            ProductName: row['ProductName'] || row['productName'] || row['Item'] || '-',
            Party: row['Party'] || row['CustomerName'] || row['SupplierName'] || row['LedgerName'] || '-',
            Qty: Number(row['Qty'] || row['qty'] || 0).toFixed(3),
            Rate: Number(row['Rate'] || row['rate'] || 0).toFixed(decimalPart),
            Amount: Number(row['Amount'] || row['amount'] || row['TotalAmount'] || 0).toFixed(decimalPart)
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
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: t('productSearchVoucherWise.grid.columns.date'), align: 'center', width: 10 },
                { key: 'VoucherType', label: t('productSearchVoucherWise.grid.columns.voucherType'), align: 'center', width: 12 },
                { key: 'VoucherNo', label: t('productSearchVoucherWise.grid.columns.voucherNo'), align: 'center', width: 10 },
                { key: 'ProductCode', label: t('productSearchVoucherWise.grid.columns.productCode'), align: 'center', width: 10 },
                { key: 'ProductName', label: t('productSearchVoucherWise.grid.columns.productName'), align: 'left', width: 18 },
                { key: 'Party', label: t('productSearchVoucherWise.grid.columns.party'), align: 'left', width: 15 },
                { key: 'Qty', label: t('productSearchVoucherWise.grid.columns.qty'), align: 'right', width: 8 },
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

                <ProductSearchVoucherWiseGrid
                    data={searchData}
                    loading={loading}
                    totals={totals}
                    decimalPart={generalSettings?.decimalPart || 2}
                />
            </div>
        </div>
    );
};

export default ProductSearchVoucherWise;