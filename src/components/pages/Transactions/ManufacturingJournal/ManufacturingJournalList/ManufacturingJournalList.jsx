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

const ManufacturingJournalList = () => {
    const [alert, setAlert] = useState(null);
    const [journalData, setJournalData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [fetchLoading, setFetchLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);
    const { selectedBranchId } = useAuth();

    const { privileges, loading: privilegeLoading } = usePrivileges("Manufacturing Journal");

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Date filter states - default to today's date
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getTodayDate());

    // Pagination states
    const [limit, setLimit] = useState(80);
    const [page, setPage] = useState(1);

    // Fetch data when component mounts or dependencies change
    useEffect(() => {
        fetchAllJournals();
    }, [selectedBranchId]);

    // Filter data based on search term (client-side)
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) {
            return journalData;
        }

        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        return journalData.filter(item =>
            item.journalNo?.toLowerCase().includes(lowerSearchTerm) ||
            item.voucherNo?.toLowerCase().includes(lowerSearchTerm) ||
            item.productName?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [journalData, searchTerm]);

    // Paginate filtered data (client-side)
    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return filteredData.slice(startIndex, endIndex).map((item, index) => ({
            ...item,
            SNo: startIndex + index + 1
        }));
    }, [filteredData, page, limit]);

   const fetchAllJournals = async () => {
    setFetchLoading(true);
    try {
         const payload = {
                fromDate: fromDate,
                toDate: toDate,
                branchId: selectedBranchId,
            };
        const res = await axiosInstance.post(`manufacturing-journal`,payload);

        if (!res.data.error && res.data.data) {
            // Flatten the nested structure for the table
            const formattedData = res.data.data.map((item) => {
                const master = item.master || {};
                const firstDetail = item.details?.[0] || {}; // Taking the first produced item
                const materials = firstDetail.materials || [];

                return {
                    // Unique ID for actions
                    journalMasterId: master.JournalMasterId,
                    // Columns for display
                    journalNo: master.JournalNo || master.voucherNo,
                    voucherNo: master.voucherNo,
                    date: formatDate(master.date),
                    // Based on your JSON, 'narration' in details seems to hold the product description
                    productName: firstDetail.narration || "N/A", 
                    quantity: firstDetail.quantity || 0,
                    unitName: firstDetail.unitId || "-", // If you have a unit name, replace this
                    detailCount: materials.length, // Number of raw materials used
                };
            });

            setJournalData(formattedData);
            setPage(1); 
        }
    } catch (error) {
        setAlert({
            id: Date.now(),
            type: "error",
            message: error.response?.data?.message || "Error fetching manufacturing journals",
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
        setSearchTerm('');
        fetchAllJournals();
    };

    const handleReset = async () => {
        const today = getTodayDate();
        setFromDate(today);
        setToDate(today);
        setPage(1);
        setLimit(10);
        setSearchTerm('');
        fetchAllJournals();
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to first page on search
    };

    const clearSearch = () => {
        setSearchTerm('');
        setPage(1);
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
            const res = await axiosInstance.get(`manufacturing-journal-delete/${id}`);
            if (!res.data.error) {
                setAlert({ 
                    id: Date.now(), 
                    type: "success", 
                    message: t("deleteSuccess") || "Manufacturing Journal deleted successfully"
                });

                // Refresh the list
                fetchAllJournals();
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Manufacturing Journal";
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
    { 
        key: "SNo", 
        label: t("manufacturingJournal.list.columns.sno") || "S.No", 
        sortable: true, 
        align: "center" 
    },
    { 
        key: "journalNo", 
        label: t("manufacturingJournal.list.columns.journalNo") || "Journal No", 
        sortable: true, 
        align: "left" 
    },
    { 
        key: "date", 
        label: t("manufacturingJournal.list.columns.date") || "Date", 
        sortable: true, 
        align: "center" 
    },
  
];

    const renderCell = (key, row) => {
        if (key === "quantity") {
            return (
                <div className="text-sm text-right">
                    {Number(row.quantity).toFixed(generalSettings?.decimalPart || 2)}
                </div>
            );
        }

        if (key === "detailCount") {
            return (
                <div className="text-sm text-center">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                        {row.detailCount}
                    </span>
                </div>
            );
        }

        return row[key] ?? "-";
    };

    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(`/transaction/manufacturing-journal/edit/${row.journalMasterId}`),
            className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300",
            onClick: (row) => handleDelete(row.journalMasterId),
            tooltip: "Delete",
        });
    }

    if (privilegeLoading) {
        return (
            <div className="bg-primary dark:bg-primary min-h-screen">
                <BreadCrumb
                    routes={[
                        { title: t("manufacturingJournal.breadcrumb.master"), url: "#" },
                        { title: t("manufacturingJournal.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageCheck, title: t("manufacturingJournal.breadcrumb.title") }}
                />
                <Preloader />
            </div>
        );
    }

    const totalPages = Math.ceil(filteredData.length / limit);

    return (
        <div className="bg-primary dark:bg-primary min-h-screen">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[
                    { title: t("manufacturingJournal.breadcrumb.master") || "Transaction", url: "#" },
                    { title: t("manufacturingJournal.breadcrumb.title") || "Manufacturing Journal", url: "#" },
                ]}
                heading={{ 
                    icon: PackageCheck, 
                    title: t("manufacturingJournal.breadcrumb.title") || "Manufacturing Journal List" 
                }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn") || "Create New",
                                icon: Plus,
                                type: "primary",
                                onClick: () => navigate("/transaction/manufacturing-journal"),
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
                    totalRecords={journalData.length}
                    showTotalRecords={true}
                    searchable={true}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    onClearSearch={clearSearch}
                    searchPlaceholder={t("manufacturingJournal.list.searchPlaceholder") || "Search by Journal No, Product..."}
                    filteredCount={filteredData.length}
                    originalCount={journalData.length}
                />

                {/* Client-side Paginated Table */}
                <ContentTable
                    columns={columns}
                    data={paginatedData}
                    actions={actions}
                    currentPage={page}
                    itemsPerPage={limit}
                    totalItems={filteredData.length}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    loading={fetchLoading}
                    renderCell={renderCell}
                    
                />
            </div>
        </div>
    );
};

export default ManufacturingJournalList;