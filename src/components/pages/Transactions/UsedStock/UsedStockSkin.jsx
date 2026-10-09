import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, PackageCheck, Pencil, SaveAll, SquarePen, Table } from 'lucide-react';
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
import DamageStockTable from './UsedStockTable';
import DateInput from '@/components/elements/theme/DateInput';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';

import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/utils/toast';
import PrintDropdown from '@/components/common/PrintDropdown';
import printUsedStock, { saveUsedStockAsPDF } from '../../../../utils/prints/usedStockPrints/usedStockPrintOne';

const UsedStockSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Used Stock");

    const { usedStockId } = useParams();
    const editMode = Boolean(usedStockId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrency, selectedBranchDetails } = useAuth();
    const [isPrinting, setIsPrinting] = useState(false);
    const { inventoryProducts: allProducts } = useSelector((state) => state.products);
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [baseDataloading, setBaseDataloading] = useState(false);
    const [godowns, setGodowns] = useState([])


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
        voucherType: "Used Stock",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        RefNo: "",
        RefDate: null,
        narration: "",
        totalAmount: 0,
        printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        usedStockDetails: []
    });
    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-inventory-data', {
                    voucherType: "Used Stock",
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
        navigate("/transaction/used-stock/list");
    };
    useEffect(() => {
        if (editMode) return;

        // If it's past midnight (12 AM), update the date to today
        setFormData(prev => {
            const prevDate = new Date(prev.date);
            const today = new Date();

            // Compare only date parts (ignore time)
            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();

            if (!isSameDate) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time]); // runs every second when time updates
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
        setFormData(prev => ({   // ✅ use prev to keep suffixPrefixId intact
            voucherType: "Used Stock",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            RefNo: "",
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            RefDate: null,
            suffixPrefixId: prev.suffixPrefixId, // ✅ preserve from generateUsedStockId
            narration: "",
            totalAmount: 0,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            usedStockDetails: []
        }));
        setResetTableKey(prev => prev + 1);
    };
    useEffect(() => {
        if (editMode) {
            getUsedStockById();
        }
    }, [editMode,]);

    const buildStockDataForPrint = useCallback((voucherNumber, overrideData) => {
        const base = overrideData || formData;
        return {
            voucherNo: editMode ? existingVoucherNo : voucherNumber,
            date: base.date,
            narration: base.narration,
            stockDetails: (base.usedStockDetails || []).map(item => {
                const matchedProduct = allProducts?.find(
                    p => String(p.productCode) === String(item.productCode)
                );
                return {
                    barcode: item.barcode || item.productDetails?.barcode || matchedProduct?.barcode || '',
                    productName: matchedProduct?.productName || item.productName || '',
                    qty: item.qty ?? 0,
                    rate: item.rate ?? 0,
                    amount: item.amount ?? ((item.qty || 0) * (item.rate || 0)),
                };
            }),
        };
    }, [formData, editMode, existingVoucherNo, allProducts]);


    const getUsedStockById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`used-stock/show-byId/${usedStockId}`);
            const data = response.data.data;

            setExistingVoucherNo(data.usedStockNo || data.voucherNo || '')

            const usedStockDetailsWithProducts = await Promise.all(
                (data.details || []).map(async (item) => {
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
                        UnitName: '',
                    };

                    // Fetch product details
                    if (item.productCode) {
                        try {
                            const productResponse = await axiosInstance.get(
                                `get-product-unit-sales-details-byId/${item.productCode}`
                            );
                            const productData = productResponse.data.data;
                            productName = productData.productname || '';
                            availableUnits = productData.units || [];

                            const selectedUnit = availableUnits.find(u => u.unitid === item.unitId);

                            productDetails = {
                                productCode: item.productCode,
                                barcode: selectedUnit?.barcode || item.barcode || '',
                                partNo: productData.partNo || '',
                                brand: productData.brand || '',
                                mrp: productData.mrp || '',
                                purchase: item.PurchaseRate || '',
                                productDescription: item.productDescription || '',
                                UnitName: selectedUnit?.unitname || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        qty: parseFloat(item.qty) || 0,
                        rate: parseFloat(item.rate) || 0,
                        unitId: item.unitId,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        baseUnitId: item.baseUnitId || item.baseUnitId || null,
                        netAmount: parseFloat(item.netAmount) || 0,
                        amount: parseFloat(item.amount) || 0,
                        productDescription: item.productDescription,
                        AddCostonProduct: item.AddCostonProduct,
                        GodownId: item.GodownId || 1,
                        RackId: item.RackId || 1,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );


            setFormData((prev) => ({
                ...prev,
                voucherType: "Used Stock",
                yearId: currentFinancialYear?.yearId,
                date: data.date ? new Date(data.date) : new Date(),
                currencyConversionId: data.currencyConversionId,
                RefNo: data.refNo,
                RefDate: data.refDate ? parseDateFromAPI(data.refDate) : "",
                narration: data.narration,
                totalAmount: data.totalAmount,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                usedStockDetails: usedStockDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };

    useEffect(() => {
        if (!editMode) generateUsedStockId();
    }, [editMode,]);

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const generateUsedStockId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Used Stock&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
            );
            setVoucherId(response.data.voucherCode);



            // ✅ Fix: store suffixPrefixId from table_pk
            setFormData(prev => ({
                ...prev,
                suffixPrefixId: response.data.table_pk
            }));

        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    };

    const validateFormData = () => {
        const errors = [];
        if (!formData.date) errors.push('Please select date');
        if (!formData.usedStockDetails || formData.usedStockDetails.length === 0) {
            errors.push('Please add at least one product entry');
        }


        const hasValidEntries = formData.usedStockDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidEntries) errors.push('Please add valid product entries with quantity');
        return errors;
    };

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
            await printUsedStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error reprinting used stock:', error);
            showToast.error('Failed to print');
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildStockDataForPrint, existingVoucherNo, formData, selectedBranchDetails, time, currentCurrency]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const stockDataForPrint = buildStockDataForPrint(existingVoucherNo, formData);
            await saveUsedStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error saving PDF for used stock:', error);
            showToast.error('Failed to save PDF');
        } finally {
            setIsPrinting(false);
        }
    }, [buildStockDataForPrint, existingVoucherNo, formData, selectedBranchDetails, time, currentCurrency]);

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
                date: formatDateWithTime(formData.date)
            };
            const api = editMode
                ? `used-stock/update/${usedStockId}`
                : 'used-stock/store';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

                const savedVoucherNo = response?.data?.data?.voucherNo || response?.data?.data?.usedStockNo || voucherId;
                const stockDataForPrint = buildStockDataForPrint(savedVoucherNo, response?.data?.data || formData);

                if (formData?.printAfterSave) {
                    printUsedStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
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
                            saveUsedStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
                        }, 500);
                    }
                }

                if (saleSettings?.CloseAfterSave) {
                    navigate('/transaction/used-stock/list');
                }
                await generateUsedStockId();
                await clearForm(true);
            }
        } catch (error) {
            console.error('Error saving Used Stock:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save Used Stock',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, generalSettings, editMode, buildStockDataForPrint, selectedBranchDetails, time, currentCurrency, voucherId]);

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

    if (fetchLoading || voucherNoGenarating || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("usedStock.breadcrumb.master"), url: "#" },
                        { title: t("usedStock.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: PackageCheck,
                        title: editMode ? t("usedStock.breadcrumb.editTitle") : t("usedStock.breadcrumb.title")
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
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("usedStock.breadcrumb.master"), url: "#" },
                    { title: t("usedStock.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: PackageCheck,
                    title: editMode ? t("usedStock.breadcrumb.editTitle") : t("usedStock.breadcrumb.title")
                }}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSaveUsedStock"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSaveUsedStock"
                                className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                            >
                                {t("Direct Print") || "Print After Save"}
                            </label>
                        </div>
                        {editMode && !fetchLoading && (
                            <PrintDropdown
                                onPrintToPrinter={handleReprintToPrinter}
                                onPrintToPdf={handleReprintToPdf}
                                loading={isPrinting}
                            />
                        )}
                    </div>
                }
                actions={[
                    {
                        label: t("listBtn"),
                        icon: Table,
                        type: "secondary",
                        onClick: handleListNavigate,
                    },
                    {
                        label: t("clearBtn"),
                        icon: Eraser,
                        type: "secondary",
                        onClick: () => clearForm(),   // ← clean call, no args
                    },
                    {
                        label: editMode ? t("updateBtn") : t("submitBtn"),
                        icon: editMode ? Pencil : SaveAll,
                        type: "primary",
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t("loadingText"),
                    },
                ]}
            />

            <div className='p-2 space-y-2 bg-primary dark:bg-primary'>
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border-b border-themed dark:border-themed pb-2">
                    <TextInput
                        label={t('damageStock.form.label.voucherNo')}
                        value={editMode ? existingVoucherNo : voucherId}
                        readOnly={true}
                        className='font-bold text-red-600 dark:text-red-400'
                    />



                    <DateInput
                        timeText={time}
                        label={t('damageStock.form.label.date')}
                        value={formData.date}
                        name='date'
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
                        min={currentFinancialYear?.fromDate}
                        max={currentFinancialYear?.toDate}
                    />




                    <TextInput
                        name="RefNo"
                        label={t('damageStock.form.label.RefNo')}
                        value={formData.RefNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, RefNo: e.target.value }))}
                        placeholder={t('damageStock.form.placeholders.RefNo')}
                    />

                    <div>

                        <DateInput
                            label={t('damageStock.form.label.refDate')}
                            value={formData.RefDate}
                            name='RefDate'
                            onChange={handleInputChange}
                            className="w-full"
                            format={generalSettings.dateformat}
                        />
                    </div>

                </div>

                {/* Table Section */}
                <DamageStockTable
                    key={resetTableKey}
                    formData={formData}
                    setFormData={setFormData}
                    editMode={editMode}
                    rows={formData?.usedStockDetails}
                    setRows={(updatedRows) => setFormData((prev) => ({ ...prev, usedStockDetails: updatedRows }))}
                />
            </div>
        </div>
    );
};

export default UsedStockSkin;