import BreadCrumb from '@/components/common/BreadCrumb';
import { Eraser, Pencil, ReceiptText, SaveAll, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import { formatDateWithTime, parseDateFromAPI } from '@/lib/dateFormat';

const PayableVoucherSkin = () => {
    const { payableVoucherId } = useParams();
    const editMode = Boolean(payableVoucherId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, purchaseSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);

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
        voucherType: "Payable Voucher",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        ledgerId: '',
        employeeId: '',
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        costCentreId: '',
        partyName: '',
        partyAddress: '',
        partyPhone: '',
        partyVatNo: '',
        ReferenceNo: "",
        ReferenceDate: "",
        taxType: "NA",
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        narration: "",
        totalTax: "",
        totalAmount: "",
        paymentMode: "cash",
        CashLedgerId: "",
        CashRefNo: "",
        CashAmount: "",
        BankLedgerId: null,
        BankRefNo: "",
        BankAmount: 0,
        BillBalanceAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        vatLedgerId: "",
        payableDetails: [
            {
                SlNo: "",
                ledgerId: "",
                amount: null,
                discAmt: null,
                discPerc: null,
                netAmount: null,
                taxId: null,
                taxRate: null,
                taxType: "Excluded",
                taxAmount: null,
                chequeNo: "",
                chequeDate: null,
                narration: "",
                totalAmount: null,
                branchId: selectedBranchId
            }
        ]
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

    const [baseDataloading, setBaseDataloading] = useState(false)
    const [ledgers, setLedgers] = useState([]);
    const [payableVouchrLedgers, setPayableVoucherLedger] = useState([])
    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);


    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-finance-data', {
                    voucherType: "Payable Voucher",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;
                setVoucherId(data?.voucherdata?.voucherCode)
                setCostCenters(data?.costcentre)
                setLedgers(data?.accountLedger)
                setEmployees(data?.employees)
                setCostCenters(data?.costcentre)
                setSuppliers(data?.customersupplierLedgers)
                setPayableVoucherLedger(data?.payablevoucherledgers)
                setBanks(data?.bank)
                setCash(data?.cash)


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
        navigate("/transaction/payable-voucher/list");
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
            voucherType: "Payable Voucher",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            ledgerId: '',
            employeeId: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            costCentreId: '',
            supplierName: '',
            SupplierAddress: '',
            SupplierPhone: '',
            supplierVATNo: '',
            RefNo: "",
            refDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            narration: "",
            totalTax: "",
            totalAmount: "",
            paymentMode: "cash",
            CashLedgerId: "",
            CashRefNo: "",
            CashAmount: 0,
            BankLedgerId: null,
            BankRefNo: "",
            BankAmount: 0,
            BillBalanceAmount: 0,
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,
            vatLedgerId: "",
            payableDetails: [
                {
                    SlNo: "",
                    ledgerId: "",
                    amount: null,
                    discAmt: null,
                    discPerc: null,
                    netAmount: null,
                    taxId: null,
                    taxRate: null,
                    taxType: "Excluded",
                    taxAmount: null,
                    chequeNo: "",
                    chequeDate: null,
                    narration: "",
                    totalAmount: null,
                    branchId: selectedBranchId
                }
            ]
        });

        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (editMode) {
            getPayableVoucherById()
        }
    }, [editMode])



    const getPayableVoucherById = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-payable-voucher-byId/${payableVoucherId}`);

            const data = response.data.data;

            // Fetch tax data first to get tax rates
            const taxResponse = await axiosInstance.get("tax-masters");
            const taxMasters = taxResponse.data.data || [];

            setExistingVoucherNo(data.voucherNo);

            // Map payable details with correct field names
            const payableVoucherDetailsWithLedgers = (data.payableDetails || []).map((item, index) => {
                // Parse numeric values
                const amount = parseFloat(item.amount) || 0;
                const discPerc = parseFloat(item.discountPercentage) || 0;

                // Get tax rate from taxMasters using taxId
                const taxMaster = taxMasters.find(t => t.taxId === item.taxId);
                const taxRate = parseFloat(taxMaster?.rate) || 0;

                // Calculate discount amount
                const discAmt = (amount * discPerc) / 100;

                // Calculate amount after discount
                const amountAfterDiscount = amount - discAmt;

                // Calculate tax based on taxType
                let taxAmount = 0;
                let netAmount = 0;

                if (item.taxType === 'Included' && item.taxId && taxRate > 0) {
                    // Tax Type "Included" - Add tax ON TOP of amount after discount
                    taxAmount = (amountAfterDiscount * taxRate) / 100;
                    netAmount = amountAfterDiscount + taxAmount;
                } else {
                    // Tax Type is "Excluded" - No tax
                    taxAmount = 0;
                    netAmount = amountAfterDiscount;
                }

                // Use API values if available and valid, otherwise use calculated
                const finalTaxAmount = parseFloat(item.taxAmount) || taxAmount;
                const finalNetAmount = parseFloat(item.netAmount) || netAmount;
                const totalAmount = finalNetAmount;



                return {
                    id: index + 1,
                    sn: index + 1,
                    ledgerId: item.ledgerId || '',
                    ledgerName: item.ledgerName || '',
                    amount: amount,
                    discAmt: parseFloat(discAmt.toFixed(generalSettings.decimalPart ?? 2)),
                    discPerc: discPerc,
                    netAmount: parseFloat(finalNetAmount.toFixed(generalSettings.decimalPart ?? 2)),
                    taxId: item.taxId || null,
                    taxRate: taxRate,
                    taxType: item.taxType || 'Excluded',
                    taxAmount: parseFloat(finalTaxAmount.toFixed(generalSettings.decimalPart ?? 2)),
                    chequeNo: item.chequeNo || '',
                   chequeDate: parseDateFromAPI(item.chequeDate),
                    narration: item.Narration || '',
                    totalAmount: parseFloat(totalAmount.toFixed(generalSettings.decimalPart ?? 2)),
                };
            });

            setFormData((prev) => ({
                ...prev,
                voucherType: "Payable Voucher",
                yearId: currentFinancialYear?.yearId,
                date: parseDateFromAPI(data.date),
                ledgerId: data.ledgerId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                costCentreId: data.costCentreId,
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? parseDateFromAPI(data.ReferenceDate) : "",
                taxType: data.taxType || "NA",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? parseDateFromAPI(data.exchangeDate) : "",
                narration: data.narration || "",
                totalTax: data.totalTax,
                totalAmount: data.totalAmount,
                paymentMode: data.paymentMode || "cash",
                CashLedgerId: data.CashLedgerId || "",
                CashRefNo: data.CashRefNo || "",
                CashAmount: data.CashAmount || "",
                BankLedgerId: data.BankLedgerId,
                BankRefNo: data.BankRefNo || "",
                BankAmount: data.BankAmount || 0,
                BillBalanceAmount: data.BillBalanceAmount || 0,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                payableDetails: payableVoucherDetailsWithLedgers,
            }));

            // Force table re-render
            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching Receivable Voucher data", error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: "Failed to fetch Receivable Voucher data",
            });
        } finally {
            setFetchLoading(false);
        }
    };

    const [loading, setLoading] = useState({
        employees: false,
        costCenters: false,
        suppliers: false,
    });

    const fetchEmployees = async () => {
        setLoading(prev => ({ ...prev, employees: true }));
        try {
            const { data } = await axiosInstance.get("employees");
            setEmployees(data.data);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(prev => ({ ...prev, employees: false }));
        }
    };



    const fetchSupplier = async () => {
        setLoading(prev => ({ ...prev, suppliers: true }));
        try {
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Supplier"], branchId: selectedBranchId });
            setSuppliers(data.data);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
        }
    };
    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)
    const generatePayableVoucherId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Payable Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherId(response.data.voucherCode)

        } catch (error) {
            console.error(error);

        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        if (!formData.ledgerId) errors.push('Please select a supplier');
        if (!formData.date) errors.push('Please select voucher date');
        if (!formData.payableDetails || formData.payableDetails.length === 0) {
            errors.push('Please add at least one ledger entry');
        }

        const hasValidEntries = formData.payableDetails.some(
            detail => detail.ledgerId && detail.amount > 0
        );
        if (!hasValidEntries) errors.push('Please add valid ledger entries with amount');

        return errors;
    };

    const handleSave = useCallback(async () => {
        if (formData.BillBalanceAmount < 0) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: t("payableVoucher.alert.billBalanceAmtError"),
            });
            return;
        }

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

        if (generalSettings?.negativeCashTransaction !== 'Allow') {
                    setIsSaving(true);
        
                    const cashLedgerId = formData.CashLedgerId;
                    const cashAmount = parseFloat(formData.CashAmount || 0);
        
                    if (cashLedgerId && cashAmount > 0) {
                        try {
                            const res = await axiosInstance.get(
                                `get-ledger-balance?ledgerId=${cashLedgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`
                            );
                            const balanceData = res.data?.data;
                            const currentBalance = parseFloat(balanceData?.currentbal || 0);
                            const wouldBeBalance = currentBalance - cashAmount;
        
                            if (wouldBeBalance < 0) {
                                const cashLedgerName = cash.find(c => c.ledgerId === cashLedgerId)?.ledgerName || 'Cash';
        
                                if (generalSettings?.negativeCashTransaction === 'Block') {
                                    await Swal.fire({
                                        title: t('purchaseInvoice.form.messages.negativeCashBlockTitle') || 'Transaction Blocked',
                                        text: `Insufficient balance for "${cashLedgerName}". Available: ${currentBalance.toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${cashAmount.toFixed(generalSettings?.decimalPart ?? 2)}`,
                                        icon: 'error',
                                        confirmButtonColor: '#d33',
                                        confirmButtonText: t('Ok') || 'Ok',
                                    });
                                    setIsSaving(false);
        
                                    return;
                                }
        
                                if (generalSettings?.negativeCashTransaction === 'Warn') {
                                    const result = await Swal.fire({
                                        title: t('purchaseInvoice.form.messages.negativeCashWarnTitle') || 'Low Balance Warning',
                                        text: `"${cashLedgerName}" will result in a negative balance. Available: ${currentBalance.toFixed(generalSettings?.decimalPart ?? 2)}, Required: ${cashAmount.toFixed(generalSettings?.decimalPart ?? 2)}. Continue?`,
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#3085d6',
                                        cancelButtonColor: '#d33',
                                        confirmButtonText: t('Yes Continue') || 'Yes, Continue',
                                        cancelButtonText: t('Cancel'),
                                    });
                                    setIsSaving(false);
        
                                    if (!result.isConfirmed) return;
                                }
                            }
                        } catch (error) {
                            console.error('Error checking cash ledger balance:', error);
                        }
                    }
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
            const api = editMode ? `update-payable-voucher/${payableVoucherId}` : 'save-payable-voucher'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t("saveSuccess"),
                });

                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/payable-voucher/list');
                }

                // ✅ Always regenerate voucher ID and clear form — both create & edit
                generatePayableVoucherId();
                await clearForm(true);
            }
        } catch (error) {
            console.error('Error saving payable voucher:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save payable voucher',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, purchaseSettings, generalSettings, editMode]);

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
                        { title: t("payableVoucher.breadcrumb.master"), url: "#" },
                        { title: t("payableVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: editMode ? t("payableVoucher.breadcrumb.editTitle") : t("payableVoucher.breadcrumb.title")
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

    return (
        <div className="bg-primary dark:bg-primary ">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("payableVoucher.breadcrumb.master"), url: "#" },
                    { title: t("payableVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode ? t("payableVoucher.breadcrumb.editTitle") : t("payableVoucher.breadcrumb.title")
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
                        onClick: () => clearForm(),   // ← no arguments = skipConfirmation stays false
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
            <FormSectionMain
                generalSettings={generalSettings}
                loading={loading}
                existingInvoiceNo={existingVoucherNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={voucherId}
                setFormData={setFormData}
                formData={formData}
                employees={employees}
                costCenters={costCenters}
                suppliers={suppliers}
                fetchEmployees={fetchEmployees}
                fetchSupplier={fetchSupplier}
                rows={formData?.payableDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, payableDetails: updatedRows }))}

                ledgers={ledgers}
                payableVouchrLedgers={payableVouchrLedgers}
                banks={banks}
                cash={cash}
            />
        </div>
    );
};

export default PayableVoucherSkin;