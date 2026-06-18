// PayableVoucherReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PayableVoucherReportFilter from './PayableVoucherReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const PayableVoucherReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [userData, setUserData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Payment Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        ledgerId: null,
        ledgerName: '',
        costCentreId: null,
        userId: null,
        postedStatus: true,
        mode: "Summary"
    });

    useEffect(() => {
        fetchCostCenterData();
        fetchLedgerData();
        fetchUserData();
    }, [selectedBranchId]);
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.PayableMasterId) return;
        navigate(`/transaction/payable-voucher/edit/${row.PayableMasterId}`);
    };
    const fetchCostCenterData = async () => {
        try {
            const res = await axiosInstance.get("cost-centres");
            setCostCenterData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching cost centers:", err);
        }
    };

    const fetchLedgerData = async () => {
        try {
            const response = await axiosInstance.post("account-ledgers", {
                group_ids: [5, 6, 28, 29],
                branchId: selectedBranchId
            });
            setLedgerData(response.data.data || []);
        } catch (error) {
            console.error("Error fetching ledgers:", error);
        }
    };

    const fetchUserData = async () => {
        try {
            const res = await axiosInstance.get("users");
            setUserData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            posted_status: filters.postedStatus,
            ledgerId: filters.ledgerId ? filters.ledgerId.toString() : 'All',
            branchId: parseInt(selectedBranchId) || 1,
            currencyId: parseInt(currentCurrency?.currencyId) || 1,
            condition: '',
            paymentMode: filters.paymentMode || 'All',
            userId: filters.userId ? filters.userId.toString() : '1',
            costCentreId: filters.costCentreId ? filters.costCentreId.toString() : 'All',
            mode: filters.mode || 'Summary'
        };

        try {
            const res = await axiosInstance.post("payable-voucher-report", requestBody);
            const rawData = res.data.data || [];

            if (rawData.length === 0) {
                setReportData([]);
                return;
            }

            const dp = generalSettings?.decimalPart || 2;

            // Map API response fields to component keys
            const mappedData = rawData.map((row, index) => ({
                PayableMasterId: row.PayableMasterId,
                SlNo: row["Sl NO"] || index + 1,
                Date: row["Voucher Date"] || '',
                VoucherNo: row["Voucher No"] || '',
                Ledger: row["A/C Ledger"] || '',
                FromLedger: row["FromLedger"] || '',
                ToLedger: row["ToLedger"] || '',
                Amount: filters.mode === 'Detailed'
                    ? (parseFloat(row["DetailAmount"]) || 0).toFixed(dp)
                    : (parseFloat(row["Paid Amount"] || row["Bill Amount"]) || 0).toFixed(dp),
                PaidAmount: (parseFloat(row["Paid Amount"]) || 0).toFixed(dp),
                Narration: row["Narration"] || '',
                CostCentre: row["Cost Centre"] || '',
                DoneBy: row["Done By"] || ''
            }));

            setReportData(mappedData);
        } catch (error) {
            console.error("❌ Payment Report Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) return 0;

        if (filters.mode === 'Detailed') {
            // Sum DetailAmount for detailed mode
            return reportData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
        } else {
            // For summary, sum unique PayableMasterId paid amounts
            const uniqueMasters = {};
            reportData.forEach(row => {
                if (!uniqueMasters[row.PayableMasterId]) {
                    uniqueMasters[row.PayableMasterId] = parseFloat(row.PaidAmount) || 0;
                }
            });
            return Object.values(uniqueMasters).reduce((sum, val) => sum + val, 0);
        }
    }, [reportData, filters.mode]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        return {
            label: t('Total'),
            Amount: totalAmount.toFixed(decimalPart)
        };
    }, [reportData, totalAmount, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const dp = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => ({
            SlNo: row.SlNo || index + 1,
            Date: row.Date || '',
            VoucherNo: row.VoucherNo || '',
            Ledger: row.Ledger || '',
            FromLedger: row.FromLedger || '',
            ToLedger: row.ToLedger || '',
            Amount: Number(row.Amount || 0).toFixed(dp),
            Narration: row.Narration || '',
            CostCentre: row.CostCentre || '',
            DoneBy: row.DoneBy || ''
        }));

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'Ledger', label: 'A/C Ledger', align: 'left', width: 20 },
            { key: 'FromLedger', label: 'From Ledger', align: 'left', width: 18 },
            { key: 'ToLedger', label: 'To Ledger', align: 'left', width: 18 },
            { key: 'Amount', label: 'Amount', align: 'right', width: 14, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 20 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'center', width: 12 },
            { key: 'DoneBy', label: 'Done By', align: 'center', width: 12 },
        ];

        const summaryColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 8 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 14 },
            { key: 'Ledger', label: 'A/C Ledger', align: 'left', width: 20 },
            { key: 'Amount', label: 'Paid Amount', align: 'right', width: 14, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 25 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 15 },
            { key: 'DoneBy', label: 'Done By', align: 'left', width: 15 }
        ];

        const title = isDetailed
            ? t('payableReport.breadcrumb.detailedTitle') || 'Payable Voucher Detailed Report'
            : t('payableReport.breadcrumb.title') || 'Payable Voucher Report';

        return {
            fileName: isDetailed ? 'Payable_Voucher_Detailed_Report' : 'Payable_Voucher_Report',
            sheetName: isDetailed ? 'Payable Detailed' : 'Payable Summary',
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
            ledgerId: null,
            ledgerName: '',
            costCentreId: null,
            userId: null,
            postedStatus: true,
            mode: 'Summary'
        });
        setReportData(null);
    };

    const costCenterOptions = costCenterData.map(center => ({
        label: center.CostCentre,
        value: center.costCentreId
    }));

    const ledgerOptions = ledgerData.map(ledger => ({
        label: ledger.ledgerName,
        value: ledger.ledgerId
    }));

    const userOptions = userData.map(u => ({
        label: u.userName || u.name,
        value: u.userId
    }));

    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SlNo', label: t('paymentReport.columns.SNo'), align: 'center', width: '55' },
                { key: 'Date', label: t('paymentReport.columns.Date'), align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('paymentReport.columns.VoucherNo'), align: 'center', width: '120' },
                { key: 'Ledger', label: t('paymentReport.columns.Ledger'), align: 'left', width: '180' },
                { key: 'FromLedger', label: t('paymentReport.columns.FromLedger'), align: 'left', width: '160' },
                { key: 'ToLedger', label: t('paymentReport.columns.ToLedger'), align: 'left', width: '160' },
                { key: 'Amount', label: t('paymentReport.columns.Amount'), align: 'right', width: '110' },
                { key: 'Narration', label: t('paymentReport.columns.Narration'), align: 'left', width: '140' },
                { key: 'CostCentre', label: t('paymentReport.columns.CostCentre'), align: 'center', width: '110' },
                { key: 'DoneBy', label: t('paymentReport.columns.DoneBy'), align: 'center', width: '110' },
            ];
        }
        // Summary mode
        return [
            { key: 'SlNo', label: t('paymentReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'Date', label: t('paymentReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('paymentReport.columns.VoucherNo'), align: 'center', width: '130' },
            { key: 'Ledger', label: t('paymentReport.columns.Ledger'), align: 'left', width: '180' },
            { key: 'Amount', label: t('paymentReport.columns.PaidAmount'), align: 'right', width: '130' },
            { key: 'Narration', label: t('paymentReport.columns.Narration'), align: 'left' },
            { key: 'CostCentre', label: t('paymentReport.columns.CostCentre'), align: 'center', width: '120' },
            { key: 'DoneBy', label: t('paymentReport.columns.DoneBy'), align: 'center', width: '110' },
        ];
    }, [filters.mode, t]);

    const renderCell = (key, row) => {
        if (key === "Date") {
            return row[key] ?? "-";
        }
        if (key === "Amount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.Amount || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
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
                        { title: t("payableReport.breadcrumb.group"), url: "#" },
                        { title: t("payableReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("payableReport.breadcrumb.title") }}
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
                        { title: t("payableReport.breadcrumb.group"), url: "#" },
                        { title: t("payableReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("payableReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("payableReport.breadcrumb.group"), url: "#" },
                    { title: t("payableReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: t("payableReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <PayableVoucherReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    costCenterOptions={costCenterOptions}
                    ledgerOptions={ledgerOptions}
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
                    onRowClick={handleRowClick}   
                    tableId="payable-voucher-report"
                    pageSize={80}
                    // Group by PayableMasterId in Detailed mode
                    groupBy={filters.mode === 'Detailed' ? 'PayableMasterId' : null}
                    // In Detailed mode: merge common voucher info, but NOT FromLedger/ToLedger/Amount
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNo', 'Date', 'VoucherNo', 'Ledger', 'Narration', 'CostCentre', 'DoneBy'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default PayableVoucherReport;