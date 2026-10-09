import TextInput from '@/components/elements/theme/TextInput'
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SupplierDropdown from '@/components/elements/theme/SupplierDropdown'
import { useSelector } from 'react-redux'
import { PencilIcon, Plus } from 'lucide-react'
import AddNewBtn from '@/components/common/AddNewBtn'
// import AddEmployeeModal from './AddEmployeeModal'
import axiosInstance from '@/lib/axiosConfig'
import AddSupplierModal from './AddSupplierModal'
import ShippingAddressModal from '../SalesInvoice/ShippingAddressModal'
import BillingAddressModal from './BillingAddressModal'
import useAuth from '@/redux/hook/auth/useAuth'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal';
import PayableVoucherTable from './PayableVoucherTable'
import DateInput from '@/components/elements/theme/DateInput'
import AddEmployeeModal from '../Delivery Note/AddEmployeeModal'
import CustomerDropdown from '@/components/elements/theme/CustomerDropdown'
import usePrivileges from '@/lib/hooks/usePrivileges'

const FormSectionMain = ({
  generalSettings,
  existingInvoiceNo,
  time,
  invoiceId,
  formData,
  setFormData,
  employees,
  fetchEmployees,
  costCenters,
  suppliers,
  fetchSupplier,
  editMode,
  rows,
  setRows,
  loading,

  payableVouchrLedgers,
  banks,
  cash,
  currency = [],
  currencyConvertionData = [],
  financeSettings,
  onLedgerCreated
}) => {
    const { hasAccess:employeeAccess,  } = usePrivileges("Employee");

  const { t } = useTranslation();
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const { financeSettings: financeSettingsFromStore } = useSelector((state) => state.settings);
  const effectiveFinanceSettings = financeSettings ?? financeSettingsFromStore;
  // const { generalSettings } = useSelector((state) => state.settings);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [shippingAddresOpen, setShippingAddressOpen] = useState(false);
  const [billingAddressOpen, setBilligAddressOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [shippingAdderess, setShippingAddress] = useState(null);
  const [updateSupplierId, setUpdateSupplierId] = useState(null);
  const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
  const [billingAddress, setBlillingAddress] = useState(null);


  const { selectedBranchId, currentCurrency, currentFinancialYear } = useAuth()
  const [errors, setErrors] = useState({});



  useEffect(() => {
    if (formData.ledgerId) {
      currentLedgerIdRef.current = formData.ledgerId;
      fetchSupplierData(formData.ledgerId);
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

  // 


  const fetchSupplierData = async (ledgerId) => {
    setLoadingSupplier(true);
    try {
      const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId}`);

      if (response.data) {
        const data = response.data.data;

        const defaultShipping = Array.isArray(data?.shipping_address)
          ? data.shipping_address.find(addr => addr?.Isdefault === true)
          : null;

        setUpdateSupplierId(data?.ledgerId);

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
      console.error("Error fetching supplier data:", error);
    } finally {
      setLoadingSupplier(false);
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
      fetchSupplierData(value)
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
                label={t('payableVoucher.form.label.payableNo')}
                value={editMode ? existingInvoiceNo : invoiceId}
                onChange={handleInputChange}
                required
                className='w-full sm:w-[100px] text-red-600 dark:text-red-400 font-bold'
                readOnly={true}
              />

              <div className='w-full sm:w-[150px] lg:w-[160px]'>

                <DateInput
                  label={t('payableVoucher.form.label.formHeaderSection.date')}
                  value={formData.date}
                  timeText={time}
                  name='date'
                  onChange={handleInputChange}
                  className="w-full"
                  format={generalSettings.dateformat}
                  required
                  min={currentFinancialYear?.fromDate}
                  max={currentFinancialYear?.toDate}
                />
              </div>

           {employeeAccess&&(
               <div className='flex gap-0.5 lg:gap-1 items-end flex-1'>
                <div className='flex-1 min-w-0'>
                  <SearchableDropdown
                    name="employeeId"
                    label={t('payableVoucher.form.label.formHeaderSection.employee')}
                    options={employees?.map((data) => ({
                      value: data.employeeId,
                      label: data.employeeName,
                    }))}
                    value={formData.employeeId}
                    onChange={(value) => handleDropdownChange('employeeId', value)}
                    placeholder={t('payableVoucher.form.placeholders.formHeaderSection.employee')}
                    searchPlaceholder="Employee..."
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
                  label={t('payableVoucher.form.label.formHeaderSection.costCentreId')}
                  options={costCenters?.map((data) => ({
                    value: data.costCentreId,
                    label: data.CostCentre,
                  }))}
                  value={formData.costCentreId}
                  onChange={(value) => handleDropdownChange('costCentreId', value)}
                  placeholder={t('payableVoucher.form.placeholders.formHeaderSection.costCentreId')}
                  searchPlaceholder={t('payableVoucher.form.placeholders.formHeaderSection.costCentreId')}
                  error={errors.costCenterId}
                  clearable={true}
                  className="w-full"
                  loading={loading.costCenters}
                />
              )}

              <TextInput
                name="ReferenceNo"
                label={t('payableVoucher.form.label.formHeaderSection.RefNo')}
                type="text"
                value={formData.ReferenceNo}
                onChange={handleInputChange}
                error={errors.RefNo}
                className="w-full"
                placeholder={t('payableVoucher.form.placeholders.formHeaderSection.RefNo')}
              />




              <DateInput
                label={t('payableVoucher.form.label.formHeaderSection.refDate')}
                value={formData.ReferenceDate}
                name='ReferenceDate'
                onChange={handleInputChange}
                className="w-full"
                format={generalSettings.dateformat}
              />

            </div>

            {/* Supplier Selection Row */}
            <div className="grid grid-cols-2 gap-1 lg:gap-1.5">
              <div className='flex gap-1 lg:gap-1.5 items-end w-full'>
                <div className='flex-1 min-w-0'>
                  <CustomerDropdown
                    label={t('payableVoucher.form.label.formHeaderSection.ledgerId')}
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
                    placeholder={t('payableVoucher.form.placeholders.formHeaderSection.ledgerId')}
                    searchPlaceholder={t('payableVoucher.form.placeholders.formHeaderSection.ledgerId')}
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
              {generalSettings.ActivateTax && (
                <SearchableDropdown
                  name="taxType"
                  label={t('payableVoucher.form.label.formHeaderSection.taxType')}
                  options={[
                    { value: "NA", label: "NA" },
                    { value: "applicable to ledgers", label: "Applicable to ledgers" },
                  ]}
                  value={formData.taxType}
                  onChange={(value) => handleDropdownChange('taxType', value)}
                  placeholder={t('payableVoucher.form.label.formHeaderSection.taxType')}
                  searchPlaceholder={t('payableVoucher.form.label.formHeaderSection.taxType')}
                  clearable={true}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Address & Dates */}
        <div className="space-y-1.5 lg:space-y-2">
          {formData?.ledgerId ? (
            loadingSupplier ? (
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
              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-3'>
                {/* Billing Address */}
                <div className='bg-tertiary dark:bg-tertiary p-2 rounded-lg border border-themed dark:border-themed'>
                  <h1 className='text-red-600 dark:text-red-400 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                    {t('payableVoucher.form.label.formHeaderSection.billingAddressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-red-700 dark:hover:text-red-300"
                      onClick={() => setBilligAddressOpen(true)}
                    />
                  </h1>
                  <h2 className='font-bold text-xs lg:text-sm text-primary dark:text-primary'>{billingAddress?.name}</h2>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>{billingAddress?.phoneNo}</p>
                  <p className='text-[11px] lg:text-xs break-words text-secondary dark:text-secondary'>{billingAddress?.address}</p>
                  <p className='text-[11px] lg:text-xs text-secondary dark:text-secondary'>
                    {t('payableVoucher.form.label.formHeaderSection.vatLabel')}: {billingAddress?.vatNo}
                  </p>
                  <p className={`text-xs lg:text-sm font-semibold ${currentledgerBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                    }`}>
                    {t('payableVoucher.form.label.formHeaderSection.balanceLabel')}: {currentledgerBalance}
                  </p>
                </div>

                {/* Shipping Address */}
                <div className='bg-tertiary dark:bg-tertiary p-2 rounded-lg border border-themed dark:border-themed'>
                  <h1 className='text-green-600 dark:text-green-400 text-sm lg:text-base flex gap-1 lg:gap-2 items-center mb-1'>
                    {t('payableVoucher.form.label.formHeaderSection.shippingAddressHeading')}
                    <PencilIcon
                      className="w-4 h-4 cursor-pointer hover:text-green-700 dark:hover:text-green-300"
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
                    {t('payableVoucher.form.label.formHeaderSection.vatLabel')}: {shippingAdderess?.vatNo}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className='w-full h-24 lg:h-28 flex justify-center items-center border border-themed dark:border-themed rounded-xl bg-secondary dark:bg-secondary text-muted dark:text-muted font-bold text-xs lg:text-sm'>
              {t('payableVoucher.form.label.formHeaderSection.selectSupplierMsg')}
            </div>
          )}


        </div>
      </div>

      {/* Currency Link */}
      {effectiveFinanceSettings?.multiCurrency && (
          <div className='flex flex-wrap gap-2 text-xs mt-2 mb-1'>
              <p
                  className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
                  onClick={() => setCurrencyModalOpen(true)}
              >
                  Currency: {formData?.currencyName || currentCurrency?.currencyName || 'Select Currency'}
              </p>
          </div>
      )}

      {/* Payable Voucher Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <PayableVoucherTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}


          ledgers={payableVouchrLedgers}
          banks={banks}
          cash={cash}
          onLedgerCreated={onLedgerCreated}
        />
      </div>

      {/* Modals */}
      {/* <SelectedPurchaseACModal
        open={purchaseAcModalOpen}
        handleClose={() => setPurchaseAcModalOpen(false)}
        formData={formData}
        handleChange={handleDropdownChange}
        purchaseAccounts={purchaseAccounts}
      /> */}
      {effectiveFinanceSettings?.multiCurrency && (
        <SelecteCurrecyModal
            open={currencyModalOpen}
            handleClose={() => setCurrencyModalOpen(false)}
            formData={formData}
            currency={currency}
            handleChange={(field, value) => handleDropdownChange(field, value)}
            currencyConvertionData={currencyConvertionData}
        />
      )}
      <AddEmployeeModal
        open={employeeModalOpen}
        handleClose={() => setEmployeeModalOpen(false)}
        onSuccess={fetchEmployees}
      />
      <AddSupplierModal
        open={supplierModalOpen}
        handleClose={() => setSupplierModalOpen(false)}
        onSuccess={fetchSupplier}
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