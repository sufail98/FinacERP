// CustomerSupplierStatementReport.jsx - Updated with Balance Calculation
import BreadCrumb from '@/components/common/BreadCrumb';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccountLedgerFilters from './AccountLedgerFilters';
import ContentTable from '@/components/common/ContentTable';
import useAuth from '@/redux/hook/auth/useAuth';
import usePrivileges from '@/lib/hooks/usePrivileges';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';

const CustomerSupplierStatementReport = ({ type }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [acGroupData, setAcGroupData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges(type === 'customer' ? "Customer Statment" : "Supplier Statment");

    const { 
        exportAccountLedgerToExcel, 
        exportAccountLedgerToPdf, 
        exportAccountLedgerToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        groupId: '',
        costCentreId: '',
        isShowOpeningBalance: true,
        isMainGroup: true
    });

    useEffect(() => {
        fetchCostCenterData();
        getAcGroupData();
    }, []);

    // Balance calculation function (same as Account Ledger Report)
    const calculateRowBalance = (index, debit, credit, previousBalance) => {
        let rowBalance = 0;
        let crOrDr = '';

        const accountsCalcMethod = generalSettings?.AccountCalculationMethod || 'CrDr';

        if (index === 0) {
            rowBalance = debit - credit;
        } else {
            const prevBalParts = previousBalance.toString().trim().split(' ');
            let prevAmount = parseFloat(prevBalParts[0]) || 0;

            if (prevBalParts.length > 1 && prevBalParts[1] === 'Cr') {
                prevAmount = -Math.abs(prevAmount);
            } else if (prevBalParts.length > 1 && prevBalParts[1] === 'Dr') {
                prevAmount = Math.abs(prevAmount);
            }

            if (debit - credit !== 0) {
                if (credit > 0 && debit > 0) {
                    rowBalance = prevAmount + (debit - credit);
                } else {
                    if (debit > 0) rowBalance = prevAmount + debit;
                    if (credit > 0) rowBalance = prevAmount - credit;
                }
            } else {
                rowBalance = prevAmount;
            }
        }

        if (accountsCalcMethod === 'CrDr') {
            if (rowBalance > 0) {
                crOrDr = ' Dr';
            } else if (rowBalance < 0) {
                rowBalance = Math.abs(rowBalance);
                crOrDr = ' Cr';
            }
        }

        const formattedBalance = rowBalance.toFixed(generalSettings?.decimalPart || 2);
        return formattedBalance + crOrDr;
    };
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
    // Process report data with balance calculation
   const processReportData = (data) => {
    if (!data || data.length === 0) return [];

    let processed = [];
    let prevBalance = '0';

    data.forEach((row, index) => {
        const debit = parseFloat(row.Debit) || 0;
        const credit = parseFloat(row.Credit) || 0;
        const balance = calculateRowBalance(index, debit, credit, prevBalance);

        processed.push({ 
            ...row, 
            Balance: balance,
            Date: formatDate(row.Date)  // ✅ format date here
        });
        prevBalance = balance;
    });

    return processed;
};

    const fetchReport = async () => {
        if (!filters.groupId) {
            alert(t('Please select an account group'));
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("accountledger-detailed-report", {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchId,
                ledgerId: filters.groupId,
                currencyId: currentCurrency.currencyId,
                isShowOpeningBalance: filters.isShowOpeningBalance,
                costCentreId: filters.costCentreId || null
            });

            // Process data with balance calculation
            setReportData(processReportData(res.data.data));
        } catch (error) {
            console.error("Error fetching report:", error);
            setReportData(null);
        } finally {
            setLoading(false);
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

    const getAcGroupData = async () => {
        try {
            const response = await axiosInstance.post("customer-supplier-account-ledgers", { 
                ledgerTypes: [type === 'customer' ? 'Customer' : "Supplier"], 
                branchId: selectedBranchId 
            });
            setAcGroupData(response.data.data || []);
        } catch (error) {
            console.error("Error fetching account groups:", error);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            groupId: '',
            costCentreId: '',
            isShowOpeningBalance: true
        });
        setReportData(null);
    };

    const costCenterOptions = costCenterData.map(center => ({
        label: center.CostCentre,
        value: center.costCentreId
    }));

    const acGroupOptions = acGroupData.map(group => ({
        label: group.ledgerName,
        value: group.ledgerId
    }));

    // Updated to include closing balance
    const { totalDebit, totalCredit, closingBalance } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalDebit: 0, totalCredit: 0, closingBalance: '' };
        }

        let debit = 0;
        let credit = 0;
        let balance = '';

        reportData.forEach((row) => {
            debit += parseFloat(row.Debit) || 0;
            credit += parseFloat(row.Credit) || 0;
            balance = row.Balance;
        });

        return { totalDebit: debit, totalCredit: credit, closingBalance: balance };
    }, [reportData]);

    // Updated footer data with closing balance
    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        return {
            label: t('Total'),
            Debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
            Credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
            Balance: closingBalance
        };
    }, [reportData, totalDebit, totalCredit, closingBalance, generalSettings?.decimalPart, t]);

    // Get selected ledger for export
    const selectedLedger = acGroupData.find(g => g.ledgerId === filters.groupId);

    // Export configuration with Balance column
    const getExportOptions = () => {
        const reportTitle = type === 'customer'
            ? t('cstAndSupStatementRprt.breadcrumb.cusTitle') || 'Customer Statement'
            : t('cstAndSupStatementRprt.breadcrumb.supTitle') || 'Supplier Statement';

        return {
            fileName: `${type === 'customer' ? 'Customer' : 'Supplier'}_Statement_${selectedLedger?.ledgerName?.replace(/\s+/g, '_') || 'Report'}`,
            title: reportTitle,
            subtitle: selectedLedger?.ledgerName || '',
            ledgerName: selectedLedger?.ledgerName || '',
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: reportData,
            footer: {
                label: t('Total'),
                Debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
                Credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
                Balance: closingBalance
            },
            theme: 'professional',
            decimalPlaces: generalSettings?.decimalPart || 2,
            columns: [
                { key: 'SlNo', label: t('acLedgerReport.grid.columns.SINO') || '#', align: 'center', width: 8 },
                { key: 'Date', label: t('acLedgerReport.grid.columns.Date') || 'Date', align: 'center', width: 12 },
                { key: 'voucherType', label: t('acLedgerReport.grid.columns.voucherType') || 'Voucher Type', align: 'left', width: 16 },
                { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode') || 'Ledger Code', align: 'center', width: 12 },
                { key: 'voucherNo', label: t('acLedgerReport.grid.columns.voucherNo') || 'Voucher No', align: 'center', width: 12 },
                { key: 'CostCentre', label: t('acLedgerReport.grid.columns.CostCentre') || 'Cost Centre', align: 'left', width: 15 },
                { key: 'Narration', label: t('acLedgerReport.grid.columns.Narration') || 'Narration', align: 'left', width: 30 },
                { key: 'Debit', label: t('acLedgerReport.grid.columns.Debit') || 'Debit', align: 'right', width: 14, type: 'currency' },
                { key: 'Credit', label: t('acLedgerReport.grid.columns.Credit') || 'Credit', align: 'right', width: 14, type: 'currency' },
                { key: 'Balance', label: t('Balance') || 'Balance', align: 'right', width: 16, type: 'balance' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountLedgerToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountLedgerToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountLedgerToCsv(getExportOptions());
    };

    // Updated columns to include Balance
    const columns = [
        { key: 'SNo', label: t('acLedgerReport.grid.columns.SINO') },
        { key: 'Date', label: t('acLedgerReport.grid.columns.Date') },
        { key: 'voucherType', label: t('acLedgerReport.grid.columns.voucherType') },
        { key: 'voucherNo', label: t('acLedgerReport.grid.columns.voucherNo') },
        { key: 'CostCentre', label: t('acLedgerReport.grid.columns.CostCentre') },
        { key: 'Narration', label: t('acLedgerReport.grid.columns.Narration') },
        { key: 'Debit', label: t('acLedgerReport.grid.columns.Debit'), align: "right" },
        { key: 'Credit', label: t('acLedgerReport.grid.columns.Credit'), align: "right" },
        { key: 'Balance', label: t('Balance'), align: "right" }
    ];

    // Updated renderCell to handle Balance column
    const renderCell = (key, row) => {
        if (['Debit', 'Credit'].includes(key)) {
            return (
                <div className="text-sm flex justify-end">
                    {Number(row[key]).toFixed(generalSettings?.decimalPart || 2)}
                </div>
            );
        }

        if (key === 'Balance') {
            const balanceStr = row.Balance?.toString() || '0';
            const isCreditBalance = balanceStr.includes('Cr');
            const balanceValue = parseFloat(balanceStr);
            const isNegative = balanceValue < 0;
            const colorClass = isCreditBalance || isNegative ? 'text-red-600' : 'text-green-600';

            return (
                <div className={`text-sm flex justify-end font-semibold ${colorClass}`}>
                    {row.Balance}
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
                        { title: t("cstAndSupStatementRprt.breadcrumb.group"), url: "#" },
                        { title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`) }}
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
                        { title: t("cstAndSupStatementRprt.breadcrumb.group"), url: "#" },
                        { title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`) }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("cstAndSupStatementRprt.breadcrumb.group"), url: "#" },
                        { title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`cstAndSupStatementRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'supTitle'}`) }}
                    exportConfig={reportData && reportData.length > 0 ? {
                        onExportExcel: handleExportExcel,
                        onExportPdf: handleExportPdf,
                        onExportCsv: handleExportCsv,
                        label: t('Export Report')
                    } : null}
                />
                <AccountLedgerFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    costCenterOptions={costCenterOptions}
                    acGroupOptions={acGroupOptions}
                    loading={loading}
                    hasReportData={!!reportData}
                    resetFilters={resetFilters}
                    fromPage={'cust&suppStatementReport'}
                />

                <div className='px-1'>
                    <ContentTable
                        columns={columns}
                        data={reportData}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomerSupplierStatementReport;