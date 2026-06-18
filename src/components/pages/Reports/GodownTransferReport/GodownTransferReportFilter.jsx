// GodownTransferReportFilter.jsx
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const GodownTransferReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    userOptions,
    godownOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 transition-colors">
            <div className="flex flex-wrap items-end gap-2">
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

                <div className="w-[160px]">
                    <SearchableDropdown
                        label={t("reportFilters.selectGodown")}
                        name="godownId"
                        value={filters.godownId}
                        onChange={(value) => onFilterChange('godownId', value)}
                        options={godownOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                        clearable
                    />
                </div>

                <div className="w-[160px]">
                    <SearchableDropdown
                        label={t("reportFilters.selectUser")}
                        name="userId"
                        value={filters.userId}
                        onChange={(value) => onFilterChange('userId', value)}
                        options={userOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                        clearable
                    />
                </div>

                <div className="flex items-end gap-6 border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="mode"
                            value="Summary"
                            checked={filters.mode === 'Summary'}
                            onChange={(e) => onFilterChange('mode', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.summary') || 'Summary'}
                        </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="mode"
                            value="Detailed"
                            checked={filters.mode === 'Detailed'}
                            onChange={(e) => onFilterChange('mode', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.detailed') || 'Detailed'}
                        </span>
                    </label>
                </div>

                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-[25px] px-4 main-bg text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
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
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {t('reportFilters.resetBtn')}
                </button>
            </div>
        </div>
    );
};

export default GodownTransferReportFilter;  