// src/components/pages/Reports/SalesReport/SalesReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const SalesReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    customerOptions,
    costCentreOptions,
    batchOptions,
    taxTypeOptions,
    conditionOptions,
    paymentModeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    const isSummaryMode = filters.reportMode === 'Summary';

    return (
        <div className="bg-white dark:bg-[#1e1e1e]  mb-3 transition-colors">

           

            {/* Primary Filters */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1 mb-1`}>
                <DateInput
                    label={t('salesReport.filters.fromDate')}
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e, value) => onFilterChange('fromDate', value)}
                    required
                    className='w-full'
                />

                <DateInput
                    label={t('salesReport.filters.toDate')}
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e, value) => onFilterChange('toDate', value)}
                    required
                    min={filters.fromDate}
                    className='w-full'
                />

                <SearchableDropdown
                    label={t('salesReport.filters.customer')}
                    name="ledgerId"
                    value={filters.ledgerId || null}
                    onChange={(value) => onFilterChange('ledgerId', value || null)}
                    options={customerOptions}
                    placeholder={t('salesReport.filters.allCustomers')}
                    searchPlaceholder={t('salesReport.filters.searchCustomer')}
                    clearable
                />

                <SearchableDropdown
                    label={t('salesReport.filters.condition')}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value)}
                    options={conditionOptions}
                    placeholder={t('salesReport.filters.selectCondition')}
                />


                {generalSettings?.costCentre && (
                    <SearchableDropdown
                        label={t('salesReport.filters.costCentre')}
                        name="costCentreId"
                        value={filters.costCentreId || null}
                        onChange={(value) => onFilterChange('costCentreId', value || null)}
                        options={costCentreOptions}
                        placeholder={t('salesReport.filters.allCostCentres')}
                        searchPlaceholder={t('salesReport.filters.search')}
                        clearable
                    />
                )}
                  <SearchableDropdown
                    label={t('salesReport.filters.taxType')}
                    name="taxType"
                    value={filters.taxType}
                    onChange={(value) => onFilterChange('taxType', value)}
                    options={taxTypeOptions}
                    placeholder={t('salesReport.filters.selectTaxType')}
                />

                <SearchableDropdown
                    label={t('salesReport.filters.batch')}
                    name="batchId"
                    value={filters.batchId || null}
                    onChange={(value) => onFilterChange('batchId', value || null)}
                    options={batchOptions}
                    placeholder={t('salesReport.filters.allBatches')}
                    searchPlaceholder={t('salesReport.filters.search')}
                    clearable
                />

                <SearchableDropdown
                    label={t('salesReport.filters.paymentMode')}
                    name="paymentMode"
                    value={filters.paymentMode}
                    onChange={(value) => onFilterChange('paymentMode', value)}
                    options={paymentModeOptions}
                    placeholder={t('salesReport.filters.allPaymentModes')}
                    clearable
                />

                <DateInput
                    label={t('salesReport.filters.dueOn')}
                    name="dueOn"
                    value={filters.dueOn || ''}
                    onChange={(e, value) => onFilterChange('dueOn', value || null)}
                    className='w-full'
                />
                 {/* Report Mode Toggle */}
            <div className="flex items-end gap-6  border-gray-200 dark:border-gray-700">
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

            </div>

          
            {/* Checkboxes and Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">


                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('salesReport.filters.loading')}
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                {t('salesReport.filters.show')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('salesReport.filters.reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesReportFilter;