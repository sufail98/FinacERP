// src/components/pages/Reports/SalesReturnDetailedReport/SalesReturnDetailedReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';


const SalesReturnDetailedReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    customerOptions,
    salesmanOptions,
    costCentreOptions,
    taxTypeOptions,
    loading,
    resetFilters
}) => {
    const { generalSettings } = useSelector((state) => state.settings);
    const { t } = useTranslation();

    const isDetailed = filters.reportType === 'Detailed';

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            {/* Report Type Toggle - Row 0 */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Report Type')}:
                </span>
                <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="reportType"
                            value="Detailed"
                            checked={filters.reportType === 'Detailed'}
                            onChange={(e) => onFilterChange('reportType', e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('Detailed')}
                        </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="reportType"
                            value="Summary"
                            checked={filters.reportType === 'Summary'}
                            onChange={(e) => onFilterChange('reportType', e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('Summary')}
                        </span>
                    </label>
                </div>
            </div>

            {/* Row 1: Dates and Dropdowns */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isDetailed ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3 mb-3`}>
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(("T")[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('To Date')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('Customer')}
                    name="ledgerId"
                    value={filters.ledgerId || null}
                    onChange={(value) => onFilterChange('ledgerId', value || 0)}
                    options={customerOptions}
                    placeholder={t('All Customers')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                <SearchableDropdown
                    label={t('Salesman')}
                    name="salesManId"
                    value={filters.salesManId || null}
                    onChange={(value) => onFilterChange('salesManId', value || 0)}
                    options={salesmanOptions}
                    placeholder={t('All Salesmen')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                {/* Only show for Detailed Report */}
                {isDetailed && generalSettings?.costCentre && (
                    <>
                        <SearchableDropdown
                            label={t('Cost Centre')}
                            name="costCentreId"
                            value={filters.costCentreId || null}
                            onChange={(value) => onFilterChange('costCentreId', value || 0)}
                            options={costCentreOptions}
                            placeholder={t('All')}
                            searchPlaceholder={t('Search...')}
                            clearable
                        />

                        <SearchableDropdown
                            label={t('Tax Type')}
                            name="taxType"
                            value={filters.taxType}
                            onChange={(value) => onFilterChange('taxType', value)}
                            options={taxTypeOptions}
                            placeholder={t('Select')}
                        />
                    </>
                )}
            </div>

            {/* Row 2: Checkboxes and Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Checkboxes */}
                <div className="flex items-center gap-6">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.isAccountsPosting}
                            onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('Accounts Posting')}
                        </span>
                    </label>

                    {/* Only show for Detailed Report */}
                    {isDetailed && (
                        <>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.isPosted}
                                    onChange={(e) => onFilterChange('isPosted', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {t('Posted')}
                                </span>
                            </label>

                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.isCancelled}
                                    onChange={(e) => onFilterChange('isCancelled', e.target.checked)}
                                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {t('Cancelled')}
                                </span>
                            </label>
                        </>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>  
            </div>
        </div>
    );
};

export default SalesReturnDetailedReportFilter;