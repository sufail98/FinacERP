import BreadCrumb from '@/components/common/BreadCrumb'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Banknote, Eraser, SaveAll, Table } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import ReciptVoucherFormHeader from './ReciptVoucherFormHeader'
import useAuth from '@/redux/hook/auth/useAuth'
import { useSelector } from 'react-redux'
import RecieptVoucherFormTable from './RecieptVoucherFormTable'
import RecieptVoucherFormFooter from './RecieptVoucherFormFooter'
import axiosInstance from '@/lib/axiosConfig'
import AlertBox from '@/components/common/AlertBox'
import Preloader from '@/components/common/Preloader'
import { formatDateWithTime, parseDateFromAPI, parseLocalDate } from '@/lib/dateFormat'
import Swal from 'sweetalert2'
import { showToast } from '@/utils/toast'

const ReceptVoucherForm = () => {
    const { t } = useTranslation();
    const { reciptVoucherId } = useParams()
    const editMode = Boolean(reciptVoucherId);
    const { userId, currentFinancialYear, selectedBranchId, currentCurrencyConversion, currentCurrency } = useAuth();


    const { generalSettings, purchaseSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [existingReciptNo, setExistingReciptNo] = useState('');
    const [errors, setErrors] = useState({});
    const [voucherNo, setVoucherNo] = useState('');
    const [resetTableKey, setResetTableKey] = useState(0);

    const [bankCash, setBankCash] = useState([]);
    const [employees, setEmplyees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [time, setTime] = useState("");

    // Add useEffect to fetch data in edit mode
    useEffect(() => {
        if (editMode && reciptVoucherId && ledgers.length > 0) {
            fetchReceiptData();
        }
    }, [reciptVoucherId, editMode, ledgers]);

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false);

    const genarateSalesReciptVoucherNo = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Receipt Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherNo(response.data.voucherCode);
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Reciept Voucher");
    const [formData, setFormData] = useState({
        voucherType: "Receipt Voucher",
        yearId: currentFinancialYear?.yearId || 0,
        date: new Date(),
        ledgerId: "",
        narration: "",
        totalAmount: 0,
        userId: userId,
        employeeId: "",
        costCentreId: null,
        currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
        ReferenceNo: "",
        ReferenceDate: new Date(),
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        vanExecutiveId: null,
        branchId: selectedBranchId,
        CreatedUser: userId,
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        receiptDetails: [
            {
                SlNo: 1,
                ledgerId: null,
                ledgerName: '',
                amount: 0,
                Narration: "",
                chequeNo: null,
                chequeDate: "01-01-1753",
                currencyConversionId: currentCurrencyConversion?.currencyConversionId || null
            }
        ]
    });

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

    useEffect(() => {
        if (editMode) return;

        setFormData(prev => {
            const prevDate = new Date(prev.date);
            const today = new Date();

            const isSameDate =
                prevDate.getFullYear() === today.getFullYear() &&
                prevDate.getMonth() === today.getMonth() &&
                prevDate.getDate() === today.getDate();

            if (!isSameDate) {
                return { ...prev, date: today };
            }
            return prev;
        });
    }, [time]);

    const [baseDataloading, setBaseDataloading] = useState(false)

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
        navigate('/transaction/reciept-voucher');
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
            voucherType: "Receipt Voucher",
            yearId: currentFinancialYear?.yearId || 0,
            date: new Date(),
            ledgerId: "",
            narration: "",
            totalAmount: 0,
            userId: userId,
            employeeId: "",
            costCentreId: null,
            currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
            ReferenceNo: "",
            ReferenceDate: new Date(),
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            vanExecutiveId: null,
            branchId: selectedBranchId,
            CreatedUser: userId,
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            receiptDetails: [
                {
                    SlNo: 1,
                    ledgerId: null,
                    ledgerName: '',
                    amount: 0,
                    Narration: "",
                    chequeNo: null,
                    chequeDate: "01-01-1753",
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId
                }
            ]
        });
        setErrors({});
        setResetTableKey(prev => prev + 1);
    };

    const handleRowRemove = async (slNo) => {
        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({
                title: t("delete.title"),
                text: t("delete.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("delete.confirm"),
                cancelButtonText: t("delete.cancel")
            });
            if (!result.isConfirmed) return;
        }

        setFormData(prev => ({
            ...prev,
            receiptDetails: prev.receiptDetails
                .filter(detail => detail.SlNo !== slNo)
                .map((detail, index) => ({ ...detail, SlNo: index + 1 }))
        }));
    };


    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-finance-data', {
                    voucherType: "Receipt Voucher",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency
                })
                const data = res?.data?.data;

                setBankCash(data?.bankaccountledgers5and8);
                setEmplyees(data?.employees)
                setCostCenters(data?.costcentre)
                setCurrency(data?.currencywithConversion)
                setLedgers(data?.accountLedger)
                setVoucherNo(data?.voucherdata?.voucherCode)

            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])

    const handleFormChange = (name, valueOrEvent) => {
        const value = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchLedgerBalance = async (ledgerId) => {
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );
            const balance = res.data?.data?.currentbal || 0;
            return balance;
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            return 0;
        }
    };

    const fetchReceiptData = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-sales-receipt-byId/${reciptVoucherId}`);
            const data = response.data.data;

            setExistingReciptNo(data.voucherNo);

            // Prepare receipt details with proper data mapping
            let receiptDetailsForForm = [];

            if (data.receiptDetails && data.receiptDetails.length > 0) {
                receiptDetailsForForm = data.receiptDetails.map((detail, index) => {
                    // Parse the cheque date properly
                    let parsedChequeDate = "01-01-1753";
                    if (detail?.chequedate && detail?.chequedate !== "01-01-1753") {
                        try {
                            const datePart = detail.chequedate.split(' ')[0];
                            parsedChequeDate = datePart;
                        } catch (err) {
                            console.error("Error parsing cheque date:", err);
                            parsedChequeDate = "01-01-1753";
                        }
                    }

                    // Find the matching ledger from the ledgers array
                    const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerid);

                    return {
                        SlNo: index + 1,
                        ledgerId: detail?.ledgerid || 0,
                        ledgerName: matchingLedger?.ledgerName || '',
                        amount: parseFloat(detail?.amount) || 0,
                        Narration: detail?.narration || "",
                        chequeNo: detail?.chequeno || "",
                        chequeDate: parsedChequeDate,
                        currencyConversionId: detail?.currencyconversionid || null,
                        ledgerBalance: 0,
                        billByBill: matchingLedger?.billBybill || false,
                        partyDetails: (data.partyDetails || []).filter(
                            p => String(p.ledgerId) === String(detail.ledgerid)
                        ),
                    };
                });
            } else {
                receiptDetailsForForm = [{
                    SlNo: 1,
                    ledgerId: 0,
                    ledgerName: '',
                    amount: 0,
                    Narration: "",
                    chequeNo: "",
                    chequeDate: "01-01-1753",
                    currencyConversionId: currentCurrencyConversion?.currencyConversionId || null,
                    ledgerBalance: 0,
                    billByBill: false,
                }];
            }

            setFormData({
                voucherType: "Receipt Voucher",
                yearId: currentFinancialYear?.yearId || data.yearId,
                receiptMasterId: data.receiptMasterId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                narration: data.narration || "",
                totalAmount: parseFloat(data.totalAmount) || 0,
                userId: userId,
                employeeId: data.employeeId || "",
                costCentreId: data.costCentreId || null,
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? parseDateFromAPI(data.ReferenceDate) : new Date(),
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? parseDateFromAPI(data.postedDate) : null,
                vanExecutiveId: data.vanExecutiveId || null,
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                exchangeRate: currentCurrencyConversion?.rate,
                exchangeDate: currentCurrencyConversion?.date,
                receiptDetails: receiptDetailsForForm
            });

            // Fetch ledger balances for each detail
            if (data.receiptDetails && data.receiptDetails.length > 0) {
                const updatedDetails = await Promise.all(
                    data.receiptDetails.map(async (detail, index) => {
                        const balance = await fetchLedgerBalance(detail.ledgerid);
                        const matchingLedger = ledgers.find(l => l.ledgerId === detail.ledgerid);

                        let parsedChequeDate = "01-01-1753";
                        if (detail?.chequedate && detail?.chequedate !== "01-01-1753") {
                            const datePart = detail.chequedate.split(' ')[0];
                            parsedChequeDate = datePart;
                        }

                        return {
                            SlNo: index + 1,
                            ledgerId: detail?.ledgerid || 0,
                            ledgerName: matchingLedger?.ledgerName || '',
                            amount: parseFloat(detail?.amount) || 0,
                            Narration: detail?.narration || "",
                            chequeNo: detail?.chequeno || "",
                            chequeDate: parsedChequeDate,
                            currencyConversionId: detail?.currencyconversionid || null,
                            ledgerBalance: balance,
                            billByBill: matchingLedger?.billBybill || false,
                            partyDetails: (data.partyDetails || []).filter(
                                p => String(p.ledgerId) === String(detail.ledgerid)
                            ),
                        };
                    })
                );

                setFormData(prev => ({
                    ...prev,
                    receiptDetails: updatedDetails
                }));
            }

        } catch (error) {
            console.error('Error fetching receipt data:', error);

            showToast.error(t('recieptVoucher.form.messages.fetchError'))
        } finally {
            setFetchLoading(false)
        }
    };

    // Update ledger names once ledgers are loaded
    useEffect(() => {
        if (ledgers && ledgers.length > 0 && formData.receiptDetails) {
            const updatedDetails = formData.receiptDetails.map(detail => {
                const ledger = ledgers.find(l => l.ledgerId === detail.ledgerId);
                return {
                    ...detail,
                    ledgerName: ledger?.ledgerName || '',
                    billByBill: ledger?.billBybill || false
                };
            });
            setFormData(prev => ({
                ...prev,
                receiptDetails: updatedDetails
            }));
        }
    }, [ledgers]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check for Ctrl+S or Cmd+S
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault(); // prevent browser's Save dialog
                if (!isSubmitting) {
                    handleSubmit();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting, formData]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.date) {
            newErrors.date = t("requiredFieldsError");
        }

        if (!formData.ledgerId || formData.ledgerId === 0 || formData.ledgerId === "") {
            newErrors.ledgerId = t("requiredFieldsError");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (!validateForm()) return;
        try {
            const validReceiptDetails = formData.receiptDetails.filter(
                detail => detail.ledgerId && detail.ledgerId !== 0
            );

            if (validReceiptDetails.length === 0) {

                showToast.error(t('recieptVoucher.form.messages.selectLedgerInAllRows'))

                return;
            }
            if (editMode && generalSettings?.askConfirmationEdit) {
                const result = await Swal.fire({
                    title: t("ConfirmUpdateTitle"), text: t("ConfirmUpdateText"),
                    icon: 'question', showCancelButton: true,
                    confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
                    confirmButtonText: t("YesUpdate"), cancelButtonText: t('Cancel'),
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
            setIsSubmitting(true);

            // Format the data
            // WITH THIS:
            const formattedData = {
                ...formData,
                date: formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date,
                ReferenceDate: formData.ReferenceDate instanceof Date ? formData.ReferenceDate.toISOString().split('T')[0] : formData.ReferenceDate,
                postedDate: formData.postedDate instanceof Date ? formData.postedDate.toISOString().split('T')[0] : formData.postedDate,
                exchangeDate: formData.exchangeDate instanceof Date ? formData.exchangeDate.toISOString().split('T')[0] : formData.exchangeDate,
                receiptDetails: formData.receiptDetails
                    .filter(detail => detail.ledgerId && detail.ledgerId !== 0)
                    .map(detail => ({
                        SlNo: detail.SlNo,
                        ledgerId: detail.ledgerId,
                        amount: parseFloat(detail.amount) || 0,
                        Narration: detail.Narration || "",
                        chequeNo: detail.chequeNo || "",
                        chequeDate: detail.chequeDate instanceof Date
                            ? detail.chequeDate.toISOString().split('T')[0]
                            : detail.chequeDate || "01-01-1753",
                        currencyConversionId: detail.currencyConversionId || null,
                    })),
                partyDetails: formData.partyDetails && formData.partyDetails.length > 0
                    ? formData.partyDetails
                    : [],
            };

            if (editMode) {
                // Update
                const updateData = {
                    ...formattedData,
                    date: formatDateWithTime(formData.date),
                    ModifiedUser: userId
                };
                delete updateData.voucherType;
                delete updateData.yearId;
                delete updateData.CreatedUser;

                const response = await axiosInstance.post(`update-sales-receipt/${reciptVoucherId}`, updateData);

                if (response.data && !response.data.error) {
                    if (purchaseSettings?.CloseAfterSave) {

                        navigate('/transaction/reciept-voucher');
                    }
                } else {
                    console.error(response.data.message || t('recieptVoucher.form.messages.updateError'));
                }
            } else {
                const dataToSave = {
                    ...formattedData,
                    date: formatDateWithTime(formData.date)
                };

                const response = await axiosInstance.post('save-sales-receipt', dataToSave);

                genarateSalesReciptVoucherNo()
                if (response.data && !response.data.error) {
                    showToast.success(t('saveSuccess'));

                    if (purchaseSettings?.CloseAfterSave) {
                        navigate('/transaction/reciept-voucher');
                    } else {
                        // Clear form first
                        clearForm(true);

                        // Then generate new voucher number in background
                        genarateSalesReciptVoucherNo();
                    }
                }
            }
        } catch (error) {
            console.error('Error saving receipt:', error);

            showToast.error(t('saveError'))

        } finally {
            setIsSubmitting(false);
        }
    };

    if (fetchLoading || baseDataloading) {
        return <>
            <BreadCrumb
                routes={[
                    { title: t("recieptVoucher.breadcrumb.master"), url: "#" },
                    { title: t("recieptVoucher.form.breadcrumb.parent"), url: "/transaction/reciept-voucher" },
                    { title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Banknote, title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title") }}
            />
            <Preloader />
        </>
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("recieptVoucher.breadcrumb.master"), url: "#" },
                    { title: t("recieptVoucher.form.breadcrumb.parent"), url: "/transaction/reciept-voucher" },
                    { title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Banknote, title: editMode ? t("recieptVoucher.form.breadcrumb.edit.title") : t("recieptVoucher.form.breadcrumb.title") }}
                actions={[
                    {
                        label: t('listBtn'),
                        icon: Table,
                        type: 'secondary',
                        onClick: handleListNavigate,
                    },
                    ...(!editMode ? [{
                        label: t('clearBtn'),
                        icon: Eraser,
                        type: 'secondary',
                        onClick: clearForm,
                    }] : []),
                    ...(privileges?.can_add || (editMode && privileges?.can_edit)
                        ? [
                            {
                                label: isSubmitting
                                    ? (editMode ? t("updating") : t("saving"))
                                    : (editMode ? t("updateBtn") : t("submitBtn")),
                                icon: SaveAll,
                                loading: isSubmitting,
                                type: "primary",
                                onClick: () => { handleSubmit() },
                                disabled: isSubmitting,
                            },
                        ]
                        : []
                    ),
                ]}
            />
            <div className='p-1' key={resetTableKey}>
                <ReciptVoucherFormHeader
                    existingReciptNo={existingReciptNo}
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                    errors={errors}
                    voucherNo={voucherNo}
                    bankCash={bankCash}
                    setBankCash={setBankCash}
                    employees={employees}
                    setEmplyees={setEmplyees}
                    costCenters={costCenters}
                />
                <RecieptVoucherFormTable
                    formData={formData}
                    setFormData={setFormData}
                    currency={currency}
                    ledgers={ledgers}
                    onRowRemove={handleRowRemove}
                />
                <RecieptVoucherFormFooter
                    formData={formData}
                    setFormData={setFormData}
                    handleFormChange={handleFormChange}
                    editMode={editMode}
                />
            </div>
        </div>
    )
}

export default ReceptVoucherForm