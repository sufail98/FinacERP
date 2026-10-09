import AlertBox from '@/components/common/AlertBox'
import BreadCrumb from '@/components/common/BreadCrumb'
import Preloader from '@/components/common/Preloader'
import axiosInstance from '@/lib/axiosConfig'
import usePrivileges from '@/lib/hooks/usePrivileges'
import { CreditCard, Eye, Landmark, Plus, ReceiptText, Wallet } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import DateFilterSection from '../../Components/DateFilterSection'
import ContentTable from '@/components/common/ContentTable'
import useAuth from '@/redux/hook/auth/useAuth'

const SalesInvoiceList = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation();
    const [alert, setAlert] = useState(null);
    const [salesData, setSalesData] = useState([])
    const [filteredSalesData, setFilteredSalesData] = useState([])
    const [voucherCode, setVoucherCode] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [fetchLoading, setFetchLoading] = useState(false)
    const { generalSettings, financeSettings } = useSelector((state) => state.settings);


    const { selectedBranchId, currentFinancialYear } = useAuth();
    const { privileges, loading: privilegeLoading } = usePrivileges("Sales Invoice");
    const [taxType, setTaxType] = useState('Applicable to product');
    const debounceTimerRef = useRef(null);
    const customerDebounceTimerRef = useRef(null);
    const isInitialMount = useRef(true);

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };
    const handleTaxTypeChange = (value) => {
        setTaxType(value);
        setPage(1);
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
            ? `#/transaction/sales-invoice/invoice-list?${queryString}`
            : `#/transaction/sales-invoice/invoice-list`;

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

            // Determine if we're searching by voucher code or customer name
            const isSearching = currentVoucherCode?.trim();

            const currentTaxType =
                params.taxType !== undefined ? params.taxType : taxType;

            const payload = {
                fromDate: isSearching ? null : currentFromDate,
                toDate: isSearching ? null : currentToDate,
                limits: currentLimit,
                page: currentPage,
                branchId: selectedBranchId,
                vouchercode: currentVoucherCode?.trim() || null,
                customername: currentCustomerSearch?.trim() || null,
                taxType: currentTaxType,
            };

            const res = await axiosInstance.post('sales', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((currentPage - 1) * currentLimit) + index + 1,
                date: formatDate(item.date),
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
            console.error('Error Fetching Sales Data', error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching sales invoices",
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
            toDate: initialFilters.toDate,
            taxType
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
                customerSearch,
                taxType
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
            customerSearch: '',
            taxType
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
        const newHash = `#/transaction/sales-invoice/invoice-list`;
        window.history.replaceState(null, '', newHash);

        // Fetch with reset values
        setTimeout(() => {
            fetchAllSales({
                fromDate: today,
                toDate: today,
                limit: 80,
                page: 1,
                voucherCode: '',
                customerSearch: '',
                taxType
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
            `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.salesMasterId}?returnFilters=${encodeURIComponent(filters)}`
        );
    };

    const footerData = useMemo(() => {
        if (!filteredSalesData || filteredSalesData.length === 0) return null;

        const grandTotal = filteredSalesData.reduce((sum, item) => {
            return sum + (Number(item.totalAmount) || 0);
        }, 0);

        return {
            SNo: "",
            invoiceNo: "",
            date: "",
            LedgerName: "",
            customerName: t("Grand Total"),
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
        { key: "SNo", label: t("salesInvoice.list.columns.sno"), sortable: true, align: "center", width: "50px" },
        { key: "invoiceNo", label: t("salesInvoice.list.columns.invoiceNo"), sortable: true, align: "left", width: "60px" },
        { key: "date", label: t("salesInvoice.list.columns.date"), sortable: true, align: "left", width: "120px" },
        { key: "LedgerName", label: t("salesInvoice.list.columns.cashParty"), sortable: true, align: "left", width: "180px" },

        ...(generalSettings?.zatcaType?.trim() != "Phase 2"
            ? [{
                key: "customerName",
                label: t("salesInvoice.list.columns.customerName"),
                sortable: true,
                align: "left",
                width: "170px"
            }]
            : []),

        { key: "paymentMode", label: t("salesInvoice.list.columns.paymentMode"), sortable: true, align: "left", width: "80px" },
        { key: "totalAmount", label: t("salesInvoice.list.columns.totalAmt"), sortable: true, align: "right", width: "150px" },
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
        if (key === "date") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-center gap-3">
                        <span>{row.date}</span>
                        <span>{row.billTime}</span>
                    </div>
                </div>
            );
        }
        if (key === "paymentMode") {
            const paymentModes = {
                cash: {
                    label: "Cash",
                    icon: Wallet,
                    className: "bg-green-100 text-green-700 border-green-200",
                },
                bank: {
                    label: "Bank",
                    icon: Landmark,
                    className: "bg-blue-100 text-blue-700 border-blue-200",
                },
                card: {
                    label: "Bank",
                    icon: Landmark,
                    className: "bg-blue-100 text-blue-700 border-blue-200",
                },
                credit: {
                    label: "Credit",
                    icon: CreditCard,
                    className: "bg-amber-100 text-amber-700 border-amber-200",
                },
            };

            const mode = paymentModes[row.paymentMode];

            if (!mode) return "-";

            const Icon = mode.icon;

            return (
                <div className="flex justify-center">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${mode.className}`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {mode.label}
                    </span>
                </div>
            );
        }
        return row[key] ?? "-";
    };

    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Eye className="h-4 w-4" />,
            onClick: handleEdit,
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "View",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary">
                <BreadCrumb
                    routes={[
                        { title: t("salesInvoice.breadcrumb.master"), url: "#" },
                        { title: t("salesInvoice.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("salesInvoice.breadcrumb.title") }}
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
                    { title: t("salesInvoice.breadcrumb.master"), url: "#" },
                    { title: t("salesInvoice.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("salesInvoice.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/sales-invoice"),
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
                    voucherCodePlaceholder={t("Search by Invoice No...")}
                    voucherCodeLabel={t("Invoice No")}
                    disableDates={!!voucherCode?.trim()}
                    staticSearchable={true}
                    customerSearch={customerSearch}
                    onCustomerSearchChange={handleCustomerSearchChange}
                    onClearCustomerSearch={clearCustomerSearch}
                    customerSearchPlaceholder={t("Search by Customer Name and Number")}
                    customerSearchLabel={t("Customer Name and Number")}
                    filterButtonText={t("common.show") || "Show"}
                    taxType={taxType}
                    onTaxTypeChange={handleTaxTypeChange}
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

export default SalesInvoiceList