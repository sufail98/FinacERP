import NormalSelectInput from '@/components/elements/theme/NormalSelectInput';
import TextArea from '@/components/elements/theme/TextArea'
import React from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const RecieptVoucherFormFooter = ({ formData, setFormData, handleFormChange, editMode }) => {
    const { t } = useTranslation();
     const {generalSettings}=useSelector((state)=>state.settings)
    
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

                <div className='text-end'>

                    <div className='flex gap-3 mt-3'>
                        <p className='font-bold text-3xl'>{t("recieptVoucher.form.label.totalAmount")} : </p>
                        <p className='font-bold text-3xl text-red-600'>{formData.totalAmount.toFixed(generalSettings.decimalPart)}</p>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default RecieptVoucherFormFooter