import { useState, useMemo, useEffect, useRef } from "react";
import PaymentMode from "./FooterTabData/PaymentMode";
import RetentionData from "./FooterTabData/RetentionData";
import AdditionalCost from "./FooterTabData/AdditionalCost";
import OtherDetails from "./FooterTabData/OtherDetails";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import OtherChargeLedgerModal from "../SalesInvoice/FooterTabData/Otherchargeledgermodal";

const PurchaseInvoiceFooterSection = ({
    totals,
    formData,
    setFormData,
    otherChargeLedgers,
    bank,
    cash,
    getCurrentProductCode  // Add this prop
}) => {
    const { purchaseInvoicemasterId } = useParams();
    const isEditMode = Boolean(purchaseInvoicemasterId);
    const { t } = useTranslation();
    const { generalSettings, purchaseSettings } = useSelector((state) => state.settings);
    const { selectedBranchId, currentCurrency } = useAuth();

    const activateRoundOff = Boolean(generalSettings?.RoundOff);

    // Purchase History States
    const [productHistory, setProductHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyCache, setHistoryCache] = useState({});

    const [additionalCost, setAdditionalCost] = useState(0);
    const [additionalCostType, setAdditionalCostType] = useState("Cr");
    const [roundOff, setRoundOff] = useState(0);
    const [roundOffType, setRoundOffType] = useState("+");
    const [billDiscount, setBillDiscount] = useState(0);
    const [otherChargeRemark, setOtherChargRemark] = useState('');
    const [otherChargeAmt, setOtherChargAmt] = useState('');
    const [activeTab, setActiveTab] = useState("payment");
    const [isInitialized, setIsInitialized] = useState(false);
    const [dbTotalAmount, setDbTotalAmount] = useState(null);   // ← ADD
    const [userHasChanged, setUserHasChanged] = useState(false); // ← ADD
    const decimalPart = generalSettings?.decimalPart ?? 2;

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

    // Helper function to select all text on focus
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

        try {
            setHistoryLoading(true);

            const res = await axiosInstance.post('history/purchase', {
                productCode: productCode,
                branchId: null,
                currencyId: currentCurrency.currencyId,
                ledgerId: null
            });

            if (res.data?.status && res.data?.data) {
                const historyData = res.data.data.slice(0, 10);

                // Store in cache
                // setHistoryCache(prev => ({
                //     ...prev,
                //     [cacheKey]: historyData
                // }));

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
          if (isEditMode && formData?.otherChargeLedgerId && otherChargeLedgers?.length > 0 && !selectedLedger) {
            const matchedLedger = otherChargeLedgers.find(
              (ledger) => Number(ledger.ledgerId) === Number(formData.otherChargeLedgerId)
            );
            if (matchedLedger) {
              setSelectedLedger(matchedLedger);
            }
          }
        }, [isEditMode, formData?.otherChargeLedgerId, otherChargeLedgers, selectedLedger]);

useEffect(() => {
    if (!isInitialized && isEditMode && formData?.totalAmount !== undefined && formData?.totalAmount !== '') {
        const addCost = parseFloat(formData.additionalCost) || 0;
        setAdditionalCost(Math.abs(addCost));
        setAdditionalCostType(addCost >= 0 ? "Cr" : "Dr");

        const rOff = parseFloat(formData.roundoff) || 0;
        setRoundOff(Math.abs(rOff));
        setRoundOffType(rOff >= 0 ? "+" : "-");

        setBillDiscount(parseFloat(formData.billDiscount) || 0);
        setOtherChargRemark(formData.OtherChargeRemark || '');
        setOtherChargAmt(formData.othercharge || '');

        if (formData.otherChargeLedgerId) {
            setSelectedLedger({
                ledgerId: formData.otherChargeLedgerId,
                ledgerName: formData.otherChargeLedgerName || 'Other Charge'
            });
        }

        setDbTotalAmount(parseFloat(formData.totalAmount) || 0);
        setIsInitialized(true);
    }
}, [isEditMode, formData, isInitialized]);

    // const prevPurchaseDetailsRef = useRef(null);
    // useEffect(() => {
    //     if (!isInitialized) return;
    //     const current = JSON.stringify(formData.purchaseDetails);
    //     if (prevPurchaseDetailsRef.current !== null && prevPurchaseDetailsRef.current !== current) {
    //         setUserHasChanged(true);
    //     }
    //     prevPurchaseDetailsRef.current = current;
    // }, [formData.purchaseDetails, isInitialized]);
    const prevPurchaseDetailsRef = useRef(null);
const skipNextCompareRef = useRef(true); // skip first compare right after init

useEffect(() => {
    if (!isInitialized) return;

    // round amounts before stringifying so float drift doesn't trigger false positives
    const normalized = (formData.purchaseDetails || []).map(d => ({
        productCode: d.productCode,
        qty: d.qty,
        rate: Number(d.rate || 0).toFixed(decimalPart),
        amount: Number(d.amount || 0).toFixed(decimalPart),
    }));
    const current = JSON.stringify(normalized);

    if (skipNextCompareRef.current) {
        skipNextCompareRef.current = false;
        prevPurchaseDetailsRef.current = current;
        return;
    }

    if (prevPurchaseDetailsRef.current !== null && prevPurchaseDetailsRef.current !== current) {
        setUserHasChanged(true);
    }
    prevPurchaseDetailsRef.current = current;
}, [formData.purchaseDetails, isInitialized]);

    const finalGrandTotal = useMemo(() => {
        // In edit mode, show DB total until the user makes any change
        if (isEditMode && !userHasChanged && dbTotalAmount !== null) {
            return dbTotalAmount.toFixed(decimalPart);
        }

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
    }, [
        totals,
        additionalCost,
        additionalCostType,
        billDiscount,
        roundOff,
        roundOffType,
        otherChargeAmt,
        isEditMode,
        userHasChanged,
        dbTotalAmount,
        decimalPart,
    ]);
    // Distribute bill discount across all products
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
                    billDiscOnProduct: parseFloat(discountForRow.toFixed(decimalPart))
                };
            }
            return { ...detail, billDiscOnProduct: 0 };
        });
    };
    const distributeOtherCharge = (otherCharge, purchaseDetails) => {
    if (!purchaseDetails || purchaseDetails.length === 0) return purchaseDetails;

    const validRows = purchaseDetails.filter(d => d.productCode && d.qty > 0);
    if (validRows.length === 0) return purchaseDetails;

    const totalNetAmount = validRows.reduce((sum, d) => sum + parseFloat(d.netAmount || 0), 0);

    if (totalNetAmount === 0 || !otherCharge || parseFloat(otherCharge) === 0) {
        return purchaseDetails.map(d => ({ ...d, otherchargeOnProduct: 0 }));
    }

    const chargePercentage = (parseFloat(otherCharge) * 100) / totalNetAmount;

    return purchaseDetails.map(detail => {
        if (detail.productCode && detail.qty > 0) {
            const netValue = parseFloat(detail.netAmount || 0);
            const chargeForRow = (netValue * chargePercentage) / 100;
            return {
                ...detail,
                otherchargeOnProduct: parseFloat(chargeForRow.toFixed(decimalPart))
            };
        }
        return { ...detail, otherchargeOnProduct: 0 };
    });
};

