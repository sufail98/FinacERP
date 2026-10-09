import AlertBox from '@/components/common/AlertBox'
import BreadCrumb from '@/components/common/BreadCrumb'
import Preloader from '@/components/common/Preloader'
import axiosInstance from '@/lib/axiosConfig'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Edit, Eye, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import DateFilterSection from '../../Components/DateFilterSection'
import ContentTable from '@/components/common/ContentTable'
import useAuth from '@/redux/hook/auth/useAuth'

const GodownTransferList = () => {
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([])
    const navigate = useNavigate()
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()


    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Stock Receipts");

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Date filter states - default to today's date
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getTodayDate());

    // Server-side pagination states
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        limit: 10,
        total_pages: 1
    });

    // Fetch data when page or limit changes
    useEffect(() => {
        fetchAllSales();
    }, [page, limit]);
const formatTime = (dateTimeString) => {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return '';
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours === 0 ? 12 : hours;
        return `${hours}:${minutes} ${ampm}`;
    };
    const fetchAllSales = async () => {
        setFetchLoading(true);
        try {
         
            const res = await axiosInstance.get(`stock-transfers/${selectedBranchId}`);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((page - 1) * limit) + index + 1,
               date: (() => {
                    const datePart = formatDate(item.date);
                    const timePart = formatTime(item.CreatedDate);
                    return timePart ? `${datePart} ${timePart}` : datePart;
                })(),
            }));

            setSalesData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || page,
                    limit: res.data.meta.limit || limit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Sales Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching sales invoices",
            });
        } finally {
            setFetchLoading(false);
        }
    };

    const handleFilter = () => {
        if (fromDate > toDate) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: "From Date cannot be greater than To Date",
            });
            return;
        }
        setPage(1);
        fetchAllSales();
    };

    const handleReset = async () => {
        const today = getTodayDate();
        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);

        // Fetch with reset values directly instead of relying on state
        setFetchLoading(true);
        try {
            const payload = {
                fromDate: today,
                toDate: today,
                limits: 10,
                page: 1,
                branchId: selectedBranchId
            };
            const res = await axiosInstance.post('sales', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: index + 1,
                date: formatDate(item.date),
            }));

            setSalesData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || 1,
                    limit: res.data.meta.limit || 10,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Sales Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching sales invoices",
            });
        } finally {
            setFetchLoading(false);
        }
    };
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

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

    const handleDelete = async (id) => {
        if (!privileges?.can_delete) return;

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
            const res = await axiosInstance.get(`delete-stock-transfer/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (salesData.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchAllSales();
                }
            }
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

    const handleApprove = (transferMasterId) => {
        navigate(`/transaction/godown-transfer/list/edit-godown-transfer/${transferMasterId}`, { state: { approveMode: true } });
    };

    const columns = [
        { key: "SNo", label: t("stockTransfer.list.columns.sno"), sortable: true },
        { key: "transferNo", label: t("stockTransfer.list.columns.transferNo"), sortable: true },
        { key: "from", label: t("stockTransfer.list.columns.godownFrom"), sortable: true },
        { key: "to", label: t("stockTransfer.list.columns.godownTo"), sortable: true },
        { key: "date", label: t("stockTransfer.list.columns.date"), sortable: true },
        { key: "grandTotal", label: t("stockTransfer.list.columns.amount"), sortable: true, align: "right" },
        { key: "approvedStatus", label: t("stockTransfer.list.columns.status"), sortable: true },
    ];

    const renderCell = (key, row) => {
        if (key === "grandTotal") {
            return (
                <div className="text-sm">
                    <>
                        <div className="flex items-center justify-end gap-1">
                            <span>{Number(row.grandTotal).toFixed(generalSettings.decimalPart)}</span>
                        </div>
                    </>

                </div>
            );
        }

        if (key === "approvedStatus") {
            if (row.approvedStatus === "Pending") {
                // Only show Approve button if the destination branch matches selected branch
                if (row.branchIdTo == selectedBranchId) {
                    return (
                        <button
                            onClick={() => handleApprove(row.transferMasterId)}
                            className="px-3 py-1 text-xs font-medium text-white main-bg hover:bg-blue-700 rounded-md transition-colors duration-200"
                        >
                            Approve
                        </button>
                    );
                }
                // Show "Transferred" badge if it's pending but not destined for this branch
                return (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                       {row.approvedStatus}
                    </span>
                );
            }
            return (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.approvedStatus === "Approved" || row.approvedStatus === "Accepted"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}>
                    {row.approvedStatus}
                </span>
            );
        }
        if (key === "from") {
            return (
                <div className="text-sm">
                    <div className="font-medium">{row.branchCodeFrom}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{row.godownFromName}</div>
                </div>
            );
        }

        if (key === "to") {
            return (
                <div className="text-sm">
                    <div className="font-medium">{row.branchCodeTo}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{row.godownToName}</div>
                </div>
            );
        }
        return row[key] ?? "-";
    };

    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Pencil className="h-4 w-4" />,
            onClick: (row) => navigate(`/transaction/godown-transfer/list/edit-godown-transfer/${row.transferMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.transferMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary min-h-screen">
                <BreadCrumb
                    routes={[
                        { title: t("stockTransfer.breadCrumb.master"), url: "#" },
                        { title: t("stockTransfer.breadCrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("stockTransfer.breadCrumb.title") }}
                />
                <Preloader />
            </div>
        )
    }

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("stockTransfer.breadCrumb.master"), url: "#" },
                    { title: t("stockTransfer.breadCrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("stockTransfer.breadCrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/godown-transfer"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
                {/* <DateFilterSection
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={(e) => setFromDate(e.target.value)}
                    onToDateChange={(e) => setToDate(e.target.value)}
                    onFilter={handleFilter}
                    onReset={handleReset}
                    loading={fetchLoading}
                    totalRecords={meta.total}
                    showTotalRecords={true}
                /> */}

                <ContentTable
                    columns={columns}
                    data={salesData}
                    actions={actions}
                    currentPage={page}
                    itemsPerPage={limit}
                    totalItems={meta.total}
                    totalPages={meta.total_pages}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    loading={fetchLoading}
                    // serverPagination={true}
                    renderCell={renderCell}
                    staticSearchable

                />
            </div>
        </div>
    )
}

export default GodownTransferList