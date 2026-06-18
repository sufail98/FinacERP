
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const JournalReportFilter = ({
  filters,
  onFilterChange,
  onGenerateReport,
  costCenterOptions,
  ledgerOptions,
  userOptions,
  loading,
  hasReportData,
  resetFilters
}) => {
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 mb-4 transition-colors">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <DateInput
         label={t('reportFilters.fromDate')}
          name="fromDate"
          value={filters.fromDate}
          onChange={(e, value) => onFilterChange('fromDate', value)}
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
           label={t("reportFilters.selectLedger")}
          name="ledgerId"
          value={filters.ledgerId}
          onChange={(value) => onFilterChange('ledgerId', value)}
          options={ledgerOptions}
          placeholder={t("reportFilters.selectLedger")}
          searchPlaceholder={t("reportFilters.selectLedger")}
          clearable
        />

        <SearchableDropdown
          label={t("reportFilters.selectUser")}
          name="userId"
          value={filters.userId}
          onChange={(value) => onFilterChange('userId', value)}
          options={userOptions}
          placeholder={t("reportFilters.selectUser")}
          searchPlaceholder={t("reportFilters.selectUser")}
          clearable
        />
         {generalSettings?.costCentre && !filters.allCostCentre&&(
          <SearchableDropdown
          label={t("reportFilters.selectCostCentre")}
          name="costCentreId"
          value={filters.costCentreId}
          onChange={(value) => onFilterChange('costCentreId', value)}
          options={costCenterOptions}
          placeholder={t("reportFilters.selectCostCentre")}
          searchPlaceholder={t("reportFilters.selectCostCentre")}
          clearable
        />
      )}

     
        {generalSettings?.costCentre && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allCostCentre"
            checked={filters.allCostCentre}
            onChange={(e) => onFilterChange('allCostCentre', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="detailed" className="text-sm dark:text-white">
            {t('journalReport.filters.allCostCentres')}
          </label>
        </div>
        )}
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
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onGenerateReport}
          disabled={loading}
          className="px-4 h-8 main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('reportFilters.generateReportBtn')}
        </button>
        <button
          onClick={resetFilters}
          disabled={loading}
          className="px-4 h-8 main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {t('reportFilters.resetBtn')}
        </button>
      </div>
    </div>
  );
};

export default JournalReportFilter;