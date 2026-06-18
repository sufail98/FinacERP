// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\ProfitAndLossAnalysis\ProfitAndLossAnalysis.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { TrendingUp } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProfitAndLossAnalysisFilters from './ProfitAndLossAnalysisFilters';
import ProfitAndLossGrid from './ProfitAndLossGrid';
import useReportExport from '@/hooks/useReportExport';

const ProfitAndLossAnalysis = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Profit And Loss Analysis");
    const { generalSettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart || 2;
    // Use the unified export hook
    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
        return {
            fromDate: today.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        reportType: 'condensed'
    });
    useEffect(() => {
    fetchReport();
}, []);
    const fetchReport = async (filterOverrides = {}) => {
        const activeFilters = { ...filters, ...filterOverrides };  // ← merge overrides
        setLoading(true);
        setAlert(null);

        try {
            const requestBody = {
                from_date: activeFilters.fromDate,   // ← use activeFilters
                to_date: activeFilters.toDate,
                branch_id: parseInt(selectedBranchId) || 1,
                currency_id: parseInt(currentCurrency?.currencyId) || 1
            };

            const endpoint = activeFilters.reportType === 'detailed'  // ← use activeFilters
                ? 'profit-and-loss/detailed'
                : 'profit-and-loss/analysis';

            const reportResponse = await axiosInstance.post(endpoint, requestBody);

            const openingStockResponse = await axiosInstance.post(
                'calculation-method/profit-and-loss-opening-stock-fifo',
                {
                    date: filters.fromDate,
                    from_date: filters.fromDate,
                    branch_id: parseInt(selectedBranchId) || 1,
                    currency_id: parseInt(currentCurrency?.currencyId) || 1
                }
            );

            const closingStockResponse = await axiosInstance.post(
                'calculation-method/profit-and-loss-opening-stock-fifo',
                {
                    date: filters.toDate,
                    from_date: filters.fromDate,
                    branch_id: parseInt(selectedBranchId) || 1,
                    currency_id: parseInt(currentCurrency?.currencyId) || 1
                }
            );

            const combinedData = {
                ...reportResponse.data.data,
                openingStock: openingStockResponse.data.data[0].totalCost || 0,
                closingStock: closingStockResponse.data.data[0].totalCost || 0
            };

            setReportData(combinedData);

            if (!reportResponse.data.data || Object.keys(reportResponse.data.data).length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: reportResponse.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("Profit And Loss Analysis Error:", error);
            const errorMessage = error.response?.data?.message || error.message;
            setAlert({
                id: Date.now(),
                type: 'error',
                message: errorMessage
            });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals for export
    const calculateTotals = useMemo(() => {
        if (!reportData) return null;

        const openingStock = parseFloat(reportData.openingStock || 0);
        const closingStock = parseFloat(reportData.closingStock || 0);

        let purchaseDebit, salesCredit, directExpenseDebit, directIncomeCredit;
        let indirectExpenseDebit, indirectIncomeCredit;

        if (filters.reportType === 'detailed') {
            purchaseDebit = reportData.Purchase?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            salesCredit = reportData.Sales?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            directExpenseDebit = reportData['Direct Expense']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            directIncomeCredit = reportData['Direct Income']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            indirectExpenseDebit = reportData['Indirect Expense']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            indirectIncomeCredit = reportData['Indirect Income']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
        } else {
            purchaseDebit = reportData.Purchase?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            salesCredit = reportData.Sales?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
            directExpenseDebit = reportData['Direct Expense']?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            directIncomeCredit = reportData['Direct Income']?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
            indirectExpenseDebit = reportData['Indirect Expense']?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            indirectIncomeCredit = reportData['Indirect Income']?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
        }

        const totalExpense = openingStock + purchaseDebit + directExpenseDebit;
        const totalIncome = closingStock + salesCredit + directIncomeCredit;

        const grossProfit = totalIncome > totalExpense ? totalIncome - totalExpense : 0;
        const grossLoss = totalExpense > totalIncome ? totalExpense - totalIncome : 0;

        const grandTotalExpense = grossLoss + indirectExpenseDebit;
        const grandTotalIncome = grossProfit + indirectIncomeCredit;

        const netProfit = grandTotalIncome > grandTotalExpense ? grandTotalIncome - grandTotalExpense : 0;
        const netLoss = grandTotalExpense > grandTotalIncome ? grandTotalExpense - grandTotalIncome : 0;

        return {
            openingStock, closingStock, purchaseDebit, salesCredit,
            directExpenseDebit, directIncomeCredit, totalExpense, totalIncome,
            grossProfit, grossLoss, indirectExpenseDebit, indirectIncomeCredit,
            grandTotalExpense: Math.max(grandTotalExpense, grandTotalIncome),
            netProfit, netLoss
        };
    }, [reportData, filters.reportType]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const formatNum = (num) => Number(num || 0).toFixed(decimalPart);
        const totals = calculateTotals;

        // Build export data in a two-column format (Expense | Income)
        const exportData = [
            { Particulars: 'TRADING ACCOUNT', Expense: '', Income: '', isHeader: true },
            { Particulars: 'Opening Stock', Expense: formatNum(totals.openingStock), Income: '' },
            { Particulars: 'Closing Stock', Expense: '', Income: formatNum(totals.closingStock) },
            { Particulars: 'Purchase Accounts', Expense: formatNum(totals.purchaseDebit), Income: '' },
            { Particulars: 'Sales Accounts', Expense: '', Income: formatNum(totals.salesCredit) },
            { Particulars: 'Direct Expenses', Expense: formatNum(totals.directExpenseDebit), Income: '' },
            { Particulars: 'Direct Incomes', Expense: '', Income: formatNum(totals.directIncomeCredit) },
        ];

        if (totals.grossProfit > 0) {
            exportData.push({ Particulars: 'Gross Profit c/d', Expense: formatNum(totals.grossProfit), Income: '' });
        } else {
            exportData.push({ Particulars: 'Gross Loss c/d', Expense: '', Income: formatNum(totals.grossLoss) });
        }

        exportData.push({
            Particulars: 'Total (Trading)',
            Expense: formatNum(Math.max(totals.totalExpense, totals.totalIncome)),
            Income: formatNum(Math.max(totals.totalExpense, totals.totalIncome)),
            isTotal: true
        });

        exportData.push({ Particulars: '', Expense: '', Income: '' });
        exportData.push({ Particulars: 'PROFIT & LOSS ACCOUNT', Expense: '', Income: '', isHeader: true });

        if (totals.grossProfit > 0) {
            exportData.push({ Particulars: 'Gross Profit b/d', Expense: '', Income: formatNum(totals.grossProfit) });
        } else {
            exportData.push({ Particulars: 'Gross Loss b/d', Expense: formatNum(totals.grossLoss), Income: '' });
        }

        exportData.push({ Particulars: 'Indirect Expenses', Expense: formatNum(totals.indirectExpenseDebit), Income: '' });
        exportData.push({ Particulars: 'Indirect Incomes', Expense: '', Income: formatNum(totals.indirectIncomeCredit) });

        if (totals.netProfit > 0) {
            exportData.push({ Particulars: 'Net Profit', Expense: formatNum(totals.netProfit), Income: '', isProfit: true });
        } else {
            exportData.push({ Particulars: 'Net Loss', Expense: '', Income: formatNum(totals.netLoss), isLoss: true });
        }

        exportData.push({
            Particulars: 'Grand Total',
            Expense: formatNum(totals.grandTotalExpense),
            Income: formatNum(totals.grandTotalExpense),
            isTotal: true
        });

        // Add detailed ledger breakdown if detailed report
        if (filters.reportType === 'detailed') {
            exportData.push({ Particulars: '', Expense: '', Income: '' });
            exportData.push({ Particulars: 'DETAILED BREAKDOWN', Expense: '', Income: '', isHeader: true });

            // Purchase Details
            if (reportData.Purchase?.length > 0) {
                exportData.push({ Particulars: 'Purchase Accounts', Expense: '', Income: '', isSubHeader: true });
                reportData.Purchase.forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: formatNum(item.balance), Income: '' });
                });
            }

            // Sales Details
            if (reportData.Sales?.length > 0) {
                exportData.push({ Particulars: 'Sales Accounts', Expense: '', Income: '', isSubHeader: true });
                reportData.Sales.forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: '', Income: formatNum(item.balance) });
                });
            }

            // Direct Expense Details
            if (reportData['Direct Expense']?.length > 0) {
                exportData.push({ Particulars: 'Direct Expenses', Expense: '', Income: '', isSubHeader: true });
                reportData['Direct Expense'].forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: formatNum(item.balance), Income: '' });
                });
            }

            // Direct Income Details
            if (reportData['Direct Income']?.length > 0) {
                exportData.push({ Particulars: 'Direct Incomes', Expense: '', Income: '', isSubHeader: true });
                reportData['Direct Income'].forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: '', Income: formatNum(item.balance) });
                });
            }

            // Indirect Expense Details
            if (reportData['Indirect Expense']?.length > 0) {
                exportData.push({ Particulars: 'Indirect Expenses', Expense: '', Income: '', isSubHeader: true });
                reportData['Indirect Expense'].forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: formatNum(item.balance), Income: '' });
                });
            }

            // Indirect Income Details
            if (reportData['Indirect Income']?.length > 0) {
                exportData.push({ Particulars: 'Indirect Incomes', Expense: '', Income: '', isSubHeader: true });
                reportData['Indirect Income'].forEach(item => {
                    exportData.push({ Particulars: `  ${item.ledger_name}`, Expense: '', Income: formatNum(item.balance) });
                });
            }
        }

        return {
            fileName: `Profit_And_Loss_${filters.reportType}`,
            sheetName: 'Profit & Loss',
            title: t('Profit & Loss Analysis'),
            subtitle: filters.reportType === 'detailed' ? 'Detailed Report' : 'Condensed Report',
            reportInfo: {
                title: t('Profit & Loss Analysis'),
                subtitle: filters.reportType === 'detailed' ? 'Detailed Report' : 'Condensed Report',
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'Particulars', label: 'Particulars', align: 'left', width: 40 },
                { key: 'Expense', label: 'Expense (Dr)', align: 'right', width: 20, type: 'currency' },
                { key: 'Income', label: 'Income (Cr)', align: 'right', width: 20, type: 'currency' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || !calculateTotals) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || !calculateTotals) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' });
    };

    const handleExportCsv = () => {
        if (!reportData || !calculateTotals) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    // Update handleFilterChange to auto-fetch on reportType change
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));

        if (field === 'reportType' && reportData) {
            fetchReport({ [field]: value });  // ← pass override directly
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            reportType: 'condensed'
        });
        setReportData(null);
        setAlert(null);
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Profit & Loss Analysis"), url: "#" },
                    ]}
                    heading={{ icon: TrendingUp, title: t("Profit & Loss Analysis") }}
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
                        { title: t("Reports"), url: "#" },
                        { title: t("Profit & Loss Analysis"), url: "#" },
                    ]}
                    heading={{ icon: TrendingUp, title: t("Profit & Loss Analysis") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && (
                <AlertBox
                    key={alert.id}
                    message={alert.message}
                    type={alert.type}
                />
            )}

            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Profit & Loss Analysis"), url: "#" },
                ]}
                heading={{ icon: TrendingUp, title: t("Profit & Loss Analysis") }}
                exportConfig={reportData ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <ProfitAndLossAnalysisFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    loading={loading}
                    hasReportData={!!reportData}
                    resetFilters={resetFilters}
                />

                {reportData && (
                    <ProfitAndLossGrid
                        data={reportData}
                        reportType={filters.reportType}
                    />
                )}
            </div>
        </div>
    );
};

export default ProfitAndLossAnalysis;