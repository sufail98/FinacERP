// src/components/pages/Reports/SalesOrderReport/SalesOrderReportFilters.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesOrderReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    partyOptions,
    salesmanOptions,
    areaOptions,
    userOptions,
    statusOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            {/* First Row */}
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

                {/* Due On */}
                <DateInput
                    label={t('Due On')}
                    name="dueOn"
                    value={filters.dueOn}
                    onChange={(e, value) => onFilterChange('dueOn', value)}
                    className='w-full'
                />

                {/* Status */}
                <SearchableDropdown
                    label={t('Status')}
                    name="status"
                    value={filters.status}
                    onChange={(value) => onFilterChange('status', value)}
                    options={statusOptions}
                    placeholder={t('All')}
                    searchPlaceholder={t('Search...')}
                />

                {/* Party */}
                <SearchableDropdown
                    label={t('Party')}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={partyOptions}
                    placeholder={t('All Parties')}
                    searchPlaceholder={t('Search Party...')}
                    clearable
                />

                {/* Salesman */}
                <SearchableDropdown
                    label={t('Salesman')}
                    name="salesManId"
                    value={filters.salesManId}
                    onChange={(value) => onFilterChange('salesManId', value)}
                    options={salesmanOptions}
                    placeholder={t('All Salesmen')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end mt-2">
                {/* Area */}
                <SearchableDropdown
                    label={t('Area')}
                    name="areaId"
                    value={filters.areaId}
                    onChange={(value) => onFilterChange('areaId', value)}
                    options={areaOptions}
                    placeholder={t('All Areas')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

                {/* User */}
                <SearchableDropdown
                    label={t('User')}
                    name="userId"
                    value={filters.userId}
                    onChange={(value) => onFilterChange('userId', value)}
                    options={userOptions}
                    placeholder={t('All Users')}
                    searchPlaceholder={t('Search...')}
                    clearable
                />

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
                <div></div>

                {/* Action Buttons */}
                <div className="col-span-2 flex justify-end gap-2">
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
        </div>
    );
};

export default SalesOrderReportFilters;