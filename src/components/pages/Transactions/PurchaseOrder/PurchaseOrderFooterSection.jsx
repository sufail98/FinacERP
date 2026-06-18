import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import TextArea from "@/components/elements/theme/TextArea";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";

const PurchaseOrderFooterSection = ({ totals, formData, setFormData, otherChargeLedgers, getCurrentProductCode }) => {
  const { purchaseOrdermasterId } = useParams();
  const isEditMode = Boolean(purchaseOrdermasterId);
  const { saleSettings, generalSettings } = useSelector((state) => state.settings);
  const { selectedBranchId, currentCurrency } = useAuth();
  const activateRoundOff = Boolean(generalSettings?.RoundOff);

  const { t } = useTranslation()
  const [additionalCost, setAdditionalCost] = useState((0).toFixed(generalSettings.decimalPart));
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState((0).toFixed(generalSettings.decimalPart));
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState((0).toFixed(generalSettings.decimalPart));
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState((0).toFixed(generalSettings.decimalPart));
  const [activeTab, setActiveTab] = useState("payment");
  const [isInitialized, setIsInitialized] = useState(false);
  // Other Charge Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);

  // Purchase History States
  const [productHistory, setProductHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState({});
  const decimalPart = generalSettings?.decimalPart ?? 2;
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

  // Purchase History API call
  const fetchPurchaseHistory = async () => {
    const productCode = getCurrentProductCode?.();

    if (!productCode || !formData.ledgerId) {
      setProductHistory([]);
      return;
    }

    // Create cache key
    const cacheKey = `${productCode}_${formData.ledgerId}`;

    // Check if history exists in cache
    if (historyCache[cacheKey]) {
      setProductHistory(historyCache[cacheKey]);
      return;
    }

    try {
      setHistoryLoading(true);

      const res = await axiosInstance.post('history/purchase', {
        productCode: productCode,
        branchId: selectedBranchId,
        currencyId: currentCurrency.currencyId,
        ledgerId: formData.ledgerId
      });

      if (res.data?.status && res.data?.data) {
        const historyData = res.data.data.slice(0, 10);

        // Store in cache
        setHistoryCache(prev => ({
          ...prev,
          [cacheKey]: historyData
        }));

        setProductHistory(historyData);
      } else {
        setProductHistory([]);
      }

    } catch (error) {
      console.error('❌ Error fetching purchase history:', error);
      setProductHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch history when product or ledger changes
  useEffect(() => {
    if (formData.ledgerId) {
      fetchPurchaseHistory();
    } else {
      setProductHistory([]);
    }
  }, [formData.purchaseDetails, getCurrentProductCode, formData.ledgerId]);

  // Clear cache when ledger changes
  useEffect(() => {
    if (formData.ledgerId) {
      setHistoryCache({});
    }
  }, [formData.ledgerId]);

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
      setOtherChargAmt(formData.OtherCharge || '');

      setIsInitialized(true);
    }
  }, [isEditMode, formData, isInitialized]);

  const safeFloat = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const finalGrandTotal = useMemo(() => {
    let base = safeFloat(totals?.grandTotal) + safeFloat(totals?.totalTax);

    base += safeFloat(otherChargeAmt);

    if (additionalCostType === "Cr") {
      base += safeFloat(additionalCost || 0);
    } else {
      base -= safeFloat(additionalCost || 0);
    }

    base -= safeFloat(billDiscount || 0);

    if (roundOffType === "+") {
      base += safeFloat(roundOff || 0);
    } else {
      base -= safeFloat(roundOff || 0);
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

  const distributeBillDiscount = (discount, purchaseDetails) => {
    if (!purchaseDetails || purchaseDetails.length === 0) return purchaseDetails;

    const validRows = purchaseDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return purchaseDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || discount === 0) {
      return purchaseDetails.map(d => ({ ...d, billDiscOnProduct: 0 }));
    }

    const discountPercentage = (discount * 100) / totalNetAmount;

    return purchaseDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const discountForRow = (netValue * discountPercentage) / 100;
        return {
          ...detail,
          billDiscOnProduct: parseFloat(discountForRow.toFixed(generalSettings.decimalPart))
        };
      }
      return { ...detail, billDiscOnProduct: 0 };
    });
  };

  useEffect(() => {
    if (formData.purchaseDetails && formData.purchaseDetails.length > 0) {
      const updatedPurchaseDetails = distributeBillDiscount(billDiscount, formData.purchaseDetails);
      setFormData(prev => ({
        ...prev,
        additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
        billDiscount,
        roundoff: roundOffType === "+" ? roundOff : -roundOff,
        OtherCharge: otherChargeAmt,
        purchaseDetails: updatedPurchaseDetails,
        totalAmount: finalGrandTotal,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
        billDiscount,
        roundoff: roundOffType === "+" ? roundOff : -roundOff,
        OtherCharge: otherChargeAmt,
        totalAmount: finalGrandTotal,
      }));
    }
  }, [additionalCost, additionalCostType, billDiscount, roundOff, roundOffType, otherChargeAmt, otherChargeRemark, finalGrandTotal]);





  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: !!checked
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2">
      {/* Left Side - History Table + Form (60% on desktop, full width on mobile) */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        {/* Product Purchase History Table */}
        {productHistory.length > 0 ? (
          <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed mb-2">
            <div className="px-3 py-2 border-b border-themed dark:border-themed bg-secondary dark:bg-secondary">
              <h3 className="text-sm font-semibold text-primary dark:text-primary">
                {t("purchaseInvoice.form.footerSection.productHistory.title") || "Product Purchase History"}
              </h3>
            </div>
            <div className="overflow-x-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-secondary dark:bg-secondary sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.slNo") || "Sl"}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.date") || "Date"}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.time")}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.billNo") || "Bill No"}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.supplier") || "Supplier"}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.qty") || "Qty"}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.unit") || "Unit"}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium text-secondary dark:text-secondary border-b border-themed">
                      {t("salesInvoice.form.footerSection.productHistory.rate") || "Rate"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productHistory.map((item, index) => (
                    <tr
                      key={index}
                      className={`${index % 2 === 0 ? 'bg-primary dark:bg-primary' : 'bg-secondary dark:bg-secondary'} hover:bg-hover dark:hover:bg-hover`}
                    >
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.SlNo}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.Date}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.billTime || '-'}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.BillNo}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed truncate max-w-[120px]" title={item.CustomerName}>
                        {item.CustomerName}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">
                        {Number(item.Qty).toFixed(decimalPart)}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.Unit}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">
                        {Number(item.Rate).toFixed(decimalPart)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          historyLoading && (
            <></>
          )
        )}

        {/* Form Section */}
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed">
          <div className="p-2">
            <div className="grid grid-cols-4 gap-1">
              <TextInput
                name="DeliveryTerms"
                label={t("purchaseOrder.form.label.DeliveryTerms")}
                value={formData.DeliveryTerms || ''}
                onChange={handleInputChange}
                placeholder={t("purchaseOrder.form.label.DeliveryTerms")}
              />
              <TextInput
                name="Certificate"
                label={t("purchaseOrder.form.label.Certificate")}
                value={formData.Certificate || ''}
                onChange={handleInputChange}
                placeholder={t("purchaseOrder.form.label.Certificate")}
                type="text"
              />
              <TextInput
                name="transportCompany"
                label={t("purchaseOrder.form.label.transportCompany")}
                value={formData.transportCompany || ''}
                onChange={handleInputChange}
                placeholder={t("purchaseOrder.form.label.transportCompany")}
              />
              {isEditMode && (
                <div className='flex gap-2 items-center'>
                  <Checkbox
                    checked={formData.cancelled}
                    onCheckedChange={(checked) => handleCheckboxChange('cancelled', checked)}
                  />
                  <Label className="text-primary dark:text-primary">{t("purchaseOrder.form.label.cancelled")}</Label>
                </div>
              )}
              <div className="col-span-2">
                <TextInput
                  name="PaymentTerms"
                  label={t("purchaseOrder.form.label.PaymentTerms")}
                  value={formData.PaymentTerms || ''}
                  onChange={handleInputChange}
                  placeholder={t("purchaseOrder.form.label.PaymentTerms")}
                />
              </div>
              <div className="col-span-2">
                <TextArea
                  name="narration"
                  label={t("purchaseOrder.form.label.narration")}
                  value={formData.narration || ''}
                  onChange={handleInputChange}
                  placeholder={t("purchaseOrder.form.label.narration")}
                />
              </div>
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
                onChange={(e) => setAdditionalCost(e.target.value)}
                onBlur={(e) => setAdditionalCost(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
                onFocus={handleSelectAll}
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
              onChange={(e) => setBillDiscount(e.target.value)}
              onBlur={(e) => setBillDiscount(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
              onFocus={handleSelectAll}
              className="flex-1 px-2 py-1 sm:border-l border-themed dark:border-themed bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none text-right"
            />
          </div>

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
                  onBlur={(e) => setOtherChargAmt(parseFloat(e.target.value || 0).toFixed(generalSettings.decimalPart))}
                  onFocus={handleSelectAll}
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
        currentLedgerId={formData.otherChargeLedgerId}
        otherChargeLedgers={otherChargeLedgers}
      />
    </div>
  );
};

export default PurchaseOrderFooterSection;