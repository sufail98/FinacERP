// src/components/pages/Master/OfferCreation/AddOffer.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import useAuth from "@/redux/hook/auth/useAuth";
import OfferTable from "@/components/common/OfferTable";
import { X, Save, Tag, Filter, ChevronDown, Loader2, RotateCcw } from "lucide-react";

const EMPTY_DETAIL_ROW = {
    lineIndex: "",
    productCode: "",
    barcode: "",
    unitId: "",
    fromDate: "",
    toDate: "",
    pricingLevelId: "",
    AmountBeforeDisc: "",
    DiscPer: "",
    DiscAmount: "",
    salesPrice: "",
};

const AddOffer = ({ open, handleClose, editId, onSuccess }) => {
    const { t } = useTranslation();
    const isEditMode = Boolean(editId);
    const { selectedBranchId, userId } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [alert, setAlert] = useState(null);
    const [finalError, setFinalError] = useState(null);
    const [units, setUnits] = useState([]);
    const [pricingLevels, setPricingLevels] = useState([]);

    // ──── Filter / Group Dropdown Data ────
    const [productMainGroups, setProductMainGroups] = useState([]);
    const [prodSubGroupByCatOne, setProdSubGroupByCatOne] = useState([]);
    const [prodSubGroupByCatTwo, setProdSubGroupByCatTwo] = useState([]);
    const [prodSubGroupByCatThree, setProdSubGroupByCatThree] = useState([]);
    const [prodSubGroupByCatFour, setProdSubGroupByCatFour] = useState([]);

    const [groupLoadings, setGroupLoadings] = useState({
        mainGroup: false,
        group1: false,
        group2: false,
        group3: false,
        group4: false,
    });

    // Filter state
    const [filterData, setFilterData] = useState({
        maingroup: "",
        group1: "",
        group2: "",
        group3: "",
        group4: "",
    });

    // Dropdown visibility states for filter
    const [showMainGroupDropdown, setShowMainGroupDropdown] = useState(false);
    const [showGroup1Dropdown, setShowGroup1Dropdown] = useState(false);
    const [showGroup2Dropdown, setShowGroup2Dropdown] = useState(false);
    const [showGroup3Dropdown, setShowGroup3Dropdown] = useState(false);
    const [showGroup4Dropdown, setShowGroup4Dropdown] = useState(false);

    // Dropdown refs
    const mainGroupDropdownRef = useRef(null);
    const group1DropdownRef = useRef(null);
    const group2DropdownRef = useRef(null);
    const group3DropdownRef = useRef(null);
    const group4DropdownRef = useRef(null);

    // Header form data
    const [headerData, setHeaderData] = useState({
        offerCode: "",
        offerName: "",
        fromDate: "",
        toDate: "",
        pricingLevel: "",
        branchId: "",
        IsApproved: false,
        IsActive: true,
    });

    // Detail rows
    const [detailRows, setDetailRows] = useState([{ ...EMPTY_DETAIL_ROW, lineIndex: 1 }]);

    const [headerErrors, setHeaderErrors] = useState({});
    const headerRef = useRef(null);

    // ════════════════════════════════════════════════════════
    // CLICK OUTSIDE HANDLER FOR ALL FILTER DROPDOWNS
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mainGroupDropdownRef.current && !mainGroupDropdownRef.current.contains(event.target)) {
                setShowMainGroupDropdown(false);
            }
            if (group1DropdownRef.current && !group1DropdownRef.current.contains(event.target)) {
                setShowGroup1Dropdown(false);
            }
            if (group2DropdownRef.current && !group2DropdownRef.current.contains(event.target)) {
                setShowGroup2Dropdown(false);
            }
            if (group3DropdownRef.current && !group3DropdownRef.current.contains(event.target)) {
                setShowGroup3Dropdown(false);
            }
            if (group4DropdownRef.current && !group4DropdownRef.current.contains(event.target)) {
                setShowGroup4Dropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ════════════════════════════════════════════════════════
    // FETCH DROPDOWN DATA
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        if (open) {
            fetchAllDropdownData();
        }
    }, [open]);

    const fetchGroupData = async (endpoint, stateKey, setStateFunction) => {
        setGroupLoadings((prev) => ({ ...prev, [stateKey]: true }));
        try {
            const response = await axiosInstance.get(endpoint);
            setStateFunction(response.data?.data || []);
        } catch (error) {
            console.error(`Error fetching ${stateKey}:`, error);
        } finally {
            setGroupLoadings((prev) => ({ ...prev, [stateKey]: false }));
        }
    };

    const fetchAllDropdownData = async () => {
        const endpoints = [
            { url: "product-main-groups", key: "mainGroup", setter: setProductMainGroups },
            { url: "get-subgroup-byId/category-1", key: "group1", setter: setProdSubGroupByCatOne },
            { url: "get-subgroup-byId/category-2", key: "group2", setter: setProdSubGroupByCatTwo },
            { url: "get-subgroup-byId/category-3", key: "group3", setter: setProdSubGroupByCatThree },
            { url: "get-subgroup-byId/category-4", key: "group4", setter: setProdSubGroupByCatFour },
        ];

        await Promise.all(
            endpoints.map(({ url, key, setter }) => fetchGroupData(url, key, setter))
        );

        // Also fetch units and pricing levels
        try {
            const unitsRes = await axiosInstance.get("units");
            if (unitsRes.data?.data) setUnits(unitsRes.data.data);
        } catch (error) {
            console.error("Error fetching units:", error);
        }

        try {
            const pricingRes = await axiosInstance.get("pricing-levels");
            if (pricingRes.data?.data) setPricingLevels(pricingRes.data.data);
        } catch (error) {
            console.error("Error fetching pricing levels:", error);
        }
    };

    // ════════════════════════════════════════════════════════
    // FILTER API CALL
    // ════════════════════════════════════════════════════════
    const handleApplyFilter = async () => {
        if (!filterData.maingroup) {
            setAlert({ id: Date.now(), type: "error", message: "Please select at least the Main Group to filter" });
            return;
        }

        setIsFiltering(true);
        setFinalError(null);

        try {
            const payload = {
                maingroup: filterData.maingroup || null,
                group1: filterData.group1 || null,
                group2: filterData.group2 || null,
                group3: filterData.group3 || null,
                group4: filterData.group4 || null,
            };

            const response = await axiosInstance.post("offer-rate/filter", payload);
            const products = response.data?.data || response.data || [];

            if (Array.isArray(products) && products.length > 0) {
                const newRows = products.map((product, idx) => ({
                    lineIndex: idx + 1,
                    productCode: product.productCode || product.ProductCode || "",
                    barcode: product.barcode || product.Barcode || "",
                    unitId: product.unitId?.toString() || product.UnitId?.toString() || "",
                    fromDate: headerData.fromDate || "",
                    toDate: headerData.toDate || "",
                    pricingLevelId: headerData.pricingLevel || "",
                    AmountBeforeDisc: product.salesPrice?.toString() || product.SalesPrice?.toString() || product.amount?.toString() || "",
                    DiscPer: "",
                    DiscAmount: "",
                    salesPrice: product.salesPrice?.toString() || product.SalesPrice?.toString() || product.amount?.toString() || "",
                }));

                setDetailRows(newRows);
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: `${products.length} product(s) loaded from filter`,
                });
            } else {
                setAlert({
                    id: Date.now(),
                    type: "info",
                    message: "No products found for the selected filter criteria",
                });
            }
        } catch (error) {
            console.error("Error applying filter:", error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Failed to fetch filtered products",
            });
        } finally {
            setIsFiltering(false);
        }
    };

    const handleClearFilter = () => {
        setFilterData({
            maingroup: "",
            group1: "",
            group2: "",
            group3: "",
            group4: "",
        });
    };

    // ════════════════════════════════════════════════════════
    // SET BRANCH ID
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        if (selectedBranchId && !isEditMode) {
            setHeaderData((prev) => ({ ...prev, branchId: selectedBranchId }));
        }
    }, [selectedBranchId, isEditMode]);

    // ════════════════════════════════════════════════════════
    // FETCH EDIT DATA
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        const fetchEditData = async () => {
            if (!editId || !open || !isEditMode) return;

            setIsLoading(true);
            try {
                const response = await axiosInstance.get(`offer-rate/get-offer-rate-byId/${editId}`);
                if (response.data?.data) {
                    const d = response.data.data;
                    setHeaderData({
                        offerCode: d.offerCode || "",
                        offerName: d.offerName || "",
                        fromDate: d.fromDate || "",
                        toDate: d.toDate || "",
                        pricingLevel: d.pricingLevel?.toString() || "",
                        branchId: d.branchId?.toString() || selectedBranchId?.toString() || "",
                        IsApproved: d.IsApproved || false,
                        IsActive: d.IsActive !== undefined ? d.IsActive : true,
                    });

                    if (d.offerDetails && Array.isArray(d.offerDetails) && d.offerDetails.length > 0) {
                        setDetailRows(
                            d.offerDetails.map((detail, idx) => ({
                                lineIndex: detail.lineIndex || idx + 1,
                                productCode: detail.productCode || "",
                                barcode: detail.barcode || "",
                                unitId: detail.unitId?.toString() || "",
                                fromDate: detail.fromDate || "",
                                toDate: detail.toDate || "",
                                pricingLevelId: detail.pricingLevelId?.toString() || "",
                                AmountBeforeDisc: detail.AmountBeforeDisc?.toString() || "",
                                DiscPer: detail.DiscPer?.toString() || "",
                                DiscAmount: detail.DiscAmount?.toString() || "",
                                salesPrice: detail.salesPrice?.toString() || "",
                            }))
                        );
                    }
                }
            } catch (error) {
                console.error("Error fetching offer data:", error);
                setAlert({
                    id: Date.now(),
                    type: "error",
                    message: error.response?.data?.message || "Failed to fetch offer data",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEditData();
    }, [editId, open]);

    // ════════════════════════════════════════════════════════
    // RESET FORM WHEN MODAL OPENS FOR NEW
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        if (open && !isEditMode) {
            setHeaderData({
                offerCode: "",
                offerName: "",
                fromDate: "",
                toDate: "",
                pricingLevel: "",
                branchId: selectedBranchId?.toString() || "",
                IsApproved: false,
                IsActive: true,
            });
            setDetailRows([{ ...EMPTY_DETAIL_ROW, lineIndex: 1 }]);
            setFilterData({ maingroup: "", group1: "", group2: "", group3: "", group4: "" });
            setHeaderErrors({});
            setAlert(null);
            setFinalError(null);
        }
    }, [open, isEditMode, selectedBranchId]);

    // ════════════════════════════════════════════════════════
    // CTRL+S TO SAVE
    // ════════════════════════════════════════════════════════
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSubmit();
            }
        };
        if (open) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, headerData, detailRows, editId]);

    // ════════════════════════════════════════════════════════
    // HEADER CHANGE
    // ════════════════════════════════════════════════════════
    const handleHeaderChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;

        setHeaderData((prev) => ({ ...prev, [name]: newValue }));

        if (headerErrors[name]) {
            setHeaderErrors((prev) => ({ ...prev, [name]: "" }));
        }
        setFinalError(null);

        // Sync header dates to detail rows if they have no dates
        if (name === "fromDate" || name === "toDate") {
            setDetailRows((prev) =>
                prev.map((row) => ({
                    ...row,
                    [name]: row[name] || newValue,
                }))
            );
        }

        // Sync pricing level
        if (name === "pricingLevel") {
            setDetailRows((prev) =>
                prev.map((row) => ({
                    ...row,
                    pricingLevelId: row.pricingLevelId || newValue,
                }))
            );
        }
    };

    // ════════════════════════════════════════════════════════
    // CELL CHANGE (Detail Table)
    // ════════════════════════════════════════════════════════
    const handleCellChange = useCallback(
        (rowIndex, key, value) => {
            setDetailRows((prev) => {
                const updated = [...prev];
                updated[rowIndex] = { ...updated[rowIndex], [key]: value };

                // Auto-calculate discount amount and sales price
                if (key === "AmountBeforeDisc" || key === "DiscPer") {
                    const amountBefore = parseFloat(updated[rowIndex].AmountBeforeDisc) || 0;
                    const discPer = parseFloat(updated[rowIndex].DiscPer) || 0;
                    const discAmount = (amountBefore * discPer) / 100;
                    const salesPrice = amountBefore - discAmount;

                    updated[rowIndex].DiscAmount = discAmount > 0 ? discAmount.toFixed(2) : "";
                    updated[rowIndex].salesPrice = salesPrice > 0 ? salesPrice.toFixed(2) : "";
                }

                if (key === "DiscAmount") {
                    const amountBefore = parseFloat(updated[rowIndex].AmountBeforeDisc) || 0;
                    const discAmount = parseFloat(value) || 0;
                    const discPer = amountBefore > 0 ? (discAmount / amountBefore) * 100 : 0;
                    const salesPrice = amountBefore - discAmount;

                    updated[rowIndex].DiscPer = discPer > 0 ? discPer.toFixed(2) : "";
                    updated[rowIndex].salesPrice = salesPrice > 0 ? salesPrice.toFixed(2) : "";
                }

                // Auto-fill dates and pricing from header
                if (key === "productCode" && value) {
                    if (!updated[rowIndex].fromDate) updated[rowIndex].fromDate = headerData.fromDate;
                    if (!updated[rowIndex].toDate) updated[rowIndex].toDate = headerData.toDate;
                    if (!updated[rowIndex].pricingLevelId)
                        updated[rowIndex].pricingLevelId = headerData.pricingLevel;
                }

                return updated;
            });

            setFinalError(null);
        },
        [headerData]
    );

    // ════════════════════════════════════════════════════════
    // ADD / DELETE ROW
    // ════════════════════════════════════════════════════════
    const handleAddRow = useCallback(() => {
        setDetailRows((prev) => {
            const newLineIndex = prev.length > 0 ? Math.max(...prev.map((r) => r.lineIndex || 0)) + 1 : 1;
            return [
                ...prev,
                {
                    ...EMPTY_DETAIL_ROW,
                    lineIndex: newLineIndex,
                    fromDate: headerData.fromDate,
                    toDate: headerData.toDate,
                    pricingLevelId: headerData.pricingLevel,
                },
            ];
        });
    }, [headerData]);

    const handleDeleteRow = useCallback(
        (rowIndex) => {
            setDetailRows((prev) => {
                if (prev.length <= 1) {
                    return [
                        {
                            ...EMPTY_DETAIL_ROW,
                            lineIndex: 1,
                            fromDate: headerData.fromDate,
                            toDate: headerData.toDate,
                            pricingLevelId: headerData.pricingLevel,
                        },
                    ];
                }
                const updated = prev.filter((_, idx) => idx !== rowIndex);
                return updated.map((row, idx) => ({ ...row, lineIndex: idx + 1 }));
            });
        },
        [headerData]
    );

    // ════════════════════════════════════════════════════════
    // FOOTER TOTALS
    // ════════════════════════════════════════════════════════
    const footerData = useMemo(() => {
        const totalAmountBefore = detailRows.reduce(
            (sum, row) => sum + (parseFloat(row.AmountBeforeDisc) || 0),
            0
        );
        const totalDiscAmount = detailRows.reduce(
            (sum, row) => sum + (parseFloat(row.DiscAmount) || 0),
            0
        );
        const totalSalesPrice = detailRows.reduce(
            (sum, row) => sum + (parseFloat(row.salesPrice) || 0),
            0
        );

        return {
            SNo: "",
            productCode: "Total",
            barcode: "",
            unitId: "",
            fromDate: "",
            toDate: "",
            pricingLevelId: "",
            AmountBeforeDisc: totalAmountBefore > 0 ? totalAmountBefore.toFixed(2) : "",
            DiscPer: "",
            DiscAmount: totalDiscAmount > 0 ? totalDiscAmount.toFixed(2) : "",
            salesPrice: totalSalesPrice > 0 ? totalSalesPrice.toFixed(2) : "",
        };
    }, [detailRows]);

    // ════════════════════════════════════════════════════════
    // TABLE COLUMNS
    // ════════════════════════════════════════════════════════
    const tableColumns = useMemo(() => {
        const unitOptions = units.map((u) => ({
            value: u.unitId?.toString() || u.id?.toString(),
            label: u.UnitName || u.unitName || u.name || u.unitCode,
        }));

        const pricingOptions = pricingLevels.map((p) => ({
            value: p.pricingLevelId?.toString() || p.id?.toString(),
            label: p.pricingLevelName || p.name,
        }));

        return [
            { key: "SNo", label: "S.No", width: "50px", editable: false },
            {
                key: "productCode",
                label: "Product Code",
                width: "130px",
                editable: true,
                type: "text",
                required: true,
                placeholder: "Enter code",
            },
            { key: "barcode", label: "Barcode", width: "120px", editable: true, type: "text", placeholder: "Barcode" },
            { key: "unitId", label: "Unit", width: "100px", editable: true, type: "select", options: unitOptions },
            { key: "fromDate", label: "From Date", width: "130px", editable: true, type: "date" },
            { key: "toDate", label: "To Date", width: "130px", editable: true, type: "date" },
            {
                key: "pricingLevelId",
                label: "Pricing Level",
                width: "120px",
                editable: true,
                type: "select",
                options: pricingOptions,
            },
            {
                key: "AmountBeforeDisc",
                label: "Amount Before Disc",
                width: "150px",
                editable: true,
                type: "number",
                align: "right",
                placeholder: "0.00",
                step: "0.01",
            },
            {
                key: "DiscPer",
                label: "Disc %",
                width: "90px",
                editable: true,
                type: "number",
                align: "right",
                placeholder: "0",
                step: "0.01",
            },
            {
                key: "DiscAmount",
                label: "Disc Amount",
                width: "120px",
                editable: true,
                type: "number",
                align: "right",
                placeholder: "0.00",
                step: "0.01",
            },
            {
                key: "salesPrice",
                label: "Sales Price",
                width: "120px",
                editable: false,
                type: "number",
                align: "right",
            },
        ];
    }, [units, pricingLevels]);

    // ════════════════════════════════════════════════════════
    // VALIDATE
    // ════════════════════════════════════════════════════════
    const validate = () => {
        const errors = {};
        if (!headerData.offerCode.trim()) errors.offerCode = "Offer Code is required";
        if (!headerData.offerName.trim()) errors.offerName = "Offer Name is required";
        if (!headerData.fromDate) errors.fromDate = "From Date is required";
        if (!headerData.toDate) errors.toDate = "To Date is required";
        if (!headerData.pricingLevel) errors.pricingLevel = "Pricing Level is required";

        setHeaderErrors(errors);

        if (Object.keys(errors).length > 0) return false;

        const validRows = detailRows.filter((r) => r.productCode?.trim());
        if (validRows.length === 0) {
            setFinalError("Please add at least one product in the offer details");
            return false;
        }

        return true;
    };

    // ════════════════════════════════════════════════════════
    // SUBMIT
    // ════════════════════════════════════════════════════════
    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        setFinalError(null);

        try {
            const validDetails = detailRows
                .filter((r) => r.productCode?.trim())
                .map((row, idx) => ({
                    lineIndex: idx + 1,
                    productCode: row.productCode,
                    barcode: row.barcode || "",
                    unitId: parseInt(row.unitId) || 1,
                    fromDate: row.fromDate || headerData.fromDate,
                    toDate: row.toDate || headerData.toDate,
                    pricingLevelId: parseInt(row.pricingLevelId) || parseInt(headerData.pricingLevel) || 1,
                    AmountBeforeDisc: parseFloat(row.AmountBeforeDisc) || 0,
                    DiscPer: parseFloat(row.DiscPer) || 0,
                    DiscAmount: parseFloat(row.DiscAmount) || 0,
                    salesPrice: parseFloat(row.salesPrice) || 0,
                }));

            const payload = {
                offerCode: headerData.offerCode,
                offerName: headerData.offerName,
                fromDate: headerData.fromDate,
                toDate: headerData.toDate,
                pricingLevel: parseInt(headerData.pricingLevel) || 1,
                branchId: parseInt(headerData.branchId) || parseInt(selectedBranchId) || 1,
                IsApproved: headerData.IsApproved,
                IsActive: headerData.IsActive,
                ...(isEditMode ? { ModifiedUser: userId } : { CreatedUser: userId?.toString() || "" }),
                offerDetails: validDetails,
            };

            if (isEditMode) {
                await axiosInstance.post(`offer-rate/update-offer-rate/${editId}`, payload);
            } else {
                await axiosInstance.post("offer-rate/save-offer-rate", payload);
            }

            onSuccess();
            handleModalClose();
        } catch (error) {
            console.error("Error saving offer:", error);
            setFinalError(
                error.response?.data?.message ||
                    error.message ||
                    (isEditMode ? "Failed to update offer" : "Failed to save offer")
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // ════════════════════════════════════════════════════════
    // CLOSE MODAL
    // ════════════════════════════════════════════════════════
    const handleModalClose = () => {
        if (!isSubmitting && !isLoading) {
            setHeaderData({
                offerCode: "",
                offerName: "",
                fromDate: "",
                toDate: "",
                pricingLevel: "",
                branchId: selectedBranchId?.toString() || "",
                IsApproved: false,
                IsActive: true,
            });
            setDetailRows([{ ...EMPTY_DETAIL_ROW, lineIndex: 1 }]);
            setFilterData({ maingroup: "", group1: "", group2: "", group3: "", group4: "" });
            setHeaderErrors({});
            setAlert(null);
            setFinalError(null);
            handleClose();
        }
    };

    // ════════════════════════════════════════════════════════
    // ENTER KEY NAV IN HEADER
    // ════════════════════════════════════════════════════════
    const handleHeaderKeyDown = (e) => {
        if (e.key === "Enter") {
            const target = e.target;
            if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
            e.preventDefault();

            if (!headerRef.current) return;
            const focusableSelectors =
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled])';
            const focusableElements = Array.from(headerRef.current.querySelectorAll(focusableSelectors));
            const visibleElements = focusableElements.filter((el) => el.offsetParent !== null);
            const currentIndex = visibleElements.indexOf(target);
            if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
                visibleElements[currentIndex + 1].focus();
            }
        }
    };

    // ════════════════════════════════════════════════════════
    // FILTER DROPDOWN COMPONENT (Reusable within this file)
    // ════════════════════════════════════════════════════════
    const FilterDropdown = ({
        label,
        value,
        options,
        onChange,
        placeholder,
        loading: dropdownLoading,
        showDropdown,
        setShowDropdown,
        dropdownRef,
    }) => {
        const selectedOption = options?.find((opt) => opt.value?.toString() === value?.toString());

        return (
            <div className="flex flex-col min-w-0">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                    {label}
                </label>
                <div className="relative" ref={dropdownRef}>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={selectedOption?.label || ""}
                            readOnly
                            placeholder={placeholder}
                            disabled={dropdownLoading}
                            className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 
                                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                                     focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 
                                     pr-7 cursor-pointer transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => !dropdownLoading && setShowDropdown((prev) => !prev)}
                        />
                        <div className="absolute right-1.5 flex items-center">
                            {dropdownLoading ? (
                                <Loader2 size={12} className="animate-spin text-gray-400" />
                            ) : (
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => !dropdownLoading && setShowDropdown((prev) => !prev)}
                                    disabled={dropdownLoading}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                                >
                                    <ChevronDown
                                        size={13}
                                        className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                    {showDropdown && !dropdownLoading && (
                        <div className="absolute z-[60] mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {/* "All" / clear option */}
                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setShowDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                                           text-gray-500 dark:text-gray-400 italic transition-colors
                                           ${!value ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                            >
                                — All —
                            </button>
                            {options?.length > 0 ? (
                                options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setShowDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                                                   text-gray-900 dark:text-gray-100 transition-colors
                                                   ${value?.toString() === opt.value?.toString() ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    No options
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!open) return null;

    return (
        <>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            {/* Full page overlay */}
            <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-start justify-center overflow-y-auto">
                <div className="w-full max-w-[95vw] xl:max-w-[1400px] my-4 mx-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700">
                    {/* ═══════════ MODAL HEADER ═══════════ */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4e2348]/10 to-transparent dark:from-[#4e2348]/20">
                        <div className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-[#4e2348] dark:text-[#d4a0cc]" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {isEditMode ? "Edit Offer" : "Create New Offer"}
                            </h2>
                        </div>
                        <button
                            onClick={handleModalClose}
                            disabled={isSubmitting || isLoading}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading offer data...</div>
                        </div>
                    ) : (
                        <div className="px-6 py-4">
                            {/* ═══════════ HEADER FIELDS ═══════════ */}
                            <div
                                ref={headerRef}
                                onKeyDown={handleHeaderKeyDown}
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-3 mb-4 p-4 bg-gray-50 dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                {/* Offer Code */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Offer Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="offerCode"
                                        value={headerData.offerCode}
                                        onChange={handleHeaderChange}
                                        placeholder="e.g., OFF-10"
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                                            headerErrors.offerCode
                                                ? "border-red-400 dark:border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                    />
                                    {headerErrors.offerCode && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{headerErrors.offerCode}</p>
                                    )}
                                </div>

                                {/* Offer Name */}
                                <div className="flex flex-col lg:col-span-2">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Offer Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="offerName"
                                        value={headerData.offerName}
                                        onChange={handleHeaderChange}
                                        placeholder="e.g., Festival Offer"
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                                            headerErrors.offerName
                                                ? "border-red-400 dark:border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                    />
                                    {headerErrors.offerName && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{headerErrors.offerName}</p>
                                    )}
                                </div>

                                {/* From Date */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        From Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={headerData.fromDate}
                                        onChange={handleHeaderChange}
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                                            headerErrors.fromDate
                                                ? "border-red-400 dark:border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                    />
                                    {headerErrors.fromDate && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{headerErrors.fromDate}</p>
                                    )}
                                </div>

                                {/* To Date */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        To Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={headerData.toDate}
                                        onChange={handleHeaderChange}
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                                            headerErrors.toDate
                                                ? "border-red-400 dark:border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                    />
                                    {headerErrors.toDate && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{headerErrors.toDate}</p>
                                    )}
                                </div>

                                {/* Pricing Level */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Pricing Level <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="pricingLevel"
                                        value={headerData.pricingLevel}
                                        onChange={handleHeaderChange}
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md border bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                                            headerErrors.pricingLevel
                                                ? "border-red-400 dark:border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        }`}
                                    >
                                        <option value="">Select Level</option>
                                        {pricingLevels.map((p) => (
                                            <option key={p.pricingLevelId || p.id} value={p.pricingLevelId || p.id}>
                                                {p.pricingLevelName || p.name}
                                            </option>
                                        ))}
                                    </select>
                                    {headerErrors.pricingLevel && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{headerErrors.pricingLevel}</p>
                                    )}
                                </div>

                                {/* Checkboxes (edit mode) */}
                                {isEditMode && (
                                    <div className="flex items-end gap-4 col-span-2">
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="IsApproved"
                                                checked={headerData.IsApproved}
                                                onChange={handleHeaderChange}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                                            />
                                            Approved
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="IsActive"
                                                checked={headerData.IsActive}
                                                onChange={handleHeaderChange}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                                            />
                                            Active
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* ═══════════════════════════════════════════════════ */}
                            {/* PRODUCT FILTER SECTION                             */}
                            {/* ═══════════════════════════════════════════════════ */}
                            <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/60 dark:border-blue-800/30">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                                        Product Filter — Load Products by Group
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-end">
                                    {/* Main Group */}
                                    <FilterDropdown
                                        label="Main Group"
                                        value={filterData.maingroup}
                                        options={productMainGroups.map((g) => ({
                                            value: g.groupCode,
                                            label: g.groupName,
                                        }))}
                                        onChange={(value) =>
                                            setFilterData((prev) => ({ ...prev, maingroup: value }))
                                        }
                                        placeholder="Select Main Group"
                                        loading={groupLoadings.mainGroup}
                                        showDropdown={showMainGroupDropdown}
                                        setShowDropdown={setShowMainGroupDropdown}
                                        dropdownRef={mainGroupDropdownRef}
                                    />

                                    {/* Group 1 */}
                                    <FilterDropdown
                                        label="Group 1"
                                        value={filterData.group1}
                                        options={prodSubGroupByCatOne.map((g) => ({
                                            value: g.groupId?.toString(),
                                            label: g.groupName,
                                        }))}
                                        onChange={(value) =>
                                            setFilterData((prev) => ({ ...prev, group1: value }))
                                        }
                                        placeholder="All"
                                        loading={groupLoadings.group1}
                                        showDropdown={showGroup1Dropdown}
                                        setShowDropdown={setShowGroup1Dropdown}
                                        dropdownRef={group1DropdownRef}
                                    />

                                    {/* Group 2 */}
                                    <FilterDropdown
                                        label="Group 2"
                                        value={filterData.group2}
                                        options={prodSubGroupByCatTwo.map((g) => ({
                                            value: g.groupId?.toString(),
                                            label: g.groupName,
                                        }))}
                                        onChange={(value) =>
                                            setFilterData((prev) => ({ ...prev, group2: value }))
                                        }
                                        placeholder="All"
                                        loading={groupLoadings.group2}
                                        showDropdown={showGroup2Dropdown}
                                        setShowDropdown={setShowGroup2Dropdown}
                                        dropdownRef={group2DropdownRef}
                                    />

                                    {/* Group 3 */}
                                    <FilterDropdown
                                        label="Group 3"
                                        value={filterData.group3}
                                        options={prodSubGroupByCatThree.map((g) => ({
                                            value: g.groupId?.toString(),
                                            label: g.groupName,
                                        }))}
                                        onChange={(value) =>
                                            setFilterData((prev) => ({ ...prev, group3: value }))
                                        }
                                        placeholder="All"
                                        loading={groupLoadings.group3}
                                        showDropdown={showGroup3Dropdown}
                                        setShowDropdown={setShowGroup3Dropdown}
                                        dropdownRef={group3DropdownRef}
                                    />

                                    {/* Group 4 */}
                                    <FilterDropdown
                                        label="Group 4"
                                        value={filterData.group4}
                                        options={prodSubGroupByCatFour.map((g) => ({
                                            value: g.groupId?.toString(),
                                            label: g.groupName,
                                        }))}
                                        onChange={(value) =>
                                            setFilterData((prev) => ({ ...prev, group4: value }))
                                        }
                                        placeholder="All"
                                        loading={groupLoadings.group4}
                                        showDropdown={showGroup4Dropdown}
                                        setShowDropdown={setShowGroup4Dropdown}
                                        dropdownRef={group4DropdownRef}
                                    />

                                    {/* Filter Actions */}
                                    <div className="flex items-end gap-2 pb-0.5">
                                        <button
                                            type="button"
                                            onClick={handleApplyFilter}
                                            disabled={isFiltering || !filterData.maingroup}
                                            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md
                                                     main-bg hover:bg-blue-700 dark:bg-blue-700 dark:hover:main-bg
                                                     text-white transition-colors duration-200
                                                     disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {isFiltering ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <Filter className="h-3.5 w-3.5" />
                                                    Load Products
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearFilter}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md
                                                     border border-gray-300 dark:border-gray-600
                                                     text-gray-600 dark:text-gray-400
                                                     hover:bg-gray-100 dark:hover:bg-[#252540]
                                                     transition-colors duration-200 whitespace-nowrap"
                                            title="Clear Filters"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Active filter chips */}
                                {(filterData.maingroup || filterData.group1 || filterData.group2 || filterData.group3 || filterData.group4) && (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-blue-200/40 dark:border-blue-800/20">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
                                            Active:
                                        </span>
                                        {filterData.maingroup && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                Main: {productMainGroups.find((g) => g.groupCode === filterData.maingroup)?.groupName || filterData.maingroup}
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterData((prev) => ({ ...prev, maingroup: "" }))}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filterData.group1 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                G1: {prodSubGroupByCatOne.find((g) => g.groupId?.toString() === filterData.group1)?.groupName || filterData.group1}
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterData((prev) => ({ ...prev, group1: "" }))}
                                                    className="text-green-600 hover:text-green-800 dark:text-green-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filterData.group2 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                G2: {prodSubGroupByCatTwo.find((g) => g.groupId?.toString() === filterData.group2)?.groupName || filterData.group2}
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterData((prev) => ({ ...prev, group2: "" }))}
                                                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filterData.group3 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                G3: {prodSubGroupByCatThree.find((g) => g.groupId?.toString() === filterData.group3)?.groupName || filterData.group3}
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterData((prev) => ({ ...prev, group3: "" }))}
                                                    className="text-orange-600 hover:text-orange-800 dark:text-orange-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        )}
                                        {filterData.group4 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                                                G4: {prodSubGroupByCatFour.find((g) => g.groupId?.toString() === filterData.group4)?.groupName || filterData.group4}
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterData((prev) => ({ ...prev, group4: "" }))}
                                                    className="text-teal-600 hover:text-teal-800 dark:text-teal-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ═══════════ OFFER DETAILS TABLE ═══════════ */}
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                    <span className="h-1 w-4 rounded-full bg-[#4e2348] dark:bg-[#d4a0cc]"></span>
                                    Offer Details
                                    {detailRows.filter((r) => r.productCode?.trim()).length > 0 && (
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                            ({detailRows.filter((r) => r.productCode?.trim()).length} product
                                            {detailRows.filter((r) => r.productCode?.trim()).length !== 1 ? "s" : ""})
                                        </span>
                                    )}
                                </h3>
                                <OfferTable
                                    columns={tableColumns}
                                    data={detailRows}
                                    onDataChange={setDetailRows}
                                    onAddRow={handleAddRow}
                                    onDeleteRow={handleDeleteRow}
                                    onCellChange={handleCellChange}
                                    footerData={footerData}
                                    showAddRow={true}
                                    showDeleteAction={true}
                                    showSearch={false}
                                    tableId="offer-detail-table"
                                    maxHeight="40vh"
                                    pageSize={100}
                                    readOnly={false}
                                    loading={isFiltering}
                                />
                            </div>

                            {/* Error message */}
                            {finalError && (
                                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 mb-4">
                                    {finalError}
                                </div>
                            )}

                            {/* ═══════════ FOOTER BUTTONS ═══════════ */}
                            <div className="flex justify-end gap-3 pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleModalClose}
                                    disabled={isSubmitting || isLoading}
                                    className="border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#242424]"
                                >
                                    {t("cancelBtn")}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="main-bg text-white hover:opacity-90 flex items-center gap-2"
                                    disabled={isSubmitting || isLoading || isFiltering}
                                >
                                    <Save className="h-4 w-4" />
                                    {isSubmitting
                                        ? t("saving") || "Saving..."
                                        : isEditMode
                                        ? `${t("update") || "Update"} (Ctrl+S)`
                                        : `${t("save") || "Save"} (Ctrl+S)`}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

AddOffer.propTypes = {
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    editId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onSuccess: PropTypes.func.isRequired,
};

export default AddOffer;