import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Coins, Edit, Plus, Trash2, UserPen } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import AddDesignation from './AddDesignation';

const DesignationList = () => {
    const [open, setOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [editId, setEditId] = useState(null);
    const { t } = useTranslation()
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Designation");

    useEffect(() => {
        if (hasAccess && !privilegeLoading) {
            getData();
        }
    }, [hasAccess, privilegeLoading]);

    const getData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("designations");
            setData(response.data.data);

        } catch (error) {
            console.error(error);
            setAlert({key: new Date(), type: "error", message: t("fetchError") });
        } finally {
            setLoading(false);
        }
    };
    const handleDelete = async (id) => {
        if (!privileges?.can_delete) {
            setAlert({key: new Date(), type: "error", message: t("deletePermission") });
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
            await axiosInstance.get(`delete-designation/${id}`);
            getData();
            setAlert({key: new Date(), type: "success", message: t("deleteSuccess") });
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Product";
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
            onClick: (row) => {
                setEditId(row.designationId);
                setOpen(true);
            },
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row) => handleDelete(row.designationId),
            className: "text-red-600 hover:text-red-800",
            tooltip: "Delete",
        });
    }
    const columns = [
        { key: "SNo", label: "#", sortable: true },
        { key: "designationName", label: t("designation.columns.designationName"), sortable: true },
        { key: "leaveDays", label: t("designation.columns.leaveDays"), sortable: true },
        { key: "narration", label: t("designation.columns.narration"), sortable: true },
    ];
    if (privilegeLoading || loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("designation.breadcrumb.master"), url: "#" },
                        { title: t("designation.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: UserPen, title: t("designation.heading") }}
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
                        { title: t("designation.breadcrumb.master"), url: "#" },
                        { title: t("designation.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Coins, title: t("designation.heading") }}
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
                    { title: t("designation.breadcrumb.master"), url: "#" },
                    { title: t("designation.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Coins, title: t("designation.heading") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => {
                                    setEditId(null);
                                    setOpen(true);
                                },
                            },
                        ]
                        : []
                }
            />
            <div className="w-full mx-auto p-2">
                <ContentTable
                    columns={columns}
                    data={data}
                    actions={actions}
                    searchable
                    showPagination
                />
            </div>

            {/* Add/Edit Modal */}
            {(privileges?.can_add || privileges?.can_edit) && (
                <AddDesignation open={open} handleClose={() => setOpen(false)} selectedId={editId} onSuccess={getData} />
            )}
        </div>
    )
}

export default DesignationList