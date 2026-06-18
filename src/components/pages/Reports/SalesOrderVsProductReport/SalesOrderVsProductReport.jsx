// src/components/pages/Reports/SalesOrderVsProductReport/SalesOrderVsProductReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingCart } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesOrderVsProductReportFilters from './SalesOrderVsProductReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesOrderVsProductReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data
    const [productData, setProductData] = useState([]);
    const [groupData, setGroupData] = useState([]);
    const [brandData, setBrandData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Order Vs Product Report");
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
        productCode: 'All',
        groupId: null,
        brandId: null,
        mode: 'Detailed'
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [productRes, groupRes, brandRes] = await Promise.all([
                axiosInstance.get(`products-grid-fill?branchId=${selectedBranchId}`).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("product-groups").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } }))
            ]);


            setProductData(productRes.data.data || []);
            setGroupData(groupRes.data.data || []);
            setBrandData(brandRes.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching dropdown data:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: parseInt(selectedBranchId) || 1,
            productCode: filters.productCode || null,
            groupId: filters.groupId || null,
            brandId: filters.brandId || null,
            mode: filters.mode
        };

        try {

            const res = await axiosInstance.post("sales-order-vs-product", requestBody);

            const responseData = res.data.data || res.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: index + 1
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
            console.error("❌ Sales Order Vs Product Report Error:", error);

            const errorMessage = error.response?.data?.message || error.message;
            setAlert({
                id: Date.now(),
                type: 'error',
                message: errorMessage
            });

            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIXED: Filter products based on selected group and brand
    const filteredProductOptions = useMemo(() => {
        let filteredProducts = productData;

        // Filter by group if selected
        // Products use group1Id, group2Id, group3Id, group4Id
        // Groups use groupId
        if (filters.groupId) {
            filteredProducts = productData.filter(product => {
                return (
                    product.group1Id === filters.groupId ||
                    product.group2Id === filters.groupId ||
                    product.group3Id === filters.groupId ||
                    product.group4Id === filters.groupId
                );
            });
        }

        // Filter by brand if selected
        // Products use brandId, Brands use brandId
        if (filters.brandId) {
            filteredProducts = filteredProducts.filter(product => {
                return product.brandId === filters.brandId;
            });
        }

        return [
            { label: t('All Products'), value: 'All' },
            ...filteredProducts.map(product => ({
                label: `${product.productCode} - ${product.productName}`,
                value: product.productCode
            }))
        ];
    }, [productData, filters.groupId, filters.brandId, t]);

    // Columns based on mode (Detailed vs Summary)
    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SNo', label: t('Sl NO'), align: 'center', width: '50px' },
                { key: 'Product Code', label: t('Product Code'), align: 'left', width: '110px' },
                { key: 'PartNo', label: t('Part No'), align: 'left', width: '90px' },
                { key: 'OrderNo', label: t('Order No'), align: 'center', width: '80px' },
                { key: 'Item', label: t('Item'), align: 'left', width: '180px' },
                { key: 'ledgerName', label: t('Customer'), align: 'left', width: '150px' },
                { key: 'Date', label: t('Date'), align: 'center', width: '150px' },
                { key: 'SO Qty', label: t('Qty'), align: 'right', width: '80px' },
                { key: 'SO Free', label: t('Free'), align: 'right', width: '70px' },
                { key: 'DN Qty', label: t('DN Qty'), align: 'right', width: '80px' },
                { key: 'DN Free', label: t('DN Free'), align: 'right', width: '80px' },
                { key: 'RI Qty', label: t('RI Qty'), align: 'right', width: '80px' },
                { key: 'RI Free', label: t('RI Free'), align: 'right', width: '80px' },
                { key: 'Sales Qty', label: t('Sales Qty'), align: 'right', width: '90px' },
                { key: 'Sales Free', label: t('Sales Free'), align: 'right', width: '90px' },
                { key: 'Pending Qty', label: t('Pending Qty'), align: 'right', width: '100px' },
                { key: 'Pending Free', label: t('Pending Free'), align: 'right', width: '100px' }
            ];
        } else {
            return [
                { key: 'SNo', label: t('Sl NO'), align: 'center', width: '50px' },
                { key: 'Product Code', label: t('Product Code'), align: 'left', width: '120px' },
                { key: 'PartNo', label: t('Part No'), align: 'left', width: '100px' },
                { key: 'Item', label: t('Item'), align: 'left', width: '250px' },
                { key: 'SO Qty', label: t('Qty'), align: 'right', width: '100px' },
                { key: 'SO Free', label: t('Free'), align: 'right', width: '90px' },
                { key: 'Pending Qty', label: t('Pending Qty'), align: 'right', width: '120px' },
                { key: 'Pending Free', label: t('Pending Free'), align: 'right', width: '120px' }
            ];
        }
    }, [filters.mode, t]);

    // Calculate totals based on mode
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        const numericKeys = filters.mode === 'Detailed'
            ? ['SO Qty', 'SO Free', 'DN Qty', 'DN Free', 'RI Qty', 'RI Free', 'Sales Qty', 'Sales Free', 'Pending Qty', 'Pending Free']
            : ['SO Qty', 'SO Free', 'Pending Qty', 'Pending Free'];

        return reportData.reduce((acc, row) => {
            numericKeys.forEach(key => {
                acc[key] = (acc[key] || 0) + (parseFloat(row[key]) || 0);
            });
            return acc;
        }, {});
    }, [reportData, filters.mode]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.mode === 'Detailed') {
            return {
                label: t('Total'),
                'SO Qty': totals['SO Qty']?.toFixed(decimalPart) || '0.00',
                'SO Free': totals['SO Free']?.toFixed(decimalPart) || '0.00',
                'DN Qty': totals['DN Qty']?.toFixed(decimalPart) || '0.00',
                'DN Free': totals['DN Free']?.toFixed(decimalPart) || '0.00',
                'RI Qty': totals['RI Qty']?.toFixed(decimalPart) || '0.00',
                'RI Free': totals['RI Free']?.toFixed(decimalPart) || '0.00',
                'Sales Qty': totals['Sales Qty']?.toFixed(decimalPart) || '0.00',
                'Sales Free': totals['Sales Free']?.toFixed(decimalPart) || '0.00',
                'Pending Qty': totals['Pending Qty']?.toFixed(decimalPart) || '0.00',
                'Pending Free': totals['Pending Free']?.toFixed(decimalPart) || '0.00'
            };
        } else {
            return {
                label: t('Total'),
                'SO Qty': totals['SO Qty']?.toFixed(decimalPart) || '0.00',
                'SO Free': totals['SO Free']?.toFixed(decimalPart) || '0.00',
                'Pending Qty': totals['Pending Qty']?.toFixed(decimalPart) || '0.00',
                'Pending Free': totals['Pending Free']?.toFixed(decimalPart) || '0.00'
            };
        }
    }, [reportData, totals, generalSettings?.decimalPart, filters.mode, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        let exportColumns;
        let exportData;

        if (filters.mode === 'Detailed') {
            exportColumns = [
                { key: 'SNo', label: t('Sl NO'), align: 'center', width: 5 },
                { key: 'Product Code', label: t('Product Code'), align: 'left', width: 12 },
                { key: 'PartNo', label: t('Part No'), align: 'left', width: 10 },
                { key: 'OrderNo', label: t('Order No'), align: 'center', width: 8 },
                { key: 'Item', label: t('Item'), align: 'left', width: 18 },
                { key: 'ledgerName', label: t('Customer'), align: 'left', width: 15 },
                { key: 'Date', label: t('Date'), align: 'center', width: 10 },
                { key: 'SO Qty', label: t('Qty'), align: 'right', width: 8, type: 'number' },
                { key: 'SO Free', label: t('Free'), align: 'right', width: 7, type: 'number' },
                { key: 'DN Qty', label: t('DN Qty'), align: 'right', width: 8, type: 'number' },
                { key: 'DN Free', label: t('DN Free'), align: 'right', width: 8, type: 'number' },
                { key: 'RI Qty', label: t('RI Qty'), align: 'right', width: 8, type: 'number' },
                { key: 'RI Free', label: t('RI Free'), align: 'right', width: 8, type: 'number' },
                { key: 'Sales Qty', label: t('Sales Qty'), align: 'right', width: 9, type: 'number' },
                { key: 'Sales Free', label: t('Sales Free'), align: 'right', width: 9, type: 'number' },
                { key: 'Pending Qty', label: t('Pending Qty'), align: 'right', width: 10, type: 'number' },
                { key: 'Pending Free', label: t('Pending Free'), align: 'right', width: 10, type: 'number' }
            ];

            exportData = reportData.map((row, index) => ({
                SNo: row.SNo || index + 1,
                'Product Code': row['Product Code'] || '',
                PartNo: row['PartNo'] || '',
                OrderNo: row['OrderNo'] || '',
                Item: row['Item'] || '',
                ledgerName: row['ledgerName'] || '',
                Date: row['Date'] || '',
                'SO Qty': Number(row['SO Qty'] || 0).toFixed(decimalPart),
                'SO Free': Number(row['SO Free'] || 0).toFixed(decimalPart),
                'DN Qty': Number(row['DN Qty'] || 0).toFixed(decimalPart),
                'DN Free': Number(row['DN Free'] || 0).toFixed(decimalPart),
                'RI Qty': Number(row['RI Qty'] || 0).toFixed(decimalPart),
                'RI Free': Number(row['RI Free'] || 0).toFixed(decimalPart),
                'Sales Qty': Number(row['Sales Qty'] || 0).toFixed(decimalPart),
                'Sales Free': Number(row['Sales Free'] || 0).toFixed(decimalPart),
                'Pending Qty': Number(row['Pending Qty'] || 0).toFixed(decimalPart),
                'Pending Free': Number(row['Pending Free'] || 0).toFixed(decimalPart)
            }));
        } else {
            exportColumns = [
                { key: 'SNo', label: t('Sl NO'), align: 'center', width: 8 },
                { key: 'Product Code', label: t('Product Code'), align: 'left', width: 15 },
                { key: 'PartNo', label: t('Part No'), align: 'left', width: 12 },
                { key: 'Item', label: t('Item'), align: 'left', width: 30 },
                { key: 'SO Qty', label: t('Qty'), align: 'right', width: 12, type: 'number' },
                { key: 'SO Free', label: t('Free'), align: 'right', width: 10, type: 'number' },
                { key: 'Pending Qty', label: t('Pending Qty'), align: 'right', width: 14, type: 'number' },
                { key: 'Pending Free', label: t('Pending Free'), align: 'right', width: 14, type: 'number' }
            ];

            exportData = reportData.map((row, index) => ({
                SNo: row.SNo || index + 1,
                'Product Code': row['Product Code'] || '',
                PartNo: row['PartNo'] || '',
                Item: row['Item'] || '',
                'SO Qty': Number(row['SO Qty'] || 0).toFixed(decimalPart),
                'SO Free': Number(row['SO Free'] || 0).toFixed(decimalPart),
                'Pending Qty': Number(row['Pending Qty'] || 0).toFixed(decimalPart),
                'Pending Free': Number(row['Pending Free'] || 0).toFixed(decimalPart)
            }));
        }

        return {
            fileName: `Sales_Order_Vs_Product_Report_${filters.mode}`,
            sheetName: 'Sales Order Vs Product',
            title: t('Sales Order Vs Product Report'),
            subtitle: `${t('Mode')}: ${filters.mode}`,
            reportInfo: {
                title: t('Sales Order Vs Product Report'),
                subtitle: `${t('Mode')}: ${filters.mode}`,
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: exportColumns
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    /* ------------------------------ Filter Handlers ------------------------------ */

    const handleFilterChange = (field, value) => {
        if (field === 'groupId' || field === 'brandId') {
            setFilters(prev => ({
                ...prev,
                [field]: value,
                productCode: 'All'
            }));
        } else {
            setFilters(prev => ({ ...prev, [field]: value }));
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            productCode: 'All',
            groupId: null,
            brandId: null,
            mode: 'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    // Dropdown options for Group
    const groupOptions = useMemo(() => [
        { label: t('All Groups'), value: null },
        ...groupData.map(group => ({
            label: group.groupName,
            value: group.groupId
        }))
    ], [groupData, t]);

    // Dropdown options for Brand
    const brandOptions = useMemo(() => [
        { label: t('All Brands'), value: null },
        ...brandData.map(brand => ({
            label: brand.brandName,
            value: brand.brandId
        }))
    ], [brandData, t]);

    const modeOptions = [
        { label: t('Detailed'), value: 'Detailed' },
        { label: t('Summary'), value: 'Summary' }
    ];
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.orderMasterId) return;

        navigate(`/transaction/sales-order/edit-sales-order/${row.orderMasterId}`);
    };
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // Numeric columns
        const numericKeys = ['SO Qty', 'SO Free', 'DN Qty', 'DN Free', 'RI Qty', 'RI Free', 'Sales Qty', 'Sales Free', 'Pending Qty', 'Pending Free'];

        if (numericKeys.includes(key)) {
            const numValue = parseFloat(value) || 0;

            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            // Color coding
            if (key === 'Pending Qty' || key === 'Pending Free') {
                return <div className="text-right text-orange-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'Sales Qty' || key === 'Sales Free') {
                return <div className="text-right text-green-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'SO Qty' || key === 'SO Free') {
                return <div className="text-right text-blue-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'DN Qty' || key === 'DN Free') {
                return <div className="text-right text-purple-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'RI Qty' || key === 'RI Free') {
                return <div className="text-right text-cyan-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }

            return <div className="text-right">{numValue.toFixed(decimalPart)}</div>;
        }

        // Order No - show dash if null
        if (key === 'OrderNo') {
            return value || '-';
        }

        // Product Code with badge style
        if (key === 'Product Code') {
            return (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    {value || '-'}
                </span>
            );
        }

        return value ?? '-';
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Sales Order Vs Product Report"), url: "#" },
                    ]}
                    heading={{ icon: ShoppingCart, title: t("Sales Order Vs Product Report") }}
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
                        { title: t("Sales Order Vs Product Report"), url: "#" },
                    ]}
                    heading={{ icon: ShoppingCart, title: t("Sales Order Vs Product Report") }}
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
                    { title: t("Reports"), url: "#" },
                    { title: t("Sales Order Vs Product Report"), url: "#" },
                ]}
                heading={{ icon: ShoppingCart, title: t("Sales Order Vs Product Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <SalesOrderVsProductReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    productOptions={filteredProductOptions}
                    groupOptions={groupOptions}
                    brandOptions={brandOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    onRowClick={handleRowClick}
                    maxHeight="calc(100vh - 280px)"
                />
            </div>
        </div>
    );
};

export default SalesOrderVsProductReport;