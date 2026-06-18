import BreadCrumb from '@/components/common/BreadCrumb';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import { Box } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

const ViewProduct = () => {
    const { productCode } = useParams();
    const navigate = useNavigate();
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [imageError, setImageError] = useState(false);
    const { t } = useTranslation()

    useEffect(() => {
        fetchProduct();
    }, [productCode]);

    const fetchProduct = () => {
        setLoading(true);
        axiosInstance
            .get(`view-product-byId/${productCode}`)
            .then((res) => {
                if (res.data?.data) {
                    setProductData(res.data.data);
                }
            })
            .catch((err) => console.error('Error fetching product:', err))
            .finally(() => setLoading(false));
    };

    const parseNutritionDetails = (details) => {
        try {
            return JSON.parse(details);
        } catch {
            return [];
        }
    };

    if (loading) {
        return (
         <>
            <BreadCrumb
                routes={[
                    { title: t("product.veiw.breadcrumb.master"), url: "#" },
                    { title: t("product.veiw.breadcrumb.title"), url: "/master/product" },
                    { title: t("product.veiw.breadcrumb.productList"), url: "#" },
                    { title: t("product.veiw.breadcrumb.productDetails"), url: "#" },
                ]}
                heading={{ icon: Box, title: t("product.veiw.breadcrumb.productDetails") }}
            />
            <Preloader/>
         </>
        );
    }

    if (!productData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <p className="text-gray-500 text-sm">Product not found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-sm text-blue-600 hover:underline"
                >
                    ← Go Back
                </button>
            </div>
        );
    }

    const nutritionData = productData.NutritionDetails
        ? parseNutritionDetails(productData.NutritionDetails)
        : [];

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'stock', label: 'Stock' },
        { key: 'units', label: 'Units' },
        { key: 'bom', label: 'BOM' },
        { key: 'nutrition', label: 'Nutrition' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <BreadCrumb
                routes={[
                    { title: t("product.veiw.breadcrumb.master"), url: "#" },
                    { title: t("product.veiw.breadcrumb.title"), url: "/master/product" },
                    { title: t("product.veiw.breadcrumb.productList"), url: "#" },
                    { title: t("product.veiw.breadcrumb.productDetails"), url: "#" },
                ]}
                heading={{ icon: Box, title: t("product.veiw.breadcrumb.productDetails") }}
            />

            <div className=" mx-auto px-4 py-4">
                {/* Hero: Info + Image */}
                <div className="flex gap-4 mb-4 flex-col sm:flex-row">
                    {/* Left - Product Info */}
                    <div className="flex-1">
                        <div className="bg-slate-800 rounded-lg p-4 text-white">
                            <div className="mb-3">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                    Product Code
                                </p>
                                <h1 className="text-2xl font-bold font-mono tracking-wide">
                                    {productData.productCode}
                                </h1>
                            </div>
                            <div className="mb-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                    Product Name
                                </p>
                                <h2 className="text-lg font-semibold">
                                    {productData.productName}
                                </h2>
                                {productData.productNameArb && (
                                    <p className="text-sm text-slate-300 mt-0.5" dir="rtl">
                                        {productData.productNameArb}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700">
                                <span
                                    className={`text-xl ${productData.favourite ? 'text-yellow-400' : 'text-slate-500'
                                        }`}
                                >
                                    {productData.favourite ? '★' : '☆'}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {productData.favourite ? 'Favourite' : 'Not Favourite'}
                                </span>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {[
                                productData.category,
                                productData.brand?.brandName,
                                productData.unit?.UnitName,
                                productData.tax?.taxName,
                                productData.partNo ? `Part#: ${productData.partNo}` : null,
                            ]
                                .filter(Boolean)
                                .map((tag, i) => (
                                    <span
                                        key={i}
                                        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600"
                                    >
                                        {tag}
                                    </span>
                                ))}
                        </div>
                    </div>

                    {/* Right - Image */}
                    <div className="w-full sm:w-56 shrink-0">
                        <div className="relative bg-white border rounded-lg h-48 sm:h-full overflow-hidden">
                            {productData.productImage && !imageError ? (
                                <img
                                    src={productData.productImage}
                                    alt={productData.productName}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                    <span className="text-4xl">📷</span>
                                    <span className="text-xs mt-1">No Image</span>
                                </div>
                            )}
                            <span
                                className={`absolute top-2 right-2 text-2xl ${productData.favourite ? 'text-yellow-400' : 'text-white/40'
                                    }`}
                            >
                                {productData.favourite ? '★' : '☆'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 bg-white border rounded-lg p-1 mb-3 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${activeTab === tab.key
                                    ? 'main-bg text-white'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* General Info */}
                            <Card title="General Information">
                                <InfoRow
                                    label="Product Code"
                                    value={productData.productCode}
                                    highlight
                                />
                                <InfoRow
                                    label="Product Name"
                                    value={productData.productName}
                                    highlight
                                />
                                <InfoRow label="Arabic Name" value={productData.productNameArb} />
                                <InfoRow label="Category" value={productData.category} />
                                <InfoRow label="Brand" value={productData.brand?.brandName} />
                                <InfoRow label="Unit" value={productData.unit?.UnitName} />
                                <InfoRow label="Part No" value={productData.partNo} />
                                <InfoRow label="Group Code" value={productData.groupCode} />
                                <InfoRow label="Tax" value={productData.tax?.taxName} />
                                <InfoRow label="Tax Type" value={productData.taxType} />
                                <InfoRow label="Location" value={productData.Location} />
                                <InfoRow label="Alternative No" value={productData.AlternativeNo} />
                                <InfoRow label="Narration" value={productData.narration} />
                            </Card>

                            {/* Flags */}
                            <Card title="Settings">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <FlagItem label="Active" value={productData.active} />
                                    <FlagItem label="Favourite" value={productData.favourite} star />
                                    <FlagItem label="Allow Batch" value={productData.allowBatch} />
                                    <FlagItem label="BOM" value={productData.bom} />
                                    <FlagItem label="Show Reminder" value={productData.showReminder} />
                                    <FlagItem label="Show Expiry" value={productData.ShowExpiry} />
                                    <FlagItem label="Sales" value={productData.EnableSales} />
                                    <FlagItem label="Purchase" value={productData.EnablePurchase} />
                                    <FlagItem label="Inventory" value={productData.EnableInventory} />
                                    <FlagItem label="POS" value={productData.pointOfSale} />
                                    <FlagItem label="Nutrition" value={productData.NutritionFact} />
                                </div>
                            </Card>

                            {/* Pricing */}
                            <Card title="Pricing">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <PriceItem label="Purchase Rate" value={productData.purchaseRate} />
                                    <PriceItem label="Avg Cost" value={productData.avgCost} />
                                    <PriceItem label="Avg Rate" value={productData.avgRate} />
                                    <PriceItem label="FIFO Value" value={productData.fifoValue} />
                                    <PriceItem label="FIFO Rate" value={productData.fifoRate} />
                                    <PriceItem label="Purchase Rate Per" value={productData.PurchaseRatePer} />
                                </div>
                            </Card>

                            {/* Audit */}
                            <Card title="Audit">
                                <InfoRow label="Created" value={productData.CreatedDate} />
                                <InfoRow label="Created By" value={productData.CreatedUser ? `User ${productData.CreatedUser}` : null} />
                                <InfoRow label="Modified" value={productData.ModifiedDate} />
                                <InfoRow label="Modified By" value={productData.ModifiedUser} />
                                <InfoRow label="Branch" value={productData.branchId} />
                            </Card>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <Card title="Sales Prices">
                            {productData.sales_prices?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-left text-gray-500">
                                                <th className="py-2 px-2 font-semibold">#</th>
                                                <th className="py-2 px-2 font-semibold">Unit</th>
                                                <th className="py-2 px-2 font-semibold">Level</th>
                                                <th className="py-2 px-2 font-semibold text-right">Amount</th>
                                                <th className="py-2 px-2 font-semibold text-right">Disc%</th>
                                                <th className="py-2 px-2 font-semibold text-right">Disc Amt</th>
                                                <th className="py-2 px-2 font-semibold text-right">Price</th>
                                                <th className="py-2 px-2 font-semibold text-right">Lowest</th>
                                                <th className="py-2 px-2 font-semibold">Branch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productData.sales_prices.map((sp, i) => (
                                                <tr key={sp.salespriceId} className="border-b border-gray-100">
                                                    <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                                            {sp.unit?.UnitName || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-600">
                                                        {sp.pricing_level?.PricingLevelName || '-'}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(sp.amount).toFixed(3)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(sp.discPercentage).toFixed(2)}%
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(sp.discAmount).toFixed(3)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono font-semibold text-green-700">
                                                        {parseFloat(sp.salesPrice).toFixed(3)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(sp.lowestSellingPrice).toFixed(3)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500">{sp.branchId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    )}

                    {activeTab === 'stock' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Card title="Stock Levels">
                                <div className="grid grid-cols-2 gap-2">
                                    <StockItem label="Min Stock" value={productData.minimumStock} color="text-red-600" />
                                    <StockItem label="Max Stock" value={productData.maximumStock} color="text-green-600" />
                                    <StockItem label="Reorder" value={productData.reorderLevel} color="text-amber-600" />
                                    <StockItem label="Opening" value={productData.openingStock} color="text-blue-600" />
                                </div>
                            </Card>
                            <Card title="Expiry">
                                <InfoRow label="Show Expiry" value={productData.ShowExpiry ? 'Yes' : 'No'} />
                                <InfoRow label="Expiry Days" value={productData.ExpiryDays} />
                                <InfoRow label="Lead Time" value={productData.CustomerLeadTime} />
                            </Card>
                        </div>
                    )}

                    {activeTab === 'units' && (
                        <Card title="Unit Conversions">
                            {productData.unit_conversions?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-left text-gray-500">
                                                <th className="py-2 px-2 font-semibold">#</th>
                                                <th className="py-2 px-2 font-semibold">Unit</th>
                                                <th className="py-2 px-2 font-semibold text-right">Rate</th>
                                                <th className="py-2 px-2 font-semibold">Barcode</th>
                                                <th className="py-2 px-2 font-semibold">Branch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productData.unit_conversions.map((uc, i) => (
                                                <tr key={uc.unitConversionId} className="border-b border-gray-100">
                                                    <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                                            {uc.unit?.UnitName || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(uc.conversionRate).toFixed(2)}
                                                    </td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                                            {uc.barcode || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500">{uc.branchId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    )}

                    {activeTab === 'bom' && (
                        <Card title="Bill of Materials">
                            {productData.bom && productData.bill_of_materials?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-left text-gray-500">
                                                <th className="py-2 px-2 font-semibold">#</th>
                                                <th className="py-2 px-2 font-semibold">Raw Material</th>
                                                <th className="py-2 px-2 font-semibold">Unit</th>
                                                <th className="py-2 px-2 font-semibold text-right">Qty</th>
                                                <th className="py-2 px-2 font-semibold">Branch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productData.bill_of_materials.map((bom, i) => (
                                                <tr key={bom.bomId} className="border-b border-gray-100">
                                                    <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                                                            {bom.rowMaterialId}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-2">
                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                                            {bom.unit?.UnitName || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right font-mono">
                                                        {parseFloat(bom.Quantity).toFixed(2)}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-gray-500">{bom.branchId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    )}

                    {activeTab === 'nutrition' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Card title="Nutrition Info">
                                <InfoRow label="Nutrition Fact" value={productData.NutritionFact ? 'Yes' : 'No'} />
                                <InfoRow label="Name" value={productData.NutritionName} />
                                <InfoRow label="Ingredients" value={productData.Ingredients} />
                            </Card>
                            {nutritionData.length > 0 && (
                                <Card title="Nutrition Details">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-left text-gray-500">
                                                <th className="py-2 px-2 font-semibold">#</th>
                                                <th className="py-2 px-2 font-semibold">Nutrient</th>
                                                <th className="py-2 px-2 font-semibold">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nutritionData.map((nd, i) => (
                                                <tr key={i} className="border-b border-gray-100">
                                                    <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                                                    <td className="py-1.5 px-2">{nd.name}</td>
                                                    <td className="py-1.5 px-2">{nd.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ========== Sub Components ========== */

const Card = ({ title, children }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-800 mb-2 pb-1.5 border-b border-gray-100">
            {title}
        </h3>
        {children}
    </div>
);

const InfoRow = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-500">{label}</span>
        <span
            className={`text-xs font-medium text-right max-w-[60%] truncate ${highlight
                    ? 'bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold'
                    : 'text-gray-800'
                }`}
        >
            {value || 'N/A'}
        </span>
    </div>
);

const FlagItem = ({ label, value, star }) => (
    <div className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded">
        <span
            className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold ${value ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
                }`}
        >
            {star ? (value ? '★' : '☆') : value ? '✓' : '✗'}
        </span>
        <span className="text-[11px] text-gray-600">{label}</span>
    </div>
);

const PriceItem = ({ label, value }) => (
    <div className="bg-gray-50 rounded p-2">
        <p className="text-[10px] text-gray-500 uppercase font-semibold">{label}</p>
        <p className="text-sm font-bold font-mono text-gray-800">
            {parseFloat(value || 0).toFixed(3)}
        </p>
    </div>
);

const StockItem = ({ label, value, color }) => (
    <div className="bg-gray-50 rounded p-2.5 text-center">
        <p className="text-[10px] text-gray-500 font-semibold uppercase">{label}</p>
        <p className={`text-lg font-bold font-mono ${color}`}>
            {parseFloat(value || 0).toFixed(2)}
        </p>
    </div>
);

const Empty = () => (
    <p className="text-center text-xs text-gray-400 py-6">No data available</p>
);

export default ViewProduct;