// src/components/pages/Reports/PurchaseOrderReport/PurchaseOrderReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';

const PurchaseOrderReportGrid = ({ 
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

    const getStatusBadge = (pendingstatus) => {
        const isPending = pendingstatus === true || pendingstatus === 'true';
        
        if (isPending) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {t('Pending')}
                </span>
            );
        } else {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {t('Completed')}
                </span>
            );
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Loading...')}</p>
                </div>
            </div>
        );
    }

    // Empty State
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-8 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('No Purchase Order Data Found')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Select filters and click "Show" to view data.')}
                </p>
            </div>
        );
    }

    const columns = [
        { key: 'rowno', label: '#', align: 'center' },
        { key: 'orderno', label: t('Order'), align: 'center' },
        { key: 'orderdate', label: t('Date'), align: 'center' },
        { key: 'ledgername', label: t('Supplier'), align: 'left' },
        { key: 'productname', label: t('Product'), align: 'left' },
        { key: 'costcentre', label: t('Cost Centre'), align: 'left' },
        { key: 'unitname', label: t('Unit'), align: 'center' },
        { key: 'qty', label: t('Qty'), align: 'right' },
        { key: 'rate', label: t('Rate'), align: 'right' },
        { key: 'grossamount', label: t('Gross'), align: 'right' },
        { key: 'taxableamt', label: t('Taxable'), align: 'right' },
        { key: 'taxamount', label: t('Tax'), align: 'right' },
        { key: 'roundoff', label: t('R.Off'), align: 'right' },
        { key: 'amount', label: t('Total'), align: 'right' },
        { key: 'pendingstatus', label: t('Status'), align: 'center' }
    ];

    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'rowno':
                return row.rowno || row.SNo;
            case 'orderno':
                return row.orderno || '-';
            case 'orderdate':
                return row.orderdate || '-';
            case 'ledgername':
                return row.ledgername || '-';
            case 'productname':
                return row.productname || '-';
            case 'costcentre':
                return row.costcentre || '-';
            case 'unitname':
                return row.unitname || '-';
            case 'qty':
                return formatQuantity(row.qty);
            case 'rate':
                return formatAmount(row.rate);
            case 'grossamount':
                return formatAmount(row.grossamount);
            case 'taxableamt':
                return formatAmount(row.taxableamt);
            case 'taxamount':
                return formatAmount(row.taxamount);
            case 'roundoff':
                return formatAmount(row.roundoff);
            case 'amount':
                return formatAmount(row.amount);
            case 'pendingstatus':
                return getStatusBadge(row.pendingstatus);
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
                                key={`${row.ordermasterid}-${row.rowno}-${index}`} 
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
                                <td colSpan={7} className="px-2 py-2 text-gray-700 dark:text-gray-300">
                                    {t('Total')}
                                </td>
                                <td className="px-2 py-2 text-right text-blue-600">
                                    {totals.quantity}
                                </td>
                                <td className="px-2 py-2 text-right">-</td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.grossAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.taxableAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-orange-600">
                                    {formatAmount(totals.taxAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                                    {formatAmount(totals.roundoff)}
                                </td>
                                <td className="px-2 py-2 text-right text-green-600">
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

export default PurchaseOrderReportGrid;