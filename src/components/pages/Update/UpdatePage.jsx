import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import useAppUpdate from '@/hooks/useAppUpdate';

const UpdatePage = () => {
  const navigate = useNavigate();
  const {
    updateAvailable,
    updateInfo,
    currentVersion,
    checking,
    downloading,
    downloaded,
    downloadProgress,
    installing,
    error,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useAppUpdate();
  // const currentVersion = '2.0.36'; // Placeholder - replace with actual version from your app's context or config
  const [orgVersion, setOrgVersion] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  // Fetch orgs and match logged-in customer
// In UpdatePage.jsx, update the fetchOrgVersion function:

useEffect(() => {
  const fetchOrgVersion = async () => {
    setOrgLoading(true);
    try {
      const customerSlno = localStorage.getItem('customerSlno')?.trim();
      const res = await axios.get('https://test.finacerp.com/Api/public/api/organizations');
      const orgs = res.data.organizations;

      const matchedOrg = orgs.find(
        (org) => org['SerialNumber ']?.trim() === customerSlno
      );

      if (matchedOrg) {
        setOrgVersion(matchedOrg.AppVersion);
        setOrgName(matchedOrg.OrganizationName);

        const isOutdated =
          matchedOrg.AppVersion &&
          currentVersion &&
          matchedOrg.AppVersion !== currentVersion;

        setHasNewVersion(isOutdated);

        if (isOutdated) {
          // ✅ Add timeout so checking never hangs forever
          const timeoutId = setTimeout(() => {
            dispatch(setNoUpdateAvailable()); // resets checking to false
          }, 10000); // 10 second fallback

          await checkForUpdates();
          clearTimeout(timeoutId);
        }
      }
    } catch (err) {
      console.error('Error fetching org version:', err);
    } finally {
      setOrgLoading(false);
    }
  };

  fetchOrgVersion();
}, [currentVersion]);

  const handleDownload = async () => await downloadUpdate();
  const handleInstall = async () => await installUpdate();
  const handleGoBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="main-bg p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Software Update</h1>
                <p className="text-white/80 text-sm">
                  {orgName ? `${orgName} · ` : ''}Keep your app up to date
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">

            {/* Loading org data */}
            {orgLoading && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Checking your organization...</p>
              </div>
            )}

            {/* Checking electron update */}
            {!orgLoading && checking && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Checking for updates...</p>
              </div>
            )}

            {/* Already up to date — org version matches current version */}
            {!orgLoading && !checking && !hasNewVersion && !downloaded && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  You're up to date!
                </h2>
                <p className="text-gray-500 text-sm mb-1">
                  Current version: <span className="font-medium">{currentVersion || '1.0.0'}</span>
                </p>
                {orgName && (
                  <p className="text-gray-400 text-xs">
                    No updates assigned for <span className="font-medium">{orgName}</span>
                  </p>
                )}
              </div>
            )}

            {/* Update Available */}
            {!orgLoading && !checking && hasNewVersion && (
              <>
                {/* Version Info */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Current Version
                      </p>
                      <p className="text-lg font-semibold text-gray-700">
                        {currentVersion || '1.0.0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        New Version
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {/* {orgVersion || updateInfo?.version || 'Latest'} */}
                        {hasNewVersion ? updateInfo?.version : orgVersion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Release Notes */}
                {updateInfo?.releaseNotes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      What's New
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-40 overflow-y-auto">
                      {typeof updateInfo.releaseNotes === 'string'
                        ? updateInfo.releaseNotes
                        : 'Bug fixes and performance improvements'}
                    </div>
                  </div>
                )}

                {/* Download Progress */}
                {downloading && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Downloading update...</span>
                      <span>{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full main-bg rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!downloaded && !downloading && hasNewVersion && (
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 main-bg text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download Update
                    </button>
                  )}

                  {downloading && (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 main-bg text-white rounded-lg opacity-50 cursor-not-allowed"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Downloading...
                    </button>
                  )}

                  {downloaded && (
                    <button
                      onClick={handleInstall}
                      disabled={installing}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          Restart & Install
                        </>
                      )}
                    </button>
                  )}
                </div>

                {downloaded && (
                  <p className="mt-4 text-xs text-center text-gray-500">
                    ⚠️ The application will close and restart to complete the update.
                    Please save any unsaved work before proceeding.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Finac ERP v{currentVersion || '1.0.0'}
        </p>
      </div>
    </div>
  );
};

export default UpdatePage;