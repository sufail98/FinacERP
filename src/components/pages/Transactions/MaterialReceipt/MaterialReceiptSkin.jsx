import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, Loader2, Pencil, ReceiptText, SaveAll, Table } from 'lucide-react';
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
import { formatDateWithTime, parseDateFromAPI, parseLocalDate } from '@/lib/dateFormat';
// ✅ ADD THESE IMPORTS
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import materialRecieptPrintOne from '@/utils/prints/materialRecieptPrints/materialRecieptPrintOne';

const MaterialReceiptSkin = () => {
    const { materialReceiptId } = useParams();
    const editMode = Boolean(materialReceiptId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingReceiptNo, setExistingReceiptNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [godowns, setGodowns] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [receiptId, setReceiptId] = useState('');
    const [alert, setAlert] = useState(null);
    // ✅ ADD selectedBranchDetails
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency, selectedBranchDetails } = useAuth();
    const [time, setTime] = useState("");
    // ✅ ADD purchaseSettings to destructure (already present, kept)
    const { generalSettings, purchaseSettings, financeSettings } = useSelector((state) => state.settings);
    const [currency, setCurrencies] = useState([]);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [batches, setBatches] = useState([]);
    const [billingAddress, setBlillingAddress] = useState(null);
    const [currentledgerBalance, setCurrentLedgerBalance] = useState('');
    const [otherChargeLedgers, setOtherChargLedgers] = useState([]);

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
        voucherType: "Material Receipt",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: 'Applicable to product',
        GodownId: '',
        costCentreId: '',
        BatchId: '',
        partyName: '',
        partyAddress: '',
        partyMobile: '',
        partyVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        orderMasterId: "",
        AgainstNo: "",
        transportCompany: "",
        narration: "",
        taxableAmt: "",
        subTotal: "",
        totalTax: "",
        additionalCost: "",
        othercharge: "",
        billDiscount: "",
        roundoff: "",
        totalAmount: "",
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        // ✅ ADD PRINT FIELDS
        printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
        printType: 'a4',
        materialDetails: [
            {
                orderDetails1Id: "",
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
                otherchargeOnProduct: null,
                GodownId: null,
                RackId: null,
                branchId: selectedBranchId
            }
        ]
    });

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
        const defaultGodown = godowns?.find(g => g.IsDefault);
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultPurchaseAccount || '',
            GodownId: defaultGodown?.GodownId || ''
        }));
    }, [financeSettings, godowns]);

    const [baseDataloading, setBaseDataloading] = useState(false);

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true);
            try {
                const res = await axiosInstance.post('all-purchase-data', {
                    voucherType: "Material Receipt", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId, ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId
                });
                const data = res?.data?.data;

                const filteredCurrencies = data?.currencies?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);

                setReceiptId(data?.voucherdata?.voucherCode);
                setEmployees(data?.employees);
                setGodowns(data?.godowns);
                setPricingLevel(data?.pricinglevel);
                setBatches(data?.transactionbatch);
                setSuppliers(data?.customersupplierLedgers);
                setCostCenters(data?.costcentre);
                setCurrentLedgerBalance(data?.LedgerBalance.currentbal);
                setOtherChargLedgers(data?.othercharge);
                if (data?.salesAccount?.length > 0 && !formData.salesAccount) {
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
                if (!editMode) {
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
                }
            } catch (error) {
                console.error('error fetching default data', error);
            } finally {
                setBaseDataloading(false);
            }
        };
        getSalesRequiredData();
    }, []);

    const handleListNavigate = async () => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t('ConfirmCloseTitle'), text: t('ConfirmCloseText'),
                icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesClose'), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        navigate("/transaction/material-receipt/list");
    };

    const clearForm = async (skipConfirmation = false) => {
        skipConfirmation = skipConfirmation === true;
        if (!skipConfirmation && generalSettings?.askConfirmationClear) {
            const result = await Swal.fire({
                title: t('ConfirmClearTitle'), text: t('ConfirmClearText'),
                icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesClear'), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        setFormData({
            voucherType: "Material Receipt",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            GodownId: '',
            costCentreId: '',
            BatchId: '',
            partyName: '',
            partyAddress: '',
            partyMobile: '',
            partyVatNo: '',
            partyRefNo: "",
            partyRefDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            orderMasterId: "",
            AgainstNo: "NA",
            transportCompany: "",
            narration: "",
            taxableAmt: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            othercharge: "",
            billDiscount: "",
            roundoff: "",
            totalAmount: "",
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            // ✅ KEEP PRINT FIELDS ON CLEAR
            printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
            printType: 'a4',
            materialDetails: [
                {
                    orderDetails1Id: "",
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
                    GodownId: null,
                    RackId: null,
                    branchId: selectedBranchId
                }
            ]
        });
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getMaterialReceiptById();
        }
    }, [editMode]);

  const fetchAgainstModeDetailes = async (mode, masterId) => {
    setFetchLoading(true);
    try {
        let data;
        let againstNoValue = 'NA';

        if (mode === 'Order') {
            const response = await axiosInstance.post(`material-receipt-purchase-order-details`, {
                receiptmasterId: null,
                ordermasterId: masterId
            });
            data = response.data.data;
            againstNoValue = 'Order';
        }

        setExistingReceiptNo(data.receieptNo || data.orderNo || data.voucherNo);

        const taxResponse = await axiosInstance.get("tax-masters");
        const taxMasterData = taxResponse.data.data || [];

        // ✅ response uses materialDetails with proper camelCase
        const detailsArray = data.materialDetails || [];

        const materialReceiptDetailsWithProducts = await Promise.all(
            detailsArray.map(async (item) => {
                const productCode = item.productCode || item.productcode || '';
                const unitId = item.unitId ?? item.unitid ?? null;
                const orderDetails1Id = item.orderDetails1Id ?? item.orderdetails1id ?? '';
                const barcode = item.barcode || '';
                const qty = item.qty;
                const rate = item.rate;
                const freeQty = item.freeQty ?? item.freeqty ?? null;
                const discountPercentage = item.discountPercentage ?? item.discountpercentage ?? 0;
                const taxAmountRaw = parseFloat(item.taxAmount ?? item.taxamount ?? 0);
                const grossAmount = parseFloat(item.grossAmount ?? item.grossamount ?? 0);
                const netAmount = parseFloat(item.netAmount ?? item.netamount ?? 0);
                const amount = item.amount;
                const conversionFactor = item.ConversionFactor ?? item.conversionfactor ?? null;
                const billDiscOnProduct = item.billDiscOnProduct ?? item.billdisconproduct ?? null;
                const addCostonProduct = item.AddCostonProduct ?? item.addcostonproduct ?? null;
                const otherchargeonproduct = item.OtherChargeOnProduct ?? item.otherchargeonproduct ?? null;
                const productDescription = item.productDescription ?? item.productdescription ?? '';

                // ✅ taxId is present in this response, but also infer as fallback
                const rawTaxId = item.taxId ?? item.taxid ?? null;
                let taxInfo = taxMasterData.find(t => t.taxId === rawTaxId);
                if (!taxInfo && taxAmountRaw > 0 && netAmount > 0) {
                    const impliedRate = (taxAmountRaw / netAmount) * 100;
                    taxInfo = taxMasterData.find(t =>
                        Math.abs(parseFloat(t.rate) - impliedRate) < 0.01
                    );
                }
                const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;
                const resolvedTaxId = taxInfo ? taxInfo.taxId : rawTaxId;

                let productName = '';
                let availableUnits = [];
                let productDetails = {
                    productCode,
                    barcode,
                    partNo: item.PartNo || item.partNo || item.partno || '',
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
                            partNo: productData.partNo || item.PartNo || '',
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
                    orderDetails1Id,                        // ✅ correct field
                    materialReceiptDetails1Id: '',          // new record, no ID yet
                    materialReceiptMasterId: '',
                    productCode,
                    productName,
                    qty: parseFloat(qty) || 0,
                    freeQty: freeQty ? parseFloat(freeQty) : null,
                    rate: parseFloat(rate) || 0,
                    unitId,
                    discountPercentage: parseFloat(discountPercentage) || 0,
                    taxId: resolvedTaxId,                   // ✅ resolved
                    taxRate,
                    tax: taxRate,                           // ✅ needed by table calculateRow
                    taxType: item.taxType || item.taxtype || 'Excluded',
                    ConversionFactor: conversionFactor,
                    barcode,
                    taxAmount: taxAmountRaw,
                    taxAmt: taxAmountRaw,                   // ✅ pre-set for table display
                    grossAmount,
                    netAmount,
                    amount: parseFloat(amount) || 0,
                    productDescription,
                    billDiscOnProduct: parseFloat(billDiscOnProduct) || 0,
                    AddCostonProduct: addCostonProduct,
                    otherchargeonproduct,
                    GodownId: item.GodownId ?? item.godownid ?? null,
                    RackId: item.RackId ?? item.rackid ?? null,
                    branchId: item.branchId ?? item.branchid ?? selectedBranchId,
                    availableUnits,
                    productDetails
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
            voucherType: "Material Receipt",
            yearId: currentFinancialYear?.yearId,
            date: parseDateFromAPI(data.date),
            ledgerId: data.ledgerId,
            currencyConversionId: data.currencyConversionId,
            taxType: data.taxType,
            // ✅ GodownId from header or first row
            GodownId: data.GodownId ?? data.godownid ??
                detailsArray[0]?.GodownId ?? detailsArray[0]?.godownid ?? prev.GodownId,
            costCentreId: data.costCentreId ?? data.costcentreid ?? '',
            BatchId: data.BatchId ?? data.batchid ?? '',
            partyName: data.partyName || '',
            partyAddress: data.partyAddress || '',
            partyMobile: data.partyMobile || '',
            partyVatNo: data.partyVatNo || '',
            partyRefNo: data.partyRefNo || '',
            partyRefDate: data.partyRefDate ? parseDateFromAPI(data.partyRefDate) : '',
            exchangeRate: data.exchangeRate,
            exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : '',
            // ✅ set orderMasterId so the link is preserved on save
            orderMasterId: masterId,
            AgainstNo: againstNoValue,
            transportCompany: data.transportCompany || '',
            narration: data.narration || '',
            taxableAmt: data.taxableAmt,
            subTotal: data.subTotal,
            totalTax: data.totalTax,
            additionalCost: data.additionalCost,
            // ✅ order response uses OtherCharge (capital O)
            othercharge: data.othercharge ?? data.OtherCharge ?? '',
            billDiscount: data.billDiscount,
            roundoff: data.roundoff,
            totalAmount: data.totalAmount,
            postedStatus: data.postedStatus || prev.postedStatus,
            postedBy: data.postedBy || prev.postedBy,
            postedDate: data.postedDate ? new Date(data.postedDate) : '',
            branchId: data.branchId || prev.branchId,
            CreatedUser: data.CreatedUser || prev.CreatedUser,
            materialDetails: materialReceiptDetailsWithProducts,
        }));

        setResetTableKey((prev) => prev + 1);

    } catch (error) {
        console.error("Error fetching against order data", error);
    } finally {
        setFetchLoading(false);
    }
};
    const getMaterialReceiptById = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-material-receipt-byId/${materialReceiptId}`);
            const data = response.data.data;

            setExistingReceiptNo(data.receieptNo);

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxData = taxResponse.data.data || [];

            const materialReceiptDetailsWithProducts = await Promise.all(
                (data.materialDetails || []).map(async (item) => {
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
                        materialReceiptDetails1Id: item.materialReceiptDetails1Id,
                        materialReceiptMasterId: item.materialReceiptMasterId,
                        orderDetails1Id: item.orderDetails1Id,
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
                voucherType: "Material Receipt",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                GodownId: data.materialDetails[0]?.GodownId || Number(data.GodownId),
                costCentreId: data.costCentreId,
                BatchId: data.BatchId,
                partyName: data.partyName,
                partyAddress: data.partyAddress,
                partyMobile: data.partyMobile,
                partyVatNo: data.partyVatNo,
                partyRefNo: data.partyRefNo,
                partyRefDate: data.partyRefDate ? parseDateFromAPI(data.partyRefDate) : "",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                orderMasterId: data.orderMasterId,
                AgainstNo: data.AgainstNo,
                transportCompany: data.transportCompany,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost,
                othercharge: data.othercharge,
                billDiscount: data.billDiscount,
                roundoff: data.roundoff,
                totalAmount: data.totalAmount,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                materialDetails: materialReceiptDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);
        } catch (error) {
            console.error("Error fetching material receipt data", error);
        } finally {
            setFetchLoading(false);
        }
    };

    // ✅ ADD PRINT HELPER FUNCTIONS
    const buildReceiptDataForPrint = useCallback((receiptNumber, qrLink) => {
        return {
            ...formData,
            invoiceNo: receiptNumber,
            date: formData.date,
            // Material receipt uses materialDetails; map to purchaseDetails for the print template
            purchaseDetails: formData.materialDetails,
            qr_link: qrLink || formData.qr_link,
        };
    }, [formData]);

    const printToPrinterFn = useCallback((receiptDataForPrint) => {
        if (formData.printType === 'a4') {
            materialRecieptPrintOne(receiptDataForPrint, selectedBranchDetails, time, null, currentCurrency);
        }
    }, [formData.printType, selectedBranchDetails, time, currentCurrency]);

    const handleReprintToPrinter = useCallback(() => {
        const receiptDataForPrint = buildReceiptDataForPrint(existingReceiptNo, formData.qr_link);
        printToPrinterFn(receiptDataForPrint);
    }, [buildReceiptDataForPrint, existingReceiptNo, formData.qr_link, printToPrinterFn]);

    const handleReprintToPdf = useCallback(() => {
        const receiptDataForPrint = buildReceiptDataForPrint(existingReceiptNo, formData.qr_link);
        printToPrinterFn(receiptDataForPrint);
    }, [buildReceiptDataForPrint, existingReceiptNo, formData.qr_link, printToPrinterFn]);

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        pricingLevel: false,
        suppliers: false,
        godowns: false,
        purchaseOrders: false,
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

    const fetchSupplier = async () => {
        setLoading(prev => ({ ...prev, suppliers: true }));
        try {
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: ["Supplier"], branchId: selectedBranchId
            });
            setSuppliers(data.data);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
        }
    };

    const fetchPurchaseOrders = async () => {
        setLoading(prev => ({ ...prev, purchaseOrders: true }));
        try {
            const { data } = await axiosInstance.post("purchase-orders");
            setPurchaseOrders(data.data);
        } catch (err) {
            console.error("Failed to fetch purchase orders:", err);
        } finally {
            setLoading(prev => ({ ...prev, purchaseOrders: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false);

    const generateMaterialReceiptId = async () => {
        setVoucherNumberGenarating(true);
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Material Receipt&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
            );
            setReceiptId(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false);
        }
    };

    const validateFormData = () => {
        const errors = [];
        if (!formData.ledgerId) errors.push('Please select a supplier');
        if (!formData.date) errors.push('Please select receipt date');
        if (!formData.materialDetails || formData.materialDetails.length === 0) {
            errors.push('Please add at least one product');
        }
        const hasValidProducts = formData.materialDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');
        return errors;
    };

    const handleSave = useCallback(async () => {
        if (formData.BillBalanceAmount < 0) {
            setAlert({ id: Date.now(), type: "error", message: t("materialReceipt.alert.billBalanceAmtError") });
            return;
        }
        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            setAlert({ id: Date.now(), type: "error", message: validationErrors.join('\n') });
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
            const api = editMode
                ? `update-material-receipt/${materialReceiptId}`
                : 'save-material-receipt';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

                const receiptNumber = editMode ? existingReceiptNo : response.data.receieptNo || receiptId;

                // ✅ PRINT LOGIC
                if (formData.printAfterSave) {
                    const receiptDataForPrint = buildReceiptDataForPrint(receiptNumber, null);
                    printToPrinterFn(receiptDataForPrint);
                } else {
                    const pdfResult = await Swal.fire({
                        title: 'Print as PDF?',
                        text: 'Do you want to download this receipt as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, Download PDF',
                        cancelButtonText: 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            const receiptDataForPrint = buildReceiptDataForPrint(receiptNumber, null);
                            printToPrinterFn(receiptDataForPrint);
                        }, 500);
                    }
                }

                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/material-receipt/list');
                }
                if (!editMode) {
                    generateMaterialReceiptId();
                    clearForm(true);
                }
            }
        } catch (error) {
            console.error('Error saving material receipt:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save material receipt',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode, buildReceiptDataForPrint, printToPrinterFn]);

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

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("materialReceipt.breadcrumb.master"), url: "#" },
                        { title: t("materialReceipt.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("materialReceipt.breadcrumb.editTitle") : t("materialReceipt.breadcrumb.title") }}
                    actions={[{ label: t("listBtn"), icon: Table, type: "secondary", onClick: handleListNavigate }]}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("materialReceipt.breadcrumb.master"), url: "#" },
                    { title: t("materialReceipt.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("materialReceipt.breadcrumb.editTitle") : t("materialReceipt.breadcrumb.title") }}
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
                        icon: isSaving ? Loader2 : editMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ]}
                // ✅ ADD customActions WITH PRINT CONTROLS
                customActions={
                    <div className="flex items-center gap-3">
                        {!editMode && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSaveMaterialReceipt"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSaveMaterialReceipt"
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
                batches={batches}
                loading={loading}
                existingInvoiceNo={existingReceiptNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={receiptId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                costCenters={costCenters}
                suppliers={suppliers}
                pricingLevel={pricingLevel}
                godowns={godowns}
                purchaseOrders={purchaseOrders}
                fetchEmployees={fetchEmployees}
                fetchSupplier={fetchSupplier}
                rows={formData?.materialDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, materialDetails: updatedRows }))}
                setBlillingAddress={setBlillingAddress}
                billingAddress={billingAddress}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                currentledgerBalance={currentledgerBalance}
                otherChargeLedgers={otherChargeLedgers}
                currency={currency}
                fetchAgainstModeDetailes={fetchAgainstModeDetailes}
            />
        </div>
    );
};

export default MaterialReceiptSkin;