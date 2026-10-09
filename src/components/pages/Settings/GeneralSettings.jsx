import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState, useCallback } from "react"
import axiosInstance from "@/lib/axiosConfig"
import AlertBox from "@/components/common/AlertBox"
import { useDispatch, useSelector } from "react-redux"
import { updateGeneralSettings } from "@/redux/slice/settingsSlice"
import Preloader from "@/components/common/Preloader"
import useAuth from "@/redux/hook/auth/useAuth"
import { X } from "lucide-react"
import { showToast } from "@/utils/toast"
import { getSystemId } from "@/utils/systemId"
import PasswordModal from "./PasswordModal"

// ========== FIXED IMAGE DIMENSIONS ==========
const HEADER_WIDTH = 794;
const HEADER_HEIGHT = 192;
const FOOTER_WIDTH = 794;
const FOOTER_HEIGHT = 96;
const LETTERPAD_WIDTH = 794;
const LETTERPAD_HEIGHT = 1123;

/**
 * Resize image to exact fixed dimensions (stretches to fill)
 */
const resizeImageToFixedSize = (file, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob((blob) => {
                if (blob) {
                    const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.png'), {
                        type: 'image/png',
                        lastModified: Date.now(),
                    });

                    resolve({
                        file: resizedFile,
                        previewUrl: URL.createObjectURL(blob)
                    });
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/png', 1.0);

            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
    });
};

