// src/components/pages/Reports/DayBookSummary/DayBookSummaryFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DayBookSummaryFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    voucherTypeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex flex-wrap items-end gap-4">
                {/* From Date */}
                <div className="w-full sm:w-44">
                    <DateInput
                        label={t('From Date')}
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={(e, value) => onFilterChange('fromDate', value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                        className='w-full'
                    />
                </div>

                {/* To Date */}
                <div className="w-full sm:w-44">
                    <DateInput
                        label={t('To Date')}
                        name="toDate"
                        value={filters.toDate}
                        onChange={(e, value) => onFilterChange('toDate', value)}
                        required
                        className='w-full'
                    />
                </div>

                {/* Voucher Type Filter */}
                <div className="w-full sm:w-56">
                    <SearchableDropdown
                        label={t('Voucher Type')}
                        name="voucherType"
                        value={filters.voucherType}
                        onChange={(value) => onFilterChange('voucherType', value)}
                        options={voucherTypeOptions}
                        placeholder={t('All Voucher Types')}
                        searchPlaceholder={t('Search Voucher Type...')}
                        clearable
                    />
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

export default DayBookSummaryFilters;