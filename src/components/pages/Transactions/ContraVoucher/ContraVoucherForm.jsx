import BreadCrumb from '@/components/common/BreadCrumb'
import usePrivileges from '@/lib/hooks/usePrivileges'
import useUnsavedChangesWarning from '@/lib/hooks/useUnsavedChangesWarning'
import { ArrowLeftRight, SaveAll, Trash2, Table, Eraser } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import ContraVoucherFormHeader from './ContraVoucherFormHeader'
import useAuth from '@/redux/hook/auth/useAuth'
import { useSelector } from 'react-redux'
import ContraVoucherFormTable from './ContraVoucherFormTable'
import ContraVoucherFormFooter from './ContraVoucherFormFooter'
import axiosInstance from '@/lib/axiosConfig'
import Preloader from '@/components/common/Preloader'
import PopupPreloader from '@/components/common/PopupPreloader'
import Swal from 'sweetalert2'
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat'
import { showToast } from '@/utils/toast'
import PrintDropdown from '@/components/common/PrintDropdown'
import { Checkbox } from '@/components/ui/checkbox'
import printContraVoucher, { saveContraVoucherAsPDF } from '@/utils/prints/contraVoucherPrints/ContraVoucherPrintOne'
import printContraVoucherA5, { saveContraVoucherAsPDFA5 } from '@/utils/prints/contraVoucherPrints/ContraVoucherPrintA5'
import { isElectron } from '@/utils/electronPrint'
// ✅ Helper: Format Date → "YYYY-MM-DD HH:mm:ss" for API
const formatDateForAPI = (date) => {
    if (!date || date === "01-01-1753") return date;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return date;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const ContraVoucherForm = () => {
    const { t } = useTranslation();
    const { contraVoucherId } = useParams()
    const editMode = Boolean(contraVoucherId);
    const { userId, currentFinancialYear, selectedBranchId, selectedBranchDetails, currentCurrencyConversion, currentCurrency } = useAuth();
    const { generalSettings, purchaseSettings, printSettings } = useSelector((state) => state.settings);
    const invoiceTypes = Object.keys(printSettings?.["Contra Voucher"]?.types || {});
    const invoicePrintConfig = printSettings?.["Contra Voucher"]?.default || Object.values(printSettings?.["Contra Voucher"]?.types || {})[0];
    const navigate = useNavigate();
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingContraNo, setExistingContraNo] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialFormData, setInitialFormData] = useState(null);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [time, setTime] = useState("");
    const [ledgerBalance, setLedgerBalance] = useState(null);
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

    const { privileges, loading: privilegeLoading } = usePrivileges("Contra Voucher");

    // ✅ REMOVED: ReferenceNo, ReferenceDate, userId from formData
    const [formData, setFormData] = useState({
        voucherType: "Contra Voucher",
        type: "Deposit",
        yearId: currentFinancialYear?.yearId || 0,
        date: new Date(),
        ledgerId: "",
        narration: "",
        totalAmount: 0,
        costCentreId: null,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        exchangeRate: currentCurrencyConversion?.rate || 1,
        exchangeDate: currentCurrencyConversion?.date || new Date(),
        contraDetails: [
            {
                SlNo: 1,
                ledgerId: "",
                amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                chequeNo: "",
                chequeDate: "01-01-1753"
            }
        ],
        printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
        printType: invoicePrintConfig?.printType || 'A4',
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
            printType: invoicePrintConfig?.printType || 'A4'
        }));
    }, [printSettings]);

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
    const [voucherNo, setVoucherNo] = useState('');
    const [baseDataloading, setBaseDataloading] = useState(false)
    const [bankCash, setBankCash] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [ledgers, setLedgers] = useState([]);

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
        navigate('/transaction/contra-voucher');
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
        const initial = {
            voucherType: "Contra Voucher",
            type: "Deposit",
            yearId: currentFinancialYear?.yearId || 0,
            date: new Date(),
            ledgerId: "",
            narration: "",
            totalAmount: 0,
            costCentreId: 1,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            exchangeRate: currentCurrencyConversion?.rate || 1,
            exchangeDate: currentCurrencyConversion?.date || new Date(),
            contraDetails: [{
                SlNo: 1,
                ledgerId: "",
                amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                chequeNo: "",
                chequeDate: "01-01-1753"
            }],
            printAfterSave: purchaseSettings?.printAfterSave !== undefined ? purchaseSettings.printAfterSave : true,
            printType: invoicePrintConfig?.printType || 'A4',
        };
        setFormData(initial);
        setInitialFormData(JSON.parse(JSON.stringify(initial)));
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
            contraDetails: prev.contraDetails
                .filter(detail => detail.SlNo !== slNo)
                .map((detail, index) => ({ ...detail, SlNo: index + 1 }))
        }));
    };


    // ===== PRINT HELPERS =====
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
            contraDetails: (base.contraDetails || []).map(d => ({
                ...d,
                ledgerName: d.ledgerName || ledgers?.find(l => l.ledgerId === d.ledgerId)?.ledgerName || '',
            })),
        };
    }, [formData, voucherNo, getBankCashName, ledgers]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SINGLE SOURCE OF TRUTH for contra voucher print types.
    // To add a new layout: import it above, add ONE entry here.
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const CONTRA_PRINT_HANDLERS = {
        'A4': { print: printContraVoucher, pdf: saveContraVoucherAsPDF },
        'A5': { print: printContraVoucherA5, pdf: saveContraVoucherAsPDFA5 },
    };

    const DEFAULT_CONTRA_PRINT_TYPE = 'A4';
    const DEFAULT_CONTRA_PDF_TYPE = 'A4';

    // mode: 'print' | 'pdf'
    const runVoucherOutput = useCallback((mode, voucherDataForPrint) => {
        const handlers = CONTRA_PRINT_HANDLERS[formData.printType];

        const fn = handlers?.[mode]
            ?? CONTRA_PRINT_HANDLERS[mode === 'pdf' ? DEFAULT_CONTRA_PDF_TYPE : DEFAULT_CONTRA_PRINT_TYPE][mode];

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
                text: t('ConfirmPrintText') || 'Are you sure you want to print this contra voucher?',
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
            const voucherDataForPrint = buildVoucherDataForPrint(existingContraNo);
            printToPrinterFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error printing contra voucher:', error);
            showToast.error('Failed to print contra voucher');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildVoucherDataForPrint, existingContraNo, printToPrinterFn]);

    // ===== EDIT MODE: Reprint to PDF =====
    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const voucherDataForPrint = buildVoucherDataForPrint(existingContraNo);
            printToPdfFn(voucherDataForPrint);

            if (isElectron()) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } catch (error) {
            console.error('Error generating contra voucher PDF:', error);
            showToast.error('Failed to generate contra voucher PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildVoucherDataForPrint, existingContraNo, printToPdfFn]);

    const fetchFinanceData = async (silent = false) => {
        if (!silent) setBaseDataloading(true)
        try {
            const res = await axiosInstance.post('all-finance-data', {
                voucherType: "Contra Voucher",
                branchId: selectedBranchId,
                yearId: currentFinancialYear.yearId,
                ledgerTypes: ["Supplier", "Customer&Supplier"],
                ledgerId: formData.ledgerId,
                currencyId: currentCurrency?.currencyId
            })
            const data = res?.data?.data;
            setVoucherNo(data?.voucherdata?.voucherCode)
            setBankCash(data?.bank);
            setCostCenters(data?.costcentre)
            setLedgers(data?.bankaccountledgers5and8)
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

    const hasUnsavedChanges = initialFormData !== null &&
        JSON.stringify(formData) !== JSON.stringify(initialFormData);

    useUnsavedChangesWarning(hasUnsavedChanges, isSubmitting);

    const handleFormChange = (name, valueOrEvent) => {
        const value = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchContraData = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-contra-voucher-byId/${contraVoucherId}`);
            const data = response.data.data;

            setExistingContraNo(data.contraNo);

            // ✅ REMOVED: ReferenceNo, ReferenceDate, userId
            const fetchedFormData = {
                voucherType: "Contra Voucher",
                type: data.type || "Deposit",
                yearId: currentFinancialYear?.yearId || data.yearId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                narration: data.narration || "",
                totalAmount: parseFloat(data.totalAmount) || 0,
                costCentreId: data.costCentreId || null,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : null,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                exchangeRate: currentCurrencyConversion?.rate || 1,
                exchangeDate: currentCurrencyConversion?.date || new Date(),
                contraDetails: data.contraDetails?.map((detail, index) => ({
                    SlNo: index + 1,
                    ledgerId: detail.ledgerId || "",
                    amount: (parseFloat(detail.amount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                    chequeNo: detail.chequeNo || "",
                    chequeDate: detail.chequeDate && detail.chequeDate !== "01-01-1753"
                        ? parseDateFromAPI(detail.chequeDate)
                        : "01-01-1753"
                })) || [{
                    SlNo: 1,
                    ledgerId: "",
                    amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
                    chequeNo: "",
                    chequeDate: "01-01-1753"
                }]
            };

            setFormData(fetchedFormData);
            setInitialFormData(JSON.parse(JSON.stringify(fetchedFormData)));
        } catch (error) {
            console.error('Error fetching contra data:', error);
            showToast.error(t('contraVoucher.form.messages.fetchError') || 'Failed to fetch contra data');
        } finally {
            setFetchLoading(false)
        }
    };

    useEffect(() => {
        if (editMode && contraVoucherId) {
            fetchContraData();
        } else {
            setInitialFormData(JSON.parse(JSON.stringify(formData)));
        }
    }, [contraVoucherId, editMode]);

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
        if (!formData.type) {
            newErrors.type = t("requiredFieldsError");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (isSubmitting) return;
        if (!validateForm()) return;

        try {
            const hasEmptyLedger = formData.contraDetails.some(detail => !detail.ledgerId);

            if (hasEmptyLedger) {
                showToast.error(t('contraVoucher.form.messages.selectLedgerInAllRows') || 'Please select ledger in all rows');
                setIsSubmitting(false);
                return;
            }
            // Negative cash transaction validation
            const selectedMasterLedger = bankCash.find(l => l.ledgerId === formData.ledgerId);
            const isCashOrBank = [8].includes(selectedMasterLedger?.groupId);

            // Negative cash transaction validation — check each detail row
            if (generalSettings?.negativeCashTransaction !== 'Allow') {
                for (const detail of formData.contraDetails) {
                    if (!detail.ledgerId) continue;

                    // Match by coercing both to Number to avoid string/int mismatch
                    const detailLedger = ledgers.find(l => Number(l.ledgerId) === Number(detail.ledgerId));

                    // Only validate cash ledgers (groupId 8)
                    if (!detailLedger || Number(detailLedger.groupId) !== 8) continue;

                    const balance = await fetchLedgerBalance(detail.ledgerId);
                    const wouldBeBalance = balance - parseFloat(detail.amount || 0);

                    if (wouldBeBalance < 0) {
                        if (generalSettings?.negativeCashTransaction === 'Block') {
                            await Swal.fire({
                                title: t('contraVoucher.form.messages.negativeCashBlockTitle') || 'Transaction Blocked',
                                text: `Insufficient balance for "${detailLedger.ledgerName}". Available: ${Number(balance).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(detail.amount).toFixed(generalSettings?.decimalPart ?? 2)}`,
                                icon: 'error',
                                confirmButtonColor: '#d33',
                                confirmButtonText: t('Ok') || 'Ok',
                            });
                            return;
                        }

                        if (generalSettings?.negativeCashTransaction === 'Warn') {
                            const result = await Swal.fire({
                                title: t('contraVoucher.form.messages.lowBalanceCashWarnTitle') || 'Low Balance Warning',
                                text: `"${detailLedger.ledgerName}" will result in a negative balance. Available: ${Number(balance).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(detail.amount).toFixed(generalSettings?.decimalPart ?? 2)}. Continue?`,
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
            }

            setIsSubmitting(true);

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

            // ✅ Build payload matching EXACTLY what the API expects
            const payload = {
                voucherType: formData.voucherType,
                yearId: formData.yearId,
                branchId: formData.branchId,
                date: formatDateForAPI(formData.date),
                ledgerId: Number(formData.ledgerId),
                type: formData.type,
                narration: formData.narration,
                totalAmount: parseFloat(formData.totalAmount) || 0,
                costCentreId: formData.costCentreId ? Number(formData.costCentreId) : null,
                postedStatus: formData.postedStatus,
                postedBy: formData.postedBy,
                postedDate: formData.postedDate ? formatDateForAPI(formData.postedDate) : null,
                exchangeRate: parseFloat(formData.exchangeRate) || 1,
                exchangeDate: formatDateForAPI(formData.exchangeDate),
                CreatedUser: formData.CreatedUser,
                contraDetails: formData.contraDetails.map(detail => ({
                    ledgerId: Number(detail.ledgerId),
                    amount: (parseFloat(detail.amount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
                    chequeNo: detail.chequeNo || "",
                    CreatedUser: formData.CreatedUser,
                    CreatedDate: new Date(),
                    chequeDate: detail.chequeDate === "01-01-1753"
                        ? "01-01-1753"
                        : formatDateForAPI(detail.chequeDate)
                }))
            };

            // ✅ Log payload to verify before sending

            if (editMode) {
                // ✅ For update: remove fields not needed, add ModifiedUser
                const updatePayload = { ...payload, ModifiedUser: userId, date: formatDateWithTime(payload.date) };
                delete updatePayload.voucherType;
                delete updatePayload.yearId;
                delete updatePayload.CreatedUser;

                const response = await axiosInstance.post(
                    `update-contra-voucher/${contraVoucherId}`,
                    updatePayload
                );

                if (response.data && !response.data.error) {
                    setInitialFormData(JSON.parse(JSON.stringify(formData)));
                    showToast.success(t('updateSuccess') || 'Contra updated successfully');

                    // ===== PRINT LOGIC (edit mode) =====
                    if (formData?.printAfterSave) {
                        const freshData = response?.data?.data || {};
                        const voucherDataForPrint = buildVoucherDataForPrint(
                            existingContraNo,
                            { ...formData, ...freshData }
                        );
                        printToPrinterFn(voucherDataForPrint);
                    }

                    if (purchaseSettings?.CloseAfterSave) {
                        navigate('/transaction/contra-voucher');
                    }
                } else {

                    showToast.error(response.data.message || t('updateError'));
                }
            } else {
                const dataToSave = {
                    ...payload,
                    date: formatDateWithTime(payload.date)
                };
                const response = await axiosInstance.post('save-contra-voucher', dataToSave);

                if (response.data && !response.data.error) {
                    setInitialFormData(JSON.parse(JSON.stringify(formData)));
                    showToast.success(t('saveSuccess') || 'Contra saved successfully');

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
                        navigate('/transaction/contra-voucher');
                    } else {
                        await clearForm(true);
                    }
                } else {
                    showToast.error(response.data.message || t('saveError'));
                }
            }

        } catch (error) {
            console.error('Error saving contra:', error);
            showToast.error(error.response?.data?.message || t('saveError'));
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
            await axiosInstance.get(`delete-contra-voucher/${contraVoucherId}`);
            setInitialFormData(JSON.parse(JSON.stringify(formData)));
            showToast.success(t("deleteSuccess"));
            setTimeout(() => navigate('/transaction/contra-voucher'), 1000);
        } catch (error) {
            console.error('Error deleting contra:', error);
            showToast.error(error.response?.data?.message || t('deleteError') || 'Failed to delete contra');
        }
    };

    if (fetchLoading || baseDataloading) {
        return <>
            <BreadCrumb
                routes={[
                    { title: t("contraVoucher.breadcrumb.master"), url: "#" },
                    { title: t("contraVoucher.form.breadcrumb.parent"), url: "/transaction/contra-voucher" },
                    { title: editMode ? t("contraVoucher.form.breadcrumb.edit.title") : t("contraVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ArrowLeftRight,
                    title: editMode ? t("contraVoucher.form.breadcrumb.edit.title") : t("contraVoucher.form.breadcrumb.title")
                }}
            />
            <Preloader />
        </>
    }

    return (
        <div>

            <BreadCrumb
                routes={[
                    { title: t("contraVoucher.breadcrumb.master"), url: "#" },
                    { title: t("contraVoucher.form.breadcrumb.parent"), url: "/transaction/contra-voucher" },
                    { title: editMode ? t("contraVoucher.form.breadcrumb.edit.title") : t("contraVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ArrowLeftRight,
                    title: editMode ? t("contraVoucher.form.breadcrumb.edit.title") : t("contraVoucher.form.breadcrumb.title")
                }}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSaveContraVoucher"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSaveContraVoucher"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                            >
                                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave") || "Print After Save"}
                            </label>
                        </div>
                        {invoiceTypes.length > 0 && (
                            <select
                                name="printType"
                                id="printTypeContraVoucher"
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
                        ? [{
                            label: isSubmitting
                                ? (editMode ? t("updating") : t("saving"))
                                : (editMode ? t("updateBtn") : t("submitBtn")),
                            icon: SaveAll,
                            type: "primary",
                            onClick: () => handleSubmit(),
                            disabled: isSubmitting,
                        }]
                        : []),
                    ...(editMode && privileges?.can_delete
                        ? [{
                            label: t("deleteBtn"),
                            icon: Trash2,
                            type: "destructive",
                            onClick: handleDelete,
                        }]
                        : []),
                ]}
            />
            <PopupPreloader
                isOpen={isSubmitting || isPrinting}
                state="loading"
                title={isPrinting ? (t("Printing") || "Preparing Print...") : (isSubmitting ? (editMode ? t("updating") : t("saving")) : "")}
                subtitle={isPrinting ? (t("printingDesc") || "Please wait while we prepare your voucher for printing...") : (t("loadingDesc") || "Please wait...")}
            />
            <div className='p-1 sm:p-2 lg:p-4' key={resetTableKey}>
                <ContraVoucherFormHeader
                    existingContraNo={existingContraNo}
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                    errors={errors}
                    voucherNo={voucherNo}
                    bankCash={bankCash}
                    setBankCash={setBankCash}
                    costCenters={costCenters}
                    ledgerBalance={ledgerBalance}
                    setLedgerBalance={setLedgerBalance}
                />
                <ContraVoucherFormTable
                    formData={formData}
                    setFormData={setFormData}
                    ledgers={ledgers}
                    onRowRemove={handleRowRemove}
                    onLedgerCreated={() => fetchFinanceData(true)}
                />
                <ContraVoucherFormFooter
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                />
            </div>
        </div>
    )
}

export default ContraVoucherForm