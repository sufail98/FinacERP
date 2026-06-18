const { BrowserWindow } = require('electron');

class PrinterService {
  /**
   * Get printers from a window (async compatible)
   */
  async getPrintersFromWindow(window) {
    try {
      if (typeof window.webContents.getPrintersAsync === 'function') {
        return await window.webContents.getPrintersAsync();
      } else if (typeof window.webContents.getPrinters === 'function') {
        return window.webContents.getPrinters();
      }
      return [];
    } catch (error) {
      console.error('❌ [PRINTERS] Error getting printers:', error.message);
      return [];
    }
  }

  /**
   * Print HTML content silently (NO DIALOG)
   */
  async printHTML({ window, html, printerName, printType = 'a4' }) {
    return new Promise(async (resolve) => {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load HTML content
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', async () => {
        try {
          // ✅ FIXED: Use async method to get printers
          const printers = await this.getPrintersFromWindow(printWindow);
          
          
          // Find target printer
          let targetPrinter;
          
         if (printerName) {
  // Find specified printer
  targetPrinter = printers.find(p => p.name === printerName);
  if (!targetPrinter) {
    printWindow.close();
    console.error(`❌ [PRINT] Printer "${printerName}" not found`);
    return resolve({ 
      success: false, 
      error: `Printer "${printerName}" not found. Available printers: ${printers.map(p => p.name).join(', ')}` 
    });
  }
}
          
          // Fallback to default or first printer
          if (!targetPrinter) {
            targetPrinter = printers.find(p => p.isDefault) || printers[0];
          }

          if (!targetPrinter) {
            printWindow.close();
            console.error('❌ [PRINT] No printer found');
            return resolve({ success: false, error: 'No printer found' });
          }


          // Get print options
          const printOptions = this.getPrintOptions(printType, targetPrinter);

          // ✅ SILENT PRINT - No dialog
          printWindow.webContents.print(printOptions, (success, failureReason) => {
            printWindow.close();
            
            if (success) {
              resolve({ success: true });
            } else {
              console.error('❌ [PRINT] Print failed:', failureReason);
              resolve({ success: false, error: failureReason || 'Print failed' });
            }
          });
        } catch (error) {
          printWindow.close();
          console.error('❌ [PRINT] Error:', error.message);
          resolve({ success: false, error: error.message });
        }
      });

      // Handle load errors
      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        printWindow.close();
        console.error('❌ [PRINT] Failed to load HTML:', errorDescription);
        resolve({ success: false, error: errorDescription });
      });
    });
  }

  /**
   * Print with print dialog (user can select printer)
   */
  async printWithDialog({ window, html, printType = 'a4' }) {
    return new Promise((resolve) => {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', async () => {
        try {
          const printOptions = this.getPrintOptions(printType, null);
          printOptions.silent = false; // ✅ Show print dialog

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            printWindow.close();
            
            if (success) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: failureReason || 'Print cancelled' });
            }
          });
        } catch (error) {
          printWindow.close();
          resolve({ success: false, error: error.message });
        }
      });
    });
  }

  /**
   * Get print options based on print type
   */
  getPrintOptions(printType, printer) {
    const baseOptions = {
      silent: true,  // ✅ NO DIALOG
      printBackground: true,
      color: true,
      margins: {
        marginType: 'none',
      },
      landscape: false,
      scaleFactor: 100,
    };

    // Add device name if printer specified
    if (printer && printer.name) {
      baseOptions.deviceName = printer.name;
    }

    switch (printType) {
      case 'thermal':
        return {
          ...baseOptions,
          pageSize: {
            width: 80000, // 80mm in microns
            height: 297000, // Auto height
          },
          margins: {
            marginType: 'none',
          },
        };

      case 'a4':
        return {
          ...baseOptions,
          pageSize: 'A4',
          margins: {
            marginType: 'printableArea',
          },
        };

      case 'a5':
        return {
          ...baseOptions,
          pageSize: 'A5',
        };

      case 'letter':
        return {
          ...baseOptions,
          pageSize: 'Letter',
        };

      default:
        return {
          ...baseOptions,
          pageSize: 'A4',
        };
    }
  }
}

module.exports = new PrinterService();