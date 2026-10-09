// src/components/pages/Reports/SalesDayReport/SalesDayReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const SalesDayReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            {/* Row 1: Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <DateInput
                    label={t('salesDayReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                     max = {new Date().toISOString().split(('T')[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('salesDayReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                {/* Accounts Posting Checkbox */}
                {generalSettings?.AccountPosting && (
    <div className="flex items-end">
        <label className="flex items-center cursor-pointer h-[36px]">
            <input
                type="checkbox"
                checked={filters.isAccountsPosting}
                onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('salesDayReport.filters.accountsPosting')}
            </span>
        </label>
    </div>
)}

                {/* Buttons */}
                <div className="flex items-end gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('salesDayReport.filters.loading')}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('salesDayReport.filters.show')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('salesDayReport.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesDayReportFilter;