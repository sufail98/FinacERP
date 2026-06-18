// CustomerSuplierReport.jsx - Updated with Party Selection
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccountLedgerFilters from './AccountLedgerFilters';
import ContentTable from '@/components/common/ContentTable';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';

const CustomerSuplierReport = ({ type }) => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const [partyData, setPartyData] = useState([]);
    const [partyLoading, setPartyLoading] = useState(false);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges(type === 'customer' ? "Party Balance" : "Supplier Report");
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    const { 
        exportAccountGroupToExcel, 
        exportAccountGroupToPdf, 
        exportAccountGroupToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        groupId: type === 'customer' ? 44 : 43,
        costCentreId: '',
        partyId: '', // New field for party selection
        isShowOpeningBalance: true,
        isMainGroup: true
    });

    useEffect(() => {
        fetchCostCenterData();
        fetchPartyData();
    }, []);

    const fetchPartyData = async () => {
        setPartyLoading(true);
        try {
            const res = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: type === 'customer' ? ["Customer"] : ["Supplier"],
                branchId: selectedBranchId
            });
            
            // Transform data to dropdown format
            const parties = res.data.data.map(party => ({
                label: `${party.ledgerCode} - ${party.ledgerName}`,
                value: party.ledgerId,
                ledgerCode: party.ledgerCode,
                ledgerName: party.ledgerName,
                ledgerId: party.ledgerId
            }));
            
            setPartyData(parties);
        } catch (error) {
            console.error("Error fetching party data:", error);
            setPartyData([]);
        } finally {
            setPartyLoading(false);
        }
    };

    const fetchReport = async () => {
        if (!filters.groupId) {
            alert(t('Please select an account group'));
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("accountgroup-detailed-report", {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchId,
                groupId: type === 'customer' ? 44 : 43,
                currencyId: currentCurrency.currencyId,
                isShowOpeningBalance: true,
                isMainGroup: true,
                costCentreId: filters.costCentreId || 'All',
                ...(filters.partyId && { ledgerId: filters.partyId }) // Add partyId if selected
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

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            groupId: type === 'customer' ? 44 : 43,
            costCentreId: '',
            partyId: '',
            isShowOpeningBalance: true
        });
        setReportData(null);
    };

    const costCenterOptions = costCenterData.map(center => ({
        label: center.CostCentre,
        value: center.costCentreId
    }));

    const { totalOpening, totalDebit, totalCredit, formattedClosingBalance } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalOpening: 0, totalDebit: 0, totalCredit: 0, formattedClosingBalance: '0.00' };
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
        const amount = Math.abs(balance).toFixed(generalSettings?.decimalPart || 2);
        
        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        let formattedVal = '';
        if (isCrDr) {
            formattedVal = balance < 0 ? `${amount} Cr` : `${amount} Dr`;
        } else {
            formattedVal = balance < 0 ? `-${amount}` : amount;
        }

        return {
            totalOpening: opening,
            totalDebit: debit,
            totalCredit: credit,
            formattedClosingBalance: formattedVal
        };
    }, [reportData, generalSettings?.decimalPart, generalSettings?.AccountCalculationMethod]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        return {
            label: t('Total'),
            opening: totalOpening.toFixed(generalSettings?.decimalPart || 2),
            debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
            credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
            balance: formattedClosingBalance
        };
    }, [reportData, totalOpening, totalDebit, totalCredit, formattedClosingBalance, generalSettings?.decimalPart, t]);

    // Export configuration
    const getExportOptions = () => {
        const reportTitle = type === 'customer'
            ? t('custAndSupplrRprt.breadcrumb.cusTitle') || 'Customer Report'
            : t('custAndSupplrRprt.breadcrumb.suppTitle') || 'Supplier Report';

        const exportData = reportData.map((row, index) => {
            const op = parseFloat(row.op || 0);
            const debit = parseFloat(row.debit || 0);
            const credit = parseFloat(row.credit || 0);
            const balance = (op + debit) - credit;
            
            const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
            const amount = Math.abs(balance).toFixed(generalSettings?.decimalPart || 2);
            let displayBalance = '';
            if (isCrDr) {
                displayBalance = balance < 0 ? `${amount} Cr` : `${amount} Dr`;
            } else {
                displayBalance = balance < 0 ? `-${amount}` : amount;
            }

            return {
                SNo: row.SNo || index + 1,
                ledgerCode: row.ledgerCode || '',
                ledgerName: row.ledgerName || '',
                opening: op.toFixed(generalSettings?.decimalPart || 2),
                debit: debit.toFixed(generalSettings?.decimalPart || 2),
                credit: credit.toFixed(generalSettings?.decimalPart || 2),
                balance: displayBalance
            };
        });

        return {
            fileName: `${type === 'customer' ? 'Customer' : 'Supplier'}_Report`,
            title: reportTitle,
            subtitle: type === 'customer' ? 'Party Balance Report' : 'Supplier Balance Report',
            groupName: type === 'customer' ? 'Customers' : 'Suppliers',
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: {
                label: t('Total'),
                opening: totalOpening.toFixed(generalSettings?.decimalPart || 2),
                debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
                credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
                balance: formattedClosingBalance
            },
            theme: 'professional',
            decimalPlaces: generalSettings?.decimalPart || 2,
            columns: [
                { key: 'SNo', label: t('acGrpReport.grid.columns.SINO') || 'S.No', align: 'center', width: 8 },
                { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode') || 'Ledger Code', align: 'center', width: 14 },
                { key: 'ledgerName', label: t('acGrpReport.grid.columns.ledgerName') || 'Ledger Name', align: 'left', width: 30 },
                { key: 'opening', label: t('acGrpReport.grid.columns.opening') || 'Opening', align: 'right', width: 14, type: 'currency' },
                { key: 'debit', label: t('acGrpReport.grid.columns.debit') || 'Debit', align: 'right', width: 14, type: 'currency' },
                { key: 'credit', label: t('acGrpReport.grid.columns.credit') || 'Credit', align: 'right', width: 14, type: 'currency' },
                { key: 'balance', label: t('acGrpReport.grid.columns.balance') || 'Balance', align: 'right', width: 16, type: 'balance' }
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
        exportAccountGroupToPdf(getExportOptions());
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
        { key: 'ledgerCode', label: t('acLedgerReport.grid.columns.ledgerCode') },
        { key: 'ledgerName', label: t('acGrpReport.grid.columns.ledgerName') },
        { key: 'opening', label: t('acGrpReport.grid.columns.opening'), align: "right" },
        { key: 'debit', label: t('acGrpReport.grid.columns.debit'), align: "right" },
        { key: 'credit', label: t('acGrpReport.grid.columns.credit'), align: "right" },
        { key: 'balance', label: t('acGrpReport.grid.columns.balance'), align: "right" },
    ];

    const renderCell = (key, row) => {
        if (key === "balance") {
            const op = parseFloat(row.op || 0);
            const debit = parseFloat(row.debit || 0);
            const credit = parseFloat(row.credit || 0);
            const balance = (op + debit) - credit;
            
            const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
            const amount = Math.abs(balance).toFixed(generalSettings?.decimalPart || 2);
            let displayBalance = '';
            
            if (isCrDr) {
                displayBalance = balance < 0 ? `${amount} Cr` : `${amount} Dr`;
            } else {
                displayBalance = balance < 0 ? `-${amount}` : amount;
            }

            return (
                <span style={{ color: balance < 0 ? "#dc2626" : "#16a34a", fontWeight: 500, textAlign: 'right' }}>
                    {displayBalance}
                </span>
            );
        }

        if (key === "opening") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.op || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }

        if (key === "credit") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.credit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }

        if (key === "debit") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.debit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }

        return row[key] ?? "-";
    };

    if (loading || privilegeLoading || partyLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t(`custAndSupplrRprt.breadcrumb.group`), url: "#" },
                        { title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`) }}
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
                        { title: t(`custAndSupplrRprt.breadcrumb.group`), url: "#" },
                        { title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`) }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t(`custAndSupplrRprt.breadcrumb.group`), url: "#" },
                    { title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: t(`custAndSupplrRprt.breadcrumb.${type === 'customer' ? 'cusTitle' : 'suppTitle'}`) }}
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
                partyOptions={partyData}
                loading={loading}
                partyLoading={partyLoading}
                hasReportData={!!reportData}
                resetFilters={resetFilters}
                fromPage={'customer&Supplier'}
                type={type}
            />
            <div className='px-1'>
                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    maxHeight='calc(100vh - 150px)'
                />
            </div>
        </div>
    );
};

export default CustomerSuplierReport;