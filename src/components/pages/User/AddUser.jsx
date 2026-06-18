import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, User, Plus, SaveAll, Eraser } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import useBranches from "@/redux/hook/branch/useFetchBranchBranches";
import Preloader from "@/components/common/Preloader";
import useUserGroups from "@/redux/hook/userGroup/useFetchUserGroup";
import ErrorPage from "@/components/common/ErrorPage";
import useCtrlSave from "@/lib/hooks/useCtrlSave";
import SaveText from "@/components/common/SaveText";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import ShadCnSelect from "@/components/elements/theme/ShadCnSelect";
import useAuth from "@/redux/hook/auth/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { showToast } from "@/utils/toast";

const AddUser = () => {
    const { userId } = useParams();
    const EditMode = Boolean(userId);
    const [alert, setAlert] = useState(null);
    const navigate = useNavigate();
    const { t } = useTranslation();

    //StoreDatas
    const { branchList, branchListLoading, branchListError } = useBranches();

    const { userGroupList, userGroupLoading, userGroupError } = useUserGroups();
    const { selectedBranchId } = useAuth();
    const { generalSettings } = useSelector((state) => state.settings);

    const [formData, setFormData] = useState({
        brachId: selectedBranchId,
        userName: "",
        password: "",
        phoneNo: "",
        email: "",
        profilePhoto: null,
        narration: "",
        branchIds: [],
        userRoleId: "",
        ActiveStatus: 1,
    });

    const [errors, setErrors] = useState({});
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{10,15}$/;
        return phoneRegex.test(phone.replace(/\s+/g, ''));
    };

    const validateUsername = (username) => {
        // Username should be at least 3 characters and contain only letters, numbers, and underscores
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    };

    // const validatePassword = (password) => {
    //     // Password should be at least 6 characters
    //     return password.length >= 6;
    // };

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (!formData.userName.trim()) {
            newErrors.userName = t('userList.form.form.errors.userName');
        } else if (!validateUsername(formData.userName)) {
            newErrors.userName = t('userList.form.form.errors.userNameInvalid');
        }

        // Password validation (only for new users or if password is being changed in edit mode)
        if (!EditMode) {
            if (!formData.password.trim()) {
                newErrors.password = t('userList.form.form.errors.password');
            } 
        }

        // Phone validation
        if (!formData.phoneNo.trim()) {
            newErrors.phoneNo = t('userList.form.form.errors.phoneNo');
        } else if (!validatePhone(formData.phoneNo)) {
            newErrors.phoneNo = t('userList.form.form.errors.phoneNoInvalid');
        }

        // Email validation
        if (!formData.email?.trim()) {
            newErrors.email = t('userList.form.form.errors.email');
        } else if (!validateEmail(formData.email)) {
            newErrors.email = t('userList.form.form.errors.emailInvalid');
        }

        // User role validation
        if (!formData.userRoleId) {
            newErrors.userRoleId = t('userList.form.form.errors.userRole');
        }

        // Branch validation
        if (formData.branchIds.length === 0) {
            newErrors.branchIds = t('userList.form.form.errors.branches');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };
    const handleBlur = (e) => {
        const { name, value } = e.target;
        const newErrors = { ...errors };

        switch (name) {
            case 'userName':
                if (!value.trim()) {
                    newErrors.userName = t('userList.form.form.errors.userName');
                } else if (!validateUsername(value)) {
                    newErrors.userName = t('userList.form.form.errors.userNameInvalid');
                } else {
                    delete newErrors.userName;
                }
                break;

            // case 'password':
            //     if (!EditMode && !value.trim()) {
            //         newErrors.password = t('userList.form.form.errors.password');
            //     } else if (value && !validatePassword(value)) {
            //         newErrors.password = t('userList.form.form.errors.passwordInvalid');
            //     } else {
            //         delete newErrors.password;
            //     }
            //     break;

            case 'phoneNo':
                if (!value.trim()) {
                    newErrors.phoneNo = t('userList.form.form.errors.phoneNo');
                } else if (!validatePhone(value)) {
                    newErrors.phoneNo = t('userList.form.form.errors.phoneNoInvalid');
                } else {
                    delete newErrors.phoneNo;
                }
                break;

            case 'email':
                if (!value.trim()) {
                    newErrors.email = t('userList.form.form.errors.email');
                } else if (!validateEmail(value)) {
                    newErrors.email = t('userList.form.form.errors.emailInvalid');
                } else {
                    delete newErrors.email;
                }
                break;

            default:
                break;
        }

        setErrors(newErrors);
    };
    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error for this field when user makes selection
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleBranchToggle = (branchId) => {
        setFormData((prev) => {
            const exists = prev.branchIds.includes(branchId);
            const newBranchIds = exists
                ? prev.branchIds.filter((id) => id !== branchId)
                : [...prev.branchIds, branchId];

            // Clear branch error if branches are selected
            if (newBranchIds.length > 0 && errors.branchIds) {
                setErrors(prevErrors => ({ ...prevErrors, branchIds: "" }));
            }

            return {
                ...prev,
                branchIds: newBranchIds,
            };
        });
    };

    useEffect(() => {
        if (EditMode) {
            getUserDetailsById()
        }
    }, [])

    const getUserDetailsById = async () => {
        try {
            const response = await axiosInstance.get(`get-user-byId/${userId}`);
            if (!response.data.error) {
                const userdata = response?.data?.data

                setFormData({
                    userName: userdata.userName,
                    password: "",
                    phoneNo: userdata.phoneNo,
                    email: userdata.email,
                    profilePhoto: null,
                    narration: userdata.Narration,
                    branchIds: userdata.branchIds,
                    userRoleId: userdata.UserRoleId,
                    ActiveStatus: userdata.ActiveStatus, // ✅ add this line
                });
                setPhotoPreview(userdata.profilePhoto);
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
        
            showToast.error(t('userList.alerts.fetchError'));
        }
    }

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (200KB = 200 * 1024 bytes)
            const maxSize = 200 * 1024; // 200KB in bytes

            if (file.size > maxSize) {
                showToast.error(t('userList.form.form.errors.imageSizeLimit'));
                e.target.value = ''; // Clear the input
                return;
            }

            // Check file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
              showToast.error(t('userList.form.form.errors.imageTypeInvalid'));
                e.target.value = ''; // Clear the input
                return;
            }

            setFormData((prev) => ({ ...prev, profilePhoto: file }));
            const reader = new FileReader();
            reader.onload = (e) => setPhotoPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };
    const handleSubmit = async (e) => {
        e?.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            showToast.error(t('pleaseFillRequiredFieldMsg'));
            return;
        }

        if (EditMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t('ConfirmUpdateTitle'),
                text: t('ConfirmUpdateText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesUpdate'),
                cancelButtonText: t('Cancel'),
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.cssText += '; z-index: 2147483647 !important;';
                }
            });
            if (!result.isConfirmed) return;
        } else if (!EditMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel'),
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.cssText += '; z-index: 2147483647 !important;';
                }
            });
            if (!result.isConfirmed) return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append("userName", formData.userName);

            // Only append password for new users or if it's changed
            if (!EditMode || formData.password) {
                data.append("Password", formData.password);
            }

            data.append("phoneNo", formData.phoneNo);
            data.append("email", formData.email);

            if (formData.profilePhoto) {
                data.append("profilePhoto", formData.profilePhoto);
            }

            data.append("Narration", formData.narration);
            formData.branchIds.forEach((id) => data.append("branchIds[]", id));
            data.append("UserRoleId", formData.userRoleId);
              data.append("ActiveStatus", formData.ActiveStatus); 

            if (EditMode) {
                data.append("UpdatedUser", userId); // For updates
            } else {
                data.append("CreatedUser", userId); // For new users
            }
            // Use different endpoints for create vs update
            const apiUrl = EditMode ? `update-user/${userId}` : "save-user";
            const method = "post";

            const response = await axiosInstance[method](apiUrl, data, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (!response.data.error) {
                showToast.success(EditMode ? t('userList.alerts.updateSuccess') : t('userList.alerts.saveSuccess'));

                if (!EditMode) {
                    handleReset();
                }

                // Navigate after a short delay to show the success message
                setTimeout(() => {
                    navigate('/user/users-list');
                }, 100);
            } else {
                showToast.error(response.data.message || t('userList.alerts.saveError'));
            }

        } catch (error) {
            console.error("Error saving user:", error);
            showToast.error(error.response?.data?.message || t('userList.alerts.saveError'));
        } finally {
            setLoading(false);
        }
    };

    useCtrlSave(handleSubmit, [formData], loading);

    const handleReset = () => {
        if (EditMode) {
            // In edit mode, reset to original values
            getUserDetailsById();
        } else {
            // In add mode, reset to empty form
            setFormData({
                userName: "",
                password: "",
                phoneNo: "",
                email: "",
                profilePhoto: null,
                narration: "",
                branchIds: [],
                userRoleId: "",
            });
            setPhotoPreview(null);
        }
        setErrors({}); // Clear all errors
    };

    if (branchListError || userGroupError) {
        return <div>
            <BreadCrumb
                routes={[
                    { title: t('userList.breadcrumb.user'), url: "/user/users-list" },
                    { title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'), url: "#" },
                ]}
                heading={{
                    icon: User,
                    title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'),
                }}

            />
            <ErrorPage message={branchListError || userGroupError} />
        </div>
    }


    if (branchListLoading || userGroupLoading) {
        return <div>
            <BreadCrumb
                routes={[
                    { title: t('userList.breadcrumb.user'), url: "/user/users-list" },
                    { title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'), url: "#" },
                ]}
                heading={{
                    icon: User,
                    title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'),
                }}
               
            />
            <Preloader />
        </div>
    }

    return (
        <div className="h-auto w-full">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t('userList.breadcrumb.user'), url: "/user/users-list" },
                    { title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'), url: "#" },
                ]}
                heading={{
                    icon: User,
                    title: EditMode ? t('userList.form.editTitle') : t('userList.form.title'),
                }}
               actions={[

                    {
                        label: EditMode ? t('userList.form.actions.reset') : t('userList.form.actions.cancel'),
                        icon:Eraser,
                        type: "secondary",
                        onClick: handleReset
                    },
                    {
                        label: loading ?
                            (EditMode ? t('userList.form.actions.updating') : t('userList.form.actions.saving')) :
                            (EditMode ? t('userList.form.actions.update') : t('userList.form.actions.submit')),
                        icon: SaveAll,
                        type: "primary",
                        onClick: handleSubmit,
                        disabled: loading,
                        loading: loading,
                    },
                ]}
            />
            {/* ✅ Form Card */}
            <Card className="w-full mx-auto p-2 border-none shadow-none">
                <CardContent className="px-0 sm:px-2 pb-2">
                    <div className="space-y-4">
                        {/* UserName + Password */}
                        <div className={`grid grid-cols-1 ${!EditMode ? "sm:grid-cols-2" : ""} gap-4`}>
                            <TextInput
                                id='userName'
                                name="userName"
                                label={t('userList.form.form.userName')}
                                value={formData.userName}
                                onChange={handleInputChange}
                                placeholder={t('userList.form.form.placeholders.userName')}
                                error={errors.userName}
                                onBlur={handleBlur}
                                required
                            />

                            {!EditMode && (
                                <TextInput
                                    id="password"
                                    name="password"
                                    label={t('userList.form.form.password')}
                                    value={formData.password}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\s/g, '');
                                        setFormData((prev) => ({ ...prev, password: value }));
                                        if (errors.password) {
                                            setErrors((prev) => ({ ...prev, password: '' }));
                                        }
                                    }}
                                    placeholder={t('userList.form.form.placeholders.password')}
                                    error={errors.password}
                                    required
                                    onBlur={handleBlur}
                                />
                            )}


                        </div>

                        {/* Phone + Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextInput
                                id="phoneNo"
                                name="phoneNo"
                                label={t('userList.form.form.phoneNo')}
                                value={formData.phoneNo}
                                onChange={handleInputChange}
                                placeholder={t('userList.form.form.placeholders.phoneNo')}
                                error={errors.phoneNo}
                                required
                                onBlur={handleBlur}
                            />

                            <TextInput
                                id="email"
                                name="email"
                                label={t('userList.form.form.email')}
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder={t('userList.form.form.placeholders.email')}
                                error={errors.email}
                                required
                                onBlur={handleBlur}
                            />

                        </div>

                        {/* Narration */}
                        <TextArea
                            name="narration"
                            label={t('userList.form.form.narration')}
                            value={formData.narration}
                            onChange={handleInputChange}
                            placeholder={t('userList.form.form.placeholders.narration')}
                            error={errors.narration}
                            rows={3}
                        />


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Branch Dropdown (multi-select) */}
                            <div className="space-y-2">
                                <ShadCnSelect
                                    label={t('userList.form.form.branches')}
                                    required
                                    placeholder={t('userList.form.form.placeholders.branches')}
                                    options={branchList
                                        .filter((b) => !formData.branchIds.includes(b.branchId))
                                        .map((b) => ({
                                            label: b.branchCode,
                                            value: b.branchId,
                                        }))
                                    }
                                    value=""
                                    onChange={(value) => handleBranchToggle(value)}
                                    error={errors.branchIds}
                                />

                                {/* Selected Branches */}
                                <div className="flex flex-wrap gap-2">
                                    {formData?.branchIds?.map((branchId) => {
                                        const branch = branchList.find((b) => b.branchId == branchId);

                                        return (
                                            <div
                                                key={branchId}
                                                className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs"
                                            >
                                                {branch?.branchName || "Unknown Branch"}
                                                <button
                                                    type="button"
                                                    onClick={() => handleBranchToggle(branchId)}
                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* User Role Dropdown */}
                            <div className="space-y-2">
                                <Label htmlFor="userRoleId" className="text-xs font-medium">
                                    {t('userList.form.form.userRole')} <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.userRoleId}
                                    onValueChange={(value) =>
                                        handleSelectChange("userRoleId", value)
                                    }
                                >
                                    <SelectTrigger className={`w-full ${errors.userRoleId ? 'border-red-500' : ''}`}>
                                        <SelectValue placeholder={t('userList.form.form.placeholders.userRole')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userGroupList.map((userGroup) => (
                                            <SelectItem key={userGroup.usergroupId} value={userGroup.usergroupId}>
                                                {userGroup.usergroupName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.userRoleId && (
                                    <p className="text-xs text-red-500 mt-1">{errors.userRoleId}</p>
                                )}
                            </div>
                           {EditMode && (
    <div className="flex items-center space-x-2 mt-4">
        <Label className="text-sm font-medium text-gray-700">
            {t('userList.form.form.activeStatus')}
        </Label>
        <div className="flex items-center space-x-2">
            <Checkbox
                id="ActiveStatus"
                checked={Boolean(formData.ActiveStatus)} // ✅ Convert to boolean
                onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                        ...prev,
                        ActiveStatus: checked ? 1 : 0,
                    }))
                }
            />
            <Label htmlFor="ActiveStatus" className="text-xs text-gray-600">
                {formData.ActiveStatus
                    ? t('userList.form.form.active')
                    : t('userList.form.form.inactive')}
            </Label>
        </div>
    </div>
)}

                        </div>

                        {/* Profile Photo Upload */}
                        <div className="space-y-3 border-t pt-4">
                            <Label
                                htmlFor="profilePhoto"
                                className="text-xs font-semibold text-gray-700 flex items-center space-x-2"
                            >
                                <FileText className="h-4 w-4" />
                                <span>{t('userList.form.form.profilePhoto')}</span>
                            </Label>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {photoPreview ? (
                                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                                        <img
                                            src={photoPreview}
                                            alt="Profile preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                                        <Upload className="h-6 w-6 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 w-full sm:w-auto">
                                    <Input
                                        id="profilePhoto"
                                        name="profilePhoto"
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('userList.form.form.profilePhotoHelp')}
                                        {EditMode && ` (${t('userList.form.form.keepCurrentPhoto')})`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <SaveText />

        </div>
    );
};

export default AddUser;