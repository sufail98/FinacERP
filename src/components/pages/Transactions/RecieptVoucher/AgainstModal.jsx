import React, { useEffect, useRef, useState } from 'react';
import {
    X, FileText, Calendar, Hash, ArrowUpRight,
    Plus, Trash2, RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS_NEW = ['New', 'OnAccount'];

const TYPE_BADGE_CLASS = {
    Against:   'bg-blue-100  dark:bg-blue-900/40  text-blue-700  dark:text-blue-300',
    New:       'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    OnAccount: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

let _newRowId = 1;
const newRowId = () => `new-${_newRowId++}`;
const todayISO = () => new Date().toISOString().split('T')[0];

const ANIM_DURATION = 220;

// ─── AgainstModal ─────────────────────────────────────────────────────────────

/**
 * AgainstModal — fully reusable bill-by-bill settlement modal.
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   againstData      array   — rows from the hook (party-balance API shape)
 *   ledgerName       string  — shown in the modal title
 *   ledgerId         number  — needed when building partyDetails on save
 *   onAmountChange   (masterId, value) => void  — optional, kept for compatibility
 *   onSave           (updatedData, partyDetails) => void
 *   onRefresh        () => Promise<void>        — triggers hook refresh
 *
 * Works identically for Receipt Voucher, Payment Voucher, and Journal Voucher —
 * the only difference is which hook instance you pass it.
 */
const AgainstModal = ({
    isOpen,
    onClose,
    againstData = [],
    ledgerName = '',
    ledgerId,
    onAmountChange,
    onSave,
    onRefresh,
}) => {
    const { t } = useTranslation();
    const overlayRef       = useRef(null);
    const tableContainerRef = useRef(null);
    const closeTimerRef    = useRef(null);
    const prevIsOpenRef    = useRef(false);

    // ── Animation ──────────────────────────────────────────────────────────────
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            const id = requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true))
            );
            return () => cancelAnimationFrame(id);
        } else {
            setVisible(false);
            closeTimerRef.current = setTimeout(() => setMounted(false), ANIM_DURATION);
            return () => clearTimeout(closeTimerRef.current);
        }
    }, [isOpen]);

    // ── Refresh state ──────────────────────────────────────────────────────────
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!onRefresh) return;
        setRefreshing(true);
        try { await onRefresh(); }
        finally { setRefreshing(false); }
    };

    // ── Internal rows ──────────────────────────────────────────────────────────
    const [rows, setRows] = useState([]);

    // Sync when modal first opens
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setRows(
                againstData.map((r) => ({
                    ...r,
                    _id:    r.masterId ?? r._id,
                    type:   r.type   || 'Against',
                    isNew:  r.isNew  || false,
                    checked: r.checked ?? (parseFloat(r.amount) > 0),
                    amount: r.amount ?? 0,
                }))
            );
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, againstData]);

    // Scroll to bottom + focus last amount input on row add
    useEffect(() => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
        }
        const inputs = document.querySelectorAll('[data-against-amt]');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, [rows.length]);

    // Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!mounted) return null;

    // ── Checkbox logic ─────────────────────────────────────────────────────────
    const allChecked  = rows.length > 0 && rows.every((r) => r.checked);
    const someChecked = rows.some((r) => r.checked);

    const handleCheckAll = (e) => {
        const checked = e.target.checked;
        setRows((prev) =>
            prev.map((r) => ({
                ...r,
                checked,
                amount: checked
                    ? (r.amountToPay != null ? parseFloat(r.amountToPay) || 0 : r.amount)
                    : 0,
            }))
        );
    };

    const handleRowCheck = (id, checked) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r._id !== id) return r;
                return {
                    ...r,
                    checked,
                    amount: checked
                        ? (r.amountToPay != null ? parseFloat(r.amountToPay) || 0 : r.amount)
                        : 0,
                };
            })
        );
    };

    // ── Field changes ──────────────────────────────────────────────────────────
    const handleAmountChange = (id, value) => {
        setRows((prev) =>
            prev.map((r) => (r._id === id ? { ...r, amount: value } : r))
        );
    };

    const handleTypeChange = (id, value) => {
        setRows((prev) =>
            prev.map((r) => (r._id === id ? { ...r, type: value } : r))
        );
    };

    // ── Row management ─────────────────────────────────────────────────────────
    const handleDeleteRow = (id) => {
        if (rows.length === 1) return;
        setRows((prev) => prev.filter((r) => r._id !== id));
    };

    const handleAddRow = () => {
        const id = newRowId();
        setRows((prev) => [
            ...prev,
            {
                _id: id,
                masterId: null,
                type: 'New',
                isNew: true,
                checked: true,
                voucherType: '',
                voucherDate: todayISO(),
                voucherNo: '',
                billAmount: null,
                amountToPay: null,
                currencySymbol: '',
                currencyConversionId: null,
                amount: 0,
            },
        ]);
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = () => {
        const checkedRows  = rows.filter((r) => r.checked);
        const partyDetails = checkedRows.map((r) => ({
            date:                r.voucherDate || todayISO(),
            voucherType:         r.voucherType || '',
            masterId:            r.masterId,
            againstVoucherType:  r.voucherType || '',
            againstvoucherNo:    r.voucherNo   || '',
            referenceType:       r.type        || 'Against',
            amount:              parseFloat(r.amount) || 0,
            creditPeriod:        r.creditPeriod        || 0,
            currencyConversionId: r.currencyConversionId || null,
            invoiceNo:           r.voucherNo   || '',
            referenceNo:         r.referanceNo || '',
            BillAmount:          parseFloat(r.billAmount) || 0,
            invoiceDate:         r.voucherDate || todayISO(),
            ledgerId,
        }));
        if (onSave) onSave(rows, partyDetails);
        onClose();
    };

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalBillAmount  = rows.filter((r) => !r.isNew).reduce((s, r) => s + (parseFloat(r.billAmount)  || 0), 0);
    const totalAmountToPay = rows.filter((r) => !r.isNew).reduce((s, r) => s + (parseFloat(r.amountToPay) || 0), 0);
    const totalAllocated   = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    // ── Animation styles ───────────────────────────────────────────────────────
    const overlayStyle = {
        transition: `opacity ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
        opacity: visible ? 1 : 0,
    };
    const panelStyle = {
        transition: `opacity ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1), transform ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
        opacity:   visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(10px)',
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            style={overlayStyle}
            className="fixed inset-0 z-[999999999999] flex items-center justify-center bg-black/50 p-4"
        >
            <div
                style={panelStyle}
                className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-primary dark:bg-primary rounded-lg shadow-2xl border border-themed dark:border-themed overflow-hidden"
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-themed dark:border-themed bg-gray-100 dark:bg-gray-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-base font-semibold text-primary dark:text-primary">
                            {t('againstModal.title') || 'Bill-by-Bill Against'}
                            {ledgerName && (
                                <span className="ml-2 text-sm font-normal text-secondary dark:text-secondary">
                                    — {ledgerName}
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRefresh && (
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-themed dark:border-themed text-secondary dark:text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                title="Refresh from server"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                {t('refresh') || 'Refresh'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-secondary dark:text-secondary transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div ref={tableContainerRef} className="overflow-auto flex-1">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-secondary dark:text-secondary">
                            <FileText className="h-10 w-10 mb-3 opacity-40" />
                            <p className="text-sm">
                                {t('againstModal.noData') || 'No pending bills found.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left w-8">#</th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left w-28">
                                        <div className="flex items-center gap-1">
                                            {t('againstModal.columns.type') || 'Type'}
                                        </div>
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left">
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {t('againstModal.columns.voucherType') || 'Voucher Type'}
                                        </div>
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left">
                                        <div className="flex items-center gap-1">
                                            <Hash className="h-3 w-3" />
                                            {t('againstModal.columns.voucherNo') || 'Voucher No'}
                                        </div>
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {t('againstModal.columns.voucherDate') || 'Date'}
                                        </div>
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-right">
                                        {t('againstModal.columns.billAmount') || 'Bill Amount'}
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-right">
                                        {t('againstModal.columns.amountToPay') || 'Amount to Pay'}
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-left">
                                        {t('againstModal.columns.currency') || 'Currency'}
                                    </th>
                                    <th className="border border-themed dark:border-themed px-2 py-2 w-9 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allChecked}
                                            ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                                            onChange={handleCheckAll}
                                            className="w-4 h-4 cursor-pointer accent-blue-600"
                                            title="Select all"
                                        />
                                    </th>
                                    <th className="border border-themed dark:border-themed px-3 py-2 text-xs font-semibold text-right">
                                        {t('againstModal.columns.amount') || 'Amount'}
                                    </th>
                                    <th className="border border-themed dark:border-themed px-2 py-2 w-9" />
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr
                                        key={row._id}
                                        className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover transition-colors ${
                                            idx % 2 === 0
                                                ? 'bg-white dark:bg-gray-900'
                                                : 'bg-gray-50 dark:bg-gray-800'
                                        }`}
                                    >
                                        {/* # */}
                                        <td className="border border-themed dark:border-themed px-3 py-2 text-center text-secondary dark:text-secondary">
                                            {idx + 1}
                                        </td>

                                        {/* Type */}
                                        <td className="border border-themed dark:border-themed px-2 py-1">
                                            {row.isNew ? (
                                                <select
                                                    value={row.type}
                                                    onChange={(e) => handleTypeChange(row._id, e.target.value)}
                                                    className="w-full px-1 py-1 text-xs border border-themed dark:border-themed rounded bg-white dark:bg-gray-800 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                >
                                                    {TYPE_OPTIONS_NEW.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASS[row.type] || TYPE_BADGE_CLASS['Against']}`}>
                                                    {row.type}
                                                </span>
                                            )}
                                        </td>

                                        {/* Voucher Type */}
                                        <td className="border border-themed dark:border-themed px-3 py-2">
                                            {row.isNew ? (
                                                <span className="text-xs text-secondary dark:text-secondary">—</span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASS[row.type] || TYPE_BADGE_CLASS['Against']}`}>
                                                    {row.voucherType}
                                                </span>
                                            )}
                                        </td>

                                        {/* Voucher No */}
                                        <td className="border border-themed dark:border-themed px-3 py-2 font-medium text-primary dark:text-primary">
                                            {row.isNew ? (
                                                <span className="text-xs text-secondary dark:text-secondary">—</span>
                                            ) : row.voucherNo}
                                        </td>

                                        {/* Date */}
                                        <td className="border border-themed dark:border-themed px-3 py-2 text-secondary dark:text-secondary whitespace-nowrap">
                                            {row.isNew ? (
                                                <input
                                                    type="date"
                                                    value={row.voucherDate}
                                                    readOnly
                                                    disabled
                                                    className="w-full text-xs border-0 bg-transparent text-secondary dark:text-secondary cursor-not-allowed"
                                                />
                                            ) : row.voucherDate}
                                        </td>

                                        {/* Bill Amount */}
                                        <td className="border border-themed dark:border-themed px-3 py-2 text-right font-medium text-primary dark:text-primary">
                                            {row.billAmount != null
                                                ? parseFloat(row.billAmount).toFixed(2)
                                                : <span className="text-secondary dark:text-secondary">—</span>
                                            }
                                        </td>

                                        {/* Amount to Pay */}
                                        <td className="border border-themed dark:border-themed px-3 py-2 text-right text-primary dark:text-primary">
                                            {row.amountToPay != null
                                                ? parseFloat(row.amountToPay).toFixed(2)
                                                : <span className="text-secondary dark:text-secondary">—</span>
                                            }
                                        </td>

                                        {/* Currency */}
                                        <td className="border border-themed dark:border-themed px-3 py-2">
                                            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                                {row.currencySymbol||'SAR'}
                                            </span>
                                        </td>

                                        {/* Checkbox */}
                                        <td className="border border-themed dark:border-themed px-2 py-1 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.checked}
                                                onChange={(e) => handleRowCheck(row._id, e.target.checked)}
                                                className="w-4 h-4 cursor-pointer accent-blue-600"
                                            />
                                        </td>

                                        {/* Amount (editable) */}
                                        <td className="border border-themed dark:border-themed px-2 py-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                {...(row.amountToPay != null ? { max: parseFloat(row.amountToPay) } : {})}
                                                value={row.amount}
                                                data-against-amt="true"
                                                disabled={!row.checked}
                                                onChange={(e) => handleAmountChange(row._id, e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full px-2 py-1 text-sm text-right border border-themed dark:border-themed rounded bg-white dark:bg-gray-800 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-700"
                                                placeholder="0.00"
                                            />
                                        </td>

                                        {/* Delete */}
                                        <td className="border border-themed dark:border-themed px-2 py-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(row._id)}
                                                disabled={rows.length === 1}
                                                className="p-1 rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Remove row"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Summary footer */}
                            <tfoot className="bg-gray-100 dark:bg-gray-800 sticky bottom-0">
                                <tr className="font-semibold text-primary dark:text-primary">
                                    <td
                                        colSpan={5}
                                        className="border border-themed dark:border-themed px-3 py-2 text-right text-xs uppercase tracking-wide"
                                    >
                                        {t('againstModal.total') || 'Total'}
                                    </td>
                                    <td className="border border-themed dark:border-themed px-3 py-2 text-right text-sm">
                                        {totalBillAmount.toFixed(2)}
                                    </td>
                                    <td className="border border-themed dark:border-themed px-3 py-2 text-right text-sm">
                                        {totalAmountToPay.toFixed(2)}
                                    </td>
                                    <td className="border border-themed dark:border-themed px-3 py-2" />
                                    <td className="border border-themed dark:border-themed px-3 py-2 text-right text-sm text-blue-600 dark:text-blue-400">
                                        {totalAllocated.toFixed(2)}
                                    </td>
                                    <td className="border border-themed dark:border-themed px-2 py-2" />
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* ── Footer actions ── */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-themed dark:border-themed bg-gray-100 dark:bg-gray-800 shrink-0">
                    <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-themed dark:border-themed text-primary dark:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        {t('againstModal.addRow') || 'Add Row'}
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 text-sm rounded border border-themed dark:border-themed text-secondary dark:text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('Cancel') || 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-1.5 text-sm rounded main-bg text-white hover:bg-blue-700 transition-colors font-medium"
                        >
                            {t('againstModal.confirm') || 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgainstModal;