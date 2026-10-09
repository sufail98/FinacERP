// src/components/pages/Reports/ReceiptReport/ReceiptReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Receipt } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ReceiptReportFilters from './ReceiptReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const ReceiptReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading]               = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData]         = useState(null);
    const [alert, setAlert]                   = useState(null);

    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData]         = useState([]);
    const [userData, setUserData]             = useState([]);
    const [employeeData, setEmployeeData]     = useState([]);

    const { selectedBranchId, currentCurrency, user } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Receipt Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    /* ------------------------------ Default dates ------------------------------ */
    const getDefaultDates = () => {
        const today    = new Date();
      
        return {
            fromDate: today.toISOString().split('T')[0],
            toDate:   today.toISOString().split('T')[0]
        };
    };

     const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.receiptmasterid) return;
        navigate(`/transaction/reciept-voucher/edit-reciept-voucher/${row.receiptmasterid}`);
    };

    const [filters, setFilters] = useState({
        ...getDefaultDates(),
        ledgerId:     null,
        ledgerName:   null,
        costCentreId: null,
        userId:       null,
        employeeId:   null,
        mode:         'Summary'   // 'Summary' | 'Detailed'
    });

    /* ------------------------------ Dropdown bootstrap ------------------------------ */
    useEffect(() => { fetchDropdownData(); }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [costCentreRes, ledgerRes, usersRes, employeesRes] = await Promise.all([
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("bank-account-ledgers", {
                    group_ids: [5, 8, ],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } }))
            ]);
            setCostCenterData(costCentreRes.data.data || []);
            setLedgerData(ledgerRes.data.data         || []);
            setUserData(usersRes.data.data            || []);
            setEmployeeData(employeesRes.data.data    || []);
        } catch (err) {
            console.error("❌ [fetchDropdownData] Error:", err);
        } finally {
            setInitialLoading(false);
        }
    };

    /* ------------------------------ Fetch report ------------------------------ */
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const isDetailed = filters.mode === 'Detailed';

        const requestBody = {
            fromdate:     filters.fromDate,
            todate:       filters.toDate,
            branchid:     parseInt(selectedBranchId) || 1,
            currencyid:   parseInt(currentCurrency?.currencyId) || 1,
            detailed:     isDetailed,           // true → Detailed, false → Summary
            ledgerid:     filters.ledgerId     ? parseInt(filters.ledgerId)     : null,
            ledgername:   filters.ledgerName   || null,
            employeeid:   filters.employeeId   ? parseInt(filters.employeeId)   : null,
            userid:       String(filters.userId || user?.userId || "1"),
            costcentreid: filters.costCentreId ? parseInt(filters.costCentreId) : null
        };

        try {
            const res = await axiosInstance.post("receipt-report", requestBody);
            const raw = Array.isArray(res.data.data) ? res.data.data : [];

            if (raw.length === 0) {
                setAlert({
                    id:      Date.now(),
                    type:    'info',
                    message: t('receiptReport.messages.noDataFound') || 'No data found for the selected filters.'
                });
                setReportData([]);
                return;
            }

            /*
             * API date is already pre-formatted (e.g. "25-May-2026") for both modes.
             * No client-side date formatting needed.
             *
             * Detailed response shape (per row):
             *   receiptmasterid, slno, date, voucherno, ledger,
             *   fromledger, amount, narration, ledgernarration, doneby, costcentre
             *
             * Multiple rows share the same receiptmasterid → those are lines of one voucher.
             * Merged columns (same value on every line): date, voucherno, ledger,
             *   narration, doneby, costcentre.
             * Per-line columns (unique per row): fromledger, amount.
             * SNo comes from API field `slno`.
             *
             * Summary response shape: one row per voucher, amount = voucher total.
             */
            if (isDetailed) {
                setReportData(raw);
            } else {
                // Summary: keep as-is; amount already holds the voucher total
                setReportData(raw.map((item, index) => ({
                    ...item,
                    SNo: index + 1
                })));
            }
        } catch (error) {
            console.error("❌ Receipt Report Error:", error);
            setAlert({
                id:      Date.now(),
                type:    'error',
                message: error.response?.data?.message || error.message
            });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------ Totals ------------------------------ */
    const totals = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const dp  = generalSettings?.decimalPart || 2;
        // In both modes `amount` is the correct per-row value to sum:
        //   Detailed → line amount (each fromledger line)
        //   Summary  → voucher total
        const total = reportData.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
        return {
            amount: total.toFixed(dp),
            count:  reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    /* ------------------------------ Columns per mode ------------------------------ */
    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            /*
             * Detailed columns — NO totalamount column (field doesn't exist in API response).
             * slno  → '#' (serial per line, from API)
             * Merged: date, voucherno, ledger, narration, costcentre, doneby
             * Per-line: fromledger, amount
             */
            return [
                { key: 'slno',       label: t('receiptReport.columns.SNo')       || '#',           align: 'center', width: '55'  },
                { key: 'date',       label: t('receiptReport.columns.Date')       || 'Date',        align: 'center', width: '120' },
                { key: 'voucherno',  label: t('receiptReport.columns.VoucherNo')  || 'Voucher No',  align: 'center', width: '120' },
                { key: 'ledger',     label: t('receiptReport.columns.BankCash')   || 'Bank/Cash',   align: 'left',   width: '160' },
                { key: 'fromledger', label: t('receiptReport.columns.FromLedger') || 'From Ledger', align: 'left',   width: '160' },
                { key: 'amount',     label: t('receiptReport.columns.Amount')     || 'Amount',      align: 'right',  width: '110' },
                { key: 'narration',  label: t('receiptReport.columns.Narration')  || 'Narration',   align: 'left',   width: '140' },
                { key: 'costcentre', label: t('receiptReport.columns.CostCentre') || 'Cost Centre', align: 'center', width: '110' },
                { key: 'doneby',     label: t('receiptReport.columns.DoneBy')     || 'Done By',     align: 'center', width: '110' },
            ];
        }

        // Summary
        return [
            { key: 'SNo',        label: t('receiptReport.columns.SNo')       || '#',           align: 'center', width: '60'  },
            { key: 'date',       label: t('receiptReport.columns.Date')       || 'Date',        align: 'center', width: '120' },
            { key: 'voucherno',  label: t('receiptReport.columns.VoucherNo')  || 'Voucher No',  align: 'center', width: '130' },
            { key: 'ledger',     label: t('receiptReport.columns.BankCash')   || 'Bank/Cash',   align: 'left',   width: '180' },
            { key: 'fromledger', label: t('receiptReport.columns.FromLedger') || 'From Ledger', align: 'left',   width: '160' },
            { key: 'amount',     label: t('receiptReport.columns.Amount')     || 'Amount',      align: 'right',  width: '130' },
            { key: 'narration',  label: t('receiptReport.columns.Narration')  || 'Narration',   align: 'left'                },
            { key: 'costcentre', label: t('receiptReport.columns.CostCentre') || 'Cost Centre', align: 'center', width: '120' },
            { key: 'doneby',     label: t('receiptReport.columns.DoneBy')     || 'Done By',     align: 'center', width: '110' },
        ];
    }, [filters.mode, t]);

    /* ------------------------------ Footer ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;
        return {
            label:  t('common.total') || 'Total',
            amount: totals.amount
        };
    }, [totals, reportData, t]);

    /* ------------------------------ renderCell ------------------------------ */
    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === 'amount') {
            return (
                <div className="text-right">
                    {Number(row.amount || 0).toFixed(dp)}
                </div>
            );
        }

        // All other keys: return as-is (date already formatted by API)
        return row[key] ?? '-';
    };

    /* ------------------------------ Export ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const dp         = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';
        const selectedLedger = ledgerData.find(l => l.ledgerId === filters.ledgerId);
        const ledgerName     = selectedLedger?.ledgerName || 'All Ledgers';

        const exportData = reportData.map((row, index) => {
            if (isDetailed) {
                return {
                    slno:        row.slno        || index + 1,
                    date:        row.date        || '',
                    voucherno:   row.voucherno   || '',
                    ledger:      row.ledger      || '',
                    fromledger:  row.fromledger  || '',
                    amount:      Number(row.amount || 0).toFixed(dp),
                    narration:   row.narration   || '',
                    costcentre:  row.costcentre  || '',
                    doneby:      row.doneby      || ''
                };
            }
            return {
                SNo:        row.SNo        || index + 1,
                date:       row.date       || '',
                voucherno:  row.voucherno  || '',
                ledger:     row.ledger     || '',
                fromledger: row.fromledger || '',
                amount:     Number(row.amount || 0).toFixed(dp),
                narration:  row.narration  || '',
                costcentre: row.costcentre || '',
                doneby:     row.doneby     || ''
            };
        });

        const footer = totals ? { label: t('Total'), amount: totals.amount } : null;

        const detailedColumns = [
            { key: 'slno',       label: '#',            align: 'center', width: 5  },
            { key: 'date',       label: 'Date',         align: 'center', width: 12 },
            { key: 'voucherno',  label: 'Voucher No',   align: 'center', width: 12 },
            { key: 'ledger',     label: 'Bank/Cash',    align: 'left',   width: 18 },
            { key: 'fromledger', label: 'From Ledger',  align: 'left',   width: 18 },
            { key: 'amount',     label: 'Amount',       align: 'right',  width: 12, type: 'currency' },
            { key: 'narration',  label: 'Narration',    align: 'left',   width: 20 },
            { key: 'costcentre', label: 'Cost Centre',  align: 'center', width: 12 },
            { key: 'doneby',     label: 'Done By',      align: 'center', width: 12 },
        ];

        const summaryColumns = [
            { key: 'SNo',        label: '#',            align: 'center', width: 8  },
            { key: 'date',       label: 'Date',         align: 'center', width: 12 },
            { key: 'voucherno',  label: 'Voucher No',   align: 'left',   width: 14 },
            { key: 'ledger',     label: 'Bank/Cash',    align: 'left',   width: 18 },
            { key: 'fromledger', label: 'From Ledger',  align: 'left',   width: 18 },
            { key: 'amount',     label: 'Amount',       align: 'right',  width: 14, type: 'currency' },
            { key: 'narration',  label: 'Narration',    align: 'left',   width: 20 },
            { key: 'costcentre', label: 'Cost Centre',  align: 'left',   width: 15 },
            { key: 'doneby',     label: 'Done By',      align: 'left',   width: 15 },
        ];

        const title = isDetailed
            ? t('receiptReport.breadcrumb.detailedTitle') || 'Receipt Detailed Report'
            : t('receiptReport.breadcrumb.title')         || 'Receipt Report';

        return {
            fileName:      isDetailed
                ? `Receipt_Detailed_Report_${ledgerName.replace(/\s+/g, '_')}`
                : `Receipt_Report_${ledgerName.replace(/\s+/g, '_')}`,
            sheetName:     isDetailed ? 'Receipt Detailed' : 'Receipt Summary',
            title,
            subtitle:      `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            fromDate:      filters.fromDate,
            toDate:        filters.toDate,
            data:          exportData,
            footer,
            theme:         'professional',
            decimalPlaces: dp,
            columns:       isDetailed ? detailedColumns : summaryColumns
        };
    };

    const handleExportExcel = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('receiptReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(o);
    };
    const handleExportPdf = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('receiptReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...o, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('receiptReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToCsv(o);
    };

    /* ------------------------------ Filter handlers ------------------------------ */
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        setFilters({ ...getDefaultDates(), ledgerId: null, ledgerName: null, costCentreId: null, userId: null, employeeId: null, mode: 'Summary' });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Dropdown options ------------------------------ */
    const costCenterOptions = useMemo(() => costCenterData.map(c => ({ label: c.CostCentre,             value: c.costCentreId })), [costCenterData]);
    const ledgerOptions     = useMemo(() => ledgerData.map(l =>     ({ label: l.ledgerName,             value: l.ledgerId     })), [ledgerData]);
    const userOptions       = useMemo(() => userData.map(u =>       ({ label: u.userName || u.name,     value: u.userId       })), [userData]);
    const employeeOptions   = useMemo(() => employeeData.map(e =>   ({ label: e.employeeName || e.name, value: e.employeeId   })), [employeeData]);

    /* ------------------------------ Report title ------------------------------ */
    const reportTitle = filters.mode === 'Detailed'
        ? t('receiptReport.breadcrumb.detailedTitle') || 'Receipt Detailed Report'
        : t('receiptReport.breadcrumb.title')         || 'Receipt Report';

    /* ------------------------------ Guards ------------------------------ */
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("receiptReport.breadcrumb.group"), url: "#" }, { title: t("receiptReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Receipt, title: reportTitle }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("receiptReport.breadcrumb.group"), url: "#" }, { title: t("receiptReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Receipt, title: reportTitle }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    /* ------------------------------ Render ------------------------------ */
    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[{ title: t("receiptReport.breadcrumb.group"), url: "#" }, { title: t("receiptReport.breadcrumb.title"), url: "#" }]}
                heading={{ icon: Receipt, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('receiptReport.export.label') || 'Export Report'
                } : null}
            />

            <div className="px-1">
                <ReceiptReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    costCenterOptions={costCenterOptions}
                    ledgerOptions={ledgerOptions}
                    userOptions={userOptions}
                    employeeOptions={employeeOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    onRowClick={handleRowClick}
                    tableId="receipt-report"
                    pageSize={80}
                    // ── Grouping: active only in Detailed mode ──
                    // Group by `receiptmasterid` (lowercase — exact API field name)
                    groupBy={filters.mode === 'Detailed' ? 'receiptmasterid' : null}
                    // Merge these columns across rows that share the same receiptmasterid.
                    // `fromledger` and `amount` are NOT merged — they differ per line.
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'slno', 'date', 'voucherno', 'ledger', 'narration', 'costcentre', 'doneby'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default ReceiptReport;