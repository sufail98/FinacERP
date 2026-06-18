// src/components/pages/Reports/PurchaseQuotationReport/PurchaseQuotationReportFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PurchaseQuotationReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    partyOptions,
    costCenterOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            {/* First Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end">
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('To Date')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('Party')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={partyOptions}
                    placeholder={t('All Parties')}
                    searchPlaceholder={t('Search Party...')}
                    clearable
                />

                <SearchableDropdown
                    label={t('Cost Center')}
                    name="costCenterId"
                    value={filters.costCenterId}
                    onChange={(value) => onFilterChange('costCenterId', value)}
                    options={costCenterOptions}
                    placeholder={t('All Cost Centers')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                <SearchableDropdown
                    label={t('Condition')}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value)}
                    options={[
                        { label: t('Active'), value: 'Active' },
                        { label: t('Inactive'), value: 'Inactive' },
                    ]}
                    placeholder={t('Select Condition')}
                />
            </div>

            {/* Second Row - Radio Buttons and Action Buttons */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {/* Radio Buttons */}
                <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {t('Report Type')}:
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="reportMode"
                            value="summary"
                            checked={filters.mode === 'summary'}
                            onChange={(e) => onFilterChange('mode', e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                            {t('Summary')}
                        </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="reportMode"
                            value="detailed"
                            checked={filters.mode === 'detailed'}
                            onChange={(e) => onFilterChange('mode', e.target.value)}
                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                            {t('Detailed')}
                        </span>
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-7 px-4 main-bg text-white text-xs rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            t('Show')
                        )}
                    </button>

                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-7 px-3 flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseQuotationReportFilters;