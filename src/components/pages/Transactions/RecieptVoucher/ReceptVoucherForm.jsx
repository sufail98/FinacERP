import BreadCrumb from '@/components/common/BreadCrumb'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Banknote, Eraser, Loader2, SaveAll, Table } from 'lucide-react'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import ReciptVoucherFormHeader from './ReciptVoucherFormHeader'
import useAuth from '@/redux/hook/auth/useAuth'
import { useSelector } from 'react-redux'
import RecieptVoucherFormTable from './RecieptVoucherFormTable'
import RecieptVoucherFormFooter from './RecieptVoucherFormFooter'
import axiosInstance from '@/lib/axiosConfig'
import AlertBox from '@/components/common/AlertBox'
import Preloader from '@/components/common/Preloader'
import PopupPreloader from '@/components/common/PopupPreloader'
import PrintDropdown from '@/components/common/PrintDropdown'
import { Checkbox } from '@/components/ui/checkbox'
import NoAcessComponent from '@/components/common/NoAcessComponent';

import { formatDateWithTime, parseDateFromAPI, parseLocalDate } from '@/lib/dateFormat'
import Swal from 'sweetalert2'
import { showToast } from '@/utils/toast'
// import printReceiptVoucher, { saveReceiptVoucherAsPDF } from '@/utils/prints/'
import { isElectron } from '@/utils/electronPrint'
import printReceiptVoucher, { saveReceiptVoucherAsPDF } from '@/utils/prints/recieptVoucherPrint/RecieptVoucherPrintOne'
import printReceiptVoucherA5, { saveReceiptVoucherAsPDFA5 } from '@/utils/prints/recieptVoucherPrint/RecieptVoucherPrintA5'

