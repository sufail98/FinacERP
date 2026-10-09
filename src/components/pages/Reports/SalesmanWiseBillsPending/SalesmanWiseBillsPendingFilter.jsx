// src/components/pages/Reports/SalesmanWiseBillsPending/SalesmanWiseBillsPendingFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const SalesmanWiseBillsPendingFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    employeeOptions,
    customerOptions,
    currencyOptions,
    statusOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <DateInput
                    label={t('salesmanWiseBillsPending.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(('T')[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('salesmanWiseBillsPending.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('salesmanWiseBillsPending.filters.status')}
                    name="status"
                    value={filters.status}
                    onChange={(value) => onFilterChange('status', value)}
                    options={statusOptions}
                />

                <SearchableDropdown
                    label={t('salesmanWiseBillsPending.filters.salesman')}
                    name="employeeId"
                    value={filters.employeeId}
                    onChange={(value) => onFilterChange('employeeId', value)}
                    options={employeeOptions}
                    placeholder={t('salesmanWiseBillsPending.filters.all')}
                    clearable
                />

                <SearchableDropdown
                    label={t('salesmanWiseBillsPending.filters.customer')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={customerOptions}
                    placeholder={t('salesmanWiseBillsPending.filters.all')}
                    clearable
                />

                <SearchableDropdown
                    label={t('salesmanWiseBillsPending.filters.currency')}
                    name="currencyId"
                    value={filters.currencyId}
                    onChange={(value) => onFilterChange('currencyId', value)}
                    options={currencyOptions}
                    placeholder={t('salesmanWiseBillsPending.filters.selectCurrency')}
                    clearable
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.optional}
                            onChange={(e) => onFilterChange('optional', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('salesmanWiseBillsPending.filters.optional')}
                        </span>
                    </label>

                    {generalSettings?.AccountPosting && (
    <label className="flex items-center cursor-pointer">
        <input
            type="checkbox"
            checked={filters.isAccountsPosting}
            onChange={(e) => onFilterChange('isAccountsPosting', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {t('salesmanWiseBillsPending.filters.accountsPosting')}
        </span>
    </label>
)}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        {loading ? t('salesmanWiseBillsPending.filters.loading') : t('salesmanWiseBillsPending.filters.show')}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('salesmanWiseBillsPending.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesmanWiseBillsPendingFilter;