import { useState, useMemo, useEffect } from "react";
import PaymentMode from "./FooterTabData/PaymentMode";
import RetentionData from "./FooterTabData/RetentionData";
import AdditionalCost from "./FooterTabData/AdditionalCost";
import OtherDetails from "./FooterTabData/OtherDetails";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelector } from "react-redux";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";

const PurchaseQuotationFooterSection = ({ totals, formData, setFormData, otherChargeLedgers, bank, cash }) => {
  const { purchaseQuotationmasterId } = useParams();
  const isEditMode = Boolean(purchaseQuotationmasterId);
  const { t } = useTranslation()
  const { generalSettings } = useSelector((state) => state.settings)
  const dp = generalSettings.decimalPart;
  const [additionalCost, setAdditionalCost] = useState((0).toFixed(dp));
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState((0).toFixed(dp));
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState((0).toFixed(dp));
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [activeTab, setActiveTab] = useState("payment");
  const [isInitialized, setIsInitialized] = useState(false);
  // Other Charge Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  // Handle ledger selection from modal
  const handleLedgerSelect = (ledger) => {
    setSelectedLedger(ledger);
    setFormData(prev => ({
      ...prev,
      otherChargeLedgerId: ledger.ledgerId,
      otherChargeLedgerName: ledger.ledgerName
    }));
  };


  // ✅ Helper function to select all text on focus
  const handleSelectAll = (e) => {
    e.target.select();
  };

  useEffect(() => {
    if (isEditMode && formData && !isInitialized) {
      const addCost = parseFloat(formData.additionalCost) || 0;
      setAdditionalCost(Math.abs(addCost));
      setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

      const rOff = parseFloat(formData.roundoff) || 0;
      setRoundOff(Math.abs(rOff));
      setRoundOffType(rOff >= 0 ? "+" : "-");

      setBillDiscount(parseFloat(formData.billDiscount) || 0);

      setOtherChargRemark(formData.OtherChargeRemark || '');
      setOtherChargAmt(formData.othercharge || '');

      setIsInitialized(true);
    }
  }, [isEditMode, formData, isInitialized]);

  const distributeBillDiscount = (discount, quotationDetails) => {
    if (!quotationDetails || quotationDetails.length === 0) return quotationDetails;

    const validRows = quotationDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return quotationDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || discount === 0) {
      return quotationDetails.map(d => ({ ...d, billDiscOnProduct: 0 }));
    }

    const discountPercentage = (discount * 100) / totalNetAmount;

    return quotationDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const discountForRow = (netValue * discountPercentage) / 100;
        return {
          ...detail,
          billDiscOnProduct: parseFloat(discountForRow.toFixed(dp))
        };
      }
      return { ...detail, billDiscOnProduct: 0 };
    });
  };

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
    if (formData.quotationDetails && formData.quotationDetails.length > 0) {
      const updatedQuotationDetails = distributeBillDiscount(billDiscount, formData.quotationDetails);
      setFormData(prev => ({
        ...prev,
        additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
        billDiscount,
        roundoff: roundOffType === "+" ? roundOff : -roundOff,
        othercharge: otherChargeAmt,
        OtherChargeRemark: otherChargeRemark,
        quotationDetails: updatedQuotationDetails,
        totalAmount: finalGrandTotal,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
        billDiscount,
        roundoff: roundOffType === "+" ? roundOff : -roundOff,
        othercharge: otherChargeAmt,
        OtherChargeRemark: otherChargeRemark,
        totalAmount: finalGrandTotal,
      }));
    }
  }, [additionalCost, additionalCostType, billDiscount, roundOff, roundOffType, otherChargeAmt, otherChargeRemark, finalGrandTotal]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalAmount: finalGrandTotal
    }));
  }, [finalGrandTotal]);

  const tabs = [
    { id: "payment", label: t("salesInvoice.form.footerSection.tabs.paymentMode") },
    { id: "other", label: t("salesInvoice.form.footerSection.tabs.otherDetails") },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "payment":
        return (
          <PaymentMode finalGrandTotal={finalGrandTotal} totals={totals} formData={formData} setFormData={setFormData} bank={bank} cash={cash} />
        );
      case "retention":
        return (
          <RetentionData totals={totals} formData={formData} setFormData={setFormData} />
        );
      case "addCost":
        return (
          <AdditionalCost totals={totals} formData={formData} setFormData={setFormData} />
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
          {/* <div className="flex flex-wrap lg:flex-nowrap border-b border-themed dark:border-themed overflow-x-auto">
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
          </div> */}

          {/* Tab Content */}
          {/* <div className="bg-primary dark:bg-primary">{renderTabContent()}</div> */}
          <div className="bg-primary dark:bg-primary"> <OtherDetails totals={totals} formData={formData} setFormData={setFormData} /></div>
          <div className="grid grid-cols-4 mb-3 pl-2">
            {/* ✅ New Checkbox */}
            {isEditMode && (
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="cancelled"
                  checked={formData.cancelled || false}
                  onCheckedChange={(value) => handleChange("cancelled", value)}
                />
                <label
                  htmlFor="cancelled"
                  className="text-sm font-medium leading-none"
                >
                  {t("purchaseQuotation.form.label.cancelled")}
                </label>
              </div>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="printAfterSave"
                checked={formData.printAfterSave || false}
                onCheckedChange={(value) => handleChange("printAfterSave", value)}
              />
              <label
                htmlFor="printAfterSave"
                className="text-sm font-medium leading-none"
              >
                {t("salesInvoice.form.footerSection.otherDetails.label.printAfterSave")}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Payment Summary (40% on desktop, full width on mobile) */}
      <div className="lg:col-span-2 order-1 lg:order-2 rounded">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed text-xs">

          {/* Total Amount */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:min-w-0">
              {t("salesInvoice.form.footerSection.paymentSummery.totalAmt")}
            </label>
            <input
              type="number"
              value={totals?.grandTotal}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-secondary dark:bg-secondary text-primary dark:text-primary focus:outline-none text-right"
              readOnly
            />
          </div>

          {/* ✅ Additional Cost */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:min-w-0">
              {t("salesInvoice.form.footerSection.paymentSummery.additionalCost")}
            </label>
            <div className="flex flex-1">
              <select
                value={additionalCostType}
                onChange={(e) => setAdditionalCostType(e.target.value)}
                className="px-1 py-1 border-r border-themed dark:border-themed bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none"
              >
                <option value="Cr">Cr</option>
                <option value="Dr">Dr</option>
              </select>
              <input
                type="number"
                value={additionalCost}
                onChange={(e) => setAdditionalCost(parseFloat(e.target.value) || 0)}
                onFocus={handleSelectAll}
                onBlur={(e) => setAdditionalCost(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
                className="flex-1 px-2 py-1 bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none text-right"
              />
            </div>
          </div>

          {/* ✅ Bill Discount */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:w-28">
              {t("salesInvoice.form.footerSection.paymentSummery.billDescount")}
            </label>
            <input
              type="number"
              value={billDiscount}
              onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
              onFocus={handleSelectAll}
              onBlur={(e) => setBillDiscount(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none text-right"
            />
          </div>

          {/* Total Tax */}
          {generalSettings.ActivateTax && (
            <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
              <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:w-28">
                {t("salesInvoice.form.footerSection.paymentSummery.totalTax")}
              </label>
              <input
                type="number"
                value={totals?.totalTax}
                className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-secondary dark:bg-secondary text-primary dark:text-primary focus:outline-none text-right"
                readOnly
              />
            </div>
          )}

          {/* ✅ Other Charge */}
          <div className="flex flex-col border-b border-themed dark:border-themed">
            <div className="flex flex-col sm:flex-row sm:items-center">
              {/* Clickable ledger name label */}
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(true)}
                className="px-2 py-1 font-medium text-left sm:min-w-[100px] lg:w-38 text-blue-800 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                {selectedLedger?.ledgerName || t("salesInvoice.form.footerSection.paymentSummery.otherCharge")}
              </button>
              <div className="flex flex-col sm:flex-row flex-1 gap-1 sm:gap-0">
                <input
                  type="text"
                  value={otherChargeRemark}
                  className="px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none sm:w-30 lg:w-30"
                  placeholder={t("salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder")}
                  onChange={(e) => setOtherChargRemark(e.target.value)}
                  onFocus={handleSelectAll}
                />
                <input
                  type="number"
                  value={otherChargeAmt}
                  className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right sm:w-20"
                  onChange={(e) => setOtherChargAmt(e.target.value)}
                  onFocus={handleSelectAll}
                  onBlur={(e) => setOtherChargAmt(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
                  placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* ✅ Round Off */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:w-28">
              {t("salesInvoice.form.footerSection.paymentSummery.roundOff")}
            </label>
            <div className="flex flex-1">
              <select
                value={roundOffType}
                onChange={(e) => setRoundOffType(e.target.value)}
                className="px-1 py-1 border-r border-themed dark:border-themed bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none"
              >
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
              <input
                type="number"
                value={roundOff}
                onChange={(e) => {
                  const val = e.target.value;
                  const roundOffDigits = generalSettings?.RoundOffDigit ?? 2;
                  const regex = new RegExp(`^\\d*(\\.\\d{0,${roundOffDigits}})?$`);
                  if (val === '' || regex.test(val)) {
                    setRoundOff(parseFloat(val) || 0);
                  }
                }}
                onFocus={handleSelectAll}
                step={Math.pow(10, -(generalSettings?.RoundOffDigit ?? 2))}
                className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right pr-2"
              />
            </div>
          </div>

          {/* Final Grand Total */}
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
      <OtherChargeLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        onSelect={handleLedgerSelect}
        currentLedgerId={formData.otherChargeLedgerId}
        otherChargeLedgers={otherChargeLedgers}
      />
    </div>
  );
};

export default PurchaseQuotationFooterSection;