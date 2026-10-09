import { useState, useMemo, useEffect, useRef } from "react";
import PaymentMode from "./FooterTabData/PaymentMode";
import RetentionData from "./FooterTabData/RetentionData";
import AdditionalCost from "./FooterTabData/AdditionalCost";
import OtherDetails from "./FooterTabData/OtherDetails";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";

const SalesReturnFooterSection = ({ totals, formData, setFormData, otherChargeLedgers, bank: banks, cash, getCurrentProductCode, isTableFocused, onFocus }) => {
  const { generalSettings, saleSettings } = useSelector((state) => state.settings);
  const { t } = useTranslation();
  const activateRoundOff = Boolean(generalSettings?.RoundOff);

  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState(0);
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountPerc, setBillDiscountPerc] = useState(0);
  const [billDiscountWithTaxInput, setBillDiscountWithTaxInput] = useState(0);
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [activeTab, setActiveTab] = useState("payment");
  const [isInitialized, setIsInitialized] = useState(false);
  const decimalPart = generalSettings?.decimalPart ?? 2;

  // ✅ Track focus state for proper typing behavior
  const [isBillDiscWithTaxFocused, setIsBillDiscWithTaxFocused] = useState(false);
  const [hasTypedInBillDiscWithTax, setHasTypedInBillDiscWithTax] = useState(false);

  // ✅ NEW: Ref to track the latest salesDetails without triggering re-renders
  const salesDetailsRef = useRef(formData.salesDetails);
  useEffect(() => {
    salesDetailsRef.current = formData.salesDetails;
  }, [formData.salesDetails]);

  // ✅ NEW: Track to detect discount distribution changes
  const lastDistributedDetails = useRef(null);

  // ✅ NEW: Track previous row count to detect additions/removals
  const prevDetailsLengthRef = useRef(
    formData.salesDetails ? formData.salesDetails.length : 0
  );

  // Other Charge Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);

  const { selectedBranchId, currentCurrency } = useAuth();

  const [productHistory, setProductHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState({});

  useEffect(() => {
    if (formData.ledgerId && isTableFocused) {
      fetchInvoiceHistory();
    } else {
      setProductHistory([]);
    }
  }, [formData.salesDetails, getCurrentProductCode, isTableFocused]);

  useEffect(() => {
    if (formData.ledgerId) {
      setHistoryCache({});
    }
  }, [formData.ledgerId]);

  const fetchInvoiceHistory = async () => {
    const productCode = getCurrentProductCode?.();
    if (!productCode || !formData.ledgerId) {
      setProductHistory([]);
      return;
    }
    const cacheKey = `${productCode}_${formData.ledgerId}`;
    if (historyCache[cacheKey]) {
      setProductHistory(historyCache[cacheKey]);
      return;
    }
    try {
      setHistoryLoading(true);
      const res = await axiosInstance.post('product-movement', {
        product_code: productCode,
        branch_id: selectedBranchId,
        currency_id: currentCurrency.currencyId,
        history_type: 'Sales',
        ledger_id: formData.ledgerId,
        voucher_type: 'Sales Invoice'
      });
      if (res.data?.status && res.data?.data) {
        const historyData = res.data.data.slice(0, 10);
        setHistoryCache(prev => ({ ...prev, [cacheKey]: historyData }));
        setProductHistory(historyData);
      } else {
        setProductHistory([]);
      }
    } catch (error) {
      console.error('Error fetching sales return product movement:', error);
      setProductHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Distribute bill discount proportionally
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

    const totalNetAmount = validRows.reduce((sum, detail) => {
      const netValue = parseFloat(detail.netAmount || 0);
      return sum + netValue;
    }, 0);

    if (totalNetAmount === 0 || discount === 0) {
      return salesDetails.map(detail => ({
        ...detail,
        billDiscOnProduct: 0
      }));
    }

    const discountPercentage = (discount * 100) / totalNetAmount;

    return salesDetails.map(detail => {
      if (detail.productCode && detail.qty > 0) {
        const netValue = parseFloat(detail.netAmount || 0);
        const discountForRow = (netValue * discountPercentage) / 100;

        return {
          ...detail,
          billDiscOnProduct: parseFloat(discountForRow.toFixed(decimalPart))
        };
      }
      return {
        ...detail,
        billDiscOnProduct: 0
      };
    });
  };

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
            chargeForRow.toFixed(decimalPart)
          )
        };
      }
      return { ...detail, otherchargeonproduct: 0 };
    });
  };

  // Handle percentage change
  // const handleBillDiscountPercChange = (percValue) => {
  //   const perc = parseFloat(percValue) || 0;
  //   setBillDiscountPerc(perc);

  //   const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
  //   const amount = (grandTotal * perc) / 100;
  //   const calculatedAmount = parseFloat(amount.toFixed(generalSettings.decimalPart || 2));
  //   setBillDiscount(calculatedAmount);

  //   // Auto-calculate billDiscountWithTax from percentage
  //   const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
  //   const withTax = calculatedAmount * (1 + taxRate / 100);
  //   setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings.decimalPart || 2)));
  // };
  const handleBillDiscountPercChange = (percValue) => {
  const decimalPart = generalSettings?.decimalPart || 2;

  let perc = parseFloat(percValue) || 0;

  // Restrict 0 - 100
  perc = Math.min(Math.max(perc, 0), 100);

  // Restrict decimal places
  perc = Number(perc.toFixed(decimalPart));

  setBillDiscountPerc(perc);

  const grandTotal =
    parseFloat(totals?.grandTotal || 0) +
    parseFloat(totals?.totalTax || 0);

  const amount = (grandTotal * perc) / 100;
  const calculatedAmount = Number(amount.toFixed(decimalPart));

  setBillDiscount(calculatedAmount);

  const taxRate =
    parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;

  const withTax = calculatedAmount * (1 + taxRate / 100);

  setBillDiscountWithTaxInput(
    Number(withTax.toFixed(decimalPart))
  );
};

  // Handle amount change
  const handleBillDiscountAmountChange = (amountValue) => {
    const amount = parseFloat(amountValue) || 0;
    setBillDiscount(amount);

    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings.decimalPart || 2)));

    // Auto-calculate billDiscountWithTax from amount
    const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
    const withTax = amount * (1 + taxRate / 100);
    setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings.decimalPart || 2)));
  };

  // Internal: sets amount + % without touching w/tax input
  const applyBillDiscountAmount = (amountValue) => {
    const amount = parseFloat(amountValue) || 0;
    setBillDiscount(amount);
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings.decimalPart || 2)));
  };

  // User typed in w/tax field → derive pre-tax discount
  const handleBillDiscountWithTaxChange = (withTaxValue) => {
    setBillDiscountWithTaxInput(withTaxValue);
    const withTax = parseFloat(withTaxValue) || 0;
    const taxRate = parseFloat(formData.salesDetails?.[0]?.taxRate) || 15;
    const preTaxDiscount = withTax / (1 + taxRate / 100);
    applyBillDiscountAmount(preTaxDiscount.toFixed(generalSettings.decimalPart || 2));
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

  const handleSelectAll = (e) => {
    e.target.select();
  };

  useEffect(() => {
    if (formData && !isInitialized) {
      const addCost = parseFloat(formData.additionalCost) || 0;
      setAdditionalCost(Math.abs(addCost));
      setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

      const rOff = parseFloat(formData.roundOff) || 0;
      setRoundOff(Math.abs(rOff));
      setRoundOffType(rOff >= 0 ? "+" : "-");

      const billDiscAmount = parseFloat(formData.billDiscount) || 0;
      setBillDiscount(billDiscAmount);

      const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
      const discPerc = grandTotal > 0 ? (billDiscAmount / grandTotal) * 100 : 0;
      setBillDiscountPerc(discPerc);

      setBillDiscountWithTaxInput(formData.billDiscountWithTax || 0);

      setOtherChargRemark(formData.OtherChargeRemark || '');
      setOtherChargAmt(formData.othercharge || '');

      if (formData.otherChargeLedgerId) {
        setSelectedLedger({
          ledgerId: formData.otherChargeLedgerId,
          ledgerName: formData.otherChargeLedgerName || 'Other Charge'
        });
      }

      setIsInitialized(true);
    }
  }, [formData, isInitialized, totals]);

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
    return base.toFixed(decimalPart);
  }, [totals, additionalCost, additionalCostType, billDiscount, roundOff, roundOffType, otherChargeAmt]);

  // ✅ FIXED: Distribute bill discount to sales details with infinite loop prevention
  // useEffect(() => {
  //   const details = salesDetailsRef.current;
  //   const currentLength = details ? details.length : 0;

  //   if (details && details.length > 0) {
  //     const afterBillDisc = distributeBillDiscount(billDiscount, details);
  //     const updatedSalesDetails = distributeOtherCharge(otherChargeAmt, afterBillDisc);

  //     const detailsString = JSON.stringify(
  //       updatedSalesDetails.map(d => ({
  //         b: d.billDiscOnProduct,
  //         o: d.otherchargeonproduct
  //       }))
  //     );

  //     const rowCountChanged = currentLength !== prevDetailsLengthRef.current;
  //     prevDetailsLengthRef.current = currentLength;

  //     if (detailsString !== lastDistributedDetails.current || rowCountChanged) {
  //       lastDistributedDetails.current = detailsString;
  //       setFormData(prev => ({
  //         ...prev,
  //         additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
  //         billDiscount,
  //         billDiscountWithTax: billDiscountWithTaxInput,
  //         roundOff: roundOffType === "+" ? roundOff : -roundOff,
  //         othercharge: otherChargeAmt,
  //         OtherChargeRemark: otherChargeRemark,
  //         salesDetails: updatedSalesDetails
  //       }));
  //     }
  //   } else {
  //     prevDetailsLengthRef.current = currentLength;
  //     setFormData(prev => ({
  //       ...prev,
  //       additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
  //       billDiscount,
  //       billDiscountWithTax: billDiscountWithTaxInput,
  //       roundOff: roundOffType === "+" ? roundOff : -roundOff,
  //       othercharge: otherChargeAmt,
  //       OtherChargeRemark: otherChargeRemark
  //     }));
  //   }
  // }, [
  //   billDiscount,
  //   otherChargeAmt,       // ← add this
  //   additionalCost,
  //   additionalCostType,
  //   roundOff,
  //   roundOffType,
  //   otherChargeRemark,
  //   billDiscountWithTaxInput,
  //   formData.salesDetails,
  // ]);

  // ✅ FIXED: Distribute bill discount to sales details with infinite loop prevention
