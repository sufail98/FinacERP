import TextArea from '@/components/elements/theme/TextArea'
import TextInput from '@/components/elements/theme/TextInput';
import React from 'react'
import { useTranslation } from 'react-i18next';

const FooterDetails = ({ formData, setFormData }) => {
  const { t } = useTranslation()
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  return (
    <div className='p-2 grid gap-2 grid-cols-4 bg-primary dark:bg-primary'>
      <TextInput
        name="lrNo"
        label={t("proformaInvoice.form.label.lrNo")}
        value={formData.lrNo}
        onChange={(e) => handleChange('lrNo', e.target.value)}
        placeholder={t("proformaInvoice.form.label.lrNo")}
      />
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
  )
}

export default FooterDetails