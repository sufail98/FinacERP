import BreadCrumb from "@/components/common/BreadCrumb";
import FormComponent from "./FormComponent"
import BarcodePrintModal from "./BarcodePrintModal";
import { useTranslation } from "react-i18next";
import { Eraser, PackagePlus, SaveAll, Table, Barcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import useAuth from "@/redux/hook/auth/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import usePrivileges from "@/lib/hooks/usePrivileges";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import { useSelector } from "react-redux";
import Swal from 'sweetalert2';

const ProductForm = ({ viewMode, modalMode, onSuccess, modalCloase }) => {
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Creation");
    const formSubmitRef = useRef(null);
    const { loading: settingsLoading, loaded, generalSettings } = useSelector((state) => state.settings)
    const { productCode } = useParams();
    const isEditMode = !!productCode;
    const [editData, setEditData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [clearData, setClearData] = useState(null);
    const [barcodePrintModalOpen, setBarcodePrintModalOpen] = useState(false);
    const [loadings, setLoadings] = useState({
        prodMain: false,
        subGrpByCatOne: false,
        subGrpByCatTwo: false,
        subGrpByCatThree: false,
        subGrpByCatFour: false,
        brand: false,
        unit: false,
        tax: false,
    });

    const [productMainGroups, setProductMainGroup] = useState([])
    const [prodSubGroupByCatOne, setProdSubGroupByCatOne] = useState([])
    const [prodSubGroupByCatTwo, setProdSubGroupByCatTwo] = useState([])
    const [prodSubGroupByCatThree, setProdSubGroupByCatThree] = useState([])
    const [prodSubGroupByCatFour, setProdSubGroupByCatFour] = useState([])
    const [brands, setBrands] = useState([])
    const [units, setUnits] = useState([])
    const [tax, setTax] = useState([])
    const { t } = useTranslation();
    const { selectedBranchId } = useAuth();
    const navigate = useNavigate();


    const editDataFetchedRef = useRef(false);
    const dropdownDataFetchedRef = useRef(false);
    const isMountedRef = useRef(true);

    const fetchData = async (endpoint, stateKey, setStateFunction) => {
        if (!isMountedRef.current) return;

        setLoadings(prev => ({ ...prev, [stateKey]: true }));

        try {
            const response = await axiosInstance.get(endpoint);
            if (isMountedRef.current) {
                setStateFunction(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (isMountedRef.current) {
                setLoadings(prev => ({ ...prev, [stateKey]: false }));
            }
        }
    };

    const getProdMainGroup = () => fetchData("product-main-groups", "prodMain", setProductMainGroup);
    const getProdSubGroupByCatOne = () => fetchData("get-subgroup-byId/category-1", "subGrpByCatOne", setProdSubGroupByCatOne);
    const getProdSubGroupByCatTwo = () => fetchData("get-subgroup-byId/category-2", "subGrpByCatTwo", setProdSubGroupByCatTwo);
    const getProdSubGroupByCatThree = () => fetchData("get-subgroup-byId/category-3", "subGrpByCatThree", setProdSubGroupByCatThree);
    const getProdSubGroupByCatFour = () => fetchData("get-subgroup-byId/category-4", "subGrpByCatFour", setProdSubGroupByCatFour);
    const fetchBrands = () => fetchData("brands", "brand", setBrands);
    const fetchUnit = () => fetchData("units", "unit", setUnits);
    const fetchTaxes = () => fetchData("tax-masters", "tax", setTax);

    const fetchAllDropdownData = async () => {
        const endpoints = [
            { url: "product-main-groups", key: "prodMain", setter: setProductMainGroup },
            { url: "get-subgroup-byId/category-1", key: "subGrpByCatOne", setter: setProdSubGroupByCatOne },
            { url: "get-subgroup-byId/category-2", key: "subGrpByCatTwo", setter: setProdSubGroupByCatTwo },
            { url: "get-subgroup-byId/category-3", key: "subGrpByCatThree", setter: setProdSubGroupByCatThree },
            { url: "get-subgroup-byId/category-4", key: "subGrpByCatFour", setter: setProdSubGroupByCatFour },
            { url: "brands", key: "brand", setter: setBrands },
            { url: "units", key: "unit", setter: setUnits },
            { url: "tax-masters", key: "tax", setter: setTax }
        ];

        await Promise.all(
            endpoints.map(({ url, key, setter }) => fetchData(url, key, setter))
        );
    };
// Add this function inside ProductForm
const loadProductById = async (code) => {
    setLoading(true);
    editDataFetchedRef.current = true;
    setEditData(null); // ← clear first so useEffect re-triggers cleanly
    try {
        const res = await axiosInstance.get(`view-product-byId/${code}`);
        if (res.data?.data) {
            setEditData(res.data.data);
        }
    } finally {
        setLoading(false);
    }
};
    useEffect(() => {
        if (!selectedBranchId || !productCode || editDataFetchedRef.current) return;
        editDataFetchedRef.current = true;

        setLoading(true);
        axiosInstance
            .get(`view-product-byId/${productCode}`)
            .then((res) => {

                if (res.data?.data) {
                    setEditData(res.data.data);
                    editDataFetchedRef.current = true;
                }
            })
            .finally(() => setLoading(false));
    }, [productCode, selectedBranchId]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!selectedBranchId || dropdownDataFetchedRef.current) return;
        dropdownDataFetchedRef.current = true;

        fetchAllDropdownData();

        return () => {
            isMountedRef.current = false;
        };
    }, [selectedBranchId]);

    const handleClearFormData = (getFn) => {
        setClearData(() => getFn); // ✅ store the actual clearForm function
    };
    const handleSubmitStateChange = (isSubmitting) => {
        setSubmitLoading(isSubmitting);
    };

    const handleListNavigate = async () => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t('ConfirmCloseTitle'),
                text: t('ConfirmCloseText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClose'),
                cancelButtonText: t('Cancel'),
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) {
                        container.style.cssText += '; z-index: 2147483647 !important;';
                    }
                }
            });
            if (!result.isConfirmed) return;
        }
        navigate("/master/product-list");
    };

    if (loading || settingsLoading || !loaded || privilegeLoading) {

        return (
            <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
                {!modalMode && (
                    <BreadCrumb
                        routes={[
                            { title: t("product.form.breadcrumb.master"), url: "#" },
                            { title: t("product.form.breadcrumb.title"), url: "/master/product" },
                            {
                                title: viewMode
                                    ? t("product.form.breadcrumb.productview")
                                    : isEditMode
                                        ? t("product.form.breadcrumb.productedit")
                                        : t("product.form.breadcrumb.productcreate"),
                                url: "#",
                            },
                        ]}
                        heading={{
                            icon: PackagePlus,
                            title: viewMode
                                ? t("product.form.breadcrumb.productview")
                                : isEditMode
                                    ? t("product.form.breadcrumb.productedit")
                                    : t("product.form.breadcrumb.productcreate"),
                        }}
                        actions={[
                            {
                                label: t("listBtn"),
                                icon: Table,
                                type: "secondary",
                                onClick: handleListNavigate,
                                disabled: submitLoading,
                            },

                        ]}
                    />
                )}
                <Preloader />
            </div>
        );
    }

    if (!privileges?.can_add && !isEditMode && !viewMode) {
        return (
            <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
                {!modalMode && (
                    <BreadCrumb
                        routes={[
                            { title: t("product.form.breadcrumb.master"), url: "#" },
                            { title: t("product.form.breadcrumb.title"), url: "/master/product" },
                            {
                                title: viewMode
                                    ? t("product.form.breadcrumb.productview")
                                    : isEditMode
                                        ? t("product.form.breadcrumb.productedit")
                                        : t("product.form.breadcrumb.productcreate"),
                                url: "#",
                            },
                        ]}
                        heading={{
                            icon: PackagePlus,
                            title: viewMode
                                ? t("product.form.breadcrumb.productview")
                                : isEditMode
                                    ? t("product.form.breadcrumb.productedit")
                                    : t("product.form.breadcrumb.productcreate"),
                        }}
                        actions={
                            privileges?.can_view
                                ? [
                                    {
                                        label: t("listBtn"),
                                        icon: Table,
                                        type: "secondary",
                                        onClick: handleListNavigate,
                                    }
                                ]
                                : []
                        }
                    />
                )}
                <NoAcessComponent />
            </div>
        );
    }

    return (
        <div className=" bg-gray-50 dark:bg-[#121212] transition-colors">
            {!modalMode && (
                <BreadCrumb
                    routes={[
                        { title: t("product.form.breadcrumb.master"), url: "#" },
                        { title: t("product.form.breadcrumb.title"), url: "/master/product" },
                        {
                            title: viewMode
                                ? t("product.form.breadcrumb.productview")
                                : isEditMode
                                    ? t("product.form.breadcrumb.productedit")
                                    : t("product.form.breadcrumb.productcreate"),
                            url: "#",
                        },
                    ]}
                    heading={{
                        icon: PackagePlus,
                        title: viewMode
                            ? t("product.form.breadcrumb.productview")
                            : isEditMode
                                ? t("product.form.breadcrumb.productedit")
                                : t("product.form.breadcrumb.productcreate"),
                    }}
                    actions={[
                        {
                            label: t("listBtn"),
                            icon: Table,
                            type: "secondary",
                            onClick: handleListNavigate,
                            disabled: submitLoading,
                        },
                        ...(isEditMode
                            ? [
                                {
                                    label: t("New") || "New",
                                    icon: PackagePlus,
                                    type: "secondary",
                                 onClick: () => {
    setEditData(null);              // ✅ clear editData in parent
    editDataFetchedRef.current = false;
    navigate("/master/product-creation");
},
                                    disabled: submitLoading,
                                },
                            ]
                            : []),
                        ...(isEditMode && !viewMode
                            ? [
                                {
                                    label: t("printBarcode") || "Print Barcode",
                                    icon: Barcode,
                                    type: "secondary",
                                    onClick: () => setBarcodePrintModalOpen(true),
                                    disabled: submitLoading,
                                },
                            ]
                            : []),
                        ...(!viewMode
                            ? [
                                {
                                    label: t("clearBtn"),
                                    icon: Eraser,
                                    type: "secondary",
                                    onClick: () => {
                                        clearData();
                                    },
                                    disabled: settingsLoading,
                                },
                                {
                                    label: submitLoading ? t("saving") : t("save"),
                                    loading: submitLoading,
                                    icon: SaveAll,
                                    type: "primary",
                                    onClick: () => {
                                        const form = document.querySelector("form");
                                        if (form) {
                                            const submitEvent = new Event("submit", {
                                                bubbles: true,
                                                cancelable: true,
                                            });
                                            form.dispatchEvent(submitEvent);
                                        }
                                    },
                                    disabled: submitLoading,
                                },
                            ]
                            : []),
                    ]}
                />

            )}
            <FormComponent
                key={productCode || 'new'}
                submitRef={formSubmitRef}
                productMainGroups={productMainGroups}
                loadings={loadings}
                getProdMainGroup={getProdMainGroup}
                getProdSubGroupByCatOne={getProdSubGroupByCatOne}
                prodSubGroupByCatOne={prodSubGroupByCatOne}
                getProdSubGroupByCatTwo={getProdSubGroupByCatTwo}
                prodSubGroupByCatTwo={prodSubGroupByCatTwo}
                prodSubGroupByCatThree={prodSubGroupByCatThree}
                prodSubGroupByCatFour={prodSubGroupByCatFour}
                getProdSubGroupByCatThree={getProdSubGroupByCatThree}
                getProdSubGroupByCatFour={getProdSubGroupByCatFour}
                brands={brands}
                fetchBrands={fetchBrands}
                fetchUnit={fetchUnit}
                units={units}
                tax={tax}
                fetchTaxes={fetchTaxes}
                onSubmitStateChange={handleSubmitStateChange}
                onClearFormData={handleClearFormData}
                editData={editData}
                isEditMode={!!productCode}
                viewMode={viewMode}
                onSuccess={onSuccess}
                modalMode={modalMode}
                modalCloase={modalCloase}
                 loadProductById={loadProductById}
            />

            {/* Barcode Print Modal */}
            <BarcodePrintModal
                isOpen={barcodePrintModalOpen}
                onClose={() => setBarcodePrintModalOpen(false)}
                productData={editData}
            />
        </div>
    );
};

export default ProductForm;