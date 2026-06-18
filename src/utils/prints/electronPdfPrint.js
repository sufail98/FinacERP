/**
 * electronPdfPrint.js
 *
 * Exports a single function: printAsPdf(html, suggestedFilename)
 *
 * Behaviour matrix:
 *  ┌────────────────────────┬──────────────────────────────────────────────────┐
 *  │ Environment            │ What happens                                     │
 *  ├────────────────────────┼──────────────────────────────────────────────────┤
 *  │ Electron + preload API │ Calls window.electronAPI.printToPDF → save dialog│
 *  │ Electron, no preload   │ Opens hidden window, triggers system print dialog │
 *  │                        │ (user chooses "Save as PDF" in the OS dialog)    │
 *  │ Browser (non-Electron) │ Opens hidden window, triggers system print dialog │
 *  └────────────────────────┴──────────────────────────────────────────────────┘
 */

import { isElectron } from '@/utils/electronPrint';

/**
 * Attempt to save PDF via Electron's preload bridge.
 * Requires the main process to expose:
 *
 *   window.electronAPI.printToPDF(html, filename) → Promise<{ success, filePath?, error? }>
 *
 * If you haven't set this up yet, see the companion main-process snippet below.
 */
const tryElectronNativePDF = async (html, filename) => {
    try {
        if (
            window.electronAPI &&
            typeof window.electronAPI.printToPDF === 'function'
        ) {
            const result = await window.electronAPI.printToPDF(html, filename);
            return result; // { success: true, filePath } or { success: false, error }
        }
    } catch (err) {
        console.warn('[PDF] electronAPI.printToPDF failed:', err);
    }
    return null; // signal: fall through to browser-print fallback
};

/**
 * Fallback: open a hidden popup and call window.print().
 * In Electron this opens the system print dialog; the user can choose
 * "Save as PDF" (works on all OSes).  In a browser it does the same.
 */
const printViaBrowserDialog = (html) => {
    return new Promise((resolve) => {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            console.error('[PDF] Could not open print window (popup blocked?)');
            resolve({ success: false, error: 'Popup blocked' });
            return;
        }

        win.document.open();
        win.document.write(html);
        win.document.close();

        win.onload = () => {
            // Small delay so images / fonts finish loading
            setTimeout(() => {
                win.focus();
                win.print();
                // We can't know when the dialog closes, so resolve optimistically
                resolve({ success: true });
            }, 500);
        };
    });
};

/**
 * Main export — call this from your "Print as PDF" handler.
 *
 * @param {string} html             - Full HTML string to render as PDF
 * @param {string} [filename]       - Suggested file name (used only with native API)
 * @returns {Promise<{ success: boolean, filePath?: string, error?: string }>}
 */
export const printAsPdf = async (html, filename = 'invoice.pdf') => {
    if (isElectron()) {
        // 1️⃣ Try native Electron PDF export (best UX — real Save dialog)
        const nativeResult = await tryElectronNativePDF(html, filename);
        if (nativeResult !== null) {
            return nativeResult;
        }

        // 2️⃣ No preload bridge → fall back to system print dialog
        console.info(
            '[PDF] electronAPI.printToPDF not available. ' +
            'Falling back to system print dialog. ' +
            'To enable the native Save dialog, add the preload bridge — see comments in electronPdfPrint.js'
        );
    }

    // 3️⃣ Browser / Electron fallback — system print dialog
    return printViaBrowserDialog(html);
};


/* ─────────────────────────────────────────────────────────────────────────────
   OPTIONAL: Electron main-process setup (electron/main.js or similar)
   Add this to enable the native "Save As" PDF dialog in Electron.
   ─────────────────────────────────────────────────────────────────────────────

// In your preload.js  ──────────────────────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (html, filename) =>
    ipcRenderer.invoke('print-to-pdf', { html, filename }),
});

// In your main.js  ─────────────────────────────────────────────────────────────
const { ipcMain, BrowserWindow, dialog, app } = require('electron');
const path = require('path');
const fs   = require('fs');

ipcMain.handle('print-to-pdf', async (event, { html, filename }) => {
  // Create an off-screen window to render the HTML
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });

  // Load the HTML string
  await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Wait a tick for rendering
  await new Promise(r => setTimeout(r, 800));

  // Render to PDF buffer
  const pdfBuffer = await pdfWin.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    marginsType: 0,   // no extra margins (our HTML already handles margins)
  });

  pdfWin.close();

  // Show "Save As" dialog
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Invoice as PDF',
    defaultPath: path.join(app.getPath('downloads'), filename),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { success: false, error: 'Cancelled' };
  }

  fs.writeFileSync(filePath, pdfBuffer);
  return { success: true, filePath };
});

─────────────────────────────────────────────────────────────────────────────── */