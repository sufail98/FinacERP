// E:\Users\Roshan\Finac\Web-FinacERP\electron\main.cjs

const { app, BrowserWindow, ipcMain, dialog, protocol,shell  } = require('electron');
const path = require('path');
const Store = require('electron-store');
const printerService = require('./printerService.cjs');
const updaterService = require('./updaterService.cjs');
const fs = require('fs');

const store = new Store();
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let splashWindow;
ipcMain.on('open-external', (event, url) => {
    // Security: only allow whatsapp URLs
    if (url.startsWith('https://web.whatsapp.com') || url.startsWith('https://wa.me')) {
        shell.openExternal(url);
    }
});
ipcMain.handle('save-pdf', async (event, htmlContent, filename) => {
    try {
        // Show save dialog
        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Save Invoice as PDF',
            defaultPath: path.join(require('os').homedir(), 'Downloads', filename),
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, error: 'Save canceled' };
        }

        // Create a hidden window for printing
        const win = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false
            }
        });

        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        const pdfData = await win.webContents.printToPDF({
            marginsType: 0,
            printBackground: true,
            pageSize: 'A4'
        });

        fs.writeFileSync(filePath, pdfData);
        win.close();

        return { success: true, filePath };
    } catch (error) {
        console.error('PDF save error:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// ✅ SINGLE INSTANCE LOCK - Prevent multiple instances
// ============================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // ============================================
  // CREATE SPLASH SCREEN
  // ============================================
  function createSplashWindow() {
    splashWindow = new BrowserWindow({
      width: 500,
      height: 350,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      center: true,
      skipTaskbar: true,
      icon: path.join(__dirname, '../public/assets/images/mainlogo.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load splash HTML
    const splashPath = isDev 
      ? path.join(__dirname, 'splash.html')
      : path.join(__dirname, 'splash.html');
    
    splashWindow.loadFile(splashPath);

    splashWindow.on('closed', () => {
      splashWindow = null;
    });
  }

  // ============================================
  // CREATE MAIN WINDOW
  // ============================================
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      icon: path.join(__dirname, '../public/assets/images/mainlogo.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.cjs'),
        webSecurity: false,
      },
      show: false, // Don't show until ready
      backgroundColor: '#ffffff',
    });

    // Remove menu bar
    mainWindow.setMenu(null);

    // Load the app
    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // When main window is ready to show
    mainWindow.once('ready-to-show', () => {
      // Add a small delay to ensure everything is loaded
      setTimeout(() => {
        // Close splash screen
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }

        // Show main window
        mainWindow.show();
        mainWindow.focus();

        // Initialize updater
        updaterService.initialize(mainWindow);

        // Check for updates in production
        if (!isDev) {
          setTimeout(() => {
            updaterService.checkForUpdates();
          }, 3000);
        }

        // Open DevTools in development
        if (isDev) {
          mainWindow.webContents.openDevTools();
        }
      }, 1500); // 1.5 second delay for smooth transition
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // ============================================
  // APP READY
  // ============================================
  app.whenReady().then(() => {
    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURI(request.url.replace('file:///', ''));
      callback(pathname);
    });

    // Show splash screen first
    createSplashWindow();

    // Create main window after a short delay
    setTimeout(() => {
      createWindow();
    }, 500);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      setTimeout(() => {
        createWindow();
      }, 500);
    }
  });

  // ============================================
  // IPC HANDLERS - Printing
  // ============================================

  ipcMain.handle('get-printers', async () => {
    try {
      let printers = [];
      
      if (mainWindow && mainWindow.webContents) {
        if (typeof mainWindow.webContents.getPrintersAsync === 'function') {
          printers = await mainWindow.webContents.getPrintersAsync();
        } 
        else if (typeof mainWindow.webContents.getPrinters === 'function') {
          printers = mainWindow.webContents.getPrinters();
        }
      }
      
      return { success: true, data: printers };
    } catch (error) {
      console.error('❌ [PRINTERS] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-default-printer', async () => {
    try {
      let printers = [];
      
      if (mainWindow && mainWindow.webContents) {
        if (typeof mainWindow.webContents.getPrintersAsync === 'function') {
          printers = await mainWindow.webContents.getPrintersAsync();
        } else if (typeof mainWindow.webContents.getPrinters === 'function') {
          printers = mainWindow.webContents.getPrinters();
        }
      }
      
      const defaultPrinter = printers.find(printer => printer.isDefault);
      return { success: true, data: defaultPrinter || printers[0] || null };
    } catch (error) {
      console.error('❌ [DEFAULT PRINTER] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-printer-preference', async (event, { type, printerName }) => {
    try {
      store.set(`printer_${type}`, printerName);
      return { success: true };
    } catch (error) {
      console.error('❌ [SAVE PRINTER] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-printer-preference', async (event, type) => {
    try {
      const printerName = store.get(`printer_${type}`);
      return { success: true, data: printerName };
    } catch (error) {
      console.error('❌ [GET PRINTER] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print-silent', async (event, { html, printerName, printType }) => {
    try {
      
      const result = await printerService.printHTML({
        window: mainWindow,
        html,
        printerName,
        printType
      });
      
      return result;
    } catch (error) {
      console.error('❌ [PRINT] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print-dialog', async (event, { html, printType }) => {
    try {
      const result = await printerService.printWithDialog({
        window: mainWindow,
        html,
        printType
      });
      return result;
    } catch (error) {
      console.error('❌ [PRINT DIALOG] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // IPC HANDLERS - File System
  // ============================================

  ipcMain.handle('save-file-dialog', async (event, { defaultPath, filters }) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: filters || [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-file-dialog', async (event, { filters, properties }) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: properties || ['openFile'],
        filters: filters || [
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // IPC HANDLERS - Barcode Scanner
  // ============================================

  let barcodeBuffer = '';
  let barcodeTimeout;

  ipcMain.on('register-barcode-listener', (event) => {
    mainWindow.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown') {
        clearTimeout(barcodeTimeout);

        if (input.key === 'Enter') {
          if (barcodeBuffer.length > 3) {
            event.sender.send('barcode-scanned', barcodeBuffer);
            barcodeBuffer = '';
          }
        } else if (input.key.length === 1) {
          barcodeBuffer += input.key;
          barcodeTimeout = setTimeout(() => {
            barcodeBuffer = '';
          }, 100);
        }
      }
    });
  });

  // ============================================
  // IPC HANDLERS - App Info
  // ============================================

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
  });

  // ============================================
  // Error Handling
  // ============================================

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });
}