import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale } from 'lucide-react';
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import IncomAndExpendeetureReportFilter from './IncomAndExpendeetureReportFilter';
import Preloader from '@/components/common/Preloader';

const getToday = () => new Date().toISOString().split('T')[0];

const EMPTY_REPORT = {
    openingBalance: { amount: 0, side: 'income' },
    condensed: { income: [], expense: [], advancePaymentSalary: [] },
    incomeLedgerDetails: {},
    expenseLedgerDetails: {},
    cashOrBank: { opening: [], closing: [] },
    totals: {},
};

const IncomAndExpendeetureReport = () => {
    const { t } = useTranslation();
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges('Income & Expenditure');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(EMPTY_REPORT);
    const [filters, setFilters] = useState({
        fromDate: getToday(),
        toDate: getToday(),
        reportMode: 'detailed',
        showOpeningInFooter: false,
    });

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('incomeandexpenditure/allreports', {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: selectedBranchId || '1',
                currencyId: currentCurrency?.currencyId ?? currentCurrency?.currencyName ?? currentCurrency?.currencyCode ?? 'INR',
                reportMode: filters.reportMode,
                showOpeningInFooter: Boolean(filters.showOpeningInFooter),
            });

            const payload = response.data?.data ?? response.data ?? EMPTY_REPORT;

            setReportData({
                ...EMPTY_REPORT,
                ...payload,
                condensed: { ...EMPTY_REPORT.condensed, ...(payload.condensed || {}) },
                cashOrBank: { ...EMPTY_REPORT.cashOrBank, ...(payload.cashOrBank || {}) },
            });
        } catch (error) {
            console.error('Income and expenditure report error:', error);
            setReportData(EMPTY_REPORT);
        } finally {
            setLoading(false);
        }
    }, [currentCurrency, filters.fromDate, filters.reportMode, filters.showOpeningInFooter, filters.toDate, selectedBranchId]);

    useEffect(() => {
        if (hasAccess) {
            fetchReport();
        }
    }, [fetchReport, hasAccess]);

    const handleFilterChange = (field, value) => {
        setFilters((previous) => ({ ...previous, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: `${new Date().getFullYear()}-01-01`,
            toDate: getToday(),
            reportMode: 'Detailed',
            showOpeningInFooter: false,
        });
        setReportData(EMPTY_REPORT);
    };

    const formatAmount = (value) => {
        const numeric = Number(value ?? 0);
        return Number.isFinite(numeric)
            ? numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '0.00';
    };

    const isDetailed = (filters.reportMode || '').toLowerCase() === 'detailed';

    const expenseRows = reportData?.condensed?.expense ?? [];
    const incomeRows = reportData?.condensed?.income ?? [];
    const maxLength = Math.max(expenseRows.length, incomeRows.length);
    const openingBalance = reportData?.openingBalance ?? { amount: 0, side: 'income' };
    const totals = reportData?.totals ?? {};
    const closingBalance = totals?.closingBalance ?? { amount: 0, side: 'expense' };
    const cashOpening = reportData?.cashOrBank?.opening ?? [];
    const cashClosing = reportData?.cashOrBank?.closing ?? [];

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t('incomAndExpenteetureReport.breadcrumb.group') || 'Group', url: '#' }, { title: t('incomAndExpenteetureReport.breadcrumb.title') || 'Income & Expenditure', url: '#' }]}
                    heading={{ icon: Scale, title: t('incomAndExpenteetureReport.heading') || 'Income & Expenditure' }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return <NoAcessComponent message={message} />;
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t('incomAndExpenteetureReport.breadcrumb.main') || 'Reports', url: '#' },
                    { title: t('incomAndExpenteetureReport.breadcrumb.group') || 'Account', url: '#' },
                    { title: t('incomAndExpenteetureReport.breadcrumb.title') || 'Income & Expenditure', url: '#' },
                ]}
                heading={{ icon: Scale, title: t('incomAndExpenteetureReport.heading') || 'Income & Expenditure' }}
            />

            <IncomAndExpendeetureReportFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onGenerateReport={fetchReport}
                loading={loading}
                resetFilters={resetFilters}
            />

            {loading ? (
                <Preloader />
            ) : (
                <div className="mt-3 p-1 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-100">
                            <div className="p-3 text-center font-bold text-red-700">{t('incomAndExpenteetureReport.expense') || 'Expense'}</div>
                            <div className="p-3 text-center font-bold text-green-700">{t('incomAndExpenteetureReport.income') || 'Income'}</div>
                        </div>

                        <div className="grid grid-cols-2">
                            {/* Expense column */}
                            <div className="border-r border-gray-200">
                                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
                                    <span className="text-sm font-semibold text-gray-700">Opening Balance</span>
                                    <span className={`text-sm font-semibold ${openingBalance.side === 'expense' ? 'text-green-700' : 'text-red-700'}`}>
                                        {formatAmount(openingBalance.amount)}
                                    </span>
                                </div>
                                {Array.from({ length: maxLength }).map((_, index) => {
                                    const item = expenseRows[index];
                                    return (
                                        <div key={`expense-${index}`} className="flex justify-between items-center px-3 py-2 border-b border-gray-200 text-sm">
                                            <span className="text-gray-700">{item?.Name || item?.name || ''}</span>
                                            <span className="font-medium text-gray-800">{item ? formatAmount(item.Amount ?? item.amount) : ''}</span>
                                        </div>
                                    );
                                })}
                                {closingBalance.side === 'expense' && (
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm">
                                        <span className="text-gray-700 font-semibold">Closing Balance</span>
                                        <span className="font-semibold text-red-700">{formatAmount(closingBalance.amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center px-3 py-2 bg-gray-100 font-bold text-gray-800 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>
                                        {formatAmount(
                                            (Number(totals.grandTotalExpense ?? totals.directExpense ?? 0)) +
                                            (closingBalance.side === 'expense' ? Number(closingBalance.amount ?? 0) : 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Income column */}
                            <div>
                                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
                                    <span className="text-sm font-semibold text-gray-700">Opening Balance</span>
                                    <span className={`text-sm font-semibold ${openingBalance.side === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                        {formatAmount(openingBalance.amount)}
                                    </span>
                                </div>
                                {Array.from({ length: maxLength }).map((_, index) => {
                                    const item = incomeRows[index];
                                    return (
                                        <div key={`income-${index}`} className="flex justify-between items-center px-3 py-2 border-b border-gray-200 text-sm">
                                            <span className="text-gray-700">{item?.Name || item?.name || ''}</span>
                                            <span className="font-medium text-gray-800">{item ? formatAmount(item.Amount ?? item.amount) : ''}</span>
                                        </div>
                                    );
                                })}
                                {closingBalance.side === 'income' && (
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm">
                                        <span className="text-gray-700 font-semibold">Closing Balance</span>
                                        <span className="font-semibold text-green-700">{formatAmount(closingBalance.amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center px-3 py-2 bg-gray-100 font-bold text-gray-800 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>
                                        {formatAmount(
                                            (Number(totals.grandTotalIncome ?? totals.directIncome ?? 0)) +
                                            (closingBalance.side === 'income' ? Number(closingBalance.amount ?? 0) : 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cash / Bank detail table — only present in detailed mode */}
                    {isDetailed && (cashOpening.length > 0 || cashClosing.length > 0) && (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-gray-200 bg-gray-100 font-bold text-gray-800">
                                Cash / Bank Details
                            </div>
                            <div className="grid grid-cols-2">
                                <div className="border-r border-gray-200">
                                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                                        Opening
                                    </div>
                                    {cashOpening.length === 0 && (
                                        <div className="px-3 py-2 text-sm text-gray-400">No records</div>
                                    )}
                                    {cashOpening.map((row) => (
                                        <div key={`cash-open-${row.ledgerId}`} className="flex justify-between items-center px-3 py-2 border-b border-gray-200 text-sm">
                                            <span className="text-gray-700">{row.ledgerName}</span>
                                            <span className="font-medium text-gray-800">{row.Opening}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                                        Closing
                                    </div>
                                    {cashClosing.length === 0 && (
                                        <div className="px-3 py-2 text-sm text-gray-400">No records</div>
                                    )}
                                    {cashClosing.map((row) => (
                                        <div key={`cash-close-${row.ledgerId}`} className="flex justify-between items-center px-3 py-2 border-b border-gray-200 text-sm">
                                            <span className="text-gray-700">{row.ledgerName}</span>
                                            <span className="font-medium text-gray-800">{row.Opening}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IncomAndExpendeetureReport;