// src/utils/prints/generateQRImage.js
import QRCode from 'qrcode';

/**
 * Generates a QR code as a data URL (base64 PNG) from any string
 * Works for both Phase 1 (short) and Phase 2 (long ZATCA base64)
 */
export const generateQRImage = async (data) => {
    if (!data) return '';
    
    try {
        // If already a full URL (api.qrserver.com), fetch and convert to dataURL
        if (data.startsWith('http')) {
            return data; // Phase 1 URL still works, keep as is
        }
        
        // Phase 2: raw base64 string — generate locally
        const dataUrl = await QRCode.toDataURL(data, {
            width: 150,
            margin: 1,
            errorCorrectionLevel: 'M',
        });
        return dataUrl;
    } catch (error) {
        console.error('QR generation failed:', error);
        return '';
    }
};