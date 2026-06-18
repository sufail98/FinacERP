import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, PlusIcon, RefreshCcw, Trash2, ArrowRightLeft, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshProductsByType } from '@/redux/slice/productSlice';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';

// ── Safe numeric helpers ──────────────────────────────────────────────────────
const safeParsePrice = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'string' && val.trim().toLowerCase() === 'nan') return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

const safeDisplay = (value, dp = 2) => safeParsePrice(value).toFixed(dp);

// ── Empty row factory ─────────────────────────────────────────────────────────
const makeEmptyRow = (id) => ({
    id,
    sn: id,
    barcodeInput: '',
    productCode: '',
    rawMaterialName: '',
    unitId: null,
    unitName: '',
    availableUnits: [],
    conversionRate: 1,
    baseUnitId: null,   // ← ADD
    qty: 1,
    rate: 0,
    amount: 0,
    godownId: '',
    rackId: 1,
    materials: [],
});
// ── Map incoming propRows ─────────────────────────────────────────────────────
function mapRows(source) {
    if (!source || source.length === 0) return [makeEmptyRow(1)];
    return source.map((item, index) => ({
        id: index + 1,
        sn: index + 1,
        barcodeInput: item.barcodeInput || item.barcode || '',
        productCode: item.productCode || '',
        rawMaterialName: item.rawMaterialName || '',
        unitId: item.unitId || null,
        unitName: item.unitName || '',
        availableUnits: item.availableUnits || [],
        conversionRate: item.conversionRate ?? 1,
        baseUnitId: item.baseUnitId ?? null,   // ← ADD
        qty: safeParsePrice(item.qty),
        rate: safeParsePrice(item.rate),
        amount: safeParsePrice(item.amount),
        godownId: item.godownId || '',
        rackId: item.rackId || 1,
        materials: (item.materials || []).map((m) => ({
            productCode: m.productCode || '',
            quantity: safeParsePrice(m.quantity),
            unitId: m.unitId || null,
            unitName: m.unitName || '',
            rawMaterialName: m.rawMaterialName || '',
            availableUnits: m.availableUnits || [],
            conversionRate: m.conversionRate ?? 1,
            baseUnitId: m.baseUnitId ?? null,   // ← ADD
            rate: safeParsePrice(m.rate),
            amount: safeParsePrice(m.amount),
            godownId: m.godownId || '',
            rackId: m.rackId || 1,
        })),
    }));
}

