import BreadCrumb from "@/components/common/BreadCrumb"
import ContentTable from "@/components/common/ContentTable";
import { Card, CardContent } from "@/components/ui/card";
import { PackageSearch, Edit, Plus, Trash2, Filter } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import AddProductGroup from "./AddProductGroup";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import AlertBox from "@/components/common/AlertBox";
import usePrivileges from "@/lib/hooks/usePrivileges";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

const ProductGroup = () => {
    const [open, setOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [editId, setEditId] = useState(null);
    const { t } = useTranslation();

    // ✅ Category filter state
    const [selectedCategory, setSelectedCategory] = useState("all");

    // ✅ Fixed categories - UPDATE: Match actual database values
    const categories = [
        { value: "all", label: t("productGroup.filter.all") || "All Categories" },
        { value: "category-1", label: t("productGroup.filter.category1") || "Category 1" },
        { value: "category-2", label: t("productGroup.filter.category2") || "Category 2" },
        { value: "category-3", label: t("productGroup.filter.category3") || "Category 3" },
        { value: "category-4", label: t("productGroup.filter.category4") || "Category 4" },
    ];

    // ✅ Get privileges for this page
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Group");

    useEffect(() => {
        if (hasAccess && !privilegeLoading) {
            getData();
        }
    }, [hasAccess, privilegeLoading]);

    const getData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("product-groups");
            setData(response.data.data);
        } catch (error) {
            console.error(error);
            setAlert({ key: new Date(), type: "error", message: t("productGroup.alert.fetchError") });
        } finally {
            setLoading(false);
        }
    };

    // ✅ Filter data based on selected category
    const filteredData = useMemo(() => {
        if (selectedCategory === "all") {
            return data;
        }
        return data.filter(item => item.category === selectedCategory);
    }, [data, selectedCategory]);

    const handleDelete = async (id) => {
        if (!privileges?.can_delete) {
            setAlert({ key: new Date(), type: "error", message: t("productGroup.alert.deletePermission") });
            return;
        }

        if (id === 1) {
            setAlert({ type: "error", message: t("DefaultDataMsg") });
            return;
        }
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
            await axiosInstance.get(`delete-product-group/${id}`);
            getData();
            setAlert({ key: new Date(), type: "success", message: t("productGroup.alert.deleteSuccess") });
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.message;
            const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            setAlert({
                id: Date.now(),
                type: "error",
                message: finalMessage,
            });
        }
    };

    const columns = [
        { key: "SNo", label: "#", sortable: true },
        { key: "category", label: t("productGroup.columns.category"), sortable: true },
        { key: "groupName", label: t("productGroup.columns.groupName"), sortable: true },
        { key: "narration", label: t("productGroup.columns.narration"), sortable: true },
    ];

    // ✅ Build actions dynamically based on privileges
    const actions = [];
    if (privileges?.can_edit) {
        actions.push({
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => {
                setEditId(row.groupId);
                setOpen(true);
            },
            className: "text-green-600 hover:text-green-800",
            tooltip: "Edit",
        });
    }
    if (privileges?.can_delete) {
        actions.push({
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row) => handleDelete(row.groupId),
            className: "text-red-600 hover:text-red-800",
            tooltip: "Delete",
        });
    }

    // ✅ Loading state (privilege check + data loading)
    if (privilegeLoading || loading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("productGroup.breadcrumb.master"), url: "#" },
                        { title: t("productGroup.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageSearch, title: t("productGroup.heading") }}
                />
                <Preloader />
            </div>
        );
    }

    // ✅ No access state
    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("productGroup.breadcrumb.master"), url: "#" },
                        { title: t("productGroup.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: PackageSearch, title: t("productGroup.heading") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div className="">
            <BreadCrumb
                routes={[
                    { title: t("productGroup.breadcrumb.master"), url: "#" },
                    { title: t("productGroup.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: PackageSearch, title: t("productGroup.heading") }}
                actions={
                    privileges?.can_add
                        ? [
                            {
                                label: t("createNewBtn"),
                                icon: Plus,
                                type: "primary",
                                onClick: () => {
                                    setEditId(null);
                                    setOpen(true);
                                },
                            },
                        ]
                        : []
                }
            />

            {/* Alert Box */}
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <div className="w-full px-2 py-2">
                <div className="w-full mx-auto">
                    
                    {/* ✅ Category Filter Section */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("productGroup.filter.label") || "Filter by Category:"}
                            </span>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* ✅ Show count of filtered items */}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t("productGroup.filter.showing") || "Showing"}: <strong>{filteredData.length}</strong> {t("productGroup.filter.items") || "items"}
                            {selectedCategory !== "all" && (
                                <button
                                    onClick={() => setSelectedCategory("all")}
                                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {t("productGroup.filter.clearFilter") || "Clear Filter"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ✅ Content Table with filtered data */}
                    <ContentTable
                        columns={columns}
                        data={filteredData}
                        actions={actions}
                        showPagination={false}
                    />
                </div>
            </div>

            {/* Add/Edit Modal */}
            {(privileges?.can_add || privileges?.can_edit) && (
                <AddProductGroup open={open} handleClose={() => setOpen(false)} selectedGroupId={editId} onSuccess={getData} />
            )}
        </div>
    );
};

export default ProductGroup;