// src/components/pages/Reports/AgeingReport/AgeingReportGrid.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

const AgeingReportGrid = ({ 
    data, 
    loading, 
    totals, 
    reportType,
    partyType,
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

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    // Calculate row total
    const getRowTotal = (row) => {
        return (
            parseFloat(row['1to30'] || 0) +
            parseFloat(row['31to60'] || 0) +
            parseFloat(row['61to90'] || 0) +
            parseFloat(row['91to120'] || 0) +
            parseFloat(row['120above'] || 0)
        );
    };

    // Loading State
    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">{t('Loading report data...')}</p>
                </div>
            </div>
        );
    }

    // Empty State
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('No Ageing Data Found')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('Select filters and click "Show" to view ageing data.')}
                </p>
            </div>
        );
    }

    // Voucher Wise Columns
    const voucherColumns = [
        { key: 'slNo', label: t('Sl NO'), align: 'center', width: 'w-16' },
        { key: 'accountLedger', label: t('Account Ledger'), align: 'left', width: 'min-w-[150px]' },
        { key: 'date', label: t('Date'), align: 'center', width: 'w-28' },
        { key: 'voucherType', label: t('Voucher Type'), align: 'left', width: 'w-32' },
        { key: 'voucherNo', label: t('Voucher No'), align: 'left', width: 'w-28' },
        { key: 'refNo', label: t('Ref No'), align: 'left', width: 'w-28' },
        { key: 'billAmount', label: t('Bill Amount'), align: 'right', width: 'w-28', isAmount: true },
        { key: '1to30', label: t('1 to 30'), align: 'right', width: 'w-24', isAmount: true, color: 'text-green-600' },
        { key: '31to60', label: t('31 to 60'), align: 'right', width: 'w-24', isAmount: true, color: 'text-blue-600' },
        { key: '61to90', label: t('61 to 90'), align: 'right', width: 'w-24', isAmount: true, color: 'text-yellow-600' },
        { key: '91to120', label: t('91 to 120'), align: 'right', width: 'w-24', isAmount: true, color: 'text-orange-600' },
        { key: '120above', label: t('120 above'), align: 'right', width: 'w-24', isAmount: true, color: 'text-red-600' },
        { key: 'narration', label: t('Narration'), align: 'left', width: 'min-w-[150px]' },
    ];

    // Ledger Wise Columns
    const ledgerColumns = [
        { key: 'slNo', label: t('Sl NO'), align: 'center', width: 'w-16' },
        { key: 'accountLedger', label: t('Account Ledger'), align: 'left', width: 'min-w-[200px]' },
        { key: 'lastPaymentDate', label: t('Last Payment Date'), align: 'center', width: 'w-36' },
        { key: '1to30', label: t('1 to 30'), align: 'right', width: 'w-28', isAmount: true, color: 'text-green-600' },
        { key: '31to60', label: t('31 to 60'), align: 'right', width: 'w-28', isAmount: true, color: 'text-blue-600' },
        { key: '61to90', label: t('61 to 90'), align: 'right', width: 'w-28', isAmount: true, color: 'text-yellow-600' },
        { key: '91to120', label: t('91 to 120'), align: 'right', width: 'w-28', isAmount: true, color: 'text-orange-600' },
        { key: '120above', label: t('120 above'), align: 'right', width: 'w-28', isAmount: true, color: 'text-red-600' },
        { key: 'totalAmt', label: t('Total Amt'), align: 'right', width: 'w-32', isAmount: true, color: 'text-purple-600 font-bold' },
    ];

    // Select columns based on report type
    const columns = reportType === 'voucher' ? voucherColumns : ledgerColumns;

    // Get cell value based on column key
    const getCellValue = (row, colKey, index) => {
        switch (colKey) {
            case 'slNo':
                return row['SlNO'] || index + 1;
            case 'accountLedger':
                return row['Account Ledger'] || row['AccountLedger'] || '-';
            case 'date':
                return formatDate(row['Date'] || row['date']);
            case 'voucherType':
                return row['Voucher Type'] || row['voucherType'] || '-';
            case 'voucherNo':
                return row['Voucher No'] || row['voucherNo'] || '-';
            case 'refNo':
                return row['Ref No'] || row['refNo'] || '-';
            case 'billAmount':
                return formatAmount(row['Bill Amount'] || row['BillAmount'] || 0);
            case '1to30':
                return formatAmount(row['1to30'] || 0);
            case '31to60':
                return formatAmount(row['31to60'] || 0);
            case '61to90':
                return formatAmount(row['61to90'] || 0);
            case '91to120':
                return formatAmount(row['91to120'] || 0);
            case '120above':
                return formatAmount(row['120above'] || 0);
            case 'lastPaymentDate':
                return formatDate(row['LastRcptPaymentDate'] || row['LastPaymentDate'] || row['lastPaymentDate']);
            case 'totalAmt':
                return formatAmount(row['TotalAmt'] || row['totalAmt'] || getRowTotal(row));
            case 'narration':
                return row['Narration'] || row['narration'] || '-';
            default:
                return '-';
        }
    };

    return (
        <div className="space-y-4">
            {/* Data Table - Removed Report Type Indicator section */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                {columns.map((col) => (
                                    <th 
                                        key={col.key}
                                        className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider ${col.width} ${
                                            col.align === 'right' ? 'text-right' : 
                                            col.align === 'center' ? 'text-center' : 'text-left'
                                        } ${col.color || 'text-gray-600 dark:text-gray-300'}`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.map((row, index) => (
                                <tr 
                                    key={row.ledgerId || row.masterId || index} 
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {columns.map((col) => (
                                        <td 
                                            key={col.key}
                                            className={`px-3 py-2.5 text-sm ${
                                                col.align === 'right' ? 'text-right' : 
                                                col.align === 'center' ? 'text-center' : 'text-left'
                                            } ${col.isAmount ? (col.color || 'text-gray-900 dark:text-white') : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {getCellValue(row, col.key, index)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        {/* Footer Totals */}
                        {totals && (
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                                    {columns.map((col, colIndex) => {
                                        if (colIndex === 0) {
                                            return (
                                                <td 
                                                    key={col.key}
                                                    colSpan={reportType === 'voucher' ? 6 : 3}
                                                    className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 font-bold"
                                                >
                                                    {t('Total')}
                                                </td>
                                            );
                                        }
                                        
                                        // Skip cells that are merged
                                        if (reportType === 'voucher' && colIndex >= 1 && colIndex <= 5) return null;
                                        if (reportType === 'ledger' && colIndex >= 1 && colIndex <= 2) return null;

                                        // Render total values
                                        let value = '';
                                        switch (col.key) {
                                            case 'billAmount':
                                                value = formatAmount(totals.billAmount);
                                                break;
                                            case '1to30':
                                                value = formatAmount(totals.days1to30);
                                                break;
                                            case '31to60':
                                                value = formatAmount(totals.days31to60);
                                                break;
                                            case '61to90':
                                                value = formatAmount(totals.days61to90);
                                                break;
                                            case '91to120':
                                                value = formatAmount(totals.days91to120);
                                                break;
                                            case '120above':
                                                value = formatAmount(totals.above120);
                                                break;
                                            case 'totalAmt':
                                                value = formatAmount(totals.total);
                                                break;
                                            default:
                                                value = '';
                                        }

                                        return (
                                            <td 
                                                key={col.key}
                                                className={`px-3 py-3 text-sm font-bold ${
                                                    col.align === 'right' ? 'text-right' : 
                                                    col.align === 'center' ? 'text-center' : 'text-left'
                                                } ${col.color || 'text-gray-900 dark:text-white'}`}
                                            >
                                                {value}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                
                {/* Removed Record Count footer section */}
            </div>
        </div>
    );
};

export default AgeingReportGrid;