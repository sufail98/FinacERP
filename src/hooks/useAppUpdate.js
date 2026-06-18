// E:\Users\Roshan\Finac\Web-FinacERP\src\hooks\useAppUpdate.js

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '@/redux/slice/updateSlice';

// ✅ Check if running in Electron SAFELY
const checkIsElectron = () => {
  try {
    return !!(window.electronAPI && window.electronAPI.isElectron === true);
  } catch {
    return false;
  }
};

const useAppUpdate = () => {
  const dispatch = useDispatch();
  const updateState = useSelector((state) => state.update);

  // ✅ Check if running in Electron SAFELY
  const isElectron = checkIsElectron();


  // Initialize - get current version and set up listeners
  useEffect(() => {
    // ✅ Early return if not in Electron
    if (!isElectron) {
      return;
    }

    // Get current app version
    const getCurrentVersion = async () => {
      try {
        const version = await window.electronAPI.getAppVersion();
        dispatch(setCurrentVersion(version));
      } catch (error) {
        console.error('❌ [UPDATE] Failed to get version:', error);
      }
    };
    getCurrentVersion();

    // Set up event listeners with safety checks
    const unsubscribers = [];

    if (window.electronAPI.onUpdateChecking) {
      const unsub = window.electronAPI.onUpdateChecking(() => {
        dispatch(setChecking(true));
      });
      if (unsub) unsubscribers.push(unsub);
    }

    if (window.electronAPI.onUpdateAvailable) {
      const unsub = window.electronAPI.onUpdateAvailable((data) => {
        dispatch(setUpdateAvailable(data));
      });
      if (unsub) unsubscribers.push(unsub);
    }

    if (window.electronAPI.onUpdateNotAvailable) {
      const unsub = window.electronAPI.onUpdateNotAvailable(() => {
        dispatch(setNoUpdateAvailable());
      });
      if (unsub) unsubscribers.push(unsub);
    }

    if (window.electronAPI.onUpdateDownloadProgress) {
      const unsub = window.electronAPI.onUpdateDownloadProgress((data) => {
        dispatch(setDownloadProgress(data.percent));
      });
      if (unsub) unsubscribers.push(unsub);
    }

    if (window.electronAPI.onUpdateDownloaded) {
      const unsub = window.electronAPI.onUpdateDownloaded((data) => {
        dispatch(setDownloaded(data));
      });
      if (unsub) unsubscribers.push(unsub);
    }

    if (window.electronAPI.onUpdateError) {
      const unsub = window.electronAPI.onUpdateError((data) => {
        console.error('❌ [UPDATE] Error:', data.message);
        dispatch(setError(data.message));
      });
      if (unsub) unsubscribers.push(unsub);
    }

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach((unsub) => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
    };
  }, [dispatch, isElectron]);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if (!isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      dispatch(setChecking(true));
      const result = await window.electronAPI.checkForUpdates();
      return result;
    } catch (error) {
      dispatch(setError(error.message));
      return { success: false, error: error.message };
    }
  }, [dispatch, isElectron]);

  // Start download
  const downloadUpdate = useCallback(async () => {
    if (!isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      dispatch(setDownloading(true));
      const result = await window.electronAPI.downloadUpdate();
      return result;
    } catch (error) {
      dispatch(setError(error.message));
      return { success: false, error: error.message };
    }
  }, [dispatch, isElectron]);

  // Install update and restart
  const installUpdate = useCallback(async () => {
    if (!isElectron) {
      return { success: false, error: 'Not running in Electron' };
    }

    try {
      dispatch(setInstalling(true));
      const result = await window.electronAPI.installUpdate();
      return result;
    } catch (error) {
      dispatch(setError(error.message));
      return { success: false, error: error.message };
    }
  }, [dispatch, isElectron]);

  // Dismiss notification (Later button)
  const handleDismissNotification = useCallback(() => {
    dispatch(dismissNotification());
  }, [dispatch]);

  return {
    // State
    ...updateState,
    isElectron,

    // Actions
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissNotification: handleDismissNotification,
  };
};

export default useAppUpdate;