// src/components/pages/Reports/StockReport/StockReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { TrendingUp, Package, Image } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import StockReportFilters from './StockReportFilters';
import useReportExport from '@/hooks/useReportExport';

const StockReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    
    const [showImage, setShowImage] = useState(false);
    const [showFixedSalesRate, setShowFixedSalesRate] = useState(false);
    
    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Stock Report");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        criteria: 'All',
        isActive: true,
        isDatewise: true,
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        
        const requestBody = {
            criteria: filters.criteria,
            branchid: parseInt(selectedBranchId) || 1,
            isactive: filters.isActive,
            isdatewise: filters.isDatewise,
            fromdate: filters.isDatewise ? filters.fromDate : null,
            todate: filters.isDatewise ? filters.toDate : null
        };

        try {
            const res = await axiosInstance.post("product-stock-report", requestBody);
            
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
            console.error("❌ Product Stock Report Error:", error);
            
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

    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;
        
        return reportData.reduce((acc, row) => ({
            PurchaseRate: (acc.PurchaseRate || 0) + (parseFloat(row.PurchaseRate) || 0),
            FixedSalesRate: (acc.FixedSalesRate || 0) + (parseFloat(row.FixedSalesRate) || 0),
            CurrentStock: (acc.CurrentStock || 0) + (parseFloat(row.CurrentStock) || 0),
            StockValue: (acc.StockValue || 0) + (parseFloat(row.StockValue) || 0),
            CriteriaValue: (acc.CriteriaValue || 0) + (parseFloat(row.CriteriaValue) || 0)
        }), {});
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        
        const footer = { label: t('Total') };
        footer['CurrentStock'] = totals.CurrentStock?.toFixed(decimalPart) || '0.00';
        footer['StockValue'] = totals.StockValue?.toFixed(decimalPart) || '0.00';
        footer['CriteriaValue'] = totals.CriteriaValue?.toFixed(decimalPart) || '0.00';
        
        return footer;
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            ProductCode: row.ProductCode || '',
            ProductName: row.ProductName || '',
            BrandName: row.BrandName || '',
            UnitName: row.UnitName || '',
            PurchaseRate: Number(row.PurchaseRate || 0).toFixed(decimalPart),
            FixedSalesRate: Number(row.FixedSalesRate || 0).toFixed(decimalPart),
            CurrentStock: Number(row.CurrentStock || 0).toFixed(decimalPart),
            StockValue: Number(row.StockValue || 0).toFixed(decimalPart),
            CriteriaValue: Number(row.CriteriaValue || 0).toFixed(decimalPart)
        }));

        const exportColumns = [
            { key: 'SNo', label: '#', align: 'center', width: 6 },
            { key: 'ProductCode', label: t('Code'), align: 'left', width: 12 },
            { key: 'ProductName', label: t('Product Name'), align: 'left', width: 25 },
            { key: 'BrandName', label: t('Brand'), align: 'left', width: 12 },
            { key: 'UnitName', label: t('Unit'), align: 'center', width: 8 },
            { key: 'PurchaseRate', label: t('Purchase Rate'), align: 'right', width: 14, type: 'currency' }
        ];

        if (showFixedSalesRate) {
            exportColumns.push({ key: 'FixedSalesRate', label: t('Fixed Sales Rate'), align: 'right', width: 14, type: 'currency' });
        }

        exportColumns.push(
            { key: 'CurrentStock', label: t('Stock'), align: 'right', width: 12, type: 'currency' },
            { key: 'StockValue', label: t('Stock Value'), align: 'right', width: 14, type: 'currency' },
            { key: 'CriteriaValue', label: t('Criteria'), align: 'right', width: 12, type: 'currency' }
        );

        return {
            fileName: `Stock_Report_${filters.criteria}`,
            sheetName: 'Stock Report',
            title: t('Stock Report'),
            subtitle: `${t('Criteria')}: ${filters.criteria} | ${t('Items')}: ${reportData.length}`,
            reportInfo: {
                title: t('Stock Report'),
                subtitle: `${t('Criteria')}: ${filters.criteria}`,
                fromDate: filters.isDatewise ? filters.fromDate : null,
                toDate: filters.isDatewise ? filters.toDate : null
            },
            fromDate: filters.isDatewise ? filters.fromDate : null,
            toDate: filters.isDatewise ? filters.toDate : null,
            data: exportData,
            footer: {
                label: t('Total'),
                CurrentStock: totals.CurrentStock?.toFixed(decimalPart) || '0.00',
                StockValue: totals.StockValue?.toFixed(decimalPart) || '0.00',
                CriteriaValue: totals.CriteriaValue?.toFixed(decimalPart) || '0.00'
            },
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
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            criteria: 'All',
            isActive: true,
            isDatewise: true,
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0]
        });
        setReportData(null);
        setAlert(null);
    };

    const criteriaOptions = [
        { label: t('All'), value: 'All' },
        { label: t('Slow Moving'), value: 'SlowMoving' },
        { label: t('Fast Moving'), value: 'FastMoving' },
        { label: t('Non Moving'), value: 'NonMoving' }
    ];

    const columns = useMemo(() => {
        const cols = [
            { key: 'SNo', label: '#', align: 'center', minWidth: '40px' }
        ];

        if (showImage) {
            cols.push({ key: 'ProductImage', label: t('Image'), align: 'center', minWidth: '60px' });
        }

        cols.push(
            { key: 'ProductCode', label: t('Code'), align: 'left', minWidth: '80px' },
            { key: 'ProductName', label: t('Product Name'), align: 'left', minWidth: '150px' },
            { key: 'BrandName', label: t('Brand'), align: 'left', minWidth: '80px' },
            { key: 'UnitName', label: t('Unit'), align: 'center', minWidth: '50px' },
            { key: 'PurchaseRate', label: t('Purchase Rate'), align: 'right', minWidth: '90px' }
        );

        if (showFixedSalesRate) {
            cols.push({ key: 'FixedSalesRate', label: t('Fixed Sales Rate'), align: 'right', minWidth: '100px' });
        }

        cols.push(
            { key: 'CurrentStock', label: t('Stock'), align: 'right', minWidth: '70px' },
            { key: 'StockValue', label: t('Stock Value'), align: 'right', minWidth: '90px' },
            { key: 'CriteriaValue', label: t('Criteria'), align: 'right', minWidth: '80px' }
        );

        return cols;
    }, [showImage, showFixedSalesRate, t]);

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];
        
        if (key === 'ProductImage') {
            if (value) {
                return (
                    <div className="flex justify-center">
                        <img 
                            src={value}
                            alt={row.ProductName || 'Product'}
                            className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-600"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-8 h-8 hidden items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <Package className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                );
            }
            
            return (
                <div className="flex justify-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                        <Package className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            );
        }
        
        const numericKeys = ['PurchaseRate', 'FixedSalesRate', 'CurrentStock', 'StockValue', 'CriteriaValue'];
        
        if (numericKeys.includes(key)) {
            if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) {
                return <div className="text-right text-gray-400">0.00</div>;
            }
            
            const numValue = parseFloat(value);
            
            if (key === 'CurrentStock') {
                if (numValue === 0) {
                    return <div className="text-right text-orange-500 font-medium">0.00</div>;
                } else if (numValue < 0) {
                    return <div className="text-right text-red-600 font-bold">{numValue.toFixed(decimalPart)}</div>;
                }
            }
            
            return <div className="text-right">{numValue.toFixed(decimalPart)}</div>;
        }
        
        return value ?? '-';
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Stock Report"), url: "#" },
                    ]}
                    heading={{ icon: TrendingUp, title: t("Stock Report") }}
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
                        { title: t("Stock Report"), url: "#" },
                    ]}
                    heading={{ icon: TrendingUp, title: t("Stock Report") }}
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
                    { title: t("Stock Report"), url: "#" },
                ]}
                heading={{ icon: TrendingUp, title: t("Stock Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <StockReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    criteriaOptions={criteriaOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                {reportData && reportData.length > 0 && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg px-3 py-2 mb-2 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('Show Columns')}:
                        </span>
                        
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showImage}
                                onChange={(e) => setShowImage(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <Image className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                                {t('Image')}
                            </span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showFixedSalesRate}
                                onChange={(e) => setShowFixedSalesRate(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                                {t('Fixed Sales Rate')}
                            </span>
                        </label>

                        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                            {reportData.length} {t('items')}
                        </div>
                    </div>
                )}

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                />
            </div>
        </div>
    );
};

export default StockReport;