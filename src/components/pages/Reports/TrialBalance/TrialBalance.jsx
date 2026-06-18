// src/components/pages/Reports/TrialBalance/TrialBalance.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TrialBalanceFilter from './TrialBalanceFilter';
import useReportExport from '@/hooks/useReportExport';

const TrialBalance = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const { selectedBranchId, currentCurrency } = useAuth();
  const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Trial Balance");
  const { generalSettings } = useSelector((state) => state.settings);

  // Use the unified export hook
  const {
    exportAccountLedgerToExcel,
    exportAccountLedgerToPdf,
    exportAccountLedgerToCsv
  } = useReportExport();

  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0], // April 1st of current year
    toDate: new Date().toISOString().split('T')[0],
    reportType: 'condensed', // condensed | detailed
  });

  /* ------------------------------ Fetch Report ------------------------------ */

  const fetchReport = async () => {
    setLoading(true);
    try {
      const payload = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        branchId: Number(selectedBranchId),
        groupId: 44,
        currencyId: currentCurrency?.currencyId || 30,
        ledgerName: "",
        reportType: filters.reportType === 'condensed' ? 'Condensed' : 'Detailed',
      };

      const res = await axiosInstance.post(
        "profit-and-loss/analysis-detailed-trial-balance",
        payload
      );
      
      setReportData(res.data.data || res.data);
    } catch (error) {
      console.error("Error fetching trial balance report:", error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ Computed Data ------------------------------ */

  const processedData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData)) return [];

    const decimalPart = generalSettings?.decimalPart || 2;

    return reportData.map((row, index) => {
      const debit = Number(row.Debit || row.debit || 0);
      const credit = Number(row.Credit || row.credit || 0);

      return {
        ...row,
        SNo: row.SNo || row.sNo || index + 1,
        LedgerName: row.LedgerName || row.ledgerName || row.AccountName || row.accountName || '',
        LedgerCode: row.LedgerCode || row.ledgerCode || row.AccountCode || row.accountCode || '',
        GroupName: row.GroupName || row.groupName || row.AccountGroup || row.accountGroup || '',
        DebitFormatted: debit.toFixed(decimalPart),
        CreditFormatted: credit.toFixed(decimalPart),
        DebitValue: debit,
        CreditValue: credit,
      };
    });
  }, [reportData, generalSettings?.decimalPart]);

  const { totalDebit, totalCredit } = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { totalDebit: 0, totalCredit: 0 };
    }

    return processedData.reduce(
      (totals, row) => ({
        totalDebit: totals.totalDebit + row.DebitValue,
        totalCredit: totals.totalCredit + row.CreditValue,
      }),
      { totalDebit: 0, totalCredit: 0 }
    );
  }, [processedData]);

  const difference = useMemo(() => {
    return totalDebit - totalCredit;
  }, [totalDebit, totalCredit]);

  const footerData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

    const decimalPart = generalSettings?.decimalPart || 2;

    return {
      label: t('Total'),
      Debit: totalDebit.toFixed(decimalPart),
      Credit: totalCredit.toFixed(decimalPart),
      Difference:
        difference === 0
          ? '0.00'
          : difference > 0
            ? `${Math.abs(difference).toFixed(decimalPart)} Dr`
            : `${Math.abs(difference).toFixed(decimalPart)} Cr`,
    };
  }, [reportData, totalDebit, totalCredit, difference, generalSettings?.decimalPart, t]);

  /* ------------------------------ Export Configuration ------------------------------ */

  const getExportOptions = () => {
    const decimalPart = generalSettings?.decimalPart || 2;
    const reportTypeLabel = filters.reportType === 'condensed' ? 'Condensed' : 'Detailed';

    const exportData = processedData.map((row, index) => ({
      SlNo: row.SNo || index + 1,
      LedgerCode: row.LedgerCode || '',
      LedgerName: row.LedgerName || '',
      GroupName: row.GroupName || '',
      Debit: row.DebitFormatted,
      Credit: row.CreditFormatted,
    }));

    const formattedDifference =
      difference === 0
        ? '0.00'
        : difference > 0
          ? `${Math.abs(difference).toFixed(decimalPart)} Dr`
          : `${Math.abs(difference).toFixed(decimalPart)} Cr`;

    return {
      fileName: `Trial_Balance_${reportTypeLabel}_${filters.fromDate}_to_${filters.toDate}`,
      title: t('trialBalance.breadcrumb.title') || 'Trial Balance',
      subtitle: `${reportTypeLabel} Report`,
      ledgerName: `Trial Balance - ${reportTypeLabel}`,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      data: exportData,
      footer: {
        label: t('Total'),
        Debit: totalDebit.toFixed(decimalPart),
        Credit: totalCredit.toFixed(decimalPart),
        Difference: formattedDifference,
      },
      theme: 'professional',
      decimalPlaces: decimalPart,
      columns: [
        { key: 'SlNo', label: '#', align: 'center', width: 8 },
        { key: 'LedgerCode', label: t('trialBalance.columns.ledgerCode') || 'Code', align: 'center', width: 12 },
        { key: 'LedgerName', label: t('trialBalance.columns.ledgerName') || 'Ledger Name', align: 'left', width: 25 },
        { key: 'GroupName', label: t('trialBalance.columns.groupName') || 'Group', align: 'left', width: 20 },
        { key: 'Debit', label: t('trialBalance.columns.debit') || 'Debit', align: 'right', width: 16, type: 'currency' },
        { key: 'Credit', label: t('trialBalance.columns.credit') || 'Credit', align: 'right', width: 16, type: 'currency' },
      ],
    };
  };

  const handleExportExcel = () => {
    if (!processedData || processedData.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToExcel(getExportOptions());
  };

  const handleExportPdf = () => {
    if (!processedData || processedData.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToPdf({ ...getExportOptions(), orientation: 'landscape' });
  };

  const handleExportCsv = () => {
    if (!processedData || processedData.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToCsv(getExportOptions());
  };

  /* ------------------------------ Handlers ------------------------------ */

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({
      fromDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      reportType: 'condensed',
    });
    setReportData(null);
  };

  /* ------------------------------ Columns ------------------------------ */

  const columns = useMemo(() => {
    const baseCols = [
      { key: 'SNo', label: t('trialBalance.columns.sNo') || '#' },
      { key: 'LedgerCode', label: t('trialBalance.columns.ledgerCode') || 'Code' },
      { key: 'LedgerName', label: t('trialBalance.columns.ledgerName') || 'Ledger Name' },
      { key: 'GroupName', label: t('trialBalance.columns.groupName') || 'Group' },
      { key: 'Debit', label: t('trialBalance.columns.debit') || 'Debit', align: 'right' },
      { key: 'Credit', label: t('trialBalance.columns.credit') || 'Credit', align: 'right' },
    ];

    return baseCols;
  }, [t]);

  /* ------------------------------ Render Cell ------------------------------ */

  const renderCell = (key, row) => {
    const decimalPart = generalSettings?.decimalPart || 2;

    if (key === 'Debit') {
      const value = Number(row.Debit || row.debit || 0);
      return (
        <div className="text-sm">
          <div className="flex items-center justify-end gap-1">
            <span className={value > 0 ? 'text-green-600 font-medium' : ''}>
              {value.toFixed(decimalPart)}
            </span>
          </div>
        </div>
      );
    }

    if (key === 'Credit') {
      const value = Number(row.Credit || row.credit || 0);
      return (
        <div className="text-sm">
          <div className="flex items-center justify-end gap-1">
            <span className={value > 0 ? 'text-red-600 font-medium' : ''}>
              {value.toFixed(decimalPart)}
            </span>
          </div>
        </div>
      );
    }

    if (key === 'LedgerName') {
      return (
        <div className="text-sm font-medium text-gray-800">
          {row.LedgerName || '-'}
        </div>
      );
    }

    if (key === 'GroupName') {
      return (
        <div className="text-sm text-gray-600">
          {row.GroupName || '-'}
        </div>
      );
    }

    return row[key] ?? '-';
  };

  /* ------------------------------ Loading / Access Guard ------------------------------ */

  if (privilegeLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('trialBalance.breadcrumb.group') || 'Reports', url: '#' },
            { title: t('trialBalance.breadcrumb.title') || 'Trial Balance', url: '#' },
          ]}
          heading={{ icon: Scale, title: t('trialBalance.breadcrumb.title') || 'Trial Balance' }}
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
            { title: t('trialBalance.breadcrumb.group') || 'Reports', url: '#' },
            { title: t('trialBalance.breadcrumb.title') || 'Trial Balance', url: '#' },
          ]}
          heading={{ icon: Scale, title: t('trialBalance.breadcrumb.title') || 'Trial Balance' }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  /* ------------------------------ Main Render ------------------------------ */

  return (
    <div className="">
      <BreadCrumb
        routes={[
          { title: t('trialBalance.breadcrumb.group') || 'Reports', url: '#' },
          { title: t('trialBalance.breadcrumb.title') || 'Trial Balance', url: '#' },
        ]}
        heading={{ icon: Scale, title: t('trialBalance.breadcrumb.title') || 'Trial Balance' }}
        exportConfig={
          processedData && processedData.length > 0
            ? {
                onExportExcel: handleExportExcel,
                onExportPdf: handleExportPdf,
                onExportCsv: handleExportCsv,
                label: t('Export Report'),
              }
            : null
        }
      />

      <TrialBalanceFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onGenerateReport={fetchReport}
        loading={loading}
        resetFilters={resetFilters}
      />

      <div className="px-1">
        <ContentTable
          columns={columns}
          data={processedData}
          loading={loading}
          footerData={footerData}
          renderCell={renderCell}
        />
      </div>
    </div>
  );
};

export default TrialBalance;