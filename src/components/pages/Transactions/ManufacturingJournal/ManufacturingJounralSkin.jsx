import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, PackageCheck, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import TextInput from '@/components/elements/theme/TextInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import DateInput from '@/components/elements/theme/DateInput';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import ManufacturingJournalTable from './ManufacturingJournalTable';
import PopupPreloader from '@/components/common/PopupPreloader';
import { showToast } from '@/utils/toast';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';

const ManufacturingJournalSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Manufacturing Journal");

    const { journalId } = useParams();
    const editMode = Boolean(journalId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrency } = useAuth();
    const [time, setTime] = useState('');
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [godowns, setGodowns] = useState([]);
    const [baseDataLoading, setBaseDataLoading] = useState(false);
    const location = useLocation();
    const { state } = location;
    const productCodeFromOrderSummeryPage = state?.productCode || null
    const orderDetails = state?.orderDetails || null          // array of items
    const orderMasterId = state?.orderMasterId || null
    const fromOrderSummeryPage = state?.fromOrderSummary || false;

    // BOM
    const [bomProducts, setBomProducts] = useState([]);
    const [selectedBomProduct, setSelectedBomProduct] = useState(null);

    // Products and Units for mapping in edit mode
    const { inventoryProducts: allProducts, loading: productsLoading } = useSelector((state) => state.products)

    const [allUnits, setAllUnits] = useState([]);

    // ── Auto-load from Order Summary ──────────────────────────────────────────
    useEffect(() => {
        if (!fromOrderSummeryPage || !orderDetails || orderDetails.length === 0) return;
        // Wait until base data is done loading (so godown etc. is set),
        // but we do NOT need bomProducts to match — we load directly from orderDetails
        if (baseDataLoading) return;



        const newDetails = orderDetails.map((item, idx) => {
            // Try to find a BOM match — if exists, use its bomDetails as pre-filled materials
            const bom = bomProducts.find(
                (p) => String(p.productCode) === String(item.productCode)
            );

            return {
                SlNo: idx + 1,
                productCode: String(item.productCode || ''),
                barcodeInput: item.barcode || '',
                rawMaterialName: item.productname || item.productName || '',
                unitId: item.unitId || item.units?.[0]?.unitid || null,
                unitName: item.UnitName || item.units?.[0]?.unitname || '',
                availableUnits: (item.units || []).map(u => ({
                    unitId: u.unitid,
                    unitName: u.unitname,
                    conversionRate: u.conversionrate ?? 1,
                    unitConversionId: u.unitconversionid,
                })),
                conversionRate: item.ConversionFactor ?? 1,
                baseUnitId: null,
                qty: parseFloat(item.qty) || 1,
                rate: 0,
                amount: 0,
                godownId: '',
                rackId: 1,
                category: item?.category,
                // Pre-fill materials from BOM if available, otherwise empty
                materials: bom
                    ? (bom.bomDetails || []).map((bd) => ({
                        productCode: bd.rowMaterialId,
                        quantity: parseFloat(bd.quantity) || 0,
                        unitId: bd.unitId,
                        unitName: bd.unitName || '',
                        conversionRate: bd.conversionRate ?? 1,
                        baseUnitId: bd.baseUnitId ?? null,
                        rate: 0,
                        amount: 0,
                        godownId: '',
                        rackId: 1,
                    }))
                    : [],
            };
        });

        if (newDetails.length === 0) return;

        // Set banner only if single product and it has a BOM match
        if (newDetails.length === 1) {
            const bom = bomProducts.find(
                (p) => String(p.productCode) === String(newDetails[0].productCode)
            );
            setSelectedBomProduct(bom || null);
        } else {
            setSelectedBomProduct(null);
        }

        setFormData((prev) => ({
            ...prev,
            productCode: newDetails[0].productCode,
            unitId: newDetails[0].unitId,
            quantity: newDetails[0].qty,
            details: newDetails,
        }));
        setResetTableKey((k) => k + 1);
    }, [fromOrderSummeryPage, orderDetails, bomProducts, baseDataLoading]);

    // ── Clock ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Default form state ─────────────────────────────────────────────────────
    const buildDefaultForm = () => ({
        voucherType: 'ManuFacturing Journal',
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        RefNo: '',
        RefDate: null,
        narration: '',
        totalAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? 'No' : 'Yes',
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        GodownId: '',
        productCode: '',
        quantity: 1,
        category: null,
        unitId: null,
        details: [],
    });

    const [formData, setFormData] = useState(buildDefaultForm);

    // ── Auto-update date at midnight ───────────────────────────────────────────
    useEffect(() => {
        if (editMode) return;
        setFormData((prev) => {
            const prevDate = new Date(prev.date);
            const today = new Date();
            const isSame =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();
            return isSame ? prev : { ...prev, date: today };
        });
    }, [time, editMode]);

    // ── Init: fetch godowns + BOM products + all products + units ──────────────
    useEffect(() => {
        const init = async () => {
            setBaseDataLoading(true);
            try {
                const [inventoryRes, bomRes, unitsRes] = await Promise.all([
                    axiosInstance.post('all-inventory-data', {
                        voucherType: 'ManuFacturing Journal',
                        branchId: selectedBranchId,
                        yearId: currentFinancialYear.yearId,
                        ledgerTypes: ['Supplier'],
                        currencyId: currentCurrency?.currencyId,
                    }),
                    axiosInstance.get('products/bom'),
                    // axiosInstance.get(`products-grid-fill?branchId=${selectedBranchId}`),
                    axiosInstance.get('units'),
                ]);

                setVoucherId(inventoryRes?.data?.data?.voucherdata?.voucherCode || '');
                setGodowns(inventoryRes?.data?.data?.godowns || []);

                setFormData((prev) => {
                    const defaultGodown = inventoryRes?.data?.data?.godowns?.find(g => g.IsDefault);

                    return {
                        ...prev,
                        GodownId: defaultGodown
                            ? defaultGodown.GodownId
                            : inventoryRes?.data?.data?.godowns?.[0]?.GodownId || '',
                    };
                });
                setBomProducts(bomRes?.data?.data || []);
                // setAllProducts(productsRes?.data?.data || []);
                setAllUnits(unitsRes?.data?.data || []);
            } catch (err) {
                console.error('Init error', err);
            } finally {
                setBaseDataLoading(false);
            }
        };
        init();
    }, [selectedBranchId, currentFinancialYear?.yearId, currentCurrency?.currencyId]);

    // ── Load edit record ───────────────────────────────────────────────────────
    useEffect(() => {
        if (editMode && allProducts.length > 0 && allUnits.length > 0 && bomProducts.length > 0) {
            getJournalById();
        }
    }, [editMode, allProducts, allUnits, bomProducts]);

    // ManufacturingJournalSkin.jsx — getJournalById fix

    const getJournalById = async () => {
        setFetchLoading(true);
        try {
            const res = await axiosInstance.get(`manufacturing-journal-by-id/${journalId}`);
            const { master, details } = res.data.data;

            setExistingVoucherNo(master.voucherNo || '');

            const mappedDetails = details.map((item, idx) => {
                const product = allProducts.find(p => String(p.productCode) === String(item.productCode));
                const unit = allUnits.find(u => u.unitId === item.unitId);

                const mappedMaterials = (item.materials || []).map((m) => {
                    const matUnit = allUnits.find(u => u.unitId === m.unitId); // ✅ define matUnit here

                    return {
                        productCode: String(m.productCode),
                        quantity: parseFloat(m.quantity) || 0,
                        unitId: m.unitId,
                        unitName: matUnit?.UnitName || matUnit?.unitName || 'N/A',
                        availableUnits: [],
                        conversionRate: m.conversionRate ?? 1,
                        baseUnitId: m.baseUnitId ?? null,
                        rate: parseFloat(m.rate) || 0,
                        amount: parseFloat(m.amount) || 0,
                        godownId: m.godownId || '',
                        rackId: m.rackId || 1,
                        category: m.category || null
                    };
                });

                return {
                    SlNo: idx + 1,
                    productCode: String(item.productCode),
                    rawMaterialName: item.narration || product?.productName || 'N/A',
                    unitId: item.unitId,
                    unitName: unit?.UnitName || unit?.unitName || 'N/A',
                    conversionRate: item.conversionRate ?? 1,
                    baseUnitId: item.baseUnitId ?? null,
                    qty: parseFloat(item.quantity) || 0,
                    rate: 0,
                    amount: mappedMaterials.reduce((s, m) => s + m.amount, 0),
                    godownId: '',
                    rackId: 1,
                    category: item?.category,
                    materials: mappedMaterials,
                };
            });

            if (mappedDetails.length > 0) {
                const firstCode = mappedDetails[0].productCode;
                const matchedBom = bomProducts.find(p => String(p.productCode) === firstCode);
                setSelectedBomProduct(matchedBom || null);
            }

            setFormData((prev) => ({
                ...prev,
                date: parseDateFromAPI(master.date),
                RefNo: master.RefNo || '',
                RefDate: master.RefDate ? parseDateFromAPI(master.RefDate) : null,
                narration: master.narration || '',
                totalAmount: mappedDetails.reduce((s, d) =>
                    s + (d.materials?.reduce((ms, m) => ms + m.amount, 0) || d.amount || 0), 0
                ),
                postedStatus: master.postedStatus,
                postedBy: master.postedBy,
                postedDate: master.postedDate ? parseDateFromAPI(master.postedDate) : null,
                branchId: master.branchId,
                CreatedUser: master.CreatedUser,
                GodownId: master.godownId || '',
                productCode: mappedDetails[0]?.productCode || '',
                quantity: mappedDetails[0]?.qty || 0,
                unitId: mappedDetails[0]?.unitId || null,
                details: mappedDetails,
            }));

            setResetTableKey((k) => k + 1);
        } catch (err) {
            console.error('Error fetching journal', err);
            showToast.error(err.response?.data?.message || 'Error loading journal data');
        } finally {
            setFetchLoading(false);
        }
    };


    // ── Navigation ─────────────────────────────────────────────────────────────
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
        navigate('/transaction/manufacturing-journal/list');
    };

    // ── Clear ──────────────────────────────────────────────────────────────────
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
        setSelectedBomProduct(null);
        setFormData(buildDefaultForm());
        setResetTableKey((k) => k + 1);
    };

    const generateVoucherNo = async () => {
        try {
            const res = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=ManuFacturing Journal&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`
            );
            setVoucherId(res.data.voucherCode);
        } catch (err) {
            console.error(err);
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validateFormData = () => {
        const errors = [];
        if (!formData.date) errors.push(t('manufacturingJournal.validation.dateRequired'));
        // if (!formData.productCode) errors.push('Please select a BOM product.');
        if (!formData.quantity || Number(formData.quantity) <= 0)
            errors.push('Output quantity must be greater than 0.');
        if (!formData.details || formData.details.length === 0)
            errors.push(t('manufacturingJournal.validation.productRequired'));
        return errors;
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        const errors = validateFormData();
        if (errors.length > 0) {
            showToast.error(errors.join('\n'));
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const r = await Swal.fire({
                title: t('ConfirmUpdateTitle'),
                text: t('ConfirmUpdateText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesUpdate'),
                cancelButtonText: t('Cancel'),
            });
            if (!r.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const r = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel'),
            });
            if (!r.isConfirmed) return;
        }

        setIsSaving(true);
        try {
            const payload = {
                branchId: formData.branchId,
                voucherType: formData.voucherType,
                yearId: formData.yearId,
                CreatedUser: formData.CreatedUser,
                date: formatDateWithTime(formData.date),
                narration: formData.narration,
                godownId: formData.GodownId || null,
                details: formData.details.map((d) => ({
                    productCode: d.productCode,
                    quantity: d.quantity,
                    unitId: d.unitId,
                    conversionRate: d.conversionRate ?? 1,
                    baseUnitId: d.baseUnitId ?? null,   // ← ADD
                    narration: d.narration,
                    category: d.category ?? null,
                    ModifiedUser: editMode ? userId : null,
                    ModifiedDate: editMode ? formatDateWithTime(new Date()) : null,
                    materials: (d.materials || []).map((m) => ({
                        productCode: m.productCode,
                        quantity: m.quantity,
                        unitId: m.unitId,
                        conversionRate: m.conversionRate ?? 1,
                        baseUnitId: m.baseUnitId ?? null,   // ← ADD
                        rate: m.rate,
                        amount: m.amount,
                        category: m.category || null,
                        godownId: m.godownId || formData.GodownId || null,
                        rackId: m.rackId || 1,
                    })),
                })),
            };

            const api = editMode ? `update-manufacturing-journal/${journalId}` : 'save-manufacturing-journal';
            const response = await axiosInstance.post(api, payload);

            if (!response.data.error) {
                if (orderMasterId) {
                    axiosInstance.post('sales-orders-status-change', { orderMasterId: orderMasterId, status: "Production Completed" })
                }
                showToast.success(response.data.message || t('SaveSuccess') || 'Saved successfully');
                if (saleSettings?.CloseAfterSave) navigate('/transaction/manufacturing-journal/list');
                else {
                    generateVoucherNo();
                    await clearForm(true);
                }
            }
        } catch (err) {
            showToast.error(err.response?.data?.message || t('SaveError') || 'Error saving journal');
        } finally {
            setIsSaving(false);
        }
    }, [formData, generalSettings, editMode, journalId, t, saleSettings, navigate]);

    // Ctrl+S
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleSave]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDropdownChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    if (fetchLoading || baseDataLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t('manufacturingJournal.breadcrumb.master'), url: '#' },
                        { title: t('manufacturingJournal.breadcrumb.title'), url: '#' },
                    ]}
                    heading={{
                        icon: PackageCheck,
                        title: editMode
                            ? t('manufacturingJournal.breadcrumb.editTitle')
                            : t('manufacturingJournal.breadcrumb.title'),
                    }}
                    actions={[{ label: t('listBtn'), icon: Table, type: 'secondary', onClick: handleListNavigate }]}
                />
                <Preloader />
            </div>
        );
    }
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <PopupPreloader
                isOpen={isSaving}
                state="loading"
                title={t("loadingText")}
                subtitle={t("loadingDesc")}
            />
            <BreadCrumb
                routes={[
                    { title: t('manufacturingJournal.breadcrumb.master'), url: '#' },
                    { title: t('manufacturingJournal.breadcrumb.title'), url: '#' },
                ]}
                heading={{
                    icon: PackageCheck,
                    title: editMode
                        ? t('manufacturingJournal.breadcrumb.editTitle')
                        : t('manufacturingJournal.breadcrumb.title'),
                }}
                actions={[
                    { label: t('listBtn'), icon: Table, type: 'secondary', onClick: handleListNavigate },
                    { label: t('clearBtn'), icon: Eraser, type: 'secondary', onClick: () => clearForm() },
                    {
                        label: editMode ? t('updateBtn') : t('submitBtn'),
                        icon: editMode ? SquarePen : SaveAll,
                        type: 'primary',
                        onClick: handleSave,
                        loading: isSaving,
                        loadingText: t('loadingText'),
                    },
                ]}
            />

            <div className="p-2 space-y-2 bg-primary dark:bg-primary">
                {/* ── Header fields ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border-b border-themed dark:border-themed pb-2">
                    <TextInput
                        label={t('manufacturingJournal.form.label.voucherNo')}
                        value={editMode ? existingVoucherNo : voucherId}
                        readOnly
                        className="font-bold text-red-600 dark:text-red-400"
                    />

                    <DateInput
                        timeText={time}
                        label={t('manufacturingJournal.form.label.date')}
                        value={formData.date}
                        name="date"
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
                        min={currentFinancialYear?.fromDate}
                        max={currentFinancialYear?.toDate}
                    />

                    <TextInput
                        name="RefNo"
                        label={t('manufacturingJournal.form.label.RefNo')}
                        value={formData.RefNo}
                        onChange={(e) => setFormData((prev) => ({ ...prev, RefNo: e.target.value }))}
                        placeholder={t('manufacturingJournal.form.placeholders.RefNo')}
                    />

                    <DateInput
                        label={t('manufacturingJournal.form.label.refDate')}
                        value={formData.RefDate}
                        name="RefDate"
                        onChange={handleInputChange}
                        className="w-full"
                        format={generalSettings.dateformat}
                    />



                    {saleSettings?.ActiveGodown && (
                        <SearchableDropdown
                            name="GodownId"
                            label={t('manufacturingJournal.form.label.formHeaderSection.GodownId')}
                            options={godowns.map((d) => ({ value: d.GodownId, label: d.GodownName }))}
                            value={formData.GodownId}
                            onChange={(value) => handleDropdownChange('GodownId', value)}
                            placeholder={t('manufacturingJournal.form.placeholders.formHeaderSection.GodownId')}
                            searchPlaceholder={t('manufacturingJournal.form.placeholders.formHeaderSection.GodownId')}
                            clearable
                            className="w-full"
                        />
                    )}
                </div>

                {selectedBomProduct && (
                    <div className="flex flex-wrap items-center gap-4 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
                        <span className="font-semibold text-blue-800 dark:text-blue-200">
                            {selectedBomProduct.productName}
                        </span>
                        {selectedBomProduct.purchaseRate != null && (
                            <span className="text-muted dark:text-muted">
                                Purchase Rate:{' '}
                                <strong>
                                    {Number(selectedBomProduct.purchaseRate).toFixed(generalSettings.decimalPart)}
                                </strong>
                            </span>
                        )}
                        <span className="text-muted dark:text-muted">
                            Raw Materials: <strong>{selectedBomProduct.bomDetails?.length || 0}</strong>
                        </span>
                    </div>
                )}

                <ManufacturingJournalTable
                    key={resetTableKey}
                    formData={formData}
                    setFormData={setFormData}
                    editMode={editMode}
                    rows={formData.details}
                    generalSettings={generalSettings}
                    bomProducts={bomProducts}
                    baseDataLoading={baseDataLoading}
                />
            </div>
        </div>
    );
};

export default ManufacturingJournalSkin;