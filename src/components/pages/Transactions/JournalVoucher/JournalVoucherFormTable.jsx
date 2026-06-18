import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { showToast } from '@/utils/toast';
import CrDrLabel from '@/components/common/CrDrLabel';
import { Loader2 } from 'lucide-react'; // already likely imported
import { useParams } from 'react-router-dom';
import useAgainstModal from '@/lib/hooks/useAgainstModal';
import AgainstModal from '../RecieptVoucher/AgainstModal';

const JournalVoucherFormTable = forwardRef(({ formData, setFormData, currentCurrencyConversion, ledgers, costCenters: costCentres, onRowRemove, setLedgerBalance, ledgerBalance }, ref) => {
    const { t } = useTranslation();
    const { financeSettings, generalSettings } = useSelector((state) => state.settings);
    const { selectedBranchId, currentCurrency } = useAuth();
    // ── Suggestion state (ledger search) ──
    const [suggestions, setSuggestions] = useState({});
    const [activeSuggRow, setActiveSuggRow] = useState(null);
    const [selectedSuggIdx, setSelectedSuggIdx] = useState({});
    const suggRef = useRef(null);

    // ── Input local value overrides ──
    const [inputValues, setInputValues] = useState({});
    const { journalVoucherId } = useParams();
    const rows = formData?.journalDetails || [];
    const updateFormData = (updatedRows) => {

        const debitTotal = updatedRows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
        const creditTotal = updatedRows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);

        // Collect all partyDetails from bill-by-bill rows
        const allPartyDetails = updatedRows
            .filter(row => row.partyDetails && row.partyDetails.length > 0)
            .flatMap(row => row.partyDetails);

        setFormData(prev => ({
            ...prev,
            journalDetails: updatedRows,
            debitTotal,
            creditTotal,
            partyDetails: allPartyDetails,  // ← add this
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
        voucherType: 'Journal Voucher',
        crOrDr: 'Cr',
        voucherId: journalVoucherId,
        rows,
        setRows: (updatedRows) => updateFormData(updatedRows),
        updateFormData,
    });
    // ── Per-cell refs ──
    const inputRefs = useRef({});


    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────
    const isRowNotEmpty = (row) =>
        row.ledgerId ||
        (parseFloat(row.debit) || 0) > 0 ||
        (parseFloat(row.credit) || 0) > 0 ||
        row.Narration?.trim() ||
        row.RefNo?.trim() ||
        row.costCentreId;

    const getValidRows = () => rows.filter(isRowNotEmpty);

    useImperativeHandle(ref, () => ({ getValidRows }));

    const emptyRow = (lineIndex) => ({
        lineIndex,
        branchId: '',
        ledgerId: '',
        ledgerName: '',
        debit: '0',
        credit: '0',
        Narration: '',
        RefNo: '',
        costCentreId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
        ledgerBalance: 0,
        billByBill: false,
    });

    // ─────────────────────────────────────────────────────────────────
    // Column order for keyboard navigation
    // ─────────────────────────────────────────────────────────────────
    const getColumns = () => {
        const cols = ['ledgerName', 'debit', 'credit', 'Narration', 'RefNo'];
        if (costCentres?.length) cols.push('costCentreId');
        return cols;
    };

    // ─────────────────────────────────────────────────────────────────
    // Focus helper
    // ─────────────────────────────────────────────────────────────────
    const focusCell = (rowIndex, field) => {
        const key = `${rowIndex}-${field}`;
        const el = inputRefs.current[key];
        if (el) {
            el.focus();
            setTimeout(() => { if (el.select) el.select(); }, 0);
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // updateFormData
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // Add / Delete rows
    // ─────────────────────────────────────────────────────────────────
    const addNewRow = () => {
        const updated = [...rows, emptyRow(rows.length + 1)];
        updateFormData(updated);
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
        const updated = rows
            .filter((_, i) => i !== index)
            .map((r, i) => ({ ...r, lineIndex: i + 1 }));
        updateFormData(updated);
    };

    // ─────────────────────────────────────────────────────────────────
    // Ledger balance fetch
    // ─────────────────────────────────────────────────────────────────
    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );
            return res.data?.data || null;  // full object, not just currentbal
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
            currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
        };

        // fetch balance
        const balance = await fetchLedgerBalance(ledger.ledgerId);
        updatedRows[rowIndex].ledgerBalance = balance;

        // auto-add row if last
        const isLast = rowIndex === updatedRows.length - 1;
        if (isLast && isRowNotEmpty(updatedRows[rowIndex])) {
            updatedRows.push(emptyRow(updatedRows.length + 1));
        }

        // clear input override so it shows the real name
        setInputValues(prev => {
            const s = { ...prev };
            delete s[`${rowIndex}-ledgerName`];
            return s;
        });

        setSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
        setActiveSuggRow(null);
        updateFormData(updatedRows);

        setTimeout(() => focusCell(rowIndex, 'debit'), 100);
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

    // ─────────────────────────────────────────────────────────────────
    // Generic cell change (non-ledger fields)
    // ─────────────────────────────────────────────────────────────────
    const handleCellChange = async (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };

        if (field === 'debit' && (parseFloat(value) || 0) > 0) {
            updatedRows[index].credit = '0';
        }
        if (field === 'credit' && (parseFloat(value) || 0) > 0) {
            updatedRows[index].debit = '0';
        }
        if (field === "ledgerId" && value) {
            try {
                const balance = await fetchLedgerBalance(value);
                updatedRows[index].ledgerBalance = balance;  // store full object
            } catch (err) {
                updatedRows[index].ledgerBalance = null;
            }
        }

        // auto-add row if last and has data
        const isLast = index === updatedRows.length - 1;
        if (isLast && isRowNotEmpty(updatedRows[index])) {
            updatedRows.push(emptyRow(updatedRows.length + 1));
        }

        updateFormData(updatedRows);
    };

    // ─────────────────────────────────────────────────────────────────
    // Disabled helpers
    // ─────────────────────────────────────────────────────────────────
    const isDebitDisabled = (row) => (parseFloat(row.credit) || 0) > 0;
    const isCreditDisabled = (row) => (parseFloat(row.debit) || 0) > 0;

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

        // ── Enter: move to next field based on your flow ──
        if (e.key === 'Enter') {
            e.preventDefault();

            // Custom navigation flow: debit -> narration, credit -> narration
            if (field === 'debit' || field === 'credit') {
                focusCell(rowIndex, 'Narration');
                return;
            }

            // narration -> RefNo
            if (field === 'Narration') {
                focusCell(rowIndex, 'RefNo');
                return;
            }

            // RefNo -> costCentreId (if exists) or next row ledger
            if (field === 'RefNo') {
                if (costCentres?.length > 0) {
                    focusCell(rowIndex, 'costCentreId');
                } else {
                    // Move to next row's ledger
                    if (rowIndex < rows.length - 1) {
                        focusCell(rowIndex + 1, 'ledgerName');
                    } else {
                        // Last row, trigger add and focus new row
                        setTimeout(() => focusCell(rowIndex + 1, 'ledgerName'), 150);
                    }
                }
                return;
            }

            // costCentreId -> next row ledger
            if (field === 'costCentreId') {
                if (rowIndex < rows.length - 1) {
                    focusCell(rowIndex + 1, 'ledgerName');
                } else {
                    // Last row, trigger add and focus new row
                    setTimeout(() => focusCell(rowIndex + 1, 'ledgerName'), 150);
                }
                return;
            }

            // ledgerName -> debit (default behavior)
            if (field === 'ledgerName') {
                focusCell(rowIndex, 'debit');
                return;
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
    // Render
    // ─────────────────────────────────────────────────────────────────
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

            <div className="mt-4 bg-primary dark:bg-primary">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                        <tr>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-10">
                                {t('journalVoucher.form.table.columns.slNo') || 'Sl No'}
                            </th>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-80">
                                {t('journalVoucher.form.table.columns.ledgerName') || 'Ledger Name'}
                            </th>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-28">
                                {t('journalVoucher.form.table.columns.debit') || 'Debit'}
                            </th>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-28">
                                {t('journalVoucher.form.table.columns.credit') || 'Credit'}
                            </th>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                                {t('journalVoucher.form.table.columns.narration') || 'Narration'}
                            </th>
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                                {t('journalVoucher.form.table.columns.referenceNo') || 'Ref No'}
                            </th>
                            {costCentres?.length > 0 && (
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                                    {t('journalVoucher.form.table.columns.costCentre') || 'Cost Centre'}
                                </th>
                            )}
                            <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-20">
                                {t('journalVoucher.form.table.columns.action') || 'Action'}
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-primary dark:bg-primary">
                        {rows.map((row, index) => (
                            <tr
                                key={index}
                                className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${(index + 1) % 2 === 1
                                    ? 'bg-gray-100 dark:bg-gray-800'
                                    : 'bg-white dark:bg-gray-900'
                                    }`}
                            >
                                {/* Sl No */}
                                <td className="p-2 text-center border border-themed dark:border-themed">
                                    <span className="text-sm font-medium text-primary dark:text-primary">
                                        {row.lineIndex || index + 1}
                                    </span>
                                </td>

                                {/* Ledger Name */}
                                <td className="p-1 border border-themed dark:border-themed relative">
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
                                        placeholder={t('recieptVoucher.form.placeholders.selectLedger') || 'Search ledger…'}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                    />

                                    {/* Balance display */}
                                    {financeSettings?.showLedgerbalance && (
                                        <div className="flex items-center text-[10px] sm:text-sm text-secondary dark:text-secondary mt-1 gap-2">
                                            {t('contraVoucher.form.label.ledgerBalance') || 'Balance'}:{" "}
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
                                                    {(ledger.address || ledger.phoneNo) && (
                                                        <div className="text-xs text-secondary dark:text-secondary mt-0.5">
                                                            {[ledger.address, ledger.phoneNo].filter(Boolean).join(' | ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </td>

                                {/* Debit */}
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <input
                                        ref={el => inputRefs.current[`${index}-debit`] = el}
                                        type="number"
                                        step="0.01"
                                        name={`debit-${index}`}
                                        value={
                                            inputValues[`${index}-debit`] !== undefined
                                                ? inputValues[`${index}-debit`]
                                                : row.debit
                                        }
                                        disabled={isDebitDisabled(row)}
                                        onFocus={(e) => {
                                            setInputValues(prev => ({ ...prev, [`${index}-debit`]: row.debit }));
                                            setTimeout(() => e.target.select(), 0);
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setInputValues(prev => ({ ...prev, [`${index}-debit`]: val }));
                                            handleCellChange(index, 'debit', val);
                                        }}
                                        onBlur={() => {
                                            setInputValues(prev => {
                                                const s = { ...prev };
                                                delete s[`${index}-debit`];
                                                return s;
                                            });
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'debit')}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                    />
                                </td>

                                {/* Credit */}
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <input
                                        ref={el => inputRefs.current[`${index}-credit`] = el}
                                        type="number"
                                        step="0.01"
                                        name={`credit-${index}`}
                                        value={
                                            inputValues[`${index}-credit`] !== undefined
                                                ? inputValues[`${index}-credit`]
                                                : row.credit
                                        }
                                        disabled={isCreditDisabled(row)}
                                        onFocus={(e) => {
                                            setInputValues(prev => ({ ...prev, [`${index}-credit`]: row.credit }));
                                            setTimeout(() => e.target.select(), 0);
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setInputValues(prev => ({ ...prev, [`${index}-credit`]: val }));
                                            handleCellChange(index, 'credit', val);
                                        }}
                                        onBlur={() => {
                                            setInputValues(prev => {
                                                const s = { ...prev };
                                                delete s[`${index}-credit`];
                                                return s;
                                            });
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'credit')}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                    />
                                </td>

                                {/* Narration */}
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <input
                                        ref={el => inputRefs.current[`${index}-Narration`] = el}
                                        type="text"
                                        name={`narration-${index}`}
                                        value={row.Narration}
                                        onChange={(e) => handleCellChange(index, 'Narration', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'Narration')}
                                        placeholder={t('journalVoucher.form.placeholders.narration') || 'Narration'}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                    />
                                </td>

                                {/* Ref No */}
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <input
                                        ref={el => inputRefs.current[`${index}-RefNo`] = el}
                                        type="text"
                                        name={`referenceNo-${index}`}
                                        value={row.RefNo}
                                        onChange={(e) => handleCellChange(index, 'RefNo', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'RefNo')}
                                        placeholder={t('journalVoucher.form.placeholders.referenceNo') || 'Ref No'}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                    />
                                </td>

                                {/* Cost Centre */}
                                {costCentres?.length > 0 && (
                                    <td className="p-1 align-top border border-themed dark:border-themed">
                                        <select
                                            ref={el => inputRefs.current[`${index}-costCentreId`] = el}
                                            name={`costCentreId-${index}`}
                                            value={row.costCentreId || ''}
                                            onChange={(e) => handleCellChange(index, 'costCentreId', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, index, 'costCentreId')}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded bg-transparent"
                                        >
                                            <option value="">
                                                {t('journalVoucher.form.placeholders.costCentre') || '— Cost Centre —'}
                                            </option>
                                            {costCentres.map((cc) => (
                                                <option key={cc.costCentreId} value={cc.costCentreId}>
                                                    {cc.CostCentre || ''}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                )}

                                {/* Action */}
                                <td className="p-1 align-top border border-themed dark:border-themed">
                                    <div className="flex items-center justify-center gap-1">
                                        {row.billByBill && financeSettings?.MaintainBillbyBill && (
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

                    <tfoot className="bg-secondary dark:bg-secondary font-semibold">
                        <tr>
                            <td colSpan="2" className="p-2 border border-themed dark:border-themed text-right text-primary dark:text-primary">
                                {t('journalVoucher.form.table.total') || 'Total'}
                            </td>
                            <td className="p-2 border border-themed dark:border-themed text-right text-green-600 dark:text-green-400">
                                {(formData.debitTotal || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                            </td>
                            <td className="p-2 border border-themed dark:border-themed text-right text-blue-600 dark:text-blue-400">
                                {(formData.creditTotal || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                            </td>
                            <td
                                colSpan={
                                    (costCentres?.length ? 3 : 2) +
                                    (financeSettings?.multiCurrency ? 1 : 0)
                                }
                                className="p-2 border border-themed dark:border-themed"
                            />
                        </tr>
                    </tfoot>
                </table>

                {/* Add Row button */}
                <div className="border-t border-themed dark:border-themed flex justify-end py-2 bg-primary dark:bg-primary">
                    <button
                        type="button"
                        onClick={addNewRow}
                        className="flex items-center gap-1 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 transition"
                    >
                        <Plus className="h-4 w-4" />
                        {t('journalVoucher.form.table.buttons.addRow') || 'Add Row'}
                    </button>
                </div>
            </div>
        </>
    );
});

JournalVoucherFormTable.displayName = 'JournalVoucherFormTable';
export default JournalVoucherFormTable;