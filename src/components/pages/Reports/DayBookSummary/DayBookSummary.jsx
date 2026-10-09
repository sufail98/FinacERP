// src/components/pages/Reports/DayBookSummary/DayBookSummary.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DayBookSummaryFilters from './DayBookSummaryFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const DayBookSummary = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const { selectedBranchId,selectedBranchDetails } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Daybook Summary");
    const { generalSettings } = useSelector((state) => state.settings);
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
            'Payable': `/transaction/payable-voucher/edit/${row.MasterId}`,
            'Receivable Voucher': `/transaction/receivable-voucher/edit/${row.MasterId}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.MasterId}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.MasterId}`,
            'Payable Voucher': `/transaction/payable-voucher/edit/${row.MasterId}`,
        };

        const path = routes[row.VoucherType];
        if (path) navigate(path);
    };
    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
    

        return {
            fromDate: today.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        voucherType: null  // null means "All"
    });

    // Voucher Type Options
    const voucherTypeOptions = useMemo(() => [
        { label: t('All Voucher Types'), value: null },
        { label: t('Sales Invoice'), value: 'Sales Invoice' },
        { label: t('Sales Return'), value: 'Sales Return' },
        { label: t('Purchase Invoice'), value: 'Purchase Invoice' },
        { label: t('Purchase Return'), value: 'Purchase Return' },
        { label: t('Receipt Voucher'), value: 'Receipt Voucher' },
        { label: t('Payment Voucher'), value: 'Payment Voucher' },
        { label: t('Contra Voucher'), value: 'Contra Voucher' },
        { label: t('Journal Voucher'), value: 'Journal Voucher' },
        { label: t('Payable Voucher'), value: 'Payable Voucher' },
        { label: t('Receivable Voucher'), value: 'Receivable Voucher' }
    ], [t]);

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


    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const requestBody = {
            fromdate: filters.fromDate,
            todate: filters.toDate,
            branchId: selectedBranchDetails?.mainBranch ? null : parseInt(selectedBranchId) || 1
        };
        

        try {
            const res = await axiosInstance.post("daybook-summery", requestBody);

            let responseData = res.data.data || res.data || [];

            // ✅ Filter by voucher type if selected (client-side filtering)
            if (filters.voucherType) {
                responseData = responseData.filter(item =>
                    item.VoucherType === filters.voucherType
                );
            }

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: index + 1,
                Date: formatDate(item.Date),
            }));

            setReportData(dataWithSNo);

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("❌ Day Book Summary Error:", error);

            const errorMessage = error.response?.data?.message || error.message;
            setAlert({
                id: Date.now(),
                type: 'error',
                message: errorMessage
            });

            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Fixed columns based on API response
    const columns = useMemo(() => {
        return [
            { key: 'SNo', label: t('sl no'), align: 'center', width: '50px' },
            { key: 'Date', label: t('Date'), align: 'center', width: '100px' },
            { key: 'VoucherType', label: t('Voucher Type'), align: 'left', width: '150px' },
            { key: 'VoucherNo', label: t('Voucher No'), align: 'left', width: '100px' },
            { key: 'LedgerName', label: t('Ledger Name'), align: 'left', width: '180px' },
            { key: 'PaymentMode', label: t('Payment Mode'), align: 'left', width: '120px' },
            { key: 'Description', label: t('Description'), align: 'left', width: '150px' },
            { key: 'Amount', label: t('Amount'), align: 'right', width: '120px' },
            { key: 'VATAmount', label: t('VAT Amount'), align: 'right', width: '100px' },
            { key: 'TotalAmount', label: t('Total Amount'), align: 'right', width: '120px' }
        ];
    }, [t]);

    // Calculate totals
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        const numericKeys = ['Amount', 'VATAmount', 'TotalAmount'];

        return reportData.reduce((acc, row) => {
            numericKeys.forEach(key => {
                acc[key] = (acc[key] || 0) + (parseFloat(row[key]) || 0);
            });
            return acc;
        }, {});
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        return {
            label: t('Total'),
            'Amount': totals['Amount']?.toFixed(decimalPart) || '0.00',
            'VATAmount': totals['VATAmount']?.toFixed(decimalPart) || '0.00',
            'TotalAmount': totals['TotalAmount']?.toFixed(decimalPart) || '0.00'
        };
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportColumns = [
            { key: 'SNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: t('Date'), align: 'center', width: 12 },
            { key: 'VoucherType', label: t('Voucher Type'), align: 'left', width: 18 },
            { key: 'VoucherNo', label: t('Voucher No'), align: 'left', width: 12 },
            { key: 'LedgerName', label: t('Ledger Name'), align: 'left', width: 20 },
            { key: 'PaymentMode', label: t('Payment Mode'), align: 'left', width: 15 },
            { key: 'Description', label: t('Description'), align: 'left', width: 18 },
            { key: 'Amount', label: t('Amount'), align: 'right', width: 14, type: 'number' },
            { key: 'VATAmount', label: t('VAT Amount'), align: 'right', width: 12, type: 'number' },
            { key: 'TotalAmount', label: t('Total Amount'), align: 'right', width: 14, type: 'number' }
        ];

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Date: row.Date || '',
            VoucherType: row.VoucherType || '',
            VoucherNo: row.VoucherNo || '',
            LedgerName: row.LedgerName || '',
            PaymentMode: row.PaymentMode || '',
            Description: row.Description || '',
            Amount: Number(row.Amount || 0).toFixed(decimalPart),
            VATAmount: Number(row.VATAmount || 0).toFixed(decimalPart),
            TotalAmount: Number(row.TotalAmount || 0).toFixed(decimalPart)
        }));

        // Build subtitle with voucher type if selected
        let subtitle = `${t('From')}: ${filters.fromDate} ${t('To')}: ${filters.toDate}`;
        if (filters.voucherType) {
            subtitle += ` | ${t('Voucher Type')}: ${filters.voucherType}`;
        }

        return {
            fileName: `Day_Book_Summary_${filters.fromDate}_to_${filters.toDate}${filters.voucherType ? '_' + filters.voucherType.replace(/\s+/g, '_') : ''}`,
            sheetName: 'Day Book Summary',
            title: t('Day Book Summary'),
            subtitle: subtitle,
            reportInfo: {
                title: t('Day Book Summary'),
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: exportColumns
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

    /* ------------------------------ Filter Handlers ------------------------------ */

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            voucherType: null
        });
        setReportData(null);
        setAlert(null);
    };

    // Voucher type color mapping
    const getVoucherTypeColor = (voucherType) => {
        const colorMap = {
            'Sales Invoice': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'Sales Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'Purchase Invoice': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Purchase Return': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'Receipt Voucher': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
            'Payment Voucher': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
            'Contra Voucher': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'Journal Voucher': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'Payable Voucher': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
            'Receivable Voucher': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
        };
        return colorMap[voucherType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    };

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // Numeric columns
        const numericKeys = ['Amount', 'VATAmount', 'TotalAmount'];

        if (numericKeys.includes(key)) {
            const numValue = parseFloat(value) || 0;

            if (numValue === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            // Color coding for amounts
            if (key === 'TotalAmount') {
                return <div className="text-right text-blue-600 dark:text-blue-400 font-semibold">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'VATAmount' && numValue > 0) {
                return <div className="text-right text-orange-600 dark:text-orange-400">{numValue.toFixed(decimalPart)}</div>;
            }

            return <div className="text-right font-medium">{numValue.toFixed(decimalPart)}</div>;
        }

        // Voucher Type with badge
        if (key === 'VoucherType') {
            return (
                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getVoucherTypeColor(value)}`}>
                    {value || '-'}
                </span>
            );
        }

        // Voucher No
        if (key === 'VoucherNo') {
            return (
                <span>
                    {value || '-'}
                </span>
            );
        }


        return value ?? '-';
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Day Book Summary"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("Day Book Summary") }}
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
                        { title: t("Reports"), url: "#" },
                        { title: t("Day Book Summary"), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t("Day Book Summary") }}
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
                    { title: t("Reports"), url: "#" },
                    { title: t("Day Book Summary"), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: t("Day Book Summary") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <DayBookSummaryFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    voucherTypeOptions={voucherTypeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    onRowClick={handleRowClick}
                    maxHeight="calc(100vh - 230px)"

                />
            </div>
        </div>
    );
};

export default DayBookSummary;