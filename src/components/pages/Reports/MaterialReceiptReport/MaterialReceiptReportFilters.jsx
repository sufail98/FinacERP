// src/components/pages/Reports/MaterialReceiptReport/MaterialReceiptReportFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const MaterialReceiptReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    partyOptions,
    costCentreOptions,
    userOptions,
    conditionOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
                {/* From Date */}
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                {/* To Date */}
                <DateInput
                    label={t('To Date')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    className='w-full'
                />

                {/* Condition */}
                <SearchableDropdown
                    label={t('Condition')}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value)}
                    options={conditionOptions}
                    placeholder={t('All')}
                    searchPlaceholder={t('Search...')}
                />

                {/* Supplier */}
                <SearchableDropdown
                    label={t('Supplier')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={partyOptions}
                    placeholder={t('All Suppliers')}
                    searchPlaceholder={t('Search Supplier...')}
                    clearable
                />

                {generalSettings?.costCentre && (
                    <>
                        {/* Cost Centre */}
                        <SearchableDropdown
                            label={t('Cost Centre')}
                            name="costCentreId"
                            value={filters.costCentreId}
                            onChange={(value) => onFilterChange('costCentreId', value)}
                            options={costCentreOptions}
                            placeholder={t('All Cost Centres')}
                            searchPlaceholder={t('Search...')}
                            clearable
                        />
                    </>
                )}

                {/* User */}
                <SearchableDropdown
                    label={t('User')}
                    name="userId"
                    value={filters.userId}
                    onChange={(value) => onFilterChange('userId', value)}
                    options={userOptions}
                    placeholder={t('All Users')}
                    searchPlaceholder={t('Search User...')}
                    clearable
                />
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2 mt-2 items-center">
               
                 <div className="flex items-end gap-6  border-gray-200 dark:border-gray-700">
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
                            className="w-4 h-4 "
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.detailed') || 'Detailed'}
                        </span>
                    </label>
                </div>

                {/* Generate Report Button */}
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

                {/* Reset Button */}
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
    );
};

export default MaterialReceiptReportFilters;