import TextArea from '@/components/elements/theme/TextArea'
import React from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const JournalVoucherFormFooter = ({ formData, setFormData, handleFormChange, editMode }) => {
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings)

    return (
        <div>
            <div className="flex justify-between mt-3">
                <div className='w-[300px]'>
                    <TextArea
                        name="narration"
                        label={t("narration")}
                        value={formData.narration}
                        onChange={(e) => handleFormChange('narration', e)}
                        placeholder={t("accountLedger.form.narrationPlaceholder")}
                        rows={3}
                    />
                </div>

                <div className="bg-gray-100 dark:bg-[#1a1a1a] 
                              border border-gray-200 dark:border-gray-700
                              rounded-lg p-4 mt-4 transition-colors">
                    <div className="flex justify-end gap-6">
                        <div className="text-right">
                            <div className="text-xl text-gray-600 dark:text-gray-400 mb-1">
                                {t("journalVoucher.form.label.debitTotal")}
                            </div>
                            <div className="font-semibold text-4xl text-green-600 dark:text-green-400">
                                {formData.debitTotal?.toFixed(generalSettings.decimalPart) || '0.00'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl text-gray-600 dark:text-gray-400 mb-1">
                                {t("journalVoucher.form.label.creditTotal")}
                            </div>
                            <div className="font-semibold text-4xl text-blue-600 dark:text-blue-400">
                                {formData.creditTotal?.toFixed(generalSettings.decimalPart) || '0.00'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default JournalVoucherFormFooter