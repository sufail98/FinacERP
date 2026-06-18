import { useEffect, useState, useRef } from 'react';
import { Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ProductFormModal from '../../Master/multiMasterForms/Product/ProductFormModal';
import { refreshProductsByType } from '@/redux/slice/productSlice';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Ordered'];

/**
 * Converts a table row back to a formData detail item.
 * - If product was selected from dropdown: productCode + barcode are set, manual fields are null.
 * - If typed manually (no product selected): manualItemName set, productCode + barcode are null.
 */
const rowToDetail = (row) => {
    const isProductSelected = Boolean(row.productCode);
    
    return {
        productCode: isProductSelected ? row.productCode : null,
        barcode: isProductSelected ? row.barcode : null,
        productName: row.productName || null,
        manualItemName: isProductSelected ? null : (row.productName || '').trim() || null,
        manualItemDescription: isProductSelected ? null : (row.manualItemDescription || '').trim() || null,
        Qty: parseFloat(row.qty) || 0,
        expectedPrice: parseFloat(row.expectedPrice) || 0,
        Priority: row.Priority || '',
        status: row.status || 'Pending',
    };
};

const emptyRow = (id) => ({
    id,
    sn: id,
    productName: '',
    productCode: null,
    barcode: null,
    manualItemDescription: '',
    qty: 0,
    expectedPrice: 0,
    Priority: '',
    status: 'Pending',
    // UI helpers
    isManual: true,
    availableUnits: [],
});

const PurchaseCartTable = ({
    formData,
    setFormData,
    editMode,
    rows: propRows,
    setRows: propSetRows,
}) => {
    
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { selectedBranchId } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const { purchaseProducts:allProducts, loading: productsLoading } = useSelector((state) => state.products);
    const { purchaseSettings } = useSelector((state) => state.settings);

    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [productModalOpen, setProductModalOpen] = useState(false);

    const suggestionRef = useRef(null);
    const inputRefs = useRef({});

    // ─── Initialize rows from propRows (edit mode) or empty ──────────────────
    const [rows, setRows] = useState(() => {
        if (editMode && propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                // If productCode exists → selected product; else → manual item
                productCode: item.productCode || null,
                barcode: item.barcode || null,
                productName: item.productCode
                    ? (item.productName || '')
                    : (item.manualItemName || ''),
                manualItemDescription: item.manualItemDescription || '',
                qty: parseFloat(item.Qty) || 0,
                expectedPrice: parseFloat(item.expectedPrice) || 0,
                Priority: item.Priority || '',
                status: item.status || 'Pending',
                isManual: !item.productCode,
                availableUnits: [],
            }));
        }
        return [emptyRow(1)];
    });

    // ─── Sync rows → formData.details ────────────────────────────────────────
    useEffect(() => {
        if(!editMode){
            const filledRows = rows.filter(
            (row) =>
                row.productCode ||
                (row.productName && row.productName.trim() !== '')
        );
        const details = filledRows.map(rowToDetail);
        setFormData((prev) => ({ ...prev, details }));
        }
    }, [rows]);

    // ─── Sync propRows into local rows when editMode propRows change ──────────
    useEffect(() => {
        if (editMode && propRows && propRows.length > 0) {
            setRows(
                propRows.map((item, index) => ({
                    id: index + 1,
                    sn: index + 1,
                    productCode: item.productCode || null,
                    barcode: item.barcode || null,
                    productName: item.productCode
                        ? (item.productName || '')
                        : (item.manualItemName || ''),
                    manualItemDescription: item.manualItemDescription || '',
                    qty: parseFloat(item.Qty) || 0,
                    expectedPrice: parseFloat(item.expectedPrice) || 0,
                    Priority: item.Priority || '',
                    status: item.status || 'Pending',
                    isManual: !item.productCode,
                    availableUnits: [],
                }))
            );
        }
    }, [propRows, editMode]);

    // ─── Close suggestions on outside click ──────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setActiveSuggestionRow(null);
                setSuggestions({});
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Scroll selected suggestion into view ────────────────────────────────
    useEffect(() => {
        if (activeSuggestionRow !== null && selectedSuggestionIndex[activeSuggestionRow] >= 0) {
            const container = suggestionRef.current;
            const activeItem = container?.querySelector(
                `[data-suggestion-index="${selectedSuggestionIndex[activeSuggestionRow]}"]`
            );
            if (activeItem && container) {
                const containerRect = container.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                const stickyButtonHeight = 42;
                if (itemRect.bottom > containerRect.bottom - stickyButtonHeight) {
                    container.scrollTop += itemRect.bottom - containerRect.bottom + stickyButtonHeight;
                } else if (itemRect.top < containerRect.top) {
                    container.scrollTop -= containerRect.top - itemRect.top;
                }
            }
        }
    }, [selectedSuggestionIndex, activeSuggestionRow]);

    // ─── Focus helpers ────────────────────────────────────────────────────────
    const focusInput = (rowId, field) => {
        const key = `${rowId}-${field}`;
        if (inputRefs.current[key]) {
            inputRefs.current[key].focus();
            if (inputRefs.current[key].select) inputRefs.current[key].select();
        }
    };

    // ─── Product search / filter ──────────────────────────────────────────────
    const filterProducts = (searchTerm, rowId) => {
        if (!searchTerm || searchTerm.trim() === '') {
            setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
            setLoadingProducts((prev) => ({ ...prev, [rowId]: false }));
            setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: -1 }));
            return;
        }
        setLoadingProducts((prev) => ({ ...prev, [rowId]: true }));
        try {
            const searchLower = searchTerm.toLowerCase().trim();
            const searchParts = searchLower.split(/\s+/);

            const filtered = allProducts?.filter((product) => {
                const name = (product.productName || '').toLowerCase();
                const code = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();

                if (
                    code.includes(searchLower) ||
                    barcode.includes(searchLower) ||
                    partNo.includes(searchLower)
                )
                    return true;

                const nameWords = name.split(/\s+/);
                return searchParts.every((part) => nameWords.some((w) => w.includes(part)));
            });

            setSuggestions((prev) => ({ ...prev, [rowId]: filtered }));
            setActiveSuggestionRow(rowId);
            setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: 0 }));
        } finally {
            setLoadingProducts((prev) => ({ ...prev, [rowId]: false }));
        }
    };

