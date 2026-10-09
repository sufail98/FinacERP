import React, { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2, Edit } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';
import PayableVoucherFooterSection from './PayableVoucherFooterSection';
import EditProductDetailsModal from './EditProductDetailsModal';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import DateInput from '@/components/elements/theme/DateInput';
import CrDrLabel from '@/components/common/CrDrLabel';
import { sanitize } from '@/lib/inputSanitizer';
import LedgerCreationModal from '@/components/common/LedgerCreationModal';

const PayableVoucherTable = ({ formData, setFormData, editMode, rows: propRows, setRows: propSetRows, ledgers, banks, cash, onLedgerCreated }) => {

    const { t } = useTranslation();
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [taxData, setTaxData] = useState([])
    const { selectedBranchId, currentCurrency } = useAuth();
    const { generalSettings, purchaseSettings, financeSettings } = useSelector((state) => state.settings);
    const [loadingLedgers, setLoadingLedgers] = useState(false);
    const inputRefs = useRef({});
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // ─────────────────────────────────────────────────────────────────
    // Ledger balance fetch
    // ─────────────────────────────────────────────────────────────────
    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );
            return res.data?.data || null;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return null;
        }
    };
const emptyRow = (index) => ({
    id: index + 1,
    sn: index + 1,
    ledgerId: '',
    ledgerName: '',
    grossAmount: (0).toFixed(generalSettings?.decimalPart ?? 2), // renamed from "amount"
    discAmt: 0,
    discPerc: 0,
    netAmount: 0,
    taxId: null,
    taxRate: 0,
    taxType: 'Excluded',
    taxAmount: 0,
    chequeNo: '',
    chequeDate: null,
    narration: '',
    amount: 0,           // renamed from "totalAmount" — final payable, maps to API "amount"
    ledgerBalance: null,
});

