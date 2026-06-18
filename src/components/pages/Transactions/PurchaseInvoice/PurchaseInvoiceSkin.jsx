import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, Loader2, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useDispatch, useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import purchaseInvoicePrintOne from '@/utils/prints/purchaseInvoicePrints/purchaseInvoicePrintOne';
import { parseDateFromAPI, parseLocalDate } from '../SalesQuotation/salesQuotationDateFormat';
import { showToast } from '@/utils/toast';
// Add these to the existing imports
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateWithTime } from '@/lib/dateFormat';
import { refreshProductsByType } from '@/redux/slice/productSlice';

const PurchaseInvoiceSkin = () => {
    const { purchaseInvoicemasterId } = useParams();
    const editMode = Boolean(purchaseInvoicemasterId);
    const [fetchLoading, setFetchLoading] = useState(false)
    const navigate = useNavigate()
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('')
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [godowns, setGodowns] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const dispatch = useDispatch();

    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, purchaseSettings } = useSelector((state) => state.settings);


    const [resetTableKey, setResetTableKey] = useState(0);
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const [batches, setBatches] = useState([]);

    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [taxData, setTaxData] = useState([]);
    const [purchaseAccounts, setPurchaseAccounts] = useState([])
    const [currency, setCurrencies] = useState([]);

    // ===== HOLD INVOICE STATE =====
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);

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

    const [formData, setFormData] = useState({
        voucherType: "Purchase Invoice",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        invoiceDate: new Date(),
        ledgerId: financeSettings.defaultPurchaseAccount || '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: 'Applicable to product',
        GodownId: 1,
        costCentreId: 1,
        BatchId: 1,
        partyName: '',
        partyAddress: '',
        partyPhone: '',
        partyVatNo: '',
        RefNo: "",
        partyRefDate: "",
        printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
        printType: 'a4',
        purchaseAccount: "",
        purchaseAccountName: "",
        orderMasterId: "",
        receiptMasterId: "",
        vendorInvoiceNo: "",
        creditPeriod: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        AgainstNo: "NA",
        transportCompany: "",
        narration: "",
        taxableAmt: "",
        subTotal: "",
        totalTax: "",
        additionalCost: "",
        otherChargeLedgerId: "",
        othercharge: "",
        billDiscount: "",
        roundoff: "",
        totalAmount: "",
        paymentMode: saleSettings?.DefaultPaymentMode,
        CashLedgerId: 1,
        CashRefNo: "",
        CashAmount: "",
        BankLedgerId: 1,
        BankRefNo: "",
        BankAmount: 0,
        BillBalanceAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        vatLedgerId: generalSettings?.taxLedgerId,
        purchaseDetails: [
            {
                receiptDetails1Id: "",
                orderDetails1Id: "",
                SalesRate: "",
                productName: '',
                productNameArb: '',
                SlNo: "",
                productCode: "",
                qty: null,
                freeQty: null,
                rate: null,
                unitId: null,
                discountPercentage: null,
                taxId: null,
                taxType: "",
                ConversionFactor: null,
                barcode: "",
                taxAmount: null,
                grossAmount: null,
                netAmount: null,
                amount: null,
                productDescription: "",
                billDiscOnProduct: null,
                AddCostonProduct: null,
                otherchargeonproduct: null,
                salesManId: null,
                GodownId: null,
                RackId: null,
                branchId: selectedBranchId
            }
        ]
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultPurchaseAccount || '',
            paymentMode: saleSettings?.DefaultPaymentMode,
            RetentionLedgerId: purchaseSettings?.retentionLedgerId,
        }));
    }, [financeSettings, batches, saleSettings, purchaseSettings]);

    // ===== HOLD INVOICE LOGIC =====
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldPurchaseInvoices');
        if (savedHeldInvoices) {
            const allHeldInvoices = JSON.parse(savedHeldInvoices);
            const branchHeldInvoices = allHeldInvoices.filter(invoice => invoice.branchId === selectedBranchId);
            setHeldInvoices(branchHeldInvoices);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldPurchaseInvoices');
        const allHeldInvoices = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
        const otherBranchInvoices = allHeldInvoices.filter(invoice => invoice.branchId !== selectedBranchId);
        const updatedAllInvoices = [...otherBranchInvoices, ...heldInvoices];
        if (updatedAllInvoices.length > 0) {
            localStorage.setItem('heldPurchaseInvoices', JSON.stringify(updatedAllInvoices));
        } else {
            localStorage.removeItem('heldPurchaseInvoices');
        }
    }, [heldInvoices, selectedBranchId]);

    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.purchaseDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldInvoice = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId: invoiceId,
            vendorName: formData.partyName || 'Unknown Vendor',
            vendorAddress: formData.partyAddress || '',
            totalAmount: formData.totalAmount || 0,
            itemCount: formData.purchaseDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldInvoices(prev => [...prev, heldInvoice]);
        showToast.success(`Invoice held successfully. Total held invoices: ${heldInvoices.length + 1}`);
        clearForm();
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);

    useEffect(() => {
        if (!editMode) {
            const handleKeyDown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                    e.preventDefault();
                    holdCurrentInvoice();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [holdCurrentInvoice, editMode]);

    const restoreHeldInvoice = (heldInvoice) => {
        const hasValidProducts = formData.purchaseDetails.some(detail => detail.productCode && detail.qty > 0);
        if (hasValidProducts) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                vendorName: formData.partyName || 'Current Invoice',
                vendorAddress: formData.partyAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.purchaseDetails.filter(d => d.productCode && d.qty > 0).length,
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
        showToast.success("Invoice restored successfully");
    };

    const deleteHeldInvoice = (invoiceId) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        showToast.success("Held invoice deleted");
    };

    const HeldInvoicesPanel = () => {
        if (!showHeldInvoices || heldInvoices.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Invoices ({heldInvoices.length})
                    </h3>
                    <button
                        onClick={() => setShowHeldInvoices(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        {invoice.vendorName}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Invoice: {invoice.invoiceId}
                                    </p>
                                    {invoice.vendorAddress && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {invoice.vendorAddress}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        {parseFloat(invoice.totalAmount || 0).toFixed(generalSettings.decimalPart)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {invoice.itemCount} items
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                {new Date(invoice.timestamp).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => restoreHeldInvoice(invoice)}
                                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors"
                                >
                                    Restore
                                </button>
                                <button
                                    onClick={() => deleteHeldInvoice(invoice.id)}
                                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    const fetchCustomerData = async (ledgerId) => {
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId}`);

            if (response.data) {
                const data = response.data.data;



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
            //   setLoadingCustomer(false);
        }
    };
    const [baseDataloading, setBaseDataloading] = useState(false)

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-purchase-data', {
                    voucherType: "Purchase Invoice",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: financeSettings?.defaultPurchaseAccount,
                    currencyId: currentCurrency.currencyId
                })
                const data = res?.data?.data;

                const filteredCurrencies = data?.currencies?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setGodowns(data?.godowns)
                setPricingLevel(data?.pricinglevel)
                setBatches(data?.transactionbatch)
                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal)
                setOtherChargLedgers(data?.othercharge)
                setTaxData(data.taxMaster)
                setBanks(data.bank)
                setCash(data.cash)
                setPurchaseAccounts(data.purchaseaccount)
                if (data?.purchaseaccount.length > 0 && !formData.purchaseAccount) {
                    setFormData(prev => ({
                        ...prev,
                        purchaseAccount: data?.purchaseaccount[0].ledgerId,
                        purchaseAccountName: data?.purchaseaccount[0].ledgerName
                    }));
                }
                setFormData(prev => ({
                    ...prev,
                    BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : ''
                }));
                setFormData((prev) => {
                    const defaultGodown = data?.godowns?.find(g => g.IsDefault);

                    return {
                        ...prev,
                        GodownId: defaultGodown
                            ? defaultGodown.GodownId
                            : data?.godowns?.[0]?.GodownId || '',
                    };
                });
                if (!editMode) {
                    const currentLedgerId = financeSettings?.defaultPurchaseAccount || '';
                    const matchingLedger = data?.customersupplierLedgers?.find(
                        (ledger) => ledger.ledgerId === parseInt(currentLedgerId) || ledger.ledgerId === currentLedgerId
                    );

                    const defaultLedger = matchingLedger || (data?.customersupplierLedgers?.length > 0 ? data.customersupplierLedgers[0] : null);

                    if (defaultLedger) {
                        setBlillingAddress({
                            name: defaultLedger.ledgerName || '',
                            email: defaultLedger.email || '',
                            phoneNo: defaultLedger.phoneNo || '',
                            vatNo: defaultLedger.tinNumber || '',
                            address: defaultLedger.address || ''
                        });
                        setFormData((prev) => ({
                            ...prev,
                            partyName: defaultLedger.ledgerName || '',
                            partyAddress: defaultLedger.address || '',
                            partyMobile: defaultLedger.phoneNo || '',
                            partyVatNo: defaultLedger.tinNumber || '',
                        }));
                    } else {
                        setBlillingAddress({ name: '', email: '', phoneNo: '', vatNo: '', address: '' });
                        setFormData((prev) => ({
                            ...prev,
                            partyName: '',
                            partyAddress: '',
                            partyMobile: '',
                            partyVatNo: '',
                        }));
                    }
                }
                // In edit mode, getSalesById sets billingAddress and partyName correctly — don't override it here
            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])



    const handleListNavigate = async () => {
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
        navigate("/transaction/purchase-invoice/purchase-invoice-list");
    };

    //  Clear Form Function
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
            voucherType: "Purchase Invoice",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            invoiceDate: new Date(),
            ledgerId: financeSettings.defaultPurchaseAccount || '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            costCentreId: '',
            BatchId: 1,
            printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
            printType: 'a4',
            customerName: '',
            CustomerAddress: '',
            CustomerPhone: '',
            customerVATNo: '',
            RefNo: "",
            partyRefDate: "",
            creditPeriod: "",
            purchaseAccount: "",
            purchaseAccountName: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            orderMasterId: "",
            receiptMasterId: "",
            AgainstNo: "",
            transportCompany: "",
            narration: "",
            taxableAmt: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            otherChargeLedgerId: "",
            othercharge: "",
            billDiscount: "",
            roundOff: "",
            totalAmount: "",
            paymentMode: "cash",
            CashLedgerId: "",
            CashRefNo: "",
            CashAmount: 0,
            BankLedgerId: null,
            BankRefNo: "",
            BankAmount: 0,
            BillBalanceAmount: 0,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId,
            purchaseDetails: [
                {
                    receiptDetails1Id: "",
                    orderDetails1Id: "",
                    SalesRate: "",
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
                    ConversionFactor: null,
                    barcode: "",
                    taxAmount: null,
                    grossAmount: null,
                    netAmount: null,
                    amount: null,
                    productDescription: "",
                    billDiscOnProduct: null,
                    AddCostonProduct: null,
                    otherchargeonproduct: null,
                    salesManId: null,
                    GodownId: null,
                    RackId: null,
                    branchId: selectedBranchId
                }
            ]
        });
        fetchCustomerData(financeSettings.defaultPurchaseAccount);
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) return;

        setFormData(prev => {
            const prevDate = new Date(prev.date);
            const today = new Date();

            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();

            if (!isSameDate) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time]);

    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])

    const getAginsteModeDetailes = async (mode, masterId) => {
        setFetchLoading(true)
        try {
            let data;
            let againstNoValue = 'NA';

            if (mode === 'Reciept') {
                const response = await axiosInstance.post(`purchase-invoice-material-receipt-details`, {
                    purchasemasterId: null,
                    receiptmasterId: masterId
                });
                data = response.data.data;
                againstNoValue = 'Reciept';
            }
            if (mode === 'Order') {
                const response = await axiosInstance.post(`purchase-invoice-against-order-details`, {
                    purchasemasterId: null,
                    orderMasterId: masterId
                });
                data = response.data.data;
                againstNoValue = 'Order';
            }

            // ✅ Fix: handle different voucherNo field names per mode
            setExistingInvoiceNo(data.receieptNo || data.orderNo || data.voucherNo)

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxMasterData = taxResponse.data.data || [];

            // ✅ Fix: receipt uses purchaseDetails, order uses orderDetails
            const detailsArray = data.purchaseDetails || data.orderDetails || [];

            const salesDetailsWithProducts = await Promise.all(
                detailsArray.map(async (item) => {
                    const productCode = item.productCode || item.productcode || '';
                    const unitId = item.unitId ?? item.unitid ?? null;

                    // ✅ Fix: each mode has different ID field names
                    const receiptDetails1Id = item.receiptDetails1Id ?? item.receiptdetails1id ?? '';
                    const orderDetails1Id = item.orderDetails1Id ?? item.orderdetails1id ?? '';

                    const barcode = item.barcode || '';
                    const qty = item.qty;
                    const rate = item.rate;
                    const freeQty = item.freeQty ?? item.freeqty ?? null;
                    const discountPercentage = item.discountPercentage ?? item.discountpercentage ?? 0;
                    const taxAmountRaw = parseFloat(item.taxAmount ?? item.taxamount ?? 0);
                    const amount = item.amount;
                    const conversionFactor = item.ConversionFactor ?? item.conversionfactor ?? null;
                    const billDiscOnProduct = item.billDiscOnProduct ?? item.billdisconproduct ?? null;
                    const addCostonProduct = item.AddCostonProduct ?? item.addcostonproduct ?? null;
                    const otherchargeonproduct = item.otherchargeonproduct ?? null;
                    const productDescription = item.productDescription ?? item.productdescription ?? '';

                    // Infer taxId from taxamount if not present in response
                    const rawTaxId = item.taxId ?? item.taxid ?? null;
                    let taxInfo = taxMasterData.find(t => t.taxId === rawTaxId);
                    if (!taxInfo) {
                        const netAmt = parseFloat(amount || 0);
                        if (netAmt > 0 && taxAmountRaw > 0) {
                            const impliedRate = (taxAmountRaw / netAmt) * 100;
                            taxInfo = taxMasterData.find(t =>
                                Math.abs(parseFloat(t.rate) - impliedRate) < 0.01
                            );
                        }
                    }
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;
                    const resolvedTaxId = taxInfo ? taxInfo.taxId : null;

                    let productName = '';
                    let availableUnits = [];
                    let productDetails = {
                        productCode,
                        barcode,
                        partNo: item.partNo || item.partno || '',
                        brand: '',
                        mrp: '',
                        purchase: rate || '',
                        productDescription,
                        UnitName: ''
                    };

                    if (productCode) {
                        try {
                            const productResponse = await axiosInstance.get(
                                `get-product-unit-sales-details-byId/${productCode}`
                            );
                            const productData = productResponse.data.data;
                            productName = productData.productname || '';
                            availableUnits = productData.units || [];
                            const selectedUnit = availableUnits.find(u => u.unitid === unitId);
                            productDetails = {
                                productCode,
                                barcode: selectedUnit?.barcode || barcode || '',
                                partNo: productData.partNo || item.partno || '',
                                brand: productData.brand || '',
                                mrp: productData.mrp || '',
                                purchase: rate || '',
                                productDescription,
                                UnitName: selectedUnit?.unitname || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${productCode}:`, err);
                        }
                    }

                    return {
                        receiptDetails1Id,
                        orderDetails1Id,           // ✅ fixed
                        SalesRate: item.SalesRate ?? item.salesrate ?? '',
                        SlNo: item.SlNo ?? item.slno ?? '',
                        productCode,
                        productName,
                        qty: parseFloat(qty) || 0,
                        freeQty: freeQty ? parseFloat(freeQty) : null,
                        rate: parseFloat(rate) || 0,
                        unitId,
                        discountPercentage: parseFloat(discountPercentage) || 0,
                        taxId: resolvedTaxId,
                        taxRate,
                        tax: taxRate,
                        taxType: item.taxType || item.taxtype || 'Excluded',
                        ConversionFactor: conversionFactor,
                        barcode,
                        taxAmount: taxAmountRaw,
                        taxAmt: taxAmountRaw,
                        grossAmount: parseFloat(item.grossAmount ?? item.grossamount ?? 0),
                        netAmount: parseFloat(item.netAmount ?? item.netamount ?? amount ?? 0),
                        amount: parseFloat(amount) || 0,
                        productDescription,
                        billDiscOnProduct,
                        AddCostonProduct: addCostonProduct,
                        otherchargeonproduct,
                        salesManId: item.salesManId ?? item.salesmanid ?? null,
                        GodownId: item.GodownId ?? item.godownid ?? null,
                        RackId: item.RackId ?? item.rackid ?? null,
                        branchId: item.branchId ?? item.branchid ?? selectedBranchId,
                        availableUnits,
                        productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Purchase Invoice",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                invoiceDate: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                vendorInvoiceNo: data.receieptNo || data.orderNo || data.voucherNo || '',
                costCentreId: data.costCentreId ?? data.costcentreid ?? '',
                BatchId: data.BatchId ?? data.batchid ?? '',
                GodownId: data.GodownId ?? data.godownid ?? '',
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyMobile || data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                RefNo: data.partyRefNo || data.RefNo || '',
                partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : '',
                creditPeriod: data.creditPeriod || '',
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : '',
                // ✅ Fix: use correct ID field per mode
                orderMasterId: mode === 'Order' ? masterId : (data.orderMasterId || ''),
                receiptMasterId: mode === 'Reciept' ? masterId : (data.receiptMasterId || ''),
                AgainstNo: againstNoValue,
                transportCompany: data.transportCompany || '',
                narration: data.narration || '',
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                otherChargeLedgerId: data.otherChargeLedgerId || '',
                othercharge: data.othercharge || data.OtherCharge || '',  // ✅ order uses OtherCharge
                billDiscount: data.billDiscount,
                roundOff: data.roundoff ?? data.roundOff ?? '',
                totalAmount: data.totalAmount,
                paymentMode: data.paymentMode || prev.paymentMode,
                CashLedgerId: data.CashLedgerId || prev.CashLedgerId,
                CashRefNo: data.CashRefNo || '',
                CashAmount: data.CashAmount || 0,
                BankLedgerId: data.BankLedgerId || prev.BankLedgerId,
                BankRefNo: data.BankRefNo || '',
                BankAmount: data.BankAmount || 0,
                BillBalanceAmount: data.BillBalanceAmount || 0,
                postedStatus: data.postedStatus || prev.postedStatus,
                postedBy: data.postedBy || prev.postedBy,
                postedDate: data.postedDate ? parseLocalDate(data.postedDate) : '',
                branchId: data.branchId || prev.branchId,
                CreatedUser: data.CreatedUser || prev.CreatedUser,
                vatLedgerId: data.vatLedgerId || prev.vatLedgerId,
                purchaseDetails: salesDetailsWithProducts,
            }));

            setBlillingAddress({
                name: data.partyName || '',
                email: data.email || '',
                phoneNo: data.partyMobile || data.partyPhone || '',
                vatNo: data.partyVatNo || '',
                address: data.partyAddress || ''
            });

            await fetchGodown(data.GodownId ?? data.godownid ?? null);
            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching receipt data", error);
        } finally {
            setFetchLoading(false)
        }
    };
    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-purchase-invoice-byId/${purchaseInvoicemasterId}`);
            const data = response.data.data;


            setExistingInvoiceNo(data.invoiceNo)

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxData = taxResponse.data.data || [];

            const salesDetailsWithProducts = await Promise.all(
                (data.purchaseDetails || []).map(async (item) => {
                    let productName = '';
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

                    const taxInfo = taxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

                    if (item.productCode) {
                        try {
                            const productResponse = await axiosInstance.get(
                                `get-product-unit-sales-details-byId/${item.productCode}`
                            );
                            const productData = productResponse.data.data;
                            productName = productData.productname || '';
                            availableUnits = productData.units || [];

                            const selectedUnit = availableUnits.find(u => u.unitid === item.unitId);

                            productDetails = {
                                productCode: item.productCode,
                                barcode: selectedUnit?.barcode || item.barcode || '',
                                partNo: productData.partNo || '',
                                brand: productData.brand || '',
                                mrp: productData.mrp || '',
                                purchase: item.PurchaseRate || '',
                                productDescription: item.productDescription || '',
                                UnitName: selectedUnit?.unitname || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        receiptDetails1Id: item.receiptDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        SalesRate: item.SalesRate,
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        unitId: item.unitId,
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        taxId: item.taxId,
                        taxRate: taxRate,
                        taxType: item.taxType,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        billDiscOnProduct: item.billDiscOnProduct,
                        AddCostonProduct: item.AddCostonProduct,
                        otherchargeonproduct: item.otherchargeonproduct,
                        salesManId: item.salesManId,
                        GodownId: item.GodownId,
                        RackId: item.RackId,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );


            setFormData((prev) => ({
                ...prev,
                voucherType: "Purchase Invoice",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                invoiceDate: parseDateFromAPI(data.invoiceDate),
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                vendorInvoiceNo: data.vendorInvoiceNo,
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                GodownId: data.GodownId,
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                RefNo: data.RefNo,
                partyRefDate: data.partyRefDate
                    ? parseLocalDate(data.partyRefDate)
                    : (data.refDate ? parseLocalDate(data.refDate) : ""),
                creditPeriod: data.creditPeriod,
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                orderMasterId: data.orderMasterId,
                AgainstNo: data.AgainstNo,
                transportCompany: data.transportCompany,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                otherChargeLedgerId: data.otherChargeLedgerId,
                othercharge: data.othercharge,
                billDiscount: data.billDiscount,
                roundOff: data.roundOff,
                totalAmount: data.totalAmount,
                paymentMode: data.paymentMode,
                CashLedgerId: data.CashLedgerId,
                CashRefNo: data.CashRefNo,
                CashAmount: data.CashAmount,
                BankLedgerId: data.BankLedgerId,
                BankRefNo: data.BankRefNo,
                BankAmount: data.BankAmount,
                BillBalanceAmount: data.BillBalanceAmount,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseLocalDate(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                vatLedgerId: data.vatLedgerId,
                purchaseDetails: salesDetailsWithProducts,
                RetentionAmount: data.RetentionAmount,
                RetentionPercentage: data.RetentionPercentage,
                RetentionLedgerId: data.RetentionLedgerId,
                RetentionDueDate: data.RetentionDueDate ? parseLocalDate(data.RetentionDueDate) : "",
                RetentionType: data.RetentionType,

            }));
            // In getSalesById(), after setFormData(...)
            setBlillingAddress({
                name: data?.partyName || data?.customerName || '',
                email: data?.email || '',
                phoneNo: data?.partyPhone || data?.CustomerPhone || '',
                vatNo: data?.partyVatNo || data?.customerVATNo || '',
                address: data?.partyAddress || data?.CustomerAddress || ''
            });


            await fetchGodown(data.GodownId);

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    const buildInvoiceDataForPrint = useCallback((invoiceNumber, qrLink) => {

        return {
            ...formData,
            invoiceNo: invoiceNumber,
            date: formData.date,
            purchaseDetails: formData.purchaseDetails,
            qr_link: qrLink || formData.qr_link,
        };
    }, [formData]);

    const printToPrinterFn = useCallback((invoiceDataForPrint) => {
        if (formData.printType === 'a4') {
            purchaseInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
        }
        // Add more print types here as needed (e.g. Thermal, Type 2, etc.)
    }, [formData.printType, selectedBranchDetails, time, currentCurrency]);

    const handleReprintToPrinter = useCallback(() => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, formData.qr_link);
        printToPrinterFn(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, formData.qr_link, printToPrinterFn]);

    const handleReprintToPdf = useCallback(() => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, formData.qr_link);
        printToPrinterFn(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, formData.qr_link, printToPrinterFn]);

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        pricingLevel: false,
        customers: false,
        godowns: false,
        batch: false,
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
                ledgerTypes: ["Supplier"],
                branchId: selectedBranchId
            });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const fetchGodown = async (preserveGodownId = null) => {
        setLoading(prev => ({ ...prev, godowns: true }));
        try {
            const isMainBranch = selectedBranchDetails?.mainBranch === true;
            const branchIdParam = isMainBranch ? null : selectedBranchId;
            const { data } = await axiosInstance.get(`godowns/${branchIdParam}`);
            const godownList = data.data || [];
            setGodowns(godownList);

            if (preserveGodownId !== null && preserveGodownId !== undefined) {
                setFormData(prev => ({
                    ...prev,
                    GodownId: preserveGodownId
                }));
            } else if (!editMode && godownList.length > 0) {
                let defaultGodown;

                if (isMainBranch) {
                    defaultGodown = godownList.find(g =>
                        (g.IsDefault === true || g.IsDefault === 1 || g.isDefault === true || g.isDefault === 1) &&
                        (g.branchId == selectedBranchId || g.BranchId == selectedBranchId)
                    );

                    if (!defaultGodown) {
                        defaultGodown = godownList.find(g =>
                            g.branchId == selectedBranchId || g.BranchId == selectedBranchId
                        );
                    }
                } else {
                    defaultGodown = godownList.find(g =>
                        g.IsDefault === true || g.IsDefault === 1 || g.isDefault === true || g.isDefault === 1
                    );
                }

                if (defaultGodown) {
                    setFormData(prev => ({
                        ...prev,
                        GodownId: defaultGodown.GodownId
                    }));
                } else if (godownList.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        GodownId: godownList[0].GodownId
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch godowns:", err);
        } finally {
            setLoading(prev => ({ ...prev, godowns: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Purchase Invoice&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setInvoiceId(response.data.voucherCode)
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        if (!formData.date) errors.push('Please select invoice date');

        if (!formData.purchaseDetails || formData.purchaseDetails.length === 0) {
            errors.push('Please add at least one product');
        }

        const hasValidProducts = formData.purchaseDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');

        const hasZeroRate = formData.purchaseDetails.some(
            detail => detail.productCode && (detail.rate === 0 || detail.rate == null)
        );

        if (hasZeroRate) {
            errors.push('Product purchase rate cannot be 0. Please enter a valid purchase rate for all products.');
        }
        return errors;
    };
    const validationRules = {
        ...(purchaseSettings?.VendorInvoiceNoChecking && {
            vendorInvoiceNo: {
                required: true,
                label: t("requiredFieldsError")
            }
        }),
        ledgerId: {
            required: true,
            label: t("requiredFieldsError")
        }
    };

    const handleSave = useCallback(async () => {
        if (formData.BillBalanceAmount < 0) {

            showToast.error(t("salesInvoice.alert.billBalanceAmtError"));
            return;
        }
        if (!validateForm(formData, validationRules)) return;
        if (formData.paymentMode === 'credit' && formData.BillBalanceAmount <= 0) {
            showToast.error(t("salesInvoice.alert.creditPaymentModeError"));
            return;
        }

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n');

            showToast.error(errorMessage);
            return;
        }
        setIsSaving(true);

        // ✅ NEW: Negative cash transaction validation
        if (generalSettings?.negativeCashTransaction !== 'Allow') {

            const cashLedgerId = formData.CashLedgerId;
            const cashAmount = parseFloat(formData.CashAmount || 0);

            if (cashLedgerId && cashAmount > 0) {
                try {
                    const res = await axiosInstance.get(
                        `get-ledger-balance?ledgerId=${cashLedgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`
                    );
                    const balanceData = res.data?.data;
                    const currentBalance = parseFloat(balanceData?.currentbal || 0);
                    const wouldBeBalance = currentBalance - cashAmount;

                    if (wouldBeBalance < 0) {
                        const cashLedgerName = cash.find(c => c.ledgerId === cashLedgerId)?.ledgerName || 'Cash';

                        if (generalSettings?.negativeCashTransaction === 'Block') {
                            await Swal.fire({
                                title: t('purchaseInvoice.form.messages.negativeCashBlockTitle') || 'Transaction Blocked',
                                text: `Insufficient balance for "${cashLedgerName}". Available: ${currentBalance.toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${cashAmount.toFixed(generalSettings?.decimalPart ?? 2)}`,
                                icon: 'error',
                                confirmButtonColor: '#d33',
                                confirmButtonText: t('Ok') || 'Ok',
                            });
                            setIsSaving(false); // ✅ was missing here
                            return;
                        }

                        if (generalSettings?.negativeCashTransaction === 'Warn') {
                            const result = await Swal.fire({
                                title: t('purchaseInvoice.form.messages.negativeCashWarnTitle') || 'Low Balance Warning',
                                text: `"${cashLedgerName}" will result in a negative balance. Available: ${currentBalance.toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${cashAmount.toFixed(generalSettings?.decimalPart ?? 2)}. Continue?`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                                confirmButtonText: t('Yes Continue') || 'Yes, Continue',
                                cancelButtonText: t('Cancel'),
                            });

                            if (!result.isConfirmed) {
                                setIsSaving(false); // ✅ moved inside the cancel guard
                                return;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error checking cash ledger balance:', error);
                    setIsSaving(false); // ✅ also reset on fetch error
                    return;
                }
            }
        }

        setIsSaving(true); // ✅ move this to HERE, after all early-return guards

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"), text: t("ConfirmUpdateText"),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"), cancelButtonText: t('Cancel'),
            });
                    setIsSaving(false);

            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'), text: t('ConfirmSaveText'),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'), cancelButtonText: t('Cancel'),
            });
                    setIsSaving(false);

            if (!result.isConfirmed) return;
        }
        setIsSaving(true);
        try {

            const dataToSave = {
                ...formData,
                ModifiedUser: editMode ? userId : null,
                CreatedUser: userId,
                date: formatDateWithTime(formData.date)
            };

            const api = editMode ? `update-purchase-invoice/${purchaseInvoicemasterId}` : 'save-purchase-invoice'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                dispatch(refreshProductsByType('sales'))
                dispatch(refreshProductsByType('purchase'))
                dispatch(refreshProductsByType('inventory'))
                showToast.success(t("saveSuccess"));

                // Handle held invoices cleanup
                if (restoredHeldInvoiceId) {
                    setHeldInvoices(prev => prev.filter(inv => inv.id !== restoredHeldInvoiceId));
                    setRestoredHeldInvoiceId(null);
                }

                // const savedInvoiceData = dataToSave;
                const invoiceNumber = editMode ? existingInvoiceNo : invoiceId;
                // const invoiceNumber = invoiceId;

                if (formData.printAfterSave) {
                    const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceNumber, null);
                    printToPrinterFn(invoiceDataForPrint);
                } else {
                    const pdfResult = await Swal.fire({
                        title: 'Print as PDF?',
                        text: 'Do you want to download this invoice as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, Download PDF',
                        cancelButtonText: 'No, Just Save',
                    });

                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceNumber, null);
                            printToPrinterFn(invoiceDataForPrint);
                        }, 500);
                    }
                }
                if (purchaseSettings.CloseAfterSave) {
                    navigate('/transaction/purchase-invoice/purchase-invoice-list')
                }
                if (!editMode) {
                    genarateSalesInvoiceId();
                    clearForm(true);
                }
            }
        } catch (error) {
            console.error('Error saving sales:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save Purchase Invoice',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode, restoredHeldInvoiceId]);

    useEffect(() => {
        if (!editMode) {
            const handleKeyDown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    handleSave();
                }
            };

            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [handleSave, editMode]);

    // ===== BREADCRUMB ACTIONS =====
    const breadcrumbActions = [
        {
            label: t("listBtn"),
            icon: Table,
            type: "secondary",
            title: "Go to invoice list",
            onClick: () => navigate("/transaction/purchase-invoice/purchase-invoice-list"),
        },
        !editMode && {
            label: `Hold Invoice${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentInvoice,
            title: "Hold the current invoice (CTRL + H)",
        },
        heldInvoices.length > 0 && !editMode && {
            label: "Restore",
            icon: ArchiveRestore,
            type: "tertiary",
            title: "View and restore held invoices",
            onClick: () => setShowHeldInvoices(!showHeldInvoices),
        },
        {
            label: t("clearBtn"),
            icon: Eraser,
            type: "secondary",
            title: "Clear all form fields",
            onClick: clearForm,
        },
        {
            label: editMode ? t("updateBtn") : t("submitBtn"),
            icon: isSaving
                ? Loader2
                : editMode
                    ? Pencil
                    : SaveAll,
            type: "primary",
            title: editMode
                ? "Update the invoice (CTRL + S)"
                : "Save the invoice (CTRL + S)",
            onClick: handleSave,
            loading: isSaving,
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("purchaseInvoice.breadcrumb.master"), url: "#" },
                        { title: t("purchaseInvoice.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("purchaseInvoice.breadcrumb.editTitle") : t("purchaseInvoice.breadcrumb.title") }}
                    actions={[
                        {
                            label: t("listBtn"),
                            icon: Table,
                            type: "secondary",
                            onClick: handleListNavigate,
                        },
                    ]}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className="bg-primary dark:bg-primary ">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <HeldInvoicesPanel />
            <BreadCrumb
                routes={[
                    { title: t("purchaseInvoice.breadcrumb.master"), url: "#" },
                    { title: t("purchaseInvoice.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("purchaseInvoice.breadcrumb.editTitle") : t("purchaseInvoice.breadcrumb.title") }}
                actions={breadcrumbActions}
                customActions={
                    <div className="flex items-center gap-3">
                        {!editMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSavePurchase"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSavePurchase"
                                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                >
                                    {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                                </label>
                            </div>
                        )}
                        <select
                            name="printType"
                            id="printType"
                            className="border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none"
                            value={formData.printType}
                            onChange={(e) => setFormData(prev => ({ ...prev, printType: e.target.value }))}
                        >
                            <option value="a4">A4</option>
                            {/* Add more print types here if purchase gets more templates */}
                        </select>
                        {editMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
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
                costCenters={costCenters}
                customers={customers}
                pricingLevel={pricingLevel}
                godowns={godowns}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.purchaseDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, purchaseDetails: updatedRows }))}
                batches={batches}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                setBlillingAddress={setBlillingAddress}
                otherChargeLedgers={otherChargeLedgers}
                currentledgerBalance={currentledgerBalance}
                billingAddress={billingAddress}
                taxData={taxData}
                bank={banks}
                cash={cash}
                purchaseAccounts={purchaseAccounts}
                currency={currency}
                getAginsteModeDetailes={getAginsteModeDetailes}
            />
        </div>
    )
}

export default PurchaseInvoiceSkin