// src/components/pages/Reports/PurchaseDayReport/PurchaseDayReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

const PurchaseDayReportGrid = ({ 
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
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('purchaseDayReport.grid.loading')}
                    </p>
                </div>
            </div>
        );
    }

    // Empty State
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-8 text-center">
                <FileText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('purchaseDayReport.grid.noDataTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('purchaseDayReport.grid.noDataSubtitle')}
                </p>
            </div>
        );
    }

    // Column definitions
    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'Date', label: t('purchaseDayReport.grid.columns.date'), align: 'center' },
        { key: 'TotalAmount', label: t('purchaseDayReport.grid.columns.totalAmount'), align: 'right' },
    ];

    // Get cell value with fallbacks for different API response formats
    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SNo':
                return row.SNo || row.sNo || row.SlNo || row.slNo;
            case 'Date':
                return row.Date || row.date || row.PurchaseDate || row.purchaseDate || row.InvoiceDate || '-';
        
            case 'TotalAmount':
                return formatAmount(row.TotalAmount || row.totalAmount || row.Amount || row.amount);
         
            default:
                return row[colKey] ?? '-';
        }
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
                                    className={`px-2 py-2 font-semibold uppercase tracking-wider whitespace-nowrap ${
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
                                key={`${row.purchaseMasterId || row.PurchaseMasterId || row.id || index}-${row.SNo || index}`} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td 
                                        key={col.key}
                                        className={`px-2 py-1.5 whitespace-nowrap ${
                                            col.align === 'right' ? 'text-right' : 
                                            col.align === 'center' ? 'text-center' : 'text-left'
                                        } text-gray-700 dark:text-gray-300`}
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
                                <td colSpan={5} className="px-2 py-2 text-gray-700 dark:text-gray-300">
                                    {t('purchaseDayReport.grid.total')} ({totals.count} {t('purchaseDayReport.grid.records')})
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.totalAmount)}
                                </td>
                              
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
          
        </div>
    );
};

export default PurchaseDayReportGrid;