import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Edit, Mail, Phone, Plus, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const EmployeeList = () => {
    const { t } = useTranslation()
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Employee");
    const [employees, setEmplyees] = useState([]);
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);


    useEffect(() => {
        fetchEmbloyees()
    }, [])

    const fetchEmbloyees = async () => {
        setLoading(true)
        try {
            const response = await axiosInstance.get('employees');
            setEmplyees(response.data.data);

        } catch (error) {
            console.error(error);

        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!privileges?.can_delete) {
            setAlert({ key: new Date(), type: "error", message: t("deletePermission") });
            return;
        }

        const result = await Swal.fire({
            title: t("delete.title"),
            text: t("delete.text"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("delete.confirm"),
            cancelButtonText: t("delete.cancel"),
        });

        if (!result.isConfirmed) return;

        try {
            await axiosInstance.get(`delete-employee/${id}`);
            fetchEmbloyees();
            setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });
        } catch (error) {
            const errorMessage = error.response?.data?.message;
            const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            setAlert({
                id: Date.now(),
                type: "error",
                message: finalMessage,
            });
            console.error(error);
        }
    };
    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(`/payroll/employee/edit-employee/${row.employeeId}`),
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row) => handleDelete(row.employeeId),
            className: "text-red-600 hover:text-red-800",
            tooltip: "Delete",
        });
    }

    const columns = [
        { key: "SNo", label: "#", sortable: true },
        { key: "employeeCode", label: t("employee.columns.employeeCode"), sortable: true },
        { key: "employeeName", label: t("employee.columns.employeeName"), sortable: true },
        { key: "contact", label: t("employee.columns.contact"), sortable: true },
    ];

    const renderCell = (key, row) => {
        if (key === "contact") {
            return (
                <div className="text-sm">
                    {row.phoneNo && (
                        <>
                            <div className="flex items-center gap-1 mb-1">
                                <Phone className="h-3 w-3 text-gray-500" />
                                <span>{row.phoneNo}</span>
                            </div>
                        </>
                    )}
                    {row.email && (
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span className="truncate max-w-[200px]" title={row.email}>
                                {row.email}
                            </span>
                        </div>
                    )}
                    {!row.phone && !row.email && (
                        <span className="text-gray-400 text-sm">{t("customer.noContactInfo")}</span>
                    )}
                </div>
            );
        }
        return row[key] ?? "-";
    };

    if (privilegeLoading || loading) {
        return <div>
            <BreadCrumb
                routes={[
                    { title: t("employee.breadcrumb.payroll"), url: "#" },
                    { title: t("employee.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: UserPlus, title: t("employee.breadcrumb.title") }}
            />
            <Preloader />
        </div>
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("employee.breadcrumb.payroll"), url: "#" },
                        { title: t("employee.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: UserPlus, title: t("employee.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("employee.breadcrumb.payroll"), url: "#" },
                    { title: t("employee.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: UserPlus, title: t("employee.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/payroll/employee/add-new"),
                            },
                        ]
                        : []
                }
            />
            <div className='p-2'>
                <ContentTable
                    columns={columns}
                    data={employees}
                    actions={actions}
                    renderCell={renderCell}
                    showPagination
                    searchable
                />
            </div>
        </div>
    )
}

export default EmployeeList