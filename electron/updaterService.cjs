// E:\Users\Roshan\Finac\Web-FinacERP\electron\updaterService.cjs

const { autoUpdater } = require('electron-updater');
const { ipcMain, app } = require('electron');
const path = require('path');

class UpdaterService {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.updateInfo = null;
    this.downloadProgress = 0;
  }

  /**
   * Initialize the updater with the main window
   */
  initialize(mainWindow) {
    this.mainWindow = mainWindow;

    // ============================================
    // CONFIGURE AUTO UPDATER
    // ============================================
    
    // Don't auto download - let user decide
    autoUpdater.autoDownload = false;
    
    // Don't auto install on quit - let user decide
    autoUpdater.autoInstallOnAppQuit = false;

    // For testing without code signing
    autoUpdater.allowDowngrade = false;
    
    // ✅ IMPORTANT: Allow prereleases for testing
    autoUpdater.allowPrerelease = false;

    // ✅ Force update check (disable cache)
    autoUpdater.forceDevUpdateConfig = false;

    // ✅ Set up logging
    const log = require('electron-log');
    log.transports.file.level = 'debug';
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'debug';

    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================

    // When checking for update
    autoUpdater.on('checking-for-update', () => {
      this.sendToRenderer('update-checking');
    });

    // When update is available
    autoUpdater.on('update-available', (info) => {
      this.updateAvailable = true;
      this.updateInfo = info;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Bug fixes and improvements'
      });
    });

    // When no update available
    autoUpdater.on('update-not-available', (info) => {
      this.updateAvailable = false;
      this.sendToRenderer('update-not-available', {
        version: info.version
      });
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      this.downloadProgress = progress.percent;
      this.sendToRenderer('update-download-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      });
    });

    // When update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      this.updateDownloaded = true;
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || 'Bug fixes and improvements'
      });
    });

    // Error handling
    autoUpdater.on('error', (error) => {
      console.error('❌ [UPDATER] ERROR:', error.message);
      
      this.sendToRenderer('update-error', {
        message: error.message
      });
    });

    // ============================================
    // SETUP IPC HANDLERS
    // ============================================

    // Check for updates (called from renderer)
    ipcMain.handle('updater-check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, data: result };
      } catch (error) {
        console.error('❌ [UPDATER] Check failed:', error.message);
        return { success: false, error: error.message };
      }
    });

    // Download update (called from renderer)
    ipcMain.handle('updater-download-update', async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        console.error('❌ [UPDATER] Download failed:', error.message);
        return { success: false, error: error.message };
      }
    });

    // Install update and restart (called from renderer)
    ipcMain.handle('updater-install-update', () => {
      try {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      } catch (error) {
        console.error('❌ [UPDATER] Install failed:', error.message);
        return { success: false, error: error.message };
      }
    });

    // Get current update status
    ipcMain.handle('updater-get-status', () => {
      return {
        updateAvailable: this.updateAvailable,
        updateDownloaded: this.updateDownloaded,
        updateInfo: this.updateInfo,
        downloadProgress: this.downloadProgress
      };
    });
  }

  /**
   * Send message to renderer process
   */
  sendToRenderer(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    } else {
      console.warn('⚠️ [UPDATER] Cannot send - window is null or destroyed');
    }
  }

  /**
   * Check for updates (can be called programmatically)
   */
  checkForUpdates() {
    return autoUpdater.checkForUpdates();
  }
}

module.exports = new UpdaterService();