// src/components/pages/Master/OfferCreation/OfferCreation.jsx
import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Tag, Trash2 } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import ErrorPage from "@/components/common/ErrorPage";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axiosConfig";
import Swal from "sweetalert2";
import usePrivileges from "@/lib/hooks/usePrivileges";

const OfferCreation = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const { privileges, hasAccess, message } = usePrivileges("Offer Rate");

    const columns = [
        { key: "SNo", label: "S.No", sortable: true, width: "60px" },
        { key: "offerCode", label: "Offer Code", sortable: true, width: "130px" },
        { key: "offerName", label: "Offer Name", sortable: true },
        { key: "fromDate", label: "From", sortable: true, width: "110px" },
        { key: "toDate", label: "To", sortable: true, width: "110px" },
        { key: "IsApproved", label: "Approved", sortable: true, width: "90px" },
        { key: "IsActive", label: "Active", sortable: true, width: "75px" },
    ];

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                const sel = window.getSelection()?.toString();
                if (sel?.length > 0) return;
                const el = document.activeElement;
                if ((el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') && el.selectionStart !== el.selectionEnd) return;
                e.preventDefault();
                if (!privileges?.can_add) { setAlert({ id: Date.now(), type: 'error', message: 'No permission to add offers' }); return; }
                navigate("/master/offer-creation/add");
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [privileges]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("offer-rate");
            const items = res.data?.data || res.data || [];


            const mapped = items.map((item, index) => ({
                ...item,
                // ★ Use offerId as the id (API returns offerId, not id)
                id: item.offerId || item.id || index + 1,
                SNo: index + 1,
                offerCode: item.offerCode || "",
                offerName: item.offerName || "",
                fromDate: item.fromDate || "",
                toDate: item.toDate || "",
                // ★ Convert boolean to string for display
                IsApproved: item.IsApproved ? "Yes" : "No",
                IsActive: item.IsActive ? "Yes" : "No",
            }));

            setData(mapped);
        } catch (err) {
            console.error("Fetch error:", err);
            setErrorMessage(err.response?.data?.message || err.message);
            setFetchError(true);
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!privileges?.can_delete) { setAlert({ id: Date.now(), type: "error", message: "No permission to delete" }); return; }
        const result = await Swal.fire({
            title: t("delete.title"), text: t("delete.text"), icon: "warning", showCancelButton: true,
            confirmButtonColor: "#3085d6", cancelButtonColor: "#d33",
            confirmButtonText: t("delete.confirm"), cancelButtonText: t("delete.cancel"),
        });
        if (!result.isConfirmed) return;
        try {
            await axiosInstance.get(`offer-rate/delete-offer-rate/${id}`);
            setAlert({ id: Date.now(), type: "success", message: "Offer deleted successfully" });
            fetchData();
        } catch (err) {
            setAlert({ id: Date.now(), type: "error", message: err.response?.data?.message || "Delete failed" });
        }
    };

    const actions = [];
    if (privileges?.can_edit) actions.push({
        icon: <Edit className="h-4 w-4" />,
        // ★ Use offerId for navigation
        onClick: (row) => navigate(`/master/offer-creation/edit/${row.id || row.offerId}`),
        className: "text-green-600 hover:text-green-800",
        tooltip: "Edit"
    });
    if (privileges?.can_delete) actions.push({
        icon: <Trash2 className="h-4 w-4" />,
        className: "text-red-600 hover:text-red-800",
        // ★ Use offerId for delete
        onClick: (row) => handleDelete(row.id || row.offerId),
        tooltip: "Delete"
    });

    if (loading) return (<div><BreadCrumb routes={[{ title: "Master", url: "#" }, { title: "Offer Creation", url: "#" }]} heading={{ icon: Tag, title: "Offer Creation" }} /><Preloader /></div>);
    if (!hasAccess) return (<div><BreadCrumb routes={[{ title: "Master", url: "#" }, { title: "Offer Creation", url: "#" }]} heading={{ icon: Tag, title: "Offer Creation" }} />{message && <NoAcessComponent message={message} />}</div>);
    if (fetchError) return <ErrorPage errorMessage={errorMessage} />;

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <BreadCrumb
                routes={[{ title: "Master", url: "#" }, { title: "Offer Creation", url: "#" }]}
                heading={{ icon: Tag, title: "Offer Creation" }}
                actions={privileges?.can_add ? [{ label: `${t("createNewBtn")} (Ctrl+C)`, icon: Plus, type: "primary", onClick: () => navigate("/master/offer-creation/add") }] : []}
            />
            <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2">
                <ContentTable
                    columns={columns}
                    data={data}
                    actions={actions}
                    showPagination={true}
                    staticSearchable={true}
                    pageSize={80}
                    autoFocusSearch={true}
                    renderCell={(key, row) => {
                        // ★ FIX: Return actual values instead of null
                        // null was making ContentTable render blank cells
                        if (key === "SNo") return (
                            <span className="text-gray-700 dark:text-gray-300">{row.SNo}</span>
                        );
                        if (key === "offerCode") return (
                            <span className="font-medium text-gray-900 dark:text-gray-100">{row.offerCode}</span>
                        );
                        if (key === "offerName") return (
                            <span className="text-gray-800 dark:text-gray-200">{row.offerName}</span>
                        );
                        if (key === "fromDate") return (
                            <span className="text-gray-700 dark:text-gray-300">{row.fromDate}</span>
                        );
                        if (key === "toDate") return (
                            <span className="text-gray-700 dark:text-gray-300">{row.toDate}</span>
                        );
                        if (key === "IsApproved") return (
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                                row.IsApproved === "Yes"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>{row.IsApproved}</span>
                        );
                        if (key === "IsActive") return (
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                                row.IsActive === "Yes"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>{row.IsActive}</span>
                        );
                        // ★ Fallback: return the value directly
                        return row[key] ?? "";
                    }}
                />
            </div>
        </div>
    );
};

export default OfferCreation;