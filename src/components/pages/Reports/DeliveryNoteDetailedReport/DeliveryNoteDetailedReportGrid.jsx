// src/components/pages/Reports/DeliveryNoteDetailedReport/DeliveryNoteDetailedReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';

const DeliveryNoteDetailedReportGrid = ({ 
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

    const getStatusBadge = (billPending) => {
        if (billPending) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {t('Pending')}
                </span>
            );
        } else {
            return (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {t('Billed')}
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
                <Truck className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('No Delivery Note Data Found')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Select filters and click "Show" to view data.')}
                </p>
            </div>
        );
    }

    // ✅ Columns based on actual API response
    const columns = [
        { key: 'SlNo', label: '#', align: 'center' },
        { key: 'deliveryNoteNo', label: t('DN No'), align: 'center' },
        { key: 'date', label: t('Date'), align: 'center' },
        { key: 'customerName', label: t('Customer'), align: 'left' },
        { key: 'productName', label: t('Product'), align: 'left' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left' },
        { key: 'UnitName', label: t('Unit'), align: 'center' },
        { key: 'qty', label: t('Qty'), align: 'right' },
        { key: 'rate', label: t('Rate'), align: 'right' },
        { key: 'grossAmount', label: t('Gross'), align: 'right' },
        { key: 'taxableAmt', label: t('Taxable'), align: 'right' },
        { key: 'taxAmount', label: t('Tax'), align: 'right' },
        { key: 'amount', label: t('Total'), align: 'right' },
        { key: 'BillPending', label: t('Status'), align: 'center' }
    ];

    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SlNo':
                return row.SlNo;
            case 'deliveryNoteNo':
                return row.deliveryNoteNo || '-';
            case 'date':
                return row.date || '-';
            case 'customerName':
                return row.customerName || row.ledgerName || '-';
            case 'productName':
                return row.productName || '-';
            case 'CostCentre':
                return row.CostCentre || '-';
            case 'UnitName':
                return row.UnitName || '-';
            case 'qty':
                return formatQuantity(row.qty);
            case 'rate':
                return formatAmount(row.rate);
            case 'grossAmount':
                return formatAmount(row.grossAmount);
            case 'taxableAmt':
                return formatAmount(row.taxableAmt);
            case 'taxAmount':
                return formatAmount(row.taxAmount);
            case 'amount':
                return formatAmount(row.amount);
            case 'BillPending':
                return getStatusBadge(row.BillPending);
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
                                key={`${row.deliveryNoteMasterId}-${row.SlNo}-${index}`} 
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

export default DeliveryNoteDetailedReportGrid;