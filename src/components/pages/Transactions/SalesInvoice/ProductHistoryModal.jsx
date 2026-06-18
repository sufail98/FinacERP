import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { useSelector } from 'react-redux';

const ProductHistoryModal = ({ isOpen, onClose, productCode, productName }) => {
    const { t } = useTranslation();
    const { selectedBranchId, currentCurrency } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart ?? 2;

    const [productHistory, setProductHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (isOpen && productCode) {
            fetchProductHistory();
        }
    }, [isOpen, productCode]);

    const fetchProductHistory = async () => {
        if (!productCode) {
            setProductHistory([]);
            return;
        }

        try {
            setHistoryLoading(true);

            const res = await axiosInstance.post('history/purchase', {
                productCode: productCode,
                branchId: selectedBranchId,
                currencyId: currentCurrency.currencyId,
                ledgerId: null // Pass null as requested
            });

            if (res.data?.status && res.data?.data) {
                const historyData = res.data.data.slice(0, 50); // Get up to 50 records
                setProductHistory(historyData);
            } else {
                setProductHistory([]);
            }

        } catch (error) {
            console.error('❌ Error fetching product history:', error);
            setProductHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#00000074] flex items-center justify-center z-[999999999999] p-4">
            <div className="bg-primary dark:bg-primary rounded-lg border border-themed dark:border-themed shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-themed dark:border-themed bg-secondary dark:bg-secondary">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-primary dark:text-primary">
                            {t("salesInvoice.form.productPurchaseHistoryModal.title") || "Product Purchase History"}
                        </h2>
                        <p className="text-sm text-secondary dark:text-secondary mt-1">
                            {productName && `Product: ${productName}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {historyLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        </div>
                    ) : productHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-secondary dark:bg-secondary sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[50px]">
                                            {t("salesInvoice.form.footerSection.productHistory.slNo") || "Sl"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[100px]">
                                            {t("salesInvoice.form.footerSection.productHistory.date") || "Date"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[80px]">
                                            {t("salesInvoice.form.footerSection.productHistory.time") || "Time"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[100px]">
                                            {t("salesInvoice.form.footerSection.productHistory.billNo") || "Bill No"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[150px]">
                                            {t("salesInvoice.form.footerSection.productHistory.supplier") || "Customer"}
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-secondary dark:text-secondary border-b border-themed min-w-[80px]">
                                            {t("salesInvoice.form.footerSection.productHistory.qty") || "Qty"}
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-secondary dark:text-secondary border-b border-themed min-w-[80px]">
                                            {t("salesInvoice.form.footerSection.productHistory.unit") || "Unit"}
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-secondary dark:text-secondary border-b border-themed min-w-[100px]">
                                            {t("salesInvoice.form.footerSection.productHistory.rate") || "Rate"}
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-secondary dark:text-secondary border-b border-themed min-w-[100px]">
                                            {t("salesInvoice.form.productPurchaseHistoryModal.amount") || "Amount"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productHistory.map((item, index) => (
                                        <tr
                                            key={index}
                                            className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${
                                                index % 2 === 0
                                                    ? 'bg-primary dark:bg-primary'
                                                    : 'bg-secondary dark:bg-secondary'
                                            }`}
                                        >
                                            <td className="px-3 py-2 text-primary dark:text-primary">
                                                {item.SlNo}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary">
                                                {item.Date}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary">
                                                {item.billTime || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary font-medium">
                                                {item.BillNo}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary truncate max-w-[150px]" title={item.CustomerName}>
                                                {item.CustomerName}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary text-right">
                                                {Number(item.Qty).toFixed(decimalPart)}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary">
                                                {item.Unit}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary text-right">
                                                {Number(item.Rate).toFixed(decimalPart)}
                                            </td>
                                            <td className="px-3 py-2 text-primary dark:text-primary text-right font-medium">
                                                {Number(item.Amount || (item.Qty * item.Rate)).toFixed(decimalPart)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-muted dark:text-muted">
                                {t("salesInvoice.form.productHistoryModal.noData") || "No sales history found for this product"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-4 py-3 border-t border-themed dark:border-themed bg-secondary dark:bg-secondary">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 main-bg dark:bg-blue-700 text-white rounded-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                        {t("closeBtn") || "Close"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductHistoryModal;
