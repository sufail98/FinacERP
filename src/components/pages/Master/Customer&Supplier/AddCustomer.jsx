import BreadCrumb from "@/components/common/BreadCrumb";
import CustomerAndSupplierForm from "./Customer&SupplierForm";
import { SaveAll, UsersRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import AlertBox from "@/components/common/AlertBox";
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const AddCustomerPage = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [submitloading, seSubmittLoading] = useState(false);
    const [currency, setCurrency] = useState([]);
    const [accountGroups, setAcountGroup] = useState([]);
    const [pricingLevel, setPricingLevel] = useState([]);
    const { selectedBranchId,currentCurrencyConversion,currentFinancialYear,userId } = useAuth();
    
    const { generalSettings } = useSelector((state) => state.settings);
    const { customerId } = useParams();
    const isEditMode = Boolean(customerId);
    const [alert, setAlert] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!selectedBranchId) return;
        getCurrencyData();
        getAccountGroupData();
        fetchPricingLevelData();
    }, [selectedBranchId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                const form = document.querySelector("form");
                if (form && !submitloading) {
                    form.requestSubmit();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [submitloading]);

    const getCurrencyData = async () => {
        try {
            const response = await axiosInstance.get("currencies");
            setCurrency(response.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const getAccountGroupData = async () => {
        try {
            const response = await axiosInstance.post('bank-customer-supplier-accountgroups', { group_ids: [29] });
            setAcountGroup(response.data.data);
        } catch (error) {
            console.error("Error fetching account groups:", error);
        }
    };

    const fetchPricingLevelData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("pricing-levels");
            setPricingLevel(res.data.data || []);
        } catch (err) {
            console.error("Error fetching pricing levels:", err);
        } finally {
            setLoading(false);
        }
    };

 const handleSave = async (data, mode) => {
    if (isEditMode && generalSettings?.askConfirmationEdit) {
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
                if (container) {
                    container.style.cssText += '; z-index: 2147483647 !important;';
                }
            }
        });
        if (!result.isConfirmed) return;
    } else if (!isEditMode && generalSettings?.askConfirmationSave) {
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
                if (container) {
                    container.style.cssText += '; z-index: 2147483647 !important;';
                }
            }
        });
        if (!result.isConfirmed) return;
    }

    try {
        seSubmittLoading(true);

        const isFormData = data instanceof FormData;

        const extraFields = {
            exchangeDate: currentCurrencyConversion?.date || '',
            ModifiedUser:mode==='update'?userId:null,
            exchangeRate: currentCurrencyConversion?.rate || '',
            currencyConversionId: currentCurrencyConversion?.currecyConversionId || '',
            activeFinancialYear_fromDate: currentFinancialYear?.fromDate || '',
        };

        if (isFormData) {
            Object.entries(extraFields).forEach(([key, value]) => {
                data.append(key, value);
            });
        } else {
            data = { ...data, ...extraFields };
        }

        const config = isFormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : {};

        if (mode === "update") {
            await axiosInstance.post(
                `update-account-ledger/${customerId}`,
                data,
                config
            );
            setAlert({ key: new Date(), type: "success", message: "Updated" });
            navigate("/master/customer");
        } else {
            await axiosInstance.post(
                "save-account-ledger",
                data,
                config
            );
            setAlert({ key: new Date(), type: "success", message: "Saved" });
            navigate("/master/customer");
        }
    } catch (error) {
        console.error("Error saving customer:", error);
        setAlert({ key: new Date(), type: "error", message: (error.response?.data?.message || error.message) });
    } finally {
        seSubmittLoading(false);
    }
};

    const handleCancel = async () => {
    if (generalSettings?.askConfirmationClose) {
        const result = await Swal.fire({
            title: t('ConfirmCloseTitle'),
            text: t('ConfirmCloseText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: t('YesClose'),
            cancelButtonText: t('Cancel'),
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) {
                    container.style.cssText += '; z-index: 2147483647 !important;';
                }
            }
        });
        if (!result.isConfirmed) return;
    }
    navigate('/master/customer');
};

    return (
        <div className="bg-white dark:bg-[#121212] transition-colors min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("customer.form.breadcrumb.master"), url: "#" },
                    { title: t("customer.form.breadcrumb.title"), url: "/master/customer" },
                    { title: isEditMode ? t("customer.form.breadcrumb.editCustomer") : t("customer.form.breadcrumb.addCustomer"), url: "#" },
                ]}
                heading={{ icon: UsersRound, title: isEditMode ? t("customer.form.breadcrumb.editCustomer") : t("customer.form.breadcrumb.addCustomer") }}
                actions={[
                    {
                        label: t("cancel") || "Cancel",
                        icon: X,
                        type: "primary",
                        onClick: handleCancel,
                        loading: false,
                    },
                    {
                        label: submitloading ? (t("saving") || "Saving...") : (isEditMode ? (t("update") || "Update") : (t("save") || "Save")),
                        icon: SaveAll,
                        type: "primary",
                        onClick: () => {
                            const form = document.querySelector('form');
                            if (form) {
                                form.requestSubmit();
                            }
                        },
                        loading: submitloading,
                        loadingText: t("saving") || "Saving...",
                    },
                ]}
            />
            <CustomerAndSupplierForm
                type="customer"
                customerId={customerId}
                onSubmit={handleSave}
                pricingLevel={pricingLevel}
                currency={currency}
                accountGroups={accountGroups}
            />
        </div>
    );
};

export default AddCustomerPage;