import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './GodownTransferTable'
import PropTypes from 'prop-types';
import DateInput from '@/components/elements/theme/DateInput'

const FormSectionMain = ({
  existingInvoiceNo,
  time,
  invoiceId,
  formData,
  setFormData,
  Fromgodowns,
  Togodowns,
  editMode,
  rows,
  setRows,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  approveMode,
  branches,
  currencies
}) => {

  const { t } = useTranslation();
  const { generalSettings, saleSettings } = useSelector((state) => state.settings);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const { currentCurrency: currentCurrencyFromStore,currentFinancialYear } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  return (
    <div className='p-2 space-y-0.5'>
      {/* Primary Fields - Always Visible */}
      <div className="border-b pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 lg:gap-2">
          <div>
            <TextInput
              label={t('stockTransfer.form.label.voucherNo')}
              value={editMode ? existingInvoiceNo : invoiceId}
              onChange={handleInputChange}
              required
              className=' text-red-600 font-bold'
              readOnly={true}
            />
            {/* Date */}
            <DateInput
              timeText={time}
              label={t('salesInvoice.form.label.formHeaderSection.date')}
              format={generalSettings.dateformat}
              value={formData.date}
              name='date'
              onChange={handleInputChange}
              className="w-full"
              required
              error={errors.date}
              autoFocus
              min={currentFinancialYear?.fromDate}
              max={currentFinancialYear?.toDate}
            />
          </div>
          <div>
            {/* <h1 className='font-bold'>{t('stockTransfer.form.label.transferFrom')}</h1> */}
            <SearchableDropdown
              name="branchIdFrom"
              label={t('stockTransfer.form.label.fromBranch')}
              options={branches?.map((data) => ({
                value: data.branchId,
                label: data.branchCode,
              }))}
              value={(formData.branchIdFrom)}
              onChange={(value) => handleDropdownChange('branchIdFrom', value)}
              placeholder={t('stockTransfer.form.label.fromBranch')}
              searchPlaceholder={t('stockTransfer.form.label.fromBranch')}
              clearable={true}
              className="w-full"
              required
              error={errors.branchIdFrom}

            />
            {saleSettings?.ActiveGodown === true && (
              <SearchableDropdown
                name="godownIdFrom"
                label={t('stockTransfer.form.label.fromGodown')}
                options={Fromgodowns?.map((data) => ({
                  value: data.GodownId,
                  label: data.GodownName,
                }))}
                value={formData.godownIdFrom}
                onChange={(value) => handleDropdownChange('godownIdFrom', value)}
                placeholder={t('stockTransfer.form.label.fromGodown')}
                searchPlaceholder={t('stockTransfer.form.label.fromGodown')}
                clearable={true}
                className="w-full"
                loading={loading.godowns}
                required
                error={errors.godownIdFrom}
              />
            )}
          </div>
          <div>
            {/* <h1 className='font-bold'>{t('stockTransfer.form.label.transferTo')}</h1> */}
            <SearchableDropdown
              name="branchIdTo"
              label={t('stockTransfer.form.label.toBranch')}
              options={branches?.map((data) => ({
                value: data.branchId,
                label: data.branchCode,
              }))}
              value={formData.branchIdTo}
              onChange={(value) => handleDropdownChange('branchIdTo', value)}
              placeholder={t('stockTransfer.form.label.toBranch')}
              searchPlaceholder={t('stockTransfer.form.label.toBranch')}
              clearable={true}
              className="w-full"
              required
              error={errors.branchIdTo}
            />
            {saleSettings?.ActiveGodown === true && (
              <SearchableDropdown
                name="godownIdTo"
                label={t('stockTransfer.form.label.toGodown')}
                options={Togodowns?.map((data) => ({
                  value: data.GodownId,
                  label: data.GodownName,
                }))}
                value={formData.godownIdTo}
                onChange={(value) => handleDropdownChange('godownIdTo', value)}
                placeholder={t('stockTransfer.form.label.toGodown')}
                searchPlaceholder={t('stockTransfer.form.label.toGodown')}
                clearable={true}
                className="w-full"
                required
                error={errors.godownIdTo}
              />
            )}
          </div>


        </div>

      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
          onClick={() => setCurrencyModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.currencyLabel')}: {currentCurrencyFromStore?.currencyName || "Select Currency"}
        </p>
      </div>

      {/* Sales Invoice Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <SalesInvoiceTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}
          approveMode={approveMode}
        />
      </div>

    </div>
  )
}

export default FormSectionMain


FormSectionMain.propTypes = {
  existingInvoiceNo: PropTypes.string,
  time: PropTypes.string,
  invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  formData: PropTypes.shape({
    date: PropTypes.instanceOf(Date),
    employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    costCentreId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    RefNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    refDate: PropTypes.instanceOf(Date),
    BatchId: PropTypes.string,
    orderMasterId: PropTypes.string,
    orderRefNo: PropTypes.string,
    orderRefDate: PropTypes.instanceOf(Date),
    pricingLevelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ledgerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    AgainstNo: PropTypes.string,
    quotationMasterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    quotationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    creditPeriod: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    dueDate: PropTypes.instanceOf(Date),
    deliveryDate: PropTypes.instanceOf(Date),
    salesAccount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    salesAccountName: PropTypes.string,
    proformaMasterId: PropTypes.string,
    deliveryNoteMasterId: PropTypes.string,
    customerName: PropTypes.string,
    CustomerAddress: PropTypes.string,
    CustomerPhone: PropTypes.string,
    customerVATNo: PropTypes.string,
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
  employees: PropTypes.arrayOf(
    PropTypes.shape({
      employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      employeeName: PropTypes.string.isRequired,
    })
  ),
  fetchEmployees: PropTypes.func.isRequired,
  loadSalesModeData: PropTypes.func,
  costCenters: PropTypes.arrayOf(
    PropTypes.shape({
      costCentreId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      CostCentre: PropTypes.string.isRequired,
    })
  ),
  customers: PropTypes.arrayOf(
    PropTypes.shape({
      ledgerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      ledgerName: PropTypes.string.isRequired,
      openingBalance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      StreetName: PropTypes.string,
      CityName: PropTypes.string,
      Country: PropTypes.string,
      tinNumber: PropTypes.string,
    })
  ),
  pricingLevel: PropTypes.arrayOf(
    PropTypes.shape({
      PricingLevelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      PricingLevelName: PropTypes.string.isRequired,
    })
  ),
  fetchCustomer: PropTypes.func.isRequired,
  godowns: PropTypes.arrayOf(
    PropTypes.shape({
      GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      GodownName: PropTypes.string.isRequired,
    })
  ),
  editMode: PropTypes.bool,
  rows: PropTypes.array.isRequired,
  setRows: PropTypes.func.isRequired,
  loading: PropTypes.shape({
    employees: PropTypes.bool,
    costCenters: PropTypes.bool,
    customers: PropTypes.bool,
    pricingLevel: PropTypes.bool,
    godowns: PropTypes.bool,
  }),
};

FormSectionMain.defaultProps = {
  existingInvoiceNo: '',
  time: '',
  invoiceId: '',
  employees: [],
  costCenters: [],
  customers: [],
  pricingLevel: [],
  godowns: [],
  editMode: false,
  loading: {
    employees: false,
    costCenters: false,
    customers: false,
    pricingLevel: false,
    godowns: false,
  },
};