import AddNewBtn from '@/components/common/AddNewBtn';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import AddBankModal from '../RecieptVoucher/AddBankModal';
import DateInput from '@/components/elements/theme/DateInput';
import CrDrLabel from '@/components/common/CrDrLabel';
import DocumentUpload from '../../../common/DocumentUpload'

const PaymentVoucherFormHeader = ({ voucherNo, editMode, errors, formData, setFormData, handleFormChange, existingPaymentNo, setBankCash, costCenters: costCentres, bankCash, setLedgerBalance, ledgerBalance, documents, setDocuments, existingDocuments, setExistingDocuments,
    removedDocuments, setRemovedDocuments, }) => {
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const { selectedBranchId, currentCurrency, currentFinancialYear } = useAuth();
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);
    const [fetchBankCashLoading, setFetchBankCashLoading] = useState(false)
    const { t } = useTranslation();

    const fetchLedgerBalance = async (ledgerId) => {
        if (!ledgerId) {
            setLedgerBalance(null);
            return;
        }
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );
            // Store the complete response data including crordr flag
            setLedgerBalance(res.data?.data || null);
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            setLedgerBalance(null);
        }
    };

    useEffect(() => {
        fetchLedgerBalance(formData.ledgerId);
    }, [formData.ledgerId]);



    const fetchBankCash = async () => {
        setFetchBankCashLoading(true)
        try {
            const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [5, 8], branchId: selectedBranchId });
            setBankCash(res.data.data);
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setFetchBankCashLoading(false)

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
        <div className="bg-white dark:bg-[#1e1e1e] dark:border-gray-600 transition-colors">
            <div className='grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                <div className='space-y-2'>
                    <TextInput
                        label={t('paymentVoucher.form.label.PaymentNo')}
                        value={editMode ? existingPaymentNo : voucherNo}
                        onChange={() => { }}
                        required
                        className='w-full !text-red-600 dark:!text-red-400 font-bold cursor-not-allowed'
                        readOnly
                    />
                    <div className='w-full'>

                        <DateInput
                            label={t('paymentVoucher.form.label.date')}
                            name='date'
                            required
                            value={formData.date}
                            onChange={(value) => handleFormChange('date', value)}
                            className="w-full"
                            format={generalSettings.dateformat}
                            error={errors.date}
                            min={minDateFromFinance}
                            max={maxDate}
                        />
                    </div>
                    <div className='flex gap-1 items-end'>
                        <div className='flex-1 min-w-0'>
                            <SearchableDropdown
                                name="ledgerId"
                                label={t('paymentVoucher.form.label.bankOrCash')}
                                options={bankCash?.map((data) => ({
                                    value: data.ledgerId,
                                    label: data.ledgerName,
                                }))}
                                value={formData.ledgerId}
                                onChange={(value) => handleFormChange('ledgerId', value)}
                                placeholder={t('paymentVoucher.form.placeholders.bankOrCash')}
                                searchPlaceholder={t('paymentVoucher.form.placeholders.bankOrCash')}
                                clearable={true}
                                className='w-full'
                                required
                                error={errors.ledgerId}
                                loading={fetchBankCashLoading}
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
                </div>

                <div className='space-y-2'>
                    <TextInput
                        name='ReferenceNo'
                        label={t('paymentVoucher.form.label.ReferenceNo')}
                        value={formData.ReferenceNo}
                        onChange={(e) => handleFormChange('ReferenceNo', e)}
                        placeholder={t('paymentVoucher.form.placeholders.ReferenceNo')}
                        className='w-full'
                    />
                    <div className='w-full'>

                        <DateInput
                            label={t('paymentVoucher.form.label.ReferenceDate')}
                            name='ReferenceDate'
                            required
                            value={formData.ReferenceDate}
                            onChange={(value) => handleFormChange('ReferenceDate', value)}
                            className="w-full"
                            format={generalSettings.dateformat}
                            error={errors.date}
                        />
                    </div>

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
                    <div className="w-full">
                        <DocumentUpload
                            documents={documents}
                            setDocuments={setDocuments}
                            existingDocuments={existingDocuments}
                            setExistingDocuments={setExistingDocuments}
                            removedDocuments={removedDocuments}
                            setRemovedDocuments={setRemovedDocuments}
                        />
                    </div>
                </div>

            </div>

            <AddBankModal
                open={bankModalOpen}
                handleClose={() => setBankModalOpen(false)}
                onSuccess={fetchBankCash}
            />
        </div>
    )
}

export default PaymentVoucherFormHeader