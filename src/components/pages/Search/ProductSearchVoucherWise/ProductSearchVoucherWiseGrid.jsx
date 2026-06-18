// src/components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWiseGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

const ProductSearchVoucherWiseGrid = ({ 
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

    const formatQty = (qty) => {
        const num = parseFloat(qty) || 0;
        return num.toFixed(3);
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('productSearchVoucherWise.grid.loading')}</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Search className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productSearchVoucherWise.grid.noDataTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('productSearchVoucherWise.grid.noDataSubtitle')}
                </p>
            </div>
        );
    }

    // Columns - will be adjusted after seeing API response
    const columns = [
        { key: 'SlNo', label: '#', align: 'center' },
        { key: 'Date', label: t('productSearchVoucherWise.grid.columns.date'), align: 'center' },
        { key: 'VoucherType', label: t('productSearchVoucherWise.grid.columns.voucherType'), align: 'center' },
        { key: 'VoucherNo', label: t('productSearchVoucherWise.grid.columns.voucherNo'), align: 'center' },
        { key: 'ProductCode', label: t('productSearchVoucherWise.grid.columns.productCode'), align: 'center' },
        { key: 'ProductName', label: t('productSearchVoucherWise.grid.columns.productName'), align: 'left' },
        { key: 'Party', label: t('productSearchVoucherWise.grid.columns.party'), align: 'left' },
        { key: 'Qty', label: t('productSearchVoucherWise.grid.columns.qty'), align: 'right' },
        { key: 'Rate', label: t('productSearchVoucherWise.grid.columns.rate'), align: 'right' },
        { key: 'Amount', label: t('productSearchVoucherWise.grid.columns.amount'), align: 'right' }
    ];

    const getCellValue = (row, colKey, index) => {
        switch (colKey) {
            case 'SlNo':
                return row['SlNo'] || row['Sl NO'] || row['slno'] || index + 1;
            case 'Date':
                return row['Date'] || row['date'] || row['VoucherDate'] || '-';
            case 'VoucherType':
                return row['VoucherType'] || row['Voucher Type'] || row['voucherType'] || '-';
            case 'VoucherNo':
                return row['VoucherNo'] || row['Voucher No'] || row['BillNo'] || row['voucherNo'] || '-';
            case 'ProductCode':
                return row['ProductCode'] || row['productCode'] || row['Code'] || '-';
            case 'ProductName':
                return row['ProductName'] || row['productName'] || row['Item'] || '-';
            case 'Party':
                return row['Party'] || row['CustomerName'] || row['SupplierName'] || row['LedgerName'] || row['party'] || '-';
            case 'Qty':
                return formatQty(row['Qty'] || row['qty']);
            case 'Rate':
                return formatAmount(row['Rate'] || row['rate']);
            case 'Amount':
                return formatAmount(row['Amount'] || row['amount'] || row['TotalAmount']);
            default:
                return row[colKey] ?? '-';
        }
    };

    // Get voucher type badge color
    const getVoucherTypeBadge = (type) => {
        const typeColors = {
            'Sales Invoice': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'Sales Return': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'Purchase Invoice': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            'Purchase Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            'Delivery Note': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            'Sales Order': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
            'Purchase Order': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
            'Material Receipt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        };
        return typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
                                key={`${row['VoucherNo'] || row['MasterId'] || index}-${index}`} 
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
                                        {col.key === 'VoucherType' ? (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getVoucherTypeBadge(getCellValue(row, col.key, index))}`}>
                                                {getCellValue(row, col.key, index)}
                                            </span>
                                        ) : (
                                            getCellValue(row, col.key, index)
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>

                    {totals && (
                        <tfoot>
                            <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t border-gray-300 dark:border-gray-600">
                                <td colSpan={7} className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                                    {t('productSearchVoucherWise.grid.total')} ({totals.count} {t('productSearchVoucherWise.grid.records')})
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
                            <span className="text-gray-500 dark:text-gray-400">{t('productSearchVoucherWise.grid.summary.records')}:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{totals.count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('productSearchVoucherWise.grid.summary.totalQty')}:</span>
                            <span className="font-semibold text-blue-600">{formatQty(totals.totalQty)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">{t('productSearchVoucherWise.grid.summary.totalAmount')}:</span>
                            <span className="font-semibold text-green-600">{formatAmount(totals.totalAmount)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductSearchVoucherWiseGrid;