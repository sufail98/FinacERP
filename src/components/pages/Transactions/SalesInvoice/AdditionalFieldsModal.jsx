import React from 'react';
import { X } from 'lucide-react';
import usePrivileges from '@/lib/hooks/usePrivileges';

const AdditionalFieldsModal = ({
  open,
  onClose,
  formData,
  handleInputChange,
  handleDropdownChange,
  employees,
  costCenters,
  batches,
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
  editMode = false,
}) => {
  const { hasAccess: hasTransactionBatchAccess } = usePrivileges("Transaction Batch");
  const { hasAccess: hasEmployeeAccess, } = usePrivileges("Employee");

  if (!open) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center z-99999999999999999">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl dark:shadow-gray-900/50 
                    w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto
                    border border-gray-200 dark:border-gray-700 transition-colors">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1e1e1e] 
                      border-b border-gray-200 dark:border-gray-700 
                      px-6 py-1 flex items-center justify-between z-10 transition-colors">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {t?.('salesInvoice.form.additionalFields.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#242424] 
                     rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 space-y-1">
          {/* Sales Person Section */}
          {hasEmployeeAccess && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Sales Information
              </h3>

              <div className="flex gap-1 items-end">
                <div className="flex-1">
                  <SearchableDropdown
                    name="employeeId"
                    label={t?.('salesInvoice.form.label.formHeaderSection.salesMan') || 'Sales Person'}
                    options={employees?.map((data) => ({
                      value: data.employeeId,
                      label: data.employeeName,
                    }))}
                    value={formData.employeeId}
                    onChange={(value) => handleDropdownChange('employeeId', value)}
                    placeholder="Select sales person..."
                    searchPlaceholder="Search sales person..."
                    clearable={true}
                    className="w-full"
                    loading={loading?.employees}
                    readOnly={editMode}
                  />
                </div>
                <div className="flex-shrink-0">
                  <AddNewBtn
                    icon={Plus}
                    onClick={() => {
                      setEmployeeModalOpen(true);
                      onClose();
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reference & Order Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Reference & Order Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalSettings?.costCentre && (
                <SearchableDropdown
                  name="costCentreId"
                  label={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                  options={costCenters?.map((data) => ({
                    value: data.costCentreId,
                    label: data.CostCentre,
                  }))}
                  value={formData.costCentreId}
                  onChange={(value) => handleDropdownChange('costCentreId', value)}
                  placeholder={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                  searchPlaceholder={t?.('salesInvoice.form.label.formHeaderSection.costCentreId')}
                  clearable={true}
                  className="w-full"
                  loading={loading?.costCenters}
                  readOnly={editMode}
                />
              )}

              <TextInput
                name="RefNo"
                label={t?.('salesInvoice.form.label.formHeaderSection.RefNo') || 'Reference No'}
                type="text"
                value={formData.RefNo}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter reference number..."
                readOnly={editMode}
              />

              <DateInput
                label={t?.('salesInvoice.form.label.formHeaderSection.refDate') || 'Reference Date'}
                format={generalSettings?.dateformat}
                value={formData.refDate}
                name="refDate"
                onChange={handleInputChange}
                className="w-full"
                readOnly={editMode}
              />
              {hasTransactionBatchAccess && (

                <SearchableDropdown
                  name="BatchId"
                  label={t?.('salesInvoice.form.label.formHeaderSection.BatchId') || 'Batch'}
                  options={batches.map(batch => ({
                    value: batch.batchid,
                    label: batch.batchname
                  }))}
                  value={formData.BatchId}
                  onChange={(value) => handleDropdownChange('BatchId', value)}
                  placeholder="Select batch..."
                  searchPlaceholder="Search batch..."
                  clearable={true}
                  className="w-full"
                  readOnly={editMode}
                />
              )}


              <TextInput
                name="orderRefNo"
                label={t?.('salesInvoice.form.label.formHeaderSection.orderRefNo') || 'Order Ref No'}
                value={formData.orderRefNo}
                onChange={handleInputChange}
                placeholder="Enter order reference..."
                className="w-full"
                readOnly={editMode}
              />

              <DateInput
                label={t?.('salesInvoice.form.label.formHeaderSection.orderRefDate') || 'Order Ref Date'}
                format={generalSettings?.dateformat}
                value={formData.orderRefDate}
                name="orderRefDate"
                onChange={handleInputChange}
                className="w-full"
                readOnly={editMode}
              />
            </div>
          </div>

          {/* Pricing & Payment Terms */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Pricing & Payment Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SearchableDropdown
                name="pricingLevelId"
                label={t?.('salesInvoice.form.label.formHeaderSection.pricingLevelId') || 'Pricing Level'}
                options={pricingLevel?.map((data) => ({
                  value: data.PricingLevelId,
                  label: data.PricingLevelName,
                }))}
                value={formData.pricingLevelId}
                onChange={(value) => handleDropdownChange('pricingLevelId', value)}
                placeholder="Select pricing level..."
                searchPlaceholder="Search pricing level..."
                clearable
                className="w-full"
                loading={loading?.pricingLevel}
                readOnly={editMode}
              />

              <TextInput
                name="creditPeriod"
                label={t?.('salesInvoice.form.label.formHeaderSection.creditPeriod') || 'Credit Period (Days)'}
                type="number"
                value={formData.creditPeriod}
                onChange={handleInputChange}
                placeholder="Enter credit period..."
                className="w-full"
                readOnly={editMode}
              />

              <DateInput
                label={t?.('salesInvoice.form.label.formHeaderSection.dueDate') || 'Due Date'}
                format={generalSettings?.dateformat}
                value={formData.dueDate}
                name="dueDate"
                onChange={handleInputChange}
                className="w-full"
                readOnly={editMode}
              />

              <DateInput
                label={t?.('salesInvoice.form.label.formHeaderSection.deliveryDate') || 'Delivery Date'}
                format={generalSettings?.dateformat}
                value={formData.deliveryDate}
                name="deliveryDate"
                onChange={handleInputChange}
                className="w-full"
                readOnly={editMode}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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