import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import { useSelector } from "react-redux";

const SalesPriceTable = ({
    selectedUnits = [],
    units,
    onDataChange,
    viewMode = false,
    initialData = [{ salespriceId: null, id: 1, branchId: '', unit: '', pricingLevel: '', mrp: 0, discPercent: '', discAmount: '', salesPrice: 0, lowestSellingPrice: 0, deleted: false }],
    taxList = [],
    selectedTaxIds = [],
    taxType = 'Excluded',
    costPrice,
    purchaseRatePer,
}) => {
    const isInternalUpdate = useRef(false);
    const { t } = useTranslation();
    const [salePriceRows, setSalePriceRows] = useState(initialData);
    const { generalSettings, inventorySettings } = useSelector((state) => state.settings);
    const [pricingLevel, setPricingLevel] = useState([]);
    const [duplicateRows, setDuplicateRows] = useState(new Set());
    const { selectedBranchId, branches } = useAuth();
    const fetchedRef = useRef(false);
    const initializedRef = useRef(false);
    const [focusedField, setFocusedField] = useState(null);

    // ── NEW: checkbox state ──────────────────────────────────────────────────
    const [checkedRows, setCheckedRows] = useState({});

    const activeRowIds = salePriceRows.filter(r => !r.deleted).map(r => r.id);
    const allChecked = activeRowIds.length > 0 && activeRowIds.every(id => checkedRows[id]);
    const someChecked = activeRowIds.some(id => checkedRows[id]);

    const toggleAll = () => {
        const next = {};
        if (!allChecked) activeRowIds.forEach(id => { next[id] = true; });
        setCheckedRows(next);
    };

    const toggleRow = (id) => setCheckedRows(prev => ({ ...prev, [id]: !prev[id] }));

    // Source row = first non-deleted row that has a salesPrice > 0
    const sourceRow = salePriceRows.find(r => !r.deleted && parseFloat(r.salesPrice) > 0);

   useEffect(() => {
    if (!sourceRow) return;
    const checkedIds = Object.keys(checkedRows).filter(id => checkedRows[id]).map(Number);
    if (checkedIds.length === 0) return;

    const updatedRows = salePriceRows.map(row => {
        if (!checkedRows[row.id] || row.id === sourceRow.id || row.deleted) return row;

        const mrp = parseFloat(sourceRow.mrp) || 0;  // ✅ use sourceRow's mrp
        const sp = parseFloat(sourceRow.salesPrice) || 0;
        const discAmount = mrp > 0 ? (mrp - sp).toFixed(dp) : '0';
        const discPercent = mrp > 0 ? ((parseFloat(discAmount) / mrp) * 100).toFixed(dp) : '0';

        return {
            ...row,
            mrp: sourceRow.mrp,           // ✅ ADD THIS - copy mrp
            salesPrice: sourceRow.salesPrice,
            discAmount,
            discPercent,
            lowestSellingPrice: row.lowestSellingPrice || sourceRow.lowestSellingPrice,
        };
    });

    isInternalUpdate.current = true;
    setSalePriceRows(updatedRows);
    if (onDataChange) onDataChange(updatedRows);
}, [sourceRow?.salesPrice, sourceRow?.mrp, sourceRow?.id, JSON.stringify(checkedRows)]);
//                        ^^^^^^^^^^^^^^ ✅ ADD THIS dependency
    // ── END NEW ──────────────────────────────────────────────────────────────

    // Derive the tax objects that are currently selected
    const activeTaxes = (taxList || []).filter(t =>
        (selectedTaxIds || []).some(id => id?.toString() === t.taxId?.toString())
    );

    const dp = generalSettings?.decimalPart ?? 2;

    // Compute price with tax for a given row and tax object
    const computeWithTax = (row, taxObj) => {
        const sp = parseFloat(row.salesPrice) || 0;
        const rate = parseFloat(taxObj?.rate) || 0;
        if (taxType === 'Excluded') {
            return (sp + (sp * rate) / 100).toFixed(dp);
        } else {
            return sp.toFixed(dp);
        }
    };

    const activeBranches = (branches || []).filter(b => b.activeStatus === true);
    const isSingleBranch = activeBranches.length === 1;
    const singleBranchId = isSingleBranch ? activeBranches[0].branchId?.toString() : null;

    useEffect(() => {
        if (!isInternalUpdate.current) {
            setSalePriceRows(initialData);
        }
        isInternalUpdate.current = false;
    }, [initialData]);

    // Auto-calculate sales price from cost price + percentage
    useEffect(() => {
        if (!inventorySettings?.SalesPriceUpdateByCostPricePercentage) return;

        const cost = parseFloat(costPrice) || 0;
        const per = parseFloat(purchaseRatePer) || 0;
        if (cost <= 0) return;

        const calculatedSalesPrice = (cost + (cost * per) / 100).toFixed(dp);

        const updatedRows = salePriceRows.map(row => {
            if (row.deleted) return row;

            const mrp = parseFloat(row.mrp) || 0;
            let updatedRow = { ...row, salesPrice: calculatedSalesPrice };

            if (mrp > 0) {
                const discAmount = (mrp - parseFloat(calculatedSalesPrice)).toFixed(dp);
                const discPercent = ((parseFloat(discAmount) / mrp) * 100).toFixed(dp);
                updatedRow = { ...updatedRow, discAmount, discPercent };
            }

            return updatedRow;
        });

        isInternalUpdate.current = true;
        setSalePriceRows(updatedRows);
        if (onDataChange) onDataChange(updatedRows);
    }, [costPrice, purchaseRatePer, inventorySettings?.SalesPriceUpdateByCostPricePercentage]);

    useEffect(() => {
        if (!selectedBranchId || fetchedRef.current) return;
        fetchedRef.current = true;
        fetchPricingLevel();
    }, [selectedBranchId]);

    useEffect(() => {
        if (
            activeBranches && activeBranches.length > 0 &&
            pricingLevel && pricingLevel.length > 0 &&
            selectedUnits && selectedUnits.length > 0 &&
            !initialData[0]?.branchId &&
            !initializedRef.current
        ) {
            initializedRef.current = true;
            const defaultPricingLevel = pricingLevel.find(level => level.PricingLevelId === 1);
            const defaultPricingLevelId = defaultPricingLevel ? defaultPricingLevel.PricingLevelId : pricingLevel[0]?.PricingLevelId;
            const defaultUnit = selectedUnits[0]?.unitId || '';
            const branchRows = activeBranches.map((branch, index) => ({
                salespriceId: null, id: index + 1,
                branchId: branch.branchId?.toString(), unit: defaultUnit,
                pricingLevel: defaultPricingLevelId, mrp: 0, discPercent: 0,
                discAmount: 0, salesPrice: 0, lowestSellingPrice: 0, deleted: false
            }));
            isInternalUpdate.current = true;
            setSalePriceRows(branchRows);
            if (onDataChange) onDataChange(branchRows);
        }
    }, [activeBranches, pricingLevel, selectedUnits, initialData]);

    useEffect(() => {
        if (selectedUnits.length === 0) initializedRef.current = false;
    }, [selectedUnits]);

    useEffect(() => {
        if (selectedUnits && selectedUnits.length > 0 && salePriceRows.length > 0) {
            const defaultUnit = selectedUnits[0]?.unitId || '';
            const hasEmptyUnits = salePriceRows.some(row => !row.unit && !row.deleted);
            if (hasEmptyUnits) {
                const updatedRows = salePriceRows.map(row =>
                    (!row.unit && !row.deleted) ? { ...row, unit: defaultUnit } : row
                );
                isInternalUpdate.current = true;
                setSalePriceRows(updatedRows);
                if (onDataChange) onDataChange(updatedRows);
            }
        } else if (selectedUnits && selectedUnits.length === 0 && salePriceRows.length > 0) {
            const updatedRows = salePriceRows.map(row => ({ ...row, unit: '' }));
            isInternalUpdate.current = true;
            setSalePriceRows(updatedRows);
            if (onDataChange) onDataChange(updatedRows);
        }
    }, [selectedUnits]);

    useEffect(() => { validateDuplicates(salePriceRows); }, [salePriceRows]);

    const fetchPricingLevel = async () => {
        try {
            const response = await axiosInstance.get("pricing-levels");
            setPricingLevel(response.data.data || []);
        } catch (error) {
            console.error(error);
            setPricingLevel([]);
        }
    };

    const validateDuplicates = (rows) => {
        const combinations = new Map();
        const duplicateIds = new Set();
        rows.filter(row => !row.deleted).forEach(row => {
            if (row.branchId && row.unit && row.pricingLevel) {
                const key = `${row.branchId}-${row.unit}-${row.pricingLevel}`;
                if (combinations.has(key)) {
                    duplicateIds.add(combinations.get(key));
                    duplicateIds.add(row.id);
                } else {
                    combinations.set(key, row.id);
                }
            }
        });
        setDuplicateRows(duplicateIds);
    };

    const hasRowData = (row) =>
        row.branchId || row.unit || row.pricingLevel || row.mrp || row.discPercent || row.discAmount || row.salesPrice || row.lowestSellingPrice;

    const sanitizeAmountInput = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') return String(value);

        const cleaned = value.replace(/[^\d.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return `${parts[0]}.${parts.slice(1).join('')}`;
        }
        return cleaned;
    };

    const shouldAddNewRow = (updatedRows) => {
        const activeRows = updatedRows.filter(row => !row.deleted);
        if (activeRows.length === 0) return false;
        return hasRowData(activeRows[activeRows.length - 1]);
    };

    const handleSalePriceChange = (id, field, value) => {
        const numericFields = ['mrp', 'discPercent', 'discAmount', 'salesPrice', 'lowestSellingPrice'];
        const sanitizedValue = numericFields.includes(field) ? sanitizeAmountInput(value) : value;

        const updatedRows = salePriceRows.map(row => {
            if (row.id !== id) return row;
            let updatedRow = { ...row, [field]: sanitizedValue };
            const mrp = parseFloat(updatedRow.mrp) || 0;
            const discPercent = parseFloat(updatedRow.discPercent) || 0;
            const discAmount = parseFloat(updatedRow.discAmount) || 0;

            if (field === 'mrp') {
                if (discPercent > 0) updatedRow.discAmount = ((mrp * discPercent) / 100).toFixed(dp);
                else if (discAmount > 0) updatedRow.discPercent = ((discAmount / mrp) * 100).toFixed(dp);
            } else if (field === 'discPercent') {
                if (mrp > 0) updatedRow.discAmount = ((mrp * value) / 100).toFixed(dp);
            } else if (field === 'discAmount') {
                if (mrp > 0) updatedRow.discPercent = ((value / mrp) * 100).toFixed(dp);
            } else if (field === 'salesPrice') {
                if (mrp > 0 && parseFloat(value) >= 0) {
                    const calculatedDiscAmount = (mrp - parseFloat(value)).toFixed(dp);
                    updatedRow.discAmount = calculatedDiscAmount;
                    updatedRow.discPercent = ((calculatedDiscAmount / mrp) * 100).toFixed(dp);
                }
            }
            if (field !== 'salesPrice' && mrp > 0 && updatedRow.discAmount >= 0) {
                updatedRow.salesPrice = (mrp - parseFloat(updatedRow.discAmount || 0)).toFixed(dp);
            }
            return updatedRow;
        });

        let finalRows = updatedRows;
        const currentRowIndex = updatedRows.findIndex(row => row.id === id);
        const activeRows = updatedRows.filter(row => !row.deleted);
        const isLastActiveRow = currentRowIndex === updatedRows.length - 1 ||
            updatedRows[currentRowIndex].id === activeRows[activeRows.length - 1]?.id;
        if (isLastActiveRow && shouldAddNewRow(updatedRows)) {
            finalRows = [...updatedRows];
        }

        setSalePriceRows(finalRows);
        if (onDataChange) onDataChange(finalRows);
    };

    const addSalePriceRow = () => {
        const newId = Math.max(...salePriceRows.map(row => row.id)) + 1;
        const defaultPricingLevel = pricingLevel.find(level => level.PricingLevelId === 1);
        const defaultPricingLevelId = defaultPricingLevel ? defaultPricingLevel.PricingLevelId : '';
        const defaultUnit = selectedUnits[0]?.unitId || '';
        const updatedRows = [...salePriceRows, {
            salespriceId: null, id: newId,
            branchId: singleBranchId || '', unit: defaultUnit,
            pricingLevel: defaultPricingLevelId,
            mrp: '0', discPercent: '0', discAmount: '0',
            salesPrice: '0', lowestSellingPrice: '0', deleted: false
        }];
        setSalePriceRows(updatedRows);
        if (onDataChange) onDataChange(updatedRows);
    };

    const removeSalePriceRow = (id) => {
        const updatedRows = salePriceRows.map(row => row.id === id ? { ...row, deleted: true } : row);
        // Also uncheck deleted row
        setCheckedRows(prev => { const next = { ...prev }; delete next[id]; return next; });
        setSalePriceRows(updatedRows);
        if (onDataChange) onDataChange(updatedRows);
    };

    const formatDisplayValue = (value, fieldKey, rowId) => {
        if (focusedField === `${rowId}-${fieldKey}`) {
            return value === 0 || value === '' ? '' : value;
        }
        return Number(value).toFixed(dp);
    };

    const activeRows = salePriceRows.filter(row => !row.deleted);

    const cellCls = "px-1 py-1 border-r border-gray-300 dark:border-gray-600";
    const inputCls = "w-full border-0 p-1 text-xs focus:outline-none min-w-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
    const thCls = "px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600";

    return (
        <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                {t("product.tables.salePrice")}
            </h3>

            {duplicateRows.size > 0 && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-800 dark:text-red-200">
                        Duplicate combination detected: Same branch, unit, and pricing level cannot be used in multiple rows.
                    </span>
                </div>
            )}

            {activeTaxes.length > 0 && (
                <div className="mb-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Tax columns:</span>
                    {activeTaxes.map(tax => (
                        <span key={tax.taxId} className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                            {tax.taxName} ({tax.rate}%) — {taxType === 'Excluded' ? 'price + tax' : 'tax included'}
                        </span>
                    ))}
                </div>
            )}

            <div className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1e1e1e]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[200px]">
                        <thead className="bg-gray-50 dark:bg-[#2c2c2c]">
                            <tr>
                                {/* ── Checkbox header ── */}
                                <th className="px-2 py-2 w-8 text-center border-r border-gray-300 dark:border-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                        onChange={toggleAll}
                                        disabled={viewMode}
                                        title="Select all rows"
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                </th>

                                {!isSingleBranch && (
                                    <th className={`${thCls} min-w-[120px]`}>{t("product.tables.branch")}</th>
                                )}
                                <th className={`${thCls} w-[80px]`}>{t("product.tables.unit")}</th>
                                <th className={`${thCls} min-w-[100px]`}>{t("product.tables.pricingLevel")}</th>
                                <th className={`${thCls} min-w-[70px]`}>{t("product.tables.mrp")}</th>
                                <th className={`${thCls} min-w-[60px]`}>{t("product.tables.discPercent")}</th>
                                <th className={`${thCls} min-w-[60px]`}>{t("product.tables.discAmount")}</th>
                                <th className={`${thCls} min-w-[70px]`}>{t("product.tables.salesPrice")}</th>
                                <th className={`${thCls} min-w-[100px]`}>Lowest Selling Price</th>

                                {activeTaxes.map(tax => (
                                    <th
                                        key={tax.taxId}
                                        className={`${thCls} min-w-[90px] bg-teal-50 dark:bg-teal-900/10`}
                                        title={taxType === 'Excluded'
                                            ? `Sales price + ${tax.rate}% ${tax.taxName}`
                                            : `Tax already included in sales price`}
                                    >
                                        <span className="text-teal-700 dark:text-teal-300">
                                            With {tax.taxName}
                                        </span>
                                        <br />
                                        <span className="text-teal-500 dark:text-teal-400 font-normal">
                                            ({tax.rate}%)
                                        </span>
                                    </th>
                                ))}

                                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-10">
                                    {t("product.tables.action")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {activeRows.map((row) => {
                                const isDuplicate = duplicateRows.has(row.id);
                                const isChecked = !!checkedRows[row.id];
                                return (
                                    <tr
                                        key={row.id}
                                        className={
                                            isDuplicate
                                                ? 'bg-red-50 dark:bg-red-900/10'
                                                : isChecked
                                                    ? 'bg-teal-50/60 dark:bg-teal-900/10'
                                                    : ''
                                        }
                                    >
                                        {/* ── Checkbox cell ── */}
                                        <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleRow(row.id)}
                                                disabled={viewMode}
                                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                        </td>

                                        {!isSingleBranch && (
                                            <td className={cellCls}>
                                                <NormalSelectInput
                                                    name={`sale-branch-${row.id}`}
                                                    value={row.branchId?.toString()}
                                                    onChange={(e) => handleSalePriceChange(row.id, 'branchId', e.target.value)}
                                                    options={activeBranches.map((data) => ({
                                                        value: data.branchId?.toString(),
                                                        label: data.branchCode,
                                                    }))}
                                                    placeholder={t("product.tables.selectBranch")}
                                                    className={`min-w-0 ${isDuplicate ? 'border-red-300 dark:border-red-700' : ''}`}
                                                    disabled={!activeBranches || activeBranches.length === 0 || viewMode}
                                                />
                                            </td>
                                        )}
                                        <td className={cellCls}>
                                            <NormalSelectInput
                                                name={`sale-unit-${row.id}`}
                                                value={row.unit}
                                                onChange={(e) => handleSalePriceChange(row.id, 'unit', e.target.value)}
                                                options={selectedUnits.map((data) => ({
                                                    value: data.unitId,
                                                    label: data.UnitName,
                                                }))}
                                                placeholder={t("product.tables.unit")}
                                                className={`min-w-0 ${isDuplicate ? 'border-red-300 dark:border-red-700' : ''}`}
                                                disabled={selectedUnits.length === 0 || viewMode}
                                            />
                                        </td>
                                        <td className={cellCls}>
                                            <NormalSelectInput
                                                name={`pricing-level-${row.id}`}
                                                value={row.pricingLevel}
                                                onChange={(e) => handleSalePriceChange(row.id, 'pricingLevel', e.target.value)}
                                                options={pricingLevel.map((data) => ({
                                                    value: data.PricingLevelId,
                                                    label: data.PricingLevelName
                                                }))}
                                                placeholder={t("product.tables.pricingLevel")}
                                                className="min-w-0"
                                                disabled={pricingLevel.length === 0 || viewMode}
                                            />
                                        </td>
                                        <td className={cellCls}>
                                            <input type="text" inputMode="decimal"
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-mrp`); }}
                                                onBlur={() => setFocusedField(null)}
                                                value={formatDisplayValue(row.mrp, 'mrp', row.id)}
                                                onChange={(e) => handleSalePriceChange(row.id, "mrp", e.target.value)}
                                                placeholder={t("product.placeholders.mrp")}
                                                className={inputCls} readOnly={viewMode} />
                                        </td>
                                        <td className={cellCls}>
                                            <input type="text" inputMode="decimal"
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-discPercent`); }}
                                                onBlur={() => setFocusedField(null)}
                                                value={formatDisplayValue(row.discPercent, 'discPercent', row.id)}
                                                onChange={(e) => handleSalePriceChange(row.id, 'discPercent', e.target.value)}
                                                placeholder={t("product.placeholders.discPercent")}
                                                className={`${inputCls} ${!parseFloat(row.salesPrice) && !viewMode ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                                                readOnly={viewMode || !parseFloat(row.salesPrice)} />
                                        </td>
                                        <td className={cellCls}>
                                            <input type="text" inputMode="decimal"
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-discAmount`); }}
                                                onBlur={() => setFocusedField(null)}
                                                value={formatDisplayValue(row.discAmount, 'discAmount', row.id)}
                                                onChange={(e) => handleSalePriceChange(row.id, 'discAmount', e.target.value)}
                                                placeholder={t("product.placeholders.discAmount")}
                                                className={`${inputCls} ${!parseFloat(row.salesPrice) && !viewMode ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                                                readOnly={viewMode || !parseFloat(row.salesPrice)} />
                                        </td>
                                        <td className={cellCls}>
                                            <input type="text" inputMode="decimal"
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-salesPrice`); }}
                                                onBlur={() => setFocusedField(null)}
                                                value={formatDisplayValue(row.salesPrice, 'salesPrice', row.id)}
                                                onChange={(e) => handleSalePriceChange(row.id, 'salesPrice', e.target.value)}
                                                placeholder={t("product.placeholders.salesPrice")}
                                                className={inputCls} readOnly={viewMode} />
                                        </td>
                                        <td className={cellCls}>
                                            <input type="text" inputMode="decimal"
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-lowestSellingPrice`); }}
                                                onBlur={() => setFocusedField(null)}
                                                value={formatDisplayValue(row.lowestSellingPrice, 'lowestSellingPrice', row.id)}
                                                onChange={(e) => handleSalePriceChange(row.id, "lowestSellingPrice", e.target.value)}
                                                placeholder={(0).toFixed(dp)}
                                                className={`${inputCls} ${!parseFloat(row.salesPrice) && !viewMode ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                                                readOnly={viewMode || !parseFloat(row.salesPrice)} />
                                        </td>

                                        {activeTaxes.map(tax => (
                                            <td key={tax.taxId} className={`${cellCls} bg-teal-50/50 dark:bg-teal-900/5`}>
                                                <span className="block p-1 text-xs text-teal-700 dark:text-teal-300 font-medium tabular-nums">
                                                    {computeWithTax(row, tax)}
                                                </span>
                                            </td>
                                        ))}

                                        <td className="px-1 py-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeSalePriceRow(row.id)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={activeRows.length === 1 || viewMode}
                                                title="Delete row"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2c2c2c]">
                    <button
                        type="button"
                        onClick={addSalePriceRow}
                        disabled={viewMode}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        {t("product.buttons.addRow")}
                    </button>
                </div>
            </div>
        </div>
    );
};

SalesPriceTable.propTypes = {
    units: PropTypes.array,
    selectedUnits: PropTypes.array,
    loadings: PropTypes.object,
    onDataChange: PropTypes.func,
    initialData: PropTypes.array,
    viewMode: PropTypes.bool,
    taxList: PropTypes.array,
    selectedTaxIds: PropTypes.array,
    taxType: PropTypes.string,
};

export default SalesPriceTable;