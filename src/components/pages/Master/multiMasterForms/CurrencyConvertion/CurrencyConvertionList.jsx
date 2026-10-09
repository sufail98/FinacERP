import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Coins, Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import AddCurrecyConvertion from './AddCurrecyConvertion';
import { useSelector } from "react-redux";
import useAuth from '@/redux/hook/auth/useAuth'

const CurrencyConvertionList = () => {
    const { generalSettings } = useSelector((state) => state.settings);

    const formatDecimal = (value) =>
        Number(value || 0).toFixed(generalSettings.decimalPart);
    const [open, setOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [editId, setEditId] = useState(null);
    const { t } = useTranslation()
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Exchange Rate");
    const { selectedBranchId } = useAuth()

    useEffect(() => {
        if (hasAccess && !privilegeLoading) {
            getData();
        }
    }, [hasAccess, privilegeLoading]);

    // Keyboard shortcut: Ctrl+C to create new (only when no text selected)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+C - Create New (only if no text is selected)
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {

                // Check if any text is selected on page
                const selectedText = window.getSelection()?.toString();
                if (selectedText && selectedText.length > 0) {
                    return; // Allow normal copy
                }

                // Check if user is in an input/textarea with text selected
                const activeElement = document.activeElement;
                const isInputField = activeElement?.tagName === 'INPUT' ||
                    activeElement?.tagName === 'TEXTAREA';

                if (isInputField) {
                    const selectionStart = activeElement.selectionStart;
                    const selectionEnd = activeElement.selectionEnd;

                    if (selectionStart !== selectionEnd) {
                        return; // Allow normal copy
                    }
                }

                // Prevent default and open modal
                e.preventDefault();
                e.stopPropagation();

                if (open) return;

                if (!privileges?.can_add) {
                    setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add currency conversions' });
                    return;
                }

                setEditId(null);
                setOpen(true);
                return;
            }

            // Escape - Close modal
            if (e.key === 'Escape' && open) {
                e.preventDefault();
                setOpen(false);
                setEditId(null);
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [privileges, open]);
    const formatDate = (dateString) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();

        const format = generalSettings?.dateformat || 'dd-MM-yyyy';

        return format
            .replace('dd', dd)
            .replace('MM', MM)
            .replace('yyyy', yyyy);
    };

    const getData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`currency-conversions/${selectedBranchId}`);

            const formattedData = response.data.data.map((item, index) => ({
                ...item,
                SNo: index + 1,

                // ✅ Remove 00:00:00
                date: formatDate(item.date),
                // ✅ Show only 2 decimal places
                rate: item.rate !== null && item.rate !== undefined
                    ? formatDecimal(item.rate)
                    : formatDecimal(0),
            }));

            setData(formattedData);

        } catch (error) {
            console.error(error);
            setAlert({ key: new Date(), type: "error", message: t("fetchError") });
        } finally {
            setLoading(false);
        }
    };

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
            await axiosInstance.get(`delete-currency-conversion/${id}`);
            getData();
            setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });
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
                setEditId(row.currencyConversionId);
                setOpen(true);
            },
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row) => handleDelete(row.currencyConversionId),
            className: "text-red-600 hover:text-red-800",
            tooltip: "Delete",
        });
    }
    const columns = [
        { key: "SNo", label: t("sl no"), sortable: true },
        { key: "date", label: t("currencyConversion.columns.date"), sortable: true },
        { key: "rate", label: t("currencyConversion.columns.rate"), sortable: true },
    ];
    if (privilegeLoading || loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("currencyConversion.breadcrumb.master"), url: "#" },
                        { title: t("currencyConversion.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Coins, title: t("currencyConversion.heading") }}
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
                        { title: t("currencyConversion.breadcrumb.master"), url: "#" },
                        { title: t("currencyConversion.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Coins, title: t("currencyConversion.heading") }}
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
                    { title: t("currencyConversion.breadcrumb.master"), url: "#" },
                    { title: t("currencyConversion.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Coins, title: t("currencyConversion.heading") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: `${t("createNewBtn")} (Ctrl+C)`,
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
                    showPagination
                    searchable
                    staticSearchable
                    pageSize={20}
                    autoFocusSearch={true}
                />
            </div>

            {/* Add/Edit Modal */}
            {(privileges?.can_add || privileges?.can_edit) && (
                <AddCurrecyConvertion open={open} handleClose={() => setOpen(false)} selectedId={editId} onSuccess={getData} />
            )}
        </div>
    )
}

export default CurrencyConvertionList