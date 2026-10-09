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
import DocumentUpload from '../../../common/DocumentUpload'
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal';


const JournalVoucherFormHeader = ({ voucherNo, errors, formData, setFormData, editMode, handleFormChange, existingJournalNo, costCenters: costCentres, documents, setDocuments, existingDocuments, setExistingDocuments,
    removedDocuments, setRemovedDocuments, currency = [], currencyConvertionData = [], financeSettings: financeSettingsProp }) => {
    const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
    const { generalSettings, financeSettings: financeSettingsFromStore } = useSelector((state) => state.settings);
    const effectiveFinanceSettings = financeSettingsProp ?? financeSettingsFromStore;
    const { currentFinancialYear, currentCurrency } = useAuth();

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
                    name='referenceNo'
                    label={t('journalVoucher.form.label.ReferenceNo')}
                    value={formData.referenceNo}
                    onChange={(e) => handleFormChange('referenceNo', e)}
                    placeholder={t('journalVoucher.form.placeholders.ReferenceNo')}
                    className='w-full'
                />

                <div className='w-full'>

                    <DateInput
                        label={t('journalVoucher.form.label.ReferenceDate')}
                        name='referenceDate'
                        required
                        value={formData.referenceDate}
                        onChange={(value) => handleFormChange('referenceDate', value)}
                        className="w-full"
                        format={generalSettings.dateformat}
                        error={errors.referenceDate}
                    />
                </div>
                {generalSettings?.costCentre && (
                    <div>
                        <SearchableDropdown
                            name="costCentreId"
                            value={formData.costCentreId || ""}
                            onChange={(value) => handleFormChange('costCentreId', value)}
                            label={t('journalVoucher.form.placeholders.costCentre')}
                            placeholder={t('journalVoucher.form.placeholders.costCentre')}
                            searchPlaceholder={t('journalVoucher.form.placeholders.costCentre')}
                            clearable={true}
                            className="w-full mb-1"
                            options={costCentres?.map((data) => ({
                                value: data.costCentreId,
                                label: data.CostCentre || "",
                            }))}
                        />
                        <DocumentUpload
                            documents={documents}
                            setDocuments={setDocuments}
                            existingDocuments={existingDocuments}
                            setExistingDocuments={setExistingDocuments}
                            removedDocuments={removedDocuments}
                            setRemovedDocuments={setRemovedDocuments}
                        />
                    </div>
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
             {/* Currency Link */}
            {effectiveFinanceSettings?.multiCurrency && (
                <div className='flex flex-wrap gap-2 text-xs mt-2'>
                    <p
                        className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
                        onClick={() => setCurrencyModalOpen(true)}
                    >
                        Currency: {formData?.currencyName || currentCurrency?.currencyName || 'Select Currency'}
                    </p>
                </div>
            )}

            {effectiveFinanceSettings?.multiCurrency && (
                <SelecteCurrecyModal
                    open={currencyModalOpen}
                    handleClose={() => setCurrencyModalOpen(false)}
                    formData={formData}
                    currency={currency}
                    handleChange={(field, value) => handleFormChange(field, value)}
                    currencyConvertionData={currencyConvertionData}
                />
            )}
        </div>
    )
}

export default JournalVoucherFormHeader