const ReceptVoucherForm = () => {
    const { t } = useTranslation();
    const { reciptVoucherId } = useParams();
    const editMode = Boolean(reciptVoucherId);
    const { userId, currentFinancialYear, selectedBranchId, selectedBranchDetails, currentCurrencyConversion, currentCurrency } = useAuth();


    const { generalSettings, purchaseSettings, financeSettings, printSettings } = useSelector((state) => state.settings);
    const invoiceTypes = Object.keys(printSettings?.["Receipt Voucher"]?.types || {});
    const invoicePrintConfig = printSettings?.["Receipt Voucher"]?.default || Object.values(printSettings?.["Receipt Voucher"]?.types || {})[0];

    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingReciptNo, setExistingReciptNo] = useState('');
    const [errors, setErrors] = useState({});
    const [voucherNo, setVoucherNo] = useState('');
    const [resetTableKey, setResetTableKey] = useState(0);

    const [bankCash, setBankCash] = useState([]);
    const [employees, setEmplyees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [currencyConvertionData, setCurrencyConvertionData] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [time, setTime] = useState("");
    const [documents, setDocuments] = useState([]);            // File[] — newly attached
    const [existingDocuments, setExistingDocuments] = useState([]); // string[] — URLs from server
    const [removedDocuments, setRemovedDocuments] = useState([]);   // string[] — URLs user removed

    // ===== PRINT STATE =====
    const [isPrinting, setIsPrinting] = useState(false);

    const hasFetchedVoucherRef = React.useRef(false);

    // Add useEffect to fetch data in edit mode
    useEffect(() => {
        if (editMode && reciptVoucherId && ledgers.length > 0 && !hasFetchedVoucherRef.current) {
            hasFetchedVoucherRef.current = true;
            fetchReceiptData();
        }
    }, [reciptVoucherId, editMode, ledgers]);

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false);

    const genarateSalesReciptVoucherNo = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Receipt Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherNo(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Receipt Voucher");

    const [formData, setFormData] = useState({
        voucherType: "Receipt Voucher",
        yearId: currentFinancialYear?.yearId || 0,
        date: new Date(),
        ledgerId: "",
        narration: "",
        totalAmount: 0,
        userId: userId,
        employeeId: "",
        costCentreId: null,
        currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
        ReferenceNo: "",
        ReferenceDate: new Date(),
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        vanExecutiveId: null,
        branchId: selectedBranchId,
        CreatedUser: userId,
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'A4',
        receiptDetails: [
            {
                SlNo: 1,
                ledgerId: null,
                ledgerName: '',
                amount: 0,
                Narration: "",
                chequeNo: null,
                chequeDate: "01-01-1753",
                currencyConversionId: currentCurrencyConversion?.currencyConversionId || null
            }
        ]
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            printType: invoicePrintConfig?.printType || 'A4'
        }));
    }, [printSettings]);

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

    // useEffect(() => {
    //     if (editMode) return;

    //     setFormData(prev => {
    //         const prevDate = new Date(prev.date);
    //         const today = new Date();

    //         const isSameDate =
    //             prevDate.getFullYear() === today.getFullYear() &&
    //             prevDate.getMonth() === today.getMonth() &&
    //             prevDate.getDate() === today.getDate();

    //         if (!isSameDate) {
    //             return { ...prev, date: today };
    //         }
    //         return prev;
    //     });
    // }, [time]);

    const [baseDataloading, setBaseDataloading] = useState(false)

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
        navigate('/transaction/reciept-voucher');
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
            voucherType: "Receipt Voucher",
            yearId: currentFinancialYear?.yearId || 0,
            date: new Date(),
            ledgerId: "",
            narration: "",
            totalAmount: 0,
            userId: userId,
            employeeId: "",
            costCentreId: null,
            currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
            ReferenceNo: "",
            ReferenceDate: new Date(),
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            vanExecutiveId: null,
            branchId: selectedBranchId,
            CreatedUser: userId,
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
            receiptDetails: [
                {
                    SlNo: 1,
                    ledgerId: null,
                    ledgerName: '',
                    amount: 0,
                    Narration: "",
                    chequeNo: null,
                    chequeDate: "01-01-1753",
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId
                }
            ]
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
            receiptDetails: prev.receiptDetails
                .filter(detail => detail.SlNo !== slNo)
                .map((detail, index) => ({ ...detail, SlNo: index + 1 }))
        }));
    };


    const fetchFinanceData = async (silent = false) => {
        if (!silent) setBaseDataloading(true)
        try {
            const res = await axiosInstance.post('all-finance-data', {
                voucherType: "Receipt Voucher",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Supplier", "Customer&Supplier"],
                ledgerId: formData.ledgerId,
                currencyId: currentCurrency
            })
            const data = res?.data?.data;

            setBankCash(data?.bankaccountledgers5and8);
            setEmplyees(data?.employees)
            setCostCenters(data?.costcentre)
            setCurrency(data?.currencywithConversion)
            setLedgers(data?.accountLedger)
            setVoucherNo(data?.voucherdata?.voucherCode)
            setFormData(prev => ({
                ...prev,
                costCentreId: data?.costcentre?.length > 0 ? data?.costcentre[0]?.costCentreId : 1,
            }))

        } catch (error) {
            console.error('error fetching default data', error)
        } finally {
            if (!silent) setBaseDataloading(false)
        }
    }

    useEffect(() => {
        fetchFinanceData()
    }, [])

    // Fetch currency conversion records (same API as SalesInvoice)
    // This gives camelCase currencyId that SelecteCurrecyModal expects
    const fetchCurrencyConvertion = async () => {
        try {
            const response = await axiosInstance.get(`currency-conversions/${selectedBranchId}`);
            const formattedData = (response.data.data || []).map((item) => ({
                ...item,
            }));
            setCurrencyConvertionData(formattedData);
        } catch (error) {
            console.error('Error fetching currency conversions:', error);
        }
    };

    useEffect(() => {
        fetchCurrencyConvertion();
    }, [selectedBranchId]);

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
            const balance = res.data?.data?.currentbal || 0;
            return balance;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return 0;
        }
    };
  
    const fetchReceiptData = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-sales-receipt-byId/${reciptVoucherId}`);
            const data = response.data.data;

            setExistingReciptNo(data.voucherNo);

            // Prepare receipt details with proper data mapping
            let receiptDetailsForForm = [];

            if (data.receiptDetails && data.receiptDetails.length > 0) {
                receiptDetailsForForm = data.receiptDetails.map((detail, index) => {
                    // Parse the cheque date properly
                    let parsedChequeDate = "01-01-1753";
                    if (detail?.chequedate && detail?.chequedate !== "01-01-1753") {
                        try {
                            const datePart = detail.chequedate.split(' ')[0];
                            parsedChequeDate = datePart;
                        } catch (err) {
                            console.error("Error parsing cheque date:", err);
                            parsedChequeDate = "01-01-1753";
                        }
                    }

                    // Find the matching ledger from the ledgers array
                    const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerid);

                    return {
                        SlNo: index + 1,
                        ledgerId: detail?.ledgerid || 0,
                        ledgerName: matchingLedger?.ledgerName || '',
                        amount: parseFloat(detail?.amount) || 0,
                        Narration: detail?.narration || "",
                        chequeNo: detail?.chequeno || "",
                        chequeDate: parsedChequeDate,
                        currencyConversionId: detail?.currencyconversionid || null,
                        ledgerBalance: 0,
                        billByBill: matchingLedger?.billBybill || false,
                        partyDetails: (data.partyDetails || []).filter(
                            p => String(p.ledgerId) === String(detail.ledgerid)
                        ),
                    };
                });
            } else {
                receiptDetailsForForm = [{
                    SlNo: 1,
                    ledgerId: 0,
                    ledgerName: '',
                    amount: 0,
                    Narration: "",
                    chequeNo: "",
                    chequeDate: "01-01-1753",
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
                    ledgerBalance: 0,
                    billByBill: false,
                }];
            }

            setFormData({
                voucherType: "Receipt Voucher",
                yearId: currentFinancialYear?.yearId || data.yearId,
                receiptMasterId: data.receiptMasterId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                narration: data.narration || "",
                totalAmount: parseFloat(data.totalAmount) || 0,
                userId: userId,
                employeeId: data.employeeId || "",
                costCentreId: data.costCentreId || 1,
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? parseDateFromAPI(data.ReferenceDate) : new Date(),
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : null,
                vanExecutiveId: data.vanExecutiveId || null,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                exchangeRate: currentCurrencyConversion?.rate,
                exchangeDate: currentCurrencyConversion?.date,
                printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
                receiptDetails: receiptDetailsForForm,
                partyDetails: data.partyDetails || [],
                printType: (invoicePrintConfig?.printType || 'A4'),
            });
            setExistingDocuments(data.Documents || []);
            setRemovedDocuments([]);
            // Fetch ledger balances for each detail
            if (data.receiptDetails && data.receiptDetails.length > 0) {
                const updatedDetails = await Promise.all(
                    data.receiptDetails.map(async (detail, index) => {
                        const balance = await fetchLedgerBalance(detail.ledgerid);
                        const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerid);

                        let parsedChequeDate = "01-01-1753";
                        if (detail?.chequedate && detail?.chequedate !== "01-01-1753") {
                            const datePart = detail.chequedate.split(' ')[0];
                            parsedChequeDate = datePart;
                        }

                        return {
                            SlNo: index + 1,
                            ledgerId: detail?.ledgerid || 0,
                            ledgerName: matchingLedger?.ledgerName || '',
                            amount: parseFloat(detail?.amount) || 0,
                            Narration: detail?.narration || "",
                            chequeNo: detail?.chequeno || "",
                            chequeDate: parsedChequeDate,
                            currencyConversionId: detail?.currencyconversionid || null,
                            ledgerBalance: balance,
                            billByBill: matchingLedger?.billBybill || false,
                            partyDetails: (data.partyDetails || []).filter(
                                p => String(p.ledgerId) === String(detail.ledgerid)
                            ),
                        };
                    })
                );

                setFormData(prev => ({
                    ...prev,
                    receiptDetails: updatedDetails
                }));
            }

        } catch (error) {
            console.error('Error fetching receipt data:', error);

            showToast.error(t('recieptVoucher.form.messages.fetchError'))
        } finally {
            setFetchLoading(false)
        }
    };

    // Update ledger names once ledgers are loaded
    useEffect(() => {
        if (ledgers && ledgers.length > 0 && formData.receiptDetails) {
            const updatedDetails = formData.receiptDetails.map(detail => {
                const ledger = ledgers.find(l => l.ledgerId === detail.ledgerId);
                return {
                    ...detail,
                    ledgerName: ledger?.ledgerName || '',
                    billByBill: ledger?.billBybill || false
                };
            });
            setFormData(prev => ({
                ...prev,
                receiptDetails: updatedDetails
            }));
        }
    }, [ledgers]);

    // ===== PRINT HELPERS =====
    // Cash/Bank ledger name shown at the top of the voucher (formData.ledgerId is the
    // Cash/Bank account this receipt was posted against, resolved from `bankCash`).
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
    // SINGLE SOURCE OF TRUTH for receipt voucher print types.
    // To add a new layout: import it above, add ONE entry here. Nothing else
    // needs to change — the dropdown (invoiceTypes) already reads from
    // printSettings["Receipt Voucher"].types, so as soon as that config exists
    // server-side and a matching key is added here, it shows up automatically.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const RECEIPT_PRINT_HANDLERS = {
        'A4': { print: printReceiptVoucher, pdf: saveReceiptVoucherAsPDF },
        'A5': { print: printReceiptVoucherA5, pdf: saveReceiptVoucherAsPDFA5 },
        // 'Thermal': { print: printReceiptVoucherThermal, pdf: saveReceiptVoucherThermalAsPDF },
    };

    const DEFAULT_RECEIPT_PRINT_TYPE = 'A4';
    const DEFAULT_RECEIPT_PDF_TYPE = 'A4';

    // mode: 'print' | 'pdf'
    const runVoucherOutput = useCallback((mode, voucherDataForPrint) => {

        const handlers = RECEIPT_PRINT_HANDLERS[formData.printType];


        const fn = handlers?.[mode]
            ?? RECEIPT_PRINT_HANDLERS[mode === 'pdf' ? DEFAULT_RECEIPT_PDF_TYPE : DEFAULT_RECEIPT_PRINT_TYPE][mode];

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
                text: t('ConfirmPrintText') || 'Are you sure you want to print this receipt voucher?',
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
            const voucherDataForPrint = buildVoucherDataForPrint(existingReciptNo);
            printToPrinterFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error printing receipt voucher:', error);
            showToast.error('Failed to print receipt voucher');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildVoucherDataForPrint, existingReciptNo, printToPrinterFn]);

    // ===== EDIT MODE: Reprint to PDF =====
    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const voucherDataForPrint = buildVoucherDataForPrint(existingReciptNo);
            printToPdfFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error generating receipt voucher PDF:', error);
            showToast.error('Failed to generate receipt voucher PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildVoucherDataForPrint, existingReciptNo, printToPdfFn]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check for Ctrl+S or Cmd+S
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault(); // prevent browser's Save dialog
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
            const validReceiptDetails = formData.receiptDetails.filter(
                detail => detail.ledgerId && detail.ledgerId !== 0
            );

            if (validReceiptDetails.length === 0) {

                showToast.error(t('recieptVoucher.form.messages.selectLedgerInAllRows'))

                return;
            }
            if (formData.totalAmount <= 0) {
                showToast.error(t("purchaseInvoice.form.messages.totalAmountError"));
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
            // Format the data
            const formattedData = {
                ...formData,
                totalAmount: (parseFloat(formData.totalAmount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                date: formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date,
                ReferenceDate: formData.ReferenceDate instanceof Date ? formData.ReferenceDate.toISOString().split('T')[0] : formData.ReferenceDate,
                postedDate: formData.postedDate instanceof Date ? formData.postedDate.toISOString().split('T')[0] : formData.postedDate,
                exchangeDate: formData.exchangeDate instanceof Date ? formData.exchangeDate.toISOString().split('T')[0] : formData.exchangeDate,
                receiptDetails: formData.receiptDetails
                    .filter(detail => detail.ledgerId && detail.ledgerId !== 0)
                    .map(detail => ({
                        SlNo: detail.SlNo,
                        ledgerId: detail.ledgerId,
                        amount: parseFloat(detail.amount) || 0,
                        Narration: detail.Narration || "",
                        chequeNo: detail.chequeNo || "",
                        chequeDate: detail.chequeDate instanceof Date
                            ? detail.chequeDate.toISOString().split('T')[0]
                            : detail.chequeDate || "01-01-1753",
                        currencyConversionId: detail.currencyConversionId || null,
                    })),
                partyDetails: formData.partyDetails && formData.partyDetails.length > 0
                    ? formData.partyDetails
                    : [],
            };

            if (editMode) {
                // Update
                const updateData = {
                    ...formattedData,
                    date: formatDateWithTime(formData.date),
                    ModifiedUser: userId,
                    receiptDetails: (formData.receiptDetails || []).map((detail) => ({
                        ...detail,
                        ModifiedUser: editMode ? userId : detail?.ModifiedUser ?? null,
                        ModifiedDate: editMode ? formatDateWithTime(new Date()) : null,
                    })),
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
                    response = await axiosInstance.post(`update-sales-receipt/${reciptVoucherId}`, fd, config);
                } else {
                    response = await axiosInstance.post(`update-sales-receipt/${reciptVoucherId}`, updateData);
                }

                if (response.data && !response.data.error) {
                    showToast.success(t('saveSuccess'));

                    // ===== PRINT LOGIC (edit mode: honor printAfterSave toggle) =====
                    if (formData?.printAfterSave) {
                        const freshData = response?.data?.data || {};
                        const voucherDataForPrint = buildVoucherDataForPrint(
                            existingReciptNo,
                            { ...formData, ...freshData }
                        );
                        printToPrinterFn(voucherDataForPrint);
                    }

                    if (purchaseSettings?.CloseAfterSave) {
                        navigate('/transaction/reciept-voucher');
                    }
                } else {
                    console.error(response.data.message || t('recieptVoucher.form.messages.updateError'));
                }
            } else {
                const dataToSave = {
                    ...formattedData,
                    date: formatDateWithTime(formData.date)
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
                    response = await axiosInstance.post('save-sales-receipt', fd, config);
                } else {
                    response = await axiosInstance.post('save-sales-receipt', dataToSave);
                }
                genarateSalesReciptVoucherNo()
                if (response.data && !response.data.error) {
                    showToast.success(t('saveSuccess'));

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

                    if (purchaseSettings?.CloseAfterSave) {
                        navigate('/transaction/reciept-voucher');
                    } else {
                        // Clear form first
                        clearForm(true);

                        // Then generate new voucher number in background
                        genarateSalesReciptVoucherNo();
                    }
                }
            }
        } catch (error) {
            console.error('Error saving receipt:', error);

            showToast.error(t('saveError'))

        } finally {
            setIsSubmitting(false);
        }
    };
    

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return <>
            <BreadCrumb
                routes={[
                    { title: t("recieptVoucher.breadcrumb.master"), url: "#" },
                    { title: t("recieptVoucher.form.breadcrumb.parent"), url: "/transaction/reciept-voucher" },
                    { title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Banknote, title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title") }}
            />
            <Preloader />
        </>
    }

    if (!hasAccess) return <NoAcessComponent message={message} />


    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <PopupPreloader
                isOpen={isSubmitting || isPrinting}
                state="loading"
                title={isPrinting ? (t("Printing") || "Preparing Print...") : (isSubmitting ? (editMode ? t("updating") : t("saving")) : "")}
                subtitle={isPrinting ? (t("printingDesc") || "Please wait while we prepare your voucher for printing...") : (t("loadingDesc") || "Please wait...")}
            />

            <BreadCrumb
                routes={[
                    { title: t("recieptVoucher.breadcrumb.master"), url: "#" },
                    { title: t("recieptVoucher.form.breadcrumb.parent"), url: "/transaction/reciept-voucher" },
                    { title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Banknote, title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title") }}
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
                        : []
                    ),
                ]}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSaveReceiptVoucher"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSaveReceiptVoucher"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                            >
                                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                            </label>
                        </div>
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
            <div className='p-1' key={resetTableKey}>
                <ReciptVoucherFormHeader
                    existingReciptNo={existingReciptNo}
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                    errors={errors}
                    voucherNo={voucherNo}
                    bankCash={bankCash}
                    setBankCash={setBankCash}
                    employees={employees}
                    setEmplyees={setEmplyees}
                    costCenters={costCenters}
                    documents={documents}
                    setDocuments={setDocuments}
                    existingDocuments={existingDocuments}
                    setExistingDocuments={setExistingDocuments}
                    removedDocuments={removedDocuments}
                    setRemovedDocuments={setRemovedDocuments}
                    currency={currency}
                    currencyConvertionData={currencyConvertionData}
                    financeSettings={financeSettings}
                />
                <RecieptVoucherFormTable
                    formData={formData}
                    setFormData={setFormData}
                    currency={currency}
                    ledgers={ledgers}
                    onRowRemove={handleRowRemove}
                    onLedgerCreated={() => fetchFinanceData(true)}
                />
                <RecieptVoucherFormFooter
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                />
            </div>
        </div>
    )
}

export default ReceptVoucherForm