useEffect(() => {
  const details = salesDetailsRef.current;
  const currentLength = details ? details.length : 0;

  const rowCountChanged = currentLength !== prevDetailsLengthRef.current;
  prevDetailsLengthRef.current = currentLength;

  // Scalar footer fields must always sync, regardless of whether the
  // per-row bill-discount/other-charge distribution actually changed.
  const baseUpdate = {
    additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
    billDiscount,
    billDiscountWithTax: billDiscountWithTaxInput,
    roundOff: roundOffType === "+" ? roundOff : -roundOff,
    othercharge: otherChargeAmt,
    OtherChargeRemark: otherChargeRemark,
  };

  if (details && details.length > 0) {
    const afterBillDisc = distributeBillDiscount(billDiscount, details);
    const updatedSalesDetails = distributeOtherCharge(otherChargeAmt, afterBillDisc);

    const detailsString = JSON.stringify(
      updatedSalesDetails.map(d => ({
        b: d.billDiscOnProduct,
        o: d.otherchargeonproduct
      }))
    );

    // Only decides whether salesDetails needs replacing — must NOT gate baseUpdate.
    const distributionChanged = detailsString !== lastDistributedDetails.current || rowCountChanged;
    if (distributionChanged) {
      lastDistributedDetails.current = detailsString;
    }

    setFormData(prev => ({
      ...prev,
      ...baseUpdate,
      ...(distributionChanged ? { salesDetails: updatedSalesDetails } : {}),
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      ...baseUpdate,
    }));
  }
}, [
  billDiscount,
  otherChargeAmt,
  additionalCost,
  additionalCostType,
  roundOff,
  roundOffType,
  otherChargeRemark,
  billDiscountWithTaxInput,
  formData.salesDetails,
]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "payment":
        return <PaymentMode finalGrandTotal={finalGrandTotal} totals={totals} formData={formData} setFormData={setFormData} cash={cash} banks={banks} />;
      case "retention":
        return <RetentionData totals={totals} formData={formData} setFormData={setFormData} />;
      case "addCost":
        return <AdditionalCost totals={totals} formData={formData} setFormData={setFormData} />;
      case "other":
        return <OtherDetails totals={totals} formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2" onFocus={onFocus}>
      {/* Left Side - Tabs */}
      <div className="lg:col-span-4 order-2 lg:order-1" onFocus={onFocus}>
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
                      className={`${index % 2 === 0 ? "bg-primary dark:bg-primary" : "bg-secondary dark:bg-secondary"} hover:bg-hover dark:hover:bg-hover`}
                    >
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">{item.SlNo}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">{item.Date}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">
                        {item.billTime || '-'}
                      </td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">{item.BillNo}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed truncate max-w-[120px]" title={item.CustomerName}>{item.CustomerName}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">{Number(item.Qty).toFixed(generalSettings.decimalPart)}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">{item.Unit}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">{Number(item.Rate).toFixed(generalSettings.decimalPart)}</td>
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

      {/* Right Side - Payment Summary */}
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
                           step="0.01"
                            value={billDiscountPerc}
                            onChange={(e) => handleBillDiscountPercChange(e.target.value)}
                            onFocus={handleSelectAll}
                             onKeyDown={(e) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  }}
                            className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                            placeholder="%"
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
                {/* <tr className="border-b border-themed dark:border-themed">
                  <td>
                    <button
                      type="button"
                      onClick={() => setIsLedgerModalOpen(true)}
                      className="px-2 py-1 font-medium text-left text-blue-800 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors w-full"
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
                      onChange={(e) => setOtherChargRemark(e.target.value)}
                      onFocus={handleSelectAll}

                    />
                  </td>
                  <td className="px-2 py-1 border-l border-themed dark:border-themed">
                    <input
                      type="number"
                      value={otherChargeAmt}
                      className="w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right"
                       onChange={(e) => {
                        const val = e.target.value;
                        setOtherChargAmt(val);
                        if (!val || val === '' || parseFloat(val) === 0) {
                          lastDistributedDetails.current = null; // force redistribution
                        }
                      }}
                      onFocus={handleSelectAll}
                      placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                      disabled={!selectedLedger}

                    />
                  </td>
                </tr> */}

                {/* Round Off */}
                {activateRoundOff && (
                  <tr className="border-b border-themed dark:border-themed">
                    <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                      {t("salesInvoice.form.footerSection.paymentSummery.roundOff")}
                    </td>
                    <td className="px-2 py-1 border-l border-themed dark:border-themed">
                      <select
                        value={roundOffType}
                        onChange={(e) => setRoundOffType(e.target.value)}
                        className="w-full bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none"
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
                          const val = e.target.value;
                          const roundOffDigits = generalSettings?.RoundOffDigit ?? 2;
                          const regex = new RegExp(`^\\d*(\\.\\d{0,${roundOffDigits}})?$`);
                          if (val === '' || regex.test(val)) {
                            setRoundOff(parseFloat(val) || 0);
                          }
                        }}
                        onFocus={handleSelectAll}
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

export default SalesReturnFooterSection;