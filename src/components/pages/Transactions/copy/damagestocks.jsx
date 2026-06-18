import { useEffect, useState, useRef } from 'react';
import { EllipsisVertical, Plus, PlusIcon, RefreshCcw, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { useSelector } from 'react-redux';
import EditProuctDetailsModal from './EditProuctDetailsModal';
import useAuth from '@/redux/hook/auth/useAuth';
// import SalesInvoiceFooterSection from './SalesInvoiceFooterSection';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import DamageStockFooterSection from './DamageStockFooterSection';

const DamageStockTable = ({ formData, setFormData, editMode, rows: propRows, }) => {
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
    const [isInitialized] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState({});

    const [rows, setRows] = useState(() => {
        if (propRows && propRows.length > 0) {
            return propRows.map((item, index) => ({
                id: index + 1,
                sn: index + 1,
                productName: item.productName || '',
                productCode: item.productCode || '',
                purchaseRate: parseFloat(item.rate) || 0,
                qty: parseFloat(item.qty) || 1,
                unit: item.unitId || 2,
                salesRate: parseFloat(item.rate) || 0,
                ConversionFactor: item.ConversionFactor || 0,
                amount: parseFloat(item.amount) || 0,
                // Remove: taxType, taxId, tax, desc, descAmt, netValue, taxAmt
                salesManId: item.salesManId || formData.employeeId || null,
                GodownId: item.GodownId || formData.GodownId || null,
                currentQty: item.currentQty || null,
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
                purchaseRate: 0,
                qty: 1,
                unit: 2,
                salesRate: 0,
                ConversionFactor: 0,
                amount: 0,
                // Remove: taxType, taxId, tax, desc, descAmt, netValue, taxAmt
                salesManId: formData.employeeId || null,
                GodownId: formData.GodownId || null,
                currentQty: null,
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
            const res = await axiosInstance.get("products-grid-fill?type=inventory");
            setAllProducts(res.data.data || []);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setProductsLoading(false);
        }
    };

    useEffect(() => {
        if (propRows && propRows.length > 0 && isInitialized) {

            const mappedRows = propRows.map((item, index) => {
                const row = {
                    id: index + 1,
                    sn: index + 1,
                    productName: item.productName || '',
                    productCode: item.productCode || '',
                    ConversionFactor: item.ConversionFactor || 0,
                    purchaseRate: parseFloat(item.rate || item.purchaseRate) || 0,
                    qty: parseFloat(item.qty) || 1,
                    unit: item.unitId || 0,
                    currentQty: item.currentQty || null,
                    salesRate: parseFloat(item.rate || item.purchaseRate) || 0,
                    amount: parseFloat(item.amount) || 0,
                    // Remove: taxType, taxId, tax, desc, descAmt, netValue, taxAmt
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
                };
                return calculateRow(row);
            });
            setRows(mappedRows);

        }
    }, [propRows, editMode]);

    const getEditableColumns = () => {
        const columns = ['productName', 'qty'];

        columns.push('unit', 'purchaseRate');



        return columns;
    };

    const handleKeyDown = (e, rowId, currentField) => {
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

    const damageDetails = filledRows.map((row, index) => ({
        SlNo: index + 1,
        productCode: row.productCode,
        qty: row.qty || null,
        currentQty: null,
        rate: row.salesRate || null,
        unitId: row.unit || null,
        ConversionFactor: row.ConversionFactor || 0,
        barcode: row.productDetails.barcode || "",
        amount: row.amount || null,
        productDescription: row.productDetails.productDescription || "",
        GodownId: '',
        RackId: null,
    }));

    const totalAmount = filledRows.reduce((sum, row) => sum + row.amount, 0);

    setFormData(prev => ({
        ...prev,
        damageDetails,
        subTotal: totalAmount.toFixed(generalSettings.decimalPart),
        totalAmount: totalAmount.toFixed(generalSettings.decimalPart),
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
            purchaseRate: 0,
            ConversionFactor: 0,
            qty: 1,
            unit: 2,
            salesRate: 0,
            amount: 0,
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

    const calculateRow = (row) => {
        // Simple calculation: purchaseRate * qty
        const amount = (row.purchaseRate || 0) * (row.qty || 0);

        return {
            ...row,
            salesRate: row.purchaseRate,
            amount: parseFloat(amount.toFixed(generalSettings.decimalPart))
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
                    // taxId: product?.taxId || 0,
                    // tax: parseFloat(product?.rate || 0),
                    taxType: product?.taxType,
                    purchaseRate: product.purchaseRate,

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

 const handleInputChange = (id, field, value) => {
    const updatedRows = rows.map(row => {
        if (row.id === id) {
            let updatedRow = { ...row, [field]: value };

            if (field === 'productName') {
                filterProducts(value, id);
            }

            return calculateRow(updatedRow);
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
            purchaseRate: 0,
            qty: 1,
            freeQty: 0,
            unit: 2,
            salesRate: 0,
            amount: 0,
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
                    purchaseRate: 0,
                    qty: 1,

                    unit: 0,
                    salesRate: 0,
                    amount: 0,
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

                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("salesInvoice.form.gridSection.columns.unit")}</th>
                                <th className="p-2 text-left text-xs font-semibold  border border-themed dark:border-themed">{t("physicalStock.form.gridSection.columns.purchaseRate")}</th>
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
                                                className="w-full px-2 py-1 text-sm border-0  text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded placeholder:text-muted dark:placeholder:text-muted"
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
                                                    ConversionFactor: selectedUnit?.conversionrate,
                                                    // Keep the same purchase rate, don't change it
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
                                            ref={el => inputRefs.current[`${row.id}-purchaseRate`] = el}
                                            type="text"
                                            onFocus={(e) => e.target.select()}
                                            value={row.purchaseRate}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                const validValue = value.split('.').length > 2
                                                    ? value.slice(0, value.lastIndexOf('.'))
                                                    : value;

                                                const newPurchaseRate = parseFloat(validValue) || 0;

                                                // Update both purchaseRate and salesRate
                                                const updatedRows = rows.map(r => {
                                                    if (r.id === row.id) {
                                                        const updatedRow = {
                                                            ...r,
                                                            purchaseRate: newPurchaseRate,
                                                            salesRate: newPurchaseRate
                                                        };
                                                        return calculateRow(updatedRow);
                                                    }
                                                    return r;
                                                });

                                                setRows(updatedRows);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, row.id, 'purchaseRate')}
                                            className="w-full px-2 py-1 text-sm border-0  text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded text-right"
                                        />

                                    </td>




                                    <td className="p-1 border border-themed w-25 ">
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
            <DamageStockFooterSection
                formData={formData}
                setFormData={setFormData}
            />

        </div>
    );
};

export default DamageStockTable;


DamageStockTable.propTypes = {
    formData: PropTypes.shape({
        employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        GodownId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        physicalDetails: PropTypes.arrayOf(PropTypes.object),
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
                    unitid: PropTypes.number,
                    unitname: PropTypes.string,
                    salesprice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    barcode: PropTypes.string,
                })
            ),
        })
    ),

    setRows: PropTypes.func,
};

DamageStockTable.defaultProps = {
    editMode: false,
    rows: [],
    setRows: null,
};




