// src/components/pages/Reports/StockValueReport/StockValueReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Package } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import StockValueReportFilters from './StockValueReportFilters';
import useReportExport from '@/hooks/useReportExport';

const StockValueReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    
    const [groupData, setGroupData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [brandData, setBrandData] = useState([]);
    const [taxData, setTaxData] = useState([]);
    const [godownData, setGodownData] = useState([]);
    const [rackData, setRackData] = useState([]);
    
    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Stock Value Report");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        groupId: 'All',
        productCode: 'All',
        brandId: 'All',
        taxId: 'All',
        taxType: 'All',
        godownId: 'All',
        rackId: 'All',
        zeroStock: false,
        negativeStock: false
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        try {
            const [groupRes, productRes, brandRes, taxRes, godownRes] = await Promise.all([
                axiosInstance.get("product-groups").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("products-grid-fill?branchId=" + selectedBranchId).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("tax-masters").catch(() => ({ data: { data: [] } })),
                axiosInstance.get(`godowns/${selectedBranchId}`).catch(() => ({ data: { data: [] } }))
            ]);

            let rackRes = { data: { data: [] } };
            try {
                rackRes = await axiosInstance.get("racks");
            } catch {
                try {
                    rackRes = await axiosInstance.get(`racks/${selectedBranchId}`);
                } catch {
                    console.warn("⚠️ Racks API not available");
                }
            }

            setGroupData(groupRes.data.data || []);
            setProductData(productRes.data.data || []);
            setBrandData(brandRes.data.data || []);
            setTaxData(taxRes.data.data || []);
            setGodownData(godownRes.data.data || []);
            setRackData(rackRes.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching dropdown data:", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        
        const requestBody = {
            groupId: filters.groupId,
            productCode: filters.productCode,
            brandId: filters.brandId,
            taxId: filters.taxId,
            taxType: filters.taxType,
            godownId: filters.godownId,
            rackId: filters.rackId,
            branchId: parseInt(selectedBranchId) || 1,
            zeroStock: filters.zeroStock,
            negativeStock: filters.negativeStock
        };

        try {
            const res = await axiosInstance.post("stock-value-report", requestBody);
            
            const dataWithSNo = (res.data.data || []).map((item, index) => ({
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
            console.error("❌ Stock Value Report Error:", error);
            
            const errorMessage = error.response?.data?.message || error.message;
            
            if (errorMessage.includes('does not exist') || errorMessage.includes('Undefined function')) {
                setAlert({
                    id: Date.now(),
                    type: 'error',
                    message: t('This report is not yet configured. Please contact administrator.')
                });
            } else {
                setAlert({
                    id: Date.now(),
                    type: 'error',
                    message: errorMessage
                });
            }
            
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;
        
        return reportData.reduce((acc, row) => ({
            'Stock Qty': (acc['Stock Qty'] || 0) + (parseFloat(row['Stock Qty']) || 0),
            'StockValue': (acc['StockValue'] || 0) + (parseFloat(row['StockValue']) || 0),
            'Cost': (acc['Cost'] || 0) + (parseFloat(row['Cost']) || 0),
            'salesPrice': (acc['salesPrice'] || 0) + (parseFloat(row['salesPrice']) || 0)
        }), {});
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        
        return {
            label: t('Total'),
            'Stock Qty': totals['Stock Qty']?.toFixed(decimalPart) || '0.00',
            'StockValue': totals['StockValue']?.toFixed(decimalPart) || '0.00',
            'Cost': totals['Cost']?.toFixed(decimalPart) || '0.00',
            'salesPrice': totals['salesPrice']?.toFixed(decimalPart) || '0.00'
        };
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Code: row.Code || '',
            Product: row.Product || '',
            PartNo: row.PartNo || '',
            Brand: row.Brand || '',
            Unit: row.Unit || '',
            StockQty: Number(row['Stock Qty'] || 0).toFixed(decimalPart),
            Cost: Number(row.Cost || 0).toFixed(decimalPart),
            StockValue: Number(row.StockValue || 0).toFixed(decimalPart),
            salesPrice: Number(row.salesPrice || 0).toFixed(decimalPart),
            taxType: row.taxType || ''
        }));

        return {
            fileName: 'Stock_Value_Report',
            sheetName: 'Stock Value',
            title: t('Stock Value Report'),
            subtitle: `${t('Total Items')}: ${reportData.length}`,
            reportInfo: {
                title: t('Stock Value Report'),
                subtitle: `${t('Total Items')}: ${reportData.length}`
            },
            data: exportData,
            footer: {
                label: t('Total'),
                StockQty: totals['Stock Qty']?.toFixed(decimalPart) || '0.00',
                Cost: totals['Cost']?.toFixed(decimalPart) || '0.00',
                StockValue: totals['StockValue']?.toFixed(decimalPart) || '0.00',
                salesPrice: totals['salesPrice']?.toFixed(decimalPart) || '0.00'
            },
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 6 },
                { key: 'Code', label: t('Product Code'), align: 'left', width: 12 },
                { key: 'Product', label: t('Product Name'), align: 'left', width: 25 },
                { key: 'PartNo', label: t('Part No'), align: 'left', width: 12 },
                { key: 'Brand', label: t('Brand'), align: 'left', width: 12 },
                { key: 'Unit', label: t('Unit'), align: 'center', width: 8 },
                { key: 'StockQty', label: t('Stock Qty'), align: 'right', width: 12, type: 'currency' },
                { key: 'Cost', label: t('Cost'), align: 'right', width: 12, type: 'currency' },
                { key: 'StockValue', label: t('Stock Value'), align: 'right', width: 14, type: 'currency' },
                { key: 'salesPrice', label: t('Sales Price'), align: 'right', width: 12, type: 'currency' },
                { key: 'taxType', label: t('Tax Type'), align: 'center', width: 10 }
            ]
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
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            groupId: 'All',
            productCode: 'All',
            brandId: 'All',
            taxId: 'All',
            taxType: 'All',
            godownId: 'All',
            rackId: 'All',
            zeroStock: false,
            negativeStock: false
        });
        setReportData(null);
        setAlert(null);
    };

    // Dropdown options
    const groupOptions = [
        { label: t('All'), value: 'All' },
        ...groupData.map(group => ({
            label: group.groupName || group.GroupName,
            value: String(group.groupId || group.GroupId)
        }))
    ];

    const productOptions = [
        { label: t('All'), value: 'All' },
        ...productData.map(product => ({
            label: `${product.productCode} - ${product.productName}`,
            value: product.productCode
        }))
    ];

    const brandOptions = [
        { label: t('All'), value: 'All' },
        ...brandData.map(brand => ({
            label: brand.brandName || brand.BrandName,
            value: String(brand.brandId || brand.BrandId)
        }))
    ];

    const taxOptions = [
        { label: t('All'), value: 'All' },
        ...taxData.map(tax => ({
            label: tax.taxName || tax.TaxName,
            value: String(tax.taxId || tax.TaxId)
        }))
    ];

    const taxTypeOptions = [
        { label: t('All'), value: 'All' },
        { label: t('Included'), value: 'Included' },
        { label: t('Excluded'), value: 'Excluded' }
    ];

    const godownOptions = [
        { label: t('All'), value: 'All' },
        ...godownData.map(godown => ({
            label: godown.GodownName || godown.godownName,
            value: String(godown.GodownId || godown.godownId)
        }))
    ];

    const rackOptions = [
        { label: t('All'), value: 'All' },
        ...rackData.map(rack => ({
            label: rack.RackName || rack.rackName,
            value: String(rack.RackId || rack.rackId)
        }))
    ];

    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'Code', label: t('Product Code'), align: 'left' },
        { key: 'Product', label: t('Product Name'), align: 'left' },
        { key: 'PartNo', label: t('Part No'), align: 'left' },
        { key: 'Brand', label: t('Brand'), align: 'left' },
        { key: 'Unit', label: t('Unit'), align: 'center' },
        { key: 'Stock Qty', label: t('Stock Qty'), align: 'right' },
        { key: 'Cost', label: t('Cost'), align: 'right' },
        { key: 'StockValue', label: t('Stock Value'), align: 'right' },
        { key: 'salesPrice', label: t('Sales Price'), align: 'right' },
        { key: 'taxType', label: t('Tax Type'), align: 'center' }
    ];

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];
        
        const numericKeys = ['Stock Qty', 'Cost', 'StockValue', 'salesPrice'];
        
        if (numericKeys.includes(key)) {
            if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) {
                return <div className="text-right text-gray-400">{0 .toFixed(decimalPart)}</div>;
            }
            return (
                <div className="text-right">
                    {Number(value).toFixed(decimalPart)}
                </div>
            );
        }
        
        if (key === 'taxType') {
            return (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    value === 'Included' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                    {value || '-'}
                </span>
            );
        }

        if (key === 'Brand' && value === 'NA') {
            return <span className="text-gray-400">-</span>;
        }
        
        return value ?? '-';
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Stock Value Report"), url: "#" },
                    ]}
                    heading={{ icon: Package, title: t("Stock Value Report") }}
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
                        { title: t("Stock Value Report"), url: "#" },
                    ]}
                    heading={{ icon: Package, title: t("Stock Value Report") }}
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
                    { title: t("Stock Value Report"), url: "#" },
                ]}
                heading={{ icon: Package, title: t("Stock Value Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <StockValueReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    groupOptions={groupOptions}
                    productOptions={productOptions}
                    brandOptions={brandOptions}
                    taxOptions={taxOptions}
                    taxTypeOptions={taxTypeOptions}
                    godownOptions={godownOptions}
                    rackOptions={rackOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    maxHeight='calc(100vh - 260px)'
                />
            </div>
        </div>
    );
};

export default StockValueReport;