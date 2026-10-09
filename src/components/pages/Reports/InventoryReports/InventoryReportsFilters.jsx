// src/components/pages/Reports/InventoryReports/InventoryReportsFilters.jsx
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw, AlertCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const InventoryReportsFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    groupOptions,
    productOptions,
    brandOptions,
    godownOptions,
    rackOptions,
    loading,
    hasReportData,
    resetFilters,
    reportType,
    reportConfig
}) => {
    const { t } = useTranslation();
    const { saleSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-2 dark:border-gray-700 transition-colors">
           

            {/* Row 1: Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
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
                <div className="min-w-[200px] lg:col-span-2">
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

                {/* Godown - Conditionally rendered */}
                {saleSettings?.ActiveGodown && (
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

            {/* Row 2: Additional Filters and Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Checkboxes */}
                <div className="flex items-center gap-4">
                    {/* Show Negative Stock */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={filters.showNegative}
                            onChange={(e) => onFilterChange('showNegative', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {t("Negative Stock")}
                        </span>
                    </label>

                    {/* Show Damaged Stock */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={filters.showDamaged}
                            onChange={(e) => onFilterChange('showDamaged', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {t("Damaged Stock")}
                        </span>
                    </label>

                    {/* Show Used Stock */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={filters.showUsedStock}
                            onChange={(e) => onFilterChange('showUsedStock', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t("Used Stock")}
                        </span>
                    </label>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Info Badge (optional - shows active filters count) */}
                {(filters.groupId !== null || 
                  filters.productCode !== null || 
                  filters.brandId !== null || 
                  filters.godownId !== null || 
                  filters.rackId !== null ||
                  filters.showNegative ||
                  filters.showDamaged ||
                  filters.showUsedStock) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{t('Filters Active')}</span>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-2">
                    {/* Generate Report Button */}
                    <button
                        onClick={onGenerateReport}
                        disabled={loading}
                        className={`h-8 px-4 text-white text-sm rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-all main-bg hover:shadow-md`}
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                {t('Loading...')}
                            </>
                        ) : (
                            <>
                                <reportConfig.icon className="w-3.5 h-3.5 " />
                                {t('Generate Report')}
                            </>
                        )}
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        disabled={loading}
                        className="h-8 px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5 transition-all hover:shadow-md"
                        title={t('Reset Filters')}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {t('Reset')}
                    </button>
                </div>
            </div>

            {/* Report Type Info */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {reportType === 'FAST_MOVING' && t('Shows products with high turnover rate')}
                    {reportType === 'SLOW_MOVING' && t('Shows products with low turnover rate')}
                    {reportType === 'MINIMUM_LEVEL' && t('Shows products at or below minimum stock level')}
                    {reportType === 'MAXIMUM_LEVEL' && t('Shows products at or above maximum stock level')}
                    {reportType === 'REORDER_LEVEL' && t('Shows products at or below reorder level')}
                    {reportType === 'UNUSED_STOCK' && t('Shows products with no recent movement')}
                </p>
            </div>
        </div>
    );
};

export default InventoryReportsFilters;