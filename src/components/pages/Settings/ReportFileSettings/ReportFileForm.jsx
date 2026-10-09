import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import MultiMasterFormModal from '@/components/pages/Master/multiMasterForms/MultiMasterFormModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import axiosInstance from '@/lib/axiosConfig';
import AlertBox from '@/components/common/AlertBox';
import useAuth from '@/redux/hook/auth/useAuth';
import { ChevronDown } from 'lucide-react';
import { showToast } from '@/utils/toast';

// Custom Combobox Component
const ComboboxInput = ({
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setFilteredOptions(
      options.filter(option =>
        option.toLowerCase().includes((value || '').toLowerCase())
      )
    );
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange(e);
    setIsOpen(true);
  };

  const handleOptionSelect = (option) => {
    const syntheticEvent = {
      target: {
        name: name,
        value: option,
        type: 'text'
      }
    };
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFilteredOptions(options);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pr-10"
          required={required}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={toggleDropdown}
          className="absolute right-0 h-full px-3 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-600 rounded-sm shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => handleOptionSelect(option)}
              className={`px-3 py-1 cursor-pointer text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${value === option ? 'bg-blue-100 dark:bg-gray-600' : ''
                }`}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReportFileForm = ({ open, handleClose, onSuccess, editData = null, distingtDataToForm }) => {
  const [errorMsg, setErrorMsg] = useState('');


  const { t } = useTranslation();
  const { selectedBranchId, userId } = useAuth();
  const [loading, setLoading] = useState(false);
 
  const [formData, setFormData] = useState({
    formName: '',
    formType: '',
    printType: '',
    reportName: '',
    isDefault: false,
    isActive: true,
    extraDate: new Date().toISOString().split('T')[0],
    extra1: '',
    ReportFormat: 'PDF',
    branchId: selectedBranchId,
    CreatedUser: userId,
  });

  // Extract options from distingtDataToForm
  const formNameOptions = distingtDataToForm?.formName || [];
  const formTypeOptions = distingtDataToForm?.formType || [];
  const printTypeOptions = distingtDataToForm?.printType || [];

  useEffect(() => {
    if (editData) {
      setFormData({
        ...editData,
        branchId: selectedBranchId,
      });
    } else {
      setFormData({
        formName: '',
        formType: '',
        printType: '',
        reportName: '',
        isDefault: false,
        isActive: true,
        extraDate: new Date().toISOString().split('T')[0],
        extra1: '',
        ReportFormat: 'PDF',
        branchId: selectedBranchId,
        CreatedUser: userId,
      });
    }
  }, [editData, open, selectedBranchId, userId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.formName.trim()) {
     showToast.error(t('reportFileSettings.alerts.formNameRequired') || 'Form Name is required');
      return;
    }
    if (!formData.reportName.trim()) {
      showToast.error(t('reportFileSettings.alerts.reportNameRequired') || 'Report Name is required');
      return;
    }

    setLoading(true);

    try {
      const endpoint = editData ? `report-file-dev/update/${editData.moduleId}` : 'report-file-dev/store';
      const method = 'post';

      const response = await axiosInstance[method](endpoint, formData);

   
      showToast.success( editData
          ? t('reportFileSettings.alerts.updateSuccess') || 'Report file setting updated successfully'
          : t('reportFileSettings.alerts.saveSuccess') || 'Report file setting saved successfully',)

      // Reset form
      setFormData({
        formName: '',
        formType: '',
        printType: '',
        reportName: '',
        isDefault: false,
        isActive: true,
        extraDate: new Date().toISOString().split('T')[0],
        extra1: '',
        ReportFormat: 'PDF',
        branchId: selectedBranchId,
        CreatedUser: userId,
      });

      // Close modal after success
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error saving report file setting';
      setErrorMsg(errorMessage);
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
     

      <MultiMasterFormModal
        open={open}
        handleClose={handleClose}
        title={editData ? t('reportFileSettings.form.editTitle') || 'Edit Report File Setting' : t('reportFileSettings.form.title') || 'Add Report File Setting'}
        width="700px"
      >
        <form onSubmit={handleSubmit} className="">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Form Name - Combobox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.formName') || 'Form Name'} <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                name="formName"
                value={formData.formName}
                onChange={handleInputChange}
                options={formNameOptions}
                placeholder={t('reportFileSettings.form.placeholders.formName') || 'Enter or select form name'}
                required
              />
            </div>

            {/* Form Type - Combobox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.formType') || 'Form Type'}
              </label>
              <ComboboxInput
                name="formType"
                value={formData.formType}
                onChange={handleInputChange}
                options={formTypeOptions}
                placeholder={t('reportFileSettings.form.placeholders.formType') || 'Enter or select form type'}
              />
            </div>
            {/* Print Type - Combobox */}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.printType') || 'Print Type'}
              </label>
              <ComboboxInput
                name="printType"
                value={formData.printType}
                onChange={handleInputChange}
                options={printTypeOptions}
                placeholder={t('reportFileSettings.form.placeholders.printType') || 'Enter or select print type'}
              />
            </div>

            {/* Report Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.reportName') || 'Report Name'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="reportName"
                value={formData.reportName}
                onChange={handleInputChange}
                placeholder={t('reportFileSettings.form.placeholders.reportName') || 'Enter report name'}
                className="w-full"
                required
              />
            </div>


            {/* Report Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.ReportFormat') || 'Report Format'}
              </label>
              <select
                name="ReportFormat"
                value={formData.ReportFormat}
                onChange={handleInputChange}
                className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100"
              >
                <option value="PDF">PDF</option>
                <option value="EXCEL">Excel</option>
                <option value="CSV">CSV</option>
                <option value="HTML">HTML</option>
              </select>
            </div>

            {/* Extra Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reportFileSettings.form.fields.extraDate') || 'Extra Date'}
              </label>
              <Input
                type="date"
                name="extraDate"
                value={formData.extraDate}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Extra Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reportFileSettings.form.fields.extra1') || 'Extra Information'}
            </label>
            <textarea
              name="extra1"
              value={formData.extra1}
              onChange={handleInputChange}
              placeholder={t('reportFileSettings.form.placeholders.extra1') || 'Enter extra information'}
              rows="3"
              className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('reportFileSettings.form.fields.isDefault') || 'Is Default'}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('reportFileSettings.form.fields.isActive') || 'Is Active'}
              </label>
            </div>
          </div>

          {errorMsg && (
          <div className="bg-red-100 text-red-700 px-4 py-1 rounded-sm">
            {errorMsg}
          </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="px-4 py-1"
              disabled={loading}
            >
              {t('reportFileSettings.form.buttons.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              className="px-4 py-1 main-bg hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>{editData ? 'Updating...' : 'Saving...'}</>
              ) : (
                <>{editData ? t('reportFileSettings.form.buttons.update') || 'Update' : t('reportFileSettings.form.buttons.save') || 'Save'}</>
              )}
            </Button>
          </div>
        </form>
      </MultiMasterFormModal>
    </>
  );
};

export default ReportFileForm;