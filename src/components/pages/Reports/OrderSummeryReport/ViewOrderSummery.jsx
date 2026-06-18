import BreadCrumb from '@/components/common/BreadCrumb';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import { PackageCheck, ReceiptText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

const ViewOrderSummery = () => {
    const { orderMasterId } = useParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    const fetchOrderData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`get-sales-order-byId/${orderMasterId}`);
            if (res.data.status === 200 && !res.data.error) {
                setOrderData(res.data.data);
            }
        } catch (error) {
            setError(error.message || 'Failed to fetch order data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderMasterId) fetchOrderData();
    }, [orderMasterId]);

    const navigate = useNavigate()

    const handleConvertToManufacturing = () => {
        navigate('/transaction/manufacturing-journal', {
            state: {
                orderMasterId: orderMasterId,
                fromOrderSummary: true,
                orderDetails: orderData.orderDetails, // pass ALL rows
            }
        });
    };

    if (loading) return (
        <>
            <BreadCrumb
                routes={[
                    { title: t('orderSummeryReport.breadcrumb.master'), url: '#' },
                    { title: t('orderSummeryReport.breadcrumb.title'), url: '/transactions/order-summery-report' },
                    { title: t('orderSummeryReport.breadcrumb.veiwtitle'), url: '#' },
                ]}
                heading={{ icon: ReceiptText, title: t('orderSummeryReport.breadcrumb.veiwtitle') }}
            />
            <Preloader />
        </>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-sm text-red-500">Error: {error}</div>
        </div>
    );

    if (!orderData) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-sm text-gray-500">No order data found</div>
        </div>
    );

    return (
        <div className="space-y-4">
            <BreadCrumb
                routes={[
                    { title: t('orderSummeryReport.breadcrumb.master'), url: '#' },
                    { title: t('orderSummeryReport.breadcrumb.veiwtitle'), url: '#' },
                ]}
                heading={{ icon: ReceiptText, title: t('orderSummeryReport.breadcrumb.veiwtitle') }}
                actions={[
                    {
                        label: t('orderSummeryReport.table.convert') || 'Convert to Manufacturing',
                        seeLabel: true,
                        icon: PackageCheck,  // import from lucide-react
                        type: 'primary',
                        onClick: handleConvertToManufacturing,
                    }
                ]}
            />

            {/* ── Order Header ──────────────────────────────────────────── */}
            <div className="w-full bg-primary dark:bg-primary border border-themed dark:border-themed rounded-md p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                    {[
                        { label: t('orderSummeryReport.header.orderNo'), value: orderData.orderNo },
                        { label: t('orderSummeryReport.header.voucher'), value: orderData.voucherNo },
                        { label: t('orderSummeryReport.header.date'), value: orderData.date },
                        { label: t('orderSummeryReport.header.lpoNo'), value: orderData.LPONO },
                        { label: t('orderSummeryReport.header.customer'), value: orderData.partyName },
                        { label: t('orderSummeryReport.header.employee'), value: orderData.employeeName },
                    ].map(({ label, value, highlight }) => (
                        <div key={label} className="flex gap-2 items-center text-sm">
                            <span className="text-muted dark:text-muted whitespace-nowrap">{label}:</span>
                            <span className={`font-medium ${highlight ? 'text-red-700 dark:text-red-400' : 'text-primary dark:text-primary'}`}>
                                {value}
                            </span>
                        </div>
                    ))}
                    <div className="flex gap-2 items-center text-sm">
                        <span className="text-muted dark:text-muted">{t('orderSummeryReport.header.status')}:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orderData.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {orderData.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Order Details Table ───────────────────────────────────── */}
            <div className="w-full bg-primary dark:bg-primary">

                {/* Fixed header */}
                <div className="w-full overflow-hidden">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed w-[40px]">
                                    {t('orderSummeryReport.table.sno')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[90px]">
                                    {t('orderSummeryReport.table.code')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed">
                                    {t('orderSummeryReport.table.product')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[130px]">
                                    {t('orderSummeryReport.table.productAr')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[150px]">
                                    {t('orderSummeryReport.table.description')}
                                </th>
                                <th className="p-1 text-right text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                    {t('orderSummeryReport.table.qty')}
                                </th>
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                    {t('orderSummeryReport.table.unit')}
                                </th>

                            </tr>
                        </thead>
                    </table>
                </div>

                {/* Scrollable body */}
                <div className="w-full max-h-[340px] overflow-auto custom-scrollbar">
                    {orderData.orderDetails && orderData.orderDetails.length > 0 ? (
                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[90px]" />
                                <col />
                                <col className="w-[130px]" />
                                <col className="w-[150px]" />
                                <col className="w-[80px]" />
                                <col className="w-[70px]" />
                            </colgroup>
                            <tbody>
                                {orderData.orderDetails.map((item, index) => (
                                    <tr
                                        key={item.orderDetails1Id}
                                        className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${index % 2 === 0
                                                ? 'bg-gray-100 dark:bg-gray-800'
                                                : 'bg-white dark:bg-gray-900'
                                            }`}
                                    >
                                        <td className="p-0.5 border border-themed dark:border-themed text-center">
                                            <span className="text-sm font-medium text-primary dark:text-primary">
                                                {item.SlNo || index + 1}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <span className="text-xs text-muted dark:text-muted px-1 block truncate" title={item.productCode}>
                                                {item.productCode || '-'}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <span className="text-sm text-primary dark:text-primary px-1">
                                                {item.productname || '-'}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <span className="text-sm text-secondary dark:text-secondary px-1">
                                                {item.productNameArb || '-'}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <span className="text-xs text-muted dark:text-muted px-1 block truncate" title={item.productDescription}>
                                                {item.productDescription || '-'}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <span className="text-sm font-medium block text-right px-2 text-primary dark:text-primary">
                                                {parseFloat(item.qty || 0).toFixed(3)}
                                            </span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed text-center">
                                            <span className="text-xs text-secondary dark:text-secondary">
                                                {item.UnitName || '-'}
                                            </span>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-20 text-muted dark:text-muted border border-dashed border-themed dark:border-themed rounded-md m-2">
                            <p className="text-sm">{t('orderSummeryReport.table.noData')}</p>
                        </div>
                    )}
                </div>

                {/* Grand Total */}
                <div className="flex justify-end border-t-2 border-themed dark:border-themed pt-1 mt-1 pr-1">
                    <div className="flex items-center gap-3 text-sm font-semibold text-primary dark:text-primary">
                        <span>{t('orderSummeryReport.table.grandTotal')}:</span>
                        <span className="text-red-700 dark:text-red-400 min-w-[100px] text-right">
                            {parseFloat(orderData.totalAmount || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewOrderSummery;