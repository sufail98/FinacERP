import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextArea from '@/components/elements/theme/TextArea';
import TextInput from '@/components/elements/theme/TextInput';
import { Label } from '@/components/ui/label';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const JournalVoucherFormHeader = ({ voucherNo, errors, formData, setFormData, editMode, handleFormChange, existingJournalNo, costCenters: costCentres }) => {

    const { generalSettings } = useSelector((state) => state.settings);
    const { currentFinancialYear } = useAuth();

    const { t } = useTranslation();


    return (
        <div>
            <div className='grid gap-2 grid-cols-3'>
                {/* First Column */}
                <TextInput
                    label={t('journalVoucher.form.label.JournalNo')}
                    // value={voucherNo || existingJournalNo}
                    value={editMode ? existingJournalNo : voucherNo}
                    onChange={() => { }} // Dummy handler for disabled field
                    required
                    className='w-full text-red-600 font-bold'
                    disabled
                />

                <div className='w-full'>

                    <DateInput
                        label={t('journalVoucher.form.label.date')}
                        name='date'
                        required
                        value={formData.date}
                        onChange={(value) => handleFormChange('date', value)}
                        className="w-full"
                        format={generalSettings.dateformat}
                        error={errors.date}
                        min={currentFinancialYear?.fromDate}
                        max={currentFinancialYear?.toDate}
                    />
                </div>

                {/* Second Column */}
                <TextInput
                    name='ReferenceNo'
                    label={t('journalVoucher.form.label.ReferenceNo')}
                    value={formData.ReferenceNo}
                    onChange={(e) => handleFormChange('ReferenceNo', e)}
                    placeholder={t('journalVoucher.form.placeholders.ReferenceNo')}
                    className='w-full'
                />

                <div className='w-full'>

                    <DateInput
                        label={t('journalVoucher.form.label.ReferenceDate')}
                        name='date'
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
                        value={formData.costCentreId || ""}
                        onChange={(value) => handleFormChange('costCentreId', value)}
                        label={t('journalVoucher.form.placeholders.costCentre')}
                        placeholder={t('journalVoucher.form.placeholders.costCentre')}
                        searchPlaceholder={t('journalVoucher.form.placeholders.costCentre')}
                        clearable={true}
                        className="w-full"
                        options={costCentres?.map((data) => ({
                            value: data.costCentreId,
                            label: data.CostCentre || "",
                        }))}
                    />
                )}

                <TextArea
                    name="narration"
                    label={t("narration")}
                    value={formData.narration}
                    onChange={(e) => handleFormChange('narration', e)}
                    placeholder={t("accountLedger.form.narrationPlaceholder")}
                    rows={3}
                />

            </div>

            {/* Show error message if debit/credit don't match */}
            {formData.debitTotal !== formData.creditTotal && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600 font-medium">
                        ⚠️ {t('journalVoucher.form.messages.debitCreditMismatch')}
                    </p>
                </div>
            )}
        </div>
    )
}

export default JournalVoucherFormHeader