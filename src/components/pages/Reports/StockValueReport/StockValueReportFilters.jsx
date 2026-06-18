// src/components/pages/Reports/StockValueReport/StockValueReportFilters.jsx
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const StockValueReportFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    groupOptions,
    productOptions,
    brandOptions,
    taxOptions,
    taxTypeOptions,
    godownOptions,
    rackOptions,
    loading,
    hasReportData,
    resetFilters
}) => {
    const { t } = useTranslation();
    const {saleSettings}=useSelector((state)=>state.settings)
    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-700 transition-colors">
            {/* Row 1: Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                {/* Product Group */}
                <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Product Group")}
                        name="groupId"
                        value={filters.groupId}
                        onChange={(value) => onFilterChange('groupId', value)}
                        options={groupOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                    />
                </div>

                {/* Product */}
                <div className="min-w-[180px]">
                    <SearchableDropdown
                        label={t("Product")}
                        name="productCode"
                        value={filters.productCode}
                        onChange={(value) => onFilterChange('productCode', value)}
                        options={productOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search product...")}
                    />
                </div>

                {/* Brand */}
                <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Brand")}
                        name="brandId"
                        value={filters.brandId}
                        onChange={(value) => onFilterChange('brandId', value)}
                        options={brandOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                    />
                </div>

                {/* Tax */}
                <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Tax")}
                        name="taxId"
                        value={filters.taxId}
                        onChange={(value) => onFilterChange('taxId', value)}
                        options={taxOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                    />
                </div>

                {/* Tax Type */}
                <div className="min-w-[120px]">
                    <SearchableDropdown
                        label={t("Tax Type")}
                        name="taxType"
                        value={filters.taxType}
                        onChange={(value) => onFilterChange('taxType', value)}
                        options={taxTypeOptions}
                        placeholder={t("All")}
                    />
                </div>

                {/* Godown */}
              {saleSettings?.ActiveGodown&&(
                  <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Godown")}
                        name="godownId"
                        value={filters.godownId}
                        onChange={(value) => onFilterChange('godownId', value)}
                        options={godownOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                    />
                </div>
              )}

                {/* Rack */}
                <div className="min-w-[140px]">
                    <SearchableDropdown
                        label={t("Rack")}
                        name="rackId"
                        value={filters.rackId}
                        onChange={(value) => onFilterChange('rackId', value)}
                        options={rackOptions}
                        placeholder={t("All")}
                        searchPlaceholder={t("Search...")}
                    />
                </div>
            </div>

            {/* Row 2: Checkboxes and Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Checkboxes */}
                <div className="flex items-center gap-4">
                    {/* Zero Stock */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.zeroStock}
                            onChange={(e) => onFilterChange('zeroStock', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("Zero Stock")}
                        </span>
                    </label>

                    {/* Negative Stock */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.negativeStock}
                            onChange={(e) => onFilterChange('negativeStock', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t("Negative Stock")}
                        </span>
                    </label>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    {/* Generate Report Button */}
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className="h-8 px-4 main-bg dark:bg-blue-500 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
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

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-8 px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5"
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

export default StockValueReportFilters;