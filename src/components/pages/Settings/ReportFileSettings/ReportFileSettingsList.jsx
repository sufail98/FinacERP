import { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import ErrorPage from '@/components/common/ErrorPage';
import AlertBox from '@/components/common/AlertBox';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import usePrivileges from '@/lib/hooks/usePrivileges';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import useAuth from '@/redux/hook/auth/useAuth';
import ReportFileForm from './ReportFileForm';
import { useDispatch } from 'react-redux';
import { setPrintSettings } from '@/redux/slice/settingsSlice';

const ReportFileSettingsList = () => {
  const { t } = useTranslation();
  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alert, setAlert] = useState(null);
  const [reportFiles, setReportFiles] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const { selectedBranchId } = useAuth();
  const [distingtDataToForm, setDistingtDataToForm] = useState([]);
  // Add this state at the top with your other states
  const [filters, setFilters] = useState({ formName: '', formType: '', printType: '' });

  // Add this filtered data derived value
  const filteredReportFiles = reportFiles.filter((row) => {
    return (
      (filters.formName ? row.formName === filters.formName : true) &&
      (filters.formType ? row.formType === filters.formType : true) &&
      (filters.printType ? row.printType === filters.printType : true)
    );
  });

  // Add this handler
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const dispatch = useDispatch();

  // ✅ Use privileges for Report File Settings module
  const {
    privileges,
    loading: privilegeLoading,
    hasAccess,
    message,
  } = usePrivileges('Report File Settings');

  useEffect(() => {
    if (hasAccess && !privilegeLoading) {
      fetchAllReportFiles();
      fetchDistinctData()
    }
  }, [hasAccess, privilegeLoading]);
  // Helper to transform array → structured printSettings
  const transformToPrintSettings = (data = []) => {
    return data.reduce((acc, item) => {
      const { formName, printType } = item;
      if (!acc[formName]) acc[formName] = { types: {}, default: null };
      acc[formName].types[printType] = item;
      if (item.isDefault) acc[formName].default = item;
      return acc;
    }, {});
  };
  const fetchAllReportFiles = async () => {
    setFetchLoading(true);
    try {
      const response = await axiosInstance.get(`report-file-dev/${selectedBranchId}`);
      const data = response.data?.data || [];

      setReportFiles(data);

      // ✅ Update redux print settings
      dispatch(setPrintSettings(transformToPrintSettings(data)));

      setFetchError(false);
    } catch (error) {
      setErrorMessage(
        `${error.response?.data?.message || 'Error fetching report file settings'}`
      );
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchDistinctData = async () => {
    try {
      const response = await axiosInstance.get(`report-file-dev/show-by-distinct/${selectedBranchId}`);
      setDistingtDataToForm(response.data?.data || []);


    } catch (error) {
      console.error('Error fetching distinct data:', error);
    }
  };

  const handleOpenModal = (data = null) => {
    setEditData(data);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditData(null);
  };

  const handleDelete = async (id) => {
    if (!privileges?.can_delete) {
      setAlert({ type: 'error', message: t('reportFileSettings.alerts.deletePermission') });
      return;
    }

    const result = await Swal.fire({
      title: t('delete.title'),
      text: t('delete.text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: t('delete.confirm'),
      cancelButtonText: t('delete.cancel'),
    });

    if (!result.isConfirmed) return;

    try {
      await axiosInstance.delete(`report-file-dev/delete/${id}`);
      setAlert({ type: 'success', message: 'Report File Setting Deleted' });
      fetchAllReportFiles();
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      const finalMessage = errorMessage?.toLowerCase().includes('foreign key violation')
        ? t('foreeignKeyError')
        : errorMessage;

      setAlert({
        id: Date.now(),
        type: 'error',
        message: finalMessage || 'Error deleting report file setting',
      });
    }
  };

  // ✅ Dynamically build actions based on privileges
  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleOpenModal(row),
      className: 'text-green-600 hover:text-green-800',
      tooltip: 'Edit',
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: 'text-red-600 hover:text-red-800',
      onClick: (row) => handleDelete(row.moduleId || row.reportFileSettingId),
      tooltip: 'Delete',
    });
  }

  const columns = [
    { key: 'SNo', label: '#', sortable: true },
    { key: 'formName', label: t('reportFileSettings.columns.formName') || 'Form Name', sortable: true },
    { key: 'formType', label: t('reportFileSettings.columns.formType') || 'Form Type', sortable: true },
    { key: 'reportName', label: t('reportFileSettings.columns.reportName') || 'Report Name', sortable: true },
    { key: 'printType', label: t('reportFileSettings.columns.printType') || 'Print Type', sortable: true },
    { key: 'isActive', label: t('reportFileSettings.columns.status') || 'Status', sortable: true },
  ];

  const renderCell = (key, row) => {
    if (key === 'printType') {
      return (
        <span className="flex items-center gap-2">
          {row.printType ?? '-'}
          {row.isDefault && (
            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
              Default
            </span>
          )}
        </span>
      );
    }
    if (key === 'isActive') {
      return (
        <span
          className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${row.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
            }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      );
    }
    if (key === 'filePath') {
      return <span className="font-mono text-sm">{row[key] || '-'}</span>;
    }
    return row[key] ?? '-';
  };

  // Show full screen loader only on initial load
  if (privilegeLoading || (fetchLoading && reportFiles.length === 0)) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('settings.breadcrumb.settings') || 'Settings', url: '/settings' },
            { title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings', url: '#' },
          ]}
          heading={{ icon: FileText, title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings' }}
        />
        <Preloader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('settings.breadcrumb.settings') || 'Settings', url: '/settings' },
            { title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings', url: '#' },
          ]}
          heading={{ icon: FileText, title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings' }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  if (fetchError && !fetchLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('settings.breadcrumb.settings') || 'Settings', url: '/settings' },
            { title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings', url: '#' },
          ]}
          heading={{ icon: FileText, title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings' }}
        />
        <ErrorPage message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="dark:bg-[#121212] transition-colors">
      {/* {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />} */}

      <BreadCrumb
        routes={[
          { title: t('settings.breadcrumb.settings') || 'Settings', url: '/settings' },
          { title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings', url: '#' },
        ]}
        heading={{ icon: FileText, title: t('reportFileSettings.breadcrumb.title') || 'Report File Settings' }}
        actions={
          privileges?.can_add
            ? [
              {
                label: t('createNewBtn') || 'Create New',
                icon: Plus,
                type: 'secondary',
                onClick: () => handleOpenModal(),
              },
            ]
            : []
        }
      />

      <div className="w-full dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 mb-3">
            {[
              { key: 'formName', label: t('reportFileSettings.columns.formName') || 'Form Name' },
              { key: 'formType', label: t('reportFileSettings.columns.formType') || 'Form Type' },
              { key: 'printType', label: t('reportFileSettings.columns.printType') || 'Print Type' },
            ].map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
                <select
                  value={filters[key]}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 
                       bg-white dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                >
                  <option value="">All {label}s</option>
                  {(distingtDataToForm[key] || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Clear Filters Button - only shows when a filter is active */}
            {Object.values(filters).some(Boolean) && (
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ formName: '', formType: '', printType: '' })}
                  className="text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-600 
                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <ContentTable
            columns={columns}
            data={filteredReportFiles}   
            actions={actions}
            renderCell={renderCell}
            loading={fetchLoading}
            staticSearchable
            maxHeight="65vh"
          />
        </div>
      </div>

      {/* Report File Form Modal */}
      <ReportFileForm
        open={openModal}
        handleClose={handleCloseModal}
        editData={editData}
        onSuccess={() => {
          fetchAllReportFiles();
          fetchDistinctData();
          dispatch(setPrintSettings())
        }}
        distingtDataToForm={distingtDataToForm}
      />
    </div>
  );
};

export default ReportFileSettingsList;