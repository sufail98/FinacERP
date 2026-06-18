import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, Loader2, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
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
import purchaseReturnPrintOne from '@/utils/prints/purchaseReturnPrints/purchaseReturnPrintOne';
// ✅ ADDED: Import timezone-safe date utilities
import { parseDateFromAPI, parseLocalDate } from '../SalesQuotation/salesQuotationDateFormat';
import { formatDateWithTime } from '@/lib/dateFormat';

const PurchaseReturnSkin = () => {
    const { purchaseReturnmasterId } = useParams();
    const editMode = Boolean(purchaseReturnmasterId);
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
    const [currency, setCurrnecies] = useState([])
    const [invoiceId, setInvoiceId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const [batches, setBatches] = useState([]);

    const [billingAddress, setBlillingAddress] = useState(null);
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [taxData, setTaxData] = useState([]);
    const [purchaseAccounts, setPurchaseAccounts] = useState([]);
    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);

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
        voucherType: "Purchase Return",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: financeSettings.defaultPurchaseAccount || '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: 'Applicable to product',
        GodownId: 1,
        purchaseMasterId: '',
        costCentreId: 1,
        printAfterSave: true,
        printType: 'a4',
        BatchId: '',
        partyName: '',
        partyAddress: '',
        partyPhone: '',
        partyVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        purchaseAccount: "",
        orderMasterId: "",
        receiptMasterId: "",
        creditPeriod: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        AgainstNo: 'NA',
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
        paymentMode: saleSettings?.DefaultPaymentMode,
        CashLedgerId: "1",
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
                purchaseDetails1Id: "",
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

    const [baseDataloading, setBaseDataloading] = useState(false)
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
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-purchase-data', {
                    voucherType: "Purchase Return", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId, ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId
                })
                const data = res?.data?.data;


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
                const filteredCurrencies = data?.currencies?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrnecies(filteredCurrencies);

                setPurchaseAccounts(data.purchaseaccount)
                if (data?.purchaseaccount.length > 0 && !formData.purchaseAccount) {
                    setFormData(prev => ({
                        ...prev,
                        purchaseAccount: data?.purchaseaccount[0].ledgerId,
                    }));
                }

                // ✅ FIXED: Find matching ledger from customersupplierLedgers using ledgerId
                const currentLedgerId = formData.ledgerId;
                const matchingLedger = data?.customersupplierLedgers?.find(
                    (ledger) => ledger.ledgerId === parseInt(currentLedgerId) || ledger.ledgerId === currentLedgerId
                );
                setFormData((prev) => {
                    const defaultGodown = data?.godowns?.find(g => g.IsDefault);

                    return {
                        ...prev,
                        GodownId: defaultGodown
                            ? defaultGodown.GodownId
                            : data?.godowns?.[0]?.GodownId || '',
                    };
                });
                // ✅ Use the first supplier as default if no matching ledger found
             const defaultLedger = matchingLedger || (data?.customersupplierLedgers?.length > 0 ? data.customersupplierLedgers[0] : null);

