import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import { Plus, Trash2 } from "lucide-react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import { useSelector } from "react-redux";

const BOMComponent = ({
    formData,
    handleInputChange,
    onBOMDataChange,
    initialBomData = [{ id: 1, rawMaterial: "", qty: "", unit: "" }],
    viewMode = false
}) => {
    const { t } = useTranslation();
    const isMountedRef = useRef(true);
    const [units, setUnits] = useState([]);
    // const [products, setProducts] = useState([]);
        const { inventoryProducts:products, loading: productsLoading } = useSelector((state) => state.products)
    
    const [loadings, setLoadings] = useState(false);
    const { selectedBranchId } = useAuth();

    // FIX 1: Use a ref to track whether we've initialized from props,
    // and re-initialize whenever initialBomData actually changes (edit mode async load).
    const initializedRef = useRef(false);
    const [bomRows, setBomRows] = useState(() =>
        initialBomData?.length > 0
            ? initialBomData
            : [{ id: 1, rawMaterial: "", qty: "", unit: "" }]
    );

    // FIX 2: Re-sync bomRows when initialBomData arrives asynchronously (e.g. edit mode).
    // Only run when the data actually changes and we haven't already initialized from it.
    useEffect(() => {
        if (!initialBomData || initialBomData.length === 0) return;

        // If the incoming data is non-trivial (has actual content), treat as a fresh initialization.
        const hasContent = initialBomData.some(row => row.rawMaterial || row.qty || row.unit || row.bomId);
        if (hasContent && !initializedRef.current) {
            initializedRef.current = true;
            setBomRows(initialBomData);
        }
    }, [initialBomData]);

    // FIX 3: Reset initialization flag when switching to create mode (no edit data).
    useEffect(() => {
        if (!initialBomData || initialBomData.length === 0) {
            initializedRef.current = false;
            setBomRows([{ id: 1, rawMaterial: "", qty: "", unit: "" }]);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // useEffect(() => {
    //     if (!selectedBranchId) return;
    //     // fetchAllProduct();
    // }, [selectedBranchId]);

    // const fetchAllProduct = async () => {
    //     try {
    //         const response = await axiosInstance.get('products');
    //         if (isMountedRef.current) setProducts(response.data.data);
    //     } catch (error) {
    //         console.error(error);
    //     }
    // };

    const handleBOMChange = useCallback((id, field, value) => {
        setBomRows(prev =>
            prev.map(row => {
                if (row.id !== id) return row;
                // SearchableDropdown onChange returns the full option object {value, label}.
                // Always store only the primitive value so React can match it correctly
                // on re-render without object reference equality issues.
                const stored = (field === "rawMaterial" && value && typeof value === "object")
                    ? value.value
                    : value;
                return { ...row, [field]: stored };
            })
        );
    }, []);

    // FIX 4: Guard against empty array before Math.max to avoid -Infinity.
    const addBOMRow = useCallback(() => {
        setBomRows(prev => {
            const maxId = prev.length > 0 ? Math.max(...prev.map(row => row.id || 0)) : 0;
            return [...prev, { id: maxId + 1, rawMaterial: "", qty: "", unit: "" }];
        });
    }, []);

    const removeBOMRow = useCallback((id) => {
        setBomRows(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter(row => row.id !== id);
        });
    }, []);

    useEffect(() => {
        fetchUnit();
    }, []);

    const fetchUnit = async () => {
        if (!isMountedRef.current) return;
        setLoadings(true);
        try {
            const response = await axiosInstance.get("units");
            if (isMountedRef.current) {
                setUnits(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (isMountedRef.current) {
                setLoadings(false);
            }
        }
    };

    // FIX 5: Only notify parent when bomRows actually changes, not on every render.
    // Use a ref to track previous value so we don't fire on initial mount unnecessarily.
    const prevBomRowsRef = useRef(null);
    useEffect(() => {
        if (!onBOMDataChange) return;
        const current = JSON.stringify(bomRows);
        if (prevBomRowsRef.current === current) return;
        prevBomRowsRef.current = current;
        onBOMDataChange(bomRows);
    }, [bomRows, onBOMDataChange]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-0 sm:mb-2">
                {/* FIX 6: Use disabled instead of readOnly for checkboxes — readOnly is ignored on <input type="checkbox"> */}
                <input
                    type="checkbox"
                    id="bom"
                    name="bom"
                    checked={formData.bom}
                    onChange={handleInputChange}
                    disabled={viewMode}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 
                        text-blue-600 dark:text-blue-500
                        focus:ring-blue-500 dark:focus:ring-blue-400
                        bg-white dark:bg-gray-700
                        disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label
                    htmlFor="bom"
                    className="text-xs font-medium whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                    {t("product.form.bom")}
                </label>
            </div>

            {formData.bom && (
                <div className="mt-3">
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1e1e1e]">
                        <div className="">
                            <table className="w-full min-w-[500px]">
                                <thead className="bg-gray-50 dark:bg-[#2c2c2c]">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[200px]">
                                            {t("product.tables.rawMaterial")}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[100px]">
                                            {t("product.tables.qty")}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[150px]">
                                            {t("product.tables.unit")}
                                        </th>
                                        {!viewMode && (
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-12">
                                                {t("product.tables.action")}
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {bomRows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                                                <SearchableDropdown
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                                                    value={row.rawMaterial}
                                                    onChange={(option) =>
                                                        handleBOMChange(row.id, "rawMaterial", option)
                                                    }
                                                    options={products.map((data) => ({
                                                        value: data.productCode,
                                                        label: data.productName,
                                                    }))}
                                                    placeholder={t("product.placeholders.rawMaterial")}
                                                    readOnly={viewMode}
                                                />
                                            </td>

                                            <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                                                <input
                                                    type="number"
                                                    value={row.qty}
                                                    onChange={(e) =>
                                                        handleBOMChange(row.id, "qty", e.target.value)
                                                    }
                                                    placeholder={t("product.placeholders.qty")}
                                                    readOnly={viewMode}
                                                    className="w-full border-0 p-1 text-xs focus:outline-none bg-transparent
                                                        text-gray-900 dark:text-gray-100
                                                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                        read-only:cursor-not-allowed"
                                                />
                                            </td>

                                            <td className={`px-2 py-1 ${!viewMode ? 'border-r border-gray-300 dark:border-gray-600' : ''}`}>
                                                <NormalSelectInput
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                                                    value={row.unit}
                                                    onChange={(e) => handleBOMChange(row.id, "unit", e.target.value)}
                                                    options={units.map((data) => ({
                                                        value: data.unitId,
                                                        label: data.UnitName,
                                                    }))}
                                                    placeholder={t("product.tables.unit")}
                                                    className="min-w-0"
                                                    disabled={loadings || viewMode}
                                                />
                                            </td>

                                            {!viewMode && (
                                                <td className="px-2 py-1 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBOMRow(row.id)}
                                                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={bomRows.length === 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!viewMode && (
                            <div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2c2c2c]">
                                <button
                                    type="button"
                                    onClick={addBOMRow}
                                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t("product.buttons.addRow")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BOMComponent;