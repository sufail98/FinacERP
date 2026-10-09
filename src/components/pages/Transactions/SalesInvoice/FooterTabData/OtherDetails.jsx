import TextArea from '@/components/elements/theme/TextArea'
import TextInput from '@/components/elements/theme/TextInput'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from "@/components/ui/checkbox"
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'

const OtherDetails = ({ totals, formData, setFormData, editMode = false }) => {
    const { t } = useTranslation()
    const [printType, setPrintType] = useState('a4')
    const isEditMode = Boolean(editMode)

    const handleChange = (field, value) => {
        if (isEditMode) return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleDropdownChange = (name, value) => {
        if (isEditMode) return;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    return (
        <div className='p-1 bg-primary dark:bg-primary'>
            <div className='grid grid-cols-3 gap-1'>

                <TextInput
                    label={t("salesInvoice.form.footerSection.otherDetails.label.transportCompany")}
                    name="transportCompany"
                    value={formData.transportCompany}
                    onChange={(e) => handleChange('transportCompany', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.transportCompany")}
                    readOnly={isEditMode}
                    disabled={isEditMode}
                />

                <TextInput
                    label={t("salesInvoice.form.footerSection.otherDetails.label.lrNo")}
                    name="lrNo"
                    value={formData.lrNo}
                    onChange={(e) => handleChange('lrNo', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.lrNo")}
                    readOnly={isEditMode}
                    disabled={isEditMode}
                />

                {/* <div className='col-span-3'> */}
                    <TextArea
                        label={t("salesInvoice.form.footerSection.otherDetails.label.narration")}
                        name="narration"
                        value={formData.narration || ''}
                        onChange={(e) => handleChange('narration', e.target.value)}
                        placeholder={t("salesInvoice.form.footerSection.otherDetails.label.narration")}
                        rows={2}
                        readOnly={isEditMode}
                        disabled={isEditMode}
                    />
                {/* </div> */}

            

            </div>
        </div>
    )
}

export default OtherDetails
