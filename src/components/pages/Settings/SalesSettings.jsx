import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosConfig"
import useAuth from "@/redux/hook/auth/useAuth"
import AlertBox from "@/components/common/AlertBox"
import { useDispatch, useSelector } from "react-redux"
import { updateSalesSettings } from "@/redux/slice/settingsSlice"
import Preloader from "@/components/common/Preloader"
import { useNavigate } from "react-router-dom"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showToast } from "@/utils/toast"

const SalesSettings = () => {
    const { selectedBranchId } = useAuth()
    const { saleSettings } = useSelector((state) => state.settings)

    const [settings, setSettings] = useState(saleSettings || {});
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [alert, setAlert] = useState(null)
    const navigate = useNavigate()
    const [bankLedger, setBankLedger] = useState([])
    const [ledgerData, setLedgerData] = useState([]);

    /* ================================================================
       REFETCH SALES SETTINGS & UPDATE REDUX
       Called after every successful save operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const res = await axiosInstance.get("sales-settings");
  
            if (!res.error && res?.data?.data?.length > 0) {
                const branchSettings = res.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updateSalesSettings(branchSettings));

                // Update local state
                setSettings(branchSettings);


                return branchSettings;
            }
        } catch (error) {
            console.error("Error refetching sales settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    useEffect(() => {
        if (saleSettings) {
            setSettings(saleSettings)
        }
    }, [saleSettings])

    useEffect(() => {
        fetchAndUpdateSettings();
    }, [])

    /* ================================================================
       SAVE HANDLER — after success always refetch & update Redux
    ================================================================ */
    const handleSave = async () => {
        try {

            setSaving(true)
            const res = await axiosInstance.post(
                `update-sales-setting/${settings.SalesSettingsId}`,
                {
                    ...settings,
                    branchId: selectedBranchId
                }
            )

            if (!res.data.error) {

                showToast.success("Sales settings updated successfully")

                // ✅ Refetch & update Redux with fresh server data
                await fetchAndUpdateSettings();
            }
        } catch (error) {
            console.error("Error updating sales settings:", error)
            showToast.error("Failed to update sales settings")
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

    const handleSelectChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }))
    }

    useEffect(() => {
        fetchBankLedgers();
        fetchLedgerData();
    }, [])

    const fetchBankLedgers = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.post("bank-account-ledgers", {
                group_ids: [5],
                branchId: selectedBranchId
            });

            if (res.data && !res.data.error) {
                setBankLedger(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLedgerData = async () => {
        try {
            const response = await axiosInstance.get(`all-account-ledgers/${selectedBranchId}`);
            
            setLedgerData(response.data.data || []);
        } catch (error) {
            console.error("Error fetching ledgers:", error);
        }
    };

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#121212] transition-colors">
            <div className="flex-1 overflow-y-auto p-2 pb-20 space-y-2">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Sales Settings</h3>

                {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

                {/* Settings Table */}
                <div className="overflow-x-auto">
                    <table className="w-[50%]">
                        <tbody>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
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
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Product Details in Product Name Column</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showProductDetails}
                                        onCheckedChange={() => toggleSetting("showProductDetails")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Customer Balance In Print</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showCustomerBalanceBill}
                                        onCheckedChange={() => toggleSetting("showCustomerBalanceBill")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Size</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ShowSize}
                                        onCheckedChange={() => toggleSetting("ShowSize")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask for Confirmation When Adding Same Product</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.askConfirmationWithSameProduct}
                                        onCheckedChange={() => toggleSetting("askConfirmationWithSameProduct")}
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
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Product Stock Count</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showStockCount}
                                        onCheckedChange={() => toggleSetting("showStockCount")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Focus After Sales Rate</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.focusAfterSalesRate || ""}
                                        onValueChange={(value) => handleSelectChange('focusAfterSalesRate', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                                  border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="productName" className="text-gray-900 dark:text-gray-100 
                                                                                       hover:bg-blue-50 dark:hover:bg-blue-900/30">Product Name</SelectItem>
                                            <SelectItem value="barcode" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Barcode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Bank Account for Invoice Print</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.DefaultBankAccountForInvoicePrint || ""}
                                        onValueChange={(value) => handleSelectChange('DefaultBankAccountForInvoicePrint', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                      border-gray-500 dark:border-gray-600
                                      text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select Bank Account" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e]  border-gray-500 dark:border-gray-600">
                                            {bankLedger.length > 0 ? (
                                                bankLedger.map((ledger) => (
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
                                                    No Bank Accounts Available
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Grid Focusing Barcode To Next</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.GridFocusingBarcodeToNext || ""}
                                        onValueChange={(value) => handleSelectChange('GridFocusingBarcodeToNext', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                                  border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="ProductNameOnSameRow" className="text-gray-900 dark:text-gray-100 
                                                                                       hover:bg-blue-50 dark:hover:bg-blue-900/30">Product Name On Same Row</SelectItem>
                                            <SelectItem value="BarcodeInNextRow" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Barcode In Next Row</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Grid Focusing ProductName To Next</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.GridFocusingProductNameToNext || ""}
                                        onValueChange={(value) => handleSelectChange('GridFocusingProductNameToNext', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                                  border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="qty" className="text-gray-900 dark:text-gray-100 
                                                                                       hover:bg-blue-50 dark:hover:bg-blue-900/30">Qty Column</SelectItem>
                                            <SelectItem value="BarcodeInNextRow" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Barcode Column On Next Row</SelectItem>
                                            <SelectItem value="productNameInNextRow" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Product Name Column On Next Row</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Product LookUp Model</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.ProductLookUpModel || ""}
                                        onValueChange={(value) => handleSelectChange('ProductLookUpModel', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                                  border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="List" className="text-gray-900 dark:text-gray-100 
                                                                                       hover:bg-blue-50 dark:hover:bg-blue-900/30">List</SelectItem>
                                            <SelectItem value="Table" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Table</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Default Payment Mode</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.DefaultPaymentMode || ""}
                                        onValueChange={(value) => handleSelectChange('DefaultPaymentMode', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                                  border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="cash" className="text-gray-900 dark:text-gray-100 
                                                                                       hover:bg-blue-50 dark:hover:bg-blue-900/30">Cash</SelectItem>
                                            <SelectItem value="card" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Bank</SelectItem>
                                            <SelectItem value="credit" className="text-gray-900 dark:text-gray-100 
                                                                                   hover:bg-blue-50 dark:hover:bg-blue-900/30">Credit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ledger Pricing Alert</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.ledgerPricingAlert || ""}
                                        onValueChange={(value) => handleSelectChange('ledgerPricingAlert', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="always" className="text-gray-900 dark:text-gray-100 
                                                                                  hover:bg-blue-50 dark:hover:bg-blue-900/30">Always</SelectItem>
                                            <SelectItem value="cashCustomer" className="text-gray-900 dark:text-gray-100 
                                                                                        hover:bg-blue-50 dark:hover:bg-blue-900/30">Cash Customer</SelectItem>
                                            <SelectItem value="creditCustomer" className="text-gray-900 dark:text-gray-100 
                                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Credit Customer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ledger Pricing Alert Action</td>
                                <td className="px-4 py-3">
                                    <Select
                                        value={settings.ledgerPricingAlertAction || ""}
                                        onValueChange={(value) => handleSelectChange('ledgerPricingAlertAction', value)}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-[#242424] border-gray-500 dark:border-gray-600
                                                                  text-gray-900 dark:text-gray-100">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                                  border-gray-500 dark:border-gray-600">
                                            <SelectItem value="ignore" className="text-gray-900 dark:text-gray-100 
                                                                                  hover:bg-blue-50 dark:hover:bg-blue-900/30">Ignore</SelectItem>
                                            <SelectItem value="warn" className="text-gray-900 dark:text-gray-100 
                                                                                        hover:bg-blue-50 dark:hover:bg-blue-900/30">Warn</SelectItem>
                                            <SelectItem value="block" className="text-gray-900 dark:text-gray-100 
                                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Block</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
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
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Payment Grid in Sales Order</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showPaymentGridInSalesOrder}
                                        onCheckedChange={() => toggleSetting("showPaymentGridInSalesOrder")}
                                    />
                                </td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Additional Fields in Sales Invoice</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ShowAdditionalFieldsInSalesInvoice}
                                        onCheckedChange={() => toggleSetting("ShowAdditionalFieldsInSalesInvoice")}
                                    />
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Purchase Rate</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showPurchaserate}
                                        onCheckedChange={() => toggleSetting("showPurchaserate")}
                                    />
                                </td>
                            </tr>
                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
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

                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show PartNo</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ShowPartNo}
                                        onCheckedChange={() => toggleSetting("ShowPartNo")}
                                    />
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Sales Retention</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.ActivateSalesRetention}
                                        onCheckedChange={() => toggleSetting("ActivateSalesRetention")}
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
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Bill Profit</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showBillProfit}
                                        onCheckedChange={() => toggleSetting("showBillProfit")}
                                    />
                                </td>
                            </tr>

                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Bill Discount Amount</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showBillDiscountAmount}
                                        onCheckedChange={() => toggleSetting("showBillDiscountAmount")}
                                    />
                                </td>
                            </tr>

                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Bill Discount %</td>
                                <td className="px-4 py-3">
                                    <Checkbox
                                        className="border-gray-500 dark:border-gray-600 
                                                 data-[state=checked]:main-bg dark:data-[state=checked]:main-bg"
                                        checked={settings.showBillDiscountPerc}
                                        onCheckedChange={() => toggleSetting("showBillDiscountPerc")}
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
                <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}
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

export default SalesSettings