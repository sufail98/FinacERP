import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import { useSelector } from 'react-redux'
import { PencilIcon, Plus } from 'lucide-react'

import SalesModeModal from './SalesModeModal'
import AddNewBtn from '@/components/common/AddNewBtn'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'

import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './PurchaseInvoiceTable'
import SelectedPurchaseACModal from './SelectedPurchaseACModal'
import useFormValidation from '@/lib/hooks/useFormValidation'
// ✅ CHANGED: Import timezone-safe DateInput
import DateInput from '../SalesQuotation/SalesQuotationDateInput'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'
import AddCustomerModal from '@/components/elements/theme/AddCustomerModal'
import DocumentUpload from '../../../common/DocumentUpload'
import usePrivileges from '@/lib/hooks/usePrivileges'

const FormSectionMain = ({
  existingInvoiceNo,
  invoiceId,
  formData,
  setFormData,
  fetchEmployees,
  costCenters,
  customers,
  fetchCustomer,
  godowns,
  editMode,
  rows,
  setRows,
  loading,
  setErrors,
  errors,
  handleBlur,
  validationRules,
  batches,

  setCurrentLedgerBalance,
  setBlillingAddress,
  billingAddress,
  otherChargeLedgers,
  currentledgerBalance,
  taxData,
  bank,
  cash,
  purchaseAccounts,
  currency,
  getAginsteModeDetailes,
  documents,
  setDocuments,
  existingDocuments,
  setExistingDocuments,
  removedDocuments,
  setRemovedDocuments,
  setUpdateCustomerId,
  updateCustomerId

}) => {
  const { hasAccess: transactionBatchHasAccess } = usePrivileges("Transaction Batch");
  const { t } = useTranslation();
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const { generalSettings, purchaseSettings, financeSettings } = useSelector((state) => state.settings);
  const [salesAcModalOpen, setSalesAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [salesModeModalOpen, setSalesModeModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [showTaxType, setShowTaxType] = useState(false);
  const [currencyConvertionData, setCurrencyConvertionData] = useState([]);

  const [shippingAdderess, setShippingAddress] = useState(null);
  const [quotationData, setQuotationData] = useState([]);
  const [fetchSalesAccountLoading, setSalesAcLoading] = useState(false);
  const [materialReceiptList, setMaterialReceiptList] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const { currentCurrency: currentCurrencyFromStore, setCurrency } = useAuth();
  const { selectedBranchId, currentCurrency, currentFinancialYear } = useAuth()

  const salesModeOptions = [
    { value: 'NA', label: 'NA' },
    { value: 'Order', label: 'Against Order' },
    { value: 'Reciept', label: 'Against Reciept' },
  ];

  const fetchLedgerBalance = async (ledgerId) => {
    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      setCurrentLedgerBalance(res?.data?.data?.currentbal)
    } catch (error) {
      console.error(error);
    }
  }

  const fetchMetreialReceiptList = async (ledgerId) => {
    try {
      const res = await axiosInstance.post('purchase-invoice-material-receipt-list', { ledgerId: ledgerId, branchId: selectedBranchId, purchasemasterId: null, isaccountsposting: true });
      setMaterialReceiptList(res.data.data);
    } catch (error) {
      console.error(error);
    }
  }
  const fetchPurchaseOrdertList = async (ledgerId) => {
    try {
      const res = await axiosInstance.post('purchase-invoice-against-order-list', { ledgerId: ledgerId, branchId: selectedBranchId, purchasemasterId: null });
      setPurchaseOrders(res.data.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchCurrencyConvertion()
  }, [selectedBranchId])
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    const format = generalSettings?.dateformat || 'dd-MM-yyyy';

    return format
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', yyyy);
  };
  const formatDecimal = (value) =>
    Number(value || 0).toFixed(generalSettings.decimalPart);
  const fetchCurrencyConvertion = async () => {
    try {
      const response = await axiosInstance.get(`currency-conversions/${selectedBranchId}`);

      const formattedData = response.data.data.map((item, index) => ({
        ...item,
        SNo: index + 1,
        date: formatDate(item.date),
        rate: item.rate !== null && item.rate !== undefined
          ? formatDecimal(item.rate)
          : formatDecimal(0),
      }));

      setCurrencyConvertionData(formattedData);

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (formData.purchaseAccount && purchaseAccounts.length > 0) {
      const selectedAccount = purchaseAccounts.find(acc => acc.ledgerId === formData.purchaseAccount);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          salesAccountName: selectedAccount.ledgerName
        }));
      }
    }
  }, [formData.purchaseAccount, purchaseAccounts]);

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
          partyPhone: data?.phoneNo || '',
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
      fetchCustomerData(value)
    }

    if (name === "AgainstNo" && value == "Reciept") {
      fetchMetreialReceiptList(formData.ledgerId);
    }
    if (name === "AgainstNo" && value == "Order") {
      fetchPurchaseOrdertList(formData.ledgerId);
    }
    if (name === "receiptMasterId") {
      getAginsteModeDetailes('Reciept', value)
    }
    if (name === "orderMasterId") {
      getAginsteModeDetailes('Order', value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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

  return (
    <div className='p-2 space-y-0.5 bg-primary dark:bg-primary'>
      {/* Main Grid - Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-1 lg:gap-2 w-full border-b border-themed dark:border-themed pb-1">

        {/* LEFT SECTION */}
        <div className="flex flex-col lg:flex-row gap-1">
          <div className='w-full lg:w-[78%] space-y-0.5'>

            {/* Invoice Header Row */}
            <div className='flex flex-col sm:flex-row gap-0.5 lg:gap-1'>
              <TextInput
                label={t('purchaseInvoice.form.label.purchaseNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='w-full text-red-600 dark:text-red-400 font-bold'
                readOnly={true}
              />
              <TextInput
                name="vendorInvoiceNo"
                label={t('purchaseInvoice.form.label.vendorInvoiceNo')}
                value={formData.vendorInvoiceNo}
                onChange={handleInputChange}
                placeholder={t('purchaseInvoice.form.label.vendorInvoiceNo')}
                required={purchaseSettings?.VendorInvoiceNoChecking}
                error={errors.vendorInvoiceNo}
                onBlur={(e) => handleBlur(e, validationRules)}
                className='w-full'
              />

              <DateInput
                label={t('physicalStock.form.label.date')}
                value={formData.date}
                name='date'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
                min={currentFinancialYear?.fromDate}
                // max={currentFinancialYear?.toDate}
              />

              <TextInput
                name="creditPeriod"
                label={t('salesInvoice.form.label.formHeaderSection.creditPeriod')}
                type="number"
                value={formData.creditPeriod}
                onChange={handleInputChange}
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.creditPeriod')}
                error={errors.creditPeriod}
                className='w-full'
              />
            </div>

            {/* Dynamic Grid Section */}
            <div className={`grid gap-1 lg:gap-1.5 items-center ${generalSettings?.costCentre
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
                name="RefNo"
                label={t('salesInvoice.form.label.formHeaderSection.RefNo')}
                type="text"
                value={formData.RefNo}
                onChange={handleInputChange}
                error={errors.RefNo}
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

            {transactionBatchHasAccess&&(
                <SearchableDropdown
                name="BatchId"
                label={t('salesInvoice.form.label.formHeaderSection.BatchId')}
                options={batches?.map(batch => ({
                  value: batch.transactionbatchid,
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
            )}

              {purchaseSettings?.ActiveGodown && (
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
                  readOnly={editMode}
                />
              )}
              <div className="">
                <DocumentUpload
                  documents={documents}
                  setDocuments={setDocuments}
                  existingDocuments={existingDocuments}
                  setExistingDocuments={setExistingDocuments}
                  removedDocuments={removedDocuments}
                  setRemovedDocuments={setRemovedDocuments}
                />
              </div>
            </div>
          </div>

          {/* Sales Mode & Godown Column */}
          <div className='w-full lg:w-[22%] space-y-1 lg:space-y-1.5'>

            <DateInput
              label={t('purchaseInvoice.form.label.invoiceDate')}
              value={formData.invoiceDate}
              name='invoiceDate'
              onChange={handleInputChange}
              className="w-full"
              format={generalSettings.dateformat}
            />
          
              <SearchableDropdown
              name="AgainstNo"
              label={t('purchaseInvoice.form.label.AgainstNo')}
              options={salesModeOptions}
              value={formData.AgainstNo}
              onChange={(value) => handleDropdownChange('AgainstNo', value)}
              placeholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
              searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.AgainstNo')}
              error={errors.AgainstNo}
              clearable={true}
              className='w-full'
              readOnly={editMode}
            />
           
            

            {formData.AgainstNo === 'Order' && (
              <SearchableDropdown
                label={t("purchaseInvoice.form.label.againstOrder")}
                options={purchaseOrders?.map(order => ({
                  value: order.ordermasterid,
                  label: `${order.orderno} - ${new Date(order.orderdate).toLocaleDateString()} - ${order.ledgername || ''} - ${order.totalamount}`
                }))}
                value={formData.orderMasterId}
                onChange={(value) => handleDropdownChange('orderMasterId', value)}
                placeholder={t('purchaseInvoice.form.label.againstOrder')}
                searchPlaceholder={t('purchaseInvoice.form.label.againstOrder')}
                clearable={true}
                className="w-full"
                readOnly={editMode}
              />
            )}
            {formData.AgainstNo === 'Reciept' && (
              <SearchableDropdown
                label={t("purchaseInvoice.form.label.againstReceipt")}
                options={materialReceiptList?.map(item => ({
                  value: item.receiptmasterid,
                  label: `${item.receiptno} - ${new Date(item.receiptdate).toLocaleDateString()} - ${item.ledgername || ''} - ${item.totalamount}`
                }))}
                value={formData.receiptMasterId}
                onChange={(value) => handleDropdownChange('receiptMasterId', value)}
                placeholder={t('purchaseInvoice.form.label.againstReceipt')}
                searchPlaceholder={t('purchaseInvoice.form.label.againstReceipt')}
                clearable={true}
                className="w-full"
                readOnly={editMode}
              />
            )}
          </div>
        </div>

        {/* RIGHT SECTION - Address & Dates */}
        <div className="space-y-1.5 lg:space-y-2 pr-1">
          <div className='flex gap-1 lg:gap-1.5 items-end w-full sm:col-span-2'>
            <div className='flex-1 min-w-0'>
              <CustomerDropdown
                label={t('purchaseInvoice.form.label.ledgerId')}
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
                placeholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerIdSupplier')}
                searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.ledgerIdSupplier')}
                clearable
                required
                loading={loading.customers}
                error={errors.ledgerId}
                onBlur={(e) => handleBlur(e, validationRules)}
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
                    {t('purchaseInvoice.form.label.AddressHeading')}
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
                  <p className={`text-xs lg:text-sm font-semibold ${Number(currentledgerBalance) < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                    }`}>
                    {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed dark:border-themed rounded-xl bg-secondary dark:bg-secondary text-muted dark:text-muted font-bold text-xs lg:text-sm'>
              {t('salesInvoice.form.label.formHeaderSection.selectSupplierMsg')}
            </div>
          )}
        </div>
      </div>

      {/* Sales Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        <p
          className='text-blue-600 dark:text-blue-400 border-b border-blue-600 dark:border-blue-400 w-fit cursor-pointer hover:text-blue-700 dark:hover:text-blue-300'
          onClick={() => setSalesAcModalOpen(true)}
        >
          {t('salesInvoice.form.label.formHeaderSection.salesAcLabel')}: {formData.purchaseAccountName}
        </p>
       {financeSettings?.multiCurrency && (
  <p
    className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
    onClick={() => financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
  >
    {t('salesInvoice.form.label.formHeaderSection.currencyLabel')}: {formData?.currencyName || currentCurrencyFromStore?.currencyName || "Select Currency"}
  </p>
)}
      </div>

      {/* Sales Invoice Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <SalesInvoiceTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}
          godowns={godowns}
          otherChargeLedgers={otherChargeLedgers}
          taxData={taxData}
          bank={bank}
          cash={cash}
        />
      </div>

      {/* Modals */}
      <SelectedPurchaseACModal
        open={salesAcModalOpen}
        handleClose={() => setSalesAcModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
        salesAccounts={purchaseAccounts}
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
        currencyConvertionData={currencyConvertionData}
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
        type="supplier"
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