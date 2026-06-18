import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

const SalesQuotationReportGrid = ({ 
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

    const formatQuantity = (qty) => {
        const num = parseFloat(qty) || 0;
        return num.toFixed(3);
    };

    // Loading State
    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('salesQuotationReport.grid.loading')}</p>
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
                    {t('salesQuotationReport.grid.noDataTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('salesQuotationReport.grid.noDataSubtitle')}
                </p>
            </div>
        );
    }

    // Column definitions
    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'quotationNo', label: t('salesQuotationReport.grid.columns.quotationNo'), align: 'center' },
        { key: 'date', label: t('salesQuotationReport.grid.columns.date'), align: 'center' },
        { key: 'customerName', label: t('salesQuotationReport.grid.columns.customer'), align: 'left' },
        { key: 'productName', label: t('salesQuotationReport.grid.columns.product'), align: 'left' },
        { key: 'unitName', label: t('salesQuotationReport.grid.columns.unit'), align: 'center' },
        { key: 'qty', label: t('salesQuotationReport.grid.columns.qty'), align: 'right' },
        { key: 'rate', label: t('salesQuotationReport.grid.columns.rate'), align: 'right' },
        { key: 'grossAmount', label: t('salesQuotationReport.grid.columns.grossAmount'), align: 'right' },
        { key: 'BillDiscount', label: t('salesQuotationReport.grid.columns.discount'), align: 'right' },
        { key: 'taxableAmt', label: t('salesQuotationReport.grid.columns.taxableAmount'), align: 'right' },
        { key: 'taxAmount', label: t('salesQuotationReport.grid.columns.taxAmount'), align: 'right' },
        { key: 'amount', label: t('salesQuotationReport.grid.columns.amount'), align: 'right' }
    ];

    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SNo':
                return row.SNo || row.sNo || row.SlNo;
            case 'quotationNo':
                return row.quotationNo || row.QuotationNo || row.voucherNo || '-';
            case 'date':
                return row.date || row.Date || row.quotationDate || row.QuotationDate || '-';
            case 'customerName':
                return row.customerName || row.CustomerName || row.ledgerName || row.Party || '-';
            case 'productName':
                return row.productName || row.ProductName || '-';
            case 'unitName':
                return row.unitName || row.UnitName || row.unit || '-';
            case 'qty':
                return formatQuantity(row.qty || row.Qty || row.quantity);
            case 'rate':
                return formatAmount(row.rate || row.Rate);
            case 'grossAmount':
                return formatAmount(row.grossAmount || row.GrossAmount);
            case 'BillDiscount':
                return formatAmount(row.BillDiscount || 0);
            case 'taxableAmt':
                return formatAmount(row.taxableAmt || row.TaxableAmt);
            case 'taxAmount':
                return formatAmount(row.taxAmount || row.TaxAmount);
            case 'amount':
                return formatAmount(row.amount || row.Amount || row.totalAmount);
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
                                key={`${row.quotationMasterId || row.QuotationMasterId || row.id || index}-${row.SNo || index}`} 
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
                                <td colSpan={6} className="px-2 py-2 text-gray-700 dark:text-gray-300">
                                    {t('salesQuotationReport.grid.total')} ({totals.count} {t('salesQuotationReport.grid.records')})
                                </td>
                                <td className="px-2 py-2 text-right text-blue-600">
                                    {totals.quantity}
                                </td>
                                <td className="px-2 py-2 text-right">-</td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.grossAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-red-600">
                                    {formatAmount(totals.discountAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.taxableAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-orange-600">
                                    {formatAmount(totals.taxAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-green-600">
                                    {formatAmount(totals.totalAmount)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {/* Summary Cards */}
            {totals && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-4 justify-end text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesQuotationReport.grid.summary.records')}:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{totals.count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesQuotationReport.grid.summary.totalQty')}:</span>
                            <span className="font-semibold text-blue-600">{totals.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesQuotationReport.grid.summary.totalDiscount')}:</span>
                            <span className="font-semibold text-red-600">{formatAmount(totals.discountAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesQuotationReport.grid.summary.totalTax')}:</span>
                            <span className="font-semibold text-orange-600">{formatAmount(totals.taxAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('salesQuotationReport.grid.summary.grandTotal')}:</span>
                            <span className="font-semibold text-green-600">{formatAmount(totals.totalAmount)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesQuotationReportGrid;
