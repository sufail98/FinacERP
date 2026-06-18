// UsedStockReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { PackageCheck } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import UsedStockReportFilter from './UsedStockReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const UsedStockReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [userData, setUserData] = useState([]);
    const [unitData, setUnitData] = useState([]);
    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Used Stock Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        userId: null,
        mode: "Summary"
    });

    useEffect(() => {
        fetchUserData();
        fetchUnitData();
    }, []);
 const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.usedStockMasterId) return;
        navigate(`/transaction/used-stock/edit/${row.usedStockMasterId}`);
    };
    const fetchUserData = async () => {
        try {
            const res = await axiosInstance.get("users");
            setUserData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const fetchUnitData = async () => {
        try {
            const res = await axiosInstance.get("units");
            setUnitData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching units:", err);
        }
    };

    const getUnitName = (unitId) => {
        if (!unitId) return '-';
        const unit = unitData.find(u => u.unitId === unitId);
        return unit ? unit.unitName : '-';
    };

    const fetchReport = async () => {
        setLoading(true);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: selectedBranchId?.toString() || "1",
            userId: filters.userId ? filters.userId.toString() : null,
            mode: filters.mode || "Summary"
        };

        try {
            const res = await axiosInstance.post("used-stock/report", requestBody);
            const rawData = res.data.data || [];

            if (rawData.length === 0) {
                setReportData([]);
                return;
            }

            const dp = generalSettings?.decimalPart || 2;

            // Map API response fields to component keys
            const mappedData = rawData.map((row, index) => ({
                usedStockMasterId: row.usedStockMasterId,
                SlNo: row.SlNo || index + 1,
                Date: row.Date || '',
                VoucherNo: row.VoucherNo || '',
                ProductCode: row.ProductCode || '',
                Barcode: row.Barcode || '',
                Quantity: row.Qty ? parseFloat(row.Qty).toFixed(dp) : '',
                Rate: row.Rate ? parseFloat(row.Rate).toFixed(dp) : '',
                Amount: filters.mode === 'Detailed'
                    ? (row.DetailAmount ? parseFloat(row.DetailAmount).toFixed(dp) : '')
                    : (row.TotalAmount ? parseFloat(row.TotalAmount).toFixed(dp) : ''),
                TotalAmount: row.TotalAmount ? parseFloat(row.TotalAmount).toFixed(dp) : '',
                Narration: row.Narration || '',
                UnitId: row.UnitId,
                UnitName: getUnitName(row.UnitId)
            }));

            setReportData(mappedData);
        } catch (error) {
            console.error("❌ Used Stock Report Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const { totalQuantity, totalAmount } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalQuantity: 0, totalAmount: 0 };
        }

        if (filters.mode === 'Detailed') {
            // Sum all detail amounts and quantities
            return reportData.reduce((totals, row) => ({
                totalQuantity: totals.totalQuantity + (parseFloat(row.Quantity) || 0),
                totalAmount: totals.totalAmount + (parseFloat(row.Amount) || 0)
            }), { totalQuantity: 0, totalAmount: 0 });
        } else {
            // For summary, sum total amounts (no duplicates - one row per voucher)
            return reportData.reduce((totals, row) => ({
                totalQuantity: totals.totalQuantity, // Not applicable in summary
                totalAmount: totals.totalAmount + (parseFloat(row.TotalAmount) || 0)
            }), { totalQuantity: 0, totalAmount: 0 });
        }
    }, [reportData, filters.mode]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const dp = generalSettings?.decimalPart || 2;
        
        if (filters.mode === 'Detailed') {
            return {
                label: t('Total'),
                Quantity: totalQuantity.toFixed(dp),
                Amount: totalAmount.toFixed(dp)
            };
        } else {
            return {
                label: t('Total'),
                TotalAmount: totalAmount.toFixed(dp)
            };
        }
    }, [reportData, totalQuantity, totalAmount, generalSettings?.decimalPart, filters.mode, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const dp = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => {
            const baseData = {
                SlNo: row.SlNo || index + 1,
                Date: row.Date || '',
                VoucherNo: row.VoucherNo || ''
            };

            if (isDetailed) {
                return {
                    ...baseData,
                    ProductCode: row.ProductCode || '',
                    Barcode: row.Barcode || '',
                    Quantity: row.Quantity || '',
                    UnitName: row.UnitName || '',
                    Rate: row.Rate || '',
                    Amount: row.Amount || '',
                    Narration: row.Narration || ''
                };
            } else {
                return {
                    ...baseData,
                    TotalAmount: row.TotalAmount || '',
                    Narration: row.Narration || ''
                };
            }
        });

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'ProductCode', label: 'Product Code', align: 'left', width: 15 },
            { key: 'Barcode', label: 'Barcode', align: 'left', width: 15 },
            { key: 'Quantity', label: 'Quantity', align: 'right', width: 10, type: 'number' },
            { key: 'UnitName', label: 'Unit', align: 'center', width: 8 },
            { key: 'Rate', label: 'Rate', align: 'right', width: 12, type: 'currency' },
            { key: 'Amount', label: 'Amount', align: 'right', width: 14, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 20 }
        ];

        const summaryColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 8 },
            { key: 'Date', label: 'Date', align: 'center', width: 15 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 15 },
            { key: 'TotalAmount', label: 'Total Amount', align: 'right', width: 20, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 40 }
        ];

        const title = isDetailed
            ? t('usedStockReport.breadcrumb.detailedTitle') || 'Used Stock Detailed Report'
            : t('usedStockReport.breadcrumb.title') || 'Used Stock Report';

        return {
            fileName: isDetailed ? 'Used_Stock_Detailed_Report' : 'Used_Stock_Report',
            sheetName: isDetailed ? 'Used Detailed' : 'Used Summary',
            title,
            subtitle: `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: dp,
            columns: isDetailed ? detailedColumns : summaryColumns
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

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            userId: null,
            mode: 'Summary'
        });
        setReportData(null);
    };

    const userOptions = userData.map(u => ({
        label: u.userName || u.name,
        value: u.userId
    }));

    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SlNo', label: t('usedStockReport.columns.SNo'), align: 'center', width: '55' },
                { key: 'Date', label: t('usedStockReport.columns.Date'), align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('usedStockReport.columns.VoucherNo'), align: 'center', width: '120' },
                { key: 'ProductCode', label: t('usedStockReport.columns.ProductCode'), align: 'left', width: '130' },
                { key: 'Barcode', label: t('usedStockReport.columns.Barcode'), align: 'left', width: '130' },
                { key: 'Quantity', label: t('usedStockReport.columns.Quantity'), align: 'right', width: '100' },
                { key: 'UnitName', label: t('usedStockReport.columns.Unit'), align: 'center', width: '80' },
                { key: 'Rate', label: t('usedStockReport.columns.Rate'), align: 'right', width: '100' },
                { key: 'Amount', label: t('usedStockReport.columns.Amount'), align: 'right', width: '120' },
                { key: 'Narration', label: t('usedStockReport.columns.Narration'), align: 'left', width: '180' }
            ];
        }
        // Summary mode
        return [
            { key: 'SlNo', label: t('usedStockReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'Date', label: t('usedStockReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('usedStockReport.columns.VoucherNo'), align: 'center', width: '130' },
            { key: 'TotalAmount', label: t('usedStockReport.columns.TotalAmount'), align: 'right', width: '150' },
            { key: 'Narration', label: t('usedStockReport.columns.Narration'), align: 'left' }
        ];
    }, [filters.mode, t]);

    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === "Date") {
            return row[key] ?? "-";
        }
        if (key === "Quantity") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row.Quantity || '-'}</span>
                    </div>
                </div>
            );
        }
        if (key === "Rate") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row.Rate || '-'}</span>
                    </div>
                </div>
            );
        }
        if (key === "Amount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row.Amount || '-'}</span>
                    </div>
                </div>
            );
        }
        if (key === "TotalAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row.TotalAmount || '-'}</span>
                    </div>
                </div>
            );
        }
        return row[key] ?? "-";
    };

    if (loading || privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("usedStockReport.breadcrumb.group"), url: "#" },
                        { title: t("usedStockReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageCheck, title: t("usedStockReport.breadcrumb.title") }}
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
                        { title: t("usedStockReport.breadcrumb.group"), url: "#" },
                        { title: t("usedStockReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageCheck, title: t("usedStockReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("usedStockReport.breadcrumb.group"), url: "#" },
                    { title: t("usedStockReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: PackageCheck, title: t("usedStockReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <UsedStockReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    userOptions={userOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    tableId="used-stock-report"
                    pageSize={80}
                    onRowClick={handleRowClick}
                    // Group by usedStockMasterId in Detailed mode
                    groupBy={filters.mode === 'Detailed' ? 'usedStockMasterId' : null}
                    // In Detailed mode: merge common voucher info, but NOT product details
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNo', 'Date', 'VoucherNo'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default UsedStockReport;