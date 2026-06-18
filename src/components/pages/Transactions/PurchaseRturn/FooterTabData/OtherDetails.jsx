import TextArea from '@/components/elements/theme/TextArea'
import TextInput from '@/components/elements/theme/TextInput'
import { useTranslation } from 'react-i18next'

const OtherDetails = ({ formData, setFormData }) => {
    const { t } = useTranslation()
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    return (
        <div className='p-1 bg-primary dark:bg-primary'>
            <div className='grid grid-cols-2 gap-1'>
                <TextInput
                    label={t("salesInvoice.form.footerSection.otherDetails.label.transportCompany")}
                    name="transportCompany"
                    value={formData.transportCompany}
                    onChange={(e) => handleChange('transportCompany', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.transportCompany")}
                />
               
                <TextArea
                    label={t("salesInvoice.form.footerSection.otherDetails.label.narration")}
                    name="narration"
                    value={formData.narration || ''}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.otherDetails.placeholders.narration")}
                />
              
            </div>
        </div>
    )
}

export default OtherDetails