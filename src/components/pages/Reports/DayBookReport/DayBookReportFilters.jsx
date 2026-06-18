// src/components/pages/Reports/DayBookReportFilters.jsx
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const DayBookReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    ledgerOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 transition-colors">
            <div className="flex flex-wrap items-end gap-2">
                {/* From Date */}
                <div className="w-[140px]">
                    <DateInput
                         label={t('reportFilters.fromDate')}
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={(e, value) => onFilterChange('fromDate', value)}
                        required
                        className='w-full'
                    />
                </div>

                {/* To Date */}
                <div className="w-[140px]">
                    <DateInput
                       label={t('reportFilters.toDate')}
                        name="toDate"
                        value={filters.toDate}
                        onChange={(e, value) => onFilterChange('toDate', value)}
                        required
                        min={filters.fromDate}
                        className='w-full'
                    />
                </div>

                {/* Ledger */}
                <div className="w-[180px]">
                    <SearchableDropdown
                       label={t("reportFilters.selectLedger")}
                        name="ledgerName"
                        value={filters.ledgerName}
                        onChange={(value) => onFilterChange('ledgerName', value)}
                        options={ledgerOptions}
                        placeholder={t("reportFilters.selectLedger")}
                        searchPlaceholder={t("reportFilters.selectLedger")}
                        clearable
                    />
                </div>

                {/* Format */}
                <div className="w-[130px]">
                    <SearchableDropdown
                        label={t("dayBookReport.filters.format")}
                        name="isCondensed"
                        value={filters.isCondensed ? 'condensed' : 'detailed'}
                        onChange={(value) => onFilterChange('isCondensed', value === 'condensed')}
                        options={[
                            { label: t('dayBookReport.filters.formatOptions.Detailed'), value: 'detailed' },
                            { label: t('dayBookReport.filters.formatOptions.Condensed'), value: 'condensed' }
                        ]}
                        placeholder={t("dayBookReport.filters.format")}
                    />
                </div>

                {/* Buttons */}
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-[25px] px-4 main-bg dark:bg-blue-500 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                             {t('loadingText')}
                        </>
                    ) : (
                        t('reportFilters.generateReportBtn')
                    )}
                </button>

                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-[25px] px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
                    title={t('Reset')}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                     {t('reportFilters.resetBtn')}
                </button>

             
            </div>
        </div>
    );
};

export default DayBookReportFilters;