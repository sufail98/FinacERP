/**
 * Check if running in Electron
 */
export const isElectron = () => {
  return !!(window.electronAPI?.isElectron);
};

/**
 * Get all available printers from system
 */
export const getPrinters = async () => {
  if (!isElectron()) {
    return [];
  }
  
  try {
    const result = await window.electronAPI.getPrinters();
    if (result.success) {
      return result.data;
    }
    console.error('❌ [PRINTERS] API returned error:', result.error);
    return [];
  } catch (error) {
    console.error('❌ [PRINTERS] Error:', error);
    return [];
  }
};

/**
 * Get default printer
 */
export const getDefaultPrinter = async () => {
  if (!isElectron()) return null;
  
  try {
    const result = await window.electronAPI.getDefaultPrinter();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('❌ [DEFAULT PRINTER] Error:', error);
    return null;
  }
};

/**
 * Get saved printer preference from electron-store
 */
export const getPrinterPreference = async (type) => {
  if (!isElectron()) return null;
  
  try {
    const result = await window.electronAPI.getPrinterPreference(type);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('❌ [PREF] Error:', error);
    return null;
  }
};

/**
 * Save printer preference to electron-store
 */
export const savePrinterPreference = async (type, printerName) => {
  if (!isElectron()) return false;
  
  try {
    const result = await window.electronAPI.savePrinterPreference(type, printerName);
    return result.success;
  } catch (error) {
    console.error('❌ [PREF] Save error:', error);
    return false;
  }
};

/**
 * Print HTML silently (NO DIALOG, NO PREVIEW)
 */
export const printSilent = async (html, printerName, printType = 'a4') => {
  if (!isElectron()) {
    return browserPrint(html);
  }

  try {
  
    const result = await window.electronAPI.printSilent(html, printerName, printType);
    
    if (result.success) {
      console.log('✅ [PRINT] Success');
    } else {
      console.error('❌ [PRINT] Failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [PRINT] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Print with dialog (user selects printer)
 */
export const printWithDialog = async (html, printType = 'a4') => {
  if (!isElectron()) {
    return browserPrint(html);
  }

  try {
    const result = await window.electronAPI.printDialog(html, printType);
    return result;
  } catch (error) {
    console.error('❌ [PRINT DIALOG] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Browser print fallback (only for web mode)
 */
const browserPrint = (html) => {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      console.error('❌ [PRINT] Popup blocked');
      resolve({ success: false, error: 'Popup blocked' });
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        resolve({ success: true });
      }, 500);
    };
  });
};

/**
 * SIMPLE PRINT - Main function to use everywhere
 * Automatically handles Electron silent print or browser fallback
 */
export const simplePrint = async (html, printType = 'a4') => {

  // For browser: use window.open with print
  if (!isElectron()) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    return { success: true };
  }

  // For Electron: silent print
  try {
    // Get saved printer preference
    const savedPrinter = await getPrinterPreference(printType);
    console.log('🖨️ [SIMPLE PRINT] Using printer:', savedPrinter || 'system default');

    const result = await printSilent(html, savedPrinter, printType);
    
    return result;
  } catch (error) {
    console.error('❌ [SIMPLE PRINT] Error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  isElectron,
  getPrinters,
  getDefaultPrinter,
  getPrinterPreference,
  savePrinterPreference,
  printSilent,
  printWithDialog,
  simplePrint,
};