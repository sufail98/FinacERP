// GodownTransferReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { GitCompare } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import GodownTransferReportFilter from './GodownTransferReportFilter';
import useReportExport from '@/hooks/useReportExport';

const GodownTransferReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [userData, setUserData] = useState([]);
    const [unitData, setUnitData] = useState([]);
    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Godown Transfer Report");
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
        approvedStatus: null,
        mode: "Summary"
    });

    useEffect(() => {
        fetchUserData();
        fetchUnitData();
    }, []);

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
            const res = await axiosInstance.post("stock-transfer-report", requestBody);
            const rawData = res.data.data || [];

            if (rawData.length === 0) {
                setReportData([]);
                return;
            }

            const dp = generalSettings?.decimalPart || 2;

            // Map API response fields to component keys
            const mappedData = rawData.map((row, index) => ({
                transferMasterId: row.transferMasterId,
                SlNo: row.SlNo || index + 1,
                Date: row.Date || '',
                VoucherNo: row.VoucherNo || '',
                ProductCode: row.ProductCode || '',
                Barcode: row.Barcode || '',
                Quantity: row.Quantity ? parseFloat(row.Quantity).toFixed(dp) : '',
                ReceivedQuantity: row.ReceivedQuantity ? parseFloat(row.ReceivedQuantity).toFixed(dp) : '0',
                Rate: row.Rate ? parseFloat(row.Rate).toFixed(dp) : '',
                Amount: filters.mode === 'Detailed'
                    ? (row.DetailAmount ? parseFloat(row.DetailAmount).toFixed(dp) : '')
                    : (row.GrandTotal ? parseFloat(row.GrandTotal).toFixed(dp) : ''),
                GrandTotal: row.GrandTotal ? parseFloat(row.GrandTotal).toFixed(dp) : '',
                BranchFrom: row.BranchFrom || '',
                BranchTo: row.BranchTo || '',
                GodownFrom: row.GodownFrom || '',
                GodownTo: row.GodownTo || '',
                TransportCompany: row.TransportCompany || '',
                ApprovedStatus: row.ApprovedStatus || '',
                Narration: row.Narration || '',
                UnitId: row.UnitId,
                UnitName: getUnitName(row.UnitId)
            }));

            setReportData(mappedData);
        } catch (error) {
            console.error("❌ Godown Transfer Report Error:", error);
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
            // For summary, sum grand totals (no duplicates - one row per transfer)
            return reportData.reduce((totals, row) => ({
                totalQuantity: totals.totalQuantity, // Not applicable in summary
                totalAmount: totals.totalAmount + (parseFloat(row.GrandTotal) || 0)
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
                GrandTotal: totalAmount.toFixed(dp)
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
                BranchFrom: row.BranchFrom || '',
                BranchTo: row.BranchTo || '',
                GodownFrom: row.GodownFrom || '',
                GodownTo: row.GodownTo || '',
                ApprovedStatus: row.ApprovedStatus || ''
            };

            if (isDetailed) {
                return {
                    ...baseData,
                    ProductCode: row.ProductCode || '',
                    Barcode: row.Barcode || '',
                    Quantity: row.Quantity || '',
                    ReceivedQuantity: row.ReceivedQuantity || '',
                    UnitName: row.UnitName || '',
                    Rate: row.Rate || '',
                    Amount: row.Amount || '',
                    TransportCompany: row.TransportCompany || ''
                };
            } else {
                return {
                    ...baseData,
                    GrandTotal: row.GrandTotal || '',
                    TransportCompany: row.TransportCompany || ''
                };
            }
        });

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'BranchFrom', label: 'From Branch', align: 'left', width: 15 },
            { key: 'BranchTo', label: 'To Branch', align: 'left', width: 15 },
            { key: 'GodownFrom', label: 'From Godown', align: 'left', width: 15 },
            { key: 'GodownTo', label: 'To Godown', align: 'left', width: 15 },
            { key: 'ProductCode', label: 'Product Code', align: 'left', width: 15 },
            { key: 'Barcode', label: 'Barcode', align: 'left', width: 15 },
            { key: 'Quantity', label: 'Quantity', align: 'right', width: 10, type: 'number' },
            { key: 'ReceivedQuantity', label: 'Received Qty', align: 'right', width: 12, type: 'number' },
            { key: 'UnitName', label: 'Unit', align: 'center', width: 8 },
            { key: 'Rate', label: 'Rate', align: 'right', width: 12, type: 'currency' },
            { key: 'Amount', label: 'Amount', align: 'right', width: 14, type: 'currency' },
            { key: 'ApprovedStatus', label: 'Status', align: 'center', width: 12 },
            { key: 'TransportCompany', label: 'Transport Co', align: 'left', width: 12 }
        ];

        const summaryColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 8 },
            { key: 'Date', label: 'Date', align: 'center', width: 15 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 15 },
            { key: 'BranchFrom', label: 'From Branch', align: 'left', width: 18 },
            { key: 'BranchTo', label: 'To Branch', align: 'left', width: 18 },
            { key: 'GodownFrom', label: 'From Godown', align: 'left', width: 18 },
            { key: 'GodownTo', label: 'To Godown', align: 'left', width: 18 },
            { key: 'GrandTotal', label: 'Grand Total', align: 'right', width: 15, type: 'currency' },
            { key: 'ApprovedStatus', label: 'Status', align: 'center', width: 12 },
            { key: 'TransportCompany', label: 'Transport Co', align: 'left', width: 12 }
        ];

        const title = isDetailed
            ? t('godownTransferReport.breadcrumb.detailedTitle') || 'Stock Transfer Detailed Report'
            : t('godownTransferReport.breadcrumb.title') || 'Stock Transfer Report';

        return {
            fileName: isDetailed ? 'Stock_Transfer_Detailed_Report' : 'Stock_Transfer_Report',
            sheetName: isDetailed ? 'Transfer Detailed' : 'Transfer Summary',
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
            approvedStatus: null,
            mode: 'Summary'
        });
        setReportData(null);
    };

    const userOptions = userData.map(u => ({
        label: u.userName || u.name,
        value: u.userId
    }));

    const approvalStatusOptions = [
        { label: 'All', value: null },
        { label: 'Pending', value: 'Pending' },
        { label: 'Accepted', value: 'Accepted' },
        { label: 'Rejected', value: 'Rejected' }
    ];

    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SlNo', label: t('godownTransferReport.columns.SNo'), align: 'center', width: '55' },
                { key: 'Date', label: t('godownTransferReport.columns.Date'), align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('godownTransferReport.columns.VoucherNo'), align: 'center', width: '120' },
                { key: 'BranchFrom', label: t('godownTransferReport.columns.BranchFrom'), align: 'left', width: '140' },
                { key: 'BranchTo', label: t('godownTransferReport.columns.BranchTo'), align: 'left', width: '140' },
                { key: 'GodownFrom', label: t('godownTransferReport.columns.GodownFrom'), align: 'left', width: '140' },
                { key: 'GodownTo', label: t('godownTransferReport.columns.GodownTo'), align: 'left', width: '140' },
                { key: 'ProductCode', label: t('godownTransferReport.columns.ProductCode'), align: 'left', width: '130' },
                { key: 'Barcode', label: t('godownTransferReport.columns.Barcode'), align: 'left', width: '130' },
                { key: 'Quantity', label: t('godownTransferReport.columns.Quantity'), align: 'right', width: '100' },
                { key: 'ReceivedQuantity', label: t('godownTransferReport.columns.ReceivedQuantity'), align: 'right', width: '100' },
                { key: 'UnitName', label: t('godownTransferReport.columns.Unit'), align: 'center', width: '80' },
                { key: 'Rate', label: t('godownTransferReport.columns.Rate'), align: 'right', width: '100' },
                { key: 'Amount', label: t('godownTransferReport.columns.Amount'), align: 'right', width: '120' },
                { key: 'ApprovedStatus', label: t('godownTransferReport.columns.Status'), align: 'center', width: '110' },
                { key: 'TransportCompany', label: t('godownTransferReport.columns.TransportCompany'), align: 'left', width: '120' }
            ];
        }
        // Summary mode
        return [
            { key: 'SlNo', label: t('godownTransferReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'Date', label: t('godownTransferReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('godownTransferReport.columns.VoucherNo'), align: 'center', width: '130' },
            { key: 'BranchFrom', label: t('godownTransferReport.columns.BranchFrom'), align: 'left', width: '160' },
            { key: 'BranchTo', label: t('godownTransferReport.columns.BranchTo'), align: 'left', width: '160' },
            { key: 'GodownFrom', label: t('godownTransferReport.columns.GodownFrom'), align: 'left', width: '160' },
            { key: 'GodownTo', label: t('godownTransferReport.columns.GodownTo'), align: 'left', width: '160' },
            { key: 'GrandTotal', label: t('godownTransferReport.columns.GrandTotal'), align: 'right', width: '150' },
            { key: 'ApprovedStatus', label: t('godownTransferReport.columns.Status'), align: 'center', width: '110' },
            { key: 'TransportCompany', label: t('godownTransferReport.columns.TransportCompany'), align: 'left', width: '120' }
        ];
    }, [filters.mode, t]);

    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === "Date") {
            return row[key] ?? "-";
        }
        if (key === "Quantity" || key === "ReceivedQuantity") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row[key] || '-'}</span>
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
        if (key === "GrandTotal") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row.GrandTotal || '-'}</span>
                    </div>
                </div>
            );
        }
        if (key === "ApprovedStatus") {
            const statusColor = row.ApprovedStatus === 'Accepted' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : row.ApprovedStatus === 'Pending'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
            
            return (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                    {row[key] || '-'}
                </span>
            );
        }
        return row[key] ?? "-";
    };

  

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("godownTransferReport.breadcrumb.group"), url: "#" },
                        { title: t("godownTransferReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: GitCompare, title: t("godownTransferReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("godownTransferReport.breadcrumb.group"), url: "#" },
                    { title: t("godownTransferReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: GitCompare, title: t("godownTransferReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <GodownTransferReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    userOptions={userOptions}
                    approvalStatusOptions={approvalStatusOptions}
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
                    tableId="godown-transfer-report"
                    pageSize={80}
                    // Group by transferMasterId in Detailed mode
                    groupBy={filters.mode === 'Detailed' ? 'transferMasterId' : null}
                    // In Detailed mode: merge common transfer info
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNo', 'Date', 'VoucherNo', 'BranchFrom', 'BranchTo', 'GodownFrom', 'GodownTo', 'ApprovedStatus', 'TransportCompany'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default GodownTransferReport;