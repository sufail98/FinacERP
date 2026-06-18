import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import { Search, RefreshCcw, X, Eye, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';

const DateFilterSection = ({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    onFilter,
    onReset,
    loading = false,
    totalRecords = 0,
    showTotalRecords = true,
    filterButtonText,
    resetButtonText,
    fromDateLabel,
    toDateLabel,
    className = '',
    // Voucher code props
    showVoucherCode = false,
    voucherCode = '',
    onVoucherCodeChange,
    onClearVoucherCode,
    voucherCodePlaceholder,
    voucherCodeLabel,
    disableDates = false,
    // Customer search props (client-side)
    staticSearchable = false,
    customerSearch = '',
    onCustomerSearchChange,
    onClearCustomerSearch,
    customerSearchPlaceholder,
    customerSearchLabel,
}) => {
    const { t } = useTranslation();
    const { currentFinancialYear } = useAuth();
    const { financeSettings } = useSelector((state) => state.settings);

    // Determine if dates should be restricted based on financial year
    const shouldRestrictDates = financeSettings?.ShowAllTransactions === false;
    const minDateFromFinance = shouldRestrictDates && currentFinancialYear?.fromDate 
        ? currentFinancialYear.fromDate.split(' ')[0] 
        : null;
    const maxDateFromFinance = shouldRestrictDates && currentFinancialYear?.toDate 
        ? currentFinancialYear.toDate.split(' ')[0] 
        : null;

    return (
        <div className={`flex flex-wrap items-end gap-4 mb-4 ${className}`}>
            {/* Voucher Code Search - Auto search on type */}
            {showVoucherCode && (
                <>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {voucherCodeLabel || t("common.search") || "Search"}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={voucherCode}
                                onChange={onVoucherCodeChange}
                                placeholder={voucherCodePlaceholder || "Enter to search..."}
                                className="block w-48 pl-9 pr-8 py-[2px] border border-gray-300 dark:border-gray-600 rounded-xs 
                                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                         placeholder-gray-400 dark:placeholder-gray-500
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                         text-xs"
                            />
                            {voucherCode && (
                                <button
                                    onClick={onClearVoucherCode}
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    type="button"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        {loading && voucherCode && (
                            <span className="text-[10px] text-blue-500 mt-0.5">
                                {t("common.searching") || "Searching..."}
                            </span>
                        )}
                    </div>

                    {/* OR Divider */}
                    <div className="flex items-center pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                            {t("common.or") || "OR"}
                        </span>
                    </div>
                </>
            )}

            {/* Customer Name Search - Client-side filtering */}
            {staticSearchable && (
                <>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {customerSearchLabel || t("common.customerName") || "Customer Name"}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={onCustomerSearchChange}
                                placeholder={customerSearchPlaceholder || "Search customer..."}
                                className="block w-48 pl-9 pr-8 py-[2px] border border-gray-300 dark:border-gray-600 rounded-xs 
                                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                         placeholder-gray-400 dark:placeholder-gray-500
                                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                                         text-xs"
                            />
                            {customerSearch && (
                                <button
                                    onClick={onClearCustomerSearch}
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    type="button"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                    </div>

                    {/* OR Divider */}
                    <div className="flex items-center pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                            {t("common.or") || "OR"}
                        </span>
                    </div>
                </>
            )}

            {/* Date Inputs - Disabled when voucher code has value */}
            <div className={`flex flex-col transition-opacity ${disableDates ? 'opacity-50 pointer-events-none' : ''}`}>
                <DateInput
                    id="fromDate"
                    name="fromDate"
                    label={fromDateLabel || t("common.fromDate") || "From Date"}
                    value={fromDate}
                    onChange={onFromDateChange}
                    disabled={disableDates}
                    min={minDateFromFinance}
                    max={maxDateFromFinance}
                />
            </div>

            <div className={`flex flex-col transition-opacity ${disableDates ? 'opacity-50 pointer-events-none' : ''}`}>
                <DateInput
                    id="toDate"
                    name="toDate"
                    label={toDateLabel || t("common.toDate") || "To Date"}
                    value={toDate}
                    onChange={onToDateChange}
                    min={minDateFromFinance || fromDate}
                    max={maxDateFromFinance}
                    disabled={disableDates}
                />
            </div>

            {/* Show Button - Only for date filtering */}
            <button
                onClick={onFilter}
                disabled={loading || disableDates}
                className={`flex items-center gap-2 px-3 py-1.5 
                         text-white rounded-md text-xs font-medium transition-colors
                         ${disableDates
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'main-bg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed'
                    }`}
            >
                <Eye className="h-3.5 w-3.5" />
                {filterButtonText || t("common.show") || "Show"}
            </button>

            {/* Reset Button */}
            <button
                onClick={onReset}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 
                         text-white rounded-md text-xs font-medium transition-colors
                         disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {resetButtonText || t("common.reset") || "Reset"}
            </button>

            {/* Total Records */}
            <div className="ml-auto flex items-center gap-4">
                {showTotalRecords && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t("common.total") || "Total"}:
                        <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">
                            {totalRecords}
                        </span>
                        <span className="ml-1">{t("common.records") || "records"}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DateFilterSection;