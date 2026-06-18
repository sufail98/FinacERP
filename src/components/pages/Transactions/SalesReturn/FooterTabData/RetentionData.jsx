import TextInput from '@/components/elements/theme/TextInput'

import  { useState } from 'react'
import { useSelector } from 'react-redux'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import { useTranslation } from 'react-i18next'
import DateInput from '@/components/elements/theme/DateInput'

const RetentionData = ({ totals, formData, setFormData }) => {
    const { t } = useTranslation()
    const [errors, setErrors] = useState({});
    const { generalSettings } = useSelector((state) => state.settings);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className='p-1 bg-primary dark:bg-primary'>
            <div className='grid grid-cols-1 gap-1 w-1/3'>
                <NormalSelectInput
                    label={t("salesInvoice.form.footerSection.retentionSection.label.RetentionType")}
                    placeholder='Enter Retention Type'
                    name="RetentionType"
                    value={formData.RetentionType || ''}
                    onChange={(e) => handleChange('RetentionType', e.target.value)}
                    options={[
                        { value: "Included", label: 'Included' },
                        { value: "Exluded", label: 'Excluded' },
                    ]}
                />
                <TextInput
                    name="retention%"
                    label={t("salesInvoice.form.footerSection.retentionSection.label.retention%")}
                    value={formData.RetentionPercentage || ''}
                    onChange={(e) => handleChange('RetentionPercentage', parseFloat(e.target.value))}
                    placeholder={t("salesInvoice.form.footerSection.retentionSection.placeholders.retention%")}
                />
                <TextInput
                    name="RetentionAmount"
                    label={t("salesInvoice.form.footerSection.retentionSection.label.RetentionAmount")}
                    value={formData.RetentionAmount}
                    onChange={(e) => handleChange('RetentionAmount', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.retentionSection.placeholders.RetentionAmount")}
                    type='number'
                />
                <div className=''>
                   
                    <DateInput
                        label={t("salesInvoice.form.footerSection.retentionSection.label.RetentionDueDate")}
                        format={generalSettings.dateformat}
                        value={formData.RetentionDueDate ? new Date(formData.RetentionDueDate) : null}
                        onChange={(value) => handleChange('RetentionDueDate', value)}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    )
}

export default RetentionData