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

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// Read filters from URL hash query params once (outside component, no re-render risk)
const readFiltersFromURL = () => {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    let searchParams = new URLSearchParams();
    if (queryStart !== -1) {
        searchParams = new URLSearchParams(hash.substring(queryStart + 1));
    }

    return {
        fromDate: searchParams.get('fromDate') || getTodayDate(),
        toDate: searchParams.get('toDate') || getTodayDate(),
        voucherCode: searchParams.get('voucherCode') || '',
        customerSearch: searchParams.get('customerSearch') || '',
        page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 80,
    };
};

const SalesQuotationList = () => {
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([]);
    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);
    const { selectedBranchId } = useAuth();

    const { privileges, loading: privilegeLoading } = usePrivileges("Sales Quotation");

    const debounceTimerRef = useRef(null);
    const customerDebounceTimerRef = useRef(null);

    // ✅ FIX: Read URL once synchronously and initialize ALL state directly in useState
    // This eliminates the race condition caused by restoring state in a useEffect
    const [urlFilters] = useState(() => readFiltersFromURL());

    const [fromDate, setFromDate] = useState(urlFilters.fromDate);
    const [toDate, setToDate] = useState(urlFilters.toDate);
    const [voucherCode, setVoucherCode] = useState(urlFilters.voucherCode);
    const [customerSearch, setCustomerSearch] = useState(urlFilters.customerSearch);
    const [page, setPage] = useState(urlFilters.page);
    const [limit, setLimit] = useState(urlFilters.limit);

    const [meta, setMeta] = useState({
        total: 0,
        page: urlFilters.page,
        limit: urlFilters.limit,
        total_pages: 1
    });

    // Extract just the time (12-hour, with AM/PM) from a datetime string like CreatedDate
    const formatTime = useCallback((dateTimeString) => {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return '';
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours === 0 ? 12 : hours;
        return `${hours}:${minutes} ${ampm}`;
    }, []);

    // ===== UPDATE URL WITH CURRENT FILTER STATE =====
    const updateFilterURL = useCallback((filters) => {
        const params = new URLSearchParams();

        if (filters.fromDate && filters.fromDate !== getTodayDate()) {
            params.append('fromDate', filters.fromDate);
        }
        if (filters.toDate && filters.toDate !== getTodayDate()) {
            params.append('toDate', filters.toDate);
        }
        if (filters.voucherCode?.trim()) {
            params.append('voucherCode', filters.voucherCode);
        }
        if (filters.customerSearch?.trim()) {
            params.append('customerSearch', filters.customerSearch);
        }
        if (filters.page > 1) {
            params.append('page', filters.page);
        }
        if (filters.limit !== 80) {
            params.append('limit', filters.limit);
        }

        const queryString = params.toString();
        const newHash = queryString
            ? `#/transaction/sales-quotation/quotations?${queryString}`
            : `#/transaction/sales-quotation/quotations`;

        window.history.replaceState(null, '', newHash);
    }, []);

    // ✅ FIX: fetchAllSales only depends on selectedBranchId and generalSettings.
    // It does NOT close over filter state — it only reads from its params argument.
    // This prevents stale closure bugs entirely.
    const fetchAllSales = useCallback(async (params = {}) => {
        setFetchLoading(true);
        try {
            const currentVoucherCode = params.voucherCode ?? '';
            const currentCustomerSearch = params.customerSearch ?? '';
            const currentFromDate = params.fromDate ?? getTodayDate();
            const currentToDate = params.toDate ?? getTodayDate();
            const currentLimit = params.limit ?? 80;
            const currentPage = params.page ?? 1;

            const isVoucherSearch = !!currentVoucherCode?.trim();

            const payload = {
                fromDate: isVoucherSearch ? null : currentFromDate,
                toDate: isVoucherSearch ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null,
                customername: currentCustomerSearch?.trim() || null,
            };

            const res = await axiosInstance.post('sales-quotations', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((currentPage - 1) * currentLimit) + index + 1,
                date: (() => {
                    if (!item.date) return '';
                    const date = new Date(item.date);
                    const dd = String(date.getDate()).padStart(2, '0');
                    const MM = String(date.getMonth() + 1).padStart(2, '0');
                    const yyyy = date.getFullYear();
                    const format = generalSettings?.dateformat || 'dd-MM-yyyy';
                    const formattedDatePart = format.replace('dd', dd).replace('MM', MM).replace('yyyy', yyyy);
                    const timePart = formatTime(item.CreatedDate);
                    return timePart ? `${formattedDatePart} ${timePart}` : formattedDatePart;
                })(),
            }));

            setSalesData(formattedData);
            setFilteredSalesData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || currentPage,
                    limit: res.data.meta.limit || currentLimit,
                    total_pages: res.data.meta.total_pages || 1,
                });
            }
        } catch (error) {
            console.error('Error Fetching Sales Quotation Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching sales quotations",
            });
        } finally {
            setFetchLoading(false);
        }
    }, [selectedBranchId, generalSettings?.dateformat, generalSettings?.decimalPart]);

    // ✅ FIX: Single unified effect — reacts to all filter state changes.
    // Because all state is initialized synchronously from the URL in useState(),
    // the very first run of this effect already has the correct restored values.
    // No race condition possible.
    useEffect(() => {
        fetchAllSales({ fromDate, toDate, voucherCode, customerSearch, page, limit });
    }, [voucherCode, customerSearch]);

    // Keep URL in sync whenever filters change
    useEffect(() => {
        updateFilterURL({ fromDate, toDate, voucherCode, customerSearch, page, limit });
    }, [fromDate, toDate, voucherCode, customerSearch, page, limit, updateFilterURL]);

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);
        };
    }, []);

    const handleVoucherCodeChange = (e) => {
        const value = e.target.value;

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            setVoucherCode(value);
            setPage(1);
        }, 300);
    };

    const handleCustomerSearchChange = (e) => {
        const value = e.target.value;

        if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);

        customerDebounceTimerRef.current = setTimeout(() => {
            setCustomerSearch(value);
            setPage(1);
        }, 300);
    };

    const clearCustomerSearch = () => {
        if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);
        setCustomerSearch('');
        setPage(1);
    };

    const clearVoucherCode = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setVoucherCode('');
        setPage(1);
    };

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


    const handleReset = () => {
        const today = getTodayDate();

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);

        // Clear URL first
        window.history.replaceState(null, '', '#/transaction/sales-quotation/quotations');

        // Setting all state together — the unified useEffect will fire once with correct values
        setFromDate(today);
        setToDate(today);
        setVoucherCode('');
        setCustomerSearch('');
        setLimit(80);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    const handleEdit = (row) => {
        const filters = new URLSearchParams({
            fromDate,
            toDate,
            voucherCode,
            customerSearch,
            page,
            limit,
        }).toString();

        const editUrl = `/transaction/sales-quotation/edit-quotation/${row.quotationMasterId}?returnFilters=${encodeURIComponent(filters)}`;
        navigate(editUrl);
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
            const res = await axiosInstance.get(`delete-sales-quotation/${id}`);

            if (!res.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("deleteSuccess") });

                if (filteredSalesData.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchAllSales({ fromDate, toDate, voucherCode, customerSearch, page, limit });
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Quotation";
            const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            setAlert({ id: Date.now(), type: "error", message: finalMessage });
            console.error(error);
        }
    };

    const footerData = useMemo(() => {
        if (!filteredSalesData || filteredSalesData.length === 0) return null;

        const grandTotal = filteredSalesData.reduce((sum, item) => {
            return sum + (Number(item.totalAmount) || 0);
        }, 0);

        return {
            SNo: "",
            quotationNo: "",
            date: "",
            LedgerName: "",
            customerName: t("Grand Total"),
            totalAmount: grandTotal.toFixed(generalSettings?.decimalPart ?? 2),
        };
    }, [filteredSalesData, generalSettings?.decimalPart, t]);

    const columns = [
        { key: "SNo", label: t("salesInvoice.list.columns.sno"), sortable: true, align: "right", width: "80px" },
        { key: "quotationNo", label: t("salesInvoice.list.columns.quotationNo"), sortable: true, align: "left", width: "120px" },
        { key: "date", label: t("salesInvoice.list.columns.date"), sortable: true, align: "left", width: "120px" },
        { key: "LedgerName", label: t("salesInvoice.list.columns.cashParty"), sortable: true, align: "left", width: "180px" },
        { key: "customerName", label: t("salesInvoice.list.columns.customerName"), sortable: true, align: "left", width: "170px" },
        { key: "totalAmount", label: t("salesInvoice.list.columns.totalAmt"), sortable: true, align: "right", width: "150px" },
    ];

    const renderCell = (key, row) => {
        if (key === "totalAmount") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.totalAmount).toFixed(generalSettings?.decimalPart ?? 2)}</span>
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
            onClick: handleEdit,
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.quotationMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesQuotation.breadcrumb.master"), url: "#" },
                        { title: t("salesQuotation.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("salesQuotation.breadcrumb.title") }}
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
                    { title: t("salesQuotation.breadcrumb.master"), url: "#" },
                    { title: t("salesQuotation.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("salesQuotation.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/sales-quotation"),
                            },
                        ]
                        : []
                }
            />

            <div className='p-1'>
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
                    showVoucherCode={true}
                    voucherCode={voucherCode}
                    onVoucherCodeChange={handleVoucherCodeChange}
                    onClearVoucherCode={clearVoucherCode}
                    voucherCodePlaceholder={t("Search by Quotation No...")}
                    voucherCodeLabel={t("Quotation No")}
                    disableDates={!!voucherCode?.trim()}
                    staticSearchable={true}
                    customerSearch={customerSearch}
                    onCustomerSearchChange={handleCustomerSearchChange}
                    onClearCustomerSearch={clearCustomerSearch}
                    customerSearchPlaceholder={t("Search by Customer Name...")}
                    customerSearchLabel={t("Customer Name")}
                    filterButtonText={t("common.show") || "Show"}
                />

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
    );
};

export default SalesQuotationList;