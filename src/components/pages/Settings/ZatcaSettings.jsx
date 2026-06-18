import React, { useEffect, useState } from 'react'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import TextInput from '@/components/elements/theme/TextInput'
import Preloader from '@/components/common/Preloader'
import AlertBox from '@/components/common/AlertBox'
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { useDispatch, useSelector } from "react-redux"
import { updateZatcaSettings } from "@/redux/slice/settingsSlice"
import Swal from 'sweetalert2'
import TextArea from '../../elements/theme/TextArea'
import { showToast } from '@/utils/toast'

const ZatcaSettings = () => {
    const { selectedBranchId, userId } = useAuth();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { zatcaSettings } = useSelector((state) => state.settings);

    const [formData, setFormData] = useState({
        profectionbinarytoken: '',
        privatekey: '',
        publickey: '',
        productionsecret: '',
        binarytoken: '',
        auth_binarysecuritytoken_pcsid: '',
        zatca_registrationid: null,
        PrevInvoiceHash: null
    });

    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Define visible fields with input type
    const visibleFields = [
        { name: 'profectionbinarytoken', label: 'Production Binary Token', type: 'textarea' },
        { name: 'privatekey', label: 'Private Key', type: 'textarea' },
        { name: 'publickey', label: 'Public Key', type: 'textarea' },
        { name: 'productionsecret', label: 'Production Secret', type: 'text' },
        { name: 'binarytoken', label: 'Binary Token', type: 'textarea' },
        { name: 'PrevInvoiceHash', label: 'Pre Invoice Hash', type: 'text' },
        { name: 'auth_binarysecuritytoken_pcsid', label: 'Auth Binary Security Token PCSID', type: 'textarea' },
    ];

    // Update formData when zatcaSettings from Redux changes
    useEffect(() => {
        if (zatcaSettings) {
            setFormData({
                profectionbinarytoken: zatcaSettings.profectionbinarytoken || '',
                privatekey: zatcaSettings.privatekey || '',
                publickey: zatcaSettings.publickey || '',
                productionsecret: zatcaSettings.productionsecret || '',
                binarytoken: zatcaSettings.binarytoken || '',
                auth_binarysecuritytoken_pcsid: zatcaSettings.auth_binarysecuritytoken_pcsid || '',
                PrevInvoiceHash: zatcaSettings.previnvoicehash || '',
                zatca_registrationid: zatcaSettings.zatca_registrationid || null
            });
        }
    }, [zatcaSettings]);

    /* ---------- API CALLS ---------- */

    // Fetch ZATCA settings
    const fetchZatcaSettings = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`zatca/${selectedBranchId}`);

            if (!res.data.error && res.data.data && res.data.data.length > 0) {
                const apiData = res.data.data[0];
                // Update Redux store with original API data
                dispatch(updateZatcaSettings(apiData));

                // Also update local state with formatted field names
                setFormData({
                    profectionbinarytoken: apiData.profectionbinarytoken || '',
                    privatekey: apiData.privatekey || '',
                    publickey: apiData.publickey || '',
                    productionsecret: apiData.productionsecret || '',
                    binarytoken: apiData.binarytoken || '',
                    auth_binarysecuritytoken_pcsid: apiData.auth_binarysecuritytoken_pcsid || '',
                    PrevInvoiceHash: apiData.previnvoicehash || '',
                    zatca_registrationid: apiData.zatca_registrationid || null
                });
            } else {
                // No data found - initialize with empty values
                setFormData({
                    profectionbinarytoken: '',
                    privatekey: '',
                    publickey: '',
                    productionsecret: '',
                    binarytoken: '',
                    auth_binarysecuritytoken_pcsid: '',
                    PrevInvoiceHash: '',
                    zatca_registrationid: null
                });
            }
        } catch (error) {
            console.error("Error fetching ZATCA settings:", error);
            // On error, reset to empty form
            setFormData({
                profectionbinarytoken: '',
                privatekey: '',
                publickey: '',
                productionsecret: '',
                binarytoken: '',
                auth_binarysecuritytoken_pcsid: '',
                PrevInvoiceHash: '',
                zatca_registrationid: null
            });
        } finally {
            setLoading(false);
        }
    };

    // Save/Update ZATCA settings
    const handleSave = async () => {
        try {
            setLoading(true);

            const payload = {
                ProfectionBinaryToken: formData.profectionbinarytoken,
                PrivateKey: formData.privatekey,
                PublicKey: formData.publickey,
                ProductionSecret: formData.productionsecret,
                BinaryToken: formData.binarytoken,
                Auth_BinarySecurityToken_PCSID: formData.auth_binarysecuritytoken_pcsid,
                PrevInvoiceHash: formData.PrevInvoiceHash,
                branchId: selectedBranchId,
                createdUser: userId
            };

            let response;

            response = await axiosInstance.post('zatca/store', payload);
            

            if (!response.data.error && response.data) {
             
                showToast.success(formData.zatca_registrationid
                    ? 'Settings updated successfully'
                    : 'Settings saved successfully');

                // Exit edit mode after successful save
                setIsEditMode(false);

                // Refresh data from API to get the latest state
                await fetchZatcaSettings();
            } else {
                showToast.error(response.data?.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error("Error saving ZATCA settings:", error);
            showToast.error(error.response?.data?.message || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    /* ---------- EFFECT ---------- */
    useEffect(() => {
        fetchZatcaSettings();
    }, [selectedBranchId]);

    /* ---------- HANDLERS ---------- */
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleBack = () => {
        // Add your back navigation logic here
    };

    const handleEditClick = () => {
        Swal.fire({
            title: 'Edit ZATCA Settings',
            text: 'Are you sure you want to edit the ZATCA settings?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsEditMode(true);
            }
        });
    };

    const handleCancelEdit = () => {
        // Reset form data to original values from Redux
        if (zatcaSettings) {
            setFormData({
                profectionbinarytoken: zatcaSettings.profectionbinarytoken || '',
                privatekey: zatcaSettings.privatekey || '',
                publickey: zatcaSettings.publickey || '',
                productionsecret: zatcaSettings.productionsecret || '',
                binarytoken: zatcaSettings.binarytoken || '',
                auth_binarysecuritytoken_pcsid: zatcaSettings.auth_binarysecuritytoken_pcsid || '',
                PrevInvoiceHash: zatcaSettings.previnvoicehash || '',
                zatca_registrationid: zatcaSettings.zatca_registrationid || null
            });
        }
        setIsEditMode(false);
    };

    // Render input based on field type
    const renderInput = (field) => {
        const commonProps = {
            name: field.name,
            value: formData[field.name] || '',
            onChange: handleChange,
            placeholder: `Enter ${field.label}`,
            className: `w-full bg-white dark:bg-[#242424] 
                       border-gray-500 dark:border-gray-600
                       text-gray-900 dark:text-gray-100
                       placeholder:text-gray-400 dark:placeholder:text-gray-500`,
            disabled: loading
        };

        if (field.type === 'text') {
            return <TextInput {...commonProps} />;
        }
        return <TextArea {...commonProps} />;
    };

    if (loading && !formData.zatca_registrationid && !formData.profectionbinarytoken) {
        return <div><Preloader /></div>;
    }

    return (
        <div className="p-2 space-y-4 bg-white dark:bg-[#121212] transition-colors">

            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    ZATCA Settings
                </h3>
                {!isEditMode && (
                    <Button
                        className="main-bg text-white"
                        onClick={handleEditClick}
                    >
                        Edit
                    </Button>
                )}
            </div>

            {/* Settings Table */}
            <div className="overflow-x-auto pb-25">
                <table className="w-full">
                    <tbody>
                        {visibleFields.map((field, index) => (
                            <tr
                                key={field.name}
                                className={`border-b border-gray-200 dark:border-gray-700 ${
                                    index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-[#1a1a1a]'
                                }`}
                            >
                                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 w-[200px]">
                                    {field.label}
                                </td>
                                <td className="px-4 py-3">
                                    {isEditMode ? (
                                        renderInput(field)
                                    ) : (
                                        <div className="text-gray-900 dark:text-gray-100 break-all">
                                            {formData[field.name] || '-'}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-gray-500 dark:border-gray-600 
                             text-gray-700 dark:text-gray-300 
                             hover:bg-gray-100 dark:hover:bg-[#242424]"
                >
                    Back
                </Button>
                {isEditMode && (
                    <>
                        <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="border-gray-500 dark:border-gray-600 
                                     text-gray-700 dark:text-gray-300 
                                     hover:bg-gray-100 dark:hover:bg-[#242424]"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="main-bg text-white"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ZatcaSettings;