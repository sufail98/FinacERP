import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, Loader2, Pencil, ReceiptText, SaveAll, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import printInvoiceOne, { generateInvoiceOneHTML, generateQRCodeData, saveInvoiceAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintOne';
import printInvoiceFifteen, { generateInvoiceFifteenHTML, saveInvoiceFifteenAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintFifteen';
import printInvoiceTwelve, { saveInvoiceTwelveAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintTwelve';
import printInvoiceMTC, { saveInvoiceMTCAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintMTC';
import printInvoiceThirteen, { saveInvoiceThirteenAsPDF } from '@/utils/prints/salesInvoicePrints/invoicePrintThirteen';
import InvoicePrintEight, { saveInvoiceEightAsPDF } from '@/utils/prints/salesInvoicePrints/withoutQrCodePrints/InvoicePrintEight';
import InvoicePrintNine, { saveInvoiceNineAsPDF } from '@/utils/prints/salesInvoicePrints/withoutQrCodePrints/InvoicePrintNine';
import InvoicePrintTen, { saveInvoiceTenAsPDF } from '@/utils/prints/salesInvoicePrints/withoutQrCodePrints/InvoicePrintTen';
import InvoicePrintEleven, { saveInvoiceElevenAsPDF } from '@/utils/prints/salesInvoicePrints/withoutQrCodePrints/InvoicePrintEleven';
import printInvoiceForteen, { generateInvoiceFourteenHTML, saveInvoiceForteenAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintForteen';
import printThermalInvoice, { saveInvoiceThermalAsPDF } from '@/utils/prints/salesInvoicePrints/thermal/printThermalInvoiceOne';
import printThermalTwoInvoice, { saveInvoiceThermalTwoAsPDF } from '@/utils/prints/salesInvoicePrints/thermal/PrintInvoiceThermalTwo';
import { formatDateWithTime, parseDateFromAPI, } from '@/lib/dateFormat';
import printInvoiceTwo, { saveInvoiceTwoAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintTwo';
import printInvoiceThree, { saveInvoiceThreeAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintThree';
import printInvoiceFive, { saveInvoiceFiveAsPDF } from '@/utils/prints/salesInvoicePrints/Invoiceprintfive';
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import axios from 'axios';
import { showToast } from '@/utils/toast';
import PopupPreloader from '@/components/common/PopupPreloader';
import printInvoiceFour, { saveInvoiceFourAsPDF } from '@/utils/prints/salesInvoicePrints/InvoicePrintFour';
import { formatInvoiceMessageWithLink, generateInvoicePDFLink, sendWhatsAppMessage, uploadInvoicePDFAndGetLink } from '@/utils/whatsappService';
import { generateInvoicePdfBlob } from '@/utils/pdfBlobService';
import printInvoiceSix, {
    generateInvoiceHTML,
    saveInvoiceSixAsPDF,
} from '@/utils/prints/salesInvoicePrints/invoicePrintSix';
import printInvoiceSeven, { saveInvoiceSevenAsPDF } from '@/utils/prints/salesInvoicePrints/invoicePrintSeven';
import { isElectron } from '@/utils/electronPrint';
import HelpShortcuts from '@/components/common/HelpShortcuts';


const SalesInvoiceSkin = () => {
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const { salesMasterId } = useParams();
    const editMode = Boolean(salesMasterId);
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
    const [invoiceId, setInvoiceId] = useState('');
    const [currency, setCurrnecies] = useState([])
    const { selectedBranchDetails, userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [isPrinting, setIsPrinting] = useState(false);
    const location = useLocation();
    const [updateCustomerId, setUpdateCustomerId] = useState(null);
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings, zatcaSettings, printSettings } = useSelector((state) => state.settings);
    console.log(saleSettings);
    
    const decimalPart = generalSettings?.decimalPart ?? 2;
    const invoiceTypes = Object.keys(printSettings?.["Sales Invoice"]?.types || {});
    const invoicePrintConfig = printSettings?.["Sales Invoice"]?.default || Object.values(printSettings?.["Sales Invoice"]?.types || {})[0];
    const [resetTableKey, setResetTableKey] = useState(0);
    const [isEditMode, setIsEditMode] = useState(Boolean(salesMasterId));
    const [canEdit, setCanEdit] = useState(!Boolean(salesMasterId));
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);
    const [ledgerBalance, setLedgerBalance] = useState(null)
    const [cash, setCash] = useState([])
    const [bank, setBank] = useState([])
    const [salesAccount, setSalesAccount] = useState([]);
    const [otherChargeLedgers, setOtherChargLedgers] = useState([])
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('')
    const [shippingAdderess, setShippingAddress] = useState(null);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [quotationData, setQuotationData] = useState([]);
    const [profoemaData, setProformadata] = useState([]);
    const [salesOrderData, setSalesOrderData] = useState([]);
    const [deliveryNoteData, setDeliveryNoteData] = useState([]);
    const [taxData, setTaxData] = useState([]);
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [bankDetails, setBankDetails] = useState({});
    const [helpOpen, setHelpOpen] = useState(false);

    const [searchParams] = useSearchParams();

    // Check if running in Electron

    // ===== RESTORE FILTERS FROM URL =====
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

    const [formData, setFormData] = useState({
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'Thermal',
        formType: generalSettings.formType || 'Tax Invoice',
        customerData: {},
        voucherType: "Sales Invoice",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        billTime: time,
        ledgerId: '',
        ledgerBalance: '',
        pricingLevelId: 1,
        employeeId: '',
        salesAccount: '',
        salesAccountName: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: generalSettings.taxType,
        GodownId: null,
        costCentreId: 1,
        BatchId: '',
        customerName: '',
        CustomerAddress: '',
        CustomerPhone: '',
        customerVATNo: '',
        customercreditLimit: '',
        customerCreditlimitStatus: '',
        RefNo: "", refDate: "", orderRefNo: "", orderRefDate: "",
        creditPeriod: "", dueDate: "", deliveryDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        deliveryNoteMasterId: "", orderMasterId: "", quotationMasterId: "", proformaMasterId: "",
        AgainstNo: "NA", lrNo: "", transportCompany: "", vehicleNo: "",
        narration: "", taxableAmt: "", subTotal: "", totalTax: "",
        additionalCost: "", OtherChargeRemark: "", otherChargeLedgerId: "", othercharge: "",
        billDiscount: "", billDiscountWithTax: "", roundOff: "", totalAmount: "",
        AdjustmentAmount: "", AdvancePerc: "",
        RetentionLedgerId: "", RetentionType: "", RetentionDueDate: "",
        RetentionPercentage: "", RetentionAmount: "",
        paymentMode: saleSettings?.DefaultPaymentMode,
        CashLedgerId: financeSettings?.DefaultCashAccount || '', CashRefNo: "", CashAmount: "",
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
        vatLedgerId: generalSettings?.taxLedgerId,
        salesDetails: [{
            deliveryNoteDetails1Id: "",
            orderDetails1Id: "",
            quotationDetailsId: "",
            proformaDetails1Id: "",
            SlNo: "",
            productCode: "",
            qty: null,
            freeQty: null,
            inclusiveRate: null,
            lineDiscountWithTax: null,
            rate: null,
            unitId: null,
            discountPercentage: null,
            taxId: null,
            taxType: "",
            ConversionFactor: null,
            barcode: "",
            PurchaseRate: null,
            taxAmount: 0,
            grossAmount: null,
            netAmount: null,
            amount: null,
            taxRate: 0,
            productDescription: "",
            billDiscOnProduct: null,
            AddCostonProduct: null,
            otherchargeonproduct: null,
            salesManId: null,
            GodownId: null,
            RackId: null,
            branchId: selectedBranchId,
            productName: '',
            productNameArb: '',
            baseunitId: null,
        }]
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            CashLedgerId: financeSettings?.DefaultCashAccount || cash[0]?.ledgerId,
            BankLedgerId: financeSettings?.DefaultBankAccount || bank[0]?.ledgerId,
            paymentMode: saleSettings?.DefaultPaymentMode,
            RetentionLedgerId: saleSettings?.retentionLedgerId,
            taxType: generalSettings.taxType
        }));
    }, [financeSettings, saleSettings, generalSettings]);

    useEffect(() => {
        const handleForceLogout = () => {
            const hasData = formData.salesDetails.some(
                detail => detail.productCode && detail.qty > 0
            );
            if (hasData) {
                const heldInvoice = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    invoiceId: invoiceId,
                    customerName: formData.customerName || 'Unknown Customer',
                    customerAddress: formData.CustomerAddress || '',
                    totalAmount: formData.totalAmount || 0,
                    itemCount: formData.salesDetails.filter(d => d.productCode).length,
                    branchId: selectedBranchId,
                    formData: { ...formData },
                    errorHeld: true, // sessions-expired hold
                };

                // Write straight to localStorage since state updates may not
                // flush before navigation/unmount
                const savedHeldInvoices = localStorage.getItem('heldSalesInvoices');
                const allHeldInvoices = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
                allHeldInvoices.push(heldInvoice);
                localStorage.setItem('heldSalesInvoices', JSON.stringify(allHeldInvoices));
            }
        };

        window.addEventListener('app:force-logout', handleForceLogout);
        return () => window.removeEventListener('app:force-logout', handleForceLogout);
    }, [formData, invoiceId, selectedBranchId]);

    const fetchBankDetails = async (id) => {
        if (!id) return;
        try {
            const response = await axiosInstance.get(`get-account-ledger-byId/${id}`);
            if (response.data?.data) {
                const data = response.data.data;
                const details = {
                    ledgerCode: data.ledgerCode || "",
                    ledgerName: data.ledgerName || "",
                    groupId: data.groupId?.toString() || "",
                    accountNo: data.accountNo || "",
                    bankaccname: data.bankaccname || "",
                    bankname: data.bankname || "",
                    ibanno: data.ibanno || "",
                    bankBranchName: data.bankBranchName || "",
                    bankSwiftCode: data.bankSwiftCode || "",
                };
                setBankDetails(details);
                setFormData(prev => ({
                    ...prev,
                    bankDetails: details
                }));
            }
        } catch (error) {
            console.error("Error fetching bank ledger data:", error);
        }
    };

    useEffect(() => {
        if (financeSettings?.DefaultBankAccount) {
            fetchBankDetails(formData?.BankLedgerId || financeSettings.DefaultBankAccount);
        }
    }, [financeSettings?.DefaultBankAccount, formData?.BankLedgerId]);

    const genarateSalesInvoiceId = async (taxType) => {
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=${taxType === 'NA' ? 'Sales Invoice-No Tax' : 'Sales Invoice'}&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}&taxType=${taxType || formData.taxType}`
            );
            setInvoiceId(response.data.voucherCode)
        } catch (error) {
            console.error(error);
        }
    }
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
                // For HashRouter
                const filterString = returnFilters.toString();
                const listUrl = `/transaction/sales-invoice/invoice-list?${filterString}`;
                navigate(listUrl);
            } else {
                navigate("/transaction/sales-invoice/invoice-list");
            }
        } else {
            navigate("/transaction/sales-invoice/invoice-list");
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
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'thermal',
            formType: generalSettings.formType || 'Tax Invoice',
            customerData: {},
            voucherType: "Sales Invoice",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            billTime: time,
            ledgerId: financeSettings.defaultSalesAccount || '',
            pricingLevelId: 1, employeeId: '',
            salesAccount: '', salesAccountName: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: generalSettings.taxType,
            GodownId: null, costCentreId: 1, BatchId: '',
            customerName: '', CustomerAddress: '', CustomerPhone: '', customerVATNo: '',
            customercreditLimit: '', customerCreditlimitStatus: '',
            RefNo: "", refDate: "", orderRefNo: "", orderRefDate: "",
            creditPeriod: "", dueDate: "", deliveryDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            deliveryNoteMasterId: "", orderMasterId: "", quotationMasterId: "", proformaMasterId: "",
            AgainstNo: "NA", lrNo: "", transportCompany: "", vehicleNo: "",
            narration: "", taxableAmt: "", subTotal: "", totalTax: "",
            additionalCost: "", OtherChargeRemark: "", otherChargeLedgerId: "", othercharge: "",
            billDiscount: "", roundOff: "", totalAmount: "",
            AdjustmentAmount: "", AdvancePerc: "",
            RetentionLedgerId: "", RetentionType: "", RetentionDueDate: "",
            RetentionPercentage: "", RetentionAmount: "",
            paymentMode: "cash",
            CashLedgerId: financeSettings?.DefaultCashAccount || '',
            CashRefNo: "",
            CashAmount: 0,
            BankLedgerId: financeSettings?.DefaultBankAccount || null,
            BankRefNo: "",
            BankAmount: 0, BillBalanceAmount: 0,
            CarMake: "", CarModel: "", Kilometer: "", NextService: "",
            VehicleInTime: "", VehicleOutTime: "",
            preinvoiceHash: "", currentinvoiceHash: "", UUID: "",
            Zatcastatus: "", logdata: "", qr_link: "",
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            billDiscOnProductStatus: false, AddCostonProductStatus: false,
            branchId: selectedBranchId, CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId,
            salesDetails: [{
                deliveryNoteDetails1Id: "", orderDetails1Id: "", quotationDetailsId: "",
                proformaDetails1Id: "", productName: '', productNameArb: '',
                SlNo: "", productCode: "",
                qty: null, freeQty: null, rate: null, taxRate: 0, unitId: null,
                discountPercentage: null, taxId: null, taxType: "",
                ConversionFactor: null, barcode: "", PurchaseRate: null,
                taxAmount: 0, grossAmount: 0, netAmount: 0, amount: 0,
                productDescription: "",
                billDiscOnProduct: null, AddCostonProduct: null, otherchargeonproduct: null,
                salesManId: null, GodownId: null, RackId: null,
                branchId: selectedBranchId, baseunitId: null,
                inclusiveRate: null,
                lineDiscountWithTax: null,
            }]
        });
        if (isEditMode) {
            setCanEdit(true);
            setIsEditMode(false);
            setExistingInvoiceNo('');
        }
        setResetTableKey(prev => prev + 1);
        setFormData(prev => ({
            ...prev,
            salesAccount: salesAccount?.[0]?.ledgerId || '',
            salesAccountName: salesAccount?.[0]?.ledgerName || '',
            GodownId: godowns?.find(g => g.IsDefault)?.GodownId || ''
        }));

        fetchCustomerData(financeSettings?.defaultSalesAccount);
        genarateSalesInvoiceId(generalSettings.taxType);
        navigate('/transaction/sales-invoice')
    };

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
                    const autoFormType = data?.tinNumber
                        ? 'Tax Invoice'
                        : 'Retail Invoice';


                    setFormData((prev) => ({
                        ...prev,
                        customerName: data?.ledgerName || '',
                        CustomerAddress: data?.address || '',
                        CustomerPhone: data?.phoneNo || '',
                        customerVATNo: data?.tinNumber || '',
                        customercreditLimit: data?.creditLimit || '',
                        customerCreditlimitStatus: data?.creditLimitStatus || 'Ignore',
                        formType: autoFormType,
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching customer data:", error);
        }
    };

    const [stockData, setStockData] = useState([])
    const [customergroupData, setCustomerGroupData] = useState([])
    const fetchSalesMasterGroupedData = async (ledgerId) => {
        try {
            const res = await axiosInstance.post('salesmaster-grouped-data', { ledgerId: ledgerId || formData?.ledgerId, branchId: selectedBranchId });
            setCustomerGroupData(res?.data?.data);

        } catch (error) {
            console.error("error", error)
        }
    }
    const getSalesRequiredData = async () => {
        setBaseDataloading(true)
        try {
            const res = await axiosInstance.post('all-sales-data', {
                voucherType: "Sales Invoice",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Customer", "Customer&Supplier"],
                ledgerId: financeSettings?.defaultSalesAccount,
                currencyId: currentCurrency.currencyId,
                p_ledgerid: financeSettings?.defaultSalesAccount,
                p_branchid: selectedBranchId,
                p_isaccountsposting: false,
                p_salesmasterid: null
            })
            const data = res?.data?.data;
            setStockData(data?.stock)
            fetchSalesMasterGroupedData(financeSettings?.defaultSalesAccount)
            setUpdateCustomerId(financeSettings?.defaultSalesAccount || null)
            setInvoiceId(data?.voucherdata?.voucherCode)
            setEmployees(data?.employees)
            setGodowns(data?.godowns)
            // console.log(data?.godowns);

            setPricingLevel(data?.pricinglevel)
            setBatches(data?.transactionbatch)

            const filteredCurrencies = data?.currencywithConversion?.filter(
                c => c.branchid_conversion == selectedBranchId
            ) || [];
            setCurrnecies(filteredCurrencies);
            setCustomers(data?.customersupplierLedgers)
            setCostCenters(data?.costcentre)
            setCurrentLedgerBalance(data?.LedgerBalance.currentbal);

            setBank(data?.bank)
            setCash(data?.cash)
            setSalesAccount(data?.salesAccount)
            setQuotationData(data?.salesInvoiceAgainstData?.salesQuotationList)
            setProformadata(data?.salesInvoiceAgainstData?.proformaList)
            setDeliveryNoteData(data?.salesInvoiceAgainstData?.deliveryNoteList)
            setSalesOrderData(data?.salesInvoiceAgainstData?.salesOrderList)
            setOtherChargLedgers(data?.othercharge)
            setTaxData(data?.taxMaster)

            if (editMode) {
                await getSalesById(data?.taxMaster); // pass it directly
            }
            fetchSalesHistoryByCustomerId(financeSettings?.defaultSalesAccount)
            if (data?.salesAccount.length > 0 && !formData.salesAccount) {
                setFormData(prev => ({
                    ...prev,
                    salesAccount: data?.salesAccount[0].ledgerId,
                    salesAccountName: data?.salesAccount[0].ledgerName,
                }));
            }
            setFormData(prev => ({
                ...prev,
                CashLedgerId: financeSettings?.DefaultCashAccount || data?.cash?.[0]?.ledgerId || '',
                BankLedgerId: financeSettings?.DefaultBankAccount || data?.bank?.[0]?.ledgerId || '',
                customerData: data?.customeraddress,
                creditPeriod: data?.customeraddress?.creditPeriod,
                dueDate: data?.customeraddress?.creditPeriod
                    ? (() => {
                        const d = new Date();
                        d.setDate(d.getDate() + Number(data.customeraddress.creditPeriod));
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}`; // ✅ yyyy-MM-dd, what DateInput expects
                    })()
                    : '',
                batchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : '',
            }));
            if (location.state && location.state.againstQuotation && location.state.masterId) {
                loadSalesModeData('quotation', location.state.masterId, data?.taxMaster);
            } else if (location.state && location.state.againstProforma && location.state.masterId) {
                loadSalesModeData('proforma', location.state.masterId, data?.taxMaster);
            } else if (location.state && location.state.againstOrder && location.state.masterId) {
                loadSalesModeData('salesOrder', location.state.masterId, data?.taxMaster);
            } else if (location.state && location.state.againstDeliveryNote && location.state.masterId) {
                loadSalesModeData('deliveryNote', location.state.masterId, data?.taxMaster);
            }

            const defaultShipping = Array.isArray(data?.customeraddress?.shipping_address)
                ? data?.customeraddress?.shipping_address.find(addr => addr?.Isdefault === true) : null;

            setShippingAddress({
                name: data?.customeraddress?.ledgerName || '',
                email: data?.customeraddress?.email || '',
                phoneNo: data?.customeraddress?.phoneNo || '',
                shippingAddress: defaultShipping || {},
                vatNo: data?.customeraddress?.tinNumber || ''
            });
            if (!editMode) {
                setBlillingAddress({
                    name: data?.customeraddress?.ledgerName || '',
                    email: data?.customeraddress?.email || '',
                    phoneNo: data?.customeraddress?.phoneNo || '',
                    vatNo: data?.customeraddress?.tinNumber || '',
                    address: data?.customeraddress?.address || ''
                });

                setFormData((prev) => {
                    return {
                        ...prev,
                        customerName: data?.customeraddress?.ledgerName || '',
                        CustomerAddress: data?.customeraddress?.address || '',
                        CustomerPhone: data?.customeraddress?.phoneNo || '',
                        customerVATNo: data?.customeraddress?.tinNumber || '',
                        customercreditLimit: data?.customeraddress?.creditLimit || '',
                        customerCreditlimitStatus: data?.customeraddress?.creditLimitStatus || 'Ignore',
                    };
                });

                setFormData((prev) => {
                    const defaultGodown = data?.godowns?.find(g => g.IsDefault);

                    return {
                        ...prev,
                        GodownId: defaultGodown
                            ? defaultGodown.GodownId
                            : data?.godowns?.[0]?.GodownId || '',
                    };
                });
            }


        } catch (error) {
            console.error('error fetching default data', error)
        } finally {
            setBaseDataloading(false)
        }
    }
    useEffect(() => {
        getSalesRequiredData();
        genarateSalesInvoiceId(generalSettings.taxType);

    }, [salesMasterId, location.state])


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
    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
            setCurrentLedgerBalance(res?.data?.data?.currentbal);
            setFormData(prev => ({
                ...prev,
                ledgerBalance: res?.data?.data?.currentbal
            }));
        } catch (error) { console.error(error); }
    }

    useEffect(() => {
        const defaultGodown = godowns?.find(g => g.IsDefault);
        setFormData(prev => ({
            ...prev,
            ledgerId: (financeSettings?.defaultSalesAccount) || '',
            GodownId: defaultGodown?.GodownId || '',
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            formType: generalSettings.formType || 'Tax Invoice',
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'Type 1'
        }));
    }, [financeSettings, godowns, saleSettings, printSettings, currentCurrencyConversion, generalSettings]);

    // ===== HOLD INVOICE LOGIC (unchanged) =====
    // 3. Dedupe on read too, defensively
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesInvoices');
        if (savedHeldInvoices) {
            const allHeldInvoices = JSON.parse(savedHeldInvoices);
            const branchHeldInvoices = allHeldInvoices.filter(invoice => invoice.branchId === selectedBranchId);
            const deduped = Array.from(
                new Map(branchHeldInvoices.map(inv => [inv.id, inv])).values()
            );
            setHeldInvoices(deduped);
        }
    }, [selectedBranchId]);

    // 2. Dedupe when merging into localStorage on write
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldSalesInvoices');
        const allHeldInvoices = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
        const otherBranchInvoices = allHeldInvoices.filter(invoice => invoice.branchId !== selectedBranchId);

        // De-dupe current branch invoices by id before saving
        const dedupedHeldInvoices = Array.from(
            new Map(heldInvoices.map(inv => [inv.id, inv])).values()
        );

        const updatedAllInvoices = [...otherBranchInvoices, ...dedupedHeldInvoices];
        if (updatedAllInvoices.length > 0) {
            localStorage.setItem('heldSalesInvoices', JSON.stringify(updatedAllInvoices));
        } else {
            localStorage.removeItem('heldSalesInvoices');
        }
    }, [heldInvoices, selectedBranchId]);

    // 1. Guard the hold function itself so it can't double-fire
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
            formData: { ...formData }
        };
        setHeldInvoices(prev => {
            // Prevent duplicate if this exact invoice was just held
            if (prev.some(inv => inv.id === heldInvoice.id)) return prev;
            return [...prev, heldInvoice];
        });
        showToast.success(`Invoice held successfully. Total held invoices: ${heldInvoices.length + 1}`);
        clearForm();
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault(); holdCurrentInvoice();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentInvoice]);

    const restoreHeldInvoice = (heldInvoice) => {
        const hasValidProducts = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);
        if (hasValidProducts) {
            const currentHeld = {
                id: Date.now(), timestamp: new Date().toISOString(),
                invoiceId: invoiceId, customerName: formData.customerName || 'Current Invoice',
                customerAddress: formData.CustomerAddress || '',
                totalAmount: formData.totalAmount || 0,
                itemCount: formData.salesDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId, formData: { ...formData }
            };
            setHeldInvoices(prev => [...prev.filter(inv => inv.id !== heldInvoice.id), currentHeld]);
        } else {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== heldInvoice.id));
        }

        // ✅ Restore held data but force date/time to now instead of the held date
        setFormData({
            ...heldInvoice.formData,
            date: new Date(),
            billTime: time,
        });

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
            <div className="fixed top-20 right-4 z-50 w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                            Held Invoices ({heldInvoices.length})
                        </h3>
                        <button onClick={() => setShowHeldInvoices(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none">
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
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Invoice: {invoice.invoiceId}</p>
                                        {invoice.customerAddress && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{invoice.customerAddress}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-600 dark:text-blue-400">
                                            {parseFloat(invoice.totalAmount || 0).toFixed(decimalPart)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.itemCount} items</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{new Date(invoice.timestamp).toLocaleString()}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => restoreHeldInvoice(invoice)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:main-bg text-sm font-medium transition-colors">
                                        Restore
                                    </button>
                                    <button onClick={() => deleteHeldInvoice(invoice.id)} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

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
    const [salesHistory, setSalesHistory] = useState([]);

    const fetchSalesHistoryByCustomerId = async (ledgerId) => {
        try {
            const res = await axiosInstance.post('sales-list-by-customer', {
                ledgerId: ledgerId,
                branchId: selectedBranchId
            })
            setSalesHistory(res.data.data);

        } catch (error) {
            console.error(error);

        }
    }


    const loadSalesModeData = async (mode, masterId, taxMaster) => {
        const idsArray = Array.isArray(masterId)
            ? masterId
            : [Number(masterId)];
        setFetchLoading(true);
        try {
            let data;
            let againstNoValue = 'NA';

            if (mode === 'quotation') {
                const response = await axiosInstance.post(`get-sales-invoice-quotation-details`, {
                    p_quotation_master_id: idsArray,
                    p_branchid: selectedBranchId,
                    p_salesmasterid: null
                });
                data = response.data.data;
                againstNoValue = 'Quotation';
            }

            if (mode === 'proforma') {
                const response = await axiosInstance.post(`get-sales-invoice-proforma-details`, {
                    p_proformamasterid: idsArray,
                    p_branchid: selectedBranchId,
                    p_salesmasterid: null
                });
                data = response.data.data;
                againstNoValue = 'Proforma';
            }

            if (mode === 'salesOrder') {
                const response = await axiosInstance.post(`get-sales-invoice-sales-order-details`, {
                    p_ordermasterid: idsArray,
                    p_branchid: selectedBranchId,
                    p_salesmasterid: null
                });
                data = response.data.data;
                againstNoValue = 'Order';
            }

            // ✅ FIX: Delivery Note loading
            if (mode === 'deliveryNote') {
                const response = await axiosInstance.post(`get-sales-invoice-delivery-note-details`, {
                    p_deliverynotemasterid: idsArray, // ✅ This should match the parameter name your API expects
                    p_branchid: selectedBranchId,
                    p_salesmasterid: null,
                    p_isaccountsposting: false
                });
                data = response.data.data;
                againstNoValue = 'Delivery Note';

            }
            fetchCustomerData(data?.ledgerId)
            // Process sales details
            const salesDetailsWithProducts = await Promise.all(
                (data.salesDetails || []).map(async (item) => {
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
                    const freshTaxMaster = taxMaster || taxData
                    const taxInfo = freshTaxMaster.find(t => t.taxId === item.taxId);
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
                        // Source document IDs
                        deliveryNoteDetails1Id: item.deliveryNoteDetails1Id || null,
                        orderDetails1Id: item?.orderDetails1Id || null,
                        quotationDetailsId: item?.quotationDetailsId || null,
                        proformaDetails1Id: item?.proformaDetails1Id || null,
                        // Slot/location fields
                        GodownId: item.GodownId || formData.GodownId || null,
                        RackId: item.RackId || null,                              // ← add this
                        // Staff/branch
                        salesManId: item.salesManId || data.Salesman || null,
                        branchId: item.branchId || formData.branchId || selectedBranchId,
                        // Product info
                        productName,
                        productNameArb: item.productNameArb || '',
                        taxRate,
                        availableUnits,
                        productDetails,
                        // Quantities
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        // Rates
                        rate: parseFloat(item.rate) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        discountPercentage: parseFloat(item.discountPercentage) || 0,
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        // Amounts
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        // Tax
                        taxId: item.taxId || null,
                        taxType: item.taxType || 'Excluded',
                        ConversionFactor: item.ConversionFactor || 0,
                        // Misc
                        barcode: item.barcode || '',
                        productDescription: item.productDescription || '',
                        billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                        AddCostonProduct: item.AddCostonProduct || null,
                        otherchargeonproduct: parseFloat(item.otherchargeonproduct) || 0,
                        baseUnitid: item.baseunitId || null,
                        baseunitId: item.baseunitId || null,
                        unitId: item.unitId || null,
                        SlNo: item.SlNo || null,
                        descAmt: parseFloat(item.descAmt) || (() => {
                            const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                            const discPerc = parseFloat(item.discountPercentage) || 0;
                            return parseFloat(((gross * discPerc) / 100).toFixed(generalSettings?.decimalPart || 2)) || 0;
                        })()
                    };
                })
            );

            // ✅ Update form data with loaded data
            setFormData((prev) => ({
                ...prev,
                ...data,
                date: new Date(),
                AgainstNo: data?.voucherNo,
                salesManId: data?.Salesman || null,
                othercharge: Number(data?.othercharge) || 0,
                totalAmount: undefined,  // ✅ never let API response set this; footer owns it
                grandTotal: undefined,
                billDiscountWithTax: data?.billDiscountWithTax,
                refDate: data.refDate ? new Date(data.refDate) : "",
                orderRefDate: data.orderRefDate ? new Date(data.orderRefDate) : "",
                dueDate: data.dueDate ? new Date(data.dueDate) : "",
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : "",
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                RetentionDueDate: data.RetentionDueDate ? new Date(data.RetentionDueDate) : "",
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                salesDetails: salesDetailsWithProducts,
                yearId: currentFinancialYear?.yearId,
                quotationMasterId: mode === "quotation" ? idsArray : null,
                orderMasterId: mode === "salesOrder" ? idsArray : null,
                proformaMasterId: mode === "proforma" ? idsArray : null,
                deliveryNoteMasterId: mode === "deliveryNote" ? idsArray : null,
                voucherType: "Sales Invoice",
                ledgerId: data?.ledgerId,
                customerName: data?.customerName || "",
                BatchId: data?.BatchId || null,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
            Swal({
                title: "Bill Not Found",
                text: "No bill found for the provided details. Please check and try again.",
                icon: "error",
                button: "OK",
            });
        } finally {
            setFetchLoading(false);
        }
    };

    const getSalesById = async (taxMaster) => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-sales-byId/${salesMasterId}`);
            const data = response.data.data;


            fetchCustomerData(data.ledgerId);
            fetchLedgerBalance(data.ledgerId);

            setExistingInvoiceNo(data.invoiceNo);


            const salesDetailsWithProducts = await Promise.all(
                (data.salesDetails || []).map(async (item) => {
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
                        ...item,
                        productName,
                        productNameArb,
                        taxRate: taxRate,
                        availableUnits,
                        productDetails,
                        unit: item.unitId,
                        qty: parseFloat(item.qty) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        lineDiscountWithTax: parseFloat(item.lineDiscountWithTax) || 0,
                        inclusiveRate: item.inclusiveRate ? parseFloat(item.inclusiveRate) : null,
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
            setBlillingAddress({
                name: data?.customerName || '',
                vatNo: data?.customerVATNo || '',
                phoneNo: data?.CustomerPhone || '',
                address: data?.CustomerAddress || ''
            })
            setFormData((prev) => ({
                ...prev,
                ...data,
                billTime: data.billTime || '',
                date: parseDateFromAPI(data.date),
                refDate: data.refDate ? new Date(data.refDate) : "",
                orderRefDate: data.orderRefDate ? new Date(data.orderRefDate) : "",
                dueDate: data.dueDate ? new Date(data.dueDate) : "",
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : "",
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                RetentionDueDate: data.RetentionDueDate ? new Date(data.RetentionDueDate) : "",
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                salesDetails: salesDetailsWithProducts,
                billDiscountWithTax: data?.billDiscountWithTax,
                yearId: currentFinancialYear?.yearId,
                CashAmount: data?.CashAmount || 0,
                BankAmount: data?.BankAmount || 0,
                BillBalanceAmount: data?.BillBalanceAmount || 0,
                voucherType: "Sales Invoice",
            }));

            setResetTableKey((prev) => prev + 1);
        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false);
        }
    };

    const [loading, setLoading] = useState({ employees: false, costCenters: false, pricingLevel: false, customers: false, godowns: false, batch: false });

    const validateFormData = () => {

        const errors = [];
        if (!formData.ledgerId || !formData.customerName) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select invoice date');
        if (!formData.salesDetails || formData.salesDetails.length === 0) errors.push('Please add at least one product');
        const hasValidProducts = formData.salesDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    const checkCreditLimit = async (formData, finalGrandTotal, currentledgerBalance) => {
        if (formData.customerCreditlimitStatus === 'Ignore') return { allowed: true };
        const creditLimit = parseFloat(formData.customercreditLimit) || 0;
        const currentBalance = parseFloat(currentledgerBalance) || 0;
        const invoiceAmount = parseFloat(finalGrandTotal) || 0;
        const newBalance = currentBalance - invoiceAmount;
        if (Math.abs(newBalance) > creditLimit && creditLimit > 0) {
            const exceededAmount = Math.abs(newBalance) - creditLimit;
            if (formData.customerCreditlimitStatus === 'Block') {
                await Swal.fire({ title: t('salesInvoice.alert.creditLimit.blockTitle') || 'Credit Limit Exceeded!', html: `<div class="text-left"><p><strong>Customer:</strong> ${formData.customerName}</p><p><strong>Credit Limit:</strong> ${creditLimit.toFixed(decimalPart)}</p><p><strong>New Balance:</strong> ${newBalance.toFixed(decimalPart)}</p><p class="text-red-600"><strong>Exceeded by:</strong> ${exceededAmount.toFixed(decimalPart)}</p></div>`, icon: 'error', confirmButtonColor: '#d33', confirmButtonText: t('okBtn') });
                return { allowed: false };
            }
            if (formData.customerCreditlimitStatus === 'Warn') {
                const result = await Swal.fire({ title: t('salesInvoice.alert.creditLimit.warnTitle'), html: `<div class="text-left"><p><strong>Customer:</strong> ${formData.customerName}</p><p><strong>Credit Limit:</strong> ${creditLimit.toFixed(decimalPart)}</p><p class="text-orange-600"><strong>Exceeded by:</strong> ${exceededAmount.toFixed(decimalPart)}</p><p>Do you want to proceed?</p></div>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: t('salesInvoice.alert.creditLimit.proceedBtn'), cancelButtonText: t('Cancel') });
                return { allowed: result.isConfirmed };
            }
        }
        return { allowed: true };
    };

    // ===== PRINT HELPERS =====
    const buildInvoiceDataForPrint = useCallback((invoiceNumber, qrLink, overrideData) => {

        const base = overrideData || formData;

        const mergedCustomerData = {
            ...(formData.customerData || {}),
            ...(base.customerData || {}),
        };

        return {
            ...base,
            invoiceNo: editMode ? existingInvoiceNo : invoiceId,
            date: base.date,
            salesDetails: base.salesDetails,
            qr_link: qrLink || base.qr_link,
            customerData: mergedCustomerData,
            ledgerBalance: base?.ledgerBalance ?? currentledgerBalance,
            bankDetails: base?.bankDetails || formData.bankDetails || bankDetails,
        };
    }, [formData, currentledgerBalance, bankDetails]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SINGLE SOURCE OF TRUTH for print types.
    // To add a new invoice type, add ONE entry here — both printer & PDF
    // paths pick it up automatically. Nothing else needs to change.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const INVOICE_PRINT_HANDLERS = {
        'Type 1': { print: printInvoiceOne, pdf: saveInvoiceAsPDF },
        'Type 2': { print: printInvoiceTwo, pdf: saveInvoiceTwoAsPDF },
        'Type 3': { print: printInvoiceThree, pdf: saveInvoiceThreeAsPDF },
        'Type 4': { print: printInvoiceFour, pdf: saveInvoiceFourAsPDF },
        'Type 5': { print: printInvoiceFive, pdf: saveInvoiceFiveAsPDF },
        'Type 6': { print: printInvoiceSix, pdf: saveInvoiceSixAsPDF },
        'Type 7': { print: printInvoiceSeven, pdf: saveInvoiceSevenAsPDF },
        'Type 8': { print: InvoicePrintEight, pdf: saveInvoiceEightAsPDF },
        'Type 9': { print: InvoicePrintNine, pdf: saveInvoiceNineAsPDF },
        'Type 10': { print: InvoicePrintTen, pdf: saveInvoiceTenAsPDF },
        'Type 11': { print: InvoicePrintEleven, pdf: saveInvoiceElevenAsPDF },
        'Type 12': { print: printInvoiceTwelve, pdf: saveInvoiceTwelveAsPDF },
        'Type 13': { print: printInvoiceThirteen, pdf: saveInvoiceThirteenAsPDF },
        'Type 14': { print: printInvoiceForteen, pdf: saveInvoiceForteenAsPDF },
        'MTC': { print: printInvoiceMTC, pdf: saveInvoiceMTCAsPDF },
        'Thermal': { print: printThermalInvoice, pdf: saveInvoiceThermalAsPDF },
        'Thermal2': { print: printThermalTwoInvoice, pdf: saveInvoiceThermalTwoAsPDF },
    };

    const DEFAULT_PRINT_TYPE = 'Type 1'; // used when formData.printType doesn't match anything above
    const DEFAULT_PDF_TYPE = 'Type 6';   // your old code fell back to Type 6 for PDF specifically

    // ===== UNIFIED PRINT/PDF HANDLER =====
    // mode: 'print' | 'pdf'
    const runInvoiceOutput = useCallback((mode, invoiceDataForPrint, qrLink) => {
        const handlers = INVOICE_PRINT_HANDLERS[formData.printType];
        const billTime = editMode ? (invoiceDataForPrint?.billTime || formData.billTime) : time;

        const fn = handlers?.[mode]
            ?? INVOICE_PRINT_HANDLERS[mode === 'pdf' ? DEFAULT_PDF_TYPE : DEFAULT_PRINT_TYPE][mode];

        fn(invoiceDataForPrint, selectedBranchDetails, billTime, currentCurrency, qrLink);
    }, [formData.printType, formData.billTime, selectedBranchDetails, time, editMode]);

    const printToPrinterFn = useCallback((invoiceDataForPrint, qrLink) => {
        runInvoiceOutput('print', invoiceDataForPrint, qrLink);
    }, [runInvoiceOutput]);

    const printToPdfFn = useCallback((invoiceDataForPrint, qrLink) => {
        runInvoiceOutput('pdf', invoiceDataForPrint, qrLink);
    }, [runInvoiceOutput]);



    // ===== SAVE HANDLER =====
    const handleSave = useCallback(async () => {
        if (formData.formType === 'Tax Invoice' && generalSettings.zatcaType === 'Phase 2') {
            const requiredFields = [
                'ledgerName',
                'tinNumber',
                'BuildingNo',
                'StreetName',
                'District',
                'CityName',
                'Country',
                'PostboxNo',
                'AdditionalNo',
                'cstNumber'
            ];
            const customerData = formData.customerData || {};
            const hasMissingPartyDetails = requiredFields.some(field => !customerData[field]);

            if (formData.totalAmount <= 0) {
                showToast.error(t("purchaseInvoice.form.messages.totalAmountError"));
                return;
            }

            if (hasMissingPartyDetails) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Party Details Required',
                    text: 'Cannot save Tax Invoice without filling party details.',
                    confirmButtonText: 'OK'
                });
                return;
            }
        }

        if (!validateForm(formData, validationRules)) return;

        // Row validation
        let hasGaps = false;
        let lastFilledIndex = -1;
        const rowValidationErrors = [];

        formData.salesDetails.forEach((row, index) => {
            const isRowFilled = row.productCode && row.productCode.trim() !== '';
            const hasAnyData = row.productName?.trim() !== '' ||
                row.barcode?.trim() !== '' ||
                row.qty > 0 ||
                row.rate > 0;

            if (isRowFilled) {
                if (lastFilledIndex !== -1 && index - lastFilledIndex > 1) {
                    hasGaps = true;
                }
                lastFilledIndex = index;

                const missingFields = [];
                if (!row.productName || row.productName.trim() === '') {
                    missingFields.push('Product Name');
                }
                if (!row.qty || row.qty <= 0) {
                    missingFields.push('Quantity');
                }
                if (row.rate === undefined || row.rate < 0) {
                    missingFields.push('Sales Rate');
                }
                if (!row.unitId) {
                    missingFields.push('Unit');
                }

                if (missingFields.length > 0) {
                    rowValidationErrors.push({
                        row: index + 1,
                        message: `Missing: ${missingFields.join(', ')}`
                    });
                }
            } else if (lastFilledIndex !== -1 && index < formData.salesDetails.length - 1) {
                const hasFilledRowsAfter = formData.salesDetails
                    .slice(index + 1)
                    .some(r => r.productCode && r.productCode.trim() !== '');

                if (hasFilledRowsAfter) {
                    hasGaps = true;
                    rowValidationErrors.push({
                        row: index + 1,
                        message: 'Row skipped'
                    });
                }
            } else if (!isRowFilled && hasAnyData && index < formData.salesDetails.length - 1) {
                rowValidationErrors.push({
                    row: index + 1,
                    message: 'Incomplete data'
                });
            }
        });

        if (hasGaps || rowValidationErrors.length > 0) {
            showToast.error(
                rowValidationErrors.map(err => `Row ${err.row}: ${err.message}`).join('\n') ||
                "Cannot skip rows!"
            );
            return;
        }

        // Validation: Check if any row has rate without productCode
        const rateWithoutProductCode = formData.salesDetails.filter((row, index) => {
            const hasRate = (row.salesRate > 0 && generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') ||
                (row.salesRateWithoutTax > 0) ||
                (row.rate > 0);
            const noProductCode = !row.productCode || row.productCode.trim() === '';
            return hasRate && noProductCode;
        });

        if (rateWithoutProductCode.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Row Data',
                text: 'Cannot save: Rate/Price entered without selecting a product. Please select a product for all rows with rates.',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
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
            showToast.error(validationErrors.join('\n'));
            return;
        }

        const creditLimitCheck = await checkCreditLimit(
            formData,
            formData.totalAmount,
            currentledgerBalance
        );
        if (!creditLimitCheck.allowed) return;

        if (generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel')
            });

            if (!result.isConfirmed) return;
        }

        setIsSaving(true);

        try {
            const qrCodeBase64 = generateQRCodeData(
                formData,
                selectedBranchDetails?.branchName || '',
                selectedBranchDetails?.taxNo || '',
                time
            );
            const qrCodeUrl = qrCodeBase64;

            const calculatedTotal = (
                parseFloat(formData.taxableAmt || 0) +
                parseFloat(formData.totalTax || 0) +
                parseFloat(formData.othercharge || 0) -
                parseFloat(formData.billDiscount || 0) +
                parseFloat(formData.roundOff || 0) +
                parseFloat(formData.additionalCost || 0)
            ).toFixed(2);

            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                billTime: time,
                qr_link: qrCodeUrl,
                totalAmount: calculatedTotal,
                postedStatus: formData.postedStatus || 'Yes',
                postedBy: userId,
                postDate: formData.postedDate ? formatDateWithTime(formData.postedDate) : null,
            };

            const api = 'save-sales';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                const zatcaPhaceOneQrLink = response.data.data.qr_link;
                const { data } = await axiosInstance.get(`zatca/preinvoicehash/${selectedBranchId}`);
                const PreviousHash = data.data;

                // ZATCA Phase 2 logic
                const zatcaPayload = {
                    MasterId: response.data.data.salesMasterId || '',
                    VoucherNo: response.data.data.invoicenumber || invoiceId,
                    VoucherType: "Sales Invoice",
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
                    BuyerBuildingNo: formData.customerData.BuildingNo,
                    BuyerCitySubDivisionName: formData.customerData.District,
                    BuyerCountryCode: "SA",
                    BuyerPlotIdentification: "",
                    BuyerPostalZone: formData.customerData.PostboxNo,
                    BuyerContactName: formData.customerData.District,
                    BuyerSchemeID: formData.formType === 'Tax Invoice' ? 'CRN' : "OTH",
                    BuyerSchemIDNo: formData.customerData.cstNumber,
                    BuyerTaxCode: formData.customerData.tinNumber,
                    PaymentMeansCode: formData.paymentMode === 'cash' ? '10' :
                        formData.paymentMode === 'bank' ? '42' : '30',
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
                            CurrencyConversionRate: currentCurrencyConversion?.rate
                        }))
                };

                let zatcaPhaceTwoQrLink;

                if (generalSettings.zatcaType === 'Phase 2') {
                    const zatcaResponse = await axios.post(
                        'https://api.finacerp.com/api/Invoice/Submit',
                        zatcaPayload
                    );
                    axiosInstance.post('zatca/save-zatca-response', {
                        SalesMasterId: response.data.data.salesMasterId,
                        ZatcaResponse: JSON.stringify(zatcaResponse.data)
                    });

                    zatcaPhaceTwoQrLink = zatcaResponse.data.QrCodeBase64;

                    if (zatcaResponse.data.Success) {
                        await axiosInstance.post('update-zatca-fields', {
                            VoucherType: "Sales Invoice",
                            salesMasterId: response.data.data.salesMasterId,
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
                        console.error('ZATCA submission failed');
                    }
                }

                if (!editMode) {
                    clearForm(true);
                }
                showToast.success(t('saveSuccess'));
                setIsSaving(false);

                const invoiceQr = generalSettings.zatcaType === 'Phase 2' ?
                    zatcaPhaceTwoQrLink :
                    zatcaPhaceOneQrLink;
                const fershInvoiceData = response?.data?.data?.payload?.salesMaster
                const invoiceId = fershInvoiceData?.invoiceNo
                const invoiceDataForPrint = buildInvoiceDataForPrint(invoiceId, invoiceQr, fershInvoiceData);

                // Handle held invoices cleanup first
                if (restoredHeldInvoiceId) {
                    setHeldInvoices(prev => prev.filter(inv => inv.id !== restoredHeldInvoiceId));
                    setRestoredHeldInvoiceId(null);
                }

                // PRINT LOGIC
                if (formData?.printAfterSave) {
                    printToPrinterFn(invoiceDataForPrint, invoiceQr);


                } else {
                    const pdfResult = await Swal.fire({
                        title: t('Print as PDF?') || 'Print as PDF?',
                        text: t('Do you want to download this invoice as a PDF?') ||
                            'Do you want to download this invoice as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });

                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            printToPdfFn(invoiceDataForPrint, invoiceQr, fershInvoiceData);
                        }, 500);
                    } else if (editMode) {
                        setIsEditMode(false);
                        clearForm(true);
                    }

                    // if (!editMode && !saleSettings.CloseAfterSave) {
                    //     clearForm();
                    // }
                }

                if (saleSettings.CloseAfterSave) {
                    navigate('/transaction/sales-invoice/invoice-list');
                }
                genarateSalesInvoiceId();
            }
        } catch (error) {
            console.error('Error saving sales:', error);

            // ✅ AUTO-HOLD INVOICE ON ERROR
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
                    formData: { ...formData },
                    errorHeld: true // Mark this as error-held for user awareness
                };

                setHeldInvoices(prev => [...prev, heldInvoice]);

                showToast.warning(
                    `Save failed. Invoice has been automatically held. Total held invoices: ${heldInvoices.length + 1}`
                );
            }

            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                html: `
                <div class="text-left">
                    <p class="mb-2">${error.response?.data?.message || t('SaveFailed') || 'Failed to save sales invoice'}</p>
                    ${hasValidData ? '<p class="text-sm text-blue-600">Your invoice data has been automatically held and can be restored later.</p>' : ''}
                </div>
            `,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
        } finally {
            if (!saleSettings.CloseAfterSave) {
                getSalesRequiredData()
            }
            setIsSaving(false);
        }
    }, [
        formData,
        time,
        saleSettings,
        generalSettings,
        editMode,
        selectedBranchDetails,
        restoredHeldInvoiceId,
        currentledgerBalance,
        invoiceId,
        buildInvoiceDataForPrint,
        printToPrinterFn,
        clearForm,
        navigate,
        t,
        heldInvoices.length,
        selectedBranchId
    ]);

    const fetchInvoiceDataForPrint = useCallback(async () => {
        const response = await axiosInstance.get(`get-sales-byId/${salesMasterId}`);
        const data = response.data.data;

        const resolvedTaxData = taxData;

        const salesDetailsWithProducts = (data.salesDetails || []).map((item) => {
            const taxInfo = resolvedTaxData?.find(t => t.taxId === item?.taxId);
            const taxRate = taxInfo ? parseFloat(taxInfo?.rate) : 0;

            // ✅ Resolve unit name from the item's own units list (if API returns it)
            const availableUnits = item?.units || [];
            const selectedUnit = availableUnits.find(u => u.unitid === item.unitId);

            // ✅ Fallback: try matching against currently loaded formData row (in-memory state)
            // in case the API's units array is empty but formData already has it resolved
            const existingRow = formData?.salesDetails?.find(
                r => r.productCode === item.productCode && r.unitId === item.unitId
            );

            const resolvedUnitName =
                selectedUnit?.unitname ||
                existingRow?.productDetails?.UnitName ||
                existingRow?.UnitName ||
                item.unitName ||
                item.UnitName ||
                '';

            return {
                ...item,
                productName: item?.productname || '',
                productNameArb: item?.productNameArb || '',
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
                // ✅ unit info merged in, available under both keys the MTC generator checks
                unitName: resolvedUnitName,
                unit: resolvedUnitName,
                availableUnits,
                productDetails: {
                    ...(item.productDetails || {}),
                    UnitName: resolvedUnitName,
                },
            };
        });

        return {
            ...data,
            date: parseDateFromAPI(data.date),
            salesDetails: salesDetailsWithProducts,
        };
    }, [salesMasterId, taxData, formData]);

    // ===== EDIT MODE: Print to Printer with 3-second loading for Electron =====
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
            console.error('Error fetching invoice for reprint:', error);
            showToast.error('Failed to fetch invoice data for printing');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, fetchInvoiceDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPrinterFn, isElectron]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const freshData = await fetchInvoiceDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData.qr_link, freshData);
            printToPdfFn(invoiceDataForPrint, freshData.qr_link);

            if (isElectron) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error('Error fetching invoice for PDF reprint:', error);
            showToast.error('Failed to fetch invoice data for PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [fetchInvoiceDataForPrint, buildInvoiceDataForPrint, existingInvoiceNo, printToPdfFn, isElectron]);


    // ===== EDIT MODE: Send via WhatsApp =====
    const handleSendWhatsApp = useCallback(() => {
        setWhatsappNumber(formData?.CustomerPhone || '');
        setWhatsappModalOpen(true);
    }, [formData?.CustomerPhone]);

    const handleSendEmail = useCallback(() => {
        setEmailAddress(formData?.customerData?.email || '');
        setEmailMessage(`Dear ${formData?.customerName || 'Customer'}, please find attached your invoice.`);
        setEmailModalOpen(true);
    }, [formData?.customerData?.email, formData?.customerName]);
    const INVOICE_HTML_GENERATORS = {
        'Type 1': generateInvoiceOneHTML,   // ✅ confirmed available (imported)
        // 'Type 2': generateInvoiceTwoHTML,      // ⬜ needs export + import from InvoicePrintTwo
        // 'Type 3': generateInvoiceThreeHTML,    // ⬜ needs export + import from InvoicePrintThree
        // 'Type 4': generateInvoiceFourHTML,     // ⬜ needs export + import from InvoicePrintFour
        // 'Type 5': generateInvoiceFiveHTML,     // ⬜ needs export + import from Invoiceprintfive
        'Type 6': generateInvoiceHTML,      // ✅ confirmed available (imported)
        // 'Type 7': generateInvoiceSevenHTML,    // ⬜ needs export + import from invoicePrintSeven
        // 'Type 8': generateInvoiceEightHTML,    // ⬜ needs export + import from InvoicePrintEight
        // 'Type 9': generateInvoiceNineHTML,     // ⬜ needs export + import from InvoicePrintNine
        // // 'Type 10': generateInvoiceTenHTML,     // ⬜ needs export + import from InvoicePrintTen
        // 'Type 11': generateInvoiceElevenHTML,  // ⬜ needs export + import from InvoicePrintEleven
        // 'Type 12': generateInvoiceTwelveHTML,  // ⬜ needs export + import from InvoicePrintTwelve
        'Type 14': generateInvoiceFourteenHTML, // ⬜ needs export + import from InvoicePrintForteen
        // 'Thermal': generateThermalInvoiceHTML,     // ⬜ needs export + import from thermal/printThermalInvoiceOne
        // 'Thermal2': generateThermalTwoInvoiceHTML, // ⬜ needs export + import from thermal/PrintInvoiceThermalTwo
    };

    const DEFAULT_HTML_GENERATOR = generateInvoiceOneHTML;
    const handleSendEmailMessage = useCallback(async () => {
        if (!emailAddress || emailAddress.trim() === '') {
            showToast.error('Please enter an email address');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailAddress)) {
            showToast.error('Please enter a valid email address');
            return;
        }

        setIsSaving(true);

        try {
            const freshData = await fetchInvoiceDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData.qr_link, freshData);

            // Generates the PDF locally and returns a Blob — nothing uploaded, no link
            const htmlGenerator = INVOICE_HTML_GENERATORS[formData.printType] || DEFAULT_HTML_GENERATOR;

            // Generates the PDF locally and returns a Blob — nothing uploaded, no link
            const pdfBlob = await generateInvoicePdfBlob(
                htmlGenerator,
                invoiceDataForPrint,
                selectedBranchDetails,
                freshData.billTime || time,
            );

            if (!pdfBlob) {
                showToast.error('Failed to generate invoice PDF. Please try again.');
                return;
            }

            const pdfFile = new File(
                [pdfBlob],
                `Invoice-${existingInvoiceNo || invoiceId}.pdf`,
                { type: 'application/pdf' }
            );

            const payload = new FormData();
            payload.append('name', formData?.customerName || '');
            payload.append('email', emailAddress);
            payload.append('message', emailMessage);
            payload.append('branchName', selectedBranchDetails?.branchName);
            payload.append('document', pdfFile);

            await axiosInstance.post('send-mail', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            showToast.success('Invoice emailed successfully');
            setEmailModalOpen(false);
            setEmailAddress('');
            setEmailMessage('');
        } catch (error) {
            console.error('Email send error:', error);
            showToast.error('Failed to send invoice via email');
        } finally {
            setIsSaving(false);
        }
    }, [
        emailAddress,
        emailMessage,
        fetchInvoiceDataForPrint,
        buildInvoiceDataForPrint,
        existingInvoiceNo,
        selectedBranchDetails,
        time,
        formData?.customerName,
        invoiceId,
    ]);

    const handleCloseEmailModal = useCallback(() => {
        setEmailModalOpen(false);
        setEmailAddress('');
        setEmailMessage('');
    }, []);
    const EmailModal = () => {
        if (!emailModalOpen) return null;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailAddress && emailRegex.test(emailAddress);

        return (
            <>
                <div className="fixed inset-0 bg-[#0000009a] z-40" onClick={handleCloseEmailModal} />
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Send Invoice via Email
                            </h2>
                            <button onClick={handleCloseEmailModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="email-address"
                                    type="email"
                                    placeholder="customer@example.com"
                                    value={emailAddress}
                                    onChange={(e) => setEmailAddress(e.target.value)}
                                    autoFocus
                                    className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition
                                ${!emailAddress ? 'border-red-300 dark:border-red-600 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
                                />
                                {emailAddress && !isEmailValid && (
                                    <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="email-message"
                                    rows={3}
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button onClick={handleCloseEmailModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md font-medium transition">
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmailMessage}
                                disabled={!isEmailValid || isSaving}
                                className={`px-4 py-2 rounded-md font-medium transition flex items-center gap-2
                            ${isEmailValid && !isSaving ? 'main-bg hover:bg-blue-700 text-white cursor-pointer' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
                            >
                                {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" />Sending…</>) : ('Send Email')}
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    };
    const handleSendWhatsAppMessage = useCallback(async () => {
        if (!whatsappNumber || whatsappNumber.trim() === '') {
            showToast.error('Please enter a phone number');
            return;
        }
        const phoneRegex = /\d{7,}/;
        if (!phoneRegex.test(whatsappNumber)) {
            showToast.error('Please enter a valid phone number');
            return;
        }

        setIsSaving(true);

        try {
            const freshData = await fetchInvoiceDataForPrint();
            const invoiceDataForPrint = buildInvoiceDataForPrint(existingInvoiceNo, freshData.qr_link, freshData);

            const htmlGenerator = INVOICE_HTML_GENERATORS[formData.printType] || DEFAULT_HTML_GENERATOR;

            const pdfUrl = await uploadInvoicePDFAndGetLink(
                htmlGenerator,
                invoiceDataForPrint,
                selectedBranchDetails,
                freshData.billTime || time,
            );

            if (!pdfUrl) {
                showToast.error('Failed to generate or upload PDF. Please try again.');
                return;
            }

            const message = formatInvoiceMessageWithLink(
                freshData,
                existingInvoiceNo,
                pdfUrl,
                'Sales Invoice',
            );

            sendWhatsAppMessage(whatsappNumber, message);
            showToast.success('Opening WhatsApp with invoice PDF link…');
            setWhatsappModalOpen(false);
            setWhatsappNumber('');
        } catch (error) {
            console.error('WhatsApp send error:', error);
            showToast.error('Failed to send WhatsApp message');
        } finally {
            setIsSaving(false);
        }
    }, [
        whatsappNumber,
        fetchInvoiceDataForPrint,
        buildInvoiceDataForPrint,
        existingInvoiceNo,
        selectedBranchDetails,
        time,
    ]);

    const handleCloseWhatsAppModal = useCallback(() => {
        setWhatsappModalOpen(false);
        setWhatsappNumber('');
    }, []);

    // Modal Component - UPDATED VERSION
    const WhatsAppModal = () => {
        if (!whatsappModalOpen) return null;

        // Check if phone number is valid
        const isPhoneValid = whatsappNumber && whatsappNumber.trim() !== '' && /\d{7,}/.test(whatsappNumber);

        return (
            <>
                {/* Backdrop overlay */}
                <div
                    className="fixed inset-0 bg-[#0000009a] z-40"
                    onClick={handleCloseWhatsAppModal}
                />

                {/* Modal */}
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Send Invoice via WhatsApp
                            </h2>
                            <button
                                onClick={handleCloseWhatsAppModal}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="mb-4">
                                <label
                                    htmlFor="whatsapp-number"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    WhatsApp Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="whatsapp-number"
                                    type="tel"
                                    placeholder="Enter phone number (e.g., +966501234567)"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && isPhoneValid) {
                                            handleSendWhatsAppMessage();
                                        }
                                    }}
                                    autoFocus
                                    className={`w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition
                                    ${!whatsappNumber || whatsappNumber.trim() === ''
                                            ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                                            : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
                                        }`}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Include country code for international numbers
                                </p>
                                {whatsappNumber && whatsappNumber.trim() !== '' && !/\d{7,}/.test(whatsappNumber) && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Please enter a valid phone number (minimum 7 digits)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button
                                onClick={handleCloseWhatsAppModal}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendWhatsAppMessage}
                                disabled={!isPhoneValid || isSaving}
                                className={`px-4 py-2 rounded-md font-medium transition flex items-center gap-2
        ${isPhoneValid && !isSaving
                                        ? 'bg-green-700 hover:bg-green-700 text-white cursor-pointer'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating PDF…
                                    </>
                                ) : (
                                    'Send Message'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    };

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

    // ===== BREADCRUMB ACTIONS =====
    const breadcrumbActions = [
        {
            label: t("listBtn"),
            icon: Table,
            type: "secondary",
            title: "Go to invoice list",
            onClick: () => handleListNavigate(true), // ✅ Pass true to preserve filters
        },
        !isEditMode && {
            label: `Hold${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
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
            title: "Clear all form fields",
            onClick: clearForm,
        },
        canEdit && {
            label: t("submitBtn"),
            icon: isEditMode ? Pencil : SaveAll,
            type: "primary",
            title: isEditMode
                ? "Update the invoice (CTRL + S)"
                : "Save the invoice (CTRL + S)",
            onClick: handleSave,
            loading: isSaving,
            dataAttribute: "data-save-button",
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);
    const salesInvoiceShortcuts = [
        {
            heading: 'General',
            items: [
                { keys: ['Ctrl', 'S'], description: 'Save / Update invoice' },
                { keys: ['Ctrl', 'H'], description: 'Hold current invoice' },
            ],
        },
        {
            heading: 'Product Grid',
            items: [
                { keys: ['F4'], description: 'Show/hide purchase rate on focused row' },
                { keys: ['Ctrl', 'F2'], description: 'Edit product discription of focused row' },
                { keys: ['Alt', 'F9'], description: 'Toggle product sales bill history' },
                { keys: ['Alt', 'F11'], description: 'View product purchase history' },
                { keys: ['Enter'], description: 'Move to next field / add new row' },
                { keys: ['←', '→'], description: 'Move between editable columns' },
                { keys: ['↑', '↓'], description: 'Move between rows' },
            ],
        },
    ];

    const salesInvoiceManual = [
        {
            heading: 'Creating a New Invoice',
            steps: [
                'Select the customer from the customer dropdown. The billing and shipping address will auto-fill if available.',
                'Choose the Godown (warehouse), Form Type, and payment mode as needed.',
                'In the product grid, type a product name or scan a barcode to add an item.',
                'Enter the quantity, adjust the rate if needed, and the row totals update automatically.',
                'Press Enter after the last field of a row to jump to the next row, or a new row is added automatically.',
                'Review the Grand Total in the footer, then click Submit (or press Ctrl+S) to save the invoice.',
            ],
            note: 'You can select products "Against Quotation / Proforma / Order / Delivery Note" using the Against No dropdown at the top.',
        },
        {
            heading: 'Holding & Restoring Invoices',
            steps: [
                'Press Ctrl+H or click "Hold Invoice" to save the current invoice temporarily and start a new one.',
                'Click "Restore" (visible when held invoices exist) to see the list of held invoices.',
                'Click "Restore" on any held invoice card to bring it back into the form.',
                'If you restore while another unsaved invoice is in progress, the current one will automatically be held.',
            ],
        },
        {
            heading: 'Viewing an Existing Invoice',
            steps: [
                'Open an invoice from the invoice list to load it in view mode.',

                'Use the Print dropdown (top-right) to reprint, download as PDF, or send via WhatsApp.',
            ],
        },
        {
            heading: 'Printing & Sharing',
            steps: [
                'Choose your preferred invoice print layout from the "Print Type" dropdown at the top.',
                'Enable "Print After Save" to automatically print after saving; otherwise you will be asked if you want a PDF.',
                'In view mode, use the Print dropdown to print, save as PDF, or send the invoice link via WhatsApp.',
            ],
        },
        {
            heading: 'Discounts, Tax & Other Charges',
            steps: [
                'Use the Bill Discount fields (%, with tax, or amount) in the footer to apply an overall discount.',
                'Add Other Charges by selecting a ledger and entering the amount — this distributes proportionally across items.',
                'If Round Off is enabled in settings, adjust the rounding amount and direction (+/-) as needed.',
            ],
        },
    ];

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesInvoice.breadcrumb.master"), url: "#" },
                        { title: t("salesInvoice.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("salesInvoice.breadcrumb.title") }}
                    actions={breadcrumbActions}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className='bg-primary dark:bg-primary pb-20'>
            <PopupPreloader
                isOpen={isSaving || isPrinting}
                state="loading"
                title={isPrinting ? t("Printing") || "Preparing Print..." : t("loadingText")}
                subtitle={isPrinting ? t("printingDesc") || "Please wait while we prepare your invoice for printing..." : t("loadingDesc")}
            />
            <WhatsAppModal />
            <EmailModal />
            <HeldInvoicesPanel />
            <BreadCrumb
                routes={[
                    { title: t("salesInvoice.breadcrumb.master"), url: "#" },
                    { title: t("salesInvoice.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("salesInvoice.breadcrumb.title") }}
                actions={breadcrumbActions}

                customActions={
                    <div className="flex items-center gap-3">
                        {!isEditMode && (
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
                                {/* Form Type Dropdown */}

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
                                {
                                    invoiceTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))
                                }
                            </select>
                        )}
                        {isEditMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                onSendWhatsApp={handleSendWhatsApp}
                                onSendEmail={handleSendEmail}
                                loading={isPrinting}
                            />
                        )}
                    </div>
                }
                onHelpClick={() => setHelpOpen(true)}
            />

            <FormSectionMain
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                loadSalesModeData={loadSalesModeData}
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
                batches={batches}
                godowns={godowns}
                rows={formData?.salesDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, salesDetails: updatedRows }))}
                fetchLedgerBalance={fetchLedgerBalance}
                currentledgerBalance={currentledgerBalance}
                salesAccount={salesAccount}
                bank={bank}
                cash={cash}
                ledgerBalance={ledgerBalance}
                billingAddress={billingAddress}
                shippingAdderess={shippingAdderess}
                setBlillingAddress={setBlillingAddress}
                setShippingAddress={setShippingAddress}
                otherChargeLedgers={otherChargeLedgers}
                currency={currency}
                quotationData={quotationData}
                setQuotationData={setQuotationData}

                proformaData={profoemaData}
                setProformaData={setProformadata}

                salesOrderData={salesOrderData}
                setSalesOrderData={setSalesOrderData}

                deliveryNoteData={deliveryNoteData}
                setDeliveryNoteData={setDeliveryNoteData}
                genarateSalesInvoiceId={genarateSalesInvoiceId}
                setCustomers={setCustomers}
                fetchSalesHistoryByCustomerId={fetchSalesHistoryByCustomerId}
                salesHistory={salesHistory}
                updateCustomerId={updateCustomerId}
                setUpdateCustomerId={setUpdateCustomerId}
                stockData={stockData}
                customergroupData={customergroupData}
                fetchSalesMasterGroupedData={fetchSalesMasterGroupedData}
            />
            <HelpShortcuts
                title="Sales Invoice Help"
                groups={salesInvoiceShortcuts}
                manual={salesInvoiceManual}
                buttonPosition="bottom-6 right-22"
                showFloatingButton={false}
                open={helpOpen}
                onOpenChange={setHelpOpen}
            />
        </div>
    )
}

export default SalesInvoiceSkin