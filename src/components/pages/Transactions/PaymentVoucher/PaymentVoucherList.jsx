import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Wallet, Edit, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import ContentTable from '@/components/common/ContentTable';
import useAuth from '@/redux/hook/auth/useAuth';
import { useSelector } from 'react-redux';
import DateFilterSection from '../Components/DateFilterSection';


const PaymentVoucherList = () => {
    const { t } = useTranslation()
    const navigate = useNavigate();
    const [paymentVouchers, setPaymentVouchers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('') // Search state
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()

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

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Payment Voucher");
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
    const columns = [
        { key: "SNo", label: "#", sortable: true, align: "right" },
        { key: "paymentNo", label: t("paymentVoucher.list.columns.paymentNo"), sortable: true, align: "left" , width: "120px"},
        { key: "date", label: t("paymentVoucher.list.columns.date"), sortable: true, align: "center", width: "80px"},
        { key: "ledgerName", label: t("paymentVoucher.list.columns.ledgerName"), sortable: true, align: "left", width: "200px" },
        { key: "narration", label: t("paymentVoucher.list.columns.narration"), sortable: true, align: "left", width: "250px" },
        { key: "totalAmount", label: t("paymentVoucher.list.columns.totalAmt"), sortable: true, align: "right" , width: "150px"},
    ];

    const renderCell = (key, row) => {
        if (key === "totalAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.totalAmount).toFixed(generalSettings.decimalPart)}</span>
                    </div>
                </div>
            );
        }

        return row[key] ?? "-";
    };

    // Fetch data when page or limit changes
    useEffect(() => {
        fetchPaymentVouchers();
    }, [page, limit]);

    // Filter data based on search term (client-side)
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) {
            return paymentVouchers;
        }

        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        return paymentVouchers.filter(item =>
            item.paymentNo?.toLowerCase().includes(lowerSearchTerm) ||
            item.ledgerName?.toLowerCase().includes(lowerSearchTerm) ||
            item.narration?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [paymentVouchers, searchTerm]);

    // Update SNo for filtered data
    const displayData = useMemo(() => {
        return filteredData.map((item, index) => ({
            ...item,
            SNo: index + 1,
            date: formatDate(item.date),
        }));
    }, [filteredData]);

    const fetchPaymentVouchers = async () => {
        setLoading(true)
        try {
            const payload = {
                fromDate: fromDate,
                toDate: toDate,
                limits: limit,
                page: page,
                branchId: selectedBranchId
            };

            const response = await axiosInstance.post('payment-vouchers', payload);

            const formattedData = response.data.data.map((item, index) => ({
                ...item,
                SNo: ((page - 1) * limit) + index + 1,
            }));

            setPaymentVouchers(formattedData);

            if (response.data.meta) {
                setMeta({
                    total: response.data.meta.total || 0,
                    page: response.data.meta.page || page,
                    limit: response.data.meta.limit || limit,
                    total_pages: response.data.meta.total_pages || 1
                });
            }

        } catch (error) {
            console.error(error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t("fetchError") || "Error fetching payment vouchers",
            });
        } finally {
            setLoading(false)
        }
    }

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
        setSearchTerm(''); // Clear search when filtering
        fetchPaymentVouchers();
    };

    const handleReset = async () => {
        const today = getTodayDate();
        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setSearchTerm(''); // Clear search on reset

        setLoading(true)
        try {
            const payload = {
                fromDate: today,
                toDate: today,
                limits: 10,
                page: 1,
                branchId: selectedBranchId
            };

            const response = await axiosInstance.post('payment-vouchers', payload);

            const formattedData = response.data.data.map((item, index) => ({
                ...item,
                SNo: index + 1,
            }));

            setPaymentVouchers(formattedData);

            if (response.data.meta) {
                setMeta({
                    total: response.data.meta.total || 0,
                    page: response.data.meta.page || 1,
                    limit: response.data.meta.limit || 10,
                    total_pages: response.data.meta.total_pages || 1
                });
            }

        } catch (error) {
            console.error(error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t("fetchError") || "Error fetching payment vouchers",
            });
        } finally {
            setLoading(false)
        }
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        setSearchTerm(''); // Clear search when changing page
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
        setSearchTerm(''); // Clear search when changing items per page
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
            const res = await axiosInstance.get(`delete-payment-voucher/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (paymentVouchers.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchPaymentVouchers();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Payment Voucher";
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
            onClick: (row) => navigate(`/transaction/payment-voucher/edit-payment-voucher/${row.paymentMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row) => handleDelete(row.paymentMasterId),
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="min-h-screen bg-primary dark:bg-primary transition-colors">
                <BreadCrumb
                    routes={[
                        { title: t("paymentVoucher.breadcrumb.master"), url: "#" },
                        { title: t("paymentVoucher.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Wallet, title: t("paymentVoucher.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        )
    }

    return (
        <div className=" bg-primary dark:bg-primary transition-colors">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("paymentVoucher.breadcrumb.master"), url: "#" },
                    { title: t("paymentVoucher.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Wallet, title: t("paymentVoucher.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/payment-voucher/create-payment-voucher"),
                            },
                        ]
                        : []
                }
            />
            <div className='p-2'>
                {/* Date Filter Section with integrated Search */}
                <DateFilterSection
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={(e) => setFromDate(e.target.value)}
                    onToDateChange={(e) => setToDate(e.target.value)}
                    onFilter={handleFilter}
                    onReset={handleReset}
                    loading={loading}
                    totalRecords={meta.total}
                    showTotalRecords={true}
                    searchable={true}
                    // Search props
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onClearSearch={clearSearch}
                    searchPlaceholder={t("Search by Payment No, Ledger, Narration...")}
                    filteredCount={displayData.length}
                    originalCount={paymentVouchers.length}
                />

                {/* Server Paginated Table */}
                <ContentTable
                    columns={columns}
                    data={displayData}
                    actions={actions}
                    currentPage={page}
                    itemsPerPage={limit}
                    totalItems={searchTerm ? displayData.length : meta.total}
                    totalPages={searchTerm ? 1 : meta.total_pages}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    loading={loading}
                    serverPagination={!searchTerm}
                    renderCell={renderCell}
                />
            </div>
        </div>
    )
}

export default PaymentVoucherList;