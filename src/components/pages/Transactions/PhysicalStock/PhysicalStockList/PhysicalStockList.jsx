import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import { Edit, PackageCheck, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useAuth from '@/redux/hook/auth/useAuth';
import ContentTable from '@/components/common/ContentTable';
import DateFilterSection from '../../Components/DateFilterSection';

const PhysicalStockList = () => {
    const [alert, setAlert] = useState(null);
    const [physicalStockData, setPhysicalStockData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('') // Search state
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Physical Stock");

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

    // Fetch data when page or limit changes
    useEffect(() => {
        fetchAllPhysicalStocks();
    }, [page, limit]);
    const { selectedBranchId } = useAuth()

    // Filter data based on search term (client-side)
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) {
            return physicalStockData;
        }

        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        return physicalStockData.filter(item =>
            item.physicalStockNo?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [physicalStockData, searchTerm]);
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

    // Update SNo for filtered data
    const displayData = useMemo(() => {
        return filteredData.map((item, index) => ({
            ...item,
            SNo: index + 1,
            date: (() => {
                    const datePart = formatDate(item.date);
                    const timePart = formatTime(item.CreatedDate);
                    return timePart ? `${datePart} ${timePart}` : datePart;
                })(),
        }));
    }, [filteredData]);

    const fetchAllPhysicalStocks = async () => {
        setFetchLoading(true);
        try {
            const payload = {
                fromDate: fromDate,
                toDate: toDate,
                limits: limit,
                page: page,
                branchId: selectedBranchId
            };
            const res = await axiosInstance.post('physical-stocks', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: ((page - 1) * limit) + index + 1,
                // date: formatDate(item.date),
            }));

            setPhysicalStockData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || page,
                    limit: res.data.meta.limit || limit,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching physical stocks",
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
        setSearchTerm(''); // Clear search when filtering
        fetchAllPhysicalStocks();
    };

    const handleReset = async () => {
        const today = getTodayDate();
        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setSearchTerm(''); // Clear search on reset

        setFetchLoading(true);
        try {
            const payload = {
                fromDate: today,
                toDate: today,
                limits: 10,
                page: 1,
                branchId: selectedBranchId
            };
            const res = await axiosInstance.post('physical-stocks', payload);

            const formattedData = res.data.data.map((item, index) => ({
                ...item,
                SNo: index + 1,
                // date: formatDate(item.date),
            }));

            setPhysicalStockData(formattedData);

            if (res.data.meta) {
                setMeta({
                    total: res.data.meta.total || 0,
                    page: res.data.meta.page || 1,
                    limit: res.data.meta.limit || 10,
                    total_pages: res.data.meta.total_pages || 1
                });
            }
        } catch (error) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || "Error fetching physical stocks",
            });
        } finally {
            setFetchLoading(false);
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
            const res = await axiosInstance.get(`delete-physical-stock/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("deleteSuccess") });

                if (physicalStockData.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchAllPhysicalStocks();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Physical Stock";
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
        { key: "SNo", label: t("physicalStock.list.columns.sno"), sortable: true, align: "right" },
        { key: "physicalStockNo", label: t("physicalStock.list.columns.physicalStockNo"), sortable: true, align: "left" },
        { key: "date", label: t("physicalStock.list.columns.date"), sortable: true, align: "left" },
        { key: "totalAmount", label: t("physicalStock.list.columns.totalAmt"), sortable: true, align: "right" },
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
            onClick: (row) => navigate(`/transaction/physical-stock/edit/${row.physicalStockMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.physicalStockMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary min-h-screen">
                <BreadCrumb
                    routes={[
                        { title: t("physicalStock.breadcrumb.master"), url: "#" },
                        { title: t("physicalStock.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageCheck, title: t("physicalStock.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        );
    }

    return (
        <div className="bg-primary dark:bg-primary min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("physicalStock.breadcrumb.master"), url: "#" },
                    { title: t("physicalStock.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: PackageCheck, title: t("physicalStock.breadcrumb.title") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/physical-stock"),
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
                    searchable={true}
                    // Search props
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onClearSearch={clearSearch}
                    searchPlaceholder={t("Search by Stock No...")}
                    filteredCount={displayData.length}
                    originalCount={physicalStockData.length}
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
                    loading={fetchLoading}
                    renderCell={renderCell}
                    serverPagination={!searchTerm}
                />
            </div>
        </div>
    );
};

export default PhysicalStockList;