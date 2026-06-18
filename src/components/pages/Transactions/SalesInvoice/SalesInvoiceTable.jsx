import { useEffect, useState, useRef, useMemo } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import EditProuctDetailsModal from './EditProuctDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
import SalesInvoiceFooterSection from './SalesInvoiceFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import ProductFormModal from '../../Master/multiMasterForms/Product/ProductFormModal';
import ProductHistoryModal from './ProductHistoryModal';
import { refreshProductsByType } from '@/redux/slice/productSlice';

const safeParsePrice = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'string' && val.trim().toLowerCase() === 'nan') return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

const safeDisplayValue = (value, decimalPart) => {
    const parsed = safeParsePrice(value);
    return parsed.toFixed(decimalPart || 2);
};

// Add this utility function at the top of your file
const customRoundDecimal = (value, decimalPart) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return 0;

    const multiplier = Math.pow(10, decimalPart);
    const wholePart = Math.floor(parsed);
    const decimalValue = parsed - wholePart;
    const roundedDecimal = Math.round(decimalValue * multiplier) / multiplier;
    return wholePart + roundedDecimal;
};

// For display purposes
const safeDisplayValueCustom = (value, decimalPart) => {
    const parsed = customRoundDecimal(value, decimalPart);
    return parsed.toFixed(decimalPart);
};

