import BreadCrumb from '@/components/common/BreadCrumb'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Wallet, SaveAll, Trash2, Table, Eraser } from 'lucide-react'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import PaymentVoucherFormHeader from './PaymentVoucherFormHeader'
import useAuth from '@/redux/hook/auth/useAuth'
import { useSelector } from 'react-redux'
import PaymentVoucherFormTable from './PaymentVoucherFormTable'
import PaymentVoucherFormFooter from './PaymentVoucherFormFooter'
import axiosInstance from '@/lib/axiosConfig'
import AlertBox from '@/components/common/AlertBox'
import Preloader from '@/components/common/Preloader'
import PopupPreloader from '@/components/common/PopupPreloader'
import PrintDropdown from '@/components/common/PrintDropdown'
import { Checkbox } from '@/components/ui/checkbox'
import Swal from 'sweetalert2'
import { formatDateWithTime, parseDateFromAPI, parseLocalDate } from '@/lib/dateFormat'
import { showToast } from '@/utils/toast'
import printPaymentVoucher, { savePaymentVoucherAsPDF } from '@/utils/prints/paymentVoucherPrints/PaymentVoucherPrintOne'
import printPaymentVoucherA5, { savePaymentVoucherAsPDFA5 } from '@/utils/prints/paymentVoucherPrints/PaymentVoucherPrintA5'
import { isElectron } from '@/utils/electronPrint'

const PaymentVoucherForm = () => {
    const { t } = useTranslation();
    const { paymentVoucherId } = useParams()
    const editMode = Boolean(paymentVoucherId);
    const { userId, currentFinancialYear, selectedBranchId, selectedBranchDetails, currentCurrencyConversion, currentCurrency } = useAuth();
    const { generalSettings, purchaseSettings, financeSettings, printSettings } = useSelector((state) => state.settings);
    const invoiceTypes = Object.keys(printSettings?.["Payment Voucher"]?.types || {});
    const invoicePrintConfig = printSettings?.["Payment Voucher"]?.default || Object.values(printSettings?.["Payment Voucher"]?.types || {})[0];
    const navigate = useNavigate();
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingPaymentNo, setExistingPaymentNo] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voucherNo, setVoucherNo] = useState('');
    const [resetTableKey, setResetTableKey] = useState(0);
    const [time, setTime] = useState("");
    const [ledgerBalance, setLedgerBalance] = useState(null);
    const [documents, setDocuments] = useState([]);            // File[] — newly attached
    const [existingDocuments, setExistingDocuments] = useState([]); // string[] — URLs from server
    const [removedDocuments, setRemovedDocuments] = useState([]);   // string[] — URLs user removed

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

    const [bankCash, setBankCash] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [baseDataloading, setBaseDataloading] = useState(false)
    const [baseDataLoaded, setBaseDataLoaded] = useState(false) // Track if base data is loaded

    const { privileges, loading: privilegeLoading } = usePrivileges("Payment Voucher");

    const [formData, setFormData] = useState({
        voucherType: "Payment Voucher",
        yearId: currentFinancialYear?.yearId || 0,
        date: new Date(),
        ledgerId: "",
        narration: "",
        totalAmount: 0,
        userId: userId,
        costCentreId: null,
        ReferenceNo: "",
        ReferenceDate: new Date(),
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : false,
        printType: invoicePrintConfig?.printType || 'A4',
        paymentDetails: [
            {
                SlNo: 1,
                ledgerId: "",
                ledgerName: "", // Add this
                amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                Narration: "",
                chequeNo: "",
                chequeDate: "01-01-1753",
                currencyConversionId: "",
                billByBill: false // Add this
            }
        ],
        partyDetails: []
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            printType: invoicePrintConfig?.printType || 'A4'
        }));
    }, [printSettings]);

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
        navigate('/transaction/payment-voucher');
    };

    const clearForm = async () => {
        if (generalSettings?.askConfirmationClear) {
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
            voucherType: "Payment Voucher",
            yearId: currentFinancialYear?.yearId || 0,
            date: new Date(),
            ledgerId: "",
            narration: "",
            totalAmount: 0,
            userId: userId,
            costCentreId: null,
            ReferenceNo: "",
            ReferenceDate: new Date(),
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : false,
            printType: invoicePrintConfig?.printType || 'A4',
            paymentDetails: [{
                SlNo: 1,
                ledgerId: "",
                ledgerName: "", // Add this
                amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                Narration: "",
                chequeNo: "",
                chequeDate: "01-01-1753",
                currencyConversionId: "",
                billByBill: false // Add this
            }],
            partyDetails: []
        });
        setDocuments([]);
        setExistingDocuments([]);
        setRemovedDocuments([]);
        setErrors({});
        setResetTableKey(prev => prev + 1);
    };



    const handleRowRemove = async (slNo) => {
        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({
                title: t("delete.title"),
                text: t("delete.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("delete.confirm"),
                cancelButtonText: t("delete.cancel")
            });
            if (!result.isConfirmed) return;
        }
        setFormData(prev => ({
            ...prev,
            paymentDetails: prev.paymentDetails
                .filter(detail => detail.SlNo !== slNo)
                .map((detail, index) => ({ ...detail, SlNo: index + 1 }))
        }));
    };

    const fetchFinanceData = async (silent = false) => {
        if (!silent) setBaseDataloading(true)
        try {
            const res = await axiosInstance.post('all-finance-data', {
                voucherType: "Payment Voucher",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Supplier","Customer&Supplier"],
                ledgerId: formData.ledgerId,
                currencyId: currentCurrency
            })
            const data = res?.data?.data;
            setVoucherNo(data?.voucherdata?.voucherCode)
            setBankCash(data?.bankaccountledgers5and8);
            setCostCenters(data?.costcentre)
            setCurrency(data?.currencywithConversion)
            setLedgers(data?.accountLedger)
            setBaseDataLoaded(true) // Mark base data as loaded
            setFormData(prev => ({
                ...prev,
                costCentreId: data?.costcentre?.length > 0 ? data.costcentre[0].costCentreId : '',
            }));
        } catch (error) {
            console.error('error fetching default data', error)
            setBaseDataLoaded(true) // Mark as loaded even if error
        } finally {
            if (!silent) setBaseDataloading(false)
        }
    }

    // Fetch base data (ledgers, cost centers, etc.)
    useEffect(() => {
        fetchFinanceData()
    }, [])

    const hasFetchedVoucherRef = React.useRef(false);
    // Fetch payment data AFTER base data is loaded
    useEffect(() => {
        if (editMode && paymentVoucherId && baseDataLoaded && ledgers.length > 0 && !hasFetchedVoucherRef.current) {
            hasFetchedVoucherRef.current = true;
            fetchPaymentData();
        }
    }, [paymentVoucherId, editMode, baseDataLoaded, ledgers]);

    const handleFormChange = (name, valueOrEvent) => {
        const value = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );

            // crordr is true CR, false DR. We need to adjust balance accordingly for cash validation
            const balance = res.data?.data?.currentbal || 0;
            return balance;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return 0;
        }
    };

    const fetchPaymentData = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-payment-voucher-byId/${paymentVoucherId}`);
            const data = response.data.data;

            setExistingPaymentNo(data.paymentNo);

            // Helper function to parse date from API format
            const parseDate = (dateString) => {
                if (!dateString) return new Date();
                try {
                    // Handle "2026-04-01 00:00:00" format
                    const cleanDate = dateString.replace(' 00:00:00', '').trim();
                    return new Date(cleanDate);
                } catch (err) {
                    console.error("Error parsing date:", dateString, err);
                    return new Date();
                }
            };

            // Prepare payment details with proper ledger name mapping
            let paymentDetailsForForm = [];

            if (data.paymentDetails && data.paymentDetails.length > 0) {
                paymentDetailsForForm = data.paymentDetails.map((detail, index) => {
                    // Find the matching ledger from the ledgers array
                    const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerId);


                    // Parse cheque date
                    let parsedChequeDate = "01-01-1753";
                    if (detail?.chequeDate && detail?.chequeDate !== "01-01-1753") {
                        try {
                            const datePart = detail.chequeDate.split(' ')[0]; // Extract just the date part
                            parsedChequeDate = datePart;
                        } catch (err) {
                            console.error("Error parsing cheque date:", err);
                            parsedChequeDate = "01-01-1753";
                        }
                    }

                    return {
                        SlNo: index + 1,
                        ledgerId: detail.ledgerId || "",
                        ledgerName: matchingLedger?.ledgerName || detail.ledgerName || '', // Use found ledger name, fallback to response
                        amount: (parseFloat(detail.amount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                        Narration: detail.Narration || "",
                        chequeNo: detail.chequeNo || "",
                        chequeDate: parsedChequeDate,
                        currencyConversionId: detail.currencyConversionId || "",
                        billByBill: matchingLedger?.billBybill || false,
                    };
                });
            } else {
                paymentDetailsForForm = [{
                    SlNo: 1,
                    ledgerId: "",
                    ledgerName: '',
                    amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                    Narration: "",
                    chequeNo: "",
                    chequeDate: "01-01-1753",
                    currencyConversionId: "",
                    billByBill: false,
                }];
            }

            // Parse all dates properly
            const formattedDate = parseDate(data.date);
            const formattedReferenceDate = data.ReferenceDate ? parseDate(data.ReferenceDate) : new Date();
            const formattedPostedDate = data.postedDate ? parseDate(data.postedDate) : null;



            setFormData({
                voucherType: "Payment Voucher",
                yearId: currentFinancialYear?.yearId || data.yearId,
                date: formattedDate, // Use parsed date
                ledgerId: data.ledgerId,
                narration: data.narration || "",
                totalAmount: parseFloat(data.totalAmount) || 0,
                userId: userId,
                costCentreId: data.costCentreId || null,
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: formattedReferenceDate, // Use parsed date
                postedStatus: data.postedStatus === "0" ? "No" : "Yes", // Handle "0" and "1" values
                postedBy: data.postedBy,
                postedDate: formattedPostedDate, // Use parsed date
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                exchangeRate: currentCurrencyConversion?.rate,
                exchangeDate: currentCurrencyConversion?.date,
                printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : false,
                printType: (invoicePrintConfig?.printType || 'A4'),
                paymentDetails: paymentDetailsForForm,
                partyDetails: data.partyDetails || []
            });

            // Fetch ledger balances for each detail
            if (data.paymentDetails && data.paymentDetails.length > 0) {
                const updatedDetails = await Promise.all(
                    data.paymentDetails.map(async (detail, index) => {
                        const balance = await fetchLedgerBalance(detail.ledgerId);
                        const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerId);

                        let parsedChequeDate = "01-01-1753";
                        if (detail?.chequeDate && detail?.chequeDate !== "01-01-1753") {
                            const datePart = detail.chequeDate.split(' ')[0];
                            parsedChequeDate = datePart;
                        }

                        return {
                            SlNo: index + 1,
                            ledgerId: detail.ledgerId || "",
                            ledgerName: matchingLedger?.ledgerName || detail.ledgerName || '',
                            amount: (parseFloat(detail.amount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                            Narration: detail.Narration || "",
                            chequeNo: detail.chequeNo || "",
                            chequeDate: parsedChequeDate,
                            currencyConversionId: detail.currencyConversionId || "",
                            billByBill: matchingLedger?.billBybill || false,
                        };
                    })
                );

                setFormData(prev => ({
                    ...prev,
                    paymentDetails: updatedDetails
                }));
            }
            setExistingDocuments(data.Documents || []);
            setRemovedDocuments([]);
        } catch (error) {
            console.error('Error fetching payment data:', error);

            showToast.error(t('paymentVoucher.form.messages.fetchError') || 'Failed to fetch payment data');
        } finally {
            setFetchLoading(false)
        }
    };

    // ===== PRINT HELPERS =====
    // Cash/Bank ledger name shown at the top of the voucher (formData.ledgerId is the
    // Cash/Bank account this payment was posted against, resolved from `bankCash`).
    const getBankCashName = useCallback((sourceFormData) => {
        const source = sourceFormData || formData;
        return bankCash?.find(b => b.ledgerId === source.ledgerId)?.ledgerName || '';
    }, [bankCash, formData]);

    const buildVoucherDataForPrint = useCallback((voucherNumber, overrideData) => {
        const base = overrideData || formData;
        return {
            ...base,
            voucherNo: base?.voucherNo || voucherNumber || voucherNo,
            bankCashName: getBankCashName(base),
        };
    }, [formData, voucherNo, getBankCashName]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SINGLE SOURCE OF TRUTH for payment voucher print types.
    // To add a new layout: import it above, add ONE entry here.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const PAYMENT_PRINT_HANDLERS = {
        'A4': { print: printPaymentVoucher, pdf: savePaymentVoucherAsPDF },
        'A5': { print: printPaymentVoucherA5, pdf: savePaymentVoucherAsPDFA5 },
    };

    const DEFAULT_PAYMENT_PRINT_TYPE = 'A4';
    const DEFAULT_PAYMENT_PDF_TYPE = 'A4';

    // mode: 'print' | 'pdf'
    const runVoucherOutput = useCallback((mode, voucherDataForPrint) => {
        const handlers = PAYMENT_PRINT_HANDLERS[formData.printType];

        const fn = handlers?.[mode]
            ?? PAYMENT_PRINT_HANDLERS[mode === 'pdf' ? DEFAULT_PAYMENT_PDF_TYPE : DEFAULT_PAYMENT_PRINT_TYPE][mode];

        fn(voucherDataForPrint, selectedBranchDetails, time, currentCurrency);
    }, [formData.printType, selectedBranchDetails, time, currentCurrency]);

    const printToPrinterFn = useCallback((voucherDataForPrint) => {
        runVoucherOutput('print', voucherDataForPrint);
    }, [runVoucherOutput]);

    const printToPdfFn = useCallback((voucherDataForPrint) => {
        runVoucherOutput('pdf', voucherDataForPrint);
    }, [runVoucherOutput]);

    // ===== EDIT MODE: Reprint to Printer =====
    const handleReprintToPrinter = useCallback(async () => {
        if (generalSettings?.askConfirmationPrint) {
            const result = await Swal.fire({
                title: t('ConfirmPrintTitle') || 'Confirm Print',
                text: t('ConfirmPrintText') || 'Are you sure you want to print this payment voucher?',
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
            const voucherDataForPrint = buildVoucherDataForPrint(existingPaymentNo);
            printToPrinterFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error printing payment voucher:', error);
            showToast.error('Failed to print payment voucher');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildVoucherDataForPrint, existingPaymentNo, printToPrinterFn]);

    // ===== EDIT MODE: Reprint to PDF =====
    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const voucherDataForPrint = buildVoucherDataForPrint(existingPaymentNo);
            printToPdfFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error generating payment voucher PDF:', error);
            showToast.error('Failed to generate payment voucher PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildVoucherDataForPrint, existingPaymentNo, printToPdfFn]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (!isSubmitting) {
                    handleSubmit();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting, formData]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.date) {
            newErrors.date = t("requiredFieldsError");
        }

        if (!formData.ledgerId || formData.ledgerId === 0 || formData.ledgerId === "") {
            newErrors.ledgerId = t("requiredFieldsError");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        if (!validateForm()) return;

        try {
            const validPaymentDetails = formData.paymentDetails.filter(
                detail => detail.ledgerId && detail.ledgerId !== 0
            );

            if (validPaymentDetails.length === 0) {
                showToast.error(t('paymentVoucher.form.messages.selectLedgerInAllRows'));
                return;
            }


            // Negative cash transaction validation
            const selectedMasterLedger = bankCash.find(l => l.ledgerId === formData.ledgerId);
            const isCashOrBank = [8].includes(selectedMasterLedger?.groupId);

            if (isCashOrBank && generalSettings?.negativeCashTransaction !== 'Allow') {
                const balanceValue = ledgerBalance?.currentbal ?? 0;
                const wouldBeBalance = balanceValue - formData.totalAmount;

                if (wouldBeBalance < 0) {
                    if (generalSettings?.negativeCashTransaction === 'Block') {
                        await Swal.fire({
                            title: t('paymentVoucher.form.messages.negativeCashBlockTitle') || 'Transaction Blocked',
                            text: `Insufficient balance. Available: ${Number(balanceValue).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(formData.totalAmount).toFixed(generalSettings?.decimalPart ?? 2)}`,
                            icon: 'error',
                            confirmButtonColor: '#d33',
                            confirmButtonText: t('Ok') || 'Ok',
                        });
                        return;
                    }

                    if (generalSettings?.negativeCashTransaction === 'Warn') {
                        const result = await Swal.fire({
                            title: t('paymentVoucher.form.messages.negativeCashWarnTitle') || 'Low Balance Warning',
                            text: `This transaction will result in a negative balance. Available: ${Number(balanceValue).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(formData.totalAmount).toFixed(generalSettings?.decimalPart ?? 2)}. Do you want to continue?`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: t('Yes Continue') || 'Yes, Continue',
                            cancelButtonText: t('Cancel'),
                        });
                        if (!result.isConfirmed) return;
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

            setIsSubmitting(true);
            const appendFormData = (fd, key, value, options = {}) => {
                const { keepEmpty = false } = options;
                if (value === null || value === undefined) {
                    if (keepEmpty) fd.append(key, '');
                    return;
                }
                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        appendFormData(fd, `${key}[${index}]`, item, { keepEmpty: true });
                    });
                } else if (value instanceof Date) {
                    fd.append(key, value.toISOString());
                } else if (typeof value === 'object' && !(value instanceof File)) {
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        appendFormData(fd, `${key}[${subKey}]`, subValue, { keepEmpty });
                    });
                } else {
                    fd.append(key, value);
                }
            };
            const formattedData = {
                ...formData,
                date: formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date,
                ReferenceDate: formData.ReferenceDate instanceof Date ? formData.ReferenceDate.toISOString().split('T')[0] : formData.ReferenceDate,
                postedDate: formData.postedDate instanceof Date ? formData.postedDate.toISOString().split('T')[0] : formData.postedDate,
                exchangeDate: formData.exchangeDate instanceof Date ? formData.exchangeDate.toISOString().split('T')[0] : formData.exchangeDate,
                postedStatus: formData.postedStatus === "Yes" ? true : false,
                paymentDetails: formData.paymentDetails
                    .filter(detail => detail.ledgerId && detail.ledgerId !== 0)
                    .map((detail, index) => ({
                        ledgerId: detail.ledgerId,
                        amount: (parseFloat(detail.amount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                        currencyConversionId: detail.currencyConversionId || currentCurrencyConversion?.currencyConversionId || 1,
                        chequeNo: detail.chequeNo || "",
                        chequeDate: detail.chequeDate instanceof Date
                            ? detail.chequeDate.toISOString().split('T')[0]
                            : detail.chequeDate,
                        lineIndex: index + 1,
                        narration: detail.Narration || ""
                    })),
                partyDetails: formData.partyDetails && formData.partyDetails.length > 0
                    ? formData.partyDetails
                    : [],
            };

            if (editMode) {
                const updateData = {
                    ...formattedData,
                    date: formatDateWithTime(formData.date),
                    ModifiedUser: userId
                };
                delete updateData.voucherType;
                delete updateData.yearId;
                delete updateData.CreatedUser;

                const hasDocuments = documents.length > 0;
                let response;

                if (hasDocuments) {
                    const fd = new FormData();
                    Object.entries(updateData).forEach(([key, value]) => {
                        appendFormData(fd, key, value);
                    });
                    documents.forEach((file) => fd.append('Documents[]', file));

                    const config = { headers: { "Content-Type": "multipart/form-data" } };
                    response = await axiosInstance.post(`update-payment-voucher/${paymentVoucherId}`, fd, config);
                } else {
                    response = await axiosInstance.post(`update-payment-voucher/${paymentVoucherId}`, updateData);
                }

                if (response.data && !response.data.error) {
                    showToast.success(t('updateSuccess') || 'Payment updated successfully');

                    // ===== PRINT LOGIC (edit mode: honor printAfterSave toggle) =====
                    if (formData?.printAfterSave) {
                        const freshData = response?.data?.data || {};
                        const voucherDataForPrint = buildVoucherDataForPrint(
                            existingPaymentNo,
                            { ...formData, ...freshData }
                        );
                        printToPrinterFn(voucherDataForPrint);
                    }

                    if (financeSettings?.CloseAfterSave) {
                        navigate('/transaction/payment-voucher');
                    }
                } else {
                    showToast.error(response.data.message || t('updateError'));
                }
            } else {
                const dataToSave = {
                    ...formattedData,
                    date: formatDateWithTime(formattedData.date)
                };

                const hasDocuments = documents.length > 0;
                let response;

                if (hasDocuments) {
                    const fd = new FormData();
                    Object.entries(dataToSave).forEach(([key, value]) => {
                        appendFormData(fd, key, value);
                    });
                    documents.forEach((file) => fd.append('Documents[]', file));

                    const config = { headers: { "Content-Type": "multipart/form-data" } };
                    response = await axiosInstance.post('save-payment-voucher', fd, config);
                } else {
                    response = await axiosInstance.post('save-payment-voucher', dataToSave);
                }

                if (response.data && !response.data.error) {
                    showToast.success(t('saveSuccess') || 'Payment saved successfully');

                    // ===== PRINT LOGIC (new voucher) =====
                    const freshData = response?.data?.data || {};
                    const voucherDataForPrint = buildVoucherDataForPrint(
                        freshData?.voucherNo || voucherNo,
                        { ...formData, ...freshData }
                    );

                    if (formData?.printAfterSave) {
                        printToPrinterFn(voucherDataForPrint);
                    } else {
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

                    // ✅ Clear form if CloseAfterSave is false
                    if (financeSettings?.CloseAfterSave) {
                        navigate('/transaction/payment-voucher');
                    } else {
                        // Clear the form for new entry
                        setFormData({
                            voucherType: "Payment Voucher",
                            yearId: currentFinancialYear?.yearId || 0,
                            date: new Date(),
                            ledgerId: "",
                            narration: "",
                            totalAmount: 0,
                            userId: userId,
                            costCentreId: null,
                            ReferenceNo: "",
                            ReferenceDate: new Date(),
                            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
                            postedBy: generalSettings?.AccountPosting ? null : userId,
                            postedDate: generalSettings?.AccountPosting ? null : new Date(),
                            branchId: selectedBranchId,
                            CreatedUser: userId,
                            exchangeRate: currentCurrencyConversion?.rate,
                            exchangeDate: currentCurrencyConversion?.date,
                            printAfterSave: financeSettings?.printAfterSave !== undefined ? financeSettings.printAfterSave : false,
                            printType: invoicePrintConfig?.printType || 'A4',
                            paymentDetails: [{
                                SlNo: 1,
                                ledgerId: "",
                                ledgerName: "",
                                amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                                Narration: "",
                                chequeNo: "",
                                chequeDate: "01-01-1753",
                                currencyConversionId: "",
                                billByBill: false
                            }],
                            partyDetails: []
                        });
                        setDocuments([]);
                        setExistingDocuments([]);
                        setRemovedDocuments([]);
                        setErrors({});
                        setResetTableKey(prev => prev + 1);
                    }
                } else {
                    showToast.error(response.data.message || t('saveError'));
                }
            }

        } catch (error) {
            console.error('Error saving payment:', error);
            showToast.error(error.response?.data?.message || t('paymentVoucher.form.messages.saveError') || 'Failed to save payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editMode || !privileges?.can_delete) return;

        const result = await Swal.fire({
            title: t("delete.title"),
            text: t("delete.text"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("delete.confirm"),
            cancelButtonText: t("delete.cancel"),
        });

        if (!result.isConfirmed) return;

        try {
            await axiosInstance.get(`delete-payment-voucher/${paymentVoucherId}`);
            showToast.success(t("deleteSuccess"));
            setTimeout(() => {
                navigate('/transaction/payment-voucher');
            }, 1000);
        } catch (error) {
            console.error('Error deleting payment:', error);
            showToast.error(t('paymentVoucher.form.messages.deleteError') || 'Failed to delete payment');
        }
    };

    if (fetchLoading || baseDataloading) {
        return <>
            <BreadCrumb
                routes={[
                    { title: t("paymentVoucher.breadcrumb.master"), url: "#" },
                    { title: t("paymentVoucher.form.breadcrumb.parent"), url: "/transaction/payment-voucher" },
                    { title: editMode ? t("paymentVoucher.form.breadcrumb.edit.title") : t("paymentVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: editMode ? t("paymentVoucher.form.breadcrumb.edit.title") : t("paymentVoucher.form.breadcrumb.title") }}
            />
            <Preloader />
        </>
    }

    return (
        <div className=" bg-white dark:bg-[#1e1e1e] transition-colors">

            <PopupPreloader
                isOpen={isSubmitting || isPrinting}
                state="loading"
                title={isPrinting ? (t("Printing") || "Preparing Print...") : (isSubmitting ? (editMode ? t("updating") : t("saving")) : "")}
                subtitle={isPrinting ? (t("printingDesc") || "Please wait while we prepare your voucher for printing...") : (t("loadingDesc") || "Please wait...")}
            />

            <BreadCrumb
                routes={[
                    { title: t("paymentVoucher.breadcrumb.master"), url: "#" },
                    { title: t("paymentVoucher.form.breadcrumb.parent"), url: "/transaction/payment-voucher" },
                    { title: editMode ? t("paymentVoucher.form.breadcrumb.edit.title") : t("paymentVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: editMode ? t("paymentVoucher.form.breadcrumb.edit.title") : t("paymentVoucher.form.breadcrumb.title") }}
                actions={[
                    {
                        label: t('listBtn'),
                        icon: Table,
                        type: 'secondary',
                        onClick: handleListNavigate,
                    },
                    ...(!editMode ? [{
                        label: t('clearBtn'),
                        icon: Eraser,
                        type: 'secondary',
                        onClick: clearForm,
                    }] : []),
                    ...(privileges?.can_add || (editMode && privileges?.can_edit)
                        ? [
                            {
                                label: isSubmitting
                                    ? (editMode ? t("updating") : t("saving"))
                                    : (editMode ? t("updateBtn") : t("submitBtn")),
                                icon: SaveAll,
                                loading: isSubmitting,
                                type: "primary",
                                onClick: () => { handleSubmit() },
                                disabled: isSubmitting,
                            },
                        ]
                        : []),
                    ...(editMode && privileges?.can_delete
                        ? [
                            {
                                label: t("deleteBtn"),
                                icon: Trash2,
                                type: "destructive",
                                onClick: handleDelete,
                            },
                        ]
                        : []),
                ]}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSavePaymentVoucher"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSavePaymentVoucher"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                            >
                                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                            </label>
                        </div>
                        {invoiceTypes.length > 0 && (
                            <select
                                name="printType"
                                id="printTypePaymentVoucher"
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
            {/* ✅ Responsive padding */}
            <div className='p-1 sm:p-2 lg:p-1' key={resetTableKey}>
                <PaymentVoucherFormHeader
                    generalSettings={generalSettings}
                    existingPaymentNo={existingPaymentNo}
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                    errors={errors}
                    voucherNo={voucherNo}
                    costCenters={costCenters}
                    bankCash={bankCash}
                    setBankCash={setBankCash}
                    setLedgerBalance={setLedgerBalance}
                    ledgerBalance={ledgerBalance}
                    documents={documents}
                    setDocuments={setDocuments}
                    existingDocuments={existingDocuments}
                    setExistingDocuments={setExistingDocuments}
                    removedDocuments={removedDocuments}
                    setRemovedDocuments={setRemovedDocuments}
                />
                <PaymentVoucherFormTable
                    formData={formData}
                    setFormData={setFormData}
                    ledgers={ledgers}
                    currency={currency}
                    onRowRemove={handleRowRemove}
                    onLedgerCreated={() => fetchFinanceData(true)}
                />
                <PaymentVoucherFormFooter
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                />
            </div>
        </div>
    )
}

export default PaymentVoucherForm