// ── BOM Modal Row factory ─────────────────────────────────────────────────────
const makeEmptyBomRow = (id) => ({
    id,
    sn: id,
    barcodeInput: '',
    productCode: '',
    rawMaterialName: '',
    unitId: null,
    unitName: '',
    availableUnits: [],
    conversionRate: 1,
    baseUnitId: null,   // ← ADD
    qty: 1,
    rate: 0,
    amount: 0,
});
// ── Convert Modal Component ───────────────────────────────────────────────────
const ConvertModal = ({
    isOpen,
    onClose,
    bomProducts,
    allProducts,
    productsLoading,
    dp,
    onConvert,   // ← this is handleConvertFromModal from parent
    sourceRow,
}) => {
    const { t } = useTranslation();
    const inputRefs = useRef({});
    const suggestionRef = useRef(null);
    const filterDebounceRef = useRef(null);

    const [modalRows, setModalRows] = useState([makeEmptyBomRow(1)]);
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [inputValues, setInputValues] = useState({});
    const [focusedRowId, setFocusedRowId] = useState(null);

    // ── Load rows when modal opens ────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setSuggestions({});
        setInputValues({});
        setActiveSuggestionRow(null);

        // Edit mode: sourceRow already has materials → populate from them
        if (sourceRow?.materials && sourceRow.materials.length > 0) {
            // Inside the useEffect that handles sourceRow?.materials (edit mode)
            const editRows = sourceRow.materials.map((m, idx) => {
                const matchedProduct = allProducts.find(
                    (p) => String(p.productCode) === String(m.productCode)
                );
                const units = matchedProduct?.units || m.availableUnits || [];
                const matchedUnit = units.find((u) => u.unitId === m.unitId) || units[0];
                return {
                    id: idx + 1,
                    sn: idx + 1,
                    barcodeInput: matchedProduct?.barcode || '',
                    productCode: m.productCode || '',
                    rawMaterialName: matchedProduct?.productName || m.rawMaterialName || '',
                    unitId: m.unitId || null,
                    unitName: matchedUnit?.unitName || matchedUnit?.unitname || m.unitName || '',
                    availableUnits: units,                                   // ← NEW
                    conversionRate: matchedUnit?.conversionRate ?? m.conversionRate ?? 1,  // ← NEW
                    qty: safeParsePrice(m.quantity),
                    rate: safeParsePrice(m.rate),
                    amount: safeParsePrice(m.amount),
                };
            });
            setModalRows(editRows);
            return;
        }

        // New row: fall back to BOM lookup
        const matched = bomProducts.find(
            (p) => p.productCode === sourceRow?.productCode
        );
        if (matched) {
            loadBomDetails(matched);
        } else {
            setModalRows([makeEmptyBomRow(1)]);
        }
    }, [isOpen, sourceRow, allProducts, bomProducts]);

    // ── Close suggestions on outside click ───────────────────────────────────
    useEffect(() => {
        const handleClick = (e) => {
            if (
                suggestionRef.current &&
                !suggestionRef.current.contains(e.target)
            ) {
                setActiveSuggestionRow(null);
                setSuggestions({});
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!isOpen) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const calcAmount = (qty, rate) =>
        parseFloat(
            (safeParsePrice(qty) * safeParsePrice(rate)).toFixed(dp)
        );

    const focusInput = (rowId, field) => {
        setFocusedRowId(rowId);
        const el = inputRefs.current[`${rowId}-${field}`];
        if (el) {
            el.focus();
            setTimeout(() => {
                if (el.select) el.select();
            }, 0);
        }
    };

    const filterProducts = (searchTerm, rowId) => {
        if (!searchTerm || !searchTerm.trim()) {
            setSuggestions((p) => ({ ...p, [rowId]: [] }));
            setLoadingProducts((p) => ({ ...p, [rowId]: false }));
            setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: -1 }));
            return;
        }
        setLoadingProducts((p) => ({ ...p, [rowId]: true }));
        try {
            const lower = searchTerm.toLowerCase().trim();
            const parts = lower.split(/\s+/);
            const filtered = allProducts.filter((product) => {
                const name = (product.productName || '').toLowerCase();
                const code = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();
                if (
                    code.includes(lower) ||
                    barcode.includes(lower) ||
                    partNo.includes(lower)
                )
                    return true;
                const words = name.split(/\s+/);
                return parts.every((part) =>
                    words.some((w) => w.includes(part))
                );
            });
            setSuggestions((p) => ({ ...p, [rowId]: filtered }));
            setActiveSuggestionRow(rowId);
            setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: 0 }));
        } catch (err) {
            console.error('Error filtering products:', err);
        } finally {
            setLoadingProducts((p) => ({ ...p, [rowId]: false }));
        }
    };

    const selectProduct = (rowId, product) => {
        const units = product.units || [];
        const selectedUnit = units[0];
        setModalRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const rate = safeParsePrice(
                    Array.isArray(product.salesPrice)
                        ? product.salesPrice[0]?.salesPrice
                        : product.salesPrice
                );
                const qty = row.qty;
                return {
                    ...row,
                    barcodeInput: product.barcode || '',
                    productCode: String(product.productCode || ''),
                    rawMaterialName: product.productName || '',
                    unitId: selectedUnit?.unitId ?? null,
                    unitName: selectedUnit?.unitName || '',
                    availableUnits: units,
                    conversionRate: selectedUnit?.conversionRate ?? 1,
                    baseUnitId: product.baseunitId ?? null,   // ← ADD
                    rate,
                    qty,
                    amount: calcAmount(qty, rate),
                };
            })
        );
        setActiveSuggestionRow(null);
        setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
        setInputValues((prev) => {
            const s = { ...prev };
            delete s[`${rowId}-productName`];
            return s;
        });
        setTimeout(() => focusInput(rowId, 'qty'), 0);
    };

    const selectProductByBarcode = (rowId, barcode) => {
        const b = barcode.trim().toLowerCase();
        const product =
            allProducts.find(
                (p) => p.barcode && p.barcode.toLowerCase() === b
            ) ||
            allProducts.find(
                (p) => p.productCode && p.productCode.toLowerCase() === b
            );
        if (!product) {
            Swal.fire({
                title: 'Not found',
                text: 'No product matches this barcode or code.',
                icon: 'warning',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
            return;
        }
        selectProduct(rowId, product);
    };

    const handleFieldChange = (rowId, field, value) => {
        setModalRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const updated = { ...row, [field]: value };
                updated.amount = calcAmount(
                    field === 'qty' ? value : updated.qty,
                    field === 'rate' ? value : updated.rate
                );
                return updated;
            })
        );
    };

    const sanitizeNumber = (raw) => {
        const val = (raw || '').replace(/[^0-9.]/g, '');
        return val.split('.').length > 2
            ? val.slice(0, val.lastIndexOf('.'))
            : val;
    };

    const handleKeyDown = (e, rowId, field) => {
        const rowIndex = modalRows.findIndex((r) => r.id === rowId);

        if (field === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = modalRows.find((r) => r.id === rowId);
            if (row?.barcodeInput?.trim())
                selectProductByBarcode(rowId, row.barcodeInput);
            else focusInput(rowId, 'productName');
            return;
        }

        if (
            field === 'productName' &&
            activeSuggestionRow === rowId &&
            suggestions[rowId]?.length > 0
        ) {
            const cur = selectedSuggestionIndex[rowId] ?? -1;
            const max = suggestions[rowId].length - 1;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex((p) => ({
                    ...p,
                    [rowId]: cur < max ? cur + 1 : 0,
                }));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex((p) => ({
                    ...p,
                    [rowId]: cur > 0 ? cur - 1 : max,
                }));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (cur >= 0 && cur <= max) {
                    selectProduct(rowId, suggestions[rowId][cur]);
                    setSelectedSuggestionIndex((p) => ({
                        ...p,
                        [rowId]: -1,
                    }));
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setActiveSuggestionRow(null);
                setSuggestions({});
                return;
            }
        }

        if (field === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'rate');
            return;
        }

        if (field === 'rate' && e.key === 'Enter') {
            e.preventDefault();
            if (rowIndex < modalRows.length - 1)
                focusInput(modalRows[rowIndex + 1].id, 'barcode');
            else {
                addModalRow();
                setTimeout(() => focusInput(modalRows.length + 1, 'barcode'), 0);
            }
            return;
        }

        if (e.key === 'ArrowDown' && rowIndex < modalRows.length - 1) {
            e.preventDefault();
            focusInput(modalRows[rowIndex + 1].id, field);
        }
        if (e.key === 'ArrowUp' && rowIndex > 0) {
            e.preventDefault();
            focusInput(modalRows[rowIndex - 1].id, field);
        }
    };

    const addModalRow = () =>
        setModalRows((prev) => [...prev, makeEmptyBomRow(prev.length + 1)]);

    const addModalRowAfter = (rowId) => {
        const index = modalRows.findIndex((r) => r.id === rowId);
        const updated = [...modalRows];
        updated.splice(index + 1, 0, {
            ...makeEmptyBomRow(Date.now()),
            sn: 0,
        });
        setModalRows(
            updated.map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }))
        );
    };

    const deleteModalRow = (id) => {
        if (modalRows.length <= 1) {
            setModalRows([makeEmptyBomRow(1)]);
            return;
        }
        setModalRows(
            modalRows
                .filter((r) => r.id !== id)
                .map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }))
        );
    };

    const loadBomDetails = (product) => {

        if (!product.bomDetails || product.bomDetails.length === 0) {
            setModalRows([makeEmptyBomRow(1)]);
            return;
        }
        const bomRows = product.bomDetails.map((detail, idx) => {
            const firstUnit = detail.materialUnits?.[0];
            return {
                id: idx + 1,
                sn: idx + 1,
                barcodeInput: firstUnit?.barcode || '',
                productCode: detail.rowMaterialId || '',
                rawMaterialName: detail.rawMaterialName || '',
                unitId: detail.unitId || firstUnit?.unitId || null,
                unitName: detail.unitName || firstUnit?.unitName || '',
                availableUnits: detail.materialUnits || [],
                conversionRate: firstUnit?.conversionRate ?? 1,
                baseUnitId: detail.baseUnitId ?? null,  // ✅ already there, verify it's not undefined
                qty: safeParsePrice(detail.quantity),
                rate: 0,
                amount: 0,
            };
        });
        setModalRows(bomRows);
    };

    const grandTotal = modalRows.reduce((s, r) => s + (r.amount || 0), 0);

    // ── THIS is the only convert handler in this component ────────────────────
    // It filters, validates, calls onConvert (parent's handleConvertFromModal),
    // then closes. It does NOT touch setRows — that lives in the parent.
    const handleConvertClick = () => {
        const filledRows = modalRows.filter(
            (r) => r.productCode && r.productCode.trim() !== ''
        );
        if (filledRows.length === 0) {
            Swal.fire({
                title: 'No items',
                text: 'Please add at least one product.',
                icon: 'warning',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
            return;
        }
        onConvert(filledRows, sourceRow); // ← passes the array correctly
        onClose();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-primary dark:bg-primary rounded-lg shadow-2xl w-full max-w-6xl mx-4 flex flex-col max-h-[90vh] border border-themed dark:border-themed">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-themed dark:border-themed bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft
                            size={18}
                            className="text-blue-600 dark:text-blue-400"
                        />
                        <h2 className="text-base font-semibold text-primary dark:text-primary">
                            Add Raw Materials
                        </h2>
                        {sourceRow?.rawMaterialName && (
                            <span className="text-xs text-muted dark:text-muted bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                from: {sourceRow.rawMaterialName}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-primary dark:text-muted dark:hover:text-primary transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1">
                    <div className="flex-1 flex flex-col ">
                        <div className="flex-1  custom-scrollbar">
                            <table className="w-full border-collapse table-fixed text-xs">
                                <colgroup>
                                    <col className="w-[36px]" />
                                    <col className="w-[100px]" />
                                    <col />
                                    <col className="w-[70px]" />
                                    <col className="w-[80px]" />
                                    <col className="w-[100px]" />
                                    <col className="w-[64px]" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-gray-300 dark:bg-gray-700 border-b-2 border-themed dark:border-themed sticky top-0 z-10">
                                        <th className="p-1 text-center font-semibold border border-themed dark:border-themed">SN</th>
                                        <th className="p-1 text-left font-semibold border border-themed dark:border-themed">Barcode</th>
                                        <th className="p-1 text-left font-semibold border border-themed dark:border-themed">Raw Material</th>
                                        <th className="p-1 text-center font-semibold border border-themed dark:border-themed">Unit</th>
                                        <th className="p-1 text-right font-semibold border border-themed dark:border-themed">Qty</th>
                                        <th className="p-1 text-right font-semibold border border-themed dark:border-themed">Rate</th>
                                        <th className="p-1 text-center font-semibold border border-themed dark:border-themed">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${row.sn % 2 === 1
                                                ? 'bg-gray-50 dark:bg-gray-800'
                                                : 'bg-white dark:bg-gray-900'
                                                }`}
                                        >
                                            <td className="p-0.5 border border-themed dark:border-themed text-center">
                                                <span className="text-xs font-medium text-primary dark:text-primary">
                                                    {row.sn}
                                                </span>
                                            </td>

                                            {/* Barcode */}
                                            <td className="p-0.5 border border-themed dark:border-themed">
                                                <input
                                                    ref={(el) => (inputRefs.current[`${row.id}-barcode`] = el)}
                                                    type="text"
                                                    value={row.barcodeInput ?? ''}
                                                    placeholder="Barcode…"
                                                    autoComplete="off"
                                                    onChange={(e) =>
                                                        setModalRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id
                                                                    ? { ...r, barcodeInput: e.target.value }
                                                                    : r
                                                            )
                                                        )
                                                    }
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'barcode')}
                                                    onFocus={() => setFocusedRowId(row.id)}
                                                    className="w-full px-2 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
                                                />
                                            </td>

                                            {/* Raw Material */}
                                            <td className="p-0.5 border border-themed dark:border-themed relative">
                                                <input
                                                    ref={(el) => (inputRefs.current[`${row.id}-productName`] = el)}
                                                    type="text"
                                                    autoComplete="off"
                                                    placeholder="Search product…"
                                                    disabled={productsLoading}
                                                    value={
                                                        inputValues[`${row.id}-productName`] !== undefined
                                                            ? inputValues[`${row.id}-productName`]
                                                            : row.rawMaterialName
                                                    }
                                                    onFocus={() => {
                                                        setFocusedRowId(row.id);
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-productName`]: row.rawMaterialName,
                                                        }));
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-productName`]: val,
                                                        }));
                                                        if (filterDebounceRef.current)
                                                            clearTimeout(filterDebounceRef.current);
                                                        filterDebounceRef.current = setTimeout(
                                                            () => filterProducts(val, row.id),
                                                            150
                                                        );
                                                    }}
                                                    onBlur={() =>
                                                        setInputValues((prev) => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-productName`];
                                                            return s;
                                                        })
                                                    }
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded placeholder:text-muted dark:placeholder:text-muted bg-transparent"
                                                />
                                                {activeSuggestionRow === row.id && (
                                                    <div
                                                        ref={suggestionRef}
                                                        data-suggestion-row={row.id}
                                                        className="absolute z-[200] w-full bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-64 overflow-y-auto mt-1 custom-scrollbar"
                                                        style={{ minWidth: '480px' }}
                                                    >
                                                        {loadingProducts[row.id] ? (
                                                            <div className="flex items-center justify-center py-6">
                                                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                                                            </div>
                                                        ) : suggestions[row.id]?.length > 0 ? (
                                                            <table className="w-full border-collapse text-xs">
                                                                <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10">
                                                                    <tr>
                                                                        <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[28px]">#</th>
                                                                        <th className="px-2 py-1.5 text-left font-semibold border-b border-themed">Product Name</th>
                                                                        <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[80px]">Code</th>
                                                                        <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[90px]">Barcode</th>
                                                                        <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[60px]">Unit</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {suggestions[row.id].map((product, idx) => (
                                                                        <tr
                                                                            key={idx}
                                                                            data-suggestion-index={idx}
                                                                            onClick={() => {
                                                                                selectProduct(row.id, product);
                                                                                setSelectedSuggestionIndex((p) => ({
                                                                                    ...p,
                                                                                    [row.id]: -1,
                                                                                }));
                                                                            }}
                                                                            className={`cursor-pointer border-b border-themed last:border-b-0 ${selectedSuggestionIndex[row.id] === idx
                                                                                ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                                : 'hover:bg-hover dark:hover:bg-hover'
                                                                                }`}
                                                                        >
                                                                            <td className="px-2 py-1 text-tertiary dark:text-tertiary">{idx + 1}</td>
                                                                            <td className="px-2 py-1 font-medium text-primary dark:text-primary">{product.productName}</td>
                                                                            <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.productCode || '—'}</td>
                                                                            <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.barcode || '—'}</td>
                                                                            <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.unitName || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <div className="px-3 py-2 text-sm text-muted dark:text-muted text-center">
                                                                No Product Found
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Unit */}
                                            {/* Unit — modal grid */}
                                            <td className="p-0.5 border border-themed dark:border-themed text-center">
                                                {row.availableUnits?.length > 0 ? (
                                                    <select
                                                        value={row.unitId ?? ''}
                                                        onChange={(e) => {
                                                            const uid = parseInt(e.target.value);
                                                            const unit = row.availableUnits.find((u) => u.unitId === uid);
                                                            setModalRows((prev) =>
                                                                prev.map((r) =>
                                                                    r.id === row.id
                                                                        ? {
                                                                            ...r,
                                                                            unitId: uid,
                                                                            unitName: unit?.unitName || '',
                                                                            conversionRate: unit?.conversionRate ?? 1,  // ← NEW
                                                                        }
                                                                        : r
                                                                )
                                                            );
                                                        }}
                                                        className="w-full px-1 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
                                                    >
                                                        {row.availableUnits.map((u) => (
                                                            <option key={u.unitConversionId ?? u.unitId} value={u.unitId}>
                                                                {u.unitName || u.unitname}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs text-secondary dark:text-secondary px-1">{row.unitName || '—'}</span>
                                                )}
                                            </td>

                                            {/* Qty */}
                                            <td className="p-0.5 border border-themed dark:border-themed">
                                                <input
                                                    ref={(el) => (inputRefs.current[`${row.id}-qty`] = el)}
                                                    type="text"
                                                    value={
                                                        inputValues[`${row.id}-qty`] !== undefined
                                                            ? inputValues[`${row.id}-qty`]
                                                            : row.qty
                                                    }
                                                    onFocus={(e) => {
                                                        setFocusedRowId(row.id);
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-qty`]: row.qty,
                                                        }));
                                                        setTimeout(() => e.target.select(), 0);
                                                    }}
                                                    onChange={(e) => {
                                                        const val = sanitizeNumber(e.target.value);
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-qty`]: val,
                                                        }));
                                                        handleFieldChange(
                                                            row.id,
                                                            'qty',
                                                            safeParsePrice(val) || 0
                                                        );
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = safeParsePrice(e.target.value);
                                                        handleFieldChange(row.id, 'qty', val);
                                                        setInputValues((prev) => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-qty`];
                                                            return s;
                                                        });
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                                    className="w-full px-1 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded text-right bg-transparent"
                                                />
                                            </td>

                                            {/* Rate */}
                                            <td className="p-0.5 border border-themed dark:border-themed">
                                                <input
                                                    ref={(el) => (inputRefs.current[`${row.id}-rate`] = el)}
                                                    type="text"
                                                    value={
                                                        inputValues[`${row.id}-rate`] !== undefined
                                                            ? inputValues[`${row.id}-rate`]
                                                            : row.rate
                                                    }
                                                    onFocus={(e) => {
                                                        setFocusedRowId(row.id);
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-rate`]: row.rate,
                                                        }));
                                                        setTimeout(() => e.target.select(), 0);
                                                    }}
                                                    onChange={(e) => {
                                                        const val = sanitizeNumber(e.target.value);
                                                        setInputValues((prev) => ({
                                                            ...prev,
                                                            [`${row.id}-rate`]: val,
                                                        }));
                                                        handleFieldChange(row.id, 'rate', safeParsePrice(val));
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = safeParsePrice(e.target.value);
                                                        handleFieldChange(row.id, 'rate', val);
                                                        setInputValues((prev) => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-rate`];
                                                            return s;
                                                        });
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'rate')}
                                                    className="w-full px-1 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded text-right bg-transparent"
                                                />
                                            </td>

                                            {/* Amount */}
                                            {/* <td className="p-0.5 border border-themed dark:border-themed">
                                                <span className="text-xs font-bold block text-right px-2 text-red-700 dark:text-red-400">
                                                    {safeDisplay(row.amount, dp)}
                                                </span>
                                            </td> */}

                                            {/* Actions */}
                                            <td className="border border-themed dark:border-themed text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        onClick={() => deleteModalRow(row.id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                        title="Delete row"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => addModalRowAfter(row.id)}
                                                        title="Insert row below"
                                                        className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                                                    >
                                                        <PlusIcon size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add row + total */}
                        <div className="border-t border-themed dark:border-themed px-3 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3">
                            <button
                                onClick={addModalRow}
                                className="flex items-center gap-1.5 main-bg text-white text-xs px-3 py-1 rounded-sm hover:bg-blue-700 transition"
                            >
                                <Plus size={13} /> Add Row
                            </button>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-themed dark:border-themed bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm border border-themed dark:border-themed rounded text-primary dark:text-primary hover:bg-hover dark:hover:bg-hover transition"
                    >
                        Cancel
                    </button>
                    {/* ← uses handleConvertClick, NOT handleConvert */}
                    <button
                        onClick={handleConvertClick}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition"
                    >
                        <ArrowRightLeft size={14} /> Convert
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const ManufacturingJournalTable = ({
    formData,
    setFormData,
    rows: propRows,
    generalSettings,
    bomProducts: allBomProducts,
    baseDataLoading: productsLoading,
}) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const inputRefs = useRef({});
    const rowRef = useRef();
    const suggestionRef = useRef(null);
    const filterDebounceRef = useRef(null);

    const dp = generalSettings?.decimalPart ?? 2;

    const { salesProducts: allProducts, loading: salesProductsLoading } =
        useSelector((state) => state.products);

    // ── Local state ───────────────────────────────────────────────────────────
    const [rows, setRows] = useState(() => mapRows(propRows));
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [inputValues, setInputValues] = useState({});
    const [focusedRowId, setFocusedRowId] = useState(null);

    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [convertSourceRow, setConvertSourceRow] = useState(null);

    // ── Sync propRows on mount only ───────────────────────────────────────────
    useEffect(() => {
        setRows(mapRows(propRows));
    }, []);

    // ── Push rows → formData ──────────────────────────────────────────────────
    useEffect(() => {
        const filledRows = rows.filter((r) => r.productCode && r.productCode.trim() !== '');
        const details = filledRows.map((row, idx) => ({
            SlNo: idx + 1,
            productCode: row.productCode,
            quantity: row.qty,
            unitId: row.unitId,
            conversionRate: row.conversionRate ?? 1,
            baseUnitId: row.baseUnitId ?? null,   // ← ADD
            narration: row.rawMaterialName,
            materials: (row.materials || []).map((m) => ({
                productCode: m.productCode,
                quantity: m.quantity,
                unitId: m.unitId,
                conversionRate: m.conversionRate ?? 1,
                baseUnitId: m.baseUnitId ?? null,   // ← ADD
                rate: m.rate,
                amount: m.amount,
                godownId: m.godownId || formData.GodownId || null,
                rackId: m.rackId || 1,
            })),
        }));
        const totalAmount = filledRows.reduce(
            (s, r) => s + (r.materials?.reduce((ms, m) => ms + (m.amount || 0), 0) || r.amount || 0),
            0
        );
        setFormData((prev) => ({ ...prev, details, totalAmount: totalAmount.toFixed(dp) }));
    }, [rows]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    const prevRowCountRef = useRef(rows.length);
    useEffect(() => {
        if (rowRef.current && rows.length > prevRowCountRef.current) {
            rowRef.current.scrollTo({
                top: rowRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
        prevRowCountRef.current = rows.length;
    }, [rows]);

    // ── Focus on load ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!productsLoading && allProducts?.length > 0) {
            const timer = setTimeout(() => focusInput(1, 'barcode'), 100);
            return () => clearTimeout(timer);
        }
    }, [productsLoading, allProducts]);

    // ── Click outside closes dropdown ─────────────────────────────────────────
    useEffect(() => {
        const handleClick = (e) => {
            if (
                suggestionRef.current &&
                !suggestionRef.current.contains(e.target)
            ) {
                setActiveSuggestionRow(null);
                setSuggestions({});
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const calcAmount = (qty, rate) =>
        parseFloat(
            (safeParsePrice(qty) * safeParsePrice(rate)).toFixed(dp)
        );

    const focusInput = (rowId, field) => {
        setFocusedRowId(rowId);
        const el = inputRefs.current[`${rowId}-${field}`];
        if (el) {
            el.focus();
            setTimeout(() => {
                if (el.select) el.select();
            }, 0);
        }
    };

    const handleKeyDown = (e, rowId, field) => {
        const rowIndex = rows.findIndex((r) => r.id === rowId);

        if (field === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = rows.find((r) => r.id === rowId);
            if (row?.barcodeInput?.trim())
                selectProductByBarcode(rowId, row.barcodeInput);
            else focusInput(rowId, 'productName');
            return;
        }

        if (
            field === 'productName' &&
            activeSuggestionRow === rowId &&
            suggestions[rowId]?.length > 0
        ) {
            const cur = selectedSuggestionIndex[rowId] ?? -1;
            const max = suggestions[rowId].length - 1;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = cur < max ? cur + 1 : 0;
                setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: next }));
                scrollSuggestionIntoView(rowId, next);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = cur > 0 ? cur - 1 : max;
                setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: prev }));
                scrollSuggestionIntoView(rowId, prev);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (cur >= 0 && cur <= max) {
                    selectProduct(rowId, suggestions[rowId][cur]);
                    setSelectedSuggestionIndex((p) => ({
                        ...p,
                        [rowId]: -1,
                    }));
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setActiveSuggestionRow(null);
                setSuggestions({});
                setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: -1 }));
                return;
            }
        }

        if (field === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'rate');
            return;
        }

        if (field === 'rate' && e.key === 'Enter') {
            e.preventDefault();
            if (rowIndex < rows.length - 1)
                focusInput(rows[rowIndex + 1].id, 'barcode');
            else {
                addRow();
                setTimeout(() => focusInput(rows.length + 1, 'barcode'), 0);
            }
            return;
        }

        if (e.key === 'ArrowDown' && rowIndex < rows.length - 1) {
            e.preventDefault();
            focusInput(rows[rowIndex + 1].id, field);
        }
        if (e.key === 'ArrowUp' && rowIndex > 0) {
            e.preventDefault();
            focusInput(rows[rowIndex - 1].id, field);
        }
    };

    const filterProducts = (searchTerm, rowId) => {
        if (!searchTerm || !searchTerm.trim()) {
            setSuggestions((p) => ({ ...p, [rowId]: [] }));
            setLoadingProducts((p) => ({ ...p, [rowId]: false }));
            setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: -1 }));
            return;
        }
        setLoadingProducts((p) => ({ ...p, [rowId]: true }));
        try {
            const lower = searchTerm.toLowerCase().trim();
            const parts = lower.split(/\s+/);
            const filtered = allBomProducts.filter((product) => {
                const name = (product.productName || '').toLowerCase();
                const code = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();
                if (
                    code.includes(lower) ||
                    barcode.includes(lower) ||
                    partNo.includes(lower)
                )
                    return true;
                const words = name.split(/\s+/);
                return parts.every((part) =>
                    words.some((w) => w.includes(part))
                );
            });
            setSuggestions((p) => ({ ...p, [rowId]: filtered }));
            setActiveSuggestionRow(rowId);
            setSelectedSuggestionIndex((p) => ({ ...p, [rowId]: 0 }));
        } catch (err) {
            console.error('Error filtering products:', err);
        } finally {
            setLoadingProducts((p) => ({ ...p, [rowId]: false }));
        }
    };

    const scrollSuggestionIntoView = (rowId, index) => {
        setTimeout(() => {
            const el = document.querySelector(
                `[data-suggestion-row="${rowId}"] [data-suggestion-index="${index}"]`
            );
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 0);
    };

    const selectProduct = (rowId, product) => {
        const units = product.productUnits || product.units || [];
        const firstUnit = units[0];
        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                return {
                    ...row,
                    barcodeInput: product.barcode || firstUnit?.barcode || '',
                    productCode: String(product.productCode || ''),
                    rawMaterialName: product.productName || '',
                    unitId: firstUnit?.unitId ?? null,
                    unitName: firstUnit?.unitName || '',
                    availableUnits: units,
                    conversionRate: firstUnit?.conversionRate ?? 1,
                    baseUnitId: product.baseUnitId ?? null,   // ← ADD
                    qty: row.qty || 0,
                    rate: 0,
                    amount: 0,
                };
            })
        );
        // ── ADD THESE LINES ──────────────────────────────────────────────────
        setActiveSuggestionRow(null);
        setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
        setInputValues((prev) => {
            const s = { ...prev };
            delete s[`${rowId}-productName`];
            return s;
        });
        setTimeout(() => focusInput(rowId, 'qty'), 0);
    };
    const selectProductByBarcode = (rowId, barcode) => {
        const b = barcode.trim().toLowerCase();
        const product =
            allProducts.find(
                (p) => p.barcode && p.barcode.toLowerCase() === b
            ) ||
            allProducts.find(
                (p) => p.productCode && p.productCode.toLowerCase() === b
            );
        if (!product) {
            Swal.fire({
                title:
                    t('salesInvoice.form.gridSection.alert.barcodeNotFound') ||
                    'Not found',
                text:
                    t('salesInvoice.form.gridSection.alert.description') ||
                    'No product matches this barcode or code.',
                icon: 'warning',
                confirmButtonColor: '#3085d6',
                confirmButtonText: t('okBtn') || 'OK',
            });
            return;
        }
        selectProduct(rowId, product);
    };

    const handleFieldChange = (rowId, field, value) => {
        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const updated = { ...row, [field]: value };
                updated.amount = calcAmount(
                    field === 'qty' ? value : updated.qty,
                    field === 'rate' ? value : updated.rate
                );
                return updated;
            })
        );
    };

    const sanitizeNumber = (raw) => {
        const val = (raw || '').replace(/[^0-9.]/g, '');
        return val.split('.').length > 2
            ? val.slice(0, val.lastIndexOf('.'))
            : val;
    };

    const addRow = () =>
        setRows((prev) => [...prev, makeEmptyRow(prev.length + 1)]);

    const addRowAfter = (rowId) => {
        const index = rows.findIndex((r) => r.id === rowId);
        const updated = [...rows];
        updated.splice(index + 1, 0, { ...makeEmptyRow(Date.now()), sn: 0 });
        setRows(updated.map((r, i) => ({ ...r, id: i + 1, sn: i + 1 })));
    };

    const deleteRow = async (id) => {
        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({
                title: t('delete.title'),
                text: t('delete.text'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('delete.confirm'),
                cancelButtonText: t('delete.cancel'),
            });
            if (!result.isConfirmed) return;
        }
        if (rows.length <= 1) setRows([makeEmptyRow(1)]);
        else
            setRows(
                rows
                    .filter((r) => r.id !== id)
                    .map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }))
            );
    };

    // ── Parent-side convert handler ───────────────────────────────────────────
    // Receives the already-filtered filledRows array from ConvertModal.
    // This is passed as the `onConvert` prop — named differently to avoid
    // any closure collision with ConvertModal's internal handleConvertClick.
    const handleConvertFromModal = (filledRows, sourceRow) => {
        if (!Array.isArray(filledRows) || filledRows.length === 0) return;
        setRows((prev) => {
            const sourceIndex = prev.findIndex((r) => r.id === sourceRow?.id);
            if (sourceIndex < 0) return prev;
            const updated = [...prev];
            updated[sourceIndex] = {
                ...updated[sourceIndex],
                materials: filledRows.map((mr) => ({
                    productCode: mr.productCode,
                    rawMaterialName: mr.rawMaterialName || '',
                    quantity: mr.qty,
                    unitId: mr.unitId,
                    unitName: mr.unitName || '',
                    availableUnits: mr.availableUnits || [],
                    conversionRate: mr.conversionRate ?? 1,
                    baseUnitId: mr.baseUnitId ?? null,   // ← ADD
                    rate: mr.rate,
                    amount: mr.amount,
                    godownId: mr.godownId || '',
                    rackId: mr.rackId || 1,
                })),
            };
            return updated.map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }));
        });
    };
    const grandTotal = rows.reduce((s, r) => s + (r.amount || 0), 0);

    return (
        <>
            {/* ── Convert Modal ─────────────────────────────────────────────── */}
            <ConvertModal
                isOpen={convertModalOpen}
                onClose={() => {
                    setConvertModalOpen(false);
                    setConvertSourceRow(null);
                }}
                bomProducts={allBomProducts || []}
                allProducts={allProducts || []}
                productsLoading={salesProductsLoading || productsLoading}
                dp={dp}
                onConvert={handleConvertFromModal}
                sourceRow={convertSourceRow}
            />

            <div className="w-full bg-primary dark:bg-primary">
                <div ref={rowRef} className="w-full custom-scrollbar">
                    <table className="w-full border-collapse table-fixed">
                        <colgroup>
                            <col className="w-[40px]" />
                            <col className="w-[110px]" />
                            <col />
                            <col className="w-[80px]" />
                            <col className="w-[90px]" />
                            <col className="w-[150px]" />
                            <col className="w-[96px]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed sticky top-0 z-10">
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.SN')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.barcode')}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed relative">
                                    {t('manufacturingJournal.form.gridSection.rawMaterial') || 'Raw Material'}
                                    <RefreshCcw
                                        onClick={() => dispatch(refreshProductsByType('sales'))}
                                        width={16}
                                        className={`absolute right-1 top-1 cursor-pointer transition-transform duration-300 text-secondary dark:text-secondary ${productsLoading
                                            ? 'animate-spin text-blue-500'
                                            : ''
                                            }`}
                                    />
                                </th>
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.unit')}
                                </th>
                                <th className="p-1 text-right text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.qty')}
                                </th>
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.bom')}
                                </th>
                                <th className="p-1 text-center text-xs font-semibold border border-themed dark:border-themed">
                                    {t('salesInvoice.form.gridSection.columns.action')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${row.sn % 2 === 1
                                        ? 'bg-gray-100 dark:bg-gray-800'
                                        : 'bg-white dark:bg-gray-900'
                                        }`}
                                >
                                    <td className="p-0.5 border border-themed dark:border-themed text-center">
                                        <span className="text-sm font-medium text-primary dark:text-primary">
                                            {row.sn}
                                        </span>
                                    </td>

                                    {/* Barcode */}
                                    <td className="p-0.5 border border-themed dark:border-themed">
                                        <input
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-barcode`] = el)
                                            }
                                            type="text"
                                            value={row.barcodeInput ?? ''}
                                            placeholder={
                                                t('salesInvoice.form.gridSection.barcodePlaceholder') ||
                                                'Barcode…'
                                            }
                                            autoComplete="off"
                                            onChange={(e) =>
                                                setRows((prev) =>
                                                    prev.map((r) =>
                                                        r.id === row.id
                                                            ? { ...r, barcodeInput: e.target.value }
                                                            : r
                                                    )
                                                )
                                            }
                                            onKeyDown={(e) =>
                                                handleKeyDown(e, row.id, 'barcode')
                                            }
                                            onFocus={() => setFocusedRowId(row.id)}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded"
                                        />
                                    </td>

                                    {/* Product Name */}
                                    <td className="p-0.5 border border-themed dark:border-themed relative">
                                        <input
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-productName`] = el)
                                            }
                                            type="text"
                                            autoComplete="off"
                                            placeholder={
                                                t(
                                                    'salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder'
                                                ) || 'Search product…'
                                            }
                                            disabled={productsLoading}
                                            value={
                                                inputValues[`${row.id}-productName`] !== undefined
                                                    ? inputValues[`${row.id}-productName`]
                                                    : row.rawMaterialName
                                            }
                                            onFocus={() => {
                                                setFocusedRowId(row.id);
                                                setInputValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-productName`]: row.rawMaterialName,
                                                }));
                                            }}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setInputValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-productName`]: val,
                                                }));
                                                if (filterDebounceRef.current)
                                                    clearTimeout(filterDebounceRef.current);
                                                filterDebounceRef.current = setTimeout(
                                                    () => filterProducts(val, row.id),
                                                    150
                                                );
                                            }}
                                            onBlur={() =>
                                                setInputValues((prev) => {
                                                    const s = { ...prev };
                                                    delete s[`${row.id}-productName`];
                                                    return s;
                                                })
                                            }
                                            onKeyDown={(e) =>
                                                handleKeyDown(e, row.id, 'productName')
                                            }
                                            className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded placeholder:text-muted dark:placeholder:text-muted"
                                        />
                                        {activeSuggestionRow === row.id && (
                                            <div
                                                ref={suggestionRef}
                                                data-suggestion-row={row.id}
                                                className="absolute z-[100] w-full bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-64 overflow-y-auto mt-1 custom-scrollbar"
                                                style={{ minWidth: '520px' }}
                                            >
                                                {loadingProducts[row.id] ? (
                                                    <div className="flex items-center justify-center py-6">
                                                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                                                    </div>
                                                ) : suggestions[row.id]?.length > 0 ? (
                                                    <table className="w-full border-collapse text-xs">
                                                        <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10">
                                                            <tr>
                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[28px]">#</th>
                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed">
                                                                    {t('manufacturingJournal.form.gridSection.rawMaterial') || 'Product Name'}
                                                                </th>
                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[80px]">
                                                                    {t('salesInvoice.form.gridSection.prodDetailsLabels.productCode') || 'Code'}
                                                                </th>
                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[90px]">
                                                                    {t('salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels') || 'Barcode'}
                                                                </th>
                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed w-[60px]">
                                                                    {t('salesInvoice.form.gridSection.prodDetailsLabels.unit') || 'Unit'}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {suggestions[row.id].map((product, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    data-suggestion-index={idx}
                                                                    onClick={() => {
                                                                        selectProduct(row.id, product);
                                                                        setSelectedSuggestionIndex((p) => ({
                                                                            ...p,
                                                                            [row.id]: -1,
                                                                        }));
                                                                    }}
                                                                    className={`cursor-pointer border-b border-themed last:border-b-0 ${selectedSuggestionIndex[row.id] === idx
                                                                        ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                        : 'hover:bg-hover dark:hover:bg-hover'
                                                                        }`}
                                                                >
                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{idx + 1}</td>
                                                                    <td className="px-2 py-1 font-medium text-primary dark:text-primary">{product.productName}</td>
                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.productCode || '—'}</td>
                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.barcode || '—'}</td>
                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.unitName || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="px-3 py-2 text-sm text-muted dark:text-muted text-center">
                                                        No Product Found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Unit */}
                                    <td className="p-0.5 border border-themed dark:border-themed text-center">
                                        {row.availableUnits?.length > 1 ? (
                                            <select
                                                value={row.unitId ?? ''}
                                                onChange={(e) => {
                                                    const uid = parseInt(e.target.value);
                                                    const unit = row.availableUnits.find((u) => u.unitId === uid);
                                                    setRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id
                                                                ? {
                                                                    ...r,
                                                                    unitId: uid,
                                                                    unitName: unit?.unitName || '',
                                                                    conversionRate: unit?.conversionRate ?? 1,  // ← NEW
                                                                }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                className="w-full px-1 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
                                            >
                                                {row.availableUnits.map((u) => (
                                                    <option key={u.unitConversionId ?? u.unitId} value={u.unitId}>
                                                        {u.unitName || u.unitname}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : row.availableUnits?.length === 1 ? (
                                            <select
                                                value={row.unitId ?? ''}
                                                onChange={(e) => {
                                                    const uid = parseInt(e.target.value);
                                                    const unit = row.availableUnits.find((u) => u.unitId === uid);
                                                    setRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id
                                                                ? {
                                                                    ...r,
                                                                    unitId: uid,
                                                                    unitName: unit?.unitName || '',
                                                                    conversionRate: unit?.conversionRate ?? 1,
                                                                }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                className="w-full px-1 py-1 text-xs border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
                                            >
                                                {row.availableUnits.map((u) => (
                                                    <option key={u.unitConversionId ?? u.unitId} value={u.unitId}>
                                                        {u.unitName || u.unitname}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs text-secondary dark:text-secondary px-1">
                                                {row.unitName || '—'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Qty */}
                                    <td className="p-0.5 border border-themed dark:border-themed">
                                        <input
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-qty`] = el)
                                            }
                                            type="text"
                                            value={
                                                inputValues[`${row.id}-qty`] !== undefined
                                                    ? inputValues[`${row.id}-qty`]
                                                    : row.qty
                                            }
                                            onFocus={(e) => {
                                                setFocusedRowId(row.id);
                                                setInputValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-qty`]: row.qty,
                                                }));
                                                setTimeout(() => e.target.select(), 0);
                                            }}
                                            onChange={(e) => {
                                                const val = sanitizeNumber(e.target.value);
                                                setInputValues((prev) => ({
                                                    ...prev,
                                                    [`${row.id}-qty`]: val,
                                                }));
                                                handleFieldChange(
                                                    row.id,
                                                    'qty',
                                                    safeParsePrice(val) || 0
                                                );
                                            }}
                                            onBlur={(e) => {
                                                const val = safeParsePrice(e.target.value) || 0;
                                                handleFieldChange(row.id, 'qty', val);
                                                setInputValues((prev) => {
                                                    const s = { ...prev };
                                                    delete s[`${row.id}-qty`];
                                                    return s;
                                                });
                                            }}
                                            onKeyDown={(e) =>
                                                handleKeyDown(e, row.id, 'qty')
                                            }
                                            className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 rounded text-right"
                                        />
                                    </td>

                                    {/* Bom */}
                                    <td className='border border-themed dark:border-themed text-center'>
                                        <button
                                            onClick={() => {
                                                setConvertSourceRow(row);
                                                setConvertModalOpen(true);
                                            }}
                                            title="Convert via BOM"
                                            className={` bg-green-800 px-2 py-0.5 rounded text-white text-xs transition ${row.materials?.length > 0
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-black dark:text-blue-400'
                                                }`}
                                        >
                                            Add Raw Materials
                                        </button>
                                        {row.materials?.length > 0 && (
                                            <span className="text-[10px] text-green-700 dark:text-green-400 font-bold">
                                                {row.materials.length}
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="border border-themed dark:border-themed text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            <button
                                                onClick={() => deleteRow(row.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                title="Delete row"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => addRowAfter(row.id)}
                                                title="Insert row below"
                                                className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                                            >
                                                <PlusIcon size={15} />
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end items-center mt-2">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 transition"
                    >
                        <Plus size={15} />
                        {t('salesInvoice.form.gridSection.buttons.addRow') || 'Add Row'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ManufacturingJournalTable;

ManufacturingJournalTable.propTypes = {
    formData: PropTypes.shape({
        GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        details: PropTypes.arrayOf(PropTypes.object),
        totalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    setFormData: PropTypes.func.isRequired,
    rows: PropTypes.arrayOf(
        PropTypes.shape({
            productCode: PropTypes.string,
            rawMaterialName: PropTypes.string,
            unitId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            unitName: PropTypes.string,
            qty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            godownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            rackId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        })
    ),
    generalSettings: PropTypes.object,
    bomProducts: PropTypes.array,
    baseDataLoading: PropTypes.bool,
};

ManufacturingJournalTable.defaultProps = {
    rows: [],
    generalSettings: { decimalPart: 2 },
    bomProducts: [],
    baseDataLoading: false,
};