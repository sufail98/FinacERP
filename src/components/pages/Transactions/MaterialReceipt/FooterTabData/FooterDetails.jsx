import TextArea from '@/components/elements/theme/TextArea';
import TextInput from '@/components/elements/theme/TextInput';
import React from 'react'
import { useTranslation } from 'react-i18next';

const FooterDetails = ({ formData, setFormData }) => {
    const { t } = useTranslation()
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    return (
        <div className="bg-primary dark:bg-primary">
            <div className='grid grid-cols-3 gap-1 p-1'>
                <TextInput
                    name="transportCompany"
                    label={t("proformaInvoice.form.label.transportCompany")}
                    value={formData.transportCompany}
                    onChange={(e) => handleChange('transportCompany', e.target.value)}
                    placeholder={t("proformaInvoice.form.label.transportCompany")}
                />
              
                <TextArea
                    label={t("currencyForm.form.narration")}
                    id="narration"
                    name="narration"
                    placeholder={t("currencyForm.form.narrationPlaceholder")}
                    value={formData.narration}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    className="border-gray-500"
                />
            </div>
        </div>
    )
}

export default FooterDetails