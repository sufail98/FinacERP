import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FooterDetails from "./FooterTabData/FooterDetails";
import { useSelector } from "react-redux";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";

const MaterialReceiptFooterSection = ({ totals, formData, setFormData, otherChargeLedgers }) => {
  const { materialReceiptId } = useParams();
  const isEditMode = Boolean(materialReceiptId);
  const { t } = useTranslation()
  const { generalSettings } = useSelector((state) => state.settings);
  const activateRoundOff = Boolean(generalSettings?.RoundOff);

  const [additionalCost, setAdditionalCost] = useState((0).toFixed(generalSettings.decimalPart || 2));
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState((0).toFixed(generalSettings.decimalPart || 2));
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState((0).toFixed(generalSettings.decimalPart || 2));
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState((0).toFixed(generalSettings.decimalPart || 2));
  const [isInitialized, setIsInitialized] = useState(false);
  // Other Charge Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  // Handle ledger selection from modal
  const handleLedgerSelect = (ledger) => {
    setSelectedLedger(ledger);
    setFormData(prev => ({
      ...prev,
      OtherChargeLedgerId: ledger.ledgerId,
      otherChargeLedgerName: ledger.ledgerName
    }));
  };


  // ✅ Helper function to select all text on focus
  const handleSelectAll = (e) => {
    e.target.select();
  };
useEffect(() => {
  if (formData && !isInitialized && (formData.billDiscount || formData.othercharge)) {
    const addCost = parseFloat(formData.additionalCost) || 0;
    setAdditionalCost(Math.abs(addCost));
    setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

    const rOff = parseFloat(formData.roundoff) || 0;
    setRoundOff(Math.abs(rOff).toFixed(generalSettings.decimalPart || 2));
    setRoundOffType(rOff >= 0 ? "+" : "-");

    setBillDiscount((parseFloat(formData.billDiscount) || 0).toFixed(generalSettings.decimalPart || 2));
    setOtherChargRemark(formData.OtherChargeRemark || '');
    setOtherChargAmt((parseFloat(formData.othercharge) || 0).toFixed(generalSettings.decimalPart || 2));

    setIsInitialized(true);
  }
}, [formData, isInitialized]);

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

  const distributeBillDiscount = (discount, materialDetails) => {
    if (!materialDetails || materialDetails.length === 0) return materialDetails;

    const validRows = materialDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return materialDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || discount === 0) {
      return materialDetails.map(d => ({ ...d, billDiscOnProduct: 0 }));
    }

    const discountPercentage = (discount * 100) / totalNetAmount;

    return materialDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const discountForRow = (netValue * discountPercentage) / 100;
        return {
          ...detail,
          billDiscOnProduct: parseFloat(discountForRow.toFixed(generalSettings.decimalPart || 2))
        };
      }
      return { ...detail, billDiscOnProduct: 0 };
    });
  };
  const distributeOtherCharge = (otherCharge, materialDetails) => {
    if (!materialDetails || materialDetails.length === 0) return materialDetails;

    const validRows = materialDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return materialDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || !otherCharge || parseFloat(otherCharge) === 0) {
      return materialDetails.map(d => ({ ...d, otherchargeOnProduct: 0 }));
    }

    const chargePercentage = (parseFloat(otherCharge) * 100) / totalNetAmount;

    return materialDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const chargeForRow = (netValue * chargePercentage) / 100;
        return {
          ...detail,
          otherchargeOnProduct: parseFloat(chargeForRow.toFixed(generalSettings.decimalPart || 2))
        };
      }
      return { ...detail, otherchargeOnProduct: 0 };
    });
  };

    useEffect(() => {
      if (isEditMode && formData?.OtherChargeLedgerId && otherChargeLedgers?.length > 0 && !selectedLedger) {
        const matchedLedger = otherChargeLedgers.find(
          (ledger) => Number(ledger.ledgerId) === Number(formData.OtherChargeLedgerId)
        );
        if (matchedLedger) {
          setSelectedLedger(matchedLedger);
        }
      }
    }, [isEditMode, formData?.OtherChargeLedgerId, otherChargeLedgers, selectedLedger]);

  useEffect(() => {
    if (formData.materialDetails && formData.materialDetails.length > 0) {
      let updatedMaterialDetails = distributeBillDiscount(billDiscount, formData.materialDetails);
      updatedMaterialDetails = distributeOtherCharge(otherChargeAmt, updatedMaterialDetails);

      setFormData(prev => ({
        ...prev,
        additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
        billDiscount,
        roundoff: roundOffType === "+" ? roundOff : -roundOff,
        othercharge: otherChargeAmt,
        OtherChargeRemark: otherChargeRemark,
        materialDetails: updatedMaterialDetails,
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



  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2">
      {/* Left Side - Tabs (60% on desktop, full width on mobile) */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed">
          {/* Tab Content */}
          <div className="min-h-[200px] bg-primary dark:bg-primary">
            <FooterDetails formData={formData} setFormData={setFormData} />
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
              value={Number(totals?.grandTotal || 0).toFixed(generalSettings.decimalPart || 2)}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-secondary dark:bg-secondary text-primary dark:text-primary focus:outline-none text-right"
              readOnly
            />
          </div>

          {/* ✅ Bill Discount */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-themed dark:border-themed">
            <label className="px-2 py-1 font-medium text-secondary dark:text-secondary sm:min-w-[100px] lg:w-28">
              {t("salesInvoice.form.footerSection.paymentSummery.billDescount")}
            </label>
            <input
              type="text"
              max={0}
              onKeyDown={(e) => {
                if (e.key === "-") e.preventDefault()
              }}
              value={billDiscount}
              onChange={(e) => setBillDiscount(e.target.value)}
              onBlur={(e) => setBillDiscount((parseFloat(e.target.value) || 0).toFixed(generalSettings.decimalPart || 2))}
              onFocus={handleSelectAll}
              disabled={Number(totals?.grandTotal) <= 0}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none text-right"
            />
          </div>

          {/* Total Tax */}
          {(generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') && (
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
                  max={0}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "+") e.preventDefault()
                  }}
                  value={otherChargeAmt}
                  className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right sm:w-20"
                  onChange={(e) => setOtherChargAmt(e.target.value)}
                  onBlur={(e) => setOtherChargAmt((parseFloat(e.target.value) || 0).toFixed(generalSettings.decimalPart || 2))}
                  onFocus={handleSelectAll}
                  disabled={Number(totals?.grandTotal) <= 0 || !selectedLedger}
                  placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                />
              </div>
            </div>
          </div>
          {/* ✅ Round Off */}
          {activateRoundOff && (
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
                  disabled={Number(totals?.grandTotal) <= 0}
                  step={Math.pow(10, -(generalSettings?.RoundOffDigit ?? 2))}
                  className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right pr-2"
                />
              </div>
            </div>

          )}
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
        currentLedgerId={formData.OtherChargeLedgerId}
        otherChargeLedgers={otherChargeLedgers}
      />
    </div>
  );
};

export default MaterialReceiptFooterSection;