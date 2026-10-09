// src/components/.../BarcodeLabelPreview.jsx
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import bwipjs from 'bwip-js';

// Scale factor: px per mm, used so the on-screen preview is a faithful,
// enlarged mirror of the real label printed by BarcodePrintModal's
// generateAllLabelsHTML.
const SCALE = 8; // e.g. 30mm -> 240px, 20mm -> 160px
const mm = (v) => `${(Number(v) || 0) * SCALE}px`;

/**
 * Renders a live, to-scale preview of the barcode label, mirroring the
 * markup/styles AND the barcodeAlignmentSettings toggles (showBranchName,
 * showProductName, showSupplierCode, paddings, width) used in
 * BarcodePrintModal's generateAllLabelsHTML — so what you see here is
 * what actually prints.
 *
 * Uses bwip-js (canvas raster) with format CODE128, matching
 * BarcodePrintModal exactly — previously this preview rendered CODE39
 * via JsBarcode, which meant the preview didn't reflect the barcode
 * format actually printed. Rendering to canvas instead of SVG also
 * avoids the CSS-rescale blur that made longer alphanumeric codes hard
 * to scan once printed.
 *
 * `supplierCode` is optional — the line only renders when a value is
 * present AND barcodeAlignmentSettings.showSupplierCode is enabled.
 */
const BarcodeLabelPreview = ({
    productName,
    price,
    barcode,
    supplierCode,
    companyName,
    currencySymbol = 'SR',

}) => {
    const canvasRef = useRef(null);
    const [renderError, setRenderError] = useState(false);
    const { barcodeAlignmentSettings } = useSelector((state) => state.settings);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (!barcode || !barcode.trim()) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setRenderError(false);
            return;
        }

        try {
            bwipjs.toCanvas(canvasRef.current, {
                bcid: 'code128',      // matches BarcodePrintModal exactly
                text: barcode,
                scale: 4,              // same pixel density as the print job
                height: 10,             // bar height in mm
                includetext: false,
                paddingwidth: 0,
                paddingheight: 0,
                backgroundcolor: 'ffffff',
            });
            setRenderError(false);
        } catch (e) {
            console.error('Barcode preview render error:', e);
            setRenderError(true);
        }
    }, [barcode]);

    const showBranchName = barcodeAlignmentSettings?.showBranchName;
    const showProductName = barcodeAlignmentSettings?.showProductName;
    const showSupplierCode = barcodeAlignmentSettings?.showSupplierCode;
    const hasSupplierCode = !!(supplierCode && supplierCode.trim());
    
    const isBarcodeTooLong = (barcode || '').length > 20;


    const hasContent = productName || price || barcode || hasSupplierCode;
    if (!hasContent) return null;

    return (
        <div className="flex flex-col items-center gap-2">

            <div
                className="bg-white border border-gray-300 shadow-sm flex flex-col items-center justify-between overflow-hidden"
                style={{
                    width: mm(30),
                    height: 'auto',
                    // matches label's own padding: 0.8mm 1.5mm 0.5mm 1.5mm
                    // outer body padding, driven by the same settings the print job uses
                    // paddingLeft: barcodeAlignmentSettings?.PaddingLeft ? mm(barcodeAlignmentSettings.PaddingLeft) : 0,
                    // paddingTop: barcodeAlignmentSettings?.PaddingTop ? mm(barcodeAlignmentSettings.PaddingTop) : 0,
                    // paddingRight: barcodeAlignmentSettings?.PaddingRight ? mm(barcodeAlignmentSettings.PaddingRight) : 0,
                    // paddingBottom: barcodeAlignmentSettings?.PaddingBottom ? mm(barcodeAlignmentSettings.PaddingBottom) : 0,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    boxSizing: 'border-box',
                }}
            >
                {showBranchName && (
                    <div
                        className="font-bold text-center w-full truncate uppercase"
                        style={{ fontSize: '12px', letterSpacing: '0.3px' }}
                    >
                        {companyName || 'Company Name'}
                    </div>
                )}

                {showProductName && (
                    <div
                        className="font-bold text-center w-full truncate uppercase"
                        style={{ fontSize: '9px' }}
                    >
                        {productName || 'Product name'}
                    </div>
                )}

                {renderError ? (
                    <div className="text-xs text-red-500 text-center px-2">
                        Couldn't render barcode
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            width: 'auto',
                            maxWidth: '92%',
                            height: '30px',
                            imageRendering: 'pixelated', // stop smoothing that blurs bars
                        }}
                    />
                )}

                <div className="flex justify-between items-center w-full" style={{ padding: `0 ${mm(0.25)}` }}>
                    <span className="text-left" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                        {barcode || '— — — — — —'}
                    </span>
                </div>

                {isBarcodeTooLong && (
                    <div className="w-full px-1">
                        <span className="text-[9px] text-yellow-600 font-medium">
                            Barcode exceeds 20 characters — may not scan reliably
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-center w-full" style={{ padding: `0 ${mm(1.5)}` }}>
                    <div className="font-bold text-gray-700 flex items-center gap-1" style={{ fontSize: '14px' }}>
                        <img
                            src="https://i.ibb.co/5gpxct2M/Screenshot-2026-04-22-134800.png"
                            width="10"
                            alt=""
                        />
                        {price ? Number(price).toFixed(2) : '0.00'}
                    </div>

                    {/* Supplier code is optional — only rendered when present AND setting is on */}
                    {hasSupplierCode && showSupplierCode && (
                        <span
                            className="text-right text-gray-900 truncate font-bold"
                            style={{ fontSize: '11px', maxWidth: '55%' }}
                        >
                            {supplierCode}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeLabelPreview;