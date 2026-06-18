// DamageStockReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { PackageX } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DamageStockReportFilter from './DamageStockReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const DamageStockReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [userData, setUserData] = useState([]);
    const [unitData, setUnitData] = useState([]);
    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Damage Stock Report");
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
        if (!row.damageStockMasterId) return;
        navigate(`/transaction/damage-stock/edit/${row.damageStockMasterId}`);
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
            const res = await axiosInstance.post("damage-stock-report", requestBody);
            const rawData = res.data.data || [];

            if (rawData.length === 0) {
                setReportData([]);
                return;
            }

            const dp = generalSettings?.decimalPart || 2;

            // Map API response fields to component keys
            const mappedData = rawData.map((row, index) => ({
                damageStockMasterId: row.damageStockMasterId,
                SlNo: row.SlNo || index + 1,
                Date: row.Date || '',
                VoucherNo: row.VoucherNo || '',
                ProductCode: row.ProductCode || '',
                ProductDescription: row.ProductDescription || '',
                Barcode: row.Barcode || '',
                Quantity: row.Qty ? parseFloat(row.Qty).toFixed(dp) : '',
                Rate: row.Rate ? parseFloat(row.Rate).toFixed(dp) : '',
                Amount: filters.mode === 'Detailed'
                    ? (row.DetailAmount ? parseFloat(row.DetailAmount).toFixed(dp) : '')
                    : (row.TotalAmount ? parseFloat(row.TotalAmount).toFixed(dp) : ''),
                TotalAmount: row.TotalAmount ? parseFloat(row.TotalAmount).toFixed(dp) : '',
                Narration: row.Narration || '',
                UnitId: row.UnitId,
                UnitName: getUnitName(row.UnitId),
                GodownId: row.GodownId,
                RackId: row.RackId
            }));

            setReportData(mappedData);
        } catch (error) {
            console.error("❌ Damage Stock Report Error:", error);
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
            // For summary, sum total amounts (no duplicates)
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
                Amount: totalAmount.toFixed(dp)
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
                VoucherNo: row.VoucherNo || '',
                Narration: row.Narration || ''
            };

            if (isDetailed) {
                return {
                    ...baseData,
                    ProductCode: row.ProductCode || '',
                    Barcode: row.Barcode || '',
                    ProductDescription: row.ProductDescription || '',
                    Quantity: row.Quantity || '',
                    UnitName: row.UnitName || '',
                    Rate: row.Rate || '',
                    Amount: row.Amount || ''
                };
            } else {
                return {
                    ...baseData,
                    TotalAmount: row.TotalAmount || ''
                };
            }
        });

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'ProductCode', label: 'Product Code', align: 'left', width: 15 },
            { key: 'Barcode', label: 'Barcode', align: 'left', width: 15 },
            { key: 'ProductDescription', label: 'Description', align: 'left', width: 20 },
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
            ? t('damageStockReport.breadcrumb.detailedTitle') || 'Damage Stock Detailed Report'
            : t('damageStockReport.breadcrumb.title') || 'Damage Stock Report';

        return {
            fileName: isDetailed ? 'Damage_Stock_Detailed_Report' : 'Damage_Stock_Report',
            sheetName: isDetailed ? 'Damage Detailed' : 'Damage Summary',
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
                { key: 'SlNo', label: t('damageStockReport.columns.SNo'), align: 'center', width: '55' },
                { key: 'Date', label: t('damageStockReport.columns.Date'), align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('damageStockReport.columns.VoucherNo'), align: 'center', width: '120' },
                { key: 'ProductCode', label: t('damageStockReport.columns.ProductCode'), align: 'left', width: '130' },
                { key: 'Barcode', label: t('damageStockReport.columns.Barcode'), align: 'left', width: '130' },
                { key: 'ProductDescription', label: t('damageStockReport.columns.Description'), align: 'left', width: '180' },
                { key: 'Quantity', label: t('damageStockReport.columns.Quantity'), align: 'right', width: '100' },
                { key: 'UnitName', label: t('damageStockReport.columns.Unit'), align: 'center', width: '80' },
                { key: 'Rate', label: t('damageStockReport.columns.Rate'), align: 'right', width: '100' },
                { key: 'Amount', label: t('damageStockReport.columns.Amount'), align: 'right', width: '120' },
                { key: 'Narration', label: t('damageStockReport.columns.Narration'), align: 'left', width: '180' }
            ];
        }
        // Summary mode
        return [
            { key: 'SlNo', label: t('damageStockReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'Date', label: t('damageStockReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('damageStockReport.columns.VoucherNo'), align: 'center', width: '130' },
            { key: 'TotalAmount', label: t('damageStockReport.columns.TotalAmount'), align: 'right', width: '150' },
            { key: 'Narration', label: t('damageStockReport.columns.Narration'), align: 'left' }
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

   

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("damageStockReport.breadcrumb.group"), url: "#" },
                        { title: t("damageStockReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageX, title: t("damageStockReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("damageStockReport.breadcrumb.group"), url: "#" },
                    { title: t("damageStockReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: PackageX, title: t("damageStockReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <DamageStockReportFilter
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
                    tableId="damage-stock-report"
                    pageSize={80}
                    onRowClick={handleRowClick}
                    // Group by damageStockMasterId in Detailed mode
                    groupBy={filters.mode === 'Detailed' ? 'damageStockMasterId' : null}
                    // In Detailed mode: merge common voucher info
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNo', 'Date', 'VoucherNo', 'Narration'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default DamageStockReport;