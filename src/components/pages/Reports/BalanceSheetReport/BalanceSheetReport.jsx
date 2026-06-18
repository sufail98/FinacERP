import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Scale } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import BalanceSheetFilters from './BalanceSheetFilter';
import BalanceSheetGrid from './BalanceSheetGrid';
import useReportExport from '@/hooks/useReportExport';

const BalanceSheetReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    const { generalSettings } = useSelector(state => state.settings);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Balance Sheet");

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const getDefaultDate = () => new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        toDate: getDefaultDate(),
        reportType: 'condensed'
    });

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const branchId = parseInt(selectedBranchId) || 1;
            const currencyId = parseInt(currentCurrency?.currencyId) || 1;
            const baseBody = { branchId, currencyId };

            let condensedGroups = null;   // group-level rows for both modes
            let detailedFlat = null;      // flat ledger list (detailed mode only)
            let subLedgerMap = {};        // groupId -> { assets: [], liabilities: [] }

            // ── STEP 1: always fetch condensed groups (used for totals + sub-ledger keys) ──
            const condensedRes = await axiosInstance.post('balance-sheet', {
                ...baseBody,
                toDate: filters.toDate,
            });
            condensedGroups = condensedRes.data.data || [];

            // ── STEP 2: if detailed, fetch the flat ledger list ──
            if (filters.reportType === 'detailed') {

                const assetGroups = condensedGroups.filter(g => g.type === 'Asset');
                const liabilityGroups = condensedGroups.filter(g => g.type === 'Liability');

                // Fetch sub-ledgers for each group in parallel
                const fetchSubLedgers = async (groupId, isAsset) => {
                    try {
                        const res = await axiosInstance.post('balance-sheet/detailed', {
                            toDate: filters.toDate,
                            branchId,
                            currencyId,
                            group_id: groupId,
                            is_asset: isAsset,
                        });
                        return res.data.data || [];
                    } catch {
                        return [];
                    }
                };

                const [assetResults, liabilityResults] = await Promise.all([
                    Promise.all(assetGroups.map(g => fetchSubLedgers(g.id, true).then(rows => ({ groupId: g.id, rows })))),
                    Promise.all(liabilityGroups.map(g => fetchSubLedgers(g.id, false).then(rows => ({ groupId: g.id, rows })))),
                ]);

                assetResults.forEach(({ groupId, rows }) => {
                    subLedgerMap[groupId] = rows;
                });
                liabilityResults.forEach(({ groupId, rows }) => {
                    subLedgerMap[groupId] = rows;
                });
            }

            // ── STEP 3: Closing Stock ──
            const stockRes = await axiosInstance.post(
                'calculation-method/balance-sheet-stock-opening-value-fifo',
                {
                    date: filters.toDate,
                    from_date: filters.toDate,
                    branch_id: branchId,
                    currency_id: currencyId,
                }
            );
            const stockValue = parseFloat(stockRes.data.data?.[0]?.Value || 0);

            // ── STEP 4: Profit / Loss ──
            const rawAssets = condensedGroups
                .filter(g => g.type === 'Asset')
                .reduce((s, g) => s + parseFloat(g.balance || 0), 0);
            const rawLiabilities = condensedGroups
                .filter(g => g.type === 'Liability')
                .reduce((s, g) => s + parseFloat(g.balance || 0), 0);

            // totalAssets after closing stock = rawAssets + stockValue  (C#: dcTotalAsset += dcClosingStock)
            const profitValue = (rawAssets + stockValue) - rawLiabilities;

            setReportData({
                condensedGroups,   // always present
                subLedgerMap,      // populated only in detailed mode
                stockValue,
                profitValue,       // number — never null, always calculated
            });

            if (!condensedGroups.length) {
                setAlert({ id: Date.now(), type: 'info', message: t('No data found for the selected filters') });
            }
        } catch (error) {
            console.error('❌ Balance Sheet Error:', error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasAccess && !privilegeLoading) {
            fetchReport();
        }
    }, [filters.reportType, hasAccess, privilegeLoading]);

    /* ── Export ── */
    const calculateTotals = useMemo(() => {
        if (!reportData) return null;
        const { condensedGroups, stockValue } = reportData;
        const decimalPart = generalSettings?.decimalPart || 2;

        const assets = condensedGroups.filter(g => g.type === 'Asset');
        const liabilities = condensedGroups.filter(g => g.type === 'Liability');

        const totalAssets = assets.reduce((s, i) => s + parseFloat(i.balance || 0), 0);
        const totalLiabilities = liabilities.reduce((s, i) => s + parseFloat(i.balance || 0), 0);

        const stock = parseFloat(stockValue || 0);
        const assetStock = stock > 0 ? stock : 0;
        const liabilityStock = stock < 0 ? Math.abs(stock) : 0;

        const finalAssets = totalAssets + (stock > 0 ? stock : stock);
        const finalLiabilities = totalLiabilities;

        const diff = finalAssets - finalLiabilities;
        const assetDifference = diff < 0 ? Math.abs(diff) : 0;
        const liabilityDifference = diff > 0 ? diff : 0;

        const grandTotal = Math.max(finalAssets + assetDifference, finalLiabilities + liabilityDifference);

        return { assets, liabilities, totalAssets, totalLiabilities, stockValue: stock, assetStock, liabilityStock, assetDifference, liabilityDifference, grandTotal };
    }, [reportData, generalSettings]);

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const fmt = (n) => Number(n || 0).toFixed(decimalPart);
        const totals = calculateTotals;
        const exportData = [];

        exportData.push({ Particulars: 'BALANCE SHEET', Liability: '', Asset: '', isHeader: true });
        exportData.push({ Particulars: '', Liability: '', Asset: '' });

        // ── CONDENSED MODE ──
        if (filters.reportType === 'condensed') {
            const maxLen = Math.max(totals.liabilities.length, totals.assets.length);
            for (let i = 0; i < maxLen; i++) {
                const l = totals.liabilities[i];
                const a = totals.assets[i];
                exportData.push({
                    Particulars: l ? (l.name || l.Name || l.group_name || l.GroupName || '') : '',
                    Liability: l ? fmt(l.balance || l.Balance) : '',
                    AssetName: a ? (a.name || a.Name || a.group_name || a.GroupName || '') : '',
                    Asset: a ? fmt(a.balance || a.Balance) : '',
                });
            }
        }
        // ── DETAILED MODE ──
        else if (filters.reportType === 'detailed') {
            const { subLedgerMap } = reportData;

            // Helper to resolve sub-ledger name from any possible API field
            const resolveSubName = (sub) =>
                sub.ledger_name ||
                sub.LedgerName ||
                sub.subledger_name ||
                sub.SubledgerName ||
                sub.account_name ||
                sub.AccountName ||
                sub.name ||
                sub.Name ||
                sub.label ||
                sub.Label ||
                '';

            // Helper to resolve group name from any possible API field
            const resolveGroupName = (group) =>
                group.name ||
                group.Name ||
                group.group_name ||
                group.GroupName ||
                '';

            // Build detailed liability rows
            const liabilityRows = [];
            totals.liabilities.forEach(group => {
                const groupName = resolveGroupName(group);
                liabilityRows.push({
                    name: groupName,
                    amount: fmt(group.balance || group.Balance || 0),
                    isGroup: true
                });
                const subLedgers = subLedgerMap[group.id] || [];
                subLedgers.forEach(sub => {
                    liabilityRows.push({
                        name: `  ${resolveSubName(sub)}`,
                        amount: fmt(sub.balance || sub.Balance || 0),
                        isSubLedger: true
                    });
                });
                liabilityRows.push({
                    name: `Total ${groupName}`,
                    amount: fmt(group.balance || group.Balance || 0),
                    isGroupTotal: true
                });
            });

            // Build detailed asset rows
            const assetRows = [];
            totals.assets.forEach(group => {
                const groupName = resolveGroupName(group);
                assetRows.push({
                    name: groupName,
                    amount: fmt(group.balance || group.Balance || 0),
                    isGroup: true
                });
                const subLedgers = subLedgerMap[group.id] || [];
                subLedgers.forEach(sub => {
                    assetRows.push({
                        name: `  ${resolveSubName(sub)}`,
                        amount: fmt(sub.balance || sub.Balance || 0),
                        isSubLedger: true
                    });
                });
                assetRows.push({
                    name: `Total ${groupName}`,
                    amount: fmt(group.balance || group.Balance || 0),
                    isGroupTotal: true
                });
            });

            // Merge liability and asset rows side by side
            const maxDetailLen = Math.max(liabilityRows.length, assetRows.length);
            for (let i = 0; i < maxDetailLen; i++) {
                const l = liabilityRows[i];
                const a = assetRows[i];
                exportData.push({
                    Particulars: l ? l.name : '',
                    Liability: l ? l.amount : '',
                    AssetName: a ? a.name : '',
                    Asset: a ? a.amount : '',
                    isGroup: l?.isGroup || a?.isGroup,
                    isSubLedger: l?.isSubLedger || a?.isSubLedger,
                    isGroupTotal: l?.isGroupTotal || a?.isGroupTotal,
                });
            }
        }

        // ── CLOSING STOCK ──
        if (totals.assetStock > 0) {
            exportData.push({
                Particulars: '',
                Liability: '',
                AssetName: 'Closing Stock',
                Asset: fmt(totals.assetStock),
                isStock: true
            });
        } else if (totals.liabilityStock > 0) {
            exportData.push({
                Particulars: 'Closing Stock',
                Liability: fmt(totals.liabilityStock),
                AssetName: '',
                Asset: '',
                isStock: true
            });
        }

        // ── PROFIT / LOSS ──
        if (totals.liabilityDifference > 0) {
            exportData.push({
                Particulars: 'Net Profit',
                Liability: fmt(totals.liabilityDifference),
                AssetName: '',
                Asset: '',
                isProfit: true
            });
        } else if (totals.assetDifference > 0) {
            exportData.push({
                Particulars: '',
                Liability: '',
                AssetName: 'Net Loss',
                Asset: fmt(totals.assetDifference),
                isLoss: true
            });
        }

        // ── GRAND TOTAL ──
        exportData.push({
            Particulars: 'Total',
            Liability: fmt(totals.grandTotal),
            AssetName: 'Total',
            Asset: fmt(totals.grandTotal),
            isTotal: true
        });

        return {
            fileName: `Balance_Sheet_${filters.reportType}_${filters.toDate}`,
            sheetName: 'Balance Sheet',
            title: t('Balance Sheet'),
            subtitle: filters.reportType === 'detailed' ? t('Detailed Report') : t('Condensed Report'),
            reportInfo: {
                title: t('Balance Sheet'),
                subtitle: filters.reportType === 'detailed' ? t('Detailed Report') : t('Condensed Report'),
                toDate: filters.toDate
            },
            fromDate: filters.toDate,
            toDate: filters.toDate,
            data: exportData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            reportType: filters.reportType,
            columns: [
                { key: 'Particulars', label: t('Liability'), align: 'left', width: 30 },
                { key: 'Liability', label: t('Amount'), align: 'right', width: 15, type: 'currency' },
                { key: 'AssetName', label: t('Asset'), align: 'left', width: 30 },
                { key: 'Asset', label: t('Amount'), align: 'right', width: 15, type: 'currency' },
            ],
        };
    };

    const handleExportExcel = () => { if (reportData && calculateTotals) exportGenericToExcel(getExportOptions()); };
    const handleExportPdf = () => { if (reportData && calculateTotals) exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' }); };
    const handleExportCsv = () => { if (reportData && calculateTotals) exportGenericToCsv(getExportOptions()); };

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
    const resetFilters = () => { setFilters({ toDate: getDefaultDate(), reportType: 'condensed' }); setReportData(null); setAlert(null); };

    if (privilegeLoading) return (
        <div>
            <BreadCrumb routes={[{ title: t('Reports'), url: '#' }, { title: t('Balance Sheet'), url: '#' }]} heading={{ icon: Scale, title: t('Balance Sheet') }} />
            <Preloader />
        </div>
    );

    if (!hasAccess) return (
        <div>
            <BreadCrumb routes={[{ title: t('Reports'), url: '#' }, { title: t('Balance Sheet'), url: '#' }]} heading={{ icon: Scale, title: t('Balance Sheet') }} />
            <NoAcessComponent message={message} />
        </div>
    );

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: t('Reports'), url: '#' }, { title: t('Balance Sheet'), url: '#' }]}
                heading={{ icon: Scale, title: t('Balance Sheet') }}
                exportConfig={reportData ? { onExportExcel: handleExportExcel, onExportPdf: handleExportPdf, onExportCsv: handleExportCsv, label: t('Export Report') } : null}
            />

            <div className="px-1">
                <BalanceSheetFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    loading={loading}
                    hasReportData={!!reportData}
                    resetFilters={resetFilters}
                />

                {reportData && (
                    <BalanceSheetGrid
                        data={reportData}
                        reportType={filters.reportType}
                    />
                )}
            </div>
        </div>
    );
};

export default BalanceSheetReport;