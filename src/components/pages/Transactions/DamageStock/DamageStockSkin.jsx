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
import DamageStockTable from './DamageStockTable';
import { Checkbox } from '@/components/ui/checkbox';
import DateInput from '@/components/elements/theme/DateInput';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import PrintDropdown from '@/components/common/PrintDropdown';
import printDamageStock, { saveDamageStockAsPDF } from '../../../../utils/prints/damageStockPrints/damageStockPrintOne';

const DamageStockSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Damage Stock");
    const { inventoryProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products)

    const { damageStockId } = useParams();
    const editMode = Boolean(damageStockId);
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
        voucherType: "Damage Stock",
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
        damageDetails: []
    });
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
    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-inventory-data', {
                    voucherType: "Damage Stock",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier", "Customer&Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;

                setVoucherId(data?.voucherdata?.voucherCode)
                setGodowns(data?.godowns)

                const defaultGodown = data?.godowns?.find(g => g.IsDefault === true);
                const defaultGodownId = defaultGodown?.GodownId || 1;

                setFormData(prev => ({
                    ...prev,
                    GodownId: defaultGodownId
                }));

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
        navigate("/transaction/damage-stock/list");
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
            voucherType: "Damage Stock",
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
            printAfterSave: saleSettings?.printAfterSave !== undefined ? saleSettings.printAfterSave : true,
            damageDetails: []
        });
        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getDamageStockById();
        }
    }, [editMode]);

    const buildStockDataForPrint = useCallback((voucherNumber, overrideData) => {
        const base = overrideData || formData;
        return {
            voucherNo: editMode ? existingVoucherNo : voucherNumber,
            date: base.date,
            narration: base.narration,
           stockDetails: (base.damageDetails || []).map(item => {
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
    }, [formData, editMode, existingVoucherNo]);


    const getDamageStockById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-damage-stock-byId/${damageStockId}`);
            const data = response.data.data;

            setExistingVoucherNo(data.damageStockNo)

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxData = taxResponse.data.data || [];

            const salesDetailsWithProducts = await Promise.all(
                (data.damageDetails || []).map(async (item) => {
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

                    // Find tax rate from taxData
                    const taxInfo = taxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

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
                voucherType: "Damage Stock",
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
                GodownId: salesDetailsWithProducts[0]?.GodownId || '',
                damageDetails: salesDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };


    const handleDropdownChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const generateDamageStockId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Damage Stock&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
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
        if (!formData.damageDetails || formData.damageDetails.length === 0) {
            errors.push('Please add at least one product entry');
        }


        const hasValidEntries = formData.damageDetails.some(
            detail => detail.productCode && detail.qty > 0
        );
        if (!hasValidEntries) errors.push('Please add valid product entries with quantity');
        return errors;
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
                CreatesUser: userId,
                CreatedDate: new Date(),
                ModifiedUser: editMode ? userId : null,
                damageDetails: formData.damageDetails.map(detail => ({
                    ...detail,
                    CreatedUser: detail.CreatedUser || userId,
                    CreatedDate: detail.CreatedDate || new Date(),
                    ModifiedUser: editMode ? userId : detail.ModifiedUser,
                    ModifiedDate: editMode ? new Date() : detail.ModifiedDate,
                    GodownId: detail.GodownId || formData.GodownId || 1,
                })),
            };
            const api = editMode
                ? `update-damage-stock/${damageStockId}`
                : 'save-damage-stock';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });

                const savedVoucherNo = response?.data?.data?.voucherNo || response?.data?.data?.damageStockNo || voucherId;
                const stockDataForPrint = buildStockDataForPrint(savedVoucherNo, response?.data?.data || formData);

                if (formData?.printAfterSave) {
                    printDamageStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
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
                            saveDamageStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
                        }, 500);
                    }
                }

                if (saleSettings?.CloseAfterSave) {
                    navigate('/transaction/damage-stock/list');
                }
                generateDamageStockId();
                await clearForm(true);      // ✅ both modes, skip confirmation, awaited
            }
        } catch (error) {
            console.error('Error saving Damage stock:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save damage stock',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, generalSettings, editMode, buildStockDataForPrint, selectedBranchDetails, time, currentCurrency, voucherId]);

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
            await printDamageStock(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error reprinting damage stock:', error);
            Swal.fire({ icon: 'error', title: t('Error') || 'Error', text: 'Failed to print' });
        } finally {
            setIsPrinting(false);
        }
    }, [generalSettings, t, buildStockDataForPrint, existingVoucherNo, formData, selectedBranchDetails, time, currentCurrency]);

    const handleReprintToPdf = useCallback(async () => {
        setIsPrinting(true);
        try {
            const stockDataForPrint = buildStockDataForPrint(existingVoucherNo, formData);
            await saveDamageStockAsPDF(stockDataForPrint, selectedBranchDetails, time, currentCurrency);
        } catch (error) {
            console.error('Error saving PDF for damage stock:', error);
            Swal.fire({ icon: 'error', title: t('Error') || 'Error', text: 'Failed to save PDF' });
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
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (fetchLoading || baseDataloading || privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("damageStock.breadcrumb.master"), url: "#" },
                        { title: t("damageStock.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: PackageCheck,
                        title: editMode ? t("damageStock.breadcrumb.editTitle") : t("damageStock.breadcrumb.title")
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
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("damageStock.breadcrumb.master"), url: "#" },
                    { title: t("damageStock.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: PackageCheck,
                    title: editMode ? t("damageStock.breadcrumb.editTitle") : t("damageStock.breadcrumb.title")
                }}
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
                ]}
                customActions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="printAfterSaveDamageStock"
                                checked={formData.printAfterSave || false}
                                onCheckedChange={(value) =>
                                    setFormData(prev => ({ ...prev, printAfterSave: value }))
                                }
                            />
                            <label
                                htmlFor="printAfterSaveDamageStock"
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

                    <DateInput
                        label={t('damageStock.form.label.refDate')}
                        value={formData.RefDate}
                        name='RefDate'
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
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
                <DamageStockTable
                    key={resetTableKey}
                    formData={formData}
                    setFormData={setFormData}
                    editMode={editMode}
                    rows={formData?.damageDetails}
                    setRows={(updatedRows) => setFormData((prev) => ({ ...prev, damageDetails: updatedRows }))}
                />
            </div>
        </div>
    );
};

export default DamageStockSkin;