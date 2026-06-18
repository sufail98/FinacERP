// src/components/pages/Reports/SalesOrderPaymentReport/SalesOrderPaymentReportFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesOrderPaymentReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    partyOptions,
    salesmanOptions,
    cashOrBankOptions,
    statusOptions,
    payStatusOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            {/* First Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 items-end">
                {/* From Date */}
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                {/* To Date */}
                <DateInput
                    label={t('To Date')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    className='w-full'
                />

                {/* Party */}
                <SearchableDropdown
                    label={t('Party')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={partyOptions}
                    placeholder={t('All Parties')}
                    searchPlaceholder={t('Search Party...')}
                    clearable
                />

                {/* Salesman */}
                <SearchableDropdown
                    label={t('Salesman')}
                    name="salesManId"
                    value={filters.salesManId}
                    onChange={(value) => onFilterChange('salesManId', value)}
                    options={salesmanOptions}
                    placeholder={t('All Salesmen')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                {/* Cash or Bank */}
                <SearchableDropdown
                    label={t('Cash / Bank')}
                    name="cashOrBank"
                    value={filters.cashOrBank}
                    onChange={(value) => onFilterChange('cashOrBank', value)}
                    options={cashOrBankOptions}
                    placeholder={t('All')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                {/* Order Status */}
                <SearchableDropdown
                    label={t('Order Status')}
                    name="status"
                    value={filters.status}
                    onChange={(value) => onFilterChange('status', value)}
                    options={statusOptions}
                    placeholder={t('All')}
                    searchPlaceholder={t('Search...')}
                />
                  <SearchableDropdown
                    label={t('Pay Status')}
                    name="payStatus"
                    value={filters.payStatus}
                    onChange={(value) => onFilterChange('payStatus', value)}
                    options={payStatusOptions}
                    placeholder={t('All')}
                    searchPlaceholder={t('Search...')}
                />
   <div className=" flex justify-end gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-7 px-4 main-bg text-white text-xs rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            t('Show')
                        )}
                    </button>

                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-7 px-3 flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end mt-2">
                {/* Payment Status */}
              
               

                {/* Action Buttons */}
             
            </div>
        </div>
    );
};

export default SalesOrderPaymentReportFilters;