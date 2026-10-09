import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, Loader2, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import SalesReturnInvoicePrintOne, { generateQRCodeData } from '@/utils/prints/salesReturnPrints/SalesReturnInvoicePrintOne';
import salesReturnThermalPrintOne from '@/utils/prints/salesReturnPrints/thermal/salesReturnThermalPrintOne';
import PrintDropdown from '@/components/common/PrintDropdown';
import LogismartInvoicereturnPrint from '@/utils/prints/salesReturnPrints/LogismartInvoicereturnPrint';
import { Checkbox } from '@/components/ui/checkbox';
import axios from 'axios';
import { showToast } from '@/utils/toast';
import PopupPreloader from '@/components/common/PopupPreloader';
import HelpShortcuts from '@/components/common/HelpShortcuts';
import { formatDateWithTime } from '@/lib/dateFormat';
import salesReturnInvoicePrintTwo from '@/utils/prints/salesReturnPrints/salesReturnInvoicePrintTwo';
import salesReturnInvoicePrintThree from '@/utils/prints/salesReturnPrints/salesReturnInvoicePrintThree';
import salesReturnInvoicePrintFour from '@/utils/prints/salesReturnPrints/withoutQR/SalesReturnInvoicePrintfour';
import salesReturnThermalPrintTwo from '@/utils/prints/salesReturnPrints/thermal/salesReturnThermalPrintTwo';
import { isElectron } from '@/utils/electronPrint';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import { preconnect } from 'react-dom';

const SalesReturnSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Return");

    const [isPrinting, setIsPrinting] = useState(false);
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const { returnMasterId } = useParams();
    const editMode = Boolean(returnMasterId);
    const [fetchLoading, setFetchLoading] = useState(false)
    const navigate = useNavigate()
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('')
    const [ReturnMasterId, setReturnMasterId] = useState('')
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [isAgainst, setIsAgainst] = useState(false);
    const [batches, setBatches] = useState([]);
    const [godowns, setGodowns] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, selectedBranchDetails, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, zatcaSettings, printSettings } = useSelector((state) => state.settings);
    const decimalPart = generalSettings?.decimalPart ?? 2;
    const invoiceTypes = Object.keys(printSettings?.["Sales Return"]?.types || {});
    const invoicePrintConfig = printSettings?.["Sales Return"]?.default || Object.values(printSettings?.["Sales Return"]?.types || {})[0];
    const [resetTableKey, setResetTableKey] = useState(0);
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    // add near other useState hooks
    const [helpOpen, setHelpOpen] = useState(false);
    const [cash, setCash] = useState([])
    const [bank, setBank] = useState([])
    const [salesAccount, setSalesAccount] = useState([]);
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [taxData, setTaxData] = useState([])
    const [updateCustomerId, setUpdateCustomerId] = useState(null);

    // ===== HOLD INVOICE STATE =====
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
            setTime(formatted);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const [formData, setFormData] = useState({
        voucherType: "Sales Return", salesMasterId: "",
        yearId: currentFinancialYear?.yearId, date: new Date(), billTime: "",
        ledgerId: financeSettings.defaultSalesAccount || '', pricingLevelId: 1,
        employeeId: '', salesAccountId: '', salesAccountName: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType, GodownId: 1, costCentreId: 1,
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true, printType: invoicePrintConfig?.printType || 'Thermal',
        formType: generalSettings.formType || 'Tax Invoice',
        BatchId: '', customerName: '', CustomerAddress: '', CustomerPhone: '',
        customerVATNo: '', customerData: {},
        RefNo: "", refDate: "", orderRefNo: "", orderRefDate: "",
        creditPeriod: "", dueDate: "", deliveryDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        deliveryNoteMasterId: "", orderMasterId: "", quotationMasterId: "", proformaMasterId: "",
        AgainstNo: "", lrNo: "", transportCompany: "", vehicleNo: "",
        narration: "", taxableAmt: "", subTotal: "", totalTax: "",
        additionalCost: "", OtherChargeRemark: "", otherChargeLedgerId: "", othercharge: "",
        billDiscount: "", roundOff: "", totalAmount: "",
        AdjustmentAmount: "", AdvancePerc: "",
        RetentionLedgerId: "", RetentionType: "", RetentionDueDate: "",
        RetentionPercentage: "", RetentionAmount: "",
        paymentMode: saleSettings?.DefaultPaymentMode, CashLedgerId: financeSettings?.DefaultCashAccount || '', CashRefNo: "", CashAmount: "",
        BankLedgerId: financeSettings?.DefaultBankAccount || null, BankRefNo: "", BankAmount: 0, BillBalanceAmount: 0,
        CarMake: "", CarModel: "", Kilometer: "", NextService: "",
        VehicleInTime: "", VehicleOutTime: "",
        preinvoiceHash: "", currentinvoiceHash: "", UUID: "", isVan: false,
        Zatcastatus: "", logdata: "", qr_link: "",
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        billDiscOnProductStatus: false, AddCostonProductStatus: false,
        branchId: selectedBranchId, CreatedUser: userId,
        vatLedgerId: generalSettings?.taxLedgerId,
        salesMasterIdForGetReturnData: '',
        salesDetails: [{
            salesDetails1Id: "", deliveryNoteDetails1Id: "", orderDetails1Id: "",
            quotationDetailsId: "", proformaDetails1Id: "", SlNo: "", productCode: "",
            qty: null, freeQty: null, rate: null, unitId: null,
            discountPercentage: null, taxId: null, taxType: "",
            ConversionFactor: null, barcode: "", PurchaseRate: null,
            taxAmount: null, taxRate: 0, grossAmount: null, netAmount: null,
            productName: '', productNameArb: '', amount: null, productDescription: "",
            billDiscOnProduct: null, AddCostonProduct: null, otherchargeonproduct: null,
            salesManId: null, GodownId: null, RackId: null, branchId: selectedBranchId
        }]
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            taxType: generalSettings.taxType
        }));
    }, [generalSettings]);

    useEffect(() => {
        const defaultGodown = godowns?.find(g => g.IsDefault);
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultSalesAccount || '',
            GodownId: defaultGodown?.GodownId || '',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Thermal',
        }));
    }, [financeSettings, godowns, saleSettings, printSettings]);

    const [baseDataloading, setBaseDataloading] = useState(false)
    const [currency, setCurrencies] = useState([]);

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-sales-data', {
                    voucherType: "Sales Return", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId, ledgerTypes: ["Customer", "Customer&Supplier"],
                    ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId
                })
                const data = res?.data?.data

                setInvoiceId(data?.voucherdata?.voucherCode)
                setEmployees(data?.employees)
                setGodowns(data?.godowns)
                setPricingLevel(data?.pricinglevel)
                setBatches(data?.transactionbatch)
                setCustomers(data?.customersupplierLedgers)
                setCostCenters(data?.costcentre)
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal)
                setUpdateCustomerId(financeSettings.defaultSalesAccount || null)
                const filteredCurrencies = data?.currencywithConversion?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);

                setBank(data?.bank)
                setCash(data?.cash)
                setSalesAccount(data?.salesAccount)
                setOtherChargLedgers(data?.othercharge)
                setTaxData(data?.taxMaster)

                if (data?.salesAccount.length > 0 && !formData.salesAccountId) {
                    setFormData(prev => ({
                        ...prev,
                        salesAccountId: data?.salesAccount[0].ledgerId,
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
                    customerVATNo: data?.customeraddress?.tinNumber || '',
                    customercreditLimit: data?.customeraddress?.creditLimit || '',
                    customerCreditlimitStatus: data?.customeraddress?.creditLimitStatus || 'Ignore',
                }));
                if (editMode) {
                    getSalesById(data?.taxMaster)
                }
            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData();
        genarateSalesInvoiceId(generalSettings.taxType);
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
        navigate("/transaction/sales-return/sales-return-list");
    };

    useEffect(() => {

        setFormData(prev => ({
            ...prev,
            CashLedgerId: financeSettings?.DefaultCashAccount || cash[0]?.ledgerId,
            BankLedgerId: financeSettings?.DefaultBankAccount || bank[0]?.ledgerId,
            paymentMode: saleSettings?.DefaultPaymentMode,
        }));
    }, [financeSettings, saleSettings, cash, bank])

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
            voucherType: "Sales Return", yearId: currentFinancialYear?.yearId,
            salesMasterId: "", date: new Date(), billTime: "",
            ledgerId: financeSettings.defaultSalesAccount || '', isVan: false,
            pricingLevelId: 1, printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true, printType: invoicePrintConfig?.printType || 'Thermal',
            formType: generalSettings.formType || 'Tax Invoice',
            employeeId: '', salesAccountId: '', salesAccountName: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: generalSettings.taxType, GodownId: 1, costCentreId: 1, BatchId: '',
            customerName: '', CustomerAddress: '', CustomerPhone: '', customerVATNo: '',
            customerData: {},
            RefNo: "", refDate: "", orderRefNo: "", orderRefDate: "",
            creditPeriod: "", dueDate: "", deliveryDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            deliveryNoteMasterId: "", orderMasterId: "", quotationMasterId: "", proformaMasterId: "",
            AgainstNo: "", lrNo: "", transportCompany: "", vehicleNo: "",
            narration: "", taxableAmt: "", subTotal: "", totalTax: "",
            additionalCost: "", OtherChargeRemark: "", otherChargeLedgerId: "", othercharge: "",
            billDiscount: "", roundOff: "", totalAmount: "",
            AdjustmentAmount: "", AdvancePerc: "",
            RetentionLedgerId: "", RetentionType: "", RetentionDueDate: "",
            RetentionPercentage: "", RetentionAmount: "",
            paymentMode: "cash", CashLedgerId: financeSettings?.DefaultCashAccount || '',
            CashRefNo: "", CashAmount: 0,
            BankLedgerId: financeSettings?.DefaultBankAccount || null, BankRefNo: "", BankAmount: 0, BillBalanceAmount: 0,
            CarMake: "", CarModel: "", Kilometer: "", NextService: "",
            VehicleInTime: "", VehicleOutTime: "",
            preinvoiceHash: "", currentinvoiceHash: "", UUID: "",
            Zatcastatus: "", logdata: "", qr_link: "",
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            billDiscOnProductStatus: false, AddCostonProductStatus: false,
            branchId: selectedBranchId, CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId, reason: "",
            salesDetails: [{
                salesDetails1Id: "", deliveryNoteDetails1Id: "", orderDetails1Id: "",
                quotationDetailsId: "", proformaDetails1Id: "", SlNo: "", productCode: "",
                qty: null, freeQty: null, rate: null, unitId: null,
                discountPercentage: null, taxId: null, taxType: "",
                ConversionFactor: null, barcode: "", PurchaseRate: null,
                taxAmount: null, taxRate: 0, grossAmount: null, netAmount: null,
                amount: null, productDescription: "",
                billDiscOnProduct: null, AddCostonProduct: null, otherchargeonproduct: null,
                salesManId: null, GodownId: null, RackId: null,
                branchId: selectedBranchId, productName: '', productNameArb: '',
            }]
        });
        setResetTableKey(prev => prev + 1);
        setIsAgainst(false);
        fetchCustomerData(financeSettings?.defaultSalesAccount);
        setFormData(prev => ({
            ...prev,
            salesAccountId: salesAccount[0].ledgerId,
            salesAccountName: salesAccount[0].ledgerName
        }));
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

            if (!isSameDate || isMidnight) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time, editMode]);

    const fetchCustomerData = async (ledgerId) => {
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${ledgerId}`);

            if (response.data) {
                const data = response.data.data;
                setFormData(prev => ({
                    ...prev,
                    customerData: data
                }));

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
                    customerVATNo: data?.tinNumber || '',
                }));
            } else {
                console.error("Failed to fetch customer data");
            }
        } catch (error) {
            console.error("Error fetching customer data:", error);
        }
    };

    // useEffect(() => { if (editMode) getSalesById(); }, [editMode])

    const getSalesById = async (taxMaster) => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-sales-return-byId/${returnMasterId}`);
            const data = response.data.data;

            setExistingInvoiceNo(data.returnNo)
            setReturnMasterId(data.ReturnMasterId)

            const salesDetailsWithProducts = await Promise.all(
                (data.returnDetails || []).map(async (item) => {
                    let productName = ''; let productNameArb = ''; let availableUnits = [];
                    let productDetails = { productCode: item.productCode || '', barcode: item.barcode || '', partNo: '', brand: '', mrp: '', purchase: item.PurchaseRate || '', productDescription: item.productDescription || '', UnitName: '' };
                    const freshtaxData = taxMaster || taxData
                    const taxInfo = freshtaxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

                    if (item.productCode) {
                        try {
                            productName = item?.productname || '';
                            productNameArb = item?.productnameArb || '';
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
                        ...item, productName, productNameArb, taxRate, availableUnits, productDetails,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        descAmt,
                    };
                })
            );

            setFormData((prev) => ({
                ...prev, voucherType: "Sales Return",
                yearId: currentFinancialYear?.yearId || null,
                date: data.date ? new Date(data.date) : null, billTime: data.billTime || null,
                ledgerId: data.ledgerId || null, pricingLevelId: data.pricingLevelId || null,
                employeeId: data.employeeId || null, salesAccount: data.salesAccount || null,
                currencyConversionId: data.currencyConversionId || null, taxType: data.taxType || null,
                GodownId: data.GodownId || null, costCentreId: data.costCentreId || null,
                BatchId: data.BatchId || 'N/A', isVan: data.isVan || false,
                customerName: data.customerName || data.partyName || "",
                CustomerAddress: data.CustomerAddress || data.partyAddress || "",
                CustomerPhone: data.CustomerPhone || data.partyMobile || "",
                customerVATNo: data.customerVATNo || data.partyVatNo || "",
                RefNo: data.RefNo || data.partyRefNo || "",
                refDate: data.partyRefDate ? new Date(data.partyRefDate) : data.refDate ? new Date(data.refDate) : null,
                orderRefNo: data.orderRefNo || "", orderRefDate: data.orderRefDate ? new Date(data.orderRefDate) : null,
                creditPeriod: data.creditPeriod || null, dueDate: data.dueDate ? new Date(data.dueDate) : null,
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
                exchangeRate: data.exchangeRate || 1, exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : null,
                deliveryNoteMasterId: data.deliveryNoteMasterId || null, orderMasterId: data.orderMasterId || null,
                quotationMasterId: data.quotationMasterId || null, proformaMasterId: data.proformaMasterId || null,
                AgainstNo: data.AgainstNo || "", againstInvoiceNo: data.againstInvoiceNo || "",
                lrNo: data.lrNo || "", transportCompany: data.transportCompany || "", vehicleNo: data.vehicleNo || "",
                narration: data.narration || "", taxableAmt: data.taxableAmt || 0, subTotal: data.subTotal || 0,
                totalTax: data.totalTax || 0, additionalCost: data.additionalCost || 0,
                OtherChargeRemark: data.OtherChargeRemark || "", otherChargeLedgerId: data.otherChargeLedgerId || null,
                othercharge: data.othercharge || 0, billDiscount: data.billDiscount || 0,
                roundOff: data.roundOff || 0, totalAmount: data.totalAmount || 0,
                AdjustmentAmount: data.AdjustmentAmount || 0, AdvancePerc: data.AdvancePerc || 0,
                RetentionLedgerId: data.RetentionLedgerId || null, RetentionType: data.RetentionType || "",
                RetentionDueDate: data.RetentionDueDate ? new Date(data.RetentionDueDate) : null,
                RetentionPercentage: data.RetentionPercentage || 0, RetentionAmount: data.RetentionAmount || 0,
                paymentMode: data.paymentMode || "", CashLedgerId: data.CashLedgerId || null,
                CashRefNo: data.CashRefNo || "", CashAmount: data.CashAmount || 0,
                BankLedgerId: data.BankLedgerId || null, BankRefNo: data.BankRefNo || "",
                BankAmount: data.BankAmount || 0, BillBalanceAmount: data.BillBalanceAmount || 0,
                CarMake: data.CarMake || "", CarModel: data.CarModel || "", Kilometer: data.Kilometer || "",
                NextService: data.NextService || "", VehicleInTime: data.VehicleInTime || "",
                VehicleOutTime: data.VehicleOutTime || "",
                preinvoiceHash: data.preinvoiceHash || "", currentinvoiceHash: data.currentinvoiceHash || "",
                UUID: data.UUID || "", Zatcastatus: data.Zatcastatus || "", logdata: data.logdata || "",
                qr_link: data.qr_link || "", postedStatus: data.postedStatus ?? false,
                postedBy: data.postedBy || "", postedDate: data.postedDate ? new Date(data.postedDate) : null,
                billDiscOnProductStatus: data.billDiscOnProductStatus ?? false,
                AddCostonProductStatus: data.AddCostonProductStatus ?? false,
                branchId: data.branchId || null, CreatedUser: data.CreatedUser || "",
                vatLedgerId: data.vatLedgerId || null, reason: data.reason || null,
                billDiscountWithTax: data?.billDiscountWithTax,
                salesDetails: salesDetailsWithProducts || []
            }));

            setResetTableKey((prev) => prev + 1);
        } catch (error) { console.error("Error fetching sale data", error); }
        finally { setFetchLoading(false) }
    };

    const [loading, setLoading] = useState({ employees: false, costCenters: false, pricingLevel: false, customers: false, godowns: false, batch: false });

    const fetchEmployees = async () => { setLoading(p => ({ ...p, employees: true })); try { const { data } = await axiosInstance.get("employees"); setEmployees(data.data); } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, employees: false })); } };
    const fetchCustomer = async () => { setLoading(p => ({ ...p, customers: true })); try { const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer", "Customer&Supplier"], branchId: selectedBranchId }); setCustomers(data.data); } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, customers: false })); } };

    const genarateSalesInvoiceId = async (taxType) => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=${taxType === 'NA' ? 'Sales Return-No Tax' : 'Sales Return'}&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}&taxType=${taxType || formData.taxType}`
            );
            setInvoiceId(response.data.voucherCode);
        }
        catch (error) { console.error(error); }
        finally { setVoucherNumberGenarating(false) }
    }

    const validateFormData = () => {
        const errors = [];
        if (!formData.ledgerId) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select invoice date');
        if (!formData.salesDetails || formData.salesDetails.length === 0) errors.push('Please add at least one product');
        const hasValidProducts = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const fetchInvoiceDataForReturn = async (invoiceId, type) => {
        if (!invoiceId) return;

        setFetchLoading(true);
        try {
            let res;
            if (type === "MasterId") {
                res = await axiosInstance.get(`get-sales-data-forreturn-byId/${invoiceId}`);
            } else {
                res = await axiosInstance.get(`sales-data-toreturn-byinvoiceno/${invoiceId}`);
            }

            const data = res.data.data;


            const salesDetailsWithProducts = await Promise.all(
                (data.salesDetailData || []).map(async (item) => {
                    let productName = ''; let availableUnits = [];
                    let productDetails = { productCode: item.productCode || '', barcode: item.barcode || '', partNo: '', brand: '', mrp: '', purchase: item.PurchaseRate || '', productDescription: item.productDescription || '', UnitName: '' };
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
                        ...item, productName, taxRate, availableUnits, productDetails,
                        qty: parseFloat(item.balanceQty) || parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        unitId: item.unitId,
                        unitName: productDetails.UnitName || item.unitName || item.UnitName || '',
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        descAmt,
                    };
                })
            );
            setFormData((prev) => ({ ...prev, voucherType: "Sales Return", againstInvoiceNo: invoiceId, salesMasterId: data.salesMasterId, yearId: currentFinancialYear?.yearId, date: new Date(), billTime: data.billTime, ledgerId: data.ledgerId, pricingLevelId: data.pricingLevelId, employeeId: data.employeeId, salesAccount: data.salesAccount, currencyConversionId: data.currencyConversionId, taxType: data.taxType, GodownId: data.GodownId, costCentreId: data.costCentreId, BatchId: data.BatchId, customerName: data.customerName, CustomerAddress: data.CustomerAddress, CustomerPhone: data.CustomerPhone, customerVATNo: data.customerVATNo, RefNo: data.RefNo, refDate: data.refDate ? new Date(data.refDate) : "", orderRefNo: data.orderRefNo, orderRefDate: data.orderRefDate ? new Date(data.orderRefDate) : "", creditPeriod: data.creditPeriod, dueDate: data.dueDate ? new Date(data.dueDate) : "", deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : "", exchangeRate: data.exchangeRate, exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "", deliveryNoteMasterId: data.deliveryNoteMasterId, orderMasterId: data.orderMasterId, quotationMasterId: data.quotationMasterId, proformaMasterId: data.proformaMasterId, AgainstNo: data.AgainstNo, lrNo: data.lrNo, transportCompany: data.transportCompany, vehicleNo: data.vehicleNo, narration: data.narration, taxableAmt: data.taxableAmt, subTotal: data.subTotal, totalTax: data.totalTax, additionalCost: data.additionalCost, OtherChargeRemark: data.OtherChargeRemark, otherChargeLedgerId: data.otherChargeLedgerId, othercharge: data.othercharge, billDiscount: data.billDiscount, roundOff: data.roundOff, totalAmount: data.totalAmount, AdjustmentAmount: data.AdjustmentAmount, AdvancePerc: data.AdvancePerc, RetentionLedgerId: data.RetentionLedgerId, RetentionType: data.RetentionType, RetentionDueDate: data.RetentionDueDate ? new Date(data.RetentionDueDate) : "", RetentionPercentage: data.RetentionPercentage, RetentionAmount: data.RetentionAmount, paymentMode: data.paymentMode, CashLedgerId: data.CashLedgerId, CashRefNo: data.CashRefNo, CashAmount: data.CashAmount, BankLedgerId: data.BankLedgerId, BankRefNo: data.BankRefNo, BankAmount: data.BankAmount, BillBalanceAmount: data.BillBalanceAmount, CarMake: data.CarMake, CarModel: data.CarModel, Kilometer: data.Kilometer, NextService: data.NextService, VehicleInTime: data.VehicleInTime, VehicleOutTime: data.VehicleOutTime, preinvoiceHash: data.preinvoiceHash, currentinvoiceHash: data.currentinvoiceHash, UUID: data.UUID, Zatcastatus: data.Zatcastatus, logdata: data.logdata, qr_link: data.qr_link, billDiscOnProductStatus: data.billDiscOnProductStatus, AddCostonProductStatus: data.AddCostonProductStatus, branchId: data.branchId, vatLedgerId: data.vatLedgerId, reason: data.reason, billDiscountWithTax: data?.billDiscountWithTax, salesDetails: salesDetailsWithProducts }));
            setResetTableKey((prev) => prev + 1);
            setIsAgainst(true);
            fetchCustomerData(data.ledgerId)
            setAlert({ id: Date.now(), type: "success", message: `Invoice ${data.invoiceNo} loaded successfully for return` });
        } catch (error) {
            console.error('Error fetching invoice data for return:', error);
            if (error.response?.status === 404) { setAlert({ id: Date.now(), type: "error", message: "Sales Invoice not found." }); setIsAgainst(false); }
            else { setAlert({ id: Date.now(), type: "error", message: error.response?.data?.message || "Error loading invoice data." }); }
        } finally { setFetchLoading(false); }
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    // ===== HOLD INVOICE LOGIC =====
    // Load held invoices from localStorage on mount (branch-scoped)
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesReturnInvoices');
        if (savedHeldInvoices) {
            const allHeldInvoices = JSON.parse(savedHeldInvoices);
            const branchHeldInvoices = allHeldInvoices.filter(invoice => invoice.branchId === selectedBranchId);
            const deduped = Array.from(
                new Map(branchHeldInvoices.map(inv => [inv.id, inv])).values()
            );
            setHeldInvoices(deduped);
        }
    }, [selectedBranchId]);

    // Persist held invoices to localStorage whenever they change (branch-scoped)
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesReturnInvoices');
        const allHeldInvoices = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
        const otherBranchInvoices = allHeldInvoices.filter(invoice => invoice.branchId !== selectedBranchId);

        const dedupedHeldInvoices = Array.from(
            new Map(heldInvoices.map(inv => [inv.id, inv])).values()
        );

        const updatedAllInvoices = [...otherBranchInvoices, ...dedupedHeldInvoices];
        if (updatedAllInvoices.length > 0) {
            localStorage.setItem('heldSalesReturnInvoices', JSON.stringify(updatedAllInvoices));
        } else {
            localStorage.removeItem('heldSalesReturnInvoices');
        }
    }, [heldInvoices, selectedBranchId]);

    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);
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
            itemCount: formData.salesDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            isAgainst: isAgainst,
            formData: { ...formData }
        };
        setHeldInvoices(prev => {
            if (prev.some(inv => inv.id === heldInvoice.id)) return prev;
            return [...prev, heldInvoice];
        });
        showToast.success(`Return held successfully. Total held returns: ${heldInvoices.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId, isAgainst]);

    // Ctrl+H keyboard shortcut to hold invoice (only in add mode)
    useEffect(() => {
        if (editMode) return;
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                holdCurrentInvoice();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentInvoice, editMode]);

    const restoreHeldInvoice = (heldInvoice) => {
        const hasValidProducts = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);
        if (hasValidProducts) {
            // Current form has data — hold it before restoring
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                customerName: formData.customerName || 'Current Return',
                customerAddress: formData.CustomerAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.salesDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId,
                isAgainst: isAgainst,
                formData: { ...formData }
            };
            setHeldInvoices(prev => [...prev.filter(inv => inv.id !== heldInvoice.id), currentHeld]);
        } else {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== heldInvoice.id));
        }
        setFormData({
            ...heldInvoice.formData,
            date: new Date(),
            billTime: time,
        });
        setInvoiceId(heldInvoice.invoiceId);
        setIsAgainst(heldInvoice.isAgainst || false);
        setResetTableKey(prev => prev + 1);
        setShowHeldInvoices(false);
        setRestoredHeldInvoiceId(heldInvoice.id);
        showToast.success("Return restored successfully");
    };

    const deleteHeldInvoice = (invoiceId) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        showToast.success("Held return deleted");
    };

    // Held Invoices Panel Component
    const HeldInvoicesPanel = () => {
        if (!showHeldInvoices || heldInvoices.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Returns ({heldInvoices.length})
                    </h3>
                    <button
                        onClick={() => setShowHeldInvoices(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${invoice.errorHeld
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    {invoice.errorHeld && (
                                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded mb-1 inline-block">
                                            Error Held
                                        </span>
                                    )}
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{invoice.customerName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Return: {invoice.invoiceId}</p>
                                    {invoice.isAgainst && (
                                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Against Invoice</p>
                                    )}
                                    {invoice.customerAddress && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{invoice.customerAddress}</p>
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

    const fetchInvoiceDataForPrint = useCallback(async () => {
        const response = await axiosInstance.get(`get-sales-return-byId/${returnMasterId}`);
        const data = response.data.data;

        const resolvedTaxData = taxData;

        const salesDetailsWithProducts = (data.returnDetails || []).map((item) => {
            const taxInfo = resolvedTaxData?.find(t => t.taxId === item?.taxId);
            const taxRate = taxInfo ? parseFloat(taxInfo?.rate) : 0;

            return {
                ...item,
                productName: item?.productname || '',
                productNameArb: item?.productnameArb || '',
                unitName: item?.unitName || item?.UnitName || '',
                taxRate,
                qty: parseFloat(item.qty) || 0,
                freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                rate: parseFloat(item.rate) || 0,
                inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                discountPercentage: parseFloat(item.discountPercentage) || 0,
                PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                taxAmount: parseFloat(item.taxAmount) || 0,
                grossAmount: parseFloat(item.grossAmount) || 0,
                netAmount: parseFloat(item.netAmount) || 0,
                amount: parseFloat(item.amount) || 0,
            };
        });

        return {
            ...data,
            date: data.date ? new Date(data.date) : formData.date,
            salesDetails: salesDetailsWithProducts,
        };
    }, [returnMasterId, taxData, formData.date]);
    const { salesProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products);

    // ===== PRINT HELPERS =====
    const buildInvoiceDataForPrint = useCallback((invoiceNumber, qrLink, overrideData) => {
        const base = overrideData || formData;

        const rawDetails = base.salesDetails || [];

        // ✅ Enrich with productName / productNameArb from allProducts by matching productCode
        const enrichedDetails = rawDetails.map((detail, idx) => {
            const matchedProduct = allProducts?.find(
                (p) => p.productCode === detail.productCode
            );

            return {
                ...detail,
                productName: detail.productName || matchedProduct?.productName || '',
                productNameArb: detail.productNameArb || matchedProduct?.productNameArb || '',
                unitName: detail.unitName || formData.salesDetails?.[idx]?.unitName || detail.UnitName || matchedProduct?.unitName || '',
            };
        });
        const mergedCustomerData = {
            ...(formData.customerData || {}),
            ...(base.customerData || {}),
        };

        return {
            ...base,
            invoiceNo: base?.returnNo || invoiceNumber,
            date: base.date,
            salesDetails: enrichedDetails,
            qr_link: qrLink || base.qr_link,
            customerData: mergedCustomerData,
        };
    }, [formData]);

    const printToPrinterFn = useCallback((invoiceDataForPrint, qrLink) => {
        if (formData.printType === 'Type 1') {
            SalesReturnInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'Thermal') {
            salesReturnThermalPrintOne(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'Thermal2') {
            salesReturnThermalPrintTwo(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'Type 2') {
            salesReturnInvoicePrintTwo(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'Type 3') {
            salesReturnInvoicePrintThree(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'Type 4') {
            salesReturnInvoicePrintFour(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else if (formData.printType === 'LS') {
            LogismartInvoicereturnPrint(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        } else {
            SalesReturnInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, time, currentCurrency, qrLink);
        }
    }, [formData.printType, selectedBranchDetails, time]);

    // ===== SAVE =====
    // ===== SAVE HANDLER WITH AUTO-HOLD ON ERROR =====
    const handleSave = useCallback(async () => {
        if (formData.formType === 'Tax Invoice' && generalSettings.zatcaType === 'Phase 2') {
            const requiredFields = ['ledgerName', 'tinNumber', 'BuildingNo', 'StreetName', 'District', 'CityName', 'Country', 'PostboxNo', 'AdditionalNo', 'cstNumber'];
            const customerData = formData.customerData || {};
            if (requiredFields.some(field => !customerData[field])) {
                Swal.fire({ icon: 'warning', title: 'Party Details Required', text: 'Cannot save Tax Invoice without filling party details.', confirmButtonText: 'OK' });
                return;
            }
        }
        if (!validateForm(formData, validationRules)) return;

        if (formData.totalAmount <= 0) {
            showToast.error(t("purchaseInvoice.form.messages.totalAmountError"));
            return;
        }

        let hasGaps = false;
        let lastFilledIndex = -1;
        const rowValidationErrors = [];

        formData.salesDetails.forEach((row, index) => {
            const isRowFilled = row.productCode && row.productCode.trim() !== '';
            const hasAnyData = row.productName?.trim() !== '' || row.barcode?.trim() !== '' || row.qty > 0 || row.rate > 0;

            if (isRowFilled) {
                if (lastFilledIndex !== -1 && index - lastFilledIndex > 1) hasGaps = true;
                lastFilledIndex = index;
                const missingFields = [];
                if (!row.productName || row.productName.trim() === '') missingFields.push('Product Name');
                if (!row.qty || row.qty <= 0) missingFields.push('Quantity');
                if (row.rate === undefined || row.rate < 0) missingFields.push('Sales Rate');
                if (!row.unitId) missingFields.push('Unit');
                if (missingFields.length > 0) rowValidationErrors.push({ row: index + 1, message: `Missing: ${missingFields.join(', ')}` });
            } else if (lastFilledIndex !== -1 && index < formData.salesDetails.length - 1) {
                if (formData.salesDetails.slice(index + 1).some(r => r.productCode && r.productCode.trim() !== '')) {
                    hasGaps = true;
                    rowValidationErrors.push({ row: index + 1, message: 'Row skipped' });
                }
            } else if (!isRowFilled && hasAnyData && index < formData.salesDetails.length - 1) {
                rowValidationErrors.push({ row: index + 1, message: 'Incomplete data' });
            }
        });

        if (hasGaps || rowValidationErrors.length > 0) {
            setAlert({ id: Date.now(), type: "error", message: rowValidationErrors.map(err => `Row ${err.row}: ${err.message}`).join('\n') || "Cannot skip rows!" });
            return;
        }

        if (formData.BillBalanceAmount < 0) {
            showToast.error(t("salesInvoice.alert.billBalanceAmtError"));
            return;
        }

        if (!formData.paymentMode || formData.paymentMode === 'null' || formData.paymentMode === 'NA') {
            showToast.error("Please select a valid payment mode (Cash, Bank, or Credit).");
            return;
        }

        if (formData.paymentMode === 'cash' && (!(formData.CashAmount) || parseFloat(formData.CashAmount) <= 0)) {
            showToast.error(t("salesInvoice.alert.cashAmountRequired") || "Cash amount must be greater than 0 for Cash payment mode.");
            return;
        }

        if (formData.paymentMode === 'card' && (!(formData.BankAmount) || parseFloat(formData.BankAmount) <= 0)) {
            showToast.error(t("salesInvoice.alert.bankAmountRequired") || "Bank/Card amount must be greater than 0 for Card payment mode.");
            return;
        }

        if (formData.paymentMode === 'credit' && (!(formData.BillBalanceAmount) || parseFloat(formData.BillBalanceAmount) <= 0)) {
            showToast.error(t("salesInvoice.alert.creditPaymentModeError"));
            return;
        }

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            setAlert({ id: Date.now(), type: "error", message: validationErrors.join('\n') });
            return;
        }

        // Cash ledger validation
        if (generalSettings?.negativeCashTransaction !== 'Allow') {
            setIsSaving(true);

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
                            setIsSaving(false);
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
                            setIsSaving(false);
                            if (!result.isConfirmed) return;
                        }
                    }
                } catch (error) {
                    console.error('Error checking cash ledger balance:', error);
                }
            }
        }

        // Confirmation dialogs
        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t('ConfirmUpdateTitle'),
                text: t('ConfirmUpdateText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesUpdate'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
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
            const qrCodeBase64 = generateQRCodeData(formData, selectedBranchDetails?.branchName || '', selectedBranchDetails?.taxNo || '', time);
            const qrCodeUrl = qrCodeBase64;

            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                billTime: time,
                partyName: formData.customerName,
                partyAddress: formData.CustomerAddress,
                partyMobile: formData.CustomerPhone,
                partyVatNo: formData.customerVATNo,
                partyRefNo: formData.RefNo,
                partyRefDate: formData.refDate,
                vatLedgerId: generalSettings?.taxLedgerId,
                // cashLedgerId:
                qr_link: qrCodeUrl
            };

            const api = editMode ? `update-sales-return/${returnMasterId}` : 'save-sales-return';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                const zatcaPhaceOneQrLink = response.data.data.qr_link;

                const zatcaPayload = {
                    MasterId: response.data.returnMasterId || '',
                    VoucherNo: response.data.voucherNo || invoiceId,
                    VoucherType: "Sales Return",
                    BillDate: (() => {
                        const now = new Date();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const seconds = String(now.getSeconds()).padStart(2, '0');
                        const timeWithSeconds = `${hours}:${minutes}:${seconds}`;
                        const dateStr = formData.date instanceof Date
                            ? formData.date.toISOString().split('T')[0]
                            : String(formData.date).split('T')[0];
                        return `${dateStr} ${timeWithSeconds}`;
                    })(),
                    SchemeID: "CRN",
                    SchemeIDNo: selectedBranchDetails.crNo,
                    BuildingNo: selectedBranchDetails.buildingNo,
                    CityName: selectedBranchDetails.cityName,
                    CitySubDivisionName: selectedBranchDetails.district,
                    TaxCode: selectedBranchDetails.taxNo,
                    CountrySubentity: "SA",
                    PlotIdentification: "",
                    CompanyPostalZone: selectedBranchDetails.postalCode,
                    PartyRegistrationName: selectedBranchDetails.branchName,
                    StreetName: selectedBranchDetails.streetName,
                    DistrictName: selectedBranchDetails.district,
                    BuyerDistrict: formData.customerData.District,
                    BuyerCityName: formData.customerData.CityName,
                    BuyerStreetName: formData.customerData.StreetName,
                    BuyerBuildingN: formData.customerData.BuildingNo,
                    BuyerCitySubDivisionName: formData.customerData.District,
                    BuyerCountryCode: "SA",
                    BuyerPlotIdentification: "",
                    BuyerPostalZone: formData.customerData.PostboxNo,
                    BuyerContactName: formData.customerData.District,
                    BuyerSchemeID: formData.formType === 'Tax Invoice' ? 'CRN' : "OTH",
                    BuyerSchemIDNo: formData.customerData.cstNumber,
                    BuyerTaxCode: formData.customerData.tinNumber,
                    PaymentMeansCode: formData.paymentMode === 'cash' ? '10' : formData.paymentMode === 'bank' ? '42' : '30',
                    BillType: formData.formType,
                    ReasonForReturn: "",
                    LF: "",
                    CERTIFICATE_CONTENT: zatcaSettings.binarytoken,
                    PRIVATE_KEY: zatcaSettings.privatekey,
                    PRODUCTION_SECRET: zatcaSettings.productionsecret,
                    PROFUCTION_BINARY_TOKEN: zatcaSettings.profectionbinarytoken,
                    PUBLIC_KEY: zatcaSettings.publickey,
                    AUTH_BINARYSECURITYTOKEN_PCSID: zatcaSettings.auth_binarysecuritytoken_pcsid,
                    PreviousHash: response.data.data.prevInvoiceHash,
                    InvoiceItems: formData.salesDetails
                        .filter(item => item.productCode && item.qty > 0)
                        .map(item => ({
                            ItemName: item.productName || "",
                            Qty: item.qty,
                            Amount: parseFloat(item.amount),
                            Discount: 0,
                            TaxAmt: parseFloat(item.taxAmount) || 0.0,
                            CurrencyConversionRate: currentCurrencyConversion.rate
                        }))
                };

                let zatcaPhaceTwoQrLink;

                if (generalSettings.zatcaType === 'Phase 2') {
                    const zatcaResponse = await axios.post('https://api.finacerp.com/api/Invoice/Submit', zatcaPayload);

                    zatcaPhaceTwoQrLink = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(zatcaResponse.data.QrCodeBase64)}`;

                    if (zatcaResponse.data.Success) {
                        await axiosInstance.post('update-zatca-fields', {
                            VoucherType: "Sales Return",
                            ReturnMasterId: response.data.data.ReturnMasterId,
                            PreInvoiceHash: response.data.data.prevInvoiceHash,
                            CurrentInvoiceHash: zatcaResponse.data.InvoiceHash,
                            UUID: zatcaResponse.data.UUID,
                            ZatcaStatus: zatcaResponse.data.status,
                            LogData: zatcaResponse.data.logData,
                            Qrlink: zatcaResponse.data.QrCodeBase64,
                            UploadedInvoice: zatcaResponse.data.ZatcaJson,
                            ZatcaSignedXml: zatcaResponse.data.SignedXml
                        });
                    } else {
                        showToast.error('ZATCA submission failed');
                    }
                }

                showToast.success(t("saveSuccess"));

                const invoiceQr = generalSettings.zatcaType === 'Phase 2' ? zatcaPhaceTwoQrLink : zatcaPhaceOneQrLink;
                const freshReturnData = response?.data?.data?.payload?.salesReturnMaster;
                const savedReturnNo = freshReturnData?.returnNo;
                const invoiceDataForPrint = buildInvoiceDataForPrint(savedReturnNo, invoiceQr, freshReturnData);
                setIsSaving(false);

                // Clean up held invoice if this was a restored one
                if (restoredHeldInvoiceId) {
                    setHeldInvoices(prev => prev.filter(inv => inv.id !== restoredHeldInvoiceId));
                    setRestoredHeldInvoiceId(null);
                }

                // PRINT LOGIC
                if (formData.printAfterSave) {
                    printToPrinterFn(invoiceDataForPrint, invoiceQr);
                } else {
                    const pdfResult = await Swal.fire({
                        title: t('Print as PDF') || 'Print as PDF?',
                        text: t('Do you want to download this invoice as a PDF?') || 'Do you want to download this credit note as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            printToPrinterFn(invoiceDataForPrint, invoiceQr);
                        }, 500);
                    }
                }

                if (!editMode) {
                    genarateSalesInvoiceId();
                    clearForm(true);
                }

                if (saleSettings.CloseAfterSave) {
                    navigate('/transaction/sales-return/sales-return-list');
                }
            }
        } catch (error) {
            console.error('Error saving sales return:', error);

            // ✅ AUTO-HOLD RETURN ON ERROR
            const hasValidData = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);

            if (hasValidData) {
                const heldInvoice = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    invoiceId: invoiceId,
                    customerName: formData.customerName || 'Unknown Customer',
                    customerAddress: formData.CustomerAddress || '',
                    totalAmount: formData.totalAmount || 0,
                    itemCount: formData.salesDetails.filter(d => d.productCode).length,
                    branchId: selectedBranchId,
                    isAgainst: isAgainst,
                    formData: { ...formData },
                    errorHeld: true // Mark as error-held
                };

                setHeldInvoices(prev => [...prev, heldInvoice]);

                showToast.warning(
                    `Save failed. Return has been automatically held. Total held returns: ${heldInvoices.length + 1}`
                );
            }

            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                html: `
                    <div class="text-left">
                        <p class="mb-2">${error.response?.data?.message || t("saveError") || "Error saving sales return"}</p>
                        ${hasValidData ? '<p class="text-sm text-blue-600">Your return data has been automatically held and can be restored later.</p>' : ''}
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
        time,
        saleSettings,
        generalSettings,
        editMode,
        invoiceId,
        restoredHeldInvoiceId,
        buildInvoiceDataForPrint,
        printToPrinterFn,
        selectedBranchId,
        isAgainst,
        heldInvoices.length,
        t
    ]);

    // ===== EDIT MODE PRINT HANDLERS =====
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
            const freshData = await fetchInvoiceDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData.qr_link, freshData);
            printToPrinterFn(invoiceDataForPrint, freshData.qr_link);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching return for reprint:', error);
            showToast.error('Failed to fetch return data for printing');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, fetchInvoiceDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn, isElectron]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const freshData = await fetchInvoiceDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData.qr_link, freshData);
            // Sales Return currently routes PDF through the same print function as invoice's printToPdfFn;
            // if you add a dedicated PDF handler later, swap this call for that.
            printToPrinterFn(invoiceDataForPrint, freshData.qr_link);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching return for PDF reprint:', error);
            showToast.error('Failed to fetch return data for PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [fetchInvoiceDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn, isElectron]);

    // Ctrl+S keyboard shortcut
    const ctrlSPressed = useRef(false);

    useEffect(() => {
        if (editMode) return;

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();

                if (ctrlSPressed.current) return;

                ctrlSPressed.current = true;
                handleSave();
            }
        };

        const handleKeyUp = (e) => {
            if (e.key.toLowerCase() === "s") {
                ctrlSPressed.current = false;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleSave, editMode]);

    const salesReturnShortcuts = [
        {
            heading: 'General',
            items: [
                { keys: ['Ctrl', 'S'], description: 'Save / update sales return' },
                { keys: ['Ctrl', 'H'], description: 'Hold current sales return' },
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

    const salesReturnManual = [
        {
            heading: 'Creating a New Sales Return',
            steps: [
                'Select the customer and review the return header details before adding products.',
                'Add return items from the grid by entering the product name or scanning a barcode.',
                'Set quantity and rate, then review the totals before saving the return.',
                'Press Ctrl+S to save or update the sales return.',
            ],
        },
        {
            heading: 'Holding & Restoring Returns',
            steps: [
                'Press Ctrl+H or click Hold to temporarily save the current return and start a new one.',
                'Use Restore to view held returns and bring one back into the form.',
            ],
        },
        {
            heading: 'Printing & Sharing',
            steps: [
                'Choose the preferred print layout from the Print Type dropdown before printing or saving as PDF.',
                'Use the Print dropdown in edit mode to reprint or download a PDF for the sales return.',
            ],
        },
    ];

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesReturn.breadcrumb.master"), url: "#" },
                        { title: editMode ? t("salesReturn.breadcrumb.editTitle") : t("salesReturn.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("salesReturn.breadcrumb.editTitle") : t("salesReturn.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        )
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

            {/* ===== HELD INVOICES PANEL ===== */}
            <HeldInvoicesPanel />

            <BreadCrumb
                routes={[
                    { title: t("salesReturn.breadcrumb.master"), url: "#" },
                    { title: editMode ? t("salesReturn.breadcrumb.editTitle") : t("salesReturn.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("salesReturn.breadcrumb.editTitle") : t("salesReturn.breadcrumb.title") }}
                actions={[
                    {
                        label: t("listBtn"),
                        title: t("listBtnTitle"),
                        icon: Table,
                        type: "secondary",
                        onClick: handleListNavigate,
                    },
                    // Hold button — only in add mode
                    !editMode && {
                        label: `Hold${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
                        icon: Archive,
                        type: "secondary",
                        onClick: holdCurrentInvoice,
                        title: "Hold the current return (CTRL + H)",
                    },
                    // Restore button — only when there are held invoices in add mode
                    heldInvoices.length > 0 && !editMode && {
                        label: "Restore",
                        icon: ArchiveRestore,
                        type: "tertiary",
                        title: "View and restore held returns",
                        onClick: () => setShowHeldInvoices(!showHeldInvoices),
                    },
                    !editMode && {
                        label: t("clearBtn"),
                        icon: Eraser,
                        type: "secondary",
                        onClick: clearForm,
                    },
                    !editMode && {
                        label: editMode ? t("updateBtn") : t("submitBtn"),
                        icon: isSaving ? Loader2 : editMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText")
                    },
                ].filter(Boolean)}
                customActions={
                    <div className="flex items-center gap-3">
                        {!editMode && (
                            <>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="printAfterSaveTopInvoice"
                                        checked={formData.printAfterSave || false}
                                        onCheckedChange={(value) =>
                                            setFormData(prev => ({ ...prev, printAfterSave: value }))
                                        }
                                    />
                                    <label
                                        htmlFor="printAfterSaveTopInvoice"
                                        className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                    >
                                        {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                                    </label>
                                </div>
                            </>
                        )}
                        {invoiceTypes.length > 0 && (
                            <select
                                name="printType"
                                id="printType"
                                className='border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none'
                                value={formData.printType}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, printType: e.target.value }));
                                }}
                            >
                                {invoiceTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        )}
                        {editMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                    </div>
                }
                onHelpClick={() => setHelpOpen(true)}
            />

            <FormSectionMain
                validationRules={validationRules} handleBlur={handleBlur} setErrors={setErrors} errors={errors}
                loading={loading} isAgainst={isAgainst} fetchInvoiceDataForReturn={fetchInvoiceDataForReturn}
                existingInvoiceNo={existingInvoiceNo} ReturnMasterId={ReturnMasterId}
                editMode={editMode} key={resetTableKey} time={time} invoiceId={invoiceId}
                setFormData={setFormData} formData={formData} employees={employees}
                costCenters={costCenters} customers={customers} pricingLevel={pricingLevel}
                godowns={godowns} fetchEmployees={fetchEmployees} fetchCustomer={fetchCustomer}
                rows={formData?.salesDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, salesDetails: updatedRows }))}
                batches={batches}
                currentledgerBalance={currentledgerBalance}
                salesAccount={salesAccount}
                bank={bank}
                cash={cash}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                otherChargeLedgers={otherChargeLedgers}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                currency={currency}
                genarateSalesInvoiceId={genarateSalesInvoiceId}
                updateCustomerId={updateCustomerId}
                setUpdateCustomerId={setUpdateCustomerId}
            />
            <HelpShortcuts
                title="Sales Return Help"
                groups={salesReturnShortcuts}
                manual={salesReturnManual}
                buttonPosition="bottom-6 right-22"
                showFloatingButton={false}
                open={helpOpen}
                onOpenChange={setHelpOpen}
            />
        </div>
    )
}

export default SalesReturnSkin