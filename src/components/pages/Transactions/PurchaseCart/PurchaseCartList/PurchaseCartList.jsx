import AlertBox from '@/components/common/AlertBox'
import BreadCrumb from '@/components/common/BreadCrumb'
import Preloader from '@/components/common/Preloader'
import axiosInstance from '@/lib/axiosConfig'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Edit, Plus, ReceiptText, Trash2 } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import ContentTable from '@/components/common/ContentTable'
import useAuth from '@/redux/hook/auth/useAuth'
import DateFilterSection from '../../Components/DateFilterSection'

const PurchaseCartList = () => {
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([])
    const [voucherCode, setVoucherCode] = useState('')
    const navigate = useNavigate()
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()

    const { privileges, loading: privilegeLoading } = usePrivileges("Purchase Order");

    const debounceTimerRef = useRef(null);

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getTodayDate());

    const [limit, setLimit] = useState(80);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        limit: 10,
        total_pages: 1
    });

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
    // Use a ref to always have access to latest state without stale closures
    const stateRef = useRef({});
    stateRef.current = { voucherCode, fromDate, toDate, limit, page, selectedBranchId, generalSettings };

    const fetchAllSales = useCallback(async (params = {}) => {
        setFetchLoading(true);
        try {
            const state = stateRef.current;
            const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : state.voucherCode;
            const currentFromDate = params.fromDate !== undefined ? params.fromDate : state.fromDate;
            const currentToDate = params.toDate !== undefined ? params.toDate : state.toDate;
            const currentLimit = params.limit !== undefined ? params.limit : state.limit;
            const currentPage = params.page !== undefined ? params.page : state.page;

            const payload = {
                fromDate: currentVoucherCode?.trim() ? null : currentFromDate,
                toDate: currentVoucherCode?.trim() ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: state.selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null
            };

            const res = await axiosInstance.post('purchase-cart', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((currentPage - 1) * currentLimit) + index + 1,
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
                    page: res.data.meta.page || currentPage,
                    limit: res.data.meta.limit || currentLimit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Purchase Order Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching purchase orders",
            });
        } finally {
            setFetchLoading(false);
        }
    }, []); // safe — reads via stateRef

    useEffect(() => {
        fetchAllSales();
    }, []);

    useEffect(() => {
        if (page === 1 && limit === 10) return;
        fetchAllSales();
    }, [page, limit]);

    const handleVoucherCodeChange = (e) => {
        const value = e.target.value;
        setVoucherCode(value);
        setPage(1);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchAllSales({ voucherCode: value, page: 1 });
        }, 300);
    };

    const clearVoucherCode = () => {
        setVoucherCode('');

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setPage(1);
        fetchAllSales({ voucherCode: '', page: 1 });
    };

    const handleFilter = () => {
        if (voucherCode?.trim()) {
            setPage(1);
            fetchAllSales({ page: 1 });
            return;
        }

        if (fromDate > toDate) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: "From Date cannot be greater than To Date",
            });
            return;
        }

        setPage(1);
        fetchAllSales({ page: 1 });
    };

    const handleReset = async () => {
        const today = getTodayDate();

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setVoucherCode('');

        await fetchAllSales({
            fromDate: today,
            toDate: today,
            limit: 10,
            page: 1,
            voucherCode: ''
        });
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchAllSales({ page: newPage });
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
        fetchAllSales({ limit: newLimit, page: 1 });
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
            const res = await axiosInstance.get(`purchase-cart/delete/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (salesData.length === 1 && page > 1) {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchAllSales({ page: newPage });
                } else {
                    fetchAllSales();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Purchase Order";
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

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const columns = [
        { key: "SNo", label: t("salesInvoice.list.columns.sno"), sortable: true, align: "right" },
        { key: "PurchaseCartNo", label: t("purchaseOrder.list.columns.orderNo"), sortable: true, align: "left" },
        { key: "date", label: t("salesInvoice.list.columns.date"), sortable: true, align: "left" },
        { key: "CustomerName", label: t("salesInvoice.list.columns.cashParty"), sortable: true, align: "left" },
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

    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(`/transaction/purchase-cart/edit-purchase-cart/${row.PurchaseCartMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.PurchaseCartMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("purchaseCart.breadcrumb.master"), url: "#" },
                        { title: t("purchaseCart.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("purchaseCart.breadcrumb.title") }}
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
                    { title: t("purchaseCart.breadcrumb.master"), url: "#" },
                    { title: t("purchaseCart.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("purchaseCart.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/purchase-cart"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
                {/* Date Filter Section with integrated Search */}
                <DateFilterSection
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={(e) => setFromDate(e.target.value)}
                    onToDateChange={(e) => setToDate(e.target.value)}
                    onFilter={handleFilter}
                    onReset={handleReset}
                    loading={fetchLoading}
                    totalRecords={meta.total}
                    showTotalRecords={true}
                    searchable={false}
                    // Search props
                    // searchTerm={searchTerm}
                    // onSearchChange={handleSearchChange}
                    // onClearSearch={clearSearch}
                    // searchPlaceholder={t("Search by Receipt No, Ledger, Narration...")}
                    // filteredCount={displayData.length}
                    // originalCount={salesReciepts.length}
                />

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
                    serverPagination={true}
                    renderCell={renderCell}
                />
            </div>
        </div>
    )
}

export default PurchaseCartList
