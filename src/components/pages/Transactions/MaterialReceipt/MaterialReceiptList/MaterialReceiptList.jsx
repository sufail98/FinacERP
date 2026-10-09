import AlertBox from '@/components/common/AlertBox'
import BreadCrumb from '@/components/common/BreadCrumb'
import Preloader from '@/components/common/Preloader'
import axiosInstance from '@/lib/axiosConfig'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Edit, Plus, ReceiptText, Trash2 } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import useAuth from '@/redux/hook/auth/useAuth'
import ContentTable from '@/components/common/ContentTable'
import DateFilterSection from '../../Components/DateFilterSection'

const MaterialReceiptList = () => {
    const [alert, setAlert] = useState(null);
    const [materialReceiptData, setMaterialReceiptData] = useState([])
    const [voucherCode, setVoucherCode] = useState('') // Single search field
    const navigate = useNavigate()
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()

    const { privileges, loading: privilegeLoading } = usePrivileges("Material Receipt");

    // Debounce timer ref
    const debounceTimerRef = useRef(null);

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Date filter states - default to today's date
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getTodayDate());

    // Server-side pagination states
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
    // Main fetch function
    const fetchAllMaterialReceipts = useCallback(async (params = {}) => {
        setFetchLoading(true);
        try {
            const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : voucherCode;
            const currentFromDate = params.fromDate !== undefined ? params.fromDate : fromDate;
            const currentToDate = params.toDate !== undefined ? params.toDate : toDate;
            const currentLimit = params.limit !== undefined ? params.limit : limit;
            const currentPage = params.page !== undefined ? params.page : page;

            // Build payload - if voucherCode has value, set dates to null
            const payload = {
                fromDate: currentVoucherCode?.trim() ? null : currentFromDate,
                toDate: currentVoucherCode?.trim() ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null
            };

            const res = await axiosInstance.post('material-receipts', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((currentPage - 1) * currentLimit) + index + 1,
             date: (() => {
                    const datePart = formatDate(item.date);
                    const timePart = formatTime(item.CreatedDate);
                    return timePart ? `${datePart} ${timePart}` : datePart;
                })(),
                totalAmount: Number(item.totalAmount).toFixed(generalSettings?.decimalPart ?? 2),
            }));

            setMaterialReceiptData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || currentPage,
                    limit: res.data.meta.limit || currentLimit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Material Receipt Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching material receipts",
            });
        } finally {
            setFetchLoading(false);
        }
    }, [voucherCode, fromDate, toDate, limit, page, selectedBranchId, generalSettings]);

    // Initial load with today's date
    useEffect(() => {
        fetchAllMaterialReceipts();
    }, []);

    // Fetch when page or limit changes
    useEffect(() => {
        // Skip initial render
        if (page === 1 && limit === 10) return;

        fetchAllMaterialReceipts();
    }, [page, limit]);

    // Debounced search for voucher code
    const handleVoucherCodeChange = (e) => {
        const value = e.target.value;
        setVoucherCode(value);
        setPage(1); // Reset to first page

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer (300ms delay)
        debounceTimerRef.current = setTimeout(() => {
            fetchAllMaterialReceipts({ voucherCode: value, page: 1 });
        }, 300);
    };

    // Clear voucher code and fetch with dates
    const clearVoucherCode = () => {
        setVoucherCode('');

        // Clear debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Fetch with current date filters
        setPage(1);
        fetchAllMaterialReceipts({ voucherCode: '', page: 1 });
    };

    // Filter button click - only for date filtering
    const handleFilter = () => {
        if (voucherCode?.trim()) {
            // If voucher code exists, just search by voucher code
            setPage(1);
            fetchAllMaterialReceipts({ page: 1 });
            return;
        }

        // Validate dates
        if (fromDate > toDate) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: "From Date cannot be greater than To Date",
            });
            return;
        }

        setPage(1);
        fetchAllMaterialReceipts({ page: 1 });
    };

    // Reset everything
    const handleReset = async () => {
        const today = getTodayDate();

        // Clear debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setVoucherCode('');

        await fetchAllMaterialReceipts({
            fromDate: today,
            toDate: today,
            limit: 10,
            page: 1,
            voucherCode: ''
        });
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchAllMaterialReceipts({ page: newPage });
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
        fetchAllMaterialReceipts({ limit: newLimit, page: 1 });
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
            const res = await axiosInstance.get(`delete-material-receipt/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (materialReceiptData.length === 1 && page > 1) {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchAllMaterialReceipts({ page: newPage });
                } else {
                    fetchAllMaterialReceipts();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Material Receipt";
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

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
const footerData = useMemo(() => {
        if (!materialReceiptData || materialReceiptData.length === 0) return null;

        const grandTotal = materialReceiptData.reduce((sum, item) => {
            return sum + (Number(item.totalAmount) || 0);
        }, 0);

        return {
            SNo: "",
            returnNo: "",
            date: "",
            partyName: t("Grand Total"),
            totalAmount: grandTotal.toFixed(generalSettings?.decimalPart || 2),
        };
    }, [materialReceiptData, generalSettings?.decimalPart, t]);
    const columns = [
        { key: "SNo", label: t("materialReceipt.list.columns.sno"), sortable: true, align: "right" ,width:"40px"},
        { key: "receieptNo", label: t("materialReceipt.list.columns.receiptNo"), sortable: true, align: "left",width:'80px' },
        { key: "date", label: t("materialReceipt.list.columns.date"), sortable: true, align: "left",width:'80px' },
        { key: "partyName", label: t("materialReceipt.list.columns.prtyName"), sortable: true, align: "left",width:'150px' },
        { key: "totalAmount", label: t("materialReceipt.list.columns.totalAmt"), sortable: true, align: "right",width:'80px' },
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
            onClick: (row) => navigate(`/transaction/material-receipt/edit/${row.receiptMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.receiptMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("materialReceipt.breadcrumb.master"), url: "#" },
                        { title: t("materialReceipt.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("materialReceipt.breadcrumb.title") }}
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
                    { title: t("materialReceipt.breadcrumb.master"), url: "#" },
                    { title: t("materialReceipt.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("materialReceipt.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/material-receipt"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
                {/* Date Filter Section with single search */}
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
                    // Voucher code props
                    showVoucherCode={true}
                    voucherCode={voucherCode}
                    onVoucherCodeChange={handleVoucherCodeChange}
                    onClearVoucherCode={clearVoucherCode}
                    voucherCodePlaceholder={t("Search by Voucher No, Receipt No...")}
                    voucherCodeLabel={t("Voucher No")}
                    disableDates={!!voucherCode?.trim()}
                    // Button text
                    filterButtonText={t("common.show") || "Show"}
                />

                {/* Server Paginated Table */}
                <ContentTable
                    columns={columns}
                    data={materialReceiptData}
                    actions={actions}
                    currentPage={page}
                    itemsPerPage={limit}
                    totalItems={meta.total}
                    totalPages={meta.total_pages}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    loading={fetchLoading}
                    renderCell={renderCell}
                    serverPagination={true}
                    footerData={footerData}
                />
            </div>
        </div>
    )
}

export default MaterialReceiptList