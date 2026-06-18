// src/components/pages/Reports/JournalReport/JournalReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import JournalReportFilter from './JournalReportFilter';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const JournalReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);
    const [userData, setUserData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Journal");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
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
        allCostCentre: true,
        mode: 'Summary',
    });

    useEffect(() => {
        fetchCostCenterData();
        fetchLedgerData();
        fetchUserData();
    }, []);

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
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.JournalMasterId) return;
        navigate(`/transaction/journal-voucher/edit-journal-voucher/${row.JournalMasterId}`);
    };
    const fetchReport = async () => {
        setLoading(true);
        try {
            const payload = {
                from_date: filters.fromDate,
                to_date: filters.toDate,
                posted_status: 'Yes',
                ledger_id: filters.ledgerId || 0,
                branch_id: Number(selectedBranchId),
                currency_id: currentCurrency?.currencyId || 30,
                costcentre_id: filters.costCentreId || 0,
                all_costcentre: filters.allCostCentre,
                mode: filters.mode || 'Summary',
            };
            const res = await axiosInstance.post("journal-report", payload);
            const raw = Array.isArray(res.data.data || res.data)
                ? (res.data.data || res.data)
                : [];

            if (raw.length === 0) {
                setReportData([]);
                return;
            }

            // API already sends pre-formatted Date (e.g. "25-May-2026") — no client formatting needed
            setReportData(
                filters.mode === 'Detailed'
                    ? raw
                    : raw.map((item, index) => ({ ...item, SlNo: index + 1 }))
            );
        } catch (error) {
            console.error("Error fetching report:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total credit and debit amounts
    const { totalCrAmount, totalDrAmount } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalCrAmount: 0, totalDrAmount: 0 };
        }

        return reportData.reduce((totals, row) => {
            const crAmount = parseFloat(row.CrAmount) || 0;
            const drAmount = parseFloat(row.DrAmount) || 0;

            return {
                totalCrAmount: totals.totalCrAmount + crAmount,
                totalDrAmount: totals.totalDrAmount + drAmount
            };
        }, { totalCrAmount: 0, totalDrAmount: 0 });
    }, [reportData]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const format = generalSettings?.dateformat || 'dd-MM-yyyy';
        return format
            .replace('dd', dd)
            .replace('MM', MM)
            .replace('yyyy', yyyy);
    };

    // Footer data for the table
    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        return {
            label: t('Total'),
            CrAmount: totalCrAmount.toFixed(generalSettings?.decimalPart || 2),
            DrAmount: totalDrAmount.toFixed(generalSettings?.decimalPart || 2)
        };
    }, [reportData, totalCrAmount, totalDrAmount, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const dp = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => ({
            SlNo: row.SlNo || index + 1,
            Date: row.Date || '',
            VoucherNo: row.VoucherNo || '',
            Ledger: row.Ledger || '',
            Narration: row.Narration || '',
            DoneBy: row.DoneBy || '',
            CostCentre: row.CostCentre || '',
            CrAmount: Number(row.CrAmount || 0).toFixed(dp),
            DrAmount: Number(row.DrAmount || 0).toFixed(dp),
        }));

        const detailedColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'center', width: 12 },
            { key: 'Ledger', label: 'Ledger', align: 'left', width: 20 },
            { key: 'CrAmount', label: 'Credit', align: 'right', width: 14, type: 'currency' },
            { key: 'DrAmount', label: 'Debit', align: 'right', width: 14, type: 'currency' },
            { key: 'Narration', label: 'Narration', align: 'left', width: 20 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'center', width: 12 },
            { key: 'DoneBy', label: 'Done By', align: 'center', width: 12 },
        ];

        const summaryColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 8 },
            { key: 'Date', label: 'Date', align: 'center', width: 12 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left', width: 14 },
            { key: 'Ledger', label: 'Ledger', align: 'left', width: 20 },
            { key: 'Narration', label: 'Narration', align: 'left', width: 25 },
            { key: 'DoneBy', label: 'Done By', align: 'left', width: 15 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 15 },
            { key: 'CrAmount', label: 'Credit', align: 'right', width: 14, type: 'currency' },
            { key: 'DrAmount', label: 'Debit', align: 'right', width: 14, type: 'currency' },
        ];

        const title = isDetailed
            ? t('journalReport.breadcrumb.detailedTitle') || 'Journal Detailed Report'
            : t('journalReport.breadcrumb.title') || 'Journal Report';

        return {
            fileName: isDetailed ? 'Journal_Detailed_Report' : 'Journal_Report',
            sheetName: isDetailed ? 'Journal Detailed' : 'Journal Summary',
            title,
            subtitle: `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: totals ? {
                label: t('Total'),
                CrAmount: totalCrAmount.toFixed(dp),
                DrAmount: totalDrAmount.toFixed(dp)
            } : null,
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
            mode: 'Summary',
            condition: 'All'
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
                { key: 'SlNo', label: t('journalReport.columns.SNo'), align: 'center', width: '55' },
                { key: 'Date', label: t('journalReport.columns.Date'), align: 'center', width: '120' },
                { key: 'VoucherNo', label: t('journalReport.columns.VoucherNo'), align: 'center', width: '120' },
                { key: 'Ledger', label: t('journalReport.columns.Ledger'), align: 'left', width: '180' },
                { key: 'CrAmount', label: t('journalReport.columns.Credit'), align: 'right', width: '110' },
                { key: 'DrAmount', label: t('journalReport.columns.Debit'), align: 'right', width: '110' },
                { key: 'Narration', label: t('journalReport.columns.Narration'), align: 'left', width: '140' },
                { key: 'CostCentre', label: t('journalReport.columns.CostCentre'), align: 'center', width: '110' },
                { key: 'DoneBy', label: t('journalReport.columns.DoneBy'), align: 'center', width: '110' },
            ];
        }
        // Summary
        return [
            { key: 'SlNo', label: t('journalReport.columns.SNo'), align: 'center', width: '60' },
            { key: 'Date', label: t('journalReport.columns.Date'), align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('journalReport.columns.VoucherNo'), align: 'center', width: '130' },
            { key: 'Ledger', label: t('journalReport.columns.Ledger'), align: 'left', width: '180' },
            { key: 'Narration', label: t('journalReport.columns.Narration'), align: 'left' },
            { key: 'DoneBy', label: t('journalReport.columns.DoneBy'), align: 'center', width: '110' },
            { key: 'CostCentre', label: t('journalReport.columns.CostCentre'), align: 'center', width: '120' },
            { key: 'CrAmount', label: t('journalReport.columns.Credit'), align: 'right', width: '130' },
            { key: 'DrAmount', label: t('journalReport.columns.Debit'), align: 'right', width: '130' },
        ];
    }, [filters.mode, t]);

    const renderCell = (key, row) => {
        if (key === "Date") {
            return row[key] ?? "-";
        }
        if (key === "CrAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1 mb-1">
                        <span>{Number(row.CrAmount || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }
        if (key === "DrAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1 mb-1">
                        <span>{Number(row.DrAmount || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
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
                        { title: t("journalReport.breadcrumb.group"), url: "#" },
                        { title: t("journalReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("journalReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div className="">
            <BreadCrumb
                routes={[
                    { title: t("journalReport.breadcrumb.group"), url: "#" },
                    { title: t("journalReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: t("journalReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />
            <JournalReportFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onGenerateReport={fetchReport}
                costCenterOptions={costCenterOptions}
                ledgerOptions={ledgerOptions}
                userOptions={userOptions}
                loading={loading}
                hasReportData={!!reportData}
                resetFilters={resetFilters}
            />

            <div className='px-1'>
                <ContentTable
                    columns={columns}
                    onRowClick={handleRowClick}
                    data={reportData || []}
                    loading={loading}
                    footerData={footerData}
                    renderCell={renderCell}
                    staticSearchable
                    tableId="journal-report"
                    pageSize={80}
                    // Group by JournalMasterId in Detailed mode
                    groupBy={filters.mode === 'Detailed' ? 'JournalMasterId' : null}
                    // Ledger, CrAmount, DrAmount differ per line — NOT merged
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SlNo', 'Date', 'VoucherNo', 'Narration', 'CostCentre', 'DoneBy'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default JournalReport;