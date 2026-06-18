import TextArea from '@/components/elements/theme/TextArea'
import React from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const ContraVoucherFormFooter = ({ formData, setFormData, handleFormChange, editMode }) => {
    const { t } = useTranslation();
    const {generalSettings}=useSelector((state)=>state.settings)

    return (
        <div>
            {/* ✅ Responsive: Stack on mobile, side-by-side on desktop */}
            <div className="flex flex-col md:flex-row md:justify-between gap-4 mt-3">
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

                {/* ✅ Responsive total amount */}
                <div className='text-center md:text-end'>
                    <div className='flex justify-center md:justify-end gap-2 sm:gap-3 mt-3'>
                        <p className='font-bold text-xl sm:text-2xl lg:text-3xl'>
                            {t("contraVoucher.form.label.totalAmount")} : 
                        </p>
                        <p className='font-bold text-xl sm:text-2xl lg:text-3xl text-red-600'>
                            {formData.totalAmount.toFixed(generalSettings.decimalPart)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ContraVoucherFormFooter