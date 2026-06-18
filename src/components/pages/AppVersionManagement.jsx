import axios from 'axios';
import { SquarePen } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const AppVersionManagement = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newVersion, setNewVersion] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getAllOrgs();
  }, []);

  const getAllOrgs = async () => {
    try {
      const res = await axios.get('https://test.finacerp.com/Api/public/api/organizations');
      setOrgs(res.data.organizations);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setNewVersion(org.AppVersion);
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedOrg(null);
    setNewVersion('');
    setSuccessMsg('');
  };

  const handleUpdate = async () => {
    if (!newVersion.trim()) return;
    setUpdating(true);
    try {
      await axios.post('https://test.finacerp.com/Api/public/api/app-version-update', {
        OrganizationId: selectedOrg.OrganizationId,
        AppVersion: newVersion,
      });

      // Update local state
      setOrgs((prev) =>
        prev.map((o) =>
          o.OrganizationId === selectedOrg.OrganizationId
            ? { ...o, AppVersion: newVersion }
            : o
        )
      );

      setSuccessMsg('Version updated successfully!');
      setTimeout(() => handleClose(), 100);
    } catch (error) {
      console.error('Error updating version:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Loading organizations...
      </div>
    );
  }

  return (
    <div className="p-6 ">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">App Version Management</h2>
        <p className="text-sm text-gray-500 mt-1">{orgs.length} organizations found</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
              <th className="text-left px-6 py-4 font-semibold">Serial Number</th>
              <th className="text-left px-6 py-4 font-semibold">Organization Name</th>
              <th className="text-left px-6 py-4 font-semibold">App Version</th>
              <th className="text-left px-6 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgs.map((org) => (
              <tr
                key={org.OrganizationId}
                className="hover:bg-blue-50 transition-colors duration-150"
              >
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                  {org['SerialNumber ']?.trim()}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">
                  {org.OrganizationName}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {org.AppVersion}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(org)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium  text-red-900 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    <SquarePen />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal Box */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Update App Version</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedOrg.OrganizationName} · {selectedOrg['SerialNumber ']?.trim()}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Current Version */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Current Version</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {selectedOrg.AppVersion}
              </span>
            </div>

            {/* New Version Input */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                New Version
              </label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="e.g. 2.0.34"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                ✅ {successMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating || !newVersion.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                {updating ? 'Updating...' : 'Update Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppVersionManagement;