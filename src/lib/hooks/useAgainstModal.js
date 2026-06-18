import { useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';

/**
 * useAgainstModal
 *
 * A reusable hook that encapsulates all against/bill-by-bill logic.
 * Works for Receipt Voucher, Payment Voucher, and Journal Voucher.
 *
 * @param {object}  options
 * @param {string}  options.voucherType   - e.g. "Receipt Voucher" | "Payment Voucher" | "Journal Voucher"
 * @param {string}  options.crOrDr        - "Cr" for receipts / journals credit side, "Dr" for payments
 * @param {string}  [options.voucherId]   - existing voucher ID when in edit mode
 * @param {Array}   options.rows          - current detail rows from the parent form table
 * @param {Function} options.setRows      - state setter for the rows
 * @param {Function} options.updateFormData - propagates rows up to the parent form
 *
 * @returns {object} { againstModal, againstLoadingRow, handleAgainstClick, handleAgainstRefresh, handleAgainstAmountChange, handleAgainstSave }
 */
const useAgainstModal = ({
    voucherType,
    crOrDr = 'Cr',
    voucherId,
    rows,
    setRows,
    updateFormData,
}) => {
    const { selectedBranchId } = useAuth();

    // Persists the user's confirmed checked state per ledgerId across reopens
    const checkedStateRef = useRef({});

    const [againstModal, setAgainstModal] = useState({
        isOpen: false,
        data: [],
        rowIndex: null,
        ledgerName: '',
        ledgerId: null,
        crOrDr,
    });

    const [againstLoadingRow, setAgainstLoadingRow] = useState(null);

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Fetch fresh party-balance rows from the API.
     * Always hits the network — no caching.
     */
    const fetchPartyBalanceRows = async (ledgerId) => {
        const res = await axiosInstance.post('party-balance', {
            ledgerId,
            crOrDr,
            branchId: selectedBranchId,
        });

        return (res?.data?.data || []).map((p) => ({
            masterId: p.MasterId ?? p.masterId,
            type: p.type || 'Against',
            voucherType: p.voucherType || '',
            voucherDate: p.VoucherDate || p.voucherDate || '',
            voucherNo: p.voucherNo || p.VoucherNo || '',
            billAmount: parseFloat(p.billAmount) || 0,
            amountToPay: parseFloat(p.amountToPay) || 0,
            currencySymbol: p.currencySymbol || p.currency || '',
            currencyConversionId: p.currencyConversionId || null,
            creditPeriod: p.creditPeriod || 0,
            referanceNo: p.referanceNo || p.ReferanceNo || '',
            amount: 0,
            crOrDr,
            checked: false,
            isNew: false,
        }));
    };

    /**
     * In edit mode: fetch already-linked bills and merge their amounts back
     * into the fresh party-balance rows so previously settled amounts are shown.
     */
    const mergeWithAgainstRows = async (partyBalanceRows, ledgerId) => {
        // Only relevant in edit mode
        if (!voucherId) return partyBalanceRows;

        let againstRows = [];
        try {
            const res = await axiosInstance.post('party-balance-against', {
                againstVoucherType: voucherType,
                p_againstvoucherno: voucherId,
                ledgerId,
                branchId: selectedBranchId,
                crOrDr,
            });
            againstRows = res?.data?.data || [];
        } catch (err) {
            console.error('useAgainstModal: error fetching party-balance-against:', err);
        }

        const againstByKey = {};
        for (const ag of againstRows) {
            const key = `${String(ag.MastervoucherNo)}|${ag.voucherType}`;
            againstByKey[key] = ag;
        }

        return partyBalanceRows.map((pbRow) => {
            const key = `${String(pbRow.voucherNo)}|${pbRow.voucherType}`;
            const ag = againstByKey[key];
            if (ag) {
                const alreadyPaid = parseFloat(ag.amount) || 0;
                return {
                    ...pbRow,
                    amountToPay: pbRow.amountToPay + alreadyPaid,
                    amount: alreadyPaid,
                    checked: alreadyPaid > 0,
                };
            }
            return pbRow;
        });
    };

    /**
     * In edit mode: the by-id endpoint may return fully-settled invoices that
     * no longer appear in party-balance. Add those so the user can see them.
     */
    const appendSettledInvoices = async (partyBalanceRows, ledgerId, byIdPartyDetails) => {
        if (!voucherId || !byIdPartyDetails?.length) return partyBalanceRows;
        let againstRows = [];
        try {
            const res = await axiosInstance.post('party-balance-against', {
                againstVoucherType: voucherType,
                p_againstvoucherno: voucherId,
                ledgerId,
                branchId: selectedBranchId,
                crOrDr,
            });
            againstRows = res?.data?.data || [];
        } catch (err) {
            console.error('useAgainstModal: error fetching party-balance-against (settled):', err);
        }

        const existingMasterIds = new Set(partyBalanceRows.map((r) => String(r.masterId)));

        const byIdByLedger = byIdPartyDetails.filter(
            (p) => String(p.ledgerId) === String(ledgerId)
        );

        for (const p of byIdByLedger) {
            if (!existingMasterIds.has(String(p.MasterId))) {
                const alreadyPaid = parseFloat(
                    againstRows.find((ag) => String(ag.voucherNo) === String(p.MasterId))?.amount ??
                    p.credit ??
                    0
                );
                partyBalanceRows.push({
                    masterId: p.MasterId,
                    type: p.referenceType || 'Against',
                    voucherType: p.voucherType || '',
                    voucherDate: p.VoucherDate || '',
                    voucherNo: p.voucherNo || p.MastervoucherNo || '',
                    billAmount: parseFloat(p.billAmount) || 0,
                    amountToPay: alreadyPaid,
                    currencySymbol: '',
                    currencyConversionId: p.currencyConversionId || null,
                    creditPeriod: p.creditPeriod || 0,
                    referanceNo: p.ReferanceNo || '',
                    amount: alreadyPaid,
                    crOrDr,
                    checked: alreadyPaid > 0,
                    isNew: false,
                });
            }
        }

        return partyBalanceRows;
    };

    // ─── Public handlers ─────────────────────────────────────────────────────

    /**
     * Open the Against modal for the row at `index`.
     * If the user has already confirmed a selection this session, reopen
     * their confirmed checked rows merged with fresh unchecked API data.
     */
    const handleAgainstClick = async (index, byIdPartyDetails = []) => {
        const row = rows[index];
        if (!row?.ledgerId || row.ledgerId === 0) return;

        // Re-open with previously confirmed checked rows + fresh unchecked rows
        if (checkedStateRef.current[row.ledgerId]) {
            const savedRows = checkedStateRef.current[row.ledgerId];
            const checkedRows = savedRows.filter((r) => r.checked);
            const checkedMasterIds = new Set(checkedRows.map((r) => String(r.masterId)));

            setAgainstLoadingRow(index);
            try {
                let freshRows = await fetchPartyBalanceRows(row.ledgerId);
                freshRows = await mergeWithAgainstRows(freshRows, row.ledgerId);

                const uncheckedFreshRows = freshRows.filter(
                    (r) => !checkedMasterIds.has(String(r.masterId))
                );

                setAgainstModal({
                    isOpen: true,
                    data: [...checkedRows, ...uncheckedFreshRows],
                    rowIndex: index,
                    ledgerName: row.ledgerName || '',
                    ledgerId: row.ledgerId,
                    crOrDr,
                });
            } catch (err) {
                console.error('useAgainstModal: error on reopen:', err);
            } finally {
                setAgainstLoadingRow(null);
            }
            return;
        }

        // First open: fetch fresh, merge edit-mode data, append settled invoices
        setAgainstLoadingRow(index);
        try {
            let partyBalanceRows = await fetchPartyBalanceRows(row.ledgerId);
            partyBalanceRows = await mergeWithAgainstRows(partyBalanceRows, row.ledgerId);
            partyBalanceRows = await appendSettledInvoices(partyBalanceRows, row.ledgerId, byIdPartyDetails);

            setAgainstModal({
                isOpen: true,
                data: partyBalanceRows,
                rowIndex: index,
                ledgerName: row.ledgerName || '',
                ledgerId: row.ledgerId,
                crOrDr,
            });
        } catch (err) {
            console.error('useAgainstModal: error on first open:', err);
        } finally {
            setAgainstLoadingRow(null);
        }
    };

    /**
     * Refresh button inside the modal: always fetches fresh from API,
     * clears cached state so the next reopen also gets fresh data.
     */
    const handleAgainstRefresh = async () => {
        const { rowIndex, ledgerId } = againstModal;
        if (!ledgerId) return;

        try {
            let freshRows = await fetchPartyBalanceRows(ledgerId);
            freshRows = await mergeWithAgainstRows(freshRows, ledgerId);

            // Invalidate cache for this ledger
            delete checkedStateRef.current[ledgerId];

            setAgainstModal((prev) => ({ ...prev, data: freshRows }));
        } catch (err) {
            console.error('useAgainstModal: error on refresh:', err);
        }
    };

    /** Update a single row's amount inside the modal (inline editing). */
    const handleAgainstAmountChange = (masterId, value) => {
        setAgainstModal((prev) => ({
            ...prev,
            data: prev.data.map((item) =>
                item.masterId === masterId ? { ...item, amount: value } : item
            ),
        }));
    };

    /**
     * Confirm: persist checked state, update the row's amount and partyDetails,
     * then close the modal.
     *
     * @param {Array} updatedData   - all rows as the modal left them
     * @param {Array} partyDetails  - mapped party detail objects ready to save
     */
   const handleAgainstSave = (updatedData, partyDetails) => {
    const { rowIndex, ledgerId } = againstModal;
    if (rowIndex === null) return;

    checkedStateRef.current[ledgerId] = updatedData;

    const totalAllocated = updatedData
        .filter((r) => r.checked)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Derive crOrDr from the actual row's current values (supports Journal Voucher)
    const currentRow = rows[rowIndex];
    const rowCrOrDr =
        (parseFloat(currentRow?.debit) || 0) > 0 ? 'Dr'
        : (parseFloat(currentRow?.credit) || 0) > 0 ? 'Cr'
        : crOrDr; // fallback to hook-level default

    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        amount: totalAllocated,
        debit: rowCrOrDr === 'Dr' ? totalAllocated : 0,
        credit: rowCrOrDr === 'Cr' ? totalAllocated : 0,
        againstDetails: updatedData,
        // Enrich each partyDetail with amount, debit, credit
        partyDetails: (partyDetails || updatedData).map((p) => ({
            ...p,
            amount: parseFloat(p.amount) || 0,
            debit: rowCrOrDr === 'Dr' ? (parseFloat(p.amount) || 0) : 0,
            credit: rowCrOrDr === 'Cr' ? (parseFloat(p.amount) || 0) : 0,
            crOrDr: rowCrOrDr,
        })),
    };

    setRows(updatedRows);
    updateFormData(updatedRows);
    setAgainstModal((prev) => ({ ...prev, isOpen: false }));
};
    const closeAgainstModal = () =>
        setAgainstModal((prev) => ({ ...prev, isOpen: false }));

    return {
        againstModal,
        againstLoadingRow,
        closeAgainstModal,
        handleAgainstClick,
        handleAgainstRefresh,
        handleAgainstAmountChange,
        handleAgainstSave,
    };
};

export default useAgainstModal;