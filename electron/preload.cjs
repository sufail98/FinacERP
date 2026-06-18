// E:\Users\Roshan\Finac\Web-FinacERP\electron\preload.cjs

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
   openExternal: (url) => ipcRenderer.send('open-external', url),
  // ============================================
  // Printer APIs (Your existing code)
  // ============================================
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getDefaultPrinter: () => ipcRenderer.invoke('get-default-printer'),
  savePrinterPreference: (type, printerName) => 
    ipcRenderer.invoke('save-printer-preference', { type, printerName }),
  getPrinterPreference: (type) => 
    ipcRenderer.invoke('get-printer-preference', type),
  printSilent: (html, printerName, printType) => 
    ipcRenderer.invoke('print-silent', { html, printerName, printType }),
  printDialog: (html, printType) => 
    ipcRenderer.invoke('print-dialog', { html, printType }),
 savePDF: async (htmlContent, filename) => {
        return await ipcRenderer.invoke('save-pdf', htmlContent, filename);
    },
  // ============================================
  // File System APIs
  // ============================================
  saveFileDialog: (defaultPath, filters) => 
    ipcRenderer.invoke('save-file-dialog', { defaultPath, filters }),
  openFileDialog: (filters, properties) => 
    ipcRenderer.invoke('open-file-dialog', { filters, properties }),

  // ============================================
  // Barcode Scanner APIs
  // ============================================
  registerBarcodeListener: () => 
    ipcRenderer.send('register-barcode-listener'),
  onBarcodeScanned: (callback) => 
    ipcRenderer.on('barcode-scanned', (event, barcode) => callback(barcode)),
  removeBarcodeListener: () => 
    ipcRenderer.removeAllListeners('barcode-scanned'),

  // ============================================
  // App Info APIs
  // ============================================
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // ============================================
  // ✅ NEW: Auto Update APIs
  // ============================================
  
  // Actions
  checkForUpdates: () => ipcRenderer.invoke('updater-check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download-update'),
  installUpdate: () => ipcRenderer.invoke('updater-install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('updater-get-status'),

  // Event Listeners
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', callback);
    return () => ipcRenderer.removeListener('update-checking', callback);
  },
  onUpdateAvailable: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onUpdateDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },

  // Platform check
  platform: process.platform,
  isElectron: true,
});