import { useState, useMemo, useEffect, useRef } from "react";
import PaymentMode from "./FooterTabData/PaymentMode";
import RetentionData from "./FooterTabData/RetentionData";
import AdditionalCost from "./FooterTabData/AdditionalCost";
import OtherDetails from "./FooterTabData/OtherDetails";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import OtherChargeLedgerModal from "./FooterTabData/Otherchargeledgermodal";

const SalesInvoiceFooterSection = ({ totals, formData, setFormData, getCurrentProductCode, bank: banks, cash, otherChargeLedgers, editMode = false }) => {
  const { salesMasterId } = useParams();
  const [isBillDiscWithTaxFocused, setIsBillDiscWithTaxFocused] = useState(false);

  const isEditMode = editMode || Boolean(salesMasterId);
  const { saleSettings, generalSettings } = useSelector((state) => state.settings);

  const activateRoundOff = Boolean(generalSettings?.RoundOff);

  const { t } = useTranslation();
  const { selectedBranchId, currentCurrency } = useAuth();

  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState(0);
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountPerc, setBillDiscountPerc] = useState(0);
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [activeTab, setActiveTab] = useState("payment");
  const [isInitialized, setIsInitialized] = useState(false);
  const [productHistory, setProductHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState({});

  const [billDiscountWithTaxInput, setBillDiscountWithTaxInput] = useState(0);
  const [hasTypedInBillDiscWithTax, setHasTypedInBillDiscWithTax] = useState(false);

  const initializationCompleteRef = useRef(false);


  // ✅ NEW: Track to detect discount distribution changes
  const lastDistributedDetails = useRef(null);

 

  // Other Charge Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);

  // Helper function to select all text on focus
  const handleSelectAll = (e) => {
    e.target.select();
  };

  // ✅ FIXED: Combined useEffect for both edit mode AND quotation/proforma loading
  useEffect(() => {
    // ✅ CRITICAL: Only run initialization once until data is reloaded
    // This prevents the effect from running on every formData change after editing
    if (isInitialized && initializationCompleteRef.current) {
      return;
    }

    // Check if formData has billDiscountWithTax value (from API or edit mode)
    if (formData && formData.billDiscountWithTax !== undefined && formData.billDiscountWithTax !== null && formData.billDiscountWithTax !== '') {

      // Set the billDiscountWithTax input
      setBillDiscountWithTaxInput(formData.billDiscountWithTax);

      // Calculate the pre-tax discount from billDiscountWithTax
      const withTax = parseFloat(formData.billDiscountWithTax) || 0;
      const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
      const preTaxDiscount = withTax / (1 + taxRate / 100);

      // Set bill discount amount
      setBillDiscount(parseFloat(preTaxDiscount.toFixed(generalSettings.decimalPart || 2)));

      // Calculate percentage
      const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
      const discPerc = grandTotal > 0 ? (preTaxDiscount / grandTotal) * 100 : 0;
      setBillDiscountPerc(parseFloat(discPerc.toFixed(generalSettings.decimalPart || 2)));
    }
    // If billDiscountWithTax is empty/null but billDiscount exists (backward compatibility)
    else if (formData && formData.billDiscount) {
      const billDiscAmount = parseFloat(formData.billDiscount) || 0;
      setBillDiscount(billDiscAmount);

      // Calculate percentage from amount
      const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
      const discPerc = grandTotal > 0 ? (billDiscAmount / grandTotal) * 100 : 0;
      setBillDiscountPerc(parseFloat(discPerc.toFixed(generalSettings.decimalPart || 2)));
    }

    // Handle other fields
    if (formData) {
      // Additional Cost
      const addCost = parseFloat(formData.additionalCost) || 0;
      setAdditionalCost(Math.abs(addCost));
      setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

      // Round Off
      const rOff = parseFloat(formData.roundOff) || 0;
      setRoundOff(Math.abs(rOff));
      setRoundOffType(rOff >= 0 ? "+" : "-");

      // Other Charge
      setOtherChargRemark(formData.OtherChargeRemark || '');
      setOtherChargAmt(formData.othercharge || '');

      // Load selected ledger if exists
      if (formData.otherChargeLedgerId) {
        // Try to find the ledger name from the passed otherChargeLedgers prop
        const matchedLedger = otherChargeLedgers?.find(
          (l) => Number(l.ledgerId) === Number(formData.otherChargeLedgerId)
        );

        setSelectedLedger({
          ledgerId: formData.otherChargeLedgerId,
          ledgerName:
            matchedLedger?.ledgerName ||
            formData.otherChargeLedgerName ||
            'Other Charge',
        });
      }
    }

    // ✅ Mark initialization as complete - prevents auto-updates after loading API data
    initializationCompleteRef.current = true;
    setIsInitialized(true);
  }, [formData.billDiscountWithTax, formData.billDiscount, formData.additionalCost, formData.roundOff, formData.othercharge, totals, generalSettings.decimalPart]);
  // Re-resolve ledger name once otherChargeLedgers list is available
  useEffect(() => {
    if (!formData.otherChargeLedgerId || !otherChargeLedgers?.length) return;

    const matchedLedger = otherChargeLedgers.find(
      (l) => Number(l.ledgerId) === Number(formData.otherChargeLedgerId)
    );

    if (matchedLedger) {
      setSelectedLedger({
        ledgerId: matchedLedger.ledgerId,
        ledgerName: matchedLedger.ledgerName,
      });
    }
  }, [otherChargeLedgers, formData.otherChargeLedgerId]);
  // ✅ Detect when new quotation/proforma data is loaded and reinitialize
  useEffect(() => {
    // Check if data has changed (e.g., new quotation/proforma loaded)
    if (isInitialized && (formData?.quotationMasterId || formData?.proformaMasterId)) {
      // Reset initialization to reload new data
      setIsInitialized(false);
      initializationCompleteRef.current = false;
    }
  }, [formData?.quotationMasterId, formData?.proformaMasterId]);

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
  // Add this NEW useEffect right after the finalGrandTotal useMemo
  useEffect(() => {
    if (!initializationCompleteRef.current) return;

    setFormData(prev => ({
      ...prev,
      totalAmount: finalGrandTotal,
      roundOff: roundOffType === "+" ? roundOff : -roundOff,
      additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
      billDiscount,
      billDiscountWithTax: billDiscountWithTaxInput || prev.billDiscountWithTax,
      othercharge: otherChargeAmt,
      OtherChargeRemark: otherChargeRemark,
      CashAmount: prev.paymentMode === 'cash' ? finalGrandTotal : prev.CashAmount,
      BankAmount: prev.paymentMode === 'card' ? finalGrandTotal : prev.BankAmount,
      BillBalanceAmount: prev.paymentMode === 'credit' ? finalGrandTotal : prev.BillBalanceAmount,
    }));
  }, [finalGrandTotal]);

  // Internal setter — called by handleBillDiscountWithTaxChange, does NOT reset the w/tax input
  const applyBillDiscountAmount = (amountValue) => {
    const amount = parseFloat(amountValue) || 0;
    setBillDiscount(amount);
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings.decimalPart || 2)));
  };

  // Called when user directly types in the amount field — auto-calculates w/tax
  const handleBillDiscountAmountChange = (amountValue) => {
    const amount = parseFloat(amountValue) || 0;
    setBillDiscount(amount);

    // Calculate percentage
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings.decimalPart || 2)));

    // ✅ NEW: Auto-calculate billDiscountWithTax from amount
    const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
    const withTax = amount * (1 + taxRate / 100);
    setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings.decimalPart || 2)));
  };

  // Called when user directly types in the % field — auto-calculates w/tax
  // const handleBillDiscountPercChange = (percValue) => {
  //   const perc = parseFloat(percValue) || 0;
  //   setBillDiscountPerc(perc);

  //   const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
  //   const amount = (grandTotal * perc) / 100;
  //   const calculatedAmount = parseFloat(amount.toFixed(generalSettings.decimalPart || 2));
  //   setBillDiscount(calculatedAmount);

  //   // ✅ NEW: Auto-calculate billDiscountWithTax from percentage
  //   const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
  //   const withTax = calculatedAmount * (1 + taxRate / 100);
  //   setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings.decimalPart || 2)));
  // };
  const handleBillDiscountPercChange = (percValue) => {
    const decimalPart = generalSettings?.decimalPart || 2;

    // Allow only up to the configured decimal places
    const regex = new RegExp(`^\\d*(\\.\\d{0,${decimalPart}})?$`);

    if (percValue !== "" && !regex.test(percValue)) {
      return;
    }

    const perc = Math.min(Math.max(parseFloat(percValue) || 0, 0), 100);

    setBillDiscountPerc(perc);

    const grandTotal =
      parseFloat(totals?.grandTotal || 0) +
      parseFloat(totals?.totalTax || 0);

    const amount = (grandTotal * perc) / 100;
    const calculatedAmount = parseFloat(
      amount.toFixed(decimalPart)
    );

    setBillDiscount(calculatedAmount);

    const taxRate =
      parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;

    const withTax = calculatedAmount * (1 + taxRate / 100);

    setBillDiscountWithTaxInput(
      parseFloat(withTax.toFixed(decimalPart))
    );
  };

  // Called when user types in the w/tax field — uses applyBillDiscountAmount (no reset loop)
  const handleBillDiscountWithTaxChange = (withTaxValue) => {
    setBillDiscountWithTaxInput(withTaxValue);

    const withTax = parseFloat(withTaxValue) || 0;

    // Don't apply discount if value is 0
    if (withTax === 0) {
      setBillDiscount(0);
      setBillDiscountPerc(0);
      return;
    }

    const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
    const preTaxDiscount = withTax / (1 + taxRate / 100);
    applyBillDiscountAmount(preTaxDiscount.toFixed(generalSettings.decimalPart || 2));
  };

  // Distribute bill discount across all products proportionally based on net value
  const distributeBillDiscount = (discount, salesDetails) => {
    if (!salesDetails || salesDetails.length === 0) {
      return salesDetails;
    }

    const validRows = salesDetails.filter(
      detail => detail.productCode && detail.qty > 0
    );

    if (validRows.length === 0) {
      return salesDetails;
    }

    // Calculate total net amount (sum of all netValue)
    const totalNetAmount = validRows.reduce((sum, detail) => {
      const netValue = parseFloat(detail.netAmount || 0);
      return sum + netValue;
    }, 0);

    // If no net amount or no discount, return as is
    if (totalNetAmount === 0 || discount === 0) {
      return salesDetails.map(detail => ({
        ...detail,
        billDiscOnProduct: 0
      }));
    }

    // Calculate discount percentage based on total net amount
    const discountPercentage = (discount * 100) / totalNetAmount;

    // Apply proportional discount to each row based on its net value
    return salesDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const discountForRow = (netValue * discountPercentage) / 100;

        return {
          ...detail,
          billDiscOnProduct: parseFloat(discountForRow.toFixed(generalSettings.decimalPart || 2))
        };
      }
      return {
        ...detail,
        billDiscOnProduct: 0
      };
    });
  };

  // ─── ADD THIS right after distributeBillDiscount ─────────────────────────────
  const distributeOtherCharge = (otherCharge, salesDetails) => {
    if (!salesDetails || salesDetails.length === 0) return salesDetails;

    const validRows = salesDetails.filter(
      detail => detail.productCode && detail.qty > 0
    );

    if (validRows.length === 0) return salesDetails;

    const totalNetAmount = validRows.reduce((sum, detail) => {
      return sum + parseFloat(detail.netAmount || 0);
    }, 0);

    if (totalNetAmount === 0 || parseFloat(otherCharge || 0) === 0) {
      return salesDetails.map(detail => ({
        ...detail,
        otherchargeonproduct: 0
      }));
    }

    const chargePercentage = (parseFloat(otherCharge) * 100) / totalNetAmount;

    return salesDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const chargeForRow = (netValue * chargePercentage) / 100;
        return {
          ...detail,
          otherchargeonproduct: parseFloat(
            chargeForRow.toFixed(generalSettings.decimalPart || 2)
          )
        };
      }
      return { ...detail, otherchargeonproduct: 0 };
    });
  };

  // Handle ledger selection from modal
  const handleLedgerSelect = (ledger) => {
    setSelectedLedger(ledger);
    setFormData(prev => ({
      ...prev,
      otherChargeLedgerId: ledger.ledgerId,
      otherChargeLedgerName: ledger.ledgerName
    }));
  };

  //  useEffect(() => {
  //   if (!initializationCompleteRef.current) return;

  //   const details = formData.salesDetails;
  //   if (!details || details.length === 0) return;

  //   const afterBillDisc = distributeBillDiscount(billDiscount, details);
  //   const updatedSalesDetails = distributeOtherCharge(otherChargeAmt, afterBillDisc);

  //   const detailsString = JSON.stringify(
  //     updatedSalesDetails.map(d => ({
  //       b: d.billDiscOnProduct,
  //       o: d.otherchargeonproduct
  //     }))
  //   );

  //   const currentLength = details.length;
  //   const rowCountChanged = currentLength !== prevDetailsLengthRef.current;
  //   prevDetailsLengthRef.current = currentLength;

  //   if (detailsString !== lastDistributedDetails.current || rowCountChanged) {
  //     lastDistributedDetails.current = detailsString;
  //     setFormData(prev => ({
  //       ...prev,
  //       salesDetails: updatedSalesDetails,
  //     }));
  //   }
  // }, [
  //   billDiscount,
  //   otherChargeAmt,
  //   formData.salesDetails,
  // ]);
  const tabs = [
    { id: "payment", label: t("salesInvoice.form.footerSection.tabs.paymentMode") },
    ...(saleSettings?.ActivateSalesRetention
      ? [{ id: "retention", label: t("salesInvoice.form.footerSection.tabs.retention") }]
      : []),
    { id: "other", label: t("salesInvoice.form.footerSection.tabs.otherDetails") },
  ];


  useEffect(() => {
    if (formData.ledgerId) {
      salesHistory();
    } else {
      setProductHistory([]);
    }
  }, [formData.salesDetails, getCurrentProductCode]);

  // Clear cache when ledger changes
  useEffect(() => {
    if (formData.ledgerId) {
      setHistoryCache({});
    }
  }, [formData.ledgerId]);

  const salesHistory = async () => {
    const productCode = getCurrentProductCode?.();

    if (!productCode || !formData.ledgerId) {
      setProductHistory([]);
      return;
    }

    // Create cache key
    // const cacheKey = `${productCode}_${formData.ledgerId}`;

    // // Check if history exists in cache
    // if (historyCache[cacheKey]) {
    //   setProductHistory(historyCache[cacheKey]);
    //   return;
    // }

    try {
      setHistoryLoading(true);

      const res = await axiosInstance.post('product-movement', {
        product_code: productCode,
        branch_id: selectedBranchId,
        currency_id: currentCurrency.currencyId,
        history_type: "Sales",
        ledger_id: formData.ledgerId,
        voucher_type: 'Sales Invoice'
      });

      if (res.data?.status && res.data?.data) {
        const historyData = res.data.data.slice(0, 10);

        // // Store in cache
        // setHistoryCache(prev => ({
        //   ...prev,
        //   [cacheKey]: historyData
        // }));

        setProductHistory(historyData);
      } else {
        setProductHistory([]);
      }

    } catch (error) {
      console.error('❌ Error fetching product movement:', error);
      setProductHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "payment":
        return (
          <PaymentMode finalGrandTotal={finalGrandTotal} totals={totals} formData={formData} setFormData={setFormData} cash={cash} banks={banks} editMode={isEditMode} />
        );
      case "retention":
        return (
          <RetentionData totals={totals} formData={formData} setFormData={setFormData} editMode={isEditMode} />
        );
      case "addCost":
        return (
          <AdditionalCost totals={totals} formData={formData} setFormData={setFormData} editMode={isEditMode} />
        );
      case "other":
        return (
          <OtherDetails totals={totals} formData={formData} setFormData={setFormData} editMode={isEditMode} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2">
      {/* Left Side - History Table + Tabs (60% on desktop, full width on mobile) */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        {/* Product Movement History Table */}
        {productHistory.length > 0 ? (
          <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed mb-2">
            <div className="px-3 py-2 border-b border-themed dark:border-themed bg-secondary dark:bg-secondary">
              <h3 className="text-sm font-semibold text-primary dark:text-primary">
                {t("salesInvoice.form.footerSection.productHistory.title") || "Product Sales History"}
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
                      {t("salesInvoice.form.footerSection.productHistory.customer") || "Customer"}
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
                        {Number(item.Qty).toFixed(generalSettings.decimalPart)}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.Unit}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">
                        {Number(item.Rate).toFixed(generalSettings.decimalPart)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Section */}
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
              <div className="bg-primary dark:bg-primary">{renderTabContent()}</div>
            </div>
          </>
        )}
      </div>

      {/* Right Side - Payment Summary (40% on desktop, full width on mobile) */}
      <div className="lg:col-span-2 order-1 lg:order-2 rounded">

        <div className="lg:col-span-2 order-1 lg:order-2 rounded">
          <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed text-xs overflow-hidden">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>

              {/* Total Amount */}
              <tbody>
                <tr className="border-b border-themed dark:border-themed">
                  <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                    {t("salesInvoice.form.footerSection.paymentSummery.totalAmt")}
                  </td>
                  <td colSpan={3} className="px-2 py-1 border-l border-themed dark:border-themed bg-secondary dark:bg-secondary">
                    <input
                      type="number"
                      value={Number(totals?.grandTotal || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                      className="w-full font-bold bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                      readOnly
                    />
                  </td>
                </tr>

                {/* Bill Discount */}
                {(saleSettings?.showBillDiscountAmount || saleSettings?.showBillDiscountPerc) && (
                  <tr className="border-b border-themed dark:border-themed">
                    <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                      {t("salesInvoice.form.footerSection.paymentSummery.billDescount")}
                    </td>

                    {/* % field */}
                    {saleSettings?.showBillDiscountPerc ? (
                      <td className="px-2 py-1 border-l border-themed dark:border-themed">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step={generalSettings?.decimalPart
                              ? `0.${"0".repeat(generalSettings.decimalPart - 1)}1`
                              : "0.01"}
                            value={billDiscountPerc}
                            onChange={(e) => handleBillDiscountPercChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (["-", "+", "e", "E"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onFocus={handleSelectAll}
                            className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                            placeholder="%"
                            disabled={Number(totals?.grandTotal) <= 0}
                          />
                          <span className="text-secondary dark:text-secondary">%</span>
                        </div>
                      </td>
                    ) : (
                      <td className="border-l border-themed dark:border-themed" />
                    )}

                    {/* w/tax field */}
                    {saleSettings?.showBillDiscountAmount && (
                      <td className="px-2 py-1 border-l border-themed dark:border-themed">
                        <input
                          type="text"
                          value={
                            isBillDiscWithTaxFocused && !hasTypedInBillDiscWithTax
                              ? (billDiscountWithTaxInput !== '' && billDiscountWithTaxInput != null
                                ? Number(billDiscountWithTaxInput).toFixed(generalSettings?.decimalPart || 2)
                                : Number(0).toFixed(generalSettings?.decimalPart || 2))
                              : (isBillDiscWithTaxFocused
                                ? billDiscountWithTaxInput
                                : (billDiscountWithTaxInput !== '' && billDiscountWithTaxInput != null
                                  ? Number(billDiscountWithTaxInput).toFixed(generalSettings?.decimalPart || 2)
                                  : Number(0).toFixed(generalSettings?.decimalPart || 2)))
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const validValue = value.split('.').length > 2
                              ? value.slice(0, value.lastIndexOf('.'))
                              : value;
                            handleBillDiscountWithTaxChange(validValue);
                            if (isBillDiscWithTaxFocused && !hasTypedInBillDiscWithTax) {
                              setHasTypedInBillDiscWithTax(true);
                            }
                          }}
                          onFocus={(e) => {
                            setIsBillDiscWithTaxFocused(true);
                            setHasTypedInBillDiscWithTax(false);
                            setTimeout(() => e.target.select(), 0);
                          }}
                          onBlur={(e) => {
                            setIsBillDiscWithTaxFocused(false);
                            setHasTypedInBillDiscWithTax(false);
                            setBillDiscountWithTaxInput(parseFloat(e.target.value) || 0);
                          }}
                          className="w-full bg-transparent focus:outline-none text-right"
                          placeholder="w/tax"
                          disabled={Number(totals?.grandTotal) <= 0}
                          title="Discount amount from total including tax"
                        />
                      </td>
                    )}

                    {/* Amount field */}
                    {saleSettings?.showBillDiscountAmount ? (
                      <td className="px-2 py-1 border-l border-themed dark:border-themed">
                        <input
                          type="number"
                          value={billDiscount}
                          onChange={(e) => handleBillDiscountAmountChange(e.target.value)}
                          onFocus={handleSelectAll}
                          disabled={Number(totals?.grandTotal) <= 0}
                          className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                          placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                        />
                      </td>
                    ) : (
                      <td className="border-l border-themed dark:border-themed" />
                    )}
                  </tr>
                )}

                {/* Total Tax */}
                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                  <tr className="border-b border-themed dark:border-themed">
                    <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                      {t("salesInvoice.form.footerSection.paymentSummery.totalTax")}
                    </td>
                    <td colSpan={3} className="px-2 py-1 border-l border-themed dark:border-themed bg-secondary dark:bg-secondary">
                      <input
                        type="number"
                        value={Number(totals?.totalTax || 0).toFixed(generalSettings?.decimalPart ?? 2)}
                        className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                        readOnly
                      />
                    </td>
                  </tr>
                )}

                {/* Other Charge */}
                <tr className="border-b border-themed dark:border-themed">
                  <td>
                    <button
                      type="button"
                      onClick={() => setIsLedgerModalOpen(true)}
                      disabled={isEditMode}
                      className="px-2 py-1 font-medium text-left text-blue-800 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {selectedLedger?.ledgerName || t("salesInvoice.form.footerSection.paymentSummery.otherCharge")}
                    </button>
                  </td>
                  <td colSpan={2} className="px-2 py-1 border-l border-themed dark:border-themed">
                    <input
                      type="text"
                      value={otherChargeRemark}
                      className="w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none"
                      placeholder={t("salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder")}
                      onChange={(e) => {
                        if (isEditMode) return;
                        setOtherChargRemark(e.target.value);
                      }}
                      onFocus={(e) => {
                        if (isEditMode) return;
                        handleSelectAll(e);
                      }}
                      readOnly={isEditMode}
                       disabled={isEditMode || !selectedLedger || Number(totals?.grandTotal) <= 0}
                    />
                  </td>
                  <td className="px-2 py-1 border-l border-themed dark:border-themed">
                    <input
                      type="text"
                      onKeyDown={(e) => {
                        if (isEditMode) return;
                        if (e.key === "-" || e.key === "+") e.preventDefault()
                      }}
                      value={otherChargeAmt}
                      className="w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right"
                      onChange={(e) => {
                        if (isEditMode) return;
                        const val = e.target.value;
                        setOtherChargAmt(val);
                        if (!val || val === '' || parseFloat(val) === 0) {
                          lastDistributedDetails.current = null;
                        }
                      }}
                      onFocus={(e) => {
                        if (isEditMode) return;
                        handleSelectAll(e);
                      }}
                      placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                      disabled={isEditMode || !selectedLedger || Number(totals?.grandTotal) <= 0}
                      readOnly={isEditMode}
                    />
                  </td>
                </tr>

                {/* Round Off */}
                {activateRoundOff && (
                  <tr className="border-b border-themed dark:border-themed">
                    <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                      {t("salesInvoice.form.footerSection.paymentSummery.roundOff")}
                    </td>
                    <td className="px-2 py-1 border-l border-themed dark:border-themed">
                      <select
                        value={roundOffType}
                        onChange={(e) => {
                          if (isEditMode) return;
                          setRoundOffType(e.target.value);
                        }}
                        className="w-full bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none"
                        disabled={isEditMode}
                      >
                        <option value="+">+</option>
                        <option value="-">-</option>
                      </select>
                    </td>
                    <td colSpan={2} className="px-2 py-1 border-l border-themed dark:border-themed">
                      <input
                        type="number"
                        value={roundOff}
                        onChange={(e) => {
                          if (isEditMode) return;
                          const val = e.target.value;
                          const roundOffDigits = generalSettings?.RoundOffDigit ?? 2;
                          const regex = new RegExp(`^\\d*(\\.\\d{0,${roundOffDigits}})?$`);
                          if (val === '' || regex.test(val)) {
                            setRoundOff(parseFloat(val) || 0);
                          }
                        }}
                        onFocus={(e) => {
                          if (isEditMode) return;
                          handleSelectAll(e);
                        }}
                        disabled={isEditMode || Number(totals?.grandTotal) <= 0}
                        readOnly={isEditMode}
                        step={Math.pow(10, -(generalSettings?.RoundOffDigit ?? 2))}
                        className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                      />
                    </td>
                  </tr>
                )}

                {/* Grand Total */}
                <tr className="bg-secondary dark:bg-secondary">
                  <td colSpan={2} className="px-2 py-1.5 text-sm font-bold text-primary dark:text-primary">
                    {t("salesInvoice.form.footerSection.paymentSummery.grandTotal")}
                  </td>
                  <td colSpan={2} className="px-2 py-1.5 text-right text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                    {finalGrandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Other Charge Ledger Modal */}
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

export default SalesInvoiceFooterSection;