// src/components/pages/Reports/AddressBookFilters.jsx
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const AddressBookFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded p-1.5 mb-2 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="text"
                    value={filters.name}
                    onChange={(e) => onFilterChange('name', e.target.value)}
                    placeholder={t('cusSuppAddressBook.filters.name')}
                    className="h-6 w-28 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                />

                <input
                    type="text"
                    value={filters.address}
                    onChange={(e) => onFilterChange('address', e.target.value)}
                    placeholder={t('cusSuppAddressBook.filters.address')}
                    className="h-6 w-28 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                />

                <input
                    type="text"
                    value={filters.phoneno}
                    onChange={(e) => onFilterChange('phoneno', e.target.value)}
                    placeholder={t('cusSuppAddressBook.filters.phone')}
                    className="h-6 w-28 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                />

                <input
                    type="text"
                    value={filters.email}
                    onChange={(e) => onFilterChange('email', e.target.value)}
                    placeholder={t('cusSuppAddressBook.filters.email')}
                    className="h-6 w-28 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                />

                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-6 px-3 main-bg text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                >
                    {t('reportFilters.generateReportBtn')}
                </button>

                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-6 w-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    title={t('reportFilters.resetBtn')}
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default AddressBookFilters;