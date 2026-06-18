import { useEffect, useState } from 'react';
import BreadCrumb from '@/components/common/BreadCrumb';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { SaveAll, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import FormComponent from './FormComponent';
import axiosInstance from '@/lib/axiosConfig';
import AlertBox from '@/components/common/AlertBox';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const EmployeeForm = () => {
    const { t } = useTranslation();
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const editMode = Boolean(employeeId);
    const [alert, setAlert] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { privileges } = usePrivileges("Employee");

    const { generalSettings } = useSelector((state) => state.settings);

    const [deprtments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [worklocations, setWorkLocations] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [area, setArea] = useState([]);
    const [market, setMarket] = useState([]);

    useEffect(() => {
        fetchDepartments();
        fetchDesignations();
        fetchWorkLocations();
        fetchRoutes();
        fetchArea();
        fetchMarket();
    }, []);

    // Ctrl+S shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                const form = document.querySelector("form");
                if (form && !isSubmitting) {
                    form.requestSubmit();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting]);

    const fetchDepartments = async () => {
        try {
            const { data } = await axiosInstance.get("departments");
            setDepartments(data.data);
        } catch { console.error('Error Fetching Departments'); }
    };
    const fetchDesignations = async () => {
        try {
            const { data } = await axiosInstance.get("designations");
            setDesignations(data.data);
        } catch { console.error('Error Fetching Designations'); }
    };
    const fetchWorkLocations = async () => {
        try {
            const { data } = await axiosInstance.get("worklocations");
            setWorkLocations(data.data);
        } catch { console.error('Error Fetching Work Locations'); }
    };
    const fetchRoutes = async () => {
        try {
            const { data } = await axiosInstance.get("routes");
            setRoutes(data.data);
        } catch { console.error('Error Fetching Routes'); }
    };
    const fetchArea = async () => {
        try {
            const { data } = await axiosInstance.get("areas");
            setArea(data.data);
        } catch { console.error('Error Fetching Areas'); }
    };
    const fetchMarket = async () => {
        try {
            const { data } = await axiosInstance.get("markets");
            setMarket(data.data);
        } catch { console.error('Error Fetching Markets'); }
    };

    const maritalStatusOptions = [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
    ];
    const genderOptions = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];
    const bloodGroupOptions = [
        { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
        { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
    ];

    const handleSubmit = async (formData) => {

        if (editMode && generalSettings?.askConfirmationEdit) {
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
    } else if (!editMode && generalSettings?.askConfirmationSave) {
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
    } else null;
        setIsSubmitting(true);
        try {
            const apiUrl = editMode ? `update-employee/${employeeId}` : 'save-employee';
            const response = await axiosInstance.post(apiUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (!response.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("saveSuccess") });
                navigate('/payroll/employee');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;
            setAlert({ id: Date.now(), type: "error", message: finalMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => navigate('/payroll/employee');

    return (
        <div className="bg-white dark:bg-[#121212] transition-colors min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("employee.breadcrumb.payroll"), url: "#" },
                    { title: t("employee.breadcrumb.title"), url: "/payroll/employee" },
                    { title: editMode ? t("employee.breadcrumb.edit") : t("employee.breadcrumb.addnew"), url: "#" },
                ]}
                heading={{ icon: UserPlus, title: editMode ? t("employee.breadcrumb.edit") : t("employee.breadcrumb.addnew") }}
                actions={[
                    {
                        label: t("cancel") || "Cancel",
                        icon: X,
                        type: "primary",
                        onClick: handleCancel,
                        loading: false,
                    },
                    ...(privileges?.can_add || (editMode && privileges?.can_edit)
                        ? [{
                            label: isSubmitting
                                ? (t("saving") || "Saving...")
                                : (editMode ? (t("update") || "Update") : (t("save") || "Save")),
                            icon: SaveAll,
                            type: "primary",
                            onClick: () => {
                                const form = document.querySelector('form');
                                if (form) form.requestSubmit();
                            },
                            loading: isSubmitting,
                            loadingText: t("saving") || "Saving...",
                        }]
                        : []
                    ),
                ]}
            />
            <FormComponent
                editMode={editMode}
                employeeId={employeeId}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                deprtments={deprtments}
                fetchDepartments={fetchDepartments}
                designations={designations}
                fetchDesignations={fetchDesignations}
                worklocations={worklocations}
                fetchWorkLocations={fetchWorkLocations}
                routes={routes}
                fetchRoutes={fetchRoutes}
                area={area}
                fetchArea={fetchArea}
                market={market}
                fetchMarket={fetchMarket}
                maritalStatusOptions={maritalStatusOptions}
                genderOptions={genderOptions}
                bloodGroupOptions={bloodGroupOptions}
            />
        </div>
    );
};

export default EmployeeForm;