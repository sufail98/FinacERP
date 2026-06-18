import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ACGroupReportFilter from './ACGroupReportFilter';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';

const AccountGroupReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges('Account Group Report');
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const { 
        exportAccountLedgerToExcel, 
        exportAccountLedgerToPdf, 
        exportAccountLedgerToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.post('account-group-report', {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchId,
                currencyId: currentCurrency.currencyId
            });

            setReportData(processReportData(res.data.data || res.data));
        } catch (err) {
            console.error('Error fetching report:', err);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (data) => {
        if (!data || data.length === 0) return [];
        
        return data.map((row, index) => {
            // Parse opening balance and determine Dr/Cr
            const openingValue = parseFloat(row.op || 0);
            
            // Calculate closing balance
            const debit = parseFloat(row.debit) || 0;
            const credit = parseFloat(row.credit) || 0;
            const closingBalance = openingValue + debit - credit;
            
            // Determine if closing balance is Cr or Dr
            const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
            
            let openingBalanceStr = '';
            const absOpeningValue = Math.abs(openingValue);
            if (isCrDr) {
                openingBalanceStr = openingValue < 0 
                    ? `${absOpeningValue.toFixed(generalSettings?.decimalPart || 6)} Cr` 
                    : `${absOpeningValue.toFixed(generalSettings?.decimalPart || 6)} Dr`;
            } else {
                openingBalanceStr = openingValue < 0 
                    ? `-${absOpeningValue.toFixed(generalSettings?.decimalPart || 6)}` 
                    : absOpeningValue.toFixed(generalSettings?.decimalPart || 6);
            }

            let closingBalanceStr = '';
            let closingBalanceAbs = Math.abs(closingBalance);
            if (isCrDr) {
                if (closingBalance > 0) {
                    closingBalanceStr = `${closingBalanceAbs.toFixed(generalSettings?.decimalPart || 6)} Dr`;
                } else if (closingBalance < 0) {
                    closingBalanceStr = `${closingBalanceAbs.toFixed(generalSettings?.decimalPart || 6)} Cr`;
                } else {
                    closingBalanceStr = `${(0).toFixed(generalSettings?.decimalPart || 6)} Dr`;
                }
            } else {
                closingBalanceStr = closingBalance < 0 
                    ? `-${closingBalanceAbs.toFixed(generalSettings?.decimalPart || 6)}` 
                    : closingBalanceAbs.toFixed(generalSettings?.decimalPart || 6);
            }

            return {
                ...row,
                SNo: row.SlNO || index + 1,
                openingBalanceFormatted: openingBalanceStr,
                closingBalance: closingBalanceStr,
                closingBalanceValue: closingBalance
            };
        });
    };

    const { totalOpening, totalDebit, totalCredit, totalClosingBalance } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalOpening: 0, totalDebit: 0, totalCredit: 0, totalClosingBalance: 0 };
        }

        let opening = 0;
        let debit = 0;
        let credit = 0;
        let closingBalance = 0;

        reportData.forEach((row) => {
            opening += parseFloat(row.op) || 0;
            debit += parseFloat(row.debit) || 0;
            credit += parseFloat(row.credit) || 0;
            closingBalance += row.closingBalanceValue || 0;
        });

        return { totalOpening: opening, totalDebit: debit, totalCredit: credit, totalClosingBalance: closingBalance };
    }, [reportData]);

    const formatBalanceDisplay = (balance) => {
        const absBalance = Math.abs(balance);
        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        if (isCrDr) {
            if (balance > 0) {
                return `${absBalance.toFixed(generalSettings?.decimalPart || 6)} Dr`;
            } else if (balance < 0) {
                return `${absBalance.toFixed(generalSettings?.decimalPart || 6)} Cr`;
            }
            return `${(0).toFixed(generalSettings?.decimalPart || 6)} Dr`;
        } else {
            return balance < 0 
                ? `-${absBalance.toFixed(generalSettings?.decimalPart || 6)}` 
                : absBalance.toFixed(generalSettings?.decimalPart || 6);
        }
    };

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        return {
            label: t('Total'),
            GroupName: t('Total'),
            opening: formatBalanceDisplay(totalOpening),
            debit: totalDebit.toFixed(generalSettings?.decimalPart || 6),
            credit: totalCredit.toFixed(generalSettings?.decimalPart || 6),
            closingBalance: formatBalanceDisplay(totalClosingBalance)
        };
    }, [reportData, totalOpening, totalDebit, totalCredit, totalClosingBalance, generalSettings?.decimalPart, generalSettings?.AccountCalculationMethod, t]);

    // Export configuration
    const getExportOptions = () => ({
        fileName: `Account_Group_Report_${filters.fromDate}_to_${filters.toDate}`,
        title: t('acGroupReport.breadcrumb.title') || 'Account Group Report',
        subtitle: `${t('reportFilters.fromDate')}: ${filters.fromDate} - ${t('reportFilters.toDate')}: ${filters.toDate}`,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        data: reportData,
        footer: footerData,
        theme: 'professional',
        decimalPlaces: generalSettings?.decimalPart || 6,
        columns: [
            { key: 'SNo', label: t('#'), align: 'center', width: 8 },
            { key: 'GroupName', label: t('acGroupReport.grid.columns.GroupName'), align: 'left', width: 25 },
            { key: 'opening', label: t('acGroupReport.grid.columns.Opening'), align: 'right', width: 15 },
            { key: 'debit', label: t('acGroupReport.grid.columns.Debit'), align: 'right', width: 15, type: 'currency' },
            { key: 'credit', label: t('acGroupReport.grid.columns.Credit'), align: 'right', width: 15, type: 'currency' },
            { key: 'closingBalance', label: t('acGroupReport.grid.columns.ClosingBalance'), align: 'right', width: 22, type: 'balance' }
        ]
    });

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

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0]
        });
        setReportData(null);
    };

    const columns = [
        { key: 'SNo', label: t('#'), align: 'center', width: '100px' },
        { key: 'GroupName', label: t('acGroupReport.grid.columns.GroupName'), align: 'left', width: '200px' },
        { key: 'opening', label: t('acGroupReport.grid.columns.Opening'), align: 'right', width: '200px' },
        { key: 'debit', label: t('acGroupReport.grid.columns.Debit'), align: 'right', width: '100px' },
        { key: 'credit', label: t('acGroupReport.grid.columns.Credit'), align: 'right', width: '100px' },
        { key: 'closingBalance', label: t('acGroupReport.grid.columns.ClosingBalance'), align: 'right', width: '200px' }
    ];

    const renderCell = (key, row) => {
        // Numeric fields with proper formatting
        if (['debit', 'credit'].includes(key)) {
            const value = parseFloat(row[key]) || 0;
            return (
                <div className="text-sm flex justify-end pr-4">
                    {value.toFixed(generalSettings?.decimalPart || 6)}
                </div>
            );
        }

        // Opening balance display
        if (key === 'opening') {
            return (
                <div className="text-sm flex justify-end pr-4">
                    {row.openingBalanceFormatted || row.opening}
                </div>
            );
        }

        // Closing balance with color coding
        if (key === 'closingBalance') {
            const isCreditBalance = row.closingBalance?.includes('Cr') || row.closingBalanceValue < 0;
            const colorClass = isCreditBalance ? 'text-red-600' : 'text-green-600';

            return (
                <div className={`text-sm flex justify-end font-semibold ${colorClass} pr-4`}>
                    {row.closingBalance}
                </div>
            );
        }

        // Default rendering
        return (
            <div className="text-sm">
                {row[key] ?? '-'}
            </div>
        );
    };

    if (loading || privilegeLoading) {
        return (
            <>
                <BreadCrumb
                    routes={[
                        { title: t('acGroupReport.breadcrumb.group'), url: '#' },
                        { title: t('acGroupReport.breadcrumb.title'), url: '#' }
                    ]}
                    heading={{ icon: BookOpen, title: t('acGroupReport.breadcrumb.title') }}
                />
                <Preloader />
            </>
        );
    }

    if (!hasAccess) {
        return (
            <>
                <BreadCrumb
                    routes={[
                        { title: t('acGroupReport.breadcrumb.group'), url: '#' },
                        { title: t('acGroupReport.breadcrumb.title'), url: '#' }
                    ]}
                    heading={{ icon: BookOpen, title: t('acGroupReport.breadcrumb.title') }}
                />
                <NoAcessComponent message={message} />
            </>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t('acGroupReport.breadcrumb.group'), url: '#' },
                    { title: t('acGroupReport.breadcrumb.title'), url: '#' }
                ]}
                heading={{ icon: BookOpen, title: t('acGroupReport.breadcrumb.title') }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <ACGroupReportFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onGenerateReport={fetchReport}
                loading={loading}
                hasReportData={!!reportData}
                resetFilters={resetFilters}
            />

            <div className="px-1">
                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    footerData={footerData}
                    renderCell={renderCell}
                />
            </div>
        </div>
    );
};

export default AccountGroupReport;