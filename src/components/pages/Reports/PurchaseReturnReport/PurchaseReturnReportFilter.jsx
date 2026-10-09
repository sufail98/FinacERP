// src/components/pages/Reports/PurchaseReturnReport/PurchaseReturnReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const PurchaseReturnReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    supplierOptions,
    costCentreOptions,
    purchaseOptions,
    userOptions,
    currencyOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    const isDetailed = filters.reportType === 'Detailed';

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-1 mb-1  dark:border-gray-700 transition-colors">

          
            {/* Row 1: Dates and Primary Filters */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isDetailed ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-1 mb-1`}>
                <DateInput
                    label={t('purchaseReturnReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(("T")[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('purchaseReturnReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('purchaseReturnReport.filters.supplier')}
                    name="ledgerId"
                    value={filters.ledgerId || null}
                    onChange={(value) => onFilterChange('ledgerId', value || null)}
                    options={supplierOptions}
                    placeholder={t('purchaseReturnReport.filters.allSuppliers')}
                    searchPlaceholder={t('purchaseReturnReport.filters.searchSupplier')}
                    clearable
                />

                {generalSettings?.costCentre && (
                    <SearchableDropdown
                        label={t('purchaseReturnReport.filters.costCentre')}
                        name="costCentreId"
                        value={filters.costCentreId || null}
                        onChange={(value) => onFilterChange('costCentreId', value || null)}
                        options={costCentreOptions}
                        placeholder={t('purchaseReturnReport.filters.allCostCentres')}
                        searchPlaceholder={t('purchaseReturnReport.filters.search')}
                        clearable
                    />
                )}

                <SearchableDropdown
                    label={t('purchaseReturnReport.filters.purchaseInvoice')}
                    name="purchaseMasterId"
                    value={filters.purchaseMasterId || null}
                    onChange={(value) => onFilterChange('purchaseMasterId', value || null)}
                    options={purchaseOptions}
                    placeholder={t('purchaseReturnReport.filters.allInvoices')}
                    searchPlaceholder={t('purchaseReturnReport.filters.search')}
                    clearable
                />
  {/* Report Type Toggle - Row 0 */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('purchaseReturnReport.filters.reportType')}:
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
                            {t('purchaseReturnReport.filters.detailed')}
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
                            {t('purchaseReturnReport.filters.summary')}
                        </span>
                    </label>
                </div>
            </div>

                {/* Only show for Summary Report */}
                {!isDetailed && (
                    <SearchableDropdown
                        label={t('purchaseReturnReport.filters.currency')}
                        name="currencyId"
                        value={filters.currencyId || null}
                        onChange={(value) => onFilterChange('currencyId', value || null)}
                        options={currencyOptions}
                        placeholder={t('purchaseReturnReport.filters.selectCurrency')}
                        searchPlaceholder={t('purchaseReturnReport.filters.search')}
                        clearable
                    />
                )}
            </div>

            {/* Row 2: Additional Filters for Summary */}
            {!isDetailed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                    <SearchableDropdown
                        label={t('purchaseReturnReport.filters.user')}
                        name="userId"
                        value={filters.userId || null}
                        onChange={(value) => onFilterChange('userId', value || null)}
                        options={userOptions}
                        placeholder={t('purchaseReturnReport.filters.allUsers')}
                        searchPlaceholder={t('purchaseReturnReport.filters.search')}
                        clearable
                    />

                </div>
            )}

            {/* Row 3: Checkboxes and Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Checkboxes */}
                <div className="flex flex-wrap items-center gap-4">
                    {generalSettings?.AccountPosting && (
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.isAccountsPosting}
                                onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('purchaseReturnReport.filters.accountsPosting')}
                            </span>
                        </label>
                    )}

                    {/* Only show for Detailed Report */}
                    {isDetailed && (
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.optional}
                                onChange={(e) => onFilterChange('optional', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('purchaseReturnReport.filters.optional')}
                            </span>
                        </label>
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
                                {t('purchaseReturnReport.filters.loading')}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('purchaseReturnReport.filters.show')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('purchaseReturnReport.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReturnReportFilter;