import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import FooterDetails from "./FooterTabData/FooterDetails";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";

const SalesQuotationFooterSection = ({ totals, formData, setFormData, otherChargeLedgers, getCurrentProductCode, isTableFocused, onFocus }) => {
  const { saleQuotationId } = useParams();
  const isEditMode = Boolean(saleQuotationId);
  const { generalSettings, saleSettings } = useSelector((state) => state.settings);
  const activateRoundOff = Boolean(generalSettings?.RoundOff);

  const { t } = useTranslation();
  const { selectedBranchId, currentCurrency } = useAuth();

  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostType, setAdditionalCostType] = useState("Cr");
  const [roundOff, setRoundOff] = useState(0);
  const [roundOffType, setRoundOffType] = useState("+");
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountPerc, setBillDiscountPerc] = useState(0);
  const [billDiscountWithTaxInput, setBillDiscountWithTaxInput] = useState(0);
  const [otherChargeRemark, setOtherChargRemark] = useState('');
  const [otherChargeAmt, setOtherChargAmt] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  // ADD near other useRef declarations (near prevDetailsLengthRef)
  const lastDistributedDetails = useRef(null);

  // Track focus state for proper typing behavior
  const [isBillDiscWithTaxFocused, setIsBillDiscWithTaxFocused] = useState(false);
  const [hasTypedInBillDiscWithTax, setHasTypedInBillDiscWithTax] = useState(false);

  // History state
  const [productHistory, setProductHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCache, setHistoryCache] = useState({});



  // ── FIX: Track previous row count so we can detect additions/removals.
  const prevDetailsLengthRef = useRef(
    formData.quotationDetails ? formData.quotationDetails.length : 0
  );

  // Distribute bill discount proportionally across all filled rows
  const distributeBillDiscount = (discount, quotationDetails) => {
    if (!quotationDetails || quotationDetails.length === 0) return quotationDetails;

    const validRows = quotationDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return quotationDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || discount === 0) {
      return quotationDetails.map(d => ({ ...d, billDiscOnProduct: 0 }));
    }

    const discountPercentage = (discount * 100) / totalNetAmount;

    return quotationDetails.map(d => {
      if (d.productCode && d.qty > 0) {
        const netValue = parseFloat(d.netAmount || 0);
        return {
          ...d,
          billDiscOnProduct: parseFloat(
            ((netValue * discountPercentage) / 100).toFixed(generalSettings?.decimalPart || 2)
          )
        };
      }
      return { ...d, billDiscOnProduct: 0 };
    });
  };



  // ADD after distributeBillDiscount
  const distributeOtherCharge = (otherCharge, quotationDetails) => {
    if (!quotationDetails || quotationDetails.length === 0) return quotationDetails;

    const validRows = quotationDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return quotationDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || parseFloat(otherCharge || 0) === 0) {
      return quotationDetails.map(d => ({ ...d, otherchargeonproduct: 0 }));
    }

    const chargePercentage = (parseFloat(otherCharge) * 100) / totalNetAmount;

    return quotationDetails.map(d => {
      if (d.productCode && d.qty > 0) {
        const netValue = parseFloat(d.netAmount || 0);
        return {
          ...d,
          otherchargeonproduct: parseFloat(
            ((netValue * chargePercentage) / 100).toFixed(generalSettings?.decimalPart || 2)
          )
        };
      }
      return { ...d, otherchargeonproduct: 0 };
    });
  };

  // Bill discount handlers
  const applyBillDiscountAmount = (amountValue) => {
    const amount = parseFloat(amountValue) || 0;
    setBillDiscount(amount);
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings?.decimalPart || 2)));
  };

  const handleBillDiscountAmountChange = (amountValue) => {
    // allow empty, digits, and at most one decimal point while typing
    if (amountValue !== "" && !/^\d*\.?\d*$/.test(amountValue)) {
      return; // reject invalid characters, don't touch state
    }
    setBillDiscount(amountValue); // store raw string, preserves "12." ".5" etc.
    const amount = parseFloat(amountValue) || 0; // only parse for math
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const perc = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
    setBillDiscountPerc(parseFloat(perc.toFixed(generalSettings?.decimalPart || 2)));

    const taxRate = parseFloat(formData.quotationDetails?.[0]?.taxRate) || 15;
    const withTax = amount * (1 + taxRate / 100);
    setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings?.decimalPart || 2)));
};

 const handleBillDiscountPercChange = (percValue) => {
   // Allow only numbers and one decimal point
  if (percValue !== "" && !/^\d*\.?\d{0,2}$/.test(percValue)) {
    return;
  }
  // Don't allow values greater than 100
  if (percValue !== "" && parseFloat(percValue) > 100) {
    return;
  }
    // if (percValue !== "" && !/^\d*\.?\d*$/.test(percValue)) {
    //   return; // reject invalid characters, but don't touch state
    // }
    setBillDiscountPerc(percValue); // store raw string, preserves "1." "12." etc.
    const perc = parseFloat(percValue) || 0; // only parse for math
    const grandTotal = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    const amount = (grandTotal * perc) / 100;
    const calculatedAmount = parseFloat(amount.toFixed(generalSettings?.decimalPart || 2));
    setBillDiscount(calculatedAmount);

    const taxRate = parseFloat(formData.quotationDetails?.[0]?.taxRate) || 15;
    const withTax = calculatedAmount * (1 + taxRate / 100);
    setBillDiscountWithTaxInput(parseFloat(withTax.toFixed(generalSettings?.decimalPart || 2)));
};

  const handleBillDiscountWithTaxChange = (withTaxValue) => {
    setBillDiscountWithTaxInput(withTaxValue);
    const withTax = parseFloat(withTaxValue) || 0;
    const taxRate = parseFloat(formData.quotationDetails?.[0]?.taxRate) || 15;
    const preTaxDiscount = withTax / (1 + taxRate / 100);
    applyBillDiscountAmount(preTaxDiscount.toFixed(generalSettings?.decimalPart || 2));
  };

  // Sync ledger from formData (e.g. on edit-mode load)
  useEffect(() => {
    if (formData.otherChargeLedgerId && formData.otherChargeLedgerName) {
      setSelectedLedger({
        ledgerId: Number(formData.otherChargeLedgerId),
        ledgerName: formData.otherChargeLedgerName,
      });
      setOtherChargRemark(formData.OtherChargeRemark || formData.otherChargeLedgerName);
    }
  }, [formData.otherChargeLedgerId, formData.otherChargeLedgerName]);

  const handleSelectAll = (e) => e.target.select();

  // Edit-mode initialization
  useEffect(() => {
    if (isEditMode && formData && !isInitialized) {
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
          ledgerId: Number(formData.otherChargeLedgerId),
          ledgerName: formData.otherChargeLedgerName || 'Other Charge'
        });
      }

      setIsInitialized(true);
    }
  }, [isEditMode, formData, isInitialized, totals]);

  const handleLedgerSelect = (ledger) => {
    setSelectedLedger(ledger);
    setOtherChargRemark(ledger.ledgerName);
    setFormData(prev => ({
      ...prev,
      otherChargeLedgerId: ledger.ledgerId,
      otherChargeLedgerName: ledger.ledgerName,
      OtherChargeRemark: ledger.ledgerName,
    }));
  };

  // Grand total
  const finalGrandTotal = useMemo(() => {
    let base = parseFloat(totals?.grandTotal || 0) + parseFloat(totals?.totalTax || 0);
    base += parseFloat(otherChargeAmt || 0);
    base += additionalCostType === "Cr" ? parseFloat(additionalCost || 0) : -parseFloat(additionalCost || 0);
    base -= parseFloat(billDiscount || 0);
    base += roundOffType === "+" ? parseFloat(roundOff || 0) : -parseFloat(roundOff || 0);
    return base.toFixed(generalSettings?.decimalPart ?? 2);
  }, [totals, additionalCost, additionalCostType, billDiscount, roundOff, roundOffType, otherChargeAmt]);

  const detailesRef = useRef(formData.quotationDetails);
  useEffect(() => {
    detailesRef.current = formData.quotationDetails;
  }, [formData.quotationDetails]);


  // REPLACE the existing large useEffect that calls distributeBillDiscount and setFormData
  // useEffect(() => {
  //   const details = detailesRef.current;
  //   const currentLength = details ? details.length : 0;

  //   const rowCountChanged = currentLength !== prevDetailsLengthRef.current;
  //   prevDetailsLengthRef.current = currentLength;

  //   if (details && details.length > 0) {
  //     const afterBillDisc = distributeBillDiscount(billDiscount, details);
  //     const updatedQuotationDetails = distributeOtherCharge(otherChargeAmt, afterBillDisc);

  //     const detailsString = JSON.stringify(
  //       updatedQuotationDetails.map(d => ({
  //         b: d.billDiscOnProduct,
  //         o: d.otherchargeonproduct
  //       }))
  //     );

  //     if (detailsString !== lastDistributedDetails.current || rowCountChanged) {
  //       lastDistributedDetails.current = detailsString;

  //       setFormData(prev => ({
  //         ...prev,
  //         additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
  //         billDiscount,
  //         billDiscountWithTax: billDiscountWithTaxInput || prev.billDiscountWithTax,
  //         roundOff: roundOffType === "+" ? roundOff : -roundOff,
  //         othercharge: otherChargeAmt,
  //         OtherChargeRemark: otherChargeRemark,
  //         quotationDetails: updatedQuotationDetails,
  //         totalAmount: finalGrandTotal,
  //       }));
  //     }
  //   } else {
  //     setFormData(prev => ({
  //       ...prev,
  //       additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
  //       billDiscount,
  //       billDiscountWithTax: billDiscountWithTaxInput || prev.billDiscountWithTax,
  //       roundOff: roundOffType === "+" ? roundOff : -roundOff,
  //       othercharge: otherChargeAmt,
  //       OtherChargeRemark: otherChargeRemark,
  //       totalAmount: finalGrandTotal,
  //     }));
  //   }
  // }, [
  //   additionalCost,
  //   additionalCostType,
  //   billDiscount,
  //   billDiscountWithTaxInput,
  //   roundOff,
  //   roundOffType,
  //   otherChargeAmt,
  //   otherChargeRemark,
  //   finalGrandTotal,
  //   formData.quotationDetails,
  // ]);

  // REPLACE the existing large useEffect that calls distributeBillDiscount and setFormData