if (!editMode) {
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
            customerData: defaultLedger,
            BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : 1
        }));
    } else {
        setBlillingAddress({ name: '', email: '', phoneNo: '', vatNo: '', address: '' });
        setFormData((prev) => ({
            ...prev,
            partyName: '',
            partyAddress: '',
            partyMobile: '',
            partyVatNo: '',
            customerData: null,
            BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : 1
        }));
    }
} else {
    // In edit mode, only update BatchId — getSalesById handles party/billing fields
    setFormData((prev) => ({
        ...prev,
        BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : 1
    }));
}
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
        navigate("/transaction/purchase-return/purchase-return-list");
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
            voucherType: "Purchase Return",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: financeSettings.defaultPurchaseAccount || '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            costCentreId: 1,
            printAfterSave: true,
            printType: 'a4',
            BatchId: '',
            customerName: '',
            CustomerAddress: '',
            CustomerPhone: '',
            customerVATNo: '',
            partyRefNo: "",
            partyRefDate: "",
            creditPeriod: "",
            purchaseAccount: "",
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
            paymentMode: saleSettings?.DefaultPaymentMode,
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
                    purchaseDetails1Id: "",
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

        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultPurchaseAccount || '',
            paymentMode: saleSettings?.DefaultPaymentMode,
        }));
    }, [financeSettings, saleSettings]);

    const loadPurchaseInvoiceData = async (purchaseInvoicemasterId) => {
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

            // ✅ FIXED: All dates use timezone-safe parsing + correct field name (partyRefDate)
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
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                customerVATNo: data.customerVATNo,
                RefNo: data.RefNo,
                // ✅ FIXED: Use "partyRefDate" (matches form) with fallback to "refDate" (in case API returns that)
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
            }));

            await fetchGodown(data.GodownId);

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])

    // ✅ FIXED: getSalesById with proper date parsing, correct field names, and all missing fields
    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-purchase-return-byId/${purchaseReturnmasterId}`);
            const data = response.data.data;

            setExistingInvoiceNo(data.returnNo)

            setBlillingAddress({
                name: data.partyName || '',
                email: data.email || '',
                phoneNo: data.partyPhone || '',
                vatNo: data.partyVatNo || '',
                address: data.partyAddress || ''
            });

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
                        purchaseDetails1Id: item.purchaseDetails1Id,
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
setBlillingAddress({
    name: data.partyName || '',
    email: data.partyEmail || '',
    phoneNo: data.partyMobile || '',
    vatNo: data.partyVatNo || '',
    address: data.partyAddress || ''
});
            setFormData((prev) => ({
                ...prev,
                // ✅ FIXED: Was "Purchase Invoice", should be "Purchase Return"
                voucherType: "Purchase Return",
                yearId: currentFinancialYear?.yearId,
                // ✅ FIXED: Timezone-safe date parsing
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: Number(data.BatchId),
                GodownId: data.GodownId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                customerVATNo: data.customerVATNo,
                // ✅ FIXED: Reference number — form uses "partyRefNo", API may return "RefNo" or "partyRefNo"
                partyRefNo: data.partyRefNo || data.RefNo || "",
                // ✅ FIXED: Reference date — form uses "partyRefDate", API may return "refDate" or "partyRefDate"
                partyRefDate: data.partyRefDate
                    ? parseLocalDate(data.partyRefDate)
                    : (data.refDate ? parseLocalDate(data.refDate) : ""),
                // ✅ FIXED: Credit period — fallback for different casing from API
                creditPeriod: data.creditPeriod || data.CreditPeriod || data.creditperiod || "",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseLocalDate(data.exchangeDate) : "",
                orderMasterId: data.orderMasterId,
                // ✅ FIXED: Purchase invoice number mapping
                purchaseAccount: data.purchaseAccount || prev.purchaseAccount,
                quotationId: data.purchaseInvoiceMasterId || data.quotationId || data.invoiceMasterId || "",
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
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Supplier"], branchId: selectedBranchId });
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
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Purchase Return&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
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
        ledgerId: { required: true, label: t("requiredFieldsError") },
    };

    const handleSave = useCallback(async () => {
        if (formData.BillBalanceAmount < 0) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: t("salesInvoice.alert.billBalanceAmtError"),
            });
            return;
        }
        if (!validateForm(formData, validationRules)) return;
        if (formData.paymentMode === 'credit' && formData.BillBalanceAmount <= 0) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: t("salesInvoice.alert.creditPaymentModeError"),
            });
            return;
        }
        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n');

            setAlert({
                id: Date.now(),
                type: "error",
                message: errorMessage,
            });
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"), text: t("ConfirmUpdateText"),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'), text: t('ConfirmSaveText'),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
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
            const api = editMode ? `update-purchase-return/${purchaseReturnmasterId}` : 'save-purchase-return'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t("saveSuccess"),
                });
                const savedInvoiceData = dataToSave;
                const invoiceNumber = editMode ? existingInvoiceNo : response.data.returnNo || invoiceId;

                if (formData.printAfterSave) {
                    const invoiceDataForPrint = {
                        ...savedInvoiceData,
                        invoiceNo: invoiceNumber,
                        date: savedInvoiceData.date || formData.date,
                        purchaseDetails: savedInvoiceData.purchaseDetails || formData.purchaseDetails
                    };

                    setTimeout(() => {
                        if (formData.printType === 'a4') {
                            purchaseReturnPrintOne(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
                        }
                    }, 500);
                }
                if (saleSettings.CloseAfterSave) {
                    navigate('/transaction/purchase-return/purchase-return-list')
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
    }, [formData, time, saleSettings, generalSettings, editMode]);

    useEffect(() => {
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
    }, [handleSave]);

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("purchaseReturn.breadcrumb.master"), url: "#" },
                        { title: t("purchaseReturn.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("purchaseReturn.breadcrumb.editTitle") : t("purchaseReturn.breadcrumb.title") }}
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
            <BreadCrumb
                routes={[
                    { title: t("purchaseReturn.breadcrumb.master"), url: "#" },
                    { title: t("purchaseReturn.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("purchaseReturn.breadcrumb.editTitle") : t("purchaseReturn.breadcrumb.title") }}
                actions={[
                    {
                        label: t("listBtn"),
                        icon: Table,
                        type: "secondary",
                        onClick: handleListNavigate,
                    },
                    {
                        label: t("clearBtn"),
                        icon: Eraser,
                        type: "secondary",
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
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ]}
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
                loadPurchaseInvoiceData={loadPurchaseInvoiceData}
            />
        </div>
    )
}

export default PurchaseReturnSkin