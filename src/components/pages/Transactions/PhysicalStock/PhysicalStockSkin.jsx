import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, PackageCheck, Pencil, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import TextInput from '@/components/elements/theme/TextInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import PhysicalStockTable from './PhysicalStockTable';
import { Checkbox } from '@/components/ui/checkbox';
import DateInput from '@/components/elements/theme/DateInput';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import { showToast } from '@/utils/toast';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import PrintDropdown from '@/components/common/PrintDropdown';
import printPhysicalStock, { savePhysicalStockAsPDF } from '../../../../utils/prints/physicalStockPrints/physicalStockPrintOne';

const PhysicalStockSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Physical Stock");

    const { physicalStockId } = useParams();
    const editMode = Boolean(physicalStockId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrency, selectedBranchDetails } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [godowns, setGodowns] = useState([])
    const [baseDataloading, setBaseDataloading] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false);
    // ===== HOLD INVOICE STATE =====
    const [heldStocks, setHeldStocks] = useState([]);
    const [showHeldStocks, setShowHeldStocks] = useState(false);
    const [restoredHeldStockId, setRestoredHeldStockId] = useState(null);
    const { inventoryProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products)




    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", {
                hour12: true,
                hour: "2-digit",
                minute: "2-digit",
            });
            setTime(formatted);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const [formData, setFormData] = useState({
        voucherType: "Physical Stock",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        RefNo: "",
        RefDate: null,
        narration: "",
        totalAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        GodownId: '',
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        physicalDetails: []
    });

    useEffect(() => {
        if (editMode) return;

        const today = new Date();
        setFormData(prev => {
            const prevDate = prev.date instanceof Date ? prev.date : new Date(prev.date);
            const hasValidDate = prevDate instanceof Date && !Number.isNaN(prevDate.getTime());

            if (!hasValidDate) {
                return { ...prev, date: today };
            }

            return prev;
        });
    }, [editMode]);

    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-inventory-data', {
                    voucherType: "Physical Stock",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier", "Customer&Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;

                setVoucherId(data?.voucherdata?.voucherCode)
                setGodowns(data?.godowns)
                setFormData((prev) => {
                    const defaultGodown = data?.godowns?.find(g => g.IsDefault);

                    return {
                        ...prev,
                        GodownId: defaultGodown
                            ? defaultGodown.GodownId
                            : data?.godowns?.[0]?.GodownId || 1,
                    };
                });
            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])
    const handleListNavigate = async () => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t('ConfirmCloseTitle'),
                text: t('ConfirmCloseText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClose'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        navigate("/transaction/physical-stock/list");
    };

    const clearForm = async (skipConfirmation = false) => {
        if (!skipConfirmation && generalSettings?.askConfirmationClear) {
            const result = await Swal.fire({
                title: t('ConfirmClearTitle'),
                text: t('ConfirmClearText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClear'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        setFormData({
            voucherType: "Physical Stock",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            RefNo: "",
            RefDate: null,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            narration: "",
            totalAmount: 0,
            branchId: selectedBranchId,
            CreatedUser: userId,
            GodownId: '',
            physicalDetails: []
        });
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getPhysicalStockById();
        }
    }, [editMode]);

    const buildStockDataForPrint = useCallback((voucherNumber, overrideData) => {
        const base = overrideData || formData;
        return {
            voucherNo: editMode ? existingVoucherNo : voucherNumber,
            date: base.date,
            narration: base.narration,
            stockDetails: (base.physicalDetails || []).map(item => {
                const matchedProduct = allProducts?.find(
                    p => String(p.productCode) === String(item.productCode)
                );
                return {
                    barcode: item.barcode || item.productDetails?.barcode || matchedProduct?.barcode || '',
                    productName: matchedProduct?.productName || item.productName || '',
                    currentStock: item.currentQty ?? 0,
                    qty: item.qty ?? 0,
                    rate: item.rate ?? 0,
                    amount: item.amount ?? ((item.qty || 0) * (item.rate || 0)),
                };
            }),
        };
    }, [formData, editMode, existingVoucherNo, allProducts]);


    const getPhysicalStockById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-physical-stock-byId/${physicalStockId}`);
            const data = response.data.data;

            setExistingVoucherNo(data.physicalStockNo)

            const salesDetailsWithProducts = await Promise.all(
                (data.physicalDetails || []).map(async (item) => {
                    let productName = '';
                    let availableUnits = [];
                    let productDetails = {
                        productCode: item.productCode || '',
                        barcode: item.barcode || '',
                        partNo: '',
                        brand: '',
                        mrp: '',
                        purchase: item.PurchaseRate || '',
                        productDescription: item.productDescription || '',
                        UnitName: ''
                    };

                    // ✅ Build availableUnits from salesPrices filtered to current branch, deduplicated by unitId
                    if (item.salesPrices && item.salesPrices.length > 0) {
                        const branchPrices = item.salesPrices.filter(
                            sp => String(sp.branchId) === String(selectedBranchId)  // ✅ coerce both to string
                        );

                        // Use branch-filtered prices if available, otherwise fall back to ALL salesPrices
                        const pricesToUse = branchPrices.length > 0 ? branchPrices : item.salesPrices;

                        const seen = new Set();
                        availableUnits = pricesToUse
                            .filter(sp => {
                                if (seen.has(sp.unitId)) return false;
                                seen.add(sp.unitId);
                                return true;
                            })
                            .map(sp => ({
                                unitId: sp.unitId,
                                unitid: sp.unitId,
                                unitName: sp.unit?.UnitName || '',
                                unitname: sp.unit?.UnitName || '',
                            }));
                    }

                    if (item.productCode) {
                        try {
                            const productResponse = await axiosInstance.get(
                                `get-product-unit-sales-details-byId/${item.productCode}`
                            );
                            const productData = productResponse.data.data;
                            productName = productData.productname || '';

                            // ✅ Use API units only as fallback if salesPrices gave us nothing
                            if (availableUnits.length === 0) {
                                availableUnits = productData.units || [];
                            }

                            // ✅ Ensure the stored unitId exists in availableUnits
                            const selectedUnit = availableUnits.find(
                                u => u.unitid === item.unitId || u.unitId === item.unitId
                            );

                            // ✅ If stored unit is not in availableUnits, fetch it separately
                            if (!selectedUnit && item.unitId) {
                                try {
                                    const unitResponse = await axiosInstance.get(`get-unit-byId/${item.unitId}`);
                                    const unitData = unitResponse.data.data;
                                    if (unitData) {
                                        availableUnits = [
                                            {
                                                unitId: item.unitId,
                                                unitid: item.unitId,
                                                unitName: unitData.UnitName || unitData.unitName || '',
                                                unitname: unitData.UnitName || unitData.unitName || '',
                                            },
                                            ...availableUnits,
                                        ];
                                    }
                                } catch (unitErr) {
                                    console.error(`Error fetching unit ${item.unitId}:`, unitErr);
                                }
                            }

                            const finalSelectedUnit = availableUnits.find(
                                u => u.unitid === item.unitId || u.unitId === item.unitId
                            );

                            productDetails = {
                                productCode: item.productCode,
                                barcode: finalSelectedUnit?.barcode || item.barcode || '',
                                partNo: productData.partNo || '',
                                brand: productData.brand || '',
                                mrp: productData.mrp || '',
                                purchase: item.PurchaseRate || '',
                                productDescription: item.productDescription || '',
                                UnitName: finalSelectedUnit?.unitname || finalSelectedUnit?.unitName || '',
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 1,
                        rate: parseFloat(item.rate) || 0,
                        purchaseRate: parseFloat(item.rate) || 0,
                        salesRate: parseFloat(item.rate) || 0,
                        unitId: item.unitId,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        AddCostonProduct: item.AddCostonProduct,
                        GodownId: item.GodownId || 1,
                        RackId: 1,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        currentQty: parseFloat(item.currentQty) || 0,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Physical Stock",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                currencyConversionId: data.currencyConversionId,
                RefNo: data.RefNo,
                RefDate: data.RefDate ? parseDateFromAPI(data.RefDate) : "",
                narration: data.narration,
                totalAmount: data.totalAmount,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                ModifiedUser: data.ModifiedUser,
                GodownId: salesDetailsWithProducts[0]?.GodownId || '',
                physicalDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };




    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const generatePhysicalStockId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Physical Stock&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
            );
            setVoucherId(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    };

    const validateFormData = () => {
        const errors = [];
        if (!formData.date) errors.push('Please select date');
        if (!formData.physicalDetails || formData.physicalDetails.length === 0) {
            errors.push('Please add at least one product entry');
        }

        const hasValidEntries = formData.physicalDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidEntries) errors.push('Please add valid product entries with quantity');
        return errors;
    };

    // ===== HOLD PHYSICAL STOCK LOGIC =====
    useEffect(() => {
        const savedHeldStocks = localStorage.getItem('heldPhysicalStocks');
        if (savedHeldStocks) {
            const allHeldStocks = JSON.parse(savedHeldStocks);
            const branchHeldStocks = allHeldStocks.filter(item => item.branchId === selectedBranchId);
            setHeldStocks(branchHeldStocks);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        const savedHeldStocks = localStorage.getItem('heldPhysicalStocks');
        const allHeldStocks = savedHeldStocks ? JSON.parse(savedHeldStocks) : [];
        const otherBranchStocks = allHeldStocks.filter(item => item.branchId !== selectedBranchId);
        const updatedAllStocks = [...otherBranchStocks, ...heldStocks];
        if (updatedAllStocks.length > 0) {
            localStorage.setItem('heldPhysicalStocks', JSON.stringify(updatedAllStocks));
        } else {
            localStorage.removeItem('heldPhysicalStocks');
        }
    }, [heldStocks, selectedBranchId]);

    const holdCurrentStock = useCallback(() => {
        const hasData = formData.physicalDetails.some(detail => detail.productCode && detail.qty > 0);
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldStock = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            voucherId: voucherId,
            refNo: formData.RefNo || '',
            itemCount: formData.physicalDetails.filter(d => d.productCode).length,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldStocks(prev => [...prev, heldStock]);
        showToast.success(`Physical stock held successfully. Total held: ${heldStocks.length + 1}`);
        clearForm(true);
    }, [formData, voucherId, heldStocks.length, selectedBranchId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                holdCurrentStock();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentStock]);

    const restoreHeldStock = (heldStock) => {
        const hasValidEntries = formData.physicalDetails.some(detail => detail.productCode && detail.qty > 0);
        if (hasValidEntries) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                voucherId: voucherId,
                refNo: formData.RefNo || '',
                itemCount: formData.physicalDetails.filter(d => d.productCode && d.qty > 0).length,
                branchId: selectedBranchId,
                formData: { ...formData }
            };
            setHeldStocks(prev => [...prev.filter(item => item.id !== heldStock.id), currentHeld]);
        } else {
            setHeldStocks(prev => prev.filter(item => item.id !== heldStock.id));
        }
        setFormData(heldStock.formData);
        setVoucherId(heldStock.voucherId);
        setResetTableKey(prev => prev + 1);
        setShowHeldStocks(false);
        setRestoredHeldStockId(heldStock.id);
        showToast.success("Physical stock restored successfully");
    };

    const deleteHeldStock = (id) => {
        setHeldStocks(prev => prev.filter(item => item.id !== id));
        showToast.success("Held physical stock deleted");
    };

    const HeldStocksPanel = () => {
        if (!showHeldStocks || heldStocks.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Held Physical Stocks ({heldStocks.length})</h3>
                    <button onClick={() => setShowHeldStocks(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldStocks.map((item) => (
                        <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">Voucher: {item.voucherId}</p>
                                    {item.refNo && <p className="text-sm text-gray-600 dark:text-gray-400">Ref No: {item.refNo}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.itemCount} items</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{new Date(item.timestamp).toLocaleString()}</p>
                            <div className="flex gap-2">
                                <button onClick={() => restoreHeldStock(item)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:main-bg text-sm font-medium transition-colors">Restore</button>
                                <button onClick={() => deleteHeldStock(item.id)} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleSave = useCallback(async () => {
        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n');
            setAlert({
                id: Date.now(),
                type: "error",
                message: errorMessage,
            });
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"),
                text: t("ConfirmUpdateText"),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }


        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                ...(editMode ? { ModifiedUser: userId } : {})
            };

            const api = editMode
                ? `update-physical-stock/${physicalStockId}`
                : 'save-physical-stock';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

                // ✅ Remove held record if this save originated from a restored held stock
                if (restoredHeldStockId) {
                    setHeldStocks(prev => prev.filter(item => item.id !== restoredHeldStockId));
                    setRestoredHeldStockId(null);
                }

                const savedVoucherNo = response?.data?.data?.voucherNo || response?.data?.data?.physicalStockNo || voucherId;
                const stockDataForPrint = buildStockDataForPrint(savedVoucherNo, response?.data?.data || formData);

                if (formData?.printAfterSave) {
                    printPhysicalStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
                } else {
                    const pdfResult = await Swal.fire({
                        title: t('Print as PDF?') || 'Print as PDF?',
                        text: t('Do you want to download this as a PDF?') || 'Do you want to download this as a PDF?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: t('Yes, Download PDF') || 'Yes, Download PDF',
                        cancelButtonText: t('No, Just Save') || 'No, Just Save',
                    });
                    if (pdfResult.isConfirmed) {
                        setTimeout(() => {
                            savePhysicalStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
                        }, 500);
                    }
                }

                if (saleSettings?.CloseAfterSave) {
                    navigate('/transaction/physical-stock/list');
                }
                generatePhysicalStockId();
                await clearForm(true);    // ✅ both modes, skip confirmation, awaited
            }
        } catch (error) {
            console.error('Error saving physical stock:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save physical stock',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, generalSettings, editMode, restoredHeldStockId]);

    const handleReprintToPrinter = useCallback(async () => {
        if (generalSettings?.askConfirmationPrint) {
            const result = await Swal.fire({
                title: t('ConfirmPrintTitle') || 'Confirm Print',
                text: t('ConfirmPrintText') || 'Are you sure you want to print this?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesPrint') || 'Yes, Print',
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setIsPrinting(true);
        try {
            const stockDataForPrint = buildStockDataForPrint(existingVoucherNo, formData);
            await printPhysicalStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error reprinting physical stock:', error);
            showToast.error('Failed to print');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildStockDataForPrint, existingVoucherNo, formData, selectedBranchDetails, time, currentCurrency]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const stockDataForPrint = buildStockDataForPrint(existingVoucherNo, formData);
            await savePhysicalStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error saving PDF for physical stock:', error);
            showToast.error('Failed to save PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildStockDataForPrint, existingVoucherNo, formData, selectedBranchDetails, time, currentCurrency]);

    const ctrlSPressed = useRef(false);

    useEffect(() => {
        if (editMode) return;

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();

                if (ctrlSPressed.current) return;

                ctrlSPressed.current = true;
                handleSave();
            }
        };

        const handleKeyUp = (e) => {
            if (e.key.toLowerCase() === "s") {
                ctrlSPressed.current = false;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleSave, editMode]);

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("physicalStock.breadcrumb.master"), url: "#" },
                        { title: t("physicalStock.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: PackageCheck,
                        title: editMode ? t("physicalStock.breadcrumb.editTitle") : t("physicalStock.breadcrumb.title")
                    }}
                    actions={[
                        {
                            label: t("listBtn"),
                            icon: Table,
                            type: "secondary",
                            onClick: handleListNavigate,
                        },

                    ]}
                />
                <Preloader />
            </div>
        );
    }
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

    };
    const handleDropdownChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <HeldStocksPanel />
            <BreadCrumb
                routes={[
                    { title: t("physicalStock.breadcrumb.master"), url: "#" },
                    { title: t("physicalStock.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: PackageCheck,
                    title: editMode ? t("physicalStock.breadcrumb.editTitle") : t("physicalStock.breadcrumb.title")
                }}
                actions={[
                    {
                        label: t("listBtn"),
                        icon: Table,
                        type: "secondary",
                        onClick: handleListNavigate,
                    },
                    !editMode && {
                        label: `Hold Stock${heldStocks.length > 0 ? ` (${heldStocks.length})` : ''}`,
                        icon: Archive,
                        type: "secondary",
                        title: "Hold the current physical stock entry (CTRL + H)",
                        onClick: holdCurrentStock,
                    },
                    heldStocks.length > 0 && !editMode && {
                        label: "Restore",
                        icon: ArchiveRestore,
                        type: "tertiary",
                        title: "View and restore held physical stock entries",
                        onClick: () => setShowHeldStocks(!showHeldStocks),
                    },
                    {
                        label: t("clearBtn"),
                        icon: Eraser,
                        type: "secondary",
                        onClick: () => clearForm(),  // ← clean call, no args
                    },
                    {
                        label: editMode ? t("updateBtn") : t("submitBtn"),
                        icon: editMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ].filter(Boolean)}
                customActions={
                    <div className="flex items-center gap-3">
                        {/* {!editMode && ( */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="printAfterSavePhysicalStock"
                                    checked={formData.printAfterSave || false}
                                    onCheckedChange={(value) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: value }))
                                    }
                                />
                                <label
                                    htmlFor="printAfterSavePhysicalStock"
                                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                >
                                    {t("Direct Print") || "Print After Save"}
                                </label>
                            </div>
                        {/* )} */}
                        {editMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                    </div>
                }
            />

            <div className='p-2 space-y-2 bg-primary dark:bg-primary'>
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border-b border-themed dark:border-themed pb-2">
                    <TextInput
                        label={t('physicalStock.form.label.voucherNo')}
                        value={editMode ? existingVoucherNo : voucherId}
                        readOnly={true}
                        className='font-bold text-red-600 dark:text-red-400'
                    />
                    <DateInput
                        timeText={time}
                        label={t('physicalStock.form.label.date')}
                        value={formData.date}
                        name='date'
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
                    />

                    <TextInput
                        name="RefNo"
                        label={t('physicalStock.form.label.RefNo')}
                        value={formData.RefNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, RefNo: e.target.value }))}
                        placeholder={t('physicalStock.form.placeholders.RefNo')}
                    />
                    <DateInput
                        label={t('physicalStock.form.label.refDate')}
                        value={formData.RefDate}
                        name='RefDate'
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
                        min={currentFinancialYear?.fromDate}
                        max={currentFinancialYear?.toDate}
                    />
                    {saleSettings?.ActiveGodown === true && (
                        <SearchableDropdown
                            name="GodownId"
                            label={t('salesInvoice.form.label.formHeaderSection.GodownId')}
                            options={godowns?.map((data) => ({
                                value: data.GodownId,
                                label: data.GodownName,
                            }))}
                            value={formData.GodownId}
                            onChange={(value) => handleDropdownChange('GodownId', value)}
                            placeholder={t('salesInvoice.form.placeholders.formHeaderSection.GodownId')}
                            searchPlaceholder={t('salesInvoice.form.placeholders.formHeaderSection.GodownId')}
                            clearable={true}
                            className="w-full"
                        />
                    )}

                </div>

                {/* Table Section */}
                <PhysicalStockTable
                    key={resetTableKey}
                    formData={formData}
                    setFormData={setFormData}
                    editMode={editMode}
                    rows={formData?.physicalDetails}
                    setRows={(updatedRows) => setFormData((prev) => ({ ...prev, physicalDetails: updatedRows }))}
                />
            </div>
        </div>
    );
};

export default PhysicalStockSkin;