useEffect(() => {
  const details = detailesRef.current;
  const currentLength = details ? details.length : 0;

  const rowCountChanged = currentLength !== prevDetailsLengthRef.current;
  prevDetailsLengthRef.current = currentLength;

  // These scalar footer fields must ALWAYS be pushed to formData on every
  // relevant change, regardless of whether the per-row distribution changed.
  const baseUpdate = {
    additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
    billDiscount,
    roundOff: roundOffType === "+" ? roundOff : -roundOff,
    othercharge: otherChargeAmt,
    OtherChargeRemark: otherChargeRemark,
    totalAmount: finalGrandTotal,
  };

  if (details && details.length > 0) {
    const afterBillDisc = distributeBillDiscount(billDiscount, details);
    const updatedQuotationDetails = distributeOtherCharge(otherChargeAmt, afterBillDisc);

    const detailsString = JSON.stringify(
      updatedQuotationDetails.map(d => ({
        b: d.billDiscOnProduct,
        o: d.otherchargeonproduct
      }))
    );

    // This only decides whether the per-row quotationDetails replacement is
    // needed (to avoid unnecessary re-renders / effect loops). It must NOT
    // gate the scalar fields above — that was the bug: roundOff, additionalCost,
    // othercharge etc. were silently dropped whenever billDiscount and
    // otherChargeAmt were both 0, because detailsString never changed in that case.
    const distributionChanged = detailsString !== lastDistributedDetails.current || rowCountChanged;
    if (distributionChanged) {
      lastDistributedDetails.current = detailsString;
    }

    setFormData(prev => ({
      ...prev,
      ...baseUpdate,
      billDiscountWithTax: billDiscountWithTaxInput || prev.billDiscountWithTax,
      ...(distributionChanged ? { quotationDetails: updatedQuotationDetails } : {}),
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      ...baseUpdate,
      billDiscountWithTax: billDiscountWithTaxInput || prev.billDiscountWithTax,
    }));
  }
}, [
  additionalCost,
  additionalCostType,
  billDiscount,
  billDiscountWithTaxInput,
  roundOff,
  roundOffType,
  otherChargeAmt,
  otherChargeRemark,
  finalGrandTotal,
  formData.quotationDetails,
]);

  // ── FIX 2: Re-distribute whenever a row is added or removed.
  //           Uses length comparison to avoid running on every keystroke.
  useEffect(() => {
    const details = formData.quotationDetails;
    if (!details) return;

    const currentLength = details.length;
    if (currentLength === prevDetailsLengthRef.current) return; // no structural change
    prevDetailsLengthRef.current = currentLength;

    if (billDiscount === 0) return; // nothing to distribute

    const updatedQuotationDetails = distributeBillDiscount(billDiscount, details);
    setFormData(prev => ({
      ...prev,
      quotationDetails: updatedQuotationDetails,
    }));
  }, [formData.quotationDetails, billDiscount]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, totalAmount: finalGrandTotal, grandTotal: finalGrandTotal }));
  }, [finalGrandTotal]);

  useEffect(() => {
    if (formData.ledgerId && isTableFocused) {
      fetchQuotationHistory();
    } else {
      setProductHistory([]);
    }
  }, [formData.quotationDetails, getCurrentProductCode, isTableFocused]);

  useEffect(() => {
    if (formData.ledgerId) {
      setHistoryCache({});
    }
  }, [formData.ledgerId]);

  const fetchQuotationHistory = async () => {
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
        history_type: "Sales",
        ledger_id: formData.ledgerId,
        voucher_type: "Sales Invoice"
      });

      if (res.data?.status && res.data?.data) {
        const historyData = res.data.data.slice(0, 10);
        setHistoryCache(prev => ({ ...prev, [cacheKey]: historyData }));
        setProductHistory(historyData);
      } else {
        setProductHistory([]);
      }
    } catch (error) {
      console.error('Error fetching quotation product movement:', error);
      setProductHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-6 gap-2 lg:gap-1 mt-2"
      onFocus={onFocus}
    >
      {/* Left Side */}
      <div className="lg:col-span-4 order-2 lg:order-1">
        {productHistory.length > 0 ? (
          <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed mb-2">
            <div className="px-3 py-2 border-b border-themed dark:border-themed bg-secondary dark:bg-secondary">
              <h3 className="text-sm font-semibold text-primary dark:text-primary">
                {t("salesInvoice.form.footerSection.productHistory.title") || "Product Quotation History"}
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
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">{Number(item.Qty).toFixed(generalSettings?.decimalPart ?? 2)}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed">{item.Unit}</td>
                      <td className="px-2 py-1 text-primary dark:text-primary border-b border-themed text-right">{Number(item.Rate).toFixed(generalSettings?.decimalPart ?? 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed">
            <div className="bg-primary dark:bg-primary">
              <FooterDetails formData={formData} setFormData={setFormData} />
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Payment Summary */}
      <div className="lg:col-span-2 order-1 lg:order-2 rounded">
        <div className="bg-primary dark:bg-primary rounded border border-themed dark:border-themed text-xs overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>

            <tbody>
              {/* Total Amount */}
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
                          type="text"
                          value={billDiscountPerc}
                          onChange={(e) => handleBillDiscountPercChange(e.target.value)}
                          onFocus={handleSelectAll}
                          className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                          placeholder="%"
                          disabled = {Number(totals?.grandTotal) <=0 }
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
                         disabled = {Number(totals?.grandTotal) <=0 }
                      />
                    </td>
                  )}

                  {/* Amount field */}
                  {saleSettings?.showBillDiscountAmount ? (
                    <td className="px-2 py-1 border-l border-themed dark:border-themed">
                      <input
                        type="text"
                        value={billDiscount}
                        min={0}
                        onChange={(e) => handleBillDiscountAmountChange(e.target.value)}
                        onFocus={handleSelectAll}
                        onKeyDown={(e) => {
                          if(e.key === "-" || e.key === "e") e.preventDefault()
                        }}
                       disabled = {Number(totals?.grandTotal) <=0 }
                        className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                        placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
                      />
                    </td>
                  ) : (
                    <td className="border-l border-themed dark:border-themed" />
                  )}
                </tr>
              )}

              {/* Other Charge */}
              <tr className="border-b border-themed dark:border-themed">
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
                    readOnly
                    className="w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none cursor-default"
                    placeholder={t("salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder")}
                  />
                </td>
                <td className="px-2 py-1 border-l border-themed dark:border-themed">
                  <input
                    type="number"
                    value={otherChargeAmt}
                    min={0}
                    onKeyDown={(e) => {
                      if(e.key === "-" || e.key === "+") e.preventDefault()
                    }}
                    disabled={!selectedLedger || Number(totals?.grandTotal) <=0 } 
                    className={`w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right ${!selectedLedger ? "opacity-40 cursor-not-allowed" : ""}`}
                    // REPLACE onChange on the Other Charge amount input
                    onChange={(e) => {
                      const val = e.target.value;
                      setOtherChargAmt(val);
                      if (!val || val === '' || parseFloat(val) === 0) {
                        lastDistributedDetails.current = null; // force redistribution
                      }
                    }}
                    onFocus={handleSelectAll}
                    placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}

                  />
                </td>
              </tr>

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
                       disabled = {Number(totals?.grandTotal) <=0 }
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

      <OtherChargeLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        onSelect={handleLedgerSelect}
        currentLedgerId={Number(selectedLedger?.ledgerId || formData.otherChargeLedgerId || 0)}
        otherChargeLedgers={otherChargeLedgers}
      />
    </div>
  );
};

export default SalesQuotationFooterSection;