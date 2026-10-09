import AddNewBtn from '@/components/common/AddNewBtn';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import { Label } from '@/components/ui/label';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import AddBankModal from '../RecieptVoucher/AddBankModal';
import DateInput from '@/components/elements/theme/DateInput';
import CrDrLabel from '@/components/common/CrDrLabel';

const ContraVoucherFormHeader = ({
    voucherNo,
    errors,
    formData,
    costCenters: costCentres,
    handleFormChange,
    existingContraNo,
    bankCash: bankAccounts,
    setBankCash: setBankAccounts,
    editMode,
    ledgerBalance, setLedgerBalance
}) => {
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);
    const [fetchLedgerLoading, setFetchLedgerLoading] = useState(false)
    const { t } = useTranslation();
    const { selectedBranchId, currentCurrency,currentFinancialYear } = useAuth()

    const fetchLedgerBalance = async (ledgerId) => {
        if (!ledgerId) {
            setLedgerBalance(null);
            return;
        }

        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );

            setLedgerBalance(res.data?.data || null);
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            setLedgerBalance(null);
        }
    };

    useEffect(() => {
        fetchLedgerBalance(formData.ledgerId);
    }, [formData.ledgerId]);


    const fetchBankAccounts = async () => {
        setFetchLedgerLoading(true)
        try {
            const res = await axiosInstance.post("bank-account-ledgers", {
                group_ids: [5, 8],
                branchId: selectedBranchId
            });
            setBankAccounts(res.data.data);
        } catch (err) {
            console.error("Error fetching Bank Accounts:", err);
        } finally {
            setFetchLedgerLoading(false)
        }
    };

       const shouldRestrictDates = financeSettings?.ShowAllTransactions === false;
    const today = new Date().toISOString().split("T")[0];

    const minDateFromFinance = shouldRestrictDates && currentFinancialYear?.fromDate
        ? currentFinancialYear.fromDate.split(' ')[0]
        : null;
    const maxDateFromFinance = shouldRestrictDates && currentFinancialYear?.toDate
        ? currentFinancialYear.toDate.split(' ')[0]
        : null;
    const maxDate =
        maxDateFromFinance && maxDateFromFinance < today
            ? maxDateFromFinance
            : today;

    return (
        <div>
            <div className='grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>

                {/* First Column */}
                <div className='space-y-2'>
                    <TextInput
                        label={t('contraVoucher.form.label.ContraNo')}
                        value={editMode ? existingContraNo : voucherNo}
                        onChange={() => { }}
                        required
                        className='w-full text-red-600 font-bold'
                        disabled
                        readOnly
                    />

                    {/* ✅ FIX 1: Changed 'ledgerId' → 'date' */}
                    {/* ✅ FIX 2: Two-arg onChange to match DateInput signature */}
                    <DateInput
                        label={t('contraVoucher.form.label.date')}
                        value={formData.date}
                        name='date'
                        onChange={(e, value) => handleFormChange('date', value ?? e)}
                        className="w-full"
                        format={generalSettings.dateformat}
                        required
                        error={errors.date}
                        min={minDateFromFinance}
                        max={maxDate}
                    />
                </div>

                {/* Second Column */}
                <div className='space-y-2'>
                    <div className='flex gap-1 items-end'>
                        <div className='flex-1 min-w-0'>
                            <SearchableDropdown
                                name="ledgerId"
                                label={t('contraVoucher.form.label.bankAccount')}
                                options={bankAccounts?.map((data) => ({
                                    value: data.ledgerId,
                                    label: data.ledgerName,
                                }))}
                                value={formData.ledgerId}
                                onChange={(value) => handleFormChange('ledgerId', value)}
                                placeholder={t('contraVoucher.form.placeholders.bankAccount')}
                                searchPlaceholder={t('contraVoucher.form.placeholders.bankAccount')}
                                clearable={true}
                                className='w-full'
                                required
                                error={errors.ledgerId}
                                loading={fetchLedgerLoading}
                            />


                            {financeSettings?.showLedgerbalance && formData.ledgerId && ledgerBalance !== null && (
                                <div className="flex items-center text-[10px] sm:text-sm text-secondary dark:text-secondary mt-1 gap-2">
                                    {t('contraVoucher.form.label.ledgerBalance') || 'Balance'}:{" "}
                                    <CrDrLabel
                                        crordr={ledgerBalance.crordr}
                                        accountCalculationMethod={generalSettings?.AccountCalculationMethod}
                                        balance={ledgerBalance.currentbal}
                                        decimalPart={generalSettings?.decimalPart ?? 2}
                                    />
                                </div>
                            )}
                        </div>
                        <div className='flex-shrink-0'>
                            <AddNewBtn
                                icon={Plus}
                                onClick={() => setBankModalOpen(true)}
                            />
                        </div>
                    </div>

                    {/* Radio Buttons for Type - moved here to fill space */}
                    <div className='mt-2'>
                        <Label className="text-[11px] font-medium mb-2 block">
                            {t('contraVoucher.form.label.type')}
                            <span className='text-red-500'>*</span>
                        </Label>
                        <div className="flex gap-3 sm:gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value="Deposit"
                                    checked={formData.type === "Deposit"}
                                    onChange={(e) => handleFormChange('type', e.target.value)}
                                    className="w-4 h-4 text-blue-600 cursor-pointer"
                                />
                                <span className="text-xs sm:text-sm">
                                    {t('contraVoucher.form.label.deposit')}
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value="Withdrawal"
                                    checked={formData.type === "Withdrawal"}
                                    onChange={(e) => handleFormChange('type', e.target.value)}
                                    className="w-4 h-4 text-blue-600 cursor-pointer"
                                />
                                <span className="text-xs sm:text-sm">
                                    {t('contraVoucher.form.label.withdrawal')}
                                </span>
                            </label>
                        </div>
                        {errors.type && (
                            <p className="text-xs text-red-500 mt-1">{errors.type}</p>
                        )}
                    </div>
                </div>

                {/* Third Column */}
                <div className='space-y-2'>
                    {/* ✅ REMOVED: ReferenceNo field (not needed by backend) */}
                    {/* ✅ REMOVED: ReferenceDate field (not needed by backend) */}

                    {generalSettings?.costCentre && (
                        <SearchableDropdown
                            name="costCentreId"
                            label={t('costCenter.heading') || 'Cost Centre'}
                            options={costCentres?.map((data) => ({
                                value: data.costCentreId,
                                label: data.CostCentre,
                            }))}
                            value={formData.costCentreId}
                            onChange={(value) => handleFormChange('costCentreId', value)}
                            placeholder="Select Cost Centre"
                            searchPlaceholder="Search Cost Centre"
                            clearable={true}
                            className='w-full'
                        />
                    )}
                </div>
            </div>

            <AddBankModal
                open={bankModalOpen}
                handleClose={() => setBankModalOpen(false)}
                onSuccess={fetchBankAccounts}
            />
        </div>
    )
}

export default ContraVoucherFormHeader 