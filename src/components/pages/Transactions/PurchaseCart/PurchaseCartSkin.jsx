import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, ReceiptText, SquarePen, Table, Loader2, SaveAll, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';

import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';
import { purchaseCartPrintOne } from '@/utils/prints/purchaseCartPrints/purchaseCartPrintOne';
import usePrivileges from '@/lib/hooks/usePrivileges';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import { showToast } from '@/utils/toast';

const PurchasecartSkin = () => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Cart");

    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const { purchaseCartmasterId } = useParams();

    const [editData, setEditData] = useState(null);
    const editMode = Boolean(purchaseCartmasterId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
 
    const { userId, selectedBranchId, currentFinancialYear } = useAuth();
    const [time, setTime] = useState('');
    const { generalSettings, purchaseSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);



    // ── Fetch edit data by ID (no more relying on location.state) ──
    useEffect(() => {
        if (!purchaseCartmasterId) return;
        const controller = new AbortController();

        const fetchEditData = async () => {
            setFetchLoading(true);
            try {
                const res = await axiosInstance.get(`purchase-cart/show-byId/${purchaseCartmasterId}`, {
                    signal: controller.signal,
                });
                const raw = res?.data?.data || res?.data;

                const data = Array.isArray(raw) ? raw[0] : raw;
                setEditData(data);

            } catch (error) {
                if (error.name === 'CanceledError' || error.name === 'AbortError') return;
                console.error('Error fetching edit data', error);
                showToast.error(error.response?.data?.message || 'Failed to load purchase cart data');
            } finally {
                if (!controller.signal.aborted) setFetchLoading(false);
            }
        };
        fetchEditData();
        return () => controller.abort(); // ← cleanup on unmount/navigate away
    }, [purchaseCartmasterId]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit',
            });
            setTime(formatted);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const defaultDetail = {
        productCode: null,
        barcode: null,
        manualItemName: '',
        manualItemDescription: '',
        Qty: 0,
        expectedPrice: 0,
        Priority: '',
        status: 'Pending',
    };

    const [formData, setFormData] = useState({
        branchId: selectedBranchId,
        yearId: currentFinancialYear?.yearId,
        voucherType: 'Purchase Cart',
        PurchaseCartNo: '',
        date: new Date().toISOString().split('T')[0],
        Narration: '',
        CustomerName: '',
        CustomerPhone: '',
        Status: 'Pending',
        CreatedUser: userId || '',
        printAfterSave: true,
        printType: 'a4',
        details: [{ ...defaultDetail }],
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
        navigate("/transaction/purchase-cart/purchase-cart-list");
    };

    const clearForm = async (skipConfirmation = false) => {
        skipConfirmation = skipConfirmation === true;

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
            branchId: selectedBranchId,
            yearId: currentFinancialYear?.yearId,
            voucherType: 'Purchase Cart',
            PurchaseCartNo: '',
            date: '',
            Narration: '',
            CustomerName: '',
            CustomerPhone: '',
            Status: 'Pending',
            CreatedUser: userId || '',
            printAfterSave: true,
            printType: 'a4',
            details: [{ ...defaultDetail }],
        });
        setResetTableKey((prev) => prev + 1);
    };

    // ── Populate form when editData is loaded ──
    useEffect(() => {
        if (editMode && editData) {
            setExistingInvoiceNo(editData.voucherNo || '');
            setFormData((prev) => ({
                ...prev,
                branchId: editData.branchId || selectedBranchId,
                yearId: editData.yearId || currentFinancialYear?.yearId,
                voucherType: 'Purchase Cart',
                PurchaseCartNo: editData.PurchaseCartNo || '',
                date: editData.date ? parseDateFromAPI(editData.date) : '',
                Narration: editData.Narration || '',
                CustomerName: editData.CustomerName || '',
                CustomerPhone: editData.CustomerPhone || '',
                Status: editData.Status || 'Pending',
                CreatedUser: editData.CreatedUser || userId || '',
                details: (editData.details || []).map((item) => ({
                    PurchaseCartDetailsId: item.PurchaseCartDetailsId || '',
                    productCode: item.productCode || null,
                    barcode: item.barcode || null,
                    productName: item.productName || '',
                    manualItemName: item.manualItemName || '',
                    manualItemDescription: item.manualItemDescription || '',
                    Qty: parseFloat(item.Qty) || 0,
                    expectedPrice: parseFloat(item.expectedPrice) || 0,
                    Priority: item.Priority || '',
                    status: item.status || 'Pending',
                })),
            }));
        }
    }, [editData]);

    const [loading, setLoading] = useState({ customers: false });

    const [voucherNoGenerating, setVoucherNumberGenerating] = useState(false);

    useEffect(() => {
        if (!editMode) {
            generatePurchaseCartNo();
        }
    }, []);

    const generatePurchaseCartNo = async () => {
        setVoucherNumberGenerating(true);
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Purchase Cart&branchId=${selectedBranchId}&yearId=${Number(currentFinancialYear?.yearId)}`
            );
            setInvoiceId(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenerating(false);
        }
    };

    const validationRules = {
        date: { required: true, label: t('requiredFieldsError') },
    };

    const validateFormData = () => {
        const validationErrors = [];

        if (!formData.date) validationErrors.push('Please select a date');

        if (!formData.details || formData.details.length === 0) {
            validationErrors.push('Please add at least one item');
        }

        const hasValidItems = formData.details.some(
            (detail) =>
                (detail.productCode || (detail.manualItemName && detail.manualItemName.trim() !== '')) &&
                detail.Qty > 0
        );
        if (!hasValidItems) {
            validationErrors.push('Please add valid items with quantity');
        }

        return validationErrors;
    };

    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;
         if (formData.totalAmount <= 0) {
                    showToast.error(t("purchaseInvoice.form.messages.totalAmountError"));
                    return;
                }

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            showToast.error(validationErrors.join(', '));
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t('ConfirmUpdateTitle'), text: t('ConfirmUpdateText'),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesUpdate'), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'), text: t('ConfirmSaveText'),
                icon: 'question', showCancelButton: true,
                confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'), cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                CreatedUser: userId,
                ModifiedUser: editMode ? userId : null,
                details: (formData.details || []).map((detail) => ({
                    ...detail,
                    ModifiedUser: editMode ? userId : detail?.ModifiedUser ?? null,
                    CreatedUser: editMode ? detail?.CreatedUser ?? userId : userId,
                })),
            };
            const api = editMode
                ? `purchase-cart/update/${purchaseCartmasterId}`
                : 'purchase-cart/store';

            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                const cartNumber = response.data.data?.PurchaseCartNo || invoiceId;

                showToast.success(t('saveSuccess'));

                // Print after save if enabled
                if (formData.printAfterSave && !editMode) {
                    const cartDataForPrint = {
                        ...formData,
                        PurchaseCartNo: cartNumber,
                        voucherNo: cartNumber,
                    };

                    try {
                        await purchaseCartPrintOne(cartDataForPrint, { branchName: 'Company' });
                    } catch (printError) {
                        console.error('Error printing cart:', printError);
                    }
                }

                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/purchase-cart/purchase-cart-list');
                }
                if (!editMode) {
                    generatePurchaseCartNo();
                    clearForm(true);
                }
            }
        } catch (error) {
            console.error('Error saving purchase cart:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save Purchase Cart',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode]);

    // ===== PRINT FUNCTIONS =====
    const buildCartDataForPrint = useCallback((cartNumber) => {
        return {
            ...formData,
            PurchaseCartNo: cartNumber,
            voucherNo: cartNumber,
        };
    }, [formData]);

    const printToPrinterFn = useCallback((cartDataForPrint) => {
        if (formData.printType === 'a4') {
            purchaseCartPrintOne(cartDataForPrint, { branchName: 'Company' });
        }
    }, [formData.printType]);

    const handleReprintToPrinter = useCallback(() => {
        const cartDataForPrint = buildCartDataForPrint(existingInvoiceNo);
        printToPrinterFn(cartDataForPrint);
    }, [buildCartDataForPrint, existingInvoiceNo, printToPrinterFn]);

    const handleReprintToPdf = useCallback(() => {
        const cartDataForPrint = buildCartDataForPrint(existingInvoiceNo);
        printToPrinterFn(cartDataForPrint);
    }, [buildCartDataForPrint, existingInvoiceNo, printToPrinterFn]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const breadcrumbActions = [
        {
            label: t('listBtn'),
            icon: Table,
            type: 'secondary',
            onClick: handleListNavigate,
        },
        {
            label: t('clearBtn'),
            icon: Eraser,
            type: 'secondary',
            onClick: clearForm,
        },
        {
            label: editMode ? t('updateBtn') : t('submitBtn'),
            icon: isSaving
                ? Loader2
                : editMode
                    ? Pencil
                    : SaveAll,
            type: 'primary',
            onClick: handleSave,
            loading: isSaving,
            loadingText: t('loadingText'),
        },
    ];

    // Show preloader while generating voucher number (add mode)
    if (voucherNoGenerating||privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t('purchaseCart.breadcrumb.master'), url: '#' },
                        { title: t('purchaseCart.breadcrumb.title'), url: '#' },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: editMode
                            ? t('purchaseCart.breadcrumb.editTitle')
                            : t('purchaseCart.breadcrumb.title'),
                    }}
                    actions={breadcrumbActions}
                />
                <Preloader />
            </div>
        );
    }

    // Show preloader while fetching edit data
    if (fetchLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t('purchaseCart.breadcrumb.master'), url: '#' },
                        { title: t('purchaseCart.breadcrumb.title'), url: '#' },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: t('purchaseCart.breadcrumb.editTitle'),
                    }}
                    actions={breadcrumbActions}
                />
                <Preloader />
            </div>
        );
    }
    if (!hasAccess) return <NoAcessComponent message={message} />

    return (
        <div className="bg-primary dark:bg-primary">
          
            <BreadCrumb
                routes={[
                    { title: t('purchaseCart.breadcrumb.master'), url: '#' },
                    { title: t('purchaseCart.breadcrumb.title'), url: '#' },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode
                        ? t('purchaseCart.breadcrumb.editTitle')
                        : t('purchaseCart.breadcrumb.title'),
                }}
                actions={breadcrumbActions}
                customActions={
                    <div className="flex items-center gap-3">
                        {!editMode && (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="printAfterSavePurchaseCart"
                                    checked={formData.printAfterSave || false}
                                    onChange={(e) =>
                                        setFormData(prev => ({ ...prev, printAfterSave: e.target.checked }))
                                    }
                                    className="rounded"
                                />
                                <label
                                    htmlFor="printAfterSavePurchaseCart"
                                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
                                >
                                    Print After Save
                                </label>
                            </div>
                        )}
                        <select
                            name="printType"
                            id="printType"
                            className="border rounded px-2 py-1 text-sm bg-primary dark:bg-primary text-primary dark:text-primary border-themed dark:border-themed focus:outline-none"
                            value={formData.printType}
                            onChange={(e) => setFormData(prev => ({ ...prev, printType: e.target.value }))}
                        >
                            <option value="a4">A4</option>
                        </select>
                    </div>
                }
            />
            <FormSectionMain
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                loading={loading}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                customers={customers}
                rows={formData?.details}
                setRows={(updatedRows) =>
                    setFormData((prev) => ({ ...prev, details: updatedRows }))
                }
            />
        </div>
    );
};

export default PurchasecartSkin;
