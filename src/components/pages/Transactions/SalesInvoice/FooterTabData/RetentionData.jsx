import TextInput from '@/components/elements/theme/TextInput'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import { useTranslation } from 'react-i18next'
import DateInput from '@/components/elements/theme/DateInput'

const RetentionData = ({ totals, formData, setFormData, editMode = false }) => {
    const { t } = useTranslation()
    const [errors, setErrors] = useState({});
    const { generalSettings } = useSelector((state) => state.settings);
    const isEditMode = Boolean(editMode);

    const handleChange = (field, value) => {
        if (isEditMode) return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };  
    const handleInputChange = (e) => {
    if (isEditMode) return;
    const { name, value } = e.target;
  
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

    // ✅ Helper function to select all text on focus
    const handleSelectAll = (e) => {
        e.target.select();
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
                    readOnly={isEditMode}
                    disabled={isEditMode}
                    options={[
                        { value: "Included", label: 'Included' },
                        { value: "Exluded", label: 'Excluded' },
                    ]}
                />
                {/* ✅ Added onFocus for select all */}
                <TextInput
                    name="retention%"
                    label={t("salesInvoice.form.footerSection.retentionSection.label.retention%")}
                    value={formData.RetentionPercentage || ''}
                    onChange={(e) => handleChange('RetentionPercentage', parseFloat(e.target.value))}
                    placeholder={t("salesInvoice.form.footerSection.retentionSection.placeholders.retention%")}
                    onFocus={(e) => {
                        if (isEditMode) return;
                        handleSelectAll(e);
                    }}
                    readOnly={isEditMode}
                    disabled={isEditMode}
                />
                {/* ✅ Added onFocus for select all */}
                <TextInput
                    name="RetentionAmount"
                    label={t("salesInvoice.form.footerSection.retentionSection.label.RetentionAmount")}
                    value={formData.RetentionAmount}
                    onChange={(e) => handleChange('RetentionAmount', e.target.value)}
                    placeholder={t("salesInvoice.form.footerSection.retentionSection.placeholders.RetentionAmount")}
                    onKeyDown = {(e) => {
                        if(e.key === "-" || e.key === "+") e.preventDefault()
                    }}
                    type='number'
                    onFocus={(e) => {
                        if (isEditMode) return;
                        handleSelectAll(e);
                    }}
                    readOnly={isEditMode}
                    disabled={isEditMode}
                />
                <div className=''>
                    <DateInput
                        label={t("salesInvoice.form.footerSection.retentionSection.label.RetentionDueDate")}
                        format={generalSettings.dateformat}
                        value={formData.RetentionDueDate ? new Date(formData.RetentionDueDate) : null}
                        onChange={handleInputChange}
                        className="w-full"
                        name="RetentionDueDate"
                        readOnly={isEditMode}
                        disabled={isEditMode}
                    />
                </div>
            </div>
        </div>
    )
}

export default RetentionData