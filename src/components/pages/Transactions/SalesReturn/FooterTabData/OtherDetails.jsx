import TextArea from '@/components/elements/theme/TextArea'
import TextInput from '@/components/elements/theme/TextInput'
import React from 'react'
import { useTranslation } from 'react-i18next'

const OtherDetails = ({ totals, formData, setFormData }) => {
    const { t } = useTranslation()
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    return (
        <div className='p-1 bg-primary dark:bg-primary'>
            <div className='grid grid-cols-4 gap-1'>
                <TextInput
                    label={t("salesInvoice.form.footerSection.otherDetails.label.transportCompany")}
                    name="transportCompany"
                    value={formData.transportCompany}
                    onChange={(e) => handleChange('transportCompany', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.transportCompany")}
                />
                <TextInput
                    label={t("salesInvoice.form.footerSection.otherDetails.label.lrNo")}
                    name="lrNo"
                    value={formData.lrNo}
                    onChange={(e) => handleChange('lrNo', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.lrNo")}
                />
                <TextArea
                    label={t("salesInvoice.form.footerSection.otherDetails.label.narration")}
                    name="narration"
                    value={formData.narration || ''}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.narration")}
                />
                <TextArea
                    label={t("salesInvoice.form.footerSection.otherDetails.label.reason")}
                    name="reason"
                    value={formData.reason || ''}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.reason")}
                />
            </div>
        </div>
    )
}

export default OtherDetails