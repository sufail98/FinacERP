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

const ReceivableVoucherSkin = () => {
    const { receivableVoucherId } = useParams();
    const editMode = Boolean(receivableVoucherId);
    const [fetchLoading, setFetchLoading] = useState(false);
    const navigate = useNavigate();
    const [existingVoucherNo, setExistingVoucherNo] = useState('');
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    // ✅ CHANGED: customers instead of suppliers
    const [customers, setCustomers] = useState([]);
    const [voucherId, setVoucherId] = useState('');
    const [alert, setAlert] = useState(null);
    const { userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings,purchaseSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [banks, setBanks] = useState([]);
    const [cash, setCash] = useState([]);
    const [taxData, setTaxData] = useState([])


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
        voucherType: "Receivable Voucher",
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
        CashLedgerId: cash[0]?.ledgerId || "",
        CashRefNo: "",
        CashAmount: "",
        BankLedgerId: banks[0]?.ledgerId || null,
        BankRefNo: "",
        BankAmount: 0,
        BillBalanceAmount: 0,
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,
        vatLedgerId: "",
        receivableDetails: [
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


    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-finance-data', {
                    voucherType: "Receivable Voucher",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier", "Customer"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;
                setVoucherId(data?.voucherdata?.voucherCode)
                setCostCenters(data?.costcentre)
                setLedgers(data?.accountLedger)
                setEmployees(data?.employees)
                setCostCenters(data?.costcentre)
                setCustomers(data?.customers)
                setPayableVoucherLedger(data?.payablevoucherledgers)
                setBanks(data?.bank)
                setCash(data?.cash)
                setTaxData(data?.taxMaster)


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
        navigate("/transaction/receivable-voucher/list");
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
            voucherType: "Receivable Voucher",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            billTime: "",
            ledgerId: '',
            employeeId: '',
            purchaseAccount: '',
            purchaseAccountName: '',
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            costCentreId: '',
            supplierName: '',
            SupplierAddress: '',
            SupplierPhone: '',
            supplierVATNo: '',
            RefNo: "",
            refDate: "",
            creditPeriod: "",
            dueDate: "",
            deliveryDate: "",
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            narration: "",
            subTotal: "",
            totalTax: "",
            additionalCost: "",
            OtherChargeRemark: "",
            otherChargeLedgerId: "",
            othercharge: "",
            billDiscount: "",
            roundOff: "",
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
            receivableDetails: [
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
            const response = await axiosInstance.get(`get-receivable-voucher-byId/${receivableVoucherId}`);
            const data = response.data.data;

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxMasters = taxResponse.data.data || [];

            setExistingVoucherNo(data.ReceivableNo);

            const receivableVoucherDetailsWithLedgers = (data.receivableDetails || []).map((item, index) => {
                const amount = parseFloat(item.amount) || 0;
                const discPerc = parseFloat(item.discountPercentage) || 0;

                const taxMaster = taxMasters.find(t => t.taxId === item.taxId);
                const taxRate = parseFloat(taxMaster?.rate) || 0;

                const discAmt = (amount * discPerc) / 100;
                const amountAfterDiscount = amount - discAmt;

                let taxAmount = 0;
                let netAmount = 0;

                if (item.taxType === 'Included' && item.taxId && taxRate > 0) {
                    taxAmount = (amountAfterDiscount * taxRate) / 100;
                    netAmount = amountAfterDiscount + taxAmount;
                } else {
                    taxAmount = 0;
                    netAmount = amountAfterDiscount;
                }

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
                voucherType: "Receivable Voucher",
                yearId: currentFinancialYear?.yearId,
                date: data.date ? new Date(data.date) : new Date(),
                ledgerId: data.ledgerId,
                employeeId: data.employeeId,
                currencyConversionId: data.currencyConversionId,
                costCentreId: data.costCentreId,
                partyName: data.partyName || '',
                partyAddress: data.partyAddress || '',
                partyPhone: data.partyPhone || '',
                partyVatNo: data.partyVatNo || '',
                ReferenceNo: data.ReferenceNo || "",
                ReferenceDate: data.ReferenceDate ? new Date(data.ReferenceDate) : "",
                taxType: data.taxType || "NA",
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
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
                receivableDetails: receivableVoucherDetailsWithLedgers,
            }));

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
        // ✅ CHANGED: customers instead of suppliers
        customers: false,
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



    // ✅ CHANGED: fetchCustomers with Customer API
    const fetchCustomers = async () => {
        setLoading(prev => ({ ...prev, customers: true }));
        try {
            // ✅ CHANGED: ledgerTypes: ["Customer"] instead of ["Supplier"]
            const { data } = await axiosInstance.post("customer-supplier-account-ledgers", { ledgerTypes: ["Customer"], branchId: selectedBranchId });
            setCustomers(data.data);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const generatePayableVoucherId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Receivable Voucher&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setVoucherId(response.data.voucherCode)
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        // ✅ CHANGED: customer instead of supplier
        if (!formData.ledgerId) errors.push('Please select a customer');
        if (!formData.date) errors.push('Please select voucher date');
        if (!formData.receivableDetails || formData.receivableDetails.length === 0) {
            errors.push('Please add at least one ledger entry');
        }

        const hasValidEntries = formData.receivableDetails.some(
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

            const api = editMode ? `update-receivable-voucher/${receivableVoucherId}` : 'save-receivable-voucher'
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });
                if (purchaseSettings?.CloseAfterSave) {
                    navigate('/transaction/receivable-voucher/list')  // ✅ correct route
                }
                generatePayableVoucherId();
                await clearForm(true);   // ✅ both modes, skip confirmation, awaited
            }
        } catch (error) {
            console.error('Error saving Receivable Voucher:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text:
                    error.response?.data?.message ||
                    t('SaveFailed') ||
                    'Failed to save Receivable Voucher',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode]);

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
                        { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                        { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{
                        icon: ReceiptText,
                        title: editMode ? t("receivableVoucher.breadcrumb.editTitle") : t("receivableVoucher.breadcrumb.title")
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
                    { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                    { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{
                    icon: ReceiptText,
                    title: editMode ? t("receivableVoucher.breadcrumb.editTitle") : t("receivableVoucher.breadcrumb.title")
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
            {/* ✅ CHANGED: customers & fetchCustomers instead of suppliers & fetchSupplier */}
            <FormSectionMain
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
                customers={customers}
                fetchEmployees={fetchEmployees}
                fetchCustomers={fetchCustomers}
                rows={formData?.receivableDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, receivableDetails: updatedRows }))}

                banks={banks}
                cash={cash}
                payableVouchrLedgers={payableVouchrLedgers}
                taxData={taxData}
            />
        </div>
    );
};

export default ReceivableVoucherSkin;