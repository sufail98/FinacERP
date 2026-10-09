import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { showToast } from '@/utils/toast';
import Swal from 'sweetalert2';
import CrDrLabel from '@/components/common/CrDrLabel';
import useAgainstModal from '@/lib/hooks/useAgainstModal';
import AgainstModal from '../RecieptVoucher/AgainstModal';
import { useParams } from 'react-router-dom';
import { sanitize } from '@/lib/inputSanitizer';
import LedgerCreationModal from '@/components/common/LedgerCreationModal';

// ─────────────────────────────────────────────────────────────────
// Simple hook to track mobile breakpoint (matches Tailwind's `md`)
// ─────────────────────────────────────────────────────────────────
const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};

const PaymentVoucherFormTable = ({ formData, setFormData, ledgers, currency, onRowRemove, onLedgerCreated }) => {
    const [validationErrors, setValidationErrors] = useState({});
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const { t } = useTranslation();
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { paymentVoucherId } = useParams();
    const isMobile = useIsMobile();

    // ── Suggestion state (ledger search) ──
    const [suggestions, setSuggestions] = useState({});
    const [activeSuggRow, setActiveSuggRow] = useState(null);
    const [selectedSuggIdx, setSelectedSuggIdx] = useState({});
    const suggRef = useRef(null);

    // ── Input local value overrides ──
    const [inputValues, setInputValues] = useState({});

    // ── Per-cell refs ──
    const inputRefs = useRef({});

    useEffect(() => {
        const syncRows = async () => {
            if (formData?.paymentDetails && formData.paymentDetails.length > 0) {
                let needsUpdate = false;
                const newRows = await Promise.all(
                    formData.paymentDetails.map(async (row) => {
                        if (row.ledgerId && row.ledgerId !== 0 && !row._balanceFetched) {
                            const balance = await fetchLedgerBalance(row.ledgerId);
                            needsUpdate = true;
                            return { ...row, ledgerBalance: balance, _balanceFetched: true };
                        }
                        return row;
                    })
                );

                if (needsUpdate) {
                    setRows(newRows);
                    setFormData(prev => ({ ...prev, paymentDetails: newRows }));
                } else {
                    setRows(formData.paymentDetails);
                }
            }
        };
        syncRows();
    }, [formData?.paymentDetails]);

    // Update the initial rows state to better handle edit mode
    const [rows, setRows] = useState(() => {
        if (formData?.paymentDetails?.length > 0) {
            return formData.paymentDetails;
        }
        return [{
            SlNo: 1,
            ledgerId: "",
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            Narration: "",
            chequeNo: "",
            chequeDate: "01-01-1753",
            currencyConversionId: "",
            ledgerBalance: null,
            _balanceFetched: true,
            billByBill: false,
        }];
    });
    // Update parent formData
    const updateFormData = (updatedRows) => {
        // Only count rows with a ledger selected
        const validRows = updatedRows.filter(row => row.ledgerId && row.ledgerId !== 0);
        const totalAmount = validRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
        const allPartyDetails = updatedRows
            .filter(row => row.partyDetails && row.partyDetails.length > 0)
            .flatMap(row => row.partyDetails);
        setFormData(prev => ({
            ...prev,
            paymentDetails: updatedRows, // keep all rows in UI
            totalAmount: totalAmount,
            partyDetails: allPartyDetails,
            isValid: validateAllRows(updatedRows)
        }));
    };
    const {
        againstModal,
        againstLoadingRow,
        closeAgainstModal,
        handleAgainstClick,
        handleAgainstRefresh,
        handleAgainstSave,
    } = useAgainstModal({
        voucherType: 'Payment Voucher',
        crOrDr: 'Dr',
        voucherId: paymentVoucherId,   // undefined in create mode → edit mode auto-detected
        rows,
        setRows,
        updateFormData,
    });

    // ─────────────────────────────────────────────────────────────────
    // Column order for keyboard navigation
    // ─────────────────────────────────────────────────────────────────
    const getColumns = () => {
        const cols = ['ledgerName', 'amount', 'chequeNo', 'chequeDate'];
        if (financeSettings?.multiCurrency) cols.push('currencyConversionId');
        cols.push('Narration');
        return cols;
    };

    // ─────────────────────────────────────────────────────────────────
    // Focus helper
    // ─────────────────────────────────────────────────────────────────
    const focusCell = (rowIndex, field, attempts = 0) => {
        const key = `${rowIndex}-${field}`;
        const el = inputRefs.current[key];
        if (el) {
            el.focus();
            setTimeout(() => { if (el.select) el.select(); }, 0);
            return;
        }
        if (attempts < 10) {
            setTimeout(() => focusCell(rowIndex, field, attempts + 1), 30);
        }
    };

    // Add new row
    const addNewRow = () => {
        const newRow = {
            SlNo: rows.length + 1,
            ledgerId: "",
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            Narration: "",
            chequeNo: "",
            chequeDate: "01-01-1753",
            currencyConversionId: "",
            ledgerBalance: null,
            _balanceFetched: true,
        };

        const updatedRows = [...rows, newRow];
        setRows(updatedRows);
        updateFormData(updatedRows);
    };

    // Delete row
    const deleteRow = async (index) => {
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
        if (rows.length === 1) { showToast.error('Cannot delete the last row'); return; }
        const updatedRows = rows.filter((_, i) => i !== index).map((row, i) => ({
            ...row,
            SlNo: i + 1
        }));
        setRows(updatedRows);
        updateFormData(updatedRows);

        // Clear validation errors for deleted row
        const newErrors = { ...validationErrors };
        delete newErrors[`chequeDate-${index}`];
        setValidationErrors(newErrors);
    };

    const validateRow = (row, index) => {
        const errors = {};

        if (row.chequeNo && row.chequeNo.trim() !== "") {
            if (!row.chequeDate || row.chequeDate === "01-01-1753") {
                errors[`chequeDate-${index}`] = t('requiredFieldsError');
            }
        }

        return errors;
    };

    // Validate all rows
    const validateAllRows = (rowsToValidate) => {
        let allErrors = {};
        rowsToValidate.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            allErrors = { ...allErrors, ...rowErrors };
        });
        setValidationErrors(allErrors);
        return Object.keys(allErrors).length === 0;
    };

    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );

            // Return the complete response data including crordr flag
            return res.data?.data || null;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return null;
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Ledger suggestion search
    // ─────────────────────────────────────────────────────────────────
    const filterLedgers = (search, rowIndex) => {
        if (!search?.trim()) {
            setSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
            setActiveSuggRow(null);
            return;
        }
        const lower = search.toLowerCase();
        const filtered = (ledgers || []).filter(l =>
            (l.ledgerName && l.ledgerName.toLowerCase().includes(lower)) ||
            (l.phoneNo && l.phoneNo.toLowerCase().includes(lower)) ||
            (l.tinNumber && l.tinNumber.toLowerCase().includes(lower)) ||
            (l.address && l.address.toLowerCase().includes(lower))
        );
        setSuggestions(prev => ({ ...prev, [rowIndex]: filtered }));
        setActiveSuggRow(rowIndex);
        setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: 0 }));
    };

    const selectLedger = async (rowIndex, ledger) => {
        const updatedRows = [...rows];
        updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            ledgerId: ledger.ledgerId,
            ledgerName: ledger.ledgerName,
            billByBill: ledger.billBybill || false,
            currencyConversionId: null,
        };

        // fetch balance
        const balance = await fetchLedgerBalance(ledger.ledgerId);
        updatedRows[rowIndex].ledgerBalance = balance;
        updatedRows[rowIndex]._balanceFetched = true;

        // clear input override so it shows the real name
        setInputValues(prev => {
            const s = { ...prev };
            delete s[`${rowIndex}-ledgerName`];
            return s;
        });

        setSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setActiveSuggRow(null);

        setRows(updatedRows);
        updateFormData(updatedRows);

        const isLastRow = rowIndex === updatedRows.length - 1;
        if (isLastRow) {
            const newRow = {
                SlNo: updatedRows.length + 1,
                ledgerId: 0,
                ledgerName: '',
                amount: 0,
                Narration: "",
                chequeNo: "",
                chequeDate: "01-01-1753",
                currencyConversionId: null,
                ledgerBalance: null,
                _balanceFetched: true,
                billByBill: false,
            };
            const rowsWithNew = [...updatedRows, newRow];
            setRows(rowsWithNew);
            updateFormData(rowsWithNew);
        }

        focusCell(rowIndex, 'amount');
    };

    // close suggestions on outside click
    useEffect(() => {
        const handler = (e) => {
            if (suggRef.current && !suggRef.current.contains(e.target)) {
                setActiveSuggRow(null);
                setSuggestions({});
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCellChange = async (index, field, value) => {
        const updatedRows = [...rows];
        let updatedValue = value;
        if (field === "chequeNo") {
            updatedValue = sanitize.numbers(value)
        }

        updatedRows[index][field] = updatedValue;

        // Reset cheque date to default if cheque number is cleared
        if (field === "chequeNo" && (!value || value.trim() === "")) {
            updatedRows[index].chequeDate = "01-01-1753";
        }

        setRows(updatedRows);
        updateFormData(updatedRows);

        // Validate the current row after change
        const rowErrors = validateRow(updatedRows[index], index);
        const newErrors = { ...validationErrors };

        // Clear or set error for this field
        if (field === "chequeNo" || field === "chequeDate") {
            delete newErrors[`chequeDate-${index}`];
            if (rowErrors[`chequeDate-${index}`]) {
                newErrors[`chequeDate-${index}`] = rowErrors[`chequeDate-${index}`];
            }
        }

        setValidationErrors(newErrors);
    };




    // ─────────────────────────────────────────────────────────────────
    // Keyboard navigation
    // ─────────────────────────────────────────────────────────────────
    const handleKeyDown = (e, rowIndex, field) => {
        const cols = getColumns();

        // ── Ledger suggestion navigation ──
        if (field === 'ledgerName' && activeSuggRow === rowIndex) {
            const list = suggestions[rowIndex] || [];
            const cur = selectedSuggIdx[rowIndex] ?? -1;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = cur < list.length - 1 ? cur + 1 : 0;
                setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: next }));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev2 = cur > 0 ? cur - 1 : list.length - 1;
                setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: prev2 }));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (cur >= 0 && list[cur]) {
                    selectLedger(rowIndex, list[cur]);
                    setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: -1 }));
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setActiveSuggRow(null);
                setSuggestions({});
                return;
            }
        }

        const colIdx = cols.indexOf(field);

        // ── Enter: move to next field based on flow ──
        if (e.key === 'Enter') {
            e.preventDefault();

            // ledgerName -> amount (only if ledger is selected)
            if (field === 'ledgerName') {
                if (rows[rowIndex]?.ledgerId && rows[rowIndex]?.ledgerId !== 0) {
                    focusCell(rowIndex, 'amount');
                }
                return;
            }

            // amount -> chequeNo
            if (field === 'amount') {
                focusCell(rowIndex, 'chequeNo');
                return;
            }

            // chequeNo -> chequeDate or skip if empty
            if (field === 'chequeNo') {
                if (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "") {
                    if (financeSettings?.multiCurrency) {
                        focusCell(rowIndex, 'currencyConversionId');
                    } else {
                        focusCell(rowIndex, 'Narration');
                    }
                } else {
                    focusCell(rowIndex, 'chequeDate');
                }
                return;
            }

            // chequeDate -> currencyConversionId (if exists) or Narration
            if (field === 'chequeDate') {
                if (financeSettings?.multiCurrency) {
                    focusCell(rowIndex, 'currencyConversionId');
                } else {
                    focusCell(rowIndex, 'Narration');
                }
                return;
            }

            // currencyConversionId -> Narration
            if (field === 'currencyConversionId') {
                focusCell(rowIndex, 'Narration');
                return;
            }

            // Narration -> next row ledgerName
            if (field === 'Narration') {
                const cols = getColumns();
                const narrationIdx = cols.indexOf('Narration');
                const nextField = cols[narrationIdx + 1]; // will be 'costCenter' if visible, else undefined

                if (nextField) {
                    // Still more columns after Narration (e.g. costCenter is visible)
                    focusCell(rowIndex, nextField);
                } else {
                    // Narration is the last column — move to next row's ledgerName
                    if (rowIndex < rows.length - 1) {
                        focusCell(rowIndex + 1, 'ledgerName');
                    } else {
                        addNewRow();
                        setTimeout(() => focusCell(rowIndex + 1, 'ledgerName'), 150);
                    }
                }
                return;
            }

            return;
        }

        // ── Tab: Similar to Enter ──
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();

            if (field === 'chequeNo') {
                if (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "") {
                    if (financeSettings?.multiCurrency) {
                        focusCell(rowIndex, 'currencyConversionId');
                    } else {
                        focusCell(rowIndex, 'Narration');
                    }
                    return;
                }
            }

            if (colIdx < cols.length - 1) {
                focusCell(rowIndex, cols[colIdx + 1]);
            } else if (rowIndex < rows.length - 1) {
                focusCell(rowIndex + 1, cols[0]);
            }
            return;
        }

        // ── Shift+Tab: Move backwards ──
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();

            if (field === 'chequeDate' && (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "")) {
                focusCell(rowIndex, 'chequeNo');
                return;
            }

            if (field === 'currencyConversionId' || (field === 'Narration' && !financeSettings?.multiCurrency)) {
                if (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "") {
                    focusCell(rowIndex, 'chequeNo');
                    return;
                }
            }

            if (colIdx > 0) {
                focusCell(rowIndex, cols[colIdx - 1]);
            } else if (rowIndex > 0) {
                focusCell(rowIndex - 1, cols[cols.length - 1]);
            }
            return;
        }

        // ── ArrowDown ──
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, field);
            return;
        }

        // ── ArrowUp ──
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rowIndex > 0) focusCell(rowIndex - 1, field);
            return;
        }

        // ── ArrowRight (at end of text) ──
        if (e.key === 'ArrowRight') {
            const el = e.target;

            if (el.type === 'date') {
                e.preventDefault();
                if (colIdx < cols.length - 1) {
                    focusCell(rowIndex, cols[colIdx + 1]);
                } else if (rowIndex < rows.length - 1) {
                    focusCell(rowIndex + 1, cols[0]);
                }
                return;
            }

            const atEnd = el.selectionStart === (el.value?.length ?? 0);
            if (atEnd) {
                e.preventDefault();
                if (colIdx < cols.length - 1) {
                    focusCell(rowIndex, cols[colIdx + 1]);
                } else if (rowIndex < rows.length - 1) {
                    focusCell(rowIndex + 1, cols[0]);
                }
            }
            return;
        }

        // ── ArrowLeft (at start of text) ──
        if (e.key === 'ArrowLeft') {
            const el = e.target;

            if (el.type === 'date') {
                e.preventDefault();
                if (colIdx > 0) {
                    focusCell(rowIndex, cols[colIdx - 1]);
                } else if (rowIndex > 0) {
                    focusCell(rowIndex - 1, cols[cols.length - 1]);
                }
                return;
            }

            const atStart = el.selectionStart === 0;
            if (atStart) {
                e.preventDefault();
                if (colIdx > 0) {
                    focusCell(rowIndex, cols[colIdx - 1]);
                } else if (rowIndex > 0) {
                    focusCell(rowIndex - 1, cols[cols.length - 1]);
                }
            }
            return;
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Shared: Ledger input + suggestion dropdown (used by both views)
    // ─────────────────────────────────────────────────────────────────
    const renderLedgerField = (row, index) => (
        <div className="relative">
            <div className="flex items-start">
                <div className="relative w-full">
                    <input
                        ref={el => inputRefs.current[`${index}-ledgerName`] = el}
                        type="text"
                        autoComplete="off"
                        value={
                            inputValues[`${index}-ledgerName`] !== undefined
                                ? inputValues[`${index}-ledgerName`]
                                : row.ledgerName || ''
                        }
                        onFocus={() => {
                            setInputValues(prev => ({
                                ...prev,
                                [`${index}-ledgerName`]: row.ledgerName || ''
                            }));
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            setInputValues(prev => ({ ...prev, [`${index}-ledgerName`]: val }));
                            filterLedgers(val, index);
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                setInputValues(prev => {
                                    const s = { ...prev };
                                    delete s[`${index}-ledgerName`];
                                    return s;
                                });
                            }, 200);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, index, 'ledgerName')}
                        placeholder={t('paymentVoucher.form.placeholders.selectLedger') || 'Search ledger…'}
                        className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setIsLedgerModalOpen(true)}
                    className="p-1.5 ml-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 shrink-0"
                    title="Create New Ledger"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Balance display */}
            {financeSettings?.showLedgerbalance && (
                <div className="text-xs text-secondary dark:text-secondary mt-0.5 px-1 flex items-center gap-2">
                    {t('paymentVoucher.form.label.ledgerBalance') || 'Balance'}:{' '}
                    {row.ledgerBalance?.crordr !== undefined ? (
                        <CrDrLabel
                            crordr={row.ledgerBalance.crordr}
                            accountCalculationMethod={generalSettings?.AccountCalculationMethod}
                            balance={row.ledgerBalance.currentbal}
                            decimalPart={generalSettings?.decimalPart ?? 2}
                        />
                    ) : (
                        <span className="font-semibold text-primary dark:text-primary">0.00</span>
                    )}
                </div>
            )}

            {/* Suggestion dropdown */}
            {activeSuggRow === index && (suggestions[index] || []).length > 0 && (
                <div
                    ref={activeSuggRow === index ? suggRef : null}
                    className="absolute z-[100] left-0 right-0 bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
                    style={{ top: '100%' }}
                >
                    {(suggestions[index] || []).map((ledger, idx) => (
                        <div
                            key={ledger.ledgerId}
                            data-suggestion-index={idx}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                selectLedger(index, ledger);
                                setSelectedSuggIdx(prev => ({ ...prev, [index]: -1 }));
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm border-b border-themed dark:border-themed last:border-b-0 ${selectedSuggIdx[index] === idx
                                ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-l-blue-600'
                                : 'hover:bg-hover dark:hover:bg-hover'
                                }`}
                        >
                            <div className="font-medium text-primary dark:text-primary">
                                {ledger.ledgerName}
                            </div>
                            {(ledger.address || ledger.phoneNo || ledger.tinNumber) && (
                                <div className="text-xs text-secondary dark:text-secondary mt-0.5">
                                    {[
                                        ledger.address && `Address: ${ledger.address}`,
                                        ledger.phoneNo && `Phone: ${ledger.phoneNo}`,
                                        ledger.tinNumber && `VAT: ${ledger.tinNumber}`
                                    ].filter(Boolean).join(' | ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────
    // MOBILE VIEW — card-wise layout (same state/handlers as desktop)
    // ─────────────────────────────────────────────────────────────────
    const renderMobileCards = () => (
        <div className="mt-4 bg-primary dark:bg-primary space-y-3 px-1">
            {rows.map((row, index) => (
                <div
                    key={index}
                    className="rounded-lg border border-themed dark:border-themed shadow-sm bg-white dark:bg-gray-900 p-3"
                >
                    {/* Card header: SlNo + Action buttons */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-themed dark:border-themed">
                        <span className="text-sm font-semibold text-primary dark:text-primary">
                            {t('paymentVoucher.form.table.columns.slNo') || 'SI No'}: {row.SlNo}
                        </span>
                        <div className="flex items-center gap-1">
                            {(row.billByBill && financeSettings?.MaintainBillbyBill) && (
                                <button
                                    type="button"
                                    onClick={() => handleAgainstClick(index, formData?.partyDetails)}
                                    disabled={againstLoadingRow === index}
                                    className="h-8 px-2 text-xs border border-themed dark:border-themed text-primary dark:text-primary hover:bg-hover dark:hover:bg-hover rounded flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                >
                                    {againstLoadingRow === index
                                        ? <><Loader2 className="h-3 w-3 animate-spin" /><span>...</span></>
                                        : 'Against'
                                    }
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => deleteRow(index)}
                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded flex items-center justify-center"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Ledger Name */}
                    <div className="mb-2">
                        <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                            {t('paymentVoucher.form.table.columns.ledgerName') || 'Ledger Name'}
                        </label>
                        {renderLedgerField(row, index)}
                    </div>

                    {/* Amount */}
                    <div className="mb-2">
                        <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                            {t('paymentVoucher.form.table.columns.amount') || 'Amount'}
                        </label>
                        <input
                            ref={el => inputRefs.current[`${index}-amount`] = el}
                            type="number"
                            min="0"
                            step="0.01"
                            name={`amount-${index}`}
                            value={
                                inputValues[`${index}-amount`] !== undefined
                                    ? inputValues[`${index}-amount`]
                                    : row.amount
                            }
                            onFocus={(e) => {
                                setInputValues(prev => ({ ...prev, [`${index}-amount`]: row.amount }));
                                setTimeout(() => e.target.select(), 0);
                            }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setInputValues(prev => ({ ...prev, [`${index}-amount`]: val }));
                                handleCellChange(index, 'amount', val);
                            }}
                            onBlur={() => {
                                setInputValues(prev => {
                                    const s = { ...prev };
                                    delete s[`${index}-amount`];
                                    return s;
                                });
                            }}
                            onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) {
                                    e.preventDefault();
                                }
                                handleKeyDown(e, index, "amount");
                            }}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                        />
                    </div>

                    {/* Cheque No + Cheque Date side by side */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                            <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                                {t('paymentVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                            </label>
                            <input
                                ref={el => inputRefs.current[`${index}-chequeNo`] = el}
                                type="text"
                                name={`chequeNo-${index}`}
                                value={row.chequeNo}
                                onChange={(e) => handleCellChange(index, 'chequeNo', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'chequeNo')}
                                placeholder={t('paymentVoucher.form.placeholders.chequeNo') || 'Cheque No'}
                                className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                                {t('paymentVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                            </label>
                            <input
                                ref={el => inputRefs.current[`${index}-chequeDate`] = el}
                                type="date"
                                name={`chequeDate-${index}`}
                                value={row.chequeDate !== "01-01-1753" ? row.chequeDate : ''}
                                onChange={(e) => handleCellChange(index, 'chequeDate', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'chequeDate')}
                                disabled={!row.chequeNo || row.chequeNo.trim() === ""}
                                className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {validationErrors[`chequeDate-${index}`] && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                                    <span>{validationErrors[`chequeDate-${index}`]}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Currency */}
                    {financeSettings?.multiCurrency && (
                        <div className="mb-2">
                            <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                                {t('paymentVoucher.form.table.columns.currency')}
                            </label>
                            <select
                                ref={el => inputRefs.current[`${index}-currencyConversionId`] = el}
                                name={`currencyConversionId-${index}`}
                                value={row.currencyConversionId || ''}
                                onChange={(e) => handleCellChange(index, 'currencyConversionId', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'currencyConversionId')}
                                className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                            >
                                <option value="">
                                    {t('paymentVoucher.form.placeholders.currency') || '— Currency —'}
                                </option>
                                {(currency || []).filter(data => data.currencyname).map((data) => (
                                    <option key={data.currencyconversionid} value={data.currencyconversionid}>
                                        {data.currencyname} - {data.narration}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Narration */}
                    <div>
                        <label className="block text-xs font-semibold text-secondary dark:text-secondary mb-1">
                            {t('paymentVoucher.form.table.columns.narration') || 'Narration'}
                        </label>
                        <input
                            ref={el => inputRefs.current[`${index}-Narration`] = el}
                            type="text"
                            name={`narration-${index}`}
                            value={row.Narration}
                            onChange={(e) => handleCellChange(index, 'Narration', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'Narration')}
                            placeholder={t('paymentVoucher.form.placeholders.narration') || 'Narration'}
                            className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                        />
                    </div>
                </div>
            ))}

            {/* Add Row Button */}
            <div className="flex justify-end py-2">
                <button
                    type="button"
                    onClick={addNewRow}
                    className="flex items-center gap-1 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 transition"
                >
                    <Plus className="h-4 w-4" />
                    {t('paymentVoucher.form.table.buttons.addRow') || 'Add Row'}
                </button>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────
    // DESKTOP VIEW — original table layout (unchanged)
    // ─────────────────────────────────────────────────────────────────
    const renderDesktopTable = () => (
        <div className="mt-4 bg-primary dark:bg-primary">
            <table className="w-full border-collapse">
                {/* Table Header */}
                <thead className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                    <tr>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-10">
                            {t('paymentVoucher.form.table.columns.slNo') || 'SI No'}
                        </th>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-80">
                            {t('paymentVoucher.form.table.columns.ledgerName') || 'Ledger Name'}
                        </th>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                            {t('paymentVoucher.form.table.columns.amount') || 'Amount'}
                        </th>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                            {t('paymentVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                        </th>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                            {t('paymentVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                        </th>
                        {financeSettings?.multiCurrency && (
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                                {t('paymentVoucher.form.table.columns.currency')}
                            </th>
                        )}
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                            {t('paymentVoucher.form.table.columns.narration') || 'Narration'}
                        </th>
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-32">
                            {t('paymentVoucher.form.table.columns.action') || 'Action'}
                        </th>
                    </tr>
                </thead>

                {/* Table Body */}
                <tbody className="bg-primary dark:bg-primary">
                    {rows.map((row, index) => (
                        <tr
                            key={index}
                            className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${(index + 1) % 2 === 1
                                ? 'bg-gray-100 dark:bg-gray-800'
                                : 'bg-white dark:bg-gray-900'
                                }`}
                        >
                            {/* SI No */}
                            <td className="p-2 text-center border border-themed dark:border-themed">
                                <span className="text-sm font-medium text-primary dark:text-primary">
                                    {row.SlNo}
                                </span>
                            </td>

                            {/* Ledger Name — searchable input with dropdown */}
                            <td className="p-1 border border-themed dark:border-themed relative">
                                {renderLedgerField(row, index)}
                            </td>

                            {/* Amount */}
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                <input
                                    ref={el => inputRefs.current[`${index}-amount`] = el}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name={`amount-${index}`}
                                    value={
                                        inputValues[`${index}-amount`] !== undefined
                                            ? inputValues[`${index}-amount`]
                                            : row.amount
                                    }
                                    onFocus={(e) => {
                                        setInputValues(prev => ({ ...prev, [`${index}-amount`]: row.amount }));
                                        setTimeout(() => e.target.select(), 0);
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setInputValues(prev => ({ ...prev, [`${index}-amount`]: val }));
                                        handleCellChange(index, 'amount', val);
                                    }}
                                    onBlur={() => {
                                        setInputValues(prev => {
                                            const s = { ...prev };
                                            delete s[`${index}-amount`];
                                            return s;
                                        });
                                    }}
                                    onKeyDown={(e) => {
                                        if (["-", "+", "e", "E"].includes(e.key)) {
                                            e.preventDefault();
                                        }

                                        handleKeyDown(e, index, "amount");
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right bg-transparent"
                                />
                            </td>

                            {/* Cheque No */}
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                <input
                                    ref={el => inputRefs.current[`${index}-chequeNo`] = el}
                                    type="text"
                                    name={`chequeNo-${index}`}
                                    value={row.chequeNo}
                                    onChange={(e) => handleCellChange(index, 'chequeNo', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'chequeNo')}
                                    placeholder={t('paymentVoucher.form.placeholders.chequeNo') || 'Cheque No'}
                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                />
                            </td>

                            {/* Cheque Date */}
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                <div>
                                    <input
                                        ref={el => inputRefs.current[`${index}-chequeDate`] = el}
                                        type="date"
                                        name={`chequeDate-${index}`}
                                        value={row.chequeDate !== "01-01-1753" ? row.chequeDate : ''}
                                        onChange={(e) => handleCellChange(index, 'chequeDate', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'chequeDate')}
                                        disabled={!row.chequeNo || row.chequeNo.trim() === ""}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {validationErrors[`chequeDate-${index}`] && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                                            <span>{validationErrors[`chequeDate-${index}`]}</span>
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Currency */}
                            {financeSettings?.multiCurrency && (
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <select
                                        ref={el => inputRefs.current[`${index}-currencyConversionId`] = el}
                                        name={`currencyConversionId-${index}`}
                                        value={row.currencyConversionId || ''}
                                        onChange={(e) => handleCellChange(index, 'currencyConversionId', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'currencyConversionId')}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                    >
                                        <option value="">
                                            {t('paymentVoucher.form.placeholders.currency') || '— Currency —'}
                                        </option>
                                        {(currency || []).filter(data => data.currencyname).map((data) => (
                                            <option key={data.currencyconversionid} value={data.currencyconversionid}>
                                                {data.currencyname} - {data.narration}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            )}

                            {/* Narration */}
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                <input
                                    ref={el => inputRefs.current[`${index}-Narration`] = el}
                                    type="text"
                                    name={`narration-${index}`}
                                    value={row.Narration}
                                    onChange={(e) => handleCellChange(index, 'Narration', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'Narration')}
                                    placeholder={t('paymentVoucher.form.placeholders.narration') || 'Narration'}
                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                />
                            </td>

                            {/* Action */}
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                <div className="flex items-center justify-center gap-1">
                                    {(row.billByBill && financeSettings?.MaintainBillbyBill) && (
                                        <button
                                            type="button"
                                            onClick={() => handleAgainstClick(index, formData?.partyDetails)}
                                            disabled={againstLoadingRow === index}
                                            className="h-8 px-2 text-xs border border-themed dark:border-themed text-primary dark:text-primary hover:bg-hover dark:hover:bg-hover rounded flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {againstLoadingRow === index
                                                ? <><Loader2 className="h-3 w-3 animate-spin" /><span>...</span></>
                                                : 'Against'
                                            }
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => deleteRow(index)}
                                        className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded flex items-center justify-center"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Add Row Button */}
            <div className="border-t border-themed dark:border-themed flex justify-end py-2 bg-primary dark:bg-primary">
                <button
                    type="button"
                    onClick={addNewRow}
                    className="flex items-center gap-1 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 transition"
                >
                    <Plus className="h-4 w-4" />
                    {t('paymentVoucher.form.table.buttons.addRow') || 'Add Row'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <AgainstModal
                isOpen={againstModal.isOpen}
                onClose={closeAgainstModal}
                againstData={againstModal.data}
                ledgerName={againstModal.ledgerName}
                ledgerId={againstModal.ledgerId}
                onSave={handleAgainstSave}
                onRefresh={handleAgainstRefresh}
            />
            <LedgerCreationModal 
                open={isLedgerModalOpen} 
                handleClose={() => setIsLedgerModalOpen(false)} 
                onSuccess={() => {
                    setIsLedgerModalOpen(false);
                    if (onLedgerCreated) onLedgerCreated();
                }} 
            />
            {isMobile ? renderMobileCards() : renderDesktopTable()}
        </>
    );
};

export default PaymentVoucherFormTable;