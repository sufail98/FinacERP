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
            <div className='grid grid-cols-2 gap-1'>
                <TextInput
                    name="lrNo"
                    label={t('proformaInvoice.form.label.lrNo')}
                    type="number"
                    value={formData.lrNo}
                    onChange={(e) => handleChange('lrNo', e.target.value)}
                    //   error={errors.lrNo}
                    className="w-full"
                    placeholder={t('salesInvoice.form.placeholders.formHeaderSection.lrNo')}
                />
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
                <div className='col-span-3'>
                    <TextArea
                        label={t("salesInvoice.form.footerSection.otherDetails.label.narration")}
                        name="narration"
                        value={formData.narration || ''}
                        onChange={(e) => handleChange('narration', e.target.value)}
                        placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.narration")}
                    />
                </div>
            </div>
        </div>
    )
}

export default OtherDetails