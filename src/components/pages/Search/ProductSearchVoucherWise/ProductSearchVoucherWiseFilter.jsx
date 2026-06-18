// src/components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWiseFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import { RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProductSearchVoucherWiseFilter = ({
    filters,
    onFilterChange,
    onSearch,
    productOptions,
    productGroupOptions,
    ledgerOptions,
    employeeOptions,
    voucherTypeOptions,
    loading,
    resetFilters,
    initialLoading
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            {/* Row 1: Date and Main Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <DateInput
                    label={t('productSearchVoucherWise.filters.startDate')}
                    name="startDate"
                    value={filters.startDate}
                    onChange={(e, value) => onFilterChange('startDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('productSearchVoucherWise.filters.endDate')}
                    name="endDate"
                    value={filters.endDate}
                    onChange={(e, value) => onFilterChange('endDate', value)}
                    required
                    min={filters.startDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('productSearchVoucherWise.filters.voucherType')}
                    name="voucherType"
                    value={filters.voucherType}
                    onChange={(value) => onFilterChange('voucherType', value)}
                    options={voucherTypeOptions}
                    placeholder={t('productSearchVoucherWise.filters.all')}
                    initialLoading={initialLoading}
                />

                <SearchableDropdown
                    label={t('productSearchVoucherWise.filters.productGroup')}
                    name="groupId"
                    value={filters.groupId}
                    onChange={(value) => onFilterChange('groupId', value)}
                    options={productGroupOptions}
                    placeholder={t('productSearchVoucherWise.filters.all')}
                    initialLoading={initialLoading}
                />

                <SearchableDropdown
                    label={t('productSearchVoucherWise.filters.product')}
                    name="productCode"
                    value={filters.productCode}
                    onChange={(value) => onFilterChange('productCode', value)}
                    options={productOptions}
                    initialLoading={initialLoading}
                    placeholder={t('productSearchVoucherWise.filters.all')}
                />

                <SearchableDropdown
                    label={t('productSearchVoucherWise.filters.party')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={ledgerOptions}
                    initialLoading={initialLoading}
                    placeholder={t('productSearchVoucherWise.filters.all')}
                />
            </div>

            {/* Row 2: More Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <SearchableDropdown
                    label={t('productSearchVoucherWise.filters.salesman')}
                    name="employeeId"
                    value={filters.employeeId}
                    onChange={(value) => onFilterChange('employeeId', value)}
                    options={employeeOptions}
                    initialLoading={initialLoading}
                    placeholder={t('productSearchVoucherWise.filters.all')}
                />

                <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('productSearchVoucherWise.filters.searchText')}
                    </label>
                    <input
                        type="text"
                        value={filters.startText}
                        onChange={(e) => onFilterChange('startText', e.target.value)}
                        placeholder={t('productSearchVoucherWise.filters.searchPlaceholder')}
                        className="w-full h-[36px] px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="lg:col-span-3 flex items-end gap-2">
                    <button
                        onClick={onSearch}
                        disabled={loading}
                        className="h-[36px] px-6 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('productSearchVoucherWise.filters.searching')}
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                {t('productSearchVoucherWise.filters.search')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('productSearchVoucherWise.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchVoucherWiseFilter;