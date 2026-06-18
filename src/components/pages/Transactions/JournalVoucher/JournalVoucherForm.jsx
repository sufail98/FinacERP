import BreadCrumb from '@/components/common/BreadCrumb'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Archive, ArchiveRestore, BookOpen, Eraser, Loader2, Pencil, SaveAll, Table, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import JournalVoucherFormHeader from './JournalVoucherFormHeader'
import useAuth from '@/redux/hook/auth/useAuth'
import { useSelector } from 'react-redux'
import JournalVoucherFormTable from './JournalVoucherFormTable'
import JournalVoucherFormFooter from './JournalVoucherFormFooter'
import axiosInstance from '@/lib/axiosConfig'
import AlertBox from '@/components/common/AlertBox'
import Preloader from '@/components/common/Preloader'
import Swal from 'sweetalert2'
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat'
import { showToast } from '@/utils/toast'
import PopupPreloader from '@/components/common/PopupPreloader'

const JournalVoucherForm = () => {
    const { t } = useTranslation();
    const { journalVoucherId } = useParams()
    const editMode = Boolean(journalVoucherId);
    const { userId, currentFinancialYear, selectedBranchId, currentCurrencyConversion, currentCurrency } = useAuth();
    const { generalSettings, purchaseSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingJournalNo, setExistingJournalNo] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voucherNo, setVoucherNo] = useState('');
    const [resetTableKey, setResetTableKey] = useState(0);
    const [time, setTime] = useState("");
    const [ledgerBalance, setLedgerBalance] = useState(null);

    // ===== HOLD VOUCHER STATE =====
    const [heldVouchers, setHeldVouchers] = useState([]);
    const [showHeldVouchers, setShowHeldVouchers] = useState(false);
    const [restoredHeldVoucherId, setRestoredHeldVoucherId] = useState(null);

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

    // Create ref for JournalVoucherFormTable
    const tableRef = useRef(null);

    const { privileges, loading: privilegeLoading } = usePrivileges("Journal Voucher");

    const [formData, setFormData] = useState({
        voucherType: "Journal Voucher",
        branchId: selectedBranchId,
        yearId: currentFinancialYear?.yearId || 0,
        date: new Date(),
        narration: "",
        totalAmount: 0,
        costCentreId: null,
        referenceNo: "",
        referenceDate: new Date(),
        postedStatus: generalSettings?.AccountPosting ? "Pending" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        CreatedUser: userId,
        exchangeRate: currentCurrencyConversion?.rate || 1.0,
        exchangeDate: currentCurrencyConversion?.date || new Date(),
        debitTotal: 0,
        creditTotal: 0,
        journalDetails: [
            {
                lineIndex: 1,
                branchId: "",
                ledgerId: "",
                ledgerName: "", // Add this
                debit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                credit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                Narration: "",
                RefNo: "",
                costCentreId: "",
                currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                ledgerBalance: (0).toFixed(generalSettings?.decimalPart ?? 2),
                billByBill: false // Add this
            }
        ],
        partyDetails: []
    });

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

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const [baseDataloading, setBaseDataloading] = useState(false)
    const [baseDataLoaded, setBaseDataLoaded] = useState(false) // Track if base data is loaded
    const [costCenters, setCostCenters] = useState([]);
    const [ledgers, setLedgers] = useState([]);




    // ===== HOLD VOUCHER LOGIC =====
    // Load held vouchers from localStorage on mount and whenever branch changes
    useEffect(() => {
        const loadHeldVouchers = () => {
            const savedHeldVouchers = localStorage.getItem('heldJournalVouchers');
            if (savedHeldVouchers) {
                try {
                    const allHeldVouchers = JSON.parse(savedHeldVouchers);
                    const branchHeldVouchers = allHeldVouchers.filter(voucher => voucher.branchId === selectedBranchId);
                    setHeldVouchers(branchHeldVouchers);
                } catch (error) {
                    console.error('Error parsing held vouchers from localStorage:', error);
                    setHeldVouchers([]);
                }
            }
        };

        loadHeldVouchers();
    }, [selectedBranchId]);

    useEffect(() => {
        const savedHeldVouchers = localStorage.getItem('heldJournalVouchers');
        const allHeldVouchers = savedHeldVouchers ? JSON.parse(savedHeldVouchers) : [];
        const otherBranchVouchers = allHeldVouchers.filter(voucher => voucher.branchId !== selectedBranchId);
        const updatedAllVouchers = [...otherBranchVouchers, ...heldVouchers];
        if (updatedAllVouchers.length > 0) {
            localStorage.setItem('heldJournalVouchers', JSON.stringify(updatedAllVouchers));
        } else {
            localStorage.removeItem('heldJournalVouchers');
        }
    }, [heldVouchers, selectedBranchId]);

    // Listen for localStorage changes from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'heldJournalVouchers' || event.key === null) {
                // Reload held vouchers from localStorage
                const savedHeldVouchers = localStorage.getItem('heldJournalVouchers');
                if (savedHeldVouchers) {
                    try {
                        const allHeldVouchers = JSON.parse(savedHeldVouchers);
                        const branchHeldVouchers = allHeldVouchers.filter(voucher => voucher.branchId === selectedBranchId);
                        setHeldVouchers(branchHeldVouchers);
                    } catch (error) {
                        console.error('Error parsing held vouchers:', error);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [selectedBranchId]);

    const holdCurrentVoucher = useCallback(() => {
        const validRows = tableRef.current?.getValidRows() || [];
        if (validRows.length === 0) {
            showToast.warning("No data to hold. Please add journal entries first.");
            return;
        }

        const heldVoucher = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            voucherNo: voucherNo,
            narration: formData.narration || 'No Description',
            debitTotal: formData.debitTotal || 0,
            creditTotal: formData.creditTotal || 0,
            entryCount: validRows.length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };

        setHeldVouchers(prev => [...prev, heldVoucher]);
        showToast.success(`Voucher held successfully. Total held vouchers: ${heldVouchers.length + 1}`);
        clearForm();
    }, [formData, voucherNo, heldVouchers.length, selectedBranchId]);

    useEffect(() => {
        if (!editMode) {
            const handleKeyDown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                    e.preventDefault();
                    holdCurrentVoucher();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [holdCurrentVoucher, editMode]);

    const restoreHeldVoucher = (heldVoucher) => {
        const validRows = tableRef.current?.getValidRows() || [];
        if (validRows.length > 0) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                voucherNo: voucherNo,
                narration: formData.narration || 'Current Voucher',
                debitTotal: formData.debitTotal || 0,
                creditTotal: formData.creditTotal || 0,
                entryCount: validRows.length,
                branchId: selectedBranchId,
                formData: { ...formData }
            };
            setHeldVouchers(prev => [...prev.filter(inv => inv.id !== heldVoucher.id), currentHeld]);
        } else {
            setHeldVouchers(prev => prev.filter(inv => inv.id !== heldVoucher.id));
        }

        setFormData(heldVoucher.formData);
        setVoucherNo(heldVoucher.voucherNo);
        setResetTableKey(prev => prev + 1);
        setShowHeldVouchers(false);
        setRestoredHeldVoucherId(heldVoucher.id);
        showToast.success("Voucher restored successfully");
    };

    const deleteHeldVoucher = (voucherId) => {
        setHeldVouchers(prev => prev.filter(inv => inv.id !== voucherId));
        showToast.success("Held voucher deleted");
    };

    const HeldVouchersPanel = () => {
        if (!showHeldVouchers || heldVouchers.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Vouchers ({heldVouchers.length})
                    </h3>
                    <button
                        onClick={() => setShowHeldVouchers(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldVouchers.map((voucher) => (
                        <div
                            key={voucher.id}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        Voucher: {voucher.voucherNo}
                                    </p>
                                    {voucher.narration && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {voucher.narration}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {voucher.entryCount} {voucher.entryCount === 1 ? 'entry' : 'entries'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-green-600 dark:text-green-400">Dr:</span>
                                            <span className="font-medium">
                                                {parseFloat(voucher.debitTotal || 0).toFixed(generalSettings?.decimalPart || 2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-red-600 dark:text-red-400">Cr:</span>
                                            <span className="font-medium">
                                                {parseFloat(voucher.creditTotal || 0).toFixed(generalSettings?.decimalPart || 2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                <span className="font-semibold">Date:</span> {new Date(voucher.formData.date).toLocaleDateString()}
                                <br />
                                <span className="font-semibold">Held at:</span> {new Date(voucher.timestamp).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => restoreHeldVoucher(voucher)}
                                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors"
                                >
                                    Restore
                                </button>
                                <button
                                    onClick={() => deleteHeldVoucher(voucher.id)}
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

    const clearForm = () => {
        setFormData({
            voucherType: "Journal Voucher",
            branchId: selectedBranchId,
            yearId: currentFinancialYear?.yearId || 0,
            date: new Date(),
            narration: "",
            totalAmount: 0,
            costCentreId: null,
            referenceNo: "",
            referenceDate: new Date(),
            postedStatus: generalSettings?.AccountPosting ? "Pending" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            CreatedUser: userId,
            exchangeRate: currentCurrencyConversion?.rate || 1.0,
            exchangeDate: currentCurrencyConversion?.date || new Date(),
            debitTotal: 0,
            creditTotal: 0,
            journalDetails: [{
                lineIndex: 1,
                branchId: "",
                ledgerId: "",
                ledgerName: "", // Add this
                debit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                credit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                Narration: "",
                RefNo: "",
                costCentreId: "",
                currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                ledgerBalance: (0).toFixed(generalSettings?.decimalPart ?? 2),
                billByBill: false // Add this
            }],
            partyDetails: []
        });
        setErrors({});
        setResetTableKey(prev => prev + 1);
    };

    // Fetch base data (ledgers, cost centers, etc.)
    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-finance-data', {
                    voucherType: "Journal Voucher",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;

                setVoucherNo(data?.voucherdata?.voucherCode)
                setCostCenters(data?.costcentre)
                setLedgers(data?.allAccountLedger)
                setBaseDataLoaded(true) // Mark base data as loaded

            } catch (error) {
                console.error('error fetching default data', error)
                setBaseDataLoaded(true) // Mark as loaded even if error
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])

    // Fetch journal data AFTER base data is loaded
    useEffect(() => {
        if (editMode && journalVoucherId && baseDataLoaded && ledgers.length > 0) {
            fetchJournalData();
        }
    }, [journalVoucherId, editMode, baseDataLoaded, ledgers]);

    const handleRowRemove = async (lineIndex) => {
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
            journalDetails: prev.journalDetails
                .filter(detail => detail.lineIndex !== lineIndex)
                .map((detail, index) => ({ ...detail, lineIndex: index + 1 }))
        }));
    };
    const generateJournalVoucherNo = async () => {
        setVoucherNumberGenarating(true)

        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Journal Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherNo(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

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

    const fetchJournalData = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-journal-voucher-byId/${journalVoucherId}`);
            const data = response.data.data;

            setExistingJournalNo(data.JournalNo);

            // Prepare journal details with proper ledger name mapping
            let journalDetailsForForm = [];

            if (data.journalDetails && data.journalDetails.length > 0) {
                journalDetailsForForm = data.journalDetails.map((detail, index) => {
                    // Find the matching ledger from the ledgers array
                    const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerId);

                    return {
                        lineIndex: detail.lineIndex || index + 1,
                        branchId: detail.branchId || '',
                        ledgerId: detail.ledgerId || "",
                        ledgerName: matchingLedger?.ledgerName || '', // Use the found ledger name
                        debit: detail.debit?.toString() || "0",
                        credit: detail.credit?.toString() || "0",
                        Narration: detail.Narration || "",
                        RefNo: detail.RefNo || "",
                        costCentreId: detail.costCentreId || "",
                        currencyConversionId: detail.currencyConversionId || "",
                        ledgerBalance: (0).toFixed(generalSettings?.decimalPart ?? 2),
                        billByBill: matchingLedger?.billBybill || false,
                    };
                });
            } else {
                journalDetailsForForm = [{
                    lineIndex: 1,
                    branchId: "",
                    ledgerId: "",
                    ledgerName: '',
                    debit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                    credit: (0).toFixed(generalSettings?.decimalPart ?? 2),
                    Narration: "",
                    RefNo: "",
                    costCentreId: "",
                    currencyConversionId: "",
                    ledgerBalance: (0).toFixed(generalSettings?.decimalPart ?? 2),
                    billByBill: false,
                }];
            }

            setFormData({
                voucherType: data.voucherType || "Journal Voucher",
                branchId: data.branchId,
                yearId: data.yearId,
                date: data.date ? parseDateFromAPI(data.date) : null,
                narration: data.narration || "",
                totalAmount: data.totalAmount || 0,
                costCentreId: data.costCentreId || null,
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? parseDateFromAPI(data.ReferenceDate) : null,
                postedStatus: data.postedStatus || "No",
                postedBy: data.postedBy || null,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : null,
                CreatedUser: data.createdUser || userId,
                exchangeRate: data.exchangeRate || currentCurrencyConversion?.rate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : currentCurrencyConversion?.date,
                debitTotal: data.journalDetails?.reduce((sum, row) => sum + (parseFloat(row.debit) || 0), 0) || 0,
                creditTotal: data.journalDetails?.reduce((sum, row) => sum + (parseFloat(row.credit) || 0), 0) || 0,
                journalDetails: journalDetailsForForm,
                partyDetails: data.partyDetails || []
            });

            // Fetch ledger balances for each detail
            if (data.journalDetails && data.journalDetails.length > 0) {
                const updatedDetails = await Promise.all(
                    data.journalDetails.map(async (detail, index) => {
                        const balance = await fetchLedgerBalance(detail.ledgerId);
                        const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerId);

                        return {
                            lineIndex: detail.lineIndex || index + 1,
                            branchId: detail.branchId || '',
                            ledgerId: detail.ledgerId || "",
                            ledgerName: matchingLedger?.ledgerName || '',
                            debit: detail.debit?.toString() || "0",
                            credit: detail.credit?.toString() || "0",
                            Narration: detail.Narration || "",
                            RefNo: detail.RefNo || "",
                            costCentreId: detail.costCentreId || "",
                            currencyConversionId: detail.currencyConversionId || "",
                            ledgerBalance: balance ? Number(balance).toFixed(generalSettings?.decimalPart ?? 2) : "0",
                            billByBill: matchingLedger?.billBybill || false,
                        };
                    })
                );

                setFormData(prev => ({
                    ...prev,
                    journalDetails: updatedDetails
                }));
            }

        } catch (error) {
            console.error('Error fetching journal data:', error);

            showToast.error(t('journalVoucher.form.messages.fetchError'))
        } finally {
            setFetchLoading(false)
        }
    };

    useEffect(() => {
        if (!editMode) {
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
        }
    }, [isSubmitting, formData, editMode]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.date) {
            newErrors.date = t("requiredFieldsError");
        }

        // Check if debit and credit totals match
        if (formData.debitTotal !== formData.creditTotal) {
            newErrors.totals = t("journalVoucher.form.messages.debitCreditMismatch");
            setAlert({
                id: Date.now(),
                type: "error",
                message: t('journalVoucher.form.messages.debitCreditMismatch')
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            // Get only valid rows (non-empty rows) from the table
            const validRows = tableRef.current?.getValidRows() || [];

            // Check if there are no valid rows
            if (validRows.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: "error",
                    message: t('Please fill the rows')
                });
                return;
            }

            // Check if any valid row has empty ledger
            const hasEmptyLedger = validRows.some(detail => !detail.ledgerId);

            if (hasEmptyLedger) {
                setAlert({
                    id: Date.now(),
                    type: "error",
                    message: t('journalVoucher.form.messages.selectLedgerInAllRows')
                });
                return;
            }
            if (generalSettings?.negativeCashTransaction !== 'Allow') {
                for (const detail of formData.journalDetails) {
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
                                text: `Insufficient balance for "${detailLedger.ledgerName}". Available: ${Number(balance).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(detail.credit || detail.debit).toFixed(generalSettings?.decimalPart ?? 2)}`,
                                icon: 'error',
                                confirmButtonColor: '#d33',
                                confirmButtonText: t('Ok') || 'Ok',
                            });
                            return;
                        }

                        if (generalSettings?.negativeCashTransaction === 'Warn') {
                            const result = await Swal.fire({
                                title: t('contraVoucher.form.messages.negativeCashWarnTitle') || 'Low Balance Warning',
                                text: `"${detailLedger.ledgerName}" will result in a negative balance. Available: ${Number(balance).toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${Number(detail.debit || detail.credit).toFixed(generalSettings?.decimalPart ?? 2)}. Continue?`,
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

          // AFTER
const allPartyDetails = validRows
    .filter(row => row.partyDetails && row.partyDetails.length > 0)
    .flatMap(row => {
        const rowCrOrDr = (parseFloat(row.debit) || 0) > 0 ? 'Dr' : 'Cr';
        return row.partyDetails.map(p => ({
            ...p,
            amount: parseFloat(p.amount) || 0,
            debit:  rowCrOrDr === 'Dr' ? (parseFloat(p.amount) || 0) : 0,
            credit: rowCrOrDr === 'Cr' ? (parseFloat(p.amount) || 0) : 0,
            crOrDr: rowCrOrDr,
        }));
    });

            // Format the data for API
            const formattedData = {
                voucherType: formData.voucherType,
                branchId: formData.branchId,
                yearId: formData.yearId,
                date: formData.date ? new Date(formData.date).toISOString().slice(0, 19).replace('T', ' ') : null,
                narration: formData.narration || "",
                totalAmount: parseFloat(formData.debitTotal) || 0,
                costCentreId: formData.costCentreId || null,
                referenceNo: formData.referenceNo || "",
                referenceDate: formData.referenceDate ? new Date(formData.referenceDate).toISOString().slice(0, 10) : null,
                postedStatus: formData.postedStatus || "Pending",
                postedBy: formData.postedBy || userId,
                postedDate: formData.postedDate ? new Date(formData.postedDate).toISOString().slice(0, 19).replace('T', ' ') : null,
                createdUser: userId,
                exchangeRate: parseFloat(formData.exchangeRate) || 1.0,
                exchangeDate: formData.exchangeDate ? new Date(formData.exchangeDate).toISOString().slice(0, 19).replace('T', ' ') : null,
                // Use validRows instead of formData.journalDetails
                journalDetails: validRows.map(detail => ({
                    branchId: selectedBranchId,
                    ledgerId: parseInt(detail.ledgerId),
                    credit: parseFloat(detail.credit) || 0,
                    debit: parseFloat(detail.debit) || 0,
                    currencyConversionId: detail.currencyConversionId ? parseInt(detail.currencyConversionId) : null,
                    lineIndex: detail.lineIndex,
                    Narration: detail.Narration || "",
                    RefNo: detail.RefNo || "",
                    costCentreId: detail.costCentreId ? parseInt(detail.costCentreId) : null
                })),
                partyDetails: allPartyDetails || []
            };

            const dataToSave = {
                ...formattedData,
                date: formatDateWithTime(formattedData.date)
            };

            if (editMode) {
                // Update existing journal voucher
                await axiosInstance.post(`update-journal-voucher/${journalVoucherId}`, dataToSave);
                showToast.success(t('updateSuccess'));

                // Navigate to list after update if setting is enabled
                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/journal-voucher');
                }
            } else {
                // Create new journal voucher
                await axiosInstance.post('save-journal-voucher', dataToSave);
                showToast.success(t('saveSuccess'));

                // Handle held vouchers cleanup
                if (restoredHeldVoucherId) {
                    setHeldVouchers(prev => prev.filter(inv => inv.id !== restoredHeldVoucherId));
                    setRestoredHeldVoucherId(null);
                }

                // Navigate to list or clear form based on setting
                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/journal-voucher');
                } else {
                    // Clear form after successful save
                    clearForm();
                    // Generate new voucher number for the next entry
                    await generateJournalVoucherNo();
                }
            }

        } catch (error) {
            console.error('Error saving journal:', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t('saveError') || 'Failed to save Journal Voucher',
            });
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
            await axiosInstance.get(`delete-journal-voucher/${journalVoucherId}`);
            setAlert({
                id: Date.now(),
                type: "success",
                message: t("deleteSuccess") || 'Journal Voucher deleted successfully'
            });
            setTimeout(() => {
                navigate('/transaction/journal-voucher');
            }, 1000);
        } catch (error) {
            console.error('Error deleting journal:', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t("deleteError") || 'Failed to delete Journal Voucher',
            });
        }
    };

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
        navigate('/transaction/journal-voucher');
    };

    // ===== BREADCRUMB ACTIONS =====
    const breadcrumbActions = [
        {
            label: t('listBtn'),
            icon: Table,
            type: 'secondary',
            title: "Go to voucher list",
            onClick: () => navigate('/transaction/journal-voucher'),
        },
        !editMode && {
            label: `Hold Voucher${heldVouchers.length > 0 ? ` (${heldVouchers.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentVoucher,
            title: "Hold the current voucher (CTRL + H)",
        },
        heldVouchers.length > 0 && !editMode && {
            label: "Restore",
            icon: ArchiveRestore,
            type: "secondary",
            title: "View and restore held vouchers",
            onClick: () => setShowHeldVouchers(!showHeldVouchers),
        },
        !editMode && {
            label: t('clearBtn'),
            icon: Eraser,
            type: 'secondary',
            title: "Clear all form fields",
            onClick: clearForm,
        },
        (privileges?.can_add || (editMode && privileges?.can_edit)) && {
            label: isSubmitting
                ? (editMode ? t("updating") : t("saving"))
                : (editMode ? t("updateBtn") : t("submitBtn")),
            icon: isSubmitting
                ? Loader2
                : editMode
                    ? Pencil
                    : SaveAll,
            type: "primary",
            title: editMode
                ? "Update the voucher (CTRL + S)"
                : "Save the voucher (CTRL + S)",
            onClick: () => { handleSubmit() },
            disabled: isSubmitting,
            loading: isSubmitting,
        },
        editMode && privileges?.can_delete && {
            label: t("deleteBtn"),
            icon: Trash2,
            type: "destructive",
            onClick: handleDelete,
        },
    ].filter(Boolean);

    if (fetchLoading || baseDataloading) {
        return <>
            <BreadCrumb
                routes={[
                    { title: t("journalVoucher.breadcrumb.master"), url: "#" },
                    { title: t("journalVoucher.form.breadcrumb.parent"), url: "/transaction/journal-voucher" },
                    { title: t("journalVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: t("journalVoucher.form.breadcrumb.title") }}
                actions={breadcrumbActions}
            />
            <Preloader />
        </>
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <PopupPreloader
                isOpen={isSubmitting}
                state="loading"
                title={t("loadingText")}
                subtitle={t("loadingDesc")}
            />
            <HeldVouchersPanel />

            <BreadCrumb
                routes={[
                    { title: t("journalVoucher.breadcrumb.master"), url: "#" },
                    { title: t("journalVoucher.form.breadcrumb.parent"), url: "/transaction/journal-voucher" },
                    { title: editMode ? t("journalVoucher.form.breadcrumb.edit.title") : t("journalVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: editMode ? t("journalVoucher.form.breadcrumb.edit.title") : t("journalVoucher.form.breadcrumb.title") }}
                actions={breadcrumbActions}
            />

            <div className='p-1' key={resetTableKey}>
                <JournalVoucherFormHeader
                    existingJournalNo={existingJournalNo}
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                    errors={errors}
                    voucherNo={voucherNo}
                    costCenters={costCenters}
                />
                <JournalVoucherFormTable
                    ref={tableRef}
                    formData={formData}
                    setFormData={setFormData}
                    currentCurrencyConversion={currentCurrencyConversion}
                    ledgers={ledgers}
                    costCenters={costCenters}
                    onRowRemove={handleRowRemove}
                    setLedgerBalance={fetchLedgerBalance}
                    ledgerBalance={ledgerBalance}
                />
            </div>
        </div>
    )
}

export default JournalVoucherForm