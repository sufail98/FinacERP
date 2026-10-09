import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import DateInput from '@/components/elements/theme/DateInput';
import CrDrLabel from '@/components/common/CrDrLabel';
import { sanitize } from '@/lib/inputSanitizer';
import LedgerCreationModal from '@/components/common/LedgerCreationModal';

const ContraVoucherFormTable = ({ formData, setFormData, ledgers, onRowRemove, onLedgerCreated }) => {
    const [validationErrors, setValidationErrors] = useState({});
    const { t } = useTranslation();
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);
    const { selectedBranchId, currentCurrency } = useAuth()
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

    useEffect(() => {
        const syncRows = async () => {
            if (formData?.contraDetails && formData.contraDetails.length > 0) {
                let needsUpdate = false;
                const newRows = await Promise.all(
                    formData.contraDetails.map(async (row) => {
                        if (row.ledgerId && row.ledgerId !== "" && row.ledgerId !== 0 && !row._balanceFetched) {
                            const balance = await fetchLedgerBalance(row.ledgerId);
                            needsUpdate = true;
                            return { ...row, ledgerBalance: balance, _balanceFetched: true };
                        }
                        return row;
                    })
                );

                if (needsUpdate) {
                    setRows(newRows);
                    setFormData(prev => ({ ...prev, contraDetails: newRows }));
                } else {
                    setRows(formData.contraDetails);
                }
            }
        };
        syncRows();
    }, [formData?.contraDetails]);
    const [rows, setRows] = useState(() => {
        if (formData?.contraDetails?.length > 0) {
            return formData.contraDetails;
        }
        return [{
            SlNo: 1,
            ledgerId: "",
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            chequeNo: "",
            chequeDate: "01-01-1753",
            ledgerBalance: null,   // was 0
            _balanceFetched: true,
        }];
    });
    const addNewRow = () => {
        const newRow = {
            SlNo: rows.length + 1,
            ledgerId: "",
            amount: (0).toFixed(generalSettings?.decimalPart ?? 2),
            chequeNo: "",
            chequeDate: "01-01-1753",
            ledgerBalance: null,
            _balanceFetched: true,
        };
        const updatedRows = [...rows, newRow];
        setRows(updatedRows);
        updateFormData(updatedRows);
    };

    const deleteRow = (index) => {
        if (rows.length === 1) {
            alert(t('contraVoucher.form.messages.cannotDeleteLastRow') || 'Cannot delete the last row');
            return;
        }
        const updatedRows = rows.filter((_, i) => i !== index).map((row, i) => ({
            ...row,
            SlNo: i + 1
        }));
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
                errors[`chequeDate-${index}`] = t('requiredFieldsError');
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
            return res.data?.data || null;  // full object, not just currentbal
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return null;
        }
    };

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

        if (field === "ledgerId" && value) {
            try {
                const balance = await fetchLedgerBalance(value);
                updatedRows[index].ledgerBalance = balance;  // store full object
                updatedRows[index]._balanceFetched = true;
            } catch (err) {
                updatedRows[index].ledgerBalance = null;
                updatedRows[index]._balanceFetched = true;
            }
        }

        setRows(updatedRows);
        updateFormData(updatedRows);

        // Validate cheque fields
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

    const updateFormData = (updatedRows) => {
        const totalAmount = updatedRows.reduce(
            (sum, row) => sum + (parseFloat(row.amount) || 0), 0
        );
        setFormData(prev => ({
            ...prev,
            contraDetails: updatedRows,
            totalAmount: totalAmount,
            isValid: validateAllRows(updatedRows)
        }));
    };

    const renderLedgerField = (row, index) => (
        <>
            <div className="relative flex items-start">
                <div className="w-full relative">
                    <SearchableDropdown
                        name={`ledgerId-${index}`}
                        value={row.ledgerId}
                        onChange={(value) => handleCellChange(index, 'ledgerId', value)}
                        placeholder={t('contraVoucher.form.placeholders.selectLedger')}
                        searchPlaceholder={t('contraVoucher.form.placeholders.selectLedger')}
                        clearable={true}
                        className="w-full"
                        options={ledgers?.filter(data => data.ledgerName)?.map((data) => ({
                            value: data.ledgerId,
                            label: data.ledgerName,
                        })) || []}
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
            {financeSettings?.showLedgerbalance && (
                <div className="flex items-center text-[10px] sm:text-sm text-secondary dark:text-secondary mt-1 gap-2">
                    {t('contraVoucher.form.label.ledgerBalance') || 'Balance'}:{' '}
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
        </>
    );

    const renderAmountField = (row, index, alignRight = false) => (
        <TextInput
            onFocus={(e) => e.target.select()}
            type="number"
            min="0"
            name={`amount-${index}`}
            value={row.amount}
            onChange={(e) => handleCellChange(index, 'amount', e.target.value)}
            onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
            }}
            placeholder="0.00"
            className={`w-full text-xs sm:text-sm ${alignRight ? 'text-right' : ''}`}
            step="0.01"
        />
    );

    const renderChequeNoField = (row, index) => (
        <TextInput
            name={`chequeNo-${index}`}
            value={row.chequeNo}
            onChange={(e) => handleCellChange(index, 'chequeNo', e.target.value)}
            placeholder={t('contraVoucher.form.placeholders.chequeNo')}
            className="w-full text-xs sm:text-sm"
        />
    );

    const renderChequeDateField = (row, index) => (
        <div>
            <DateInput
                value={row.chequeDate !== "01-01-1753" ? row.chequeDate : null}
                name="chequeDate"
                onChange={(e, value) => handleCellChange(index, "chequeDate", value ?? e)}
                className="w-full"
                format={generalSettings.dateformat}
                disabled={!row.chequeNo || row.chequeNo.trim() === ""}
            />
            {validationErrors[`chequeDate-${index}`] && (
                <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                    <span>{validationErrors[`chequeDate-${index}`]}</span>
                </div>
            )}
        </div>
    );

    const renderActions = (row) => (
        <div className="flex items-center justify-center">
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                    if (rows.length === 1) {
                        alert(t('contraVoucher.form.messages.cannotDeleteLastRow') || 'Cannot delete the last row');
                        return;
                    }
                    onRowRemove(row.SlNo);
                }}
                className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
        </div>
    );

    return (
        <>
            <LedgerCreationModal 
                open={isLedgerModalOpen} 
                handleClose={() => setIsLedgerModalOpen(false)} 
                onSuccess={() => {
                    setIsLedgerModalOpen(false);
                    if (onLedgerCreated) onLedgerCreated();
                }} 
            />
        <div className="mt-4 bg-primary dark:bg-primary">
            <div className="hidden md:block">
                <table className="w-full min-w-[760px] border-collapse">
                        <thead className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                            <tr>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-10">
                                    {t('contraVoucher.form.table.columns.slNo') || 'SI No'}
                                </th>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-80">
                                    {t('contraVoucher.form.table.columns.ledgerName') || 'Bank Account'}
                                </th>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                                    {t('contraVoucher.form.table.columns.amount') || 'Amount'}
                                </th>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-32">
                                    {t('contraVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                                </th>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-left w-36">
                                    {t('contraVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                                </th>
                                <th className="border border-themed dark:border-themed p-2 text-xs font-semibold text-center w-20">
                                    {t('contraVoucher.form.table.columns.action') || 'Action'}
                                </th>
                            </tr>
                        </thead>

                        <tbody className="bg-primary dark:bg-primary">
                            {rows.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${row.SlNo % 2 === 1
                                        ? 'bg-gray-100 dark:bg-gray-800'
                                        : 'bg-white dark:bg-gray-900'
                                        }`}
                                >
                                    <td className="p-2 text-center border border-themed dark:border-themed">
                                        <span className="text-sm font-medium text-primary dark:text-primary">{row.SlNo}</span>
                                    </td>
                                    <td className="p-1 border border-themed dark:border-themed">
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
                                    <td className="p-1 align-top border border-themed dark:border-themed">
                                        {renderActions(row)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
            </div>

            <div className="md:hidden space-y-3">
                {rows.map((row, index) => (
                    <div
                        key={index}
                        className={`rounded-lg border border-themed dark:border-themed p-3 shadow-sm ${index % 2 === 0
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-secondary dark:text-secondary">
                                {(t('contraVoucher.form.table.columns.slNo') || 'SI No')} {row.SlNo}
                            </span>
                            {renderActions(row)}
                        </div>

                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                    {t('contraVoucher.form.table.columns.ledgerName') || 'Bank Account'}
                                </label>
                                {renderLedgerField(row, index)}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                        {t('contraVoucher.form.table.columns.amount') || 'Amount'}
                                    </label>
                                    {renderAmountField(row, index)}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                        {t('contraVoucher.form.table.columns.chequeNo') || 'Cheque No'}
                                    </label>
                                    {renderChequeNoField(row, index)}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-secondary dark:text-secondary mb-1">
                                    {t('contraVoucher.form.table.columns.chequeDate') || 'Cheque Date'}
                                </label>
                                {renderChequeDateField(row, index)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-themed dark:border-themed flex justify-end py-2 bg-primary dark:bg-primary mt-2 md:mt-0">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addNewRow}
                    className="main-bg text-white hover:text-white hover:bg-blue-700 dark:hover:main-bg text-xs sm:text-sm transition"
                >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {t('contraVoucher.form.table.buttons.addRow')}
                </Button>
            </div>
        </div>
        </>
    );
};

export default ContraVoucherFormTable;