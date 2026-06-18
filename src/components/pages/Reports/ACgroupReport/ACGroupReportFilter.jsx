import DateInput from '@/components/elements/theme/DateInput';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const ACGroupReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 transition-colors mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <DateInput
                    label={t('reportFilters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('reportFilters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="px-4 h-8 text-center main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('reportFilters.generateReportBtn')}
                </button>

                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="px-4 h-8 main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('reportFilters.resetBtn')}
                </button>
            </div>
        </div>
    );
};

export default ACGroupReportFilter;