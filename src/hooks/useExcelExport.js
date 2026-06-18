// src/hooks/useExcelExport.js
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '@/redux/hook/auth/useAuth';
import { exportReportToExcel, createReportConfig } from '@/utils/excelExport';

/**
 * Custom hook for Excel export functionality
 * Automatically includes company information from auth context
 */
const useExcelExport = () => {
  const { t } = useTranslation();
  const { selectedBranchDetails } = useAuth();

  const getCompanyInfo = useCallback(() => ({
    name: selectedBranchDetails?.branchName || selectedBranchDetails?.companyName || '',
    address: selectedBranchDetails?.address || '',
    phone: selectedBranchDetails?.phone || selectedBranchDetails?.mobile || '',
    email: selectedBranchDetails?.email || ''
  }), [selectedBranchDetails]);

  /**
   * Export Account Ledger Report
   */
  const exportAccountLedger = useCallback((options) => {
    const config = createReportConfig.accountLedger({
      ...options,
      companyInfo: options.companyInfo || getCompanyInfo()
    });
    return exportReportToExcel(config);
  }, [getCompanyInfo]);

  /**
   * Export Account Group Report
   */
  const exportAccountGroup = useCallback((options) => {
    const config = createReportConfig.accountGroup({
      ...options,
      companyInfo: options.companyInfo || getCompanyInfo()
    });
    return exportReportToExcel(config);
  }, [getCompanyInfo]);

  /**
   * Export Trial Balance Report
   */
  const exportTrialBalance = useCallback((options) => {
    const config = createReportConfig.trialBalance({
      ...options,
      companyInfo: options.companyInfo || getCompanyInfo()
    });
    return exportReportToExcel(config);
  }, [getCompanyInfo]);

  /**
   * Export Sales Report
   */
  const exportSalesReport = useCallback((options) => {
    const config = createReportConfig.salesReport({
      ...options,
      companyInfo: options.companyInfo || getCompanyInfo()
    });
    return exportReportToExcel(config);
  }, [getCompanyInfo]);

  /**
   * Export Generic/Custom Report
   */
  const exportGenericReport = useCallback((options) => {
    const config = createReportConfig.generic({
      ...options,
      companyInfo: options.companyInfo || getCompanyInfo()
    });
    return exportReportToExcel(config);
  }, [getCompanyInfo]);

  /**
   * Export with fully custom configuration
   */
  const exportCustom = useCallback((config) => {
    const finalConfig = {
      ...config,
      companyInfo: config.companyInfo || getCompanyInfo()
    };
    return exportReportToExcel(finalConfig);
  }, [getCompanyInfo]);

  return {
    exportAccountLedger,
    exportAccountGroup,
    exportTrialBalance,
    exportSalesReport,
    exportGenericReport,
    exportCustom,
    getCompanyInfo
  };
};

export default useExcelExport;