// ─── Add this helper (same logic as SalesInvoiceTable) ───────────────────────
const getSalesPrice = (product) => {
    if (!Array.isArray(product.salesPrice)) {
        return parseFloat(product.salesPrice) || 0;
    }
    // Try to find price matching branchId
    let priceEntry = product.salesPrice.find(
        (p) => p.unitId === product.unitId && p.branchId === product.branchId
    );
    // Fallback: first entry matching unitId
    if (!priceEntry) {
        priceEntry = product.salesPrice.find((p) => p.unitId === product.unitId);
    }
    // Fallback: first entry
    if (!priceEntry && product.salesPrice.length > 0) {
        priceEntry = product.salesPrice[0];
    }
    return parseFloat(priceEntry?.salesPrice ?? priceEntry?.amount ?? 0) || 0;
};

// ─── Updated selectProduct ────────────────────────────────────────────────────
const selectProduct = (rowId, product) => {
    const price = getSalesPrice(product);

    setRows((prev) =>
        prev.map((row) => {
            if (row.id !== rowId) return row;
            return {
                ...row,
                productCode: product.productCode,
                barcode: product.barcode || null,
                productName: product.productName,
                expectedPrice: price,
                availableUnits: product.units || [],
                isManual: false,
                manualItemDescription: '',
            };
        })
    );
    setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
    setActiveSuggestionRow(null);
    setTimeout(() => focusInput(rowId, 'qty'), 100);
};
    // ─── Handle text input changes in the table ───────────────────────────────
    const handleInputChange = (id, field, value) => {
        setRows((prev) => {
            const updatedRows = prev.map((row) => {
                if (row.id !== id) return row;

                let updatedRow = { ...row, [field]: value };

                // When productName changes by typing, mark as manual and clear product selection
                if (field === 'productName') {
                    filterProducts(value, id);
                    // Reset product selection — user is now typing manually
                    updatedRow = {
                        ...updatedRow,
                        productCode: null,
                        barcode: null,
                        isManual: true,
                    };
                }

                return updatedRow;
            });
            return updatedRows;
        });

        // Auto-add row when last row gets input
        setRows((prev) => {
            const isLastRow = id === prev[prev.length - 1].id;
            const hasInput = value !== '' && value !== 0;
            if (isLastRow && hasInput) {
                return [...prev, emptyRow(prev.length + 1)];
            }
            return prev;
        });
    };

    // ─── Keyboard navigation ──────────────────────────────────────────────────
    const editableColumns = ['productName', 'qty', 'expectedPrice', 'Priority', 'status'];

    const handleKeyDown = (e, rowId, currentField) => {
        // Suggestion navigation
        if (currentField === 'productName' && activeSuggestionRow === rowId && suggestions[rowId]?.length > 0) {
            const currentIndex = selectedSuggestionIndex[rowId] ?? -1;
            const maxIndex = suggestions[rowId].length - 1;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = currentIndex < maxIndex ? currentIndex + 1 : 0;
                setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: next }));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev2 = currentIndex > 0 ? currentIndex - 1 : maxIndex;
                setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: prev2 }));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0 && currentIndex <= maxIndex) {
                    selectProduct(rowId, suggestions[rowId][currentIndex]);
                    setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: -1 }));
                } else {
                    // No suggestion selected → treat typed text as manual item
                    setActiveSuggestionRow(null);
                    setSuggestions({});
                    focusInput(rowId, 'qty');
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setActiveSuggestionRow(null);
                setSuggestions({});
                setSelectedSuggestionIndex((prev) => ({ ...prev, [rowId]: -1 }));
                return;
            }
        }

        const currentRowIndex = rows.findIndex((r) => r.id === rowId);
        const currentFieldIndex = editableColumns.indexOf(currentField);

        switch (e.key) {
            case 'Enter': {
                e.preventDefault();
                if (currentField === 'productName') {
                    // If no suggestion active, move to qty (manual item)
                    setActiveSuggestionRow(null);
                    setSuggestions({});
                    focusInput(rowId, 'qty');
                } else if (currentFieldIndex < editableColumns.length - 1) {
                    focusInput(rowId, editableColumns[currentFieldIndex + 1]);
                } else if (currentRowIndex < rows.length - 1) {
                    focusInput(rows[currentRowIndex + 1].id, 'productName');
                } else {
                    addRow();
                    setTimeout(() => focusInput(rows.length + 1, 'productName'), 0);
                }
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                if (currentRowIndex < rows.length - 1) {
                    focusInput(rows[currentRowIndex + 1].id, currentField);
                }
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                if (currentRowIndex > 0) {
                    focusInput(rows[currentRowIndex - 1].id, currentField);
                }
                break;
            }
            case 'Tab': {
                // Let browser handle tab but allow it to move between columns
                break;
            }
            default:
                break;
        }
    };

    // ─── Row management ───────────────────────────────────────────────────────
    const addRow = () => {
        setRows((prev) => [...prev, emptyRow(prev.length + 1)]);
    };

    const addRowAfter = async (rowId) => {
        if (editMode) {
            const result = await Swal.fire({
                title: t('salesInvoice.alert.addRowAfter.title'),
                text: t('salesInvoice.alert.addRowAfter.text'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('salesInvoice.alert.addRowAfter.confirm'),
                cancelButtonText: t('delete.cancel'),
            });
            if (!result.isConfirmed) return;
        }
        const index = rows.findIndex((r) => r.id === rowId);
        const updated = [...rows];
        updated.splice(index + 1, 0, { ...emptyRow(Date.now()), sn: 0 });
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

        setRows((prev) => {
            if (prev.length <= 1) return [emptyRow(1)];
            return prev
                .filter((r) => r.id !== id)
                .map((r, i) => ({ ...r, id: i + 1, sn: i + 1 }));
        });
    };

    // ─── Clear a selected product back to manual ──────────────────────────────
    const clearProductSelection = (rowId) => {
        setRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? { ...row, productCode: null, barcode: null, isManual: true }
                    : row
            )
        );
    };

    const rowRef = useRef();
    useEffect(() => {
        if (rowRef.current) {
            rowRef.current.scrollTo({ top: rowRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [rows]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full min-h-[300px] bg-primary dark:bg-primary">
            <div className="w-full">
                {/* Fixed Header */}
                <div className="w-full overflow-hidden">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[40px]">
                                    {t('salesInvoice.form.gridSection.columns.SN')}
                                </th>
                                <th className="p-1 relative text-left text-xs font-semibold border border-themed w-[380px]">
                                    {t('purchaseCart.form.gridSection.columns.itemName') || 'Item Name'}
                                    <RefreshCcw
                                        onClick={() => dispatch(refreshProductsByType('purchase'))}
                                        width={16}
                                        className={`absolute right-1 top-1/2 -translate-y-1/2 text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${
                                            productsLoading ? 'animate-spin text-blue-500' : ''
                                        }`}
                                    />
                                </th>
                                {purchaseSettings?.showProductDescription && 
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[220px]">
                                    {t('purchaseCart.form.gridSection.columns.description') || 'Description'}
                                </th>
                                }
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[80px]">
                                    {t('salesInvoice.form.gridSection.columns.qty') || 'Qty'}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[120px]">
                                    {t('purchaseCart.form.gridSection.columns.expectedPrice') || 'Expected Price'}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[100px]">
                                    {t('purchaseCart.form.gridSection.columns.priority') || 'Priority'}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[110px]">
                                    {t('purchaseCart.form.gridSection.columns.status') || 'Status'}
                                </th>
                                <th className="p-1 text-left text-xs font-semibold border border-themed w-[80px]">
                                    {t('salesInvoice.form.gridSection.columns.action') || 'Action'}
                                </th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* Scrollable Body */}
                <div
                    ref={rowRef}
                    className={`w-full ${
                        activeSuggestionRow ? 'overflow-visible max-h-[1150px]' : 'max-h-[300px] overflow-auto'
                    } custom-scrollbar`}
                >
                    <table className="w-full border-collapse table-fixed">
                        <colgroup>
                            <col className="w-[40px]" />
                            <col className="w-[380px]" />
                            {purchaseSettings?.showProductDescription && <col className="w-[220px]" />}
                            <col className="w-[80px]" />
                            <col className="w-[120px]" />
                            <col className="w-[100px]" />
                            <col className="w-[110px]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${
                                        row.sn % 2 === 1
                                            ? 'bg-gray-100 dark:bg-gray-800'
                                            : 'bg-white dark:bg-gray-900'
                                    }`}
                                >
                                    {/* SN */}
                                    <td className="p-0.5 border border-themed text-center">
                                        <span className="text-sm font-medium text-primary dark:text-primary">
                                            {row.sn}
                                        </span>
                                    </td>

                                    {/* Item Name (product search or manual) */}
                                    <td className="p-0.5 border border-themed relative">
                                        <div className="flex items-center gap-1">
                                            <input
                                                ref={(el) =>
                                                    (inputRefs.current[`${row.id}-productName`] = el)
                                                }
                                                type="text"
                                                value={row.productName}
                                                onChange={(e) =>
                                                    handleInputChange(row.id, 'productName', e.target.value)
                                                }
                                                onKeyDown={(e) =>
                                                    handleKeyDown(e, row.id, 'productName')
                                                }
                                                className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                placeholder={
                                                    t('purchaseCart.form.gridSection.columns.searchOrTypeItem') ||
                                                    'Search product or type item name…'
                                                }
                                                autoComplete="off"
                                                disabled={productsLoading}
                                            />
                                            {/* Badge: shows if product is selected from catalog */}
                                            {row.productCode && (
                                                <span
                                                    title="Selected from catalog. Click × to switch to manual."
                                                    className="flex-shrink-0 flex items-center gap-0.5 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600"
                                                    onClick={() => clearProductSelection(row.id)}
                                                >
                                                    📦 ×
                                                </span>
                                            )}
                                            {/* Manual badge */}
                                            {!row.productCode && row.productName && (
                                                <span className="flex-shrink-0 text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded px-1 py-0.5">
                                                    ✏️
                                                </span>
                                            )}
                                        </div>

                                        {/* Product code hint */}
                                        {row.productCode && (
                                            <div className="text-[10px] text-muted dark:text-muted px-2">
                                                {row.productName && (
                                                    <div className="font-medium text-primary dark:text-primary mb-0.5">
                                                        {row.productName}
                                                    </div>
                                                )}
                                                Code: {row.productCode}
                                                {row.barcode && <> | Barcode: {row.barcode}</>}
                                            </div>
                                        )}

                                        {/* Suggestions dropdown */}
                                        {activeSuggestionRow === row.id && (
                                            <div
                                                ref={suggestionRef}
                                                data-suggestion-row={row.id}
                                                className="absolute z-50 left-0 w-full bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar"
                                            >
                                                {loadingProducts[row.id] ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {suggestions[row.id]?.length > 0 ? (
                                                            suggestions[row.id].map((product, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    data-suggestion-index={idx}
                                                                    onClick={() => {
                                                                        selectProduct(row.id, product);
                                                                        setSelectedSuggestionIndex((prev) => ({
                                                                            ...prev,
                                                                            [row.id]: -1,
                                                                        }));
                                                                    }}
                                                                    className={`px-2 py-1.5 cursor-pointer border-b border-themed last:border-b-0 ${
                                                                        selectedSuggestionIndex[row.id] === idx
                                                                            ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                            : 'hover:bg-hover dark:hover:bg-hover'
                                                                    }`}
                                                                >
                                                                    <div className="font-medium text-sm text-primary dark:text-primary">
                                                                        {product.productName}
                                                                    </div>
                                                                    <div className="text-xs text-tertiary dark:text-tertiary mt-0.5 flex gap-3 flex-wrap">
                                                                        {product.barcode && (
                                                                            <span>Barcode: {product.barcode}</span>
                                                                        )}
                                                                        {product.partNo && (
                                                                            <span>Part: {product.partNo}</span>
                                                                        )}
                                                                       
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-3 py-2 text-sm text-muted dark:text-muted text-center">
                                                                No product found —{' '}
                                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                                    press Enter to save as manual item
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Add New Product shortcut */}
                                                        <div className="sticky bottom-0 bg-primary dark:bg-secondary border-t-2 border-themed">
                                                            <button
                                                                onClick={() => {
                                                                    setProductModalOpen(true);
                                                                    setActiveSuggestionRow(null);
                                                                    setSuggestions({});
                                                                }}
                                                                className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Plus size={14} />
                                                                Add New Product
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Manual Item Description */}
                                    {purchaseSettings?.showProductDescription && (
                                    <td className="p-0.5 border border-themed">
                                        <input
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-manualItemDescription`] = el)
                                            }
                                            type="text"
                                            value={row.manualItemDescription || ''}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    row.id,
                                                    'manualItemDescription',
                                                    e.target.value
                                                )
                                            }
                                            disabled={Boolean(row.productCode)}
                                            className={`w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted ${
                                                row.productCode
                                                    ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                                                    : ''
                                            }`}
                                            placeholder={
                                                row.productCode
                                                    ? 'N/A (catalog item)'
                                                    : (t('purchaseCart.form.gridSection.columns.descriptionPlaceholder') ||
                                                      'Item description…')
                                            }
                                        />
                                    </td>
                                    )}

                                    {/* Qty */}
                                    <td className="p-0.5 border border-themed">
                                        <input
                                            ref={(el) => (inputRefs.current[`${row.id}-qty`] = el)}
                                            type="text"
                                            value={row.qty}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                const valid =
                                                    value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                handleInputChange(row.id, 'qty', valid);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                            className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                        />
                                    </td>

                                    {/* Expected Price */}
                                    <td className="p-0.5 border border-themed">
                                        <input
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-expectedPrice`] = el)
                                            }
                                            type="text"
                                            value={row.expectedPrice}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                const valid =
                                                    value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                handleInputChange(row.id, 'expectedPrice', valid);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'expectedPrice')}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                        />
                                    </td>

                                    {/* Priority */}
                                    <td className="p-0.5 border border-themed">
                                        <select
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-Priority`] = el)
                                            }
                                            value={row.Priority || ''}
                                            onChange={(e) =>
                                                handleInputChange(row.id, 'Priority', e.target.value)
                                            }
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'Priority')}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                        >
                                            <option value="">— Select —</option>
                                            {PRIORITY_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Status */}
                                    <td className="p-0.5 border border-themed">
                                        <select
                                            ref={(el) =>
                                                (inputRefs.current[`${row.id}-status`] = el)
                                            }
                                            value={row.status || 'Pending'}
                                            onChange={(e) =>
                                                handleInputChange(row.id, 'status', e.target.value)
                                            }
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'status')}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Actions */}
                                    <td className="border border-themed text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={() => deleteRow(row.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                title="Delete Row"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => addRowAfter(row.id)}
                                                title="Insert Row Below"
                                                className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                                            >
                                                <PlusIcon size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Row button */}
                <div className="flex justify-end items-center mt-2">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"
                    >
                        <Plus size={14} />
                        {t('salesInvoice.form.gridSection.buttons.addRow') || 'Add Row'}
                    </button>
                </div>
            </div>

            {/* Add New Product Modal */}
            <ProductFormModal
                open={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                productCode={null}
                viewMode={false}
                modalMode={true}
                onSuccess={() => {
                    setProductModalOpen(false);
                    dispatch(refreshProductsByType('purchase'));
                }}
            />
        </div>
    );
};

PurchaseCartTable.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    editMode: PropTypes.bool,
    rows: PropTypes.array,
    setRows: PropTypes.func,
};

PurchaseCartTable.defaultProps = {
    editMode: false,
    rows: [],
    setRows: null,
};

export default PurchaseCartTable;