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
import DateFilterSection from '../../Components/DateFilterSection'
import ContentTable from '@/components/common/ContentTable'
import useAuth from '@/redux/hook/auth/useAuth'

const DeliveryNoteList = () => {
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([])
    const [filteredSalesData, setFilteredSalesData] = useState([])
    const [voucherCode, setVoucherCode] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const navigate = useNavigate()
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()

    const { privileges, loading: privilegeLoading } = usePrivileges("Delivery Note");

    // Debounce timer refs
    const debounceTimerRef = useRef(null);
    const customerDebounceTimerRef = useRef(null);

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
        limit: 80,
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
    const fetchAllSales = useCallback(async (params = {}) => {
        setFetchLoading(true);
        try {
            const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : voucherCode;
            const currentCustomerSearch = params.customerSearch !== undefined ? params.customerSearch : customerSearch;
            const currentFromDate = params.fromDate !== undefined ? params.fromDate : fromDate;
            const currentToDate = params.toDate !== undefined ? params.toDate : toDate;
            const currentLimit = params.limit !== undefined ? params.limit : limit;
            const currentPage = params.page !== undefined ? params.page : page;

            // Determine if we're searching by voucher code or customer name
            const isSearching = currentVoucherCode?.trim() || currentCustomerSearch?.trim();

            // Build payload - if searching, set dates to null
            const payload = {
                fromDate: isSearching ? null : currentFromDate,
                toDate: isSearching ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null,
                customername: currentCustomerSearch?.trim() || null
            };

            const res = await axiosInstance.post('delivery-notes', payload);

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
            setFilteredSalesData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || currentPage,
                    limit: res.data.meta.limit || currentLimit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            console.error('Error Fetching Delivery Note Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching delivery notes",
            });
        } finally {
            setFetchLoading(false);
        }
    }, [voucherCode, fromDate, toDate, limit, page, selectedBranchId, generalSettings, customerSearch]);

    // Initial load - only on component mount
    useEffect(() => {
        fetchAllSales();
    }, []); // Empty dependency array - run only once on mount

    // Fetch when pagination changes (page or limit)
    useEffect(() => {
        fetchAllSales({
            page,
            limit
        });
    }, [page, limit, fetchAllSales]);

    // Fetch when date range, voucher code, or customer search changes
   useEffect(() => {
    setPage(1);
    fetchAllSales({
        page: 1,
        voucherCode,
        customerSearch
    });
}, [voucherCode, customerSearch]);

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
            // The useEffect will handle the fetch
        }, 300);
    };

    // Debounced search for customer name
    const handleCustomerSearchChange = (e) => {
        const value = e.target.value;
        setCustomerSearch(value);
        setPage(1); // Reset to first page

        // Clear existing timer
        if (customerDebounceTimerRef.current) {
            clearTimeout(customerDebounceTimerRef.current);
        }

        // Set new debounce timer (300ms delay)
        customerDebounceTimerRef.current = setTimeout(() => {
            // The useEffect will handle the fetch
        }, 300);
    };

    // Clear customer search
    const clearCustomerSearch = () => {
        setCustomerSearch('');
        setPage(1);

        // Clear debounce timer
        if (customerDebounceTimerRef.current) {
            clearTimeout(customerDebounceTimerRef.current);
        }
    };

    // Clear voucher code
    const clearVoucherCode = () => {
        setVoucherCode('');
        setPage(1);

        // Clear debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    };

    // Filter button click - only for date filtering
 const handleFilter = () => {
    if (voucherCode?.trim() || customerSearch?.trim()) {
        // search mode is already live via the effect above
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
    fetchAllSales({
        page: 1,
        fromDate,
        toDate,
        voucherCode: '',
        customerSearch: ''
    });
};

    // Reset everything
    const handleReset = async () => {
        const today = getTodayDate();

        // Clear debounce timers
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (customerDebounceTimerRef.current) {
            clearTimeout(customerDebounceTimerRef.current);
        }

        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(80);
        setVoucherCode('');
        setCustomerSearch('');

        // Clear URL
        window.history.replaceState(null, '', '#/transaction/delivery-note/delivery-note-list');

        setTimeout(() => {
            fetchAllSales({
                fromDate: today,
                toDate: today,
                limit: 80,
                page: 1,
                voucherCode: '',
                customerSearch: ''
            });
        }, 0);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
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
            const res = await axiosInstance.get(`delete-delivery-note/${id}`);
            if (!res.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("deleteSuccess") });

                // Refresh data after delete
                if (filteredSalesData.length === 1 && page > 1) {
                    const newPage = page - 1;
                    setPage(newPage);
                } else {
                    fetchAllSales({ page });
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Delivery Note";
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

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (customerDebounceTimerRef.current) {
                clearTimeout(customerDebounceTimerRef.current);
            }
        };
    }, []);

    const footerData = useMemo(() => {
        if (!filteredSalesData || filteredSalesData.length === 0) return null;

        const grandTotal = filteredSalesData.reduce((sum, item) => {
            return sum + (Number(item.totalAmount) || 0);
        }, 0);

        return {
            SNo: "",
            deliveryNoteNo: "",
            date: "",
            LedgerName: t("Grand Total"),
            totalAmount: grandTotal.toFixed(generalSettings?.decimalPart || 2),
        };
    }, [filteredSalesData, generalSettings?.decimalPart, t]);

    const columns = [
        { key: "SNo", label: t("salesInvoice.list.columns.sno"), sortable: true, align: "right", width: "80px" },
        { key: "deliveryNoteNo", label: t("deliveryNote.list.columns.DlvryNoteNo"), sortable: true, align: "left", width: "120px" },
        { key: "date", label: t("salesInvoice.list.columns.date"), sortable: true, align: "left", width: "120px" },
        { key: "LedgerName", label: t("salesInvoice.list.columns.cashParty"), sortable: true, align: "left", width: "180px" },
        { key: "totalAmount", label: t("salesInvoice.list.columns.totalAmt"), sortable: true, align: "right", width: "150px" },
    ];

    const renderCell = (key, row) => {
        if (key === "totalAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.totalAmount).toFixed(generalSettings?.decimalPart || 2)}</span>
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
            onClick: (row) => navigate(`/transaction/delivery-note/edit-delivery-note/${row.deliveryNoteMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.deliveryNoteMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary min-h-screen">
                <BreadCrumb
                    routes={[
                        { title: t("deliveryNote.breadcrumb.master"), url: "#" },
                        { title: t("deliveryNote.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("deliveryNote.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        )
    }

    return (
        <div className="bg-primary dark:bg-primary min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("deliveryNote.breadcrumb.master"), url: "#" },
                    { title: t("deliveryNote.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("deliveryNote.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/delivery-note"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
                {/* Date Filter Section with customer search */}
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
                    voucherCodePlaceholder={t("Search by Delivery Note No...")}
                    voucherCodeLabel={t("Delivery Note No")}
                    disableDates={!!voucherCode?.trim() || !!customerSearch?.trim()}
                    // Customer search props
                    staticSearchable={true}
                    customerSearch={customerSearch}
                    onCustomerSearchChange={handleCustomerSearchChange}
                    onClearCustomerSearch={clearCustomerSearch}
                    customerSearchPlaceholder={t("Search by Ledger Name...")}
                    customerSearchLabel={t("Ledger Name")}
                    // Button text
                    filterButtonText={t("common.show") || "Show"}
                />

                {/* Server Paginated Table */}
                <ContentTable
                    columns={columns}
                    data={filteredSalesData}
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
                    footerData={footerData}
                    maxHeight='70vh'
                    staticSearchable={true}
                />
            </div>
        </div>
    )
}

export default DeliveryNoteList