// src/components/pages/Reports/LedgerDetailedReport/LedgerDetailedReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import LedgerDetailedReportFilter from './LedgerDetailedReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const LedgerDetailedReport = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [costCenterData, setCostCenterData] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [userData, setUserData] = useState([]);
  const { selectedBranchId, currentCurrency,selectedBranchDetails } = useAuth();
  const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Detailed Ledger Report");
  const { generalSettings } = useSelector((state) => state.settings);

  // Use the unified export hook
  const {
    exportAccountLedgerToExcel,
    exportAccountLedgerToPdf,
    exportAccountLedgerToCsv
  } = useReportExport();

  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    ledgerId: null,
    ledgerName: '',
    costCentreId: null,
  });

  useEffect(() => {
    fetchCostCenterData();
    fetchLedgerData();
    fetchUserData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const format = generalSettings?.dateformat || 'dd-MM-yyyy';
    return format
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', yyyy);
  };
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.MasterId) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.MasterId}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.MasterId}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.MasterId}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.MasterId}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.MasterId}`,
            'Payment Voucher': `/transaction/payment-voucher/edit-payment-voucher/${row.MasterId}`,
            'Receipt Voucher': `/transaction/reciept-voucher/edit-reciept-voucher/${row.MasterId}`,
            'Contra Voucher': `/transaction/contra-voucher/edit-contra-voucher/${row.MasterId}`,
            'Material Receipt': `/transaction/material-receipt/edit/${row.MasterId}`,
            'Delivery Note': `/transaction/delivery-note/edit-delivery-note/${row.MasterId}`,
            'Payable Voucher': `/transaction/payable-voucher/edit/${row.MasterId}`,
            'Receivable Voucher': `/transaction/receivable-voucher/edit/${row.MasterId}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.MasterId}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.MasterId}`,
        };

        const path = routes[row.voucherType];
        if (path) navigate(path);
    };
  const fetchCostCenterData = async () => {
    try {
      const res = await axiosInstance.get("cost-centres");
      setCostCenterData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching cost centers:", err);
    }
  };

  const fetchLedgerData = async () => {
    try {
      const response = await axiosInstance.get(`all-account-ledgers/${selectedBranchId}`);

      setLedgerData(response.data.data || []);
    } catch (error) {
      console.error("Error fetching ledgers:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await axiosInstance.get("users");
      setUserData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const payload = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        ledgerId: filters.ledgerId || 0,
        branchId:selectedBranchDetails?.mainBranch ? null :  Number(selectedBranchId),
        currencyId: currentCurrency?.currencyId || 30,
        ledgerName: filters.ledgerName || "",
        costCentreId: filters.costCentreId,
        isShowOpeningBalance: true,
      };

      const res = await axiosInstance.post("accountledger-detailed-report", payload);
      const dataWithFormattedDates = (Array.isArray(res.data.data || res.data) ? (res.data.data || res.data) : []).map((item) => ({
        ...item,
        Date: formatDate(item.Date)
      }));
      setReportData(dataWithFormattedDates);
    } catch (error) {
      console.error("Error fetching report:", error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

 const reportDataWithBalance = useMemo(() => {
    if (!Array.isArray(reportData)) return [];

    let runningBalance = 0;

    return reportData.map((row, index) => {
      const debit = Number(row.Debit) || 0;
      const credit = Number(row.Credit) || 0;

      // FIX: net debit and credit together instead of treating them
      // as independent conditions. Previously, if a row had BOTH a
      // debit and a credit (e.g. 7447.40 / 7447.40), only the debit
      // branch fired (due to else if), so the credit was never
      // subtracted — inflating the running balance.
      runningBalance += (debit - credit);

      const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
      const amount = Math.abs(runningBalance).toFixed(generalSettings?.decimalPart || 2);
      let formattedLabel = '';
      if (isCrDr) {
        formattedLabel = runningBalance < 0 ? `${amount} Cr` : `${amount} Dr`;
      } else {
        formattedLabel = runningBalance < 0 ? `-${amount}` : amount;
      }

      return {
        ...row,
        BalanceValue: runningBalance,
        BalanceLabel: formattedLabel
      };
    });
  }, [reportData, generalSettings?.decimalPart, generalSettings?.AccountCalculationMethod]);
  const { totalCrAmount, totalDrAmount } = useMemo(() => {
    if (!reportData || !Array.isArray(reportData)) {
      return { totalCrAmount: 0, totalDrAmount: 0 };
    }

    return reportData.reduce((totals, row) => {
      const crAmount = parseFloat(row.Credit) || 0;
      const drAmount = parseFloat(row.Debit) || 0;

      return {
        totalCrAmount: totals.totalCrAmount + crAmount,
        totalDrAmount: totals.totalDrAmount + drAmount
      };
    }, { totalCrAmount: 0, totalDrAmount: 0 });
  }, [reportData]);

  const closingBalance = useMemo(() => {
    if (!reportDataWithBalance || reportDataWithBalance.length === 0) return 0;
    return reportDataWithBalance[reportDataWithBalance.length - 1].BalanceValue;
  }, [reportDataWithBalance]);

  const footerData = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;

    const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
    const amount = Math.abs(closingBalance).toFixed(generalSettings?.decimalPart || 2);
    let formattedBalance = '';
    if (isCrDr) {
      formattedBalance = closingBalance < 0 ? `${amount} Cr` : `${amount} Dr`;
    } else {
      formattedBalance = closingBalance < 0 ? `-${amount}` : amount;
    }

    return {
      label: t('Total'),
      Debit: totalDrAmount.toFixed(generalSettings?.decimalPart || 2),
      Credit: totalCrAmount.toFixed(generalSettings?.decimalPart || 2),
      BalanceLabel: formattedBalance
    };
  }, [reportData, totalCrAmount, totalDrAmount, closingBalance, generalSettings?.decimalPart, generalSettings?.AccountCalculationMethod, t]);

  // Get selected ledger
  const selectedLedger = ledgerData.find(l => l.ledgerId === filters.ledgerId);
  const ledgerName = selectedLedger?.ledgerName || 'Detailed Ledger';

  /* ------------------------------ Export Configuration ------------------------------ */

  const getExportOptions = () => {
    const decimalPart = generalSettings?.decimalPart || 2;

    const exportData = reportDataWithBalance.map((row, index) => ({
      SlNo: row.SNo || index + 1,
      Date: row.Date || '',
      voucherType: row.voucherType || '',
      ledgerCode: row.ledgerCode || '',
      Narration: row.Narration || '',
      CostCentre: row.CostCentre || '',
      Debit: Number(row.Debit || 0).toFixed(decimalPart),
      Credit: Number(row.Credit || 0).toFixed(decimalPart),
      Balance: row.BalanceLabel || ''
    }));

    const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
    const amount = Math.abs(closingBalance).toFixed(decimalPart);
    let formattedBalance = '';
    if (isCrDr) {
      formattedBalance = closingBalance < 0 ? `${amount} Cr` : `${amount} Dr`;
    } else {
      formattedBalance = closingBalance < 0 ? `-${amount}` : amount;
    }

    return {
      fileName: `Detailed_Ledger_${ledgerName.replace(/\s+/g, '_')}`,
      title: t('detailedledgerReport.breadcrumb.title') || 'Detailed Ledger Report',
      subtitle: ledgerName,
      ledgerName: ledgerName,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      data: exportData,
      footer: {
        label: t('Total'),
        Debit: totalDrAmount.toFixed(decimalPart),
        Credit: totalCrAmount.toFixed(decimalPart),
        Balance: formattedBalance
      },
      theme: 'professional',
      decimalPlaces: decimalPart,
      columns: [
        { key: 'SlNo', label: t('detailedledgerReport.columns.SNo') || '#', align: 'center', width: 8 },
        { key: 'Date', label: t('detailedledgerReport.columns.Date') || 'Date', align: 'center', width: 12 },
        { key: 'voucherType', label: t('detailedledgerReport.columns.voucherType') || 'Voucher Type', align: 'left', width: 16 },
        { key: 'ledgerCode', label: t('detailedledgerReport.columns.ledgerCode') || 'Ledger Code', align: 'center', width: 12 },
        { key: 'Narration', label: t('detailedledgerReport.columns.Narration') || 'Narration', align: 'left', width: 30 },
        { key: 'CostCentre', label: t('detailedledgerReport.columns.CostCentre') || 'Cost Centre', align: 'left', width: 15 },
        { key: 'Debit', label: t('detailedledgerReport.columns.Debit') || 'Debit', align: 'right', width: 14, type: 'currency' },
        { key: 'Credit', label: t('detailedledgerReport.columns.Credit') || 'Credit', align: 'right', width: 14, type: 'currency' },
        { key: 'Balance', label: t('detailedledgerReport.columns.BalanceLabel') || 'Balance', align: 'right', width: 16, type: 'balance' }
      ]
    };
  };

  const handleExportExcel = () => {
    if (!reportDataWithBalance || reportDataWithBalance.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToExcel(getExportOptions());
  };

  const handleExportPdf = () => {
    if (!reportDataWithBalance || reportDataWithBalance.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToPdf({ ...getExportOptions(), orientation: 'landscape' });
  };

  const handleExportCsv = () => {
    if (!reportDataWithBalance || reportDataWithBalance.length === 0) {
      alert(t('No data to export'));
      return;
    }
    exportAccountLedgerToCsv(getExportOptions());
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      ledgerId: null,
      ledgerName: '',
      costCentreId: null,
    });
    setReportData(null);
  };

  const ledgerOptions = ledgerData.map(ledger => ({
    label: ledger.ledgerName,
    value: ledger.ledgerId
  }));

  const columns = [
    { key: 'SNo', label: t('detailedledgerReport.columns.SNo') },
    { key: 'Date', label: t('detailedledgerReport.columns.Date') },
    { key: 'voucherType', label: t('detailedledgerReport.columns.voucherType') },
    { key: 'ledgerCode', label: t('detailedledgerReport.columns.ledgerCode') },
    { key: 'Narration', label: t('detailedledgerReport.columns.Narration') },
    { key: 'CostCentre', label: t('detailedledgerReport.columns.CostCentre') },
    { key: 'Debit', label: t('detailedledgerReport.columns.Debit'), align: "right", width: "100px" },
    { key: 'Credit', label: t('detailedledgerReport.columns.Credit'), align: "right", width: "100px" },
    { key: 'BalanceLabel', label: t('detailedledgerReport.columns.BalanceLabel'), align: "right", width: "100px" }
  ];

  const costCenterOptions = costCenterData.map(center => ({
    label: center.CostCentre,
    value: center.costCentreId
  }));

  const renderCell = (key, row) => {
    if (key === "Date") {
      return row[key] ?? "-";
    }
    if (key === "Credit") {
      return (
        <div className="text-sm">
          <div className="flex items-center justify-end gap-1 mb-1">
            <span>{Number(row.Credit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
          </div>
        </div>
      );
    }
    if (key === "Debit") {
      return (
        <div className="text-sm">
          <div className="flex items-center justify-end gap-1 mb-1">
            <span>{Number(row.Debit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
          </div>
        </div>
      );
    }
    if (key === "BalanceLabel") {
      const isDr = row.BalanceValue >= 0;
      return (
        <div className={`text-sm font-medium text-right ${isDr ? "text-green-600" : "text-red-600"}`}>
          {row.BalanceLabel}
        </div>
      );
    }
    return row[key] ?? "-";
  };

  if (privilegeLoading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("detailedledgerReport.breadcrumb.group"), url: "#" },
            { title: t("detailedledgerReport.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Wallet, title: t("detailedledgerReport.breadcrumb.title") }}
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
            { title: t("detailedledgerReport.breadcrumb.group"), url: "#" },
            { title: t("detailedledgerReport.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: Wallet, title: t("detailedledgerReport.breadcrumb.title") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  return (
    <div className="">
      <BreadCrumb
        routes={[
          { title: t("detailedledgerReport.breadcrumb.group"), url: "#" },
          { title: t("detailedledgerReport.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: Wallet, title: t("detailedledgerReport.breadcrumb.title") }}
        exportConfig={reportDataWithBalance && reportDataWithBalance.length > 0 ? {
          onExportExcel: handleExportExcel,
          onExportPdf: handleExportPdf,
          onExportCsv: handleExportCsv,
          label: t('Export Report')
        } : null}
      />
      <LedgerDetailedReportFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onGenerateReport={fetchReport}
        ledgerOptions={ledgerOptions}
        costCenterOptions={costCenterOptions}
        loading={loading}
        hasReportData={!!reportData}
        resetFilters={resetFilters}
      />

      <div className='px-1'>
        <ContentTable
          columns={columns}
          data={reportDataWithBalance}
          loading={loading}
          footerData={footerData}
          renderCell={renderCell}
           onRowClick={handleRowClick}
           maxHeight="calc(100vh - 230px)"
        />
      </div>
    </div>
  );
};

export default LedgerDetailedReport;