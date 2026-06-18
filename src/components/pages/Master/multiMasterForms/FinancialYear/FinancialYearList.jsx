import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Calendar, Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import CreateFinancialYear from './CreateFinancialYear';
import { Switch } from '@mui/material';

const FinancialYearList = () => {
    const [open, setOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [editId, setEditId] = useState(null);

    const { t } = useTranslation();
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Financial Year");

    useEffect(() => {
        if (hasAccess && !privilegeLoading) {
            getData();
        }
    }, [hasAccess, privilegeLoading]);

    const getData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("financial-years");
            setData(response.data.data);
        } catch (error) {
            console.error(error);
            setAlert({ key: new Date(), type: "error", message: t("fetchError") });
        } finally {
            setLoading(false);
        }
    };

    // ✅ Check if any financial year is currently active (not closed)
    const hasActiveFinancialYear = data.some(item => !item.closed);

    const handleDelete = async (id) => {
        if (!privileges?.can_delete) {
            setAlert({ key: new Date(), type: "error", message: t("deletePermission") });
            return;
        }
        if (id === 1) {
            setAlert({ key: new Date(), type: "error", message: t("DefaultDataMsg") });
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
            await axiosInstance.get(`delete-financial-year/${id}`);
            getData();
            setAlert({ type: "success", message: t("deleteSuccess") });
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Financial Year";
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

    // ✅ Handle Create New button click with active year check
    const handleCreateNew = () => {
        if (hasActiveFinancialYear) {
            setAlert({
                key: new Date(),
                type: "error",
                message:
                    t("financialYear.activeYearExists") ||
                    "Cannot add a new financial year while an active financial year exists. Please close the active financial year first.",
            });
            return;
        }
        setEditId(null);
        setOpen(true);
    };

    const actions = [];
    // if (privileges?.can_delete) {
    //     actions.push({
    //         icon: <Trash2 className="h-4 w-4" />,
    //         onClick: (row) => handleDelete(row.yearId),
    //         className: "text-red-600 hover:text-red-800",
    //         tooltip: "Delete",
    //     });
    // }

    const renderCell = (key, row) => {
        if (key === "status") {
            return (
                <Switch
                    checked={!row.closed}
                    disabled={data.length === 1}
                    onChange={async (event) => {
                        if (!privileges?.can_edit) {
                            setAlert({ key: new Date(), type: "error", message: t("editPermission") });
                            return;
                        }

                        try {
                            await axiosInstance.get(`toggle-financial-year-status/${row.yearId}`);
                            getData();
                            setAlert({
                                key: new Date(),
                                type: "success",
                                message: t("updateSuccess"),
                            });
                        } catch (error) {
                            console.error(error);
                            setAlert({
                                key: new Date(),
                                type: "error",
                                message: error.response?.data?.message || t("updateError"),
                            });
                        }
                    }}
                    color="primary"
                    size="small"
                />
            );
        }

        return row[key] ?? "-";
    };

    const columns = [
        { key: "SNo", label: "#", sortable: true },
        { key: "fromDate", label: t("financialYear.columns.fromDate"), sortable: true },
        { key: "toDate", label: t("financialYear.columns.toDate"), sortable: true },
        { key: "status", label: t("financialYear.columns.status"), sortable: true },
    ];

    if (privilegeLoading || loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("financialYear.breadcrumb.master"), url: "#" },
                        { title: t("financialYear.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Calendar, title: t("financialYear.heading") }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("financialYear.breadcrumb.master"), url: "#" },
                        { title: t("financialYear.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Calendar, title: t("financialYear.heading") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("financialYear.breadcrumb.master"), url: "#" },
                    { title: t("financialYear.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Calendar, title: t("financialYear.heading") }}
                // ✅ Uncommented — Create New button with active year guard
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: handleCreateNew,
                            },
                        ]
                        : []
                }
            />

            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <div className="w-full mx-auto p-2">
                <ContentTable
                    columns={columns}
                    data={data}
                    actions={actions}
                    renderCell={renderCell}
                />
            </div>

            {/* Add/Edit Modal */}
            {(privileges?.can_add || privileges?.can_edit) && (
                <CreateFinancialYear
                    open={open}
                    handleClose={() => setOpen(false)}
                    selectedId={editId}
                    onSuccess={getData}
                />
            )}
        </div>
    );
};

export default FinancialYearList;