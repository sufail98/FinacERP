// src/components/pages/Reports/SalesQuotationReport/SalesQuotationFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesQuotationReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    customerOptions,
    costCentreOptions,
    salesmanOptions,
    userOptions,
    currencyOptions,
    conditionOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();

    const isDetailed = filters.reportMode === 'Detailed';

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 transition-colors">

            {/* ── Row 0: Report Mode Radio Buttons ── */}
            <div className="flex items-center gap-6 mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('salesQuotationReport.filters.reportMode') || 'Report Mode'}:
                </span>
                {['Summary', 'Detailed'].map((mode) => (
                    <label
                        key={mode}
                        className="flex items-center gap-2 cursor-pointer select-none"
                    >
                        <input
                            type="radio"
                            name="quotationReportMode"
                            value={mode}
                            checked={filters.reportMode === mode}
                            onChange={() => onFilterChange('reportMode', mode)}
                            className="w-4 h-4 accent-[var(--main-color,#3b82f6)] cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {mode === 'Summary'
                                ? t('salesQuotationReport.filters.modeSummary')  || 'Summary'
                                : t('salesQuotationReport.filters.modeDetailed') || 'Detailed'}
                        </span>
                    </label>
                ))}
            </div>

            {/* ── Row 1: Date + Common Filters ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 mb-3">
                <DateInput
                    label={t('salesQuotationReport.filters.fromDate') || 'From Date'}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className="w-full"
                />

                <DateInput
                    label={t('salesQuotationReport.filters.toDate') || 'To Date'}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className="w-full"
                />

                <SearchableDropdown
                    label={t('salesQuotationReport.filters.customer') || 'Customer'}
                    name="ledgerId"
                    value={filters.ledgerId}
                    onChange={(value) => onFilterChange('ledgerId', value)}
                    options={customerOptions}
                    placeholder={t('salesQuotationReport.filters.allCustomers') || 'All Customers'}
                />

                <SearchableDropdown
                    label={t('salesQuotationReport.filters.currency') || 'Currency'}
                    name="currencyId"
                    value={filters.currencyId}
                    onChange={(value) => onFilterChange('currencyId', value)}
                    options={currencyOptions}
                    placeholder={t('salesQuotationReport.filters.all') || 'All'}
                />

                <SearchableDropdown
                    label={t('salesQuotationReport.filters.salesman') || 'Salesman'}
                    name="salesManId"
                    value={filters.salesManId}
                    onChange={(value) => onFilterChange('salesManId', value)}
                    options={salesmanOptions}
                    placeholder={t('salesQuotationReport.filters.all') || 'All'}
                />

                <SearchableDropdown
                    label={t('salesQuotationReport.filters.costCentre') || 'Cost Centre'}
                    name="costCentreId"
                    value={filters.costCentreId}
                    onChange={(value) => onFilterChange('costCentreId', value)}
                    options={costCentreOptions}
                    placeholder={t('salesQuotationReport.filters.all') || 'All'}
                />

                <SearchableDropdown
                    label={t('salesQuotationReport.filters.condition') || 'Condition'}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value)}
                    options={conditionOptions}
                    placeholder={t('salesQuotationReport.filters.all') || 'All'}
                />

                {/* Summary-only: condition (already above); Detailed has no extra unique field */}
                {!isDetailed && (
                    <SearchableDropdown
                        label={t('salesQuotationReport.filters.user') || 'User'}
                        name="userId"
                        value={filters.userId}
                        onChange={(value) => onFilterChange('userId', value)}
                        options={userOptions}
                        placeholder={t('salesQuotationReport.filters.all') || 'All'}
                    />
                )}
            </div>

            {/* ── Row 2: Buttons ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('salesQuotationReport.filters.loading') || 'Loading...'}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('salesQuotationReport.filters.show') || 'Show'}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('salesQuotationReport.filters.reset') || 'Reset'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesQuotationReportFilter;