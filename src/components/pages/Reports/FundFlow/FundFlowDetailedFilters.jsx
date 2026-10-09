// src/components/pages/Reports/FundFlow/FundFlowDetailedFilters.jsx
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { showToast } from '@/utils/toast';
import DateInput from '@/components/elements/theme/DateInput';

const FundFlowDetailedFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    currencyOptions,
    groupOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    //    const handleGenerateClick = () => {
    //     if (groupOptions.length > 1 && !filters.groupId) {
    //         showToast.error(t("Please select an Account Group"));
    //         return;
    //     }
    //     onGenerateReport();
    // };

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 items-end">
                
                {/* From Date */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("From Date")}
                    </label>
                    <DateInput
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => onFilterChange('fromDate', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full h-[38px] px-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>

                {/* To Date */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("To Date")}
                    </label>
                    <DateInput
                        type="date"
                        value={filters.toDate}
                        min={filters.fromDate}
                        onChange={(e) => onFilterChange('toDate', e.target.value)}
                        className="w-full h-[38px] px-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>

           

                {/* Account Group - Only show if groups are available */}
                {/* {groupOptions.length > 1 && (
                    <div>
                        <SearchableDropdown
                            label={t("Account Group")}
                            name="groupId"
                            value={filters.groupId || ''}
                            onChange={(value) => onFilterChange('groupId', value || null)}
                            options={groupOptions}
                            placeholder={t("Select Account Group")}
                            required
                        />
                    </div>
                )} */}

                {/* Is Asset Checkbox */}
                {/* <div className="flex items-center h-[38px] pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.isAsset}
                            onChange={(e) => onFilterChange('isAsset', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("Is Asset")}
                        </span>
                    </label>
                </div> */}

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
        </div>
    );
};

export default FundFlowDetailedFilters;