import { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import EditProuctDetailsModal from '../SalesInvoice/EditProuctDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
import PurchaseInvoiceFooterSection from './PurchaseInvoiceFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ProductFormModal from '../../Master/multiMasterForms/Product/ProductFormModal';
import { refreshProductsByType } from '@/redux/slice/productSlice';
import axiosInstance from '@/lib/axiosConfig';

const PurchaseInvoiceTable = ({ godowns, formData, setFormData, editMode, rows: propRows, otherChargeLedgers, taxData, bank, cash }) => {
    const { t } = useTranslation();
    const { purchaseSettings, inventorySettings, } = useSelector((state) => state.settings);
    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [scrollPosition, setScrollPosition] = useState(0);

    const [focusedRowId, setFocusedRowId] = useState(null);
    const [isTableFocused, setIsTableFocused] = useState(false);

    const decimalPart = generalSettings?.decimalPart ?? 2;

    const shoBottomDeailsOnRow = purchaseSettings?.showProductDetails || false;
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionRef = useRef(null);
    const inputRefs = useRef({});
    const [isInitialized] = useState(false);
    const { purchaseProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products)
    const dispatch = useDispatch()
    const [selectedRowIdForEdit, setSelectedRowIdForEdit] = useState(null);

    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});
    const [selectingProduct, setSelectingProduct] = useState({});
    const [productModalOpen, setProductModalOpen] = useState(false);

    const [rows, setRows] = useState(() => {
        if (propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                barcodeInput: item.barcode || '',
                productName: item.productName || '',
                productNameArb: item.productNameArb || '',
                productCode: item.productCode || '',
                receiptDetails1Id: item.receiptDetails1Id || '',
                orderDetails1Id: item.orderDetails1Id || '',
                ConversionFactor: item.ConversionFactor || 0,
                purchaseRate: parseFloat(item.rate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                SalesRate: parseFloat(item.SalesRate) || 0,
                purchaseTaxes: item.purchaseTaxes || [],
                rate: parseFloat(item.rate) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: 0,
                grossAmount: (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
                category: item?.category,
                billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                netValue: parseFloat(item.netAmount) || 0,
                tax: parseFloat(item.taxRate) || 0,
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
                receiptDetails1Id: '',
                orderDetails1Id: '',
                productCode: '',
                ConversionFactor: 0,
                purchaseTaxes: [],
                purchaseRate: 0,
                qty: 1,
                freeQty: 0,
                taxRate: 0,
                unit: 2,
                SalesRate: 0,
                rate: 0,
                desc: 0,
                descAmt: 0,
                grossAmount: 0,
                billDiscOnProduct: 0,
                netValue: 0,
                tax: 0,
                taxId: null,
                category: null,
                taxAmt: 0,
                amount: 0,
                taxType: 'Excluded',
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

    // Add the getCurrentProductCode function:
    const getCurrentProductCode = () => {
        if (focusedRowId && isTableFocused) {
            const currentRow = rows.find(row => row.id === focusedRowId);
            return currentRow?.productCode || null;
        }
        return null;
    };

    // Add focus handlers:
    const handleInputBlur = () => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (!activeElement?.closest('table')) {
                setIsTableFocused(false);
                setFocusedRowId(null);
            }
        }, 100);
    };
    const handleInputFocus = (rowId) => {
        setFocusedRowId(rowId);
        setIsTableFocused(true);
    };



    useEffect(() => {
        if (propRows && propRows.length > 0 && isInitialized) {
            const mappedRows = propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productNameArb: item.productNameArb || '',
                productCode: item.productCode || '',
                receiptDetails1Id: item.receiptDetails1Id,
                orderDetails1Id: item.orderDetails1Id,
                ConversionFactor: item.ConversionFactor || 0,
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                SalesRate: parseFloat(item.SalesRate) || 0,
                rate: parseFloat(item.rate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: 0,
                grossAmount: (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
                netValue: parseFloat(item.netAmount) || 0,
                billDiscOnProduct: parseFloat(item.billDiscOnProduct) || 0,
                tax: parseFloat(item.taxAmount) || 0,
                taxRate: parseFloat(item.taxRate) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                barcodeInput: item.barcode || '',
                category: item?.category,
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

        if (purchaseSettings?.showFeeQtyColumn) {
            columns.push('freeQty');
        }

        columns.push('unit');

        if (purchaseSettings?.ChangeSalesPrice) {
            columns.push('SalesRate');
        }

        columns.push('rate');

        if (saleSettings?.showLineDiscount) {
            columns.push('desc', 'descAmt', 'grossAmount');
        } else {
            columns.push('netValue');
        }

        if (generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') {
            columns.push('tax');
        }

        // REMOVED: GodownId column - now using header godown selection only
        // if (inventorySettings?.maintainGodown) {
        //     columns.push('GodownId');
        // }

        return columns;
    };

    const handleKeyDown = (e, rowId, currentField) => {
        if (currentField === 'barcode' && e.key === 'Enter') {
            e.preventDefault();
            const row = rows.find(r => r.id === rowId);
            if (row && row.barcodeInput && row.barcodeInput.trim() !== '') {
                selectProductByBarcode(rowId, row.barcodeInput);
            }
            return;
        }

        if (currentField === 'qty' && e.key === 'Enter') {
            e.preventDefault();
            focusInput(rowId, 'rate');
            return;
        }

        if (currentField === 'rate' && e.key === 'Enter') {
            e.preventDefault();
            const currentRowIndex = rows.findIndex(row => row.id === rowId);

            if (currentRowIndex < rows.length - 1) {
                const nextRowId = rows[currentRowIndex + 1].id;
                if (purchaseSettings?.focusAfterPurchaseRate === 'productName') {
                    focusInput(nextRowId, 'productName');
                } else if (purchaseSettings?.focusAfterPurchaseRate === 'barcode') {
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
        setRows(prevRows =>
            prevRows.map(row => ({
                ...row,
                salesManId: formData.employeeId || null,
                GodownId: formData.GodownId || null
            }))
        );
    }, [formData.employeeId, formData.GodownId]);

    useEffect(() => {
        if (formData.purchaseDetails && formData.purchaseDetails.length > 0) {
            let hasChanges = false;
            const updatedRows = rows.map((row, index) => {
                const detail = formData.purchaseDetails[index];
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
        if (formData.purchaseDetails && formData.purchaseDetails.length > 0) {
            let hasChanges = false;
            const updatedRows = rows.map((row, index) => {
                const detail = formData.purchaseDetails[index];
                if (
                    detail &&
                    detail.otherchargeOnProduct !== undefined &&
                    parseFloat(detail.otherchargeOnProduct) !== parseFloat(row.otherchargeOnProduct || 0)
                ) {
                    hasChanges = true;
                    return calculateRow({ ...row, otherchargeOnProduct: parseFloat(detail.otherchargeOnProduct) });
                }
                return row;
            });
            if (hasChanges) setRows(updatedRows);
        }
    }, [formData.othercharge]);

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

        const purchaseDetails = filledRows.map((row, index) => ({
            receiptDetails1Id: row.receiptDetails1Id,
            orderDetails1Id: row.orderDetails1Id,
            SlNo: index + 1,
            productCode: row.productCode,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            qty: row.qty || null,
            freeQty: row.freeQty || null,
            SalesRate: row.SalesRate || null,
            rate: row.rate || null,
            unitId: row.unit || null,
            discountPercentage: row.desc || null,
            taxId: row.taxId || null,
            taxRate: row.taxRate || null,
            taxType: row.taxType || "Excluded",
            ConversionFactor: row.ConversionFactor || 0,
            barcode: row.productDetails.barcode || "",
            taxAmount: row.taxAmt || null,
            grossAmount: row.netValue || null,
            netAmount: row.netValue || null,
            amount: row.amount || null,
            productDescription: row.productDetails.productDescription || "",
            billDiscOnProduct: row.billDiscOnProduct ?? null,
            AddCostonProduct: null,
            otherchargeOnProduct: row.otherchargeOnProduct ?? null,
            salesManId: formData.employeeId,
            GodownId: row.GodownId || formData.GodownId || 1,
            RackId: null,
            category: row.category || null,
            branchId: selectedBranchId
        }));

        const taxableAmt = filledRows.reduce((sum, row) => sum + row.netValue, 0);
        const totalTax = filledRows.reduce((sum, row) => sum + row.taxAmt, 0);
        const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);
        const totalDiscount = filledRows.reduce((sum, row) => sum + row.descAmt, 0);

        setFormData(prev => ({
            ...prev,
            purchaseDetails,
            taxableAmt: taxableAmt.toFixed(generalSettings.decimalPart),
            subTotal: taxableAmt.toFixed(generalSettings.decimalPart),
            totalTax: totalTax.toFixed(generalSettings.decimalPart),
            totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
            totalDiscount: totalDiscount.toFixed(generalSettings.decimalPart)
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
            receiptDetails1Id: '',
            orderDetails1Id: '',
            ConversionFactor: 0,
            freeQty: 0,
            unit: 2,
            SalesRate: 0,
            rate: 0,
            taxRate: 0,
            category: null,
            desc: 0,
            descAmt: 0,
            grossAmount: 0,
            netValue: 0,
            tax: 0,
            taxId: null,
            taxAmt: 0,
            amount: 0,
            taxType: 'Excluded',
            GodownId: formData.GodownId || null,
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
    useEffect(() => {
        setRows(prevRows => prevRows.map(row => calculateRow(row)));
    }, [formData.taxType]);


    const calculateRow = (row, updatedField = null) => {
        let gross, descAmt, netValue, taxAmt = 0, amount, descPercentage;

        if (updatedField === 'grossAmount') {
            const inputGross = parseFloat(row.grossAmount) || 0;
            const qty = parseFloat(row.qty) || 0;

            if (qty > 0) {
                const calculatedRate = inputGross / qty;
                gross = inputGross;
                descPercentage = parseFloat(row.desc) || 0;
                descAmt = (gross * descPercentage) / 100;
                netValue = gross - descAmt;

                const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;
                const otherchargeOnProduct = parseFloat(row.otherchargeOnProduct) || 0;
                const netValueAfterAdjustments = netValue - billDiscOnProduct + otherchargeOnProduct;

                if (generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') {
                    taxAmt = (netValueAfterAdjustments * row.tax) / 100;
                }
                amount = netValueAfterAdjustments + taxAmt;

                return {
                    ...row,
                    rate: parseFloat(calculatedRate),
                    grossAmount: parseFloat(inputGross.toFixed(generalSettings.decimalPart)),
                    desc: parseFloat(descPercentage.toFixed(generalSettings.decimalPart)),
                    descAmt: parseFloat(descAmt.toFixed(generalSettings.decimalPart)),
                    netValue: parseFloat(netValue.toFixed(generalSettings.decimalPart)),
                    taxAmt: parseFloat(taxAmt.toFixed(generalSettings.decimalPart)),
                    amount: parseFloat(amount.toFixed(generalSettings.decimalPart)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings.decimalPart)),
                    otherchargeOnProduct: parseFloat(otherchargeOnProduct.toFixed(generalSettings.decimalPart))
                };
            }
        }

        if (updatedField === 'netValue') {
            const inputNetValue = parseFloat(row.netValue) || 0;
            const qty = parseFloat(row.qty) || 0;
            const desc = parseFloat(row.desc) || 0;

            const descMultiplier = 1 - (desc / 100);
            const calculatedGross = descMultiplier > 0 ? inputNetValue / descMultiplier : inputNetValue;

            if (qty > 0) {
                const calculatedRate = calculatedGross / qty;
                descAmt = calculatedGross - inputNetValue;
                netValue = inputNetValue;
                gross = calculatedGross;

                const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;
                const otherchargeOnProduct = parseFloat(row.otherchargeOnProduct) || 0;
                const netValueAfterAdjustments = netValue - billDiscOnProduct + otherchargeOnProduct;

                if (generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') {
                    taxAmt = (netValueAfterAdjustments * row.tax) / 100;
                }
                amount = netValueAfterAdjustments + taxAmt;

                return {
                    ...row,
                    rate: parseFloat(calculatedRate),
                    grossAmount: parseFloat(calculatedGross.toFixed(generalSettings.decimalPart)),
                    descAmt: parseFloat(descAmt.toFixed(generalSettings.decimalPart)),
                    netValue: parseFloat(netValue.toFixed(generalSettings.decimalPart)),
                    taxAmt: parseFloat(taxAmt.toFixed(generalSettings.decimalPart)),
                    amount: parseFloat(amount.toFixed(generalSettings.decimalPart)),
                    billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings.decimalPart)),
                    otherchargeOnProduct: parseFloat(otherchargeOnProduct.toFixed(generalSettings.decimalPart))
                };
            }
        }

        // ─── Normal calculation flow ───────────────────────────────────────────────
        gross = row.qty * row.rate;

        if (updatedField === 'descAmt') {
            descAmt = row.descAmt || 0;
            descPercentage = gross > 0 ? (descAmt / gross) * 100 : 0;
        } else {
            descPercentage = row.desc || 0;
            descAmt = (gross * descPercentage) / 100;
        }

        netValue = gross - descAmt;

        const billDiscOnProduct = parseFloat(row.billDiscOnProduct) || 0;
        const otherchargeOnProduct = parseFloat(row.otherchargeOnProduct) || 0;
        const netValueAfterAdjustments = netValue - billDiscOnProduct + otherchargeOnProduct;

        if (generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') {
            taxAmt = (netValueAfterAdjustments * row.tax) / 100;
        }

        amount = netValueAfterAdjustments + taxAmt;

        return {
            ...row,
            grossAmount: parseFloat(gross.toFixed(generalSettings.decimalPart)),
            desc: parseFloat(descPercentage.toFixed(generalSettings.decimalPart)),
            netValue: parseFloat(netValue.toFixed(generalSettings.decimalPart)),
            taxAmt: parseFloat(taxAmt.toFixed(generalSettings.decimalPart)),
            amount: parseFloat(amount.toFixed(generalSettings.decimalPart)),
            descAmt: parseFloat(descAmt.toFixed(generalSettings.decimalPart)),
            billDiscOnProduct: parseFloat(billDiscOnProduct.toFixed(generalSettings.decimalPart)),
            otherchargeOnProduct: parseFloat(otherchargeOnProduct.toFixed(generalSettings.decimalPart))
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
    const getDisplayPrice = (product) => {
        const price = parseFloat(product.purchasePrice || product.purchaseRate || 0);
        return price;
    };
    const renderStockBadges = (product) => {
        if (!Array.isArray(product.stock) || product.stock.length === 0) return null;
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {product.stock.map((s, i) => {
                    const qty = parseFloat(s.currentStock) || 0;
                    const label = s.name || 'Unassigned';
                    const isNeg = qty < 0;
                    return (
                        <span
                            key={i}
                            style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '99px',
                                background: isNeg ? '#FCEBEB' : '#EAF3DE',
                                color: isNeg ? '#A32D2D' : '#3B6D11',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {label}: {qty}
                        </span>
                    );
                })}
            </div>
        );
    };

    const fetchSupplierLastPurchaseRate = async (ledgerId, productCode) => {
        if (!ledgerId || !productCode) return null;
        try {
            const response = await axiosInstance.post('supplier-last-purchase-rate', {
                ledgerId,
                productCode,
                branchId: selectedBranchId
            });

            const data = response.data; // axios already parses JSON into .data

            if (!data?.success) return null;

            const rate = parseFloat(data?.data?.lastPurchaseRate);
            return isNaN(rate) ? null : rate;
        } catch (err) {
            console.error("Error fetching supplier last purchase rate:", err);
            return null;
        }
    };

    const selectProduct = async (rowId, product, selectedUnitId) => {
        try {
            const selectedUnit = product.units.find(u => u.unitId === selectedUnitId) || product.units[0];

            const productWithUnit = allProducts?.find(p =>
                p.productCode === product.productCode && p.unitId === selectedUnitId
            );

            const unitSalesPrice = productWithUnit ? parseFloat(productWithUnit.salesPrice || 0) : parseFloat(product.salesPrice || 0);
            let purchaseRate = parseFloat(
                productWithUnit?.purchaseRate ||
                product.purchaseRate ||
                productWithUnit?.PurchaseRate ||
                product.PurchaseRate ||
                0
            );

            // Fetch supplier's last purchase rate for this product
            const supplierLedgerId = formData.ledgerId || formData.supplierId;
            const lastPurchaseRate = await fetchSupplierLastPurchaseRate(supplierLedgerId, product.productCode);
            if (lastPurchaseRate !== null) {
                purchaseRate = lastPurchaseRate;
            }

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
                        category: product?.category,
                        salesRate: unitSalesPrice,
                        taxId: defaultTax?.taxId || null,
                        tax: parseFloat(defaultTax?.rate || 0),
                        taxRate: parseFloat(defaultTax?.rate || 0),
                        taxType: 'Excluded',
                        purchaseTaxes: product.purchaseTaxes || [],
                        purchaseRate: purchaseRate,
                        rate: purchaseRate,
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
            const product = allProducts?.find(p =>
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

            let purchaseRate = parseFloat(product.purchaseRate || product.PurchaseRate || 0);

            // Fetch supplier's last purchase rate for this product
            const supplierLedgerId = formData.ledgerId || formData.supplierId;
            const lastPurchaseRate = await fetchSupplierLastPurchaseRate(supplierLedgerId, product.productCode);
            if (lastPurchaseRate !== null) {
                purchaseRate = lastPurchaseRate;
            }

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
                        category: product?.category,
                        taxId: defaultTax?.taxId || null,
                        tax: parseFloat(defaultTax?.rate || 0),
                        taxRate: parseFloat(defaultTax?.rate || 0),
                        taxType: 'Excluded',
                        purchaseTaxes: product.purchaseTaxes || [],
                        purchaseRate: purchaseRate,
                        rate: purchaseRate,
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
    const handleProductUpdate = (rowId, updatedDescription) => {
        setRows(prevRows => prevRows.map(row =>
            row.id === rowId
                ? { ...row, productDetails: { ...row.productDetails, productDescription: updatedDescription } }
                : row
        ));
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
                barcodeInput: '',
                productName: '',
                productCode: '',
                purchaseRate: 0,
                qty: 1,
                freeQty: 0,
                unit: 2,
                SalesRate: 0,
                rate: 0,
                desc: 0,
                descAmt: 0,
                grossAmount: 0,
                receiptDetails1Id: '',
                orderDetails1Id: '',
                category: null,
                netValue: 0,
                tax: 0,
                taxRate: 0,
                taxId: null,
                taxAmt: 0,
                amount: 0,
                taxType: 'Excluded',
                GodownId: formData.GodownId || null,
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
                    barcodeInput: '',
                    productName: '',
                    productCode: '',
                    purchaseRate: 0,
                    qty: 1,
                    receiptDetails1Id: '',
                    orderDetails1Id: '',
                    freeQty: 0,
                    unit: 2,
                    SalesRate: 0,
                    rate: 0,
                    desc: 0,
                    category: null,
                    descAmt: 0,
                    grossAmount: 0,
                    netValue: 0,
                    tax: 0,
                    taxRate: 0,
                    taxId: null,
                    taxAmt: 0,
                    amount: 0,
                    taxType: 'Excluded',
                    GodownId: formData.GodownId || null,
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
    useEffect(() => {
        // Only set focus after products have finished loading
        if (!productsLoading && allProducts?.length > 0) {
            const timer = setTimeout(() => {
                focusInput(1, 'productName');
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [productsLoading, allProducts]);
    const calculateTotals = () => {
        const totalDiscount = rows.reduce((sum, row) => sum + row.descAmt, 0);
        const totalNetValue = rows.reduce((sum, row) => sum + row.netValue, 0);

        const totalTax = (generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product')
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
    const rowRef = useRef();

    useEffect(() => {
        if (rowRef.current) {
            rowRef.current.scrollTo({
                top: rowRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [rows]);

    return (
        <div className="w-full  bg-primary dark:bg-primary">

            <div>
                <div className="w-full">
                    {/* Combined Scrollable Table with Sticky Header */}
                    <div
                        ref={rowRef}
                        className={`
                                w-full custom-scrollbar
                                ${purchaseSettings?.gridFixedHeight === true
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
                                <col className="w-[340px]" />
                                <col className="w-[35px]" />
                                {purchaseSettings?.showFeeQtyColumn && <col className="w-[80px]" />}
                                <col className="w-[80px]" />
                                {purchaseSettings?.ChangeSalesPrice && <col className="w-[70px]" />}
                                <col className="w-[80px]" />
                                {purchaseSettings?.showLineDiscount && (
                                    <>
                                        <col className="w-[50px]" />
                                        <col className="w-[70px]" />
                                        <col className="w-[70px]" />
                                    </>
                                )}
                                <col className="w-[100px]" />
                                {(generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') && (
                                    <>
                                        <col className="w-[70px]" />
                                        <col className="w-[50px]" />
                                    </>
                                )}
                                {/* {inventorySettings?.maintainGodown && <col className="w-[120px]" />} */}
                                <col className="w-[100px]" />
                                <col className="w-[60px]" />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-gray-400 dark:bg-black">
                                <tr className="border-b-2 border-themed dark:border-themed">
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[40px]">
                                        {t("salesInvoice.form.gridSection.columns.SN")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[116px]">
                                        {t("salesInvoice.form.gridSection.columns.barcode")}
                                    </th>
                                    <th className="p-1 relative text-left text-xs font-semibold border border-themed dark:border-themed w-[440px]">
                                        {t("salesInvoice.form.gridSection.columns.ProdName")}
                                        <RefreshCcw
                                            onClick={() => dispatch(refreshProductsByType('purchase'))}
                                            width={20}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 text-secondary dark:text-secondary cursor-pointer transition-transform duration-300 ${productsLoading ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`}
                                        />
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[35px]">
                                        {t("salesInvoice.form.gridSection.columns.qty")}
                                    </th>
                                    {purchaseSettings?.showFeeQtyColumn && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                            {t("salesInvoice.form.gridSection.columns.freeQty")}
                                        </th>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                        {t("salesInvoice.form.gridSection.columns.unit")}
                                    </th>
                                    {purchaseSettings?.ChangeSalesPrice && (
                                        <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                            {t("purchaseInvoice.form.gridSection.columns.salesRate")}
                                        </th>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[80px]">
                                        {t("purchaseInvoice.form.gridSection.columns.purchaseRate")}
                                    </th>
                                    {purchaseSettings?.showLineDiscount && (
                                        <>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">
                                                {t("salesInvoice.form.gridSection.columns.disc%")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                                {t("salesInvoice.form.gridSection.columns.discAmt")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                                {t("salesInvoice.form.gridSection.columns.grossAmount")}
                                            </th>
                                        </>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("salesInvoice.form.gridSection.columns.netValue")}
                                    </th>
                                    {(generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') && (
                                        <>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[70px]">
                                                {t("salesInvoice.form.gridSection.columns.tax%")}
                                            </th>
                                            <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[50px]">
                                                {t("salesInvoice.form.gridSection.columns.taxAmt")}
                                            </th>
                                        </>
                                    )}
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[100px]">
                                        {t("salesInvoice.form.gridSection.columns.amount")}
                                    </th>
                                    <th className="p-1 text-left text-xs font-semibold border border-themed dark:border-themed w-[60px]">
                                        {t("salesInvoice.form.gridSection.columns.action")}
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
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded disabled:text-gray-500 disabled:cursor-not-allowed"
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
                                                    value={row.productName}
                                                    onChange={(e) => handleInputChange(row.id, 'productName', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                    className="w-full px-2 py-0.5 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                    placeholder={t("salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
                                                    autoComplete="off"
                                                    onFocus={() => handleInputFocus(row.id)}  // Add this
                                                    onBlur={handleInputBlur}                  // Add this
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
                                                    className="absolute z-[100] bg-primary dark:bg-secondary border border-themed dark:border-themed rounded-md shadow-lg max-h-70 mt-1 custom-scrollbar"
                                                    style={
                                                        saleSettings?.ProductLookUpModel === 'Table'
                                                            ? { minWidth: '650px', width: 'max-content', maxWidth: '90vw', overflowY: 'auto', overflowX: 'auto' }
                                                            : { minWidth: '600px', overflowY: 'auto' }
                                                    }
                                                >
                                                    {loadingProducts[row.id] ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {suggestions[row.id]?.length > 0 ? (
                                                                saleSettings?.ProductLookUpModel === 'Table' ? (
                                                                    // ── Table mode (mirrors SalesInvoiceTable) ──────────────────
                                                                    <table className="w-full border-collapse text-xs">
                                                                        <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10">
                                                                            <tr>
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[28px]">#</th>
                                                                                <th className="px-2 w-[300px] py-1.5 text-left font-semibold border-b border-themed dark:border-themed">
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
                                                                                <th className="px-2 py-1.5 text-left font-semibold border-b border-themed dark:border-themed w-[160px]">
                                                                                    Stock
                                                                                </th>
                                                                                <th className="px-2 py-1.5 text-right font-semibold border-b border-themed dark:border-themed w-[80px]">
                                                                                    {t("purchaseInvoice.form.gridSection.columns.purchaseRate") || "Purchase Rate"}
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
                                                                                    <td className="px-2 py-1 font-medium text-primary dark:text-primary">
                                                                                        {product.productName}
                                                                                    </td>
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.productCode || '—'}</td>
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.barcode || '—'}</td>
                                                                                    {suggestions[row.id].some(p => p.partNo) && (
                                                                                        <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.partNo || '—'}</td>
                                                                                    )}
                                                                                    <td className="px-2 py-1 text-tertiary dark:text-tertiary">{product.unitName || '—'}</td>
                                                                                    <td className="px-2 py-1">
                                                                                        {Array.isArray(product.stock) && product.stock.length > 0 ? (
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                                {product.stock.map((s, i) => {
                                                                                                    const qty = parseFloat(s.currentStock) || 0;
                                                                                                    const label = s.name || 'Unassigned';
                                                                                                    const isNeg = qty < 0;
                                                                                                    return (
                                                                                                        <span
                                                                                                            key={i}
                                                                                                            style={{
                                                                                                                fontSize: '11px',
                                                                                                                padding: '2px 7px',
                                                                                                                borderRadius: '99px',
                                                                                                                background: isNeg ? '#FCEBEB' : '#EAF3DE',
                                                                                                                color: isNeg ? '#A32D2D' : '#3B6D11',
                                                                                                                fontWeight: 500,
                                                                                                                whiteSpace: 'nowrap',
                                                                                                                display: 'inline-block',
                                                                                                            }}
                                                                                                        >
                                                                                                            {label}: {qty}
                                                                                                        </span>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        ) : '—'}
                                                                                    </td>
                                                                                    <td className="px-2 py-1 text-right text-green-600 dark:text-green-400 font-medium">
                                                                                        {getDisplayPrice(product) > 0
                                                                                            ? getDisplayPrice(product).toFixed(generalSettings.decimalPart)
                                                                                            : '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    // ── List mode (mirrors SalesInvoiceTable) ───────────────────
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
                                                                            <div className="font-bold text-sm text-primary dark:text-primary">
                                                                                {product.productName}
                                                                            </div>
                                                                            <div className="text-xs text-tertiary dark:text-tertiary mt-0.5 flex gap-3 flex-wrap">
                                                                                {product.productCode && (
                                                                                    <span>
                                                                                        {t("salesInvoice.form.gridSection.prodDetailsLabels.productCode")}: {product.productCode}
                                                                                    </span>
                                                                                )}
                                                                                {product.barcode && (
                                                                                    <span>
                                                                                        {t("salesInvoice.form.gridSection.prodDetailsLabels.barcodeLabels")}: {product.barcode}
                                                                                    </span>
                                                                                )}
                                                                                {product.partNo && (
                                                                                    <span>
                                                                                        {t("salesInvoice.form.gridSection.prodDetailsLabels.partNo")}: {product.partNo}
                                                                                    </span>
                                                                                )}
                                                                                {product.unitName && (
                                                                                    <span>
                                                                                        {t("salesInvoice.form.gridSection.prodDetailsLabels.unit")}: {product.unitName}
                                                                                    </span>
                                                                                )}
                                                                                {getDisplayPrice(product) > 0 && (
                                                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                                                        {getDisplayPrice(product).toFixed(generalSettings.decimalPart)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {renderStockBadges(product)}
                                                                        </div>
                                                                    ))
                                                                )
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
                                                                onClick={() => {
                                                                    setSelectedProductCode(row.productDetails.productCode);
                                                                    setSelectedRowIdForEdit(row.id);
                                                                    setEditProductModalOpen(true);
                                                                }}
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
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-1 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        {purchaseSettings?.showFeeQtyColumn && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
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

                                                    const productWithUnit = allProducts.find(
                                                        (p) => p.productCode === row.productCode && (p.unitId || p.unitid) === selectedUnitId
                                                    );

                                                    if (productWithUnit) {
                                                        const selectedUnit = row.availableUnits?.find(
                                                            (u) => (u.unitId || u.unitid) === selectedUnitId
                                                        );

                                                        let updatedRow = {
                                                            ...row,
                                                            unit: selectedUnitId,
                                                            rate: parseFloat(productWithUnit.purchasePrice || 0),
                                                            SalesRate: parseFloat(productWithUnit.salesPrice || 0),
                                                            ConversionFactor: parseFloat(productWithUnit.conversionRate || 0),
                                                            productDetails: {
                                                                ...row.productDetails,
                                                                barcode: productWithUnit.barcode || row.productDetails.barcode,
                                                                UnitName: selectedUnit?.unitName || selectedUnit?.unitname || selectedUnit?.UnitName || productWithUnit.unitName || row.productDetails.UnitName,
                                                            },
                                                        };

                                                        updatedRow = calculateRow(updatedRow);

                                                        setRows((prev) =>
                                                            prev.map((r) => (r.id === row.id ? updatedRow : r))
                                                        );
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'unit')}
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            >
                                                {row.availableUnits?.map((unit) => (
                                                    <option key={unit.unitId || unit.unitid} value={unit.unitId || unit.unitid}>
                                                        {unit.unitName || unit.unitname || unit.UnitName}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        {purchaseSettings?.ChangeSalesPrice && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-SalesRate`] = el}
                                                    type="text"
                                                    onFocus={(e) => e.target.select()}
                                                    value={row.SalesRate}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;

                                                        handleInputChange(row.id, 'SalesRate', validValue === '' ? 0 : parseFloat(validValue));
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = parseFloat(e.target.value) || 0;
                                                        handleInputChange(row.id, 'SalesRate', value);
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'SalesRate')}
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                        )}
                                        <td className="p-0.2 border border-themed dark:border-themed">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-rate`] = el}
                                                type="text"
                                                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                                                value={row.rate}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    // allow only numbers and single decimal
                                                    if (/^\d*\.?\d*$/.test(value)) {
                                                        handleInputChange(row.id, 'rate', value);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const num = parseFloat(e.target.value) || 0;
                                                    handleInputChange(
                                                        row.id,
                                                        'rate',
                                                        num
                                                    );
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'rate')}
                                                disabled={!row.productCode || row.productCode.trim() === ''}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                            />
                                            {saleSettings?.showLineDiscount && (
                                                <span className="text-xs text-muted dark:text-muted text-right block">
                                                    Gross: {(row.qty * parseFloat(row.rate || 0)).toFixed(decimalPart)}
                                                </span>
                                            )}
                                        </td>
                                        {purchaseSettings?.showLineDiscount && (
                                            <>
                                                <td className="p-0 border border-themed dark:border-themed">
                                                    <input
                                                        ref={el => inputRefs.current[`${row.id}-desc`] = el}
                                                        type="number"
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
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>

                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <input
                                                        ref={el => inputRefs.current[`${row.id}-descAmt`] = el}
                                                        type="number"
                                                        value={row.descAmt}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^0-9.]/g, "");
                                                            let validValue = value.split(".").length > 2
                                                                ? value.slice(0, value.lastIndexOf("."))
                                                                : value;
                                                            let num = parseFloat(validValue) || 0;

                                                            const gross = row.qty * row.rate;
                                                            if (num > gross) num = gross;

                                                            handleInputChange(row.id, "descAmt", num, 'descAmt');
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, row.id, 'descAmt')}
                                                        disabled={!row.productCode || row.productCode.trim() === ''}
                                                        className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            </>
                                        )}
                                        {purchaseSettings?.showLineDiscount && (
                                            <td className="p-0.2 border border-themed">
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-grossAmount`] = el}
                                                    type="text"
                                                    value={row.grossAmount}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;

                                                        const numericValue = validValue === '' ? 0 : parseFloat(validValue);
                                                        handleInputChange(row.id, 'grossAmount', numericValue, 'grossAmount');
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = parseFloat(e.target.value) || 0;
                                                        handleInputChange(row.id, 'grossAmount', value, 'grossAmount');
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'grossAmount')}
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                        )}
                                        <td className="p-0.2 border border-themed">
                                            {purchaseSettings?.showLineDiscount ? (
                                                <div className="flex flex-col text-right">
                                                    <span className="text-sm font-medium text-primary">
                                                        {row.netValue.toFixed(decimalPart)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <input
                                                    ref={el => inputRefs.current[`${row.id}-netValue`] = el}
                                                    type="text"
                                                    value={Number(row.netValue || 0).toFixed(decimalPart)}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                                        const validValue = value.split('.').length > 2
                                                            ? value.slice(0, value.lastIndexOf('.'))
                                                            : value;

                                                        const numericValue = validValue === '' ? 0 : parseFloat(validValue);
                                                        handleInputChange(row.id, 'netValue', numericValue, 'netValue');
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = parseFloat(e.target.value) || 0;
                                                        handleInputChange(row.id, 'netValue', value, 'netValue');
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'netValue')}
                                                    disabled={!row.productCode || row.productCode.trim() === ''}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right  disabled:text-gray-500 disabled:cursor-not-allowed"
                                                />
                                            )}
                                        </td>

                                        {(generalSettings?.ActivateTax && formData?.taxType === 'Applicable to product') && (
                                            <>
                                                <td className="p-0.2 border border-themed dark:border-themed">
                                                    <select
                                                        ref={el => inputRefs.current[`${row.id}-tax`] = el}
                                                        value={row.taxId ? String(row.taxId) : ''}
                                                        onChange={(e) => {
                                                            const selectedTaxId = parseInt(e.target.value);
                                                            const selectedTax = taxData.find(t => t.taxId === selectedTaxId);

                                                            const updatedRows = rows.map(r => {
                                                                if (r.id === row.id) {
                                                                    return calculateRow({
                                                                        ...r,
                                                                        taxId: selectedTax?.taxId || null,
                                                                        tax: parseFloat(selectedTax?.rate || 0)
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
                                                        {taxData?.map((tax) => (
                                                            <option value={String(tax.taxId)} key={tax.taxId}>{tax.taxName || tax.rate}</option>
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
                                        {/* {inventorySettings?.maintainGodown && (
                                            <td className="p-0.2 border border-themed dark:border-themed">
                                                <select
                                                    ref={el => inputRefs.current[`${row.id}-GodownId`] = el}
                                                    value={Number(row.GodownId) || 1}
                                                    onChange={(e) => handleInputChange(row.id, 'GodownId', parseInt(e.target.value))}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'GodownId')}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                                >
                                                    {godowns?.map((godown) => (
                                                        <option key={godown.GodownId} value={Number(godown.GodownId) || 1}>
                                                            {godown.GodownName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        )} */}
                                        <td className="p-0.2 border border-themed">
                                            <span className="text-sm font-bold text-right block px-2 text-red-700 dark:text-red-400">
                                                {row.amount.toFixed(decimalPart)}
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
                handleClose={() => {
                    setEditProductModalOpen(false);
                    setSelectedRowIdForEdit(null);
                    if (focusedRowId) focusInput(focusedRowId, 'productName');
                }}
                productCode={selectedProductCode}
                initialDescription={
                    rows.find(r => r.id === selectedRowIdForEdit)
                        ?.productDetails?.productDescription || ''
                }
                onSuccess={(updatedDescription) => handleProductUpdate(selectedRowIdForEdit, updatedDescription)}
            />
            <PurchaseInvoiceFooterSection
                totals={totals}
                formData={formData}
                setFormData={setFormData}
                otherChargeLedgers={otherChargeLedgers}
                cash={cash}
                bank={bank}
                getCurrentProductCode={getCurrentProductCode}
            />
            <ProductFormModal
                open={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                productCode={null}
                viewMode={false}
                modalMode={true}
                onSuccess={() => {
                    setProductModalOpen(false);
                    dispatch(refreshProductsByType('purchase'))
                }}
            />
        </div>
    );
};

export default PurchaseInvoiceTable;

PurchaseInvoiceTable.propTypes = {
    godowns: PropTypes.arrayOf(
        PropTypes.shape({
            GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            GodownName: PropTypes.string,
        })
    ),

    formData: PropTypes.shape({
        employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        purchaseDetails: PropTypes.arrayOf(PropTypes.object),
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
            receiptDetails1Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            orderDetails1Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            PurchaseRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            qty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            freeQty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            unitId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            SalesRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
                    purchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    barcode: PropTypes.string,
                })
            ),
        })
    ),
};

PurchaseInvoiceTable.defaultProps = {
    editMode: false,
    rows: [],
    godowns: [],
};