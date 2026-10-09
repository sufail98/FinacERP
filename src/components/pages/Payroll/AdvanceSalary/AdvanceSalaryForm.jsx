import { useState, useEffect } from "react";
import { SaveAll, X, Wallet } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import DateInput from "@/components/elements/theme/DateInput";
import TextArea from "@/components/elements/theme/TextArea";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { showToast } from "@/utils/toast";
import TextInput from "@/components/elements/theme/TextInput";
import { sanitize } from "@/lib/inputSanitizer";

const AdvanceSalaryForm = () => {
    const { advanceSalaryId } = useParams();
    const editMode = Boolean(advanceSalaryId);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { selectedBranchId, user, currentFinancialYear } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [voucherNumberGenerating, setVoucherNumberGenerating] = useState(false);
    const [alert, setAlert] = useState(null);
    const [errors, setErrors] = useState({});

    // Voucher meta
    const [voucherNo, setVoucherNo] = useState("");
    const [suffixPrefixId, setSuffixPrefixId] = useState("");
    const [existingVoucherNo, setExistingVoucherNo] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        advanceNo: "",
        date: new Date().toISOString().split("T")[0],
        month: new Date().toISOString().split("T")[0].slice(0, 7) + "-01",
        employeeId: "",
        ledgerId: "",
        amount: "",
        narration: "",
        chequeNo: "",
        chequeDate: "",
    });

    // Dropdown options
    const [employees, setEmployees] = useState([]);
    const [ledgers, setLedgers] = useState([]);

    useEffect(() => {
        fetchDropdowns();
    }, [selectedBranchId]);

    useEffect(() => {
        if (!editMode) {
            generateVoucherNo();
        }
    }, [selectedBranchId, currentFinancialYear]);

    useEffect(() => {
        if (editMode && advanceSalaryId) {
            loadAdvanceSalary();
        }
    }, [editMode, advanceSalaryId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                handleSubmit(e);
            }
            if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [formData, generalSettings]);

    const generateVoucherNo = async () => {
        setVoucherNumberGenerating(true);
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Advance Payment&branchId=${selectedBranchId}&yearId=${currentFinancialYear?.yearId}`
            );
            if (editMode) setExistingVoucherNo(response.data.voucherCode);
            setVoucherNo(response.data.voucherCode);
            setSuffixPrefixId(response.data.suffixPrefixId ?? "");
        } catch (error) {
            console.error("Error generating voucher number:", error);
        } finally {
            setVoucherNumberGenerating(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            setLoading(true);

            // Fetch employees
            const empRes = await axiosInstance
                .get("employees")
                .catch(() => ({ data: { data: [] } }));
            const empOptions = (empRes?.data?.data || []).map((emp) => ({
                value: emp.employeeId || emp.EmployeeId,
                label: emp.employeeName || emp.EmployeeName || emp.name,
            }));
            setEmployees(empOptions);

            // Fetch ledgers (cash/bank accounts for payment)
            const ledgerRes = await axiosInstance
                .get(`all-account-ledgers/${selectedBranchId}`)
                .catch(() => ({ data: { data: [] } }));
            const ledgerOptions = (ledgerRes?.data?.data || []).map((led) => ({
                value: led.ledgerId || led.LedgerId,
                label: led.ledgerName || led.LedgerName || led.name,
            }));
            setLedgers(ledgerOptions);
        } catch (err) {
            console.error("Error fetching dropdowns:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadAdvanceSalary = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`salaryadvancepayment-byId/${advanceSalaryId}`);
            const record = res?.data?.data;

            if (record) {
                setVoucherNo(record.voucherNo || record.VoucherNo || "");
                setSuffixPrefixId(record.suffixPrefixId || record.SuffixPrefixId || "");

                setFormData({
                    advanceNo: record.advanceNo || record.AdvanceNo || "",
                    date: record.date
                        ? record.date.split("T")[0]
                        : record.Date
                            ? record.Date.split("T")[0]
                            : new Date().toISOString().split("T")[0],
                    month: record.month
                        ? record.month.split("T")[0]
                        : record.Month
                            ? record.Month.split("T")[0]
                            : new Date().toISOString().split("T")[0].slice(0, 7) + "-01",
                    employeeId: record.employeeId || record.EmployeeId || "",
                    ledgerId: record.ledgerId || record.LedgerId || "",
                    amount: record.amount !== undefined ? String(record.amount) : "",
                    narration: record.narration || record.Narration || "",
                    chequeNo: record.chequeNo || record.ChequeNo || "",
                    chequeDate: record.chequeDate
                        ? record.chequeDate.split("T")[0]
                        : record.ChequeDate
                            ? record.ChequeDate.split("T")[0]
                            : "",
                });

                // Generate a voucher no for display (edit still needs it for the payload)
                generateVoucherNo();
            }
        } catch (err) {
            console.error("Error loading advance salary:", err);
            setAlert({
                id: Date.now(),
                type: "error",
                message: err?.response?.data?.message || "Failed to load advance salary details",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value
        if(["amount"].includes(name)){
          if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            updatedValue = value;
        }
        else {
            return;
        }
        }
        if(["chequeNo"].includes(name)){
            updatedValue = sanitize.numbers(value)
        }
        setFormData((prev) => ({ ...prev, [name]: updatedValue }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.date) newErrors.date = "Date is required";
        if (!formData.month) newErrors.month = "Month is required";
        if (!formData.employeeId) newErrors.employeeId = "Employee is required";
        if (!formData.ledgerId) newErrors.ledgerId = "Ledger / Payment account is required";
        if (!formData.amount || Number(formData.amount) <= 0)
            newErrors.amount = "Amount must be greater than 0";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!validate()) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: "Please fix the validation errors before saving.",
            });
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle") || "Confirm Update",
                text: t("ConfirmUpdateText") || "Do you want to update this record?",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("YesUpdate") || "Yes, Update",
                cancelButtonText: t("Cancel") || "Cancel",
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t("ConfirmSaveTitle") || "Confirm Save",
                text: t("ConfirmSaveText") || "Do you want to save this record?",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("YesSave") || "Yes, Save",
                cancelButtonText: t("Cancel") || "Cancel",
            });
            if (!result.isConfirmed) return;
        }

        setSubmitLoading(true);

        const payload = {
            voucherNo: editMode ? existingVoucherNo || voucherNo : voucherNo,
            suffixPrefixId: suffixPrefixId !== "" ? String(suffixPrefixId) : "0",
            advanceNo: formData.advanceNo || "",
            date: formData.date,
            employeeId: Number(formData.employeeId),
            ledgerId: Number(formData.ledgerId),
            amount: Number(formData.amount),
            month: formData.month,
            narration: formData.narration || "",
            chequeNo: formData.chequeNo || "",
            chequeDate: formData.chequeDate || "",
            branchId: selectedBranchId,
            ...(editMode
                ? { ModifiedUser: user?.userId || "admin" }
                : { CreatedUser: user?.userId || "admin" }),
        };

        try {
            const url = editMode
                ? `update-salaryadvancepayment/${advanceSalaryId}`
                : "save-salaryadvancepayment";
            const response = await axiosInstance.post(url, payload);

            if (!response.data.error) {
                showToast.success(
                    editMode
                        ? "Advance Salary updated successfully"
                        : "Advance Salary saved successfully"
                );
                navigate("/payroll/advance-salary");
            } else {
                setAlert({
                    id: Date.now(),
                    type: "error",
                    message: response.data.message || "Failed to save record.",
                });
            }
        } catch (err) {
            console.error("Error saving advance salary:", err);
            setAlert({
                id: Date.now(),
                type: "error",
                message: err.response?.data?.message || "Something went wrong while saving.",
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = async () => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t("ConfirmCloseTitle") || "Are you sure?",
                text: t("ConfirmCloseText") || "Unsaved changes will be lost.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("YesClose") || "Yes, Close",
                cancelButtonText: t("Cancel") || "Cancel",
            });
            if (!result.isConfirmed) return;
        }
        navigate("/payroll/advance-salary");
    };

    if (loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: "Payroll", url: "#" },
                        { title: "Advance Salary", url: "/payroll/advance-salary" },
                        { title: editMode ? "Edit" : "Add New", url: "#" },
                    ]}
                    heading={{
                        icon: Wallet,
                        title: editMode ? "Edit Advance Salary" : "Create Advance Salary",
                    }}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#121212] transition-colors min-h-screen pb-12">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: "Payroll", url: "#" },
                    { title: "Advance Salary", url: "/payroll/advance-salary" },
                    { title: editMode ? "Edit" : "Add New", url: "#" },
                ]}
                heading={{
                    icon: Wallet,
                    title: editMode ? "Edit Advance Salary" : "Create Advance Salary",
                }}
                actions={[
                    {
                        label: "Cancel (Esc)",
                        icon: X,
                        type: "outline",
                        onClick: handleCancel,
                    },
                    {
                        label: submitLoading
                            ? "Saving..."
                            : editMode
                                ? "Update (Ctrl+S)"
                                : "Save (Ctrl+S)",
                        icon: SaveAll,
                        type: "primary",
                        onClick: () => handleSubmit(),
                        loading: submitLoading,
                    },
                ]}
            />

            <div className="p-4 mx-auto max-w-5xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Voucher Info Section */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-2">
                            Voucher Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Voucher No - read only, auto-generated */}
                            <div className="flex flex-col gap-1">
                            
                                <div className="relative">
                                    <TextInput
                                    label="Voucher No"
                                        type="text"
                                        readOnly
                                        value={voucherNumberGenerating ? "Generating..." : voucherNo}
                                        className="cursor-not-allowed font-bold text-red-700"
                                        placeholder="Auto-generated"
                                    />
                                    {voucherNumberGenerating && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <svg
                                                className="animate-spin h-4 w-4 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8H4z"
                                                />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Advance No */}
                            <div className="flex flex-col gap-1">
                                <TextInput
                                    label="Advance No"
                                    name="advanceNo"
                                    value={formData.advanceNo}
                                    onChange={handleInputChange}
                                    placeholder="Enter advance number (optional)"
                                />  
                            </div>

                            <DateInput
                                label="Date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                error={errors.date}
                                required
                            />
                        </div>
                    </div>

                    {/* Payment Details Section */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-2">
                            Advance Salary Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Employee */}
                            <div className="flex flex-col gap-1">
                              
                                <SearchableDropdown
                                    label="Employee"
                                    options={employees}
                                    value={formData.employeeId}
                                    onChange={(val) => {
                                        setFormData((prev) => ({ ...prev, employeeId: val }));
                                        if (errors.employeeId)
                                            setErrors((prev) => ({ ...prev, employeeId: "" }));
                                    }}
                                    error={errors.employeeId}
                                    placeholder="Select Employee"
                                    required
                                />
                          
                            </div>

                            {/* Ledger / Payment Account */}
                            <div className="flex flex-col gap-1">
                              
                                <SearchableDropdown
                                    label="Payment Account (Ledger)"
                                    options={ledgers}
                                    value={formData.ledgerId}
                                    onChange={(val) => {
                                        setFormData((prev) => ({ ...prev, ledgerId: val }));
                                        if (errors.ledgerId)
                                            setErrors((prev) => ({ ...prev, ledgerId: "" }));
                                    }}
                                    error={errors.ledgerId}
                                    placeholder="Select Ledger"
                                    required
                                />
                              
                            </div>

                            {/* Amount */}
                            <div className="flex flex-col gap-1">
                                <TextInput
                                    label="Amount"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if(e.key === "-") e.preventDefault()
                                    }}
                                    placeholder="0.00"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    error={errors.amount}
                                    required
                                />

                            </div>

                            {/* Month */}
                            <DateInput
                                label="Month"
                                name="month"
                                value={formData.month}
                                onChange={handleInputChange}
                                error={errors.month}
                                required
                                type="month"
                            />
                        </div>
                    </div>

                    {/* Cheque & Narration Section */}
                    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-2">
                            Cheque & Narration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Cheque No */}
                            <TextInput
                                label="Cheque No"
                                name="chequeNo"
                                value={formData.chequeNo}
                                onChange={handleInputChange}
                                placeholder="Enter cheque number if applicable"
                            />


                            {/* Cheque Date */}
                            <DateInput
                                label="Cheque Date"
                                name="chequeDate"
                                value={formData.chequeDate}
                                onChange={handleInputChange}
                            />

                            {/* Narration */}
                            <TextArea
                                label="Narration"
                                name="narration"
                                value={formData.narration}
                                onChange={handleInputChange}
                                placeholder="Enter narration notes here..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="flex justify-end gap-6 px-2 pt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Advance Amount:{" "}
                            <span className="font-bold text-[var(--main-bg)] text-base">
                                {formData.amount ? Number(formData.amount).toFixed(2) : "0.00"}
                            </span>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdvanceSalaryForm;