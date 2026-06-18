// src/components/pages/Reports/ProductMovementReport/ProductMovementReportFilters.jsx
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const ProductMovementReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    productOptions,
    partyOptions,
    godownOptions,
    voucherTypeOptions,
    loading,
    hasReportData,
    resetFilters,
    dropdownLoading
}) => {
    const { t } = useTranslation();
    const { saleSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
                {/* From Date */}
                <div className="min-w-[130px]">
                    <DateInput
                        label={t('From Date')}
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={(e, value) => onFilterChange('fromDate', value)}
                        required
                        className='w-full'
                    />
                </div>

                {/* To Date */}
                <div className="min-w-[130px]">
                    <DateInput
                        label={t('To Date')}
                        name="toDate"
                        value={filters.toDate}
                        onChange={(e, value) => onFilterChange('toDate', value)}
                        required
                        min={filters.fromDate}
                        className='w-full'
                    />
                </div>

                {/* Product (Required) */}
                <div className="min-w-[200px] lg:col-span-2">
                    <SearchableDropdown
                        label={t("Product") + " *"}
                        name="productCode"
                        value={filters.productCode}
                        onChange={(value) => onFilterChange('productCode', value)}
                        options={productOptions}
                        placeholder={t("Select Product")}
                        searchPlaceholder={t("Search product...")}
                        loading={dropdownLoading}
                        required
                    />
                </div>

                {/* Voucher Type */}
                <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Voucher Type")}
                        name="voucherType"
                        value={filters.voucherType}
                        onChange={(value) => onFilterChange('voucherType', value)}
                        options={voucherTypeOptions}
                        loading={dropdownLoading}
                        placeholder={t("All")}
                    />
                </div>

                {/* Godown */}
                {saleSettings?.ActiveGodown === true && (
                    <div className="min-w-[140px]">
                        <SearchableDropdown
                            label={t("Godown")}
                            name="godownId"
                            value={filters.godownId}
                            onChange={(value) => onFilterChange('godownId', value)}
                            options={godownOptions}
                            placeholder={t("All")}
                            searchPlaceholder={t("Search...")}
                            loading={dropdownLoading}
                            clearable
                        />
                    </div>
                )}
            </div>

            {/* Row 2: Party and Buttons */}
            <div className="flex flex-wrap items-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Party */}
                <div className="w-[200px]">
                    <SearchableDropdown
                        label={t("Party")}
                        name="party"
                        value={filters.party}
                        onChange={(value) => onFilterChange('party', value)}
                        options={partyOptions}
                        placeholder={t("All Parties")}
                        searchPlaceholder={t("Search party...")}
                        loading={dropdownLoading}
                        clearable
                    />
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onGenerateReport}
                        disabled={loading || !filters.productCode}
                        className="h-[34px] px-4 main-bg dark:bg-blue-500 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            t('Generate Report')
                        )}
                    </button>

                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-[34px] px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
                        title={t('Reset')}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductMovementReportFilters;