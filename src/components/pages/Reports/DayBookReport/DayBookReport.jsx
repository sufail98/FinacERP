// src/components/pages/Reports/DayBookReport/DayBookReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DayBookReportFilters from './DayBookReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const DayBookReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [ledgerData, setLedgerData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Day Book");
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();

    const handleRowClick = (row) => {
        if (!row.masterId) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.masterId}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.masterId}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.masterId}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.masterId}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.masterId}`,
            'Payment Voucher': `/transaction/payment-voucher/edit-payment-voucher/${row.masterId}`,
            'Receipt Voucher': `/transaction/reciept-voucher/edit-reciept-voucher/${row.masterId}`,
            'Contra Voucher': `/transaction/contra-voucher/edit-contra-voucher/${row.masterId}`,
            'Material Receipt': `/transaction/material-receipt/edit/${row.masterId}`,
            'Delivery Note': `/transaction/delivery-note/edit-delivery-note/${row.masterId}`,
            'Payable': `/transaction/payable-voucher/edit/${row.masterId}`,
            'Receivable': `/transaction/receivable-voucher/edit/${row.masterId}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.masterId}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.masterId}`,
        };

        // Get the correct key from row
        const voucherType = row['Voucher Type'] || row.VoucherType;
        const path = routes[voucherType];
        
        if (path) {
            navigate(path);
        }
    };

    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        ledgerName: '',
        isCondensed: false
    });

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

    useEffect(() => {
        fetchLedgerData();
    }, [selectedBranchId]);

    const fetchLedgerData = async () => {
        try {
            const response = await axiosInstance.post("account-ledgers", { 
                group_ids: [5, 6, 28, 29],
                branchId: selectedBranchId 
            });
            setLedgerData(response.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching ledgers:", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        
        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: parseInt(selectedBranchId) || 1,
            currencyId: parseInt(currentCurrency?.currencyId) || 1,
            isCondensed: filters.isCondensed,
            ledgerName: filters.ledgerName || ''
        };

        try {
            const res = await axiosInstance.post("day-book", requestBody);
            const dataWithFormattedDates = (Array.isArray(res.data.data) ? res.data.data : []).map((item) => ({
                ...item,
                Date: formatDate(item.Date)
            }));
            setReportData(dataWithFormattedDates);
        } catch (error) {
            console.error("❌ Day Book Report Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const { totalDebit, totalCredit } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalDebit: 0, totalCredit: 0 };
        }
        return reportData.reduce((totals, row) => ({
            totalDebit: totals.totalDebit + (parseFloat(row['Debit/Inward Qty']) || 0),
            totalCredit: totals.totalCredit + (parseFloat(row['Credit/Outward Qty']) || 0)
        }), { totalDebit: 0, totalCredit: 0 });
    }, [reportData]);

    // Footer data
    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;
        return {
            label: t('Total'),
            'Debit/Inward Qty': totalDebit.toFixed(decimalPart),
            'Credit/Outward Qty': totalCredit.toFixed(decimalPart)
        };
    }, [reportData, totalDebit, totalCredit, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Date: row.Date || '',
            VoucherType: row['Voucher Type'] || '',
            VoucherNo: row['Voucher No'] || '',
            ProductLedger: row['Product/Ledger'] || '',
            DebitInward: Number(row['Debit/Inward Qty'] || 0).toFixed(decimalPart),
            CreditOutward: Number(row['Credit/Outward Qty'] || 0).toFixed(decimalPart)
        }));

        return {
            fileName: 'Day_Book_Report',
            sheetName: 'Day Book',
            reportInfo: {
                title: t('dayBookReport.breadcrumb.title') || 'Day Book Report',
                subtitle: filters.ledgerName || 'All Ledgers',
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            data: exportData,
            footer: {
                label: t('Total'),
                DebitInward: totalDebit.toFixed(decimalPart),
                CreditOutward: totalCredit.toFixed(decimalPart)
            },
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: t('dayBookReport.columns.SNo') || 'S.No', align: 'center', width: 8 },
                { key: 'Date', label: t('dayBookReport.columns.date') || 'Date', align: 'center', width: 12 },
                { key: 'VoucherType', label: t('dayBookReport.columns.voucherType') || 'Voucher Type', align: 'left', width: 18 },
                { key: 'VoucherNo', label: t('dayBookReport.columns.voucherNo') || 'Voucher No', align: 'left', width: 14 },
                { key: 'ProductLedger', label: t('dayBookReport.columns.productLedger') || 'Product/Ledger', align: 'left', width: 30 },
                { key: 'DebitInward', label: t('dayBookReport.columns.debit') || 'Debit/Inward Qty', align: 'right', width: 16, type: 'currency' },
                { key: 'CreditOutward', label: t('dayBookReport.columns.credit') || 'Credit/Outward Qty', align: 'right', width: 16, type: 'currency' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            ledgerName: '',
            isCondensed: false
        });
        setReportData(null);
    };

    const ledgerOptions = ledgerData.map(ledger => ({
        label: ledger.ledgerName,
        value: ledger.ledgerName
    }));

    const columns = [
        { key: 'SNo', label: t('dayBookReport.columns.SNo'), align: 'center' },
        { key: 'Date', label: t('dayBookReport.columns.date'), align: 'center' },
        { key: 'Voucher Type', label: t('dayBookReport.columns.voucherType'), align: 'left' },
        { key: 'Voucher No', label: t('dayBookReport.columns.voucherNo'), align: 'left' },
        { key: 'Product/Ledger', label: t('dayBookReport.columns.productLedger'), align: 'left' },
        { key: 'Debit/Inward Qty', label: t('dayBookReport.columns.debit'), align: 'right' },
        { key: 'Credit/Outward Qty', label: t('dayBookReport.columns.credit'), align: 'right' }
    ];

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        
        if (key === 'Date') {
            return row[key] ?? '-';
        }
        if (key === 'Debit/Inward Qty' || key === 'Credit/Outward Qty') {
            return (
                <div className="text-right">
                    {Number(row[key] || 0).toFixed(decimalPart)}
                </div>
            );
        }
        return row[key] ?? '-';
    };

    /* ------------------------------ UI ------------------------------ */

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("dayBookReport.breadcrumb.group"), url: "#" },
                        { title: t("dayBookReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("dayBookReport.breadcrumb.title") }}
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
                        { title: t("dayBookReport.breadcrumb.group"), url: "#" },
                        { title: t("dayBookReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("dayBookReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("dayBookReport.breadcrumb.group"), url: "#" },
                    { title: t("dayBookReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: t("dayBookReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <DayBookReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    ledgerOptions={ledgerOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    onRowClick={handleRowClick}
                    maxHeight="calc(100vh - 210px)"
                    rowClassName="cursor-pointer hover:bg-gray-50"
                />
            </div>
        </div>
    );
};

export default DayBookReport;