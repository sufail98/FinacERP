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
import salesOrderInvoicePrintOne from '@/utils/prints/salesOrderPints/salesOrderInvoicePrintOne';
import salesOrderInvoicePrintTwo from '@/utils/prints/salesOrderPints/salesOrderInvoicePrintTwo';
import { formatDateWithTime } from '@/lib/dateFormat';
import { parseDateFromAPI, parseLocalDate } from '../SalesQuotation/salesQuotationDateFormat';
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import PopupPreloader from '@/components/common/PopupPreloader';
import HelpShortcuts from '@/components/common/HelpShortcuts';
import { showToast } from '@/utils/toast';
import salesOrderInvoicePrintThree from '@/utils/prints/salesOrderPints/salesOrderPrintThree';
import salesOrderInvoicePrintfour from '@/utils/prints/salesOrderPints/salesOrderInvoicePrintFour';
import salesOrderInvoicePrintFive from '@/utils/prints/salesOrderPints/salesOrderPrintFive';
import { isElectron } from '@/utils/electronPrint';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';


const SalesOrderSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Order");

    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const [isPrinting, setIsPrinting] = useState(false);
    const { salesOrderId } = useParams();
    const editMode = Boolean(salesOrderId);
    const [isEditMode, setIsEditMode] = useState(Boolean(salesOrderId));
    const [canEdit, setCanEdit] = useState(!Boolean(salesOrderId));
    const [isInEditMode, setIsInEditMode] = useState(Boolean(salesOrderId));
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
    const [invoiceId, setInvoiceId] = useState('');
    const [currency, setCurrencies] = useState([]);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, printSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const invoiceTypes = Object.keys(printSettings?.["Sales Order"]?.types || {});
    const invoicePrintConfig = printSettings?.["Sales Order"]?.default || Object.values(printSettings?.["Sales Order"]?.types || {})[0];
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [otherChargeLedgers, setOtherChargLedgers] = useState(null);
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [quotationData, setQuotationData] = useState([])
    const [proformaData, setProformaData] = useState([])
    const [taxData, setTaxData] = useState([]);

    // ===== HOLD ORDER STATE =====
    const [heldOrders, setHeldOrders] = useState([]);
    const [showHeldOrders, setShowHeldOrders] = useState(false);
    const [restoredHeldOrderId, setRestoredHeldOrderId] = useState(null);
    const decimalPart = generalSettings?.decimalPart ?? 2;
    // add near other useState hooks
    const [helpOpen, setHelpOpen] = useState(false);
    // ─── empty order details template (reused in multiple places) ───────────
    const emptyOrderDetail = {
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
        rate: null,
        taxRate: 0,
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
        branchId: selectedBranchId
    };
    const handleConvert = useCallback((type) => {
        switch (type) {

            case 'deliveryNote':
                navigate(`/transaction/delivery-note?fromOrder=${salesOrderId}`, { state: { againstOrder: true, masterId: salesOrderId } });
                break;
            case 'sale':
                navigate(`/transaction/sales-invoice?fromOrder=${salesOrderId}`, { state: { againstOrder: true, masterId: salesOrderId } });
                break;
            default:
                break;
        }
    }, [navigate, salesOrderId]);

    useEffect(() => {
        if (location.state?.shouldClear && !editMode) {
            window.history.replaceState({}, document.title);

            setFormData({
                voucherType: "Sales Order",
                yearId: currentFinancialYear?.yearId,
                date: new Date(),
                ledgerId: financeSettings.defaultSalesAccount || '',
                pricingLevelId: '',
                employeeId: '',
                currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                taxType: generalSettings.taxType,
                costCentreId: '',
                partyName: '',
                partyAddress: '',
                partyMobile: '',
                printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
                printType: invoicePrintConfig?.printType || 'Type 1',
                partyVatNo: '',
                partyRefNo: "",
                partyRefDate: "",
                LPONO: "",
                LPODate: "",
                dueDate: "",
                exchangeRate: currentCurrencyConversion?.rate,
                exchangeDate: currentCurrencyConversion?.date,
                quotationMasterId: "",
                proformaMasterId: "",
                AgainstNo: "",
                lrNo: "",
                transportCompany: "",
                status: 'Pending',
                othercharge: null,
                otherChargeLedgerId: null,
                narration: "",
                taxableAmt: "",
                subTotal: "",
                totalTax: "",
                additionalCost: "",
                billDiscount: "",
                roundOff: "",
                totalAmount: "",
                branchId: selectedBranchId,
                CreatedUser: userId,
                userId: userId,
                orderDetails: [{ ...emptyOrderDetail }],
                payments: [{ ledgerId: '', amount: '', date: '', remarks: '' }]
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
        setFormData(prev => ({ ...prev, taxType: generalSettings.taxType }));
    }, [generalSettings]);

    const [formData, setFormData] = useState({
        voucherType: "Sales Order",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        status: 'Pending',
        ledgerId: financeSettings.defaultSalesAccount || '',
        pricingLevelId: '',
        employeeId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType,
        costCentreId: '',
        partyName: '',
        partyAddress: '',
        partyMobile: '',
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'Type 1',
        partyVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        LPONO: "",
        LPODate: "",
        dueDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        quotationMasterId: "",
        proformaMasterId: "",
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
        branchId: selectedBranchId,
        CreatedUser: userId,
        userId: userId,
        orderDetails: [{ ...emptyOrderDetail }],
        payments: [{ ledgerId: '', amount: '', date: '', remarks: '' }]
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultSalesAccount || '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 1',
        }));
    }, [financeSettings, saleSettings, printSettings]);

    // ===== HOLD ORDER: Load from localStorage per branch =====
    useEffect(() => {
        const savedHeldOrders = localStorage.getItem('heldSalesOrders');
        if (savedHeldOrders) {
            const allHeldOrders = JSON.parse(savedHeldOrders);
            const branchHeldOrders = allHeldOrders.filter(order => order.branchId === selectedBranchId);
            const deduped = Array.from(
                new Map(branchHeldOrders.map(o => [o.id, o])).values()
            );
            setHeldOrders(deduped);
        }
    }, [selectedBranchId]);

    // ===== HOLD ORDER: Sync to localStorage whenever heldOrders changes =====
    useEffect(() => {
        const savedHeldOrders = localStorage.getItem('heldSalesOrders');
        const allHeldOrders = savedHeldOrders ? JSON.parse(savedHeldOrders) : [];
        const otherBranchOrders = allHeldOrders.filter(order => order.branchId !== selectedBranchId);

        const dedupedHeldOrders = Array.from(
            new Map(heldOrders.map(o => [o.id, o])).values()
        );

        const updatedAllOrders = [...otherBranchOrders, ...dedupedHeldOrders];
        if (updatedAllOrders.length > 0) {
            localStorage.setItem('heldSalesOrders', JSON.stringify(updatedAllOrders));
        } else {
            localStorage.removeItem('heldSalesOrders');
        }
    }, [heldOrders, selectedBranchId]);

    // ===== HOLD ORDER: Hold current order =====
    const holdCurrentOrder = useCallback(() => {
        const hasData = formData.orderDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldOrder = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId: invoiceId,
            customerName: formData.partyName || 'Unknown Customer',
            customerAddress: formData.partyAddress || '',
            totalAmount: formData.totalAmount || 0,
            itemCount: formData.orderDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldOrders(prev => {
            if (prev.some(o => o.id === heldOrder.id)) return prev;
            return [...prev, heldOrder];
        });
        showToast.success(`Order held successfully. Total held orders: ${heldOrders.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldOrders.length, selectedBranchId]);
    // ===== HOLD ORDER: Keyboard shortcut Ctrl+H =====
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                holdCurrentOrder();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentOrder]);

    // ===== HOLD ORDER: Restore a held order =====
    const restoreHeldOrder = (heldOrder) => {
        const hasValidProducts = formData.orderDetails.some(detail => detail.productCode && detail.qty > 0);
        if (hasValidProducts) {
            // Push current form back into held list (swap)
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                customerName: formData.partyName || 'Current Order',
                customerAddress: formData.partyAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.orderDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId,
                formData: { ...formData }
            };
            setHeldOrders(prev => [...prev.filter(o => o.id !== heldOrder.id), currentHeld]);
        } else {
            setHeldOrders(prev => prev.filter(o => o.id !== heldOrder.id));
        }
        setFormData(heldOrder.formData);
        setInvoiceId(heldOrder.invoiceId);
        setResetTableKey(prev => prev + 1);
        setShowHeldOrders(false);
        setRestoredHeldOrderId(heldOrder.id);
        showToast.success("Order restored successfully");
    };

    // ===== HOLD ORDER: Delete a held order =====
    const deleteHeldOrder = (orderId) => {
        setHeldOrders(prev => prev.filter(o => o.id !== orderId));
        showToast.success("Held order deleted");
    };

    // ===== HOLD ORDER: Panel UI (mirrors HeldInvoicesPanel) =====
    const HeldOrdersPanel = () => {
        if (!showHeldOrders || heldOrders.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Orders ({heldOrders.length})
                    </h3>
                    <button
                        onClick={() => setShowHeldOrders(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldOrders.map((order) => (
                        <div
                            key={order.id}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{order.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Order: {order.invoiceId}</p>
                                    {order.customerAddress && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {order.customerAddress}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        {parseFloat(order.totalAmount || 0).toFixed(decimalPart)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.itemCount} items</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                {new Date(order.timestamp).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => restoreHeldOrder(order)}
                                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:main-bg text-sm font-medium transition-colors"
                                >
                                    Restore
                                </button>
                                <button
                                    onClick={() => deleteHeldOrder(order.id)}
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
        navigate("/transaction/sales-order/sales-order-list");
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

        // If in edit mode, navigate to add page with clear state
        if (isEditMode || Boolean(salesOrderId)) {
            navigate('/transaction/sales-order', { state: { shouldClear: true } });
            return;
        }

        setFormData({
            voucherType: "Sales Order",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: financeSettings.defaultSalesAccount || '',
            pricingLevelId: '',
            employeeId: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            costCentreId: '',
            partyName: '',
            partyAddress: '',
            partyMobile: '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 1',
            partyVatNo: '',
            partyRefNo: "",
            partyRefDate: "",
            LPONO: "",
            LPODate: "",
            dueDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            quotationMasterId: "",
            proformaMasterId: "",
            AgainstNo: "",
            lrNo: "",
            transportCompany: "",
            status: 'Pending',
            othercharge: null,
            otherChargeLedgerId: null,
            narration: "",
            taxableAmt: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            billDiscount: "",
            roundOff: "",
            totalAmount: "",
            branchId: selectedBranchId,
            CreatedUser: userId,
            userId: userId,
            orderDetails: [{ ...emptyOrderDetail }],
            payments: [{ ledgerId: '', amount: '', date: '', remarks: '' }]
        });

        setIsInEditMode(false);
        setCanEdit(true);
        setIsEditMode(false);
        setExistingInvoiceNo('');
        fetchCustomerData(financeSettings?.defaultSalesAccount);

        await genarateSalesInvoiceId();
        setResetTableKey(prev => prev + 1);
    };

    const [baseDataloading, setBaseDataloading] = useState(false)

    const fetchCustomerData = async (ledgerId) => {
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId || formData.ledgerId}`);

            if (response.data) {
                const data = response.data.data;
                setFormData(prev => ({ ...prev, customerData: data }));

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
                const res = await axiosInstance.post('all-sales-data', {
                    voucherType: "Sales Order", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Customer", "Customer&Supplier"],
                    ledgerId: financeSettings?.defaultSalesAccount,
                    orderLedgerId: financeSettings?.defaultSalesAccount,
                    currencyId: currentCurrency.currencyId,
                    in_proformaMasterId: null, orderMasterId: null
                })
                const data = res?.data?.data

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setPricingLevel(data?.pricinglevel)
                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)

                const filteredCurrencies = data?.currencywithConversion?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal)
                setOtherChargLedgers(data?.othercharge)
                setTaxData(data?.taxMaster)

                setQuotationData(data?.salesOrderAgainstData?.salesOrderQuotationList)
                setProformaData(data?.salesOrderAgainstData?.salesOrderProformaList)

                setFormData(prev => ({ ...prev, customerData: data?.customeraddress }));

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
                    partyName: data?.customeraddress?.ledgerName || '',
                    partyAddress: data?.customeraddress?.address || '',
                    partyMobile: data?.customeraddress?.phoneNo || '',
                    partyVatNo: data?.customeraddress?.tinNumber || '',
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
        if (editMode) {
            getSalesById()
        }
    }, [editMode])

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

            if (!isSameDate || isMidnight) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time, editMode]);

    useEffect(() => {
        if (location.state && location.state.againstProforma && location.state.masterId) {
            loadProformaByProformaId(location.state.masterId);
        }
    }, [location.state]);

    const loadProformaByProformaId = async (ids) => {
        const idsArray = Array.isArray(ids)
            ? ids
            : [Number(ids)];
        setFetchLoading(true)
        try {
            const response = await axiosInstance.post(`get-proforma-details-for-sales-order`,
                { in_proforma_master_id: idsArray, in_branch_id: selectedBranchId, in_order_master_id: null }
            );
            const data = response.data.data;

            const salesDetailsWithProducts = await Promise.all(
                (data.orderDetails || []).map(async (item) => {
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
                        ...item,
                        productName: productName,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
                        qty: parseFloat(item.qty) || 0,
                        rate: parseFloat(item.rate) || 0,
                        taxRate: taxRate,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                ...data,
                quotationMasterId: idsArray,
                date: parseDateFromAPI(data.date),
                partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : "",
                LPODate: data.LPODate ? parseLocalDate(data.LPODate) : "",
                dueDate: data.dueDate ? parseLocalDate(data.dueDate) : "",
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                billDiscountWithTax: data.billDiscountWithTax || '',
                orderDetails: salesDetailsWithProducts,
                AgainstNo: data?.voucherNo
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };
    useEffect(() => {
        if (location.state && location.state.againstQuotation && location.state.masterId) {
            loadQuotationDetailsByQtnId(location.state.masterId);
        }
    }, [location.state]);
    const loadQuotationDetailsByQtnId = async (qId) => {
        setFetchLoading(true)
        const idsArray = Array.isArray(qId)
            ? qId
            : [Number(qId)];
        try {
            const response = await axiosInstance.post(`get-quotation-details-for-sales-order`,
                { In_quotationmasterId: idsArray, In_branchId: selectedBranchId, in_ordermasterid: null }
            );
            const data = response.data.data;

            const salesDetailsWithProducts = await Promise.all(
                (data.orderDetails || []).map(async (item) => {
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
                    return {
                        ...item,
                        productName: productName,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
                        qty: parseFloat(item.qty) || 0,
                        rate: parseFloat(item.rate) || 0,
                        taxRate: taxRate,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                ...data,
                quotationMasterId: idsArray,
                date: parseDateFromAPI(data.date),
                partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : "",
                LPODate: data.LPODate ? parseLocalDate(data.LPODate) : "",
                dueDate: data.dueDate ? parseLocalDate(data.dueDate) : "",
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                billDiscountWithTax: data.billDiscountWithTax || false,
                orderDetails: salesDetailsWithProducts,
                AgainstNo: data?.voucherNo
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
            const response = await axiosInstance.get(`get-sales-order-byId/${salesOrderId}`);
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
            setExistingInvoiceNo(data.orderNo)
            fetchCustomerData(data.ledgerId);

            const salesDetailsWithProducts = await Promise.all(
                (data.orderDetails || []).map(async (item) => {
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

                    // ← Use freshTaxData instead of taxData
                    const taxInfo = freshTaxData.find(t => t.taxId === item.taxId);
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
                                UnitName: selectedUnit?.unitname || selectedUnit?.unitName || selectedUnit?.UnitName || item.unitName || item.UnitName || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        ...item,
                        productName: productName,
                        productNameArb: productNameArb,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
                        qty: parseFloat(item.qty) || 0,
                        rate: parseFloat(item.rate) || 0,
                        taxRate: taxRate,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                ...data,
                date: parseDateFromAPI(data.date),
                partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : "",
                LPODate: data.LPODate ? parseLocalDate(data.LPODate) : "",
                dueDate: data.dueDate ? parseLocalDate(data.dueDate) : "",
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                billDiscountWithTax: data.billDiscountWithTax || '',
                printType: data.printType || invoicePrintConfig?.printType || 'Type 1',
                orderDetails: salesDetailsWithProducts,
                payments: data.payments
            }));

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
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Sales Order&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            if (isEditMode) {
                setExistingInvoiceNo(response?.data?.voucherCode)
            }
            setInvoiceId(response?.data?.voucherCode)
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
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer", "Customer&Supplier"], branchId: selectedBranchId });
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
        if (!formData.orderDetails || formData.orderDetails.length === 0) {
            errors.push('Please add at least one product');
        }
        const hasValidProducts = formData.orderDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    // ===== PRINT HELPERS =====

    const buildInvoiceDataForPrint = useCallback((invoiceNumber, overrideData) => {
        const base = overrideData || formData;
        const mergedCustomerData = {
            ...(formData.customerData || {}),
            ...(base.customerData || {}),
        };
        return {
            ...base,
            invoiceNo: invoiceNumber,
            date: base.date,
            customerData: mergedCustomerData,
            salesDetails: (base.orderDetails || formData.orderDetails)?.map((detail, idx) => ({
                ...detail,
                unitName: detail.unitName || formData.orderDetails?.[idx]?.unitName || detail.UnitName || ''
            })),
        };
    }, [formData]);

    const printToPrinterFn = useCallback((invoiceDataForPrint) => {
        setTimeout(async () => {
            const selectedPrintType = formData.printType || 'Type 1';
            if (selectedPrintType === 'Type 2') {
                await salesOrderInvoicePrintTwo(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else if (selectedPrintType === 'Type 1') {
                await salesOrderInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else if (selectedPrintType === 'Type 3') {
                await salesOrderInvoicePrintThree(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else if (selectedPrintType === 'Type 4') {
                await salesOrderInvoicePrintfour(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else if (selectedPrintType === 'Type 5') {
                await salesOrderInvoicePrintFive(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else {
                await salesOrderInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            }
        }, 500);
    }, [formData.printType, selectedBranchDetails, currentCurrency]);

    const printToPdfFn = useCallback((invoiceDataForPrint) => {
        setTimeout(async () => {
            const selectedPrintType = formData.printType || 'Type 1';
            if (selectedPrintType === 'Type 2') {
                await salesOrderInvoicePrintTwo(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else if (selectedPrintType === 'Type 1') {
                await salesOrderInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            } else {
                await salesOrderInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, undefined, undefined, currentCurrency);
            }
        }, 500);
    }, [formData.printType, selectedBranchDetails, currentCurrency]);

    // ===== SAVE HANDLER =====
    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            showToast.error(validationErrors.join(', '));
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
                ModifiedUser: isInEditMode ? userId : null,
                ModifiedDate: isInEditMode ? formatDateWithTime(new Date()) : null,
                vatLedgerId: generalSettings?.taxLedgerId,
                CreatedUser: userId,
                orderDetails: (formData.orderDetails || []).map((detail) => ({
                    ...detail,
                    ModifiedUser: isInEditMode ? userId : detail?.ModifiedUser ?? null,
                    CreatedUser: isInEditMode ? detail?.CreatedUser ?? userId : userId,
                    ModifiedDate: isInEditMode ? formatDateWithTime(new Date()) : null,

                })),
                date: formatDateWithTime(formData.date)
            };
            const api = isInEditMode ? `update-sales-order/${salesOrderId}` : 'save-sales-order';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                showToast.success(t("saveSuccess"));
                setIsSaving(false);
                const orderData = response?.data?.data?.payload?.salesOrderMaster
                const invoiceId = isInEditMode ? existingInvoiceNo : response?.data?.data?.orderNo
                const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceId, orderData);

                // ===== HOLD ORDER: Clean up restored held order after save =====
                if (restoredHeldOrderId) {
                    setHeldOrders(prev => prev.filter(o => o.id !== restoredHeldOrderId));
                    setRestoredHeldOrderId(null);
                }

                if (formData.printAfterSave) {
                    printToPrinterFn(invoiceDataForPrint);
                } else {
                    const pdfResult = await Swal.fire({
                        title: t('print As Pdf') || 'Print as PDF?',
                        text: t('Do you want to download this order as a PDF?') || 'Do you want to download this sales order as a PDF?',
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

                // Reset states
                if (isInEditMode) {
                    setIsInEditMode(false);
                    setIsEditMode(false);
                    setExistingInvoiceNo('');
                }

                // Create fresh empty orderDetails
                const emptyOrderDetails = [{ ...emptyOrderDetail }];

                // First, set orderDetails to empty array to force unmount
                setFormData(prev => ({ ...prev, orderDetails: [] }));

                // Increment reset key
                setResetTableKey(prev => prev + 1);

                // Wait for next tick
                await new Promise(resolve => setTimeout(resolve, 0));

                // Now set the full form with new empty orderDetails
                setFormData({
                    voucherType: "Sales Order",
                    yearId: currentFinancialYear?.yearId,
                    date: new Date(),
                    ledgerId: financeSettings.defaultSalesAccount || '',
                    pricingLevelId: '',
                    employeeId: '',
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                    taxType: 'Applicable to product',
                    costCentreId: '',
                    partyName: '',
                    partyAddress: '',
                    partyMobile: '',
                    printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
                    printType: invoicePrintConfig?.printType || 'Type 1',
                    partyVatNo: '',
                    partyRefNo: "",
                    partyRefDate: "",
                    LPONO: "",
                    LPODate: "",
                    dueDate: "",
                    exchangeRate: currentCurrencyConversion?.rate,
                    exchangeDate: currentCurrencyConversion?.date,
                    quotationMasterId: "",
                    proformaMasterId: "",
                    AgainstNo: "",
                    lrNo: "",
                    transportCompany: "",
                    status: 'Pending',
                    othercharge: null,
                    otherChargeLedgerId: null,
                    narration: "",
                    taxableAmt: "",
                    subTotal: "",
                    totalTax: "",
                    additionalCost: "",
                    billDiscount: "",
                    roundOff: "",
                    totalAmount: "",
                    branchId: selectedBranchId,
                    CreatedUser: userId,
                    userId: userId,
                    orderDetails: emptyOrderDetails,
                    payments: [{ ledgerId: '', amount: '', date: '', remarks: '' }]
                });

                await genarateSalesInvoiceId();

                if (saleSettings.CloseAfterSave) {
                    navigate('/transaction/sales-order/sales-order-list');
                }
            }
        } catch (error) {
            console.error('Error saving sales order:', error);

            // ✅ AUTO-HOLD ORDER ON ERROR
            const hasValidData = formData.orderDetails.some(detail => detail.productCode && detail.qty > 0);

            if (hasValidData) {
                const heldOrder = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    invoiceId: invoiceId,
                    customerName: formData.partyName || 'Unknown Customer',
                    customerAddress: formData.partyAddress || '',
                    totalAmount: formData.totalAmount || 0,
                    itemCount: formData.orderDetails.filter(d => d.productCode).length,
                    branchId: selectedBranchId,
                    formData: { ...formData },
                    errorHeld: true // Mark as error-held
                };

                setHeldOrders(prev => [...prev, heldOrder]);

                showToast.warning(
                    `Save failed. Order has been automatically held. Total held orders: ${heldOrders.length + 1}`
                );
            }

            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                html: `
                    <div class="text-left">
                        <p class="mb-2">${error.response?.data?.message || t("saveError") || "Error saving sales order"}</p>
                        ${hasValidData ? '<p class="text-sm text-blue-600">Your order data has been automatically held and can be restored later.</p>' : ''}
                    </div>
                `,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
        } finally {
            setIsSaving(false);
        }
    }, [
        formData,
        generalSettings,
        t,
        isInEditMode,
        salesOrderId,
        saleSettings,
        invoiceId,
        buildInvoiceDataForPrint,
        printToPrinterFn,
        printToPdfFn,
        currentFinancialYear,
        financeSettings,
        invoicePrintConfig,
        currentCurrencyConversion,
        selectedBranchId,
        userId,
        restoredHeldOrderId,
        heldOrders.length
    ]);
    const fetchOrderDataForPrint = useCallback(async () => {
        const response = await axiosInstance.get(`get-sales-order-byId/${salesOrderId}`);
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

        const salesDetailsWithProducts = (data.orderDetails || []).map((item) => {
            const taxInfo = freshTaxData.find(t => t.taxId === item.taxId);
            const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

            return {
                ...item,
                productName: item?.productname || item?.productName || '',
                productNameArb: item?.productNameArb || '',
                unitName: item?.units?.find(u => u.unitid === item.unitId)?.unitname || item?.units?.find(u => u.unitId === item.unitId)?.unitName || item?.unitName || item?.UnitName || '',
                qty: parseFloat(item.qty) || 0,
                rate: parseFloat(item.rate) || 0,
                taxRate,
                taxAmount: parseFloat(item.taxAmount) || 0,
                grossAmount: parseFloat(item.grossAmount) || 0,
                netAmount: parseFloat(item.netAmount) || 0,
                amount: parseFloat(item.amount) || 0,
            };
        });

        return {
            ...data,
            date: parseDateFromAPI(data.date),
            partyRefDate: data.partyRefDate ? parseLocalDate(data.partyRefDate) : "",
            LPODate: data.LPODate ? parseLocalDate(data.LPODate) : "",
            dueDate: data.dueDate ? parseLocalDate(data.dueDate) : "",
            exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
            billDiscountWithTax: data.billDiscountWithTax || '',
            orderDetails: salesDetailsWithProducts,
            payments: data.payments,
        };
    }, [salesOrderId, taxData]);
    // ===== EDIT MODE: Print to Printer =====
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
            const freshData = await fetchOrderDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData);
            printToPrinterFn(invoiceDataForPrint);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching order for reprint:', error);
            showToast.error('Failed to fetch order data for printing');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, fetchOrderDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn, isElectron]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const freshData = await fetchOrderDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData);
            printToPdfFn(invoiceDataForPrint);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching order for PDF reprint:', error);
            showToast.error('Failed to fetch order data for PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [fetchOrderDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPdfFn, isElectron]);

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
            onClick: handleListNavigate,
        },
        // ===== HOLD ORDER: Breadcrumb buttons (mirrors SalesInvoiceSkin) =====
        !isEditMode && {
            label: `Hold${heldOrders.length > 0 ? ` (${heldOrders.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentOrder,
            title: "Hold the current order (CTRL + H)",
        },
        heldOrders.length > 0 && !isEditMode && {
            label: "Restore",
            icon: ArchiveRestore,
            type: "tertiary",
            title: "View and restore held orders",
            onClick: () => setShowHeldOrders(!showHeldOrders),
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
                ? Loader2
                : isEditMode
                    ? Pencil
                    : SaveAll,
            type: "primary",
            onClick: handleSave,
            loading: isSaving,
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);

    const salesOrderShortcuts = [
        {
            heading: 'General',
            items: [
                { keys: ['Ctrl', 'S'], description: 'Save / update sales order' },
                { keys: ['Ctrl', 'H'], description: 'Hold current sales order' },
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

    const salesOrderManual = [
        {
            heading: 'Creating a New Sales Order',
            steps: [
                'Select the customer and fill in the order header details before adding products.',
                'Add products from the grid by entering the product name or scanning a barcode.',
                'Set quantity and rate, then review the totals before storing the order.',
                'Press Ctrl+S to save or update the order.',
            ],
        },
        {
            heading: 'Holding & Restoring Orders',
            steps: [
                'Press Ctrl+H or click Hold Order to temporarily save the current order and start a new one.',
                'Use Restore to view held orders and bring one back into the form.',
            ],
        },
        {
            heading: 'Printing & Conversion',
            steps: [
                'Choose a print layout from the Print Type dropdown before printing or saving as PDF.',
                'Use the Print dropdown in edit mode to reprint or download a PDF for the order.',
                'Convert the sales order into related documents such as a delivery note or sales invoice using the Convert menu.',
            ],
        },
    ];

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesOrder.breadcrumb.master"), url: "#" },
                        { title: editMode ? t("salesOrder.breadcrumb.editTitle") : t("salesOrder.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("salesOrder.breadcrumb.editTitle") : t("salesOrder.breadcrumb.title") }}
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

            {/* ===== HOLD ORDER: Render panel ===== */}
            <HeldOrdersPanel />

            <BreadCrumb
                routes={[
                    { title: t("salesOrder.breadcrumb.master"), url: "#" },
                    { title: editMode ? t("salesOrder.breadcrumb.editTitle") : t("salesOrder.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("salesOrder.breadcrumb.editTitle") : t("salesOrder.breadcrumb.title") }}
                actions={breadcrumbActions}

                customActions={
                    <div className="flex items-center gap-3">
                        {!isEditMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSaveTopSalesOrder"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSaveTopSalesOrder"
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
                            value={formData.printType || 'Type 1'}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, printType: e.target.value }));
                            }}
                        >
                            {
                                invoiceTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))
                            }
                        </select>
                        {isEditMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                        {isEditMode && <ConvertMenu onConvert={handleConvert} page="order" />}
                    </div>
                }
                onHelpClick={() => setHelpOpen(true)}
            />

            <FormSectionMain
                resetTableKey={resetTableKey}
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                loading={loading}
                loadQuotationDetailsByQtnId={loadQuotationDetailsByQtnId}
                loadProformaByProformaId={loadProformaByProformaId}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={`form-${resetTableKey}`}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                costCenters={costCenters}
                customers={customers}
                pricingLevel={pricingLevel}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.orderDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, orderDetails: updatedRows }))}
                paymentRows={formData.payments}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                otherChargeLedgers={otherChargeLedgers}
                currentledgerBalance={currentledgerBalance}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                currency={currency}
                setProformaData={setProformaData}
                setQuotationData={setQuotationData}
                proformaData={proformaData}
                quotationData={quotationData}
            />
            <HelpShortcuts
                title="Sales Order Help"
                groups={salesOrderShortcuts}
                manual={salesOrderManual}
                buttonPosition="bottom-6 right-22"
                showFloatingButton={false}
                open={helpOpen}
                onOpenChange={setHelpOpen}
            />
        </div>
    )
}

export default SalesOrderSkin;