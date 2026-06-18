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
        { key: 'InvoiceNo', label: t('purchaseDayReport.grid.columns.invoiceNo'), align: 'center' },
        { key: 'VendorInvoiceNo', label: t('purchaseDayReport.grid.columns.vendorInvoiceNo'), align: 'center' },
        { key: 'Supplier', label: t('purchaseDayReport.grid.columns.supplier'), align: 'left' },
        { key: 'TotalAmount', label: t('purchaseDayReport.grid.columns.totalAmount'), align: 'right' },
        { key: 'TaxAmount', label: t('purchaseDayReport.grid.columns.taxAmount'), align: 'right' },
        { key: 'NetAmount', label: t('purchaseDayReport.grid.columns.netAmount'), align: 'right' },
        { key: 'CashAmount', label: t('purchaseDayReport.grid.columns.cashAmount'), align: 'right' },
        { key: 'BankAmount', label: t('purchaseDayReport.grid.columns.bankAmount'), align: 'right' },
        { key: 'CreditAmount', label: t('purchaseDayReport.grid.columns.creditAmount'), align: 'right' },
        { key: 'CreatedBy', label: t('purchaseDayReport.grid.columns.createdBy'), align: 'center' }
    ];

    // Get cell value with fallbacks for different API response formats
    const getCellValue = (row, colKey) => {
        switch (colKey) {
            case 'SNo':
                return row.SNo || row.sNo || row.SlNo || row.slNo;
            case 'Date':
                return row.Date || row.date || row.PurchaseDate || row.purchaseDate || row.InvoiceDate || '-';
            case 'InvoiceNo':
                return row.InvoiceNo || row.invoiceNo || row.VoucherNo || row.voucherNo || row.PurchaseNo || '-';
            case 'VendorInvoiceNo':
                return row.VendorInvoiceNo || row.vendorInvoiceNo || row.SupplierInvoiceNo || '-';
            case 'Supplier':
                return row.Supplier || row.supplier || row.Party || row.party || row.SupplierName || row.supplierName || row.LedgerName || '-';
            case 'TotalAmount':
                return formatAmount(row.TotalAmount || row.totalAmount || row.Amount || row.amount);
            case 'TaxAmount':
                return formatAmount(row.TaxAmount || row.taxAmount || row.TotalTax || row.totalTax);
            case 'NetAmount':
                return formatAmount(row.NetAmount || row.netAmount || row.BillAmount || row.billAmount);
            case 'CashAmount':
                return formatAmount(row.CashAmount || row.cashAmount);
            case 'BankAmount':
                return formatAmount(row.BankAmount || row.bankAmount);
            case 'CreditAmount':
                return formatAmount(row.CreditAmount || row.creditAmount);
            case 'CreatedBy':
                return row.CreatedBy || row.createdBy || row.DoneBy || row.doneBy || row.UserName || '-';
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
                                <td className="px-2 py-2 text-right text-orange-600">
                                    {formatAmount(totals.taxAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-green-600">
                                    {formatAmount(totals.netAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-blue-600">
                                    {formatAmount(totals.cashAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-purple-600">
                                    {formatAmount(totals.bankAmount)}
                                </td>
                                <td className="px-2 py-2 text-right text-red-600">
                                    {formatAmount(totals.creditAmount)}
                                </td>
                                <td></td>
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
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.records')}:
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {totals.count}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.totalTax')}:
                            </span>
                            <span className="font-semibold text-orange-600">
                                {formatAmount(totals.taxAmount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.cash')}:
                            </span>
                            <span className="font-semibold text-blue-600">
                                {formatAmount(totals.cashAmount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.bank')}:
                            </span>
                            <span className="font-semibold text-purple-600">
                                {formatAmount(totals.bankAmount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.credit')}:
                            </span>
                            <span className="font-semibold text-red-600">
                                {formatAmount(totals.creditAmount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('purchaseDayReport.grid.summary.grandTotal')}:
                            </span>
                            <span className="font-semibold text-green-600">
                                {formatAmount(totals.netAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseDayReportGrid;