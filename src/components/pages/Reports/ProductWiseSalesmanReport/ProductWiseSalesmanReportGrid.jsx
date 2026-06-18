// src/components/pages/Reports/ProductWiseSalesmanReport/ProductWiseSalesmanReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

const ProductWiseSalesmanReportGrid = ({ 
    data, 
    loading, 
    totals, 
    decimalPart = 2,
    mode = 'Detailed'
}) => {
    const { t } = useTranslation();

    const formatAmount = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPart,
            maximumFractionDigits: decimalPart
        }).format(num);
    };

    const formatQty = (qty) => {
        const num = parseFloat(qty) || 0;
        return num.toFixed(3);
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('productWiseSalesmanReport.grid.loading')}</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Users className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productWiseSalesmanReport.grid.noDataTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('productWiseSalesmanReport.grid.noDataSubtitle')}
                </p>
            </div>
        );
    }

    // Columns based on actual API response
    const columns = [
        { key: 'SlNO', label: '#', align: 'center' },
        { key: 'Date', label: t('productWiseSalesmanReport.grid.columns.date'), align: 'center' },
        { key: 'BillNo', label: t('productWiseSalesmanReport.grid.columns.billNo'), align: 'center' },
        { key: 'ProductCode', label: t('productWiseSalesmanReport.grid.columns.productCode'), align: 'center' },
        { key: 'ProductName', label: t('productWiseSalesmanReport.grid.columns.productName'), align: 'left' },
        { key: 'CustomerName', label: t('productWiseSalesmanReport.grid.columns.customer'), align: 'left' },
        { key: 'Salesman', label: t('productWiseSalesmanReport.grid.columns.salesman'), align: 'left' },
        { key: 'Qty', label: t('productWiseSalesmanReport.grid.columns.qty'), align: 'right' },
        { key: 'Rate', label: t('productWiseSalesmanReport.grid.columns.rate'), align: 'right' },
        { key: 'Amount', label: t('productWiseSalesmanReport.grid.columns.amount'), align: 'right' }
    ];

    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SlNO':
                return row['SlNO'] || row['SlNo'] || '-';
            case 'Date':
                return row['Date'] || '-';
            case 'BillNo':
                return row['BillNo'] || '-';
            case 'ProductCode':
                return row['ProductCode'] || '-';
            case 'ProductName':
                return row['ProductName'] || '-';
            case 'CustomerName':
                return row['CustomerName'] || '-';
            case 'Salesman':
                return row['Salesman'] || '-';
            case 'Qty':
                return formatQty(row['Qty']);
            case 'Rate':
                return formatAmount(row['Rate']);
            case 'Amount':
                // Use TotalAmountDetailed for detailed mode, TotalAmount for summary
                return formatAmount(row['TotalAmountDetailed'] || row['TotalAmount'] || 0);
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
                                key={`${row['MasterId'] || index}-${row['SlNO'] || index}`} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td 
                                        key={col.key}
                                        className={`px-3 py-2 whitespace-nowrap ${
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

                    {totals && (
                        <tfoot>
                            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t border-gray-300 dark:border-gray-600">
                                <td colSpan={7} className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                                    {t('productWiseSalesmanReport.grid.total')} ({totals.count} {t('productWiseSalesmanReport.grid.records')})
                                </td>
                                <td className="px-3 py-2.5 text-right text-blue-600">
                                    {formatQty(totals.totalQty)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-500">-</td>
                                <td className="px-3 py-2.5 text-right text-green-600">
                                    {formatAmount(totals.totalAmount)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {totals && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-6 justify-end text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('productWiseSalesmanReport.grid.summary.records')}:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{totals.count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('productWiseSalesmanReport.grid.summary.totalQty')}:</span>
                            <span className="font-semibold text-blue-600">{formatQty(totals.totalQty)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('productWiseSalesmanReport.grid.summary.totalAmount')}:</span>
                            <span className="font-semibold text-green-600">{formatAmount(totals.totalAmount)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductWiseSalesmanReportGrid;