import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import axiosInstance from "@/lib/axiosConfig"
import { useEffect, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { updateFinanceSettings } from "@/redux/slice/settingsSlice"
import useAuth from "@/redux/hook/auth/useAuth"
import Preloader from "@/components/common/Preloader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showToast } from "@/utils/toast"
import { getSystemId } from "@/utils/systemId"
import PasswordModal from "./PasswordModal"
import { Input } from "@/components/ui/input"

const FinanceSettings = () => {
    const { financeSettings } = useSelector((state) => state.settings)
    const [settings, setSettings] = useState(financeSettings || {});
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const { selectedBranchId } = useAuth();
    const [suppliers, setSuppliers] = useState([])
    const [bank, setBank] = useState([])
    const [cash, setCash] = useState([])
    const [customers, setCustomers] = useState([]);
    const orgData = useSelector((state) => state.organization.organizationData);


    const [systemId, setSystemId] = useState("")

    // Password Modal States
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [pendingSave, setPendingSave] = useState(false)

    useEffect(() => {
        const fetchSystemId = async () => {
            const id = await getSystemId()
            setSystemId(id)
        }
        fetchSystemId()
    }, []);

    /* ================================================================
       REFETCH FINANCE SETTINGS & UPDATE REDUX
       Called after every successful save operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const response = await axiosInstance.get("finance-settings");

            if (!response.error && response?.data?.data?.length > 0) {
                const branchSettings = response.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updateFinanceSettings(branchSettings));

                // Update local state
                setSettings(branchSettings);

                return branchSettings;
            }
        } catch (error) {
            console.error("Error refetching finance settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    useEffect(() => {
        if (financeSettings) {
            setSettings(financeSettings)
        }
    }, [financeSettings])

    useEffect(() => {
        fetchAndUpdateSettings();
        fetchSupplier();
        fetchCustomer();
        fetchBankAccounts();
        fetchCashAccounts();
    }, [])

    /**
     * Handle Save Button Click - Show password modal
     */
    const handleSaveClick = () => {
        setShowPasswordModal(true)
        setPendingSave(true)
    }

    /**
     * Handle Password Modal Confirmation
     */
    const handlePasswordConfirm = (verified) => {
        if (verified && pendingSave) {
            performSave()
            setPendingSave(false)
        }
    }

    /* ================================================================
       SAVE HANDLER — after success always refetch & update Redux
    ================================================================ */
    const performSave = async () => {
        try {
            setSaving(true);
            const payload = {
                ShowAllTransactions: settings.ShowAllTransactions || false,
                MaintainBillbyBill: settings.MaintainBillbyBill || false,
                multiCurrency: settings.multiCurrency || false,
                showLedgerbalance: settings.showLedgerbalance || false,
                CloseAfterSave: settings.CloseAfterSave || false,
                branchId: Number(selectedBranchId),
                defaultPurchaseAccount: settings.defaultPurchaseAccount,
                defaultSalesAccount: settings.defaultSalesAccount,
                DefaultCashAccount: settings.DefaultCashAccount,
                DefaultBankAccount: settings.DefaultBankAccount,
                printAfterSave: settings.printAfterSave || false,
                DashboardDateRangeInDays: settings.DashboardDateRangeInDays || 0,
                systemId,
            }

            const response = await axiosInstance.post(
                `update-finance-setting/${settings.FinanceSettingsId}`,
                payload
            );

            if (!response.error) {
                showToast.success("Settings updated successfully");

                // ✅ Refetch & update Redux with fresh server data
                await fetchAndUpdateSettings();
            }
        } catch (error) {
            console.error("Error updating finance settings:", error)
            showToast.error("Failed to update settings");
        } finally {
            setSaving(false)
        }
    }

    const fetchSupplier = async () => {
        try {
            const res = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: ["Supplier", "Customer&Supplier"],
                branchId: selectedBranchId
            });
            if (res.data && !res.data.error) {
                setSuppliers(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [5], branchId: selectedBranchId });
            if (res.data && !res.data.error) {
                setBank(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCashAccounts = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [8], branchId: selectedBranchId });
            if (res.data && !res.data.error) {
                setCash(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomer = async () => {
        try {
            const res = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: ["Customer", "Customer&Supplier"],
                branchId: selectedBranchId
            });
            if (res.data && !res.data.error) {
                setCustomers(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        }
    };

    const toggleSetting = (key) => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    const handleSelectChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    }
     const handleInputChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    }

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    // Reusable heading row for grouping sections
    const SectionHeading = ({ title }) => (
        <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan="2">
                {title}
            </td>
        </tr>
    )

    return (
        <div className="p-2 bg-white dark:bg-[#121212] transition-colors">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Finance Settings</h3>

            {/* Password Modal */}
            <PasswordModal
                open={showPasswordModal}
                onOpenChange={setShowPasswordModal}
                onConfirm={handlePasswordConfirm}
            />

            {/* Settings Table */}
            <div className="overflow-x-auto pb-25">
                <table>
                    <tbody>

                        {/* ============================================================
                            GENERAL SETTINGS
                        ============================================================ */}
                        <SectionHeading title="General Settings" />

                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Maintain Bill by Bill</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className="border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                    checked={settings.MaintainBillbyBill}
                                    onCheckedChange={() => toggleSetting("MaintainBillbyBill")}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Print After Save</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                    checked={settings.printAfterSave}
                                    onCheckedChange={() => toggleSetting("printAfterSave")}
                                />
                            </td>
                        </tr>
                        {orgData?.subscriptionPlan != 'Basic' && (
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Multi Currency</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.multiCurrency}
                                        onCheckedChange={() => toggleSetting("multiCurrency")}
                                    />
                                </td>
                            </tr>
                        )}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Ledger Balance in Transactions</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className="border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                    checked={settings.showLedgerbalance}
                                    onCheckedChange={() => toggleSetting("showLedgerbalance")}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show All Transactions</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className="border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                    checked={settings.ShowAllTransactions}
                                    onCheckedChange={() => toggleSetting("ShowAllTransactions")}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Close After Save</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className="border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                    checked={settings.CloseAfterSave}
                                    onCheckedChange={() => toggleSetting("CloseAfterSave")}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Dashboard Date Range In Days</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Enter date range in days"
                                    className="w-full bg-white dark:bg-[#242424] 
                                                                     border-gray-500 dark:border-gray-600
                                                                     text-gray-900 dark:text-gray-100
                                                                     placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    value={settings.DashboardDateRangeInDays || 0}
                                    onChange={(e) => handleInputChange('DashboardDateRangeInDays', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>

                        {/* ============================================================
                            DEFAULT ACCOUNTS
                        ============================================================ */}
                        <SectionHeading title="Default Accounts" />

                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Sales Account</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.defaultSalesAccount || ""}
                                    onValueChange={(value) => handleSelectChange('defaultSalesAccount', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        {customers.map((cus) => (
                                            <SelectItem key={cus.ledgerId} value={cus.ledgerId}
                                                className="text-gray-900 dark:text-gray-100 
                                                               hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                                {cus.ledgerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Purchase Account</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.defaultPurchaseAccount || ""}
                                    onValueChange={(value) => handleSelectChange('defaultPurchaseAccount', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        {suppliers.map((cus) => (
                                            <SelectItem key={cus.ledgerId} value={cus.ledgerId}
                                                className="text-gray-900 dark:text-gray-100 
                                                               hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                                {cus.ledgerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Cash Account</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.DefaultCashAccount || ""}
                                    onValueChange={(value) => handleSelectChange('DefaultCashAccount', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        {cash.map((cash) => (
                                            <SelectItem key={cash.ledgerId} value={cash.ledgerId}
                                                className="text-gray-900 dark:text-gray-100 
                                                               hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                                {cash.ledgerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Bank Account</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.DefaultBankAccount || ""}
                                    onValueChange={(value) => handleSelectChange('DefaultBankAccount', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        {bank.map((bankAccount) => (
                                            <SelectItem key={bankAccount.ledgerId} value={bankAccount.ledgerId}
                                                className="text-gray-900 dark:text-gray-100 
                                                               hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                                {bankAccount.ledgerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>

                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                <Button className="main-bg text-white" onClick={handleSaveClick} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    )
}

export default FinanceSettings