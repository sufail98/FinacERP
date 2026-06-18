// src/components/pages/Reports/FundFlow/FundFlow.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ArrowLeftRight } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import FundFlowFilters from './FundFlowFilters';
import FundFlowDetailedFilters from './FundFlowDetailedFilters';
import useReportExport from '@/hooks/useReportExport';

const FundFlow = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    const [groupData, setGroupData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Fund Flow");
    const { generalSettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart || 2;

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        return {
            fromDate: `${currentYear}-01-01`,
            toDate: `${currentYear}-12-31`
        };
    };

    const defaultDates = getDefaultDates();

    const [reportType, setReportType] = useState('normal');

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        currencyId: (currentCurrency.currencyId).toString(),
        groupId: null,
        isAsset: false
    });

    const isDetailed = reportType === 'detailed';

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        try {
            const [currencyRes, groupRes] = await Promise.all([
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("accountgroups").catch(() => ({ data: { data: [] } }))
            ]);
            setCurrencyData(currencyRes.data.data || currencyRes.data || []);
            setGroupData(groupRes.data.data || groupRes.data || []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    const selectedCurrency = useMemo(() => {
        if (!isDetailed) return currentCurrency;
        return currencyData.find(c =>
            String(c.currencyId || c.CurrencyId || c.id) === String(filters.currencyId)
        ) || currentCurrency;
    }, [currencyData, filters.currencyId, isDetailed, currentCurrency]);

    const activeCurrencySymbol = selectedCurrency?.currencySymbol || selectedCurrency?.symbol || '';

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const endpoint = isDetailed ? "fund-flow-detailed" : "fund-flow";

        const requestBody = {
            branch_id: parseInt(selectedBranchId) || 1,
            currency_id: isDetailed
                ? (parseInt(filters.currencyId) || 1)
                : (currentCurrency?.currencyId || 1),
            from_date: filters.fromDate,
            to_date: filters.toDate
        };

        if (isDetailed) {
            requestBody.group_id = filters.groupId ? parseInt(filters.groupId) : null;
            requestBody.is_asset = filters.isAsset;
        }

        try {
            const res = await axiosInstance.post(endpoint, requestBody);
            const extractedData = res.data?.data || res.data || [];

            setReportData(extractedData);

            if (Array.isArray(extractedData) && extractedData.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data?.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("Fund Flow Report Error:", error);
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

    const formatNumber = (num) => {
        return Number(num || 0).toFixed(decimalPart);
    };

    // ── Process data ──
    const processedData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return { sourcesData: [], applicationsData: [], totals: null };
        }

        // ✅ FIX: Always treat Balance as a number — null becomes 0
        // This handles the case where the SQL returns null Balance
        // (e.g., no transactions and no opening balance for a ledger)
        const parseBalance = (item) => {
            const val = item.Balance ?? item.balance ?? item.Amount ?? item.amount ?? item.balance ?? 0;
            return parseFloat(val) || 0;
        };

        const getName = (item) =>
            item.Name || item.name || item.ledger_name || item.particulars || '';

        // Check if this is the detailed API response format (has Balance field)
        const isDetailedFormat = reportData[0] !== undefined && 'Balance' in reportData[0];

        if (isDetailedFormat) {
            // ✅ For detailed mode: show ALL ledgers with non-zero balance
            // positive Balance → Source of Funds
            // negative Balance → Application of Funds
            // null/zero        → filtered out (no movement)
            const nonZero = reportData.filter(item => parseBalance(item) !== 0);

            const sources = nonZero
                .filter(item => parseBalance(item) > 0)
                .map((item, i) => ({
                    SNo: i + 1,
                    name: getName(item),
                    amount: Math.abs(parseBalance(item))
                }));

            const applications = nonZero
                .filter(item => parseBalance(item) < 0)
                .map((item, i) => ({
                    SNo: i + 1,
                    name: getName(item),
                    amount: Math.abs(parseBalance(item))
                }));

            // ✅ If ALL balances are null/zero (SQL issue), show everything as sources
            // so the user at least sees ledger names and can debug
            if (sources.length === 0 && applications.length === 0) {
                const allItems = reportData.map((item, i) => ({
                    SNo: i + 1,
                    name: getName(item),
                    amount: 0
                }));
                return {
                    sourcesData: allItems,
                    applicationsData: [],
                    totals: { totalSources: 0, totalApplications: 0 }
                };
            }

            const totalSources = sources.reduce((sum, item) => sum + item.amount, 0);
            const totalApplications = applications.reduce((sum, item) => sum + item.amount, 0);

            return {
                sourcesData: sources,
                applicationsData: applications,
                totals: { totalSources, totalApplications }
            };
        }

        // Normal / other API format
        const sources = reportData.filter(item => {
            const amount = parseFloat(item.amount || item.Amount || item.balance || 0);
            return item.type === 'Source' || item.is_source === true || amount > 0;
        }).map((item, i) => ({
            SNo: i + 1,
            name: getName(item),
            amount: Math.abs(parseFloat(item.amount || item.Amount || item.balance || 0))
        }));

        const applications = reportData.filter(item => {
            const amount = parseFloat(item.amount || item.Amount || item.balance || 0);
            return item.type === 'Application' || item.is_source === false || amount < 0;
        }).map((item, i) => ({
            SNo: i + 1,
            name: getName(item),
            amount: Math.abs(parseFloat(item.amount || item.Amount || item.balance || 0))
        }));

        const totalSources = sources.reduce((sum, item) => sum + item.amount, 0);
        const totalApplications = applications.reduce((sum, item) => sum + item.amount, 0);

        return {
            sourcesData: sources,
            applicationsData: applications,
            totals: { totalSources, totalApplications }
        };
    }, [reportData]);

    /* ────────────────── Export ────────────────── */

    const getExportOptions = () => {
        const formatNum = (num) => Number(num || 0).toFixed(decimalPart);
        const { sourcesData, applicationsData, totals } = processedData;

        const exportData = [];

        exportData.push({ Particulars: t('SOURCES OF FUNDS'), Amount: '', isHeader: true });
        sourcesData.forEach((item, index) => {
            exportData.push({ SNo: index + 1, Particulars: item.name, Amount: formatNum(item.amount) });
        });
        exportData.push({ SNo: '', Particulars: t('Total Sources'), Amount: formatNum(totals?.totalSources || 0), isTotal: true });
        exportData.push({ SNo: '', Particulars: '', Amount: '' });

        exportData.push({ Particulars: t('APPLICATION OF FUNDS'), Amount: '', isHeader: true });
        applicationsData.forEach((item, index) => {
            exportData.push({ SNo: index + 1, Particulars: item.name, Amount: formatNum(item.amount) });
        });
        exportData.push({ SNo: '', Particulars: t('Total Applications'), Amount: formatNum(totals?.totalApplications || 0), isTotal: true });
        exportData.push({ SNo: '', Particulars: '', Amount: '' });

        const difference = (totals?.totalSources || 0) - (totals?.totalApplications || 0);
        exportData.push({ SNo: '', Particulars: t('Net Difference'), Amount: formatNum(difference), isTotal: true });

        let subtitle = t('Normal Report');
        if (isDetailed) {
            const selectedGroup = groupData.find(g =>
                String(g.accountGroupId || g.AccountGroupId || g.id) === String(filters.groupId)
            );
            subtitle = selectedGroup?.accountGroupName || selectedGroup?.AccountGroupName || t('All Groups');
        }

        return {
            fileName: isDetailed ? 'Fund_Flow_Detailed' : 'Fund_Flow_Normal',
            sheetName: isDetailed ? 'Fund Flow Detailed' : 'Fund Flow',
            title: isDetailed ? t('Fund Flow Detailed') : t('Fund Flow'),
            subtitle,
            reportInfo: {
                title: isDetailed ? t('Fund Flow Detailed') : t('Fund Flow'),
                subtitle,
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 8 },
                { key: 'Particulars', label: t('Particulars'), align: 'left', width: 45 },
                { key: 'Amount', label: `${t('Amount')} (${activeCurrencySymbol})`, align: 'right', width: 20, type: 'currency' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0 || !processedData.totals) return;
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0 || !processedData.totals) return;
        exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0 || !processedData.totals) return;
        exportGenericToCsv(getExportOptions());
    };

    /* ────────────────── Table Config ────────────────── */

    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'name', label: t('Particulars'), align: 'left' },
        { key: 'amount', label: t('Amount'), align: 'right' }
    ];

    const sourcesFooterData = useMemo(() => {
        if (!processedData.totals) return null;
        return { SNo: '', name: t('Total'), amount: formatNumber(processedData.totals.totalSources) };
    }, [processedData, t]);

    const applicationsFooterData = useMemo(() => {
        if (!processedData.totals) return null;
        return { SNo: '', name: t('Total'), amount: formatNumber(processedData.totals.totalApplications) };
    }, [processedData, t]);

    const renderCell = (key, row) => {
        if (key === 'amount') return formatNumber(row[key]);
        return row[key] ?? '-';
    };

    /* ────────────────── Filter Handlers ────────────────── */

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleReportTypeChange = (type) => {
        setReportType(type);
        setReportData(null);
        setAlert(null);
    };

    const resetFilters = () => {
        setFilters({
            fromDate: defaultDates.fromDate,
            toDate: defaultDates.toDate,
            currencyId: 1,
            groupId: null,
            isAsset: false
        });
        setReportData(null);
        setAlert(null);
    };

    const currencyOptions = currencyData.map(currency => ({
        label: currency.currencyName || currency.CurrencyName || currency.name,
        value: String(currency.currencyId || currency.CurrencyId || currency.id)
    }));

    const groupOptions = [
        { label: t('All'), value: '' },
        ...groupData.map(group => ({
            label: group.accountGroupName || group.AccountGroupName || group.groupName || group.Name,
            value: String(group.accountGroupId || group.AccountGroupId || group.id || group.ID)
        }))
    ];

    /* ────────────────── Loading / No Access ────────────────── */

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Fund Flow"), url: "#" },
                    ]}
                    heading={{ icon: ArrowLeftRight, title: t("Fund Flow") }}
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
                        { title: t("Fund Flow"), url: "#" },
                    ]}
                    heading={{ icon: ArrowLeftRight, title: t("Fund Flow") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    /* ────────────────── Main Render ────────────────── */

    // ✅ Show tables whenever we have processedData with items (even if totals are 0)
    const hasDisplayData =
        processedData.sourcesData.length > 0 ||
        processedData.applicationsData.length > 0;

    return (
        <div>
            {alert && (
                <AlertBox key={alert.id} message={alert.message} type={alert.type} />
            )}

            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Fund Flow"), url: "#" },
                ]}
                heading={{ icon: ArrowLeftRight, title: t("Fund Flow") }}
                exportConfig={hasDisplayData && processedData.totals ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">

                {/* ══════════ Report Type Toggle ══════════ */}
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 mb-3 bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
                        {t('Report Type')}:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="reportType"
                            value="normal"
                            checked={!isDetailed}
                            onChange={() => handleReportTypeChange('normal')}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t('Normal')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="reportType"
                            value="detailed"
                            checked={isDetailed}
                            onChange={() => handleReportTypeChange('detailed')}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t('Detailed')}</span>
                    </label>
                </div>

                {/* ══════════ Conditional Filters ══════════ */}
                {isDetailed ? (
                    <FundFlowDetailedFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        currencyOptions={currencyOptions}
                        groupOptions={groupOptions}
                        loading={loading}
                        resetFilters={resetFilters}
                    />
                ) : (
                    <FundFlowFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        loading={loading}
                        resetFilters={resetFilters}
                        currentCurrency={currentCurrency}
                    />
                )}

                {/* ══════════ Totals Bar ══════════ */}
                {processedData.totals && (
                    <div className="flex flex-wrap items-center gap-6 mb-3 px-3 py-2 bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Total Sources')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {activeCurrencySymbol} {formatNumber(processedData.totals.totalSources)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Total Applications')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {activeCurrencySymbol} {formatNumber(processedData.totals.totalApplications)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Difference')}</span>
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {activeCurrencySymbol} {formatNumber(processedData.totals.totalSources - processedData.totals.totalApplications)}
                            </span>
                        </div>
                        <div className="ml-auto">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{t('Currency')}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {selectedCurrency?.currencyName || selectedCurrency?.CurrencyName || 'Default'}
                            </span>
                        </div>
                    </div>
                )}

                {/* ══════════ Split Tables ══════════ */}
                {hasDisplayData && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Sources */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Sources of Funds')}
                                </span>
                            </div>
                            <ContentTable
                                columns={columns}
                                data={processedData.sourcesData}
                                loading={loading}
                                renderCell={renderCell}
                                footerData={sourcesFooterData}
                                staticSearchable={true}
                                tableId={`fund-flow-${reportType}-sources`}
                                 maxHeight='calc(100vh - 370px)'
                            />
                        </div>

                        {/* Applications */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Application of Funds')}
                                </span>
                            </div>
                            <ContentTable
                                columns={columns}
                                data={processedData.applicationsData}
                                loading={loading}
                                renderCell={renderCell}
                                footerData={applicationsFooterData}
                                staticSearchable={true}
                                tableId={`fund-flow-${reportType}-applications`}
                                 maxHeight='calc(100vh - 370px)'
                            />
                        </div>
                    </div>
                )}

                {/* ══════════ Empty State ══════════ */}
                {!loading && !hasDisplayData && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-12 text-center">
                        <ArrowLeftRight className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('Select filters and click "Generate Report" to view fund flow')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FundFlow;
