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
        <div className="grid grid-cols-3 gap-1 p-1">
          <TextInput
            name="transportCompany"
            label={t("proformaInvoice.form.label.transportCompany")}
            value={formData.transportCompany}
            onChange={(e) => handleChange("transportCompany", e.target.value)}
            placeholder={t("proformaInvoice.form.label.transportCompany")}
          />
          <TextInput
            name="deliveryLocation"
            label={t("deliveryNote.form.label.deliveryLocation")}
            value={formData.deliveryLocation}
            onChange={(e) => handleChange("deliveryLocation", e.target.value)}
            placeholder={t("deliveryNote.form.label.deliveryLocation")}
          />
          <TextInput
            name="driverName"
            label={t("deliveryNote.form.label.driverName")}
            value={formData.driverName}
            onChange={(e) => handleChange("driverName", e.target.value)}
            placeholder={t("deliveryNote.form.label.driverName")}
          />
          <TextInput
            name="deliveryVehicleNo"
            label={t("deliveryNote.form.label.deliveryVehicleNo")}
            value={formData.deliveryVehicleNo}
            onChange={(e) => handleChange("deliveryVehicleNo", e.target.value)}
            placeholder={t("deliveryNote.form.label.deliveryVehicleNo")}
          />
          <TextInput
            name="contactNo"
            maxLength={10}
            label={t("deliveryNote.form.label.contactNo")}
            value={formData.contactNo}
            onChange={(e) => handleChange("contactNo", e.target.value)}
            placeholder={t("deliveryNote.form.label.contactNo")}
          />
          <TextArea
            label={t("currencyForm.form.narration")}
            id="narration"
            name="narration"
            placeholder={t("currencyForm.form.narrationPlaceholder")}
            value={formData.narration}
            onChange={(e) => handleChange("narration", e.target.value)}
            className="border-gray-500"
          />
          {/* ✅ REMOVED: Checkbox moved to BreadCrumb customActions in DeliveryNoteSkin */}
        </div>
      </div>
    );
}

export default FooterDetails