useEffect(() => {
    if (formData.purchaseDetails && formData.purchaseDetails.length > 0) {
        let updatedPurchaseDetails = distributeBillDiscount(billDiscount, formData.purchaseDetails);
        updatedPurchaseDetails = distributeOtherCharge(otherChargeAmt, updatedPurchaseDetails);

        setFormData(prev => ({
            ...prev,
            additionalCost: additionalCostType === "Cr" ? additionalCost : -additionalCost,
            billDiscount,
            roundoff: roundOffType === "+" ? roundOff : -roundOff,
            othercharge: otherChargeAmt,
            OtherChargeRemark: otherChargeRemark,
            purchaseDetails: updatedPurchaseDetails,
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

    const tabs = [
        { id: "payment", label: t("salesInvoice.form.footerSection.tabs.paymentMode") },
        ...(purchaseSettings?.ActivatePurchaseRetention
            ? [{ id: "retention", label: t("salesInvoice.form.footerSection.tabs.retention") }]
            : []),
        { id: "other", label: t("salesInvoice.form.footerSection.tabs.otherDetails") },
    ];

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
            {/* Left Side - History Table + Tabs (60% on desktop, full width on mobile) */}
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
            </div>

            {/* Right Side - Payment Summary (40% on desktop, full width on mobile) */}
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
                                        value={Number(totals?.grandTotal || 0).toFixed(decimalPart)}
                                        className="w-full font-bold bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                                        readOnly
                                    />
                                </td>
                            </tr>

                            {/* Additional Cost */}
                            {/* <tr className="border-b border-themed dark:border-themed">
                                <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                                    {t("salesInvoice.form.footerSection.paymentSummery.additionalCost")}
                                </td>
                                <td className="px-2 py-1 border-l border-themed dark:border-themed">
                                    <select
                                        value={additionalCostType}
                                        onChange={(e) => { setAdditionalCostType(e.target.value); setUserHasChanged(true); }}
                                        className="w-full bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none"
                                    >
                                        <option value="Cr">Cr</option>
                                        <option value="Dr">Dr</option>
                                    </select>
                                </td>
                                <td colSpan={2} className="px-2 py-1 border-l border-themed dark:border-themed">
                                    <input
                                        type="number"
                                        // value={Number(additionalCost || 0).toFixed(decimalPart)}
                                        value={additionalCost}
                                        onChange={(e) => { setAdditionalCost(parseFloat(e.target.value) || 0); setUserHasChanged(true); }}
                                        onFocus={handleSelectAll}
                                        disabled={Number(totals?.grandTotal) <= 0}
                                        className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                                    />
                                </td>
                            </tr> */}

                            {/* Bill Discount */}
                            <tr className="border-b border-themed dark:border-themed">
                                <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                                    {t("salesInvoice.form.footerSection.paymentSummery.billDescount")}
                                </td>
                                <td colSpan={3} className="px-2 py-1 border-l border-themed dark:border-themed">
                                    <input
                                        type="number"
                                        value={billDiscount}
                                        onChange={(e) => { setBillDiscount(parseFloat(e.target.value) || 0); setUserHasChanged(true); }}
                                        onFocus={handleSelectAll}
                                         disabled={Number(totals?.grandTotal) <= 0}
                                        className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                                    />
                                </td>
                            </tr>

                            {/* Total Tax */}
                            {(generalSettings?.ActivateTax &&formData?.taxType==='Applicable to product') && (
                                <tr className="border-b border-themed dark:border-themed">
                                    <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                                        {t("salesInvoice.form.footerSection.paymentSummery.totalTax")}
                                    </td>
                                    <td colSpan={3} className="px-2 py-1 border-l border-themed dark:border-themed bg-secondary dark:bg-secondary">
                                        <input
                                            type="number"
                                            value={Number(totals?.totalTax || 0).toFixed(decimalPart)}
                                            className="w-full bg-transparent text-primary dark:text-primary focus:outline-none text-right"
                                            readOnly
                                        />
                                    </td>
                                </tr>
                            )}

                            {/* Other Charge */}
                            <tr className="border-b border-themed dark:border-themed">
                                <td className="px-2 py-1 font-medium text-secondary dark:text-secondary">
                                    <button
                                        type="button"
                                        onClick={() => setIsLedgerModalOpen(true)}
                                        className="text-blue-800 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors w-full text-left"
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
                                        onChange={(e) => { setOtherChargRemark(e.target.value); setUserHasChanged(true); }}
                                        onFocus={handleSelectAll}
                                    />
                                </td>
                                <td className="px-2 py-1 border-l border-themed dark:border-themed">
                                    <input
                                        type="number"
                                        max={0}
                                        onKeyDown={(e) => {
                                            if(e.key === "-" || e.key === "+") e.preventDefault()
                                        }}
                                        // value={otherChargeAmt === '' || Number(otherChargeAmt) === 0 ? '' : Number(otherChargeAmt).toFixed(decimalPart)}
                                        value = {otherChargeAmt}
                                        className="w-full bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted focus:outline-none text-right"
                                        onChange={(e) => { setOtherChargAmt(e.target.value); setUserHasChanged(true); }}
                                        onFocus={handleSelectAll}
                                           disabled={Number(totals?.grandTotal) <= 0||!selectedLedger}
                                        placeholder={t("salesInvoice.form.footerSection.paymentSummery.amntPlaceholder")}
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
                                            onChange={(e) => { setRoundOffType(e.target.value); setUserHasChanged(true); }}
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
                                                    setUserHasChanged(true); // ← ADD
                                                }
                                            }}
                                            onFocus={handleSelectAll}
                                               disabled={Number(totals?.grandTotal) <= 0}
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

export default PurchaseInvoiceFooterSection;