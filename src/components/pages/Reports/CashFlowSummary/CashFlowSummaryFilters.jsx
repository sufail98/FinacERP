// src/components/pages/Reports/CashFlowSummary/CashFlowSummaryFilters.jsx
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import DateInput from '@/components/elements/theme/DateInput';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const CashFlowSummaryFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    filterByOptions,
    monthOptions,
    yearOptions,
    groupOptions,
    ledgerOptions,
    loading,
    resetFilters,
    currentCurrency // Receive currency for display
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
            {/* Row 1: Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">

                {/* From Date */}
                <DateInput
                    label={t("From Date")}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                {/* To Date */}
                <DateInput
                    label={t("To Date")}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

               

                {/* Account Group */}
                <SearchableDropdown
                    label={t("Account Group")}
                    name="groupId"
                    value={filters.groupId || ''}
                    onChange={(value) => onFilterChange('groupId', value || null)}
                    options={groupOptions}
                    placeholder={t("All")}
                    clearable
                />

                {/* Account Ledger */}
                <SearchableDropdown
                    label={t("Ledger")}
                    name="ledgerId"
                    value={filters.ledgerId || ''}
                    onChange={(value) => onFilterChange('ledgerId', value || null)}
                    options={ledgerOptions}
                    placeholder={t("All")}
                    clearable
                />

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[38px] px-4 main-bg dark:main-bg text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            t('Generate')
                        )}
                    </button>

                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[38px] px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                        title={t('Reset')}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Row 2: View Type Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
                    {t('View')}:
                </span>

                {filterByOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onFilterChange('filterBy', option.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${filters.filterBy === option.value
                                ? 'main-bg dark:main-bg text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CashFlowSummaryFilters;