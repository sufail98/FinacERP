import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axiosInstance from "@/lib/axiosConfig"
import { useEffect, useState, useCallback } from "react"
import AlertBox from "@/components/common/AlertBox"
import useAuth from "@/redux/hook/auth/useAuth"
import { useDispatch, useSelector } from "react-redux"
import { updateInventorySettings } from "@/redux/slice/settingsSlice"
import Preloader from "@/components/common/Preloader"
import { showToast } from "@/utils/toast"

const InventorySettings = () => {
    const { userLoading, selectedBranchId } = useAuth();
    const { inventorySettings } = useSelector((state) => state.settings);
    const [settings, setSettings] = useState(inventorySettings || {});

    const dispatch = useDispatch()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [alert, setAlert] = useState(null);

    const handleBack = () => {
    }

    /* ================================================================
       REFETCH INVENTORY SETTINGS & UPDATE REDUX
       Called after every successful save operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const response = await axiosInstance.get('inventory-settings');


            if (!response.error && response?.data?.data?.length > 0) {
                const branchSettings = response.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updateInventorySettings(branchSettings));

                // Update local state
                setSettings(branchSettings);

                return branchSettings;
            }
        } catch (error) {
            console.error("Error refetching inventory settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    useEffect(() => {
        if (inventorySettings) {
            setSettings(inventorySettings)
        }
    }, [inventorySettings])

    useEffect(() => {
        fetchAndUpdateSettings();
    }, [])

    /* ================================================================
       SAVE HANDLER — after success always refetch & update Redux
    ================================================================ */
    const handleSave = async () => {
        try {
            setSaving(true)
            const payload = {
                NegativeStock: settings.NegativeStock,
                stockValueCalculation: settings.stockValueCalculation,
                SalesPriceUpdateByCostPricePercentage: settings.SalesPriceUpdateByCostPricePercentage,
                maintainGodown: settings.maintainGodown,
                maintainRack: settings.maintainRack,
                lowStockReminder: settings.lowStockReminder,
                CloseAfterSave: settings.CloseAfterSave,
                AddProductMainGroupCodeWithProductCode: settings.AddProductMainGroupCodeWithProductCode,
                branchId: selectedBranchId
            }

            const response = await axiosInstance.post(
                `update-inventory-setting/${settings.InventorySettingsId}`,
                payload
            );

            if (!response.error) {

                showToast.success("Settings updated successfully");
                // ✅ Refetch & update Redux with fresh server data
                await fetchAndUpdateSettings();
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            showToast.error("Failed to update settings");
        } finally {
            setSaving(false)
        }
    }

    const handleSelectChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleCheckboxChange = (field, checked) => {
        setSettings(prev => ({
            ...prev,
            [field]: checked
        }))
    }

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    return (
        <div className="p-2 space-y-2 bg-white dark:bg-[#121212] transition-colors">
            {alert && <AlertBox key={alert.key} message={alert.message} type={alert.type} />}
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Inventory Settings</h3>

            {/* Settings Table */}
            <div className="overflow-x-auto">
                <table className="w-[50%]">
                    <tbody>
                        {/* Dropdown Settings */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Negative Stock Alert</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.NegativeStock}
                                    onValueChange={(value) => handleSelectChange('NegativeStock', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Warn" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Warn</SelectItem>
                                        <SelectItem value="Block" className="text-gray-900 dark:text-gray-100 
                                                                           hover:bg-blue-50 dark:hover:bg-blue-900/30">Block</SelectItem>
                                        <SelectItem value="Ignore" className="text-gray-900 dark:text-gray-100 
                                                                            hover:bg-blue-50 dark:hover:bg-blue-900/30">Ignore</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>

                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Stock Value Calculation Method</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.stockValueCalculation}
                                    onValueChange={(value) => handleSelectChange('stockValueCalculation', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Average Cost" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Average Cost</SelectItem>
                                        <SelectItem value="FIFO" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">FIFO</SelectItem>
                                        <SelectItem value="Low Cost" className="text-gray-900 dark:text-gray-100 
                                                                              hover:bg-blue-50 dark:hover:bg-blue-900/30">Low Cost</SelectItem>
                                        <SelectItem value="High Cost" className="text-gray-900 dark:text-gray-100 
                                                                               hover:bg-blue-50 dark:hover:bg-blue-900/30">High Cost</SelectItem>
                                        <SelectItem value="Last Purchase Rate" className="text-gray-900 dark:text-gray-100 
                                                                                        hover:bg-blue-50 dark:hover:bg-blue-900/30">Last Purchase Rate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>

                        {/* Checkbox Settings */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Sales Price Update By Cost Price Percentage</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="salesPriceUpdateByCostPricePercentage"
                                    checked={settings.SalesPriceUpdateByCostPricePercentage}
                                    onCheckedChange={(checked) => handleCheckboxChange('SalesPriceUpdateByCostPricePercentage', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Add Product Main Group Code with Product Code</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="addProductMainGroupCodeWithProductCode"
                                    checked={settings.AddProductMainGroupCodeWithProductCode}
                                    onCheckedChange={(checked) => handleCheckboxChange('AddProductMainGroupCodeWithProductCode', checked)}
                                />
                            </td>
                        </tr>

                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Maintain Godown</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="maintainGodown"
                                    checked={settings.maintainGodown}
                                    onCheckedChange={(checked) => handleCheckboxChange('maintainGodown', checked)}
                                />
                            </td>
                        </tr>

                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Maintain Rack</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="maintainRack"
                                    checked={settings.maintainRack}
                                    onCheckedChange={(checked) => handleCheckboxChange('maintainRack', checked)}
                                />
                            </td>
                        </tr>

                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Low Stock Reminder</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="lowStockReminder"
                                    checked={settings.lowStockReminder}
                                    onCheckedChange={(checked) => handleCheckboxChange('lowStockReminder', checked)}
                                />
                            </td>
                        </tr>

                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Close After Save</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="closeAfterSave"
                                    checked={settings.CloseAfterSave}
                                    onCheckedChange={(checked) => handleCheckboxChange('CloseAfterSave', checked)}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={handleBack}
                    className="border-gray-500 dark:border-gray-600 
                                 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-100 dark:hover:bg-[#242424]">
                    Back
                </Button>
                <Button
                    className="main-bg text-white"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </div>
    )
}

export default InventorySettings