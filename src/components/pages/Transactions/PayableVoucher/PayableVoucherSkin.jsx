import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
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
import PopupPreloader from '@/components/common/PopupPreloader';
import PrintDropdown from '@/components/common/PrintDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import { showToast } from '@/utils/toast';
import printPayableVoucher, { savePayableVoucherAsPDF } from '@/utils/prints/payableVoucherPrints/PayableVoucherPrintOne';
import { isElectron } from '@/utils/electronPrint';

const PayableVoucherSkin = () => {
    const { payableVoucherId } = useParams();
    const editMode = Boolean(payableVoucherId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, selectedBranchDetails, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, purchaseSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [currency, setCurrency] = useState([]);
    const [currencyConvertionData, setCurrencyConvertionData] = useState([]);

    // ===== PRINT STATE =====
    const [isPrinting, setIsPrinting] = useState(false);

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
        voucherType: "Payable Voucher",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: (financeSettings?.defaultPurchaseAccount) || '',
        employeeId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        costCentreId: '',
        partyName: '',
        partyAddress: '',
        partyPhone: '',
        partyVatNo: '',
        ReferenceNo: "",
        ReferenceDate: "",
        taxType: "NA",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : (purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : false),
        narration: "",
        totalTax: "",
        totalAmount: "",
        paymentMode: "cash",
        CashRefNo: "",
        CashAmount: "",
        CashLedgerId: financeSettings?.DefaultCashAccount,
        BankLedgerId: financeSettings?.DefaultBankAccount,
        BankRefNo: "",
        BankAmount: 0,
        BillBalanceAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
               vatLedgerId: generalSettings?.taxLedgerId,

        payableDetails: [
            {
                SlNo: "",
                ledgerId: "",
                amount: null,
                discAmt: null,
                discPerc: null,
                netAmount: null,
                taxId: null,
                taxRate: null,
                taxType: "Excluded",
                taxAmount: null,
                chequeNo: "",
                chequeDate: null,
                narration: "",
                totalAmount: null,
                branchId: selectedBranchId
            }
        ]
    });

    // useEffect(() => {
    //     if (editMode) return;

    //     const now = new Date();
    //     const currentHour = now.getHours();
    //     const currentMinute = now.getMinutes();
    //     const currentSecond = now.getSeconds();

    //     // Check if it's exactly midnight (12:00:00 AM)
    //     const isMidnight = currentHour === 0 && currentMinute === 0 && currentSecond === 0;

    //     setFormData(prev => {
    //         const prevDate = new Date(prev.date);
    //         const today = new Date();

    //         // Compare only date parts (ignore time)
    //         const isSameDate =
    //             prevDate.getFullYear() === today.getFullYear() &&
    //             prevDate.getMonth() === today.getMonth() &&
    //             prevDate.getDate() === today.getDate();

    //         // Update date if it's not the same date OR if it's exactly midnight
    //         if (!isSameDate || isMidnight) {
    //             return { ...prev, date: today };
    //         }
    //         return prev;
    //     });
    // }, [time, editMode]);

    const [baseDataloading, setBaseDataloading] = useState(false)
    const [ledgers, setLedgers] = useState([]);
    const [payableVouchrLedgers, setPayableVoucherLedger] = useState([])
    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);


    const fetchFinanceData = async (silent = false) => {
        if (!silent) setBaseDataloading(true)
        try {
            const res = await axiosInstance.post('all-finance-data', {
                voucherType: "Payable Voucher",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Supplier", "Customer&Supplier", "Other"],
                ledgerId: formData.ledgerId,
                currencyId: currentCurrency?.currencyId
            })
            const data = res?.data?.data;
            setVoucherId(data?.voucherdata?.voucherCode)
            setCostCenters(data?.costcentre)
            setLedgers(data?.accountLedger)
            setEmployees(data?.employees)
            setCostCenters(data?.costcentre)
            setSuppliers(data?.customersupplierLedgers)
            setPayableVoucherLedger(data?.payablevoucherledgers)
            setBanks(data?.bank)
            setCash(data?.cash)
            setCurrency(data?.currencywithConversion || [])
            setFormData(prev => ({
                ...prev,
                CashLedgerId: financeSettings?.DefaultCashAccount || data?.cash[0]?.ledgerId,
                BankLedgerId: financeSettings?.DefaultBankAccount || data?.bank[0]?.ledgerId,
            }));

        } catch (error) {
            console.error('error fetching default data', error)
        } finally {
            if (!silent) setBaseDataloading(false)
        }
    }

    useEffect(() => {
        fetchFinanceData()
    }, [])

    const fetchCurrencyConvertion = async () => {
        try {
            const response = await axiosInstance.get(`currency-conversions/${selectedBranchId}`);
            setCurrencyConvertionData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching currency conversions:', error);
        }
    };

    useEffect(() => {
        fetchCurrencyConvertion();
    }, [selectedBranchId]);

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
        navigate("/transaction/payable-voucher/list");
    };

    const clearForm = async (skipConfirmation = false) => {
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
            voucherType: "Payable Voucher",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: (financeSettings?.defaultPurchaseAccount) || '',
            employeeId: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            costCentreId: '',
            supplierName: '',
            SupplierAddress: '',
            SupplierPhone: '',
            supplierVATNo: '',
            RefNo: "",
            refDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : (purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : false),
            narration: "",
            totalTax: "",
            totalAmount: "",
            paymentMode: "cash",
            CashRefNo: "",
            CashAmount: 0,
            CashLedgerId: financeSettings?.DefaultCashAccount,
            BankLedgerId: financeSettings?.DefaultBankAccount,
            BankRefNo: "",
            BankAmount: 0,
            BillBalanceAmount: 0,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId,
            payableDetails: [
                {
                    SlNo: "",
                    ledgerId: "",
                    amount: null,
                    discAmt: null,
                    discPerc: null,
                    netAmount: null,
                    taxId: null,
                    taxRate: null,
                    taxType: "Excluded",
                    taxAmount: null,
                    chequeNo: "",
                    chequeDate: null,
                    narration: "",
                    totalAmount: null,
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
            CashLedgerId: financeSettings?.DefaultCashAccount,
            BankLedgerId: financeSettings?.DefaultBankAccount,

        }));
    }, [financeSettings, saleSettings]);
    useEffect(() => {
        if (editMode) {
            getPayableVoucherById()
        }
    }, [editMode])



    const getPayableVoucherById = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-payable-voucher-byId/${payableVoucherId}`);

            const data = response.data.data;

            // Fetch tax data first to get tax rates
            const taxResponse = await axiosInstance.get("tax-masters");
            const taxMasters = taxResponse.data.data || [];

            setExistingVoucherNo(data.voucherNo);

            // Map payable details with correct field names
            const payableVoucherDetailsWithLedgers = (data.payableDetails || []).map((item, index) => {
                const grossAmount = parseFloat(item.grossAmount) || 0;
                const discPerc = parseFloat(item.discountPercentage) || 0;

                const taxMaster = taxMasters.find(t => t.taxId === item.taxId);
                const taxRate = parseFloat(taxMaster?.rate) || 0;

                const discAmt = (grossAmount * discPerc) / 100;
                const amountAfterDiscount = grossAmount - discAmt;

                let taxAmount = 0;
                let netAmount = 0;

                if (item.taxType === 'Included' && item.taxId && taxRate > 0) {
                    taxAmount = (amountAfterDiscount * taxRate) / 100;
                    netAmount = amountAfterDiscount - taxAmount; // matches table's Included logic
                } else {
                    taxAmount = 0;
                    netAmount = amountAfterDiscount;
                }

                const finalTaxAmount = parseFloat(item.taxAmount) || taxAmount;
                const finalNetAmount = parseFloat(item.netAmount) || netAmount;

                const finalAmount = parseFloat(item.amount) || (
                    item.taxType === 'Included' ? amountAfterDiscount : amountAfterDiscount + finalTaxAmount
                );

                return {
                    id: index + 1,
                    sn: index + 1,
                    ledgerId: item.ledgerId || '',
                    ledgerName: item.ledgerName || '',
                    grossAmount: parseFloat(grossAmount.toFixed(generalSettings.decimalPart ?? 2)),
                    discAmt: parseFloat(discAmt.toFixed(generalSettings.decimalPart ?? 2)),
                    discPerc: discPerc,
                    netAmount: parseFloat(finalNetAmount.toFixed(generalSettings.decimalPart ?? 2)),
                    taxId: item.taxId || null,
                    taxRate: taxRate,
                    taxType: item.taxType || 'Excluded',
                    taxAmount: parseFloat(finalTaxAmount.toFixed(generalSettings.decimalPart ?? 2)),
                    chequeNo: item.chequeNo || '',
                    chequeDate: parseDateFromAPI(item.chequeDate),
                    narration: item.Narration || '',
                    amount: parseFloat(finalAmount.toFixed(generalSettings.decimalPart ?? 2)),
                };
            });

            setFormData((prev) => ({
                ...prev,
                voucherType: "Payable Voucher",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                costCentreId: data.costCentreId,
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? parseDateFromAPI(data.ReferenceDate) : "",
                taxType: data.taxType || "NA",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseDateFromAPI(data.exchangeDate) : "",
                narration: data.narration || "",
                totalTax: data.totalTax,
                totalAmount: data.totalAmount,
                paymentMode: data.paymentMode || "cash",
                CashLedgerId: data.CashLedgerId || "",
                CashRefNo: data.CashRefNo || "",
                CashAmount: data.CashAmount || "",
                BankLedgerId: data.BankLedgerId,
                BankRefNo: data.BankRefNo || "",
                BankAmount: data.BankAmount || 0,
                BillBalanceAmount: data.BillBalanceAmount || 0,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                payableDetails: payableVoucherDetailsWithLedgers,
            }));

            // Force table re-render
            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching Receivable Voucher data", error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: "Failed to fetch Receivable Voucher data",
            });
        } finally {
            setFetchLoading(false);
        }
    };

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        suppliers: false,
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
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Supplier", "Customer&Supplier"], branchId: selectedBranchId });
            setSuppliers(data.data);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
        }
    };
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const generatePayableVoucherId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Payable Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherId(response.data.voucherCode)

        } catch (error) {
            console.error(error);

        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        if (!formData.ledgerId) errors.push('Please select a supplier');
        if (!formData.date) errors.push('Please select voucher date');
        if (!formData.payableDetails || formData.payableDetails.length === 0) {
            errors.push('Please add at least one ledger entry');
        }

        const hasValidEntries = formData.payableDetails.some(
            detail => detail.ledgerId && detail.amount > 0
        );
        if (!hasValidEntries) errors.push('Please add valid ledger entries with amount');

        return errors;
    };

    const [taxData, setTaxData] = useState([]);

    useEffect(() => {
        const fetchTax = async () => {
            try {
                const res = await axiosInstance.get("tax-masters");
                setTaxData(res.data.data || []);
            } catch (e) {
                console.error("Error fetching tax masters:", e);
            }
        };
        fetchTax();
    }, []);

    // ===== PRINT HELPERS =====
    const getSupplierName = useCallback((sourceFormData) => {
        const source = sourceFormData || formData;
        if (source.partyName) return source.partyName;
        if (source.supplierName) return source.supplierName;
        return suppliers?.find(s => s.ledgerId === source.ledgerId)?.ledgerName || '';
    }, [suppliers, formData]);

    const getBankCashName = useCallback((sourceFormData) => {
        const source = sourceFormData || formData;
        if (source.paymentMode === 'cash') {
            return cash?.find(c => c.ledgerId === source.CashLedgerId)?.ledgerName || 'Cash';
        }
        if (source.paymentMode === 'bank') {
            return banks?.find(b => b.ledgerId === source.BankLedgerId)?.ledgerName || 'Bank';
        }
        return source.paymentMode || '';
    }, [cash, banks, formData]);

    const buildVoucherDataForPrint = useCallback((voucherNumber, overrideData) => {
        const base = overrideData || formData;
        const enrichedDetails = (base?.payableDetails || []).map((item) => {
            const matchedLedger = ledgers?.find(l => Number(l.ledgerId) === Number(item.ledgerId)) ||
                payableVouchrLedgers?.find(l => Number(l.ledgerId) === Number(item.ledgerId));
            const matchedTax = taxData?.find(t => Number(t.taxId) === Number(item.taxId));

            let taxRate = 0;
            if (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== '' && parseFloat(item.taxRate) > 0) {
                taxRate = parseFloat(item.taxRate);
            } else if (matchedTax) {
                taxRate = parseFloat(matchedTax.rate || matchedTax.taxPercentage || 0);
            } else if (parseFloat(item.taxAmount || 0) > 0 && parseFloat(item.netAmount || item.grossAmount || 0) > 0) {
                const baseAmount = parseFloat(item.netAmount || item.grossAmount || 0);
                taxRate = Number(((parseFloat(item.taxAmount) / baseAmount) * 100).toFixed(2));
            }

            const rowGross = parseFloat(item.grossAmount || item.amount || 0);
            let discAmt = parseFloat(item.discAmt !== undefined && item.discAmt !== null ? item.discAmt : 0);
            let discPerc = parseFloat(item.discPerc !== undefined && item.discPerc !== null ? item.discPerc : (item.discountPercentage || 0));

            if (discAmt === 0 && discPerc > 0 && rowGross > 0) {
                discAmt = (rowGross * discPerc) / 100;
            } else if (discAmt > 0 && discPerc === 0 && rowGross > 0) {
                discPerc = (discAmt / rowGross) * 100;
            }

            return {
                ...item,
                ledgerName: item.ledgerName || matchedLedger?.ledgerName || '',
                taxRate: taxRate,
                discAmt: discAmt,
                discPerc: discPerc,
                discountPercentage: discPerc,
            };
        });

        const matchedCostCenter = costCenters?.find(c => c.costCentreId === base.costCentreId);
        const matchedEmployee = employees?.find(e => e.employeeId === base.employeeId);

        return {
            ...base,
            voucherNo: base?.voucherNo || voucherNumber || (editMode ? existingVoucherNo : voucherId),
            partyName: getSupplierName(base),
            bankCashName: getBankCashName(base),
            costCentreName: matchedCostCenter?.CostCentre || '',
            employeeName: matchedEmployee?.employeeName || '',
            payableDetails: enrichedDetails,
        };
    }, [formData, editMode, existingVoucherNo, voucherId, getSupplierName, getBankCashName, ledgers, payableVouchrLedgers, costCenters, employees, taxData]);

    const printToPrinterFn = useCallback((voucherDataForPrint) => {
        printPayableVoucher(voucherDataForPrint, selectedBranchDetails, time, currentCurrency);
    }, [selectedBranchDetails, time, currentCurrency]);

    const printToPdfFn = useCallback((voucherDataForPrint) => {
        savePayableVoucherAsPDF(voucherDataForPrint, selectedBranchDetails, time, currentCurrency);
    }, [selectedBranchDetails, time, currentCurrency]);

    // ===== EDIT MODE: Reprint to Printer =====
    const handleReprintToPrinter = useCallback(async () => {
        if (generalSettings?.askConfirmationPrint) {
            const result = await Swal.fire({
                title: t('ConfirmPrintTitle') || 'Confirm Print',
                text: t('ConfirmPrintText') || 'Are you sure you want to print this payable voucher?',
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
            const voucherDataForPrint = buildVoucherDataForPrint(existingVoucherNo);
            printToPrinterFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error printing payable voucher:', error);
            showToast.error('Failed to print payable voucher');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildVoucherDataForPrint, existingVoucherNo, printToPrinterFn]);

    // ===== EDIT MODE: Reprint to PDF =====
    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const voucherDataForPrint = buildVoucherDataForPrint(existingVoucherNo);
            printToPdfFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error generating payable voucher PDF:', error);
            showToast.error('Failed to generate payable voucher PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildVoucherDataForPrint, existingVoucherNo, printToPdfFn]);

    const handleSave = useCallback(async () => {
       

        if (formData.BillBalanceAmount < 0) {
            showToast.error(t("salesInvoice.alert.billBalanceAmtError"));
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
            const errorMessage = validationErrors.join('\n');
            setAlert({
                id: Date.now(),
                type: "error",
                message: errorMessage,
            });
            return;
        }

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

        if (editMode && generalSettings?.askConfirmationEdit) {
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
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                ModifiedUser: editMode ? userId : null,
                payableDetails: (formData.payableDetails || []).map((detail) => ({
                    ...detail,
                    ModifiedUser: editMode ? userId : detail?.ModifiedUser ?? null,
                })),
            };
            const api = editMode ? `update-payable-voucher/${payableVoucherId}` : 'save-payable-voucher'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t("saveSuccess"),
                });

                // ===== PRINT LOGIC =====
                const freshData = response?.data?.data || response?.data || {};
                const freshVoucherNo = freshData?.voucherNo || freshData?.voucherCode || (editMode ? existingVoucherNo : voucherId);
                const voucherDataForPrint = buildVoucherDataForPrint(
                    freshVoucherNo,
                    { ...formData, ...freshData }
                );

                if (formData?.printAfterSave) {
                    printToPrinterFn(voucherDataForPrint);
                } else if (!editMode) {
                    const pdfResult = await Swal.fire({
                        title: t('Print As Pdf') || 'Print as PDF?',
                        text: t('Do you want to download this voucher as a PDF?') ||
                            'Do you want to download this voucher as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });

                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            printToPdfFn(voucherDataForPrint);
                        }, 500);
                    }
                }

                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/payable-voucher/list');
                }

                // ✅ Always regenerate voucher ID and clear form — both create & edit
                generatePayableVoucherId();
                await clearForm(true);
            }
        } catch (error) {
            console.error('Error saving payable voucher:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save payable voucher',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode, buildVoucherDataForPrint, printToPrinterFn, printToPdfFn, existingVoucherNo, voucherId, selectedBranchId, currentCurrency, cash, t, navigate, userId, payableVoucherId]);

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
                        { title: t("payableVoucher.breadcrumb.master"), url: "#" },
                        { title: t("payableVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: editMode ? t("payableVoucher.breadcrumb.editTitle") : t("payableVoucher.breadcrumb.title")
                    }}
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
            <PopupPreloader
                isOpen={isSaving || isPrinting}
                state="loading"
                title={isPrinting ? (t("Printing") || "Preparing Print...") : (isSaving ? (editMode ? t("updating") : t("saving")) : "")}
                subtitle={isPrinting ? (t("printingDesc") || "Please wait while we prepare your voucher for printing...") : (t("loadingDesc") || "Please wait...")}
            />
            <BreadCrumb
                routes={[
                    { title: t("payableVoucher.breadcrumb.master"), url: "#" },
                    { title: t("payableVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode ? t("payableVoucher.breadcrumb.editTitle") : t("payableVoucher.breadcrumb.title")
                }}
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
                        onClick: () => clearForm(),   // ← no arguments = skipConfirmation stays false
                    },
                    {
                        label: editMode ? t("updateBtn") : t("submitBtn"),
                        icon: editMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ]}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSavePayableVoucher"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSavePayableVoucher"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                            >
                                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                            </label>
                        </div>
                        {editMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                    </div>
                }
            />
            <FormSectionMain
                generalSettings={generalSettings}
                loading={loading}
                existingInvoiceNo={existingVoucherNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={voucherId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                costCenters={costCenters}
                suppliers={suppliers}
                fetchEmployees={fetchEmployees}
                fetchSupplier={fetchSupplier}
                rows={formData?.payableDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, payableDetails: updatedRows }))}

                ledgers={ledgers}
                payableVouchrLedgers={payableVouchrLedgers}
                banks={banks}
                cash={cash}
                currency={currency}
                currencyConvertionData={currencyConvertionData}
                financeSettings={financeSettings}
                onLedgerCreated={() => fetchFinanceData(true)}
            />
        </div>
    );
};

export default PayableVoucherSkin;