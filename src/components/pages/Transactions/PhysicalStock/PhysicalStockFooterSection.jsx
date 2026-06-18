import TextArea from '@/components/elements/theme/TextArea';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

const PhysicalStockFooterSection = ({ formData, setFormData }) => {
    const { t } = useTranslation();
     const {generalSettings}=useSelector((state)=>state.settings)
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="grid grid-cols-12 gap-2 mt-2">
            {/* Narration Section */}
            <div className="col-span-9">
                <TextArea
                    label={t("physicalStock.form.footerSection.label.narration")}
                    name="narration"
                    value={formData.narration || ''}
                    onChange={(e) => handleChange('narration', e.target.value)}
                    placeholder={t("physicalStock.form.footerSection.placeholders.narration")}
                    rows={2}
                    className="resize-none"
                />
            </div>

           
        </div>
    );
};

export default PhysicalStockFooterSection;