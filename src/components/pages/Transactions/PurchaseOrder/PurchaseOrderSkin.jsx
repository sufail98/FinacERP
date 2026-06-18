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
import useFormValidation from '@/lib/hooks/useFormValidation';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
// ✅ ADD THESE IMPORTS
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import purchaseOrderPrintOne from '@/utils/prints/purchaseOrderPrints/purchaseOrderPrintOne';

const PurchaseOrderSkin = () => {
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();

    const { purchaseOrdermasterId } = useParams();
    const editMode = Boolean(purchaseOrdermasterId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [batches, setBatches] = useState([]);
    const [godowns, setGodowns] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency, selectedBranchDetails } = useAuth();  // ✅ ADD selectedBranchDetails
    const [time, setTime] = useState("");
    const { generalSettings, financeSettings, purchaseSettings } = useSelector((state) => state.settings);  // ✅ ADD purchaseSettings
    const [resetTableKey, setResetTableKey] = useState(0);
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
        voucherType: "Purchase Order",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        DeliveryTerms: '',
        cancelled: false,
        Certificate: '',
        PaymentTerms: '',
        ledgerId: financeSettings.defaultPurchaseAccount || '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        taxType: 'Applicable to product',
        costCentreId: '',
        BatchId: '',
        partyName: '',
        partyAddress: '',
        partyMobile: '',
        partyVatNo: '',
        partyRefNo: "",
        partyRefDate: "",
        dueDate: "",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        transportCompany: "",
        narration: "",
        taxableAmt: "",
        subTotal: "",
        totalTax: "",
        additionalCost: 0,
        billDiscount: 0,
        roundoff: 0,
        totalAmount: "",
        branchId: selectedBranchId,
        CreatedUser: userId,
        OtherCharge: 0,
        // ✅ ADD PRINT FIELDS
        printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
        printType: 'a4',
        purchaseDetails: [
            {
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

    const [baseDataloading, setBaseDataloading] = useState(false);
    const [currency, setCurrencies] = useState([]);

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
        const getSalesRequiredData = async () => {
            setBaseDataloading(true);
            try {
                const res = await axiosInstance.post('all-purchase-data', {
                    voucherType: "Purchase Order", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId, ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId
                });
                const data = res?.data?.data;

                const filteredCurrencies = data?.currencies?.filter(
                    c => c.branchid_conversion == selectedBranchId
                ) || [];
                setCurrencies(filteredCurrencies);

                setInvoiceId(data?.voucherdata?.voucherCode);
                setEmployees(data?.employees);
                setGodowns(data?.godowns);
                setPricingLevel(data?.pricinglevel);
                setBatches(data?.transactionbatch);
                setCustomers(data?.customersupplierLedgers);
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
                // In edit mode, getSalesById sets billingAddress and partyName from saved data
            } catch (error) {
                console.error('error fetching default data', error);
            } finally {
                setBaseDataloading(false);
            }
        };
        getSalesRequiredData();
    }, []);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultPurchaseAccount || '',
        }));
    }, [financeSettings, batches]);

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
        navigate("/transaction/purchase-order/purchase-order-list");
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
            voucherType: "Purchase Order",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: financeSettings.defaultPurchaseAccount || '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            taxType: 'Applicable to product',
            costCentreId: '',
            BatchId: '',
            partyName: '',
            partyAddress: '',
            partyMobile: '',
            partyVatNo: '',
            DeliveryTerms: '',
            cancelled: false,
            Certificate: '',
            PaymentTerms: '',
            partyRefNo: "",
            partyRefDate: "",
            dueDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            transportCompany: "",
            narration: "",
            taxableAmt: "",
            subTotal: "",
            totalTax: "",
            additionalCost: 0,
            billDiscount: 0,
            roundoff: 0,
            totalAmount: "",
            branchId: selectedBranchId,
            CreatedUser: userId,
            OtherCharge: 0,
            // ✅ KEEP PRINT FIELDS ON CLEAR
            printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
            printType: 'a4',
            purchaseDetails: [
                {
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
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getSalesById();
        }
    }, [editMode]);

    const getSalesById = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-purchase-order-byId/${purchaseOrdermasterId}`);
            const data = response.data.data;

            setExistingInvoiceNo(data.orderNo);

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
                        PurchaseRate: parseFloat(item.PurchaseRate) || 0,
                        taxAmount: parseFloat(item.taxAmount) || 0,
                        grossAmount: parseFloat(item.grossAmount) || 0,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        billDiscOnProduct: item.billDiscOnProduct,
                        AddCostonProduct: item.AddCostonProduct,
                        otherchargeonproduct: item.otherchargeonproduct,
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
                voucherType: "Purchase Order",
                yearId: currentFinancialYear?.yearId,
                DeliveryTerms: data.DeliveryTerms,
                cancelled: data.cancelled || false,
                Certificate: data.Certificate,
                PaymentTerms: data.PaymentTerms,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCentreId,
                BatchId: Number(data.BatchId),
                partyName: data.partyName,
                partyAddress: data.partyAddress,
                partyMobile: data.partyMobile,
                partyVatNo: data.partyVatNo,
                partyRefNo: data.partyRefNo,
                partyRefDate: data.partyRefDate ? parseDateFromAPI(data.partyRefDate) : "",
                dueDate: data.dueDate ? parseDateFromAPI(data.dueDate) : "",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseDateFromAPI(data.exchangeDate) : "",
                transportCompany: data.transportCompany,
                narration: data.narration,
                taxableAmt: data.taxableAmt,
                subTotal: data.subTotal,
                totalTax: data.totalTax,
                additionalCost: data.additionalCost ? parseFloat(data.additionalCost) : 0,
                billDiscount: data.billDiscount ? parseFloat(data.billDiscount) : 0,
                roundoff: data.roundoff ? parseFloat(data.roundoff) : 0,
                totalAmount: data.totalAmount,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                OtherCharge: data.OtherCharge ? parseFloat(data.OtherCharge) : 0,
                purchaseDetails: salesDetailsWithProducts,
            }));
            setBlillingAddress({
                name: data.partyName || '',
                email: data.partyEmail || '',
                phoneNo: data.partyMobile || '',
                vatNo: data.partyVatNo || '',
                address: data.partyAddress || ''
            });

            setResetTableKey((prev) => prev + 1);
        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false);
        }
    };

    // ✅ ADD PRINT HELPER FUNCTIONS (mirrored from PurchaseInvoiceSkin)
    const buildInvoiceDataForPrint = useCallback((orderNumber, qrLink) => {
        return {
            ...formData,
            invoiceNo: orderNumber,
            date: formData.date,
            purchaseDetails: formData.purchaseDetails,
            qr_link: qrLink || formData.qr_link,
        };
    }, [formData]);

    const printToPrinterFn = useCallback((invoiceDataForPrint) => {
        if (formData.printType === 'a4') {
            purchaseOrderPrintOne(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
        }
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
                ledgerTypes: ["Supplier"], branchId: selectedBranchId
            });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false);

    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true);
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Purchase Order&branchId=${selectedBranchId}&yearId=${Number(currentFinancialYear?.yearId)}`
            );
            setInvoiceId(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false);
        }
    };

    const validateFormData = () => {
        const errors = [];
        if (!formData.ledgerId) errors.push('Please select a customer');
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
            errors.push('Product rate cannot be 0. Please enter a valid rate for all products.');
        }
        return errors;
    };

    const validationRules = {
        ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;
        if (formData.BillBalanceAmount < 0) {
            setAlert({ id: Date.now(), type: "error", message: t("salesInvoice.alert.billBalanceAmtError") });
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
                ? `update-purchase-order/${purchaseOrdermasterId}`
                : 'save-purchase-order';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

                const orderNumber = editMode ? existingInvoiceNo : response.data.orderNo || invoiceId;

                // ✅ PRINT LOGIC (mirrored from PurchaseInvoiceSkin)
                if (formData.printAfterSave) {
                    const invoiceDataForPrint = buildInvoiceDataForPrint(orderNumber, null);
                    printToPrinterFn(invoiceDataForPrint);
                } else {
                    const pdfResult = await Swal.fire({
                        title: 'Print as PDF?',
                        text: 'Do you want to download this order as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, Download PDF',
                        cancelButtonText: 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            const invoiceDataForPrint = buildInvoiceDataForPrint(orderNumber, null);
                            printToPrinterFn(invoiceDataForPrint);
                        }, 500);
                    }
                }

                if (purchaseSettings.CloseAfterSave) {
                    navigate('/transaction/purchase-order/purchase-order-list');
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
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save Purchase Order',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode, buildInvoiceDataForPrint, printToPrinterFn]);

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
                        { title: t("purchaseOrder.breadcrumb.master"), url: "#" },
                        { title: t("purchaseOrder.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("purchaseOrder.breadcrumb.editTitle") : t("purchaseOrder.breadcrumb.title") }}
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
                    { title: t("purchaseOrder.breadcrumb.master"), url: "#" },
                    { title: t("purchaseOrder.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("purchaseOrder.breadcrumb.editTitle") : t("purchaseOrder.breadcrumb.title") }}
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
                                    id="printAfterSavePurchaseOrder"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSavePurchaseOrder"
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
                batches={batches}
                pricingLevel={pricingLevel}
                godowns={godowns}
                fetchEmployees={fetchEmployees}
                fetchCustomer={fetchCustomer}
                rows={formData?.purchaseDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, purchaseDetails: updatedRows }))}
                setBlillingAddress={setBlillingAddress}
                billingAddress={billingAddress}
                setCurrentLedgerBalance={setCurrentLedgerBalance}
                currentledgerBalance={currentledgerBalance}
                otherChargeLedgers={otherChargeLedgers}
                currency={currency}
            />
        </div>
    );
};

export default PurchaseOrderSkin;