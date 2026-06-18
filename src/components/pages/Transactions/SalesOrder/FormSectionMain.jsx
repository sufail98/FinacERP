import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import SalesOrderTable from './SalesOrderTable'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import DateInput from '@/components/elements/theme/DateInput'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'

const FormSectionMain = ({
  loadQuotationDetailsByQtnId,
  loadProformaByProformaId,
  existingInvoiceNo,
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
  editMode,
  rows,
  setRows,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  paymentGridRef,
  paymentRows,

  setBlillingAddress,
  setShippingAddress,
  billingAddress,
  shippingAdderess,
  otherChargeLedgers,
  currentledgerBalance,
  setCurrentLedgerBalance,
  currency,
  setProformaData,
  proformaData,
  setQuotationData,
  quotationData,
  resetTableKey
}) => {
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [sectionPrivileges, setSectionPrivileges] = useState([]); // Add state for section privileges
  const [isStatusDisabled, setIsStatusDisabled] = useState(false); // Add state for status dropdown


  const { t } = useTranslation();
  const { generalSettings, financeSettings } = useSelector((state) => state.settings);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);


  const [updateCustomerId, setUpdateCustomerId] = useState(null);



  const { currentCurrency: currentCurrencyFromStore, setCurrency, currentFinancialYear } = useAuth();
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
  const salesModeOptions = [
    { value: 'NA', label: 'NA' },
    { value: 'Quotation', label: 'Against Quotation' },
    { value: 'Proforma', label: 'Against Proforma' },
  ];

  const [customerLedgerId, setCustomerLedgerId] = useState(null);

  useEffect(() => {
    if (formData.ledgerId) {
      fetchCustomerData()
      fetchLedgerBalance(formData.ledgerId);
    }
  }, [formData.ledgerId]);

  const fetchLedgerBalance = async (ledgerId) => {
    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      setCurrentLedgerBalance(res?.data?.data?.currentbal)
    } catch (error) {
      console.error(error);
    }
  }

  const fetchQuotationData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-order-quotation-list', { branchId: selectedBranchId, ledgerId: ledgerId, orderMasterId: null });

      if (!response.data.error) {
        setQuotationData(response.data.data)

      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);

    }
  }
  const fetchProformaData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-order-proforma-list', { branchId: selectedBranchId, ledgerId: ledgerId, in_proformaMasterId: null });

      if (!response.data.error) {

        setProformaData(response.data.data)

      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);

    }
  }
  const userGroupId = localStorage.getItem("userRole");

  useEffect(() => {
    if (editMode) {
      fetchSectionPrevlage()
    }
  }, [editMode])

  const fetchSectionPrevlage = async () => {
    try {
      const res = await axiosInstance.get(`get-section-privileges-byId/${userGroupId}/${selectedBranchId}`);

      if (!res.data.error && res.data.data) {
        setSectionPrivileges(res.data.data);

        // Check if "Sales Order Status" section exists and its status
        const salesOrderStatusSection = res.data.data.find(
          section => section.SectionName === "Sales Order Status"
        );

        // Disable the status dropdown if the section exists and status is false
        if (salesOrderStatusSection && !salesOrderStatusSection.status) {
          setIsStatusDisabled(true);
        } else {
          setIsStatusDisabled(false);
        }
      }
    } catch (error) {
      console.error("Error fetching section privileges:", error);
    }
  }


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
      setLoadingCustomer(false)
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDropdownChange = (name, value) => {
    if (name === 'ledgerId') {
      setCustomerLedgerId(value);
      fetchLedgerBalance(value);
      fetchQuotationData(value);
      fetchProformaData(value);
      fetchCustomerData(value)
    }
    if (name === 'quotationMasterId') {
      loadQuotationDetailsByQtnId(value)
    }
    if (name === 'proformaMasterId') {
      loadProformaByProformaId(value)
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



  return (
    <div className='p-2 space-y-0.5'>
      {/* Main Grid - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-1 lg:gap-2 w-full border-b pb-1">

        {/* LEFT SECTION */}
        <div className="flex flex-col lg:flex-row gap-1">
          <div className='w-full lg:w-[78%] space-y-0.5'>

            {/* Invoice Header Row */}
            <div className='flex flex-col sm:flex-row gap-0.5 lg:gap-1'>
              <TextInput
                label={t('salesInvoice.form.label.formHeaderSection.OrderNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='w-full sm:w-[100px] text-red-600 font-bold'
                readOnly={true}
                labelBold
              />

              <div className='w-full sm:w-[150px] lg:w-[160px]'>
                <DateInput
                  label={t('salesInvoice.form.label.formHeaderSection.date')}
                  timeText={time}
                  format={generalSettings.dateformat}
                  value={formData.date}
                  name='date'
                  onChange={handleInputChange}
                  className="w-full"
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
                type="number"
                value={formData.partyRefNo}
                onChange={handleInputChange}
                error={errors.partyRefNo}
                className="w-full"
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.RefNo')}
              />



              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.refDate')}
                format={generalSettings.dateformat}
                value={formData.partyRefDate}
                name='partyRefDate'
                onChange={handleInputChange}
                className="w-full"
              />




              <TextInput
                name="LPONO"
                label={t('salesInvoice.form.label.formHeaderSection.orderRefNo')}
                value={formData.LPONO}
                onChange={handleInputChange}
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.orderRefNo')}
                error={errors.LPONO}
                className="w-full"
              />


              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.orderRefDate')}
                format={generalSettings.dateformat}
                value={formData.LPODate}
                name='LPODate'
                onChange={handleInputChange}
                className="w-full"
              />
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
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.dueDate')}
                format={generalSettings.dateformat}
                value={formData.dueDate}
                name='dueDate'
                onChange={handleInputChange}
                className="w-full"
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


          </div>

          {/* Sales Mode & Godown Column */}
          <div className='w-full lg:w-[22%] space-y-1 lg:space-y-1.5'>
            <NormalSelectInput
              name='status'
              label={t('salesInvoice.form.label.formHeaderSection.status')}
              value={formData.status}
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Production Completed", label: "Production Completed" },
                { value: "Completed", label: "Completed" },
                { value: "Billed", label: "Billed" },
                { value: "Cancelled", label: "Cancelled" },
                { value: "Cash Received", label: "Cash Received" },
                { value: "Delivered", label: "Delivered" },
                { value: "Customer Collected", label: "Customer Collected" },
              ]}
              onChange={(e) => handleDropdownChange(e.target.name, e.target.value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.status')}
              disabled={isStatusDisabled} // Add this line to disable the dropdown
            />
            {formData.ledgerId && (
              <SearchableDropdown
                name="AgainstNo"
                label={t('salesInvoice.form.label.formHeaderSection.AgainstNo')}
                options={salesModeOptions}
                value={formData.AgainstNo}
                onChange={(value) => handleDropdownChange('AgainstNo', value)}
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
                searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
                error={errors.AgainstNo}
                clearable={true}
                className='w-full'
              />
            )}

            {formData.AgainstNo === 'Quotation' && (
              <SearchableDropdown
                label={t("salesInvoice.form.label.formHeaderSection.selecteQuotation")}
                options={quotationData.map((q) => ({
                  value: q.quotationmasterid,
                  label: `${q.quotationno} | ${q.quotationdate} | ${q.ledgername} | ${q.tinNumber} | ${q.customerphone} | ${q.totalamount}`
                }))}
                value={formData.quotationMasterId}
                onChange={(value) => handleDropdownChange('quotationMasterId', value)}
                placeholder={t("salesInvoice.form.label.formHeaderSection.selecteQuotation")}
                searchPlaceholder={t("salesInvoice.form.label.formHeaderSection.selecteQuotation")}
                clearable={true}
                className="w-full"
              />
            )}

            {formData.AgainstNo === 'Proforma' && (
              <SearchableDropdown
                label={t("salesInvoice.form.label.formHeaderSection.selecteProforma")}
                options={proformaData.map((p) => ({
                  value: p.proformamasterid,
                  label: `${p.proformano} | ${p.proformadate} | ${p.partyname} | ${p.tinNumber} | ${p.partymobile} | ${p.totalamount}`
                }))}
                value={formData.proformaMasterId}
                onChange={(value) => handleDropdownChange('proformaMasterId', value)}
                placeholder={t("salesInvoice.form.label.formHeaderSection.selecteProforma")}
                searchPlaceholder={t("salesInvoice.form.label.formHeaderSection.selecteProforma")}
                clearable={true}
                className="w-full"
              />
            )}



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
                required
                loading={loading.customers}
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
              <div className='w-full h-24 lg:h-28 flex justify-center items-center border rounded-xl text-gray-400 font-bold text-xs lg:text-sm'>
                <svg
                  className="animate-spin h-5 w-5 mb-1 text-blue-600"
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
                  <p className={`text-xs lg:text-sm font-semibold ${currentledgerBalance < 0 ? "text-red-600" : "text-green-600"
                    }`}>
                    {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance).toFixed(generalSettings.decimalPart)}
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
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border rounded-xl text-gray-400 font-bold text-xs lg:text-sm'>
              {t('salesInvoice.form.label.formHeaderSection.selectCustomerMsg')}
            </div>
          )}


        </div>
      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
          onClick={() => financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.currencyLabel')}: {currentCurrencyFromStore?.currencyName || "Select Currency"}
        </p>
      </div>

      {/* Sales Invoice Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <SalesOrderTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}
          paymentGridRef={paymentGridRef}
          paymentRows={paymentRows}
          otherChargeLedgers={otherChargeLedgers}
          key={resetTableKey}
        />
      </div>

      {/* Modals */}

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
          fetchCustomerData()
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