// src/components/pages/Reports/PriceListReportFilters.jsx
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const PriceListReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    groupOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 transition-colors">
            <div className="flex flex-wrap items-end gap-2">
                {/* Product Group */}
                <div className="w-[180px]">
                    <SearchableDropdown
                        label={t("Product Group")}
                        name="groupId"
                        value={filters.groupId}
                        onChange={(value) => onFilterChange('groupId', value)}
                        options={groupOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                        clearable
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

export default PriceListReportFilters;