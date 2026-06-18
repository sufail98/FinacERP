// E:\Users\Roshan\Finac\Web-FinacERP\src\redux\slice\updateSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Status flags
  checking: false,
  updateAvailable: false,
  downloading: false,
  downloaded: false,
  installing: false,
  error: null,

  // Update info
  updateInfo: null, // { version, releaseDate, releaseNotes }
  currentVersion: null,

  // Download progress
  downloadProgress: 0, // 0-100

  // UI state
  notificationDismissed: false, // "Later" button clicked
};

const updateSlice = createSlice({
  name: 'update',
  initialState,
  reducers: {
    // Set checking state
    setChecking: (state, action) => {
      state.checking = action.payload;
      state.error = null;
    },

    // Update available
    setUpdateAvailable: (state, action) => {
      state.checking = false;
      state.updateAvailable = true;
      state.updateInfo = action.payload;
      state.notificationDismissed = false; // Reset dismissed state
    },

    // No update available
    setNoUpdateAvailable: (state) => {
      state.checking = false;
      state.updateAvailable = false;
    },

    // Set current version
    setCurrentVersion: (state, action) => {
      state.currentVersion = action.payload;
    },

    // Start downloading
    setDownloading: (state, action) => {
      state.downloading = action.payload;
    },

    // Download progress
    setDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },

    // Download complete
    setDownloaded: (state, action) => {
      state.downloading = false;
      state.downloaded = true;
      state.downloadProgress = 100;
    },

    // Set installing
    setInstalling: (state, action) => {
      state.installing = action.payload;
    },

    // Set error
    setError: (state, action) => {
      state.checking = false;
      state.downloading = false;
      state.error = action.payload;
    },

    // Dismiss notification (Later button)
    dismissNotification: (state) => {
      state.notificationDismissed = true;
    },

    // Reset notification dismissed (for when app reopens)
    resetNotificationDismissed: (state) => {
      state.notificationDismissed = false;
    },

    // Reset all update state
    resetUpdateState: (state) => {
      return { ...initialState, currentVersion: state.currentVersion };
    },
  },
});

export const {
  setChecking,
  setUpdateAvailable,
  setNoUpdateAvailable,
  setCurrentVersion,
  setDownloading,
  setDownloadProgress,
  setDownloaded,
  setInstalling,
  setError,
  dismissNotification,
  resetNotificationDismissed,
  resetUpdateState,
} = updateSlice.actions;

export default updateSlice.reducer;