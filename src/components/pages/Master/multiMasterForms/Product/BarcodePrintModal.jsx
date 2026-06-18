import { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, AlertCircle, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import useAuth from '@/redux/hook/auth/useAuth';

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

    // ── Build ONE HTML page containing ALL label copies ───────────────
    const generateAllLabelsHTML = (jobs) => {
        const safeName = (productData?.productName || '')
            .replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));

        const safeProductCode = (productData?.productCode || '')
            .replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c]));

        const labelBlocks = jobs.map((item, i) => {
            const isLast = i === jobs.length - 1;
            return `
  <div class="label${isLast ? ' last' : ''}" id="label-${i}">
    <div class="branch-name">ABDULRAHMAN RASHID</div>
    <div class="product-name">${safeName}</div>
    <svg id="bc-${i}"></svg>
    <div class="barcode-value">${item.barcode}</div>
    <div style="display:flex;justify-content:space-between;width:100%;padding:0 12px;align-items:center;">
      <div class="product-code">#${safeProductCode}</div>
      <div class="product-price">
        <img src="https://i.ibb.co/5gpxct2M/Screenshot-2026-04-22-134800.png" width="10" alt="" />
        ${Number(item.salesPrice).toFixed(2)}
      </div>
    </div>
  </div>`;
        }).join('\n');

        const barcodeInits = jobs.map((item, i) =>
            `JsBarcode('#bc-${i}', '${item.barcode}', { format: 'CODE128', width: 1.3, height: 28, displayValue: false, margin: 0, background: '#ffffff', lineColor: '#000000' });`
        ).join('\n      ');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page { size: 50mm 25mm portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 50mm; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    .label {
      width: 50mm; height: 25mm;
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
      font-size: 9px; font-weight: bold; text-align: center;
      text-transform: uppercase; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; width: 100%;
    }
    svg { display: block; width: 46mm; height: 10mm; }
    .barcode-value { font-size: 9px; text-align: center; letter-spacing: 0.5px; color: #000; }
    .product-code { font-weight: bold; font-size: 12px; text-align: center; color: #333; }
    .product-price { font-weight: bold; font-size: 14px; text-align: center; color: #333; }
  </style>
</head>
<body style="padding-left: 28mm;">
${labelBlocks}
  <script>
    window.onload = function () {
      try { ${barcodeInits} } catch (e) { console.error('JsBarcode error:', e); }
      setTimeout(function () { window.print(); }, 300);
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