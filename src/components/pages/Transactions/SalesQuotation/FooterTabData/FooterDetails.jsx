import TextArea from '@/components/elements/theme/TextArea';
import TextInput from '@/components/elements/theme/TextInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import React from 'react'
import { useTranslation } from 'react-i18next';

const FooterDetails = ({ formData, setFormData }) => {
    const { t } = useTranslation()
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    return (
        <div className='p-1 bg-primary dark:bg-primary'>
            <div className='grid grid-cols-4 gap-1'>
              
                <TextInput
                    name="quatationvalidity"
                    label={t("salesQuotation.form.footerSection.label.quatationvalidity")}
                    value={formData.quatationvalidity}
                    onChange={(e) => handleChange('quatationvalidity', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.quatationvalidity")}
                />
                 <TextInput
                    name="Certificate"
                    label={t("salesQuotation.form.footerSection.label.Certificate")}
                    value={formData.Certificate}
                    onChange={(e) => handleChange('Certificate', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.Certificate")}
                />
             
                <TextInput
                    name="deliveredwithin"
                    label={t("salesQuotation.form.footerSection.label.deliveredwithin")}
                    value={formData.deliveredwithin}
                    onChange={(e) => handleChange('deliveredwithin', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.deliveredwithin")}
                />
                <TextInput
                    name="deliverysite"
                    label={t("salesQuotation.form.footerSection.label.deliverysite")}
                    value={formData.deliverysite}
                    onChange={(e) => handleChange('deliverysite', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.deliverysite")}
                />
                   <TextArea
                    name="DeliveryTerms"
                    label={t("salesQuotation.form.footerSection.label.DeliveryTerms")}
                    value={formData.DeliveryTerms}
                    onChange={(e) => handleChange('DeliveryTerms', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.DeliveryTerms")}
                />
                <TextArea
                    name="paymentterms"
                    label={t("salesQuotation.form.footerSection.label.paymentterms")}
                    value={formData.paymentterms}
                    onChange={(e) => handleChange('paymentterms', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.paymentterms")}
                />
                <TextArea
                    name="IncoTerms"
                    label={t("salesQuotation.form.footerSection.label.IncoTerms")}
                    value={formData.IncoTerms}
                    onChange={(e) => handleChange('IncoTerms', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.IncoTerms")}
                />
               
                <TextArea
                    name="narrtaion"
                    label={t("salesQuotation.form.footerSection.label.narrtaion")}
                    value={formData.narration}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    placeholder={t("salesQuotation.form.footerSection.placeholders.narrtaion")}
                />
            

                {/* Print Type Dropdown - stays here */}
                {/* <div className="flex items-center gap-2">
                    <label htmlFor="printType" className="text-sm font-medium leading-none whitespace-nowrap">
                        {t('salesInvoice.form.footerSection.otherDetails.label.printType') || 'Print Type'}
                    </label>
                    <select
                        name="printType"
                        id="printType"
                        className='border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none'
                        value={formData.printType || 'type1'}
                        onChange={(e) => {
                            handleChange('printType', e.target.value);
                            localStorage.setItem('salesQuotationPrintType', e.target.value);
                        }}
                    >
                        <option value="type1">Type 1</option>
                        <option value="type2">Type 2</option>
                    </select>
                </div> */}
            </div>
        </div>
    )
}

export default FooterDetails