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
import AccountLedgerFilters from './AccountLedgerFilters';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const AccountLedgerReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [acGroupData, setAcGroupData] = useState([]);

    const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges('Ledger Report');
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.MasterId) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.MasterId}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.MasterId}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.MasterId}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.MasterId}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.MasterId}`,
            'Payment Voucher': `/transaction/payment-voucher/edit-payment-voucher/${row.MasterId}`,
            'Receipt Voucher': `/transaction/reciept-voucher/edit-reciept-voucher/${row.MasterId}`,
            'Contra Voucher': `/transaction/contra-voucher/edit-contra-voucher/${row.MasterId}`,
            'Material Receipt': `/transaction/material-receipt/edit/${row.MasterId}`,
            'Delivery Note': `/transaction/delivery-note/edit-delivery-note/${row.MasterId}`,
            'Payable': `/transaction/payable-voucher/edit/${row.MasterId}`,
            'Receivable': `/transaction/receivable-voucher/edit/${row.MasterId}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.MasterId}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.MasterId}`,
        };

        const path = routes[row.voucherType];
        if (path) navigate(path);
    };
    // Use the unified export hook
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
        isShowOpeningBalance: true
    });

    useEffect(() => {
        fetchCostCenterData();
        getAcGroupData();
    }, []);

    const fetchCostCenterData = async () => {
        try {
            const res = await axiosInstance.get('cost-centres');
            setCostCenterData(res.data.data || []);
        } catch (err) {
            console.error('Error fetching cost centers:', err);
        }
    };

    const getAcGroupData = async () => {
        try {
            const res = await axiosInstance.get(`all-account-ledgers/${selectedBranchId}`);
            setAcGroupData(res.data.data || []);
        } catch (err) {
            console.error('Error fetching account groups:', err);
        }
    };

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

    const processReportData = (data) => {
        if (!data || data.length === 0) return [];

        let processed = [];
        let prevBalance = '0';

        data.forEach((row, index) => {
            const debit = parseFloat(row.Debit) || 0;
            const credit = parseFloat(row.Credit) || 0;
            const balance = calculateRowBalance(index, debit, credit, prevBalance);

            processed.push({ ...row, Balance: balance });
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
            const res = await axiosInstance.post('accountledger-detailed-report', {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchId,
                ledgerId: filters.groupId,
                currencyId: currentCurrency.currencyId,
                isShowOpeningBalance: filters.isShowOpeningBalance,
                costCentreId: filters.costCentreId || null
            });

            setReportData(processReportData(res.data.data));
            
        } catch (err) {
            console.error('Error fetching report:', err);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

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

    // Export configuration
    const getExportOptions = () => ({
        fileName: `Account_Ledger_${selectedLedger?.ledgerName?.replace(/\s+/g, '_') || 'Report'}`,
        title: t('acLedgerReport.breadcrumb.title') || 'Account Ledger Report',
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
            { key: 'SlNo', label: t('#'), align: 'center', width: 8 },
            { key: 'Date', label: t('acLedgerReport.grid.columns.Date'), align: 'center', width: 12 },
            { key: 'voucherType', label: t('acLedgerReport.grid.columns.voucherType'), align: 'left', width: 16 },
            { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode'), align: 'center', width: 12 },
            { key: 'InvoiceNo', label: t('acLedgerReport.grid.columns.voucherNo'), align: 'center', width: 12 },
            { key: 'CostCentre', label: t('acLedgerReport.grid.columns.CostCentre'), align: 'left', width: 15 },
            { key: 'Narration', label: t('acLedgerReport.grid.columns.Narration'), align: 'left', width: 35 },
            { key: 'Debit', label: t('acLedgerReport.grid.columns.Debit'), align: 'right', width: 14, type: 'currency' },
            { key: 'Credit', label: t('acLedgerReport.grid.columns.Credit'), align: 'right', width: 14, type: 'currency' },
            { key: 'Balance', label: t('Balance'), align: 'right', width: 16, type: 'balance' }
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
            toDate: new Date().toISOString().split('T')[0],
            groupId: '',
            costCentreId: '',
            isShowOpeningBalance: true
        });
        setReportData(null);
    };

    const costCenterOptions = costCenterData.map((c) => ({
        label: c.CostCentre,
        value: c.costCentreId
    }));

    const acGroupOptions = acGroupData.map((g) => ({
        label: g.ledgerName,
        value: g.ledgerId
    }));

    const columns = [
        { key: 'SNo', label: t('#') },
        { key: 'Date', label: t('acLedgerReport.grid.columns.Date') },
        { key: 'voucherType', label: t('acLedgerReport.grid.columns.voucherType') },
        { key: 'InvoiceNo', label: t('acLedgerReport.grid.columns.voucherNo') },
        { key: 'CostCentre', label: t('acLedgerReport.grid.columns.CostCentre') },
        { key: 'Narration', label: t('acLedgerReport.grid.columns.Narration') },
        { key: 'Debit', label: t('acLedgerReport.grid.columns.Debit'), align: 'right' },
        { key: 'Credit', label: t('acLedgerReport.grid.columns.Credit'), align: 'right' },
        { key: 'Balance', label: t('Balance'), align: 'right' }
    ];

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

        return row[key] ?? '-';
    };

    if ( privilegeLoading) {
        return (
            <>
                <BreadCrumb
                    routes={[
                        { title: t('acLedgerReport.breadcrumb.group'), url: '#' },
                        { title: t('acLedgerReport.breadcrumb.title'), url: '#' }
                    ]}
                    heading={{ icon: BookOpen, title: t('acLedgerReport.breadcrumb.title') }}
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
                        { title: t('acLedgerReport.breadcrumb.group'), url: '#' },
                        { title: t('acLedgerReport.breadcrumb.title'), url: '#' }
                    ]}
                    heading={{ icon: BookOpen, title: t('acLedgerReport.breadcrumb.title') }}
                />
                <NoAcessComponent message={message} />
            </>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t('acLedgerReport.breadcrumb.group'), url: '#' },
                    { title: t('acLedgerReport.breadcrumb.title'), url: '#' }
                ]}
                heading={{ icon: BookOpen, title: t('acLedgerReport.breadcrumb.title') }}
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
                fromPage="accountLedgerreport"
            />

            <div className="px-1">
                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    footerData={footerData}
                    renderCell={renderCell}
                     onRowClick={handleRowClick}
                     maxHeight="calc(100vh - 200px)"
                />
            </div>
        </div>
    );
};

export default AccountLedgerReport;