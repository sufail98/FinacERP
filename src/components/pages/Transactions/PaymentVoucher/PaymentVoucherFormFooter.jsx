import TextArea from '@/components/elements/theme/TextArea'
import React from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const PaymentVoucherFormFooter = ({ formData, setFormData, handleFormChange, editMode }) => {
    const { t } = useTranslation();
     const {generalSettings}=useSelector((state)=>state.settings)

    return (
<div className="bg-white dark:bg-[#1e1e1e] p-3 rounded-md border border-gray-300 dark:border-gray-600 mt-3 transition-colors">
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                <div className='w-full md:w-[300px]'>
                    <TextArea
                        name="narration"
                        label={t("narration")}
                        value={formData.narration}
                        onChange={(e) => handleFormChange('narration', e)}
                        placeholder={t("accountLedger.form.narrationPlaceholder")}
                        rows={3}
                    />
                </div>

                <div className='text-center md:text-end'>
                    <div className='flex justify-center md:justify-end gap-2 sm:gap-3 mt-3'>
                        <p className='font-bold text-xl sm:text-2xl lg:text-3xl text-gray-700 dark:text-gray-300'>
                            {t("paymentVoucher.form.label.totalAmount")} : 
                        </p>
                        <p className='font-bold text-xl sm:text-2xl lg:text-3xl text-red-600 dark:text-red-400'>
                            {formData.totalAmount.toFixed(generalSettings.decimalPart)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentVoucherFormFooter