import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import useAppUpdate from '@/hooks/useAppUpdate';

const UpdateNotification = () => {
  const navigate = useNavigate();
  const {
    updateAvailable,
    downloaded,
    updateInfo,
    currentVersion,
    notificationDismissed,
    dismissNotification,
    installUpdate,
  } = useAppUpdate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasOrgUpdate, setHasOrgUpdate] = useState(false);

  // Check auth status
  useEffect(() => {
    const token = localStorage.getItem('authToken'); // adjust key to match your app
    setIsLoggedIn(!!token);
  }, []);

  // Check org-specific version after login
  useEffect(() => {
    if (!isLoggedIn || !currentVersion) return;

    const checkOrgVersion = async () => {
      try {
        const customerSlno = localStorage.getItem('customerSlno')?.trim();
        if (!customerSlno) return;

        const res = await axios.get('https://test.finacerp.com/Api/public/api/organizations');
        const orgs = res.data.organizations;

        const matchedOrg = orgs.find(
          (org) => org['SerialNumber ']?.trim() === customerSlno
        );


        if (matchedOrg && matchedOrg.AppVersion > currentVersion) {
          setHasOrgUpdate(true);
        }
      } catch (err) {
        console.error('Error checking org version:', err);
      }
    };

    checkOrgVersion();
  }, [isLoggedIn, currentVersion,window.location.href]);

  // Hide if: not logged in, no org-specific update, or dismissed
  
  if (!isLoggedIn || !hasOrgUpdate ) {
    
    return null;
  }

  const handleUpdateNow = () => {
    if (downloaded) {
      installUpdate();
    } else {
      navigate('/update');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">Update Available</h4>
              <p className="text-xs text-gray-500">
                Version {updateInfo?.version || 'New'}
              </p>
            </div>
          </div>
          <button
            onClick={dismissNotification}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-4">
          A new version of Finac ERP is available. Update now for the latest
          features and improvements.
        </p>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={dismissNotification}
            className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleUpdateNow}
            className="flex-1 px-3 py-2 text-sm text-white main-bg rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
          >
            {downloaded ? (
              <>
                <RefreshCw className="w-3 h-3" />
                Restart
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Update Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;