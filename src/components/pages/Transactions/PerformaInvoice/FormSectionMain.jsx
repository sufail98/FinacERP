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
import AddCustomerModal from '@/components/elements/theme/AddCustomerModal'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import ProformaInvoiceTable from './ProformaInvoiceTable'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import DateInput from '@/components/elements/theme/DateInput'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'

const FormSectionMain = ({
  fetchProformaDataUsingQuotationId,
  existingInvoiceNo,
  invoiceId,
  formData,
  setFormData,
  employees,
  fetchEmployees,
  costCenters,
  customers,
  pricingLevel,
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
  setShippingAddress,
  setBlillingAddress,
  shippingAdderess,
  billingAddress,
  salesAccount,
  currency,
  currentledgerBalance,
  otherChargeLedgers,

  setCurrentLedgerBalance
}) => {
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const { t } = useTranslation();
  const { generalSettings, financeSettings } = useSelector((state) => state.settings);
  const [salesAcModalOpen, setSalesAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  // const [shippingAdderess, setShippingAddress] = useState(null);
  const [salesAccounts, setSalesAccounts] = useState([]);
  const [quotationData, setQuotationData] = useState()
  const [updateCustomerId, setUpdateCustomerId] = useState(null);
  const [showTaxType, setShowTaxType] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'F10') {
        e.preventDefault();
        setShowTaxType(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // const [billingAddress, setBlillingAddress] = useState(null);
  const [fetchSalesAccountLoading, setSalesAcLoading] = useState(false)

  const { selectedBranchId, currentCurrency, currentCurrency: currentCurrencyFromStore, setCurrency, currentFinancialYear } = useAuth();


  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchLedgerBalance = async (ledgerId) => {
    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      setCurrentLedgerBalance(res?.data?.data?.currentbal)
    } catch (error) {
      console.error(error);
    }
  }



  useEffect(() => {
    if (formData.salesAccount && salesAccount.length > 0) {
      const selectedAccount = salesAccount.find(acc => acc.ledgerId === formData.salesAccount);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          salesAccountName: selectedAccount.ledgerName
        }));
      }
    }
  }, [formData.salesAccount, salesAccount]);

  const fetchCustomerData = async (ledgerId) => {
    setLoadingCustomer(true);

    try {
      const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId || formData.ledgerId}`);

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
      } else {
        console.error("Failed to fetch customer data");
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
  };

  const currentLedgerIdRef = useRef(null);
  const handleDropdownChange = (name, value) => {
    if (name === 'ledgerId') {
      currentLedgerIdRef.current = value;
      fetchLedgerBalance(value);
      fetchCustomerData(value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchQuotations = async () => {
    try {
      const res = await axiosInstance.post('quotation-no-by-date', { fromDate: currentFinancialYear.fromDate, toDate: currentFinancialYear.toDate });
      setQuotationData(res.data.data)


    } catch (error) {
      console.error('Error fetching Quotation data', error);
    }
  }

  return (
    <div className='p-2 space-y-0.5 bg-primary dark:bg-primary'>
      {/* Main Grid - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[50%_50%] gap-1 lg:gap-2 w-full border-b border-themed pb-1">

        {/* LEFT SECTION */}
        <div className="flex flex-col lg:flex-row gap-1">
          <div className='w-full space-y-0.5'>

            {/* Invoice Header Row */}
            <div className='flex flex-col sm:flex-row gap-0.5 lg:gap-1'>
              <TextInput
                label={t('salesInvoice.form.label.formHeaderSection.proformaNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='w-full sm:w-[100px] text-red-600 dark:text-red-400 font-bold'
                readOnly={true}
                labelBold
              />

              <div className='w-full sm:w-[150px] lg:w-[160px]'>

                <DateInput
                  label={t('salesInvoice.form.label.formHeaderSection.date')}
                  value={formData.date}
                  name='date'
                  onChange={handleInputChange}
                  className="w-full"
                  format={generalSettings.dateformat}
                  required
                  error={errors.date}
                  min={currentFinancialYear?.fromDate}
                  max={currentFinancialYear?.toDate}
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
                value={formData.partyRefNo}
                onChange={handleInputChange}
                error={errors.partyRefNo}
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
                  value: batch.transactionbatchid,
                  label: batch.batchname
                }))}
                value={formData.BatchId}
                onChange={(value) => handleDropdownChange('BatchId', value)}
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.BatchId')}
                searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.BatchId')}
                clearable={true}
                className="w-full"
                loading={loading.batch}
              />

              <TextInput
                name="LPONO"
                label={t('proformaInvoice.form.label.LPONO')}
                value={formData.LPONO}
                onChange={handleInputChange}
                error={errors.LPONO}
                className="w-full"
                placeholder={t('proformaInvoice.form.placeholders.LPONO')}
              />

              <div>

                <DateInput
                  label={t('proformaInvoice.form.label.LPODate')}
                  value={formData.LPODate}
                  name='LPODate'
                  onChange={handleInputChange}
                  className="w-full"
                  format={generalSettings.dateformat}
                />
              </div>
            </div>

            {/* Customer Selection Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 lg:gap-1.5 items-center">
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
                error={errors.pricingLevelId}
                clearable
                className="w-full"
                loading={loading.pricingLevel}
              />
              <div className='flex gap-0.5 lg:gap-1 items-end flex-1'>
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
                    error={errors.employeeId}
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
              <div className='grid grid-cols-2 gap-1 items-center'>
                <NormalSelectInput
                  name='status'
                  label={t('salesInvoice.form.label.formHeaderSection.status')}
                  value={formData.status}
                  options={[
                    { value: "Pending", label: "Pending" },
                    { value: "Completed", label: "Completed" },
                    { value: "Billed", label: "Billed" },
                    { value: "Cancelled", label: "Cancelled" }
                  ]}
                  onChange={(e) => handleDropdownChange(e.target.name, e.target.value)}
                  placeholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
                  searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
                />

                {showTaxType && (
                  <NormalSelectInput
                    name='taxType'
                    label={t('salesInvoice.form.label.formHeaderSection.taxtype')}
                    value={formData.taxType}
                    options={[
                      { value: "Applicable to product", label: "Applicable to product" },
                      { value: "NA", label: "NA" },
                    ]}
                    onChange={(e) => handleDropdownChange(e.target.name, e.target.value)}
                    placeholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
                    searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
                  />
                )}
              </div>

              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.dueDate')}
                value={formData.dueDate}
                name='dueDate'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
              />
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.deliveryDate')}
                value={formData.deliveryDate}
                name='deliveryDate'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
              />
              <SearchableDropdown
                name="quotationMasterId"
                label={t('proformaInvoice.form.label.quotationNo')}
                options={quotationData?.map((data) => ({
                  value: data.quotationmasterid,
                  label: `${data.quotationno} | ${data.Date} | ${data.customerName} | ${data.tinNumber} | ${data.CustomerPhone} | ${data.totalamount}`
                }))}
                value={formData.quotationMasterId}
                onChange={(value) => {
                  handleDropdownChange('quotationMasterId', value)
                  fetchProformaDataUsingQuotationId(value);
                }}
                placeholder={t('proformaInvoice.form.placeholders.quotationNo')}
                searchPlaceholder={t('proformaInvoice.form.placeholders.quotationNo')}
                error={errors.AgainstNo}
                clearable={true}
                className='w-full'
              />
            </div>
          </div>


        </div>

        {/* RIGHT SECTION - Address & Dates */}
        <div className="space-y-1.5 lg:space-y-2 pr-1">
          <div className='flex gap-1 lg:gap-1.5 items-end w-full sm:col-span-2'>
            <div className='flex-1 min-w-0'>
              <CustomerDropdown
                label={t('salesInvoice.form.label.formHeaderSection.ledgerId')}
                name="ledgerId"
                value={formData.ledgerId}
                onChange={(value) => handleDropdownChange("ledgerId", value)}
                options={customers?.map((data) => ({
                  value: data.ledgerId,
                  label: data.ledgerName,
                  balance: data.openingBalance,
                  address: `${data.StreetName || ""} ${data.CityName || ""} ${data.Country || ""}`,
                  vatNo: data.tinNumber,
                  phoneNo: data.phoneNo,
                }))}
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerId')}
                searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerId')}
                clearable
                loading={loading.customers}
                required
                onBlur={(e) => handleBlur(e, validationRules)}
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
              <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed rounded-xl text-muted dark:text-muted font-bold text-xs lg:text-sm bg-secondary dark:bg-secondary'>
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
              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3'>
                {/* Billing Address */}
                <div className='bg-secondary dark:bg-secondary p-2 rounded border border-themed'>
                  <h1 className='text-red-600 dark:text-red-400 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                    {t('salesInvoice.form.label.formHeaderSection.billingAddressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-red-700 dark:hover:text-red-300 text-red-600 dark:text-red-400"
                      onClick={() => setBilligAddressOpen(true)}
                    />
                  </h1>
                  <h2 className='font-bold text-xs lg:text-sm text-primary dark:text-primary'>{billingAddress?.name}</h2>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>{billingAddress?.phoneNo}</p>
                  <p className='text-[11px] lg:text-xs break-words text-secondary dark:text-secondary'>{billingAddress?.address}</p>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>
                    {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo || 'N/A'}
                  </p>
                  <p className={`text-xs lg:text-sm font-semibold ${currentledgerBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                    }`}>
                    {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {currentledgerBalance || 0.00}
                  </p>
                </div>

                {/* Shipping Address */}
                <div className='bg-secondary dark:bg-secondary p-2 rounded border border-themed'>
                  <h1 className='text-green-600 dark:text-green-400 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                    {t('salesInvoice.form.label.formHeaderSection.shippingAddressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-green-700 dark:hover:text-green-300 text-green-600 dark:text-green-400"
                      onClick={() => setShippingAddressOpen(true)}
                    />
                  </h1>
                  <h2 className='font-bold text-xs lg:text-sm text-primary dark:text-primary'>{shippingAdderess?.name}</h2>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>{shippingAdderess?.phoneNo}</p>
                  <p className='text-[11px] lg:text-xs break-words text-secondary dark:text-secondary'>
                    {shippingAdderess?.shippingAddress?.address1 && `${shippingAdderess?.shippingAddress?.address1}, `}
                    {shippingAdderess?.shippingAddress?.address2 && `${shippingAdderess?.shippingAddress?.address2}, `}
                    {shippingAdderess?.shippingAddress?.address3 && `${shippingAdderess?.shippingAddress?.address3}, `}
                    {shippingAdderess?.shippingAddress?.address4}
                  </p>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>
                    {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {shippingAdderess?.vatNo || 'N/A'}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed rounded-xl text-muted dark:text-muted font-bold text-xs lg:text-sm bg-secondary dark:bg-secondary'>
              {t('salesInvoice.form.label.formHeaderSection.selectCustomerMsg')}
            </div>
          )}

          {/* Date Fields Row */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-1 lg:gap-1.5'>


          </div>
        </div>
      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 dark:text-blue-400 border-b border-blue-600 dark:border-blue-400 w-fit cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
          onClick={() => setSalesAcModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.salesAcLabel')}: <span className="font-medium">{formData.salesAccountName}</span>
        </p>
        <p
          className='text-blue-600 dark:text-blue-400 border-b border-blue-600 dark:border-blue-400 w-fit cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
          onClick={() => financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.currencyLabel')}: <span className="font-medium">{currentCurrencyFromStore?.currencyName || "Select Currency"}</span>
        </p>
      </div>

      {/* Sales Invoice Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <ProformaInvoiceTable
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
        salesAccounts={salesAccount}
        fetchSalesAccountLoading={fetchSalesAccountLoading}
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
        billingData={billingAddress}
        onSave={(updatedBilling) => {
          setBlillingAddress((prev) => ({ ...prev, ...updatedBilling }));
          setFormData((prev) => ({
            ...prev,
            partyName: updatedBilling.name || prev.customerName,
            partyAddress: updatedBilling.address || prev.CustomerAddress,
            partyMobile: updatedBilling.phoneNo || prev.CustomerPhone,
            partyVatNo: updatedBilling.vatNo || prev.customerVATNo,
          }));
        }}
      />
    </div>
  )
}

export default FormSectionMain