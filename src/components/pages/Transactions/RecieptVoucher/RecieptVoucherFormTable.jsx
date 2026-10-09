import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import AgainstModal from './AgainstModal';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { showToast } from '@/utils/toast';
import useAgainstModal from '@/lib/hooks/useAgainstModal';
import { sanitize } from '@/lib/inputSanitizer';
import LedgerCreationModal from '@/components/common/LedgerCreationModal';

const RecieptVoucherFormTable = ({ formData, setFormData, currency, ledgers, onRowRemove, onLedgerCreated }) => {
    const checkedStateRef = useRef({});
    const [validationErrors, setValidationErrors] = useState({});
    const { reciptVoucherId } = useParams();
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);


    const { t } = useTranslation();
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);




    const { selectedBranchId, currentCurrency, currentCurrencyConversion } = useAuth();



    // ── Suggestion state ──
    const [suggestions, setSuggestions] = useState({});
    const [activeSuggRow, setActiveSuggRow] = useState(null);
    const [selectedSuggIdx, setSelectedSuggIdx] = useState({});
    const suggRef = useRef(null);

    // ── Input local value overrides ──
    const [searchInputValues, setSearchInputValues] = useState({});

    // ── Per-cell refs ──
    const inputRefs = useRef({});

    useEffect(() => {
        if (formData?.receiptDetails && formData.receiptDetails.length > 0) {
            setRows(formData.receiptDetails);
            setSearchInputValues({});
        }
    }, [formData?.receiptDetails]);

    useEffect(() => {
        if (!generalSettings?.decimalPart) return;
        setRows(prev => prev.map(row => ({
            ...row,
            amount: (parseFloat(row.amount) || 0).toFixed(generalSettings.decimalPart),
            ledgerBalance: (parseFloat(row.ledgerBalance) || 0).toFixed(generalSettings.decimalPart),
        })));
    }, [generalSettings?.decimalPart]);

    const [rows, setRows] = useState(() => {
        if (formData?.receiptDetails?.length > 0) return formData.receiptDetails;
        return [{
            SlNo: 1,
            ledgerId: 0,
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            Narration: "",
            chequeNo: "",
            chequeDate: "01-01-1753",
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            ledgerBalance: 0,
            billByBill: false,
        }];
    });
    const updateFormData = (updatedRows) => {
        const validRows = updatedRows.filter(row => row.ledgerId && row.ledgerId !== 0);
        const totalAmount = validRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
        const allPartyDetails = updatedRows
            .filter(row => row.partyDetails && row.partyDetails.length > 0)
            .flatMap(row => row.partyDetails);
        setFormData(prev => ({
            ...prev,
            receiptDetails: updatedRows,
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
        voucherType: 'Receipt Voucher',
        crOrDr: 'Cr',
        voucherId: reciptVoucherId,   // undefined in create mode → edit mode auto-detected
        rows,
        setRows,
        updateFormData,
    });

    // ─────────────────────────────────────────────────────────────────
    // Mobile breakpoint detection
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
    const isMobile = useIsMobile();

    const getColumns = () => {
        const cols = ['ledgerName', 'amount', 'chequeNo', 'chequeDate'];
        // if (financeSettings?.multiCurrency) cols.push('currencyConversionId');
        cols.push('Narration');
        return cols;
    };

    const focusCell = (rowIndex, field) => {
        const key = `${rowIndex}-${field}`;
        const el = inputRefs.current[key];
        if (el) {
            el.focus();
            setTimeout(() => { if (el.select) el.select(); }, 0);
        }
    };

    const addNewRow = () => {
        const newRow = {
            SlNo: rows.length + 1,
            ledgerId: 0,
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            Narration: "",
            chequeNo: "",
            chequeDate: "01-01-1753",
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            ledgerBalance: 0,
            billByBill: false,
        };
        const updatedRows = [...rows, newRow];
        setRows(updatedRows);
        updateFormData(updatedRows);
    };

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
        const updatedRows = rows.filter((_, i) => i !== index).map((row, i) => ({ ...row, SlNo: i + 1 }));
        setRows(updatedRows);
        updateFormData(updatedRows);
        const newErrors = { ...validationErrors };
        delete newErrors[`chequeDate-${index}`];
        setValidationErrors(newErrors);
    };

    const validateRow = (row, index) => {
        const errors = {};
        if (row.chequeNo && row.chequeNo.trim() !== "") {
            if (!row.chequeDate || row.chequeDate === "01-01-1753") {
                errors[`chequeDate-${index}`] = t("requiredFieldsError");
            }
        }
        return errors;
    };

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
            return res.data?.data?.currentbal || 0;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return 0;
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
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            partyDetails: [],
        };

        const balance = await fetchLedgerBalance(ledger.ledgerId);
        updatedRows[rowIndex].ledgerBalance = balance;

        if (ledger.billBybill) {
            try {
                const res = await axiosInstance.post('party-balance', {
                    ledgerId: ledger.ledgerId,
                    crOrDr: 'Cr',
                    branchId: selectedBranchId,
                });


                updatedRows[rowIndex].partyDetails = res?.data?.data || [];
            } catch (err) {
                console.error('Error fetching party balance:', err);
                updatedRows[rowIndex].partyDetails = [];
            }
        }

        setSearchInputValues(prev => {
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
                currencyConversionId: currentCurrencyConversion?.currencyConversionId,
                ledgerBalance: 0,
                billByBill: false,
            };
            const rowsWithNew = [...updatedRows, newRow];
            setRows(rowsWithNew);
            updateFormData(rowsWithNew);
            setTimeout(() => focusCell(rowIndex, 'amount'), 100);
        } else {
            setTimeout(() => focusCell(rowIndex, 'amount'), 100);
        }
    };

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

        if(field === "chequeNo"){
            updatedValue = sanitize.numbers(value)
        }
        updatedRows[index][field] = updatedValue;
        if (field === "chequeNo" && (!value || value.trim() === "")) {
            updatedRows[index].chequeDate = "01-01-1753";
        }
        setRows(updatedRows);
        updateFormData(updatedRows);

        const rowErrors = validateRow(updatedRows[index], index);
        const newErrors = { ...validationErrors };

        if (field === "chequeNo" || field === "chequeDate") {
            delete newErrors[`chequeDate-${index}`];
            if (rowErrors[`chequeDate-${index}`]) {
                newErrors[`chequeDate-${index}`] = rowErrors[`chequeDate-${index}`];
            }
        }
        setValidationErrors(newErrors);
    };



    const handleKeyDown = (e, rowIndex, field) => {
        const cols = getColumns();

        if (field === 'ledgerName' && activeSuggRow === rowIndex) {
            const list = suggestions[rowIndex] || [];
            const cur = selectedSuggIdx[rowIndex] ?? -1;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: cur < list.length - 1 ? cur + 1 : 0 }));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: cur > 0 ? cur - 1 : list.length - 1 }));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (cur >= 0 && list[cur]) { selectLedger(rowIndex, list[cur]); setSelectedSuggIdx(prev => ({ ...prev, [rowIndex]: -1 })); }
                return;
            }
            if (e.key === 'Escape') { e.preventDefault(); setActiveSuggRow(null); setSuggestions({}); return; }
        }

        const colIdx = cols.indexOf(field);

        if (e.key === 'Enter') {
            e.preventDefault();
            if (field === 'ledgerName') { if (rows[rowIndex]?.ledgerId && rows[rowIndex]?.ledgerId !== 0) focusCell(rowIndex, 'amount'); return; }
            if (field === 'amount') { focusCell(rowIndex, 'chequeNo'); return; }
            if (field === 'chequeNo') {
                if (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "") {
                    financeSettings?.multiCurrency ? focusCell(rowIndex, 'currencyConversionId') : focusCell(rowIndex, 'Narration');
                } else { focusCell(rowIndex, 'chequeDate'); }
                return;
            }
            if (field === 'chequeDate') { financeSettings?.multiCurrency ? focusCell(rowIndex, 'currencyConversionId') : focusCell(rowIndex, 'Narration'); return; }
            if (field === 'currencyConversionId') { focusCell(rowIndex, 'Narration'); return; }
            if (field === 'Narration') {
                if (rowIndex < rows.length - 1) { focusCell(rowIndex + 1, 'ledgerName'); }
                else { addNewRow(); setTimeout(() => focusCell(rowIndex + 1, 'ledgerName'), 150); }
                return;
            }
            return;
        }

        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (field === 'chequeNo' && (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "")) {
                financeSettings?.multiCurrency ? focusCell(rowIndex, 'currencyConversionId') : focusCell(rowIndex, 'Narration');
                return;
            }
            if (colIdx < cols.length - 1) focusCell(rowIndex, cols[colIdx + 1]);
            else if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, cols[0]);
            return;
        }

        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            if (field === 'chequeDate' && (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "")) { focusCell(rowIndex, 'chequeNo'); return; }
            if (field === 'currencyConversionId' || (field === 'Narration' && !financeSettings?.multiCurrency)) {
                if (!rows[rowIndex].chequeNo || rows[rowIndex].chequeNo.trim() === "") { focusCell(rowIndex, 'chequeNo'); return; }
            }
            if (colIdx > 0) focusCell(rowIndex, cols[colIdx - 1]);
            else if (rowIndex > 0) focusCell(rowIndex - 1, cols[cols.length - 1]);
            return;
        }

        if (e.key === 'ArrowDown') { e.preventDefault(); if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, field); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); if (rowIndex > 0) focusCell(rowIndex - 1, field); return; }

        if (e.key === 'ArrowRight') {
            const el = e.target;
            if (el.type === 'date') { e.preventDefault(); if (colIdx < cols.length - 1) focusCell(rowIndex, cols[colIdx + 1]); else if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, cols[0]); return; }
            const atEnd = el.selectionStart === (el.value?.length ?? 0);
            if (atEnd) { e.preventDefault(); if (colIdx < cols.length - 1) focusCell(rowIndex, cols[colIdx + 1]); else if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, cols[0]); }
            return;
        }

        if (e.key === 'ArrowLeft') {
            const el = e.target;
            if (el.type === 'date') { e.preventDefault(); if (colIdx > 0) focusCell(rowIndex, cols[colIdx - 1]); else if (rowIndex > 0) focusCell(rowIndex - 1, cols[cols.length - 1]); return; }
            const atStart = el.selectionStart === 0;
            if (atStart) { e.preventDefault(); if (colIdx > 0) focusCell(rowIndex, cols[colIdx - 1]); else if (rowIndex > 0) focusCell(rowIndex - 1, cols[cols.length - 1]); }
            return;
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Shared cell renderers — used by BOTH the desktop table and the
    // mobile card layout, so all logic (refs, handlers, validation,
    // keyboard nav) lives in exactly one place.
    // ─────────────────────────────────────────────────────────────────
    const renderLedgerField = (row, index) => (
        <div className="relative flex items-start">
            <div className="relative w-full">
            <input
                ref={el => inputRefs.current[`${index}-ledgerName`] = el}
                type="text"
                autoComplete="off"
                value={searchInputValues[`${index}-ledgerName`] ?? row.ledgerName ?? ''}
                onFocus={() => setSearchInputValues(prev => ({ ...prev, [`${index}-ledgerName`]: row.ledgerName || '' }))}
                onChange={(e) => {
                    const val = e.target.value;
                    setSearchInputValues(prev => ({ ...prev, [`${index}-ledgerName`]: val }));
                    filterLedgers(val, index);
                }}
                onBlur={() => {
                    setTimeout(() => {
                        setSearchInputValues(prev => { const s = { ...prev }; delete s[`${index}-ledgerName`]; return s; });
                        if (activeSuggRow === index) { setActiveSuggRow(null); setSuggestions({}); }
                    }, 200);
                }}
                onKeyDown={(e) => handleKeyDown(e, index, 'ledgerName')}
                placeholder={t('recieptVoucher.form.placeholders.selectLedger') || 'Search ledger…'}
                className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent"
            />
            {financeSettings?.showLedgerbalance && (
                <div className="text-xs text-secondary dark:text-secondary mt-0.5 px-2">
                    {t('recieptVoucher.form.label.ledgerBalance') || 'Balance'}:{' '}
                    <span className="font-semibold text-primary dark:text-primary">
                        {row.ledgerBalance ? parseFloat(row.ledgerBalance).toFixed(2) : '0.00'}
                    </span>
                </div>
            )}
            {activeSuggRow === index && (suggestions[index] || []).length > 0 && (
                <div
                    ref={activeSuggRow === index ? suggRef : null}
                    className="absolute z-[100] left-0 right-0 bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
                    style={{ top: '100%' }}
                >
                    {(suggestions[index] || []).map((ledger, idx) => (
                        <div
                            key={`${ledger.ledgerId}-${idx}`}
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
                            <div className="font-medium text-primary dark:text-primary">{ledger.ledgerName}</div>
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
            <button
                type="button"
                onClick={() => setIsLedgerModalOpen(true)}
                className="p-1.5 ml-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 shrink-0"
                title="Create New Ledger"
            >
                <Plus size={16} />
            </button>
        </div>
    );

    const renderAmountField = (row, index, alignRight = true) => (
        <input
            ref={el => inputRefs.current[`${index}-amount`] = el}
            type="number"
            min="0"
            step="0.01"
            name={`amount-${index}`}
            value={row.amount}
            onFocus={(e) => { if (!row.billByBill) setTimeout(() => e.target.select(), 0); }}
            onChange={(e) => {
                if (row.billByBill && financeSettings?.MaintainBillbyBill) return;
                handleCellChange(index, 'amount', e.target.value);
            }}
            onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) {
                    e.preventDefault();
                }
                handleKeyDown(e, index, "amount");
            }}
            placeholder="0.00"
            disabled={row.billByBill && financeSettings?.MaintainBillbyBill}
            className={`w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-700 ${alignRight ? 'text-right' : ''}`}
        />
    );

    const renderChequeNoField = (row, index) => (
        <input
            ref={el => inputRefs.current[`${index}-chequeNo`] = el}
            type="text"
            name={`chequeNo-${index}`}
            value={row.chequeNo}
            onChange={(e) => handleCellChange(index, 'chequeNo', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, 'chequeNo')}
            placeholder={t('recieptVoucher.form.placeholders.chequeNo') || 'Cheque No'}
            className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent"
        />
    );

    const renderChequeDateField = (row, index) => (
        <div>
            <input
                ref={el => inputRefs.current[`${index}-chequeDate`] = el}
                type="date"
                name={`chequeDate-${index}`}
                value={row.chequeDate && row.chequeDate !== "01-01-1753" ? row.chequeDate : ''}
                onChange={(e) => handleCellChange(index, 'chequeDate', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index, 'chequeDate')}
                disabled={!row.chequeNo || row.chequeNo.trim() === ""}
                className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {validationErrors[`chequeDate-${index}`] && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                    <span>{validationErrors[`chequeDate-${index}`]}</span>
                </div>
            )}
        </div>
    );

    const renderCurrencyField = (row, index) => (
        <select
            ref={el => inputRefs.current[`${index}-currencyConversionId`] = el}
            name={`currencyConversionId-${index}`}
            value={row.currencyConversionId || ''}
            onChange={(e) => handleCellChange(index, 'currencyConversionId', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, 'currencyConversionId')}
            className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent"
        >
            <option value="">{t('recieptVoucher.form.placeholders.currency') || '— Currency —'}</option>
            {(currency || []).filter(data => data.currencyname).map((data) => (
                <option key={data.currencyconversionid} value={data.currencyconversionid}>
                    {data.currencyname} - {data.narration}
                </option>
            ))}
        </select>
    );

    const renderNarrationField = (row, index) => (
        <input
            ref={el => inputRefs.current[`${index}-Narration`] = el}
            type="text"
            name={`narration-${index}`}
            value={row.Narration}
            onChange={(e) => handleCellChange(index, 'Narration', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, 'Narration')}
            placeholder={t('recieptVoucher.form.placeholders.narration') || 'Narration'}
            className="w-full px-2 py-1.5 text-sm border border-themed dark:border-themed sm:border-0 rounded text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-transparent"
        />
    );

    const renderActions = (row, index) => (
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
    );

    // ─────────────────────────────────────────────────────────────────
    // DESKTOP VIEW — table layout
    // ─────────────────────────────────────────────────────────────────
    const renderDesktopTable = () => (
        <table className="w-full min-w-[860px] border-collapse">
            <thead className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                <tr>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-10">
                        {t('recieptVoucher.form.table.columns.slNo') || 'SI No'}
                    </th>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-80">
                        {t('recieptVoucher.form.table.columns.ledgerName') || 'Ledger Name'}
                    </th>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                        {t('recieptVoucher.form.table.columns.amount') || 'Amount'}
                    </th>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                        {t('recieptVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                    </th>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                        {t('recieptVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                    </th>
                    {financeSettings?.multiCurrency && (
                        <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                            {t('recieptVoucher.form.table.columns.currency')}
                        </th>
                    )}
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                        {t('recieptVoucher.form.table.columns.narration') || 'Narration'}
                    </th>
                    <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-32">
                        {t('recieptVoucher.form.table.columns.action') || 'Action'}
                    </th>
                </tr>
            </thead>

            <tbody className="bg-primary dark:bg-primary">
                {rows.map((row, index) => (
                    <tr
                        key={`row-${index}-${row.ledgerId}`}
                        className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${(index + 1) % 2 === 1
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                            }`}
                    >
                        <td className="p-2 text-center border border-themed dark:border-themed">
                            <span className="text-sm font-medium text-primary dark:text-primary">{row.SlNo}</span>
                        </td>
                        <td className="p-1 border border-themed dark:border-themed relative">
                            {renderLedgerField(row, index)}
                        </td>
                        <td className="p-1 align-top border border-themed dark:border-themed">
                            {renderAmountField(row, index, true)}
                        </td>
                        <td className="p-1 align-top border border-themed dark:border-themed">
                            {renderChequeNoField(row, index)}
                        </td>
                        <td className="p-1 align-top border border-themed dark:border-themed">
                            {renderChequeDateField(row, index)}
                        </td>
                        {financeSettings?.multiCurrency && (
                            <td className="p-1 align-top border border-themed dark:border-themed">
                                {renderCurrencyField(row, index)}
                            </td>
                        )}
                        <td className="p-1 align-top border border-themed dark:border-themed">
                            {renderNarrationField(row, index)}
                        </td>
                        <td className="p-1 align-top border border-themed dark:border-themed">
                            {renderActions(row, index)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // ─────────────────────────────────────────────────────────────────
    // MOBILE VIEW — card layout
    // ─────────────────────────────────────────────────────────────────
    const renderMobileCards = () => (
        <div className="space-y-3">
            {rows.map((row, index) => (
                <div
                    key={`row-${index}-${row.ledgerId}`}
                    className={`rounded-lg border border-themed dark:border-themed p-3 shadow-sm ${(index + 1) % 2 === 1
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'bg-white dark:bg-gray-900'
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-secondary dark:text-secondary">
                            {(t('recieptVoucher.form.table.columns.slNo') || 'SI No')} {row.SlNo}
                        </span>
                        {renderActions(row, index)}
                    </div>

                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                {t('recieptVoucher.form.table.columns.ledgerName') || 'Ledger Name'}
                            </label>
                            {renderLedgerField(row, index)}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                    {t('recieptVoucher.form.table.columns.amount') || 'Amount'}
                                </label>
                                {renderAmountField(row, index, false)}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                    {t('recieptVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                                </label>
                                {renderChequeNoField(row, index)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                    {t('recieptVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                                </label>
                                {renderChequeDateField(row, index)}
                            </div>
                            {financeSettings?.multiCurrency && (
                                <div>
                                    <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                        {t('recieptVoucher.form.table.columns.currency') || 'Currency'}
                                    </label>
                                    {renderCurrencyField(row, index)}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                {t('recieptVoucher.form.table.columns.narration') || 'Narration'}
                            </label>
                            {renderNarrationField(row, index)}
                        </div>
                    </div>
                </div>
            ))}
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


            <div className="mt-4 bg-primary dark:bg-primary">

                {isMobile ? renderMobileCards() : renderDesktopTable()}

                <div className="border-t border-themed dark:border-themed flex justify-end py-2 bg-primary dark:bg-primary mt-2 md:mt-0">
                    <button
                        type="button"
                        onClick={addNewRow}
                        className="flex items-center gap-1 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 transition"
                    >
                        <Plus className="h-4 w-4" />
                        {t('recieptVoucher.form.table.buttons.addRow') || 'Add Row'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default RecieptVoucherFormTable;