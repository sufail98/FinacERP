import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { useSelector } from 'react-redux';

const ProductQuotationHistoryModal = ({ open, handleClose, productCode, ledgerId }) => {
    const { t } = useTranslation();
    const { selectedBranchId } = useAuth();
    const { currentCurrency } = useSelector((state) => state.settings || {});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (!open || !productCode) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError('');
            setHistory([]);
            try {
                const res = await axiosInstance.post('product-movement', {
                    product_code: productCode,
                    branch_id: selectedBranchId,
                    currency_id: currentCurrency?.currencyId,
                    history_type: 'Sales',
                    ledger_id: ledgerId,
                    voucher_type: 'Sales Quotation'
                });

                const data = res?.data?.data || [];
                setHistory(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching product sales history:', err);
                setError(
                    t('salesQuotation.history.fetchError') ||
                    'Failed to fetch product sales history.'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [open, productCode, ledgerId, selectedBranchId, currentCurrency]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, handleClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="bg-primary dark:bg-primary rounded-md shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-themed dark:border-themed">
                    <h2 className="text-base font-semibold text-primary dark:text-primary">
                        {t('salesQuotation.history.title') || 'Product Sales Quotation History'}
                        {productCode ? (
                            <span className="ml-2 text-sm font-normal text-muted dark:text-muted">
                                ({productCode})
                            </span>
                        ) : null}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                        title={t('close') || 'Close'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto custom-scrollbar p-4">
                    {loading && (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="text-center text-sm text-red-600 dark:text-red-400 py-6">
                            {error}
                        </div>
                    )}

                    {!loading && !error && history.length === 0 && (
                        <div className="text-center text-sm text-muted dark:text-muted py-6">
                            {t('salesQuotation.history.noData') || 'No sales history found for this product.'}
                        </div>
                    )}

                    {!loading && !error && history.length > 0 && (
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-800 sticky top-0">
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.slNo') || 'SL No'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.date') || 'Date'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.billNo') || 'Bill No'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.time') || 'Time'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.customer') || 'Customer'}
                                    </th>
                                    <th className="p-2 text-right text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.qty') || 'Qty'}
                                    </th>
                                    <th className="p-2 text-right text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.rate') || 'Rate'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.unit') || 'Unit'}
                                    </th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                        {t('salesQuotation.history.type') || 'Type'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, idx) => (
                                    <tr
                                        key={item.SlNo ?? idx}
                                        className={`border-b border-themed dark:border-themed ${
                                            idx % 2 === 1
                                                ? 'bg-gray-100 dark:bg-gray-800'
                                                : 'bg-white dark:bg-gray-900'
                                        }`}
                                    >
                                        <td className="p-2 border border-themed dark:border-themed">{item.SlNo}</td>
                                        <td className="p-2 border border-themed dark:border-themed">{item.Date}</td>
                                        <td className="p-2 border border-themed dark:border-themed">{item.BillNo}</td>
                                        <td className="p-2 border border-themed dark:border-themed">{item.billTime}</td>
                                        <td className="p-2 border border-themed dark:border-themed">
                                            {item.CustomerName || item.ledger}
                                        </td>
                                        <td className="p-2 text-right border border-themed dark:border-themed">{item.Qty}</td>
                                        <td className="p-2 text-right border border-themed dark:border-themed">{item.Rate}</td>
                                        <td className="p-2 border border-themed dark:border-themed">{item.Unit}</td>
                                        <td className="p-2 border border-themed dark:border-themed">{item.Type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

ProductQuotationHistoryModal.propTypes = {
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    productCode: PropTypes.string,
    ledgerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

ProductQuotationHistoryModal.defaultProps = {
    productCode: null,
    ledgerId: null,
};

export default ProductQuotationHistoryModal;