const [rows, setRows] = useState(() => {
    if (editMode && propRows && propRows.length > 0) {
        return propRows.map((item, index) => ({
            id: index + 1,
            sn: index + 1,
            ledgerId: item.ledgerId || '',
            ledgerName: item.ledgerName || '',
            grossAmount: (parseFloat(item.grossAmount) || 0).toFixed(generalSettings?.decimalPart ?? 2),
            discAmt: parseFloat(item.discAmt) || 0,
            discPerc: parseFloat(item.discountPercentage ?? item.discPerc) || 0,
            netAmount: parseFloat(item.netAmount) || 0,
            taxId: item.taxId || null,
            taxRate: parseFloat(item.taxRate) || 0,
            taxType: item.taxType || 'Excluded',
            taxAmount: parseFloat(item.taxAmount) || 0,
            chequeNo: item.chequeNo || '',
            chequeDate: item.chequeDate ? new Date(item.chequeDate) : null,
            narration: item.Narration || item.narration || '',
            amount: parseFloat(item.amount) || 0,
            ledgerBalance: null,
        }));
    } else {
        return Array.from({ length: 4 }, (_, index) => emptyRow(index));
    }
});
    // Fetch balances for all pre-filled ledgers on edit mode mount
    useEffect(() => {
        if (!editMode) return;
        rows.forEach((row) => {
            if (row.ledgerId) {
                fetchLedgerBalance(row.ledgerId).then((balance) => {
                    setRows((prev) =>
                        prev.map((r) =>
                            r.id === row.id ? { ...r, ledgerBalance: balance } : r
                        )
                    );
                });
            }
        });
        // Only run on mount for edit mode
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode]);

    useEffect(() => {
        fetchTaxData();
    }, []);

    const fetchTaxData = async () => {
        try {
            const res = await axiosInstance.get("tax-masters");
            setTaxData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching tax:", err);
        }
    };

  const calculateRow = (row, changedField = null) => {
    let amountAfterDiscount, taxAmount, netAmount, discAmt, discPerc;

    if (changedField === 'discAmt') {
        discAmt  = row.discAmt;
        discPerc = row.grossAmount > 0 ? (discAmt / row.grossAmount) * 100 : 0;
    } else if (changedField === 'discPerc') {
        discPerc = row.discPerc;
        discAmt  = (row.grossAmount * discPerc) / 100;
    } else {
        discPerc = row.discPerc;
        discAmt  = (row.grossAmount * discPerc) / 100;
    }

    amountAfterDiscount = parseFloat(row.grossAmount) - discAmt;

    if (row.taxId && row.taxRate > 0) {
        taxAmount = (amountAfterDiscount * row.taxRate) / 100;

        if (row.taxType === 'Included') {
            netAmount = amountAfterDiscount - taxAmount;
        } else {
            netAmount = amountAfterDiscount;
        }
    } else {
        taxAmount = 0;
        netAmount = amountAfterDiscount;
    }

    const finalAmount = row.taxType === 'Included'
        ? amountAfterDiscount
        : amountAfterDiscount + taxAmount;

    return {
        ...row,
        discAmt:   parseFloat(discAmt.toFixed(generalSettings.decimalPart)),
        discPerc:  parseFloat(discPerc.toFixed(generalSettings.decimalPart)),
        netAmount: parseFloat(netAmount.toFixed(generalSettings.decimalPart)),
        taxAmount: parseFloat(taxAmount.toFixed(generalSettings.decimalPart)),
        amount:    parseFloat(finalAmount.toFixed(generalSettings.decimalPart)),
    };
};

    const validateRow = (row) => {
        const errors = {};
        if (row.chequeNo && row.chequeNo.trim() !== '' && !row.chequeDate) {
            errors.chequeDate = 'Cheque date is required when cheque number is provided';
        }
        return errors;
    };

    const handleInputChange = (id, field, value) => {
        const updatedRows = rows.map(row => {
            if (row.id === id) {
                   let updatedValue = value;
                    if(field === "chequeNo"){
                            updatedValue = sanitize.numbers(value)
                        }
                let updatedRow = { ...row, [field]: updatedValue };
                
                        
                // If ledger changed, update ledger name and trigger balance fetch
                if (field === 'ledgerId') {
                    const selectedLedger = ledgers.find(l => l.ledgerId === value);
                    updatedRow.ledgerName = selectedLedger?.ledgerName || '';
                    updatedRow.ledgerBalance = null; // reset while loading

                    if (value) {
                        fetchLedgerBalance(value).then((balance) => {
                            setRows((prev) =>
                                prev.map((r) =>
                                    r.id === id ? { ...r, ledgerBalance: balance } : r
                                )
                            );
                        });
                    }
                }

                if (field === 'taxId') {
                    const selectedTax = taxData.find(t => t.taxId === value);
                    updatedRow.taxRate = parseFloat(selectedTax?.rate || 0);
                }

                

                updatedRow = calculateRow(updatedRow, field);

                const rowErrors = validateRow(updatedRow);
                setValidationErrors(prev => ({
                    ...prev,
                    [id]: rowErrors
                }));

                return updatedRow;
            }
            return row;
        });

        setRows(updatedRows);

        const isLastRow = id === rows[rows.length - 1].id;
        const hasInput = value !== '' && value !== 0;

        if (isLastRow && hasInput) {
            addRow();
        }
    };

    const handleEditSuccess = (updatedData) => {
        const updatedRows = rows.map(row => {
            if (row.id === editingRow.id) {
                return {
                    ...row,
                    chequeNo: updatedData.chequeNo,
                    chequeDate: updatedData.chequeDate,
                    narration: updatedData.narration,
                };
            }
            return row;
        });
        setRows(updatedRows);
        setEditModalOpen(false);
        setEditingRow(null);
    };

    const addRow = () => {
        setRows(prev => [...prev, emptyRow(prev.length)]);
    };

    const deleteRow = async (id) => {
        if (generalSettings?.askConfirmationRowRemove) {
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
        }

        if (rows.length > 1) {
            const newRows = rows
                .filter(row => row.id !== id)
                .map((row, index) => ({ ...row, sn: index + 1, id: index + 1 }));
            setRows(newRows);

            setValidationErrors(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        } else {
            setRows([emptyRow(0)]);
            setValidationErrors({});
        }
    };

   useEffect(() => {
    const filledRows = rows.filter(row => row.ledgerId && row.ledgerId !== '');

    const payableDetails = filledRows.map((row, index) => ({
        lineIndex: index + 1,
        ledgerId: row.ledgerId,
        ledgerName: row.ledgerName,
        grossAmount: row.grossAmount,
        discAmt: row.discAmt,
        discPerc: row.discPerc,
        discountPercentage: row.discPerc,
        netAmount: row.netAmount,
        taxId: row.taxId,
        taxRate: row.taxRate,
        taxType: row.taxType,
        taxAmount: row.taxAmount,
        amount: row.amount,          // final payable — matches API's "amount"
        chequeNo: row.chequeNo,
        chequeDate: row.chequeDate,
        Narration: row.narration,
    }));

    const subTotal = filledRows.reduce((sum, row) => sum + row.netAmount, 0);
    const totalTaxAmt = filledRows.reduce((sum, row) => sum + row.taxAmount, 0);
    const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);

    setFormData(prev => ({
        ...prev,
        payableDetails,
        subTotal: subTotal.toFixed(generalSettings.decimalPart),
        totalTax: totalTaxAmt.toFixed(generalSettings.decimalPart),
        totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
    }));
}, [rows, selectedBranchId]);


    const calculateTotals = () => {
    const filledRows = rows.filter(row => row.ledgerId && row.ledgerId !== '');
    const totalNetAmount = filledRows.reduce((sum, row) => sum + row.netAmount, 0);
    const totalTaxAmount = filledRows.reduce((sum, row) => sum + row.taxAmount, 0);
    const grandTotal = filledRows.reduce((sum, row) => sum + row.amount, 0);

    return {
        totalNetAmount: totalNetAmount.toFixed(generalSettings.decimalPart),
        totalTaxAmount: totalTaxAmount.toFixed(generalSettings.decimalPart),
        grandTotal: grandTotal.toFixed(generalSettings.decimalPart),
    };
};

    const totals = calculateTotals();

    const taxTypeOptions = [
        { value: 'Excluded', label: 'Excluded' },
        { value: 'Included', label: 'Included' }
    ];

    return (
        <div className="w-full min-h-[400px] bg-primary dark:bg-primary">
            <div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.SN")}</th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">
                                {t("payableVoucher.form.gridSection.columns.ledgerName") || "Expense Account"}
                            </th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.amount")}</th>
                            {purchaseSettings?.showLineDiscount && (
                                <>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.discPerc")}</th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.discAmt")}</th>
                                </>
                            )}
                            {(generalSettings?.ActivateTax && formData.taxType === 'applicable to ledgers') && (
                                <>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.taxType")}</th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">Tax Master</th>
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.taxAmount")}</th>
                                </>
                            )}
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.netAmount")}</th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.chequeNo")}</th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.chequeDate")}</th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.narration")}</th>
                            <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.totalAmount")}</th>
                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed">{t("payableVoucher.form.gridSection.columns.action")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${row.sn % 2 === 1
                                    ? 'bg-gray-100 dark:bg-gray-800'
                                    : 'bg-white dark:bg-gray-900'
                                    }`}
                            >
                                <td className="p-1 border border-themed dark:border-themed text-center w-8">
                                    <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                </td>

                                {/* Ledger Name */}
                                <td className="p-1 border border-themed dark:border-themed w-64">
                                    <div className="flex items-start">
                                        <div className="flex-1 min-w-0">
                                            <SearchableDropdown
                                                options={ledgers?.map((ledger) => ({
                                                    value: ledger.ledgerId,
                                                    label: ledger.ledgerName,
                                                }))}
                                                value={row.ledgerId}
                                                onChange={(value) => handleInputChange(row.id, 'ledgerId', value)}
                                                placeholder="Select Expense Account"
                                                searchPlaceholder="Search Expense..."
                                                clearable={true}
                                                className="w-full"
                                                loading={loadingLedgers}
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

                                    {/* Ledger Balance */}
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
                                </td>

                                {/* Amount */}
                               <td className="p-1 border border-themed dark:border-themed w-20">
    <input
        ref={el => inputRefs.current[`${row.id}-amount`] = el}
        type="number"
        min="0"
        step="0.01"
        value={row.grossAmount}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
            if(["-","+","e","E"].includes(e.key)){
                e.preventDefault()
            }
        }}
        onChange={(e) => {
            const value = e.target.value;
            if (/^\d*\.?\d*$/.test(value)) {
                handleInputChange(row.id, 'grossAmount', value);
            }
        }}
        onBlur={(e) => {
            const num = parseFloat(e.target.value) || 0;
            handleInputChange(
                row.id,
                'grossAmount',
                num.toFixed(generalSettings.decimalPart)
            );
        }}
        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
    />
</td>

                                {purchaseSettings?.showLineDiscount && (
                                    <>
                                        {/* Disc % */}
                                        <td className="p-1 border border-themed dark:border-themed w-17">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={row.discPerc}
                                                onFocus={(e) => e.target.select()}
                                                // onChange={(e) => handleInputChange(row.id, 'discPerc', parseFloat(e.target.value) || 0)}
                                                onChange={(e) => {
                                                    let value = parseFloat(e.target.value);
                                                     if (isNaN(value)) value = 0;
                                                     value = Math.min(Math.max(value, 0), 99);
                                                     handleInputChange(row.id, "discPerc", value);
                                                    }}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                        </td>

                                        {/* Disc Amt */}
                                        <td className="p-1 border border-themed dark:border-themed w-20">
                                            <input
                                                type="number"
                                                value={row.discAmt}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => handleInputChange(row.id, 'discAmt', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                        </td>
                                    </>
                                )}

                                {(generalSettings?.ActivateTax && formData.taxType === 'applicable to ledgers') && (
                                    <>
                                        {/* Tax Type */}
                                        <td className="p-1 border border-themed dark:border-themed w-24">
                                            <select
                                                value={row.taxType}
                                                onChange={(e) => handleInputChange(row.id, 'taxType', e.target.value)}
                                                className="w-full px-2 py-1 text-sm border-0 bg-primary dark:bg-secondary text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                            >
                                                {taxTypeOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Tax Master — remove disabled={row.taxType === 'Excluded'} */}
                                        <td className="p-1 border border-themed dark:border-themed w-32">
                                            <select
                                                value={row.taxId || ''}
                                                onChange={(e) => handleInputChange(row.id, 'taxId', parseInt(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border-0 bg-primary dark:bg-secondary 
                   text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 
                   dark:focus:ring-blue-400 rounded"
                                            >
                                                <option value="">Select Tax</option>
                                                {taxData?.map((tax) => (
                                                    <option key={tax.taxId} value={tax.taxId}>
                                                        {tax.taxName} ({tax.rate}%)
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Tax Amount */}
                                        <td className="p-1 border border-themed dark:border-themed w-24 bg-secondary dark:bg-secondary">
                                            <span className="text-sm font-medium block text-right px-2 text-primary dark:text-primary">
                                                {row.taxAmount.toFixed(generalSettings.decimalPart)}
                                            </span>
                                        </td>
                                    </>
                                )}

                                {/* Net Amount */}
                                <td className="p-1 border border-themed dark:border-themed w-20">
                                    <span className="text-sm font-medium block text-right px-2 text-primary dark:text-primary">
                                        {row.netAmount.toFixed(generalSettings.decimalPart)}
                                    </span>
                                </td>

                                {/* Cheque No */}
                                <td className="p-1 border border-themed dark:border-themed w-20">
                                    <input
                                        type="text"
                                        value={row.chequeNo}
                                        onChange={(e) => handleInputChange(row.id, 'chequeNo', e.target.value)}
                                        placeholder={t("payableVoucher.form.gridSection.placeholders.chequeNo")}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                    />
                                </td>

                                {/* Cheque Date */}
                                <td className="p-1 border border-themed dark:border-themed w-25">
                                    <div>
                                        <DateInput
                                            value={row.chequeDate
                                                ? (row.chequeDate instanceof Date
                                                    ? row.chequeDate.toISOString().split('T')[0]
                                                    : String(row.chequeDate).split('T')[0])
                                                : ""}
                                            name='partyRefDate'
                                            onChange={(e) =>
                                                handleInputChange(row.id, "chequeDate", e.target.value)
                                            }
                                            className={`w-30 border rounded px-2 ${validationErrors[row.id]?.chequeDate
                                                ? "border-2 border-red-500"
                                                : "border-gray-300"
                                                }`}
                                            format={generalSettings.dateformat}
                                        />
                                        {validationErrors[row.id]?.chequeDate && (
                                            <span className="text-xs text-red-500 mt-1 block">
                                                {validationErrors[row.id].chequeDate}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Narration */}
                                <td className="p-1 border border-themed dark:border-themed w-48">
                                    <input
                                        type="text"
                                        value={row.narration}
                                        onChange={(e) => handleInputChange(row.id, 'narration', e.target.value)}
                                        placeholder={t("payableVoucher.form.gridSection.placeholders.narration")}
                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                    />
                                </td>

                                {/* Total Amount */}
                                <td className="p-1 border border-themed dark:border-themed w-24">
                                    <span className="text-sm font-bold block text-right px-2 text-red-700 dark:text-red-400">
                                        {row.amount.toFixed(generalSettings.decimalPart)}
                                    </span>
                                </td>

                                {/* Action */}
                                <td className="w-1 border border-themed dark:border-themed text-center">
                                    <div className="flex gap-1 justify-center">
                                        <button
                                            onClick={() => deleteRow(row.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                            title="Delete This Row"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end items-center mt-2">
                <button
                    onClick={addRow}
                    className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"
                >
                    <Plus size={15} />
                    {t("payableVoucher.form.gridSection.buttons.addRow")}
                </button>
            </div>

            <PayableVoucherFooterSection
                totals={totals}
                formData={formData}
                setFormData={setFormData}
                banks={banks}
                cash={cash}
            />

        <EditProductDetailsModal
                open={editModalOpen}
                handleClose={() => {
                    setEditModalOpen(false);
                    setEditingRow(null);
                }}
                onSuccess={handleEditSuccess}
                rowData={editingRow}
            />
            
            <LedgerCreationModal 
                open={isLedgerModalOpen} 
                handleClose={() => setIsLedgerModalOpen(false)} 
                onSuccess={() => {
                    setIsLedgerModalOpen(false);
                    if (onLedgerCreated) onLedgerCreated();
                }} 
            />
        </div>
    );
};

export default PayableVoucherTable;