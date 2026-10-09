import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
// import Customer from '@/components/elements/theme/SupplierDropdown'
import { useSelector } from 'react-redux'
import { PencilIcon, Plus } from 'lucide-react'
import SelectedPurchaseACModal from './SelectedPurchaseACModal'

import PurchaseModeModal from './PurchaseModeModal'
import AddNewBtn from '@/components/common/AddNewBtn'
// import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import ShippingAddressModal from './ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import MaterialReceiptTable from './MaterialReceiptTable'
import DateInput from '@/components/elements/theme/DateInput'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal'
import AddCustomerModal from '@/components/elements/theme/AddCustomerModal'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import usePrivileges from '@/lib/hooks/usePrivileges'


const FormSectionMain = ({
  batches,
  existingInvoiceNo,
  time,
  invoiceId,
  formData,
  setFormData,
  costCenters,
  suppliers,
  fetchSupplier,
  godowns,
  editMode,
  rows,
  setRows,
  loading,

  billingAddress,
  setBlillingAddress,
  currentledgerBalance,
  setCurrentLedgerBalance,
  otherChargeLedgers,
  currency,
  fetchAgainstModeDetailes,
  fetchSupplierData,
  setUpdateSupplierId,
  updateSupplierId,
  loadingSupplier
}) => {
  const { hasAccess: purchaseQuotationHasAccess } = usePrivileges("Purchase Quotation");
  const { hasAccess: transactionBatchHasAccess } = usePrivileges("Transaction Batch");

  const { t } = useTranslation();
  const { generalSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
  const [purchaseAcModalOpen, setPurchaseAcModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [purchaseModeModalOpen, setPurchaseModeModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [purchaseAccounts, setPurchaseAccounts] = useState([]);

  const { currentCurrency: currentCurrencyFromStore, setCurrency, currentFinancialYear } = useAuth();
  const { selectedBranchId, currentCurrency } = useAuth()
  const [errors, setErrors] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showTaxType, setShowTaxType] = useState(false);
  const [currencyConvertionData, setCurrencyConvertionData] = useState([]);

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

  const purchaseModeOptions = [
    { value: 'NA', label: 'NA' },
    purchaseQuotationHasAccess ? { value: 'Quotation', label: 'Against Quotation' } : null,
    { value: 'Order', label: 'Against Order' },
  ];
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


  const fetchLedgerBalance = async (ledgerId) => {

    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      setCurrentLedgerBalance(res?.data?.data?.currentbal)
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    fetchPurchaseOrdertList(formData.ledgerId)

  }, [formData.ledgerId])
  const fetchPurchaseOrdertList = async (ledgerId) => {
    try {
      const res = await axiosInstance.post('material-receipt-purchase-order-list', { ordermasterId: "All", branchId: selectedBranchId, ledgerId: ledgerId, receiptmasterId: null });
      setPurchaseOrders(res.data.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const fetchPurchaseAccounts = async () => {
      try {
        const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [26], branchId: selectedBranchId });
        const accounts = res.data.data;
        setPurchaseAccounts(accounts);

        if (accounts.length > 0 && !formData.purchaseAccount) {
          setFormData(prev => ({
            ...prev,
            purchaseAccount: accounts[0].ledgerId,
            purchaseAccountName: accounts[0].ledgerName
          }));
        }
      } catch (error) {
        console.error('Error fetching Purchase Account');
      }
    };
    fetchPurchaseAccounts();
  }, []);

  useEffect(() => {
    if (formData.purchaseAccount && purchaseAccounts.length > 0) {
      const selectedAccount = purchaseAccounts.find(acc => acc.ledgerId === formData.purchaseAccount);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          purchaseAccountName: selectedAccount.ledgerName
        }));
      }
    }
  }, [formData.purchaseAccount, purchaseAccounts]);



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
      fetchSupplierData(value)
    }
    if (name === "AgainstNo" && value == "Order") {
      fetchPurchaseOrdertList(formData.ledgerId);
    }
    if (name === "orderMasterId") {
      fetchAgainstModeDetailes('Order', value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
                label={t('materialReceipt.form.label.receiptNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='w-full sm:w-[100px] text-red-600 font-bold'
                readOnly={true}
              />




              <DateInput
                label={t('materialReceipt.form.label.formHeaderSection.date')}
                timeText={time}
                value={formData.date}
                name='date'
                onChange={handleInputChange}
                required
                className="w-full"
                min={currentFinancialYear?.fromDate}
                max={currentFinancialYear?.toDate}
              />

              {transactionBatchHasAccess && (
                <SearchableDropdown
                  name="BatchId"
                  label={t('materialReceipt.form.label.formHeaderSection.BatchId')}
                  options={batches.map(batch => ({
                    value: batch.transactionbatchid,
                    label: batch.batchname
                  }))}
                  value={formData.BatchId}
                  onChange={(value) => handleDropdownChange('BatchId', value)}
                  placeholder={t('materialReceipt.form.placeholders.formHeaderSection.BatchId')}
                  searchPlaceholder={t('materialReceipt.form.placeholders.formHeaderSection.BatchId')}
                  error={errors.batch}
                  clearable={true}
                  className="w-full"
                />
              )}

            </div>

            {/* Dynamic Grid Section */}
            <div className={`grid gap-1 lg:gap-1.5 ${generalSettings?.costCentre
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2'
              }`}>
              {generalSettings?.costCentre && (
                <SearchableDropdown
                  name="costCentreId"
                  label={t('materialReceipt.form.label.formHeaderSection.costCentreId')}
                  options={costCenters?.map((data) => ({
                    value: data.costCentreId,
                    label: data.CostCentre,
                  }))}
                  value={formData.costCentreId}
                  onChange={(value) => handleDropdownChange('costCentreId', value)}
                  placeholder={t('materialReceipt.form.placeholders.formHeaderSection.costCentreId')}
                  searchPlaceholder={t('materialReceipt.form.placeholders.formHeaderSection.costCentreId')}
                  error={errors.costCenterId}
                  clearable={true}
                  className="w-full"
                  loading={loading.costCenters}
                />
              )}

              <TextInput
                name="partyRefNo"
                label={t('materialReceipt.form.label.formHeaderSection.RefNo')}
                type="text"
                value={formData.partyRefNo}
                onChange={handleInputChange}
                className="w-full"
                placeholder={t('materialReceipt.form.placeholders.formHeaderSection.RefNo')}
              />

              <DateInput
                label={t('materialReceipt.form.label.formHeaderSection.refDate')}
                value={formData.partyRefDate}
                name='partyRefDate'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
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
                  readOnly={editMode}
                />
              )}


            </div>


          </div>

          {/* Purchase Mode & Godown Column */}
          <div className='w-full lg:w-[22%] space-y-1 lg:space-y-1.5'>


            {saleSettings?.ActiveGodown === true && (
              <SearchableDropdown
                name="GodownId"
                label={t('materialReceipt.form.label.formHeaderSection.GodownId')}
                options={godowns?.map((data) => ({
                  value: data.GodownId,
                  label: data.GodownName,
                }))}
                value={formData.GodownId}
                onChange={(value) => handleDropdownChange('GodownId', value)}
                placeholder={t('materialReceipt.form.placeholders.formHeaderSection.GodownId')}
                searchPlaceholder={t('materialReceipt.form.placeholders.formHeaderSection.GodownId')}
                error={errors.GodownId}
                clearable={true}
                className="w-full"
                loading={loading.godowns}
              />
            )}
            <SearchableDropdown
              name="AgainstNo"
              label={t('materialReceipt.form.label.formHeaderSection.AgainstNo')}
              options={purchaseModeOptions}
              value={formData.AgainstNo}
              onChange={(value) => handleDropdownChange('AgainstNo', value)}
              placeholder={t('materialReceipt.form.placeholders.formHeaderSection.AgainstNo')}
              searchPlaceholder={t('materialReceipt.form.placeholders.formHeaderSection.AgainstNo')}
              error={errors.AgainstNo}
              clearable={true}
              className='w-full'
              readOnly={editMode}
            />
            {formData.AgainstNo === 'Order' && (
              <SearchableDropdown
                label={t("purchaseInvoice.form.label.againstOrder")}
                options={purchaseOrders?.map(order => ({
                  value: order.orderMasterId,
                  label: `${order.orderNo} - ${order.orderDate} - ${order.ledgerName || ''} - ${order.totalAmount}`
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
          </div>
        </div>

        {/* RIGHT SECTION - Address & Dates */}
        <div className="space-y-1.5 lg:space-y-2">

          <div className='flex gap-1 lg:gap-1.5 items-end w-full sm:col-span-2'>
            <div className='flex-1 min-w-0'>
              <CustomerDropdown
                label={t('materialReceipt.form.label.formHeaderSection.ledgerId')}
                name="ledgerId"
                value={formData.ledgerId}
                onChange={(value) => handleDropdownChange("ledgerId", value)}
                options={suppliers?.map((data) => ({
                  value: data.ledgerId,
                  label: data.ledgerName,
                  balance: data.openingBalance,
                  address: `${data.StreetName || ""} ${data.CityName || ""} ${data.Country || ""}`,
                  vatNo: data.tinNumber,
                  phoneNo: data.phoneNo,

                }))}
                placeholder={t('materialReceipt.form.placeholders.formHeaderSection.ledgerId')}
                searchPlaceholder={t('materialReceipt.form.placeholders.formHeaderSection.ledgerId')}
                clearable
                required
                loading={loading.suppliers}
              />
            </div>
            <div className='flex-shrink-0'>
              <AddNewBtn
                icon={Plus}
                onClick={() => setSupplierModalOpen(true)}
              />
            </div>
          </div>
          {formData?.ledgerId ? (
            loadingSupplier ? (
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
                    {t('materialReceipt.form.label.formHeaderSection.billingAddressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-red-700"
                      onClick={() => setBilligAddressOpen(true)}
                    />
                  </h1>
                  <h2 className='font-bold text-xs lg:text-sm'>{billingAddress?.name}</h2>
                  <p className='text-[11px] lg:text-xs'>{billingAddress?.phoneNo}</p>
                  <p className='text-[11px] lg:text-xs break-words'>{billingAddress?.address}</p>
                  <p className='text-[11px] lg:text-xs'>
                    {t('materialReceipt.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo}
                  </p>
                  <p className={`text-xs lg:text-sm font-semibold ${currentledgerBalance < 0 ? "text-red-600" : "text-green-600"
                    }`}>
                    {t('salesInvoice.form.label.formHeaderSection.balanceLabel')}: {Number(currentledgerBalance).toFixed(generalSettings.decimalPart)}
                  </p>
                </div>


              </div>
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border rounded-xl text-gray-400 font-bold text-xs lg:text-sm'>
              {t('materialReceipt.form.label.formHeaderSection.selectSupplierMsg')}
            </div>
          )}


        </div>
      </div>

      {/* Purchase Account & Currency Links */}
      <div className='flex flex-wrap gap-2 lg:gap-3 text-xs'>
        {/* <p
          className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
          onClick={() => setPurchaseAcModalOpen(true)}
        >
          {t('materialReceipt.form.label.formHeaderSection.purchaseAcLabel')}: {formData.purchaseAccountName}
        </p> */}
      {financeSettings?.multiCurrency && (
  <p
    className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
    onClick={() => financeSettings?.multiCurrency && setCurrencyModalOpen(true)}
  >
    {t('salesInvoice.form.label.formHeaderSection.currencyLabel')}: {formData?.currencyName || currentCurrencyFromStore?.currencyName || "Select Currency"}
  </p>
)}
      </div>

      {/* Material Receipt Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <MaterialReceiptTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}
          godowns={godowns}
          otherChargeLedgers={otherChargeLedgers}
        />
      </div>

      {/* Modals */}
      <SelectedPurchaseACModal
        open={purchaseAcModalOpen}
        handleClose={() => setPurchaseAcModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
        purchaseAccounts={purchaseAccounts}
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
      <PurchaseModeModal
        open={purchaseModeModalOpen}
        handleClose={() => setPurchaseModeModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
      />
      {/* <AddEmployeeModal
        open={employeeModalOpen}
        handleClose={() => setEmployeeModalOpen(false)}
        onSuccess={fetchEmployees}
      /> */}
      <AddCustomerModal
        open={supplierModalOpen}
        handleClose={() => setSupplierModalOpen(false)}
        onSuccess={fetchSupplier}
        type='supplier'
      />
      <ShippingAddressModal
        open={shippingAddresOpen}
        handleClose={() => setShippingAddressOpen(false)}
        editId={updateSupplierId}
        onSuccess={() => {
          fetchSupplierData(currentLedgerIdRef.current)
          fetchSupplier()
        }}
      />
      <BillingAddressModal
        open={billingAddressOpen}
        handleClose={() => setBilligAddressOpen(false)}
        editId={updateSupplierId}
        onSuccess={() => {
          fetchSupplierData(currentLedgerIdRef.current)
          fetchSupplier()
        }}
      />
    </div>
  )
}

export default FormSectionMain