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
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import ConvertMenu from '@/components/common/ConvertMenu';
import useFormValidation from '@/lib/hooks/useFormValidation';
import deliveryNotePrintOne, { saveDeliveryNotAsPDF } from '@/utils/prints/deliveryNotePrints/deliveryNotePrintOne';
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import PopupPreloader from '@/components/common/PopupPreloader';
import HelpShortcuts from '@/components/common/HelpShortcuts';
import { formatDateWithTime } from '@/lib/dateFormat';
import { showToast } from '@/utils/toast';
import { isElectron } from '@/utils/electronPrint';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';



const toLocalDateString = (dateValue) => {
    if (!dateValue) return "";

    // Handle Date objects — use LOCAL parts, NOT toISOString (which is UTC)
    if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return "";
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, "0");
        const day = String(dateValue.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const str = String(dateValue).trim();
    if (!str) return "";

    // "2025-06-15T00:00:00.000Z" or "2025-06-15T12:30:00"
    if (str.includes("T")) {
        return str.split("T")[0];
    }

    // "2025-06-15 00:00:00"  (API often returns this format)
    if (str.includes(" ")) {
        return str.split(" ")[0];
    }

    // "2025-06-15" — already correct
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    // Last resort: try to parse and extract local parts
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const DeliveryNoteSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Quotation");
    // Add this near the top with other useSelector calls
    const { salesProducts: allProducts } = useSelector((state) => state.products);
    const [isPrinting, setIsPrinting] = useState(false);
    const { dlvryNoteId } = useParams();
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const editMode = Boolean(dlvryNoteId);
    const [isEditMode, setIsEditMode] = useState(Boolean(dlvryNoteId));
    const [isInEditMode, setIsInEditMode] = useState(Boolean(dlvryNoteId));

    const [canEdit, setCanEdit] = useState(!Boolean(dlvryNoteId));
    const location = useLocation();
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
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [batches, setBatches] = useState([]);
    const [currency, setCurrencies] = useState([]);
    const [updateCustomerId, setUpdateCustomerId] = useState(null);


    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [salesAccount, setSalesAccount] = useState([]);
    const [quotationData, setQuotationData] = useState([])
    const [proformaData, setProformaData] = useState([])
    const [salesOrderData, setSalesOrderData] = useState([])
    const [taxData, setTaxData] = useState([])
    const handleConvert = useCallback((type) => {
        switch (type) {
            case 'sale':
                navigate(`/transaction/sales-invoice?fromDeliveryNote=${dlvryNoteId}`, { state: { againstDeliveryNote: true, masterId: dlvryNoteId } });
                break;
            default:
                break;
        }
    }, [navigate, dlvryNoteId]);
    // ✅ Add this useEffect to handle clear from navigation
    useEffect(() => {
        if (location.state?.shouldClear && !editMode) {
            // Clear the navigation state
            window.history.replaceState({}, document.title);

            // Reset form data
            setFormData({
                voucherType: "Delivery Note",
                yearId: currentFinancialYear?.yearId,
                date: toLocalDateString(new Date()),
                deliveryLocation: '',
                driverName: '',
                deliveryVehicleNo: '',
                LPONo: '',
                LPODate: '',
                contactNo: '',
                ledgerId: financeSettings.defaultSalesAccount || '',
                pricingLevelId: 1,
                employeeId: '',
                currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                taxType: generalSettings.taxType,
                printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
                costCentreId: 1,
                BatchId: '',
                customerName: '',
                CustomerAddress: '',
                CustomerPhone: '',
                customerVATNo: '',
                RefNo: "",
                RefDate: "",
                exchangeRate: currentCurrencyConversion?.rate,
                exchangeDate: toLocalDateString(currentCurrencyConversion?.date),
                orderMasterId: "",
                quotationMasterId: "",
                proformaMasterId: "",
                AgainstNo: "NA",
                transportCompany: "",
                vehicleNo: "",
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
                postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
                postedBy: generalSettings?.AccountPosting ? null : userId,
                postedDate: generalSettings?.AccountPosting ? null : toLocalDateString(new Date()),
                branchId: selectedBranchId,
                CreatedUser: userId,
                deliveryDetails: [
                    {
                        deliveryNoteDetails1Id: "",
                        orderDetails1Id: "",
                        quotationDetailsId: "",
                        proformaDetails1Id: "",
                        SlNo: "",
                        productCode: "",
                        qty: null,
                        freeQty: null,
                        productName: '',
                        productNameArb: '',
                        Remark: '',
                        rate: null,
                        unitId: null,
                        unitName: null,
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
                        GodownId: 1,
                        RackId: null,
                        branchId: selectedBranchId
                    }
                ]
            });

            setIsInEditMode(false);
            setCanEdit(true);
            setIsEditMode(false);
            setExistingInvoiceNo('');
            setResetTableKey(prev => prev + 1);
        }
    }, [location.state?.shouldClear, editMode]);

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
            taxType: generalSettings.taxType
        }));
    }, [generalSettings]);
    const [formData, setFormData] = useState({
        voucherType: "Delivery Note",
        yearId: currentFinancialYear?.yearId,
        date: toLocalDateString(new Date()),
        deliveryLocation: '',
        driverName: '',
        deliveryVehicleNo: '',
        LPONo: '',
        LPODate: '',
        contactNo: '',
        ledgerId: financeSettings.defaultSalesAccount || '',
        pricingLevelId: 1,
        employeeId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType,
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        costCentreId: 1,
        BatchId: '',
        customerName: '',
        CustomerAddress: '',
        CustomerPhone: '',
        customerVATNo: '',
        RefNo: "",
        RefDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: toLocalDateString(currentCurrencyConversion?.date),
        orderMasterId: "",
        quotationMasterId: "",
        proformaMasterId: "",
        AgainstNo: "NA",
        transportCompany: "",
        vehicleNo: "",
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
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : toLocalDateString(new Date()),
        branchId: selectedBranchId,
        CreatedUser: userId,
        deliveryDetails: [
            {
                deliveryNoteDetails1Id: "",
                orderDetails1Id: "",
                quotationDetailsId: "",
                proformaDetails1Id: "",
                SlNo: "",
                productCode: "",
                qty: null,
                freeQty: null,
                productName: '',
                productNameArb: '',
                Remark: '',
                rate: null,
                unitId: null,
                unitName: null,
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
                GodownId: 1,
                RackId: null,
                branchId: selectedBranchId
            }
        ]
    });

    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);
    const decimalPart = generalSettings?.decimalPart ?? 2;
    // Load held invoices from localStorage on mount
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldDeliveryNotes');
        if (savedHeldInvoices) {
            const all = JSON.parse(savedHeldInvoices);
            const branchInvoices = all.filter(inv => inv.branchId === selectedBranchId);
            const deduped = Array.from(
                new Map(branchInvoices.map(inv => [inv.id, inv])).values()
            );
            setHeldInvoices(deduped);
        }
    }, [selectedBranchId]);
    // Sync held invoices to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('heldDeliveryNotes');
        const all = saved ? JSON.parse(saved) : [];
        const otherBranch = all.filter(inv => inv.branchId !== selectedBranchId);

        const dedupedHeldInvoices = Array.from(
            new Map(heldInvoices.map(inv => [inv.id, inv])).values()
        );

        const updated = [...otherBranch, ...dedupedHeldInvoices];
        if (updated.length > 0) {
            localStorage.setItem('heldDeliveryNotes', JSON.stringify(updated));
        } else {
            localStorage.removeItem('heldDeliveryNotes');
        }
    }, [heldInvoices, selectedBranchId]);

    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.deliveryDetails.some(d => d.productCode && d.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const held = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId,
            customerName: formData.customerName || 'Unknown Customer',
            customerAddress: formData.CustomerAddress || '',
            totalAmount: formData.totalAmount || 0,
            itemCount: formData.deliveryDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldInvoices(prev => {
            if (prev.some(inv => inv.id === held.id)) return prev;
            return [...prev, held];
        });
        showToast.success(`Delivery note held. Total held: ${heldInvoices.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);

    const restoreHeldInvoice = (held) => {
        const hasValid = formData.deliveryDetails.some(d => d.productCode && d.qty > 0);
        if (hasValid) {
            const current = {
                id: Date.now(), timestamp: new Date().toISOString(),
                invoiceId, customerName: formData.customerName || 'Current',
                customerAddress: formData.CustomerAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.deliveryDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId, formData: { ...formData }
            };
            setHeldInvoices(prev => [...prev.filter(i => i.id !== held.id), current]);
        } else {
            setHeldInvoices(prev => prev.filter(i => i.id !== held.id));
        }
        setFormData({
            ...held.formData,       // ✅ was heldInvoices.formData (bug)
            date: new Date(),
            billTime: time,
        });
        setInvoiceId(held.invoiceId);
        setResetTableKey(prev => prev + 1);
        setShowHeldInvoices(false);
        setRestoredHeldInvoiceId(held.id);
        showToast.success("Delivery note restored successfully");
    };

    const deleteHeldInvoice = (id) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== id));
        showToast.success("Held delivery note deleted");
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
                        Held Delivery Notes ({heldInvoices.length})
                    </h3>
                    <button onClick={() => setShowHeldInvoices(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((inv) => (
                        <div key={inv.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{inv.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Note: {inv.invoiceId}</p>
                                    {inv.customerAddress && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{inv.customerAddress}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">{parseFloat(inv.totalAmount || 0).toFixed(decimalPart)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.itemCount} items</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{new Date(inv.timestamp).toLocaleString()}</p>
                            <div className="flex gap-2">
                                <button onClick={() => restoreHeldInvoice(inv)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors">Restore</button>
                                <button onClick={() => deleteHeldInvoice(inv.id)} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors">Delete</button>
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
        }));
    }, [financeSettings, saleSettings]);

    const [baseDataloading, setBaseDataloading] = useState(false)

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-sales-data', {
                    voucherType: "Delivery Note",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Customer", "Customer&Supplier"],
                    ledgerId: financeSettings.defaultSalesAccount,
                    currencyId: currentCurrency.currencyId,
                    in_ledgerId: financeSettings.defaultSalesAccount,
                    in_branchId: selectedBranchId
                })
                const data = res?.data?.data
                setUpdateCustomerId(financeSettings.defaultSalesAccount || null)

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setGodowns(data?.godowns)
                setPricingLevel(data?.pricinglevel)
                setBatches(data?.transactionbatch)
                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)
                const filteredCurrencies = data?.currencywithConversion?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal)
                setSalesAccount(data?.salesAccount)
                setOtherChargLedgers(data?.othercharge)
                setTaxData(data?.taxMaster)

                setQuotationData(data?.deliveryNoteAgainstData?.deliveryNoteSalesQuotationList)
                setProformaData(data?.deliveryNoteAgainstData?.deliveryNoteProformaList)
                setSalesOrderData(data?.deliveryNoteAgainstData?.deliveryNoteSalesOrderList)
                if (data?.salesAccount.length > 0 && !formData.salesAccount) {
                    setFormData(prev => ({
                        ...prev,
                        salesAccount: data?.salesAccount[0].ledgerId,
                        salesAccountName: data?.salesAccount[0].ledgerName
                    }));
                }
                setFormData(prev => ({ ...prev, customerData: data?.customeraddress, BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : '' }));

                const defaultShipping = Array.isArray(data?.customeraddress?.shipping_address)
                    ? data?.customeraddress?.shipping_address.find(addr => addr?.Isdefault === true) : null;

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
                    CustomerVATNo: data?.customeraddress?.tinNumber || '',
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

        // ✅ If in edit mode, navigate to add page
        if (isEditMode || Boolean(dlvryNoteId)) {
            navigate('/transaction/delivery-note', { state: { shouldClear: true } });
            return;
        }

        // ✅ First increment reset key to unmount the table
        setResetTableKey(prev => prev + 1);

        // ✅ Small delay to ensure table unmounts
        await new Promise(resolve => setTimeout(resolve, 50));

        // ✅ Then clear form data
        setFormData({
            voucherType: "Delivery Note",
            yearId: currentFinancialYear?.yearId,
            date: toLocalDateString(new Date()),
            ledgerId: financeSettings.defaultSalesAccount || '',
            pricingLevelId: 1,
            employeeId: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            costCentreId: 1,
            BatchId: '',
            customerName: '',
            CustomerAddress: '',
            CustomerPhone: '',
            CustomerVATNo: '',
            RefNo: "",
            RefDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: toLocalDateString(currentCurrencyConversion?.date),
            orderMasterId: "",
            quotationMasterId: "",
            proformaMasterId: "",
            AgainstNo: "NA",
            transportCompany: "",
            vehicleNo: "",
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
            deliveryLocation: '',
            driverName: '',
            deliveryVehicleNo: '',
            LPONo: '',
            LPODate: '',
            contactNo: '',
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : toLocalDateString(new Date()),
            branchId: selectedBranchId,
            CreatedUser: userId,
            billDiscountWithTax: "",
            deliveryDetails: [
                {
                    deliveryNoteDetails1Id: "",
                    orderDetails1Id: "",
                    quotationDetailsId: "",
                    proformaDetails1Id: "",
                    SlNo: "",
                    productCode: "",
                    Remark: '',
                    productName: '',
                    productNameArb: '',
                    qty: null,
                    freeQty: null,
                    rate: null,
                    unitId: null,
                    unitName: '',
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
                    GodownId: 1,
                    RackId: null,
                    branchId: selectedBranchId
                }
            ]
        });

        setIsInEditMode(false);
        setCanEdit(true);
        setIsEditMode(false);
        setExistingInvoiceNo('');

        // ✅ Generate new voucher after clearing
        await genarateSalesInvoiceId();
    };

    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])

    useEffect(() => {
        if (editMode) return;


        // If it's past midnight (12 AM), update the date to today
        setFormData(prev => {

            const prevDate = new Date(prev.date);
            const today = new Date();

            // Compare only date parts (ignore time)
            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();

            if (!isSameDate) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time]); // runs every second when time updates
    useEffect(() => {
        if (location.state && location.state.againstQuotation && location.state.masterId && taxData.length > 0) {
            loadQuotationDetailsByQtnId(location.state.masterId, taxData);
        } else if (location.state && location.state.againstProforma && location.state.masterId && taxData.length > 0) {
            loadProformaDetailsByProformaId(location.state.masterId, taxData);
        } else if (location.state && location.state.againstOrder && location.state.masterId && taxData.length > 0) {
            loadOrderDetailsByOrderMasterIdId(location.state.masterId, taxData);
        }
    }, [location.state, taxData]);

    const loadQuotationDetailsByQtnId = async (QtnId, taxMaster) => {
        const idsArray = Array.isArray(QtnId)
            ? QtnId
            : [Number(QtnId)];
        setFetchLoading(true)
        try {
            const response = await axiosInstance.post(`get-delivery-note-sales-quotation-details`, { p_quotation_master_id: idsArray, p_branchid: selectedBranchId, p_delivery_note_master_id: null });
            const data = response.data.data;

            setExistingInvoiceNo(data.deliveryNoteNo)


            const salesDetailsWithProducts = await Promise.all(
                (data.deliveryDetails || []).map(async (item) => {
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

                    const freshtaxdata = taxMaster || taxData;
                    const taxInfo = freshtaxdata.find(t => t.taxId === item.taxId);
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
                                UnitName: selectedUnit?.unitname || selectedUnit?.unitName || selectedUnit?.UnitName || item.unitName || item.UnitName || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }
                    // Calculate discount amount if not available
                    const descAmt = parseFloat(item.descAmt) || (() => {
                        const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                        const discPerc = parseFloat(item.discountPercentage) || 0;
                        return parseFloat(
                            ((gross * discPerc) / 100).toFixed(generalSettings?.decimalPart || 2)
                        ) || 0;
                    })();

                    return {
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        Remark: item.Remark,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
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
                        GodownId: item.GodownId || 1,
                        RackId: item.RackId || 1,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails,
                        descAmt
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Delivery Note",
                yearId: currentFinancialYear?.yearId,
                date: new Date(),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                CustomerVATNo: data.CustomerVATNo,
                RefNo: data.RefNo,
                RefDate: toLocalDateString(data.RefDate),
                exchangeRate: data.exchangeRate,
                exchangeDate: toLocalDateString(data.exchangeDate),
                orderMasterId: data.orderMasterId,
                quotationMasterId: idsArray,
                proformaMasterId: data.proformaMasterId,
                AgainstNo: data.voucherNo,
                transportCompany: data.transportCompany,
                vehicleNo: data.vehicleNo,
                deliveryLocation: data.deliveryLocation,
                driverName: data.driverName,
                deliveryVehicleNo: data.deliveryVehicleNo,
                LPONo: data.LPONo,
                LPODate: toLocalDateString(data.LPODate),
                contactNo: data.contactNo,
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
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: toLocalDateString(data.postedDate),
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                deliveryDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    const loadProformaDetailsByProformaId = async (PrId) => {
        const idsArray = Array.isArray(PrId)
            ? PrId
            : [Number(PrId)];
        setFetchLoading(true)
        try {
            const response = await axiosInstance.post(`get-delivery-note-proforma-details`, { p_proformamasterid: idsArray, p_branchid: selectedBranchId, p_deliverynotemasterid: null });
            const data = response.data.data;

            setExistingInvoiceNo(data.deliveryNoteNo)



            const salesDetailsWithProducts = await Promise.all(
                (data.deliveryDetails || []).map(async (item) => {
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
                                UnitName: selectedUnit?.unitname || selectedUnit?.unitName || selectedUnit?.UnitName || item.unitName || item.UnitName || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }
                    // Calculate discount amount if not available
                    const descAmt = parseFloat(item.descAmt) || (() => {
                        const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                        const discPerc = parseFloat(item.discountPercentage) || 0;
                        return parseFloat(
                            ((gross * discPerc) / 100).toFixed(generalSettings?.decimalPart || 2)
                        ) || 0;
                    })();

                    return {
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        Remark: item.Remark,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
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
                        GodownId: item.GodownId || 1,
                        RackId: item.RackId || 1,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails,
                        descAmt,
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Delivery Note",
                yearId: currentFinancialYear?.yearId,
                date: new Date(),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                CustomerVATNo: data.CustomerVATNo,
                RefNo: data.RefNo,
                RefDate: toLocalDateString(data.RefDate),
                exchangeRate: data.exchangeRate,
                exchangeDate: toLocalDateString(data.exchangeDate),
                orderMasterId: data.orderMasterId,
                quotationMasterId: data.quotationMasterId,
                proformaMasterId: idsArray,
                AgainstNo: data.voucherNo,
                transportCompany: data.transportCompany,
                vehicleNo: data.vehicleNo,
                deliveryLocation: data.deliveryLocation,
                driverName: data.driverName,
                deliveryVehicleNo: data.deliveryVehicleNo,
                LPONo: data.LPONo,
                LPODate: toLocalDateString(data.LPODate),
                contactNo: data.contactNo,
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
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: toLocalDateString(data.postedDate),
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                deliveryDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };
    const loadOrderDetailsByOrderMasterIdId = async (OrderMasterIds) => {
        const idsArray = Array.isArray(OrderMasterIds)
            ? OrderMasterIds
            : [Number(OrderMasterIds)];
        setFetchLoading(true)
        try {
            const response = await axiosInstance.post(`get-delivery-note-sales-order-details`, { p_ordermasterid: idsArray, p_deliverynotemasterid: null });
            const data = response.data.data;

            setExistingInvoiceNo(data.deliveryNoteNo)



            const salesDetailsWithProducts = await Promise.all(
                (data.deliveryDetails || []).map(async (item) => {
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
                                UnitName: selectedUnit?.unitname || selectedUnit?.unitName || selectedUnit?.UnitName || item.unitName || item.UnitName || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }
                    // Calculate discount amount if not available
                    const descAmt = parseFloat(item.descAmt) || (() => {
                        const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                        const discPerc = parseFloat(item.discountPercentage) || 0;
                        return parseFloat(
                            ((gross * discPerc) / 100).toFixed(generalSettings?.decimalPart || 2)
                        ) || 0;
                    })();

                    return {
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        Remark: item.Remark,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
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
                        GodownId: item.GodownId || 1,
                        RackId: item.RackId || 1,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails,
                        descAmt
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                orderMasterId: idsArray,
                voucherType: "Delivery Note",
                yearId: currentFinancialYear?.yearId,
                date: new Date(),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                CustomerVATNo: data.CustomerVATNo,
                RefNo: data.RefNo,
                RefDate: toLocalDateString(data.RefDate),
                exchangeRate: data.exchangeRate,
                exchangeDate: toLocalDateString(data.exchangeDate),
                quotationMasterId: data.quotationMasterId,
                proformaMasterId: data.proformaMasterId,
                AgainstNo: data.voucherNo,
                transportCompany: data.transportCompany,
                vehicleNo: data.vehicleNo,
                deliveryLocation: data.deliveryLocation,
                driverName: data.driverName,
                deliveryVehicleNo: data.deliveryVehicleNo,
                LPONo: data.LPONo,
                LPODate: toLocalDateString(data.LPODate),
                contactNo: data.contactNo,
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
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: toLocalDateString(data.postedDate),
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                deliveryDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-delivery-note-byId/${dlvryNoteId}`);
            const data = response.data.data;
            // ← Fetch tax data fresh instead of relying on stale state
            let freshTaxData = taxData;
            if (!freshTaxData || freshTaxData.length === 0) {
                try {
                    const taxRes = await axiosInstance.get("tax-masters");
                    freshTaxData = taxRes.data.data || [];
                    setTaxData(freshTaxData); // update state too
                } catch (e) {
                    console.error('Error fetching tax data', e);
                }
            }
            setExistingInvoiceNo(data.deliveryNoteNo)



            const salesDetailsWithProducts = await Promise.all(
                (data.deliveryDetails || []).map(async (item) => {
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

                    const taxInfo = freshTaxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

                    if (item.productCode) {
                        try {

                            productName = item?.productname || '';
                            productNameArb = item?.productNameArb || '',
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
                                UnitName: selectedUnit?.unitname || selectedUnit?.unitName || selectedUnit?.UnitName || item.unitName || item.UnitName || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }
                    // Calculate discount amount if not available
                    const descAmt = (() => {
                        const lineDiscountWithTax = parseFloat(item.lineDiscountWithTax) || 0;
                        return parseFloat(
                            (lineDiscountWithTax - (lineDiscountWithTax * 15) / 100).toFixed(generalSettings?.decimalPart || 2)
                        ) || 0;
                    })();

                    return {
                        salesDetails1Id: item.salesDetails1Id,
                        salesMasterId: item.salesMasterId,
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                        orderDetails1Id: item.orderDetails1Id,
                        quotationDetailsId: item.quotationDetailsId,
                        proformaDetails1Id: item.proformaDetails1Id,
                        SlNo: item.SlNo,
                        Remark: item.Remark,
                        productCode: item.productCode,
                        productName: productName,
                        productNameArb,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
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
                        GodownId: item.GodownId || 1,
                        RackId: item.RackId || 1,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails,
                        descAmt
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Delivery Note",
                yearId: currentFinancialYear?.yearId,
                date: toLocalDateString(data.date),
                ledgerId: data.ledgerId,
                pricingLevelId: data.pricingLevelId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                CustomerVATNo: data.CustomerVATNo,
                RefNo: data.RefNo,
                RefDate: toLocalDateString(data.RefDate),
                exchangeRate: data.exchangeRate,
                exchangeDate: toLocalDateString(data.exchangeDate),
                orderMasterId: data.orderMasterId,
                quotationMasterId: data.quotationMasterId,
                proformaMasterId: data.proformaMasterId,
                AgainstNo: data.AgainstNo,
                transportCompany: data.transportCompany,
                vehicleNo: data.vehicleNo,
                deliveryLocation: data.deliveryLocation,
                driverName: data.driverName,
                deliveryVehicleNo: data.deliveryVehicleNo,
                LPONo: data.LPONo,
                LPODate: toLocalDateString(data.LPODate),
                contactNo: data.contactNo,
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
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: toLocalDateString(data.postedDate),
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                billDiscountWithTax: data?.billDiscountWithTax,
                deliveryDetails: salesDetailsWithProducts,
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
        godowns: false,
    });

    const fetchEmployees = async () => {
        setLoading(prev => ({ ...prev, employees: true }));
        try { const { data } = await axiosInstance.get("employees"); setEmployees(data.data); }
        catch (err) { console.error("Failed to fetch employees:", err); }
        finally { setLoading(prev => ({ ...prev, employees: false })); }
    };

    const fetchCustomer = async () => {
        setLoading(prev => ({ ...prev, customers: true }));
        try {
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer", "Customer&Supplier"], branchId: selectedBranchId });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Delivery Note&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            if (isInEditMode) {
                setExistingInvoiceNo(response.data.voucherCode)
            }
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
        if (!formData.deliveryDetails || formData.deliveryDetails.length === 0) {
            errors.push('Please add at least one product');
        }
        const hasValidProducts = formData.deliveryDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    const buildInvoiceDataForPrint = useCallback((invoiceNumber, overrideData) => {
        const base = overrideData || formData;

        const rawDetails = base.deliveryDetails || [];

        // ✅ Enrich with productName / productNameArb from allProducts by matching productCode
        const enrichedDetails = rawDetails.map((detail, idx) => {
            const matchedProduct = allProducts?.find(
                (p) => p.productCode === detail.productCode
            );

            return {
                ...detail,
                productName: detail.productName || matchedProduct?.productName || '',
                productNameArb: detail.productNameArb || matchedProduct?.productNameArb || '',
                unitName: detail.unitName || formData.deliveryDetails?.[idx]?.unitName || detail.UnitName || matchedProduct?.unitName || '',
            };
        });

        return {
            ...base,
            invoiceNo: invoiceNumber,
            date: base.date,
            salesDetails: enrichedDetails,
            deliveryDetails: enrichedDetails,
        };
    }, [formData, allProducts]);

    const printToPrinterFn = useCallback((invoiceDataForPrint) => {
        setTimeout(() => {
            deliveryNotePrintOne(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
        }, 500);
    }, [selectedBranchDetails, time, currentCurrency]);

    const printToPdfFn = useCallback((invoiceDataForPrint) => {
        setTimeout(() => {
            saveDeliveryNotAsPDF(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
        }, 500);
    }, [selectedBranchDetails, time, currentCurrency]);

    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;

        // if (formData.totalAmount <= 0) {
        //     showToast.error(t("purchaseInvoice.form.messages.totalAmountError"));
        //     return;
        // }

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            showToast.error(validationErrors.join('\n'));
            return;
        }

        if (isInEditMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"),
                text: t("ConfirmUpdateText"),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!isInEditMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                grandTotal: formData.totalAmount,
                taxTotal: formData.totalTax,
                CreatedUser: userId,
                vatLedgerId: generalSettings?.taxLedgerId,
                CreatedDate: new Date(),
                ModifiedUser: isInEditMode ? userId : null,
                deliveryDetails: (formData.deliveryDetails || []).map((detail) => ({
                    ...detail,
                    ModifiedUser: isInEditMode ? userId : detail?.ModifiedUser ?? null,
                    CreatedUser: isInEditMode ? detail?.CreatedUser ?? userId : userId,
                })),


            };
            const api = isInEditMode ? `update-delivery-note/${dlvryNoteId}` : 'save-delivery-note'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                showToast.success(t("saveSuccess"));
                setIsSaving(false);
                const printData = response?.data?.data?.payload?.deliveryNoteMaster;
                const invoiceId = isEditMode ? existingInvoiceNo : printData?.deliveryNoteNo

                const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceId, printData);

                if (formData.printAfterSave) {
                    printToPrinterFn(invoiceDataForPrint);
                } else {
                    const pdfResult = await Swal.fire({
                        title: t('Print as PDF?') || 'Print as PDF?',
                        text: t('Do you want to download this delivery note as a PDF?') || 'Do you want to download this delivery note as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => { printToPdfFn(invoiceDataForPrint); }, 500);
                    }
                }

                // ✅ Reset mode states
                if (isInEditMode) {
                    setIsInEditMode(false);
                    setIsEditMode(false);
                    setExistingInvoiceNo('');
                }
                // ✅ Increment reset key to unmount/remount table
                setResetTableKey(prev => prev + 1);

                // ✅ Single atomic reset — no intermediate empty state
                setFormData({
                    voucherType: "Delivery Note",
                    yearId: currentFinancialYear?.yearId,
                    date: toLocalDateString(new Date()),
                    ledgerId: financeSettings.defaultSalesAccount || '',
                    pricingLevelId: 1,
                    employeeId: '',
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                    taxType: 'Applicable to product',
                    printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
                    costCentreId: 1,
                    BatchId: '',
                    customerName: '',
                    CustomerAddress: '',
                    CustomerPhone: '',
                    CustomerVATNo: '',
                    RefNo: "",
                    RefDate: "",
                    exchangeRate: currentCurrencyConversion?.rate,
                    exchangeDate: toLocalDateString(currentCurrencyConversion?.date),
                    orderMasterId: "",
                    quotationMasterId: "",
                    proformaMasterId: "",
                    AgainstNo: "NA",
                    transportCompany: "",
                    vehicleNo: "",
                    narration: "",
                    taxableAmt: "",
                    subTotal: "",
                    totalTax: "",
                    additionalCost: "",
                    otherChargeLedgerId: "",
                    othercharge: "",
                    billDiscount: "",
                    billDiscountWithTax: "",   // ← ADD THIS
                    roundOff: "",
                    totalAmount: "",
                    totalDiscount: "",
                    deliveryLocation: '',
                    driverName: '',
                    deliveryVehicleNo: '',
                    LPONo: '',
                    LPODate: '',
                    contactNo: '',
                    postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
                    postedBy: generalSettings?.AccountPosting ? null : userId,
                    postedDate: generalSettings?.AccountPosting ? null : toLocalDateString(new Date()),
                    branchId: selectedBranchId,
                    CreatedUser: userId,
                    deliveryDetails: [
                        {
                            deliveryNoteDetails1Id: "",
                            orderDetails1Id: "",
                            quotationDetailsId: "",
                            proformaDetails1Id: "",
                            SlNo: "",
                            productCode: "",
                            Remark: '',
                            productName: '',
                            productNameArb: '',
                            qty: null,
                            freeQty: null,
                            rate: null,
                            unitId: null,
                            unitName: '',
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
                            GodownId: 1,
                            RackId: null,
                            branchId: selectedBranchId
                        }
                    ]
                });

                // ✅ Generate new voucher
                await genarateSalesInvoiceId();

                if (saleSettings.CloseAfterSave) {
                    navigate('/transaction/delivery-note/delivery-note-list');
                }
            }
        } catch (error) {
            console.error('Error saving delivery note:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save delivery note',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, isInEditMode, dlvryNoteId, invoiceId, buildInvoiceDataForPrint, printToPrinterFn, printToPdfFn, currentFinancialYear, financeSettings, saleSettings, currentCurrencyConversion, generalSettings, selectedBranchId, userId]);
    const fetchDeliveryNoteDataForPrint = useCallback(async () => {
        const response = await axiosInstance.get(`get-delivery-note-byId/${dlvryNoteId}`);
        const data = response.data.data;

        let freshTaxData = taxData;
        if (!freshTaxData || freshTaxData.length === 0) {
            try {
                const taxRes = await axiosInstance.get("tax-masters");
                freshTaxData = taxRes.data.data || [];
                setTaxData(freshTaxData);
            } catch (e) {
                console.error('Error fetching tax data', e);
            }
        }

        const salesDetailsWithProducts = (data.deliveryDetails || []).map((item) => {
            const taxInfo = freshTaxData.find(t => t.taxId === item.taxId);
            const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

            return {
                ...item,
                productName: item?.productname || item?.productName || '',
                productNameArb: item?.productNameArb || '',
                qty: parseFloat(item.qty) || 0,
                freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                rate: parseFloat(item.rate) || 0,
                lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                discountPercentage: parseFloat(item.discountPercentage) || 0,
                taxRate,
                PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                taxAmount: parseFloat(item.taxAmount) || 0,
                grossAmount: parseFloat(item.grossAmount) || 0,
                netAmount: parseFloat(item.netAmount) || 0,
                amount: parseFloat(item.amount) || 0,
            };
        });

        return {
            ...data,
            date: toLocalDateString(data.date),
            RefDate: toLocalDateString(data.RefDate),
            exchangeDate: toLocalDateString(data.exchangeDate),
            LPODate: toLocalDateString(data.LPODate),
            postedDate: toLocalDateString(data.postedDate),
            deliveryDetails: salesDetailsWithProducts,
        };
    }, [dlvryNoteId, taxData]);
    const handleReprintToPrinter = useCallback(async () => {
        if (generalSettings?.askConfirmationPrint) {
            const result = await Swal.fire({
                title: t('ConfirmPrintTitle') || 'Confirm Print',
                text: t('ConfirmPrintText') || 'Are you sure you want to print this invoice?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesPrint') || 'Yes, Print',
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setIsPrinting(true);
        try {
            const freshData = await fetchDeliveryNoteDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData);
            printToPrinterFn(invoiceDataForPrint);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching delivery note for reprint:', error);
            showToast.error('Failed to fetch delivery note data for printing');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, fetchDeliveryNoteDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn, isElectron]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const freshData = await fetchDeliveryNoteDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData);
            printToPdfFn(invoiceDataForPrint);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching delivery note for PDF reprint:', error);
            showToast.error('Failed to fetch delivery note data for PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [fetchDeliveryNoteDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPdfFn, isElectron]);

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

    const breadcrumbActions = [
        {
            label: t("listBtn"),
            icon: Table,
            type: "secondary",
            onClick: () => navigate("/transaction/delivery-note/delivery-note-list"),
        },
        !isEditMode && {
            label: `Hold${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentInvoice,
            title: "Hold current delivery note (CTRL + H)",
        },
        heldInvoices.length > 0 && !isEditMode && {
            label: "Restore",
            icon: ArchiveRestore,
            type: "tertiary",
            title: "View and restore held delivery notes",
            onClick: () => setShowHeldInvoices(!showHeldInvoices),
        },
        {
            label: t("clearBtn"),
            icon: Eraser,
            type: "secondary",
            onClick: clearForm,
            title: isEditMode ? "Clear form and return to add mode" : undefined
        },
        {
            label: editMode ? t("updateBtn") : t("submitBtn"),
            icon: isSaving
                ? Loader2            // loading icon
                : isEditMode
                    ? Pencil            // edit mode icon
                    : SaveAll,
            type: "primary",
            onClick: handleSave,
            loading: isSaving,
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);

    const deliveryNoteShortcuts = [
        {
            heading: 'General',
            items: [
                { keys: ['Ctrl', 'S'], description: 'Save / update delivery note' },
                { keys: ['Alt', '/'], description: 'Open help and shortcuts panel' },
            ],
        },
        {
            heading: 'Product Grid',
            items: [
                { keys: ['Enter'], description: 'Move to next field or add a new row' },
                { keys: ['←', '→'], description: 'Move between editable columns' },
                { keys: ['↑', '↓'], description: 'Move between rows' },
            ],
        },
    ];

    const deliveryNoteManual = [
        {
            heading: 'Creating a New Delivery Note',
            steps: [
                'Select the customer and review the delivery details before adding products.',
                'Add items from the grid by entering the product name or scanning a barcode.',
                'Set quantity and rate, then review the totals before saving the note.',
                'Press Ctrl+S to save or update the delivery note.',
            ],
        },
        {
            heading: 'Printing & Conversion',
            steps: [
                'Choose a print layout from the Print Type dropdown before printing or saving as PDF.',
                'Use the Print dropdown in edit mode to reprint or download a PDF for the delivery note.',
                'Convert the delivery note into a sales invoice when needed using the Convert menu.',
            ],
        },
    ];

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("deliveryNote.breadcrumb.master"), url: "#" },
                        { title: t("deliveryNote.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("deliveryNote.breadcrumb.editTitle") : t("deliveryNote.breadcrumb.title") }}
                    actions={breadcrumbActions}
                />
                <Preloader />
            </div>
        );
    }
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className='bg-primary dark:bg-primary'>
            <PopupPreloader
                isOpen={isSaving || isPrinting}
                state="loading"
                title={isPrinting ? t("Printing") || "Preparing Print..." : t("loadingText")}
                subtitle={isPrinting ? t("printingDesc") || "Please wait while we prepare your invoice for printing..." : t("loadingDesc")}
            />
            <HeldInvoicesPanel />
            <BreadCrumb
                routes={[
                    { title: t("deliveryNote.breadcrumb.master"), url: "#" },
                    { title: t("deliveryNote.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("deliveryNote.breadcrumb.editTitle") : t("deliveryNote.breadcrumb.title") }}
                actions={breadcrumbActions}
                customActions={
                    <div className="flex items-center gap-3">
                        {(
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSaveTopDeliveryNote"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSaveTopDeliveryNote"
                                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                >
                                    {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                                </label>
                            </div>
                        )}
                        {isEditMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                        {isEditMode && <ConvertMenu onConvert={handleConvert} page="deliveryNote" />}
                    </div>
                }
            />

            <FormSectionMain
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                loadQuotationDetailsByQtnId={loadQuotationDetailsByQtnId}
                loadProformaDetailsByProformaId={loadProformaDetailsByProformaId}
                loadOrderDetailsByOrderMasterIdId={loadOrderDetailsByOrderMasterIdId}
                loading={loading}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={`form-${resetTableKey}`}
                resetTableKey={resetTableKey}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                batches={batches}
                employees={employees}
                costCenters={costCenters}
                customers={customers}
                pricingLevel={pricingLevel}
                godowns={godowns}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.deliveryDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, deliveryDetails: updatedRows }))}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                otherChargeLedgers={otherChargeLedgers}
                currentledgerBalance={currentledgerBalance}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                salesAccount={salesAccount}
                currency={currency}
                quotationData={quotationData}
                setQuotationData={setQuotationData}

                proformaData={proformaData}
                setProformaData={setProformaData}

                salesOrderData={salesOrderData}
                setSalesOrderData={setSalesOrderData}
                updateCustomerId={updateCustomerId}
                setUpdateCustomerId={setUpdateCustomerId}
            />
            <HelpShortcuts
                title="Delivery Note Help"
                groups={deliveryNoteShortcuts}
                manual={deliveryNoteManual}
                buttonPosition="bottom-6 right-22"
            />
        </div>
    )
}

export default DeliveryNoteSkin