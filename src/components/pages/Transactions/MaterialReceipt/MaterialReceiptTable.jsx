import React, { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import EditProductDetailsModal from './EditProductDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
import MaterialReceiptFooterSection from './MaterialReceiptFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { refreshProductsByType } from '@/redux/slice/productSlice';

const MaterialReceiptTable = ({ godowns, formData, setFormData, editMode, rows: propRows, setRows: propSetRows, otherChargeLedgers }) => {

    const { t } = useTranslation();
    const [taxData, setTaxData] = useState([])
    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId, } = useAuth();
    const { generalSettings, purchaseSettings, inventorySettings } = useSelector((state) => state.settings);
    const showBottomDetailsOnRow = purchaseSettings?.showProductDescription || false;
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionRef = useRef(null);
    const inputRefs = useRef({});
    const [isInitialized, setIsInitialized] = useState(false);
    const { purchaseProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products)
    const [focusedField, setFocusedField] = useState(null);

    const dispatch = useDispatch()

    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [selectingProduct, setSelectingProduct] = useState({});
    const rowRef = useRef();
    const [scrollPosition, setScrollPosition] = useState(0);
    useEffect(() => {
        if (activeSuggestionRow) {
            // Save current scroll position
            setScrollPosition(window.scrollY);

            // Scroll to show the suggestion dropdown
            setTimeout(() => {
                const activeRow = document.querySelector(`[data-suggestion-row="${activeSuggestionRow}"]`);
                if (activeRow) {
                    const rect = activeRow.getBoundingClientRect();
                    const scrollOffset = window.scrollY + rect.top - 100; // 100px offset from top

                    window.scrollTo({
                        top: scrollOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else if (scrollPosition > 0) {
            // Restore original scroll position when suggestions close
            window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
            setScrollPosition(0);
        }
    }, [activeSuggestionRow]);
    const [rows, setRows] = useState(() => {
        if (propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productCode: item.productCode || '',
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                purchaseRateInput: parseFloat(item.rate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: parseFloat(item.descAmt) || (() => {
                    const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    const discPerc = parseFloat(item.discountPercentage) || 0;
                    return parseFloat(((gross * discPerc) / 100).toFixed(generalSettings?.decimalPart || 2)) || 0;
                })(),
                ConversionFactor: item.ConversionFactor || 0,
                netValue: parseFloat(item.netAmount) || 0,
                billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                tax: parseFloat(item.taxId) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                employeeId: item.employeeId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                orderDetails1Id: item.orderDetails1Id || "", 
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
                productName: '',
                productCode: '',
                purchaseRate: 0,
                ConversionFactor: 0,
                qty: 1,
                freeQty: 0,
                unit: 2,
                purchaseRateInput: 0,
                desc: 0,
                descAmt: 0,
                netValue: 0,
                billDiscOnProduct: 0,
                tax: 0,
                taxRate: 0,
                taxId: null,
                taxAmt: 0,
                amount: 0,
                taxType: 'Excluded',
                employeeId: formData.employeeId || null,
                GodownId: formData.GodownId || null,
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
        fetchTaxData()

    }, []);



    useEffect(() => {
        if (propRows && propRows.length > 0 && isInitialized) {
            const mappedRows = propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productCode: item.productCode || '',
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                purchaseRateInput: parseFloat(item.rate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                ConversionFactor: item.ConversionFactor || 0,
                descAmt: 0,
                netValue: parseFloat(item.netAmount) || 0,
                billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                tax: parseFloat(item.taxAmount) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                employeeId: item.employeeId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                orderDetails1Id: item.orderDetails1Id || "", 
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
        const columns = ['productName', 'qty'];

        if (purchaseSettings?.showFeeQtyColumn) {
            columns.push('freeQty');
        }

        columns.push('unit', 'purchaseRateInput');
        if (!purchaseSettings?.showLineDiscount) {
            columns.push('netValue');
        }

        if (purchaseSettings?.showLineDiscount) {
            columns.push('desc', 'descAmt');
        }

        if (generalSettings?.ActivateTax) {
            columns.push('tax');
        }
        if (inventorySettings.maintainGodown) {
            columns.push('GodownId');
        }
        return columns;
    };

    const handleKeyDown = (e, rowId, currentField) => {
        if (currentField === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'purchaseRateInput');
            return;
        }

        if (currentField === 'purchaseRateInput' && e.key === 'Enter') {
            e.preventDefault();
            const currentRowIndex = rows.findIndex(row => row.id === rowId);

            if (currentRowIndex < rows.length - 1) {
                const nextRowId = rows[currentRowIndex + 1].id;
                focusInput(nextRowId, 'productName');
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
        if (activeSuggestionRow !== null && selectedSuggestionIndex[activeSuggestionRow] >= 0) {
            const suggestionContainer = suggestionRef.current;
            const activeItem = suggestionContainer?.querySelector(
                `[data-suggestion-index="${selectedSuggestionIndex[activeSuggestionRow]}"]`
            );

            if (activeItem && suggestionContainer) {
                const containerRect = suggestionContainer.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                const stickyButtonHeight = 42; // height of "Add New Product" button

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
    useEffect(() => {
        if (!productsLoading && allProducts?.length > 0) {
            const timer = setTimeout(() => {
                focusInput(1, 'productName');
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [productsLoading, allProducts]);

    useEffect(() => {
        setRows(prevRows =>
            prevRows.map(row => ({
                ...row,
                employeeId: formData.employeeId || null,
                GodownId: formData.GodownId || null
            }))
        );
    }, [formData.employeeId, formData.GodownId]);

    useEffect(() => {
        if (formData.materialDetails && formData.materialDetails.length > 0) {
            let hasChanges = false;
            const updatedRows = rows.map((row, index) => {
                const detail = formData.materialDetails[index];
                if (
                    detail &&
                    detail.billDiscOnProduct !== undefined &&
                    parseFloat(detail.billDiscOnProduct) !== parseFloat(row.billDiscOnProduct || 0)
                ) {
                    hasChanges = true;
                    return calculateRow({ ...row, billDiscOnProduct: parseFloat(detail.billDiscOnProduct) });
                }
                return row;
            });
            if (hasChanges) setRows(updatedRows);
        }
    }, [formData.billDiscount]);

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

        const materialDetails = filledRows.map((row, index) => ({
            deliveryNoteDetails1Id: row.deliveryNoteDetails1Id || "",
            orderDetails1Id: row.orderDetails1Id || "",          // ← fix
            quotationDetailsId: row.quotationDetailsId || "",
            proformaDetails1Id: row.proformaDetails1Id || "",
            SlNo: index + 1,
            productCode: row.productCode,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            qty: row.qty || null,
            freeQty: null,
            rate: row.purchaseRateInput || null,
            unitId: row.unit || null,
            discountPercentage: row.desc || null,
            taxId: row.taxId || null,
            taxRate: row.taxRate || null,
            taxType: row.taxType || "Excluded",
            ConversionFactor: row.ConversionFactor || 0,
            barcode: row.productDetails.barcode || "",
            PurchaseRate: row.purchaseRate || null,
            taxAmount: row.taxAmt || null,
            grossAmount: row.netValue || null,
            netAmount: row.netValue || null,
            amount: row.amount || null,
            productDescription: row.productDetails.productDescription || "",
            billDiscOnProduct: row.billDiscOnProduct ?? null,
            AddCostonProduct: null,
            otherchargeOnProduct: null,
            employeeId: formData.employeeId,
            GodownId: formData.GodownId,
            RackId: null,
            branchId: selectedBranchId
        }));

        const taxableAmt = filledRows.reduce((sum, row) => sum + row.netValue, 0);
        const totalTax = filledRows.reduce((sum, row) => sum + row.taxAmt, 0);
        const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);
        const totalDiscount = filledRows.reduce((sum, row) => sum + row.descAmt, 0);

        setFormData(prev => ({
            ...prev,
            materialDetails,
            taxableAmt: taxableAmt.toFixed(generalSettings.decimalPart),
            subTotal: taxableAmt.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart)
        }));
    }, [rows, selectedBranchId]);

    useEffect(() => {
        if (rowRef.current) {
            rowRef.current.scrollTo({
                top: rowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [rows]);

    const addRowAfter = async (rowId) => {
        if (editMode) {
            const result = await Swal.fire({
                title: t("materialReceipt.alert.addRowAfter.title"),
                text: t("materialReceipt.alert.addRowAfter.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("materialReceipt.alert.addRowAfter.confirm"),
                cancelButtonText: t("delete.cancel"),
            });

            if (!result.isConfirmed) return;
        }
        const index = rows.findIndex((row) => row.id === rowId);

        const newRow = {
            id: Date.now(),
            sn: 0,
            productName: '',
            productCode: '',
            purchaseRate: 0,
            qty: 1,
            freeQty: 0,
            unit: 2,
            ConversionFactor: 0,
            purchaseRateInput: 0,
            desc: 0,
            descAmt: 0,
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
    const calculateRow = (row, updatedField = null) => {
        let gross, descAmt, netValue, taxAmt = 0, amount, descPercentage;

        const qty = parseFloat(row.qty) || 0;
        const purchaseRateInput = parseFloat(row.purchaseRateInput) || 0;
        const taxPercentage = parseFloat(row.taxRate) || 0;
        const decimalPart = generalSettings?.decimalPart || 2;

        if (updatedField === 'netValue') {
            const inputNetValue = parseFloat(row.netValue) || 0;
            const desc = parseFloat(row.desc) || 0;

            const descMultiplier = 1 - (desc / 100);
            const calculatedGross = descMultiplier > 0 ? inputNetValue / descMultiplier : inputNetValue;

            if (qty > 0) {
                const calculatedRate = calculatedGross / qty;
                descAmt = calculatedGross - inputNetValue;
                netValue = inputNetValue;

                const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;
                const netValueAfterBillDisc = netValue - billDiscOnProduct;

                if (generalSettings?.ActivateTax) {
                    taxAmt = (netValueAfterBillDisc * taxPercentage) / 100;
                }
                amount = netValueAfterBillDisc + taxAmt;

                return {
                    ...row,
                    purchaseRateInput: parseFloat(calculatedRate.toFixed(decimalPart)),
                    grossAmount: parseFloat(calculatedGross.toFixed(decimalPart)),
                    descAmt: parseFloat(descAmt.toFixed(decimalPart)),
                    netValue: parseFloat(netValue.toFixed(decimalPart)),
                    taxAmt: parseFloat(taxAmt.toFixed(decimalPart)),
                    amount: parseFloat(amount.toFixed(decimalPart)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(decimalPart))
                };
            }
        }

        gross = qty * purchaseRateInput;

        if (updatedField === 'descAmt') {
            descAmt = parseFloat(row.descAmt) || 0;
            descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
        } else {
            descPercentage = parseFloat(row.desc) || 0;
            descAmt = (gross * descPercentage) / 100;
        }

        netValue = gross - descAmt;

        const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;
        const netValueAfterBillDisc = netValue - billDiscOnProduct;

        if (generalSettings?.ActivateTax) {
            taxAmt = (netValueAfterBillDisc * taxPercentage) / 100;
        }

        amount = netValueAfterBillDisc + taxAmt;

        return {
            ...row,
            desc: parseFloat(descPercentage.toFixed(decimalPart)),
            netValue: parseFloat(netValue.toFixed(decimalPart)),
            taxAmt: parseFloat(taxAmt.toFixed(decimalPart)),
            amount: parseFloat(amount.toFixed(decimalPart)),
            descAmt: parseFloat(descAmt.toFixed(decimalPart)),
            billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(decimalPart))
        };
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
            const searchParts = searchLower.split(/\s+/); // Split by whitespace

            const filteredProducts = allProducts.filter(product => {
                const productName = (product.productName || '').toLowerCase();
                const productCode = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();
                const unitName = (product.unitName || '').toLowerCase();
                // const salesPrice = (product.salesPrice || '').toLowerCase();

                // Simple includes match for basic fields
                if (productCode.includes(searchLower) ||
                    barcode.includes(searchLower) ||
                    partNo.includes(searchLower) ||
                    // salesPrice.includes(searchLower) ||
                    unitName.includes(searchLower)) {
                    return true;
                }

                // Advanced matching for product name
                const nameWords = productName.split(/\s+/);

                // Check if all search parts can be found in word beginnings or within words
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

    // Updated selectProduct - Same method as SalesInvoice (no extra API call)
    const selectProduct = async (rowId, product, selectedUnitId) => {

        try {
            // Find the selected unit from the product data
            const selectedUnit = product.units.find(u => u.unitId === selectedUnitId) || product.units[0];

            // IMPORTANT: Get the sales price for the selected unit by finding the matching product entry
            const productWithUnit = allProducts.find(p =>
                p.productCode === product.productCode && p.unitId === selectedUnitId
            );

            const unitSalesPrice = productWithUnit ? parseFloat(productWithUnit.salesPrice || 0) : parseFloat(product.salesPrice || 0);
            const purchaseRate = parseFloat(
                productWithUnit?.purchaseRate ||
                product.purchaseRate ||
                productWithUnit?.PurchaseRate ||
                product.PurchaseRate ||
                0
            );

            // Get the last sales tax as default
            const defaultTax = product.purchaseTaxes && product.purchaseTaxes.length > 0
                ? product.purchaseTaxes[0]
                : null;

            const updatedRows = rows.map((row) => {
                if (row.id === rowId) {
                    const updatedRow = {
                        ...row,
                        deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
                        barcodeInput: productWithUnit?.barcode || product.barcode,
                        orderDetails1Id: row.orderDetails1Id,
                        quotationDetailsId: row.quotationDetailsId,
                        proformaDetails1Id: row.proformaDetails1Id,
                        productName: product.productName || '',
                        productCode: product.productCode || '',
                        ConversionFactor: productWithUnit?.conversionRate || selectedUnit.conversionrate || 0,
                        availableUnits: product.units || [],
                        unit: selectedUnitId || product.unitId || row.unit,
                        baseunitId: product.baseunitId || null,
                        salesRate: unitSalesPrice,
                        // Set tax from salesTaxes - use first item as default
                        taxId: defaultTax?.taxId || null,
                        tax: parseFloat(defaultTax?.rate || 0),
                        taxRate: parseFloat(defaultTax?.rate || 0),
                        taxType: 'Excluded',
                        // Store salesTaxes for this row to use in dropdown
                        purchaseTaxes: product.purchaseTaxes || [],
                        purchaseRate: product.purchaseRate,
                        productNameArb: product.productNameArb,
                        maximumSellingPrice: parseFloat(productWithUnit?.maximumSellingPrice || product.maximumSellingPrice || 0),
                        lowestSellingPrice: parseFloat(productWithUnit?.lowestSellingPrice || product.lowestSellingPrice || 0),

                        productDetails: {
                            barcode: productWithUnit?.barcode || product.barcode || '',
                            productCode: product.productCode,
                            UnitName: selectedUnit.unitName || product.unitName || '',
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
                focusInput(rowId, 'qty');
            }, 100);

        } catch (err) {
            console.error("Error fetching product details:", err);
        }
    };
    const selectProductByBarcode = async (rowId, barcode) => {
        try {
            if (!barcode || barcode.trim() === '') return;

            // Search for product by barcode in allProducts
            const product = allProducts.find(p =>
                p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
            );

            if (!product) {
                Swal.fire({
                    title: t("salesInvoice.form.gridSection.alert.barcodeNotFound"),
                    text: t("salesInvoice.form.gridSection.alert.description"),
                    icon: "warning",
                    confirmButtonColor: "#3085d6",
                    confirmButtonText: t("okBtn"),
                });
                return;
            }

            // Find the unit that matches the barcode
            const selectedUnit = product.units.find(u =>
                u.barcode && u.barcode.toLowerCase() === barcode.toLowerCase()
            ) || product.units[0];

            // Get the sales price for this specific unit
            const unitSalesPrice = parseFloat(product.salesPrice || 0);

            // Get the first sales tax as default
            const defaultTax = product.purchaseTaxes && product.purchaseTaxes.length > 0
                ? product.purchaseTaxes[0]
                : null;

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
                        ConversionFactor: product.conversionRate || selectedUnit.conversionrate || 0,
                        availableUnits: product.units || [],
                        unit: product.unitId || row.unit,
                        baseunitId: product.baseunitId || null,
                        salesRate: unitSalesPrice,
                        // Set tax from salesTaxes - use first item as default
                        taxId: defaultTax?.taxId || null,
                        tax: parseFloat(defaultTax?.rate || 0),
                        taxRate: parseFloat(defaultTax?.rate || 0),
                        taxType: 'Excluded',
                        // Store salesTaxes for this row to use in dropdown
                        purchaseTaxes: product.purchaseTaxes || [],
                        purchaseRate: product.purchaseRate,
                        productNameArb: product.productNameArb,
                        maximumSellingPrice: parseFloat(product?.maximumSellingPrice || 0),
                        lowestSellingPrice: parseFloat(product?.lowestSellingPrice || 0),

                        productDetails: {
                            barcode: product.barcode || '',
                            productCode: product.productCode,
                            UnitName: product.unitName || '',
                        },
                    };
                    return calculateRow(updatedRow);
                }
                return row;
            });

            setRows(updatedRows);

            // Move focus to quantity field after selecting product
            setTimeout(() => {
                focusInput(rowId, 'qty');
            }, 100);

        } catch (err) {
            console.error("Error fetching product by barcode:", err);
            Swal.fire({
                title: t("salesInvoice.alert.error.title") || "Error",
                text: t("salesInvoice.alert.error.text") || "Failed to load product details",
                icon: "error",
                confirmButtonColor: "#3085d6",
                confirmButtonText: t("salesInvoice.alert.error.confirm") || "OK",
            });
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

    const handleInputChange = (id, field, value, updatedField = null) => {
        const updatedRows = rows.map(row => {
            if (row.id === id) {
                let updatedRow = { ...row, [field]: value };

                if (field === 'productName') {
                    filterProducts(value, id);
                }

                return calculateRow(updatedRow, updatedField);
            }
            return row;
        });

        setRows(updatedRows);

        const isLastRow = id === rows[rows.length - 1].id;
        const hasInput = value !== '' && value !== 0;

        if (isLastRow && hasInput) {
            addRow();
        }
    };


    const addRow = () => {
        setRows(prevRows => {
            const newRow = {
                id: rows.length + 1,
                sn: rows.length + 1,
                productName: '',
                productCode: '',
                purchaseRate: 0,
                qty: 1,
                freeQty: 0,
                unit: 2,
                purchaseRateInput: 0,
                desc: 0,
                descAmt: 0,
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
            };
            return [...prevRows, newRow];
        });
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
                    productName: '',
                    productCode: '',
                    purchaseRate: 0,
                    qty: 1,
                    freeQty: 0,
                    unit: 2,
                    purchaseRateInput: 0,
                    desc: 0,
                    descAmt: 0,
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

    const calculateTotals = () => {
        const totalDiscount = rows.reduce((sum, row) => sum + row.descAmt, 0);
        const totalNetValue = rows.reduce((sum, row) => sum + row.netValue, 0);

        const totalTax = generalSettings?.ActivateTax
            ? rows.reduce((sum, row) => sum + row.taxAmt, 0)
            : 0;

        const grandTotal = totalNetValue;

        return {
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart),
            totalNetValue: totalNetValue.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            grandTotal: grandTotal.toFixed(generalSettings.decimalPart)
        };
    };

    const totals = calculateTotals();

    return (
        <div className="w-full min-h-[400px] bg-primary dark:bg-primary">

            <div>
                <div className="w-full">
                    {/* Fixed Header Table */}
                    <div className="w-full overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">
                                        {t("materialReceipt.form.gridSection.columns.SN")}
                                    </th>
                                    <th className="p-1 relative text-left text-xs font-semibold border border-themed dark:border-themed w-[440px]">
                                        {t("salesInvoice.form.gridSection.columns.ProdName")}
                                        <RefreshCcw
                                            onClick={() => dispatch(refreshProductsByType('purchase'))}
                                            width={20}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${productsLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`}
                                        />
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">
                                        {t("materialReceipt.form.gridSection.columns.qty")}
                                    </th>
                                    {purchaseSettings?.showFeeQtyColumn && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                            {t("materialReceipt.form.gridSection.columns.freeQty")}
                                        </th>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("materialReceipt.form.gridSection.columns.unit")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[110px]">
                                        {t("materialReceipt.form.gridSection.columns.purchaseRate")}
                                    </th>
                                    {purchaseSettings?.showLineDiscount && (
                                        <>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                                {t("materialReceipt.form.gridSection.columns.disc%")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                                {t("materialReceipt.form.gridSection.columns.discAmt")}
                                            </th>
                                        </>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("materialReceipt.form.gridSection.columns.netValue")}
                                    </th>
                                    {generalSettings?.ActivateTax && (
                                        <>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[90px]">
                                                {t("materialReceipt.form.gridSection.columns.tax%")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">
                                                {t("materialReceipt.form.gridSection.columns.taxAmt")}
                                            </th>
                                        </>
                                    )}
                                    {inventorySettings.maintainGodown && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">Godown</th>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("materialReceipt.form.gridSection.columns.amount")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                        {t("materialReceipt.form.gridSection.columns.action")}
                                    </th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Scrollable Body Table */}
                    <div ref={rowRef} className={`w-full  ${activeSuggestionRow ? 'overflow-visible max-h-[1150px]' : 'max-h-[150px] overflow-auto'} custom-scrollbar`}>
                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[440px]" />
                                <col className="w-[50px]" />
                                {purchaseSettings?.showFeeQtyColumn && <col className="w-[80px]" />}
                                <col className="w-[100px]" />
                                <col className="w-[110px]" />
                                {purchaseSettings?.showLineDiscount && (
                                    <>
                                        <col className="w-[70px]" />
                                        <col className="w-[100px]" />
                                    </>
                                )}
                                <col className="w-[100px]" />
                                {generalSettings?.ActivateTax && (
                                    <>
                                        <col className="w-[90px]" />
                                        <col className="w-[50px]" />
                                    </>
                                )}
                                {inventorySettings.maintainGodown && <col className="w-[100px]" />}
                                <col className="w-[100px]" />
                                <col className="w-[80px]" />
                            </colgroup>
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
                                            <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed relative">
                                            <div className="flex gap-2 justify-between items-center">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-productName`] = el}
                                                    type="text"
                                                    value={row.productName}
                                                    onChange={(e) => handleInputChange(row.id, 'productName', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                    placeholder={t("materialReceipt.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
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
                                                    ) : suggestions[row.id]?.length > 0 ? (
                                                        suggestions[row.id].map((product, idx) => (
                                                            <div
                                                                key={idx}
                                                                data-suggestion-index={idx}
                                                                onClick={() => {
                                                                    selectProduct(row.id, product, product.unitId);
                                                                    setSelectedSuggestionIndex(prev => ({ ...prev, [row.id]: -1 }));
                                                                }}
                                                                className={`px-1 py-1 cursor-pointer border-b border-themed dark:border-themed last:border-b-0 relative ${selectedSuggestionIndex[row.id] === idx
                                                                    ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                    : 'hover:bg-hover dark:hover:bg-hover'
                                                                    }`}
                                                            >
                                                                <div className="font-medium text-sm text-primary dark:text-primary">
                                                                    {product.productName}
                                                                </div>
                                                                <div className="text-xs text-tertiary dark:text-tertiary mt-0.5 flex gap-3">
                                                                    {product.barcode && <span>{t("materialReceipt.form.gridSection.prodDetailsLabels.barcodeLabels")}: {product.barcode}</span>}
                                                                    {product.partNo && <span>{t("materialReceipt.form.gridSection.prodDetailsLabels.partNo")}: {product.partNo}</span>}
                                                                    {product.unitName && <span>{t("materialReceipt.form.gridSection.prodDetailsLabels.unit")}: {product.unitName}</span>}
                                                                    {product.purchasePrice && (
                                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                                            {Number(product.purchasePrice).toFixed(generalSettings.decimalPart)}
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
                                                </div>
                                            )}

                                            {/* Conditional product details - only show when showBottomDetailsOnRow is true */}
                                            {showBottomDetailsOnRow && (
                                                row.productName && (row.productDetails.barcode || row.productDetails.partNo || row.productDetails.brand) && (
                                                    <div className='flex justify-between'>
                                                        <div className="mt-1 text-xs text-tertiary dark:text-tertiary space-y-0.5">
                                                            {(row.productDetails.barcode || row.productDetails.partNo) && (
                                                                <div className="flex gap-3 flex-wrap">
                                                                    {row.productDetails.barcode && (
                                                                        <span>
                                                                            <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.barcodeLabels")}:</span> {row.productDetails.barcode}
                                                                        </span>
                                                                    )}
                                                                    {(row.productDetails.partNo && purchaseSettings?.ShowPartNo) && (
                                                                        <span>
                                                                            <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.partNo")}:</span> {row.productDetails.partNo}
                                                                        </span>
                                                                    )}
                                                                    {row.productDetails.mrp && (
                                                                        <span>
                                                                            <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.mrp")}:</span> {row.productDetails.mrp}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.unit")} :{row.productDetails.UnitName}</span>
                                                                    {(row.productDetails.purchase && purchaseSettings?.showPurchaserate) && (
                                                                        <div className="flex gap-3">
                                                                            <span>
                                                                                <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.purchase")}:</span> {row.productDetails.purchase}
                                                                            </span>

                                                                            {row.productDetails.brand && (
                                                                                <span>
                                                                                    <span className="font-medium">{t("materialReceipt.form.gridSection.prodDetailsLabels.brand")}:</span> {row.productDetails.brand}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {(row.productDetails.productDescription && purchaseSettings?.showProductDescription) && (
                                                                <p className="text-muted dark:text-muted leading-tight">
                                                                    {t("materialReceipt.form.gridSection.prodDetailsLabels.desc")}: {row.productDetails.productDescription}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {(purchaseSettings?.showProductDescription) && (
                                                            <div className='cursor-pointer'>
                                                                <EllipsisVertical
                                                                    onClick={() => {
                                                                        setSelectedProductCode(row.productDetails.productCode);
                                                                        setEditProductModalOpen(true);
                                                                    }}
                                                                    className="text-secondary dark:text-secondary"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-qty`] = el}
                                                type="text"
                                                value={row.qty}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;

                                                    // Keep as string to allow typing decimal point
                                                    handleInputChange(row.id, 'qty', validValue);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                                className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                        </td>
                                        {purchaseSettings?.showFeeQtyColumn && (
                                            <td className="p-0.5 border border-themed dark:border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-freeQty`] = el}
                                                    type="text"
                                                    value={row.freeQty}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;

                                                        handleInputChange(row.id, 'freeQty', parseFloat(validValue) || 0);
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'freeQty')}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                />
                                            </td>
                                        )}
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <select
                                                ref={el => inputRefs.current[`${row.id}-unit`] = el}
                                                value={row.unit}
                                                onChange={(e) => {
                                                    const selectedUnitId = parseInt(e.target.value);

                                                    // Find the product entry that matches both productCode and selected unitId
                                                    const productWithUnit = allProducts.find(
                                                        (p) => p.productCode === row.productCode && p.unitId === selectedUnitId
                                                    );

                                                    if (productWithUnit) {
                                                        const selectedUnit = row.availableUnits?.find(
                                                            (u) => u.unitId === selectedUnitId
                                                        );

                                                        let updatedRow = {
                                                            ...row,
                                                            unit: selectedUnitId,
                                                            purchaseRateInput: parseFloat(productWithUnit.purchasePrice || 0),
                                                            ConversionFactor: parseFloat(productWithUnit.conversionRate || 0),
                                                            productDetails: {
                                                                ...row.productDetails,
                                                                barcode: productWithUnit.barcode || row.productDetails.barcode,
                                                                UnitName: selectedUnit?.unitName || productWithUnit.unitName || row.productDetails.UnitName,
                                                            },
                                                        };

                                                        updatedRow = calculateRow(updatedRow);

                                                        setRows((prev) =>
                                                            prev.map((r) => (r.id === row.id ? updatedRow : r))
                                                        );
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'unit')}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                            >
                                                {row.availableUnits?.map((unit) => (
                                                    <option key={unit.unitId} value={unit.unitId}>
                                                        {unit.unitName || unit.unitname}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-0.5 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-purchaseRateInput`] = el}
                                                type="text"
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                value={
                                                    focusedField === `${row.id}-purchaseRateInput`
                                                        ? row.purchaseRateInput
                                                        : Number(row.purchaseRateInput).toFixed(generalSettings.decimalPart || 2)
                                                }
                                                onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-purchaseRateInput`); }}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;
                                                    handleInputChange(row.id, 'purchaseRateInput', validValue);
                                                }}
                                                onBlur={(e) => {
                                                    setFocusedField(null);
                                                    const value = parseFloat(e.target.value) || 0;
                                                    handleInputChange(row.id, 'purchaseRateInput', parseFloat(value.toFixed(generalSettings.decimalPart || 2)));
                                                }}

                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'purchaseRateInput')}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                            {purchaseSettings?.showLineDiscount && (
                                                <span className="text-xs text-muted dark:text-muted text-right block">
                                                    Gross: {(row.qty * row.purchaseRateInput).toFixed(generalSettings.decimalPart)}
                                                </span>
                                            )}
                                        </td>
                                        {purchaseSettings?.showLineDiscount && (
                                            <>
                                                <td className="p-0 border border-themed dark:border-themed">
                                                    <input
                                                        ref={el => inputRefs.current[`${row.id}-desc`] = el}
                                                        type="number"
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        min={0}
                                                        max={99}
                                                        value={row.desc}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            let value = e.target.value.replace(/[^0-9.]/g, "");
                                                            let validValue = value.split(".").length > 2
                                                                ? value.slice(0, value.lastIndexOf("."))
                                                                : value;
                                                            let num = parseFloat(validValue) || 0;
                                                            if (num > 99) num = 99;
                                                            if (num < 0) num = 0;
                                                            handleInputChange(row.id, "desc", num);
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'desc')}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                    />
                                                </td>

                                                <td className="p-0.5 border border-themed dark:border-themed">
                                                    <input
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
                                                            let num = parseFloat(validValue) || 0;

                                                            const gross = row.qty * row.purchaseRateInput;
                                                            if (num > gross) num = gross;

                                                            handleInputChange(row.id, "descAmt", num, 'descAmt');
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'descAmt')}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                    />
                                                </td>
                                            </>
                                        )}
                                        <td className="p-0.5 border border-themed">
                                            {purchaseSettings?.showLineDiscount ? (
                                                <div className="flex flex-col text-right">
                                                    <span className="text-sm font-medium text-primary dark:text-primary">
                                                        {row.netValue.toFixed(generalSettings.decimalPart)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-netValue`] = el}
                                                    type="text"
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    value={
                                                        focusedField === `${row.id}-netValue`
                                                            ? row.netValue
                                                            : Number(row.netValue).toFixed(generalSettings.decimalPart || 2)
                                                    }
                                                    onFocus={(e) => { e.target.select(); setFocusedField(`${row.id}-netValue`); }}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;
                                                        const numericValue = validValue === '' ? 0 : parseFloat(validValue);
                                                        handleInputChange(row.id, 'netValue', numericValue, 'netValue');
                                                    }}
                                                    onBlur={(e) => {
                                                        setFocusedField(null);
                                                        const value = parseFloat(
                                                            (parseFloat(e.target.value) || 0).toFixed(generalSettings.decimalPart || 2)
                                                        );
                                                        handleInputChange(row.id, 'netValue', value, 'netValue');
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                />
                                            )}
                                        </td>

                                        {generalSettings?.ActivateTax && (
                                            <>
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <select
                                                        // onBlur={handleInputBlur}
                                                        ref={el => inputRefs.current[`${row.id}-tax`] = el}
                                                        value={row.taxId ? String(row.taxId) : ''}
                                                        onChange={(e) => {
                                                            const selectedTaxId = parseInt(e.target.value);
                                                            // Use row.salesTaxes instead of taxData
                                                            const taxSource = row.purchaseTaxes && row.purchaseTaxes.length > 0
                                                                ? row.purchaseTaxes
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
                                                        {/* Use row.salesTaxes if available, otherwise fallback to taxData */}
                                                        {(row.purchaseTaxes && row.purchaseTaxes.length > 0 ? row.purchaseTaxes : taxData)?.map((tax) => (
                                                            <option value={String(tax.taxId)} key={tax.taxId}>
                                                                {tax.taxName || tax.rate}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-0.5 border border-themed">
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-sm font-medium text-primary">
                                                            {row.taxAmt.toFixed(generalSettings.decimalPart)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        {inventorySettings.maintainGodown && (
                                            <td className="p-0.5 border border-themed dark:border-themed">
                                                <select
                                                    ref={el => inputRefs.current[`${row.id}-GodownId`] = el}
                                                    value={Number(row.GodownId) || 1}
                                                    onChange={(e) => handleInputChange(row.id, 'GodownId', parseInt(e.target.value))}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'GodownId')}
                                                    className="w-full px-2 py-1 text-sm border-0 bg-primary dark:bg-secondary text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                                >
                                                    {godowns?.map((godown) => (
                                                        <option key={godown.GodownId} value={Number(godown.GodownId) || 1}>
                                                            {godown.GodownName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        )}
                                        <td className="p-0.5 border border-themed">
                                            <span className="text-sm font-bold text-right block px-2 text-red-700 dark:text-red-400">
                                                {row.amount.toFixed(generalSettings.decimalPart)}
                                            </span>
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
            <div className="flex justify-end items-center mt-2">
                <button
                    onClick={addRow}
                    className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"
                >
                    <Plus size={15} />
                    {t("materialReceipt.form.gridSection.buttons.addRow")}
                </button>
            </div>
            <EditProductDetailsModal
                open={editProductModalOpen}
                handleClose={() => setEditProductModalOpen(false)}
                productCode={selectedProductCode}
                onSuccess={(updatedDescription) => {
                    handleProductUpdate(selectedProductCode, updatedDescription);
                }}
            />
            <MaterialReceiptFooterSection
                totals={totals}
                formData={formData}
                setFormData={setFormData}
                otherChargeLedgers={otherChargeLedgers}
            />
        </div>
    );
};

export default MaterialReceiptTable;