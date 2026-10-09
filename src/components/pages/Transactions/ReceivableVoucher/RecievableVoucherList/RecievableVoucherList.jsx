import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import Preloader from '@/components/common/Preloader';
import DateInput from '@/components/elements/theme/DateInput';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Edit, Plus, ReceiptText, Trash2, Filter, RefreshCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useAuth from '@/redux/hook/auth/useAuth';
import ContentTable from '@/components/common/ContentTable';

const RecievableVoucherList = () => {
    const [alert, setAlert] = useState(null);
    const [payableVoucherData, setPayableVoucherData] = useState([]);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Payable Voucher");

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
        fetchAllPayableVouchers();
    }, [page, limit]);
    const { selectedBranchId } = useAuth()
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
    const fetchAllPayableVouchers = async () => {
        setFetchLoading(true);
        try {
            const payload = {
                fromDate: fromDate,
                toDate: toDate,
                limits: limit,
                page: page,
                branchId: selectedBranchId
            };
            const res = await axiosInstance.post('receivable-vouchers', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((page - 1) * limit) + index + 1,
               date: (() => {
                    const datePart = formatDate(item.date);
                    const timePart = formatTime(item.CreatedDate);
                    return timePart ? `${datePart} ${timePart}` : datePart;
                })(),
            }));

            setPayableVoucherData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || page,
                    limit: res.data.meta.limit || limit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Receivable Voucher Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching receivable vouchers",
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
        fetchAllPayableVouchers();
    };

    const handleReset = async () => {
        const today = getTodayDate();
        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setFetchLoading(true);
        try {
            const payload = {
                fromDate: fromDate,
                toDate: toDate,
                limits: limit,
                page: page,
                branchId: selectedBranchId
            };
            const res = await axiosInstance.post('receivable-vouchers', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((page - 1) * limit) + index + 1,
                date: formatDate(item.date),
            }));

            setPayableVoucherData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || page,
                    limit: res.data.meta.limit || limit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Receivable Voucher Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching receivable vouchers",
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
            const res = await axiosInstance.get(`delete-receivable-voucher/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (payableVoucherData.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchAllPayableVouchers();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Payable Voucher";
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

    const columns = [
        { key: "SNo", label: t("payableVoucher.list.columns.sno"), sortable: true, align: "right" },
        { key: "ReceivableNo", label: t("payableVoucher.list.columns.voucherNo"), sortable: true, align: "left" },
        { key: "date", label: t("payableVoucher.list.columns.date"), sortable: true, align: "left" },
        { key: "partyName", label: t("payableVoucher.list.columns.supplier"), sortable: true, align: "left" },
        { key: "totalAmount", label: t("payableVoucher.list.columns.totalAmt"), sortable: true, align: "right" },
    ];
    const renderCell = (key, row) => {
        if (key === "totalAmount") {
            return (
                <div className="text-sm">
                    <>
                        <div className="flex items-center justify-end gap-1">
                            <span>{Number(row.totalAmount).toFixed(generalSettings.decimalPart)}</span>
                        </div>
                    </>

                </div>
            );
        }


        return row[key] ?? "-";
    };
    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(`/transaction/receivable-voucher/edit/${row.ReceivableMasterId}`),
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800",
            onClick: (row) => handleDelete(row.ReceivableMasterId),
            tooltip: "Delete",
        });
    }

    const DateFilterSection = () => (
        <div className="flex flex-wrap items-end gap-4 mb-4">
            <DateInput
                id="fromDate"
                name="fromDate"
                label={t("common.fromDate") || "From Date"}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
            />

            <DateInput
                id="toDate"
                name="toDate"
                label={t("common.toDate") || "To Date"}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
            />

            <button
                onClick={handleFilter}
                disabled={fetchLoading}
                className="flex items-center gap-2 px-3 py-1.5 main-bg hover:bg-blue-700 
                         text-white rounded-md text-xs font-medium transition-colors
                         disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
                <Filter className="h-3.5 w-3.5" />
                {t("common.filter") || "Filter"}
            </button>

            <button
                onClick={handleReset}
                disabled={fetchLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 
                         text-white rounded-md text-xs font-medium transition-colors
                         disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                <RefreshCcw className={`h-3.5 w-3.5 ${fetchLoading ? 'animate-spin' : ''}`} />
                {t("common.reset") || "Reset"}
            </button>

            {meta.total > 0 && (
                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                    Total: <span className="font-medium text-gray-700 dark:text-gray-300">{meta.total}</span> records
                </div>
            )}
        </div>
    );

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                        { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("receivableVoucher.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className="bg-primary dark:bg-primary">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("receivableVoucher.breadcrumb.master"), url: "#" },
                    { title: t("receivableVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("receivableVoucher.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/receivable-voucher"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
                <DateFilterSection />

                <ContentTable
                    columns={columns}
                    data={payableVoucherData}
                    actions={actions}
                    currentPage={page}
                    itemsPerPage={limit}
                    totalItems={meta.total}
                    totalPages={meta.total_pages}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    loading={fetchLoading}
                    serverPagination={true}
                    renderCell={renderCell}

                />
            </div>
        </div>
    );
};

export default RecievableVoucherList;