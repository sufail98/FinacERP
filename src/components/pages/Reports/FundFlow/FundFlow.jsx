// src/components/pages/Reports/FundFlow/FundFlow.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import FundFlowFilters from './FundFlowFilters';
import FundFlowDetailedFilters from './FundFlowDetailedFilters';
import useReportExport from '@/hooks/useReportExport';

// Mirrors STOCK_CALCULATION_CONFIG from ProfitAndLossAnalysis.jsx
const STOCK_CALCULATION_CONFIG = {
    'FIFO': {
        endpoint: 'calculation-method/profit-and-loss-opening-stock-fifo',
        valueKey: 'totalCost'
    },
    'Low Cost': {
        endpoint: 'calculation-method/opening-stock-low-cost',
        valueKey: 'actualvalue'
    },
    'High Cost': {
        endpoint: 'calculation-method/stock-opening-high-cost',
        valueKey: 'actualvalue'
    },
    'Last Purchase Rate': {
        endpoint: 'calculation-method/stock-opening-value-last-purchase-rate',
        valueKey: 'actualvalue'
    },
    'Average Cost': {
        endpoint: 'calculation-method/stock-opening-value-avco',
        valueKey: 'actualvalue'
    }
};

const getStockCalculationConfig = (method) => {
    const config = STOCK_CALCULATION_CONFIG[method];
    if (!config) {
        console.warn(`No config mapped for stockValueCalculation: "${method}", falling back to FIFO`);
        return STOCK_CALCULATION_CONFIG['FIFO'];
    }
    return config;
};

const FundFlow = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    const [groupData, setGroupData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});

    const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Fund Flow");
    const { generalSettings, inventorySettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart || 2;

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

    const [reportType, setReportType] = useState('normal');

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        currencyId: (currentCurrency.currencyId).toString(),
    });

    const isDetailed = reportType === 'detailed';

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    // Default: expand all groups automatically when new detailed data loads.
    // User can still click a group's chevron to collapse/expand individually.
    useEffect(() => {
        if (isDetailed && reportData?.fundFlowRows) {
            const defaultExpanded = {};
            reportData.fundFlowRows.forEach((group) => {
                if (group.ledgers && group.ledgers.length > 0) {
                    // set for both sides since we don't know upfront which side
                    // the group landed on (sign of its balance) — harmless either way
                    defaultExpanded[`sources-${group.groupId}`] = true;
                    defaultExpanded[`applications-${group.groupId}`] = true;
                }
            });
            setExpandedGroups(defaultExpanded);
        }
    }, [reportData, isDetailed]);

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

    /* ────────────────── Fetch: Fund Flow + Stock + P&L (matches FillGrid() in .NET) ────────────────── */

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        setExpandedGroups({});

        const endpoint = isDetailed ? "fund-flow-detailed" : "fund-flow";

        const branchId = selectedBranchDetails?.mainBranch ? null : (parseInt(selectedBranchId) || 1);
        const currencyId = isDetailed
            ? (parseInt(filters.currencyId) || 1)
            : (currentCurrency?.currencyId || 1);

        const requestBody = {
            branch_id: branchId,
            currency_id: currencyId,
            from_date: filters.fromDate,
            to_date: filters.toDate
        };

        try {
            // 1) Fund flow ledger balances (Asset/Liability tables from SpFinance.FundFlow)
            const res = await axiosInstance.post(endpoint, requestBody);
            const extractedData = res.data?.data || res.data || [];

            // 2) Stock values on from_date (opening) and to_date (closing)
            //    Mirrors SpFinance.StockValueGetOnDate(...) calls in FillGrid()
            const stockConfig = getStockCalculationConfig(inventorySettings?.stockValueCalculation);

            const [openingStockRes, closingStockRes] = await Promise.all([
                axiosInstance.post(stockConfig.endpoint, {
                    date: filters.fromDate,
                    from_date: filters.fromDate,
                    branch_id: branchId ?? 1,
                    currency_id: currencyId
                }),
                axiosInstance.post(stockConfig.endpoint, {
                    date: filters.toDate,
                    from_date: filters.fromDate,
                    branch_id: branchId ?? 1,
                    currency_id: currencyId
                })
            ]);

            const openingStock = parseFloat(openingStockRes.data?.data?.[0]?.[stockConfig.valueKey] || 0);
            const closingStock = parseFloat(closingStockRes.data?.data?.[0]?.[stockConfig.valueKey] || 0);

            // 3) Profit & Loss analysis (Debit/Credit tables) — mirrors SpFinance.ProfitAndLossAnalysis(...)
            const plRes = await axiosInstance.post('profit-and-loss/analysis', {
                from_date: filters.fromDate,
                to_date: filters.toDate,
                branch_id: branchId ?? 1,
                currency_id: currencyId
            });
            const plData = plRes.data?.data || {};

            // Replicates the C# loop:
            // even table index (incl. 0) -> subtract Sum(Debit)
            // odd table index -> add Sum(Credit)
            const sumField = (arr, field) =>
                (arr || []).reduce((sum, item) => sum + parseFloat(item[field] || item.balance || 0), 0);

            let dcProfit = 0;
            dcProfit -= sumField(plData['Purchase'], 'debit');
            dcProfit += sumField(plData['Sales'], 'credit');
            dcProfit -= sumField(plData['Direct Expense'], 'debit');
            dcProfit += sumField(plData['Direct Income'], 'credit');
            dcProfit -= sumField(plData['Indirect Expense'], 'debit');
            dcProfit += sumField(plData['Indirect Income'], 'credit');

            // dcProfit = dcProfit + dcClosingStock - dcOpeninggStock;
            dcProfit = dcProfit + closingStock - openingStock;

            setReportData({
                fundFlowRows: extractedData,
                netProfitOrLoss: dcProfit,
                openingStock,
                closingStock
            });

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

    /* ────────────────── Process data (Normal: group+amount | Detailed: group -> ledgers) ────────────────── */

    const processedData = useMemo(() => {
        if (!reportData || !reportData.fundFlowRows) {
            return { sourcesData: [], applicationsData: [], totals: null };
        }

        const rawRows = reportData.fundFlowRows;
        const netProfitOrLoss = reportData.netProfitOrLoss || 0;

        let sources = [];
        let applications = [];

        if (isDetailed) {
            // Detailed shape: [{ groupId, groupName, ledgers: [{ ledgerId, ledgerName, balance }] }]
            rawRows.forEach((group) => {
                const ledgers = Array.isArray(group.ledgers) ? group.ledgers : [];
                const groupBalance = ledgers.reduce((sum, l) => sum + (parseFloat(l.balance) || 0), 0);

                if (groupBalance === 0 && ledgers.length === 0) return;

                const groupRow = {
                    isGroup: true,
                    groupId: group.groupId,
                    name: group.groupName,
                    amount: Math.abs(groupBalance),
                    ledgers: ledgers.map((l) => ({
                        isGroup: false,
                        groupId: group.groupId,
                        ledgerId: l.ledgerId,
                        name: l.ledgerName,
                        amount: Math.abs(parseFloat(l.balance) || 0)
                    }))
                };

                if (groupBalance > 0) {
                    sources.push(groupRow);
                } else if (groupBalance < 0) {
                    applications.push(groupRow);
                } else {
                    // zero-balance group: keep on sources side by default so it's visible
                    sources.push(groupRow);
                }
            });
        } else {
            // Normal shape: [{ id, name, balance }]
            rawRows.forEach((item) => {
                const balance = parseFloat(item.balance) || 0;
                const row = {
                    isGroup: true,
                    groupId: item.id,
                    name: item.name,
                    amount: Math.abs(balance),
                    ledgers: []
                };
                if (balance >= 0) {
                    sources.push(row);
                } else {
                    applications.push(row);
                }
            });
        }

        // ── Net Profit / Net Loss row, exactly like FillGrid():
        if (netProfitOrLoss > 0) {
            sources.push({ isGroup: true, groupId: 'net-profit', name: t('Net Profit'), amount: netProfitOrLoss, isProfitLossRow: true, ledgers: [] });
        } else if (netProfitOrLoss < 0) {
            applications.push({ isGroup: true, groupId: 'net-loss', name: t('Net Loss'), amount: Math.abs(netProfitOrLoss), isProfitLossRow: true, ledgers: [] });
        }

        // Assign SNo to top-level group rows only
        sources = sources.map((item, i) => ({ SNo: i + 1, ...item }));
        applications = applications.map((item, i) => ({ SNo: i + 1, ...item }));

        const totalSources = sources.reduce((sum, item) => sum + item.amount, 0);
        const totalApplications = applications.reduce((sum, item) => sum + item.amount, 0);

        return {
            sourcesData: sources,
            applicationsData: applications,
            totals: { totalSources, totalApplications }
        };
    }, [reportData, t, isDetailed]);

    /* ────────────────── Row expansion (detailed mode) ────────────────── */

    const toggleGroup = (side, groupId) => {
        const key = `${side}-${groupId}`;
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Build the flattened row list actually passed to ContentTable, inserting
    // ledger rows immediately after their expanded group row.
    const buildDisplayRows = (groupRows, side) => {
        const displayRows = [];
        groupRows.forEach((group) => {
            displayRows.push(group);
            const key = `${side}-${group.groupId}`;
            if (isDetailed && expandedGroups[key] && group.ledgers && group.ledgers.length > 0) {
                group.ledgers.forEach((ledger) => {
                    displayRows.push({ ...ledger, parentSNo: group.SNo });
                });
            }
        });
        return displayRows;
    };

    const sourcesDisplayRows = useMemo(
        () => buildDisplayRows(processedData.sourcesData, 'sources'),
        [processedData.sourcesData, expandedGroups, isDetailed]
    );

    const applicationsDisplayRows = useMemo(
        () => buildDisplayRows(processedData.applicationsData, 'applications'),
        [processedData.applicationsData, expandedGroups, isDetailed]
    );

    /* ────────────────── Export ────────────────── */

    const getExportOptions = () => {
        const formatNum = (num) => Number(num || 0).toFixed(decimalPart);
        const { sourcesData, applicationsData, totals } = processedData;

        const exportData = [];

        const pushGroupWithLedgers = (groupRows) => {
            groupRows.forEach((group, index) => {
                exportData.push({ SNo: index + 1, Particulars: group.name, Amount: formatNum(group.amount) });
                if (isDetailed && group.ledgers && group.ledgers.length > 0) {
                    group.ledgers.forEach((ledger) => {
                        exportData.push({ SNo: '', Particulars: `    ${ledger.name}`, Amount: formatNum(ledger.amount) });
                    });
                }
            });
        };

        exportData.push({ Particulars: t('SOURCES OF FUNDS'), Amount: '', isHeader: true });
        pushGroupWithLedgers(sourcesData);
        exportData.push({ SNo: '', Particulars: t('Total Sources'), Amount: formatNum(totals?.totalSources || 0), isTotal: true });
        exportData.push({ SNo: '', Particulars: '', Amount: '' });

        exportData.push({ Particulars: t('APPLICATION OF FUNDS'), Amount: '', isHeader: true });
        pushGroupWithLedgers(applicationsData);
        exportData.push({ SNo: '', Particulars: t('Total Applications'), Amount: formatNum(totals?.totalApplications || 0), isTotal: true });
        exportData.push({ SNo: '', Particulars: '', Amount: '' });

        const difference = (totals?.totalSources || 0) - (totals?.totalApplications || 0);
        exportData.push({ SNo: '', Particulars: t('Net Difference'), Amount: formatNum(difference), isTotal: true });

        let subtitle = isDetailed ? t('Detailed Report') : t('Normal Report');

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
        if (!processedData.totals) return;
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!processedData.totals) return;
        exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' });
    };

    const handleExportCsv = () => {
        if (!processedData.totals) return;
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

    const renderCell = (key, row, side) => {
        if (key === 'SNo') {
            return row.isGroup ? row.SNo : '';
        }
        if (key === 'name') {
            if (row.isGroup) {
                const hasLedgers = isDetailed && row.ledgers && row.ledgers.length > 0;
                const key2 = `${side}-${row.groupId}`;
                const isOpen = !!expandedGroups[key2];
                return (
                    <span
                        className={`flex items-center gap-1 ${hasLedgers ? 'cursor-pointer select-none' : ''} ${row.isProfitLossRow ? 'font-semibold' : 'font-medium'}`}
                        onClick={hasLedgers ? () => toggleGroup(side, row.groupId) : undefined}
                    >
                        {hasLedgers ? (
                            isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                        )}
                        {row.name}
                    </span>
                );
            }
            // ledger row (indented, no toggle)
            return <span className="pl-6 text-gray-600 dark:text-gray-400">{row.name}</span>;
        }
        if (key === 'amount') {
            return (
                <span className={row.isGroup ? '' : 'text-gray-600 dark:text-gray-400'}>
                    {formatNumber(row[key])}
                </span>
            );
        }
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
        setExpandedGroups({});
    };

    const resetFilters = () => {
        setFilters({
            fromDate: defaultDates.fromDate,
            toDate: defaultDates.toDate,
            currencyId: 1,
        });
        setReportData(null);
        setAlert(null);
        setExpandedGroups({});
    };

    const currencyOptions = currencyData.map(currency => ({
        label: currency.currencyName || currency.CurrencyName || currency.name,
        value: String(currency.currencyId || currency.CurrencyId || currency.id)
    }));

    const groupOptions = [];

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
                        {/* Sources / Asset side */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Sources of Funds')}
                                </span>
                            </div>
                            <ContentTable
                                columns={columns}
                                data={sourcesDisplayRows}
                                loading={loading}
                                renderCell={(key, row) => renderCell(key, row, 'sources')}
                                footerData={sourcesFooterData}
                                staticSearchable={true}
                                tableId={`fund-flow-${reportType}-sources`}
                                maxHeight='calc(100vh - 370px)'
                                rowClassName={(row) => row.isProfitLossRow ? 'text-green-600 dark:text-green-400 font-medium' : (!row.isGroup ? 'bg-gray-50 dark:bg-[#161616]' : '')}
                            />
                        </div>

                        {/* Applications / Liability side */}
                        <div>
                            <div className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-b-0 border-gray-200 dark:border-gray-700 rounded-t">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Application of Funds')}
                                </span>
                            </div>
                            <ContentTable
                                columns={columns}
                                data={applicationsDisplayRows}
                                loading={loading}
                                renderCell={(key, row) => renderCell(key, row, 'applications')}
                                footerData={applicationsFooterData}
                                staticSearchable={true}
                                tableId={`fund-flow-${reportType}-applications`}
                                maxHeight='calc(100vh - 370px)'
                                rowClassName={(row) => row.isProfitLossRow ? 'text-red-600 dark:text-red-400 font-medium' : (!row.isGroup ? 'bg-gray-50 dark:bg-[#161616]' : '')}
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