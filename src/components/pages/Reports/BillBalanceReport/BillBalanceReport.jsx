// BillBalanceReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import BillBalanceReportFilter from './BillBalanceReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { showToast } from '@/utils/toast';

const BillBalanceReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [groupData, setGroupData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [costCenterData, setCostCenterData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Bill Balance Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        groupId: null,
        ledgerId: null,
        costCentreId: null,
        currencyId: currentCurrency?.currencyId || null,
        isMainGroup: true,
        isShowOpeningBalance: true,
        mode: "Summary"
    });

    useEffect(() => {
        fetchGroupData();
        fetchLedgerData();
        fetchCostCenterData();
    }, []);

    const fetchGroupData = async () => {
        try {
            const res = await axiosInstance.get("accountgroups");
            setGroupData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching groups:", err);
        }
    };

    const fetchLedgerData = async () => {
        try {
            const res = await axiosInstance.post("customer-supplier-account-ledgers", {
        ledgerTypes: ["Customer","Customer&Supplier","Supplier"],
        branchId: selectedBranchId
      });
            setLedgerData(res.data.data || []);
        } catch (error) {
            console.error("Error fetching ledgers:", error);
        }
    };

    const fetchCostCenterData = async () => {
        try {
            const res = await axiosInstance.get("cost-centres");
            setCostCenterData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching cost centers:", err);
        }
    };

    useEffect(() => {
        if (filters.groupId) {
            fetchLedgerData();
        }
    }, [filters.groupId]);

    const fetchReport = async () => {
        if (!filters.groupId) {
        showToast.error(t('Please select a group'));
        return;
    }

        setLoading(true);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: selectedBranchId?.toString() ||null,
            groupId: filters.groupId ? filters.groupId.toString() : null,
            currencyId: filters.currencyId?.toString() || currentCurrency?.currencyId?.toString() || null,
            ledgerId: filters.ledgerId ? filters.ledgerId.toString() : null,
            costCentreId: filters.costCentreId ? filters.costCentreId.toString() : null,
            isMainGroup: filters.isMainGroup || false,
            isShowOpeningBalance: filters.isShowOpeningBalance || false,
            mode: filters.mode || "Summary"
        };

        try {
            const res = await axiosInstance.post("bill-balance-report", requestBody);
            const rawData = res.data.data || [];

            if (rawData.length === 0) {
                setReportData([]);
                return;
            }

            const dp = generalSettings?.decimalPart || 2;

            // Map API response fields to component keys
            const mappedData = rawData.map((row, index) => {
                // Calculate closing balance: Opening + Debit - Credit
                const opening = parseFloat(row.op) || 0;
                const debit = parseFloat(row.debit) || parseFloat(row.DrAmount) || 0;
                const credit = parseFloat(row.credit) || parseFloat(row.CrAmount) || 0;
                const closing = opening + debit - credit;

                return {
                    ledgerId: row.ledgerId,
                    SlNo: row.SlNO || index + 1,
                    Date: row.VoucherDate || '',
                    VoucherNo: row.VoucherNo || '',
                    VoucherType: row.VoucherType || '',
                    LedgerName: row.ledgerName || '',
                    LedgerCode: row.ledgerCode || '',
                    Description: row.Narration || '',
                    OpeningBalance: filters.mode === 'Summary' 
                        ? (row.op ? parseFloat(row.op).toFixed(dp) : '')
                        : (row.op ? parseFloat(row.op).toFixed(dp) : ''),
                    DebitAmount: (debit).toFixed(dp),
                    CreditAmount: (credit).toFixed(dp),
                    ClosingBalance: (closing).toFixed(dp),
                    DrAmount: row.DrAmount ? parseFloat(row.DrAmount).toFixed(dp) : '',
                    CrAmount: row.CrAmount ? parseFloat(row.CrAmount).toFixed(dp) : ''
                };
            });

            setReportData(mappedData);
        } catch (error) {
            console.error("❌ Bill Balance Report Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const { totalOpening, totalDebit, totalCredit, totalClosing } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalOpening: 0, totalDebit: 0, totalCredit: 0, totalClosing: 0 };
        }

        if (filters.mode === 'Summary') {
            // For summary, each row is a ledger balance
            return reportData.reduce((totals, row) => ({
                totalOpening: totals.totalOpening + (parseFloat(row.OpeningBalance) || 0),
                totalDebit: totals.totalDebit + (parseFloat(row.DebitAmount) || 0),
                totalCredit: totals.totalCredit + (parseFloat(row.CreditAmount) || 0),
                totalClosing: totals.totalClosing + (parseFloat(row.ClosingBalance) || 0)
            }), { totalOpening: 0, totalDebit: 0, totalCredit: 0, totalClosing: 0 });
        } else {
            // For detailed, sum all transactions
            return reportData.reduce((totals, row) => ({
                totalOpening: totals.totalOpening + (parseFloat(row.OpeningBalance) || 0),
                totalDebit: totals.totalDebit + (parseFloat(row.DrAmount) || 0),
                totalCredit: totals.totalCredit + (parseFloat(row.CrAmount) || 0),
                totalClosing: totals.totalClosing + (parseFloat(row.ClosingBalance) || 0)
            }), { totalOpening: 0, totalDebit: 0, totalCredit: 0, totalClosing: 0 });
        }
    }, [reportData, filters.mode]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const dp = generalSettings?.decimalPart || 2;
        return {
            label: t('Total'),
            OpeningBalance: totalOpening.toFixed(dp),
            DebitAmount: totalDebit.toFixed(dp),
            CreditAmount: totalCredit.toFixed(dp),
            ClosingBalance: totalClosing.toFixed(dp),
            DrAmount: totalDebit.toFixed(dp),
            CrAmount: totalCredit.toFixed(dp)
        };
    }, [reportData, totalOpening, totalDebit, totalCredit, totalClosing, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const dp = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => {
            if (isDetailed) {
                return {
                    SlNo: row.SlNo || index + 1,
                    Date: row.Date || '',
                    VoucherNo: row.VoucherNo || '',
                    VoucherType: row.VoucherType || '',
                    LedgerName: row.LedgerName || '',
                    Description: row.Description || '',
                    DrAmount: row.DrAmount || '',
                    CrAmount: row.CrAmount || ''
                };
            } else {
                return {
                    SlNo: row.SlNo || index + 1,
                    LedgerName: row.LedgerName || '',
                    LedgerCode: row.LedgerCode || '',
                    OpeningBalance: row.OpeningBalance || '',
                    DebitAmount: row.DebitAmount || '',
                    CreditAmount: row.CreditAmount || '',
                    ClosingBalance: row.ClosingBalance || ''
                };
            }
        });

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 12 },
            { key: 'VoucherType', label: 'Voucher Type', align: 'center', width: 14 },
            { key: 'LedgerName', label: 'Ledger', align: 'left', width: 20 },
            { key: 'Description', label: 'Description', align: 'left', width: 20 },
            { key: 'DrAmount', label: 'Debit', align: 'right', width: 12, type: 'currency' },
            { key: 'CrAmount', label: 'Credit', align: 'right', width: 12, type: 'currency' }
        ];

        const summaryColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'LedgerName', label: 'Ledger', align: 'left', width: 25 },
            { key: 'LedgerCode', label: 'Code', align: 'center', width: 8 },
            { key: 'OpeningBalance', label: 'Opening Balance', align: 'right', width: 14, type: 'currency' },
            { key: 'DebitAmount', label: 'Debit', align: 'right', width: 12, type: 'currency' },
            { key: 'CreditAmount', label: 'Credit', align: 'right', width: 12, type: 'currency' },
            { key: 'ClosingBalance', label: 'Closing Balance', align: 'right', width: 14, type: 'currency' }
        ];

        const title = t('billBalanceReport.breadcrumb.title') || 'Bill Balance Report';

        return {
            fileName: 'Bill_Balance_Report',
            sheetName: 'Bill Balance',
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
            fromDate: '2024-04-01',
            toDate: new Date().toISOString().split('T')[0],
            groupId: null,
            ledgerId: null,
            costCentreId: null,
            currencyId: currentCurrency?.currencyId || null,
            isMainGroup: true,
            isShowOpeningBalance: true,
            mode: 'Summary'
        });
        setReportData(null);
    };

    const groupOptions = groupData.map(g => ({
        label: g.accountGroupName,
        value: g.groupId
    }));

    const ledgerOptions = ledgerData.map(l => ({
        label: l.ledgerName,
        value: l.ledgerId
    }));

    const costCenterOptions = costCenterData.map(c => ({
        label: c.CostCentre,
        value: c.costCentreId
    }));

    const summaryColumns = useMemo(() => {
        return [
            { key: 'SlNo', label: t('billBalanceReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'LedgerName', label: t('billBalanceReport.columns.LedgerName'), align: 'left', width: '220' },
            { key: 'LedgerCode', label: t('billBalanceReport.columns.LedgerCode'), align: 'center', width: '100' },
            { key: 'OpeningBalance', label: t('billBalanceReport.columns.OpeningBalance'), align: 'right', width: '130' },
            { key: 'DebitAmount', label: t('billBalanceReport.columns.DebitAmount'), align: 'right', width: '120' },
            { key: 'CreditAmount', label: t('billBalanceReport.columns.CreditAmount'), align: 'right', width: '120' },
            { key: 'ClosingBalance', label: t('billBalanceReport.columns.ClosingBalance'), align: 'right', width: '130' }
        ];
    }, [t]);

    const detailedColumns = useMemo(() => {
        return [
            { key: 'SlNo', label: t('billBalanceReport.columns.SNo'), align: 'center', width: '55' },
            { key: 'Date', label: t('billBalanceReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('billBalanceReport.columns.VoucherNo'), align: 'center', width: '110' },
            { key: 'VoucherType', label: t('billBalanceReport.columns.VoucherType'), align: 'center', width: '140' },
            { key: 'LedgerName', label: t('billBalanceReport.columns.LedgerName'), align: 'left', width: '200' },
            { key: 'Description', label: t('billBalanceReport.columns.Description'), align: 'left', width: '220' },
            { key: 'DrAmount', label: t('billBalanceReport.columns.DebitAmount'), align: 'right', width: '120' },
            { key: 'CrAmount', label: t('billBalanceReport.columns.CreditAmount'), align: 'right', width: '120' }
        ];
    }, [t]);

    const columns = filters.mode === 'Detailed' ? detailedColumns : summaryColumns;

    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === "Date") {
            return row[key] ?? "-";
        }

        if (["OpeningBalance", "DebitAmount", "CreditAmount", "ClosingBalance", "DrAmount", "CrAmount"].includes(key)) {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{row[key] || '-'}</span>
                    </div>
                </div>
            );
        }

        if (key === "VoucherType") {
            const typeColor = {
                'Purchase Invoice': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                'Purchase Return': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
                'Payment Voucher': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
                'Receipt Voucher': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
                'Payable Voucher': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
                'Receivable Voucher': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
                'Journal Voucher': 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
            };
            const color = typeColor[row.VoucherType] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
            
            return (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
                    {row[key] || '-'}
                </span>
            );
        }

        return row[key] ?? "-";
    };

    if ( privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("billBalanceReport.breadcrumb.group"), url: "#" },
                        { title: t("billBalanceReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("billBalanceReport.breadcrumb.title") }}
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
                        { title: t("billBalanceReport.breadcrumb.group"), url: "#" },
                        { title: t("billBalanceReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("billBalanceReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("billBalanceReport.breadcrumb.group"), url: "#" },
                    { title: t("billBalanceReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: FileText, title: t("billBalanceReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <BillBalanceReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    groupOptions={groupOptions}
                    ledgerOptions={ledgerOptions}
                    costCenterOptions={costCenterOptions}
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
                    tableId="bill-balance-report"
                    pageSize={80}
                />
            </div>
        </div>
    );
};

export default BillBalanceReport;