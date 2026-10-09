// src/components/pages/Reports/PaymentReport/PaymentReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Wallet } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PaymentReportFilters from './PaymentReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const PaymentReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading]               = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData]         = useState(null);
    const [alert, setAlert]                   = useState(null);

    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData]         = useState([]);
    const [userData, setUserData]             = useState([]);

    const { selectedBranchId, currentCurrency, user } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Payment Report");
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
        if (!row.paymentMasterId) return;
        navigate(`/transaction/payment-voucher/edit-payment-voucher/${row.paymentMasterId}`);
    };
    const [filters, setFilters] = useState({
        ...getDefaultDates(),
        ledgerId:     null,
        ledgerName:   '',
        costCentreId: null,
        userId:       null,
        detailed:     false,
        postedStatus:null,
        mode:         'Summary'   // 'Summary' | 'Detailed'
    });

    /* ------------------------------ Dropdown bootstrap ------------------------------ */
    useEffect(() => { fetchDropdownData(); }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [costCentreRes, ledgerRes, usersRes] = await Promise.all([
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("bank-account-ledgers", {
                    group_ids: [5, 8, ],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } }))
            ]);
            setCostCenterData(costCentreRes.data.data || []);
            setLedgerData(ledgerRes.data.data         || []);
            setUserData(usersRes.data.data            || []);
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

        const requestBody = {
            from_date:      filters.fromDate,
            to_date:        filters.toDate,
            posted_status:  filters.postedStatus || null,
            ledger_id:      filters.ledgerId    ? parseInt(filters.ledgerId)    : null,
            branch_id:      parseInt(selectedBranchId) || 1,
            currency_id:    parseInt(currentCurrency?.currencyId) || 1,
            detailed:       filters.mode === 'Detailed',
            ledger_name:    filters.ledgerName || "",
            user_id:        filters.userId      ? parseInt(filters.userId)      : null,
            cost_centre_id: filters.costCentreId ? parseInt(filters.costCentreId) : null,
            mode:           filters.mode || 'Summary'
        };

        try {
            const res  = await axiosInstance.post("payment-report", requestBody);
            const raw  = Array.isArray(res.data.data) ? res.data.data : [];

            if (raw.length === 0) {
                setAlert({
                    id:      Date.now(),
                    type:    'info',
                    message: t('paymentReport.messages.noDataFound') || 'No data found for the selected filters.'
                });
                setReportData([]);
                return;
            }

            if (filters.mode === 'Detailed') {
                /*
                 * Detailed — multiple rows per voucher (one per ledger line).
                 * `TotalAmount` = voucher total (same on every line → merged)
                 * `Amount`      = line amount   (unique per line → not merged)
                 */
                const detailed = raw.map((item, index) => ({
                    ...item,
                    SNo: index + 1,
                }));
                setReportData(detailed);
            } else {
                /*
                 * Summary — API already returns one row per voucher.
                 * Use `TotalAmount` as the display/sum field.
                 */
                const summary = raw.map((item, index) => ({
                    ...item,
                    SNo:    index + 1,
                    Amount: item.TotalAmount   // normalise so footer/export use one key
                }));
                setReportData(summary);
            }
        } catch (error) {
            console.error("❌ Payment Report Error:", error);
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
        const sum = (key) => reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

        if (filters.mode === 'Detailed') {
            /*
             * Sum `Amount` (line amounts).
             * Do NOT sum TotalAmount — it repeats the voucher total on every line.
             */
            return {
                amount: sum('Amount').toFixed(dp),
                count:  reportData.length
            };
        }

        // Summary — each row is one voucher; Amount was normalised from TotalAmount
        return {
            amount: sum('Amount').toFixed(dp),
            count:  reportData.length
        };
    }, [reportData, generalSettings?.decimalPart, filters.mode]);

    /* ------------------------------ Columns per mode ------------------------------ */
    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SNo',         label: t('paymentReport.columns.SNo')         || '#',            align: 'center', width: '55'  },
                { key: 'Date',        label: t('paymentReport.columns.Date')         || 'Date',         align: 'center', width: '120' },
                { key: 'VoucherNo',   label: t('paymentReport.columns.VoucherNo')    || 'Voucher No',   align: 'center', width: '120' },
                { key: 'Ledger',      label: t('paymentReport.columns.Ledger')       || 'Ledger',       align: 'left',   width: '160' },
                { key: 'TotalAmount', label: t('paymentReport.columns.TotalAmount')  || 'Total Amt',    align: 'right',  width: '120' },
                { key: 'FromLedger',  label: t('paymentReport.columns.FromLedger')   || 'From Ledger',  align: 'left',   width: '150' },
                { key: 'ToLedger',    label: t('paymentReport.columns.ToLedger')     || 'To Ledger',    align: 'left',   width: '150' },
                { key: 'Amount',      label: t('paymentReport.columns.Amount')       || 'Amount',       align: 'right',  width: '110' },
                { key: 'Narration',   label: t('paymentReport.columns.Narration')    || 'Narration',    align: 'left',   width: '140' },
                { key: 'CostCentre',  label: t('paymentReport.columns.CostCentre')   || 'Cost Centre',  align: 'center', width: '110' },
                { key: 'DoneBy',      label: t('paymentReport.columns.DoneBy')       || 'Done By',      align: 'center', width: '110' },
            ];
        }

        // Summary
        return [
            { key: 'SNo',        label: t('paymentReport.columns.SNo')      || '#',           align: 'center', width: '60'  },
            { key: 'Date',       label: t('paymentReport.columns.Date')      || 'Date',        align: 'center', width: '120' },
            { key: 'VoucherNo',  label: t('paymentReport.columns.VoucherNo') || 'Voucher No',  align: 'center', width: '130' },
            { key: 'Ledger',     label: t('paymentReport.columns.Ledger')    || 'Ledger',      align: 'left',   width: '180' },
            { key: 'Amount',     label: t('paymentReport.columns.Amount')    || 'Amount',      align: 'right',  width: '130' },
            { key: 'Narration',  label: t('paymentReport.columns.Narration') || 'Narration',   align: 'left'                },
            { key: 'CostCentre', label: t('paymentReport.columns.CostCentre')|| 'Cost Centre', align: 'center', width: '120' },
            { key: 'DoneBy',     label: t('paymentReport.columns.DoneBy')    || 'Done By',     align: 'center', width: '110' },
        ];
    }, [filters.mode, t]);

    /* ------------------------------ Footer ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;
        return {
            label:  t('common.total') || 'Total',
            Amount: totals.amount
        };
    }, [totals, reportData, t]);

    /* ------------------------------ renderCell ------------------------------ */
    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === 'Amount') {
            return (
                <div className="text-right">
                    {Number(row.Amount || 0).toFixed(dp)}
                </div>
            );
        }
        if (key === 'TotalAmount') {
            return (
                <div className="text-right">
                    {Number(row.TotalAmount || 0).toFixed(dp)}
                </div>
            );
        }

        if (key === 'Date')       return row.Date       || '-';
        if (key === 'VoucherNo')  return row.VoucherNo  || '-';
        if (key === 'Ledger')     return row.Ledger     || '-';
        if (key === 'FromLedger') return row.FromLedger || '-';
        if (key === 'ToLedger')   return row.ToLedger   || '-';
        if (key === 'Narration')  return row.Narration  || '-';
        if (key === 'CostCentre') return row.CostCentre || '-';
        if (key === 'DoneBy')     return row.DoneBy     || '-';

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
                    SNo:         row.SNo || index + 1,
                    Date:        row.Date        || '',
                    VoucherNo:   row.VoucherNo   || '',
                    Ledger:      row.Ledger       || '',
                    TotalAmount: Number(row.TotalAmount || 0).toFixed(dp),
                    FromLedger:  row.FromLedger  || '',
                    ToLedger:    row.ToLedger    || '',
                    Amount:      Number(row.Amount || 0).toFixed(dp),
                    Narration:   row.Narration   || '',
                    CostCentre:  row.CostCentre  || '',
                    DoneBy:      row.DoneBy      || ''
                };
            }
            return {
                SNo:        row.SNo || index + 1,
                Date:       row.Date       || '',
                VoucherNo:  row.VoucherNo  || '',
                Ledger:     row.Ledger      || '',
                Amount:     Number(row.Amount || 0).toFixed(dp),
                Narration:  row.Narration  || '',
                CostCentre: row.CostCentre || '',
                DoneBy:     row.DoneBy     || ''
            };
        });

        const footer = totals ? { label: t('Total'), Amount: totals.amount } : null;

        const detailedColumns = [
            { key: 'SNo',         label: '#',            align: 'center', width: 5  },
            { key: 'Date',        label: 'Date',         align: 'center', width: 12 },
            { key: 'VoucherNo',   label: 'Voucher No',   align: 'center', width: 12 },
            { key: 'Ledger',      label: 'Ledger',       align: 'left',   width: 18 },
            { key: 'TotalAmount', label: 'Total Amt',    align: 'right',  width: 12, type: 'currency' },
            { key: 'FromLedger',  label: 'From Ledger',  align: 'left',   width: 16 },
            { key: 'ToLedger',    label: 'To Ledger',    align: 'left',   width: 16 },
            { key: 'Amount',      label: 'Amount',       align: 'right',  width: 12, type: 'currency' },
            { key: 'Narration',   label: 'Narration',    align: 'left',   width: 20 },
            { key: 'CostCentre',  label: 'Cost Centre',  align: 'center', width: 12 },
            { key: 'DoneBy',      label: 'Done By',      align: 'center', width: 12 },
        ];

        const summaryColumns = [
            { key: 'SNo',        label: '#',           align: 'center', width: 8  },
            { key: 'Date',       label: 'Date',        align: 'center', width: 12 },
            { key: 'VoucherNo',  label: 'Voucher No',  align: 'left',   width: 14 },
            { key: 'Ledger',     label: 'Ledger',      align: 'left',   width: 20 },
            { key: 'Amount',     label: 'Amount',      align: 'right',  width: 14, type: 'currency' },
            { key: 'Narration',  label: 'Narration',   align: 'left',   width: 25 },
            { key: 'CostCentre', label: 'Cost Centre', align: 'left',   width: 15 },
            { key: 'DoneBy',     label: 'Done By',     align: 'left',   width: 15 },
        ];

        const title = isDetailed
            ? t('paymentReport.breadcrumb.detailedTitle') || 'Payment Detailed Report'
            : t('paymentReport.breadcrumb.title')         || 'Payment Report';

        return {
            fileName:     isDetailed
                ? `Payment_Detailed_Report_${ledgerName.replace(/\s+/g, '_')}`
                : `Payment_Report_${ledgerName.replace(/\s+/g, '_')}`,
            sheetName:    isDetailed ? 'Payment Detailed' : 'Payment Summary',
            title,
            subtitle:     `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            fromDate:     filters.fromDate,
            toDate:       filters.toDate,
            data:         exportData,
            footer,
            theme:        'professional',
            decimalPlaces: dp,
            columns:      isDetailed ? detailedColumns : summaryColumns
        };
    };

    const handleExportExcel = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('paymentReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(o);
    };
    const handleExportPdf = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('paymentReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...o, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('paymentReport.messages.noDataToExport') || 'No data to export.' }); return; }
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
        setFilters({ ...getDefaultDates(), ledgerId: null, ledgerName: '', costCentreId: null, userId: null, detailed: false, postedStatus: null, mode: 'Summary' });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Dropdown options ------------------------------ */
    const costCenterOptions = useMemo(() => costCenterData.map(c => ({ label: c.CostCentre, value: c.costCentreId })), [costCenterData]);
    const ledgerOptions     = useMemo(() => ledgerData.map(l => ({ label: l.ledgerName, value: l.ledgerId })),         [ledgerData]);
    const userOptions       = useMemo(() => userData.map(u => ({ label: u.userName || u.name, value: u.userId })),     [userData]);

    /* ------------------------------ Report title ------------------------------ */
    const reportTitle = filters.mode === 'Detailed'
        ? t('paymentReport.breadcrumb.detailedTitle') || 'Payment Detailed Report'
        : t('paymentReport.breadcrumb.title')         || 'Payment Report';

    /* ------------------------------ Guards ------------------------------ */
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("paymentReport.breadcrumb.group"), url: "#" }, { title: t("paymentReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Wallet, title: reportTitle }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("paymentReport.breadcrumb.group"), url: "#" }, { title: t("paymentReport.breadcrumb.title"), url: "#" }]}
                    heading={{ icon: Wallet, title: reportTitle }}
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
                routes={[{ title: t("paymentReport.breadcrumb.group"), url: "#" }, { title: t("paymentReport.breadcrumb.title"), url: "#" }]}
                heading={{ icon: Wallet, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('receiptReport.export.label') || 'Export Report'
                } : null}
            />

            <div className="px-1">
                <PaymentReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    costCenterOptions={costCenterOptions}
                    ledgerOptions={ledgerOptions}
                    userOptions={userOptions}
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
                    tableId="payment-report"
                    pageSize={80}
                    onRowClick={handleRowClick}
                    // ── Grouping: active only in Detailed mode ──
                    // Group by paymentMasterId — the unique voucher identifier
                    groupBy={filters.mode === 'Detailed' ? 'paymentMasterId' : null}
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SNo', 'Date', 'VoucherNo', 'Ledger', 'TotalAmount', 'Narration', 'CostCentre', 'DoneBy'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default PaymentReport;