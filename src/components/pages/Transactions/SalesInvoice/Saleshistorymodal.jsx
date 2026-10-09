import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Receipt, TrendingUp, Calendar, Hash, ExternalLink } from 'lucide-react';

const SalesHistoryModal = ({ open, onClose, salesHistory = [], customerName = '' }) => {

    const navigate = useNavigate();

    const handleRowDoubleClick = useCallback((salesMasterId) => {
        onClose();
        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${salesMasterId}`);
    }, [navigate, onClose]);

    const handleKeyDown = useCallback((e) => {
        if (e.altKey && e.key === 'F9') {
            e.preventDefault();
            onClose();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (open) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, handleKeyDown]);

    if (!open) return null;

    const formatAmount = (amount) =>
        parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const totalAmount = salesHistory.reduce((sum, row) => sum + parseFloat(row.TotalAmount || 0), 0);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#00000092] z-[99999]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999999] w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Sales History
                            </h2>
                            {customerName && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {customerName}
                                </p>
                            )}
                        </div>
                        {salesHistory.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                {salesHistory.length} records
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Close (Esc or Alt+F9)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Summary Bar */}
                {salesHistory.length > 0 && (
                    <div className="flex items-center gap-6 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/40 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="font-medium">Total Sales:</span>
                            <span className="font-bold">{formatAmount(totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                            <Hash className="w-3.5 h-3.5" />
                            <span className="font-medium">Invoices:</span>
                            <span className="font-bold">{salesHistory.length}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 opacity-70">
                            <ExternalLink className="w-3 h-3" />
                            <span>Double-click a row to open invoice</span>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-auto flex-1">
                    {salesHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 gap-3">
                            <Receipt className="w-10 h-10 opacity-30" />
                            <p className="text-sm font-medium">No sales history found</p>
                            <p className="text-xs">Select a customer to view their past invoices</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">#</th>
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> Invoice No
                                        </div>
                                    </th>
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Date
                                        </div>
                                    </th>
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Time</th>
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Customer</th>
                                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Bill Type</th>
                                    <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Taxable Amt</th>
                                    <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Tax Amt</th>
                                    <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Total Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesHistory.map((row, idx) => (
                                    <tr
                                        key={row.salesMasterId}
                                        onDoubleClick={() => handleRowDoubleClick(row.salesMasterId)}
                                        title="Double-click to open this invoice"
                                        className={`border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer
                                            hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-sm
                                            active:bg-blue-100 dark:active:bg-blue-900/30
                                            ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-800/40'}`}
                                    >
                                        <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {row.VoucherNo}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-blue-400 dark:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {formatDate(row.BillDate)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {row.billTime || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-[160px] truncate" title={row.CustomerName}>
                                            {row.CustomerName || row.LedgerName}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap
                                                ${row.BillType === 'Tax Invoice'
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                                    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                                }`}>
                                                {row.BillType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300 font-mono">
                                            {formatAmount(row.TaxableAmount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-red-500 dark:text-red-400 font-mono">
                                            {formatAmount(row.TaxAmount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100 font-mono">
                                            {formatAmount(row.TotalAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
                                    <td colSpan={6} className="px-4 py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300 text-xs">
                                        Total
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-gray-100 font-mono text-xs">
                                        {formatAmount(salesHistory.reduce((s, r) => s + parseFloat(r.TaxableAmount || 0), 0))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-red-500 dark:text-red-400 font-mono text-xs">
                                        {formatAmount(salesHistory.reduce((s, r) => s + parseFloat(r.TaxAmount || 0), 0))}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">
                                        {formatAmount(totalAmount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono text-[10px]">Alt+F9</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono text-[10px]">Esc</kbd> to close
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default SalesHistoryModal;