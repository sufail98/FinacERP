import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import { useSelector } from 'react-redux'
import { Pencil, PencilIcon, Plus } from 'lucide-react'
import SelectedSalesACModal from './SelectedSalesACModal'
import SalesModeModal from './SalesModeModal'
import AddNewBtn from '@/components/common/AddNewBtn'
import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import AddCustomerModal from '@/components/elements/theme/AddCustomerModal'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './SalesReturnTable'
import DateInput from '@/components/elements/theme/DateInput'
import AdditionalFieldsModal from './AdditionalFieldsModal'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'

const FormSectionMain = ({
  fetchInvoiceDataForReturn,
  existingInvoiceNo,
  ReturnMasterId,
  time,
  invoiceId,
  formData,
  setFormData,
  employees,
  fetchEmployees,
  costCenters,
  customers,
  pricingLevel,
  fetchCustomer,
  godowns,
  editMode,
  rows,
  setRows,
  isAgainst,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  batches,

  currentledgerBalance,
  salesAccount,
  bank,
  cash,
  shippingAdderess,
  billingAddress,
  setBlillingAddress,
  setShippingAddress,
  otherChargeLedgers,
  setCurrentLedgerBalance,
  currency,
  genarateSalesInvoiceId
}) => {
  const { t } = useTranslation();
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showAdditionalFieldsModal, setShowAdditionalFieldsModal] = useState(false);

  const { generalSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
  const [salesAcModalOpen, setSalesAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerEditMode, setCustomerEditMode] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  const [salesMasterIdForGetReturnData, setSalesMasterIdForGetReturnData] = useState(null);
  const [fetchSalesAccountLoading, setSalesAcLoading] = useState(false);
  const [selectedSalesMatsterId, setSelectedSalesmasterId] = useState(null)

  const [updateCustomerId, setUpdateCustomerId] = useState(null);

  const { currentCurrency: currentCurrencyFromStore, currentFinancialYear } = useAuth();
  const { selectedBranchId, currentCurrency } = useAuth()
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
  // Handler for opening modal in add mode
  const handleAddCustomer = () => {
    setCustomerEditMode(false);
    setCustomerModalOpen(true);
  };

  // Handler for opening modal in edit mode
  const handleEditCustomer = () => {
    setCustomerEditMode(true);
    setCustomerModalOpen(true);
  };
  // Handler for modal close
  const handleCustomerModalClose = () => {
    setCustomerModalOpen(false);
    setCustomerEditMode(false);
  };

  // Handler for success - refresh customer list and optionally re-select the customer
  const handleCustomerSuccess = (responseData) => {
    // Refresh your customer list here
    fetchCustomerData();

    // If in edit mode, keep the same customer selected
    // If in add mode, you might want to select the newly created customer
    if (!customerEditMode && responseData?.ledgerId) {
      handleDropdownChange("ledgerId", responseData.ledgerId);
    }
  };



  const batchOptions = [
    { value: 1, label: 'N/A' },

  ];



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
      const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId}`);

      if (response.data) {
        const data = response.data.data;
        setFormData(prev => ({
          ...prev,
          customerData: data
        }));

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
          customerName: data?.ledgerName || '',
          CustomerAddress: data?.address || '',
          CustomerPhone: data?.phoneNo || '',
          customerVATNo: data?.tinNumber || '',
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
    if (name === "salesMasterIdForGetReturnData") {
      setSalesMasterIdForGetReturnData(value)
      // fetchInvoiceData(value)
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && salesMasterIdForGetReturnData) {
      e.preventDefault();
      fetchInvoiceDataForReturn(salesMasterIdForGetReturnData, 'InvoiceNo');
    }
  };
  useEffect(() => {
    fetchInvoiceData(formData.ledgerId)
  }, [formData.ledgerId]);

  const fetchInvoiceData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post(`get-invoices-for-return`, { "ledgerId": ledgerId, "branchId": selectedBranchId, "ReturnMasterId": null, "isAccountsPosting": generalSettings?.AccountPosting ? 0 : 1 });

      setInvoiceData(response.data.data);

    } catch (error) {
      console.error('Error fetching invoice data', error);
    }
  }
  const currentLedgerIdRef = useRef(null);
  const handleDropdownChange = (name, value) => {
    if (name === 'taxType') {
      genarateSalesInvoiceId(value)
    }
    if (name === 'ledgerId') {
      currentLedgerIdRef.current = value;
      fetchLedgerBalance(value);
      fetchCustomerData(value)
      fetchInvoiceData(value)
      fetchCustomer()
    }
    if (name === 'salesMasterId') {
      fetchInvoiceDataForReturn(value, 'MasterId');
      setSelectedSalesmasterId(value);
      // setFormData(prev => ({
      //   ...prev,
      //   salesMasterId: value
      // }));
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  return (
    <div className='p-2 '>
      {/* Main Grid - Responsive Layout */}
      <div className='grid grid-cols-3 lg:grid-cols-[2fr_1fr_3fr] gap-1 items-start'>
        <div className="grid grid-cols-2 gap-1 ">
          <TextInput
            label={t('salesInvoice.form.label.formHeaderSection.ReturnNo')}
            value={editMode ? existingInvoiceNo : invoiceId}
            onChange={handleInputChange}
            required
            className='w-full text-red-600 font-bold'
            readOnly={true}
            labelBold
          />
          <DateInput
            label={t('salesInvoice.form.label.formHeaderSection.date')}
            format={generalSettings.dateformat}
            value={formData.date}
            name='date'
            onChange={handleInputChange}
            className="w-full"
            required
            error={errors.date}
            timeText={time}
            min={currentFinancialYear?.fromDate}
            max={currentFinancialYear?.toDate}
          />
          {!editMode && formData.ledgerId && (
            <SearchableDropdown
              name="salesMasterId"
              label={t('salesInvoice.form.label.formHeaderSection.invoiceNo')}
              options={invoiceData?.map((data) => ({
                value: data.salesmasterid,
                label: data.invoiceno,
              }))}
              value={formData.salesMasterId}
              onChange={(value) => handleDropdownChange('salesMasterId', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.invoiceNo')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.invoiceNo')}
              clearable={true}
              className="w-full"

            />
          )}
          <TextInput
            name="salesMasterIdForGetReturnData"
            label={t('salesInvoice.form.label.formHeaderSection.InvoiceNoForReturn')}
            value={formData.salesMasterIdForGetReturnData || ReturnMasterId}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('salesInvoice.form.label.formHeaderSection.InvoiceNoForReturn')}
            className="w-full"
          />
          <NormalSelectInput
            label={t('salesInvoice.form.footerSection.otherDetails.label.formType')}
            options={[
              { value: 'Tax Invoice', label: 'Tax Invoice' },
              { value: 'Retail Invoice', label: 'Retail Invoice' },
            ]}
            value={formData.formType}
            onChange={(value) => handleDropdownChange('formType', value)}
            placeholder={t('salesInvoice.form.label.formHeaderSection.formType')}
            searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.formType')}
            clearable={true}
            className="w-full"
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
          {saleSettings?.ActiveGodown === true && (
            <SearchableDropdown
              name="GodownId"
              label={t('salesInvoice.form.label.formHeaderSection.GodownId')}
              options={godowns?.map((data) => ({
                value: data.GodownId,
                label: data.GodownName,
              }))}
              value={formData.GodownId}
              onChange={(value) => handleDropdownChange('GodownId', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.GodownId')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.GodownId')}
              error={errors.GodownId}
              clearable={true}
              className="w-full"
              loading={loading.godowns}
            />
          )}

        </div>

        <div>

        </div>

        <div className=''>
          <div className='grid gap-1 grid-cols-3'>
            <div className='col-span-2'>
              <div className="space-y-1.5 lg:space-y-2">
                <div className={`flex gap-1 items-end w-full`}>
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
                        searchAddress: data.address,
                        code: data.ledgerCode,
                      }))}
                      placeholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerId')}
                      searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerId')}
                      clearable
                      required
                      loading={loading.customers}
                      error={errors.ledgerId}
                      onBlur={(e) => handleBlur(e, validationRules)}
                      autoFocus
                    />
                  </div>
                  <div className='flex-shrink-0'>
                    {formData.ledgerId ? (
                      // Edit Button - shown when customer is selected
                      <AddNewBtn
                        icon={Pencil}
                        onClick={handleEditCustomer}
                        title={t("customer.form.breadcrumb.editCustomer") || "Edit Customer"}
                      />
                    ) : (
                      // Add Button - shown when no customer is selected
                      <AddNewBtn
                        icon={Plus}
                        onClick={handleAddCustomer}
                        title={t("customer.form.breadcrumb.addCustomer") || "Add Customer"}
                      />
                    )}
                  </div>
                </div>
                {formData?.ledgerId ? (
                  loadingCustomer ? (
                    <div className='w-full h-24 flex justify-center items-center border rounded-xl text-gray-400 font-bold text-xs'>
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  ) : (
                    <div className='border rounded-xl p-2 grid grid-cols-2 gap-2'>
                      {/* Billing Address */}
                      <div>
                        <h1 className='text-red-600 text-xs flex gap-1 items-center mb-1 font-semibold'>
                          {t('salesInvoice.form.label.formHeaderSection.billingAddressHeading')}
                          <PencilIcon className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => setBilligAddressOpen(true)} />
                        </h1>
                        <h2 className='font-bold text-xs'>{billingAddress?.name}</h2>
                        <p className='text-[11px] text-gray-500'>{billingAddress?.phoneNo}</p>
                        <p className='text-[11px] text-gray-500 break-words'>{billingAddress?.address}</p>
                        {billingAddress?.vatNo && (
                          <p className='text-[11px] text-gray-500'>
                            {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo}
                          </p>
                        )}
                        <p className={`text-xs font-semibold ${Number(currentledgerBalance) < 0 ? "text-red-600" : "text-green-600"}`}>
                          {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {currentledgerBalance || 0}
                        </p>
                        <p className='text-xs font-semibold'>
                          {t('salesInvoice.form.label.formHeaderSection.creditLimitLabel')}: {formData?.customercreditLimit || 0}
                        </p>
                      </div>

                      {/* Shipping Address */}
                      <div>
                        <h1 className='text-green-600 text-xs flex gap-1 items-center mb-1 font-semibold'>
                          {t('salesInvoice.form.label.formHeaderSection.shippingAddressHeading')}
                          <PencilIcon className="w-3 h-3 cursor-pointer hover:text-green-700" onClick={() => setShippingAddressOpen(true)} />
                        </h1>
                        <h2 className='font-bold text-xs'>{shippingAdderess?.name}</h2>
                        <p className='text-[11px] text-gray-500'>{shippingAdderess?.phoneNo}</p>
                        <p className='text-[11px] text-gray-500 break-words'>
                          {shippingAdderess?.shippingAddress?.address1 && `${shippingAdderess?.shippingAddress?.address1}, `}
                          {shippingAdderess?.shippingAddress?.address2 && `${shippingAdderess?.shippingAddress?.address2}, `}
                          {shippingAdderess?.shippingAddress?.address3 && `${shippingAdderess?.shippingAddress?.address3}, `}
                          {shippingAdderess?.shippingAddress?.address4}
                        </p>
                        {shippingAdderess?.vatNo && (
                          <p className='text-[11px] text-gray-500'>
                            {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {shippingAdderess?.vatNo}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3'>
                    {/* Billing Address */}
                    <div>
                      <h1 className='text-red-600 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                        {t('salesInvoice.form.label.formHeaderSection.billingAddressHeading')}
                        <PencilIcon
                          className="w-4 h-4 cursor-pointer hover:text-red-700"
                          onClick={() => setBilligAddressOpen(true)}
                        />
                      </h1>
                      <h2 className='font-bold text-xs lg:text-sm'>{billingAddress?.name}</h2>
                      <p className='text-[11px] lg:text-xs'>{billingAddress?.phoneNo}</p>
                      <p className='text-[11px] lg:text-xs break-words'>{billingAddress?.address}</p>
                      <p className='text-[11px] lg:text-xs'>
                        {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo || 'N/A'}
                      </p>
                      {/* // After */}
                      <p className={`text-xs lg:text-sm font-semibold ${Number(currentledgerBalance) < 0 ? "text-red-600" : "text-green-600"}`}>
                        {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                      </p>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <h1 className='text-green-600 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                        {t('salesInvoice.form.label.formHeaderSection.shippingAddressHeading')}
                        <PencilIcon
                          className="w-4 h-4 cursor-pointer hover:text-green-700"
                          onClick={() => setShippingAddressOpen(true)}
                        />
                      </h1>
                      <h2 className='font-bold text-xs lg:text-sm'>{shippingAdderess?.name}</h2>
                      <p className='text-[11px] lg:text-xs'>{shippingAdderess?.phoneNo}</p>
                      <p className='text-[11px] lg:text-xs break-words'>
                        {shippingAdderess?.shippingAddress?.address1 && `${shippingAdderess?.shippingAddress?.address1}, `}
                        {shippingAdderess?.shippingAddress?.address2 && `${shippingAdderess?.shippingAddress?.address2}, `}
                        {shippingAdderess?.shippingAddress?.address3 && `${shippingAdderess?.shippingAddress?.address3}, `}
                        {shippingAdderess?.shippingAddress?.address4}
                      </p>
                      <p className='text-[11px] lg:text-xs'>
                        {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {shippingAdderess?.vatNo || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="">
              <button
                onClick={() => setShowAdditionalFieldsModal(true)}
                className="flex items-center gap-2 px-4 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >

                More...
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
          onClick={() => setSalesAcModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.salesAcLabel')}: {formData.salesAccountName}
        </p>
        <p
          className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
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
          isAgainst={isAgainst}

          cash={cash}
          bank={bank}
          otherChargeLedgers={otherChargeLedgers}
        />
      </div>
      <AdditionalFieldsModal
        open={showAdditionalFieldsModal}
        onClose={() => setShowAdditionalFieldsModal(false)}
        formData={formData}
        handleInputChange={handleInputChange}
        handleDropdownChange={handleDropdownChange}
        employees={employees}
        costCenters={costCenters}
        batchOptions={batchOptions}
        pricingLevel={pricingLevel}
        loading={loading}
        generalSettings={generalSettings}
        t={t}
        setEmployeeModalOpen={setEmployeeModalOpen}
        TextInput={TextInput}
        SearchableDropdown={SearchableDropdown}
        DateInput={DateInput}
        AddNewBtn={AddNewBtn}
        Plus={Plus}
        batches={batches}
      />
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
        handleClose={handleCustomerModalClose}
        onSuccess={handleCustomerSuccess}
        editMode={customerEditMode}
        customerId={customerEditMode ? formData.ledgerId : null}
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
            customerName: updatedBilling.name || prev.customerName,
            CustomerAddress: updatedBilling.address || prev.CustomerAddress,
            CustomerPhone: updatedBilling.phoneNo || prev.CustomerPhone,
            customerVATNo: updatedBilling.vatNo || prev.customerVATNo,
          }));
        }}
      />
    </div>
  )
}

export default FormSectionMain