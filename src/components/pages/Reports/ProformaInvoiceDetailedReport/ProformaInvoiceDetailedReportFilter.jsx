// src/components/pages/Reports/ProformaInvoiceDetailedReport/ProformaInvoiceDetailedReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const ProformaInvoiceDetailedReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    customerOptions,
    costCentreOptions,
    userOptions,
    conditionOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 transition-colors">

            {/* Row 1: Dates and Main Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 items-center gap-3 mb-3">
                {/* From Date */}
                <DateInput
                    label={t('From Date')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(("T")[0])}
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

                {/* Due On Date */}
                <DateInput
                    label={t('Due On')}
                    name="dueOn"
                    value={filters.dueOn || ''}
                    onChange={(e, value) => onFilterChange('dueOn', value || null)}
                    className='w-full'
                    placeholder={t('Optional')}
                />

                {/* Customer Dropdown */}
                <SearchableDropdown
                    label={t('Customer')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value || 'All')}
                    options={customerOptions}
                    placeholder={t('All Customers')}
                    searchPlaceholder={t('Search Customer...')}
                    clearable
                />

                {generalSettings?.costCentre && (
                    <>
                        {/* Cost Centre Dropdown */}
                        <SearchableDropdown
                            label={t('Cost Centre')}
                            name="costCentreId"
                            value={filters.costCentreId}
                            onChange={(value) => onFilterChange('costCentreId', value || 'All')}
                            options={costCentreOptions}
                            placeholder={t('All Cost Centres')}
                            searchPlaceholder={t('Search Cost Centre...')}
                            clearable
                        />
                    </>
                )}

                {/* Condition Dropdown */}
                {/* <SearchableDropdown
                    label={t('Condition')}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value || 'All')}
                    options={conditionOptions}
                    placeholder={t('All')}
                    clearable
                /> */}
                <SearchableDropdown
                    label={t('User')}
                    name="userId"
                    value={filters.userId}
                    onChange={(value) => onFilterChange('userId', value || 'All')}
                    options={userOptions}
                    placeholder={t('All Users')}
                    searchPlaceholder={t('Search User...')}
                    clearable
                />
                <div className="flex items-center pt-5">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.optional}
                            onChange={(e) => onFilterChange('optional', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('Optional')}
                        </span>
                    </label>
                </div>
                <div className=" items-end gap-6  border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="reportMode"
                            value="Summary"
                            checked={filters.reportMode === 'Summary'}
                            onChange={(e) => onFilterChange('reportMode', e.target.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.summary') || 'Summary'}
                        </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="reportMode"
                            value="Detailed"
                            checked={filters.reportMode === 'Detailed'}
                            onChange={(e) => onFilterChange('reportMode', e.target.value)}
                            className="w-4 h-4 "
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t('salesReport.filters.detailed') || 'Detailed'}
                        </span>
                    </label>
                </div>
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
    );
};

export default ProformaInvoiceDetailedReportFilter;