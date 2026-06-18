// src/components/pages/Reports/SalesmanWiseSalesOrderReport/SalesmanWiseSalesOrderReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const SalesmanWiseSalesOrderReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    employeeOptions,
    currencyOptions,
    brandOptions,
    modeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <DateInput
                    label={t('salesmanWiseSalesOrderReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('salesmanWiseSalesOrderReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('salesmanWiseSalesOrderReport.filters.salesman')}
                    name="employeeId"
                    value={filters.employeeId || null}
                    onChange={(value) => onFilterChange('employeeId', value || null)}
                    options={employeeOptions}
                    placeholder={t('salesmanWiseSalesOrderReport.filters.allSalesmen')}
                    searchPlaceholder={t('salesmanWiseSalesOrderReport.filters.search')}
                    clearable
                />

                <SearchableDropdown
                    label={t('salesmanWiseSalesOrderReport.filters.mode')}
                    name="mode"
                    value={filters.mode}
                    onChange={(value) => onFilterChange('mode', value)}
                    options={modeOptions}
                />

                <SearchableDropdown
                    label={t('salesmanWiseSalesOrderReport.filters.currency')}
                    name="currencyId"
                    value={filters.currencyId}
                    onChange={(value) => onFilterChange('currencyId', value)}
                    options={currencyOptions}
                />

                <SearchableDropdown
                    label={t('salesmanWiseSalesOrderReport.filters.brand')}
                    name="brandId"
                    value={filters.brandId}
                    onChange={(value) => onFilterChange('brandId', value)}
                    options={brandOptions}
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {generalSettings?.AccountPosting && (
    <label className="flex items-center cursor-pointer">
        <input
            type="checkbox"
            checked={filters.isAccountsPosting}
            onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('salesmanWiseSalesOrderReport.filters.accountsPosting')}
        </span>
    </label>
)}

                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        {loading ? t('salesmanWiseSalesOrderReport.filters.loading') : t('salesmanWiseSalesOrderReport.filters.show')}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('salesmanWiseSalesOrderReport.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesmanWiseSalesOrderReportFilter;