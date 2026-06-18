// src/components/pages/Reports/AgeingReport/AgeingReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AgeingReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    ledgerOptions,
    salesmanOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            {/* First Row: Date, Account Ledger, Salesman */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Ageing Date */}
                <DateInput
                    label={t('Ageing Date')}
                    name="ageingDate"
                    value={filters.ageingDate}
                    onChange={(e, value) => onFilterChange('ageingDate', value)}
                    required
                    className='w-full'
                />

                {/* Account Ledger Dropdown - Removed count from label */}
                <SearchableDropdown
                    label={t('Account Ledger')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={ledgerOptions}
                    placeholder={
                        filters.partyType === 'customer' 
                            ? t('Select Customer') 
                            : t('Select Vendor/Supplier')
                    }
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                {/* Salesman Dropdown */}
                <SearchableDropdown
                    label={t('Salesman')}
                    name="salesmanId"
                    value={filters.salesmanId}
                    onChange={(value) => onFilterChange('salesmanId', value)}
                    options={salesmanOptions}
                    placeholder={t('All Salesmen')}
                    searchPlaceholder={t('Search Salesman...')}
                    clearable
                />

                {/* Empty for alignment */}
                <div></div>
            </div>

            {/* Second Row: Radio Button Groups and Action Buttons */}
            <div className="flex flex-wrap items-center gap-8">
                {/* Report Type: Voucher Wise vs Ledger Wise */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('Report Type')}
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="voucher"
                                checked={filters.reportType === 'voucher'}
                                onChange={(e) => onFilterChange('reportType', e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('Voucher Wise')}
                            </span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="ledger"
                                checked={filters.reportType === 'ledger'}
                                onChange={(e) => onFilterChange('reportType', e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('Ledger Wise')}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Party Type: Vendor vs Customer - Removed counts */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('Party Type')}
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="partyType"
                                value="vendor"
                                checked={filters.partyType === 'vendor'}
                                onChange={(e) => onFilterChange('partyType', e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('Vendor')}
                            </span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="partyType"
                                value="customer"
                                checked={filters.partyType === 'customer'}
                                onChange={(e) => onFilterChange('partyType', e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('Customer')}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[38px] px-6 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('Show')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[38px] px-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgeingReportFilter;