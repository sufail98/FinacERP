import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, Loader2, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import proformaInvoicePrintOne from '@/utils/prints/proformaInvoicePrints/profrmaInvoicePrintOne';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
// ✅ ADDED: PrintDropdown and Checkbox imports
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import PopupPreloader from '@/components/common/PopupPreloader';
import { showToast } from '@/utils/toast';
import proformInvoicePrintTwo from '@/utils/prints/proformaInvoicePrints/proformInvoicePrintTwo';
import proformInvoicePrintThree from '@/utils/prints/proformaInvoicePrints/proformInvoicePrintThree';

const PerformaInvoiceSkin = () => {
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const { proformaInvoiceId } = useParams();
    const editMode = Boolean(proformaInvoiceId);
    const [isEditMode, setIsEditMode] = useState(Boolean(proformaInvoiceId));
    const [canEdit, setCanEdit] = useState(!Boolean(proformaInvoiceId));
    const [isInEditMode, setIsInEditMode] = useState(Boolean(proformaInvoiceId));

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
    const [batches, setBatches] = useState([]);
    const [currency, setCurrencies] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])

    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, printSettings } = useSelector((state) => state.settings);


    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [salesAccount, setSalesAccount] = useState([]);
    const invoiceTypes = Object.keys(printSettings?.["Proforma Invoice"]?.types || {});
    const invoicePrintConfig = printSettings?.["Proforma Invoice"]?.default || Object.values(printSettings?.["Proforma Invoice"]?.types || {})[0];
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);
    const decimalPart = generalSettings?.decimalPart ?? 2;
    const [taxData, setTaxData] = useState([])

    const [resetTableKey, setResetTableKey] = useState(0);

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
        voucherType: "Proforma Invoice",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        customerData: {},
        cancelled: false,
        LPONO: '',
        LPODate: '',
        DeliveryTerms: '',
        PaymentTerms: '',
        status: 'Pending',
        selectedQuotationMasterId: '',
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'Type 2',
        ledgerId: financeSettings.defaultSalesAccount || '',
        pricingLevelId: 1,
        employeeId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType,
        BatchId: '',
        partyName: '',
        costCentreId: 1,
        partyAddress: '',
        partyMobile: '',
        partyVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        dueDate: "",
        deliveryDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        quotationMasterId: "",
        AgainstNo: "",
        lrNo: "",
        transportCompany: "",
        narration: "",
        taxableAmt: "",
        subTotal: "",
        totalTax: "",
        additionalCost: "",
        billDiscount: "",
        roundOff: "",
        totalAmount: "",
        AdvancePerc: "",
        branchId: selectedBranchId,
        CreatedUser: userId,
        invoiceDetails: [
            {
                deliveryNoteDetails1Id: "",
                orderDetails1Id: "",
                quotationDetailsId: "",
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
                taxId: null,
                taxType: "",
                ConversionFactor: null,
                barcode: "",
                PurchaseRate: null,
                taxAmount: null,
                grossAmount: null,
                netAmount: null,
                amount: null,
                Size: '',
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
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldProformaInvoices');
        if (savedHeldInvoices) {
            const allHeld = JSON.parse(savedHeldInvoices);
            setHeldInvoices(allHeld.filter(inv => inv.branchId === selectedBranchId));
        }
    }, [selectedBranchId]);

    useEffect(() => {
        const saved = localStorage.getItem('heldProformaInvoices');
        const all = saved ? JSON.parse(saved) : [];
        const otherBranch = all.filter(inv => inv.branchId !== selectedBranchId);
        const updated = [...otherBranch, ...heldInvoices];
        if (updated.length > 0) {
            localStorage.setItem('heldProformaInvoices', JSON.stringify(updated));
        } else {
            localStorage.removeItem('heldProformaInvoices');
        }
    }, [heldInvoices, selectedBranchId]);
    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.invoiceDetails.some(d => d.productCode && d.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldInvoice = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId: invoiceId,
            customerName: formData.partyName || 'Unknown Customer',
            customerAddress: formData.partyAddress || '',
            totalAmount: formData.totalAmount || 0,
            itemCount: formData.invoiceDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData },
        };
        setHeldInvoices(prev => [...prev, heldInvoice]);
        showToast.success(`Invoice held successfully. Total held: ${heldInvoices.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);

    const restoreHeldInvoice = (heldInvoice) => {
        const hasValid = formData.invoiceDetails.some(d => d.productCode && d.qty > 0);
        if (hasValid) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                customerName: formData.partyName || 'Current Invoice',
                customerAddress: formData.partyAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.invoiceDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId,
                formData: { ...formData },
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

    const deleteHeldInvoice = (id) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== id));
        showToast.success("Held invoice deleted");
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
    const HeldInvoicesPanel = () => {
        if (!showHeldInvoices || heldInvoices.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Invoices ({heldInvoices.length})
                    </h3>
                    <button onClick={() => setShowHeldInvoices(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{invoice.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Invoice: {invoice.invoiceId}</p>
                                    {invoice.customerAddress && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{invoice.customerAddress}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">{parseFloat(invoice.totalAmount || 0).toFixed(decimalPart)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.itemCount} items</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{new Date(invoice.timestamp).toLocaleString()}</p>
                            <div className="flex gap-2">
                                <button onClick={() => restoreHeldInvoice(invoice)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors">Restore</button>
                                <button onClick={() => deleteHeldInvoice(invoice.id)} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultSalesAccount || '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 2',
        }));
    }, [financeSettings, saleSettings, printSettings, invoicePrintConfig]);
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            taxType: generalSettings.taxType
        }));
    }, [generalSettings]);
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
            voucherType: "Proforma Invoice",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: financeSettings.defaultSalesAccount || '',
            pricingLevelId: 1,
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 2',
            employeeId: '',
            customerData: {},
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            cancelled: '',
            LPONO: '',
            LPODate: '',
            DeliveryTerms: '',
            PaymentTerms: '',
            status: 'Pending',
            selectedQuotationMasterId: '',
            BatchId: '',
            partyName: '',
            partyAddress: '',
            partyMobile: '',
            partyVatNo: '',
            costCentreId: 1,
            partyRefNo: "",
            partyRefDate: "",
            dueDate: "",
            deliveryDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            quotationMasterId: "",
            AgainstNo: "",
            lrNo: "",
            transportCompany: "",
            narration: "",
            taxableAmt: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            billDiscount: "",
            roundOff: "",
            totalAmount: "",
            AdvancePerc: "",
            branchId: selectedBranchId,
            CreatedUser: userId,
            invoiceDetails: [
                {
                    deliveryNoteDetails1Id: "",
                    orderDetails1Id: "",
                    quotationDetailsId: "",
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
                    Size: '',
                    branchId: selectedBranchId
                }
            ]
        });
        // ✅ Reset to create mode
        setIsInEditMode(false);
        fetchCustomerData(financeSettings?.defaultSalesAccount);


        if (isEditMode) {
            setCanEdit(true);
            setIsEditMode(false);
            setExistingInvoiceNo('');
            if (!skipConfirmation) {
                genarateSalesInvoiceId();
            }
        }
        // if (isEditMode) {
        //     setCanEdit(true);
        //     setIsEditMode(false);
        //    genarateSalesInvoiceId()
        // }
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])

    const [baseDataloading, setBaseDataloading] = useState(false)

    const fetchCustomerData = async (ledgerId) => {
        // setLoadingCustomer(true);
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId || formData.ledgerId}`);

            if (response.data) {
                const data = response.data.data;
                setFormData(prev => ({
                    ...prev,
                    customerData: data
                }));


                const defaultShipping = Array.isArray(data?.shipping_address)
                    ? data.shipping_address.find(addr => addr?.Isdefault === true)
                    : null;

                // setUpdateCustomerId(data?.ledgerId);

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

                if (!editMode) {
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
            }
        } catch (error) {
            console.error("Error fetching customer data:", error);
        }
    };

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-sales-data', { voucherType: "Proforma Invoice", branchId: selectedBranchId, yearId: currentFinancialYear.yearId, ledgerTypes: ["Customer"], ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId })
                const data = res?.data?.data


                setOtherChargLedgers(data?.othercharge)

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setGodowns(data?.godowns)
                setPricingLevel(data?.pricinglevel)
                setBatches(data?.transactionbatch)
                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)
                setCurrentLedgerBalance(data?.LedgerBalance?.currentbal)
                setSalesAccount(data?.salesAccount)

                const filteredCurrencies = data?.currencywithConversion?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);
                setTaxData(data?.taxMaster)

                if (data?.salesAccount.length > 0 && !formData.salesAccount) {
                    setFormData(prev => ({
                        ...prev,
                        salesAccount: data?.salesAccount[0].ledgerId,
                        salesAccountName: data?.salesAccount[0].ledgerName
                    }));
                }
                setFormData(prev => ({
                    ...prev,
                    customerData: data?.customeraddress,
                    BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : ''
                }));

                const defaultShipping = Array.isArray(data?.customeraddress?.shipping_address)
                    ? data?.customeraddress?.shipping_address.find(addr => addr?.Isdefault === true)
                    : null;

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
                    partyName: data?.customeraddress?.ledgerName || '',
                    partyAddress: data?.customeraddress?.address || '',
                    partyMobile: data?.customeraddress?.phoneNo || '',
                    partyVatNo: data?.customeraddress?.tinNumber || '',
                    customercreditLimit: data?.customeraddress?.creditLimit || '',
                    customerCreditlimitStatus: data?.customeraddress?.creditLimitStatus || 'Ignore',
                }));

            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])

    useEffect(() => {
        if (editMode) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();

        // Check if it's exactly midnight (12:00:00 AM)
        const isMidnight = currentHour === 0 && currentMinute === 0 && currentSecond === 0;

        setFormData(prev => {
            const prevDate = new Date(prev.date);
            const today = new Date();

            // Compare only date parts (ignore time)
            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();

            // Update date if it's not the same date OR if it's exactly midnight
            if (!isSameDate || isMidnight) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time, editMode]);

    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-proforma-invoice-byId/${proformaInvoiceId}`);
            const data = response.data.data;
            setExistingInvoiceNo(data.proformaNo)
            fetchCustomerData(data.ledgerId);




            const salesDetailsWithProducts = await Promise.all(
                (data?.invoiceDetails || []).map(async (item) => {
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

                    const taxInfo = taxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

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
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        productNameArb: productNameArb,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        unitId: item.unitId,
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        taxId: item.taxId,
                        taxRate: taxRate,
                        taxType: item.taxType,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        billDiscOnProduct: item.billDiscOnProduct,
                        AddCostonProduct: item.AddCostonProduct,
                        otherchargeonproduct: item.otherchargeonproduct,
                        salesManId: item.salesManId,
                        RackId: item.RackId,
                        Size: item.Size,
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

            const parsedDate = parseDateFromAPI(data.date);

            const newFormData = {
                voucherType: "Proforma Invoice",
                yearId: currentFinancialYear?.yearId,
                date: parsedDate,
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                cancelled: data.cancelled,
                LPONO: data.LPONO,
                LPODate: parseDateFromAPI(data.LPODate),
                DeliveryTerms: data.DeliveryTerms,
                PaymentTerms: data.PaymentTerms,
                status: data.status,
                BatchId: data.BatchId,
                costCentreId: data.costCentreId,
                partyName: data.partyName,
                partyAddress: data.partyAddress,
                partyMobile: data.partyMobile,
                partyVatNo: data.partyVatNo,
                partyRefNo: data.partyRefNo,
                partyRefDate: parseDateFromAPI(data.partyRefDate),
                dueDate: parseDateFromAPI(data.dueDate),
                deliveryDate: parseDateFromAPI(data.deliveryDate),
                exchangeRate: data.exchangeRate,
                exchangeDate: parseDateFromAPI(data.exchangeDate),
                quotationMasterId: data.quotationMasterId,
                AgainstNo: data.AgainstNo,
                lrNo: data.lrNo,
                transportCompany: data.transportCompany,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                billDiscount: data.billDiscount,
                roundOff: data.roundOff,
                totalAmount: data.totalAmount,
                AdvancePerc: data.AdvancePerc,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                printType: data.printType || invoicePrintConfig?.printType || 'Type 2',
                othercharge: data.othercharge || '',           // ← ADD THIS
                OtherChargeRemark: data.OtherChargeRemark || '', // ← ADD THIS
                otherChargeLedgerId: data.otherChargeLedgerId || '', // ← ADD THIS
                invoiceDetails: salesDetailsWithProducts,
            };

            setFormData(newFormData);
            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Proforma Invoice&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            if (editMode) {
                setExistingInvoiceNo(response.data.voucherCode)
            }
            setInvoiceId(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        pricingLevel: false,
        customers: false,
        godowns: false,
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
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer"], branchId: selectedBranchId });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };



    const validateFormData = () => {
        const errors = [];
        if (!formData.ledgerId) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select invoice date');
        if (!formData.invoiceDetails || formData.invoiceDetails.length === 0) {
            errors.push('Please add at least one product');
        }
        const hasValidProducts = formData.invoiceDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const fetchProformaDataUsingQuotationId = async (quotationMasterId) => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.post(`get-quotation-for-proforma`, { quotationMasterId })
            const data = response.data.data;


            setExistingInvoiceNo(data.proformaNo)


            const salesDetailsWithProducts = await Promise.all(
                (data?.invoiceDetails || []).map(async (item) => {
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

                            productName = item?.productname || '';
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
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        taxId: item.taxId,
                        taxRate: taxRate,
                        taxType: item.taxType || generalSettings.taxType,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        billDiscOnProduct: item.billDiscOnProduct,
                        AddCostonProduct: item.AddCostonProduct,
                        otherchargeonproduct: item.otherchargeonproduct,
                        salesManId: item.salesManId,
                        RackId: item.RackId,
                        Size: item.Size,
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
                voucherType: "Proforma Invoice",
                yearId: currentFinancialYear?.yearId,
                date: new Date(),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                cancelled: data.cancelled,
                LPONO: data.LPONO,
                LPODate: data.LPODate ? new Date(data.LPODate) : "",
                DeliveryTerms: data.DeliveryTerms,
                PaymentTerms: data.PaymentTerms,
                status: 'Pending',
                BatchId: data.BatchId,
                costCentreId: data.costCentreId,
                partyName: data.partyName,
                partyAddress: data.partyAddress,
                partyMobile: data.partyMobile,
                partyVatNo: data.partyVatNo,
                partyRefNo: data.partyRefNo,
                partyRefDate: data.partyRefDate ? new Date(data.partyRefDate) : "",
                dueDate: data.dueDate ? new Date(data.dueDate) : "",
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : "",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                quotationMasterId: data.quotationMasterId,
                AgainstNo: data.AgainstNo,
                lrNo: data.lrNo,
                printType: data.printType || invoicePrintConfig?.printType || 'Type 2',
                transportCompany: data.transportCompany,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                billDiscount: data.billDiscount,
                roundOff: data.roundOff,
                totalAmount: data.totalAmount,
                AdvancePerc: data.AdvancePerc,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                taxType: data.taxType || generalSettings.taxType,
                invoiceDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchLoading(false)
        }
    }

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    // ===== PRINT HELPERS =====

    const buildInvoiceDataForPrint = useCallback((invoiceNumber) => ({
        ...formData,
        invoiceNo: invoiceNumber,
        date: formData.date,
        salesDetails: formData.invoiceDetails || formData.salesDetails,
        // ✅ Explicitly pass address data
        customerData: formData.customerData,
        billingAddress: billingAddress,
        shippingAddress: shippingAdderess,
    }), [formData, billingAddress, shippingAdderess]); // ✅ add to deps


    const handlePrintByType = (invoiceDataForPrint) => {
        if (formData.printType === 'Type 1') {
            return proformaInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
        } else if (formData.printType === 'Type 2') {
            return proformInvoicePrintTwo(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
        } else if (formData.printType === 'Type 3') {
            return proformInvoicePrintThree(invoiceDataForPrint, selectedBranchDetails, undefined, currentCurrency, undefined,);
        } else {
            return proformInvoicePrintTwo(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
        }
    };

    const printToPrinterFn = useCallback((invoiceDataForPrint) => {
        handlePrintByType(invoiceDataForPrint);
    }, [selectedBranchDetails, formData.printType, currentCurrency]);

    const printToPdfFn = useCallback((invoiceDataForPrint) => {
        setTimeout(async () => {
            await handlePrintByType(invoiceDataForPrint);
        }, 500);
    }, [selectedBranchDetails, formData.printType, currentCurrency]);

    // ===== SAVE HANDLER =====
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
            const api = isInEditMode ? `update-proforma-invoice/${proformaInvoiceId}` : 'save-proforma-invoice'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setIsSaving(false);
                if (restoredHeldInvoiceId) {
                    setHeldInvoices(prev => prev.filter(inv => inv.id !== restoredHeldInvoiceId));
                    setRestoredHeldInvoiceId(null);
                }
                showToast.success(response.data.message || (isInEditMode ? t("UpdateSuccess") : t('SaveSuccess')));

                const invoiceDataForPrint = buildInvoiceDataForPrint(editMode ? existingInvoiceNo : invoiceId);

                // ✅ NEW PRINT LOGIC — matches Sales Invoice pattern
                if (formData.printAfterSave) {

                    printToPrinterFn(invoiceDataForPrint);

                    // Checkbox ON → Print to physical printer
                } else {
                    // Checkbox OFF → Ask if they want PDF
                    const pdfResult = await Swal.fire({
                        title: t('print As Pdf') || 'Print as PDF?',
                        text: t('Do you want to download this invoice as a PDF?') || 'Do you want to download this proforma invoice as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => { printToPdfFn(invoiceDataForPrint); }, 500);
                    } else if (editMode) {
                        // ✅ User clicked "No, Just Save" in edit mode - switch to add mode
                        setIsEditMode(false);
                        genarateSalesInvoiceId();
                        clearForm();
                    }
                }

                if (saleSettings.CloseAfterSave) {
                    setTimeout(() => { navigate('/transaction/proforma-invoice/proforma-invoice-list'); }, formData.printAfterSave ? 1500 : 500);
                }
                if (!editMode) {
                    genarateSalesInvoiceId();
                    clearForm();
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
                    'Failed to save Proforma Invoice',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode, invoiceId, buildInvoiceDataForPrint, printToPrinterFn, printToPdfFn]);

    // ===== EDIT MODE: Print to Printer =====
    const handleReprintToPrinter = useCallback(() => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo);
        printToPrinterFn(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn]);

    // ===== EDIT MODE: Print as PDF =====
    const handleReprintToPdf = useCallback(() => {
        const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo);
        printToPdfFn(invoiceDataForPrint);
    }, [buildInvoiceDataForPrint, existingInvoiceNo, printToPdfFn]);

    // Keyboard shortcut: Ctrl+S
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

    // ===== BREADCRUMB ACTIONS =====
    const breadcrumbActions = [
        {
            label: t("listBtn"),
            icon: Table,
            type: "secondary",
            onClick: () => navigate("/transaction/proforma-invoice/proforma-invoice-list"),
        },
        !isEditMode && {
            label: `Hold Invoice${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentInvoice,
            title: "Hold the current invoice (CTRL + H)",
        },
        heldInvoices.length > 0 && !isEditMode && {
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
            onClick: clearForm,
            title: isEditMode ? "Clear form and return to add mode" : undefined
        },
        // ✅ REMOVED: old single print button for edit mode (now in PrintDropdown)
        {
            label: editMode ? t("updateBtn") : t("submitBtn"),
            icon: isSaving
                ? Loader2             // loading icon
                : isEditMode
                    ? Pencil           // edit mode icon
                    : SaveAll,
            type: "primary",
            onClick: handleSave,
            loading: isSaving,
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("proformaInvoice.breadcrumb.master"), url: "#" },
                        { title: editMode ? t("proformaInvoice.breadcrumb.editTitle") : t("proformaInvoice.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("proformaInvoice.breadcrumb.editTitle") : t("proformaInvoice.breadcrumb.title") }}
                    actions={breadcrumbActions}
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
            <HeldInvoicesPanel />
            <BreadCrumb
                routes={[
                    { title: t("proformaInvoice.breadcrumb.master"), url: "#" },
                    { title: editMode ? t("proformaInvoice.breadcrumb.editTitle") : t("proformaInvoice.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("proformaInvoice.breadcrumb.editTitle") : t("proformaInvoice.breadcrumb.title") }}
                actions={breadcrumbActions}

                /* ✅ Custom actions: Print checkbox (create) / Print dropdown (edit) */
                customActions={
                    <div className="flex items-center gap-3">
                        {/* Print After Save checkbox — CREATE MODE ONLY */}
                        {!isEditMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSaveTopProforma"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSaveTopProforma"
                                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                >
                                    {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                                </label>
                            </div>
                        )}
                        <select
                            name="printType"
                            id="printType"
                            className='border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none'
                            value={formData.printType}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, printType: e.target.value }));
                                localStorage.setItem('printType', e.target.value);
                            }}
                        >
                            {
                                invoiceTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))
                            }
                        </select>
                        {/* Print Dropdown — EDIT MODE ONLY */}
                        {isEditMode && !fetchLoading && (
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
                fetchProformaDataUsingQuotationId={fetchProformaDataUsingQuotationId}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                costCenters={costCenters}
                batches={batches}
                customers={customers}
                pricingLevel={pricingLevel}
                godowns={godowns}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.invoiceDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, invoiceDetails: updatedRows }))}
                salesAccount={salesAccount}
                currentledgerBalance={currentledgerBalance}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                currency={currency}
                otherChargeLedgers={otherChargeLedgers}

            />
        </div>
    )
}

export default PerformaInvoiceSkin