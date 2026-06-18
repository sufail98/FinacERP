import React, { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useSelector } from 'react-redux';
import EditProuctDetailsModal from './EditProuctDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
import SalesInvoiceFooterSection from './SalesOrderFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const SalesOrderTable = ({ formData, setFormData, editMode, rows: propRows, setRows: propSetRows }) => {

    const { t } = useTranslation();
    const [taxData, setTaxData] = useState([])
    const [editProductModalOpen, setEditProductModalOpen] = useState(false);
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const { selectedBranchId, } = useAuth();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [suggestions, setSuggestions] = useState({});
    const [loadingProducts, setLoadingProducts] = useState({});
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionRef = useRef(null);
    const inputRefs = useRef({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});

    const [rows, setRows] = useState(() => {
        if (propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                orderDetails1Id: item.orderDetails1Id || '',
                quotationDetailsId: item.quotationDetailsId || '',
                proformaDetails1Id: item.proformaDetails1Id || '',
                deliveryNoteDetails1Id: item.deliveryNoteDetails1Id || '',
                productCode: item.productCode || '',
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                ConversionFactor: item.ConversionFactor || 0,

                unit: item.unitId || 2,
                salesRate: parseFloat(item.rate) || 0,
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
            return Array.from({ length: 4 }, (_, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: '',
                productCode: '',
                // ✅ FIX: Initialize detail IDs as empty strings
                orderDetails1Id: '',
                quotationDetailsId: '',
                proformaDetails1Id: '',
                deliveryNoteDetails1Id: '',
                purchaseRate: 0,
                ConversionFactor: 0,
                productNameArb: '',
                qty: 1,
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
        fetchTaxData()
        fetchAllProducts()
    }, []);

    const fetchAllProducts = async () => {
        try {
            setProductsLoading(true);
            const res = await axiosInstance.get("products-grid-fill");
            setAllProducts(res.data.data || []);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setProductsLoading(false);
        }
    };
    // Update rows when propRows changes (for edit mode)
    useEffect(() => {
        if (propRows && propRows.length > 0 && isInitialized) {
            const mappedRows = propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productCode: item.productCode || '',
                // ✅ FIX: Properly preserve all detail IDs
                orderDetails1Id: item.orderDetails1Id || '',
                quotationDetailsId: item.quotationDetailsId || '',
                proformaDetails1Id: item.proformaDetails1Id || '',
                deliveryNoteDetails1Id: item.deliveryNoteDetails1Id || '',
                purchaseRate: parseFloat(item.PurchaseRate) || 0,
                ConversionFactor: item.ConversionFactor || 0,
                taxRate: item.taxRate || 0,
                qty: parseFloat(item.qty) || 1,
                freeQty: parseFloat(item.freeQty) || 0,
                unit: item.unitId || 2,
                salesRate: parseFloat(item.rate) || 0,
                desc: parseFloat(item.discountPercentage) || 0,
                descAmt: 0,
                netValue: parseFloat(item.netAmount) || 0,
                tax: parseFloat(item.taxAmount) || 0,
                taxId: item.taxId || null,
                taxAmt: parseFloat(item.taxAmount) || 0,
                amount: parseFloat(item.amount) || 0,
                taxType: item.taxType || 'Excluded',
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
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
        // Handle suggestion navigation when dropdown is open
        if (currentField === 'productName' && activeSuggestionRow === rowId && suggestions[rowId]?.length > 0) {
            const currentIndex = selectedSuggestionIndex[rowId] ?? -1;
            const maxIndex = suggestions[rowId].length - 1;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: nextIndex }));
                    scrollSuggestionIntoView(rowId, nextIndex);
                    return;

                case 'ArrowUp':
                    e.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: prevIndex }));
                    scrollSuggestionIntoView(rowId, prevIndex);
                    return;

                case 'Enter':
                    e.preventDefault();
                    if (currentIndex >= 0 && currentIndex <= maxIndex) {
                        const selectedProduct = suggestions[rowId][currentIndex];
                        selectProduct(rowId, selectedProduct, selectedProduct.unitId);
                        setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 }));
                    }
                    return;

                case 'Escape':
                    e.preventDefault();
                    setActiveSuggestionRow(null);
                    setSuggestions({});
                    setSelectedSuggestionIndex(prev => ({ ...prev, [rowId]: -1 }));
                    return;

                default:
                    break;
            }
        }

        // Original navigation logic
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
        // Update all rows when employeeId or GodownId changes in formData
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

        const orderDetails = filledRows.map((row, index) => ({
            // ✅ FIX: Preserve detail IDs when saving
            deliveryNoteDetails1Id: row.deliveryNoteDetails1Id || "",
            orderDetails1Id: row.orderDetails1Id || "",
            quotationDetailsId: row.quotationDetailsId || "",
            proformaDetails1Id: row.proformaDetails1Id || "",
            SlNo: index + 1,
            productCode: row.productCode,
            qty: parseFloat(row.qty) || null,
            freeQty: null,
            rate: row.salesRate || null,
            unitId: row.unit || null,
            discountPercentage: row.desc || null,
            taxId: row.taxId || null,
            tax: row.tax || 0,
            taxRate: row.taxRate || 0,
            taxType: row.taxType || "Excluded",
            ConversionFactor: row.ConversionFactor || 0,
            productName: row.productName || '',
            productNameArb: row.productNameArb || '',
            barcode: row.productDetails.barcode || "",
            PurchaseRate: row.purchaseRate || null,
            taxAmount: row.taxAmt || null,
            grossAmount: row.netValue || null,
            netAmount: row.netValue || null,
            amount: row.amount || null,
            productDescription: row.productDetails.productDescription || "",
            billDiscOnProduct: null,
            AddCostonProduct: null,
            otherchargeonproduct: null,
            salesManId: formData.employeeId,
            GodownId: formData.GodownId,
            RackId: null,
            branchId: selectedBranchId
        }));

        // Calculate totals only from filled rows
        const taxableAmt = filledRows.reduce((sum, row) => sum + row.netValue, 0);
        const totalTax = filledRows.reduce((sum, row) => sum + row.taxAmt, 0);
        const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);
        const totalDiscount = filledRows.reduce((sum, row) => sum + row.descAmt, 0);

        setFormData(prev => ({
            ...prev,
            orderDetails,
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
            productName: '',
            productCode: '',

            orderDetails1Id: '',
            quotationDetailsId: '',
            proformaDetails1Id: '',
            deliveryNoteDetails1Id: '',
            purchaseRate: 0,
            qty: 1,
            ConversionFactor: 0,

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

        if (row.taxType === 'Included') {
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

            const searchLower = searchTerm.toLowerCase();
            const filteredProducts = allProducts.filter(product => {
                const productName = (product.productName || '').toLowerCase();
                const productCode = (product.productCode || '').toLowerCase();
                const barcode = (product.barcode || '').toLowerCase();
                const partNo = (product.partNo || '').toLowerCase();
                const unitName = (product.unitName || '').toLowerCase();
                const salesPrice = (product.salesPrice || '').toLowerCase();


                return productName.includes(searchLower) ||
                    productCode.includes(searchLower) ||
                    barcode.includes(searchLower) ||
                    partNo.includes(searchLower) ||
                    salesPrice.includes(searchLower) ||
                    unitName.includes(searchLower);
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

    const [selectingProduct, setSelectingProduct] = useState({});

    const selectProduct = async (rowId, product, selectedUnitId) => {
        try {
            // Set loading state for this specific row
            setSelectingProduct(prev => ({ ...prev, [rowId]: true }));

            const fetchSelectedProdResponse = await axiosInstance.get(
                `get-product-unit-sales-details-byId/${product.productCode}`
            );

            const productData = fetchSelectedProdResponse.data.data;

            const selectedUnit = productData.units.find(u => u.unitid === selectedUnitId) || productData.units[0];

            const updatedRows = rows.map((row) => {
                if (row.id === rowId) {
                    const updatedRow = {
                        ...row,
                        deliveryNoteDetails1Id: row.deliveryNoteDetails1Id,
                        orderDetails1Id: row.orderDetails1Id,
                        quotationDetailsId: row.quotationDetailsId,
                        proformaDetails1Id: row.proformaDetails1Id,
                        productName: productData.productname || '',
                        productCode: productData.productcode || '',
                        ConversionFactor: selectedUnit.conversionrate || 0,
                        availableUnits: productData.units || [],
                        unit: selectedUnit.unitid || row.unit,
                        salesRate: parseFloat(selectedUnit.salesprice || 0),
                        taxId: product?.taxId || 0,
                        tax: parseFloat(product?.rate || 0),
                        taxRate: parseFloat(product?.rate || 0),
                        taxType: product?.taxType,
                        purchaseRate: product.purchaseRate,
                        productNameArb: product.productNameArb,

                        productDetails: {
                            barcode: selectedUnit.barcode || '',
                            productCode: productData.productcode,
                            UnitName: selectedUnit.unitname || '',
                        },
                    };
                    return calculateRow(updatedRow);
                }
                return row;
            });

            setRows(updatedRows);
            setSuggestions((prev) => ({ ...prev, [rowId]: [] }));
            setActiveSuggestionRow(null);

        } catch (err) {
            console.error("Error fetching product details:", err);
            // Optional: Show error toast/notification here
        } finally {
            // Clear loading state for this row
            setSelectingProduct(prev => ({ ...prev, [rowId]: false }));
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
        const newRow = {
            id: rows.length + 1,
            sn: rows.length + 1,
            productName: '',
            productCode: '',
            orderDetails1Id: '',
            quotationDetailsId: '',
            proformaDetails1Id: '',
            deliveryNoteDetails1Id: '',
            purchaseRate: 0,
            qty: 1,
            freeQty: 0,
            unit: 2,
            salesRate: 0,
            desc: 0,
            descAmt: 0,
            netValue: 0,
            tax: 0,
            taxId: null,
            taxAmt: 0,
            taxRate: 0,
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
                    productName: '',
                    productCode: '',
                    // ✅ FIX: Initialize detail IDs as empty strings
                    orderDetails1Id: '',
                    quotationDetailsId: '',
                    proformaDetails1Id: '',
                    deliveryNoteDetails1Id: '',
                    purchaseRate: 0,
                    qty: 1,
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

        // const grandTotal = totalNetValue + totalTax;
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
            {productsLoading && (<div className='flex justify-end mt-[-4px] text-secondary dark:text-secondary'>{t("salesInvoice.form.gridSection.productLoadingMsg")}</div>)}
            <div>
                <div className="">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.SN")}</th>
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.ProdName")}</th>
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.qty")}</th>
                                {saleSettings.showFeeQtyColumn && (
                                    <th className="p-2 text-left text-xs font-semibold border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.freeQty")}</th>
                                )}
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.unit")}</th>
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.salesRate")}</th>
                                {saleSettings?.showLineDiscount && (
                                    <>
                                        <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.disc%")}</th>
                                        <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.discAmt")}</th>
                                    </>
                                )}
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.netValue")}</th>
                                {generalSettings?.ActivateTax && (
                                    <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.tax%")}</th>
                                )}
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.amount")}</th>
                                <th className="p-1 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.action")}</th>
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
                                    <td className="p-1 border border-themed dark:border-themed text-center w-8">
                                        <span className="text-sm font-medium text-primary dark:text-primary">{row.sn}</span>
                                    </td>
                                    <td className="p-1 border border-themed dark:border-themed w-110 relative">
                                        <div className="flex gap-2 justify-between items-center">
                                            <input
                                                ref={el => inputRefs.current[`${row.id}-productName`] = el}
                                                type="text"
                                                value={row.productName}
                                                onChange={(e) => handleInputChange(row.id, 'productName', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'productName')}
                                                className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
                                                placeholder={t("salesInvoice.form.gridSection.prodDetailsLabels.enterPrdNamePlaceHolder")}
                                                autoComplete="off"
                                                disabled={productsLoading}
                                            />
                                            <RefreshCcw
                                                onClick={fetchAllProducts}
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
                                                ) : suggestions[row.id]?.length > 0 ? (
                                                    suggestions[row.id].map((product, idx) => (
                                                        <div
                                                            key={idx}
                                                            data-suggestion-index={idx}
                                                            onClick={() => {
                                                                selectProduct(row.id, product, product.unitId);
                                                                setSelectedSuggestionIndex(prev => ({ ...prev, [row.id]: -1 }));
                                                            }}
                                                            className={`px-3 py-2 cursor-pointer border-b border-themed dark:border-themed last:border-b-0 relative ${selectedSuggestionIndex[row.id] === idx
                                                                ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-l-blue-600'
                                                                : 'hover:bg-hover dark:hover:bg-hover'
                                                                } ${selectingProduct[row.id] ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            {/* Loading overlay for the selected product */}
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
                                                                        {product.salesPrice}
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

                                        {row.productName && (row.productDetails.barcode || row.productDetails.partNo || row.productDetails.brand) && (
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
                                        )}
                                    </td>
                                    <td className="p-1 border border-themed dark:border-themed w-12">
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
                                            className="w-full px-1 py-1 text-sm border-0  text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                        />
                                    </td>
                                    {saleSettings.showFeeQtyColumn && (
                                        <td className="p-1 border border-themed dark:border-themed w-15">
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
                                    <td className="p-1 border border-themed dark:border-themed w-24">
                                        <select
                                            ref={el => inputRefs.current[`${row.id}-unit`] = el}
                                            value={row.unit}
                                            onChange={(e) => {
                                                const selectedUnitId = parseInt(e.target.value);
                                                const selectedUnit = row.availableUnits?.find(
                                                    (u) => u.unitid === selectedUnitId
                                                );

                                                let updatedRow = {
                                                    ...row,
                                                    unit: selectedUnitId,
                                                    salesRate: selectedUnit ? parseFloat(selectedUnit.salesprice) : row.salesRate,
                                                    productDetails: {
                                                        ...row.productDetails,
                                                        barcode: selectedUnit?.barcode || row.productDetails.barcode,
                                                        UnitName: selectedUnit?.unitname || row.productDetails.UnitName,
                                                    },
                                                };

                                                updatedRow = calculateRow(updatedRow);

                                                setRows((prev) =>
                                                    prev.map((r) => (r.id === row.id ? updatedRow : r))
                                                );
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'unit')}
                                            className="w-full px-2 py-1 text-sm border-0  text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                        >
                                            {row.availableUnits?.map((unit) => (
                                                <option key={unit.unitid} value={unit.unitid}>
                                                    {unit.unitname}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td className="p-1 border border-themed dark:border-themed w-24">
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

                                                handleInputChange(row.id, 'salesRate', parseFloat(validValue) || 0);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'salesRate')}
                                            className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                        />
                                        <span className="text-xs text-muted dark:text-muted text-right block">
                                            Gross: {(row.qty * row.salesRate).toFixed(generalSettings.decimalPart)}
                                        </span>
                                    </td>
                                    {saleSettings?.showLineDiscount && (
                                        <>
                                            <td className="p-0 border border-themed dark:border-themed w-14">
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
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                />
                                            </td>

                                            <td className="p-1 border border-themed dark:border-themed w-24">
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

                                                        const gross = row.qty * row.salesRate;
                                                        if (num > gross) num = gross;

                                                        handleInputChange(row.id, "descAmt", num, 'descAmt');
                                                    }}
                                                    onKeyDown={(e) => handleKeyDown(e, row.id, 'descAmt')}
                                                    className="w-full px-2 py-1 text-sm border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                                />
                                            </td>

                                        </>
                                    )}
                                    <td className="p-1 border border-themed w-24">
                                        <div className="flex flex-col text-right">
                                            <span className="text-sm font-medium text-primary dark:text-primary">
                                                {row.netValue.toFixed(generalSettings.decimalPart)}
                                            </span>
                                        </div>
                                    </td>

                                    {generalSettings?.ActivateTax && (
                                        <>
                                            <td className="p-1 border border-themed dark:border-themed w-20">
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
                                                        <option value={String(tax.taxId)} key={tax.taxId}>{tax.rate}</option>
                                                    ))}
                                                </select>

                                                <span className="text-xs font-medium text-right block text-muted dark:text-muted">
                                                    Amt:{row.taxAmt.toFixed(generalSettings.decimalPart)}
                                                </span>
                                            </td>

                                        </>
                                    )}
                                    <td className="p-1 border border-themed w-25">
                                        <span className="text-sm font-bold text-right block px-2 text-red-700 dark:text-red-400">
                                            {row.amount.toFixed(generalSettings.decimalPart)}
                                        </span>
                                    </td>

                                    <td className="w-1 border border-themed dark:border-themed text-center">
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
                                    </td>

                                </tr>
                            ))}

                        </tbody>
                    </table>
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

        </div>
    );
};

export default SalesOrderTable;