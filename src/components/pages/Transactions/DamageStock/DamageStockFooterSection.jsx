import TextArea from '@/components/elements/theme/TextArea';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const DamageStockFooterSection = ({ formData, setFormData }) => {
    const { t } = useTranslation();

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
 const {generalSettings}=useSelector((state)=>state.settings)
    return (
        <div className="grid grid-cols-12 gap-2 mt-2">
            {/* Narration Section */}
            <div className="col-span-9">
                <TextArea
                    label={t("damageStock.form.footerSection.label.narration")}
                    name="narration"
                    value={formData.narration || ''}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    placeholder={t("damageStock.form.footerSection.placeholders.narration")}
                    rows={2}
                    className="resize-none"
                />
            </div>

            {/* Total Amount Section */}
            <div className="col-span-3">
                <label className="block text-[11px] font-medium text-secondary dark:text-secondary mb-1">
                    {t("damageStock.form.footerSection.label.totalAmount")}
                </label>
                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded border-2 border-red-300 dark:border-red-700 p-2">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 text-right">
                        {parseFloat(formData.totalAmount || 0).toFixed(generalSettings.decimalPart)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DamageStockFooterSection;