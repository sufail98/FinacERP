// src/components/pages/Master/OfferCreation/OfferForm.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tag, Table, Eraser, SaveAll, Filter } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import AlertBox from "@/components/common/AlertBox";
import Preloader from "@/components/common/Preloader";
import OfferCreationTable from "./OfferCreationTable";
import FilterPanel from "./FilterPanel";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";

const createEmptyRow = (id = 1, defaults = {}) => ({
    id, sn: id, productCode: '', productName: '', barcode: '', unitId: '',
    fromDate: defaults.fromDate || '', toDate: defaults.toDate || '',
    pricingLevelId: defaults.pricingLevelId || '',
    AmountBeforeDisc: 0, DiscPer: 0, DiscAmount: 0, salesPrice: 0, availableUnits: [],
});

const OfferForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const isEditMode = Boolean(editId);
    const { selectedBranchId, userId } = useAuth();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [finalError, setFinalError] = useState(null);
    const [errors, setErrors] = useState({});

    const [units, setUnits] = useState([]);
    const [pricingLevels, setPricingLevels] = useState([]);
    const [productMainGroups, setProductMainGroups] = useState([]);
    const [prodSubGroupByCatOne, setProdSubGroupByCatOne] = useState([]);
    const [prodSubGroupByCatTwo, setProdSubGroupByCatTwo] = useState([]);
    const [prodSubGroupByCatThree, setProdSubGroupByCatThree] = useState([]);
    const [prodSubGroupByCatFour, setProdSubGroupByCatFour] = useState([]);
    const [groupLoadings, setGroupLoadings] = useState({ mainGroup: false, group1: false, group2: false, group3: false, group4: false });

    const [header, setHeader] = useState({
        offerCode: "", offerName: "", fromDate: "", toDate: "",
        pricingLevel: "", branchId: "", IsApproved: false, IsActive: true,
    });

    const [rows, setRows] = useState([createEmptyRow(1)]);

    const headerRef = useRef(null);
    const fetchedRef = useRef(false);

    // ─── Helper to get pricing level value ───
    const getPLValue = (p) => p.PricingLevelId || p.pricingLevelId || p.id;
    const getPLLabel = (p) => p.PricingLevelName || p.pricingLevelName || p.name || '';

    // ─── Fetch dropdowns ───
    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchDropdowns();
    }, []);

    const fetchDropdowns = async () => {
        const fetchers = [
            { url: "product-main-groups", key: "mainGroup", setter: setProductMainGroups },
            { url: "get-subgroup-byId/category-1", key: "group1", setter: setProdSubGroupByCatOne },
            { url: "get-subgroup-byId/category-2", key: "group2", setter: setProdSubGroupByCatTwo },
            { url: "get-subgroup-byId/category-3", key: "group3", setter: setProdSubGroupByCatThree },
            { url: "get-subgroup-byId/category-4", key: "group4", setter: setProdSubGroupByCatFour },
        ];
        fetchers.forEach(({ key }) => setGroupLoadings(p => ({ ...p, [key]: true })));
        await Promise.allSettled(
            fetchers.map(async ({ url, key, setter }) => {
                try { const r = await axiosInstance.get(url); setter(r.data?.data || []); }
                catch (e) { console.error(e); }
                finally { setGroupLoadings(p => ({ ...p, [key]: false })); }
            })
        );
        try { const r = await axiosInstance.get("units"); setUnits(r.data?.data || []); } catch (e) { console.error(e); }
        try { const r = await axiosInstance.get("pricing-levels"); setPricingLevels(r.data?.data || []); } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (selectedBranchId && !isEditMode) setHeader(p => ({ ...p, branchId: selectedBranchId }));
    }, [selectedBranchId, isEditMode]);

    // In OfferForm.jsx — replace the edit useEffect (around line 100)

    // ─── Edit data ───
    useEffect(() => {
        if (!editId) return;
        (async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`offer-rate/get-offer-rate-byId/${editId}`);
                const d = res.data?.data;


                if (!d) return;
                setHeader({
                    offerCode: d.offerCode || "",
                    offerName: d.offerName || "",
                    fromDate: d.fromDate || "",
                    toDate: d.toDate || "",
                    pricingLevel: d.pricingLevel?.toString() || "",
                    branchId: d.branchId?.toString() || selectedBranchId?.toString() || "",
                    IsApproved: d.IsApproved || false,
                    IsActive: d.IsActive !== undefined ? d.IsActive : true,
                });

                // ★ FIX: API returns "details" not "offerDetails"
                const detailsArray = d.details || d.offerDetails || [];

                if (detailsArray.length) {
                    setRows(detailsArray.map((det, i) => ({
                        id: i + 1,
                        sn: i + 1,
                        productCode: det.productCode || "",
                        productName: det.productName || "",
                        barcode: det.barcode || "",
                        unitId: det.unitId?.toString() || "",
                        fromDate: det.fromDate || "",
                        toDate: det.toDate || "",
                        pricingLevelId: det.pricingLevelId?.toString() || "",
                        // ★ FIX: API returns strings like "3535.000000"
                        AmountBeforeDisc: parseFloat(det.AmountBeforeDisc) || 0,
                        DiscPer: parseFloat(det.DiscPer) || 0,
                        DiscAmount: parseFloat(det.DiscAmount) || 0,
                        salesPrice: parseFloat(det.salesPrice) || 0,
                        availableUnits: [],
                    })));
                }
            } catch (e) {
                console.error("Edit load error:", e);
                setAlert({ id: Date.now(), type: "error", message: e.response?.data?.message || "Failed to load" });
            } finally { setLoading(false); }
        })();
    }, [editId]);

    // ─── Ctrl+S ───
    useEffect(() => {
        const fn = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSubmit(); } };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [header, rows, editId]);

    // ─── Header change ───
    const handleHeaderChange = (e) => {
        const { name, value, type, checked } = e.target;
        const v = type === "checkbox" ? checked : value;
        setHeader(p => ({ ...p, [name]: v }));
        if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
        setFinalError(null);

        if (name === "fromDate" || name === "toDate") {
            setRows(prev => prev.map(r => ({ ...r, [name]: r[name] || v })));
        }
        if (name === "pricingLevel") {
            setRows(prev => prev.map(r => ({ ...r, pricingLevelId: r.pricingLevelId || v })));
        }
    };

    const handleHeaderKeyDown = (e) => {
        if (e.key !== "Enter" || e.target.tagName === "BUTTON") return;
        e.preventDefault();
        if (!headerRef.current) return;
        const els = Array.from(headerRef.current.querySelectorAll('input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled])')).filter(el => el.offsetParent !== null);
        const i = els.indexOf(e.target);
        if (i !== -1 && i < els.length - 1) els[i + 1].focus();
    };

    // ─── Filter apply ───
    const handleFilterApply = async (filterPayload) => {
        setIsFiltering(true);
        try {
            const res = await axiosInstance.post("offer-rate/filter", filterPayload);
            const products = res.data?.data || res.data || [];
            if (Array.isArray(products) && products.length > 0) {
                setRows(products.map((p, i) => ({
                    id: i + 1, sn: i + 1,
                    productCode: p.productCode || p.ProductCode || "",
                    productName: p.productName || p.ProductName || "",
                    barcode: p.barcode || p.Barcode || "",
                    unitId: p.unitId?.toString() || "",
                    fromDate: header.fromDate || "", toDate: header.toDate || "",
                    pricingLevelId: header.pricingLevel || "",
                    AmountBeforeDisc: parseFloat(p.salesPrice || p.SalesPrice || p.amount || 0),
                    DiscPer: 0, DiscAmount: 0,
                    salesPrice: parseFloat(p.salesPrice || p.SalesPrice || p.amount || 0),
                    availableUnits: p.units || [],
                })));
                setAlert({ id: Date.now(), type: "success", message: `${products.length} product(s) loaded` });
                setFilterOpen(false);
            } else {
                setAlert({ id: Date.now(), type: "info", message: "No products found" });
            }
        } catch (e) {
            setAlert({ id: Date.now(), type: "error", message: e.response?.data?.message || "Filter failed" });
        } finally { setIsFiltering(false); }
    };

    // ─── Validate & Submit ───
    const validate = () => {
        const e = {};
        if (!header.offerCode.trim()) e.offerCode = "Required";
        if (!header.offerName.trim()) e.offerName = "Required";
        if (!header.fromDate) e.fromDate = "Required";
        if (!header.toDate) e.toDate = "Required";
        if (!header.pricingLevel) e.pricingLevel = "Required";
        setErrors(e);
        if (Object.keys(e).length) return false;
        if (!rows.some(r => r.productCode?.trim())) { setFinalError("Add at least one product"); return false; }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setFinalError(null);
        try {
            const details = rows.filter(r => r.productCode?.trim()).map((r, i) => ({
                lineIndex: i + 1, productCode: r.productCode, barcode: r.barcode || "",
                unitId: parseInt(r.unitId) || 1, fromDate: r.fromDate || header.fromDate,
                toDate: r.toDate || header.toDate, pricingLevelId: parseInt(r.pricingLevelId) || parseInt(header.pricingLevel) || 1,
                AmountBeforeDisc: parseFloat(r.AmountBeforeDisc) || 0, DiscPer: parseFloat(r.DiscPer) || 0,
                DiscAmount: parseFloat(r.DiscAmount) || 0, salesPrice: parseFloat(r.salesPrice) || 0,
            }));
            const payload = {
                offerCode: header.offerCode, offerName: header.offerName,
                fromDate: header.fromDate, toDate: header.toDate,
                pricingLevel: parseInt(header.pricingLevel) || 1,
                branchId: parseInt(header.branchId) || parseInt(selectedBranchId) || 1,
                IsApproved: header.IsApproved, IsActive: header.IsActive,
                ...(isEditMode ? { ModifiedUser: userId } : { CreatedUser: userId?.toString() || "" }),
                offerDetails: details,
            };
            if (isEditMode) await axiosInstance.post(`offer-rate/update-offer-rate/${editId}`, payload);
            else await axiosInstance.post("offer-rate/save-offer-rate", payload);
            setAlert({ id: Date.now(), type: "success", message: isEditMode ? "Updated" : "Saved" });
            setTimeout(() => navigate("/master/offer-creation"), 500);
        } catch (e) {
            setFinalError(e.response?.data?.message || "Save failed");
        } finally { setSubmitting(false); }
    };

    const handleClear = () => {
        setHeader({ offerCode: "", offerName: "", fromDate: "", toDate: "", pricingLevel: "", branchId: selectedBranchId?.toString() || "", IsApproved: false, IsActive: true });
        setRows([createEmptyRow(1)]);
        setErrors({});
        setFinalError(null);
    };

    const productCount = rows.filter(r => r.productCode?.trim()).length;

    // ─── Shared styles ───
    const inputCls = (name) => `w-full px-2 py-1.5 text-sm rounded border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors ${errors[name] ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-gray-600"}`;
    const selectCls = (name) => `w-full px-2 py-1.5 text-sm rounded border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors ${errors[name] ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-gray-600"}`;
    const optionCls = "text-gray-900 bg-white dark:text-gray-100 dark:bg-[#242424]";
    const labelCls = "text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 block";

    if (loading) return (
        <div>
            <BreadCrumb routes={[{ title: "Master", url: "#" }, { title: "Offer Creation", url: "/master/offer-creation" }, { title: isEditMode ? "Edit" : "Create", url: "#" }]}
                heading={{ icon: Tag, title: isEditMode ? "Edit Offer" : "Create Offer" }} />
            <Preloader />
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-[#121212] min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: "Master", url: "#" }, { title: "Offer Creation", url: "/master/offer-creation" }, { title: isEditMode ? "Edit" : "Create", url: "#" }]}
                heading={{ icon: Tag, title: isEditMode ? "Edit Offer" : "Create Offer" }}
                actions={[
                    { label: t("listBtn"), icon: Table, type: "secondary", onClick: () => navigate("/master/offer-creation"), disabled: submitting },
                    ...(!isEditMode ? [{ label: t("clearBtn"), icon: Eraser, type: "secondary", onClick: handleClear, disabled: submitting }] : []),
                    { label: submitting ? t("saving") : `${t("save")} (Ctrl+S)`, icon: SaveAll, type: "primary", onClick: handleSubmit, disabled: submitting },
                ]}
            />

            <div className="px-3 py-2">
                <div className="max-w-[1500px] mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3">

                        {/* ═══ HEADER FIELDS ═══ */}
                        <div
                            ref={headerRef}
                            onKeyDown={handleHeaderKeyDown}
                            className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-3 gap-y-2 mb-3 p-3 bg-gray-50 dark:bg-[#141414] rounded border border-gray-200 dark:border-gray-700"
                        >
                            {/* Offer Code */}
                            <div>
                                <label className={labelCls}>Offer Code <span className="text-red-500">*</span></label>
                                <input type="text" name="offerCode" value={header.offerCode} onChange={handleHeaderChange} className={inputCls("offerCode")} placeholder="e.g. OFF-10" />
                                {errors.offerCode && <p className="text-[10px] text-red-500 mt-0.5">{errors.offerCode}</p>}
                            </div>

                            {/* Offer Name */}
                            <div className="lg:col-span-2">
                                <label className={labelCls}>Offer Name <span className="text-red-500">*</span></label>
                                <input type="text" name="offerName" value={header.offerName} onChange={handleHeaderChange} className={inputCls("offerName")} placeholder="e.g. Festival Offer" />
                                {errors.offerName && <p className="text-[10px] text-red-500 mt-0.5">{errors.offerName}</p>}
                            </div>

                            {/* From Date */}
                            <div>
                                <label className={labelCls}>From Date <span className="text-red-500">*</span></label>
                                <input type="date" name="fromDate" value={header.fromDate} onChange={handleHeaderChange} className={inputCls("fromDate")} />
                                {errors.fromDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.fromDate}</p>}
                            </div>

                            {/* To Date */}
                            <div>
                                <label className={labelCls}>To Date <span className="text-red-500">*</span></label>
                                <input type="date" name="toDate" value={header.toDate} onChange={handleHeaderChange} className={inputCls("toDate")} />
                                {errors.toDate && <p className="text-[10px] text-red-500 mt-0.5">{errors.toDate}</p>}
                            </div>

                            {/* Pricing Level */}
                            <div>
                                <label className={labelCls}>Pricing Level <span className="text-red-500">*</span></label>
                                <select name="pricingLevel" value={header.pricingLevel} onChange={handleHeaderChange} className={selectCls("pricingLevel")}>
                                    <option value="" className={optionCls}>Select</option>
                                    {pricingLevels.map((p, i) => (
                                        <option
                                            key={`hdr-pl-${getPLValue(p) || i}`}
                                            value={getPLValue(p)}
                                            className={optionCls}
                                        >
                                            {getPLLabel(p)}
                                        </option>
                                    ))}
                                </select>
                                {errors.pricingLevel && <p className="text-[10px] text-red-500 mt-0.5">{errors.pricingLevel}</p>}
                            </div>

                            {/* Checkboxes (edit only) */}
                            {isEditMode && (
                                <div className="flex items-end gap-3 pb-0.5">
                                    <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                                        <input type="checkbox" name="IsApproved" checked={header.IsApproved} onChange={handleHeaderChange} className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600" />
                                        Approved
                                    </label>
                                    <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                                        <input type="checkbox" name="IsActive" checked={header.IsActive} onChange={handleHeaderChange} className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600" />
                                        Active
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* ═══ TABLE HEADER BAR ═══ */}
                        <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <span className="h-1 w-4 rounded-full bg-[#4e2348] dark:bg-[#d4a0cc]" />
                                Offer Details
                                {productCount > 0 && <span className="text-[11px] font-normal text-gray-500">({productCount} item{productCount !== 1 ? "s" : ""})</span>}
                            </h3>
                            <button id="filter-trigger-btn" type="button" onClick={() => setFilterOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                                <Filter className="h-3.5 w-3.5" />
                                Load by Group
                            </button>
                        </div>

                        {/* ═══ TABLE ═══ */}
                        <OfferCreationTable
                            rows={rows}
                            setRows={setRows}
                            units={units}
                            pricingLevels={pricingLevels}
                            headerFromDate={header.fromDate}
                            headerToDate={header.toDate}
                            headerPricingLevel={header.pricingLevel}
                            loading={isFiltering}
                        />

                        {finalError && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 mt-3">{finalError}</div>
                        )}
                    </div>
                </div>
            </div>

            <FilterPanel
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                onApply={handleFilterApply}
                isFiltering={isFiltering}
                productMainGroups={productMainGroups}
                prodSubGroupByCatOne={prodSubGroupByCatOne}
                prodSubGroupByCatTwo={prodSubGroupByCatTwo}
                prodSubGroupByCatThree={prodSubGroupByCatThree}
                prodSubGroupByCatFour={prodSubGroupByCatFour}
                groupLoadings={groupLoadings}
            />
        </div>
    );
};

export default OfferForm;