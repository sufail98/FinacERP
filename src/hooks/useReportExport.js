// src/hooks/useReportExport.js
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '@/redux/hook/auth/useAuth';
import { exportReportToExcel, createReportConfig } from '@/utils/excelExport';
import { exportReportToPdf, createPdfReportConfig } from '@/utils/pdfExport';
import { exportReportToCsv, createCsvReportConfig } from '@/utils/csvExport';

/**
 * Unified hook for all report export functionality (Excel, PDF, CSV)
 * Automatically includes company information from auth context
 */
const useReportExport = () => {
    const { t } = useTranslation();
    const { selectedBranchDetails } = useAuth();

    const getCompanyInfo = useCallback(() => ({
        name: selectedBranchDetails?.branchName || selectedBranchDetails?.companyName || '',
        address: selectedBranchDetails?.address || '',
        phone: selectedBranchDetails?.phone || selectedBranchDetails?.mobile || '',
        email: selectedBranchDetails?.email || ''
    }), [selectedBranchDetails]);

    // ==================== EXCEL EXPORTS ====================

    const exportAccountLedgerToExcel = useCallback((options) => {
        const config = createReportConfig.accountLedger({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToExcel(config);
    }, [getCompanyInfo]);

    const exportAccountGroupToExcel = useCallback((options) => {
        const config = createReportConfig.accountGroup({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToExcel(config);
    }, [getCompanyInfo]);

    const exportGenericToExcel = useCallback((options) => {
        const config = createReportConfig.generic({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToExcel(config);
    }, [getCompanyInfo]);

    // ==================== PDF EXPORTS ====================

   const exportAccountLedgerToPdf = useCallback(async (options) => {
    const config = createPdfReportConfig.accountLedger({
        ...options,
        companyInfo: options.companyInfo || getCompanyInfo()
    });
    return await exportReportToPdf(config);
}, [getCompanyInfo]);

    const exportAccountGroupToPdf = useCallback((options) => {
        const config = createPdfReportConfig.accountGroup({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToPdf(config);
    }, [getCompanyInfo]);

    const exportGenericToPdf = useCallback((options) => {
        const config = createPdfReportConfig.generic({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToPdf(config);
    }, [getCompanyInfo]);

    // ==================== CSV EXPORTS ====================

    const exportAccountLedgerToCsv = useCallback((options) => {
        const config = createCsvReportConfig.accountLedger({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToCsv(config);
    }, [getCompanyInfo]);

    const exportAccountGroupToCsv = useCallback((options) => {
        const config = createCsvReportConfig.accountGroup({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToCsv(config);
    }, [getCompanyInfo]);

    const exportGenericToCsv = useCallback((options) => {
        const config = createCsvReportConfig.generic({
            ...options,
            companyInfo: options.companyInfo || getCompanyInfo()
        });
        return exportReportToCsv(config);
    }, [getCompanyInfo]);

    // ==================== UNIFIED EXPORT METHODS ====================

    /**
     * Export Account Ledger Report to any format
     */
    const exportAccountLedger = useCallback((options, format = 'excel') => {
        switch (format.toLowerCase()) {
            case 'pdf':
                return exportAccountLedgerToPdf(options);
            case 'csv':
                return exportAccountLedgerToCsv(options);
            case 'excel':
            default:
                return exportAccountLedgerToExcel(options);
        }
    }, [exportAccountLedgerToExcel, exportAccountLedgerToPdf, exportAccountLedgerToCsv]);

    /**
     * Export Account Group Report to any format
     */
    const exportAccountGroup = useCallback((options, format = 'excel') => {
        switch (format.toLowerCase()) {
            case 'pdf':
                return exportAccountGroupToPdf(options);
            case 'csv':
                return exportAccountGroupToCsv(options);
            case 'excel':
            default:
                return exportAccountGroupToExcel(options);
        }
    }, [exportAccountGroupToExcel, exportAccountGroupToPdf, exportAccountGroupToCsv]);

    /**
     * Export Generic Report to any format
     */
    const exportGenericReport = useCallback((options, format = 'excel') => {
        switch (format.toLowerCase()) {
            case 'pdf':
                return exportGenericToPdf(options);
            case 'csv':
                return exportGenericToCsv(options);
            case 'excel':
            default:
                return exportGenericToExcel(options);
        }
    }, [exportGenericToExcel, exportGenericToPdf, exportGenericToCsv]);

    return {
        // Excel exports
        exportAccountLedgerToExcel,
        exportAccountGroupToExcel,
        exportGenericToExcel,
        
        // PDF exports
        exportAccountLedgerToPdf,
        exportAccountGroupToPdf,
        exportGenericToPdf,
        
        // CSV exports
        exportAccountLedgerToCsv,
        exportAccountGroupToCsv,
        exportGenericToCsv,
        
        // Unified exports (specify format)
        exportAccountLedger,
        exportAccountGroup,
        exportGenericReport,
        
        // Utility
        getCompanyInfo
    };
};

export default useReportExport;