import { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import EditProuctDetailsModal from './EditProuctDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
import SalesInvoiceFooterSection from './GodownTransferFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import ProductFormModal from '../../Master/multiMasterForms/Product/ProductFormModal';
import { useLocation } from 'react-router-dom';
import { refreshProductsByType } from '@/redux/slice/productSlice';

// Utility function to extract sales price from product
const extractSalesPrice = (product, selectedUnitId = null) => {
    if (!product) return 0;

    // If salesPrice is an array, find the matching unit or use first entry
    if (Array.isArray(product.salesPrice) && product.salesPrice.length > 0) {
        if (selectedUnitId) {
            const matchingPrice = product.salesPrice.find(sp => sp.unitId === selectedUnitId);
            if (matchingPrice) {
                return parseFloat(matchingPrice.amount || matchingPrice.salesPrice || 0);
            }
        }
        // Default to first entry
        return parseFloat(product.salesPrice[0].amount || product.salesPrice[0].salesPrice || 0);
    }

    // If salesPrice is a scalar
    if (typeof product.salesPrice === 'number' || typeof product.salesPrice === 'string') {
        return parseFloat(product.salesPrice || 0);
    }

    // Fallback to maximumSellingPrice
    return parseFloat(product.maximumSellingPrice || 0);
};

const GodownTransferTable = ({ formData, setFormData, editMode, rows: propRows, }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const { approveMode } = location.state || {};

    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId, } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const shoBottomDeailsOnRow = saleSettings.showProductDetails || false
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionRef = useRef(null);
    const inputRefs = useRef({});
    const [isInitialized] = useState(false);
    const { inventoryProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products);
    const [scrollPosition, setScrollPosition] = useState(0);

    const dispatch = useDispatch()
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [selectingProduct, setSelectingProduct] = useState({});
    const [productModalOpen, setProductModalOpen] = useState(false)
    const [inputValues, setInputValues] = useState({});
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
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.quantity) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                salesRate: parseFloat(item.rate) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                receivedQuantity: parseFloat(item.receivedQuantity) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: 0,
                netValue: parseFloat(item.netAmount) || 0,
                tax: parseFloat(item.taxId) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
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
                purchaseRate: 0,
                qty: 1,
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
                receivedQuantity: 0,
                salesManId: formData.employeeId || null,
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
                salesRate: parseFloat(item.rate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: 0,
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
                receivedQuantity: parseFloat(item.receivedQuantity) || 0,
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

        if (saleSettings.showFeeQtyColumn) {
            columns.push('freeQty');
        }

        columns.push('unit', 'salesRate');

        if (saleSettings?.showLineDiscount) {
            columns.push('desc', 'descAmt');
        }

        if (generalSettings?.ActivateTax) {
            columns.push('tax');
        }

        return columns;
    };

    const handleKeyDown = (e, rowId, currentField) => {
        // Handle barcode field Enter key
        if (currentField === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = rows.find(r => r.id === rowId);
            if (row && row.barcodeInput && row.barcodeInput.trim() !== '') {
                selectProductByBarcode(rowId, row.barcodeInput);
            }
            return;
        }

        // Handle qty field Enter key - move to salesRate in same row
        if (currentField === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'salesRate');
            return;
        }

        // Handle salesRate field Enter key - move to productName in next row
        if (currentField === 'salesRate' && e.key === 'Enter') {
            e.preventDefault();
            const currentRowIndex = rows.findIndex(row => row.id === rowId);

            if (currentRowIndex < rows.length - 1) {
                // Move to next row's productName
                const nextRowId = rows[currentRowIndex + 1].id;
                if (saleSettings.focusAfterSalesRate === 'productName') {
                    focusInput(nextRowId, 'productName');
                } else if (saleSettings.focusAfterSalesRate === 'barcode') {
                    focusInput(nextRowId, 'barcode');
                } else {
                    focusInput(nextRowId, 'productName');
                }

            } else {
                // If last row, add new row and focus on its productName
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
if (currentField === 'productName' && e.key === 'Enter') {
    const row = rows.find(r => r.id === rowId);
    if (!row?.productCode || row.productCode.trim() === '') {
        e.preventDefault();
        return; // do nothing — don't create a new row, don't move focus
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
        // Only set focus after products have finished loading
        if (!productsLoading && allProducts?.length > 0) {
            const timer = setTimeout(() => {
                focusInput(1, 'productName');
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [productsLoading, allProducts]);




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

        const transferDetails = filledRows.map((row, index) => ({
            SlNo: index + 1,
            productCode: row.productCode,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            quantity: row.qty || null,
            rate: row.salesRate || null,
            rackIdFrom: 1,
            rackIdTo: 1,
            unitId: row.unit || null,
            receivedQuantity: row.receivedQuantity || 0,
            ConversionFactor: row.ConversionFactor || 0,
            barcode: row.productDetails.barcode || "",
            amount: row.amount || null,
            branchId: selectedBranchId
        }));

        const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);

        setFormData(prev => ({
            ...prev,
            transferDetails,
            grandTotal: totalAmount.toFixed(generalSettings.decimalPart),
        }));
    }, [rows, selectedBranchId]);

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
            netValue: 0,
            tax: 0,
            taxId: null,
            taxAmt: 0,
            amount: 0,
            receivedQuantity: 0,
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



    const calculateRow = (row, updatedField = null) => {
        let gross, descAmt, netValue, taxAmt = 0, amount, descPercentage;

        if (generalSettings?.taxincluded === true) {
            const taxMultiplier = 1 + (row.tax / 100);
            const rateWithoutTax = row.salesRate / taxMultiplier;
            gross = rateWithoutTax * row.qty;

            if (updatedField === 'descAmt') {
                descAmt = row.descAmt || 0;
                descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
            } else {
                descPercentage = row.desc || 0;
                descAmt = (gross * descPercentage) / 100;
            }

            netValue = gross - descAmt;

            if (generalSettings?.ActivateTax) {
                taxAmt = (netValue * row.tax) / 100;
            } else {
                taxAmt = 0;
            }

            amount = netValue + taxAmt;

        } else {
            gross = row.qty * row.salesRate;

            if (updatedField === 'descAmt') {
                descAmt = row.descAmt || 0;
                descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
            } else {
                descPercentage = row.desc || 0;
                descAmt = (gross * descPercentage) / 100;
            }

            netValue = gross - descAmt;

            if (generalSettings?.ActivateTax) {
                taxAmt = (netValue * row.tax) / 100;
            } else {
                taxAmt = 0;
            }

            amount = netValue + taxAmt;
        }

        return {
            ...row,
            desc: parseFloat(descPercentage.toFixed(generalSettings.decimalPart)),
            netValue: parseFloat(netValue.toFixed(generalSettings.decimalPart)),
            taxAmt: parseFloat(taxAmt.toFixed(generalSettings.decimalPart)),
            amount: parseFloat(amount.toFixed(generalSettings.decimalPart)),
            descAmt: parseFloat(descAmt.toFixed(generalSettings.decimalPart))
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

            const filteredProducts = allProducts?.filter(product => {
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


    const selectProduct = async (rowId, product, selectedUnitId) => {


        try {
            // Find the selected unit from the product data
            const selectedUnit = product.units.find(u => u.unitId === selectedUnitId) || product.units[0];

            // IMPORTANT: Get the sales price for the selected unit by finding the matching product entry
            const productWithUnit = allProducts.find(p =>
                p.productCode === product.productCode && p.unitId === selectedUnitId
            );


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
                        salesRate: product.purchaseRate, // Use the unit-specific sales price
                        taxId: product?.taxId || null,
                        tax: parseFloat(product?.rate || 0),
                        taxRate: parseFloat(product?.rate || 0),
                        taxType: product?.taxType,
                        purchaseRate: product.purchaseRate,
                        productNameArb: product.productNameArb,

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
            setInputValues(prev => {
                const s = { ...prev };
                delete s[`${rowId}-productName`];
                return s;
            });
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
            const unitSalesPrice = extractSalesPrice(product, product.unitId);

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
                        salesRate: unitSalesPrice, // Use the unit-specific sales price
                        taxId: product?.taxId || null,
                        tax: parseFloat(product?.rate || 0),
                        taxRate: parseFloat(product?.rate || 0),
                        taxType: product?.taxType,
                        purchaseRate: product.purchaseRate,
                        productNameArb: product.productNameArb,

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
            setInputValues(prev => {
                const s = { ...prev };
                delete s[`${rowId}-productName`];
                return s;
            });
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
        const newRow = {
            id: rows.length + 1,
            sn: rows.length + 1,
            barcodeInput: '',
            productName: '',
            productCode: '',
            purchaseRate: 0,
            qty: 1,
            freeQty: 0,
            unit: 2,
            salesRate: 0,
            desc: 0,
            descAmt: 0,
            deliveryNoteDetails1Id: '',
            orderDetails1Id: '',
            quotationDetailsId: '',
            proformaDetails1Id: '',
            netValue: 0,
            tax: 0,
            taxRate: 0,
            taxId: null,
            taxAmt: 0,
            amount: 0,
            receivedQuantity: 0,
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
                    netValue: 0,
                    tax: 0,
                    taxRate: 0,
                    taxId: null,
                    taxAmt: 0,
                    amount: 0,
                    taxType: 'Excluded',
                    receivedQuantity: 0,
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
    const rowRef = useRef()
    useEffect(() => {
        if (rowRef.current) {
            rowRef.current.scrollTo({
                top: rowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [rows]);
    return (
        <div className="w-full min-h-[400px] bg-primary dark:bg-primary">
            {productsLoading && (<div className='flex justify-end mt-[-4px] text-secondary dark:text-secondary'>{t("salesInvoice.form.gridSection.productLoadingMsg")}</div>)}
            <div>

                <div className="w-full">
                    {/* Fixed Header Table */}
                    <div className="w-full overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                            <thead>
                                <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">{t("salesInvoice.form.gridSection.columns.SN")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[116px]">
                                        {t("salesInvoice.form.gridSection.columns.barcode")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[440px]">{t("salesInvoice.form.gridSection.columns.ProdName")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">{t("salesInvoice.form.gridSection.columns.qty")}</th>
                                    {
                                        approveMode && (
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">{t("salesInvoice.form.gridSection.columns.receivedQuantity")}</th>
                                        )
                                    }
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">{t("salesInvoice.form.gridSection.columns.unit")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[110px]">{t("salesInvoice.form.gridSection.columns.salesRate")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">{t("salesInvoice.form.gridSection.columns.amount")}</th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">{t("salesInvoice.form.gridSection.columns.action")}</th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Scrollable Body Table */}
                    <div ref={rowRef} className={`w-full custom-scrollbar ${activeSuggestionRow ? 'overflow-visible' : 'max-h-[250px] overflow-y-auto'}`}>
                        <table className="w-full border-collapse table-fixed">
                            <colgroup>
                                <col className="w-[40px]" />
                                <col className="w-[116px]" />
                                <col className="w-[440px]" />
                                <col className="w-[50px]" />
                                {approveMode && (<col className="w-[50px]" />)}
                                <col className="w-[100px]" />
                                <col className="w-[110px]" />
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
                                        <td className="p-0.2 border border-themed dark:border-themed text-center">
                                            <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                        </td>
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-barcode`] = el}
                                                type="text"
                                                value={row.barcodeInput || ''}
                                                onChange={(e) => {
                                                    const updatedRows = rows.map(r =>
                                                        r.id === row.id ? { ...r, barcodeInput: e.target.value } : r
                                                    );
                                                    setRows(updatedRows);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'barcode')}
                                                className="w-full px-2 py-1 text-sm border-0  text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                                placeholder={t("salesInvoice.form.gridSection.barcodePlaceholder")}
                                                autoComplete="off"
                                                disabled={selectingProduct[row.id]}
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
                                                    value={
                                                        inputValues[`${row.id}-productName`] !== undefined
                                                            ? inputValues[`${row.id}-productName`]
                                                            : row.productName
                                                    }
                                                    onFocus={() => {
                                                        // Do NOT pre-populate — row.productName shows via fallback,
                                                        // first onChange keystroke becomes the sole owner, no race.
                                                    }}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setInputValues(prev => ({
                                                            ...prev,
                                                            [`${row.id}-productName`]: value
                                                        }));
                                                        handleInputChange(row.id, 'productName', value);
                                                    }}
                                                    onBlur={() => {
                                                        setInputValues(prev => {
                                                            const s = { ...prev };
                                                            delete s[`${row.id}-productName`];
                                                            return s;
                                                        });
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                    placeholder={t("salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
                                                    autoComplete="off"
                                                    disabled={productsLoading}
                                                />
                                                <RefreshCcw
                                                    onClick={() => dispatch(refreshProductsByType('inventory'))}
                                                    width={20}
                                                    className={`text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${productsLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`}
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
                                                                            ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-l-blue-600'
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
                                                                            {product.salesPrice && (
                                                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                                                    {extractSalesPrice(product, product.unitId).toFixed(generalSettings.decimalPart)}
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
                                                                    className="w-full px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus size={16} />
                                                                    Add New Product
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {shoBottomDeailsOnRow && (
                                                row.productName && (row.productDetails.barcode || row.productDetails.partNo || row.productDetails.brand) && (
                                                    <div className='flex justify-between'>
                                                        <div className="mt-1 text-xs text-tertiary dark:text-tertiary space-y-0.5">
                                                            {(row.productDetails.barcode || row.productDetails.partNo) && (
                                                                <div className="flex gap-3 flex-wrap">
                                                                    {row.productDetails.barcode && (
                                                                        <span>
                                                                            <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels")}:</span> {row.productDetails.barcode}
                                                                        </span>
                                                                    )}
                                                                    {(row.productDetails.partNo && saleSettings.ShowPartNo) && (
                                                                        <span>
                                                                            <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.partNo")}:</span> {row.productDetails.partNo}
                                                                        </span>
                                                                    )}
                                                                    {row.productDetails.mrp && (
                                                                        <span>
                                                                            <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.mrp")}:</span> {row.productDetails.mrp}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.unit")} :{row.productDetails.UnitName}</span>
                                                                    {(row.productDetails.purchase && saleSettings.showPurchaserate) && (
                                                                        <div className="flex gap-3">
                                                                            <span>
                                                                                <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.purchase")}:</span> {row.productDetails.purchase}
                                                                            </span>

                                                                            {row.productDetails.brand && (
                                                                                <span>
                                                                                    <span className="font-medium">{t("salesInvoice.form.gridSection.prodDetailsLabels.brand")}:</span> {row.productDetails.brand}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                </div>
                                                            )}

                                                            {(row.productDetails.productDescription && saleSettings.showProductDescription) && (
                                                                <p className="text-muted dark:text-muted leading-tight">
                                                                    {t("salesInvoice.form.gridSection.prodDetailsLabels.desc")}: {row.productDetails.productDescription}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {(saleSettings.showProductDescription) && (
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
                                        <td className="p-0.2 border border-themed dark:border-themed">
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

                                                    handleInputChange(row.id, 'qty', parseFloat(validValue) || 0);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'qty')}
                                                className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                        </td>
                                        {
                                            approveMode && (
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <input
                                                        ref={el => inputRefs.current[`${row.id}-receivedQuantity`] = el}
                                                        type="text"
                                                        value={row.receivedQuantity || row.qty || 0}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^0-9.]/g, '');
                                                            const validValue = value.split('.').length > 2
                                                                ? value.slice(0, value.lastIndexOf('.'))
                                                                : value;

                                                            handleInputChange(row.id, 'receivedQuantity', parseFloat(validValue) || 0);
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'receivedQuantity')}
                                                        className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                    />
                                                </td>
                                            )
                                        }

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
                                                        salesRate: parseFloat(productWithUnit.salesPrice || 0), // Get sales price from the matched product
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
                                                <option key={unit.unitId || unit.unitid} value={unit.unitId}>
                                                    {unit.unitName || unit.unitname}
                                                </option>
                                            ))}
                                        </select>

                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-salesRate`] = el}
                                                type="text"
                                                onFocus={(e) => e.target.select()}
                                                value={row.salesRate}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                                    const validValue = value.split('.').length > 2
                                                        ? value.slice(0, value.lastIndexOf('.'))
                                                        : value;

                                                    handleInputChange(row.id, 'salesRate', validValue === '' ? 0 : validValue);
                                                }}
                                                onBlur={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    handleInputChange(row.id, 'salesRate', value);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'salesRate')}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                            />
                                            {/* {saleSettings?.showLineDiscount && (
                                                <span className="text-xs text-muted dark:text-muted text-right block">
                                                    Gross: {(row.qty * parseFloat(row.salesRate || 0)).toFixed(generalSettings.decimalPart)}
                                                </span>
                                            )} */}
                                        </td>



                                        <td className="p-0.2 border border-themed">
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
                    {t("salesInvoice.form.gridSection.buttons.addRow")}
                </button>
            </div>
            <EditProuctDetailsModal
                open={editProductModalOpen}
                handleClose={() => setEditProductModalOpen(false)}
                productCode={selectedProductCode}
                onSuccess={(updatedDescription) => {
                    handleProductUpdate(selectedProductCode, updatedDescription);
                }}
            />
            <SalesInvoiceFooterSection
                totals={totals}
                formData={formData}
                setFormData={setFormData}
            />
            <ProductFormModal
                open={productModalOpen}
                onClose={() =>
                    setProductModalOpen(false)
                }
                productCode={null}
                viewMode={false}
                modalMode={true}
                onSuccess={() => {
                    setProductModalOpen(false)
                    dispatch(refreshProductsByType('inventory'))
                }}
            />
        </div>
    );
};

export default GodownTransferTable;
