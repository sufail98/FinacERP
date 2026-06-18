// src/components/pages/Reports/FundFlow/FundFlowFilters.jsx
import DateInput from '@/components/elements/theme/DateInput';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const FundFlowFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    loading,
    resetFilters,
    currentCurrency
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">

                {/* From Date */}
                <DateInput
                    label={t("From Date")}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                {/* To Date */}
                <DateInput
                    label={t("To Date")}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

              

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

export default FundFlowFilters;