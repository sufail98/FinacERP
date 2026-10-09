import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import FooterDetails from "./FooterDetails";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";

const GodownTransferFooterSection = ({ totals, formData, setFormData }) => {
  const { transferMasterId } = useParams();
  const isEditMode = Boolean(transferMasterId);
  const { generalSettings } = useSelector((state) => state.settings);
  const { t } = useTranslation();

  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState(0);
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState(0);
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isEditMode && formData && !isInitialized) {
      const addCost = parseFloat(formData.additionalCost) || 0;
      setAdditionalCost(Math.abs(addCost));
      setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

      const rOff = parseFloat(formData.roundOff) || 0;
      setRoundOff(Math.abs(rOff));
      setRoundOffType(rOff >= 0 ? "+" : "-");

      setBillDiscount(parseFloat(formData.billDiscount) || 0);

      setOtherChargRemark(formData.OtherChargeRemark || '');
      setOtherChargAmt(formData.othercharge || '');

      setIsInitialized(true);
    }
  }, [isEditMode, formData, isInitialized]);

  const finalGrandTotal = useMemo(() => {
    let base = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);

    base += parseFloat(otherChargeAmt || 0);

    if (additionalCostType === "Cr") {
      base += parseFloat(additionalCost || 0);
    } else {
      base -= parseFloat(additionalCost || 0);
    }

    base -= parseFloat(billDiscount || 0);

    if (roundOffType === "+") {
      base += parseFloat(roundOff || 0);
    } else {
      base -= parseFloat(roundOff || 0);
    }

    return base.toFixed(generalSettings.decimalPart);
  }, [
    totals,
    additionalCost,
    additionalCostType,
    billDiscount,
    roundOff,
    roundOffType,
    otherChargeAmt,
  ]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
      billDiscount,
      roundOff: roundOffType === "+" ? roundOff : -roundOff,
      othercharge: otherChargeAmt,
      OtherChargeRemark: otherChargeRemark
    }));
  }, [additionalCost, additionalCostType, billDiscount, roundOff, roundOffType, otherChargeAmt, otherChargeRemark]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      grandTotal: finalGrandTotal
    }));
  }, [finalGrandTotal]);


  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2">
      {/* Left Side - Tabs (60% on desktop, full width on mobile) */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed">

          {/* Tab Content */}
          <div className=" bg-primary dark:bg-primary p-1 ">
            <TextArea
              name="narration"
              label={t("narration")}
              value={formData.narration}
              onChange={(e) => handleChange('narration', e.target.value)}
              placeholder={t("accountLedger.form.narrationPlaceholder")}
              rows={3}
            />
            <TextInput
              name="transportCompany"
              label={t("stockTransfer.form.label.transportCompany")}
              value={formData.transportCompany}
                                onChange={(e) => handleChange('transportCompany', e.target.value)}
              placeholder={t("stockTransfer.form.label.transportCompany")}
              rows={3}
            />
          </div>
        
        </div>
      </div>

      {/* Right Side - Payment Summary (40% on desktop, full width on mobile) */}
      <div className="lg:col-span-2 order-1 lg:order-2 rounded">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed text-xs">

          {/* Final Grand Total */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-secondary dark:bg-secondary rounded-b">
            <label className="px-2 py-1.5 text-sm font-bold text-primary dark:text-primary">
              {t("salesInvoice.form.footerSection.paymentSummery.grandTotal")}
            </label>
            <div className="px-2 py-1.5 text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 text-center sm:text-right">
              {formData.grandTotal}
              {/* {finalGrandTotal || formData.grandTotal} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GodownTransferFooterSection;