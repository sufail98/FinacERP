// src/components/pages/Reports/DeliveryNoteDetailedReport/DeliveryNoteDetailedReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const DeliveryNoteDetailedReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    customerOptions,
    salesmanOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
                    min={filters.fromDate}
                    className='w-full'
                />

                {/* Customer Dropdown */}
                <SearchableDropdown
                    label={t('Customer')}
                    name="ledgerId"
                    value={filters.ledgerId || null}  // ✅ Show null in UI (displays placeholder)
                    onChange={(value) => onFilterChange('ledgerId', value || 0)}  // ✅ Send 0 to API
                    options={customerOptions.filter(opt => opt.value !== 0)}  // ✅ Remove "0" option
                    placeholder={t('All Customers')}  // ✅ Shows this when nothing selected
                    searchPlaceholder={t('Search Customer...')}
                    clearable
                />

                {/* Salesman Dropdown */}
                <SearchableDropdown
                    label={t('Salesman')}
                    name="salesManId"
                    value={filters.salesManId || null}  // ✅ Show null in UI
                    onChange={(value) => onFilterChange('salesManId', value || 0)}  // ✅ Send 0 to API
                    options={salesmanOptions.filter(opt => opt.value !== 0)}  // ✅ Remove "0" option
                    placeholder={t('All Salesmen')}
                    searchPlaceholder={t('Search Salesman...')}
                    clearable
                />

               <div className="flex items-end gap-6  border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="reportType"
                            value="Summary"
                            checked={filters.reportType === 'Summary'}
                            onChange={(e) => onFilterChange('reportType', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.summary') || 'Summary'}
                        </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="reportType"
                            value="Detailed"
                            checked={filters.reportType === 'Detailed'}
                            onChange={(e) => onFilterChange('reportType', e.target.value)}
                            className="w-4 h-4 "
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.detailed') || 'Detailed'}
                        </span>
                    </label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-[38px] px-6 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {t('Loading...')}
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4" />
                            {t('Show')}
                        </>
                    )}
                </button>
                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-[38px] px-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('Reset')}
                </button>
            </div>
        </div>
    );
};

export default DeliveryNoteDetailedReportFilter;