import React from 'react';
import { useSelector } from 'react-redux';

/**
 * BalanceSheetGrid – mirrors C# FillGrid() exactly.
 *
 * Props
 * ─────
 * data : {
 *   condensedGroups : [ { id, name, balance, type } ]   ← always present
 *   subLedgerMap    : { [groupId]: [ { Id, Name, Balance } ] }  ← detailed only
 *   stockValue      : number
 *   profitValue     : number   ← rawLiabilities - (rawAssets + stockValue)
 *                               positive = Net Profit, negative = Net Loss
 * }
 * reportType : 'condensed' | 'detailed'
 */
const BalanceSheetGrid = ({ data, reportType }) => {
    const { generalSettings } = useSelector(s => s.settings);
    const dp = generalSettings?.decimalPart ?? 2;
    const fmt = v => Number(v || 0).toFixed(dp);

    if (!data) return null;

    const { condensedGroups, subLedgerMap = {}, stockValue, profitValue } = data;
    const isDetailed = reportType === 'detailed';

    /* ── Split condensed groups by type ── */
    const assetGroups     = condensedGroups.filter(g => g.type === 'Asset');
    const liabilityGroups = condensedGroups.filter(g => g.type === 'Liability');

    /* ── Build display rows for one side ── */
    const buildSideRows = (groups) => {
        const rows = [];
        groups.forEach(group => {
            const groupBalance = parseFloat(group.balance || group.Balance || 0);

            if (isDetailed) {
                // Group header row – bold (C#: newFont)
                rows.push({ label: group.name || group.Name, amount: fmt(groupBalance), bold: true, indent: false });

                // Sub-ledger rows – indented (C#: "         " prefix)
                const subs = subLedgerMap[group.id] || subLedgerMap[group.Id] || [];
                subs.forEach(sub => {
                    const subBal = parseFloat(sub.Balance || sub.balance || 0);
                    rows.push({
                        label: sub.Name || sub.name,
                        amount: fmt(Math.abs(subBal)),
                        bold: false,
                        indent: true,
                    });
                });
            } else {
                // Condensed – just the group row (no sub-ledgers shown in condensed)
                rows.push({ label: group.name || group.Name, amount: fmt(groupBalance), bold: false, indent: false });
            }
        });
        return rows;
    };

    const liabilityRows = buildSideRows(liabilityGroups);
    const assetRows     = buildSideRows(assetGroups);

    /* ── Running totals (mirrors C# dcTotalAsset / dcTotalLiability) ── */
    let totalAssets      = assetGroups.reduce((s, g) => s + parseFloat(g.balance || g.Balance || 0), 0);
    let totalLiabilities = liabilityGroups.reduce((s, g) => s + parseFloat(g.balance || g.Balance || 0), 0);

    /* ── Closing Stock ──
     * C#: dcTotalAsset += dcClosingStock  (adds to asset total regardless of sign)
     */
    const stock = parseFloat(stockValue || 0);
    const closingStockAsset     = stock > 0 ? stock : 0;
    const closingStockLiability = stock < 0 ? Math.abs(stock) : 0;
    totalAssets += stock;

    /* ── Profit / Loss ──
     * profitValue = rawLiabilities - (rawAssets + stockValue)  — computed in parent
     *   > 0  → Net Profit  → Liability side (green)   C#: dcTotalLiability += dcProfit
     *   < 0  → Net Loss    → Asset side     (red)     C#: dcTotalAsset += |dcProfit|
     *   ≈ 0  → balanced, show nothing
     */
  /* ── Profit / Loss ──
 * profitValue = rawLiabilities - (rawAssets + stockValue)
 *   > 0  → Net Profit → Liability side (green)
 *   < 0  → Net Loss   → Asset side (red)
 * After adding profit/loss, both sides should balance — NO difference row needed.
 */
let netProfitLiability = 0;
let netLossAsset       = 0;
const profit = parseFloat(profitValue || 0);

if (profit > 0.001) {
    // Assets > Liabilities = Net Profit → show on Liability side to balance
    netProfitLiability = profit;
    totalLiabilities  += profit;
} else if (profit < -0.001) {
    // Liabilities > Assets = Net Loss → show on Asset side to balance
    netLossAsset  = Math.abs(profit);
    totalAssets  += netLossAsset;
}

/* ── Difference row (safety net only — should normally be 0) ── */
let diffAsset     = 0;
let diffLiability = 0;
const gap = totalAssets - totalLiabilities;
if (Math.abs(gap) > 0.01) {          // raised threshold to ignore float noise
    if (gap > 0) {
        diffLiability    = gap;
        totalLiabilities += diffLiability;
    } else {
        diffAsset   = Math.abs(gap);
        totalAssets += diffAsset;
    }
}



    const grandTotal = totalAssets; // both sides are now equal

    /* ── Cell renderer ── */
    const Cell = ({ row }) => {
        if (!row) return <div className="p-2">&nbsp;</div>;
        return (
            <div className="p-2 flex justify-between items-center gap-2">
                <span className={`${row.bold ? 'font-bold' : ''} ${row.indent ? 'pl-6 text-sm text-gray-600' : ''} truncate`}>
                    {row.label}
                </span>
                <span className={`shrink-0 tabular-nums ${row.bold ? 'font-bold' : ''}`}>
                    {row.amount}
                </span>
            </div>
        );
    };

    const maxLen = Math.max(liabilityRows.length, assetRows.length);

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 border border-gray-300 divide-x divide-gray-300">

                {/* Column headers */}
                <div className="bg-gray-100 border-b border-gray-300 p-2 font-bold text-center text-sm">
                    Liability
                </div>
                <div className="bg-gray-100 border-b border-gray-300 p-2 font-bold text-center text-sm">
                    Asset
                </div>

                {/* Main group + sub-ledger rows */}
                {Array.from({ length: maxLen }).map((_, i) => {
                    const l = liabilityRows[i];
                    const a = assetRows[i];
                    return (
                        <React.Fragment key={i}>
                            <div className={`border-b border-gray-200 ${l?.bold && isDetailed ? 'bg-gray-50' : ''}`}>
                                <Cell row={l} />
                            </div>
                            <div className={`border-b border-gray-200 ${a?.bold && isDetailed ? 'bg-gray-50' : ''}`}>
                                <Cell row={a} />
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* ── Closing Stock – asset side ── */}
                {closingStockAsset > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                        <div className="border-b border-gray-200 p-2 flex justify-between font-bold bg-gray-50">
                            <span>Closing Stock</span>
                            <span className="tabular-nums">{fmt(closingStockAsset)}</span>
                        </div>
                    </>
                )}

                {/* ── Closing Stock – liability side ── */}
                {closingStockLiability > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2 flex justify-between font-bold bg-gray-50">
                            <span>Closing Stock</span>
                            <span className="tabular-nums">{fmt(closingStockLiability)}</span>
                        </div>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                    </>
                )}

                {/* ── Net Profit – liability side (green) ── */}
                {netProfitLiability > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2 flex justify-between bg-green-50">
                            <span className="font-bold text-green-700">Net Profit</span>
                            <span className="font-bold text-green-600 tabular-nums">{fmt(netProfitLiability)}</span>
                        </div>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                    </>
                )}

                {/* ── Net Loss – asset side (red) ── */}
                {netLossAsset > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                        <div className="border-b border-gray-200 p-2 flex justify-between bg-red-50">
                            <span className="font-bold text-red-700">Net Loss</span>
                            <span className="font-bold text-red-600 tabular-nums">{fmt(netLossAsset)}</span>
                        </div>
                    </>
                )}

                {/* ── Difference – liability side ── */}
                {diffLiability > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2 flex justify-between bg-red-50">
                            <span className="font-bold text-red-700">Difference</span>
                            <span className="font-bold text-red-600 tabular-nums">{fmt(diffLiability)}</span>
                        </div>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                    </>
                )}

                {/* ── Difference – asset side ── */}
                {diffAsset > 0 && (
                    <>
                        <div className="border-b border-gray-200 p-2">&nbsp;</div>
                        <div className="border-b border-gray-200 p-2 flex justify-between bg-red-50">
                            <span className="font-bold text-red-700">Difference</span>
                            <span className="font-bold text-red-600 tabular-nums">{fmt(diffAsset)}</span>
                        </div>
                    </>
                )}

                {/* ── Separator ── */}
                <div className="border-b border-gray-200 p-1 text-center text-gray-300 text-xs tracking-widest">
                    ______________________
                </div>
                <div className="border-b border-gray-200 p-1 text-center text-gray-300 text-xs tracking-widest">
                    ______________________
                </div>

                {/* ── Grand Total ── */}
                <div className="p-2 flex justify-between font-bold bg-gray-100">
                    <span>Total</span>
                    <span className="tabular-nums">{fmt(grandTotal)}</span>
                </div>
                <div className="p-2 flex justify-between font-bold bg-gray-100">
                    <span>Total</span>
                    <span className="tabular-nums">{fmt(grandTotal)}</span>
                </div>

            </div>
        </div>
    );
};

export default BalanceSheetGrid;