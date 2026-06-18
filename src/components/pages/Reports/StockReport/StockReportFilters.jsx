// src/components/pages/Reports/StockReport/StockReportFilters.jsx
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const StockReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    criteriaOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg px-2 py-1.5 mb-2 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex flex-wrap items-center gap-2">
                {/* Criteria Dropdown - Smaller */}
                <div className="w-[130px]">
                    <SearchableDropdown
                        label={t("Criteria")}
                        name="criteria"
                        value={filters.criteria}
                        onChange={(value) => onFilterChange('criteria', value)}
                        options={criteriaOptions}
                        placeholder={t("Select")}
                        size="small"
                    />
                </div>

                {/* Datewise Checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                        type="checkbox"
                        checked={filters.isDatewise}
                        onChange={(e) => onFilterChange('isDatewise', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                        {t("Date Wise")}
                    </span>
                </label>

                {/* From Date - Smaller */}
                {filters.isDatewise && (
                    <div className="w-[120px]">
                        <DateInput
                            label={t('From')}
                            name="fromDate"
                            value={filters.fromDate}
                            onChange={(e, value) => onFilterChange('fromDate', value)}
                            required
                            className='w-full'
                            size="small"
                        />
                    </div>
                )}

                {/* To Date - Smaller */}
                {filters.isDatewise && (
                    <div className="w-[120px]">
                        <DateInput
                            label={t('To')}
                            name="toDate"
                            value={filters.toDate}
                            onChange={(e, value) => onFilterChange('toDate', value)}
                            required
                            min={filters.fromDate}
                            className='w-full'
                            size="small"
                        />
                    </div>
                )}

                {/* Active Only Checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                        type="checkbox"
                        checked={filters.isActive}
                        onChange={(e) => onFilterChange('isActive', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                        {t("Active")}
                    </span>
                </label>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Buttons - Smaller */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-7 px-3 main-bg dark:bg-blue-500 text-white text-xs rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            t('Generate')
                        )}
                    </button>

                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-7 px-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
                        title={t('Reset')}
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockReportFilters;