// src/components/pages/Reports/AreaWiseSalesReport/AreaWiseSalesReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const AreaWiseSalesReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    employeeOptions,
    currencyOptions,
    routeOptions,
    marketOptions,
    areaOptions,
    brandOptions,
    modeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            {/* Row 1: Date and Main Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <DateInput
                    label={t('areaWiseSalesReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(('T')[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('areaWiseSalesReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.mode')}
                    name="mode"
                    value={filters.mode}
                    onChange={(value) => onFilterChange('mode', value)}
                    options={modeOptions}
                />

                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.area')}
                    name="areaId"
                    value={filters.areaId}
                    onChange={(value) => onFilterChange('areaId', value)}
                    options={areaOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                />

                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.route')}
                    name="routeId"
                    value={filters.routeId}
                    onChange={(value) => onFilterChange('routeId', value)}
                    options={routeOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                />

                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.market')}
                    name="marketId"
                    value={filters.marketId}
                    onChange={(value) => onFilterChange('marketId', value)}
                    options={marketOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                />
            </div>

            {/* Row 2: Additional Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.salesman')}
                    name="employeeId"
                    value={filters.employeeId}
                    onChange={(value) => onFilterChange('employeeId', value)}
                    options={employeeOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                />

                {/* <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.currency')}
                    name="currencyId"
                    value={filters.currencyId}
                    onChange={(value) => onFilterChange('currencyId', value)}
                    options={currencyOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                /> */}

                <SearchableDropdown
                    label={t('areaWiseSalesReport.filters.brand')}
                    name="brandId"
                    value={filters.brandId}
                    onChange={(value) => onFilterChange('brandId', value)}
                    options={brandOptions}
                    placeholder={t('areaWiseSalesReport.filters.all')}
                />
            </div>

            {/* Row 3: Checkboxes and Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Checkboxes */}
                <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.optional}
                            onChange={(e) => onFilterChange('optional', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('areaWiseSalesReport.filters.optional')}
                        </span>
                    </label>

                    {/* {generalSettings?.AccountPosting && (
    <label className="flex items-center cursor-pointer">
        <input
            type="checkbox"
            checked={filters.isAccountsPosting}
            onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('areaWiseSalesReport.filters.accountsPosting')}
        </span>
    </label>
)} */}
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
                                {t('areaWiseSalesReport.filters.loading')}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('areaWiseSalesReport.filters.show')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('areaWiseSalesReport.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AreaWiseSalesReportFilter;