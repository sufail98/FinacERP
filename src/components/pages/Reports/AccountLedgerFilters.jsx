import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { Filter, RefreshCw, Download, Printer } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const AccountLedgerFilters = ({
    filters,
    onFilterChange,
    onGenerateReport,
    costCenterOptions,
    acGroupOptions,
    partyOptions = [],
    loading,
    partyLoading = false,
    hasReportData,
    resetFilters,
    fromPage,
    type
}) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    return (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-lg  p-2  transition-colors ">

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

                {/* Party Selection Dropdown - Only for Customer & Supplier Page */}
                {fromPage === 'customer&Supplier' && (
                    <SearchableDropdown
                        label={type === 'customer' ? t("Select Customer") || "Select Customer" : t("Select Supplier") || "Select Supplier"}
                        name="partyId"
                        value={filters.partyId}
                        onChange={(value) => onFilterChange('partyId', value)}
                        options={partyOptions}
                        placeholder={type === 'customer' ? "Select Customer" : "Select Supplier"}
                        searchPlaceholder={type === 'customer' ? "Search Customer..." : "Search Supplier..."}
                        clearable
                        isLoading={partyLoading}
                    />
                )}

                {!(fromPage === 'customer&Supplier') && (
                    <SearchableDropdown
                        label={fromPage === 'accountLedgerreport' ? t("recieptVoucher.form.placeholders.selectLedger") : t("accountGroups.heading")}
                        name="groupId"
                        value={filters.groupId}
                        onChange={(value) => onFilterChange('groupId', value)}
                        options={acGroupOptions}
                        placeholder={t("accountGroupsModal.fields.groupUnder")}
                        searchPlaceholder={t("accountGroupsModal.fields.groupUnder")}
                        required
                        clearable
                    />
                )}

                {generalSettings?.costCentre && (
                    <SearchableDropdown
                        label={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                        name="costCentreId"
                        value={filters.costCentreId}
                        onChange={(value) => onFilterChange('costCentreId', value)}
                        options={costCenterOptions}
                        placeholder={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                        searchPlaceholder={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                        clearable
                    />
                )}

                <button
                    onClick={onGenerateReport}
                    disabled={loading || partyLoading}
                    className="px-4 h-8 text-center main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center justify-center  gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('reportFilters.generateReportBtn')}
                </button>

                <button
                    onClick={resetFilters}
                    disabled={loading || partyLoading}
                    className="px-4 h-8  main-bg dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:main-bg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('reportFilters.resetBtn')}
                </button>
            </div>
        </div>
    );
};

export default AccountLedgerFilters;