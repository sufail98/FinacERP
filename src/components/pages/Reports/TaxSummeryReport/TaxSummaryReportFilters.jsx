// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxSummeryReport\TaxSummaryReportFilters.jsx

import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const TaxSummaryReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    taxOptions,
    formTypeOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-end gap-2">
                {/* From Date */}
                <div className="w-[130px]">
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
                <div className="w-[130px]">
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

                {/* Tax */}
                <div className="w-[140px]">
                    <SearchableDropdown
                        label={t("taxSummeryReport.filters.tax")}
                        name="taxId"
                        value={filters.taxId}
                        onChange={(value) => onFilterChange('taxId', value)}
                        options={taxOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("taxSummeryReport.filters.tax")}
                        clearable
                    />
                </div>

                {/* Form Type */}
                <div className="w-[160px]">
                    <SearchableDropdown
                        label={t("taxSummeryReport.filters.formType")}
                        name="formType"
                        value={filters.formType}
                        onChange={(value) => onFilterChange('formType', value)}
                        options={formTypeOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                        clearable
                    />
                </div>

                {/* Optional Checkbox */}
                <div className="flex items-center gap-1.5 h-[34px]">
                    <input
                        type="checkbox"
                        id="optional"
                        checked={filters.optional}
                        onChange={(e) => onFilterChange('optional', e.target.checked)}
                        className="w-3.5 h-3.5"
                    />
                    <label htmlFor="optional" className="text-xs dark:text-white">
                        {t('taxSummeryReport.filters.optional')}
                    </label>
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
                        t('reportFilters.generateReportBtn')
                    )}
                </button>

                {/* Reset Button */}
                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-[34px] px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
                    title={t('reportFilters.resetBtn')}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {t('reportFilters.resetBtn')}
                </button>
            </div>
        </div>
    );
};

export default TaxSummaryReportFilters;