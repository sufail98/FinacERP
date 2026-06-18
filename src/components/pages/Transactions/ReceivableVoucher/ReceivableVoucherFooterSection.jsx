import { useState, useMemo, useEffect } from "react";
import PaymentMode from "./FooterTabData/PaymentMode";
import OtherDetails from "./FooterTabData/OtherDetails";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const ReceivableVoucherFooterSection = ({ totals, formData, setFormData,banks,cash }) => {
  const { receivableVoucherId } = useParams();
  const isEditMode = Boolean(receivableVoucherId);
  const { generalSettings } = useSelector((state) => state.settings);
  const { t } = useTranslation()
  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState(0);
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState(0);
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [activeTab, setActiveTab] = useState("payment");
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

  // Simple calculation: Net Amount + Tax Amount = Grand Total
  const finalGrandTotal = useMemo(() => {
    const netAmount = parseFloat(totals?.totalNetAmount || 0);
    const taxAmount = parseFloat(totals?.totalTaxAmount || 0);
    const grandTotal = netAmount + taxAmount;
    return grandTotal.toFixed(generalSettings.decimalPart);
  }, [totals]);

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
      totalAmount: finalGrandTotal
    }));
  }, [finalGrandTotal]);

  const tabs = [
    { id: "payment", label: t("payableVoucher.form.footerSection.tabs.paymentMode") },
    { id: "other", label: t("payableVoucher.form.footerSection.tabs.otherDetails") },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "payment":
        return (
          <PaymentMode finalGrandTotal={finalGrandTotal} totals={totals} formData={formData} setFormData={setFormData}     banks={banks}
                cash={cash} />
        );

      case "other":
        return (
          <OtherDetails totals={totals} formData={formData} setFormData={setFormData} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2">
      {/* Left Side - Tabs (60% on desktop, full width on mobile) */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed">
          {/* Tab Headers */}
          <div className="flex flex-wrap lg:flex-nowrap border-b border-themed dark:border-themed overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? "main-bg text-white border-b-2 border-[#2b216a]"
                    : "bg-secondary dark:bg-secondary text-secondary dark:text-secondary hover:bg-hover dark:hover:bg-hover"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px] bg-primary dark:bg-primary">{renderTabContent()}</div>
        </div>
      </div>

      {/* Right Side - Payment Summary (40% on desktop, full width on mobile) */}
      <div className="lg:col-span-2 order-1 lg:order-2 rounded">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed text-xs">

          {/* Total Net Amount */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:min-w-0">
              {t("salesInvoice.form.footerSection.paymentSummery.totalAmt")}
            </label>
            <input
              type="number"
              value={totals?.totalNetAmount || 0}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-secondary dark:bg-secondary text-primary dark:text-primary focus:outline-none text-right"
              readOnly
            />
          </div>

          {/* Total Tax */}
          {(formData.taxType==="applicable to ledgers"&&generalSettings?.ActivateTax) && (
            <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
              <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:w-28">
                {t("salesInvoice.form.footerSection.paymentSummery.totalTax")}
              </label>
              <input
                type="number"
                value={totals?.totalTaxAmount || 0}
                className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-secondary dark:bg-secondary text-primary dark:text-primary focus:outline-none text-right"
                readOnly
              />
            </div>

          )}


          {/* Final Grand Total (Net Amount + Tax) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-secondary dark:bg-secondary rounded-b">
            <label className="px-2 py-1.5 text-sm font-bold text-primary dark:text-primary">
              {t("salesInvoice.form.footerSection.paymentSummery.grandTotal")}
            </label>
            <div className="px-2 py-1.5 text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 text-center sm:text-right">
              {finalGrandTotal}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivableVoucherFooterSection;