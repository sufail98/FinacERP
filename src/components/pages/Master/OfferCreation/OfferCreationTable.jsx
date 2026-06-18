// src/components/pages/Master/OfferCreation/OfferCreationTable.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { refreshProductsByType } from '@/redux/slice/productSlice';

const createEmptyRow = (id = 1, defaults = {}) => ({
    id, sn: id, productCode: '', productName: '', barcode: '', unitId: '',
    fromDate: defaults.fromDate || '', toDate: defaults.toDate || '',
    pricingLevelId: defaults.pricingLevelId || '',
    AmountBeforeDisc: 0, DiscPer: 0, DiscAmount: 0, salesPrice: 0, availableUnits: [],
});

// ─── Stable NumInput component (outside parent to prevent remount) ───
const NumInput = ({ rowId, field, row, updatedField, inputValues, setInputValues, handleInputChange, handleInputFocus, handleInputBlur, handleKeyDown, inputRefs, decimalPart }) => {
    const ivKey = `${rowId}-${field}`;
    return (
        <input
            ref={el => (inputRefs.current[ivKey] = el)}
            type="text"
            value={inputValues[ivKey] !== undefined ? inputValues[ivKey] : (parseFloat(row[field]) || 0).toFixed(decimalPart)}
            onFocus={(e) => {
                handleInputFocus(rowId);
                setInputValues(p => ({ ...p, [ivKey]: row[field] }));
                setTimeout(() => e.target.select(), 0);
            }}
            onChange={(e) => {
                let v = e.target.value.replace(/[^0-9.]/g, '');
                if (v.split('.').length > 2) v = v.slice(0, v.lastIndexOf('.'));
                setInputValues(p => ({ ...p, [ivKey]: v }));
                handleInputChange(rowId, field, parseFloat(v) || 0, updatedField);
            }}
            onBlur={() => {
                const v = parseFloat(inputValues[ivKey]) || 0;
                handleInputChange(rowId, field, v, updatedField);
                setInputValues(p => { const n = { ...p }; delete n[ivKey]; return n; });
                handleInputBlur();
            }}
            onKeyDown={(e) => handleKeyDown(e, rowId, field)}
            className="w-full px-1 py-1 text-sm border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
        />
    );
};

