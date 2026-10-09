// src/components/pages/Reports/TaxConsolidatedReportFilters.jsx
import DateInput from '@/components/elements/theme/DateInput';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const TaxConsolidatedReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 transition-colors">
            <div className="flex flex-wrap items-end gap-2">
                {/* From Date */}
                <div className="w-[130px]">
                    <DateInput
                        label={t('From Date')}
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={(e, value) => onFilterChange('fromDate', value)}
                        max={new Date().toISOString().split(("T")[0])}
                        required
                        className='w-full'
                    />
                </div>

                {/* To Date */}
                <div className="w-[130px]">
                    <DateInput
                        label={t('To Date')}
                        name="toDate"
                        value={filters.toDate}
                        onChange={(e, value) => onFilterChange('toDate', value)}
                        required
                        min={filters.fromDate}
                        className='w-full'
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-[34px] px-4 main-bg dark:bg-blue-500 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            {t('Loading...')}
                        </>
                    ) : (
                        t('Generate')
                    )}
                </button>

                {/* Reset Button */}
                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-[34px] px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
                    title={t('Reset')}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {t('Reset')}
                </button>
            </div>
        </div>
    );
};

export default TaxConsolidatedReportFilters;