// src/components/pages/Reports/InventoryReports/InventoryReports.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Archive } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import InventoryReportsFilters from './InventoryReportsFilters';
import useReportExport from '@/hooks/useReportExport';

// Report Type Configuration
const REPORT_TYPES = {
    FAST_MOVING: {
        key: 'isFastMoving',
        title: 'Fast Moving Stock',
        icon: TrendingUp,
        privilegeName: 'Fast Moving',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        darkBgColor: 'dark:bg-green-900'
    },
    SLOW_MOVING: {
        key: 'isSlowMoving',
        title: 'Slow Moving Stock',
        icon: TrendingDown,
        privilegeName: 'Slow Moving',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        darkBgColor: 'dark:bg-orange-900'
    },
    MINIMUM_LEVEL: {
        key: 'isMinimum',
        title: 'Minimum Level Stock',
        icon: AlertTriangle,
        privilegeName: 'Minimum Level',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        darkBgColor: 'dark:bg-red-900'
    },
    MAXIMUM_LEVEL: {
        key: 'isMaximum',
        title: 'Maximum Level Stock',
        icon: CheckCircle,
        privilegeName: 'Maximum Level',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        darkBgColor: 'dark:bg-blue-900'
    },
    REORDER_LEVEL: {
        key: 'isReorder',
        title: 'Reorder Level Stock',
        icon: AlertTriangle,
        privilegeName: 'Reorder Level',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        darkBgColor: 'dark:bg-yellow-900'
    },
    UNUSED_STOCK: {
        key: 'isUnused',
        title: 'Unused Stock',
        icon: Archive,
        privilegeName: 'Unused Stock',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        darkBgColor: 'dark:bg-gray-700'
    }
};

const InventoryReports = ({ type = 'FAST_MOVING' }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    
    const [groupData, setGroupData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [brandData, setBrandData] = useState([]);
    const [godownData, setGodownData] = useState([]);
    const [rackData, setRackData] = useState([]);
    
    const { selectedBranchId } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const { saleSettings } = useSelector((state) => state.settings);
    const [tableMaxHeight, setTableMaxHeight] = useState('calc(100vh - 230px)');

    // Get current report configuration
    const reportConfig = REPORT_TYPES[type];
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges(reportConfig.privilegeName);

    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        groupId: null,
        productCode: null,
        brandId: null,
        godownId: null,
        rackId: null,
        showNegative: false,
        showDamaged: false,
        showUsedStock: false
    });
useEffect(()=>{
    fetchReport()
},[selectedBranchId])

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        
        const requestBody = {
            branchId: parseInt(selectedBranchId) || 1,
            [reportConfig.key]: true
        };

        try {
            const res = await axiosInstance.post("inventory-reports", requestBody);
            
            const dataWithSNo = (res.data.data || []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));
            
            setReportData(dataWithSNo);
            if (dataWithSNo.length >= 100) setTableMaxHeight('calc(100vh - 255px)');
            
            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error(`❌ ${reportConfig.title} Error:`, error);
            
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
            'CurrentStock': (acc['CurrentStock'] || 0) + (parseFloat(row['CurrentStock']) || 0),
            'MinimumStock': (acc['MinimumStock'] || 0) + (parseFloat(row['MinimumStock']) || 0),
            'MaximumStock': (acc['MaximumStock'] || 0) + (parseFloat(row['MaximumStock']) || 0),
            'ReorderLevel': (acc['ReorderLevel'] || 0) + (parseFloat(row['ReorderLevel']) || 0),
            'StockValue': (acc['StockValue'] || 0) + (parseFloat(row['StockValue']) || 0)
        }), {});
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        
        return {
            label: t('Total'),
            'CurrentStock': totals['CurrentStock']?.toFixed(decimalPart) || '0.00',
            'MinimumStock': totals['MinimumStock']?.toFixed(decimalPart) || '0.00',
            'MaximumStock': totals['MaximumStock']?.toFixed(decimalPart) || '0.00',
            'ReorderLevel': totals['ReorderLevel']?.toFixed(decimalPart) || '0.00',
            'StockValue': totals['StockValue']?.toFixed(decimalPart) || '0.00'
        };
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Code: row.Code || row.ProductCode || '',
            Product: row.Product || row.ProductName || '',
            PartNo: row.PartNo || row.PartNumber || '',
            Brand: row.Brand || row.BrandName || '',
            Unit: row.Unit || row.UnitName || '',
            CurrentStock: Number(row.CurrentStock || row['Current Stock'] || 0).toFixed(decimalPart),
            MinimumStock: Number(row.MinimumStock || row['Minimum Stock'] || 0).toFixed(decimalPart),
            MaximumStock: Number(row.MaximumStock || row['Maximum Stock'] || 0).toFixed(decimalPart),
            ReorderLevel: Number(row.ReorderLevel || row['Reorder Level'] || 0).toFixed(decimalPart),
            StockValue: Number(row.StockValue || row['Stock Value'] || 0).toFixed(decimalPart),
            Godown: row.Godown || row.GodownName || '',
            Rack: row.Rack || row.RackName || ''
        }));

        return {
            fileName: `${reportConfig.title.replace(/ /g, '_')}_Report`,
            sheetName: reportConfig.title,
            title: t(reportConfig.title),
            subtitle: `${t('Total Items')}: ${reportData.length}`,
            reportInfo: {
                title: t(reportConfig.title),
                subtitle: `${t('Total Items')}: ${reportData.length}`
            },
            data: exportData,
            footer: {
                label: t('Total'),
                CurrentStock: totals['CurrentStock']?.toFixed(decimalPart) || '0.00',
                MinimumStock: totals['MinimumStock']?.toFixed(decimalPart) || '0.00',
                MaximumStock: totals['MaximumStock']?.toFixed(decimalPart) || '0.00',
                ReorderLevel: totals['ReorderLevel']?.toFixed(decimalPart) || '0.00',
                StockValue: totals['StockValue']?.toFixed(decimalPart) || '0.00'
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
                { key: 'CurrentStock', label: t('Current Stock'), align: 'right', width: 12, type: 'currency' },
                { key: 'MinimumStock', label: t('Minimum Stock'), align: 'right', width: 12, type: 'currency' },
                { key: 'MaximumStock', label: t('Maximum Stock'), align: 'right', width: 12, type: 'currency' },
                { key: 'ReorderLevel', label: t('Reorder Level'), align: 'right', width: 12, type: 'currency' },
                { key: 'StockValue', label: t('Stock Value'), align: 'right', width: 14, type: 'currency' },
                ...(saleSettings?.ActiveGodown ? [{ key: 'Godown', label: t('Godown'), align: 'left', width: 12 }] : []),
                { key: 'Rack', label: t('Rack'), align: 'left', width: 10 }
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
            groupId: null,
            productCode: null,
            brandId: null,
            godownId: null,
            rackId: null,
            showNegative: false,
            showDamaged: false,
            showUsedStock: false
        });
        setReportData(null);
        setAlert(null);
    };

    // Dropdown options
    const groupOptions = [
        { label: t('All'), value: null },
        ...groupData.map(group => ({
            label: group.groupName || group.GroupName,
            value: String(group.groupId || group.GroupId)
        }))
    ];

    const productOptions = [
        { label: t('All'), value: null },
        ...productData.map(product => ({
            label: `${product.productCode} - ${product.productName}`,
            value: product.productCode
        }))
    ];

    const brandOptions = [
        { label: t('All'), value: null },
        ...brandData.map(brand => ({
            label: brand.brandName || brand.BrandName,
            value: String(brand.brandId || brand.BrandId)
        }))
    ];

    const godownOptions = [
        { label: t('All'), value: null },
        ...godownData.map(godown => ({
            label: godown.GodownName || godown.godownName,
            value: String(godown.GodownId || godown.godownId)
        }))
    ];

    const rackOptions = [
        { label: t('All'), value: null },
        ...rackData.map(rack => ({
            label: rack.RackName || rack.rackName,
            value: String(rack.RackId || rack.rackId)
        }))
    ];

    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'Code', label: t('Product Code'), align: 'left' },
        { key: 'Product', label: t('Product Name'), align: 'left', width: '350px' },
        { key: 'PartNo', label: t('Part No'), align: 'left' },
        { key: 'Brand', label: t('Brand'), align: 'left' },
        { key: 'Unit', label: t('Unit'), align: 'center', width: '60px' },
        { key: 'CurrentStock', label: t('Current Stock'), align: 'right' },
        { key: 'MinimumStock', label: t('Minimum Stock'), align: 'right' },
        { key: 'MaximumStock', label: t('Maximum Stock'), align: 'right' },
        { key: 'ReorderLevel', label: t('Reorder Level'), align: 'right' },
        { key: 'StockValue', label: t('Stock Value'), align: 'right' },
        ...(saleSettings?.ActiveGodown ? [{ key: 'Godown', label: t('Godown'), align: 'left' }] : []),
        { key: 'Rack', label: t('Rack'), align: 'left' }
    ];

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        
        // Handle different possible key names from API
        const getValue = (possibleKeys) => {
            for (const k of possibleKeys) {
                if (row[k] !== undefined && row[k] !== null) return row[k];
            }
            return null;
        };

        let value;
        switch (key) {
            case 'Code':
                value = getValue(['Code', 'ProductCode', 'code']);
                break;
            case 'Product':
                value = getValue(['Product', 'ProductName', 'product']);
                break;
            case 'PartNo':
                value = getValue(['PartNo', 'PartNumber', 'partNo']);
                break;
            case 'Brand':
                value = getValue(['Brand', 'BrandName', 'brand']);
                break;
            case 'Unit':
                value = getValue(['Unit', 'UnitName', 'unit']);
                break;
            case 'CurrentStock':
                value = getValue(['CurrentStock', 'Current Stock', 'currentStock']);
                break;
            case 'MinimumStock':
                value = getValue(['MinimumStock', 'Minimum Stock', 'minimumStock']);
                break;
            case 'MaximumStock':
                value = getValue(['MaximumStock', 'Maximum Stock', 'maximumStock']);
                break;
            case 'ReorderLevel':
                value = getValue(['ReorderLevel', 'Reorder Level', 'reorderLevel']);
                break;
            case 'StockValue':
                value = getValue(['StockValue', 'Stock Value', 'stockValue']);
                break;
            case 'Godown':
                value = getValue(['Godown', 'GodownName', 'godown']);
                break;
            case 'Rack':
                value = getValue(['Rack', 'RackName', 'rack']);
                break;
            default:
                value = row[key];
        }
        
        const numericKeys = ['CurrentStock', 'MinimumStock', 'MaximumStock', 'ReorderLevel', 'StockValue'];
        
        if (numericKeys.includes(key)) {
            if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) {
                return <div className="text-right text-gray-400">{(0).toFixed(decimalPart)}</div>;
            }
            
            const numValue = Number(value);
            let colorClass = 'text-gray-900 dark:text-gray-100';
            
            // Add color coding based on stock levels and report type
            if (key === 'CurrentStock') {
                const minStock = parseFloat(getValue(['MinimumStock', 'Minimum Stock', 'minimumStock'])) || 0;
                const maxStock = parseFloat(getValue(['MaximumStock', 'Maximum Stock', 'maximumStock'])) || 0;
                const reorderLevel = parseFloat(getValue(['ReorderLevel', 'Reorder Level', 'reorderLevel'])) || 0;
                
                if (numValue < 0) {
                    colorClass = 'text-red-600 dark:text-red-400 font-semibold';
                } else if (numValue <= minStock) {
                    colorClass = 'text-red-600 dark:text-red-400';
                } else if (numValue <= reorderLevel) {
                    colorClass = 'text-yellow-600 dark:text-yellow-400';
                } else if (numValue >= maxStock && maxStock > 0) {
                    colorClass = 'text-blue-600 dark:text-blue-400';
                }
            }
            
            return (
                <div className={`text-right ${colorClass}`}>
                    {numValue.toFixed(decimalPart)}
                </div>
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
                        { title: t("Inventory Reports"), url: "#" },
                        { title: t(reportConfig.title), url: "#" },
                    ]}
                    heading={{ icon: reportConfig.icon, title: t(reportConfig.title) }}
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
                        { title: t("Inventory Reports"), url: "#" },
                        { title: t(reportConfig.title), url: "#" },
                    ]}
                    heading={{ icon: reportConfig.icon, title: t(reportConfig.title) }}
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
                    { title: t("Inventory Reports"), url: "#" },
                    { title: t(reportConfig.title), url: "#" },
                ]}
                heading={{ icon: reportConfig.icon, title: t(reportConfig.title) }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="p-1">
                {/* <InventoryReportsFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    groupOptions={groupOptions}
                    productOptions={productOptions}
                    brandOptions={brandOptions}
                    godownOptions={godownOptions}
                    rackOptions={rackOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                    reportType={type}
                    reportConfig={reportConfig}
                /> */}

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    maxHeight={tableMaxHeight}
                    pageSize={100}
                    staticSearchable
                    sortable
                />
            </div>
        </div>
    );
};

export default InventoryReports;