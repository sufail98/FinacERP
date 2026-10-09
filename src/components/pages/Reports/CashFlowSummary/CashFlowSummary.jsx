// src/components/pages/Reports/CashFlowSummary/CashFlowSummary.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import CashFlowSummaryFilters from './CashFlowSummaryFilters';

const CashFlowSummary = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [groupData, setGroupData] = useState([]);
    const [ledgerData, setLedgerData] = useState([]);

    const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Cash Flow");
    const { generalSettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart || 2;

    // Get default dates
    const getDefaultDates = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        return {
            fromDate: `${currentYear}-01-01`,
            toDate: `${currentYear}-12-31`
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        filterBy: 'Summary',
        month: null,
        year: null,
        groupId: null,
        ledgerId: null
    });

    // Fetch dropdown data on mount
    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        try {
            const [groupRes, ledgerRes] = await Promise.all([
                axiosInstance.get("accountgroups").catch(() => ({ data: { data: [] } })),
                axiosInstance.get(`all-account-ledgers/${selectedBranchId}`).catch(() => ({ data: { data: [] } }))
            ]);

            setGroupData(groupRes.data.data || groupRes.data || []);
            setLedgerData(ledgerRes.data.data || ledgerRes.data || []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const requestBody = {
            branch_id: selectedBranchDetails?.mainBranch ? null : parseInt(selectedBranchId) || 1,
            currency_id: currentCurrency?.currencyId || 30,
            from_date: filters.fromDate,
            to_date: filters.toDate,
            filter_by: filters.filterBy,
            month: filters.month,
            year: filters.year,
            group_id: filters.groupId ? parseInt(filters.groupId) : null,
            ledger_id: filters.ledgerId ? parseInt(filters.ledgerId) : null
        };

        try {
            const res = await axiosInstance.post("cash-flow-summary", requestBody);
            const extractedData = res.data?.data || res.data || [];

            setReportData(extractedData);

            if (extractedData.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data?.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("Cash Flow Report Error:", error);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || error.message
            });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Format number
    const formatNumber = (num) => {
        return Number(num || 0).toFixed(decimalPart);
    };

    // Process data based on filter type
    const processedData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return { summaryData: [], inflowData: [], outflowData: [], totals: null };
        }

        // Helper: derive an inflow/outflow pair from any row, regardless of
        // whether the API sends explicit Inflow/Outflow rows or a single
        // pre-netted "Net Flow" row.
        const splitAmount = (item) => {
            const amt = parseFloat(item.amount) || 0;
            if (item.flow_type === 'Inflow') {
                return { inflowAmt: amt, outflowAmt: 0 };
            }
            if (item.flow_type === 'Outflow') {
                return { inflowAmt: 0, outflowAmt: amt };
            }
            if (item.flow_type === 'Net Flow') {
                // API already netted the value; bucket by sign.
                return amt >= 0
                    ? { inflowAmt: amt, outflowAmt: 0 }
                    : { inflowAmt: 0, outflowAmt: Math.abs(amt) };
            }
            return { inflowAmt: 0, outflowAmt: 0 };
        };

        // SUMMARY VIEW - Group by month
        if (filters.filterBy === 'Summary') {
            const monthlyData = {};

            reportData.forEach(item => {
                const month = item.month || item.voucher_no || 'Current Period';

                if (!monthlyData[month]) {
                    monthlyData[month] = { month, inflow: 0, outflow: 0 };
                }

                const { inflowAmt, outflowAmt } = splitAmount(item);
                monthlyData[month].inflow += inflowAmt;
                monthlyData[month].outflow += outflowAmt;
            });

            const summaryData = Object.values(monthlyData).map((item, index) => ({
                SNo: index + 1,
                month: item.month,
                inflow: item.inflow,
                outflow: item.outflow,
                netFlow: item.inflow - item.outflow
            }));

            const totalInflow = summaryData.reduce((sum, row) => sum + row.inflow, 0);
            const totalOutflow = summaryData.reduce((sum, row) => sum + row.outflow, 0);
            const netFlow = totalInflow - totalOutflow;

            return {
                summaryData,
                inflowData: [],
                outflowData: [],
                totals: { totalInflow, totalOutflow, netFlow }
            };
        }

        // For the split views below, only rows that are explicitly
        // Inflow/Outflow make sense to bucket by group/ledger. A "Net Flow"
        // row has no group/ledger meaning in a split view, so it's ignored
        // there (it only applies to Summary).
        const inflow = reportData.filter(item => item.flow_type === 'Inflow');
        const outflow = reportData.filter(item => item.flow_type === 'Outflow');

        const totalInflow = inflow.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const totalOutflow = outflow.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const netFlow = totalInflow - totalOutflow;

        // CONDENSED VIEW - Group by group_name
        if (filters.filterBy === 'Condensed') {
            const groupInflow = {};
            const groupOutflow = {};

            inflow.forEach(item => {
                const groupName = item.group_name || 'Other';
                if (!groupInflow[groupName]) {
                    groupInflow[groupName] = { groupName, amount: 0 };
                }
                groupInflow[groupName].amount += parseFloat(item.amount) || 0;
            });

            outflow.forEach(item => {
                const groupName = item.group_name || 'Other';
                if (!groupOutflow[groupName]) {
                    groupOutflow[groupName] = { groupName, amount: 0 };
                }
                groupOutflow[groupName].amount += parseFloat(item.amount) || 0;
            });

            return {
                summaryData: [],
                inflowData: Object.values(groupInflow).map((item, i) => ({ SNo: i + 1, ...item })),
                outflowData: Object.values(groupOutflow).map((item, i) => ({ SNo: i + 1, ...item })),
                totals: { totalInflow, totalOutflow, netFlow }
            };
        }

        // DETAILED VIEW - Group by ledger_name
        if (filters.filterBy === 'Detailed') {
            const ledgerInflow = {};
            const ledgerOutflow = {};

            inflow.forEach(item => {
                const ledgerName = item.ledger_name || 'Other';
                if (!ledgerInflow[ledgerName]) {
                    ledgerInflow[ledgerName] = { ledgerName, amount: 0 };
                }
                ledgerInflow[ledgerName].amount += parseFloat(item.amount) || 0;
            });

            outflow.forEach(item => {
                const ledgerName = item.ledger_name || 'Other';
                if (!ledgerOutflow[ledgerName]) {
                    ledgerOutflow[ledgerName] = { ledgerName, amount: 0 };
                }
                ledgerOutflow[ledgerName].amount += parseFloat(item.amount) || 0;
            });

            return {
                summaryData: [],
                inflowData: Object.values(ledgerInflow).map((item, i) => ({ SNo: i + 1, ...item })),
                outflowData: Object.values(ledgerOutflow).map((item, i) => ({ SNo: i + 1, ...item })),
                totals: { totalInflow, totalOutflow, netFlow }
            };
        }

        // VERY DETAILED VIEW - Show all transactions
        if (filters.filterBy === 'Very Detailed') {
            return {
                summaryData: [],
                inflowData: inflow.map((item, i) => ({
                    SNo: i + 1,
                    ledgerName: item.ledger_name,
                    voucherNo: item.voucher_no || '-',
                    amount: parseFloat(item.amount) || 0,
                    voucherType: item.voucher_type || '-'
                })),
                outflowData: outflow.map((item, i) => ({
                    SNo: i + 1,
                    ledgerName: item.ledger_name,
                    voucherNo: item.voucher_no || '-',
                    amount: parseFloat(item.amount) || 0,
                    voucherType: item.voucher_type || '-'
                })),
                totals: { totalInflow, totalOutflow, netFlow }
            };
        }

        return { summaryData: [], inflowData: [], outflowData: [], totals: null };
    }, [reportData, filters.filterBy]);

    // SUMMARY COLUMNS
    const summaryColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'month', label: t('Month'), align: 'left' },
        { key: 'inflow', label: t('Inflow'), align: 'right' },
        { key: 'outflow', label: t('Outflow'), align: 'right' },
        { key: 'netFlow', label: t('Net Flow'), align: 'right' }
    ];

    // CONDENSED COLUMNS
    const condensedInflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'groupName', label: t('Group Name'), align: 'left' },
        { key: 'amount', label: t('Inflow'), align: 'right' }
    ];

    const condensedOutflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'groupName', label: t('Group Name'), align: 'left' },
        { key: 'amount', label: t('Outflow'), align: 'right' }
    ];

    // DETAILED COLUMNS
    const detailedInflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'ledgerName', label: t('Account Ledger'), align: 'left' },
        { key: 'amount', label: t('Inflow'), align: 'right' }
    ];

    const detailedOutflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'ledgerName', label: t('Account Ledger'), align: 'left' },
        { key: 'amount', label: t('Outflow'), align: 'right' }
    ];

    // VERY DETAILED COLUMNS
    const veryDetailedInflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'ledgerName', label: t('Account Ledger'), align: 'left' },
        { key: 'voucherNo', label: t('Voucher No'), align: 'center' },
        { key: 'amount', label: t('Inflow'), align: 'right' },
        { key: 'voucherType', label: t('Voucher Type'), align: 'left' }
    ];

    const veryDetailedOutflowColumns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'ledgerName', label: t('Account Ledger'), align: 'left' },
        { key: 'voucherNo', label: t('Voucher No'), align: 'center' },
        { key: 'amount', label: t('Outflow'), align: 'right' },
        { key: 'voucherType', label: t('Voucher Type'), align: 'left' }
    ];

    // Get columns based on filter type
    const getInflowColumns = () => {
        switch (filters.filterBy) {
            case 'Condensed': return condensedInflowColumns;
            case 'Detailed': return detailedInflowColumns;
            case 'Very Detailed': return veryDetailedInflowColumns;
            default: return [];
        }
    };

    const getOutflowColumns = () => {
        switch (filters.filterBy) {
            case 'Condensed': return condensedOutflowColumns;
            case 'Detailed': return detailedOutflowColumns;
            case 'Very Detailed': return veryDetailedOutflowColumns;
            default: return [];
        }
    };

    // Footer data for Summary view
    const summaryFooterData = useMemo(() => {
        if (filters.filterBy !== 'Summary' || !processedData.totals) return null;

        return {
            SNo: '',
            month: t('Total'),
            inflow: formatNumber(processedData.totals.totalInflow),
            outflow: formatNumber(processedData.totals.totalOutflow),
            netFlow: formatNumber(processedData.totals.netFlow)
        };
    }, [processedData, filters.filterBy, t]);

    // Footer data for Inflow table
    const inflowFooterData = useMemo(() => {
        if (filters.filterBy === 'Summary' || !processedData.totals) return null;

        const baseFooter = {
            SNo: '',
            amount: formatNumber(processedData.totals.totalInflow)
        };

        if (filters.filterBy === 'Condensed') {
            return { ...baseFooter, groupName: t('Total') };
        } else {
            return { ...baseFooter, ledgerName: t('Total'), voucherNo: '', voucherType: '' };
        }
    }, [processedData, filters.filterBy, t]);

    // Footer data for Outflow table
    const outflowFooterData = useMemo(() => {
        if (filters.filterBy === 'Summary' || !processedData.totals) return null;

        const baseFooter = {
            SNo: '',
            amount: formatNumber(processedData.totals.totalOutflow)
        };

        if (filters.filterBy === 'Condensed') {
            return { ...baseFooter, groupName: t('Total') };
        } else {
            return { ...baseFooter, ledgerName: t('Total'), voucherNo: '', voucherType: '' };
        }
    }, [processedData, filters.filterBy, t]);

    // Render cell for Summary view
    const renderSummaryCell = (key, row) => {
        if (key === 'inflow' || key === 'outflow' || key === 'netFlow') {
            return formatNumber(row[key]);
        }
        return row[key] ?? '-';
    };

    // Render cell for split views
    const renderSplitCell = (key, row) => {
        if (key === 'amount') {
            return formatNumber(row[key]);
        }
        return row[key] ?? '-';
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: defaultDates.fromDate,
            toDate: defaultDates.toDate,
            filterBy: 'Summary',
            month: null,
            year: null,
            groupId: null,
            ledgerId: null
        });
        setReportData(null);
        setAlert(null);
    };

    const filterByOptions = [
        { label: t('Summary'), value: 'Summary' },
        { label: t('Condensed'), value: 'Condensed' },
        { label: t('Detailed'), value: 'Detailed' },
        { label: t('Very Detailed'), value: 'Very Detailed' }
    ];

    const monthOptions = [
        { label: t('January'), value: 1 },
        { label: t('February'), value: 2 },
        { label: t('March'), value: 3 },
        { label: t('April'), value: 4 },
        { label: t('May'), value: 5 },
        { label: t('June'), value: 6 },
        { label: t('July'), value: 7 },
        { label: t('August'), value: 8 },
        { label: t('September'), value: 9 },
        { label: t('October'), value: 10 },
        { label: t('November'), value: 11 },
        { label: t('December'), value: 12 }
    ];

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, i) => ({
        label: String(currentYear - i),
        value: currentYear - i
    }));

    const groupOptions = [
        { label: t('All'), value: '' },
        ...groupData.map(group => ({
            label: group.accountGroupName || group.AccountGroupName || group.groupName,
            value: group.groupId
        }))
    ];

    const ledgerOptions = [
        { label: t('All'), value: '' },
        ...ledgerData.map(ledger => ({
            label: ledger.ledgerName || ledger.LedgerName || ledger.accountLedgerName,
            value: String(ledger.ledgerId || ledger.LedgerId || ledger.accountLedgerId)
        }))
    ];

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Cash Flow Summary"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("Cash Flow Summary") }}
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
                        { title: t("Cash Flow Summary"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("Cash Flow Summary") }}
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
                    { title: t("Cash Flow Summary"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: t("Cash Flow Summary") }}
            />

            <div className="px-1">
                <CashFlowSummaryFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    filterByOptions={filterByOptions}
                    monthOptions={monthOptions}
                    yearOptions={yearOptions}
                    groupOptions={groupOptions}
                    ledgerOptions={ledgerOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                    currentCurrency={currentCurrency}
                />

                {/* Totals Bar */}
                {processedData.totals && (
                    <div className="flex flex-wrap items-center gap-6 mb-3 px-3 py-2 bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Total Inflow')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {currentCurrency?.currencySymbol || ''} {formatNumber(processedData.totals.totalInflow)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Total Outflow')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {currentCurrency?.currencySymbol || ''} {formatNumber(processedData.totals.totalOutflow)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Net Cash Flow')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {currentCurrency?.currencySymbol || ''} {formatNumber(processedData.totals.netFlow)}
                            </span>
                        </div>
                        {/* Display current currency info */}
                        <div className="ml-auto">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Currency')}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {currentCurrency?.currencyName || 'Default'}
                            </span>
                        </div>
                    </div>
                )}

                {/* SUMMARY VIEW - Single Table */}
                {filters.filterBy === 'Summary' && (
                    <ContentTable
                        columns={summaryColumns}
                        data={processedData.summaryData}
                        loading={loading}
                        renderCell={renderSummaryCell}
                        footerData={summaryFooterData}
                        staticSearchable={false}
                        tableId="cash-flow-summary"
                    />
                )}

                {/* SPLIT VIEW - Condensed, Detailed, Very Detailed */}
                {filters.filterBy !== 'Summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Inflow Section */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Inflow')}
                                </span>
                            </div>
                            <ContentTable
                                columns={getInflowColumns()}
                                data={processedData.inflowData}
                                loading={loading}
                                renderCell={renderSplitCell}
                                footerData={inflowFooterData}
                                staticSearchable={false}
                                tableId="cash-flow-inflow"
                                maxHeight="calc(100vh - 360px)"
                            />
                        </div>

                        {/* Outflow Section */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Outflow')}
                                </span>
                            </div>
                            <ContentTable
                                columns={getOutflowColumns()}
                                data={processedData.outflowData}
                                loading={loading}
                                renderCell={renderSplitCell}
                                footerData={outflowFooterData}
                                staticSearchable={false}
                                tableId="cash-flow-outflow"
                                maxHeight="calc(100vh - 360px)"
                            />
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && (!reportData || reportData.length === 0) && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-12 text-center">
                        <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('Select filters and click "Generate Report" to view cash flow summary')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CashFlowSummary;