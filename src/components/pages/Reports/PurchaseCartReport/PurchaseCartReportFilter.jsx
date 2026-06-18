// src/components/pages/Reports/PurchaseCartReport/PurchaseCartReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PurchaseCartReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    statusOptions,
    modeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 transition-colors">
            {/* Main Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
                <DateInput
                    label={t('purchaseCartReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('purchaseCartReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('purchaseCartReport.filters.status')}
                    name="status"
                    value={filters.status}
                    onChange={(value) => onFilterChange('status', value)}
                    options={statusOptions}
                    placeholder={t('purchaseCartReport.filters.selectStatus')}
                />

                <TextInput
                    label={t('purchaseCartReport.filters.customerName')}
                    name="customerName"
                    value={filters.customerName === 'All' ? '' : filters.customerName}
                    onChange={(e) => onFilterChange('customerName', e.target.value || 'All')}
                    placeholder={t('purchaseCartReport.filters.customerNamePlaceholder')}
                />

                <SearchableDropdown
                    label={t('purchaseCartReport.filters.mode')}
                    name="mode"
                    value={filters.mode}
                    onChange={(value) => onFilterChange('mode', value)}
                    options={modeOptions}
                    placeholder={t('purchaseCartReport.filters.selectMode')}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {t('purchaseCartReport.filters.loading')}
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4" />
                            {t('purchaseCartReport.filters.show')}
                        </>
                    )}
                </button>
                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('purchaseCartReport.filters.reset')}
                </button>
            </div>
        </div>
    );
};

export default PurchaseCartReportFilter;