const SalesInvoiceTable = ({
    formData,
    setFormData,
    editMode,
    rows: propRows,
    bank = [],
    cash = [],
    otherChargeLedgers = []
}) => {
    const filterDebounceRef = useRef(null);
    const [showPurchaseRate, setShowPurchaseRate] = useState({});
    const [rowErrors, setRowErrors] = useState({});
    const { t } = useTranslation();
    const [taxData, setTaxData] = useState([]);
    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    // saleSettings.GridFocusingBarcodeToNext=ProductNameOnSameRow,BarcodeInNextRow
    // saleSettings.GridFocusingProductNameToNext=qty,BarcodeInNextRow
    const showProductStockCount = saleSettings?.showStockCount || false
    const [stockCounts, setStockCounts] = useState({});
    const askConfirmationWithSameProduct = saleSettings?.askConfirmationWithSameProduct || false;
    const shoBottomDeailsOnRow = saleSettings?.showProductDetails || false;
    const ledgerPricingAlert = saleSettings?.ledgerPricingAlert || 'cashCustomer';
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionRef = useRef(null);
    const inputRefs = useRef({});
    const [isInitialized] = useState(false);
    const { salesProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [selectingProduct, setSelectingProduct] = useState({});
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [focusedRowId, setFocusedRowId] = useState(null);
    const [isTableFocused, setIsTableFocused] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [inputValues, setInputValues] = useState({});
    const [isUpdatingFromDuplicate, setIsUpdatingFromDuplicate] = useState(false);
    const [pendingFocusRowId, setPendingFocusRowId] = useState(null);
    const [pendingFocusBarcodeRowId, setPendingFocusBarcodeRowId] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedRowForHistory, setSelectedRowForHistory] = useState(null);
    const [pendingFocusField, setPendingFocusField] = useState('qty');

    const dispatch = useDispatch();
    const isFirstRender = useRef(true);

    const calculateInitialDescAmt = (item) => {
        if (safeParsePrice(item.descAmt)) {
            return safeParsePrice(item.descAmt);
        }
        const qty = safeParsePrice(item.qty);
        const salesRate = safeParsePrice(item.rate);
        const taxPercentage = safeParsePrice(item.taxRate);
        const discPerc = safeParsePrice(item.discountPercentage);

        let gross;
        if (generalSettings?.taxincluded === true) {
            const taxMultiplier = 1 + (taxPercentage / 100);
            const rateWithoutTax = taxMultiplier !== 0 ? salesRate / taxMultiplier : 0;
            gross = rateWithoutTax * qty;
        } else {
            gross = qty * salesRate;
        }
        const descAmt = (gross * discPerc) / 100;
        return safeParsePrice(descAmt.toFixed(generalSettings?.decimalPart || 2));
    };

    useEffect(() => {
        if (activeSuggestionRow) {
            setScrollPosition(window.scrollY);
            setTimeout(() => {
                const activeRow = document.querySelector(`[data-suggestion-row="${activeSuggestionRow}"]`);
                if (activeRow) {
                    const rect = activeRow.getBoundingClientRect();
                    const scrollOffset = window.scrollY + rect.top - 100;
                    window.scrollTo({ top: scrollOffset, behavior: 'smooth' });
                }
            }, 100);
        } else if (scrollPosition > 0) {
            window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            setScrollPosition(0);
        }
    }, [activeSuggestionRow]);

    const [rows, setRows] = useState(() => {
        if (propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                barcodeInput: item.barcode || '',
                productName: item.productName || '',
                productNameArb: item.productNameArb || '',
                productCode: item.productCode || '',
                deliveryNoteDetails1Id: item.deliveryNoteDetails1Id || '',
                orderDetails1Id: item.orderDetails1Id || '',
                quotationDetailsId: item.quotationDetailsId || '',
                ConversionFactor: item.ConversionFactor || 0,
                proformaDetails1Id: item.proformaDetails1Id || '',
                purchaseRate: safeParsePrice(item.PurchaseRate),
                qty: safeParsePrice(item.qty) || 1,
                freeQty: safeParsePrice(item.freeQty),
                unit: item.unitId || 2,
                salesRate: safeParsePrice(item.inclusiveRate),
                salesRateWithoutTax: safeParsePrice(item.rate),
                lineDiscountWithTax: item.lineDiscountWithTax || null,
                taxRate: safeParsePrice(item.taxRate),
                baseunitId: item.baseunitId || null,
                desc: safeParsePrice(item.discountPercentage),
                // ✅ KEY FIX: use stored values directly, no recalculation
                descAmt: safeParsePrice(item.descAmt) || 0,
                netValue: safeParsePrice(item.netAmount),   // from DB
                taxAmt: safeParsePrice(item.taxAmount),     // from DB
                amount: safeParsePrice(item.amount),        // from DB
                grossAmount: safeParsePrice(item.grossAmount), // from DB
                tax: safeParsePrice(item.taxId),
                taxId: item.taxId || null,
                salesTaxes: item.salesTaxes || [],
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                otherchargeonproduct: parseFloat(item.otherchargeonproduct) || 0,
                maximumSellingPrice: 0,
                lowestSellingPrice: 0,
                productDetails: item.productDetails || {
                    productCode: item.productCode || '',
                    barcode: item.barcode || '',
                    partNo: '',
                    brand: '',
                    mrp: '',
                    purchase: item.PurchaseRate || '',
                    productDescription: item.productDescription || '',
                    UnitName: ''
                },
                availableUnits: item.availableUnits || []
            }));
        } else {
            return Array.from({ length: 1 }, (_, index) => ({
                id: index + 1,
                sn: index + 1,
                barcodeInput: '',
                productName: '',
                productNameArb: '',
                deliveryNoteDetails1Id: '',
                orderDetails1Id: '',
                quotationDetailsId: '',
                proformaDetails1Id: '',
                productCode: '',
                ConversionFactor: 0,
                purchaseRate: '',
                lineDiscountWithTax: 0,
                qty: 1,
                salesTaxes: [],
                freeQty: 0,
                taxRate: 0,
                unit: 2,
                salesRate: 0,
                desc: 0,
                descAmt: 0,
                netValue: 0,
                tax: 0,
                taxId: null,
                taxAmt: 0,
                amount: 0,
                taxType: 'Excluded',
                otherchargeonproduct: 0,
                salesManId: formData.employeeId || null,
                GodownId: formData.GodownId || null,
                baseunitId: null,
                maximumSellingPrice: 0,
                lowestSellingPrice: 0,
                salesRateWithoutTax: 0,
                productDetails: {
                    productCode: '',
                    barcode: '',
                    partNo: '',
                    brand: '',
                    mrp: '',
                    purchase: '',
                    productDescription: ''
                }
            }));
        }
    });

    useEffect(() => {
        if (pendingFocusBarcodeRowId !== null) {
            focusInput(pendingFocusBarcodeRowId, 'barcode');
            setPendingFocusBarcodeRowId(null);
        }
    }, [rows, pendingFocusBarcodeRowId]);

    useEffect(() => {
        if (pendingFocusRowId !== null) {
            focusInput(pendingFocusRowId, pendingFocusField);
            setPendingFocusRowId(null);
            setPendingFocusField('qty'); // reset to default
            setIsUpdatingFromDuplicate(false);
        }
    }, [rows, pendingFocusRowId]);

    useEffect(() => { fetchTaxData(); }, []);

    useEffect(() => {
        if (propRows && propRows.length > 0 && isInitialized) {
            const mappedRows = propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productNameArb: item.productNameArb || '',
                productCode: item.productCode || '',
                deliveryNoteDetails1Id: item.deliveryNoteDetails1Id,
                orderDetails1Id: item.orderDetails1Id,
                quotationDetailsId: item.quotationDetailsId,
                proformaDetails1Id: item.proformaDetails1Id,
                ConversionFactor: item.ConversionFactor || 0,
                purchaseRate: safeParsePrice(item.PurchaseRate),
                qty: safeParsePrice(item.qty) || 1,
                freeQty: safeParsePrice(item.freeQty),
                unit: item.unitId || 2,
                salesRate: safeParsePrice(item.inclusiveRate || item.rate),
                desc: safeParsePrice(item.discountPercentage),
                descAmt: 0,
                netValue: safeParsePrice(item.netAmount),
                tax: safeParsePrice(item.taxAmount),
                taxRate: safeParsePrice(item.taxRate),
                taxId: item.taxId || null,
                taxAmt: safeParsePrice(item.taxAmount),
                amount: safeParsePrice(item.amount),
                taxType: item.taxType || 'Excluded',
                baseunitId: item.baseunitId || null,
                billDiscOnProduct: safeParsePrice(item.billDiscOnProduct),
                salesRateWithoutTax: safeParsePrice(item.rate),
                lineDiscountWithTax: safeParsePrice(item.lineDiscountWithTax),
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                barcodeInput: item.barcode || '',
                maximumSellingPrice: 0,
                lowestSellingPrice: 0,

                productDetails: rows[index]?.productDetails || {
                    productCode: item.productCode || '',
                    barcode: item.barcode || '',
                    partNo: '',
                    brand: '',
                    mrp: '',
                    purchase: item.PurchaseRate || '',
                    productDescription: item.productDescription || ''
                },
                availableUnits: rows[index]?.availableUnits || []
            }));
            setRows(mappedRows);
        }
    }, [propRows, editMode]);

    const getEditableColumns = () => {
        const columns = ['barcode', 'productName', 'qty'];
        if (saleSettings.showFeeQtyColumn) columns.push('freeQty');
        columns.push('unit', 'beforeTax', 'salesRate');
        if (saleSettings?.showLineDiscount) columns.push('desc', 'descAmt', 'lineDiscWithTax');
        if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') columns.push('tax');
        columns.push('amount');
        return columns;
    };

    const validateRowSequence = () => {
        const errors = {};
        let hasFilledRow = false;
        rows.forEach((row, index) => {
            const isRowFilled = row.productCode && row.productCode.trim() !== '';
            const hasAnyData = row.productName.trim() !== '' || row.barcodeInput.trim() !== '' || row.qty > 0 || row.salesRate > 0;
            if (isRowFilled) {
                hasFilledRow = true;
                const missingFields = [];
                if (!row.productName || row.productName.trim() === '') missingFields.push('Product Name');
                if (!row.qty || row.qty <= 0) missingFields.push('Quantity');
                if (row.salesRate === undefined || row.salesRate <= 0) missingFields.push('Sales Rate');
                if (!row.unit) missingFields.push('Unit');
                if (missingFields.length > 0) errors[row.id] = { type: 'incomplete', message: `Missing: ${missingFields.join(', ')}`, fields: missingFields };
            } else if (hasFilledRow && index < rows.length - 1) {
                const hasFilledRowsAfter = rows.slice(index + 1).some(r => r.productCode && r.productCode.trim() !== '');
                if (hasFilledRowsAfter) errors[row.id] = { type: 'skipped', message: 'Row skipped', fields: [] };
            } else if (!isRowFilled && hasAnyData && index < rows.length - 1) {
                errors[row.id] = { type: 'incomplete', message: 'Incomplete data - please select a product or clear the row', fields: [] };
            }
        });
        setRowErrors(errors);
        return Object.keys(errors).length === 0;
    };

    useEffect(() => { validateRowSequence(); }, [rows]);

    // REPLACE this entire useEffect in SalesInvoiceTable:

    useEffect(() => {
        if (!editMode) {
            if (!formData.salesDetails || formData.salesDetails.length === 0) return;

            const hasBillDisc = formData.billDiscount && parseFloat(formData.billDiscount) !== 0;
            const hasOtherCharge = formData.othercharge && parseFloat(formData.othercharge) !== 0;

            // ✅ FIX: also run when both are zero/empty so we can clear the per-row values
            const rowsHaveDistributedValues = rows.some(
                r => safeParsePrice(r.billDiscOnProduct) !== 0 || safeParsePrice(r.otherchargeonproduct) !== 0
            );

            if (!hasBillDisc && !hasOtherCharge && !rowsHaveDistributedValues) return;

            let hasChanges = false;
            const updatedRows = rows.map((row) => {
                if (!row.productCode) return row;

                const detail = formData.salesDetails.find(
                    d => d.productCode === row.productCode && d.SlNo === row.sn
                );
                if (!detail) return row;

                const billDiscChanged =
                    detail.billDiscOnProduct !== undefined &&
                    safeParsePrice(detail.billDiscOnProduct) !== safeParsePrice(row.billDiscOnProduct || 0);

                const otherChargeChanged =
                    detail.otherchargeonproduct !== undefined &&
                    safeParsePrice(detail.otherchargeonproduct) !== safeParsePrice(row.otherchargeonproduct || 0);

                if (billDiscChanged || otherChargeChanged) {
                    hasChanges = true;
                    return calculateRow({
                        ...row,
                        billDiscOnProduct: safeParsePrice(detail.billDiscOnProduct),
                        otherchargeonproduct: safeParsePrice(detail.otherchargeonproduct)
                    });
                }
                return row;
            });

            if (hasChanges) setRows(updatedRows);
        }
    }, [formData.salesDetails]);

    const handleLineDiscWithTaxChange = (rowId, withTaxValue) => {
        const withTax = safeParsePrice(withTaxValue) || 0;

        setRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;

            const taxRate = safeParsePrice(row.taxRate);
            const preTaxDiscount = withTax > 0
                ? withTax / (1 + taxRate / 100)
                : 0;
            const discAmt = safeParsePrice(preTaxDiscount.toFixed(generalSettings?.decimalPart || 2));

            const updatedRow = {
                ...row,
                lineDiscountWithTax: withTax,
                descAmt: discAmt
            };
            return calculateRow(updatedRow, 'descAmt');
        }));
    };

    const handleKeyDown = (e, rowId, currentField) => {
        if (currentField === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = rows.find(r => r.id === rowId);
            if (row && row.barcodeInput && row.barcodeInput.trim() !== '') {
                selectProductByBarcode(rowId, row.barcodeInput);
            } else {
                focusInput(rowId, 'productName');
            }
            return;
        }
        if (currentField === 'qty' && e.key === 'Enter') { e.preventDefault(); focusInput(rowId, 'beforeTax'); return; }
        if (currentField === 'descAmt' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'lineDiscWithTax');
            return;
        }
        if (currentField === 'lineDiscWithTax' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'amount');
            return;
        }
        if (currentField === 'beforeTax' && e.key === 'Enter') { e.preventDefault(); focusInput(rowId, 'salesRate'); return; }
        if (currentField === 'salesRate' && e.key === 'Enter') {
            e.preventDefault();
            const currentRowIndex = rows.findIndex(row => row.id === rowId);
            const currentRow = rows[currentRowIndex];
            if (!currentRow.salesRate || safeParsePrice(currentRow.salesRate) <= 0) return;
            if (currentRowIndex < rows.length - 1) {
                const nextRowId = rows[currentRowIndex + 1].id;
                if (saleSettings.focusAfterSalesRate === 'productName') focusInput(nextRowId, 'productName');
                else if (saleSettings.focusAfterSalesRate === 'barcode') focusInput(nextRowId, 'barcode');
                else focusInput(nextRowId, 'productName');
            } else {
                addRow();
                setTimeout(() => { focusInput(rows.length + 1, 'productName'); }, 0);
            }
            return;
        }
        if (currentField === 'productName' && activeSuggestionRow === rowId && suggestions[rowId]?.length > 0) {
            const currentIndex = selectedSuggestionIndex[rowId] ?? -1;
            const maxIndex = suggestions[rowId].length - 1;
            switch (e.key) {
                case 'ArrowDown': { e.preventDefault(); const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0; setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: nextIndex })); scrollSuggestionIntoView(rowId, nextIndex); return; }
                case 'ArrowUp': { e.preventDefault(); const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex; setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: prevIndex })); scrollSuggestionIntoView(rowId, prevIndex); return; }
                case 'Enter': { e.preventDefault(); if (currentIndex >= 0 && currentIndex <= maxIndex) { selectProduct(rowId, suggestions[rowId][currentIndex], suggestions[rowId][currentIndex].unitId); setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 })); } return; }
                case 'Escape': { e.preventDefault(); setActiveSuggestionRow(null); setSuggestions({}); setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 })); return; }
                default: break;
            }
        }
        const editableColumns = getEditableColumns();
        const currentRowIndex = rows.findIndex(row => row.id === rowId);
        const currentFieldIndex = editableColumns.indexOf(currentField);
        let targetRowId = rowId;
        let targetField = currentField;
        switch (e.key) {
            case 'ArrowRight': e.preventDefault(); if (currentFieldIndex < editableColumns.length - 1) targetField = editableColumns[currentFieldIndex + 1]; else if (currentRowIndex < rows.length - 1) { targetRowId = rows[currentRowIndex + 1].id; targetField = editableColumns[0]; } break;
            case 'ArrowLeft': e.preventDefault(); if (currentFieldIndex > 0) targetField = editableColumns[currentFieldIndex - 1]; else if (currentRowIndex > 0) { targetRowId = rows[currentRowIndex - 1].id; targetField = editableColumns[editableColumns.length - 1]; } break;
            case 'ArrowDown': e.preventDefault(); if (currentRowIndex < rows.length - 1) targetRowId = rows[currentRowIndex + 1].id; break;
            case 'ArrowUp': e.preventDefault(); if (currentRowIndex > 0) targetRowId = rows[currentRowIndex - 1].id; break;
            case 'Enter': e.preventDefault(); if (currentRowIndex < rows.length - 1) targetRowId = rows[currentRowIndex + 1].id; else { addRow(); setTimeout(() => { focusInput(rows.length + 1, currentField); }, 0); return; } break;
            default: return;
        }
        focusInput(targetRowId, targetField);
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                if (focusedRowId) setShowPurchaseRate(prev => ({ ...prev, [focusedRowId]: !prev[focusedRowId] }));
            }

            if (e.ctrlKey && e.key === 'F2') {
                e.preventDefault();
                if (focusedRowId) {
                    const currentRow = rows.find(r => r.id === focusedRowId);
                    if (currentRow?.productCode) {
                        setSelectedProductCode(currentRow.productDetails?.productCode || currentRow.productCode);
                        setEditProductModalOpen(true);
                    }
                }
            }

            if (e.altKey && e.key === 'F11') {
                e.preventDefault();
                if (focusedRowId) {
                    const currentRow = rows.find(r => r.id === focusedRowId);
                    if (currentRow?.productCode) {
                        setSelectedRowForHistory({
                            productCode: currentRow.productCode,
                            productName: currentRow.productName
                        });
                        setIsHistoryModalOpen(true);
                    }
                }
            }

        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [focusedRowId, rows, stockCounts]);

    const fetchAndSetStock = (rowId, productCode, godownId) => {
        if (!showProductStockCount) return;
        axiosInstance.post('get-product-stock', {
            productCode,
            branchId: selectedBranchId,
            godownId: godownId || formData.GodownId || 1,
        })
            .then(res => {
                const stock = res.data?.data?.[0]?.currentStock;
                if (stock !== undefined) {
                    setStockCounts(prev => ({ ...prev, [rowId]: stock }));
                }
            })
            .catch(err => console.error('Error fetching stock:', err));
    };

    const focusInput = (rowId, field) => {
        const key = `${rowId}-${field}`;
        setFocusedRowId(rowId);
        if (inputRefs.current[key]) {
            inputRefs.current[key].focus();
            setTimeout(() => { if (inputRefs.current[key]?.select) inputRefs.current[key].select(); }, 0);
        }
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (!activeElement?.closest('table')) { setIsTableFocused(false); setFocusedRowId(null); }
        }, 100);
    };

    const handleInputFocus = (rowId) => { setFocusedRowId(rowId); setIsTableFocused(true); };

    const getCurrentProductCode = () => {
        if (focusedRowId && isTableFocused) { const currentRow = rows.find(row => row.id === focusedRowId); return currentRow?.productCode || null; }
        return null;
    };

    useEffect(() => {
        if (!productsLoading && allProducts?.length > 0) {
            const timer = setTimeout(() => {
                const focusField = saleSettings?.focusAfterSalesRate === 'barcode' ? 'barcode' : 'productName';
                focusInput(1, focusField);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [productsLoading, allProducts]);

    useEffect(() => {
        setRows(prevRows => prevRows.map(row => ({ ...row, salesManId: formData.employeeId || null, GodownId: formData.GodownId || null })));
    }, [formData.employeeId, formData.GodownId]);
    // REPLACE the existing taxType useEffect
    const taxTypeInitRef = useRef(true);

    useEffect(() => {
        // ✅ Skip recalculation on first render in edit mode (DB values are already correct)
        if (taxTypeInitRef.current) {
            taxTypeInitRef.current = false;
            return;
        }
        setRows(prevRows => prevRows.map(row => {
            if (!row.productCode) return row;

            const taxApplicableNow = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';
            const taxRate = safeParsePrice(row.taxRate);
            const taxMultiplier = 1 + (taxRate / 100);

            let newSalesRate = safeParsePrice(row.salesRate);
            let newSalesRateWithoutTax = safeParsePrice(row.salesRateWithoutTax);

            if (!taxApplicableNow) {
                if (generalSettings?.taxincluded === true) {
                    // Was inclusive with tax → switching to NA
                    // salesRate (inclusive) stays as-is, both rates = salesRate
                    // Total should not change — price already had tax baked in
                    newSalesRate = safeParsePrice(row.salesRate);
                    newSalesRateWithoutTax = safeParsePrice(row.salesRate); // base = full price
                } else {
                    // Was exclusive with tax → switching to NA
                    // salesRate was ex-tax, keep it as-is, no tax added
                    newSalesRate = safeParsePrice(row.salesRateWithoutTax);
                    newSalesRateWithoutTax = safeParsePrice(row.salesRateWithoutTax);
                }
            } else {
                // Switching back TO applicable
                if (generalSettings?.taxincluded === true) {
                    // salesRate is the inclusive price — derive withoutTax
                    newSalesRate = safeParsePrice(row.salesRate);
                    newSalesRateWithoutTax = taxMultiplier !== 0
                        ? newSalesRate / taxMultiplier
                        : newSalesRate;
                } else {
                    // salesRate is ex-tax — derive inclusive
                    newSalesRateWithoutTax = safeParsePrice(row.salesRateWithoutTax);
                    newSalesRate = newSalesRateWithoutTax * taxMultiplier;
                }
            }

            return calculateRow({
                ...row,
                salesRate: newSalesRate,
                salesRateWithoutTax: newSalesRateWithoutTax,
            });
        }));
    }, [formData.taxType]);
    useEffect(() => {
        const handleClickOutside = (event) => { if (suggestionRef.current && !suggestionRef.current.contains(event.target)) { setActiveSuggestionRow(null); setSuggestions({}); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const filledRows = rows.filter(row => row.productCode && row.productCode.trim() !== '');

        const salesDetails = filledRows.map((row, index) => ({
            deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
            orderDetails1Id: row.orderDetails1Id,
            quotationDetailsId: row.quotationDetailsId,
            proformaDetails1Id: row.proformaDetails1Id,
            SlNo: index + 1,
            productCode: row.productCode,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            qty: row.qty || null,
            freeQty: null,
            rate: row.salesRateWithoutTax || null,
            inclusiveRate: row.salesRate || null,
            lineDiscountWithTax: row.lineDiscountWithTax || null,
            unitId: row.unit || null,
            unitName: row.productDetails?.UnitName || '',
            discountPercentage: row.desc || null,
            taxId: row.taxId || null,
            taxRate: row.taxRate || null,
            taxType: row.taxType || "Excluded",
            ConversionFactor: row.ConversionFactor || 0,
            barcode: row.productDetails.barcode || "",
            PurchaseRate: Number(row.purchaseRate) || null,
            taxAmount: row.taxAmt || null,
            grossAmount: row.netValue || null,
            netAmount: row.netValue || null,
            amount: row.amount || null,
            productDescription: row.productDetails.productDescription || "",
            billDiscOnProduct: row.billDiscOnProduct || 0,
            AddCostonProduct: null,
            otherchargeonproduct: row.otherchargeonproduct || 0,
            salesManId: formData.employeeId, GodownId: formData.GodownId,
            RackId: null,
            branchId: selectedBranchId,
            baseUnitid: row.baseunitId || null,
        }));

        const taxableAmt = filledRows.reduce((sum, row) => sum + safeParsePrice(row.netValue), 0);
        const totalTax = filledRows.reduce((sum, row) => sum + safeParsePrice(row.taxAmt), 0);
        const totalAmount = filledRows.reduce((sum, row) => sum + safeParsePrice(row.amount), 0);

        const totalDiscount = filledRows.reduce((sum, row) => sum + safeParsePrice(row.descAmt), 0);
        setFormData(prev => ({
            ...prev, salesDetails,
            taxableAmt: taxableAmt.toFixed(generalSettings.decimalPart),
            subTotal: taxableAmt.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart)
        }));
    }, [rows, selectedBranchId]);

    const addRowAfter = async (rowId) => {
        if (editMode) {
            const result = await Swal.fire({ title: t("salesInvoice.alert.addRowAfter.title"), text: t("salesInvoice.alert.addRowAfter.text"), icon: "warning", showCancelButton: true, confirmButtonColor: "#3085d6", cancelButtonColor: "#d33", confirmButtonText: t("salesInvoice.alert.addRowAfter.confirm"), cancelButtonText: t("delete.cancel") });
            if (!result.isConfirmed) return;
        }
        const index = rows.findIndex((row) => row.id === rowId);
        const newRow = { id: Date.now(), sn: 0, barcodeInput: '', productName: '', productNameArb: '', productCode: '', purchaseRate: '', qty: 1, deliveryNoteDetails1Id: '', orderDetails1Id: '', quotationDetailsId: '', proformaDetails1Id: '', ConversionFactor: 0, freeQty: 0, unit: 2, salesRate: 0, taxRate: 0, desc: 0, descAmt: 0, netValue: 0, tax: 0, taxId: null, taxAmt: 0, amount: 0, taxType: 'Excluded', baseunitId: null, maximumSellingPrice: 0, lowestSellingPrice: 0, salesRateWithoutTax: 0, productDetails: { barcode: '', partNo: '', brand: '', mrp: '', purchase: '', description: '', productCode: '' } };
        const updatedRows = [...rows];
        updatedRows.splice(index + 1, 0, newRow);
        setRows(updatedRows.map((row, idx) => ({ ...row, id: idx + 1, sn: idx + 1 })));
    };

    const fetchTaxData = async () => {
        try { const res = await axiosInstance.get("tax-masters"); setTaxData(res.data.data || []); }
        catch (err) { console.error("Error fetching tax:", err); }
    };
    const calculateRow = (row, updatedField = null) => {
        let gross, descAmt, netValue, taxAmt = 0, amount, descPercentage, salesRateWithoutTax = 0;
        const otherChargeOnProduct = parseFloat(row.otherchargeonproduct || 0);
        const qty = parseFloat(row.qty) || 0;
        const salesRate = parseFloat(row.salesRate) || 0;
        const taxPercentage = parseFloat(row.taxRate) || 0;
        const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;

        const taxMultiplier = 1 + (taxPercentage / 100);
        const taxApplicable = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';

        if (updatedField === 'beforeTax') {
            const beforeTaxRate = parseFloat(row.salesRateWithoutTax) || 0;

            if (!taxApplicable) {
                return calculateRow({ ...row, salesRate: beforeTaxRate });
            }

            const derivedSalesRate = generalSettings?.taxincluded === true
                ? beforeTaxRate * taxMultiplier
                : beforeTaxRate;

            return calculateRow({ ...row, salesRate: parseFloat(derivedSalesRate) });
        }
        // ← FIX: use stored salesRateWithoutTax when available,
        //         back-calculate only when user is editing salesRate directly
        // REPLACE the rateWithoutTax block in calculateRow

        const rateWithoutTax = (row.salesRateWithoutTax && safeParsePrice(row.salesRateWithoutTax) > 0 && updatedField !== 'salesRate' && updatedField !== 'beforeTax')
            ? safeParsePrice(row.salesRateWithoutTax)
            : (!taxApplicable || taxMultiplier === 0)
                ? salesRate
                : (salesRate * 100) / (100 + taxPercentage);

        salesRateWithoutTax = safeParsePrice(rateWithoutTax);
        salesRateWithoutTax = safeParsePrice(rateWithoutTax);
        if (updatedField === 'amount') {
            const inputAmount = parseFloat(row.amount) || 0;

            if (qty <= 0) return row;

            const existingDescAmt = parseFloat(row.descAmt) || 0;
            const taxMultiplier = 1 + (taxPercentage / 100);

            if (generalSettings?.taxincluded === true) {
                const netValueAfterBillDisc = inputAmount / taxMultiplier;
                const netValueBeforeBillDisc = netValueAfterBillDisc + billDiscOnProduct - otherChargeOnProduct;
                const grossWithoutTax = netValueBeforeBillDisc + existingDescAmt;
                const rateWithoutTaxCalc = grossWithoutTax / qty;
                const calculatedSalesRate = rateWithoutTaxCalc * taxMultiplier;
                salesRateWithoutTax = rateWithoutTaxCalc;

                gross = grossWithoutTax;
                netValue = gross - existingDescAmt;
                descPercentage = gross > 0 ? (existingDescAmt / gross) * 100 : 0;

                if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') {
                    taxAmt = netValueAfterBillDisc * taxPercentage / 100;
                } else {
                    taxAmt = 0;
                }

                return {
                    ...row,
                    amount: parseFloat(inputAmount.toFixed(generalSettings?.decimalPart || 2)),
                    salesRate: parseFloat(calculatedSalesRate.toFixed(generalSettings?.decimalPart || 2)),
                    salesRateWithoutTax: parseFloat(salesRateWithoutTax.toFixed(generalSettings?.decimalPart || 2)),
                    grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),
                    netValue: parseFloat(netValue.toFixed(generalSettings?.decimalPart || 2)),
                    taxAmt: parseFloat(taxAmt.toFixed(generalSettings?.decimalPart || 2)),
                    desc: parseFloat(descPercentage.toFixed(generalSettings?.decimalPart || 2)),
                    descAmt: parseFloat(existingDescAmt.toFixed(generalSettings?.decimalPart || 2)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings?.decimalPart || 2))
                };

            } else {
                const netValueAfterBillDisc = inputAmount / taxMultiplier;
                const netValueBeforeBillDisc = netValueAfterBillDisc + billDiscOnProduct - otherChargeOnProduct;

                if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') {
                    taxAmt = inputAmount - netValueAfterBillDisc;
                } else {
                    taxAmt = 0;
                }

                netValue = netValueBeforeBillDisc;
                gross = netValue + existingDescAmt;

                netValue = netValueAfterBillDisc + billDiscOnProduct;
                gross = netValue + existingDescAmt;
                const calculatedSalesRate = qty > 0 ? gross / qty : 0;
                salesRateWithoutTax = calculatedSalesRate;
                descPercentage = gross > 0 ? (existingDescAmt / gross) * 100 : 0;

                return {
                    ...row,
                    amount: parseFloat(inputAmount.toFixed(generalSettings?.decimalPart || 2)),
                    salesRate: parseFloat(calculatedSalesRate.toFixed(generalSettings?.decimalPart || 2)),
                    salesRateWithoutTax: parseFloat(salesRateWithoutTax.toFixed(generalSettings?.decimalPart || 2)),
                    grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),
                    netValue: parseFloat(netValue.toFixed(generalSettings?.decimalPart || 2)),
                    taxAmt: parseFloat(taxAmt.toFixed(generalSettings?.decimalPart || 2)),
                    desc: parseFloat(descPercentage.toFixed(generalSettings?.decimalPart || 2)),
                    descAmt: parseFloat(existingDescAmt.toFixed(generalSettings?.decimalPart || 2)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings?.decimalPart || 2)),
                    otherchargeonproduct: parseFloat((parseFloat(row.otherchargeonproduct || 0)).toFixed(generalSettings?.decimalPart || 2)),
                };
            }
        }

        // NORMAL CALCULATION FLOW
        gross = rateWithoutTax * qty;

        if (generalSettings?.taxincluded === true) {
            if (updatedField === 'descAmt') {
                descAmt = parseFloat(row.descAmt) || 0;
                descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
            } else {
                descPercentage = parseFloat(row.desc) || 0;
                descAmt = (gross * descPercentage) / 100;
            }

            netValue = gross - descAmt;
            const netValueAfterBillDisc = netValue - billDiscOnProduct + otherChargeOnProduct;

            if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') {
                taxAmt = (netValueAfterBillDisc * taxPercentage) / 100;
            } else {
                taxAmt = 0;
            }

            amount = netValueAfterBillDisc + taxAmt;

        } else {
            if (updatedField === 'descAmt') {
                descAmt = parseFloat(row.descAmt) || 0;
                descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
            } else {
                descPercentage = parseFloat(row.desc) || 0;
                descAmt = (gross * descPercentage) / 100;
            }

            netValue = gross - descAmt;
            const netValueAfterBillDisc = netValue - billDiscOnProduct + otherChargeOnProduct;

            if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') {
                taxAmt = (netValueAfterBillDisc * taxPercentage) / 100;
            } else {
                taxAmt = 0;
            }

            amount = netValueAfterBillDisc + taxAmt;
            amount = netValueAfterBillDisc + taxAmt + otherChargeOnProduct;
        }

        return {
            ...row,
            desc: parseFloat(descPercentage.toFixed(generalSettings?.decimalPart || 2)),
            grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),
            netValue: parseFloat(netValue.toFixed(generalSettings?.decimalPart || 2)),
            taxAmt: parseFloat(taxAmt.toFixed(generalSettings?.decimalPart || 2)),
            amount: parseFloat(amount.toFixed(generalSettings?.decimalPart || 2)),
            descAmt: parseFloat(descAmt.toFixed(generalSettings?.decimalPart || 2)),
            salesRateWithoutTax: parseFloat(salesRateWithoutTax.toFixed(generalSettings?.decimalPart || 2)),
            billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings?.decimalPart || 2)),
            otherchargeonproduct: parseFloat((parseFloat(row.otherchargeonproduct || 0)).toFixed(generalSettings?.decimalPart || 2)),
        };
    };

    const validateSalesPrice = (price, row) => {
        const action = saleSettings?.ledgerPricingAlertAction || 'block'; // default to 'block'

        // If ignore action, skip validation entirely
        if (action === 'ignore') return { isValid: true, message: '', action: 'ignore' };

        if (!ledgerPricingAlert || ledgerPricingAlert === 'none') return { isValid: true, message: '', action };
        const maxPrice = safeParsePrice(row.maximumSellingPrice);
        const minPrice = safeParsePrice(row.lowestSellingPrice);
        const customerName = (formData.customerName || '').toLowerCase();
        const includesCash = customerName.includes('cash');
        let shouldValidate = false;
        if (ledgerPricingAlert === 'always') shouldValidate = true;
        else if (ledgerPricingAlert === 'cashCustomer') shouldValidate = includesCash;
        else if (ledgerPricingAlert === 'creditCustomer') shouldValidate = !includesCash;
        if (!shouldValidate || (maxPrice === 0 && minPrice === 0)) return { isValid: true, message: '', action };
        if (maxPrice > 0 && price > maxPrice) return { isValid: false, message: `Price cannot exceed maximum selling price: ${maxPrice.toFixed(generalSettings.decimalPart)}`, action };
        if (minPrice > 0 && price < minPrice) return { isValid: false, message: `Price cannot be less than lowest selling price: ${minPrice.toFixed(generalSettings.decimalPart)}`, action };
        return { isValid: true, message: '', action };
    };

    const scrollSuggestionIntoView = (rowId, index) => {
        setTimeout(() => {
            const el = document.querySelector(`[data-suggestion-row="${rowId}"] [data-suggestion-index="${index}"]`);
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 0);
    };

    const getSalesPrice = (product, unitId) => {
        if (!Array.isArray(product.salesPrice)) {
            return {
                price: safeParsePrice(product.salesPrice),
                lowestSellingPrice: safeParsePrice(product.lowestSellingPrice),
                maximumSellingPrice: safeParsePrice(product.maximumSellingPrice),
            };
        }
        const pricingLevelId = formData.pricingLevelId || 1;
        let priceEntry = product.salesPrice.find(p => p.unitId === unitId && p.branchId === selectedBranchId && p.PricingLevelId === pricingLevelId);
        if (!priceEntry) priceEntry = product.salesPrice.find(p => p.branchId === selectedBranchId && p.PricingLevelId === pricingLevelId);
        if (!priceEntry && pricingLevelId !== 1) priceEntry = product.salesPrice.find(p => p.unitId === unitId && p.branchId === selectedBranchId && p.PricingLevelId === 1);
        if (!priceEntry) priceEntry = product.salesPrice.find(p => p.unitId === unitId && p.PricingLevelId === pricingLevelId);
        if (!priceEntry) priceEntry = product.salesPrice.find(p => p.unitId === unitId);
        if (!priceEntry && product.salesPrice.length > 0) priceEntry = product.salesPrice[0];
        return {
            price: safeParsePrice(priceEntry?.salesPrice),
            lowestSellingPrice: safeParsePrice(priceEntry?.lowestSellingPrice),
            maximumSellingPrice: safeParsePrice(product.maximumSellingPrice || priceEntry?.amount),
        };
    };

    const getDisplayPrice = (product) => {
        if (!Array.isArray(product.salesPrice)) return safeParsePrice(product.salesPrice);
        return safeParsePrice(getSalesPrice(product, product.unitId).price);
    };

    const filterProducts = (searchTerm, rowId) => {
        if (!searchTerm || searchTerm.trim() === '') { setSuggestions(prev => ({ ...prev, [rowId]: [] })); setLoadingProducts(prev => ({ ...prev, [rowId]: false })); setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 })); return; }
        try {
            setLoadingProducts(prev => ({ ...prev, [rowId]: true }));
            const searchLower = searchTerm.toLowerCase().trim();
            const searchParts = searchLower.split(/\s+/);
            const filteredProducts = allProducts.filter(product => {
                const productName = (product.productName || '').toLowerCase();
                const productCode = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();
                const unitName = (product.unitName || '').toLowerCase();
                const salesPriceStr = Array.isArray(product?.salesPrice) ? product?.salesPrice.map(p => p?.salesPrice || '').join(' ') : (product?.salesPrice || '').toString();
                const salesPrice = salesPriceStr.toLowerCase();
                if (productCode.includes(searchLower) || barcode.includes(searchLower) || partNo.includes(searchLower) || salesPrice.includes(searchLower) || unitName.includes(searchLower)) return true;
                const nameWords = productName.split(/\s+/);
                return searchParts.every(searchPart => nameWords.some(word => word.includes(searchPart)));
            });
            setSuggestions(prev => ({ ...prev, [rowId]: filteredProducts }));
            setActiveSuggestionRow(rowId);
            setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: 0 }));
        } catch (err) { console.error("Error filtering products:", err); }
        finally { setLoadingProducts(prev => ({ ...prev, [rowId]: false })); }
    };

    const checkDuplicateProduct = async (productCode, currentRowId) => {
        if (!askConfirmationWithSameProduct) return { proceed: true, action: null };

        const existingRow = rows.find(
            row => row.productCode === productCode && row.id !== currentRowId
        );

        if (existingRow) {
            document.activeElement?.blur();
            const result = await Swal.fire({
                title: t("salesInvoice.alert.duplicateProduct.title") || "Product Already Selected",
                text: t("salesInvoice.alert.duplicateProduct.text") || "This product is already in the invoice. What would you like to do?",
                icon: "warning",
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonColor: "#3085d6",
                denyButtonColor: "#10b981",
                cancelButtonColor: "#d33",
                confirmButtonText: t("salesInvoice.alert.duplicateProduct.addQty") || "Add to Quantity",
                denyButtonText: t("salesInvoice.alert.duplicateProduct.addNew") || "Add New Row",
                cancelButtonText: t("delete.cancel") || "Cancel"
            });

            if (result.isConfirmed) {
                return { proceed: false, action: 'addQty', existingRowId: existingRow.id };
            } else if (result.isDenied) {
                return { proceed: true, action: 'addNew' };
            } else {
                return { proceed: false, action: 'cancel' };
            }
        }

        return { proceed: true, action: null };
    };

    const selectProduct = async (rowId, product, selectedUnitId) => {

        try {
            const duplicateCheck = await checkDuplicateProduct(product.productCode, rowId);

            if (!duplicateCheck.proceed) {
                if (duplicateCheck.action === 'addQty' && duplicateCheck.existingRowId) {
                    setIsUpdatingFromDuplicate(true);

                    setRows(prev => prev.map(row => {
                        if (row.id === duplicateCheck.existingRowId) {
                            const newQty = safeParsePrice(row.qty) + 1;
                            return calculateRow({ ...row, qty: newQty });
                        }
                        if (row.id === rowId) {
                            return { ...row, barcodeInput: '' };
                        }
                        return row;
                    }));

                    setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
                    setActiveSuggestionRow(null);

                    const currentRow = rows.find(r => r.id === rowId);
                    if (currentRow && !currentRow.productCode) {
                        setInputValues(prev => {
                            const newValues = { ...prev };
                            delete newValues[`${rowId}-productName`];
                            return newValues;
                        });
                    }

                    setTimeout(() => {
                        const rowElement = document.querySelector(
                            `input[name="qty-${duplicateCheck.existingRowId}"]`
                        )?.closest('tr');

                        if (rowElement) {
                            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            rowElement.classList.add('bg-yellow-200', 'dark:bg-yellow-800');
                            setTimeout(() => {
                                rowElement.classList.remove('bg-yellow-200', 'dark:bg-yellow-800');
                            }, 1000);
                        }

                        focusInput(rowId, 'barcode');
                        setIsUpdatingFromDuplicate(false);
                    }, 200);

                    return;
                } else if (duplicateCheck.action === 'cancel') {
                    setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
                    setActiveSuggestionRow(null);
                    return;
                }
            }

            const selectedUnit = product.units?.find(u => u.unitId === selectedUnitId) || product.units?.[0];
            const priceInfo = getSalesPrice(product, selectedUnitId);
            const productPrice = safeParsePrice(priceInfo.price);
            const purchaseRate = product?.purchaseRate;
            const defaultTax = product.salesTaxes?.length > 0 ? product.salesTaxes[product.salesTaxes.length - 1] : null;
            const taxRate = safeParsePrice(defaultTax?.rate);

            // Handle tax included/excluded pricing — NO toFixed on rate fields
            let salesRate, salesRateWithoutTax;

            const taxApplicable = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';

            if (!taxApplicable) {
                // No tax scenario — both rates equal the product price
                salesRate = productPrice;
                salesRateWithoutTax = productPrice;
            } else if (generalSettings?.taxincluded === true) {
                // Price from master is inclusive
                salesRate = productPrice;
                const taxMultiplier = 1 + (taxRate / 100);
                salesRateWithoutTax = taxMultiplier !== 0 ? productPrice / taxMultiplier : productPrice;
            } else {
                // Price from master is ex-tax
                salesRateWithoutTax = productPrice;
                salesRate = productPrice * (1 + (taxRate / 100));
            }

            const updatedRows = rows.map((row) => {
                if (row.id === rowId) {
                    const updatedRow = {
                        ...row,
                        deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
                        barcodeInput: product.barcode || '',
                        orderDetails1Id: row.orderDetails1Id,
                        quotationDetailsId: row.quotationDetailsId,
                        proformaDetails1Id: row.proformaDetails1Id,
                        productName: product.productName || '',
                        productCode: product.productCode || '',
                        ConversionFactor: safeParsePrice(product.conversionRate || selectedUnit?.conversionrate),
                        availableUnits: product.units || [],
                        unit: selectedUnitId || product.unitId || row.unit,
                        baseunitId: product.baseunitId || null,
                        // NO toFixed on salesRate and salesRateWithoutTax
                        salesRate: safeParsePrice(salesRate),
                        salesRateWithoutTax: safeParsePrice(salesRateWithoutTax),
                        taxId: defaultTax?.taxId || null,
                        tax: taxRate,
                        taxRate: taxRate,
                        taxType: product?.taxType || 'Excluded',
                        salesTaxes: product.salesTaxes || [],
                        purchaseRate,
                        productNameArb: product.productNameArb,
                        maximumSellingPrice: safeParsePrice(priceInfo.maximumSellingPrice),
                        lowestSellingPrice: safeParsePrice(priceInfo.lowestSellingPrice),
                        productDetails: {
                            barcode: product.barcode || '',
                            productCode: product.productCode,
                            UnitName: selectedUnit?.unitName || product.unitName || ''
                        },
                    };
                    return calculateRow(updatedRow);
                }
                return row;
            });

            setRows(updatedRows);
            // In selectProduct — replace the rowRef.current?.scrollTo line:
            setTimeout(() => {
                if (saleSettings?.gridFixedHeight === true) {
                    rowRef.current?.scrollTo({ top: rowRef.current.scrollHeight, behavior: 'smooth' });
                } else {
                    const selectedRow = inputRefs.current[`${rowId}-qty`]?.closest('tr');
                    if (selectedRow) selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 10);
            fetchAndSetStock(rowId, product.productCode, formData.GodownId);
            setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
            setActiveSuggestionRow(null);
            setRows(updatedRows);

            setTimeout(() => {
                if (saleSettings?.gridFixedHeight === true) {
                    rowRef.current?.scrollTo({ top: rowRef.current.scrollHeight, behavior: 'smooth' });
                } else {
                    const selectedRow = inputRefs.current[`${rowId}-qty`]?.closest('tr');
                    if (selectedRow) selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 10);

            fetchAndSetStock(rowId, product.productCode, formData.GodownId);
            setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
            setActiveSuggestionRow(null);

            setTimeout(() => {
                const focusSetting = saleSettings?.GridFocusingProductNameToNext;
                const currentRowIndex = updatedRows.findIndex(r => r.id === rowId);
                const isLastRow = currentRowIndex === updatedRows.length - 1;

                if (focusSetting === 'BarcodeInNextRow' || focusSetting === 'productNameInNextRow') {
                    const focusField = focusSetting === 'BarcodeInNextRow' ? 'barcode' : 'productName';

                    if (!isLastRow) {
                        // Next row already exists
                        const nextRowId = updatedRows[currentRowIndex + 1].id;
                        focusInput(nextRowId, focusField);
                    } else {
                        // Need to add a new row first
                        const newRowId = updatedRows.length + 1;
                        setRows(prev => [
                            ...prev,
                            {
                                id: newRowId,
                                sn: newRowId,
                                barcodeInput: '',
                                productName: '',
                                productNameArb: '',
                                deliveryNoteDetails1Id: '',
                                orderDetails1Id: '',
                                quotationDetailsId: '',
                                proformaDetails1Id: '',
                                productCode: '',
                                ConversionFactor: 0,
                                purchaseRate: 0,
                                qty: 1,
                                freeQty: 0,
                                unit: 2,
                                salesRate: 0,
                                salesRateWithoutTax: 0,
                                desc: 0,
                                descAmt: 0,
                                netValue: 0,
                                tax: 0,
                                taxRate: 0,
                                taxId: null,
                                taxAmt: 0,
                                amount: 0,
                                taxType: 'Excluded',
                                salesManId: formData.employeeId || null,
                                GodownId: formData.GodownId || null,
                                baseunitId: null,
                                maximumSellingPrice: 0,
                                lowestSellingPrice: 0,
                                lineDiscountWithTax: null,
                                salesTaxes: [],
                                productDetails: {
                                    barcode: '',
                                    partNo: '',
                                    brand: '',
                                    mrp: '',
                                    purchase: '',
                                    description: '',
                                    productCode: ''
                                }
                            }
                        ]);
                        // Use pending focus refs — they trigger after rows state updates
                        if (focusField === 'barcode') {
                            setPendingFocusBarcodeRowId(newRowId);
                        } else {
                            setPendingFocusField('productName');
                            setPendingFocusRowId(newRowId);
                        }
                    }
                } else {
                    // Default: qty on same row
                    focusInput(rowId, 'qty');
                }
            }, 100);
        } catch (err) {
            console.error("Error selecting product:", err);
        }
    };

    const selectProductByBarcode = async (rowId, barcode) => {
        try {
            if (!barcode || barcode.trim() === '') return;

            let product = allProducts.find(p => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase());

            if (!product) {
                product = allProducts.find(p => p.productCode && p.productCode.toLowerCase() === barcode.toLowerCase());
            }

            if (!product) {
                Swal.fire({
                    title: t("salesInvoice.form.gridSection.alert.barcodeNotFound"),
                    text: t("salesInvoice.form.gridSection.alert.description"),
                    icon: "warning",
                    confirmButtonColor: "#3085d6",
                    confirmButtonText: t("okBtn")
                });
                return;
            }

            const duplicateCheck = await checkDuplicateProduct(product.productCode, rowId);

            if (!duplicateCheck.proceed) {
                if (duplicateCheck.action === 'addQty' && duplicateCheck.existingRowId) {
                    setIsUpdatingFromDuplicate(true);

                    setRows(prev => prev.map(row => {
                        if (row.id === duplicateCheck.existingRowId) {
                            const newQty = safeParsePrice(row.qty) + 1;
                            return calculateRow({ ...row, qty: newQty });
                        }
                        if (row.id === rowId) {
                            return { ...row, barcodeInput: '' };
                        }
                        return row;
                    }));

                    setTimeout(() => {
                        const rowElement = document.querySelector(
                            `input[name="qty-${duplicateCheck.existingRowId}"]`
                        )?.closest('tr');

                        if (rowElement) {
                            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            rowElement.classList.add('bg-yellow-200', 'dark:bg-yellow-800');
                            setTimeout(() => {
                                rowElement.classList.remove('bg-yellow-200', 'dark:bg-yellow-800');
                            }, 1000);
                        }

                        focusInput(rowId, 'barcode');
                        setIsUpdatingFromDuplicate(false);
                    }, 200);

                    return;
                } else if (duplicateCheck.action === 'cancel') {
                    setRows(prev => prev.map(r => r.id === rowId ? { ...r, barcodeInput: '' } : r));
                    return;
                }
            }

            const selectedUnit = product.units?.find(
                u => u.barcode && u.barcode.toLowerCase() === barcode.toLowerCase()
            ) || product.units?.[0];

            const priceInfo = getSalesPrice(product, product.unitId);
            const productPrice = safeParsePrice(priceInfo.price);
            const defaultTax = product.salesTaxes?.length > 0 ? product.salesTaxes[0] : null;
            const taxRate = safeParsePrice(defaultTax?.rate);

            // Handle tax included/excluded pricing — NO toFixed on rate fields
            let salesRate, salesRateWithoutTax;

            const taxApplicable = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';

            if (!taxApplicable) {
                // No tax scenario — both rates equal the product price
                salesRate = productPrice;
                salesRateWithoutTax = productPrice;
            } else if (generalSettings?.taxincluded === true) {
                // Price from master is inclusive
                salesRate = productPrice;
                const taxMultiplier = 1 + (taxRate / 100);
                salesRateWithoutTax = taxMultiplier !== 0 ? productPrice / taxMultiplier : productPrice;
            } else {
                // Price from master is ex-tax
                salesRateWithoutTax = productPrice;
                salesRate = productPrice * (1 + (taxRate / 100));
            }
            const updatedRows = rows.map((row) => {
                if (row.id === rowId) {
                    const updatedRow = {
                        ...row,
                        deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
                        barcodeInput: product.barcode,
                        orderDetails1Id: row.orderDetails1Id,
                        quotationDetailsId: row.quotationDetailsId,
                        proformaDetails1Id: row.proformaDetails1Id,
                        productName: product.productName || '',
                        productCode: product.productCode || '',
                        ConversionFactor: safeParsePrice(product.conversionRate || selectedUnit?.conversionrate),
                        availableUnits: product.units || [],
                        unit: product.unitId || row.unit,
                        baseunitId: product.baseunitId || null,
                        // NO toFixed on salesRate and salesRateWithoutTax
                        salesRate: safeParsePrice(salesRate),
                        salesRateWithoutTax: safeParsePrice(salesRateWithoutTax),
                        taxId: defaultTax?.taxId || null,
                        tax: taxRate,
                        taxRate: taxRate,
                        taxType: product?.taxType || 'Excluded',
                        salesTaxes: product.salesTaxes || [],
                        purchaseRate: safeParsePrice(product.purchaseRate),
                        productNameArb: product.productNameArb,
                        maximumSellingPrice: safeParsePrice(priceInfo.maximumSellingPrice),
                        lowestSellingPrice: safeParsePrice(priceInfo.lowestSellingPrice),
                        productDetails: {
                            barcode: product.barcode || '',
                            productCode: product.productCode,
                            UnitName: product.unitName || ''
                        },
                    };
                    return calculateRow(updatedRow);
                }
                return row;
            });

            setRows(updatedRows);
            // In selectProductByBarcode — replace the rowRef.current?.scrollTo line:
            setTimeout(() => {
                if (saleSettings?.gridFixedHeight === true) {
                    rowRef.current?.scrollTo({ top: rowRef.current.scrollHeight, behavior: 'smooth' });
                } else {
                    const selectedRow = inputRefs.current[`${rowId}-barcode`]?.closest('tr');
                    if (selectedRow) selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 10);
            fetchAndSetStock(rowId, product.productCode, formData.GodownId);
            setTimeout(() => {
                const focusSetting = saleSettings?.GridFocusingBarcodeToNext;

                if (focusSetting === 'ProductNameOnSameRow') {
                    focusInput(rowId, 'productName');
                } else {
                    // Default: BarcodeInNextRow (or any unrecognized value)
                    const currentRowIndex = rows.findIndex(r => r.id === rowId);

                    if (currentRowIndex < rows.length - 1) {
                        const nextRowId = rows[currentRowIndex + 1].id;
                        focusInput(nextRowId, 'barcode');
                    } else {
                        const newRowId = rows.length + 1;
                        setRows(prev => [
                            ...prev,
                            {
                                id: newRowId,
                                sn: newRowId,
                                barcodeInput: '',
                                productName: '',
                                productNameArb: '',
                                deliveryNoteDetails1Id: '',
                                orderDetails1Id: '',
                                quotationDetailsId: '',
                                proformaDetails1Id: '',
                                productCode: '',
                                ConversionFactor: 0,
                                purchaseRate: 0,
                                qty: 1,
                                freeQty: 0,
                                unit: 2,
                                salesRate: 0,
                                salesRateWithoutTax: 0,
                                desc: 0,
                                descAmt: 0,
                                netValue: 0,
                                tax: 0,
                                taxRate: 0,
                                taxId: null,
                                taxAmt: 0,
                                amount: 0,
                                taxType: 'Excluded',
                                salesManId: formData.employeeId || null,
                                GodownId: formData.GodownId || null,
                                baseunitId: null,
                                maximumSellingPrice: 0,
                                lowestSellingPrice: 0,
                                lineDiscountWithTax: null,
                                salesTaxes: [],
                                productDetails: {
                                    barcode: '',
                                    partNo: '',
                                    brand: '',
                                    mrp: '',
                                    purchase: '',
                                    description: '',
                                    productCode: ''
                                }
                            }
                        ]);
                        setPendingFocusBarcodeRowId(newRowId);
                    }
                }
            }, 100);

        } catch (err) {
            console.error("Error fetching product by barcode/product code:", err);
        }
    };

    useEffect(() => {
        if (activeSuggestionRow !== null && selectedSuggestionIndex[activeSuggestionRow] >= 0) {
            const suggestionContainer = suggestionRef.current;
            const activeItem = suggestionContainer?.querySelector(`[data-suggestion-index="${selectedSuggestionIndex[activeSuggestionRow]}"]`);
            if (activeItem && suggestionContainer) {
                const containerRect = suggestionContainer.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                const stickyButtonHeight = 42;
                if (itemRect.bottom > containerRect.bottom - stickyButtonHeight) suggestionContainer.scrollTop += itemRect.bottom - containerRect.bottom + stickyButtonHeight;
                else if (itemRect.top < containerRect.top) suggestionContainer.scrollTop -= containerRect.top - itemRect.top;
            }
        }
    }, [selectedSuggestionIndex, activeSuggestionRow]);

    const handleProductUpdate = (productCode, updatedDescription) => {
        setRows(prevRows => prevRows.map(row => row.productDetails.productCode === productCode ? { ...row, productDetails: { ...row.productDetails, productDescription: updatedDescription } } : row));
    };

    const handleInputChange = (id, field, value, updatedField = null) => {
        const updatedRows = rows.map(row => {
            if (row.id === id) {
                if (field === 'beforeTax') {
                    // Explicitly set salesRateWithoutTax to the typed value
                    const updatedRow = {
                        ...row,
                        salesRateWithoutTax: safeParsePrice(value),
                        // Also sync salesRate so calculateRow's cache doesn't override
                        salesRate: row.salesRate
                    };
                    return calculateRow(updatedRow, 'beforeTax');
                }
                let updatedRow = { ...row, [field]: value };
                const resolvedUpdatedField = updatedField ?? (field === 'salesRate' ? 'salesRate' : null);
                return calculateRow(updatedRow, resolvedUpdatedField);
            }
            return row;
        });
        setRows(updatedRows);

        if (field !== 'productName' && id === rows[rows.length - 1].id && value !== '' && value !== 0 && !isUpdatingFromDuplicate) {
            addRow();
        }
    };

    const addRow = () => {
        const lastRow = rows[rows.length - 1];
        if (!lastRow.productName || lastRow.productName.trim() === '') { const saveButton = document.querySelector('[data-save-button]'); if (saveButton) saveButton.focus(); return; }
        setRows([...rows, { id: rows.length + 1, sn: rows.length + 1, barcodeInput: '', productName: '', productCode: '', purchaseRate: 0, qty: 1, freeQty: 0, unit: 2, salesRate: 0, desc: 0, descAmt: 0, deliveryNoteDetails1Id: '', orderDetails1Id: '', quotationDetailsId: '', proformaDetails1Id: '', netValue: 0, tax: 0, taxRate: 0, taxId: null, taxAmt: 0, amount: 0, taxType: 'Excluded', maximumSellingPrice: 0, lowestSellingPrice: 0, salesRateWithoutTax: 0, productDetails: { barcode: '', partNo: '', brand: '', mrp: '', purchase: '', description: '', productCode: '' } }]);
    };

    const deleteRow = async (id) => {
        if (generalSettings?.askConfirmationRowRemove) { const result = await Swal.fire({ title: t("delete.title"), text: t("delete.text"), icon: "warning", showCancelButton: true, confirmButtonColor: "#3085d6", cancelButtonColor: "#d33", confirmButtonText: t("delete.confirm"), cancelButtonText: t("delete.cancel") }); if (!result.isConfirmed) return; }
        if (rows.length > 1) { setRows(rows.filter(row => row.id !== id).map((row, index) => ({ ...row, sn: index + 1, id: index + 1 }))); }
        else {
            setRows([{ id: 1, sn: 1, barcodeInput: '', productName: '', productCode: '', purchaseRate: 0, qty: 1, deliveryNoteDetails1Id: '', orderDetails1Id: '', quotationDetailsId: '', proformaDetails1Id: '', freeQty: 0, unit: 2, salesRate: 0, desc: 0, descAmt: 0, netValue: 0, tax: 0, taxRate: 0, taxId: null, taxAmt: 0, amount: 0, taxType: 'Excluded', salesRateWithoutTax: 0, productDetails: { barcode: '', partNo: '', brand: '', mrp: '', purchase: '', description: '', productCode: '' } }]); setStockCounts(prev => {
                const s = { ...prev };
                delete s[id];
                return s;
            });
        }
    };

    // ✅ MEMOIZE: Prevent recalculating totals on every render
    const totals = useMemo(() => {
        const totalDiscount = rows.reduce((sum, row) => sum + safeParsePrice(row.descAmt), 0);
        const totalNetValue = rows.reduce((sum, row) => sum + safeParsePrice(row.netValue), 0);
        const totalTax = (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') ? rows.reduce((sum, row) => sum + safeParsePrice(row.taxAmt), 0) : 0;
        return { totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart), totalNetValue: totalNetValue.toFixed(generalSettings.decimalPart), totalTax: totalTax.toFixed(generalSettings.decimalPart), grandTotal: totalNetValue.toFixed(generalSettings.decimalPart) };
    }, [rows, generalSettings?.ActivateTax, generalSettings?.decimalPart, formData.taxType]);
    const rowRef = useRef();

    const prevRowCountRef = useRef(rows.length);

    useEffect(() => {
        const currentCount = rows.length;
        if (rowRef.current && currentCount > prevRowCountRef.current) {
            rowRef.current.scrollTo({
                top: rowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
        prevRowCountRef.current = currentCount;
    }, [rows]);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (!allProducts || allProducts.length === 0) return;
        setRows(prevRows => prevRows.map(row => {
            if (row.productCode && row.productCode.trim() !== '') {
                const product = allProducts.find(p => p.productCode === row.productCode);
                if (product) {
                    const priceInfo = getSalesPrice(product, row.unit);
                    return calculateRow({ ...row, salesRate: safeParsePrice(priceInfo.price), maximumSellingPrice: safeParsePrice(priceInfo.maximumSellingPrice), lowestSellingPrice: safeParsePrice(priceInfo.lowestSellingPrice) });
                }
            }
            return row;
        }));
    }, [formData.pricingLevelId, selectedBranchId]);

    return (
        <div className="w-full min-h-[400px] bg-primary dark:bg-primary">
            <div>
                <div className="w-full">
                    <div
                        ref={rowRef}
                        className={`w-full custom-scrollbar ${saleSettings?.gridFixedHeight === true
                            ? activeSuggestionRow
                                ? 'overflow-visible max-h-[5150px]'
                                : 'max-h-[250px] overflow-auto'
                            : ''
                            }`}
                    >
                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[100px]" />
                                <col className="w-[360px]" />
                                <col className="w-[35px]" />
                                {saleSettings.showFeeQtyColumn && <col className="w-[80px]" />}
                                <col className="w-[70px]" />
                                <col className="w-[80px]" />
                                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                    <col className="w-[70px]" />
                                )}
                                {saleSettings?.showLineDiscount && (
                                    <>
                                        <col className="w-[40px]" />
                                        <col className="w-[70px]" />
                                        {/* ADD condition here */}
                                        {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                            <col className="w-[75px]" />
                                        )}
                                    </>
                                )}
                                <col className="w-[100px]" />
                                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') &&
                                    (<><col className="w-[90px]" /><col className="w-[50px]" /></>)}
                                <col className="w-[100px]" />
                                <col className="w-[80px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed sticky top-0 z-10">
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">{t("salesInvoice.form.gridSection.columns.SN")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">{t("salesInvoice.form.gridSection.columns.barcode")}</th>
                                    <th className="p-1 relative text-left text-xs font-semibold border border-themed dark:border-themed w-[360px]">{t("salesInvoice.form.gridSection.columns.ProdName")}
                                        <RefreshCcw onClick={() => dispatch(refreshProductsByType('sales'))} width={20} className={`absolute right-1 top-0 text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${productsLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`} />
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[35px]">{t("salesInvoice.form.gridSection.columns.qty")}</th>
                                    {saleSettings.showFeeQtyColumn && <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">{t("salesInvoice.form.gridSection.columns.freeQty")}</th>}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">{t("salesInvoice.form.gridSection.columns.unit")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                        {t("salesInvoice.form.gridSection.columns.beforeTax") || "Before Tax"}
                                    </th>
                                    {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">{t("salesInvoice.form.gridSection.columns.salesRate")}</th>
                                    )}
                                    {saleSettings?.showLineDiscount && (
                                        <>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">
                                                {t("salesInvoice.form.gridSection.columns.disc%")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                                {t("salesInvoice.form.gridSection.columns.discAmt")}
                                            </th>
                                            {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                                <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[75px]">
                                                    {t("salesInvoice.form.gridSection.columns.discWithTax") || "Disc w/Tax"}
                                                </th>
                                            )}
                                        </>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">{t("salesInvoice.form.gridSection.columns.netValue")}</th>
                                    {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (<>
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[90px]">{t("salesInvoice.form.gridSection.columns.tax%")}</th>
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">{t("salesInvoice.form.gridSection.columns.taxAmt")}</th>
                                    </>)}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">{t("salesInvoice.form.gridSection.columns.amount")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">{t("salesInvoice.form.gridSection.columns.action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${rowErrors[row.id] ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500' : row.sn % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                                        <td className="p-0.2 border border-themed dark:border-themed text-center">
                                            <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input ref={el => inputRefs.current[`${row.id}-barcode`] = el}
                                                type="text"
                                                value={row.barcodeInput ?? ''}
                                                onChange={(e) => { setRows(rows.map(r => r.id === row.id ? { ...r, barcodeInput: e.target.value } : r)); }} onKeyDown={(e) => handleKeyDown(e, row.id, 'barcode')} className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded  disabled:text-gray-500 disabled:cursor-not-allowed" placeholder={t("salesInvoice.form.gridSection.barcodePlaceholder")} autoComplete="off" onBlur={handleInputBlur} />
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed relative">
                                            <div className="flex gap-2 justify-between items-center">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-productName`] = el}
                                                    type="text"
                                                    value={inputValues[`${row.id}-productName`] !== undefined
                                                        ? inputValues[`${row.id}-productName`]
                                                        : row.productName}
                                                    onFocus={(e) => {
                                                        handleInputFocus(row.id);
                                                        setInputValues(prev => ({
                                                            ...prev,
                                                            [`${row.id}-productName`]: row.productName
                                                        }));
                                                    }}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setInputValues(prev => ({
                                                            ...prev,
                                                            [`${row.id}-productName`]: value
                                                        }));
                                                        if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
                                                        filterDebounceRef.current = setTimeout(() => {
                                                            filterProducts(value, row.id);
                                                        }, 150);
                                                    }}
                                                    onBlur={(e) => {
                                                        setInputValues(prev => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-productName`];
                                                            return s;
                                                        });
                                                        handleInputBlur();
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary 
    focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded 
    placeholder:text-muted dark:placeholder:text-muted"
                                                    placeholder={t("salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
                                                    autoComplete="off"
                                                    disabled={productsLoading || editMode}
                                                />
                                            </div>
                                            {activeSuggestionRow === row.id && (
                                                <div
                                                    ref={suggestionRef}
                                                    data-suggestion-row={row.id}
                                                    className="absolute z-[100] w-full bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-70 overflow-y-auto mt-1 custom-scrollbar"
                                                    style={saleSettings?.ProductLookUpModel === 'Table' ? { minWidth: '600px' } : {}}
                                                >
                                                    {loadingProducts[row.id] ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {suggestions[row.id]?.length > 0 ? (
                                                                saleSettings?.ProductLookUpModel === 'Table' ? (
                                                                    <table className="w-full border-collapse text-xs">
                                                                        <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10">
                                                                            <tr>
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[28px]">#</th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed">
                                                                                    {t("salesInvoice.form.gridSection.columns.ProdName") || "Product Name"}
                                                                                </th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[80px]">
                                                                                    {t("salesInvoice.form.gridSection.prodDetailsLabels.productCode") || "Code"}
                                                                                </th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[90px]">
                                                                                    {t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels") || "Barcode"}
                                                                                </th>
                                                                                {suggestions[row.id].some(p => p.partNo) && (
                                                                                    <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[80px]">
                                                                                        {t("salesInvoice.form.gridSection.prodDetailsLabels.partNo") || "Part No"}
                                                                                    </th>
                                                                                )}
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[60px]">
                                                                                    {t("salesInvoice.form.gridSection.prodDetailsLabels.unit") || "Unit"}
                                                                                </th>
                                                                                <th className="px-2 py-1.5 text-right font-semibold border-b border-themed dark:border-themed w-[70px]">
                                                                                    {t("salesInvoice.form.gridSection.columns.salesRate") || "Price"}
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {suggestions[row.id].map((product, idx) => (
                                                                                <tr
                                                                                    key={idx}
                                                                                    data-suggestion-index={idx}
                                                                                    onClick={() => {
                                                                                        selectProduct(row.id, product, product.unitId);
                                                                                        setSelectedSuggestionIndex(prev => ({ ...prev, [row.id]: -1 }));
                                                                                    }}
                                                                                    className={`cursor-pointer border-b border-themed dark:border-themed last:border-b-0 relative
                                            ${selectedSuggestionIndex[row.id] === idx
                                                                                            ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                                            : 'hover:bg-hover dark:hover:bg-hover'}
                                            ${selectingProduct[row.id] ? 'opacity-50 pointer-events-none' : ''}`}
                                                                                >
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{idx + 1}</td>
                                                                                    <td className="px-2 py-1 font-medium text-primary dark:text-primary">{product.productName}</td>
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.productCode || '—'}</td>
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.barcode || '—'}</td>
                                                                                    {suggestions[row.id].some(p => p.partNo) && (
                                                                                        <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.partNo || '—'}</td>
                                                                                    )}
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.unitName || '—'}</td>
                                                                                    <td className="px-2 py-1 text-right text-green-600 dark:text-green-400 font-medium">
                                                                                        {getDisplayPrice(product) > 0
                                                                                            ? safeDisplayValue(getDisplayPrice(product), generalSettings.decimalPart)
                                                                                            : '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    suggestions[row.id].map((product, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            data-suggestion-index={idx}
                                                                            onClick={() => {
                                                                                selectProduct(row.id, product, product.unitId);
                                                                                setSelectedSuggestionIndex(prev => ({ ...prev, [row.id]: -1 }));
                                                                            }}
                                                                            className={`px-1 py-1 cursor-pointer border-b border-themed dark:border-themed last:border-b-0 relative
                                    ${selectedSuggestionIndex[row.id] === idx
                                                                                    ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                                    : 'hover:bg-hover dark:hover:bg-hover'}
                                    ${selectingProduct[row.id] ? 'opacity-50 pointer-events-none' : ''}`}
                                                                        >
                                                                            {selectingProduct[row.id] && selectedSuggestionIndex[row.id] === idx && (
                                                                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
                                                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                                                </div>
                                                                            )}
                                                                            <div className="font-bold text-sm text-primary dark:text-primary">{product.productName}</div>
                                                                            <div className="text-xs text-tertiary dark:text-tertiary mt-0.5 flex gap-3">
                                                                                {product.productCode && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.productCode")}: {product.productCode}</span>}
                                                                                {product.barcode && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels")}: {product.barcode}</span>}
                                                                                {product.partNo && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.partNo")}: {product.partNo}</span>}
                                                                                {product.unitName && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.unit")}: {product.unitName}</span>}
                                                                                {getDisplayPrice(product) > 0 && (
                                                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                                                        {safeDisplayValue(getDisplayPrice(product), generalSettings.decimalPart)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )
                                                            ) : (
                                                                <div className="px-3 py-2 text-sm text-muted dark:text-muted text-center">No Product Found</div>
                                                            )}

                                                            <div className="sticky bottom-0 bg-primary dark:bg-secondary border-t-2 border-themed dark:border-themed">
                                                                <button
                                                                    onClick={() => { setProductModalOpen(true); setActiveSuggestionRow(null); setSuggestions({}); }}
                                                                    className="w-full px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus size={16} />Add New Product
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {row.productName && (
                                                <div className='flex justify-between'>
                                                    <div className="mt-1 text-xs text-tertiary dark:text-tertiary space-y-0.5">
                                                        {shoBottomDeailsOnRow && (row.productDetails.barcode || row.productDetails.partNo || row.productDetails.brand) && (
                                                            (row.productDetails.barcode || row.productDetails.partNo) && (
                                                                <div className="flex gap-3 flex-wrap">
                                                                    {row.productDetails.barcode && <span><span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels")}:</span> {row.productDetails.barcode}</span>}
                                                                    {row.productDetails.partNo && saleSettings.ShowPartNo && <span><span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.partNo")}:</span> {row.productDetails.partNo}</span>}
                                                                    {row.productDetails.mrp && <span><span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.mrp")}:</span> {row.productDetails.mrp}</span>}
                                                                    <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.unit")} :{row.productDetails.UnitName}</span>
                                                                    {row.productDetails.purchase && saleSettings.showPurchaserate && (
                                                                        <div className="flex gap-3">
                                                                            <span><span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.purchase")}:</span> {row.productDetails.purchase}</span>
                                                                            {row.productDetails.brand && <span><span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.brand")}:</span> {row.productDetails.brand}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                        {row.productDetails.productDescription && saleSettings.showProductDescription && (
                                                            <p className="text-muted dark:text-muted leading-tight">
                                                                {t("salesInvoice.form.gridSection.prodDetailsLabels.desc")}: {row.productDetails.productDescription}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {saleSettings.showProductDescription && (
                                                        <div className='cursor-pointer'>
                                                            <EllipsisVertical
                                                                onClick={() => { setSelectedProductCode(row.productDetails.productCode); setEditProductModalOpen(true); }}
                                                                className="text-secondary dark:text-secondary"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input onBlur={(e) => { const value = e.target.value === '' ? 1 : parseFloat(e.target.value); handleInputChange(row.id, 'qty', safeParsePrice(value) || 1); setInputValues(prev => { const s = { ...prev }; delete s[`${row.id}-qty`]; return s; }); handleInputBlur(); }} ref={el => inputRefs.current[`${row.id}-qty`] = el} type="text" disabled={!row.productCode || row.productCode.trim() === ''} value={inputValues[`${row.id}-qty`] !== undefined ? inputValues[`${row.id}-qty`] : row.qty} onFocus={(e) => { handleInputFocus(row.id); setInputValues(prev => ({ ...prev, [`${row.id}-qty`]: row.qty })); setTimeout(() => e.target.select(), 0); }} onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, ''); const validValue = value.split('.').length > 2 ? value.slice(0, value.lastIndexOf('.')) : value; setInputValues(prev => ({ ...prev, [`${row.id}-qty`]: validValue })); handleInputChange(row.id, 'qty', safeParsePrice(validValue)); }} onKeyDown={(e) => { if (e.key === 'Enter') { const cv = inputValues[`${row.id}-qty`]; if (cv !== undefined) { handleInputChange(row.id, 'qty', (cv === '' ? 1 : safeParsePrice(cv)) || 1); setInputValues(prev => { const s = { ...prev }; delete s[`${row.id}-qty`]; return s; }); } } handleKeyDown(e, row.id, 'qty'); }} className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed" />
                                        </td>
                                        {saleSettings.showFeeQtyColumn && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <input onBlur={handleInputBlur} ref={el => inputRefs.current[`${row.id}-freeQty`] = el} type="text" disabled={!row.productCode || row.productCode.trim() === ''} value={row.freeQty} onFocus={(e) => e.target.select()} onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, ''); const validValue = value.split('.').length > 2 ? value.slice(0, value.lastIndexOf('.')) : value; handleInputChange(row.id, 'freeQty', safeParsePrice(validValue)); }} onKeyDown={(e) => handleKeyDown(e, row.id, 'freeQty')} className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed" />
                                            </td>
                                        )}
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <select onBlur={handleInputBlur} ref={el => inputRefs.current[`${row.id}-unit`] = el} disabled={!row.productCode || row.productCode.trim() === ''} value={row.unit}
                                                onChange={(e) => {
                                                    const selectedUnitId = parseInt(e.target.value);

                                                    // Find the product entry matching BOTH productCode AND the selected unitId
                                                    const productForUnit = allProducts.find(
                                                        p => p.productCode === row.productCode && p.unitId === selectedUnitId
                                                    );
                                                    // Fallback to any entry with matching productCode
                                                    const product = productForUnit || allProducts.find(p => p.productCode === row.productCode);

                                                    if (product) {
                                                        const selectedUnit = row.availableUnits?.find(u => u.unitId === selectedUnitId);

                                                        // conversionRate comes from the matched product entry, not from selectedUnit
                                                        const conversionFactor = safeParsePrice(productForUnit?.conversionRate || product.conversionRate || 1);

                                                        // purchaseRate: base purchase rate × conversion factor of selected unit
                                                        // The base rate is on the baseUnit product entry (conversionRate === "1.00")
                                                        const baseProductEntry = allProducts.find(
                                                            p => p.productCode === row.productCode && safeParsePrice(p.conversionRate) === 1
                                                        ) || product;
                                                        const basePurchaseRate = safeParsePrice(baseProductEntry?.purchaseRate || 0);

                                                        const priceInfo = getSalesPrice(product, selectedUnitId);
                                                        const productPrice = safeParsePrice(priceInfo.price);
                                                        const taxRate = safeParsePrice(row.taxRate);
                                                        const taxMultiplier = 1 + (taxRate / 100);
                                                        const taxApplicable = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';

                                                        let newSalesRate, newSalesRateWithoutTax;
                                                        if (!taxApplicable) {
                                                            newSalesRate = productPrice;
                                                            newSalesRateWithoutTax = productPrice;
                                                        } else if (generalSettings?.taxincluded === true) {
                                                            newSalesRate = productPrice;
                                                            newSalesRateWithoutTax = taxMultiplier !== 0 ? productPrice / taxMultiplier : productPrice;
                                                        } else {
                                                            newSalesRateWithoutTax = productPrice;
                                                            newSalesRate = productPrice * taxMultiplier;
                                                        }

                                                        let updatedRow = {
                                                            ...row,
                                                            unit: selectedUnitId,
                                                            salesRate: newSalesRate,
                                                            purchaseRate: basePurchaseRate * conversionFactor,
                                                            salesRateWithoutTax: newSalesRateWithoutTax,
                                                            ConversionFactor: conversionFactor,
                                                            maximumSellingPrice: safeParsePrice(priceInfo.maximumSellingPrice),
                                                            lowestSellingPrice: safeParsePrice(priceInfo.lowestSellingPrice),
                                                            productDetails: {
                                                                ...row.productDetails,
                                                                barcode: product.barcode || row.productDetails.barcode,
                                                                UnitName: selectedUnit?.unitName || row.productDetails.UnitName
                                                            }
                                                        };
                                                        updatedRow = calculateRow(updatedRow);
                                                        setRows(prev => prev.map(r => r.id === row.id ? updatedRow : r));
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'unit')} className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded  disabled:text-gray-500 disabled:cursor-not-allowed">
                                                {row.availableUnits?.map((unit) => (<option key={unit.unitId} value={unit.unitId}>{unit.unitName || unit.unitname}</option>))}
                                            </select>
                                        </td>

                                        {/* Before Tax cell — 4 decimal places */}
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-beforeTax`] = el}
                                                type="text"
                                                value={
                                                    inputValues[`${row.id}-beforeTax`] !== undefined
                                                        ? inputValues[`${row.id}-beforeTax`]
                                                        : safeDisplayValueCustom(row.salesRateWithoutTax, 4)
                                                }
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                onFocus={(e) => {
                                                    if (!row.productCode || row.productCode.trim() === '') {
                                                        Swal.fire({
                                                            icon: 'warning',
                                                            title: 'Product Required',
                                                            text: 'Please select a product first before entering the rate.',
                                                            confirmButtonColor: '#3085d6',
                                                            confirmButtonText: 'OK'
                                                        });
                                                        return;
                                                    }
                                                    handleInputFocus(row.id);
                                                    setInputValues(prev => ({
                                                        ...prev,
                                                        [`${row.id}-beforeTax`]: safeDisplayValueCustom(row.salesRateWithoutTax, 4)
                                                    }));
                                                    setTimeout(() => e.target.select(), 0);
                                                }}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2 ? value.slice(0, value.lastIndexOf('.')) : value;
                                                    setInputValues(prev => ({
                                                        ...prev,
                                                        [`${row.id}-beforeTax`]: validValue
                                                    }));
                                                    handleInputChange(row.id, 'beforeTax', customRoundDecimal(validValue, 4));
                                                }}
                                                onBlur={(e) => {
                                                    const value = customRoundDecimal(e.target.value, 4);
                                                    handleInputChange(row.id, 'beforeTax', value);
                                                    setInputValues(prev => {
                                                        const s = { ...prev };
                                                        delete s[`${row.id}-beforeTax`];
                                                        return s;
                                                    });
                                                    handleInputBlur();
                                                }}
                                                onKeyDown={(e) => {
                                                    if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                                                        handleKeyDown(e, row.id, 'beforeTax');
                                                }}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                            {showProductStockCount && (
                                                <div>  {showProductStockCount && stockCounts[row.id] !== undefined && (
                                                    <span className={`text-xs font-medium ${parseFloat(stockCounts[row.id]) < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                        Stock: {parseFloat(stockCounts[row.id]).toFixed(generalSettings.decimalPart)}
                                                    </span>
                                                )}</div>
                                            )}
                                        </td>

                                        {/* Sales Rate (inclusive) cell — 2 decimal places */}
                                        {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-salesRate`] = el}
                                                    type="text"
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    onFocus={(e) => {
                                                        if (!row.productCode || row.productCode.trim() === '') {
                                                            Swal.fire({
                                                                icon: 'warning',
                                                                title: 'Product Required',
                                                                text: 'Please select a product first before entering the rate.',
                                                                confirmButtonColor: '#3085d6',
                                                                confirmButtonText: 'OK'
                                                            });
                                                            return;
                                                        }
                                                        handleInputFocus(row.id);
                                                        setInputValues(prev => ({
                                                            ...prev,
                                                            [`${row.id}-salesRate`]: safeDisplayValueCustom(row.salesRate, 2)
                                                        }));
                                                        setTimeout(() => e.target.select(), 0);
                                                    }}
                                                    value={
                                                        inputValues[`${row.id}-salesRate`] !== undefined
                                                            ? inputValues[`${row.id}-salesRate`]
                                                            : safeDisplayValueCustom(row.salesRate, 2)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                                                            handleKeyDown(e, row.id, 'salesRate');
                                                    }}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2 ? value.slice(0, value.lastIndexOf('.')) : value;
                                                        setInputValues(prev => ({
                                                            ...prev,
                                                            [`${row.id}-salesRate`]: validValue
                                                        }));
                                                        handleInputChange(row.id, 'salesRate', customRoundDecimal(validValue, 2));
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = customRoundDecimal(e.target.value, 2);
                                                        const validation = validateSalesPrice(value, row);

                                                        // Handle based on action type
                                                        if (!validation.isValid) {
                                                            if (validation.action === 'block') {
                                                                // Block: Show alert and reset value
                                                                Swal.fire({
                                                                    title: "Price Validation",
                                                                    text: validation.message,
                                                                    icon: "warning",
                                                                    confirmButtonColor: "#3085d6",
                                                                    confirmButtonText: "OK"
                                                                });
                                                                handleInputChange(row.id, 'salesRate', 0);
                                                                setInputValues(prev => {
                                                                    const s = { ...prev };
                                                                    delete s[`${row.id}-salesRate`];
                                                                    return s;
                                                                });
                                                                return;
                                                            } else if (validation.action === 'warn') {
                                                                // Warn: Show alert but allow entry
                                                                Swal.fire({
                                                                    title: "Price Validation Warning",
                                                                    text: validation.message,
                                                                    icon: "warning",
                                                                    confirmButtonColor: "#3085d6",
                                                                    confirmButtonText: "OK"
                                                                });
                                                                // Continue to save the value
                                                            }
                                                            // If 'ignore', no alert shown
                                                        }

                                                        handleInputChange(row.id, 'salesRate', value);
                                                        setInputValues(prev => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-salesRate`];
                                                            return s;
                                                        });
                                                        handleInputBlur();
                                                    }}
                                                    className={`w-full px-2 py-1 text-sm text-primary dark:text-primary rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed ${rowErrors[row.id]?.fields?.includes('Sales Rate') || (row.productCode && safeParsePrice(row.salesRate) <= 0)
                                                        ? 'border-2 border-red-500 focus:ring-2 focus:ring-red-500'
                                                        : 'border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                                                        }`}
                                                />
                                                {/* Gross label — 4 decimal places for calculation */}
                                                {saleSettings?.showLineDiscount && (
                                                    <span className="text-xs text-muted dark:text-muted text-right block">
                                                        Gross: {safeDisplayValueCustom(row.qty * customRoundDecimal(row.salesRateWithoutTax, 4), 2)}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {saleSettings?.showLineDiscount && (
                                            <>
                                                <td className="p-0 border border-themed dark:border-themed">
                                                    <input
                                                        onBlur={handleInputBlur}
                                                        ref={el => inputRefs.current[`${row.id}-desc`] = el}
                                                        type="number"
                                                        min={0} max={99}
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        value={row.desc}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            let value = e.target.value.replace(/[^0-9.]/g, "");
                                                            let validValue = value.split(".").length > 2
                                                                ? value.slice(0, value.lastIndexOf("."))
                                                                : value;
                                                            let num = safeParsePrice(validValue);
                                                            if (num > 99) num = 99;
                                                            if (num < 0) num = 0;
                                                            handleInputChange(row.id, "desc", num);
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'desc')}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <input
                                                        onBlur={handleInputBlur}
                                                        ref={el => inputRefs.current[`${row.id}-descAmt`] = el}
                                                        type="number"
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        value={row.descAmt}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^0-9.]/g, "");
                                                            let validValue = value.split(".").length > 2
                                                                ? value.slice(0, value.lastIndexOf("."))
                                                                : value;
                                                            let num = safeParsePrice(validValue);
                                                            const gross = safeParsePrice(row.qty) * safeParsePrice(row.salesRate);
                                                            if (num > gross) num = gross;
                                                            setRows(prev => prev.map(r =>
                                                                r.id === row.id ? { ...r, lineDiscountWithTax: null } : r
                                                            ));
                                                            handleInputChange(row.id, "descAmt", num, 'descAmt');
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'descAmt')}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>

                                                {/* Discount with Tax cell */}
                                                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                                    <td className="p-0.2 border border-themed dark:border-themed">
                                                        <input
                                                            ref={el => inputRefs.current[`${row.id}-lineDiscWithTax`] = el}
                                                            type="text"
                                                            disabled={!row.productCode || row.productCode.trim() === ''}
                                                            value={
                                                                inputValues[`${row.id}-lineDiscWithTax`] !== undefined
                                                                    ? inputValues[`${row.id}-lineDiscWithTax`]
                                                                    : (row.lineDiscountWithTax != null
                                                                        ? safeDisplayValue(row.lineDiscountWithTax, generalSettings?.decimalPart)
                                                                        : '0.00')
                                                            }
                                                            placeholder="w/tax"
                                                            onFocus={(e) => {
                                                                handleInputFocus(row.id);
                                                                setInputValues(prev => ({
                                                                    ...prev,
                                                                    [`${row.id}-lineDiscWithTax`]: row.lineDiscountWithTax ?? '0'
                                                                }));
                                                                setTimeout(() => e.target.select(), 0);
                                                            }}
                                                            onChange={(e) => {
                                                                const raw = e.target.value.replace(/[^0-9.]/g, '');
                                                                const valid = raw.split('.').length > 2
                                                                    ? raw.slice(0, raw.lastIndexOf('.'))
                                                                    : raw;
                                                                setInputValues(prev => ({ ...prev, [`${row.id}-lineDiscWithTax`]: valid }));
                                                                handleLineDiscWithTaxChange(row.id, valid);
                                                            }}
                                                            onBlur={(e) => {
                                                                handleLineDiscWithTaxChange(row.id, safeParsePrice(e.target.value));
                                                                setInputValues(prev => {
                                                                    const s = { ...prev };
                                                                    delete s[`${row.id}-lineDiscWithTax`];
                                                                    return s;
                                                                });
                                                                handleInputBlur();
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                                                                    handleKeyDown(e, row.id, 'lineDiscWithTax');
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border-0  focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                        />
                                                    </td>
                                                )}
                                            </>
                                        )}
                                        <td className="p-0.2 border border-themed">
                                            <div className="flex flex-col text-right">
                                                <span className="text-sm font-medium text-primary">{safeDisplayValue(row.netValue, generalSettings.decimalPart)}</span>
                                                {showPurchaseRate[row.id] && row.purchaseRate !== undefined && row.purchaseRate !== null && (<span className="text-xs text-blue-600 dark:text-blue-400 font-medium">PRate: {safeDisplayValue(row.purchaseRate, generalSettings.decimalPart)}</span>)}
                                            </div>
                                        </td>
                                        {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (<>
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <select onBlur={handleInputBlur} ref={el => inputRefs.current[`${row.id}-tax`] = el} value={row.taxId ? String(row.taxId) : ''} onChange={(e) => { const selectedTaxId = parseInt(e.target.value); const taxSource = row.salesTaxes?.length > 0 ? row.salesTaxes : taxData; const selectedTax = taxSource.find(t => t.taxId === selectedTaxId); setRows(rows.map(r => r.id === row.id ? calculateRow({ ...r, taxId: selectedTax?.taxId || null, taxRate: safeParsePrice(selectedTax?.rate) }) : r)); }} onKeyDown={(e) => handleKeyDown(e, row.id, 'tax')} className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded">
                                                    <option value="" disabled>Select</option>
                                                    {(row.salesTaxes?.length > 0 ? row.salesTaxes : taxData)?.map((tax) => (<option value={String(tax.taxId)} key={tax.taxId}>{tax.taxName || tax.rate}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-0.2 border border-themed">
                                                <div className="flex flex-col text-right"><span className="text-sm font-medium text-primary">{safeDisplayValue(row.taxAmt, generalSettings.decimalPart)}</span></div>
                                            </td>
                                        </>)}
                                        <td className="p-0.2 border border-themed">
                                            <input ref={el => inputRefs.current[`${row.id}-amount`] = el} type="text" disabled={!row.productCode || row.productCode.trim() === ''} value={inputValues[`${row.id}-amount`] !== undefined ? inputValues[`${row.id}-amount`] : safeDisplayValue(row.amount, generalSettings?.decimalPart)} onFocus={(e) => { handleInputFocus(row.id); setInputValues(prev => ({ ...prev, [`${row.id}-amount`]: safeParsePrice(row.amount) })); setTimeout(() => e.target.select(), 0); }} onChange={(e) => { const value = e.target.value.replace(/[^0-9.]/g, ''); const validValue = value.split('.').length > 2 ? value.slice(0, value.lastIndexOf('.')) : value; setInputValues(prev => ({ ...prev, [`${row.id}-amount`]: validValue })); handleInputChange(row.id, 'amount', safeParsePrice(validValue), 'amount'); }} onBlur={(e) => { const value = safeParsePrice(e.target.value); handleInputChange(row.id, 'amount', value, 'amount'); setInputValues(prev => { const s = { ...prev }; delete s[`${row.id}-amount`]; return s; }); handleInputBlur(); }} onKeyDown={(e) => handleKeyDown(e, row.id, 'amount')} className="w-full px-2 py-1 text-sm border-0 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right font-bold  disabled:text-gray-500 disabled:cursor-not-allowed" />
                                        </td>
                                        <td className="border border-themed dark:border-themed text-center">
                                            <div className='flex justify-center gap-1'>
                                                <button onClick={() => deleteRow(row.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete This Row"><Trash2 size={18} /></button>
                                                <button onClick={() => addRowAfter(row.id)} title="Insert 1 Row below" className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"><PlusIcon size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className={`flex ${saleSettings?.showBillProfit === true ? 'justify-between' : 'justify-end'} items-center mt-2`}>
                {saleSettings?.showBillProfit === true && (() => {
                    const totalPurchase = rows.reduce((sum, row) => {
                        return sum + (safeParsePrice(row.qty) * safeParsePrice(row.purchaseRate));
                    }, 0);

                    const totalSales = safeParsePrice(formData.totalAmount) - safeParsePrice(formData.totalTax);
                    const profit = totalSales - totalPurchase;
                    const profitPercent = totalSales > 0 ? (profit / totalSales) * 100 : 0;
                    const isLoss = profit < 0;

                    return (
                        <div className=" flex justify-end">
                            <div className="flex gap-4 p-1 px-2 rounded-sm border border-themed dark:border-themed bg-gray-50 dark:bg-gray-800 text-xs">
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-muted dark:text-muted font-medium">Total Cost :   <span className="text-primary dark:text-primary font-semibold">
                                        {totalPurchase.toFixed(generalSettings?.decimalPart || 2)}
                                    </span></span>

                                </div>
                                <div className="w-px bg-gray-300 dark:bg-gray-600" />
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-muted dark:text-muted font-medium">Total Sales (ex-tax) :  <span className="text-primary dark:text-primary font-semibold">
                                        {totalSales.toFixed(generalSettings?.decimalPart || 2)}
                                    </span></span>

                                </div>
                                <div className="w-px bg-gray-300 dark:bg-gray-600" />
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-muted dark:text-muted font-medium">
                                        {isLoss ? 'Loss' : 'Profit'}  :  <span className={`font-bold ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {profit.toFixed(generalSettings?.decimalPart || 2)}
                                        </span>
                                        <span className={`text-xs ${isLoss ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                                            ({profitPercent.toFixed(1)}%)
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-1">

                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {!editMode && (
                    <button onClick={addRow} className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"><Plus size={15} />{t("salesInvoice.form.gridSection.buttons.addRow")}</button>
                )}
            </div>

            {Object.keys(rowErrors).length > 0 && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                    <ul className="list-disc list-inside space-y-1">
                        {Object.entries(rowErrors).map(([rowId, error]) => (<li key={rowId} className="text-sm text-red-700 dark:text-red-400">Row {rows.find(r => r.id === parseInt(rowId))?.sn}: {error.type === 'skipped' ? (t("salesInvoice.form.gridSection.alert.skippedRowError") || "Cannot skip rows!") : (t("salesInvoice.form.gridSection.alert.incompleteRowError") || "Incomplete data!")}</li>))}
                    </ul>
                </div>
            )}
            <EditProuctDetailsModal
                open={editProductModalOpen}
                handleClose={() => {
                    setEditProductModalOpen(false);
                    if (focusedRowId) focusInput(focusedRowId, 'productName');
                }}
                productCode={selectedProductCode}
                initialDescription={
                    rows.find(r => r.productDetails?.productCode === selectedProductCode)
                        ?.productDetails?.productDescription || ''
                }
                onSuccess={(updatedDescription) => handleProductUpdate(selectedProductCode, updatedDescription)}
            />
            <SalesInvoiceFooterSection totals={totals} formData={formData} setFormData={setFormData} getCurrentProductCode={getCurrentProductCode} cash={cash} bank={bank} otherChargeLedgers={otherChargeLedgers} />
            <ProductFormModal open={productModalOpen} onClose={() => setProductModalOpen(false)} productCode={null} viewMode={false} modalMode={true} onSuccess={() => { setProductModalOpen(false); dispatch(refreshProductsByType('sales')); }} />
            <ProductHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                productCode={selectedRowForHistory?.productCode}
                productName={selectedRowForHistory?.productName}
            />
        </div>
    );
};

export default SalesInvoiceTable;