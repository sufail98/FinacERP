// src/components/pages/Reports/PhysicalStockReport/PhysicalStockReport.jsx
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
import PhysicalStockReportFilter from './PhysicalStockReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const PhysicalStockReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading]               = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData]         = useState(null);
    const [alert, setAlert]                   = useState(null);

    const [costCenterData, setCostCenterData] = useState([]);
    const [ledgerData, setLedgerData]         = useState([]);
    const [userData, setUserData]             = useState([]);

    const { selectedBranchId, currentCurrency, userId, currentFinancialYear } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Physical Stock Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    /* ------------------------------ Default dates ------------------------------ */
    const getDefaultDates = () => {
        const today    = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate:   today.toISOString().split('T')[0]
        };
    };

    const [filters, setFilters] = useState({
        ...getDefaultDates(),
        ledgerId:     null,
        ledgerName:   '',
        costCentreId: null,
        userId:       null,
        postedStatus: true,
        mode:         'Summary'   // 'Summary' | 'Detailed'
    });

    /* ------------------------------ Dropdown bootstrap ------------------------------ */
    useEffect(() => { fetchDropdownData(); }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [costCentreRes, ledgerRes, usersRes] = await Promise.all([
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("account-ledgers", {
                    group_ids: [5, 6, 28, 29],
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

     const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.physicalstockmasterid) return;
        navigate(`/transaction/physical-stock/edit/${row.physicalstockmasterid}`);
    };

    /* ------------------------------ Fetch report ------------------------------ */
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const res  = await axiosInstance.post("physical-stock-report", {
                fromdate: filters.fromDate,
                todate:   filters.toDate,
                branchId: parseInt(selectedBranchId) || 1,
                userId:   null,
                mode:     filters.mode || 'Summary',
            });

            const raw = Array.isArray(res.data.data) ? res.data.data : [];

            if (raw.length === 0) {
                setAlert({
                    id:      Date.now(),
                    type:    'info',
                    message: t('physicalStockReport.messages.noDataFound') || 'No data found for the selected filters.'
                });
                setReportData([]);
                return;
            }

            if (filters.mode === 'Detailed') {
                /*
                 * Detailed — one row per product line.
                 * The API already returns every line; add a sequential SNo.
                 * `amount`       = voucher total  (merged/shown once per voucher group)
                 * `DetailAmount` = line amount    (shown on every product row)
                 */
                const detailed = raw.map((item, index) => ({
                    ...item,
                    SNo: index + 1,
                    // Keep Date as-is — API already returns formatted string e.g. "23-May-2026"
                }));
                setReportData(detailed);
            } else {
                /*
                 * Summary — one row per voucher.
                 * Deduplicate on physicalstockmasterid so the voucher total
                 * isn't multiplied by the number of product lines.
                 */
                const seen    = new Set();
                const summary = [];
                raw.forEach((item, index) => {
                    if (!seen.has(item.physicalstockmasterid)) {
                        seen.add(item.physicalstockmasterid);
                        summary.push({
                            physicalstockmasterid: item.physicalstockmasterid,
                            SNo:       summary.length + 1,
                            VoucherNo: item.VoucherNo,
                            Date:      item.Date,
                            amount:    item.amount,
                            Narration: item.Narration,
                        });
                    }
                });
                setReportData(summary);
            }
        } catch (error) {
            console.error("❌ Physical Stock Report Error:", error);
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
             * In Detailed mode sum DetailAmount (line amount), not `amount`
             * (which is the voucher total repeated on every line).
             * Also sum qty across all lines.
             */
            return {
                qty:          sum('qty').toFixed(3),
                detailAmount: sum('DetailAmount').toFixed(dp),
                count:        reportData.length
            };
        }

        // Summary — each row is one unique voucher so summing `amount` is safe
        return {
            amount: sum('amount').toFixed(dp),
            count:  reportData.length
        };
    }, [reportData, generalSettings?.decimalPart, filters.mode]);

    /* ------------------------------ Columns per mode ------------------------------ */
    const columns = useMemo(() => {
        if (filters.mode === 'Detailed') {
            return [
                { key: 'SNo',          label: '#',                                                              align: 'center', width: '55'  },
                { key: 'Date',         label: t('paymentReport.columns.Date')      || 'Date',                  align: 'center', width: '120' },
                { key: 'VoucherNo',    label: t('paymentReport.columns.VoucherNo') || 'Voucher No',            align: 'center', width: '120' },
                { key: 'amount',       label: t('physicalStockReport.columns.voucherAmount') || 'Voucher Amt', align: 'right',  width: '120' },
                { key: 'ProductCode',  label: t('physicalStockReport.columns.productCode')  || 'Product Code', align: 'left',   width: '120' },
                { key: 'Barcode',      label: t('physicalStockReport.columns.barcode')      || 'Barcode',      align: 'left',   width: '130' },
                { key: 'qty',          label: t('physicalStockReport.columns.qty')          || 'Qty',          align: 'right',  width: '80'  },
                { key: 'rate',         label: t('physicalStockReport.columns.rate')         || 'Rate',         align: 'right',  width: '100' },
                { key: 'DetailAmount', label: t('physicalStockReport.columns.amount')       || 'Amount',       align: 'right',  width: '110' },
                { key: 'Narration',    label: t('paymentReport.columns.Narration')          || 'Narration',    align: 'left',   width: '140' },
            ];
        }

        // Summary
        return [
            { key: 'SNo',       label: '#',                                                              align: 'center', width: '60'  },
            { key: 'Date',      label: t('paymentReport.columns.Date')      || 'Date',                  align: 'center', width: '120' },
            { key: 'VoucherNo', label: t('paymentReport.columns.VoucherNo') || 'Voucher No',            align: 'center', width: '130' },
            { key: 'amount',    label: t('paymentReport.columns.Amount')    || 'Amount',                align: 'right',  width: '130' },
            { key: 'Narration', label: t('paymentReport.columns.Narration') || 'Narration',             align: 'left'                },
        ];
    }, [filters.mode, t]);

    /* ------------------------------ Footer ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;

        if (filters.mode === 'Detailed') {
            return {
                label:        t('common.total') || 'Total',
                qty:          totals.qty,
                DetailAmount: totals.detailAmount
            };
        }
        return {
            label:  t('common.total') || 'Total',
            amount: totals.amount
        };
    }, [totals, reportData, filters.mode, t]);

    /* ------------------------------ renderCell ------------------------------ */
    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;

        if (key === 'amount' || key === 'DetailAmount') {
            const val = key === 'DetailAmount'
                ? parseFloat(row.DetailAmount || 0)
                : parseFloat(row.amount       || 0);
            return <div className="text-right">{val.toFixed(dp)}</div>;
        }
        if (key === 'qty') {
            return <div className="text-right">{Number(row.qty  || 0).toFixed(3)}</div>;
        }
        if (key === 'rate') {
            const dp2 = generalSettings?.decimalPart || 2;
            return <div className="text-right">{Number(row.rate || 0).toFixed(dp2)}</div>;
        }

        if (key === 'Date')        return row.Date      || '-';
        if (key === 'VoucherNo')   return row.VoucherNo || '-';
        if (key === 'Narration')   return row.Narration || '-';
        if (key === 'ProductCode') return row.ProductCode || '-';
        if (key === 'Barcode')     return row.Barcode    || '-';

        return row[key] ?? '-';
    };

    /* ------------------------------ Export ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const dp         = generalSettings?.decimalPart || 2;
        const isDetailed = filters.mode === 'Detailed';

        const exportData = reportData.map((row, index) => {
            if (isDetailed) {
                return {
                    SNo:          row.SNo || index + 1,
                    Date:         row.Date        || '',
                    VoucherNo:    row.VoucherNo   || '',
                    VoucherAmt:   Number(row.amount        || 0).toFixed(dp),
                    ProductCode:  row.ProductCode  || '',
                    Barcode:      row.Barcode      || '',
                    Qty:          Number(row.qty          || 0).toFixed(3),
                    Rate:         Number(row.rate         || 0).toFixed(dp),
                    Amount:       Number(row.DetailAmount || 0).toFixed(dp),
                    Narration:    row.Narration    || ''
                };
            }
            return {
                SNo:       row.SNo || index + 1,
                Date:      row.Date      || '',
                VoucherNo: row.VoucherNo || '',
                Amount:    Number(row.amount || 0).toFixed(dp),
                Narration: row.Narration  || ''
            };
        });

        const footer = totals
            ? isDetailed
                ? { label: t('Total'), Qty: totals.qty, Amount: totals.detailAmount }
                : { label: t('Total'), Amount: totals.amount }
            : null;

        const detailedColumns = [
            { key: 'SNo',         label: '#',            align: 'center', width: 5  },
            { key: 'Date',        label: 'Date',         align: 'center', width: 12 },
            { key: 'VoucherNo',   label: 'Voucher No',   align: 'center', width: 12 },
            { key: 'VoucherAmt',  label: 'Voucher Amt',  align: 'right',  width: 12, type: 'currency' },
            { key: 'ProductCode', label: 'Product Code', align: 'left',   width: 14 },
            { key: 'Barcode',     label: 'Barcode',      align: 'left',   width: 14 },
            { key: 'Qty',         label: 'Qty',          align: 'right',  width: 8,  type: 'number'   },
            { key: 'Rate',        label: 'Rate',         align: 'right',  width: 10, type: 'currency' },
            { key: 'Amount',      label: 'Amount',       align: 'right',  width: 12, type: 'currency' },
            { key: 'Narration',   label: 'Narration',    align: 'left',   width: 20 },
        ];

        const summaryColumns = [
            { key: 'SNo',       label: '#',          align: 'center', width: 8  },
            { key: 'Date',      label: 'Date',       align: 'center', width: 14 },
            { key: 'VoucherNo', label: 'Voucher No', align: 'left',   width: 16 },
            { key: 'Amount',    label: 'Amount',     align: 'right',  width: 16, type: 'currency' },
            { key: 'Narration', label: 'Narration',  align: 'left',   width: 30 },
        ];

        const title = isDetailed
            ? t('physicalStockReport.breadcrumb.detailedTitle') || 'Physical Stock Detailed Report'
            : t('physicalStockReport.breadcrumb.title')         || 'Physical Stock Report';

        return {
            fileName:     isDetailed ? 'Physical_Stock_Detailed_Report' : 'Physical_Stock_Summary_Report',
            sheetName:    isDetailed ? 'Physical Stock Detailed'        : 'Physical Stock Summary',
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
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('physicalStockReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(o);
    };
    const handleExportPdf = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('physicalStockReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...o, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const o = getExportOptions();
        if (!o) { setAlert({ id: Date.now(), type: 'warning', message: t('physicalStockReport.messages.noDataToExport') || 'No data to export.' }); return; }
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
        setFilters({ ...getDefaultDates(), ledgerId: null, ledgerName: '', costCentreId: null, userId: null, postedStatus: true, mode: 'Summary' });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Dropdown options ------------------------------ */
    const costCenterOptions = useMemo(() => costCenterData.map(c => ({ label: c.CostCentre, value: c.costCentreId })), [costCenterData]);
    const ledgerOptions     = useMemo(() => ledgerData.map(l => ({ label: l.ledgerName, value: l.ledgerId })),         [ledgerData]);
    const userOptions       = useMemo(() => userData.map(u => ({ label: u.userName || u.name, value: u.userId })),     [userData]);

    /* ------------------------------ Report title ------------------------------ */
    const reportTitle = filters.mode === 'Detailed'
        ? t('physicalStockReport.breadcrumb.detailedTitle') || 'Physical Stock Detailed Report'
        : t('physicalStockReport.breadcrumb.title')         || 'Physical Stock Report';

    /* ------------------------------ Guards ------------------------------ */
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("physicalStockReport.breadcrumb.group"), url: "#" }, { title: t("physicalStockReport.breadcrumb.title"), url: "#" }]}
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
                    routes={[{ title: t("physicalStockReport.breadcrumb.group"), url: "#" }, { title: t("physicalStockReport.breadcrumb.title"), url: "#" }]}
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
                routes={[{ title: t("physicalStockReport.breadcrumb.group"), url: "#" }, { title: t("physicalStockReport.breadcrumb.title"), url: "#" }]}
                heading={{ icon: Wallet, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('physicalStockReport.export.label') || 'Export Report'
                } : null}
            />

            <div className="px-1">
                <PhysicalStockReportFilter
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
                    tableId="physical-stock-report"
                    pageSize={80}
                    // ── Grouping: active only in Detailed mode ──
                    // Group by the unique master ID so rows with the same voucher
                    // are treated as a single group regardless of VoucherNo string format.
                    groupBy={filters.mode === 'Detailed' ? 'physicalstockmasterid' : null}
                    mergedColumns={filters.mode === 'Detailed' ? [
                        'SNo', 'Date', 'VoucherNo', 'amount', 'Narration'
                    ] : []}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
};

export default PhysicalStockReport;