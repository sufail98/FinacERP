import AlertBox from '@/components/common/AlertBox'
import BreadCrumb from '@/components/common/BreadCrumb'
import Preloader from '@/components/common/Preloader'
import axiosInstance from '@/lib/axiosConfig'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { Edit, Plus, ReceiptText, Trash2 } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import DateFilterSection from '../../Components/DateFilterSection'
import ContentTable from '@/components/common/ContentTable'
import useAuth from '@/redux/hook/auth/useAuth'

const ProformaInvoiceList = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation();
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([])
    const [filteredSalesData, setFilteredSalesData] = useState([])
    const [voucherCode, setVoucherCode] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings } = useSelector((state) => state.settings)
    const { selectedBranchId } = useAuth()
    const { privileges, loading: privilegeLoading } = usePrivileges("Sales Invoice");
    const debounceTimerRef = useRef(null);
    const customerDebounceTimerRef = useRef(null);
    const isInitialMount = useRef(true);

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Initialize state from URL or localStorage
    const initializeFilters = useCallback(() => {
        // For HashRouter, hash comes after #
        const hash = window.location.hash;
        const queryStart = hash.indexOf('?');

        let searchParams = new URLSearchParams();
        if (queryStart !== -1) {
            searchParams = new URLSearchParams(hash.substring(queryStart + 1));
        }

        const savedFromDate = searchParams.get('fromDate');
        const savedToDate = searchParams.get('toDate');
        const savedVoucherCode = searchParams.get('voucherCode');
        const savedCustomerSearch = searchParams.get('customerSearch');
        const savedPage = searchParams.get('page');
        const savedLimit = searchParams.get('limit');

        return {
            fromDate: savedFromDate || getTodayDate(),
            toDate: savedToDate || getTodayDate(),
            voucherCode: savedVoucherCode || '',
            customerSearch: savedCustomerSearch || '',
            page: savedPage ? parseInt(savedPage) : 1,
            limit: savedLimit ? parseInt(savedLimit) : 80,
        };
    }, []);

    // State initialization
    const initialFilters = useMemo(() => initializeFilters(), [initializeFilters]);

    const [fromDate, setFromDate] = useState(initialFilters.fromDate);
    const [toDate, setToDate] = useState(initialFilters.toDate);
    const [page, setPage] = useState(initialFilters.page);
    const [limit, setLimit] = useState(initialFilters.limit);

    useEffect(() => {
        setVoucherCode(initialFilters.voucherCode);
        setCustomerSearch(initialFilters.customerSearch);
    }, [initialFilters.voucherCode, initialFilters.customerSearch]);

    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        limit: 80,
        total_pages: 1
    });

    // Update URL with current filter state
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
            ? `#/transaction/proforma-invoice/proforma-invoice-list?${queryString}`
            : `#/transaction/proforma-invoice/proforma-invoice-list`;

        window.history.replaceState(null, '', newHash);
    }, []);

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
    // Main fetch function - this is the core API call
    const fetchAllSales = useCallback(async (params = {}) => {
        setFetchLoading(true);
        try {
            // Use provided params or fall back to current state
            const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : voucherCode;
            const currentCustomerSearch = params.customerSearch !== undefined ? params.customerSearch : customerSearch;
            const currentFromDate = params.fromDate !== undefined ? params.fromDate : fromDate;
            const currentToDate = params.toDate !== undefined ? params.toDate : toDate;
            const currentLimit = params.limit !== undefined ? params.limit : limit;
            const currentPage = params.page !== undefined ? params.page : page;

            // Determine if we're searching by voucher code
            const isSearching = currentVoucherCode?.trim();

            const payload = {
                fromDate: isSearching ? null : currentFromDate,
                toDate: isSearching ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null,
                customername: currentCustomerSearch?.trim() || null
            };

            const res = await axiosInstance.post('proforma-invoices', payload);

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
            console.error('Error Fetching Proforma Invoice Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching proforma invoices",
            });
        } finally {
            setFetchLoading(false);
        }
    }, [voucherCode, fromDate, toDate, limit, page, selectedBranchId, generalSettings, customerSearch]);

    // Initial load - only on component mount
    useEffect(() => {
        fetchAllSales({
            page: initialFilters.page,
            limit: initialFilters.limit,
            voucherCode: initialFilters.voucherCode,
            customerSearch: initialFilters.customerSearch,
            fromDate: initialFilters.fromDate,
            toDate: initialFilters.toDate
        });

        // Mark initial mount as complete after fetch
        setTimeout(() => {
            isInitialMount.current = false;
        }, 100);
    }, []); // Empty dependency array - run only once on mount

    // Update URL when filters change
    useEffect(() => {
        updateFilterURL({
            fromDate,
            toDate,
            voucherCode,
            customerSearch,
            page,
            limit,
        });
    }, [fromDate, toDate, voucherCode, customerSearch, page, limit, updateFilterURL]);

    // Fetch when pagination changes (page or limit) - but not on initial mount
    useEffect(() => {
        if (isInitialMount.current) {
            return;
        }
        fetchAllSales({
            page,
            limit
        });
    }, [page, limit]);

    // Fetch when voucher code or customer search changes (debounced) - but not on initial mount
    useEffect(() => {
        if (isInitialMount.current) {
            return;
        }

        // Only trigger auto-fetch for voucher code and customer search
        if (voucherCode || customerSearch) {
            setPage(1);
            fetchAllSales({
                page: 1,
                fromDate,
                toDate,
                voucherCode,
                customerSearch
            });
        }
    }, [voucherCode, customerSearch]);

    const handleVoucherCodeChange = (e) => {
        const value = e.target.value;
        setVoucherCode(value);
        setPage(1);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            // The useEffect for voucherCode changes will handle the fetch
        }, 300);
    };

    const handleCustomerSearchChange = (e) => {
        const value = e.target.value;
        setCustomerSearch(value);
        setPage(1);

        if (customerDebounceTimerRef.current) {
            clearTimeout(customerDebounceTimerRef.current);
        }

        customerDebounceTimerRef.current = setTimeout(() => {
            // The useEffect for customerSearch changes will handle the fetch
        }, 300);
    };

    const clearCustomerSearch = () => {
        setCustomerSearch('');
        setPage(1);
        if (customerDebounceTimerRef.current) {
            clearTimeout(customerDebounceTimerRef.current);
        }
    };

    const clearVoucherCode = () => {
        setVoucherCode('');
        setPage(1);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    };

    const handleFilter = () => {
        if (voucherCode?.trim() || customerSearch?.trim()) {
            // Already handled by the useEffect above
            setPage(1);
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

        // Explicitly trigger fetch when Show button is clicked
        setPage(1);
        fetchAllSales({
            page: 1,
            fromDate,
            toDate,
            voucherCode: '',
            customerSearch: ''
        });
    };

    const handleReset = async () => {
        const today = getTodayDate();

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);

        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(80);
        setVoucherCode('');
        setCustomerSearch('');

        // Clear URL
        const newHash = `#/transaction/proforma-invoice/proforma-invoice-list`;
        window.history.replaceState(null, '', newHash);

        // Fetch with reset values
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

    // Navigate with filter state preserved in URL
    const handleEdit = (row) => {
        const filters = new URLSearchParams({
            fromDate,
            toDate,
            voucherCode,
            customerSearch,
            page,
            limit,
        }).toString();

        navigate(
            `/transaction/proforma-invoice/edit-proforma-invoice/${row.proformaMasterId}?returnFilters=${encodeURIComponent(filters)}`
        );
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
            const res = await axiosInstance.get(`delete-proforma-invoice/${id}`);
            if (!res.data.error) {
                setAlert({ id: Date.now(), type: "success", message: t("deleteSuccess") });

                if (filteredSalesData.length === 1 && page > 1) {
                    const newPage = page - 1;
                    setPage(newPage);
                } else {
                    fetchAllSales();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Proforma Invoice";
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

    const footerData = useMemo(() => {
        if (!filteredSalesData || filteredSalesData.length === 0) return null;

        const grandTotal = filteredSalesData.reduce((sum, item) => {
            return sum + (Number(item.totalAmount) || 0);
        }, 0);

        return {
            SNo: "",
            proformaNo: "",
            date: "",
            partyName: t("Grand Total"),
            totalAmount: grandTotal.toFixed(generalSettings?.decimalPart || 2),
        };
    }, [filteredSalesData, generalSettings?.decimalPart, t]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (customerDebounceTimerRef.current) clearTimeout(customerDebounceTimerRef.current);
        };
    }, []);

    const columns = [
        { key: "SNo", label: t("salesInvoice.list.columns.sno"), sortable: true, align: "right", width: "80px" },
        { key: "proformaNo", label: t("salesInvoice.list.columns.invoiceNo"), sortable: true, align: "left", width: "120px" },
        { key: "date", label: t("salesInvoice.list.columns.date"), sortable: true, align: "left", width: "120px" },
        { key: "partyName", label: t("salesInvoice.list.columns.cashParty"), sortable: true, align: "left", width: "180px" },
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
            onClick: handleEdit,
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.proformaMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("proformaInvoice.breadcrumb.master"), url: "#" },
                        { title: t("proformaInvoice.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("proformaInvoice.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        )
    }

    return (
        <div className="bg-primary dark:bg-primary ">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("proformaInvoice.breadcrumb.master"), url: "#" },
                    { title: t("proformaInvoice.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("proformaInvoice.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/proforma-invoice"),
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
                    voucherCodePlaceholder={t("Search by Proforma No...")}
                    voucherCodeLabel={t("Proforma No")}
                    disableDates={!!voucherCode?.trim()}
                    staticSearchable={true}
                    customerSearch={customerSearch}
                    onCustomerSearchChange={handleCustomerSearchChange}
                    onClearCustomerSearch={clearCustomerSearch}
                    customerSearchPlaceholder={t("Search by Party Name...")}
                    customerSearchLabel={t("Party Name")}
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
                    maxHeight='calc(100vh - 230px)'
                />
            </div>
        </div>
    )
}

export default ProformaInvoiceList