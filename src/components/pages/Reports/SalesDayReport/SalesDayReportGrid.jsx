// src/components/pages/Reports/SalesDayReport/SalesDayReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

const SalesDayReportGrid = ({ 
    data, 
    loading, 
    totals, 
    decimalPart = 2
}) => {
    const { t } = useTranslation();

    const formatAmount = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPart,
            maximumFractionDigits: decimalPart
        }).format(num);
    };

    // Loading State
    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('salesDayReport.grid.loading')}</p>
                </div>
            </div>
        );
    }

    // Empty State
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-8 text-center">
                <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('salesDayReport.grid.noDataTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('salesDayReport.grid.noDataSubtitle')}
                </p>
            </div>
        );
    }

    // Column definitions - matching actual API response
    const columns = [
        { key: 'SLNo', label: '#', align: 'center' },
        { key: 'Date', label: t('salesDayReport.grid.columns.date'), align: 'center' },
        { key: 'TotalAmount', label: t('salesDayReport.grid.columns.totalAmount'), align: 'right' },
        { key: 'TotalCost', label: t('salesDayReport.grid.columns.totalCost'), align: 'right' },
        { key: 'TotalTax', label: t('salesDayReport.grid.columns.totalTax'), align: 'right' },
        { key: 'TotalProfit', label: t('salesDayReport.grid.columns.totalProfit'), align: 'right' }
    ];

    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SLNo':
                return row.SLNo || row.SNo || row.slNo || row.sNo;
            case 'Date':
                return row.Date || row.date || '-';
            case 'TotalAmount':
                return formatAmount(row.TotalAmount || row.totalAmount);
            case 'TotalCost':
                return formatAmount(row.TotalCost || row.totalCost);
            case 'TotalTax':
                return formatAmount(row.TotalTax || row.totalTax);
            case 'TotalProfit':
                return formatAmount(row.TotalProfit || row.totalProfit);
            default:
                return row[colKey] ?? '-';
        }
    };

    // Get profit color based on value
    const getProfitColor = (value) => {
        const num = parseFloat(value) || 0;
        if (num > 0) return 'text-green-600';
        if (num < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            {columns.map((col) => (
                                <th 
                                    key={col.key}
                                    className={`px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap ${
                                        col.align === 'right' ? 'text-right' : 
                                        col.align === 'center' ? 'text-center' : 'text-left'
                                    } text-gray-600 dark:text-gray-300`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map((row, index) => (
                            <tr 
                                key={`${row.SLNo || index}-${row.Date}`} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td 
                                        key={col.key}
                                        className={`px-3 py-2 whitespace-nowrap ${
                                            col.align === 'right' ? 'text-right' : 
                                            col.align === 'center' ? 'text-center' : 'text-left'
                                        } ${col.key === 'TotalProfit' ? getProfitColor(row.TotalProfit || row.totalProfit) : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                        {getCellValue(row, col.key)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>

                    {/* Footer Totals */}
                    {totals && (
                        <tfoot>
                            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t border-gray-300 dark:border-gray-600">
                                <td colSpan={2} className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                                    {t('salesDayReport.grid.total')} ({totals.count} {t('salesDayReport.grid.records')})
                                </td>
                                <td className="px-3 py-2.5 text-right text-blue-600">
                                    {formatAmount(totals.totalAmount)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.totalCost)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-orange-600">
                                    {formatAmount(totals.totalTax)}
                                </td>
                                <td className={`px-3 py-2.5 text-right ${parseFloat(totals.totalProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatAmount(totals.totalProfit)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {/* Summary Cards */}
            {totals && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-6 justify-end text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesDayReport.grid.summary.days')}:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{totals.count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesDayReport.grid.summary.totalSales')}:</span>
                            <span className="font-semibold text-blue-600">{formatAmount(totals.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesDayReport.grid.summary.totalCost')}:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatAmount(totals.totalCost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesDayReport.grid.summary.totalTax')}:</span>
                            <span className="font-semibold text-orange-600">{formatAmount(totals.totalTax)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesDayReport.grid.summary.totalProfit')}:</span>
                            <span className={`font-semibold ${parseFloat(totals.totalProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatAmount(totals.totalProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesDayReportGrid;