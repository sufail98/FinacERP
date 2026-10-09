import { useState, useMemo, useRef, useEffect } from 'react';
import BreadCrumb from '../../common/BreadCrumb';
import { useTranslation } from 'react-i18next';
import { Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BarcodePrintModal from '.././Master/multiMasterForms/Product/BarcodePrintModal';
import useAuth from "@/redux/hook/auth/useAuth";
import BarcodeLabelPreview from './BarcodeLabelPreview';
import Preloader from '../../common/Preloader';
import { useSelector } from 'react-redux';
import { sanitize } from '@/lib/inputSanitizer';

const BarcodeGenerator = () => {
    const { t } = useTranslation();
    const { selectedBranchDetails, currentCurrency } = useAuth();
    const { allProducts, loading: productLoading } = useSelector((state) => state.products);
    const { barcodeAlignmentSettings } = useSelector((state) => state.settings);
    

    const [form, setForm] = useState({
        productName: '',
        price: '',
        barcode: '',
        supplierCode: '',
    });
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // --- Suggestion state ---
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

 const filteredProducts = useMemo(() => {
    const query = form.productName.trim().toLowerCase();
    if (!query || !Array.isArray(allProducts)) return [];
    return allProducts
        .filter((p) =>
            p.productName?.toLowerCase().includes(query) ||
            p.barcode?.toLowerCase().includes(query)
        )
        .slice(0, 8);
}, [form.productName, allProducts]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

   const handleChange = (field) => (e) => {

    let value = e.target.value;
    if (field === "price") {
        if (!/^\d*\.?\d*$/.test(value)) {
            return;
        }
    }
    if(field === "productName"){
         value = value.replace(/[^a-zA-Z0-9 ]/g, "");
        setShowSuggestions(true);
    }
    setForm((prev) => ({
        ...prev,
        [field]: value,
    }));
};
const handlePriceBlur = () => {
    let value = parseFloat(form.price);

    if (isNaN(value) || value < 0) {
        value = Math.abs(value || 0);
    }

    setForm((prev) => ({
        ...prev,
        price: value.toString(),
    }));
};


    const handleSelectProduct = (product) => {
        const firstPrice = product.salesPrice?.[0]?.salesPrice ?? product.fixedSalesRate ?? '';
        setForm({
            productName: product.productName || '',
            price: firstPrice ? String(parseFloat(firstPrice)) : '',
            barcode: product.barcode || '',
            supplierCode: product.supplierCode || '',
        });
        setShowSuggestions(false);
    };

    // Build a productData shape that BarcodePrintModal already understands
    const buildProductData = () => ({
        productName: form.productName,
        productCode: form.barcode,
        supplierCode: form.supplierCode,
        unitId: 1,
        unit: { UnitName: 'PCS' },
        unit_conversions: [
            {
                barcode: form.barcode,
                unitId: 1,
            },
        ],
        salesPrices: [
            {
                unitId: 1,
                salesPrice: parseFloat(form.price) || 0,
                unit: { UnitName: 'PCS' },
            },
        ],
    });

    const handleOpenPrint = () => {
        if (!form.barcode.trim()) return;
        setIsPrintModalOpen(true);
    };

    if (productLoading) {
        return (
          <>
            <BreadCrumb
                routes={[
                    { title: t('barcodeGenerator.breadcrumb.menu'), url: '3' },
                    { title: t('barcodeGenerator.breadcrumb.title') },
                ]}
                heading={{
                    icon: QrCode,
                    title: t('barcodeGenerator.breadcrumb.title'),
                }}

            />
            <Preloader/>
          </>
        )
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t('barcodeGenerator.breadcrumb.menu'), url: '3' },
                    { title: t('barcodeGenerator.breadcrumb.title') },
                ]}
                heading={{
                    icon: QrCode,
                    title: t('barcodeGenerator.breadcrumb.title'),
                }}
                actions={[
                    {
                        label: t('barcodeGenerator.form.actions.printBtn'),
                        icon: Printer,
                        type: 'primary',
                        onClick: handleOpenPrint,
                    },
                ]}
            />

            <div className="max-w-lg mx-auto mt-6 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">

                {/* Product Name with suggestions */}
                <div className="space-y-1 relative" ref={wrapperRef}>
                    <Label htmlFor="productName" className="text-sm text-gray-600 dark:text-gray-400">
                        {t('barcodeGenerator.form.labels.productName') || 'Product name'}
                    </Label>
                    <Input
                        id="productName"
                        placeholder="e.g. Mineral water 500ml"
                        value={form.productName}
                        onChange={handleChange('productName')}
                        onFocus={() => form.productName && setShowSuggestions(true)}
                        autoComplete="off"
                    />

                    {showSuggestions && filteredProducts.length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                            {filteredProducts.map((product) => (
                                <li
                                    key={product.productId ?? product.productCode}
                                    onClick={() => handleSelectProduct(product)}
                                    className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between gap-2"
                                >
                                    <span className="truncate">{product.productName}</span>
                                    <span className="text-xs text-gray-400 shrink-0">{product.barcode}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {showSuggestions && form.productName && filteredProducts.length === 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-sm text-gray-400">
                            No matches found
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <Label htmlFor="price" className="text-sm text-gray-600 dark:text-gray-400">
                        {t('barcodeGenerator.form.labels.price') || 'Price (SR)'} ({currentCurrency?.currencySymbol})
                    </Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.price}
                        onChange={handleChange('price')}
                        onKeyDown={(e) => {
                            if(e.key === "-") e.preventDefault()
                        }}
                         onBlur={handlePriceBlur}
                    />
                    
                    
                </div>

                <div className="space-y-1">
                    <Label htmlFor="barcode" className="text-sm text-gray-600 dark:text-gray-400">
                        {t('barcodeGenerator.form.labels.barcode') || 'Barcode'}
                    </Label>
                    <Input
                        id="barcode"
                        placeholder="e.g. 6281023456789"
                        value={form.barcode}
                        onChange={handleChange('barcode')}
                    />
                </div>

                <div className="space-y-1">
                    <Label htmlFor="supplierCode" className="text-sm text-gray-600 dark:text-gray-400">
                        {t('barcodeGenerator.form.labels.supplierCode') || 'Supplier code'}{' '}
                        <span className="text-xs text-gray-400">
                            ({t('barcodeGenerator.form.labels.optional') || 'optional'})
                        </span>
                    </Label>
                    <Input
                        id="supplierCode"
                        placeholder="e.g. SUP-12345"
                        value={form.supplierCode}
                        onChange={handleChange('supplierCode')}
                    />
                </div>

                <BarcodeLabelPreview
                    productName={form.productName}
                    price={form.price}
                    barcode={form.barcode}
                    supplierCode={form.supplierCode}
                    companyName={barcodeAlignmentSettings?.branchName}
                    currencySymbol={currentCurrency?.currencySymbol || 'SR'}
                />

            </div>

            <BarcodePrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                productData={buildProductData()}
                companyName={barcodeAlignmentSettings?.branchName}
            />
        </div>
    );
};

export default BarcodeGenerator;