// src/components/pages/Reports/SalesOrderVsProductReport/SalesOrderVsProductReportFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesOrderVsProductReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    productOptions,
    groupOptions,
    brandOptions,
    modeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            {/* First Row: Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* From Date */}
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max = {new Date().toISOString().split(('T')[0])}
                    required
                    className='w-full'
                />

                {/* To Date */}
                <DateInput
                    label={t('To Date')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    min={filters.fromDate}
                    required
                    className='w-full'
                />

                {/* Product Dropdown */}
                <SearchableDropdown
                    label={t('Product')}
                    name="productCode"
                    value={filters.productCode}
                    onChange={(value) => onFilterChange('productCode', value)}
                    options={productOptions}
                    placeholder={t('Select Product')}
                    searchPlaceholder={t('Search Product...')}
                    clearable
                />

                {/* Product Group Dropdown */}
                <SearchableDropdown
                    label={t('Product Group')}
                    name="groupId"
                    value={filters.groupId}
                    onChange={(value) => onFilterChange('groupId', value)}
                    options={groupOptions}
                    placeholder={t('All Groups')}
                    searchPlaceholder={t('Search Group...')}
                    clearable
                />
            </div>

            {/* Second Row: Brand, Mode, and Action Buttons */}
            <div className="flex flex-wrap items-end gap-4">
                {/* Brand Dropdown */}
                <div className="w-full sm:w-48">
                    <SearchableDropdown
                        label={t('Brand')}
                        name="brandId"
                        value={filters.brandId}
                        onChange={(value) => onFilterChange('brandId', value)}
                        options={brandOptions}
                        placeholder={t('All Brands')}
                        searchPlaceholder={t('Search Brand...')}
                        clearable
                    />
                </div>

                {/* Mode Radio Buttons */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('Report Mode')}
                    </label>
                    <div className="flex items-center gap-6 h-[38px]">
                        {modeOptions.map(option => (
                            <label key={option.value} className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="mode"
                                    value={option.value}
                                    checked={filters.mode === option.value}
                                    onChange={(e) => onFilterChange('mode', e.target.value)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2">
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
        </div>
    );
};

export default SalesOrderVsProductReportFilters;