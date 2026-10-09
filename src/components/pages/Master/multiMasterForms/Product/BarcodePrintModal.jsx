import { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, AlertCircle, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import bwipjs from 'bwip-js';
import useAuth from '@/redux/hook/auth/useAuth';
import { useSelector } from 'react-redux';

// ── detect environment ──────────────────────────────────────────────
const isElectron = () =>
    typeof window !== 'undefined' &&
    typeof window.electronAPI !== 'undefined';

const getElectronPrint = async () => {
    if (!isElectron()) return { getPrinterPreference: null, printSilent: null };
    const mod = await import('@/utils/electronPrint');
    return { getPrinterPreference: mod.getPrinterPreference, printSilent: mod.printSilent };
};

const BarcodePrintModal = ({ isOpen, onClose, productData }) => {
    const { t } = useTranslation();
    const { selectedBranchDetails } = useAuth();
    const { barcodeAlignmentSettings } = useSelector((state) => state.settings);
    const companyName = barcodeAlignmentSettings?.branchName || 'COMPANY NAME';

    const [savedPrinterName, setSavedPrinterName] = useState('');
    const [barcodeCopies, setBarcodeCopies] = useState({});
    const [printLoading, setPrintLoading] = useState(false);
    const [loadingPrinter, setLoadingPrinter] = useState(false);
    const [barcodeList, setBarcodeList] = useState([]);
    const inElectron = isElectron();

    useEffect(() => {
        if (!isOpen) return;
        extractBarcodes();
        if (inElectron) loadSavedBarcodePrinter();
    }, [isOpen, productData]);

    // ── Load saved barcode printer from electron-store ────────────────
    const loadSavedBarcodePrinter = async () => {
        setLoadingPrinter(true);
        try {
            const { getPrinterPreference } = await getElectronPrint();
            const saved = await getPrinterPreference('barcode');
            setSavedPrinterName(saved || '');
        } catch (err) {
            console.error('❌ [BARCODE MODAL] Failed to load saved printer:', err);
            setSavedPrinterName('');
        } finally {
            setLoadingPrinter(false);
        }
    };

    const extractBarcodes = () => {
        if (!productData) return;
        const barcodes = [];

        const getSalesPriceForUnit = (unitId) => {
            if (!productData.salesPrices || !Array.isArray(productData.salesPrices)) return null;
            const currentBranchId = selectedBranchDetails?.branchId;
            let priceEntry = productData.salesPrices.find(
                sp => Number(sp.unitId) === Number(unitId) && Number(sp.branchId) === Number(currentBranchId)
            );
            if (!priceEntry) {
                priceEntry = productData.salesPrices.find(sp => Number(sp.unitId) === Number(unitId));
            }
            return priceEntry?.salesPrice || null;
        };

        const getUnitName = (unitId) => {
            const priceEntry = productData.salesPrices?.find(sp => Number(sp.unitId) === Number(unitId));
            if (priceEntry?.unit?.UnitName) return priceEntry.unit.UnitName;
            if (Number(productData.unitId) === Number(unitId) && productData.unit?.UnitName) {
                return productData.unit.UnitName;
            }
            return 'PCS';
        };

        if (productData.unit_conversions && Array.isArray(productData.unit_conversions)) {
            productData.unit_conversions.forEach((unit) => {
                if (unit.barcode?.trim()) {
                    barcodes.push({
                        barcode: unit.barcode.trim(),
                        unitId: unit.unitId,
                        unitName: getUnitName(unit.unitId),
                        salesPrice: getSalesPriceForUnit(unit.unitId),
                    });
                }
            });
        }

        if (barcodes.length === 0 && productData.productCode) {
            barcodes.push({
                barcode: productData.productCode,
                unitId: productData.unitId,
                unitName: productData.unit?.UnitName || 'PCS',
                salesPrice: getSalesPriceForUnit(productData.unitId),
            });
        }

        setBarcodeList(barcodes);
        const initialCopies = {};
        barcodes.forEach((_, idx) => { initialCopies[idx] = 1; });
        setBarcodeCopies(initialCopies);
    };

    // ── Render a single barcode to a crisp PNG data URL via bwip-js ────
    // Using a raster canvas (instead of an SVG that later gets rescaled by
    // CSS) avoids the anti-aliasing pass that was blurring adjacent bars
    // on longer alphanumeric codes when printed on the thermal printer.
   const renderBarcodeDataURL = (value) => {
    try {
        const canvas = document.createElement('canvas');

        // Render once at high fixed scale to get a crisp native bitmap —
        // scale no longer varies by length, so bar-width ratios never change.
        bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: value,
          scale: 3,  
            height: 10,            // mm, converted internally by bwip-js
            includetext: false,
            paddingwidth: 4,       // quiet zone in module-widths, generous
            paddingheight: 0,
            backgroundcolor: 'ffffff',
        });

        // Now shrink-to-fit ourselves, preserving aspect ratio, targeting
        // a max physical width in mm. This replaces CSS max-width/object-fit
        // entirely, so print engines can't misapply/ignore it.
        const MAX_WIDTH_PX = 480;   // ~48mm at 10px/mm working resolution
        let finalCanvas = canvas;
        if (canvas.width > MAX_WIDTH_PX) {
            const ratio = MAX_WIDTH_PX / canvas.width;
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = MAX_WIDTH_PX;
            scaledCanvas.height = Math.round(canvas.height * ratio);
            const ctx = scaledCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false; // keep bars sharp, no blur
            ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            finalCanvas = scaledCanvas;
        }

        return finalCanvas.toDataURL('image/png');
    } catch (err) {
        console.error(`❌ [BARCODE MODAL] Failed to render barcode "${value}":`, err);
        return null;
    }
};

    // ── Build ONE HTML page containing ALL label copies ───────────────
    const generateAllLabelsHTML = (jobs) => {
        const escapeHtml = (str) =>
            (str || '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));

        const safeName = escapeHtml(productData?.productName);
        // supplierCode is optional — may be empty/undefined, in which case nothing is rendered for it
        const safeSupplierCode = escapeHtml(productData?.supplierCode);

        // Render every barcode to a data URL up front — no browser rescale later
        const jobsWithImages = jobs.map((item) => ({
            ...item,
            barcodeImage: renderBarcodeDataURL(item.barcode),
        }));

        const labelBlocks = jobsWithImages.map((item, i) => {
            const isLast = i === jobsWithImages.length - 1;
            return `
  <div class="label${isLast ? ' last' : ''}" id="label-${i}">
   ${barcodeAlignmentSettings?.showBranchName ? `<div class="branch-name">${escapeHtml(companyName)}</div>` : ''}
    ${barcodeAlignmentSettings?.showProductName ? `<div class="product-name">${safeName}</div>` : ''}
    ${item.barcodeImage
                    ? `<img class="barcode-img" src="${item.barcodeImage}" alt="" />`
                    : `<div class="barcode-error">Barcode render failed</div>`}
    <div class="barcode-supplier-row">
      <span class="barcode-value">${item.barcode}</span>
    
    </div>
    <div style="display:flex;justify-content:space-between;width:100%;padding:0 12px;align-items:center;">
    ${barcodeAlignmentSettings?.showBarCode?` <span class="barcode-value">#${item.barcode}</span>`:''}
       ${safeSupplierCode && barcodeAlignmentSettings?.showSupplierCode ? `<span class="supplier-code">${safeSupplierCode}</span>` : ''}
      <div class="product-price">
        <img src="https://i.ibb.co/5gpxct2M/Screenshot-2026-04-22-134800.png" width="10" alt="" />
        ${Number(item.salesPrice).toFixed(2)}
      </div>
      
    </div>
  </div>`;
        }).join('\n');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Labels</title>
  <style>
    @page {
     size: ${barcodeAlignmentSettings?.width}mm ${barcodeAlignmentSettings?.height}mm portrait;
      margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${barcodeAlignmentSettings?.width}mm; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    .label {
      width: ${barcodeAlignmentSettings?.width}mm; height: ${barcodeAlignmentSettings?.height}mm;
      padding: 0.8mm 1.5mm 0.5mm 1.5mm;
      display: flex; flex-direction: column;
      align-items: center; justify-content: space-between;
      overflow: hidden;
      page-break-after: always; break-after: page;
    }
    .label.last { page-break-after: avoid; break-after: avoid; }
    .branch-name {
      font-size: 12px; font-weight: bold; text-align: center; width: 100%;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .product-name {
      font-size: 10px; font-weight: bold; text-align: center;
      text-transform: uppercase; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; width: 100%;
    }
.barcode-img {
  display: block;
  height: 10mm;
  width: auto;      /* browser scales the *image*, not a second canvas resample */
  max-width: 100%;   /* label's own width, via flex container, no hard mm cap */
  margin: 0px auto 0;
  image-rendering: pixelated;
}
    .barcode-error {
      font-size: 8px; color: #c00; text-align: center; width: 100%;
    }
    .barcode-supplier-row {
      display: flex; justify-content: center; align-items: center;
      width: 100%; padding: 0px 1mm;
    }
    .barcode-value {
      font-size: 9px; text-align: left; letter-spacing: 0.5px; color: #000;
    }
    .supplier-code {
      font-size: 11px; font-weight: bold; text-align: right; color: #000;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%;
    }
    .product-code { font-weight: bold; font-size: 12px; text-align: center; color: #000; }
    .product-price { font-weight: bold; font-size: 14px; text-align: center; color: #000; }
  </style>
</head>
<body style="${barcodeAlignmentSettings?.PaddingLeft ? `padding-left: ${barcodeAlignmentSettings.PaddingLeft}mm;` : ''}${barcodeAlignmentSettings?.PaddingTop ? `padding-top: ${barcodeAlignmentSettings.PaddingTop}mm;` : ''}${barcodeAlignmentSettings?.PaddingRight ? `padding-right: ${barcodeAlignmentSettings.PaddingRight}mm;` : ''}${barcodeAlignmentSettings?.PaddingBottom ? `padding-bottom: ${barcodeAlignmentSettings.PaddingBottom}mm;` : ''}">
${labelBlocks}
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 150);
    };
  <\/script>
</body>
</html>`;
    };

    // ── Web: iframe print ─────────────────────────────────────────────
    const webPrintAll = (html) =>
        new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
            document.body.appendChild(iframe);
            iframe.srcdoc = html;
            iframe.onload = () => {
                setTimeout(() => {
                    try { document.body.removeChild(iframe); } catch (_) { }
                    resolve({ success: true });
                }, 4000);
            };
        });

    const validate = () => {
        if (inElectron && !loadingPrinter && !savedPrinterName) {
            Swal.fire({
                title: t('warning') || 'Warning',
                text: t('noBarcodePrinterConfigured') || 'No barcode printer configured. Please set one in Printer Settings.',
                icon: 'warning',
            });
            return false;
        }
        if (barcodeList.length === 0) {
            Swal.fire({ title: t('error') || 'Error', text: t('noBarcodeData') || 'No barcode data available', icon: 'error' });
            return false;
        }
        if (!Object.values(barcodeCopies).some(c => parseInt(c) > 0)) {
            Swal.fire({ title: t('warning') || 'Warning', text: 'Please enter at least 1 copy', icon: 'warning' });
            return false;
        }
        // Note: supplierCode is intentionally NOT validated here — it's optional
        // and printing/preview must work fine whether it's provided or not.

        // Heads-up (non-blocking) for very long codes that may be tight on a 50x25mm label
        const longBarcodes = barcodeList.filter(item => item.barcode.length > 20);
        if (longBarcodes.length > 0) {
            Swal.fire({
                title: t('warning') || 'Warning',
                text: `Some barcodes are longer than 20 characters and may not scan reliably on a 50x25mm label: ${longBarcodes.map(b => b.barcode).join(', ')}`,
                icon: 'warning',
            });
        }

        return true;
    };

    const handlePrint = async () => {
        if (!validate()) return;
        setPrintLoading(true);

        try {
            const printJobs = [];
            barcodeList.forEach((item, idx) => {
                const count = Math.max(0, parseInt(barcodeCopies[idx]) || 0);
                for (let c = 0; c < count; c++) printJobs.push(item);
            });

            if (printJobs.length === 0) throw new Error('No copies to print');

            const html = generateAllLabelsHTML(printJobs);

            if (inElectron) {
                const { printSilent } = await getElectronPrint();
                // Use the saved barcode printer — no manual selection needed
                const result = await printSilent(html, savedPrinterName, 'barcode');
                if (!result.success) throw new Error(result.error || 'Print failed');
            } else {
                await webPrintAll(html);
            }

            onClose();
        } catch (error) {
            console.error('Print error:', error);
            Swal.fire({ title: t('error') || 'Error', text: error.message || 'Failed to print', icon: 'error' });
        } finally {
            setPrintLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Printer className="w-5 h-5" />
                        {t('printBarcode') || 'Print Barcode Labels'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">

                    {/* Saved printer display — Electron only */}
                    {inElectron && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <Printer className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            {loadingPrinter ? (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Loading printer...
                                </span>
                            ) : savedPrinterName ? (
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('common.barcodePrinter') || 'Barcode Printer'}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {savedPrinterName}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                    <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                        {t('noBarcodePrinterConfigured') || 'No barcode printer set — go to Printer Settings to configure one.'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Product code / supplier code summary — supplier code shown only if present */}
                    {(productData?.productCode || productData?.supplierCode) && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            {productData?.productCode && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {t('productCode') || 'Product code'}:
                                    </span>{' '}
                                    {productData.productCode}
                                </div>
                            )}
                            {productData?.supplierCode && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        {t('supplierCode') || 'Supplier code'}:
                                    </span>{' '}
                                    {productData.supplierCode}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Barcodes list */}
                    {barcodeList.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-gray-900 dark:text-gray-100 font-medium flex items-center gap-2">
                                <Copy className="w-4 h-4" />
                                {t('barcodes') || 'Barcodes'} ({barcodeList.length})
                            </Label>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-2 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                                {barcodeList.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {item.barcode}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {item.unitName}
                                                {item.salesPrice ? ` — ${Number(item.salesPrice).toFixed(2)} SR` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`copies-${idx}`} className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                Copies:
                                            </Label>
                                            <Input
                                                id={`copies-${idx}`}
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={barcodeCopies[idx] ?? 1}
                                                onChange={(e) =>
                                                    setBarcodeCopies(prev => ({
                                                        ...prev,
                                                        [idx]: Math.max(0, parseInt(e.target.value) || 0),
                                                    }))
                                                }
                                                className="w-16 text-center text-gray-900 dark:text-gray-100 text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Label size info */}
                    <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('labelSize') || 'Label Size'}: 50mm × 25mm (Portrait)
                            </p>
                            <p>{t('oneLabelPerPage') || 'All copies print in a single job — no dialog per copy.'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                            {t('Cancel') || 'Cancel'}
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handlePrint}
                        disabled={
                            printLoading ||
                            barcodeList.length === 0 ||
                            (inElectron && (loadingPrinter || !savedPrinterName))
                        }
                        className="main-bg hover:bg-blue-700 text-white flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        {printLoading ? (t('Printing') || 'Printing...') : (t('Print') || 'Print')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BarcodePrintModal;