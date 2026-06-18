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
import purchaseInvoicePrintOne from '@/utils/prints/purchaseInvoicePrints/purchaseInvoicePrintOne';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';

const PurchaseQuotationSkin = () => {
    const { purchaseQuotationmasterId } = useParams();
    const editMode = Boolean(purchaseQuotationmasterId);
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
    const [time, setTime] = useState("");
    const { generalSettings, purchaseSettings, financeSettings } = useSelector((state) => state.settings);
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
    const [updateCustomerId, setUpdateCustomerId] = useState(null);


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
        branchId: selectedBranchId,
        yearId: currentFinancialYear?.yearId,
        voucherType: "Purchase Quotation",
        printAfterSave: purchaseSettings?.printAfterSave || false,
        date: new Date(),
        dueDate: "",

        ledgerId: financeSettings?.defaultPurchaseAccount || "",

        partyName: "",
        partyAddress: "",
        partyMobile: "",
        partyVatNo: "",

        partyRefNo: "",
        partyRefDate: "",

        narration: "",

        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        exchangeRate: currentCurrencyConversion?.rate,

        costCentreId: 1,
        BatchId: "",

        taxType: "GST",

        subTotal: 0,
        billDiscount: 0,
        additionalCost: 0,
        OtherCharge: 0,
        otherChargeLedgerId: "",

        taxableAmt: 0,
        totalTax: 0,
        roundoff: 0,
        totalAmount: 0,

        transportCompany: "",
        PaymentTerms: "",
        Certificate: "",
        DeliveryTerms: "",

        cancelled: false,

        CreatedUser: userId,

        quotationDetails: [
            {
                productCode: "",
                qty: 0,
                freeQty: 0,
                rate: 0,
                unitId: null,
                amount: 0,
                ConversionFactor: 1,
                barcode: "",

                discountPercentage: 0,
                taxId: null,
                taxType: "GST",
                taxAmount: 0,

                grossAmount: 0,
                netAmount: 0,

                billDiscOnProduct: 0,
                AddCostOnProduct: 0,
                OtherChargeOnProduct: 0,

                productDEscription: ""
            }
        ]
    });
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
        setFormData(prev => ({
            ...prev,
            ledgerId: financeSettings?.defaultPurchaseAccount || '',
        }));
    }, [financeSettings, batches]);
    const [baseDataloading, setBaseDataloading] = useState(false)

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-purchase-data', {
                    voucherType: "Purchase Quotation", branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId, ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId, currencyId: currentCurrency.currencyId
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
                    }));
                }
                setFormData(prev => ({
                    ...prev,
                    customerData: data?.customeraddress,
                    BatchId: data?.transactionbatch?.length > 0 ? data.transactionbatch[0].transactionbatchid : ''
                }));



                setBlillingAddress({
                    name: data?.customeraddress?.ledgerName || '',
                    email: data?.customeraddress?.email || '',
                    phoneNo: data?.customeraddress?.phoneNo || '',
                    vatNo: data?.customeraddress?.tinNumber || '',
                    address: data?.customeraddress?.address || ''
                });

                setUpdateCustomerId(financeSettings?.defaultPurchaseAccount || null)
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
        navigate("/transaction/purchase-quotation/purchase-quotation-list");
    };
    //  Clear Form Function
    const clearForm = () => {
        setFormData({
            branchId: selectedBranchId,
            yearId: currentFinancialYear?.yearId,
            voucherType: "Purchase Quotation",

            date: new Date(),
            dueDate: "",

            ledgerId: financeSettings?.defaultPurchaseAccount || "",

            partyName: "",
            partyAddress: "",
            partyMobile: "",
            partyVatNo: "",

            partyRefNo: "",
            partyRefDate: "",

            narration: "",

            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            exchangeRate: currentCurrencyConversion?.rate,

            costCentreId: 1,
            BatchId: "",

            taxType: "GST",

            subTotal: 0,
            billDiscount: 0,
            additionalCost: 0,
            OtherCharge: 0,
            otherChargeLedgerId: "",

            taxableAmt: 0,
            totalTax: 0,
            roundoff: 0,
            totalAmount: 0,

            transportCompany: "",
            PaymentTerms: "",
            Certificate: "",
            DeliveryTerms: "",

            cancelled: false,

            CreatedUser: userId,

            quotationDetails: [
                {
                    productCode: "",
                    qty: 0,
                    freeQty: 0,
                    rate: 0,
                    unitId: null,
                    amount: 0,
                    ConversionFactor: 1,
                    barcode: "",

                    discountPercentage: 0,
                    taxId: null,
                    taxType: "GST",
                    taxAmount: 0,

                    grossAmount: 0,
                    netAmount: 0,

                    billDiscOnProduct: 0,
                    AddCostOnProduct: 0,
                    OtherChargeOnProduct: 0,

                    productDEscription: ""
                }
            ]
        });

        // 👇 Force table reset
        setResetTableKey(prev => prev + 1);
    };
    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])


    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`purchase-quotation/show-byId/${purchaseQuotationmasterId}`);
            const data = response.data.data[0];

            setExistingInvoiceNo(data.orderNo)

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxData = taxResponse.data.data || [];

            const salesDetailsWithProducts = await Promise.all(
                (data.details || []).map(async (item) => {
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

                    // Find tax rate from taxData
                    const taxInfo = taxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

                    // Fetch product details
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
                voucherType: "Purchase Quotation",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                dueDate: data.dueDate ? parseDateFromAPI(data.dueDate) : "",
                partyRefDate: data.partyRefDate ? parseDateFromAPI(data.partyRefDate) : "",
                partyRefNo: data.partyRefNo || '',
                ledgerId: data.ledgerId,
                currencyConversionId: data.currencyConversionId,
                taxType: data.taxType,
                costCentreId: data.costCenterId,
                BatchId: data.BatchId,
                customerName: data.customerName,
                CustomerAddress: data.CustomerAddress,
                CustomerPhone: data.CustomerPhone,
                customerVATNo: data.customerVATNo,
                refDate: data.refDate ? new Date(data.refDate) : "",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                orderMasterId: data.orderMasterId,
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
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                vatLedgerId: data.vatLedgerId,
                PaymentTerms: data.PaymentTerms,
                Certificate: data.Certificate,
                DeliveryTerms: data.DeliveryTerms,
                cancelled: data.cancelled,
                quotationDetails: salesDetailsWithProducts,
            }));


            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };


    // Separate useEffect for godowns - depends on branch details


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
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Purchase Quotation&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
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

        if (!formData.quotationDetails || formData.quotationDetails.length === 0) {
            errors.push('Please add at least one product');
        }

        const hasValidProducts = formData.quotationDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');

        const hasZeroRate = formData.quotationDetails.some(
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

        if (generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: editMode ? t("ConfirmUpdateTitle") : t('ConfirmSaveTitle'),
                text: editMode ? t("ConfirmUpdateText") : t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: editMode ? t("YesUpdate") : t('YesSave'),
                cancelButtonText: t('Cancel'),
            });

            if (!result.isConfirmed) return;
        }
        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date)
            };
            const api = editMode ? `purchase-quotation/update/${purchaseQuotationmasterId}` : 'purchase-quotation/store'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t("saveSuccess"),
                });
                // Get the saved invoice data
                const savedInvoiceData = dataToSave;
                const invoiceNumber = invoiceId;

                // Print invoice if enabled
                if (formData.printAfterSave) {
                    // Prepare invoice data for printing
                    const invoiceDataForPrint = {
                        ...savedInvoiceData,
                        invoiceNo: invoiceNumber,
                        date: savedInvoiceData.date || formData.date,
                        purchaseDetails: savedInvoiceData.purchaseDetails || formData.purchaseDetails
                    };

                    // Call print function
                    setTimeout(() => {
                        if (formData.printType === 'a4') {
                            purchaseInvoicePrintOne(invoiceDataForPrint, selectedBranchDetails, time, null, currentCurrency);
                        }
                        //  else if (formData.printType === 'thermal') {
                        //     printThermalInvoice(invoiceDataForPrint, selectedBranchDetails, time);
                        // }
                    }, 500);
                }
                if (purchaseSettings.CloseAfterSave) {
                    navigate('/transaction/purchase-quotation/purchase-quotation-list')
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
                    'Failed to save Purchase Invoice',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Detect Ctrl+S or Cmd+S
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault(); // Prevent browser save dialog
                handleSave(); // Trigger save
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
                        { title: t("purchaseQuotation.breadcrumb.group"), url: "#" },
                        { title: t("purchaseQuotation.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: editMode ? t("purchaseQuotation.breadcrumb.editTitle") : t("purchaseQuotation.breadcrumb.title") }}
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
                    { title: t("purchaseQuotation.breadcrumb.group"), url: "#" },
                    { title: t("purchaseQuotation.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: editMode ? t("purchaseQuotation.breadcrumb.editTitle") : t("purchaseQuotation.breadcrumb.title") }}
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
                rows={formData?.quotationDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, quotationDetails: updatedRows }))}
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
                updateCustomerId={updateCustomerId}
                setUpdateCustomerId={setUpdateCustomerId}
            />
        </div>
    )
}

export default PurchaseQuotationSkin