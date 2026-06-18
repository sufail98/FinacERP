import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import { useSelector } from 'react-redux'
import { PencilIcon, Plus } from 'lucide-react'

import SelectedSalesACModal from './SelectedSalesACModal'

import SalesModeModal from './SalesModeModal'

import AddNewBtn from '@/components/common/AddNewBtn'
import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './PurchaseOrderTable'
import DateInput from '@/components/elements/theme/DateInput'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'
import AddCustomerModal from '@/components/elements/theme/AddCustomerModal'

const FormSectionMain = ({
  existingInvoiceNo,
  invoiceId,
  formData,
  setFormData,
  fetchEmployees,
  costCenters,
  customers,
  fetchCustomer,
  editMode,
  rows,
  setRows,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  batches,

  billingAddress,
  setBlillingAddress,
  currentledgerBalance,
  setCurrentLedgerBalance,
  otherChargeLedgers,
  currency
}) => {

  const { t } = useTranslation();
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const { generalSettings, financeSettings } = useSelector((state) => state.settings);
  const [salesAcModalOpen, setSalesAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [shippingAdderess, setShippingAddress] = useState(null);
  const [salesAccounts, setSalesAccounts] = useState([]);
  const [updateCustomerId, setUpdateCustomerId] = useState(null);
  const [quotationData, setQuotationData] = useState([])


  const { currentCurrency: currentCurrencyFromStore, setCurrency, currentFinancialYear } = useAuth();
  const { selectedBranchId, currentCurrency } = useAuth()





  const fetchLedgerBalance = async (ledgerId) => {
    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      setCurrentLedgerBalance(res?.data?.data?.currentbal)
    } catch (error) {
      console.error(error);
    }
  }



  const fetchCustomerData = async (ledgerId) => {
    setLoadingCustomer(true);
    try {
      const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId}`);

      if (response.data) {
        const data = response.data.data;

        const defaultShipping = Array.isArray(data?.shipping_address)
          ? data.shipping_address.find(addr => addr?.Isdefault === true)
          : null;

        setUpdateCustomerId(data?.ledgerId);

        setShippingAddress({
          name: data?.ledgerName || '',
          email: data?.email || '',
          phoneNo: data?.phoneNo || '',
          shippingAddress: defaultShipping || {},
          vatNo: data?.tinNumber || ''
        });

        setBlillingAddress({
          name: data?.ledgerName || '',
          email: data?.email || '',
          phoneNo: data?.phoneNo || '',
          vatNo: data?.tinNumber || '',
          address: data?.address || ''
        });

        setFormData((prev) => ({
          ...prev,
          partyName: data?.ledgerName || '',
          partyAddress: data?.address || '',
          partyMobile: data?.phoneNo || '',
          partyVatNo: data?.tinNumber || '',
        }));
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoadingCustomer(false);
    }
  };


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

  const currentLedgerIdRef = useRef(null);
  const handleDropdownChange = (name, value) => {
    if (name === 'ledgerId') {
      currentLedgerIdRef.current = value;
      fetchLedgerBalance(value);
      fetchQuotationData(value);
      fetchCustomerData(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const fetchQuotationData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-order-quotation-list', { branchId: selectedBranchId, ledgerId: ledgerId, orderMasterId: null });

      if (!response.data.error) {
        (response.data);
        setQuotationData(response.data.data)
      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);
    }
  }


  return (
    <div className='p-2 space-y-0.5 bg-primary dark:bg-primary'>
      {/* Main Grid - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-1 lg:gap-2 w-full border-b border-themed dark:border-themed pb-1">

        {/* LEFT SECTION */}
        <div className="flex flex-col lg:flex-row gap-1">
          <div className='w-full space-y-0.5'>

            {/* Invoice Header Row */}
            <div className='flex flex-col sm:flex-row gap-0.5 lg:gap-1'>
              <TextInput
                label={t('purchaseOrder.form.label.purchaseOrderNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                required
                className='w-full text-red-600 dark:text-red-400 font-bold'
                readOnly={true}
              />

              <div className='w-full'>

                {errors && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.date}</p>}
                <DateInput
                  label={t('physicalStock.form.label.date')}
                  value={formData.date}
                  name='date'
                  onChange={handleInputChange}
                  className="w-full"
                  format={generalSettings.dateformat}
                  error={errors.date}
                  min={currentFinancialYear?.fromDate}
                  max={currentFinancialYear?.toDate}
                />
              </div>

              <div>

                <DateInput
                  label={t('salesInvoice.form.label.formHeaderSection.dueDate')}
                  value={formData.dueDate}
                  name='dueDate'
                  onChange={handleInputChange}
                  className="w-full"
                  format={generalSettings.dateformat}
                />
              </div>
            </div>

            {/* Dynamic Grid Section */}
            <div className={`grid gap-1 lg:gap-1.5 ${generalSettings?.costCentre
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2'
              }`}>
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
                  error={errors.costCenterId}
                  clearable={true}
                  className="w-full"
                  loading={loading.costCenters}
                />
              )}

              <TextInput
                name="partyRefNo"
                label={t('salesInvoice.form.label.formHeaderSection.RefNo')}
                type="number"
                value={formData.partyRefNo}
                onChange={handleInputChange}
                className="w-full"
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.RefNo')}
              />


              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.refDate')}
                value={formData.partyRefDate}
                name='partyRefDate'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
              />

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
                error={errors.batch}
                clearable={true}
                className="w-full"
              />


            </div>


          </div>
        </div>

        {/* RIGHT SECTION - Address & Dates */}
        <div className="space-y-1.5 lg:space-y-2">
          <div className='flex gap-1 lg:gap-1.5 items-end w-full sm:col-span-2'>
            <div className='flex-1 min-w-0'>
              <CustomerDropdown
                label={t('purchaseOrder.form.label.selectSupplier')}
                name="ledgerId"
                value={formData.ledgerId}
                onChange={(value) => handleDropdownChange("ledgerId", value)}
                options={customers?.map((data) => ({
                  value: data.ledgerId,
                  label: data.ledgerName,
                  balance: data.openingBalance,
                  address: `${data.StreetName || ""} ${data.CityName || ""} ${data.Country || ""}`,
                  vatNo: data.tinNumber,
                }))}
                placeholder={t('purchaseOrder.form.label.selectSupplier')}
                searchPlaceholder={t('purchaseOrder.form.label.selectSupplier')}
                clearable
                required
                loading={loading.customers}
                error={errors.ledgerId}
              />
            </div>
            <div className='flex-shrink-0'>
              <AddNewBtn
                icon={Plus}
                onClick={() => setCustomerModalOpen(true)}
              />
            </div>
          </div>
          {formData?.ledgerId ? (
            loadingCustomer ? (
              <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed dark:border-themed rounded-xl bg-secondary dark:bg-secondary text-muted dark:text-muted font-bold text-xs lg:text-sm'>
                <svg
                  className="animate-spin h-5 w-5 mb-1 text-blue-600 dark:text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3 bg-secondary dark:bg-secondary p-3 rounded-lg border border-themed dark:border-themed'>
                {/* Billing Address */}
                <div className='text-primary dark:text-primary'>
                  <h1 className='text-red-600 dark:text-red-400 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                    {t('purchaseOrder.form.label.addressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-red-700 dark:hover:text-red-300"
                      onClick={() => setBilligAddressOpen(true)}
                    />
                  </h1>
                  <h2 className='font-bold text-xs lg:text-sm text-primary dark:text-primary'>{billingAddress?.name}</h2>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>{billingAddress?.phoneNo}</p>
                  <p className='text-[11px] lg:text-xs break-words text-secondary dark:text-secondary'>{billingAddress?.address}</p>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>
                    {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo}
                  </p>
                  <p className={`text-xs lg:text-sm font-semibold ${currentledgerBalance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}>
                    {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance || 0).toFixed(generalSettings.decimalPart)}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed dark:border-themed rounded-xl bg-secondary dark:bg-secondary text-muted dark:text-muted font-bold text-xs lg:text-sm'>
              {t('purchaseOrder.form.label.selectSupplierMsg')}
            </div>
          )}
        </div>
      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 dark:text-blue-400 border-b border-blue-600 dark:border-blue-400 w-fit cursor-pointer hover:text-blue-700 dark:hover:text-blue-300'
          onClick={() => financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
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
          otherChargeLedgers={otherChargeLedgers}
        />
      </div>

      {/* Modals */}
      <SelectedSalesACModal
        open={salesAcModalOpen}
        handleClose={() => setSalesAcModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
        salesAccounts={salesAccounts}
      />
      <SelecteCurrecyModal
        open={currencyModalOpen}
        handleClose={() => setCurrencyModalOpen(false)}
        formData={formData}
        currency={currency}
        handleChange={(field, value) => {
          handleDropdownChange(field, value);
        }}
      />
      <SalesModeModal
        open={salesModeModalOpen}
        handleClose={() => setSalesModeModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
      />
      <AddEmployeeModal
        open={employeeModalOpen}
        handleClose={() => setEmployeeModalOpen(false)}
        onSuccess={fetchEmployees}
      />
      <AddCustomerModal
        open={customerModalOpen}
        handleClose={() => setCustomerModalOpen(false)}
        onSuccess={fetchCustomer}
        type='supplier'
      />
      <ShippingAddressModal
        open={shippingAddresOpen}
        handleClose={() => setShippingAddressOpen(false)}
        editId={updateCustomerId}
        onSuccess={() => {
          fetchCustomerData(currentLedgerIdRef.current)
          fetchCustomer()
        }}
      />
      <BillingAddressModal
        open={billingAddressOpen}
        handleClose={() => setBilligAddressOpen(false)}
        editId={updateCustomerId}
        onSuccess={() => {
          fetchCustomerData(currentLedgerIdRef.current)
          fetchCustomer()
        }}
      />
    </div>
  )
}

export default FormSectionMain