const OfferCreationTable = ({
    rows, setRows, units, pricingLevels,
    headerFromDate, headerToDate, headerPricingLevel,
    loading: externalLoading,
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { selectedBranchId } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);
    const { salesProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products);

    const [suggestions, setSuggestions] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [focusedRowId, setFocusedRowId] = useState(null);
    const [inputValues, setInputValues] = useState({});

    const inputRefs = useRef({});
    const suggestionRef = useRef(null);
    const rowRef = useRef(null);

    const decimalPart = generalSettings?.decimalPart || 2;

    // ─── Pricing level helpers ───
    const getPLValue = (p) => p.PricingLevelId || p.pricingLevelId || p.id;
    const getPLLabel = (p) => p.PricingLevelName || p.pricingLevelName || p.name || '';

    // ─── Focus ───
    const focusInput = useCallback((rowId, field) => {
        const key = `${rowId}-${field}`;
        setFocusedRowId(rowId);
        setTimeout(() => {
            if (inputRefs.current[key]) {
                inputRefs.current[key].focus();
                if (inputRefs.current[key].select) inputRefs.current[key].select();
            }
        }, 10);
    }, []);

    const handleInputFocus = (rowId) => setFocusedRowId(rowId);
    const handleInputBlur = () => {
        setTimeout(() => {
            const el = document.activeElement;
            if (!el?.closest('[data-offer-table]')) setFocusedRowId(null);
        }, 150);
    };

    useEffect(() => {
        if (!productsLoading && rows.length > 0) {
            setTimeout(() => focusInput(rows[0]?.id || 1, 'productName'), 250);
        }
    }, [productsLoading]);

    useEffect(() => {
        const handler = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
                setActiveSuggestionRow(null);
                setSuggestions({});
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (rowRef.current) rowRef.current.scrollTo({ top: rowRef.current.scrollHeight, behavior: 'smooth' });
    }, [rows.length]);

    const editableColumns = ['productName', 'barcode', 'unitId', 'fromDate', 'toDate', 'pricingLevelId', 'AmountBeforeDisc', 'DiscPer', 'DiscAmount'];

    // ─── Calculate ───
    const calculateRow = useCallback((row, updatedField = null) => {
        const amt = parseFloat(row.AmountBeforeDisc) || 0;
        if (updatedField === 'DiscAmount') {
            const discAmt = parseFloat(row.DiscAmount) || 0;
            const discPer = amt > 0 ? (discAmt / amt) * 100 : 0;
            return { ...row, DiscPer: parseFloat(discPer.toFixed(decimalPart)), DiscAmount: parseFloat(discAmt.toFixed(decimalPart)), salesPrice: parseFloat((amt - discAmt).toFixed(decimalPart)) };
        }
        const discPer = parseFloat(row.DiscPer) || 0;
        const discAmt = (amt * discPer) / 100;
        return { ...row, DiscPer: parseFloat(discPer.toFixed(decimalPart)), DiscAmount: parseFloat(discAmt.toFixed(decimalPart)), salesPrice: parseFloat((amt - discAmt).toFixed(decimalPart)) };
    }, [decimalPart]);

    // ─── Input change ───
    const handleInputChange = useCallback((id, field, value, updatedField = null) => {
        setRows(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updatedRow = { ...row, [field]: value };
            if (['AmountBeforeDisc', 'DiscPer', 'DiscAmount'].includes(field)) {
                return calculateRow(updatedRow, updatedField || (field === 'DiscAmount' ? 'DiscAmount' : null));
            }
            return updatedRow;
        }));
        if (field === 'productName') filterProducts(value, id);
    }, [calculateRow, setRows]);

    // ─── Search ───
    const filterProducts = useCallback((searchTerm, rowId) => {
        if (!searchTerm?.trim()) {
            setSuggestions(p => ({ ...p, [rowId]: [] }));
            setActiveSuggestionRow(null);
            setSelectedSuggestionIndex(p => ({ ...p, [rowId]: -1 }));
            return;
        }
        setLoadingProducts(p => ({ ...p, [rowId]: true }));
        const lower = searchTerm.toLowerCase().trim();
        const parts = lower.split(/\s+/);
        const filtered = (allProducts || []).filter(product => {
            const name = (product.productName || '').toLowerCase();
            const code = (product.productCode || '').toLowerCase();
            const barcode = (product.barcode || '').toLowerCase();
            const partNo = (product.partNo || '').toLowerCase();
            if (code.includes(lower) || barcode.includes(lower) || partNo.includes(lower)) return true;
            const words = name.split(/\s+/);
            return parts.every(sp => words.some(w => w.includes(sp)));
        });
        setSuggestions(p => ({ ...p, [rowId]: filtered }));
        setActiveSuggestionRow(rowId);
        setSelectedSuggestionIndex(p => ({ ...p, [rowId]: 0 }));
        setLoadingProducts(p => ({ ...p, [rowId]: false }));
    }, [allProducts]);

    // ─── Select product ───
    const selectProduct = useCallback((rowId, product) => {
        let price = 0;
        if (Array.isArray(product.salesPrice)) {
            const entry = product.salesPrice.find(p => p.branchId === selectedBranchId) || product.salesPrice[0];
            price = parseFloat(entry?.salesPrice || 0);
        } else {
            price = parseFloat(product.salesPrice || 0);
        }
        setRows(prev => {
            const updated = prev.map(row => {
                if (row.id !== rowId) return row;
                return calculateRow({
                    ...row,
                    productCode: product.productCode || '',
                    productName: product.productName || '',
                    barcode: product.barcode || '',
                    unitId: product.unitId?.toString() || '',
                    fromDate: row.fromDate || headerFromDate || '',
                    toDate: row.toDate || headerToDate || '',
                    pricingLevelId: row.pricingLevelId || headerPricingLevel || '',
                    AmountBeforeDisc: price, salesPrice: price,
                    availableUnits: product.units || [],
                });
            });
            const lastRow = updated[updated.length - 1];
            if (lastRow && lastRow.id === rowId && lastRow.productCode) {
                const newId = Math.max(...updated.map(r => r.id)) + 1;
                updated.push(createEmptyRow(newId, { fromDate: headerFromDate, toDate: headerToDate, pricingLevelId: headerPricingLevel }));
            }
            return updated;
        });
        setSuggestions(p => ({ ...p, [rowId]: [] }));
        setActiveSuggestionRow(null);
        setTimeout(() => focusInput(rowId, 'AmountBeforeDisc'), 100);
    }, [selectedBranchId, headerFromDate, headerToDate, headerPricingLevel, calculateRow, focusInput, setRows]);

    const selectProductByBarcode = useCallback((rowId, barcode) => {
        if (!barcode?.trim()) return;
        const product = (allProducts || []).find(p => p.barcode?.toLowerCase() === barcode.toLowerCase());
        if (!product) { Swal.fire({ title: 'Not Found', text: 'No product found', icon: 'warning', confirmButtonText: 'OK' }); return; }
        selectProduct(rowId, product);
    }, [allProducts, selectProduct]);

    // ─── Keyboard ───
    const handleKeyDown = useCallback((e, rowId, currentField) => {
        if (currentField === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = rows.find(r => r.id === rowId);
            if (row?.barcode?.trim()) selectProductByBarcode(rowId, row.barcode);
            return;
        }
        if (currentField === 'DiscPer' && e.key === 'Enter') {
            e.preventDefault();
            const idx = rows.findIndex(r => r.id === rowId);
            if (idx < rows.length - 1) { focusInput(rows[idx + 1].id, 'productName'); }
            else { addRow(); setTimeout(() => setRows(prev => { const lastId = prev[prev.length - 1]?.id; if (lastId) focusInput(lastId, 'productName'); return prev; }), 60); }
            return;
        }
        if (currentField === 'productName' && activeSuggestionRow === rowId && suggestions[rowId]?.length > 0) {
            const curIdx = selectedSuggestionIndex[rowId] ?? -1;
            const maxIdx = suggestions[rowId].length - 1;
            if (e.key === 'ArrowDown') { e.preventDefault(); const n = curIdx < maxIdx ? curIdx + 1 : 0; setSelectedSuggestionIndex(p => ({ ...p, [rowId]: n })); scrollSuggestionIntoView(rowId, n); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); const n = curIdx > 0 ? curIdx - 1 : maxIdx; setSelectedSuggestionIndex(p => ({ ...p, [rowId]: n })); scrollSuggestionIntoView(rowId, n); return; }
            if (e.key === 'Enter') { e.preventDefault(); if (curIdx >= 0 && curIdx <= maxIdx) { selectProduct(rowId, suggestions[rowId][curIdx]); setSelectedSuggestionIndex(p => ({ ...p, [rowId]: -1 })); } return; }
            if (e.key === 'Escape') { e.preventDefault(); setActiveSuggestionRow(null); setSuggestions({}); return; }
        }
        const rowIdx = rows.findIndex(r => r.id === rowId);
        const fieldIdx = editableColumns.indexOf(currentField);
        let tRowId = rowId, tField = currentField;
        switch (e.key) {
            case 'ArrowRight': e.preventDefault(); if (fieldIdx < editableColumns.length - 1) tField = editableColumns[fieldIdx + 1]; else if (rowIdx < rows.length - 1) { tRowId = rows[rowIdx + 1].id; tField = editableColumns[0]; } break;
            case 'ArrowLeft': e.preventDefault(); if (fieldIdx > 0) tField = editableColumns[fieldIdx - 1]; else if (rowIdx > 0) { tRowId = rows[rowIdx - 1].id; tField = editableColumns[editableColumns.length - 1]; } break;
            case 'ArrowDown': e.preventDefault(); if (rowIdx < rows.length - 1) tRowId = rows[rowIdx + 1].id; break;
            case 'ArrowUp': e.preventDefault(); if (rowIdx > 0) tRowId = rows[rowIdx - 1].id; break;
            case 'Enter': e.preventDefault(); if (fieldIdx < editableColumns.length - 1) { tField = editableColumns[fieldIdx + 1]; } else if (rowIdx < rows.length - 1) { tRowId = rows[rowIdx + 1].id; tField = editableColumns[0]; } else { addRow(); setTimeout(() => setRows(prev => { const lastId = prev[prev.length - 1]?.id; if (lastId) focusInput(lastId, editableColumns[0]); return prev; }), 60); return; } break;
            default: return;
        }
        focusInput(tRowId, tField);
    }, [rows, activeSuggestionRow, suggestions, selectedSuggestionIndex, selectProduct, selectProductByBarcode, focusInput]);

    const scrollSuggestionIntoView = (rowId, index) => {
        setTimeout(() => { const el = document.querySelector(`[data-suggestion-row="${rowId}"] [data-suggestion-index="${index}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 0);
    };

    // ─── Add / Delete ───
    const addRow = useCallback(() => {
        setRows(prev => {
            const lastRow = prev[prev.length - 1];
            if (lastRow && !lastRow.productCode?.trim() && !lastRow.productName?.trim()) return prev;
            const newId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1;
            return [...prev, createEmptyRow(newId, { fromDate: headerFromDate, toDate: headerToDate, pricingLevelId: headerPricingLevel })];
        });
    }, [headerFromDate, headerToDate, headerPricingLevel, setRows]);

    const addRowAfter = useCallback((rowId) => {
        setRows(prev => {
            const idx = prev.findIndex(r => r.id === rowId);
            const updated = [...prev];
            updated.splice(idx + 1, 0, createEmptyRow(Date.now(), { fromDate: headerFromDate, toDate: headerToDate, pricingLevelId: headerPricingLevel }));
            return updated.map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }));
        });
    }, [headerFromDate, headerToDate, headerPricingLevel, setRows]);

    const deleteRow = useCallback(async (id) => {
        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({ title: t("delete.title"), text: t("delete.text"), icon: "warning", showCancelButton: true, confirmButtonColor: "#3085d6", cancelButtonColor: "#d33", confirmButtonText: t("delete.confirm"), cancelButtonText: t("delete.cancel") });
            if (!result.isConfirmed) return;
        }
        setRows(prev => {
            if (prev.length > 1) return prev.filter(r => r.id !== id).map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }));
            return [createEmptyRow(1, { fromDate: headerFromDate, toDate: headerToDate, pricingLevelId: headerPricingLevel })];
        });
    }, [generalSettings, t, headerFromDate, headerToDate, headerPricingLevel, setRows]);

    // ─── Totals ───
    const totals = {
        AmountBeforeDisc: rows.reduce((s, r) => s + (parseFloat(r.AmountBeforeDisc) || 0), 0),
        DiscAmount: rows.reduce((s, r) => s + (parseFloat(r.DiscAmount) || 0), 0),
        salesPrice: rows.reduce((s, r) => s + (parseFloat(r.salesPrice) || 0), 0),
    };

    const getDisplayPrice = (product) => {
        if (!Array.isArray(product.salesPrice)) return parseFloat(product.salesPrice || 0);
        const entry = product.salesPrice.find(p => p.branchId === selectedBranchId) || product.salesPrice[0];
        return parseFloat(entry?.salesPrice || 0);
    };

    const selectClass = "w-full px-0.5 py-1 text-sm border-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded";
    const optionClass = "text-gray-900 bg-white dark:text-gray-100 dark:bg-gray-800";

    return (
        <div className="w-full" data-offer-table>
            <div
                ref={rowRef}
                className={`w-full custom-scrollbar ${activeSuggestionRow ? 'overflow-visible max-h-none' : 'max-h-[350px] overflow-auto'}`}
            >
                <table className="w-full border-collapse table-fixed">
                    <colgroup>
                        <col className="w-[36px]" />
                        <col className="w-[320px]" />
                        <col className="w-[110px]" />
                        <col className="w-[80px]" />
                        <col className="w-[115px]" />
                        <col className="w-[115px]" />
                        <col className="w-[95px]" />
                        <col className="w-[115px]" />
                        <col className="w-[65px]" />
                        <col className="w-[100px]" />
                        <col className="w-[105px]" />
                        <col className="w-[55px]" />
                    </colgroup>

                    <thead>
                        <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed sticky top-0 z-10">
                            <th className="p-1 text-xs font-semibold border border-themed text-left">#</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left relative">
                                Product Name
                                <RefreshCcw onClick={() => dispatch(refreshProductsByType('sales'))} width={16}
                                    className={`absolute right-1 top-0.5 text-secondary cursor-pointer transition-transform ${productsLoading ? 'animate-spin text-blue-500' : ''}`} />
                            </th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left">Barcode</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left">Unit</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left">From</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left">To</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-left">Price Lvl</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-right">Amt Before</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-right">Disc%</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-right">Disc Amt</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-right">Sales Price</th>
                            <th className="p-1 text-xs font-semibold border border-themed text-center">Act</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row) => {
                            const isOdd = row.sn % 2 === 1;
                            const rowBg = isOdd ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900';

                            return (
                                <tr key={`row-${row.id}`} className={`border-b border-themed hover:bg-hover dark:hover:bg-hover ${rowBg}`}>
                                    {/* SN */}
                                    <td className="p-0.5 border border-themed text-center">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.sn}</span>
                                    </td>

                                    {/* Product Name */}
                                    <td className="p-0.5 border border-themed relative">
                                        <input
                                            ref={el => (inputRefs.current[`${row.id}-productName`] = el)}
                                            type="text" value={row.productName}
                                            onFocus={() => handleInputFocus(row.id)}
                                            onChange={(e) => handleInputChange(row.id, 'productName', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                            onBlur={handleInputBlur}
                                            disabled={productsLoading || externalLoading}
                                            className="w-full px-1 py-0.5 text-sm border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                            placeholder="Search product..." autoComplete="off"
                                        />
                                        {row.productCode && <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1">{row.productCode}</span>}

                                        {activeSuggestionRow === row.id && (
                                            <div ref={suggestionRef} data-suggestion-row={row.id}
                                                className="absolute z-[200] left-0 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-2xl max-h-60 overflow-y-auto mt-1 custom-scrollbar"
                                                style={{ top: '100%' }}>
                                                {loadingProducts[row.id] ? (
                                                    <div className="flex items-center justify-center py-6">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {suggestions[row.id]?.length > 0 ? (
                                                            suggestions[row.id].map((product, idx) => (
                                                                <div key={`sug-${row.id}-${product.productCode || idx}`} data-suggestion-index={idx}
                                                                    onClick={() => { selectProduct(row.id, product); setSelectedSuggestionIndex(p => ({ ...p, [row.id]: -1 })); }}
                                                                    className={`px-2 py-1.5 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${selectedSuggestionIndex[row.id] === idx ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{product.productName}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                                                                        {product.productCode && <span>Code: {product.productCode}</span>}
                                                                        {product.barcode && <span>BC: {product.barcode}</span>}
                                                                        {product.unitName && <span>Unit: {product.unitName}</span>}
                                                                        {getDisplayPrice(product) > 0 && <span className="text-green-600 dark:text-green-400 font-medium">{getDisplayPrice(product).toFixed(decimalPart)}</span>}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">No Product Found</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Barcode */}
                                    <td className="p-0.5 border border-themed">
                                        <input ref={el => (inputRefs.current[`${row.id}-barcode`] = el)}
                                            type="text" value={row.barcode}
                                            onChange={(e) => handleInputChange(row.id, 'barcode', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'barcode')}
                                            onFocus={() => handleInputFocus(row.id)} onBlur={handleInputBlur}
                                            className="w-full px-1 py-1 text-sm border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded"
                                            placeholder="Barcode" autoComplete="off" />
                                    </td>

                                    {/* Unit */}
                                    <td className="p-0.5 border border-themed">
                                        <select ref={el => (inputRefs.current[`${row.id}-unitId`] = el)}
                                            value={row.unitId}
                                            onChange={(e) => handleInputChange(row.id, 'unitId', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'unitId')}
                                            onFocus={() => handleInputFocus(row.id)} onBlur={handleInputBlur}
                                            className={selectClass}>
                                            <option value="" className={optionClass}>-</option>
                                            {(row.availableUnits?.length > 0 ? row.availableUnits : units).map((u, i) => (
                                                <option key={`unit-${row.id}-${u.unitId || u.id || i}`} value={u.unitId || u.id} className={optionClass}>
                                                    {u.UnitName || u.unitName || u.unitname || u.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* From Date */}
                                    <td className="p-0.5 border border-themed">
                                        <input ref={el => (inputRefs.current[`${row.id}-fromDate`] = el)} type="date" value={row.fromDate}
                                            onChange={(e) => handleInputChange(row.id, 'fromDate', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'fromDate')}
                                            onFocus={() => handleInputFocus(row.id)} onBlur={handleInputBlur}
                                            className="w-full px-0.5 py-1 text-[12px] border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded" />
                                    </td>

                                    {/* To Date */}
                                    <td className="p-0.5 border border-themed">
                                        <input ref={el => (inputRefs.current[`${row.id}-toDate`] = el)} type="date" value={row.toDate}
                                            onChange={(e) => handleInputChange(row.id, 'toDate', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'toDate')}
                                            onFocus={() => handleInputFocus(row.id)} onBlur={handleInputBlur}
                                            className="w-full px-0.5 py-1 text-[12px] border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 rounded" />
                                    </td>

                                    {/* Pricing Level */}
                                    <td className="p-0.5 border border-themed">
                                        <select ref={el => (inputRefs.current[`${row.id}-pricingLevelId`] = el)}
                                            value={row.pricingLevelId}
                                            onChange={(e) => handleInputChange(row.id, 'pricingLevelId', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'pricingLevelId')}
                                            onFocus={() => handleInputFocus(row.id)} onBlur={handleInputBlur}
                                            className={selectClass}>
                                            <option value="" className={optionClass}>-</option>
                                            {pricingLevels.map((p, i) => (
                                                <option key={`pl-${row.id}-${getPLValue(p) || i}`} value={getPLValue(p)} className={optionClass}>
                                                    {getPLLabel(p)}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Amount Before Disc */}
                                    <td className="p-0.5 border border-themed">
                                        <NumInput rowId={row.id} field="AmountBeforeDisc" row={row}
                                            inputValues={inputValues} setInputValues={setInputValues}
                                            handleInputChange={handleInputChange} handleInputFocus={handleInputFocus}
                                            handleInputBlur={handleInputBlur} handleKeyDown={handleKeyDown}
                                            inputRefs={inputRefs} decimalPart={decimalPart} />
                                    </td>

                                    {/* Disc % */}
                                    <td className="p-0.5 border border-themed">
                                        <NumInput rowId={row.id} field="DiscPer" row={row}
                                            inputValues={inputValues} setInputValues={setInputValues}
                                            handleInputChange={handleInputChange} handleInputFocus={handleInputFocus}
                                            handleInputBlur={handleInputBlur} handleKeyDown={handleKeyDown}
                                            inputRefs={inputRefs} decimalPart={decimalPart} />
                                    </td>

                                    {/* Disc Amount */}
                                    <td className="p-0.5 border border-themed">
                                        <NumInput rowId={row.id} field="DiscAmount" row={row} updatedField="DiscAmount"
                                            inputValues={inputValues} setInputValues={setInputValues}
                                            handleInputChange={handleInputChange} handleInputFocus={handleInputFocus}
                                            handleInputBlur={handleInputBlur} handleKeyDown={handleKeyDown}
                                            inputRefs={inputRefs} decimalPart={decimalPart} />
                                    </td>

                                    {/* Sales Price */}
                                    <td className="p-0.5 border border-themed text-right">
                                        <span className="text-sm font-bold text-red-700 dark:text-red-400 px-1">
                                            {(parseFloat(row.salesPrice) || 0).toFixed(decimalPart)}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="border border-themed text-center">
                                        <div className="flex justify-center gap-0.5">
                                            <button type="button" onClick={() => deleteRow(row.id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={15} /></button>
                                            <button type="button" onClick={() => addRowAfter(row.id)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900" title="Insert below"><PlusIcon size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot>
                        <tr className="bg-gray-200 dark:bg-gray-700 border-t-2 border-themed font-semibold">
                            <td colSpan={7} className="p-1 text-sm text-right border border-themed text-gray-900 dark:text-gray-100">Total</td>
                            <td className="p-1 text-sm text-right border border-themed text-gray-900 dark:text-gray-100">{totals.AmountBeforeDisc.toFixed(decimalPart)}</td>
                            <td className="p-1 border border-themed"></td>
                            <td className="p-1 text-sm text-right border border-themed text-gray-900 dark:text-gray-100">{totals.DiscAmount.toFixed(decimalPart)}</td>
                            <td className="p-1 text-sm text-right border border-themed text-red-700 dark:text-red-400 font-bold">{totals.salesPrice.toFixed(decimalPart)}</td>
                            <td className="p-1 border border-themed"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex justify-end mt-2">
                <button onClick={addRow} type="button" className="flex items-center gap-1.5 main-bg text-white text-sm px-4 py-1 rounded-sm hover:opacity-90 transition">
                    <Plus size={14} /> Add Row
                </button>
            </div>
        </div>
    );
};

export default OfferCreationTable;
