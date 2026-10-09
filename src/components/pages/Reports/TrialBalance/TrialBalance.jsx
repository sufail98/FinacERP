// src/components/pages/Reports/TrialBalance/TrialBalance.jsx
import React, { useMemo, useState } from 'react';
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TrialBalanceFilter from './TrialBalanceFilter';
import useReportExport from '@/hooks/useReportExport';

const TrialBalance = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
  const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Trial Balance");
  const { generalSettings } = useSelector((state) => state.settings);

  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const formatNumber = (value, decimalPart) =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: decimalPart,
      maximumFractionDigits: decimalPart,
    });

  // Use the unified export hook
  const {
    exportAccountLedgerToExcel,
    exportAccountLedgerToPdf,
    exportAccountLedgerToCsv
  } = useReportExport();

  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0], // April 1st of current year
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
        branchId: selectedBranchDetails?.mainBranch ? null : Number(selectedBranchId),
        groupId: null,
        currencyId: currentCurrency?.currencyId || 30,
        ledgerName: "",
        reportType: filters.reportType === 'condensed' ? 'Condensed' : 'Detailed',
      };

      const res = await axiosInstance.post(
        "profit-and-loss/analysis-detailed-trial-balance",
        payload
      );

      setReportData(res.data);
    } catch (error) {
      console.error("Error fetching trial balance report:", error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ Computed Data ------------------------------ */

  const groupedData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData.data)) return [];
    return reportData.data;
  }, [reportData]);

  const { totalDebit, totalCredit } = useMemo(() => {
    if (!reportData || !reportData.grandTotal) {
      return { totalDebit: 0, totalCredit: 0 };
    }
    return {
      totalDebit: Number(reportData.grandTotal.Debit || 0),
      totalCredit: Number(reportData.grandTotal.Credit || 0),
    };
  }, [reportData]);

  const difference = useMemo(() => totalDebit - totalCredit, [totalDebit, totalCredit]);

  /* ------------------------------ Export Configuration ------------------------------ */

  const getExportOptions = () => {
    const decimalPart = generalSettings?.decimalPart || 2;
    const reportTypeLabel = filters.reportType === 'condensed' ? 'Condensed' : 'Detailed';

    const exportData = [];
    groupedData.forEach((group) => {
      exportData.push({
        LedgerName: group.groupName,
        LedgerCode: '',
        GroupName: '',
        Opening: '',
        Debit: formatNumber(group.groupDebit, decimalPart),
        Credit: formatNumber(group.groupCredit, decimalPart),
        isGroup: true,
      });
      (group.ledgers || []).forEach((ledger) => {
        exportData.push({
          LedgerName: ledger.ledgerName,
          LedgerCode: ledger.ledgerId,
          GroupName: group.groupName,
          Opening: ledger.Opening,
          Debit: formatNumber(ledger.Debit, decimalPart),
          Credit: formatNumber(ledger.Credit, decimalPart),
          isGroup: false,
        });
      });
    });

    const formattedDifference =
      difference === 0
        ? '0.00'
        : difference > 0
          ? `${formatNumber(Math.abs(difference), decimalPart)} Dr`
          : `${formatNumber(Math.abs(difference), decimalPart)} Cr`;

    return {
      fileName: `Trial_Balance_${reportTypeLabel}_${filters.fromDate}_to_${filters.toDate}`,
      title: t('trialBalance.breadcrumb.title') || 'Trial Balance',
      subtitle: `${reportTypeLabel} Report`,
      ledgerName: `Trial Balance - ${reportTypeLabel}`,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      data: exportData,
      footer: {
        label: t('Grand Total'),
        Debit: formatNumber(totalDebit, decimalPart),
        Credit: formatNumber(totalCredit, decimalPart),
        Difference: formattedDifference,
      },
      theme: 'professional',
      decimalPlaces: decimalPart,
      columns: [
        { key: 'LedgerName', label: t('trialBalance.columns.ledgerName') || 'Ledger / Group', align: 'left', width: 30 },
        { key: 'Opening', label: t('trialBalance.columns.opening') || 'Opening', align: 'right', width: 15 },
        { key: 'Debit', label: t('trialBalance.columns.debit') || 'Debit', align: 'right', width: 18, type: 'currency' },
        { key: 'Credit', label: t('trialBalance.columns.credit') || 'Credit', align: 'right', width: 18, type: 'currency' },
      ],
    };
  };

  const handleExportExcel = () => {
    if (!groupedData || groupedData.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToExcel(getExportOptions());
  };

  const handleExportPdf = () => {
    if (!groupedData || groupedData.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToPdf({ ...getExportOptions(), orientation: 'landscape' });
  };

  const handleExportCsv = () => {
    if (!groupedData || groupedData.length === 0) {
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
          groupedData && groupedData.length > 0
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
        {loading ? (
          <Preloader />
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <th className="text-left px-4 py-3">{t('trialBalance.columns.ledgerName') || 'Ledger / Group'}</th>
                  <th className="text-left px-4 py-3">{t('opening') || 'Opening'}</th>
                  <th className="text-right px-4 py-3">{t('trialBalance.columns.debit') || 'Debit'}</th>
                  <th className="text-right px-4 py-3">{t('trialBalance.columns.credit') || 'Credit'}</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      {t('No data available')}
                    </td>
                  </tr>
                ) : (
                  groupedData.map((group) => {
                    const decimalPart = generalSettings?.decimalPart || 2;
                    const isExpanded = !!expandedGroups[group.groupId];
                    return (
                      <React.Fragment key={group.groupId}>
                        <tr
                          className="bg-blue-50/50 hover:bg-blue-50 cursor-pointer border-b"
                          onClick={() => toggleGroup(group.groupId)}
                        >
                          <td className="px-4 py-2.5 font-medium text-blue-700">
                            <span className="inline-flex items-center gap-2">
                              <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              {group.groupName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">—</td>
                          <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                            {formatNumber(group.groupDebit, decimalPart)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                            {formatNumber(group.groupCredit, decimalPart)}
                          </td>
                        </tr>

                        {isExpanded &&
                          (group.ledgers || []).map((ledger) => (
                            <tr key={ledger.ledgerId} className="border-b last:border-b-0">
                              <td className="px-4 py-2 pl-10 text-gray-700">{ledger.ledgerName}</td>
                              <td className="px-4 py-2 text-gray-500">{ledger.Opening}</td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {formatNumber(ledger.Debit, decimalPart)}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {formatNumber(ledger.Credit, decimalPart)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {groupedData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-800 text-white font-semibold">
                    <td className="px-4 py-3">{t('Grand Total')}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-red-300">
                      {formatNumber(totalDebit, generalSettings?.decimalPart || 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-300">
                      {formatNumber(totalCredit, generalSettings?.decimalPart || 2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialBalance;