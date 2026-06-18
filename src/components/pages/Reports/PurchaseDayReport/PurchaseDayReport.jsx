// src/components/pages/Reports/PurchaseDayReport/PurchaseDayReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseDayReportFilter from './PurchaseDayReportFilter';
import PurchaseDayReportGrid from './PurchaseDayReportGrid';
import useReportExport from '@/hooks/useReportExport';

const PurchaseDayReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [usersData, setUsersData] = useState([]);

    const { selectedBranchId, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Day Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    // Get default dates (first day of current month to today)
    const getDefaultDates = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            fromDate: firstDay.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        createdUser: null,
        isAccountsPosting: false
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const usersRes = await axiosInstance.get("users").catch(() => ({ data: { data: [] } }));
            setUsersData(usersRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // User options for dropdown
    const userOptions = useMemo(() => {
        return usersData.map(user => ({
            label: user.userName || user.name || user.username,
            value: user.userName || user.name || user.username
        }));
    }, [usersData]);

    // Format datetime for API
    const formatDateTimeForAPI = (dateString, isEndOfDay = false) => {
        if (!dateString) return '';
        if (isEndOfDay) {
            return `${dateString} 23:59:59`;
        }
        return `${dateString} 00:00:00`;
    };

    // Fetch Report
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                fromDate: formatDateTimeForAPI(filters.fromDate, false),
                toDate: formatDateTimeForAPI(filters.toDate, true),
                branchId: Number(selectedBranchId),
                createdUser: filters.createdUser,
                isAccountsPosting: filters.isAccountsPosting
            };


            const response = await axiosInstance.post("purchase/day-report", payload);
            const data = response.data.data || response.data;


            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));

            if (!dataWithSNo || dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('purchaseDayReport.messages.noDataFound')
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching purchase day report:", error);
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || error.message
            });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;

        const calculateSum = (key) => {
            return reportData.reduce((sum, row) => {
                const value = parseFloat(row[key]) || 0;
                return sum + value;
            }, 0);
        };

        // Common fields that might be in purchase day report response
        const totalAmount = calculateSum('TotalAmount') || calculateSum('totalAmount') || calculateSum('Amount');
        const taxAmount = calculateSum('TaxAmount') || calculateSum('taxAmount') || calculateSum('TotalTax');
        const netAmount = calculateSum('NetAmount') || calculateSum('netAmount') || calculateSum('BillAmount');
        const grandTotal = calculateSum('GrandTotal') || calculateSum('grandTotal') || calculateSum('billAmount');
        const cashAmount = calculateSum('CashAmount') || calculateSum('cashAmount');
        const bankAmount = calculateSum('BankAmount') || calculateSum('bankAmount');
        const creditAmount = calculateSum('CreditAmount') || calculateSum('creditAmount');

        return {
            totalAmount: totalAmount.toFixed(decimalPart),
            taxAmount: taxAmount.toFixed(decimalPart),
            netAmount: netAmount.toFixed(decimalPart),
            grandTotal: grandTotal.toFixed(decimalPart),
            cashAmount: cashAmount.toFixed(decimalPart),
            bankAmount: bankAmount.toFixed(decimalPart),
            creditAmount: creditAmount.toFixed(decimalPart),
            count: reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            createdUser: 'all',
            isAccountsPosting: false
        });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Export Configuration ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Date: row.Date || row.date || row.PurchaseDate || '',
            InvoiceNo: row.InvoiceNo || row.invoiceNo || row.VoucherNo || row.voucherNo || '',
            VendorInvoiceNo: row.VendorInvoiceNo || row.vendorInvoiceNo || '',
            Supplier: row.Supplier || row.supplier || row.Party || row.party || row.SupplierName || '',
            TotalAmount: Number(row.TotalAmount || row.totalAmount || row.Amount || 0).toFixed(decimalPart),
            TaxAmount: Number(row.TaxAmount || row.taxAmount || row.TotalTax || 0).toFixed(decimalPart),
            NetAmount: Number(row.NetAmount || row.netAmount || row.BillAmount || 0).toFixed(decimalPart),
            CashAmount: Number(row.CashAmount || row.cashAmount || 0).toFixed(decimalPart),
            BankAmount: Number(row.BankAmount || row.bankAmount || 0).toFixed(decimalPart),
            CreditAmount: Number(row.CreditAmount || row.creditAmount || 0).toFixed(decimalPart),
            CreatedBy: row.CreatedBy || row.createdBy || row.DoneBy || row.doneBy || ''
        }));

        return {
            fileName: 'Purchase_Day_Report',
            sheetName: 'Purchase Day Report',
            title: t('purchaseDayReport.breadcrumb.title'),
            subtitle: `${t('purchaseDayReport.filters.fromDate')}: ${filters.fromDate} - ${t('purchaseDayReport.filters.toDate')}: ${filters.toDate}`,
            reportInfo: {
                title: t('purchaseDayReport.breadcrumb.title'),
                subtitle: `${t('common.fromDate')}: ${filters.fromDate} | ${t('common.toDate')}: ${filters.toDate}`
            },
            data: exportData,
            footer: totals ? {
                label: t('purchaseDayReport.grid.total'),
                TotalAmount: totals.totalAmount,
                TaxAmount: totals.taxAmount,
                NetAmount: totals.netAmount,
                CashAmount: totals.cashAmount,
                BankAmount: totals.bankAmount,
                CreditAmount: totals.creditAmount
            } : null,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 6 },
                { key: 'Date', label: t('purchaseDayReport.grid.columns.date'), align: 'center', width: 12 },
                { key: 'InvoiceNo', label: t('purchaseDayReport.grid.columns.invoiceNo'), align: 'center', width: 14 },
                { key: 'VendorInvoiceNo', label: t('purchaseDayReport.grid.columns.vendorInvoiceNo'), align: 'center', width: 14 },
                { key: 'Supplier', label: t('purchaseDayReport.grid.columns.supplier'), align: 'left', width: 20 },
                { key: 'TotalAmount', label: t('purchaseDayReport.grid.columns.totalAmount'), align: 'right', width: 12, type: 'currency' },
                { key: 'TaxAmount', label: t('purchaseDayReport.grid.columns.taxAmount'), align: 'right', width: 12, type: 'currency' },
                { key: 'NetAmount', label: t('purchaseDayReport.grid.columns.netAmount'), align: 'right', width: 12, type: 'currency' },
                { key: 'CashAmount', label: t('purchaseDayReport.grid.columns.cashAmount'), align: 'right', width: 10, type: 'currency' },
                { key: 'BankAmount', label: t('purchaseDayReport.grid.columns.bankAmount'), align: 'right', width: 10, type: 'currency' },
                { key: 'CreditAmount', label: t('purchaseDayReport.grid.columns.creditAmount'), align: 'right', width: 10, type: 'currency' },
                { key: 'CreatedBy', label: t('purchaseDayReport.grid.columns.createdBy'), align: 'center', width: 12 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseDayReport.messages.noDataToExport') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseDayReport.messages.noDataToExport') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseDayReport.messages.noDataToExport') });
            return;
        }
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("purchaseDayReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseDayReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("purchaseDayReport.breadcrumb.title") }}
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
                        { title: t("purchaseDayReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseDayReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("purchaseDayReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && (
                <AlertBox
                    key={alert.id}
                    message={alert.message}
                    type={alert.type}
                />
            )}

            <BreadCrumb
                routes={[
                    { title: t("purchaseDayReport.breadcrumb.group"), url: "#" },
                    { title: t("purchaseDayReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: FileText, title: t("purchaseDayReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('purchaseDayReport.export.label')
                } : null}
            />

            <div className="px-1">
                <PurchaseDayReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    userOptions={userOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <PurchaseDayReportGrid
                    data={reportData}
                    loading={loading}
                    totals={totals}
                    decimalPart={generalSettings?.decimalPart || 2}
                />
            </div>
        </div>
    );
};

export default PurchaseDayReport;