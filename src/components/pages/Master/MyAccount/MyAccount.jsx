import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Camera, User, Mail, Phone, Building2, Shield } from "lucide-react";
import { useTranslation } from 'react-i18next';
import BreadCrumb from "@/components/common/BreadCrumb";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "@/components/common/AlertBox";
import Preloader from "@/components/common/Preloader";
import ErrorPage from "@/components/common/ErrorPage";
import useAuth from "@/redux/hook/auth/useAuth";

const MyAccount = () => {
    const { t } = useTranslation();
    const { user, branches } = useAuth();

    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
    const [hasPhotoChanged, setHasPhotoChanged] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userId = user?.userId;
            const response = await axiosInstance.get("users");

            if (!response.data.error) {
                // Find the current user from the users array
                const currentUser = response.data.data.find(u => u.userId === userId);
                
                if (currentUser) {
                    setUserData(currentUser);
                    setPhotoPreview(currentUser.profilePhoto);
                } else {
                    setError("User data not found");
                }
            } else {
                setError(response.data.message || "Failed to load user data");
            }
        } catch (err) {
            console.error("Error fetching user details:", err);
            setError(err.response?.data?.message || "Error fetching users");
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 200 * 1024;
        if (file.size > maxSize) {
            setAlert({
                id: new Date(),
                message: t('userList.form.form.errors.imageSizeLimit') || "Image size must be less than 200KB",
                type: "error",
            });
            e.target.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setAlert({
                id: new Date(),
                message: t('userList.form.form.errors.imageTypeLimit') || "Only JPG, PNG, and SVG images are allowed",
                type: "error",
            });
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setPhotoPreview(event.target.result);
            setPendingPhotoFile(file);
            setHasPhotoChanged(true);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfilePhoto = async () => {
        if (!pendingPhotoFile) return;
        await uploadProfilePhoto(pendingPhotoFile);
    };

    const handleCancelPhoto = () => {
        setPhotoPreview(userData?.profilePhoto);
        setPendingPhotoFile(null);
        setHasPhotoChanged(false);
        document.getElementById('profilePhotoInput').value = '';
    };

    const uploadProfilePhoto = async (file) => {
        setUpdating(true);
        try {
            const formData = new FormData();
            formData.append("profilePhoto", file);
            formData.append("UpdatedUser", "1");

            const userId = user?.userId;
            const response = await axiosInstance.post(
                `update-user/${userId}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (!response.data.error) {
                setAlert({
                    id: new Date(),
                    message: "Profile photo updated successfully",
                    type: "success",
                });
                setPendingPhotoFile(null);
                setHasPhotoChanged(false);
                fetchUserData();
            } else {
                setAlert({
                    id: new Date(),
                    message: response.data.message || "Failed to update profile photo",
                    type: "error",
                });
            }
        } catch (error) {
            console.error("Error updating profile photo:", error);
            setAlert({
                id: new Date(),
                message: error.response?.data?.message || "Failed to update profile photo",
                type: "error",
            });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("myAccount.breadcrumb.group"), url: "#" }]}
                    heading={{ icon: User, title: t("myAccount.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("myAccount.breadcrumb.group"), url: "#" }]}
                    heading={{ icon: User, title: t("myAccount.breadcrumb.title") }}
                />
                <ErrorPage message={error} />
            </div>
        );
    }

    return (
        <div className="h-auto w-full">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: t("myAccount.breadcrumb.group"), url: "#" }]}
                heading={{ icon: User, title: t("myAccount.breadcrumb.title") }}
            />

            <Card className="w-full max-w-3xl mx-auto border-none shadow-none">
                <CardContent className="px-0 sm:px-2 pb-2">
                    {/* Compact Profile Section */}
                    <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-10 h-10 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <label
                                    htmlFor="profilePhotoInput"
                                    className="absolute -bottom-1 -right-1 main-bg hover:bg-blue-700 text-white p-1.5 rounded-full cursor-pointer transition-colors"
                                >
                                    {updating ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Camera className="w-3.5 h-3.5" />
                                    )}
                                </label>
                                <Input
                                    id="profilePhotoInput"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    disabled={updating}
                                />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">{userData?.userName}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{userData?.userGroupName || '-'}</p>
                            </div>
                        </div>

                        {/* Save and Cancel Buttons for Profile Photo */}
                        {hasPhotoChanged && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveProfilePhoto}
                                    disabled={updating}
                                    className="px-4 py-2 main-bg hover:bg-green-700 text-white text-sm rounded font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {updating ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={handleCancelPhoto}
                                    disabled={updating}
                                    className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-medium transition-colors disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Compact Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {/* Email */}
                        <div>
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                <Mail className="w-3.5 h-3.5" />
                                {t('userList.form.form.email') || 'Email'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                <p className="text-sm text-gray-800">{userData?.email || '-'}</p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                <Phone className="w-3.5 h-3.5" />
                                {t('userList.form.form.phoneNo') || 'Phone'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                <p className="text-sm text-gray-800">{userData?.phoneNo || '-'}</p>
                            </div>
                        </div>

                        {/* User Role */}
                        <div>
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                <Shield className="w-3.5 h-3.5" />
                                {t('userList.form.form.userRole') || 'Role'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                <p className="text-sm text-gray-800">{userData?.userGroupName || '-'}</p>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <Label className="text-xs text-gray-500 mb-1 block">
                                {t('userList.form.form.activeStatus') || 'Status'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${userData?.ActiveStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {userData?.ActiveStatus ? t('userList.form.form.active') || 'Active' : t('userList.form.form.inactive') || 'Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Narration - Full Width if exists */}
                        {userData?.Narration && userData.Narration !== "null" && (
                            <div className="sm:col-span-2">
                                <Label className="text-xs text-gray-500 mb-1 block">
                                    {t('userList.form.form.narration') || 'Narration'}
                                </Label>
                                <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{userData.Narration}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MyAccount;