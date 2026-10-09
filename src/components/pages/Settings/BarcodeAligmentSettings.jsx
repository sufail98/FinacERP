import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosConfig"
import { useDispatch, useSelector } from "react-redux"
import { updateBarcodeAlignmentSettings } from "@/redux/slice/settingsSlice"
import Preloader from "@/components/common/Preloader"
import useAuth from "@/redux/hook/auth/useAuth"
import { showToast } from "@/utils/toast"
import { Checkbox } from "@/components/ui/checkbox"


const BarcodeAligmentSettings = () => {
    const [loading, setLoading] = useState(false);
    const { barcodeAlignmentSettings } = useSelector((state) => state.settings);

    const [settings, setSettings] = useState(barcodeAlignmentSettings || {});
    const [isEditable, setIsEditable] = useState(false); // 🔒 read-only by default
    const { selectedBranchId } = useAuth()
    const dispatch = useDispatch()

    const handleBack = () => {
    }

    /* ================================================================
       ALT + F10 TOGGLE — switches between read-only and editable mode
    ================================================================ */
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'F10') {
                e.preventDefault();
                setIsEditable(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    /* ================================================================
       REFETCH GENERAL SETTINGS & UPDATE REDUX
       Called after every successful save / remove operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`get-all-barcodesettings/${selectedBranchId}`);

            if (!response.error && response?.data?.data?.length > 0) {
                const barcodeSetings = response.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updateBarcodeAlignmentSettings(barcodeSetings));

                // Update local state
                return barcodeSetings;
            }
        } catch (error) {
            console.error("Error refetching general settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    useEffect(() => {
        if (barcodeAlignmentSettings) {
            setSettings(barcodeAlignmentSettings)
        }
    }, [barcodeAlignmentSettings])


    const handleCheckboxChange = (field, checked) => {
        if (!isEditable) return;
        setSettings(prev => ({
            ...prev,
            [field]: checked
        }));
    }
    const handleInputChange = (field, value) => {
        if (!isEditable) return;
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    }

    /* ================================================================
       SAVE HANDLER — after success always refetch & update Redux
    ================================================================ */
    const handleSave = async () => {
        try {
            setLoading(true);

            const payload = {};

            Object.keys(settings).forEach((key) => {
                if (
                    key !== "Id"
                ) {
                    let value = settings[key];

                    if (typeof value === "boolean") {
                        payload[key] = value;
                    } else if (value === null && key.includes("askConfirmation")) {
                        payload[key] = false;
                    } else {
                        payload[key] = value;
                    }
                }
            });

            payload.branchId = selectedBranchId;

            let response;

            response = await axiosInstance.post(
                `update-barcode-setting/${settings.Id || ''}`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.error) {
                showToast.success("Settings updated successfully");

                // ✅ Always refetch general-settings & update Redux after save
                await fetchAndUpdateSettings();

                // Optional: lock back to read-only after successful save
                setIsEditable(false);
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };
    const SectionHeading = ({ title }) => (
        <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan="2">
                {title}
            </td>
        </tr>
    )

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    return (
        <div className="p-2 space-y-4 bg-white dark:bg-[#121212] transition-colors">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Barcode Settings</h3>
                <span className={`text-xs px-2 py-1 rounded ${isEditable
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                </span>
            </div>

            {/* Settings Table */}
            <div className="overflow-x-auto pb-25">
                <table className="w-[50%]">
                    <tbody>
                        <SectionHeading title="Alignment Settings" />
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Left Margin</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Left Margin"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.PaddingLeft || 0}
                                    onChange={(e) => handleInputChange('PaddingLeft', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Right Margin</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Right Margin"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.PaddingRight || 0}
                                    onChange={(e) => handleInputChange('PaddingRight', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Top Margin</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Top Margin"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.PaddingTop || 0}
                                    onChange={(e) => handleInputChange('PaddingTop', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Bottom Margin</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Bottom Margin"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.PaddingBottom || 0}
                                    onChange={(e) => handleInputChange('PaddingBottom', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Print Height</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Print Height"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.height || 0}
                                    onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Print Width</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Print Width"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.width || 0}
                                    onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <SectionHeading title="Other Details" />
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Company Name</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Company Name"
                                    disabled={!isEditable}
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                                             disabled:opacity-70 disabled:cursor-not-allowed"
                                    value={settings.branchName || ''}
                                    onChange={(e) => handleInputChange('branchName', e.target.value)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Company Name</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    disabled={!isEditable}
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg
                                             disabled:opacity-70 disabled:cursor-not-allowed'
                                    id="showBranchName"
                                    checked={settings.showBranchName || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showBranchName', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Price</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    disabled={!isEditable}
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg
                                             disabled:opacity-70 disabled:cursor-not-allowed'
                                    id="showPrice"
                                    checked={settings.showPrice || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showPrice', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Product Name</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    disabled={!isEditable}
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg
                                             disabled:opacity-70 disabled:cursor-not-allowed'
                                    id="showProductName"
                                    checked={settings.showProductName || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showProductName', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Barcode</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    disabled={!isEditable}
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg
                                             disabled:opacity-70 disabled:cursor-not-allowed'
                                    id="showBarCode"
                                    checked={settings.showBarCode || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showBarCode', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Supplier Code</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    disabled={!isEditable}
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg
                                             disabled:opacity-70 disabled:cursor-not-allowed'
                                    id="showSupplierCode"
                                    checked={settings.showSupplierCode || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showSupplierCode', checked)}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Action Buttons - Save only shows in edit mode */}
            {isEditable && (
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
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default BarcodeAligmentSettings