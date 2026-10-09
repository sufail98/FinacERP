import React from 'react';
import { X } from 'lucide-react';
import TextInput from '@/components/elements/theme/TextInput';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import AddNewBtn from '@/components/common/AddNewBtn';
import usePrivileges from '@/lib/hooks/usePrivileges';

const AdditionalFieldsModal = ({
  open,
  onClose,
  formData,
  handleInputChange,
  handleDropdownChange,
  employees,
  costCenters,
  batchOptions,
  pricingLevel,
  loading,
  generalSettings,
  t,
  setEmployeeModalOpen,
  TextInput,
  SearchableDropdown,
  DateInput,
  AddNewBtn,
  Plus,
  batches
}) => {
  const { hasAccess: hasTransactionBatchAccess } = usePrivileges("Transaction Batch");
  const { hasAccess: hasEmployeeAccess, } = usePrivileges("Employee");

  if (!open) return null;


  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto
                    border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-gray-900/50 transition-colors">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1e1e1e] 
                      border-b border-gray-200 dark:border-gray-700 
                      px-6 py-4 flex justify-between items-center z-10 transition-colors">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Additional Fields</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#242424] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-1 space-y-1 grid grid-cols-3 gap-1">
          {generalSettings?.costCentre && (
            <SearchableDropdown
              name="costCentreId"
              label={t('salesInvoice.form.label.formHeaderSection.costCentreId')}
              options={costCenters?.map((data) => ({
                value: data.costCentreId,
                label: data.CostCentre,
              }))}
              value={formData.costCentreId}
              onChange={(value) => handleDropdownChange('costCentreId', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.costCentreId')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.costCentreId')}
              clearable={true}
              className="w-full"
              loading={loading.costCenters}
            />
          )}

          {/* Date Fields Row */}
          <TextInput
            name="creditPeriod"
            label={t('salesInvoice.form.label.formHeaderSection.creditPeriod')}
            type="number"
            value={formData.creditPeriod}
            onChange={handleInputChange}
            placeholder={t('salesInvoice.form.placeholders.formHeaderSection.creditPeriod')}
            className='w-full'
          />
          <TextInput
            name="RefNo"
            label={t('salesInvoice.form.label.formHeaderSection.RefNo')}
            type="text"
            value={formData.RefNo}
            onChange={handleInputChange}
            className="w-full"
            placeholder={t('salesInvoice.form.placeholders.formHeaderSection.RefNo')}
          />

          <DateInput
            label={t('salesInvoice.form.label.formHeaderSection.refDate')}
            format={generalSettings.dateformat}
            value={formData.refDate}
            name='refDate'
            onChange={handleInputChange}
            className="w-full"
          />

          {hasTransactionBatchAccess && (
            <SearchableDropdown
              name="BatchId"
              label={t('salesInvoice.form.label.formHeaderSection.BatchId')}
              options={batches.map(batch => ({
                value: batch.batchid,
                label: batch.batchname
              }))}
              value={formData.BatchId}
              onChange={(value) => handleDropdownChange('BatchId', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.BatchId')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.BatchId')}
              clearable={true}
              className="w-full"
            />
          )}
          <SearchableDropdown
            name="pricingLevelId"
            label={t('salesInvoice.form.label.formHeaderSection.pricingLevelId')}
            options={pricingLevel?.map((data) => ({
              value: data.PricingLevelId,
              label: data.PricingLevelName,
            }))}
            value={formData.pricingLevelId}
            onChange={(value) => handleDropdownChange("pricingLevelId", value)}
            placeholder={t('salesInvoice.form.placeholders.formHeaderSection.pricingLevelId')}
            searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.pricingLevelId')}
            clearable
            loading={loading.pricingLevel}
            className="w-full"
          />
          {hasEmployeeAccess && (
            <div className='flex gap-0.5 lg:gap-1 items-end'>
              <div className='flex-1 min-w-0'>
                <SearchableDropdown
                  name="employeeId"
                  label={t('salesInvoice.form.label.formHeaderSection.salesMan')}
                  options={employees?.map((data) => ({
                    value: data.employeeId,
                    label: data.employeeName,
                  }))}
                  value={formData.employeeId}
                  onChange={(value) => handleDropdownChange('employeeId', value)}
                  placeholder={t('salesInvoice.form.placeholders.formHeaderSection.salesMan')}
                  searchPlaceholder="Sales man..."
                  clearable={true}
                  className='w-full mb-0.5'
                  loading={loading.employees}

                />
              </div>
              <div className='mb-0.5 flex-shrink-0'>
                <AddNewBtn
                  icon={Plus}
                  onClick={() => setEmployeeModalOpen(true)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-[#1a1a1a] 
                      border-t border-gray-200 dark:border-gray-700 
                      px-6 py-2 flex justify-end gap-3 transition-colors">
          <button
            onClick={onClose}
            className="px-6 py-1 bg-[#2b216a] dark:bg-[#3d2f8a] 
                     text-white rounded-lg 
                     hover:bg-[#211952] dark:hover:bg-[#2b216a] 
                     transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdditionalFieldsModal;