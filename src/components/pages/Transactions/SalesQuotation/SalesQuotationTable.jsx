import { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';
import SalesQuotationFooterSection from './SalesQuotationFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ProductFormModal from '../../Master/multiMasterForms/Product/ProductFormModal';
import { refreshProductsByType } from '@/redux/slice/productSlice';
import EditProuctDetailsModal from '../SalesInvoice/EditProuctDetailsModal';
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
const safeDisplayValueCustom = (value, decimalPart) => {
    const parsed = customRoundDecimal(value, decimalPart);
    return parsed.toFixed(decimalPart);
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
const SalesQuotationTable = ({ formData, setFormData, editMode, rows: propRows, otherChargeLedgers }) => {

    const { t } = useTranslation();
    const [taxData, setTaxData] = useState([]);
    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [inputValues, setInputValues] = useState({});
    const dispatch = useDispatch()
    const [isTableFocused, setIsTableFocused] = useState(false);

    const shoBottomDeailsOnRow = saleSettings?.showProductDetails || false;
    const askConfirmationWithSameProduct = saleSettings?.askConfirmationWithSameProduct || false;
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
    const [scrollPosition, setScrollPosition] = useState(0);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [focusedRowId, setFocusedRowId] = useState(null);
    const [rowErrors, setRowErrors] = useState({});
    const [isUpdatingFromDuplicate, setIsUpdatingFromDuplicate] = useState(false);
    const [pendingFocusRowId, setPendingFocusRowId] = useState(null);
    const [pendingFocusField, setPendingFocusField] = useState('qty');
    // 🔧 FIX 2: Track first render to prevent pricingLevel useEffect from overwriting saved rates
    const isFirstRender = useRef(true);

    // Helper function to calculate descAmt properly during edit mode initialization
    const calculateInitialDescAmt = (item) => {
        // 🔧 FIX 1: Check the correct API field name "discountAmount" FIRST
        if (parseFloat(item.discountAmount)) {
            return parseFloat(item.discountAmount);
        }
        if (parseFloat(item.descAmt)) {
            return parseFloat(item.descAmt);
        }

        const qty = parseFloat(item.qty) || 0;
        const salesRate = parseFloat(item.rate) || 0;
        const taxPercentage = parseFloat(item.taxRate) || 0;
        const discPerc = parseFloat(item.discountPercentage) || 0;

        let gross;

        if (generalSettings?.taxincluded === true) {
            const taxMultiplier = 1 + (taxPercentage / 100);
            const rateWithoutTax = salesRate / taxMultiplier;
            gross = rateWithoutTax * qty;
        } else {
            gross = qty * salesRate;
        }

        const descAmt = (gross * discPerc) / 100;
        return parseFloat(descAmt.toFixed(generalSettings?.decimalPart || 2)) || 0;
    };

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
                proformaDetails1Id: item.proformaDetails1Id || '',
                ConversionFactor: item.ConversionFactor || 0,
                billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                salesRate: safeParsePrice(item.inclusiveRate),
                salesRateWithoutTax: safeParsePrice(item.rate),
                lineDiscountWithTax: item.lineDiscountWithTax || null,
                taxRate: parseFloat(item.taxRate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: calculateInitialDescAmt(item),
                grossAmount: parseFloat(item.grossAmount) || 0,  // ← NEW FIELD
                netValue: parseFloat(item.netAmount) || 0,
                tax: parseFloat(item.taxId) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                salesTaxes: item.salesTaxes || [],
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                otherchargeonproduct: parseFloat(item.otherchargeonproduct) || 0,
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
                salesRateWithoutTax: 0,
                billDiscOnProduct: 0,
                ConversionFactor: 0,
                purchaseRate: 0,
                lineDiscountWithTax: 0,
                salesTaxes: [],
                qty: 1,
                freeQty: 0,
                taxRate: 0,
                unit: 2,
                salesRate: 0,
                desc: 0,
                descAmt: 0,
                grossAmount: 0,  // ← NEW FIELD
                netValue: 0,
                tax: 0,
                taxId: null,
                taxAmt: 0,
                amount: 0,
                taxType: 'Excluded',
                salesManId: formData.employeeId || null,
                GodownId: formData.GodownId || null,
                otherchargeonproduct: 0,
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


    // Auto-scroll when suggestion dropdown opens/closes
    useEffect(() => {
        if (activeSuggestionRow) {
            setScrollPosition(window.scrollY);
            setTimeout(() => {
                const activeRow = document.querySelector(`[data-suggestion-row="${activeSuggestionRow}"]`);
                if (activeRow) {
                    const rect = activeRow.getBoundingClientRect();
                    const scrollOffset = window.scrollY + rect.top - 100;
                    window.scrollTo({
                        top: scrollOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else if (scrollPosition > 0) {
            window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
            setScrollPosition(0);
        }
    }, [activeSuggestionRow]);

    useEffect(() => {
        fetchTaxData();
    }, []);

    // Listen for bill discount changes from footer
    // REPLACE existing billDiscount useEffect
    useEffect(() => {
        if (formData.quotationDetails && formData.quotationDetails.length > 0) {
            let hasChanges = false;
            const updatedRows = rows.map((row, index) => {
                const detail = formData.quotationDetails.find(
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
    }, [formData.quotationDetails]);

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
                purchaseRate: parseFloat(item.PurchaseRate) || 0,

                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                lineDiscountWithTax: item?.lineDiscountWithTax || null,
                salesRate: safeParsePrice(item.inclusiveRate),
                salesRateWithoutTax: safeParsePrice(item.rate),
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: calculateInitialDescAmt(item),
                grossAmount: parseFloat(item.grossAmount) || 0,  // ← NEW FIELD
                netValue: parseFloat(item.netAmount) || 0,
                tax: parseFloat(item.taxAmount) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                barcodeInput: item.barcode || '',
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

    // Update initial focus useEffect
    useEffect(() => {
        if (!editMode) {
            if (!productsLoading && allProducts?.length > 0) {
                const timer = setTimeout(() => {
                    const focusField = saleSettings?.focusAfterSalesRate === 'barcode' ? 'barcode' : 'productName';
                    focusInput(1, focusField);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [productsLoading, allProducts]);

    const getEditableColumns = () => {
        const columns = ['barcode', 'productName', 'qty'];
        if (saleSettings?.showFeeQtyColumn) {
            columns.push('freeQty');
        }
        columns.push('unit', 'beforeTax', 'salesRate');
        if (saleSettings?.showLineDiscount) columns.push('desc', 'descAmt', 'lineDiscWithTax'); // ← ADD lineDiscWithTax
        if (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') {
            columns.push('tax');
        }
        columns.push('amount');
        return columns;
    };
    const getCurrentProductCode = () => {
        if (focusedRowId && isTableFocused) { const currentRow = rows.find(row => row.id === focusedRowId); return currentRow?.productCode || null; }
        return null;
    };


    const validateRowSequence = () => {
        const errors = {};
        let hasFilledRow = false;

        rows.forEach((row, index) => {
            const isRowFilled = row.productCode && row.productCode.trim() !== '';
            const hasAnyData =
                (row.productName && row.productName.trim() !== '') ||
                (row.barcodeInput && row.barcodeInput.trim() !== '') ||
                row.qty > 0 ||
                row.salesRate > 0;

            if (isRowFilled) {
                hasFilledRow = true;
                const missingFields = [];
                if (!row.productName || row.productName.trim() === '') {
                    missingFields.push('Product Name');
                }
                if (!row.qty || row.qty <= 0) {
                    missingFields.push('Quantity');
                }
                if (row.salesRate === undefined || row.salesRate <= 0) {
                    missingFields.push('Sales Rate');
                }
                if (!row.unit) {
                    missingFields.push('Unit');
                }
                if (missingFields.length > 0) {
                    errors[row.id] = {
                        type: 'incomplete',
                        message: `Missing: ${missingFields.join(', ')}`,
                        fields: missingFields,
                    };
                }
            } else if (hasFilledRow && index < rows.length - 1) {
                const hasFilledRowsAfter = rows.slice(index + 1).some(r =>
                    r.productCode && r.productCode.trim() !== '',
                );
                if (hasFilledRowsAfter) {
                    errors[row.id] = { type: 'skipped', message: 'Row skipped', fields: [] };
                }
            } else if (!isRowFilled && hasAnyData && index < rows.length - 1) {
                errors[row.id] = {
                    type: 'incomplete',
                    message: 'Incomplete data - please select a product or clear the row',
                    fields: [],
                };
            }
        });

        setRowErrors(errors);
        return Object.keys(errors).length === 0;
    };

    useEffect(() => {
        validateRowSequence();
    }, [rows]);

    const handleLineDiscWithTaxChange = (rowId, withTaxValue) => {
        const withTax = safeParsePrice(withTaxValue) || 0;

        setRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;

            const taxRate = safeParsePrice(row.taxRate);
            // Strip tax from the discount: discountAmt = withTax / (1 + taxRate/100)
            const preTaxDiscount = withTax > 0
                ? withTax / (1 + taxRate / 100)
                : 0;
            const discAmt = safeParsePrice(preTaxDiscount.toFixed(generalSettings?.decimalPart || 2));

            // Also update descAmt and recalculate the row
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

            // If barcode has value, try to select product
            if (row && row.barcodeInput && row.barcodeInput.trim() !== '') {
                selectProductByBarcode(rowId, row.barcodeInput);
                // selectProductByBarcode will handle focusing next row's barcode
            } else {
                // If barcode is empty, focus on productName in same row
                focusInput(rowId, 'productName');
            }
            return;
        }

        if (currentField === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'beforeTax'); // ← changed from 'salesRate'
            return;
        }
        // After the existing beforeTax → salesRate chain, add:
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
        // ── NEW ──
        if (currentField === 'beforeTax' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'salesRate');
            return;
        }

      if (currentField === 'salesRate' && e.key === 'Enter') {
    e.preventDefault();
    const currentRowIndex = rows.findIndex(row => row.id === rowId);
    const currentRow = rows[currentRowIndex];

    if (!currentRow.salesRate || parseFloat(currentRow.salesRate) <= 0) {
        Swal.fire({
            title: t("salesInvoice.alert.invalidSalesRatetitle") || "Invalid Sales Rate",
            text: t("salesInvoice.alert.invalidSalesRatetext") || "Please enter a valid sales rate greater than 0",
            icon: "warning",
            confirmButtonColor: "#3085d6",
            confirmButtonText: t("okBtn") || "OK",
        });
        return;
    }

    // ✅ Commit salesRate inputValue before moving focus
    const currentVal = inputValues[`${rowId}-salesRate`];
    if (currentVal !== undefined) {
        const committed = customRoundDecimal(currentVal, 2);
        handleInputChange(rowId, 'salesRate', committed);
        setInputValues(prev => {
            const s = { ...prev };
            delete s[`${rowId}-salesRate`];
            return s;
        });
    }

    if (currentRowIndex < rows.length - 1) {
        const nextRowId = rows[currentRowIndex + 1].id;
        if (saleSettings?.focusAfterSalesRate === 'productName') {
            focusInput(nextRowId, 'productName');
        } else if (saleSettings?.focusAfterSalesRate === 'barcode') {
            focusInput(nextRowId, 'barcode');
        } else {
            focusInput(nextRowId, 'productName');
        }
    } else {
        addRow();
        setTimeout(() => {
            const newRowId = rows.length + 1;
            focusInput(newRowId, 'productName');
        }, 0);
    }
    return;
}
        if (currentField === 'productName' && activeSuggestionRow === rowId && suggestions[rowId]?.length > 0) {
            const currentIndex = selectedSuggestionIndex[rowId] ?? -1;
            const maxIndex = suggestions[rowId].length - 1;

            switch (e.key) {
                case 'ArrowDown': {
                    e.preventDefault();
                    const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: nextIndex }));
                    scrollSuggestionIntoView(rowId, nextIndex);
                    return;
                }
                case 'ArrowUp': {
                    e.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: prevIndex }));
                    scrollSuggestionIntoView(rowId, prevIndex);
                    return;
                }
                case 'Enter': {
                    e.preventDefault();
                    if (currentIndex >= 0 && currentIndex <= maxIndex) {
                        const selectedProduct = suggestions[rowId][currentIndex];
                        selectProduct(rowId, selectedProduct, selectedProduct.unitId);
                        setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 }));
                    }
                    return;
                }
                case 'Escape': {
                    e.preventDefault();
                    setActiveSuggestionRow(null);
                    setSuggestions({});
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 }));
                    return;
                }
                default:
                    break;
            }
        }

        const editableColumns = getEditableColumns();
        const currentRowIndex = rows.findIndex(row => row.id === rowId);
        const currentFieldIndex = editableColumns.indexOf(currentField);

        let targetRowId = rowId;
        let targetField = currentField;

        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                if (currentFieldIndex < editableColumns.length - 1) {
                    targetField = editableColumns[currentFieldIndex + 1];
                } else if (currentRowIndex < rows.length - 1) {
                    targetRowId = rows[currentRowIndex + 1].id;
                    targetField = editableColumns[0];
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (currentFieldIndex > 0) {
                    targetField = editableColumns[currentFieldIndex - 1];
                } else if (currentRowIndex > 0) {
                    targetRowId = rows[currentRowIndex - 1].id;
                    targetField = editableColumns[editableColumns.length - 1];
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentRowIndex < rows.length - 1) {
                    targetRowId = rows[currentRowIndex + 1].id;
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentRowIndex > 0) {
                    targetRowId = rows[currentRowIndex - 1].id;
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (currentRowIndex < rows.length - 1) {
                    targetRowId = rows[currentRowIndex + 1].id;
                } else {
                    addRow();
                    setTimeout(() => {
                        const newRowId = rows.length + 1;
                        focusInput(newRowId, currentField);
                    }, 0);
                    return;
                }
                break;
            default:
                return;
        }

        focusInput(targetRowId, targetField);
    };

    const focusInput = (rowId, field) => {
        const key = `${rowId}-${field}`;
        if (inputRefs.current[key]) {
            inputRefs.current[key].focus();
            if (inputRefs.current[key].select) {
                inputRefs.current[key].select();
            }
        }
    };

    useEffect(() => {
        setRows(prevRows =>
            prevRows.map(row => ({
                ...row,
                salesManId: formData.employeeId || null,
                GodownId: formData.GodownId || null
            }))
        );
    }, [formData.employeeId, formData.GodownId]);

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

    useEffect(() => {
        const filledRows = rows.filter(row =>
            row.productCode && row.productCode.trim() !== ''
        );

        const quotationDetails = filledRows.map((row, index) => ({
            deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
            orderDetails1Id: row.orderDetails1Id,
            quotationDetailsId: row.quotationDetailsId,
            proformaDetails1Id: row.proformaDetails1Id,
            SlNo: index + 1,
            productCode: row.productCode,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            qty: row.qty || null,
            freeQty: row.freeQty || null,
            rate: row.salesRateWithoutTax ? parseFloat(Number(row.salesRateWithoutTax).toFixed(4)) : null,
            inclusiveRate: row.salesRate ? parseFloat(Number(row.salesRate).toFixed(2)) : null,
            lineDiscountWithTax: row.lineDiscountWithTax || null,
            unitId: row.unit || null,
            unitName: row.productDetails?.UnitName || '',
            discountPercentage: row.desc || null,
            taxId: row.taxId || null,
            taxRate: row.taxRate || null,
            taxType: row.taxType || "Excluded",
            ConversionFactor: row.ConversionFactor || 0,
            barcode: row.productDetails.barcode || "",
            PurchaseRate: row.purchaseRate || null,
            taxAmount: row.taxAmt || null,
            grossAmount: row.grossAmount || null,
            netAmount: row.netValue || null,
            amount: row.amount || null,
            productDescription: row.productDetails.productDescription || "",
            discountAmount: row.descAmt || null,
            billDiscOnProduct: row.billDiscOnProduct || 0,
            AddCostonProduct: null,
            otherchargeonproduct: row.otherchargeonproduct || 0,
            salesManId: formData.employeeId,
            GodownId: formData.GodownId,
            RackId: null,
            branchId: selectedBranchId
        }));

        const taxableAmt = filledRows.reduce((sum, row) => sum + row.netValue, 0);
        const totalTax = (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product')
            ? filledRows.reduce((sum, row) => sum + row.taxAmt, 0)
            : 0;
        const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);
        const totalDiscount = filledRows.reduce((sum, row) => sum + row.descAmt, 0);

        setFormData(prev => ({
            ...prev,
            quotationDetails,
            taxableAmt: taxableAmt.toFixed(generalSettings.decimalPart),
            subTotal: taxableAmt.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart)
        }));
    }, [rows, selectedBranchId]);
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {

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

        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [focusedRowId, rows]);


    // 🔧 FIX 2: Recalculate row prices ONLY when user CHANGES pricingLevel/branch
    //           Skip on first render to preserve saved transaction prices
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return; // ← Skip on initial mount, preserves saved rate/amount from API
        }

        if (!allProducts || allProducts.length === 0) return;

        setRows(prevRows =>
            prevRows.map(row => {
                if (row.productCode && row.productCode.trim() !== '') {
                    const product = allProducts.find(p => p.productCode === row.productCode);
                    if (product) {
                        const priceInfo = getSalesPrice(product, row.unit);
                        const updatedRow = {
                            ...row,
                            salesRate: priceInfo.price,
                            maximumSellingPrice: priceInfo.maximumSellingPrice,
                            lowestSellingPrice: priceInfo.lowestSellingPrice,
                        };
                        return calculateRow(updatedRow);
                    }
                }
                return row;
            })
        );
    }, [formData.pricingLevelId, selectedBranchId]);

    const addRowAfter = async (rowId) => {
        if (editMode) {
            const result = await Swal.fire({
                title: t("salesInvoice.alert.addRowAfter.title"),
                text: t("salesInvoice.alert.addRowAfter.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("salesInvoice.alert.addRowAfter.confirm"),
                cancelButtonText: t("delete.cancel"),
            });
            if (!result.isConfirmed) return;
        }
        const index = rows.findIndex((row) => row.id === rowId);

        const newRow = {
            id: Date.now(),
            sn: 0,
            barcodeInput: '',
            productName: '',
            productNameArb: '',
            productCode: '',
            purchaseRate: 0,
            qty: 1,
            deliveryNoteDetails1Id: '',
            orderDetails1Id: '',
            quotationDetailsId: '',
            proformaDetails1Id: '',
            ConversionFactor: 0,
            freeQty: 0,
            unit: 2,
            salesRate: 0,
            taxRate: 0,
            desc: 0,
            descAmt: 0,
            grossAmount: 0,  // ← NEW FIELD
            netValue: 0,
            tax: 0,
            taxId: null,
            taxAmt: 0,
            amount: 0,
            taxType: 'Excluded',
            productDetails: {
                barcode: '',
                partNo: '',
                brand: '',
                mrp: '',
                purchase: '',
                description: '',
                productCode: '',
            }
        };

        const updatedRows = [...rows];
        updatedRows.splice(index + 1, 0, newRow);

        const reordered = updatedRows.map((row, idx) => ({
            ...row,
            id: idx + 1,
            sn: idx + 1,
        }));

        setRows(reordered);
    };

    const fetchTaxData = async () => {
        try {
            const res = await axiosInstance.get("tax-masters");
            setTaxData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching tax:", err);
        }
    };

    useEffect(() => {
        setRows(prevRows => prevRows.map(row => {
            if (!row.productCode) return row;

            const taxApplicableNow = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';
            const taxRate = safeParsePrice(row.taxRate);
            const taxMultiplier = 1 + (taxRate / 100);

            let newSalesRate = safeParsePrice(row.salesRate);
            let newSalesRateWithoutTax = safeParsePrice(row.salesRateWithoutTax);

            if (!taxApplicableNow) {
                if (generalSettings?.taxincluded === true) {
                    // Price was inclusive with tax — switching to NA
                    // Keep the inclusive price as-is for both; total stays the same
                    newSalesRate = safeParsePrice(row.salesRate);
                    newSalesRateWithoutTax = safeParsePrice(row.salesRate);
                } else {
                    // Price was ex-tax — switching to NA
                    // Use the ex-tax rate for both; no tax added
                    newSalesRate = safeParsePrice(row.salesRateWithoutTax);
                    newSalesRateWithoutTax = safeParsePrice(row.salesRateWithoutTax);
                }
            } else {
                // Switching back TO applicable
                if (generalSettings?.taxincluded === true) {
                    newSalesRate = safeParsePrice(row.salesRate);
                    newSalesRateWithoutTax = taxMultiplier !== 0
                        ? newSalesRate / taxMultiplier
                        : newSalesRate;
                } else {
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
        // REPLACE the rateWithoutTax block in calculateRow

      const rateWithoutTax = (row.salesRateWithoutTax && safeParsePrice(row.salesRateWithoutTax) > 0 && updatedField !== 'salesRate' && updatedField !== 'beforeTax')
    ? safeParsePrice(row.salesRateWithoutTax)
    : (!taxApplicable || taxMultiplier === 0)
        ? salesRate
        : parseFloat(((salesRate * 100) / (100 + taxPercentage)).toFixed(generalSettings?.decimalPart || 4));

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
                    salesRate: parseFloat(calculatedSalesRate),
                    salesRateWithoutTax: parseFloat(salesRateWithoutTax),
                    grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),  // ← NEW
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
                netValue = netValueBeforeBillDisc;
                gross = netValue + existingDescAmt;
                const calculatedSalesRate = qty > 0 ? gross / qty : 0;
                salesRateWithoutTax = calculatedSalesRate;
                descPercentage = gross > 0 ? (existingDescAmt / gross) * 100 : 0;

                return {
                    ...row,
                    amount: parseFloat(inputAmount.toFixed(generalSettings?.decimalPart || 2)),
                    salesRate: parseFloat(calculatedSalesRate),
                    salesRateWithoutTax: parseFloat(salesRateWithoutTax),
                    grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),  // ← NEW
                    netValue: parseFloat(netValue.toFixed(generalSettings?.decimalPart || 2)),
                    taxAmt: parseFloat(taxAmt.toFixed(generalSettings?.decimalPart || 2)),
                    desc: parseFloat(descPercentage.toFixed(generalSettings?.decimalPart || 2)),
                    descAmt: parseFloat(existingDescAmt.toFixed(generalSettings?.decimalPart || 2)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings?.decimalPart || 2)),
                    otherchargeonproduct: parseFloat(otherChargeOnProduct.toFixed(generalSettings?.decimalPart || 2)),

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
        }

        return {
            ...row,
            desc: parseFloat(descPercentage.toFixed(generalSettings?.decimalPart || 2)),
            grossAmount: parseFloat(gross.toFixed(generalSettings?.decimalPart || 2)),  // ← NEW
            netValue: parseFloat(netValue.toFixed(generalSettings?.decimalPart || 2)),
            taxAmt: parseFloat(taxAmt.toFixed(generalSettings?.decimalPart || 2)),
            amount: parseFloat(amount.toFixed(generalSettings?.decimalPart || 2)),
            descAmt: parseFloat(descAmt.toFixed(generalSettings?.decimalPart || 2)),
            salesRateWithoutTax: parseFloat(salesRateWithoutTax),
            billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings?.decimalPart || 2)),
            otherchargeonproduct: parseFloat(otherChargeOnProduct.toFixed(generalSettings?.decimalPart || 2)),
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
            const suggestionElement = document.querySelector(
                `[data-suggestion-row="${rowId}"] [data-suggestion-index="${index}"]`
            );
            if (suggestionElement) {
                suggestionElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }, 0);
    };

    const getSalesPrice = (product, unitId) => {
        if (!Array.isArray(product.salesPrice)) {
            return {
                price: parseFloat(product.salesPrice || 0),
                lowestSellingPrice: parseFloat(product.lowestSellingPrice || 0),
                maximumSellingPrice: parseFloat(product.maximumSellingPrice || 0),
            };
        }

        const pricingLevelId = formData.pricingLevelId || 1;

        let priceEntry = product.salesPrice.find(p =>
            p.branchId === selectedBranchId &&
            p.PricingLevelId === pricingLevelId
        );

        if (!priceEntry && pricingLevelId !== 1) {
            priceEntry = product.salesPrice.find(p =>
                p.unitId === unitId &&
                p.branchId === selectedBranchId &&
                p.PricingLevelId === 1
            );
        }

        if (!priceEntry) {
            priceEntry = product.salesPrice.find(p =>
                p.unitId === unitId &&
                p.PricingLevelId === pricingLevelId
            );
        }

        if (!priceEntry) {
            priceEntry = product.salesPrice.find(p =>
                p.unitId === unitId
            );
        }

        if (!priceEntry && product.salesPrice.length > 0) {
            priceEntry = product.salesPrice[0];
        }

        return {
            price: parseFloat(priceEntry?.salesPrice || 0),
            lowestSellingPrice: parseFloat(priceEntry?.lowestSellingPrice || 0),
            maximumSellingPrice: parseFloat(product.maximumSellingPrice || priceEntry?.amount || 0),
        };
    };

    const getDisplayPrice = (product) => {
        if (!Array.isArray(product.salesPrice)) {
            return parseFloat(product.salesPrice || 0);
        }
        return getSalesPrice(product, product.unitId).price;
    };

    const filterProducts = (searchTerm, rowId) => {
        if (!searchTerm || searchTerm.trim() === '') {
            setSuggestions(prev => ({ ...prev, [rowId]: [] }));
            setLoadingProducts(prev => ({ ...prev, [rowId]: false }));
            setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 }));
            return;
        }

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

                const salesPriceStr = Array.isArray(product.salesPrice)
                    ? product.salesPrice.map(p => p.salesPrice || '').join(' ')
                    : (product.salesPrice || '').toString();
                const salesPrice = salesPriceStr.toLowerCase();

                if (productCode.includes(searchLower) ||
                    barcode.includes(searchLower) ||
                    partNo.includes(searchLower) ||
                    salesPrice.includes(searchLower) ||
                    unitName.includes(searchLower)) {
                    return true;
                }

                const nameWords = productName.split(/\s+/);
                const allPartsMatch = searchParts.every(searchPart => {
                    return nameWords.some(word => word.includes(searchPart));
                });

                return allPartsMatch;
            });

            setSuggestions(prev => ({ ...prev, [rowId]: filteredProducts }));
            setActiveSuggestionRow(rowId);
            setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: 0 }));

        } catch (err) {
            console.error("Error filtering products:", err);
        } finally {
            setLoadingProducts(prev => ({ ...prev, [rowId]: false }));
        }
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
                text: t("salesInvoice.alert.duplicateProduct.text") || "This product is already in the quotation. What would you like to do?",
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

    const [pendingFocusBarcodeRowId, setPendingFocusBarcodeRowId] = useState(null);
    // Add this useEffect near the existing pendingFocusRowId useEffect
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
            setPendingFocusField('qty');
        }
    }, [rows, pendingFocusRowId]);


    const selectProduct = async (rowId, product, selectedUnitId) => {
        try {
            // Check for duplicate product
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
                        focusInput(duplicateCheck.existingRowId, 'qty');

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
            // REPLACE in both selectProduct and selectProductByBarcode
            const taxApplicable = generalSettings?.ActivateTax && formData.taxType === 'Applicable to product';

            let salesRate, salesRateWithoutTax;

            if (!taxApplicable) {
                salesRate = productPrice;
                salesRateWithoutTax = productPrice;
            } else if (generalSettings?.taxincluded === true) {
                salesRate = productPrice;
                const taxMultiplier = 1 + (taxRate / 100);
                salesRateWithoutTax = taxMultiplier !== 0 ? productPrice / taxMultiplier : productPrice;
            } else {
                salesRateWithoutTax = productPrice;
                salesRate = parseFloat((productPrice * (1 + (taxRate / 100))).toFixed(generalSettings?.decimalPart || 2));
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
            setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
            setActiveSuggestionRow(null);
            setTimeout(() => {
                const focusSetting = saleSettings?.GridFocusingProductNameToNext;
                const currentRowIndex = updatedRows.findIndex(r => r.id === rowId);
                const isLastRow = currentRowIndex === updatedRows.length - 1;

                if (focusSetting === 'BarcodeInNextRow' || focusSetting === 'productNameInNextRow') {
                    const focusField = focusSetting === 'BarcodeInNextRow' ? 'barcode' : 'productName';

                    if (!isLastRow) {
                        const nextRowId = updatedRows[currentRowIndex + 1].id;
                        focusInput(nextRowId, focusField);
                    } else {
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
                                billDiscOnProduct: 0,
                                otherchargeonproduct: 0,
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

            // First, try to find product by barcode
            let product = allProducts.find(p => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase());

            // If not found by barcode, try to find by product code
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
                        focusInput(duplicateCheck.existingRowId, 'qty');

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

                        setIsUpdatingFromDuplicate(false);
                    }, 200);

                    return;
                } else if (duplicateCheck.action === 'cancel') {
                    setRows(prev => prev.map(r => r.id === rowId ? { ...r, barcodeInput: '' } : r));
                    return;
                }
            }

            // Find matching unit by barcode, or use first available unit
            const selectedUnit = product.units?.find(
                u => u.barcode && u.barcode.toLowerCase() === barcode.toLowerCase()
            ) || product.units?.[0];

            const priceInfo = getSalesPrice(product, product.unitId);
            const productPrice = safeParsePrice(priceInfo.price);
            const defaultTax = product.salesTaxes?.length > 0 ? product.salesTaxes[0] : null;
            const taxRate = safeParsePrice(defaultTax?.rate);

            // Handle tax included/excluded pricing
            let salesRate, salesRateWithoutTax;

            if (generalSettings?.taxincluded === true) {
                // Product price is tax-included
                salesRate = productPrice;
                const taxMultiplier = 1 + (taxRate / 100);
                salesRateWithoutTax = taxMultiplier !== 0 ? productPrice / taxMultiplier : productPrice;
            } else {
                // Product price is tax-excluded
                salesRateWithoutTax = productPrice;
                salesRate = parseFloat((productPrice * (1 + (taxRate / 100))).toFixed(generalSettings?.decimalPart || 2));
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

            setTimeout(() => {
                const focusSetting = saleSettings?.GridFocusingBarcodeToNext;

                if (focusSetting === 'ProductNameOnSameRow') {
                    focusInput(rowId, 'productName');
                } else {
                    // Default: BarcodeInNextRow
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
                                billDiscOnProduct: 0,
                                otherchargeonproduct: 0,
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

    const handleProductUpdate = (productCode, updatedDescription) => {
        setRows(prevRows =>
            prevRows.map(row =>
                row.productDetails.productCode === productCode
                    ? {
                        ...row,
                        productDetails: {
                            ...row.productDetails,
                            productDescription: updatedDescription
                        }
                    }
                    : row
            )
        );
    };

    useEffect(() => {
        if (activeSuggestionRow !== null && selectedSuggestionIndex[activeSuggestionRow] >= 0) {
            const suggestionContainer = suggestionRef.current;
            const activeItem = suggestionContainer?.querySelector(
                `[data-suggestion-index="${selectedSuggestionIndex[activeSuggestionRow]}"]`
            );

            if (activeItem && suggestionContainer) {
                const containerRect = suggestionContainer.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                const stickyButtonHeight = 42;

                if (itemRect.bottom > containerRect.bottom - stickyButtonHeight) {
                    suggestionContainer.scrollTop +=
                        itemRect.bottom - containerRect.bottom + stickyButtonHeight;
                } else if (itemRect.top < containerRect.top) {
                    suggestionContainer.scrollTop -=
                        containerRect.top - itemRect.top;
                }
            }
        }
    }, [selectedSuggestionIndex, activeSuggestionRow]);

    const handleInputChange = (id, field, value, updatedField = null) => {

        const updatedRows = rows.map(row => {

            if (row.id === id) {
                // ── NEW: map beforeTax field → salesRateWithoutTax, then recalculate ──
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
                if (field === 'productName') {
                    filterProducts(value, id);
                }
                // Validate sales price when sales rate changes
                if (field === 'salesRate' && row.productCode) {
                    const priceValue = safeParsePrice(value);
                    const validation = validateSalesPrice(priceValue, row);

                    // Block entry if validation fails and action is 'block'
                    if (!validation.isValid && validation.action === 'block') {
                        Swal.fire({
                            title: t("salesInvoice.alert.invalidPrice.title") || "Invalid Price",
                            text: validation.message,
                            icon: "warning",
                            confirmButtonColor: "#3085d6",
                            confirmButtonText: t("okBtn") || "OK",
                        });
                        return row; // Don't update if validation fails
                    }
                }
                let updatedRow = { ...row, [field]: value };
                const resolvedUpdatedField = updatedField ?? (field === 'salesRate' ? 'salesRate' : null);
                return calculateRow(updatedRow, resolvedUpdatedField);
            }
            return row;
        });

        setRows(updatedRows);

     if (field !== 'productName' && id === rows[rows.length - 1].id && value !== '' && value !== 0 && !isUpdatingFromDuplicate) {
    const lastRow = rows[rows.length - 1];
    if (lastRow.productName && lastRow.productName.trim() !== '') {
        addRow();
    }
}
    };



    const addRow = () => {
        const newRow = {
            id: rows.length + 1,
            sn: rows.length + 1,
            barcodeInput: '',
            productName: '',
            productNameArb: '',
            productCode: '',
            purchaseRate: 0,
            qty: 1,
            freeQty: 0,
            unit: 2,
            salesRate: 0,
            desc: 0,
            descAmt: 0,
            grossAmount: 0,  // ← NEW FIELD
            deliveryNoteDetails1Id: '',
            orderDetails1Id: '',
            quotationDetailsId: '',
            proformaDetails1Id: '',
            netValue: 0,
            salesRateWithoutTax: 0,
            tax: 0,
            taxRate: 0,
            taxId: null,
            taxAmt: 0,
            amount: 0,
            taxType: 'Excluded',
            productDetails: {
                barcode: '',
                partNo: '',
                brand: '',
                mrp: '',
                purchase: '',
                description: '',
                productCode: '',
            }
        };
        setRows([...rows, newRow]);
    };

    const deleteRow = async (id) => {
        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({
                title: t("delete.title"),
                text: t("delete.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("delete.confirm"),
                cancelButtonText: t("delete.cancel"),
            });
            if (!result.isConfirmed) return;
        }
        if (rows.length > 1) {
            const newRows = rows
                .filter(row => row.id !== id)
                .map((row, index) => ({ ...row, sn: index + 1, id: index + 1 }));
            setRows(newRows);
        } else {
            setRows([
                {
                    id: 1,
                    sn: 1,
                    barcodeInput: '',
                    productName: '',
                    productNameArb: '',
                    productCode: '',
                    purchaseRate: 0,
                    qty: 1,
                    deliveryNoteDetails1Id: '',
                    orderDetails1Id: '',
                    quotationDetailsId: '',
                    proformaDetails1Id: '',
                    freeQty: 0,
                    unit: 2,
                    salesRate: 0,
                    desc: 0,
                    descAmt: 0,
                    grossAmount: 0,  // ← NEW FIELD
                    netValue: 0,
                    tax: 0,
                    taxRate: 0,
                    taxId: null,
                    taxAmt: 0,
                    amount: 0,
                    taxType: 'Excluded',
                    productDetails: {
                        barcode: '',
                        partNo: '',
                        brand: '',
                        mrp: '',
                        purchase: '',
                        description: '',
                        productCode: '',
                    }
                }
            ]);
        }
    };

    const handleInputFocus = (rowId) => {
        setFocusedRowId(rowId);
        setIsTableFocused(true);
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (!activeElement?.closest('table')) {
                setIsTableFocused(false);
                setFocusedRowId(null);
            }
        }, 100);
    };


    const calculateTotals = () => {
        const totalDiscount = rows.reduce((sum, row) => sum + row.descAmt, 0);
        const totalNetValue = rows.reduce((sum, row) => sum + row.netValue, 0);

        // ← CHANGE: add taxType check
        const totalTax = (generalSettings?.ActivateTax && formData.taxType === 'Applicable to product')
            ? rows.reduce((sum, row) => sum + row.taxAmt, 0)
            : 0;

        return {
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart),
            totalNetValue: totalNetValue.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            grandTotal: totalNetValue.toFixed(generalSettings.decimalPart)
        };
    };

    const totals = calculateTotals();
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

    return (
        <div className="w-full min-h-[400px] bg-primary dark:bg-primary" onBlur={(e) => {
            // Check if focus moved outside this entire component
            if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsTableFocused(false);
                setFocusedRowId(null);
            }
        }}
            onFocus={() => setIsTableFocused(true)}>

            <div>
                <div className="w-full">
                    <div
                        ref={rowRef}
                        className={`
                                    w-full custom-scrollbar
                                    ${saleSettings?.gridFixedHeight === true
                                ? activeSuggestionRow
                                    ? 'overflow-visible max-h-[5150px]'
                                    : 'max-h-[250px] overflow-auto'
                                : ''
                            }
    `}
                    >
                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[116px]" />
                                <col className="w-[440px]" />
                                <col className="w-[50px]" />
                                {saleSettings?.showFeeQtyColumn && <col className="w-[80px]" />}
                                <col className="w-[100px]" />
                                <col className="w-[80px]" />
                                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                    <col className="w-[110px]" />
                                )}
                                {/* After the descAmt col, inside showLineDiscount block */}
                                {saleSettings?.showLineDiscount && (
                                    <>
                                        <col className="w-[40px]" />
                                        <col className="w-[70px]" />
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
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">
                                        {t("salesInvoice.form.gridSection.columns.SN")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[116px]">
                                        {t("salesInvoice.form.gridSection.columns.barcode")}
                                    </th>
                                    <th className="p-1 relative text-left text-xs font-semibold border border-themed dark:border-themed w-[440px]">
                                        {t("salesInvoice.form.gridSection.columns.ProdName")}
                                        <RefreshCcw
                                            onClick={() => dispatch(refreshProductsByType('sales'))}
                                            width={20}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${productsLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`}
                                        />
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">
                                        {t("salesInvoice.form.gridSection.columns.qty")}
                                    </th>
                                    {saleSettings?.showFeeQtyColumn && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                            {t("salesInvoice.form.gridSection.columns.freeQty")}
                                        </th>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("salesInvoice.form.gridSection.columns.unit")}
                                    </th>
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
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("salesInvoice.form.gridSection.columns.netValue")}
                                    </th>
                                    {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (<>
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[90px]">{t("salesInvoice.form.gridSection.columns.tax%")}</th>
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">{t("salesInvoice.form.gridSection.columns.taxAmt")}</th>
                                    </>)}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("salesInvoice.form.gridSection.columns.amount")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                        {t("salesInvoice.form.gridSection.columns.action")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover ${rowErrors[row.id]
                                            ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
                                            : row.sn % 2 === 1
                                                ? 'bg-gray-100 dark:bg-gray-800'
                                                : 'bg-white dark:bg-gray-900'
                                            }`}
                                    >
                                        <td className="p-0.2 border border-themed dark:border-themed text-center">
                                            <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-barcode`] = el}
                                                type="text"
                                                value={row.barcodeInput || ''}
                                                onFocus={() => handleInputFocus(row.id)}
                                                onBlur={handleInputBlur}
                                                onChange={(e) => {
                                                    const updatedRows = rows.map(r =>
                                                        r.id === row.id ? { ...r, barcodeInput: e.target.value } : r
                                                    );
                                                    setRows(updatedRows);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'barcode')}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                placeholder={t("salesInvoice.form.gridSection.barcodePlaceholder")}
                                                autoComplete="off"
                                            />
                                            {selectingProduct[row.id] && (
                                                <div className="text-center mt-1">
                                                    <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed relative">
                                            <div className="flex gap-2 justify-between items-center">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-productName`] = el}
                                                    type="text"
                                                    onFocus={() => handleInputFocus(row.id)}
                                                    value={row.productName}
                                                    onChange={(e) => handleInputChange(row.id, 'productName', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                    placeholder={t("salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
                                                    autoComplete="off"
                                                    disabled={productsLoading}
                                                />

                                                {selectingProduct[row.id] && (
                                                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                    </div>
                                                )}
                                            </div>

                                            {activeSuggestionRow === row.id && (
                                                <div
                                                    ref={suggestionRef}
                                                    data-suggestion-row={row.id}
                                                    className="absolute z-90 w-full bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar"
                                                >
                                                    {loadingProducts[row.id] ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {suggestions[row.id]?.length > 0 ? (
                                                                suggestions[row.id].map((product, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        data-suggestion-index={idx}
                                                                        onClick={() => {
                                                                            selectProduct(row.id, product, product.unitId);
                                                                            setSelectedSuggestionIndex(prev => ({ ...prev, [row.id]: -1 }));
                                                                        }}
                                                                        className={`px-1 py-1 cursor-pointer border-b border-themed dark:border-themed last:border-b-0 relative ${selectedSuggestionIndex[row.id] === idx
                                                                            ? 'bg-[#4e23485f] dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                            : 'hover:bg-hover dark:hover:bg-hover'
                                                                            } ${selectingProduct[row.id] ? 'opacity-50 pointer-events-none' : ''}`}
                                                                    >
                                                                        {selectingProduct[row.id] && selectedSuggestionIndex[row.id] === idx && (
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
                                                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                                            </div>
                                                                        )}

                                                                        <div className="font-medium text-sm text-primary dark:text-primary">
                                                                            {product.productName}
                                                                        </div>
                                                                        <div className="text-xs text-tertiary dark:text-tertiary mt-0.5 flex gap-3">
                                                                            {product.barcode && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels")}: {product.barcode}</span>}
                                                                            {product.partNo && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.partNo")}: {product.partNo}</span>}
                                                                            {product.unitName && <span>{t("salesInvoice.form.gridSection.prodDetailsLabels.unit")}: {product.unitName}</span>}
                                                                            {getDisplayPrice(product) > 0 && (
                                                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                                                    {getDisplayPrice(product).toFixed(generalSettings.decimalPart)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="px-3 py-2 text-sm text-muted dark:text-muted text-center">
                                                                    No Product Found
                                                                </div>
                                                            )}

                                                            <div className="sticky bottom-0 bg-primary dark:bg-secondary border-t-2 border-themed dark:border-themed">
                                                                <button
                                                                    onClick={() => {
                                                                        setProductModalOpen(true);
                                                                        setActiveSuggestionRow(null);
                                                                        setSuggestions({});
                                                                    }}
                                                                    className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus size={16} />
                                                                    Add New Product
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
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-qty`] = el}
                                                type="text"
                                                value={inputValues[`${row.id}-qty`] !== undefined ? inputValues[`${row.id}-qty`] : row.qty}
                                                onFocus={(e) => {
                                                    handleInputFocus(row.id);
                                                    setInputValues(prev => ({ ...prev, [`${row.id}-qty`]: row.qty }));
                                                    setTimeout(() => e.target.select(), 0);
                                                }}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                    setInputValues(prev => ({ ...prev, [`${row.id}-qty`]: validValue }));
                                                    const numValue = validValue === '' ? 0 : parseFloat(validValue);
                                                    handleInputChange(row.id, 'qty', numValue || 0);
                                                }}
                                                onBlur={(e) => {
                                                    const value = e.target.value === '' ? 1 : parseFloat(e.target.value);
                                                    handleInputChange(row.id, 'qty', value || 1);
                                                    setInputValues(prev => {
                                                        const newState = { ...prev };
                                                        delete newState[`${row.id}-qty`];
                                                        return newState;
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const currentValue = inputValues[`${row.id}-qty`];
                                                        if (currentValue !== undefined) {
                                                            const value = currentValue === '' ? 1 : parseFloat(currentValue);
                                                            handleInputChange(row.id, 'qty', value || 1);
                                                            setInputValues(prev => {
                                                                const newState = { ...prev };
                                                                delete newState[`${row.id}-qty`];
                                                                return newState;
                                                            });
                                                        }
                                                    }
                                                    handleKeyDown(e, row.id, 'qty');
                                                }}
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        {saleSettings?.showFeeQtyColumn && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-freeQty`] = el}
                                                    type="text"
                                                    value={row.freeQty}
                                                    onFocus={(e) => { handleInputFocus(row.id); e.target.select(); }}
                                                    onBlur={handleInputBlur}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;
                                                        handleInputChange(row.id, 'freeQty', parseFloat(validValue) || 0);
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'freeQty')}
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                        )}
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <select
                                                ref={el => inputRefs.current[`${row.id}-unit`] = el}
                                                value={row.unit}
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
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'unit')}
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            >
                                                {row.availableUnits?.map((unit) => (
                                                    <option key={unit.unitId} value={unit.unitId}>
                                                        {unit.unitName || unit.unitname}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* ── NEW: Before Tax editable cell ── */}
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-beforeTax`] = el}
                                                type="text"
                                                value={
                                                    inputValues[`${row.id}-beforeTax`] !== undefined
                                                        ? inputValues[`${row.id}-beforeTax`]
                                                        : safeDisplayValueCustom(row.salesRateWithoutTax, 4)  // ← instead of Number(...).toFixed(4)
                                                }
                                                onFocus={(e) => {
                                                    handleInputFocus(row.id);
                                                    setInputValues(prev => ({
                                                        ...prev,
                                                        [`${row.id}-beforeTax`]: safeDisplayValueCustom(row.salesRateWithoutTax, 4)  // ← fix here too
                                                    }));
                                                    setTimeout(() => e.target.select(), 0);
                                                }}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                    setInputValues(prev => ({ ...prev, [`${row.id}-beforeTax`]: validValue }));
                                                    handleInputChange(row.id, 'beforeTax', customRoundDecimal(validValue, 4));  // ← use customRoundDecimal
                                                }}
                                                onBlur={(e) => {
                                                    const value = customRoundDecimal(e.target.value, 4);  // ← use customRoundDecimal
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
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-salesRate`] = el}
                                                    type="text"
                                                    onFocus={(e) => {
                                                        handleInputFocus(row.id);
                                                        setInputValues(prev => ({ ...prev, [`${row.id}-salesRate`]: row.salesRate }));
                                                        setTimeout(() => e.target.select(), 0);
                                                    }}
                                                    value={inputValues[`${row.id}-salesRate`] !== undefined
                                                        ? inputValues[`${row.id}-salesRate`]
                                                        : Number(row.salesRate).toFixed(2)}  // ← 2 decimal places
                                                    onKeyDown={(e) => {
                                                        if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                                            handleKeyDown(e, row.id, 'salesRate');
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;
                                                        setInputValues(prev => ({ ...prev, [`${row.id}-salesRate`]: validValue }));
                                                        const numValue = validValue === '' ? 0 : parseFloat(validValue);
                                                        handleInputChange(row.id, 'salesRate', numValue || 0);
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
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    className={`w-full px-2 py-1 text-sm text-primary dark:text-primary rounded text-right disabled:text-gray-500 disabled:cursor-not-allowed ${rowErrors[row.id]?.fields?.includes('Sales Rate') || (row.productCode && safeParsePrice(row.salesRate) <= 0)
                                                        ? 'border-2 border-red-500 focus:ring-2 focus:ring-red-500'
                                                        : 'border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
                                                        }`}
                                                />
                                                {saleSettings?.showLineDiscount && (
                                                    <span className="text-xs text-muted dark:text-muted text-right block">
                                                        Gross: {Number(row.grossAmount).toFixed(generalSettings.decimalPart)}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {saleSettings?.showLineDiscount && (
                                            <>
                                                <td className="p-0 border border-themed dark:border-themed">
                                                    <input
                                                        // onBlur={handleInputBlur}
                                                        ref={el => inputRefs.current[`${row.id}-desc`] = el}
                                                        type="number"
                                                        min={0} max={99}
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
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <input
                                                        // onBlur={handleInputBlur}
                                                        ref={el => inputRefs.current[`${row.id}-descAmt`] = el}
                                                        type="number"
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
                                                            // Reset lineDiscountWithTax when user directly edits descAmt
                                                            setRows(prev => prev.map(r =>
                                                                r.id === row.id ? { ...r, lineDiscountWithTax: null } : r
                                                            ));
                                                            handleInputChange(row.id, "descAmt", num, 'descAmt');
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'descAmt')}
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>

                                                {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                                    <>
                                                        {/* ── NEW: Discount with Tax cell ── */}
                                                        <td className="p-0.2 border border-themed dark:border-themed">
                                                            <input
                                                                ref={el => inputRefs.current[`${row.id}-lineDiscWithTax`] = el}
                                                                type="text"
                                                                value={
                                                                    inputValues[`${row.id}-lineDiscWithTax`] !== undefined
                                                                        ? inputValues[`${row.id}-lineDiscWithTax`]
                                                                        : (row.lineDiscountWithTax != null
                                                                            ? safeDisplayValue(row.lineDiscountWithTax, generalSettings?.decimalPart)
                                                                            : '0.00') // Changed from '' to '0.00'
                                                                }
                                                                placeholder="w/tax"
                                                                onFocus={(e) => {
                                                                    handleInputFocus(row.id);
                                                                    setInputValues(prev => ({
                                                                        ...prev,
                                                                        [`${row.id}-lineDiscWithTax`]: row.lineDiscountWithTax ?? '0' // Changed from '' to '0'
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
                                                                    // handleInputBlur();
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                                                                        handleKeyDown(e, row.id, 'lineDiscWithTax');
                                                                }}
                                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                                className="w-full px-2 py-1 text-sm border-0  focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                            />
                                                        </td></>
                                                )}
                                            </>
                                        )}
                                        <td className="p-0.2 border border-themed">
                                            <div className="flex flex-col text-right">
                                                <span className="text-sm font-medium text-primary">
                                                    {row.netValue.toFixed(generalSettings.decimalPart)}
                                                </span>
                                            </div>
                                        </td>

                                        {(generalSettings?.ActivateTax && formData.taxType === 'Applicable to product') && (
                                            <>
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <select
                                                        ref={el => inputRefs.current[`${row.id}-tax`] = el}
                                                        value={row.taxId ? String(row.taxId) : ''}
                                                        onChange={(e) => {
                                                            const selectedTaxId = parseInt(e.target.value);
                                                            const taxSource = row.salesTaxes && row.salesTaxes.length > 0
                                                                ? row.salesTaxes
                                                                : taxData;
                                                            const selectedTax = taxSource.find(t => t.taxId === selectedTaxId);
                                                            const updatedRows = rows.map(r => {
                                                                if (r.id === row.id) {
                                                                    return calculateRow({
                                                                        ...r,
                                                                        taxId: selectedTax?.taxId || null,
                                                                        taxRate: parseFloat(selectedTax?.rate || 0)
                                                                    });
                                                                }
                                                                return r;
                                                            });
                                                            setRows(updatedRows);
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'tax')}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                                    >
                                                        <option value="" disabled>Select</option>
                                                        {(row.salesTaxes && row.salesTaxes.length > 0 ? row.salesTaxes : taxData)?.map((tax) => (
                                                            <option value={String(tax.taxId)} key={tax.taxId}>
                                                                {tax.taxName || tax.rate}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-0.2 border border-themed">
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-sm font-medium text-primary">
                                                            {row.taxAmt.toFixed(generalSettings.decimalPart)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        <td className="p-0.2 border border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-amount`] = el}
                                                type="text"
                                                value={inputValues[`${row.id}-amount`] !== undefined
                                                    ? inputValues[`${row.id}-amount`]
                                                    : Number(row.amount).toFixed(generalSettings?.decimalPart || 2)}
                                                onFocus={(e) => {
                                                    handleInputFocus(row.id);
                                                    setInputValues(prev => ({ ...prev, [`${row.id}-amount`]: row.amount }));
                                                    e.target.select();
                                                }}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                    setInputValues(prev => ({ ...prev, [`${row.id}-amount`]: validValue }));
                                                    const numericValue = validValue === '' ? 0 : parseFloat(validValue) || 0;
                                                    handleInputChange(row.id, 'amount', numericValue, 'amount');
                                                }}
                                                onBlur={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    handleInputChange(row.id, 'amount', value, 'amount');
                                                    setInputValues(prev => {
                                                        const newState = { ...prev };
                                                        delete newState[`${row.id}-amount`];
                                                        return newState;
                                                    });
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'amount')}
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-2 py-1 text-sm border-0 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right font-bold  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        <td className="border border-themed dark:border-themed text-center">
                                            <div className='flex justify-center gap-1'>
                                                <div>
                                                    <button
                                                        onClick={() => deleteRow(row.id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                        title="Delete This Row"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => addRowAfter(row.id)}
                                                        title="Insert 1 Row below"
                                                        className="text-secondary dark:text-secondary hover:text-primary dark:hover:text-primary"
                                                    >
                                                        <PlusIcon size={18} />
                                                    </button>
                                                </div>
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
                <button
                    onClick={addRow}
                    className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"
                >
                    <Plus size={15} />
                    {t("salesInvoice.form.gridSection.buttons.addRow")}
                </button>
            </div>
            {Object.keys(rowErrors).length > 0 && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                    <ul className="list-disc list-inside space-y-1">
                        {Object.entries(rowErrors).map(([rowId, error]) => (
                            <li key={rowId} className="text-sm text-red-700 dark:text-red-400">
                                Row {rows.find(r => r.id === parseInt(rowId))?.sn}: {
                                    error.type === 'skipped'
                                        ? (t("salesInvoice.form.gridSection.alert.skippedRowError") || "Cannot skip rows! Please fill this row or delete it.")
                                        : (t("salesInvoice.form.gridSection.alert.incompleteRowError") || "Incomplete data! Please select a product or clear the row.")
                                }
                            </li>
                        ))}
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
            <SalesQuotationFooterSection
                totals={totals}
                formData={formData}
                setFormData={setFormData}
                otherChargeLedgers={otherChargeLedgers}
                getCurrentProductCode={getCurrentProductCode}
                isTableFocused={isTableFocused}
                onFocus={() => setIsTableFocused(true)}
            />
            <ProductFormModal
                open={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                productCode={null}
                viewMode={false}
                modalMode={true}
                onSuccess={() => {
                    setProductModalOpen(false);
                    dispatch(refreshProductsByType('sales'))
                }}
            />
        </div>
    );
};

export default SalesQuotationTable;

SalesQuotationTable.propTypes = {
    formData: PropTypes.shape({
        employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        quotationDetails: PropTypes.arrayOf(PropTypes.object),
        taxableAmt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        subTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        totalTax: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        totalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        totalDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    setFormData: PropTypes.func.isRequired,
    editMode: PropTypes.bool,
    rows: PropTypes.arrayOf(
        PropTypes.shape({
            productName: PropTypes.string,
            productCode: PropTypes.string,
            deliveryNoteDetails1Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            orderDetails1Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            quotationDetailsId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            proformaDetails1Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            PurchaseRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            qty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            freeQty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            unitId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            discountPercentage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            netAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            taxId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            taxAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            taxType: PropTypes.string,
            salesManId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            barcode: PropTypes.string,
            productDescription: PropTypes.string,
            availableUnits: PropTypes.arrayOf(
                PropTypes.shape({
                    unitId: PropTypes.number,
                    unitName: PropTypes.string,
                    salesPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    barcode: PropTypes.string,
                })
            ),
        })
    ),
};

SalesQuotationTable.defaultProps = {
    editMode: false,
    rows: [],
};