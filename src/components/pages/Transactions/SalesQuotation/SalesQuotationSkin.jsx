import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, CheckCircle, Eraser, Loader2, MessageCircle, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import { salesQuotationPrintOne, salesQuotationPrintOneAsPDF, saveQuotationAsPDF } from '@/utils/prints/salesQuotationPtints/salesQuotationPrintOne';
import { salesQuotationPrintTwo, salesQuotationPrintTwoAsPDF } from '@/utils/prints/salesQuotationPtints/salesQuotationPrintTwo';
import { parseDateFromAPI, parseLocalDate } from './salesQuotationDateFormat';
import { formatDateWithTime } from '@/lib/dateFormat';
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import PopupPreloader from '@/components/common/PopupPreloader';
import { showToast } from '@/utils/toast';
import salesQuotationPrintThree, { salesQuotationPrintThreeAsPDF } from '@/utils/prints/salesQuotationPtints/salesQuotationPrintThree';
import WhatsAppModal from '@/components/common/WhatsAppModal';
import salesQuotationPrintFour, { salesQuotationPrintFourAsPDF } from '@/utils/prints/salesQuotationPtints/salesQuotationPrintFour';

const SalesQuotationSkin = () => {
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const { saleQuotationId } = useParams();
    const [searchParams] = useSearchParams();

    const editMode = Boolean(saleQuotationId);
    const [isEditMode, setIsEditMode] = useState(Boolean(saleQuotationId));
    const [isInEditMode, setIsInEditMode] = useState(Boolean(saleQuotationId));
    const [canEdit, setCanEdit] = useState(!Boolean(saleQuotationId));
    const [fetchLoading, setFetchLoading] = useState(false)
    const navigate = useNavigate()
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('')
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [currency, setCurrnecies] = useState([]);
    const [updateCustomerId, setUpdateCustomerId] = useState(null);

    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, printSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [batches, setBatches] = useState([]);
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [cash, setCash] = useState([])
    const [bank, setBank] = useState([])
    const [salesAccount, setSalesAccount] = useState([])
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [taxData, setTaxData] = useState([])
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);
    const decimalPart = generalSettings?.decimalPart ?? 2;

    const invoiceTypes = Object.keys(printSettings?.["Sales Quotation"]?.types || {});
    const invoicePrintConfig = printSettings?.["Sales Quotation"]?.default || Object.values(printSettings?.["Sales Quotation"]?.types || {})[0];
      const [formData, setFormData] = useState({
        voucherType: "Sales Quotation",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: financeSettings.defaultSalesAccount || '',
        pricingLevelId: 1,
        employeeId: '',
        salesAccount: '',
        salesAccountName: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType,
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'Type 2',
        contactperson: '',
        contactno: '',
        DeliveryTerms: '',
        approved: false,
        paymentterms: '',
        quatationvalidity: '',
        Certificate: '',
        IncoTerms: '',
        deliveredwithin: '',
        deliverysite: '',
        grandTotal: null,
        costCentreId: 1,
        BatchId: '',
        customerName: '',
        CustomerAddress: '',
        CustomerPhone: '',
        CustomerVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        creditPeriod: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        quotationMasterId: "",
        vehicleNo: "",
        narration: "",
        taxableAmt: "",
        subTotal: "",
        totalTax: "",
        additionalCost: "",
        billDiscount: "",
        billDiscountWithTax: "",
        roundOff: "",
        totalAmount: "",
        CarMake: "",
        CarModel: "",
        Kilometer: "",
        NextService: "",
        VehicleInTime: "",
        VehicleOutTime: "",
        preinvoiceHash: "",
        currentinvoiceHash: "",
        UUID: "",
        customerData: {},
        Zatcastatus: "",
        logdata: "",
        qr_link: "",
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        billDiscOnProductStatus: false,
        AddCostonProductStatus: false,
        branchId: selectedBranchId,
        CreatedUser: userId,
        vatLedgerId: generalSettings?.taxLedgerId,
        quotationDetails: [
            {
                deliveryNoteDetails1Id: "",
                proformaDetails1Id: "",
                SlNo: "",
                productName: '',
                productNameArb: '',
                productCode: "",
                qty: null,
                freeQty: null,
                rate: null,
                unitId: null,
                discountPercentage: null,
                discountAmount: null,
                taxId: null,
                taxType: "",
                ConversionFactor: null,
                barcode: "",
                PurchaseRate: null,
                taxAmount: null,
                grossAmount: null,
                netAmount: null,
                amount: null,
                productDescription: "",
                billDiscOnProduct: null,
                AddCostonProduct: null,
                otherchargeonproduct: null,
                salesManId: null,
                RackId: null,
                branchId: selectedBranchId
            }
        ]
    });

    // ===== GET RETURN FILTERS FROM URL =====
    const getReturnFilters = useCallback(() => {
        const returnFilters = searchParams.get('returnFilters');
        if (returnFilters) {
            try {
                return new URLSearchParams(decodeURIComponent(returnFilters));
            } catch (e) {
                console.error('Error decoding return filters:', e);
            }
        }
        return null;
    }, [searchParams]);

    // Load held quotations from localStorage on mount
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesQuotations');
        if (savedHeldInvoices) {
            const allHeldInvoices = JSON.parse(savedHeldInvoices);
            const branchHeldInvoices = allHeldInvoices.filter(inv => inv.branchId === selectedBranchId);
            setHeldInvoices(branchHeldInvoices);
        }
    }, [selectedBranchId]);

    // Persist held quotations to localStorage whenever they change
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesQuotations');
        const allHeldInvoices = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
        const otherBranchInvoices = allHeldInvoices.filter(inv => inv.branchId !== selectedBranchId);
        const updatedAllInvoices = [...otherBranchInvoices, ...heldInvoices];
        if (updatedAllInvoices.length > 0) {
            localStorage.setItem('heldSalesQuotations', JSON.stringify(updatedAllInvoices));
        } else {
            localStorage.removeItem('heldSalesQuotations');
        }
    }, [heldInvoices, selectedBranchId]);

    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.quotationDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldInvoice = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId: invoiceId,
            customerName: formData.customerName || 'Unknown Customer',
            customerAddress: formData.CustomerAddress || '',
            totalAmount: formData.totalAmount || 0,
            itemCount: formData.quotationDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldInvoices(prev => [...prev, heldInvoice]);
        showToast.success(`Quotation held successfully. Total held: ${heldInvoices.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);

    const restoreHeldInvoice = (heldInvoice) => {
        const hasValidProducts = formData.quotationDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (hasValidProducts) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                customerName: formData.customerName || 'Current Quotation',
                customerAddress: formData.CustomerAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.quotationDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId,
                formData: { ...formData }
            };
            setHeldInvoices(prev => [...prev.filter(inv => inv.id !== heldInvoice.id), currentHeld]);
        } else {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== heldInvoice.id));
        }
        setFormData(heldInvoice.formData);
        setInvoiceId(heldInvoice.invoiceId);
        setResetTableKey(prev => prev + 1);
        setShowHeldInvoices(false);
        setRestoredHeldInvoiceId(heldInvoice.id);
        showToast.success("Quotation restored successfully");
    };

    const deleteHeldInvoice = (invoiceId) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        showToast.success("Held quotation deleted");
    };
    const HeldInvoicesPanel = () => {
        if (!showHeldInvoices || heldInvoices.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Quotations ({heldInvoices.length})
                    </h3>
                    <button
                        onClick={() => setShowHeldInvoices(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{invoice.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Quotation: {invoice.invoiceId}</p>
                                    {invoice.customerAddress && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {invoice.customerAddress}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        {parseFloat(invoice.totalAmount || 0).toFixed(decimalPart)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.itemCount} items</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                {new Date(invoice.timestamp).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => restoreHeldInvoice(invoice)}
                                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:main-bg text-sm font-medium transition-colors"
                                >Restore</button>
                                <button
                                    onClick={() => deleteHeldInvoice(invoice.id)}
                                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
                                >Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                holdCurrentInvoice();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentInvoice]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", {
                hour12: true,
                hour: "2-digit",
                minute: "2-digit",
            });
            setTime(formatted);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

  

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultSalesAccount || '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 2',
            taxType: generalSettings.taxType,
        }));
    }, [financeSettings, saleSettings, printSettings, generalSettings]);

    // ===== HANDLE LIST NAVIGATE WITH FILTERS =====
    const handleListNavigate = async (preserveFilters = true) => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t('ConfirmCloseTitle'),
                text: t('ConfirmCloseText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClose'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        // If in edit mode and we have return filters, use them
        if (editMode && preserveFilters) {
            const returnFilters = getReturnFilters();
            if (returnFilters) {
                navigate(`/transaction/sales-quotation/quotations?${returnFilters.toString()}`);
            } else {
                navigate("/transaction/sales-quotation/quotations");
            }
        } else {
            navigate("/transaction/sales-quotation/quotations");
        }
    };

    const clearForm = async (skipConfirmation = false) => {
        skipConfirmation = skipConfirmation === true;

        if (!skipConfirmation && generalSettings?.askConfirmationClear) {
            const result = await Swal.fire({
                title: t('ConfirmClearTitle'),
                text: t('ConfirmClearText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClear'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setFormData({
            voucherType: "Sales Quotation",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: financeSettings.defaultSalesAccount || '',
            pricingLevelId: 1,
            employeeId: '',
            salesAccount: '',
            contactperson: '',
            DeliveryTerms: '',
            approved: false,
            paymentterms: '',
            quatationvalidity: '',
            Certificate: '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 1',
            IncoTerms: '',
            salesAccountName: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            costCentreId: 1,
            BatchId: '',
            customerName: '',
            CustomerAddress: '',
            CustomerPhone: '',
            CustomerVatNo: '',
            partyRefNo: "",
            partyRefDate: "",
            creditPeriod: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            quotationMasterId: "",
            vehicleNo: "",
            narration: "",
            taxableAmt: "",
            deliveredwithin: '',
            deliverysite: '',
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            billDiscount: "",
            roundOff: "",
            totalAmount: "",
            CarMake: "",
            CarModel: "",
            Kilometer: "",
            NextService: "",
            VehicleInTime: "",
            VehicleOutTime: "",
            preinvoiceHash: "",
            currentinvoiceHash: "",
            UUID: "",
            Zatcastatus: "",
            logdata: "",
            qr_link: "",
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            billDiscOnProductStatus: false,
            AddCostonProductStatus: false,
            branchId: selectedBranchId,
            CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId,
            billDiscountWithTax: null,
            customerData: {},
            quotationDetails: [
                {
                    deliveryNoteDetails1Id: "",
                    proformaDetails1Id: "",
                    SlNo: "",
                    productCode: "",
                    productName: '',
                    productNameArb: '',
                    qty: null,
                    freeQty: null,
                    rate: null,
                    unitId: null,
                    discountPercentage: null,
                    taxId: null,
                    taxType: "",
                    discountAmount: null,
                    ConversionFactor: null,
                    barcode: "",
                    PurchaseRate: null,
                    taxAmount: null,
                    grossAmount: null,
                    netAmount: null,
                    amount: null,
                    productDescription: "",
                    billDiscOnProduct: null,
                    AddCostonProduct: null,
                    otherchargeonproduct: null,
                    salesManId: null,
                    RackId: null,
                    branchId: selectedBranchId
                }
            ]
        });

        setIsInEditMode(false);

        if (isEditMode) {
            setCanEdit(true);
            setIsEditMode(false);
            setExistingInvoiceNo('');
            if (!skipConfirmation) {
                genarateSalesInvoiceId();
            }
        }
        setResetTableKey(prev => prev + 1);
        fetchCustomerData(financeSettings?.defaultSalesAccount);
    };

    useEffect(() => {
        if (editMode) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();
        const isMidnight = currentHour === 0 && currentMinute === 0 && currentSecond === 0;

        setFormData(prev => {
            const prevDate = new Date(prev.date);
            const today = new Date();
            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();
            if (!isSameDate || isMidnight) return { ...prev, date: today };
            return prev;
        });
    }, [time, editMode]);

    const fetchCustomerData = async (ledgerId) => {

        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId || formData.ledgerId}`);
            if (response.data) {
                const data = response.data.data;
                const defaultShipping = Array.isArray(data?.shipping_address)
                    ? data.shipping_address.find(addr => addr?.Isdefault === true)
                    : null;
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
                    CustomerVatNo: data?.tinNumber || '',
                    // ✅ Add this line
                    customerData: {
                        ...prev.customerData,
                        phoneNo: data?.phoneNo || '',
                        ledgerName: data?.ledgerName || '',
                        address: data?.address || '',
                        tinNumber: data?.tinNumber || '',
                    }
                }));
            }
        } catch (error) {
            console.error("Error fetching customer data:", error);
        }
    };

    const [baseDataloading, setBaseDataloading] = useState(false)

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                let editLedgerId = null;
                if (editMode) {
                    const editRes = await axiosInstance.get(`get-sales-quotation-byId/${saleQuotationId}`);
                    editLedgerId = editRes.data.data.ledgerId;
                }
                const res = await axiosInstance.post('all-sales-data', {
                    voucherType: "Sales Quotation",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Customer"],
                    ledgerId: editLedgerId || formData.ledgerId || '',
                    currencyId: currentCurrency.currencyId
                })
                const data = res?.data?.data

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setPricingLevel(data?.pricinglevel)
                setBatches(data?.transactionbatch)

                const filteredCurrencies = data?.currencywithConversion?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrnecies(filteredCurrencies);

                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal)
                setSalesAccount(data?.salesAccount)
                setTaxData(data?.taxMaster)

                if (editMode) {
                    await getSalesById(data?.taxMaster, data?.othercharge);
                }

                if (data?.salesAccount.length > 0 && !formData.salesAccount) {
                    setFormData(prev => ({
                        ...prev,
                        salesAccount: data?.salesAccount[0].ledgerId,
                        salesAccountName: data?.salesAccount[0].ledgerName
                    }));
                }
                setOtherChargLedgers(data?.othercharge)
                setFormData(prev => ({ ...prev, customerData: data?.customeraddress }));

                const defaultShipping = Array.isArray(data?.customeraddress?.shipping_address)
                    ? data?.customeraddress?.shipping_address.find(addr => addr?.Isdefault === true)
                    : null;
                setUpdateCustomerId(data?.customeraddress?.ledgerId)
                setShippingAddress({
                    name: data?.customeraddress?.ledgerName || '',
                    email: data?.customeraddress?.email || '',
                    phoneNo: data?.customeraddress?.phoneNo || '',
                    shippingAddress: defaultShipping || {},
                    vatNo: data?.customeraddress?.tinNumber || ''
                });
                setBlillingAddress({
                    name: data?.customeraddress?.ledgerName || '',
                    email: data?.customeraddress?.email || '',
                    phoneNo: data?.customeraddress?.phoneNo || '',
                    vatNo: data?.customeraddress?.tinNumber || '',
                    address: data?.customeraddress?.address || ''
                });
                setFormData((prev) => ({
                    ...prev,
                    customerName: data?.customeraddress?.ledgerName || '',
                    CustomerAddress: data?.customeraddress?.address || '',
                    CustomerPhone: data?.customeraddress?.phoneNo || '',
                    CustomerVatNo: data?.customeraddress?.tinNumber || '',
                    customercreditLimit: data?.customeraddress?.creditLimit || '',
                    customerCreditlimitStatus: data?.customeraddress?.creditLimitStatus || 'Ignore',
                    creditPeriod: data?.customeraddress?.creditPeriod || 0
                }));
            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])

    const getSalesById = async (taxMaster, otherChargeLedgerList = []) => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-sales-quotation-byId/${saleQuotationId}`);
            const data = response.data.data;
            const resolvedLedgerName = otherChargeLedgerList?.find(
                l => Number(l.ledgerId) === Number(data?.otherChargeLedgerId)
            )?.ledgerName || '';
            setExistingInvoiceNo(data.quotationNo)

            const salesDetailsWithProducts = await Promise.all(
                (data?.quotationDetails || []).map(async (item) => {
                    let productName = '';
                    let productNameArb = '';
                    let availableUnits = [];
                    let productDetails = {
                        productCode: item.productCode || '',
                        barcode: item.barcode || '',
                        partNo: '',
                        brand: '',
                        mrp: '',
                        purchase: item.PurchaseRate || '',
                        productDescription: item.productDescription || '',
                        UnitName: ''
                    };

                    const resolvedTaxData = taxMaster || taxData;
                    const taxInfo = resolvedTaxData?.find(t => t.taxId === item?.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo?.rate) : 0;

                    if (item.productCode) {
                        try {
                            productName = item?.productname || '';
                            productNameArb = item?.productNameArb || '';
                            availableUnits = item?.units || [];
                            const selectedUnit = availableUnits.find(u => u.unitid === item.unitId);
                            productDetails = {
                                productCode: item.productCode,
                                barcode: selectedUnit?.barcode || item.barcode || '',
                                partNo: item.partno || '',
                                brand: item?.brand?.brandName || '',
                                mrp: item.mrp || '',
                                purchase: item.PurchaseRate || '',
                                productDescription: item.productDescription || '',
                                UnitName: selectedUnit?.unitname || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        quotationMasterId: item.quotationMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName,
                        productNameArb,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        unitId: item.unitId,
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        discountAmount: parseFloat(item.discountAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: parseFloat(item.inclusiveRate) || 0,
                        taxId: item.taxId,
                        taxRate,
                        taxType: item.taxType,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        billDiscOnProduct: item.billDiscOnProduct,
                        AddCostonProduct: item.AddCostonProduct,
                        otherchargeonproduct: item.otherchargeonproduct,
                        salesManId: item.salesManId,
                        RackId: item.RackId,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits,
                        productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Sales Quotation",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId || 1,
                employeeId: data.employeeId,
                salesAccount: data.salesAccount,
                salesAccountName: salesAccount.find(s => s.ledgerId === data.salesAccount)?.ledgerName || '',
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId || 1,
                BatchId: Number(data?.BatchId),
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                customerVATNo: data.customerVATNo,
                contactperson: data.contactperson,
                DeliveryTerms: data.DeliveryTerms,
                approved: data.approved,
                paymentterms: data.paymentterms,
                quatationvalidity: data.quatationvalidity,
                Certificate: data.Certificate,
                IncoTerms: data.IncoTerms,
                contactno: data.contactno,
                printType: data.printType || invoicePrintConfig?.printType || 'Type 1',
                partyRefNo: data.partyRefNo,
                partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : "",
                creditPeriod: data.creditPeriod,
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                quotationMasterId: data.quotationMasterId,
                vehicleNo: data.vehicleNo,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                billDiscount: (parseFloat(data.billDiscount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                roundOff: (parseFloat(data.roundOff) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                totalAmount: data.totalAmount,
                CarMake: data.CarMake,
                CarModel: data.CarModel,
                Kilometer: data.Kilometer,
                NextService: data.NextService,
                VehicleInTime: data.VehicleInTime,
                VehicleOutTime: data.VehicleOutTime,
                preinvoiceHash: data.preinvoiceHash,
                currentinvoiceHash: data.currentinvoiceHash,
                UUID: data.UUID,
                Zatcastatus: data.Zatcastatus,
                logdata: data.logdata,
                deliveredwithin: data.deliveredwithin || '',
                deliverysite: data.deliverysite || '',
                qr_link: data.qr_link,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseLocalDate(data.postedDate) : "",
                billDiscOnProductStatus: data.billDiscOnProductStatus,
                AddCostonProductStatus: data.AddCostonProductStatus,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                vatLedgerId: data.vatLedgerId,
                otherChargeLedgerId: data?.otherChargeLedgerId,
                billDiscountWithTax: data?.billDiscountWithTax,
                othercharge: data?.othercharge,
                otherChargeLedgerName: resolvedLedgerName,   // ← ADD THIS
                OtherChargeRemark: resolvedLedgerName,
                quotationDetails: salesDetailsWithProducts,
            }));



            setResetTableKey((prev) => prev + 1);
        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        pricingLevel: false,
        customers: false,
        batch: false
    });

    const fetchEmployees = async () => {
        setLoading(prev => ({ ...prev, employees: true }));
        try {
            const { data } = await axiosInstance.get("employees");
            setEmployees(data.data);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(prev => ({ ...prev, employees: false }));
        }
    };

    const fetchCustomer = async () => {
        setLoading(prev => ({ ...prev, customers: true }));
        try {
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: ["Customer"],
                branchId: selectedBranchId
            });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Sales Quotation&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
            );
            if (editMode) setExistingInvoiceNo(response.data.voucherCode);
            setInvoiceId(response.data.voucherCode)
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];
        if (!formData.ledgerId) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select invoice date');
        if (!formData.quotationDetails || formData.quotationDetails.length === 0) {
            errors.push('Please add at least one product');
        }
        const hasValidProducts = formData.quotationDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    const buildInvoiceDataForPrint = useCallback((invoiceNumber) => {
        const selectedEmployee = employees.find(emp => emp.employeeId === formData.employeeId);
        return {
            ...formData,
            invoiceNo: invoiceNumber,
            salesMan: selectedEmployee?.employeeName || '',
            salesDetails: formData.quotationDetails,
        };
    }, [formData, employees]);

    const printToPrinter = useCallback(async (invoiceDataForPrint) => {
        const selectedPrintType = formData.printType || 'Type 1';
        switch (selectedPrintType) {
            case 'Type 1': await salesQuotationPrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
            case 'Type 2': await salesQuotationPrintTwo(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
            case 'Type 3': await salesQuotationPrintThree(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
            case 'Type 4': await salesQuotationPrintFour(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
            default: await salesQuotationPrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency);
        }
    }, [formData.printType, selectedBranchDetails, currentCurrency]);

    const printToPdf = useCallback(async (invoiceDataForPrint) => {
        try {
            const selectedPrintType = formData.printType || 'Type 1';
            let result;
            switch (selectedPrintType) {
                case 'Type 1': result = await salesQuotationPrintOneAsPDF(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
                case 'Type 2': result = await salesQuotationPrintTwoAsPDF(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
                case 'Type 3': result = await salesQuotationPrintThreeAsPDF(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
                case 'Type 4': result = await salesQuotationPrintFourAsPDF(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency); break;
                default: result = await salesQuotationPrintTwoAsPDF(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency);
            }
            if (result.success) {
                showToast.success(t("PDF saved successfully") || "PDF saved successfully!");
            } else if (result.error && result.error !== 'Save cancelled') {
                showToast.error(result.error);
            }
        } catch (error) {
            console.error('Error saving PDF:', error);
            showToast.error(t("Failed to save PDF") || "Failed to save PDF");
        }
    }, [formData.printType, selectedBranchDetails, t]);

    const handleSendWhatsApp = useCallback(() => {
        setWhatsappModalOpen(true);
    }, []);

    const handleCloseWhatsAppModal = useCallback(() => {
        setWhatsappModalOpen(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;
        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            showToast.error(validationErrors.join('\n'));
            return;
        }

        if (isInEditMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"), text: t("ConfirmUpdateText"), icon: 'question',
                showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!isInEditMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'), text: t('ConfirmSaveText'), icon: 'question',
                showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date)
            };
            const api = isInEditMode
                ? `update-sales-quotation/${saleQuotationId}`
                : 'save-sales-quotation';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {

                setIsSaving(false);
                showToast.success(t("saveSuccess"));

                const invoiceDataForPrint = buildInvoiceDataForPrint(editMode ? existingInvoiceNo : invoiceId);
                // const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceId);

                if (formData.printAfterSave) {
                    setTimeout(async () => { await printToPrinter(invoiceDataForPrint); }, 500);
                } else {
                    const pdfResult = await Swal.fire({
                        title: t('Print as PDF?') || 'Print as PDF?',
                        text: t('Do you want to download this as a PDF') || 'Do you want to download this quotation as a PDF?',
                        icon: 'question',
                        showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(async () => { await printToPdf(invoiceDataForPrint); }, 500);
                    }
                }

                if (editMode) {
                    setIsEditMode(false);
                    handleListNavigate(true);
                    genarateSalesInvoiceId();
                    clearForm(true);
                } else {
                    genarateSalesInvoiceId();
                    clearForm(true);
                }

                if (saleSettings.CloseAfterSave) {
                    handleListNavigate(false);
                }
            }
        } catch (error) {
            console.error('Error saving sales:', error);
            Swal.fire({
                icon: 'error', title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save sales quotation',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode, invoiceId, employees, buildInvoiceDataForPrint, printToPrinter, printToPdf, handleListNavigate]);

    const handleReprintToPrinter = useCallback(async () => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo);
        await printToPrinter(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, printToPrinter]);

    const handleReprintToPdf = useCallback(async () => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo);
        await printToPdf(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, printToPdf]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const [approving, setApproving] = useState(false)
    const approveQuotation = async () => {
        setApproving(true)
        try {
            const res = await axiosInstance.get(`approve-sales-quotation/${saleQuotationId}`);
            if (!res.data.error) showToast.success(res.data.message);
            setFormData((prev) => ({
                ...prev,
                approved: true,
            }))
        } catch (error) {
            console.error('error approving quotation')
        } finally {
            setApproving(false)
        }
    }

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesQuotation.breadcrumb.master"), url: "#" },
                        { title: editMode ? t("salesQuotation.breadcrumb.editTitle") : t("salesQuotation.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("salesQuotation.breadcrumb.editTitle") : t("salesQuotation.breadcrumb.title") }}
                    actions={[{ label: t("listBtn"), icon: Table, type: "secondary", onClick: () => handleListNavigate(true) }]}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className='bg-primary dark:bg-primary'>
            <PopupPreloader
                isOpen={isSaving}
                state="loading"
                title={t("loadingText")}
                subtitle={t("loadingDesc")}
            />

            <WhatsAppModal
                isOpen={whatsappModalOpen}
                onClose={handleCloseWhatsAppModal}
                documentType="Sales Quotation"
                masterId={saleQuotationId}
                invoiceNo={existingInvoiceNo}
                formData={formData}
                defaultPhone={formData.CustomerPhone || ''}
            />
  <HeldInvoicesPanel />
            <BreadCrumb
                routes={[
                    { title: t("salesQuotation.breadcrumb.master"), url: "#" },
                    {
                        title: editMode ? t("salesQuotation.breadcrumb.editTitle") : t("salesQuotation.breadcrumb.title"),
                        url: "#",
                    },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode ? t("salesQuotation.breadcrumb.editTitle") : t("salesQuotation.breadcrumb.title"),
                }}
                actions={[
                    { label: t("listBtn"), icon: Table, type: "secondary", onClick: () => handleListNavigate(true) },
                    !isEditMode && {
                        label: `Hold Quotation${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
                        icon: Archive,
                        type: "secondary",
                        onClick: holdCurrentInvoice,
                        title: "Hold the current quotation (CTRL + H)",
                    },
                    heldInvoices.length > 0 && !isEditMode && {
                        label: "Restore",
                        icon: ArchiveRestore,
                        type: "tertiary",
                        title: "View and restore held quotations",
                        onClick: () => setShowHeldInvoices(!showHeldInvoices),
                    },
                    { label: t("clearBtn"), icon: Eraser, type: "secondary", onClick: clearForm, title: isEditMode ? "Clear form and return to add mode" : undefined },
                    editMode && !formData.approved && {
                        label: t("approveBtn"), icon: CheckCircle, type: "secondary",
                        onClick: approveQuotation, loading: approving, loadingText: t("loadingText"),
                    },
                    {
                        label: editMode ? t("updateBtn") : t("submitBtn"),
                        icon: isSaving ? Loader2 : isEditMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ].filter(Boolean)}

                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSaveTop"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) => setFormData(prev => ({ ...prev, printAfterSave: value }))}
                            />
                            <label htmlFor="printAfterSaveTop"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none">
                                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                            </label>
                        </div>

                        <select
                            name="printType" id="printType"
                            className='border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none'
                            value={formData.printType || 'Type 1'}
                            onChange={(e) => setFormData(prev => ({ ...prev, printType: e.target.value }))}
                        >
                            {invoiceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>

                        {isEditMode && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                onSendWhatsApp={handleSendWhatsApp}
                            />
                        )}
                    </div>
                }
            />

            <FormSectionMain
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                loading={loading}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                batches={batches}
                costCenters={costCenters}
                customers={customers}
                pricingLevel={pricingLevel}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.quotationDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, quotationDetails: updatedRows }))}
                salesAccount={salesAccount}
                bank={bank}
                cash={cash}
                ledgerBalance={currentledgerBalance}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                otherChargeLedgers={otherChargeLedgers}
                currency={currency}
                genarateSalesInvoiceId={genarateSalesInvoiceId}
                setUpdateCustomerId={setUpdateCustomerId}
                updateCustomerId={updateCustomerId}

            />
        </div>
    )
}

export default SalesQuotationSkin