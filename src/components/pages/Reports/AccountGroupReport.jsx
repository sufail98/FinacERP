// AccountGroupReport.jsx - Updated with Opening Balance Dr/Cr Logic
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ArrowLeft, BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccountLedgerFilters from './AccountLedgerFilters';
import ContentTable from '@/components/common/ContentTable';
import AccountGroupDetailTable from './AccountGroupDetailTable';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';

const AccountGroupReport = () => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [acGroupData, setAcGroupData] = useState([]);
    const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Account Group Report");
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    const { 
        exportAccountGroupToExcel, 
        exportAccountGroupToPdf, 
        exportAccountGroupToCsv 
    } = useReportExport();

    const [showDetailView, setShowDetailView] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState(null);

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

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.post("accountgroup-detailed-report", {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchDetails?.mainBranch ? null : selectedBranchId,
                groupId: filters.groupId || null,
                currencyId: currentCurrency.currencyId,
                isShowOpeningBalance: true,
                isMainGroup: true,
                costCentreId: filters.costCentreId || null
            });
            setReportData(res.data.data);
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
            const response = await axiosInstance.get('accountgroups');
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
        setShowDetailView(false);
        setSelectedLedger(null);
    };

    const costCenterOptions = costCenterData.map(center => ({
        label: center.CostCentre,
        value: center.costCentreId
    }));

    const acGroupOptions = acGroupData.map(group => ({
        label: group.accountGroupName,
        value: group.groupId
    }));

    // Helper function to format opening balance with Dr/Cr
    const formatOpeningBalance = (openingValue) => {
        const value = parseFloat(openingValue || 0);
        const absValue = Math.abs(value);
        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        
        let displayStr = '';
        if (isCrDr) {
            displayStr = value < 0 
                ? `${absValue.toFixed(generalSettings?.decimalPart || 2)} Cr` 
                : `${absValue.toFixed(generalSettings?.decimalPart || 2)} Dr`;
        } else {
            displayStr = value < 0 
                ? `-${absValue.toFixed(generalSettings?.decimalPart || 2)}` 
                : absValue.toFixed(generalSettings?.decimalPart || 2);
        }

        return {
            value: absValue.toFixed(generalSettings?.decimalPart || 2),
            label: value < 0 ? "Cr" : "Dr",
            display: displayStr,
            numericValue: value
        };
    };

    // Helper function to calculate and format closing balance
    const formatClosingBalance = (openingValue, debitValue, creditValue) => {
        const op = parseFloat(openingValue || 0);
        const debit = parseFloat(debitValue || 0);
        const credit = parseFloat(creditValue || 0);
        const balance = (op + debit) - credit;
        const absValue = Math.abs(balance);
        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        
        let displayStr = '';
        if (isCrDr) {
            displayStr = balance < 0 
                ? `${absValue.toFixed(generalSettings?.decimalPart || 2)} Cr` 
                : `${absValue.toFixed(generalSettings?.decimalPart || 2)} Dr`;
        } else {
            displayStr = balance < 0 
                ? `-${absValue.toFixed(generalSettings?.decimalPart || 2)}` 
                : absValue.toFixed(generalSettings?.decimalPart || 2);
        }

        return {
            value: absValue.toFixed(generalSettings?.decimalPart || 2),
            label: balance < 0 ? "Cr" : "Dr",
            display: displayStr,
            numericValue: balance
        };
    };

    const { totalOpening, totalDebit, totalCredit, closingBalance, closingBalanceLabel, totalOpeningLabel } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { 
                totalOpening: 0, 
                totalDebit: 0, 
                totalCredit: 0, 
                closingBalance: 0, 
                closingBalanceLabel: 'Dr',
                totalOpeningLabel: 'Dr'
            };
        }

        let opening = 0;
        let debit = 0;
        let credit = 0;

        reportData.forEach((row) => {
            opening += parseFloat(row.op || 0);
            debit += parseFloat(row.debit || 0);
            credit += parseFloat(row.credit || 0);
        });

        const balance = (opening + debit) - credit;
        const balanceLabel = balance < 0 ? "Cr" : "Dr";
        const openingLabel = opening < 0 ? "Cr" : "Dr";

        return {
            totalOpening: Math.abs(opening),
            totalDebit: debit,
            totalCredit: credit,
            closingBalance: Math.abs(balance),
            closingBalanceLabel: balanceLabel,
            totalOpeningLabel: openingLabel
        };
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        
        let openingDisplay = '';
        if (isCrDr) {
            openingDisplay = `${totalOpening.toFixed(generalSettings?.decimalPart || 2)} ${totalOpeningLabel}`;
        } else {
            openingDisplay = totalOpeningLabel === "Cr" 
                ? `-${totalOpening.toFixed(generalSettings?.decimalPart || 2)}` 
                : totalOpening.toFixed(generalSettings?.decimalPart || 2);
        }

        let balanceDisplay = '';
        if (isCrDr) {
            balanceDisplay = `${closingBalance.toFixed(generalSettings?.decimalPart || 2)} ${closingBalanceLabel}`;
        } else {
            balanceDisplay = closingBalanceLabel === "Cr" 
                ? `-${closingBalance.toFixed(generalSettings?.decimalPart || 2)}` 
                : closingBalance.toFixed(generalSettings?.decimalPart || 2);
        }

        return {
            label: t('Total'),
            opening: openingDisplay,
            debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
            credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
            balance: balanceDisplay
        };
    }, [reportData, totalOpening, totalDebit, totalCredit, closingBalance, closingBalanceLabel, totalOpeningLabel, generalSettings?.decimalPart, generalSettings?.AccountCalculationMethod, t]);

    // Get selected group for export
    const selectedGroup = acGroupData.find(g => g.groupId === filters.groupId);

    // Export configuration
    const getExportOptions = () => {
        const exportData = reportData.map((row, index) => {
            const openingFormatted = formatOpeningBalance(row.op);
            const closingFormatted = formatClosingBalance(row.op, row.debit, row.credit);

            return {
                SNo: row.SNo || index + 1,
                ledgerCode: row.ledgerCode || '',
                ledgerName: row.ledgerName || '',
                opening: openingFormatted.display,
                debit: Number(row.debit || 0).toFixed(generalSettings?.decimalPart || 2),
                credit: Number(row.credit || 0).toFixed(generalSettings?.decimalPart || 2),
                balance: closingFormatted.display
            };
        });

        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        const openingDisplay = isCrDr 
            ? `${totalOpening.toFixed(generalSettings?.decimalPart || 2)} ${totalOpeningLabel}`
            : (totalOpeningLabel === "Cr" ? `-${totalOpening.toFixed(generalSettings?.decimalPart || 2)}` : totalOpening.toFixed(generalSettings?.decimalPart || 2));
        const balanceDisplay = isCrDr 
            ? `${closingBalance.toFixed(generalSettings?.decimalPart || 2)} ${closingBalanceLabel}`
            : (closingBalanceLabel === "Cr" ? `-${closingBalance.toFixed(generalSettings?.decimalPart || 2)}` : closingBalance.toFixed(generalSettings?.decimalPart || 2));

        return {
            fileName: `Account_Group_${selectedGroup?.accountGroupName?.replace(/\s+/g, '_') || 'Report'}`,
            title: t('acGrpReport.breadcrumb.title') || 'Account Group Report',
            subtitle: selectedGroup?.accountGroupName || '',
            groupName: selectedGroup?.accountGroupName || '',
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: {
                label: t('Total'),
                opening: openingDisplay,
                debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
                credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
                balance: balanceDisplay
            },
            theme: 'professional',
            decimalPlaces: generalSettings?.decimalPart || 2,
            columns: [
                { key: 'SNo', label: t('acGrpReport.grid.columns.SINO') || 'S.No', align: 'center', width: 8 },
                { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode') || 'Ledger Code', align: 'center', width: 14 },
                { key: 'ledgerName', label: t('acGrpReport.grid.columns.ledgerName') || 'Ledger Name', align: 'left', width: 28 },
                { key: 'opening', label: t('acGrpReport.grid.columns.opening') || 'Opening', align: 'right', width: 12, type: 'currency' },
                { key: 'debit', label: t('acGrpReport.grid.columns.debit') || 'Debit', align: 'right', width: 12, type: 'currency' },
                { key: 'credit', label: t('acGrpReport.grid.columns.credit') || 'Credit', align: 'right', width: 12, type: 'currency' },
                { key: 'balance', label: t('acGrpReport.grid.columns.balance') || 'Balance', align: 'right', width: 14, type: 'balance' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountGroupToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountGroupToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportAccountGroupToCsv(getExportOptions());
    };

    const columns = [
        { key: 'SNo', label: t('acGrpReport.grid.columns.SINO') },
        { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode') ,width:'80px'},
        { key: 'ledgerName', label: t('acGrpReport.grid.columns.ledgerName') },
        { key: 'opening', label: t('acGrpReport.grid.columns.opening'), align: "right" },
        { key: 'debit', label: t('acGrpReport.grid.columns.debit'), align: "right" },
        { key: 'credit', label: t('acGrpReport.grid.columns.credit'), align: "right" },
        { key: 'balance', label: t('acLedgerReport.grid.columns.balance'), align: "right" },
    ];

    const renderCell = (key, row) => {
        if (key === "balance") {
            const closingFormatted = formatClosingBalance(row.op, row.debit, row.credit);
            const colorClass = closingFormatted.numericValue < 0 ? "text-red-600" : "text-green-600";

            return (
                <span className={`font-semibold ${colorClass}`} style={{ textAlign: 'right', display: 'block' }}>
                    {closingFormatted.display}
                </span>
            );
        }

        if (key === "opening") {
            const openingFormatted = formatOpeningBalance(row.op);
            const colorClass = openingFormatted.numericValue < 0 ? "text-red-600" : "text-green-600";

            return (
                <div className={`text-sm ${colorClass}`} style={{ textAlign: 'right' }}>
                    {openingFormatted.display}
                </div>
            );
        }

        if (key === "debit") {
            return (
                <div className="text-sm" style={{ textAlign: 'right' }}>
                    {Number(row.debit || 0).toFixed(generalSettings?.decimalPart || 2)}
                </div>
            );
        }

        if (key === "credit") {
            return (
                <div className="text-sm" style={{ textAlign: 'right' }}>
                    {Number(row.credit || 0).toFixed(generalSettings?.decimalPart || 2)}
                </div>
            );
        }

        return row[key] ?? "-";
    };

    const handleRowClick = (row) => {
        setSelectedLedger({ ledgerId: row.ledgerId, ledgerName: row.ledgerName });
        setShowDetailView(true);
    };

    const handleBackClick = () => {
        setShowDetailView(false);
        setSelectedLedger(null);
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("acGrpReport.breadcrumb.group"), url: "#" },
                        { title: t("acGrpReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("acGrpReport.breadcrumb.title") }}
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
                        { title: t("acGrpReport.breadcrumb.group"), url: "#" },
                        { title: t("acGrpReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("acGrpReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("acGrpReport.breadcrumb.group"), url: "#" },
                    { title: t("acGrpReport.breadcrumb.title"), url: "#" },
                    ...(showDetailView ? [{ title: selectedLedger?.ledgerName || t("Details"), url: "#" }] : [])
                ]}
                heading={{ icon: BookOpen, title: t("acGrpReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 && !showDetailView ? {
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
            />

            {!showDetailView ? (
                <div className='px-1'>
                    <ContentTable
                        columns={columns}
                        data={reportData}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        onRowClick={handleRowClick}
                        rowClassName="cursor-pointer hover:bg-gray-100"
                    />
                </div>
            ) : (
                <div className='px-1'>
                    <div className='mb-4 flex items-center gap-4'>
                        <button
                            onClick={handleBackClick}
                            className='flex items-center gap-2 px-2 py-1 bg-gray-300 hover:bg-gray-200 rounded-sm text-gray-700 font-medium transition-colors duration-200'
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <span className='text-lg font-semibold text-gray-800'>
                            {selectedLedger?.ledgerName}
                        </span>
                    </div>

                    <AccountGroupDetailTable
                        fromDate={filters.fromDate}
                        toDate={filters.toDate}
                        ledgerId={selectedLedger?.ledgerId}
                        costCenterId={filters.costCentreId}
                    />
                </div>
            )}
        </div>
    );
};

export default AccountGroupReport;