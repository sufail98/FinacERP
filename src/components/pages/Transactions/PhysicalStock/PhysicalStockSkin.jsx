import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, PackageCheck, Pencil, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
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

const PhysicalStockSkin = () => {
    const { physicalStockId } = useParams();
    const editMode = Boolean(physicalStockId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [godowns, setGodowns] = useState([])
    const [baseDataloading, setBaseDataloading] = useState(false)


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
        physicalDetails: []
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
                    voucherType: "Physical Stock",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;

                setVoucherId(data?.voucherdata?.voucherCode)
                setGodowns(data?.godowns)

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
                ? `update-physical-stock/${physicalStockId}`
                : 'save-physical-stock';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });
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
    }, [formData, generalSettings, editMode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleSave]);

    if (fetchLoading || baseDataloading) {
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

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
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