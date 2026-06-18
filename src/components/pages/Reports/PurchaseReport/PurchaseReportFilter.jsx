    // src/components/pages/Reports/PurchaseReport/PurchaseReportFilter.jsx
import React from 'react';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const PurchaseReportFilter = ({
    filters,
    onFilterChange,
    onGenerateReport,
    supplierOptions,
    costCentreOptions,
    conditionOptions,
    paymentModeOptions,
    loading,
    resetFilters
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-1 mb-1 dark:border-gray-700 transition-colors">
            
            {/* Row 1: Dates and Main Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
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

                {/* Supplier Dropdown */}
                <SearchableDropdown
                    label={t('Supplier')}
                    name="ledgerId"
                    value={filters.ledgerId || null}
                    onChange={(value) => onFilterChange('ledgerId', value || 0)}
                    options={supplierOptions}
                    placeholder={t('All Suppliers')}
                    searchPlaceholder={t('Search Supplier...')}
                    clearable
                />

                {generalSettings?.costCentre && (
                    <>
                        {/* Cost Centre Dropdown */}
                        <SearchableDropdown
                            label={t('Cost Centre')}
                            name="costCentreId"
                            value={filters.costCentreId || null}
                            onChange={(value) => onFilterChange('costCentreId', value || 0)}
                            options={costCentreOptions}
                            placeholder={t('All Cost Centres')}
                            searchPlaceholder={t('Search Cost Centre...')}
                            clearable
                        />
                    </>
                )}

                {/* Condition Dropdown */}
                <SearchableDropdown
                    label={t('Condition')}
                    name="condition"
                    value={filters.condition}
                    onChange={(value) => onFilterChange('condition', value)}
                    options={conditionOptions}
                    placeholder={t('All')}
                />
                     {/* Payment Mode Dropdown */}
                    <div className="w-40">
                        <SearchableDropdown
                            label={t('Payment Mode')}
                            name="paymentMode"
                            value={filters.paymentMode}
                            onChange={(value) => onFilterChange('paymentMode', value)}
                            options={paymentModeOptions}
                            placeholder={t('All')}
                        />
                    </div>

                    {/* Checkboxes */}
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
                      <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors justify-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm justify-center font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
            </div>

          
        </div>
    );
};

export default PurchaseReportFilter;