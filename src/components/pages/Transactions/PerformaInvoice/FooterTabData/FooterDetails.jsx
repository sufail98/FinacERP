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
          <div>
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
                name="transportCompany"
                label={t("proformaInvoice.form.label.transportCompany")}
                value={formData.transportCompany}
                onChange={(e) => handleChange('transportCompany', e.target.value)}
                placeholder={t("proformaInvoice.form.label.transportCompany")}
            />
          </div>
                 <TextArea
                name="DeliveryTerms"
                label={t("proformaInvoice.form.label.DeliveryTerms")}
                value={formData.DeliveryTerms}
                onChange={(e) => handleChange('DeliveryTerms', e.target.value)}
                placeholder={t("proformaInvoice.form.placeholders.DeliveryTerms")}
            />
            <TextArea
                name="PaymentTerms"
                label={t("proformaInvoice.form.label.PaymentTerms")}
                value={formData.PaymentTerms}
                onChange={(e) => handleChange('PaymentTerms', e.target.value)}
                placeholder={t("proformaInvoice.form.placeholders.PaymentTerms")}
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
            {/* ✅ REMOVED: Checkbox moved to BreadCrumb customActions in PerformaInvoiceSkin */}
        </div>
    )
}

export default FooterDetails