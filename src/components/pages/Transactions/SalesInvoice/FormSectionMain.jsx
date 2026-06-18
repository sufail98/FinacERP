import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import { useSelector } from 'react-redux'
import { Pencil, PencilIcon, Plus } from 'lucide-react'
import SelectedSalesACModal from './SelectedSalesACModal'
import SelecteCurrecyModal from './SelecteCurrecyModal'
import SalesModeModal from './SalesModeModal'
import AddNewBtn from '@/components/common/AddNewBtn'
import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import AddCustomerModal from '../../../elements/theme/AddCustomerModal'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './SalesInvoiceTable'
import DateInput from '@/components/elements/theme/DateInput'
import AdditionalFieldsModal from './AdditionalFieldsModal'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import Swal from 'sweetalert2'

const FormSectionMain = ({
  loadSalesModeData,
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
  batches,
  godowns,
  editMode,
  rows,
  setRows,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  fetchLedgerBalance,
  currentledgerBalance,
  salesAccount,
  bank,
  cash,
  shippingAdderess,
  billingAddress,
  setBlillingAddress,
  setShippingAddress,
  otherChargeLedgers,
  currency,
  quotationData,
  setQuotationData,
  proformaData,
  setProformaData,
  salesOrderData,
  setSalesOrderData,
  deliveryNoteData,
  setDeliveryNoteData,
  genarateSalesInvoiceId,
  setCustomers
}) => {

  const [showAdditionalFieldsModal, setShowAdditionalFieldsModal] = useState(false);
  const { t } = useTranslation();
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const { generalSettings, saleSettings, financeSettings, } = useSelector((state) => state.settings);
  const seeFulFeilds = saleSettings?.ShowAdditionalFieldsInSalesInvoice || false;
  const [salesAcModalOpen, setSalesAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerEditMode, setCustomerEditMode] = useState(false);
  const [fetchSalesAccountLoading, setSalesAcLoading] = useState(false)
  const [updateCustomerId, setUpdateCustomerId] = useState(null);
  const { currentCurrency: currentCurrencyFromStore,currentFinancialYear } = useAuth();
  const { selectedBranchId, currentCurrency } = useAuth();
  const [orderMasterId, setOrderMasterId] = useState(null);
  const [showTaxType, setShowTaxType] = useState(false);
  const salesModeOptions = [
    { value: 'NA', label: 'NA' },
    { value: 'Quotation', label: 'Against Quotation' },
    { value: 'Proforma', label: 'Against Proforma' },
    { value: 'Order', label: 'Against Order' },
    { value: 'DeliveryNote', label: 'Against Delivery Note' },
  ];

  // Handler for opening modal in add mode
  const handleAddCustomer = () => {
    setCustomerEditMode(false);
    setCustomerModalOpen(true);
  };

  // Handler for opening modal in edit mode
  const handleEditCustomer = async () => {
    const result = await Swal.fire({
      title: 'Edit Customer?',
      text: 'Changing the customer details will update all related records and transactions with the new name.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Continue',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const container = document.querySelector('.swal2-container');
        if (container) {
          container.style.cssText += '; z-index: 2147483647 !important;';
        }
      }
    });

    if (!result.isConfirmed) return;

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
    fetchCustomer();

    // If in edit mode, keep the same customer selected
    // If in add mode, you might want to select the newly created customer
    if (!customerEditMode && responseData?.ledgerId) {
      handleDropdownChange("ledgerId", responseData.ledgerId);
    }
  };


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

        const autoFormType = data?.tinNumber
          ? 'Tax Invoice'
          : 'Retail Invoice';


        setFormData(prev => ({
          ...prev,
          customerData: data,
          formType: autoFormType,
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
          customercreditLimit: data?.creditLimit || '',
          customerCreditlimitStatus: data?.creditLimitStatus || 'Ignore',
        }));
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoadingCustomer(false);
    }
  };
  useEffect(() => {
    fetchSalesOrderData(formData.ledgerId)
  }, [formData.ledgerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "orderMasterId") {
      setOrderMasterId(value)
    }
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
    if (name === 'taxType') {
      genarateSalesInvoiceId(value)
    }
    if (name === 'ledgerId') {
      currentLedgerIdRef.current = value;
      fetchLedgerBalance(value);
      fetchQuotationData(value);
      fetchProformaData(value);
      fetchSalesOrderData(value);
      fetchDeliveryNoteData(value);
      fetchCustomerData(value)
    }
    if (name === 'quotationMasterId') {
      setFormData(prev => ({ ...prev, AgainstNo: 'Quotation' })); // ← Ensure AgainstNo is set
      loadSalesModeData('quotation', value)
    }
    if (name === 'proformaMasterId') {
      setFormData(prev => ({ ...prev, AgainstNo: 'Proforma' }));
      loadSalesModeData('proforma', value)
    }
    if (name === 'orderMasterId') {
      setFormData(prev => ({ ...prev, AgainstNo: 'Order' }));
      loadSalesModeData('salesOrder', value)
    }
    if (name === 'deliveryNoteMasterId') {
      setFormData(prev => ({ ...prev, AgainstNo: 'Delivery Note' })); // ← Fix here ✅
      loadSalesModeData('deliveryNote', value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchCustomer = async () => {
    try {
      const res = await axiosInstance.post("customer-supplier-account-ledgers", {
        ledgerTypes: ["Customer"],
        branchId: selectedBranchId
      });
      if (res.data && !res.data.error) {

        setCustomers(res.data.data);
      } else {
        console.error("API Error:", res.data.message);
      }
    } catch (err) {
      console.error("Error fetching Account Ledgers:", err);
    } 
  };
  

  const handleKeyDown = (e) => {

    if (e.key === 'Enter' && orderMasterId) {
      e.preventDefault();
      loadSalesModeData('salesOrder', orderMasterId)
    }
  };
  const fetchQuotationData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-invoice-quotation-list', { p_ledgerid: ledgerId, p_branchid: selectedBranchId, p_salesmasterid: null });
      if (!response.data.error) {
        setQuotationData(response.data.data)
      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);
    }
  }

  const fetchProformaData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-invoice-proforma-list', { p_ledgerid: ledgerId, p_branchid: selectedBranchId, p_salesmasterid: null });
      if (!response.data.error) {
        setProformaData(response.data.data)
      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);
    }
  }

  const fetchSalesOrderData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-invoice-sales-order-list', { p_ledgerid: ledgerId, p_branchid: selectedBranchId, p_salesmasterid: null });
      if (!response.data.error) {
        setSalesOrderData(response.data.data)
      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);
    }
  }

  const fetchDeliveryNoteData = async (ledgerId) => {
    try {
      const response = await axiosInstance.post('get-sales-invoice-delivery-note-list', { p_ledgerid: ledgerId, p_branchid: selectedBranchId, p_salesmasterid: null, p_isaccountsposting: false });
      if (!response.data.error) {
        setDeliveryNoteData(response.data.data)
      }
    } catch (error) {
      console.error('Error Fetching quotation Data', error);
    }
  }

  return (
    <div className='p-2 space-y-2'>
      {/* Primary Fields */}
      <div className="border-b pb-3">

        {/* ROW 1: Invoice/Date | Customer+Address | Godown | Sales Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_3fr_2fr_2fr] gap-2">

          {/* Col 1: Invoice No + Date */}
          <div className='col-span-0.5'>
            <div className="flex flex-col gap-1">
              <TextInput
                label={t('salesInvoice.form.label.formHeaderSection.invoiceNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='text-red-600 font-bold'
                readOnly={true}
                labelBold
              />
              <DateInput
                timeText={editMode ? formData.billTime : time}
                label={t('salesInvoice.form.label.formHeaderSection.date')}
                format={generalSettings.dateformat}
                value={formData.date}
                min={currentFinancialYear?.fromDate}
                max={currentFinancialYear?.toDate}
                name='date'
                onChange={handleInputChange}
                className="w-full"
                required
                error={errors.date}
                autoFocus
              />
            </div>
          </div>
          {/* Col 2: Customer Dropdown + Address Box */}
          <div className=''>
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 items-end w-full">
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
                    <AddNewBtn
                      icon={Pencil}
                      onClick={handleEditCustomer}
                      title={t("customer.form.breadcrumb.editCustomer") || "Edit Customer"}
                    />
                  ) : (
                    <AddNewBtn
                      icon={Plus}
                      onClick={handleAddCustomer}
                      title={t("customer.form.breadcrumb.addCustomer") || "Add Customer"}
                    />
                  )}
                </div>
              </div>

              {/* Address Box */}
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
                      <h2 className='font-bold text-xs lg:text-sm'>{billingAddress?.name}</h2>
                      <p className='text-[11px] lg:text-xs'>{billingAddress?.phoneNo}</p>
                      <p className='text-[11px] lg:text-xs break-words'>{billingAddress?.address}</p>
                      {
                        billingAddress?.vatNo && (
                          <p className='text-[11px] lg:text-xs'>
                            {t('salesInvoice.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo}
                          </p>
                        )
                      }
                      {/* // After */}
                      <p className={`text-xs lg:text-sm font-semibold ${Number(currentledgerBalance) < 0 ? "text-red-600" : "text-green-600"}`}>
                        {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance || 0).toFixed(generalSettings?.decimalPart ?? 2)}
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
                <div className='w-full h-24 flex justify-center items-center border rounded-xl text-gray-400 font-bold text-xs'>
                  {t('salesInvoice.form.label.formHeaderSection.selectCustomerMsg')}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Godown + Form Type */}
          <div className="flex flex-col gap-1">
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
                clearable={true}
                className="w-full"
                loading={loading.godowns}
              />
            )}
            <div className='grid grid-cols-2 gap-1'>
              <SearchableDropdown
                label={t('salesInvoice.form.footerSection.otherDetails.label.formType')}
                options={[
                  { value: 'Tax Invoice', label: 'Tax Invoice' },
                  { value: 'Retail Invoice', label: 'Retail Invoice' },
                ]}
                value={formData.formType}
                onChange={(value) => handleDropdownChange('formType', value)}
                placeholder={t('salesInvoice.form.footerSection.otherDetails.label.formType')}
                searchPlaceholder={t('salesInvoice.form.footerSection.otherDetails.label.formType')}
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
            </div>
          </div>

          {/* Col 4: Sales Mode + Against dropdowns */}
          <div className="flex flex-col gap-1">
            <TextInput
              name="orderMasterId"
              label={t('salesInvoice.form.label.formHeaderSection.orderNo')}
              value={formData.orderMasterId || orderMasterId}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('salesInvoice.form.label.formHeaderSection.orderNo')}
              className="w-full"
            />

            <SearchableDropdown
              name="AgainstNo"
              label={t('salesInvoice.form.label.formHeaderSection.AgainstNo')}
              options={salesModeOptions}
              value={formData.AgainstNo}
              onChange={(value) => handleDropdownChange('AgainstNo', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
              clearable={true}
              className='w-full'
            />


            <div className="flex flex-col gap-1">
              {(formData.AgainstNo === 'Quotation' && formData.ledgerId) && (
                <SearchableDropdown
                  label={t("salesInvoice.form.label.formHeaderSection.selecteQuotation")}
                  options={quotationData.map((data) => ({
                    value: data.quotationMasterId,
                    label: `${data.quotationNo} | ${data.QuotationDate} | ${data.ledgerName} | ${data.tinNumber} | ${data.CustomerPhone} | ${data.totalAmount}`
                  }))}
                  value={formData.quotationMasterId}
                  onChange={(value) => handleDropdownChange('quotationMasterId', value)}
                  placeholder={t('salesInvoice.form.label.formHeaderSection.selecteQuotation')}
                  searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.selecteQuotation')}
                  clearable={true}
                  className="w-full"
                />
              )}
              {(formData.AgainstNo === 'Proforma' && formData.ledgerId) && (
                <SearchableDropdown
                  label={t("salesInvoice.form.label.formHeaderSection.selecteProforma")}
                  options={proformaData.map((data) => ({
                    value: data.proformaMasterId,
                    label: `${data.proformaNo} | ${data.date} | ${data.partyName} | ${data.tinNumber} | ${data.partyMobile} | ${data.totalAmount}`
                  }))}
                  value={formData.proformaMasterId}
                  onChange={(value) => handleDropdownChange('proformaMasterId', value)}
                  placeholder={t('salesInvoice.form.label.formHeaderSection.selecteProforma')}
                  searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.selecteProforma')}
                  clearable={true}
                  className="w-full"
                />
              )}
              {(formData.AgainstNo === 'Order') && (
                <SearchableDropdown
                  label={t("salesInvoice.form.label.formHeaderSection.selecteOrder")}
                  options={salesOrderData.map((data) => ({
                    value: data.orderMasterId,
                    label: `${data.orderNo} | ${data.OrderDate} | ${data.partyName} | ${data.tinNumber} | ${data.partyMobile} | ${data.totalAmount}`
                  }))}
                  value={formData.orderMasterId}
                  onChange={(value) => handleDropdownChange('orderMasterId', value)}
                  placeholder={t('salesInvoice.form.label.formHeaderSection.selecteOrder')}
                  searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.selecteOrder')}
                  clearable={true}
                  className="w-full"
                />
              )}
              {(formData.AgainstNo === 'DeliveryNote' && formData.ledgerId) && (
                <SearchableDropdown
                  label={t("salesInvoice.form.label.formHeaderSection.selecteDlvryNote")}
                  options={deliveryNoteData.map((data) => ({
                    value: data.deliveryNoteMasterId,
                    label: `${data.deliveryNoteNo} | ${data.DeliveryNoteDate} | ${data.customerName} | ${data.tinNumber} | ${data.CustomerPhone} | ${data.totalAmount}`
                  }))}
                  value={formData.deliveryNoteMasterId}
                  onChange={(value) => handleDropdownChange('deliveryNoteMasterId', value)}
                  placeholder={t('salesInvoice.form.label.formHeaderSection.selecteDlvryNote')}
                  searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.selecteDlvryNote')}
                  clearable={true}
                  className="w-full"
                />
              )}

              {/* ✅ KEY CHANGE: Show inline fields OR "More..." button based on seeFulFeilds */}

            </div>
            {!seeFulFeilds && (
              <button
                onClick={() => setShowAdditionalFieldsModal(true)}
                className="flex items-center dark:bg-[#242424] gap-2 px-4 py-1.5 w-full justify-center text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors mt-0"
              >
                More...
              </button>
            )}

          </div>
        </div>
        <div>
          {seeFulFeilds && (
            <div className="border rounded-xl mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-1">
              {/* Sales Information */}
              <div>
                {/* <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Sales Information
                  </h3> */}
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <SearchableDropdown
                      name="employeeId"
                      label={t('salesInvoice.form.label.formHeaderSection.salesMan') || 'Sales Person'}
                      options={employees?.map((data) => ({
                        value: data.employeeId,
                        label: data.employeeName,
                      }))}
                      value={formData.employeeId}
                      onChange={(value) => handleDropdownChange('employeeId', value)}
                      placeholder="Sales Man"
                      searchPlaceholder="Search sales person..."
                      clearable={true}
                      className="w-full"
                      loading={loading?.employees}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <AddNewBtn
                      icon={Plus}
                      onClick={() => setEmployeeModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
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
                  placeholder={t('salesInvoice.form.label.formHeaderSection.costCentreId')}
                  searchPlaceholder={t('salesInvoice.form.label.formHeaderSection.costCentreId')}
                  clearable={true}
                  className="w-full"
                  loading={loading?.costCenters}
                />
              )}
              <TextInput
                name="RefNo"
                label={t('salesInvoice.form.label.formHeaderSection.RefNo') || 'Reference No'}
                type="number"
                value={formData.RefNo}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter reference number..."
              />
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.refDate') || 'Reference Date'}
                format={generalSettings?.dateformat}
                value={formData.refDate}
                name="refDate"
                onChange={handleInputChange}
                className="w-full"
              />
              <SearchableDropdown
                name="BatchId"
                label={t('salesInvoice.form.label.formHeaderSection.BatchId') || 'Batch'}
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
              />
              <TextInput
                name="orderRefNo"
                label={t('salesInvoice.form.label.formHeaderSection.orderRefNo') || 'Order Ref No'}
                value={formData.orderRefNo}
                onChange={handleInputChange}
                placeholder="Enter order reference..."
                className="w-full"
              />
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.orderRefDate') || 'Order Ref Date'}
                format={generalSettings?.dateformat}
                value={formData.orderRefDate}
                name="orderRefDate"
                onChange={handleInputChange}
                className="w-full"
              />

              <SearchableDropdown
                name="pricingLevelId"
                label={t('salesInvoice.form.label.formHeaderSection.pricingLevelId') || 'Pricing Level'}
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
              />
              <TextInput
                name="creditPeriod"
                label={t('salesInvoice.form.label.formHeaderSection.creditPeriod') || 'Credit Period (Days)'}
                type="number"
                value={formData.creditPeriod}
                onChange={handleInputChange}
                placeholder="Enter credit period..."
                className="w-full"
              />
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.dueDate') || 'Due Date'}
                format={generalSettings?.dateformat}
                value={formData.dueDate}
                name="dueDate"
                onChange={handleInputChange}
                className="w-full"
              />
              <DateInput
                label={t('salesInvoice.form.label.formHeaderSection.deliveryDate') || 'Delivery Date'}
                format={generalSettings?.dateformat}
                value={formData.deliveryDate}
                name="deliveryDate"
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
          )}
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
          onClick={() =>  financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
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
          cash={cash}
          bank={bank}
          otherChargeLedgers={otherChargeLedgers}
        />
      </div>

      {/* Modals */}

      {/* ✅ Only render AdditionalFieldsModal when seeFulFeilds is false */}
      {!seeFulFeilds && (
        <AdditionalFieldsModal
          open={showAdditionalFieldsModal}
          onClose={() => setShowAdditionalFieldsModal(false)}
          formData={formData}
          handleInputChange={handleInputChange}
          handleDropdownChange={handleDropdownChange}
          employees={employees}
          costCenters={costCenters}
          batches={batches}
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
        />
      )}

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
        handleChange={(field, value) => handleDropdownChange(field, value)}
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