const GeneralSettings = () => {
    const [branchHeader, setBranchHeader] = useState(null)
    const [branchFooter, setBranchFooter] = useState(null)
    const [companyLetterPad, setCompanyLetterPad] = useState(null)
    const [branchHeaderFile, setBranchHeaderFile] = useState(null)
    const [branchFooterFile, setBranchFooterFile] = useState(null)
    const [companyLetterPadFile, setCompanyLetterPadFile] = useState(null)
    const [removeHeader, setRemoveHeader] = useState(false)
    const [removeFooter, setRemoveFooter] = useState(false)
    const [ledger, setLedger] = useState(null)

    const [loading, setLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);
    const orgData = useSelector((state) => state.organization.organizationData);
   
    
    const [settings, setSettings] = useState(generalSettings || {});
    const { selectedBranchId } = useAuth()
    const dispatch = useDispatch()

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
    }, [])

    /* ================================================================
       REFETCH GENERAL SETTINGS & UPDATE REDUX
       Called after every successful save / remove operation
    ================================================================ */
    const fetchAndUpdateSettings = useCallback(async () => {
        try {
            const response = await axiosInstance.get('general-settings');

            if (!response.error && response?.data?.data?.length > 0) {
                const branchSettings = response.data.data.find(
                    (item) => Number(item.branchId) === Number(selectedBranchId)
                ) || {};

                // Update Redux store
                dispatch(updateGeneralSettings(branchSettings));

                // Update local state
                setSettings(branchSettings);
                setBranchHeader(branchSettings.branchHeader || null);
                setBranchFooter(branchSettings.branchFooter || null);
                setCompanyLetterPad(branchSettings.CompanyLetterPad || null);

                // Reset file states
                setBranchHeaderFile(null);
                setBranchFooterFile(null);
                setCompanyLetterPadFile(null);

                return branchSettings;
            }
        } catch (error) {
            console.error("Error refetching general settings:", error);
        }
        return null;
    }, [selectedBranchId, dispatch]);

    useEffect(() => {
        if (generalSettings) {
            setSettings(generalSettings)
            if (generalSettings.branchHeader) {
                setBranchHeader(generalSettings.branchHeader)
            }
            if (generalSettings.branchFooter) {
                setBranchFooter(generalSettings.branchFooter)
            }
            if (generalSettings.CompanyLetterPad) {
                setCompanyLetterPad(generalSettings.CompanyLetterPad)
            }
        }
    }, [generalSettings])

    // ========== IMAGE HANDLER WITH AUTO-RESIZE ==========
    const handleImageChange = async (e, setImage, setFile, type = 'header') => {
        const file = e.target.files[0];
        if (file) {
            try {
                const targetWidth = type === 'header' ? HEADER_WIDTH
                    : type === 'footer' ? FOOTER_WIDTH
                        : LETTERPAD_WIDTH;
                const targetHeight = type === 'header' ? HEADER_HEIGHT
                    : type === 'footer' ? FOOTER_HEIGHT
                        : LETTERPAD_HEIGHT;

                const result = await resizeImageToFixedSize(file, targetWidth, targetHeight);

                setImage(result.previewUrl);
                setFile(result.file);

                if (type === 'header') {
                    setRemoveHeader(false);
                } else if (type === 'footer') {
                    setRemoveFooter(false);
                }
            } catch (error) {
                console.error('Error resizing image:', error);
                setImage(URL.createObjectURL(file));
                setFile(file);
            }
        }
    };

    // ========== REMOVE IMAGE HANDLERS ==========
    const handleRemoveHeader = async () => {
        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `remove-files/${settings.generalSettingsId}/image/header`
            );

            if (!response.error) {
                setBranchHeader(null);
                setBranchHeaderFile(null);
                setRemoveHeader(false);

                const fileInput = document.getElementById('header-file-input');
                if (fileInput) fileInput.value = '';

                // Refetch & update Redux
                await fetchAndUpdateSettings();

                showToast.success("Header image removed successfully");
            }
        } catch (error) {
            console.error("Error removing header:", error);
            showToast.error("Failed to remove header image");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFooter = async () => {
        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `remove-files/${settings.generalSettingsId}/image/footer`
            );

            if (!response.error) {
                setBranchFooter(null);
                setBranchFooterFile(null);
                setRemoveFooter(false);

                const fileInput = document.getElementById('footer-file-input');
                if (fileInput) fileInput.value = '';

                // Refetch & update Redux
                await fetchAndUpdateSettings();

                showToast.success("Footer image removed successfully");
            }
        } catch (error) {
            console.error("Error removing footer:", error);
            showToast.error("Failed to remove footer image");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLetterPad = async () => {
        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `remove-files/${settings.generalSettingsId}/image/letterpad`
            );

            if (!response.error) {
                setCompanyLetterPad(null);
                setCompanyLetterPadFile(null);

                const fileInput = document.getElementById('letterpad-file-input');
                if (fileInput) fileInput.value = '';

                // Refetch & update Redux
                await fetchAndUpdateSettings();

                showToast.success("Letter pad image removed successfully");
            }
        } catch (error) {
            console.error("Error removing letter pad:", error);
            showToast.error("Failed to remove letter pad image");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedgers();
    }, [])

    const fetchLedgers = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.post("bank-account-ledgers", {
                group_ids: [14],
                branchId: selectedBranchId
            });

            if (res.data && !res.data.error) {
                setLedger(res.data.data);
            } else {
                console.error("API Error:", res.data.message);
            }
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (field, checked) => {
        setSettings(prev => ({
            ...prev,
            [field]: checked
        }));
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

    /**
     * Check if password verification is still valid
     */
    const isPasswordVerified = () => {
        const auth = localStorage.getItem('settings_auth');

        if (!auth) return false

        try {
            const { verified, expiry } = JSON.parse(auth)
            const now = new Date().getTime()

            if (verified && expiry > now) {
                return true
            } else {
                // Remove expired verification
                localStorage.removeItem('settings_auth')
                return false
            }
        } catch (error) {
            localStorage.removeItem('settings_auth')
            return false
        }
    }

    /**
     * Handle Save Button Click - Check password first
     */
    const handleSaveClick = () => {
        if (isPasswordVerified()) {
            // Password already verified and not expired
            performSave()
        } else {
            // Show password modal
            setShowPasswordModal(true)
            setPendingSave(true)
        }
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
            setLoading(true);

            const payload = {};

            Object.keys(settings).forEach((key) => {
                if (
                    key !== "branchHeader" &&
                    key !== "branchFooter" &&
                    key !== "CompanyLetterPad" &&
                    key !== "generalSettingsId"
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
            payload.systemId = systemId;

            let response;

            // ─── With file uploads (FormData) ───
            if (branchHeaderFile || branchFooterFile || companyLetterPadFile) {
                const formData = new FormData();

                Object.keys(payload).forEach((key) => {
                    formData.append(key, payload[key]);
                });

                if (branchHeaderFile) {
                    formData.append("branchHeader", branchHeaderFile);
                }

                if (branchFooterFile) {
                    formData.append("branchFooter", branchFooterFile);
                }

                if (companyLetterPadFile) {
                    formData.append("CompanyLetterPad", companyLetterPadFile);
                }

                response = await axiosInstance.post(
                    `update-general-setting/${settings.generalSettingsId}`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );
            } else {
                // ─── Without file uploads (JSON) ───
                response = await axiosInstance.post(
                    `update-general-setting/${settings.generalSettingsId}`,
                    payload,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            if (!response.error) {
                showToast.success("Settings updated successfully");

                // ✅ Always refetch general-settings & update Redux after save
                await fetchAndUpdateSettings();
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    if (loading && Object.keys(settings).length === 0) {
        return <div><Preloader /></div>
    }

    return (
        <div className="p-2 space-y-4 bg-white dark:bg-[#121212] transition-colors">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">General Settings</h3>

            {/* Password Modal */}
            <PasswordModal
                open={showPasswordModal}
                onOpenChange={setShowPasswordModal}
                onConfirm={handlePasswordConfirm}
            />

            {/* Settings Table */}
            <div className="overflow-x-auto pb-25">
                <table className="w-[50%]">
                    <tbody>
                        {/* Basic Settings */}
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 w-[400px]">Activate Tax</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="activateTax"
                                    checked={settings.ActivateTax || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('ActivateTax', checked)}
                                />
                            </td>
                        </tr>
                      {orgData?.subscriptionPlan!='Basic'&&(
                         <>
                          <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Cost Centre</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="activateCostCentre"
                                    checked={settings.costCentre || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('costCentre', checked)}
                                />
                            </td>
                        </tr>
                         <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Accounts Posting</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="activateAccountsPosting"
                                    checked={settings.AccountPosting || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('AccountPosting', checked)}
                                />
                            </td>
                        </tr>
                         </>
                      )}
                       
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tax Included</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="taxIncluded"
                                    checked={settings.taxincluded || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('taxincluded', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tax and Cess Included</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="taxAndCessIncluded"
                                    checked={settings.taxCessincluded || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('taxCessincluded', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate RoundOff</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="activateRoundOff"
                                    checked={settings.RoundOff === 1}
                                    onCheckedChange={(checked) => handleCheckboxChange('RoundOff', checked ? 1 : 0)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Currency Prefix in Print</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="showCurrencyPrefix"
                                    checked={settings.showCurrencyprefix || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showCurrencyprefix', checked)}
                                />
                            </td>
                        </tr>

                        <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan="2">
                                Ask Confirmation
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Save</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmSave"
                                    checked={settings.askConfirmationSave || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationSave', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Edit</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmEdit"
                                    checked={settings.askConfirmationEdit || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationEdit', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Delete</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmDelete"
                                    checked={settings.askConfirmationDelete || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationDelete', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Clear</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmClear"
                                    checked={settings.askConfirmationClear || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationClear', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Row Remove</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmRowRemove"
                                    checked={settings.askConfirmationRowRemove || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationRowRemove', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Print</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmPrint"
                                    checked={settings.askConfirmationPrint || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationPrint', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ask Confirmation - Close</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="confirmClose"
                                    checked={settings.askConfirmationClose || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('askConfirmationClose', checked)}
                                />
                            </td>
                        </tr>

                        {/* Dropdown Settings */}
                        <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan="2">
                                Configuration Settings
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activate Van Sale</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="activateVanSale"
                                    checked={settings.activateVanSale || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('activateVanSale', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Show Current Day Cash balance In Dashboard</td>
                            <td className="px-4 py-3">
                                <Checkbox
                                    className='border-gray-500 dark:border-gray-600 
                                             data-[state=checked]:main-bg dark:data-[state=checked]:main-bg'
                                    id="showCurrentDayCashbalanceInDashboard"
                                    checked={settings.showCurrentDayCashbalanceInDashboard || false}
                                    onCheckedChange={(checked) => handleCheckboxChange('showCurrentDayCashbalanceInDashboard', checked)}
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Negative Cash Transaction Alert</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.negativeCashTransaction || ""}
                                    onValueChange={(value) => handleSelectChange('negativeCashTransaction', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Allow" className="text-gray-900 dark:text-gray-100 
                                                                           hover:bg-blue-50 dark:hover:bg-blue-900/30">Allow</SelectItem>
                                        <SelectItem value="Warn" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Warn</SelectItem>
                                        <SelectItem value="Block" className="text-gray-900 dark:text-gray-100 
                                                                           hover:bg-blue-50 dark:hover:bg-blue-900/30">Block</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Form Type</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.formType || ""}
                                    onValueChange={(value) => handleSelectChange('formType', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Tax Invoice" className="text-gray-900 dark:text-gray-100 
                                                                           hover:bg-blue-50 dark:hover:bg-blue-900/30">Tax Invoice</SelectItem>
                                        <SelectItem value="Retail Invoice" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Retail Invoice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Account Calculation Method</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.AccountCalculationMethod || ""}
                                    onValueChange={(value) => handleSelectChange('AccountCalculationMethod', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="CrDr" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">CrDr</SelectItem>
                                        <SelectItem value="Negative" className="text-gray-900 dark:text-gray-100 
                                                                          hover:bg-blue-50 dark:hover:bg-blue-900/30">Negative</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Decimal Part</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Enter decimal part"
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    value={settings.decimalPart || 0}
                                    onChange={(e) => handleInputChange('decimalPart', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Application Date Format</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.dateformat || ""}
                                    onValueChange={(value) => handleSelectChange('dateformat', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="dd-MM-yyyy" className="text-gray-900 dark:text-gray-100 
                                                                                 hover:bg-blue-50 dark:hover:bg-blue-900/30">DD-MM-YYYY</SelectItem>
                                        <SelectItem value="MM-dd-yyyy" className="text-gray-900 dark:text-gray-100 
                                                                                 hover:bg-blue-50 dark:hover:bg-blue-900/30">MM-DD-YYYY</SelectItem>
                                        <SelectItem value="yyyy-MM-dd" className="text-gray-900 dark:text-gray-100 
                                                                                 hover:bg-blue-50 dark:hover:bg-blue-900/30">YYYY-MM-DD</SelectItem>
                                        <SelectItem value="yyyy-dd-MM" className="text-gray-900 dark:text-gray-100 
                                                                                 hover:bg-blue-50 dark:hover:bg-blue-900/30">YYYY-DD-MM</SelectItem>
                                        <SelectItem value="dd-yyyy-MM" className="text-gray-900 dark:text-gray-100 
                                                                                 hover:bg-blue-50 dark:hover:bg-blue-900/30">DD-YYYY-MM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tax Type</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.taxType || ""}
                                    onValueChange={(value) => handleSelectChange('taxType', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Applicable to product" className="text-gray-900 dark:text-gray-100 
                                                                         hover:bg-blue-50 dark:hover:bg-blue-900/30">Applicable to product</SelectItem>
                                        <SelectItem value="NA" className="text-gray-900 dark:text-gray-100 
                                                                         hover:bg-blue-50 dark:hover:bg-blue-900/30">NA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Zatca Type</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.zatcaType || ""}
                                    onValueChange={(value) => handleSelectChange('zatcaType', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        <SelectItem value="Phase 1" className="text-gray-900 dark:text-gray-100 
                                                                             hover:bg-blue-50 dark:hover:bg-blue-900/30">Phase 1</SelectItem>
                                        <SelectItem value="Phase 2" className="text-gray-900 dark:text-gray-100 
                                                                             hover:bg-blue-50 dark:hover:bg-blue-900/30">Phase 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>

                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Round Off Digit</td>
                            <td className="px-4 py-3">
                                <Input
                                    type="text"
                                    placeholder="Enter round off digit"
                                    className="w-full bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    value={settings.RoundOffDigit || 0}
                                    onChange={(e) => handleInputChange('RoundOffDigit', parseInt(e.target.value) || 0)}
                                />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Selected Tax Ledger</td>
                            <td className="px-4 py-3">
                                <Select
                                    value={settings.taxLedgerId || ""}
                                    onValueChange={(value) => handleSelectChange('taxLedgerId', value)}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-[#242424] 
                                                              border-gray-500 dark:border-gray-600
                                                              text-gray-900 dark:text-gray-100">
                                        <SelectValue placeholder="Select Tax Ledger" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1e1e1e] 
                                                             border-gray-500 dark:border-gray-600">
                                        {ledger && ledger.length > 0 ? (
                                            ledger.map((item) => (
                                                <SelectItem
                                                    key={item.ledgerId}
                                                    value={item.ledgerId}
                                                    className="text-gray-900 dark:text-gray-100 
                                                             hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                >
                                                    {item.ledgerName}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-ledger" disabled className="text-gray-500 dark:text-gray-400">
                                                No ledgers available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </td>
                        </tr>

                        {/* File Upload Settings */}
                        <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan="2">
                                Images
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                Branch Header
                            </td>
                            <td className="px-4 py-3">
                                <Input
                                    id="header-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, setBranchHeader, setBranchHeaderFile, 'header')}
                                    className="w-full mb-2 bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             file:bg-gray-100 dark:file:bg-[#1a1a1a]
                                             file:text-gray-700 dark:file:text-gray-300
                                             file:border-gray-300 dark:file:border-gray-600"
                                />
                                {branchHeader && (
                                    <div className="relative inline-block">
                                        <img
                                            src={branchHeader}
                                            alt="Branch Header Preview"
                                            className="h-16 rounded border border-gray-300 dark:border-gray-600 object-cover"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={handleRemoveHeader}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                Branch Footer
                            </td>
                            <td className="px-4 py-3">
                                <Input
                                    id="footer-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, setBranchFooter, setBranchFooterFile, 'footer')}
                                    className="w-full mb-2 bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             file:bg-gray-100 dark:file:bg-[#1a1a1a]
                                             file:text-gray-700 dark:file:text-gray-300
                                             file:border-gray-300 dark:file:border-gray-600"
                                />
                                {branchFooter && (
                                    <div className="relative inline-block">
                                        <img
                                            src={branchFooter}
                                            alt="Branch Footer Preview"
                                            className="h-16 rounded border border-gray-300 dark:border-gray-600 object-cover"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={handleRemoveFooter}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                Company Letter Pad
                            </td>
                            <td className="px-4 py-3">
                                <Input
                                    id="letterpad-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, setCompanyLetterPad, setCompanyLetterPadFile, 'letterpad')}
                                    className="w-full mb-2 bg-white dark:bg-[#242424] 
                                             border-gray-500 dark:border-gray-600
                                             text-gray-900 dark:text-gray-100
                                             file:bg-gray-100 dark:file:bg-[#1a1a1a]
                                             file:text-gray-700 dark:file:text-gray-300
                                             file:border-gray-300 dark:file:border-gray-600"
                                />
                                {companyLetterPad && (
                                    <div className="relative inline-block">
                                        <img
                                            src={companyLetterPad}
                                            alt="Company Letter Pad Preview"
                                            className="h-16 rounded border border-gray-300 dark:border-gray-600 object-cover"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={handleRemoveLetterPad}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                <Button
                    className="main-bg text-white"
                    onClick={handleSaveClick}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </div>
    )
}

export default GeneralSettings