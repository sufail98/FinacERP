import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import useReportExport from '@/hooks/useReportExport';
import { Box, Edit, Eye, Plus, Trash2, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import ContentTable from '@/components/common/ContentTable';

const ProductList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);
    const [products, setProducts] = useState([]);
    const { selectedBranchId } = useAuth();
    const [limit, setLimit] = useState(80);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1
    });

    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Creation");

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const columns = [
        { key: "SNo", label: t("product.list.columns.sno") },
        { key: "productCode", label: t("product.list.columns.productCode"), width: '100px' },
        { key: "barcode", label: t("product.list.columns.barcode"), width: '120px' },
        { key: "productName", label: t("product.list.columns.productName"), width: '400px' },
        { key: "unitName", label: t("product.list.columns.unitName"), width: '100px' },
        { key: "purchaseRate", label: t("product.list.columns.purchaseRate"), width: '130px' },
        { key: "salesPrice", label: t("product.list.columns.salesPrice"), width: '130px' },
        { key: "group1Name", label: t("product.list.columns.group1Name"), width: '130px' },
        { key: "group2Name", label: t("product.list.columns.group2Name"), width: '130px' },
        { key: "group3Name", label: t("product.list.columns.group3Name"), width: '130px' },
        { key: "group4Name", label: t("product.list.columns.group4Name"), width: '130px' },
        { key: "brand", label: t("product.list.columns.brand"), width: '130px' },
        { key: "purchaseTax", label: t("product.list.columns.purchaseTax"), width: '150px' },
        { key: "salesTax", label: t("product.list.columns.salesTax"), width: '150px' },
        { key: "partnumber", label: t("product.list.columns.partnumber"), width: '130px' },
        { key: "location", label: t("product.list.columns.location"), width: '130px' },
        { key: "productImage", label: t("product.list.columns.productImage"), width: '130px' },
    ];

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
            const res = await axiosInstance.get(`delete-product/${id}`);
            if (!res.data.error) {
                setAlert({ key: new Date(), type: "success", message: t("product.messages.deleteSuccess") });
                if (products.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchAllProduct();
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error deleting Product";
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

    const renderCell = (key, row) => {
        if (key === "productImage") {
            return (
                <div className="flex items-center">
                    {row.productImage ? (
                        <img
                            src={row.productImage}
                            alt={row.productName}
                            className="h-12 w-12 object-cover rounded"
                        />
                    ) : (
                        <span className="text-gray-400 italic">{t("noImage")}</span>
                    )}
                </div>
            );
        }

        if (key === "purchaseTax") {
            if (!row.purchaseTaxes || !Array.isArray(row.purchaseTaxes) || row.purchaseTaxes.length === 0) {
                return "-";
            }
            return row.purchaseTaxes.map(tax => tax.taxName).join(', ');
        }

        if (key === "salesTax") {
            if (!row.salesTaxes || !Array.isArray(row.salesTaxes) || row.salesTaxes.length === 0) {
                return "-";
            }
            return row.salesTaxes.map(tax => tax.taxName).join(', ');
        }

        if (key === "salesPrice") {
            return row.salesPrice ? parseFloat(row.salesPrice).toFixed(3) : "-";
        }

        return row[key] ?? "-";
    };

    // Build actions based on privileges
    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(`/master/product-list/edit-product/${row.productCode}`),
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_view) {
        actions.push({
            icon: <Eye className="h-4 w-4" />,
            className: "text-yellow-600 hover:text-red-800",
            onClick: (row) => navigate(`/master/product-list/product-details/${row.productCode}`),
            tooltip: "View",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-red-600 hover:text-red-800",
            onClick: (row) => handleDelete(row.productCode),
            tooltip: "Delete",
        });
    }

    const fetchAllProduct = async () => {
        setLoading(true);
        try {
            let url = `products?limit=${limit}&page=${page}`;
            if (searchTerm.trim()) {
                url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            }
            const response = await axiosInstance.get(url);
            setProducts(response.data.data);
            setMeta(response.data.meta);
        } catch (error) {
            console.error(error);
            setAlert({
                id: Date.now(),
                type: "error",
                message: "Error fetching products",
            });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    // Fetch ALL products for export (limit 50000)
    const fetchAllProductsForExport = async () => {
        const response = await axiosInstance.get(`products?limit=50000&page=1`);
        return response.data.data || [];
    };

    // Build export options from data array
    const getExportOptions = (data) => {
        const exportData = data.map((row, index) => ({
            SNo: index + 1,
            ProductCode: row.productCode || '-',
            Barcode: row.barcode || '-',
            ProductName: row.productName || '-',
            Unit: row.unitName || '-',
            PurchaseRate: row.purchaseRate ? parseFloat(row.purchaseRate).toFixed(3) : '-',
            SalesPrice: row.salesPrice ? parseFloat(row.salesPrice).toFixed(3) : '-',
            Group1: row.group1Name || '-',
            Group2: row.group2Name || '-',
            Group3: row.group3Name || '-',
            Group4: row.group4Name || '-',
            Brand: row.brand || '-',
            PurchaseTax: (row.purchaseTaxes && Array.isArray(row.purchaseTaxes))
                ? row.purchaseTaxes.map(tax => tax.taxName).join(', ') || '-'
                : '-',
            SalesTax: (row.salesTaxes && Array.isArray(row.salesTaxes))
                ? row.salesTaxes.map(tax => tax.taxName).join(', ') || '-'
                : '-',
            PartNumber: row.partnumber || '-',
            Location: row.location || '-',
        }));

        return {
            fileName: 'Product_List',
            sheetName: 'Product List',
            title: t('product.list.breadcrumb.productList'),
            subtitle: `${t('common.exportedOn') || 'Exported on'}: ${new Date().toLocaleDateString()}`,
            data: exportData,
            theme: 'professional',
            columns: [
                { key: 'SNo',         label: t('product.list.columns.sno'),          align: 'center', width: 10  },
                { key: 'ProductCode', label: t('product.list.columns.productCode'),   align: 'center', width: 10 },
                { key: 'Barcode',     label: t('product.list.columns.barcode'),       align: 'center', width: 12 },
                { key: 'ProductName', label: t('product.list.columns.productName'),   align: 'left',   width: 30 },
                { key: 'Unit',        label: t('product.list.columns.unitName'),      align: 'center', width: 8  },
                { key: 'PurchaseRate',label: t('product.list.columns.purchaseRate'),  align: 'right',  width: 12 },
                { key: 'SalesPrice',  label: t('product.list.columns.salesPrice'),    align: 'right',  width: 12 },
                { key: 'Group1',      label: t('product.list.columns.group1Name'),    align: 'left',   width: 12 },
                { key: 'Group2',      label: t('product.list.columns.group2Name'),    align: 'left',   width: 12 },
                { key: 'Group3',      label: t('product.list.columns.group3Name'),    align: 'left',   width: 12 },
                { key: 'Group4',      label: t('product.list.columns.group4Name'),    align: 'left',   width: 12 },
                { key: 'Brand',       label: t('product.list.columns.brand'),         align: 'left',   width: 10 },
                { key: 'PurchaseTax', label: t('product.list.columns.purchaseTax'),   align: 'left',   width: 15 },
                { key: 'SalesTax',    label: t('product.list.columns.salesTax'),      align: 'left',   width: 15 },
                { key: 'PartNumber',  label: t('product.list.columns.partnumber'),    align: 'center', width: 12 },
                { key: 'Location',    label: t('product.list.columns.location'),      align: 'left',   width: 12 },
            ]
        };
    };

    // Generic export handler — fetches all data then calls the export fn
    const handleExport = async (exportFn, extraOptions = {}) => {
        setExportLoading(true);
        setAlert(null);
        try {
            const allData = await fetchAllProductsForExport();
            if (!allData || allData.length === 0) {
                setAlert({ id: Date.now(), type: 'warning', message: t('salesReport.messages.noDataToExport') });
                return;
            }
            const options = getExportOptions(allData);
            exportFn({ ...options, ...extraOptions });
        } catch (error) {
            console.error("❌ Export error:", error);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || error.message || 'Export failed'
            });
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportExcel = () => handleExport(exportGenericToExcel);
    const handleExportPdf   = () => handleExport(exportGenericToPdf, { orientation: 'landscape' });
    const handleExportCsv   = () => handleExport(exportGenericToCsv);

    const handlePageChange = (newPage) => setPage(newPage);

    const handleItemsPerPageChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    const handleSearch = (value) => {
        setSearchTerm(value);
        setPage(1);
    };

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (selectedBranchId) setIsReady(true);
    }, [selectedBranchId]);

    useEffect(() => {
        if (!isReady) return;
        const timeoutId = setTimeout(() => {
            fetchAllProduct();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [isReady, page, limit, searchTerm]);

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("product.list.breadcrumb.master"), url: "#" },
                        { title: t("product.list.breadcrumb.title"), url: "/master/product" },
                        { title: t("product.list.breadcrumb.productList"), url: "#" },
                    ]}
                    heading={{ icon: Box, title: t("product.list.breadcrumb.productList") }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("product.list.breadcrumb.master"), url: "#" },
                        { title: t("product.list.breadcrumb.title"), url: "/master/product" },
                        { title: t("product.list.breadcrumb.productList"), url: "#" },
                    ]}
                    heading={{ icon: Box, title: t("product.list.breadcrumb.productList") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div className="dark:bg-[#121212] transition-colors">
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("product.list.breadcrumb.master"), url: "#" },
                    { title: t("product.list.breadcrumb.title"), url: "/master/product" },
                    { title: t("product.list.breadcrumb.productList"), url: "#" },
                ]}
                heading={{ icon: Box, title: t("product.list.breadcrumb.productList") }}
             
                exportConfig={{
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('product.list.ExportLabel') || 'Export',
                    loading: exportLoading
                }}
                   actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "secondary",
                                onClick: () => navigate('/master/product-creation'),
                            },
                        ]
                        : []
                }
            />

            <div className="w-full dark:bg-[#121212] px-2 py-2 transition-colors">
                <div className="w-full mx-auto">
                    {/* Search Bar */}
                    <div className="mb-4 bg-white dark:bg-[#1e1e1e]">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder={t("product.list.searchPlaceholder") || "Search by product name, code, or barcode..."}
                                className="block w-full pl-10 pr-10 py-1 border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100
                                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                         placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        {searchTerm && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {loading ? t("searching") || "Searching..." : `${meta.total} ${t("resultsFound") || "results found"}`}
                            </p>
                        )}
                    </div>

                    <ContentTable
                        columns={columns}
                        data={products}
                        actions={actions}
                        renderCell={renderCell}
                        currentPage={page}
                        itemsPerPage={limit}
                        totalItems={meta.total}
                        totalPages={meta.total_pages}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        itemsPerPageOptions={[20, 50, 100, 500, 1000]}
                        loading={loading}
                        serverPagination={true}
                        maxHeight="calc(100vh - 200px)"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductList;