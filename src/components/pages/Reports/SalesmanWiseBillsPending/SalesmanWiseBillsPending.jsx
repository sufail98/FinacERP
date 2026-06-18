// src/components/pages/Reports/SalesmanWiseBillsPending/SalesmanWiseBillsPending.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable'; // ← replaces SalesmanWiseBillsPendingGrid
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Clock } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesmanWiseBillsPendingFilter from './SalesmanWiseBillsPendingFilter';
import useReportExport from '@/hooks/useReportExport';

const SalesmanWiseBillsPending = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [employeeData, setEmployeeData] = useState([]);
    const [customerData, setCustomerData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Salesman Wise Bills Pending");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const [filters, setFilters] = useState({
        fromDate: getDefaultDates().fromDate,
        toDate: getDefaultDates().toDate,
        status: 'ledger',
        ledgerId: 0,
        currencyId: null,
        ledgerBy: 0,
        employeeId: 0,
        optional: false,
        isAccountsPosting: false
    });

    // ── Status-dependent columns ───────────────────────────────────────────
    const columns = useMemo(() => {
        if (filters.status === 'ledger') {
            return [
                { key: 'SNo',           label: '#',                                                                    align: 'center', width: '50'  },
                { key: 'AccountLedger', label: t('salesmanWiseBillsPending.grid.columns.accountLedger'),               align: 'left'                 },
                { key: 'Amount',        label: t('salesmanWiseBillsPending.grid.columns.amount'),                      align: 'right',  width: '130' },
            ];
        }
        // bill wise
        return [
            { key: 'SNo',           label: '#',                                                                        align: 'center', width: '50'  },
            { key: 'AccountLedger', label: t('salesmanWiseBillsPending.grid.columns.accountLedger'),                   align: 'left'                 },
            { key: 'VoucherType',   label: t('salesmanWiseBillsPending.grid.columns.voucherType'),                     align: 'center', width: '130' },
            { key: 'VoucherNo',     label: t('salesmanWiseBillsPending.grid.columns.voucherNo'),                       align: 'left',   width: '120' },
            { key: 'Date',          label: t('salesmanWiseBillsPending.grid.columns.date'),                            align: 'center', width: '100' },
            { key: 'Narration',     label: t('salesmanWiseBillsPending.grid.columns.narration'),                       align: 'left'                 },
            { key: 'Amount',        label: t('salesmanWiseBillsPending.grid.columns.amount'),                          align: 'right',  width: '120' },
        ];
    }, [filters.status, t]);

    // ── Status-dependent renderCell ────────────────────────────────────────
    const renderCell = (key, row) => {
        switch (key) {
            case 'AccountLedger': return row['Account Ledger'] || '-';
            case 'VoucherType':   return row['Voucher Type']   || '-';
            case 'VoucherNo':     return row['Voucher No']     || '-';
            case 'Date':          return row['Date']           || '-';
            case 'Narration':     return row['Narration']      || '-';
            case 'Amount':        return Number(row['Amount']  || row['amount'] || 0).toFixed(decimalPart);
            default:              return row[key] ?? '-';
        }
    };

    // ── reportData with SNo stamped ────────────────────────────────────────
    const reportDataWithSNo = useMemo(() => {
        if (!reportData?.length) return [];
        return reportData.map((item, index) => ({ ...item, SNo: index + 1 }));
    }, [reportData]);

    // ── footerData keyed to match columns ─────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData?.length) return null;
        const totalAmount = reportData.reduce(
            (s, r) => s + (parseFloat(r['Amount'] || r['amount']) || 0), 0
        );
        return {
            SNo:    t('salesmanWiseBillsPending.grid.total') || 'Total',
            Amount: totalAmount.toFixed(decimalPart),
        };
    }, [reportData, decimalPart, t]);

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [employeeRes, customerRes, currencyRes] = await Promise.all([
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } }))
            ]);
            setEmployeeData(employeeRes.data.data || []);
            setCustomerData(customerRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const employeeOptions = useMemo(() => [
        { label: t('salesmanWiseBillsPending.filters.all'), value: 0 },
        ...employeeData.map(emp => ({ label: emp.employeeName || emp.name, value: emp.employeeId || emp.id }))
    ], [employeeData, t]);

    const customerOptions = useMemo(() => [
        { label: t('salesmanWiseBillsPending.filters.all'), value: 0 },
        ...customerData.map(c => ({ label: c.ledgerName, value: c.ledgerId }))
    ], [customerData, t]);

    const currencyOptions = useMemo(() => currencyData.map(c => ({
        label: `${c.currencySymbol} - ${c.currencyName}`,
        value: c.currencyId
    })), [currencyData]);

    const statusOptions = [
        { label: t('salesmanWiseBillsPending.filters.statusLedger'), value: 'ledger' },
        { label: t('salesmanWiseBillsPending.filters.statusBill'),   value: 'bill'   },
    ];

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        try {
            const payload = {
                fromDate:          filters.fromDate,
                toDate:            filters.toDate,
                optional:          filters.optional,
                branchId:          Number(selectedBranchId),
                status:            filters.status,
                ledgerId:          filters.ledgerId,
                currencyId:        filters.currencyId || currentCurrency?.currencyId || 1,
                ledgerBy:          filters.ledgerBy,
                employeeId:        filters.employeeId,
                isAccountsPosting: filters.isAccountsPosting
            };
            const response = await axiosInstance.post("sales-manwise-bills-pending", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({ id: Date.now(), type: 'info', message: t('salesmanWiseBillsPending.messages.noDataFound') });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching salesman wise bills pending:", error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'status') { setReportData(null); setAlert(null); }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({ fromDate: dates.fromDate, toDate: dates.toDate, status: 'ledger', ledgerId: 0, currencyId: null, ledgerBy: 0, employeeId: 0, optional: false, isAccountsPosting: false });
        setReportData(null);
        setAlert(null);
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        if (!reportData?.length) return null;
        const isLedger = filters.status === 'ledger';

        const exportData = reportData.map((row, i) => {
            const base = {
                SNo:           row['Sl NO'] || i + 1,
                AccountLedger: row['Account Ledger'] || '-',
                Amount:        Number(row['Amount'] || 0).toFixed(decimalPart),
            };
            if (!isLedger) {
                base.VoucherType = row['Voucher Type'] || '-';
                base.VoucherNo   = row['Voucher No']   || '-';
                base.Date        = row['Date']          || '-';
                base.Narration   = row['Narration']     || '-';
            }
            return base;
        });

        const exportColumns = isLedger ? [
            { key: 'SNo',           label: '#',                                                                    align: 'center', width: 5  },
            { key: 'AccountLedger', label: t('salesmanWiseBillsPending.grid.columns.accountLedger'),               align: 'left',   width: 25 },
            { key: 'Amount',        label: t('salesmanWiseBillsPending.grid.columns.amount'),                      align: 'right',  width: 15 },
        ] : [
            { key: 'SNo',           label: '#',                                                                    align: 'center', width: 5  },
            { key: 'AccountLedger', label: t('salesmanWiseBillsPending.grid.columns.accountLedger'),               align: 'left',   width: 15 },
            { key: 'VoucherType',   label: t('salesmanWiseBillsPending.grid.columns.voucherType'),                 align: 'center', width: 12 },
            { key: 'VoucherNo',     label: t('salesmanWiseBillsPending.grid.columns.voucherNo'),                   align: 'center', width: 10 },
            { key: 'Date',          label: t('salesmanWiseBillsPending.grid.columns.date'),                        align: 'center', width: 10 },
            { key: 'Narration',     label: t('salesmanWiseBillsPending.grid.columns.narration'),                   align: 'left',   width: 15 },
            { key: 'Amount',        label: t('salesmanWiseBillsPending.grid.columns.amount'),                      align: 'right',  width: 12 },
        ];

        return {
            fileName:      'Salesman_Wise_Bills_Pending',
            sheetName:     'Bills Pending',
            title:         t('salesmanWiseBillsPending.breadcrumb.title'),
            subtitle:      `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | ${isLedger ? 'Ledger Wise' : 'Bill Wise'}`,
            data:          exportData,
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns:       exportColumns,
        };
    };

    const handleExportExcel = () => { const o = getExportOptions(); if (o) exportGenericToExcel(o); };
    const handleExportPdf   = () => { const o = getExportOptions(); if (o) exportGenericToPdf({ ...o, orientation: 'landscape' }); };
    const handleExportCsv   = () => { const o = getExportOptions(); if (o) exportGenericToCsv(o); };

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("salesmanWiseBillsPending.breadcrumb.group"), url: "#" },
        { title: t("salesmanWiseBillsPending.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: Clock, title: t("salesmanWiseBillsPending.breadcrumb.title") };

    if (privilegeLoading || initialLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

    /* ── Main Render ────────────────────────────────────────────────────── */
    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={breadcrumbRoutes}
                heading={breadcrumbHeading}
                exportConfig={reportData?.length ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('salesmanWiseBillsPending.export.label')
                } : null}
            />

            <div className="px-1">
                <SalesmanWiseBillsPendingFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    employeeOptions={employeeOptions}
                    customerOptions={customerOptions}
                    currencyOptions={currencyOptions}
                    statusOptions={statusOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    tableId={`salesman-bills-pending-${filters.status}`}
                    columns={columns}
                    data={reportDataWithSNo}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable
                    pageSize={80}
                />
            </div>
        </div>
    );
};

export default SalesmanWiseBillsPending;