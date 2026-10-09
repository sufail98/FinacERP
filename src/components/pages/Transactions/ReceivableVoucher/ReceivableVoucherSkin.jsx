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
import printReceivableVoucher, { saveReceivableVoucherAsPDF } from '@/utils/prints/receivableVoucherPrints/ReceivableVoucherPrintOne';
import { isElectron } from '@/utils/electronPrint';

const ReceivableVoucherSkin = () => {
    const { receivableVoucherId } = useParams();
    const editMode = Boolean(receivableVoucherId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    // ✅ CHANGED: customers instead of suppliers
    const [customers, setCustomers] = useState([]);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, selectedBranchDetails, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, purchaseSettings, financeSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);
    const [taxData, setTaxData] = useState([]);
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
        voucherType: "Receivable Voucher",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: (financeSettings?.defaultSalesAccount) || '',
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
        printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : (saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : false),
        narration: "",
        totalTax: "",
        totalAmount: "",
        paymentMode: saleSettings?.DefaultPaymentMode,
       
        CashRefNo: "",
        CashAmount: "",
        CashLedgerId: financeSettings?.DefaultCashAccount || cash[0]?.ledgerId || null,
        BankLedgerId: financeSettings?.DefaultBankAccount || banks[0]?.ledgerId || null,
        BankRefNo: "",
        BankAmount: 0,
        BillBalanceAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        vatLedgerId: generalSettings?.taxLedgerId || "",
        receivableDetails: [
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
                grossAmount: null,
                branchId: selectedBranchId
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

    const [baseDataloading, setBaseDataloading] = useState(false)
    const [ledgers, setLedgers] = useState([]);
    const [payableVouchrLedgers, setPayableVoucherLedger] = useState([])


    const fetchFinanceData = async (silent = false) => {
        if (!silent) setBaseDataloading(true);
        try {
            const res = await axiosInstance.post('all-finance-data', {
                voucherType: "Receivable Voucher",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Supplier", "Customer", "Customer&Supplier", "Other"],
                ledgerId: formData.ledgerId,
                currencyId: currentCurrency?.currencyId
            });
            const data = res?.data?.data;
            setVoucherId(data?.voucherdata?.voucherCode);
            setCostCenters(data?.costcentre);
            setLedgers(data?.accountLedger);
            setEmployees(data?.employees);
            setCostCenters(data?.costcentre);
            setCustomers(data?.customers);
            setPayableVoucherLedger(data?.payablevoucherledgers);
            setBanks(data?.bank);
            setCash(data?.cash);
            setTaxData(data?.taxMaster);
            setCurrency(data?.currencywithConversion || []);
            setFormData(prev => ({
                ...prev,
                CashLedgerId: financeSettings?.DefaultCashAccount || data?.cash[0]?.ledgerId || null,
                BankLedgerId: financeSettings?.DefaultBankAccount || data?.bank[0]?.ledgerId || null,
            }));

        } catch (error) {
            console.error('error fetching default data', error);
        } finally {
            if (!silent) setBaseDataloading(false);
        }
    };

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
        navigate("/transaction/receivable-voucher/list");
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
            voucherType: "Receivable Voucher",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            billTime: "",
            ledgerId: (financeSettings?.defaultSalesAccount) || '',
            employeeId: '',
            purchaseAccount: '',
            purchaseAccountName: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            costCentreId: '',
            supplierName: '',
            SupplierAddress: '',
            SupplierPhone: '',
            supplierVATNo: '',
            RefNo: "",
            refDate: "",
            creditPeriod: "",
            dueDate: "",
            deliveryDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : (saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : false),
            narration: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            OtherChargeRemark: "",
            otherChargeLedgerId: "",
            othercharge: "",
            billDiscount: "",
            roundOff: "",
            totalAmount: "",
            paymentMode: saleSettings?.DefaultPaymentMode,
           
            CashRefNo: "",
            CashAmount: 0,
            CashLedgerId: financeSettings?.DefaultCashAccount || cash[0]?.ledgerId || null,
            BankLedgerId: financeSettings?.DefaultBankAccount || banks[0]?.ledgerId || null,
            BankRefNo: "",
            BankAmount: 0,
            BillBalanceAmount: 0,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            vatLedgerId: generalSettings?.taxLedgerId || "",
            receivableDetails: [
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
                    grossAmount: null,
                    branchId: selectedBranchId
                }
            ]
        });

        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getPayableVoucherById()
        }
    }, [editMode])
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            ledgerId: (financeSettings?.defaultSalesAccount) || '',
            paymentMode: saleSettings?.DefaultPaymentMode,
        }));
    }, [financeSettings, saleSettings]);
    const getPayableVoucherById = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-receivable-voucher-byId/${receivableVoucherId}`);
            const data = response.data.data;

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxMasters = taxResponse.data.data || [];

            setExistingVoucherNo(data.ReceivableNo);

            const receivableVoucherDetailsWithLedgers = (data.receivableDetails || []).map((item, index) => {
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
                    netAmount = amountAfterDiscount - taxAmount; // matches table's calculateRow logic for Included
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
                voucherType: "Receivable Voucher",
                yearId: currentFinancialYear?.yearId,
                date: data.date ? new Date(data.date) : new Date(),
                ledgerId: data.ledgerId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                costCentreId: data.costCentreId,
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? new Date(data.ReferenceDate) : "",
                taxType: data.taxType || "NA",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
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
                receivableDetails: receivableVoucherDetailsWithLedgers,
            }));

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
        // ✅ CHANGED: customers instead of suppliers
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



    // ✅ CHANGED: fetchCustomers with Customer API
    const fetchCustomers = async () => {
        setLoading(prev => ({ ...prev, customers: true }));
        try {
            // ✅ CHANGED: ledgerTypes: ["Customer"] instead of ["Supplier","Customer&Supplier"]
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer", "Customer&Supplier"], branchId: selectedBranchId });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const generatePayableVoucherId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Receivable Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherId(response.data.voucherCode)
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        // ✅ CHANGED: customer instead of supplier
        if (!formData.ledgerId) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select voucher date');
        if (!formData.receivableDetails || formData.receivableDetails.length === 0) {
            errors.push('Please add at least one ledger entry');
        }

        const hasValidEntries = formData.receivableDetails.some(
            detail => detail.ledgerId && detail.amount > 0
        );
        if (!hasValidEntries) errors.push('Please add valid ledger entries with amount');

        return errors;
    };

    // ===== PRINT HELPERS =====
    const getCustomerName = useCallback((sourceFormData) => {
        const source = sourceFormData || formData;
        if (source.partyName) return source.partyName;
        if (source.customerName) return source.customerName;
        if (source.supplierName) return source.supplierName;
        return customers?.find(c => c.ledgerId === source.ledgerId)?.ledgerName || '';
    }, [customers, formData]);

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
        const enrichedDetails = (base?.receivableDetails || []).map((item) => {
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
            partyName: getCustomerName(base),
            bankCashName: getBankCashName(base),
            costCentreName: matchedCostCenter?.CostCentre || '',
            employeeName: matchedEmployee?.employeeName || '',
            receivableDetails: enrichedDetails,
        };
    }, [formData, editMode, existingVoucherNo, voucherId, getCustomerName, getBankCashName, ledgers, payableVouchrLedgers, costCenters, employees, taxData]);

    const printToPrinterFn = useCallback((voucherDataForPrint) => {
        printReceivableVoucher(voucherDataForPrint, selectedBranchDetails, time, currentCurrency);
    }, [selectedBranchDetails, time, currentCurrency]);

    const printToPdfFn = useCallback((voucherDataForPrint) => {
        saveReceivableVoucherAsPDF(voucherDataForPrint, selectedBranchDetails, time, currentCurrency);
    }, [selectedBranchDetails, time, currentCurrency]);

    // ===== EDIT MODE: Reprint to Printer =====
    const handleReprintToPrinter = useCallback(async () => {
        if (generalSettings?.askConfirmationPrint) {
            const result = await Swal.fire({
                title: t('ConfirmPrintTitle') || 'Confirm Print',
                text: t('ConfirmPrintText') || 'Are you sure you want to print this receivable voucher?',
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
            console.error('Error printing receivable voucher:', error);
            showToast.error('Failed to print receivable voucher');
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
            console.error('Error generating receivable voucher PDF:', error);
            showToast.error('Failed to generate receivable voucher PDF');
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
                receivableDetails: (formData.receivableDetails || []).map((detail) => ({
                    ...detail,
                    ModifiedUser: editMode ? userId : detail?.ModifiedUser ?? null,
                })),
            };

            const api = editMode ? `update-receivable-voucher/${receivableVoucherId}` : 'save-receivable-voucher'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

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
                    navigate('/transaction/receivable-voucher/list')  // ✅ correct route
                }
                generatePayableVoucherId();
                await clearForm(true);   // ✅ both modes, skip confirmation, awaited
            }
        } catch (error) {
            console.error('Error saving Receivable Voucher:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save Receivable Voucher',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode, buildVoucherDataForPrint, printToPrinterFn, printToPdfFn, existingVoucherNo, voucherId, selectedBranchId, currentCurrency, cash, t, navigate, userId, receivableVoucherId, purchaseSettings]);

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
                        { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                        { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: editMode ? t("receivableVoucher.breadcrumb.editTitle") : t("receivableVoucher.breadcrumb.title")
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
                    { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                    { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode ? t("receivableVoucher.breadcrumb.editTitle") : t("receivableVoucher.breadcrumb.title")
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
                        onClick: () => clearForm(),  // ← clean call, no args
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
                                id="printAfterSaveReceivableVoucher"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSaveReceivableVoucher"
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
            {/* ✅ CHANGED: customers & fetchCustomers instead of suppliers & fetchSupplier */}
            <FormSectionMain
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
                customers={customers}
                fetchEmployees={fetchEmployees}
                fetchCustomers={fetchCustomers}
                rows={formData?.receivableDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, receivableDetails: updatedRows }))}

                banks={banks}
                cash={cash}
                payableVouchrLedgers={payableVouchrLedgers}
                taxData={taxData}
                currency={currency}
                currencyConvertionData={currencyConvertionData}
                financeSettings={financeSettings}
                onLedgerCreated={() => fetchFinanceData(true)}
            />
        </div>
    );
};

export default ReceivableVoucherSkin;