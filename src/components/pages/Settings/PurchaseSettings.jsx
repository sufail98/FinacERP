import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosConfig"
import AlertBox from "@/components/common/AlertBox"
import useAuth from "@/redux/hook/auth/useAuth"
import { updatePurchaseSettings } from "@/redux/slice/settingsSlice"
import { useDispatch, useSelector } from "react-redux"
import Preloader from "@/components/common/Preloader"
import { showToast } from "@/utils/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const PurchaseSettings = () => {
    const { selectedBranchId } = useAuth();
    const { purchaseSettings } = useSelector((state) => state.settings)
    const [settings, setSettings] = useState(purchaseSettings || {});
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [alert, setAlert] = useState(null)
    const [ledgerData, setLedgerData] = useState([]);
    

    const handleBack = () => {
    }

    /* ================================================================
       REFETCH PURCHASE SETTINGS & UPDATE REDUX
       Called after every successful save operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const response = await axiosInstance.get("purchase-settings");

            if (!response.error && response?.data?.data?.length > 0) {
                const branchSettings = response.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updatePurchaseSettings(branchSettings));

                // Update local state
                setSettings(branchSettings);

                return branchSettings;
            }
        } catch (error) {
            console.error("Error refetching purchase settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    const fetchLedgerData = async () => {
        try {
            const response = await axiosInstance.get(`all-account-ledgers/${selectedBranchId}`);
            
            setLedgerData(response.data.data || []);
        } catch (error) {
            console.error("Error fetching ledgers:", error);
        }
    };

    useEffect(() => {
        if (purchaseSettings) {
            setSettings(purchaseSettings)
        }
    }, [purchaseSettings])

    useEffect(() => {
        fetchAndUpdateSettings();
        fetchLedgerData();
    }, [])

    /* ================================================================
       SAVE HANDLER — after success always refetch & update Redux
    ================================================================ */
    const handleSave = async () => {
        try {
            setSaving(true)
            const response = await axiosInstance.post(
                `update-purchase-setting/${settings.PurchaseSettingsId}`,
                {
                    ...settings,
                    branchId: selectedBranchId
                }
            )

            if (!response.error) {
               
                showToast.success("Settings updated successfully");

                // ✅ Refetch & update Redux with fresh server data
                await fetchAndUpdateSettings();
            }
        } catch (error) {
            console.error("Error updating purchase settings:", error)
            showToast.error("Failed to update settings");
        } finally {
            setSaving(false)
        }
    }

    const toggleSetting = (key) => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#121212] transition-colors">
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Purchase Settings</h3>

                {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

                {/* Settings Table */}
                <div className="overflow-x-auto">
                    <table className="w-[50%]">
                        <tbody>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Validate Vendor Invoice Number</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.VendorInvoiceNoChecking}
                                        onCheckedChange={() => toggleSetting("VendorInvoiceNoChecking")}
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
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Grid Fixed Height</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.gridFixedHeight}
                                        onCheckedChange={() => toggleSetting("gridFixedHeight")}
                                    />
                                </td>
                            </tr>
                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Product Description Column</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showProductDescription}
                                        onCheckedChange={() => toggleSetting("showProductDescription")}
                                    />
                                </td>
                            </tr>

                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Free Qty Column</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showFeeQtyColumn}
                                        onCheckedChange={() => toggleSetting("showFeeQtyColumn")}
                                    />
                                </td>
                            </tr>

                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Godown</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ActiveGodown}
                                        onCheckedChange={() => toggleSetting("ActiveGodown")}
                                    />
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Purchase Retention</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ActivatePurchaseRetention}
                                        onCheckedChange={() => toggleSetting("ActivatePurchaseRetention")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Retention Ledger</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.retentionLedgerId || ""}
                                        onValueChange={(value) => handleSelectChange('retentionLedgerId', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                        border-gray-500 dark:border-gray-600
                                        text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select Retention Ledger" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e]  border-gray-500 dark:border-gray-600">
                                            {ledgerData.length > 0 ? (
                                                ledgerData.map((ledger) => (
                                                    <SelectItem
                                                        key={ledger.ledgerId}
                                                        value={Number(ledger.ledgerId)} // ✅ Convert to string
                                                        className="text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                    >
                                                        {ledger.ledgerName}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                    No Retention Ledgers Available
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>

                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Change Sales Price in Purchase Invoice</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ChangeSalesPrice}
                                        onCheckedChange={() => toggleSetting("ChangeSalesPrice")}
                                    />
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Line Discount</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showLineDiscount}
                                        onCheckedChange={() => toggleSetting("showLineDiscount")}
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
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Buttons - Fixed at Bottom */}
            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={handleBack} disabled={saving}
                    className="border-gray-500 dark:border-gray-600 
                                 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-100 dark:hover:bg-[#242424]">
                    Back
                </Button>
                <Button className="main-bg text-white" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    )
}

export default PurchaseSettings