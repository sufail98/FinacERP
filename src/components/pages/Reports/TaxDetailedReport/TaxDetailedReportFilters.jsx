// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxDetailedReport\TaxDetailedReportFilters.jsx

import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const TaxDetailedReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    taxOptions,
    supplierCustomerOptions, // Changed from ledgerOptions & cashOrPartyOptions
    voucherTypeOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end">
                <DateInput
                    label={t('reportFilters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    max={new Date().toISOString().split(("T")[0])}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('reportFilters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t("taxDetailedReport.filters.tax")}
                    name="taxId"
                    value={filters.taxId}
                    onChange={(value) => onFilterChange('taxId', value)}
                    options={taxOptions}
                    placeholder={t("All")}
                    searchPlaceholder={t("taxDetailedReport.filters.tax")}
                    clearable
                />

                <SearchableDropdown
                    label={t("taxDetailedReport.filters.VoucherType")}
                    name="voucherType"
                    value={filters.voucherType}
                    onChange={(value) => onFilterChange('voucherType', value)}
                    options={voucherTypeOptions}
                    placeholder={t("All")}
                    searchPlaceholder={t("taxDetailedReport.filters.VoucherType")}
                    clearable
                />

                <SearchableDropdown
                    label={t("Supplier / Customer")}
                    name="supplierOrCustomerId"
                    value={filters.supplierOrCustomerId}
                    onChange={(value) => onFilterChange('supplierOrCustomerId', value)}
                    options={supplierCustomerOptions}
                    placeholder={t("All")}
                    searchPlaceholder={t("Search Supplier/Customer...")}
                    clearable
                />
            </div>

            <div className="flex flex-wrap gap-2 mt-2 items-center">
                {/* Generate Report Button */}
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
                        t('reportFilters.generateReportBtn')
                    )}
                </button>

                {/* Reset Button */}
                <button
                    onClick={resetFilters}
                    disabled={loading}
                    className="h-7 px-3 flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    {t('reportFilters.resetBtn')}
                </button>
            </div>
        </div>
    );
};

export default TaxDetailedReportFilters;