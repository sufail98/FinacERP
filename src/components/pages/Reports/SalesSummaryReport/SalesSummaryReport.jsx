import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import DateInput from '@/components/elements/theme/DateInput';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingCart, RefreshCw, Eye } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesSummaryReport = () => {

    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const { selectedBranchId, currentCurrency, branches, selectedBranchDetails } = useAuth();
    const isMainBranch = selectedBranchDetails?.mainBranch === true;

    const branchOptions = useMemo(() => {
        if (!branches || !Array.isArray(branches)) return [];
        return [
            { label: 'All', value: null },
            ...branches.map(b => ({
                label: b.branchCode,
                value: Number(b.branchId)
            }))
        ];
    }, [branches]);

    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Summary Report");
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();

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
        reportType: 'All',
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        selectedBranchId: null
    });

    const reportTypeOptions = [
        { label: t('salesSummaryReport.filters.reportTypeAll') || 'All', value: 'All' },
        { label: t('salesSummaryReport.filters.reportTypeCash') || 'Cash', value: 'Cash' },
        { label: t('salesSummaryReport.filters.reportTypeCredit') || 'Credit', value: 'Credit' },
        { label: t('salesSummaryReport.filters.reportTypeBank') || 'Bank', value: 'Bank' },
        { label: t('salesSummaryReport.filters.reportTypeFinac') || 'Finac', value: 'Finac' }
    ];

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            reportType: 'All',
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            selectedBranchId: null
        });
        setReportData(null);
        setAlert(null);
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const resolvedBranchId = isMainBranch
                ? (filters.selectedBranchId ?? null)
                : Number(selectedBranchId);

            const payload = {
                reportType: filters.reportType || 'All',
                branchId: resolvedBranchId,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                currencyId: currentCurrency?.currencyId || 1
            };

            const response = await axiosInstance.post("sales-summary-report-data", payload);
            const data = response.data.data || response.data;

            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: item.slno ?? index + 1
            }));

            if (!dataWithSNo || dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('salesSummaryReport.messages.noDataFound') || 'No data found'
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching sales summary report:", error);
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

    const handleRowClick = (row) => {
        if (!row.salesmasterid) return;
        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.salesmasterid}`);
    };

    // Columns — order: invoiceNo, date_display, party, taxableamt, totaltax, totalamount
    const columns = useMemo(() => {
        return [
            { key: 'SNo', label: '#', align: 'center', width: '60' },
            { key: 'invoiceno', label: t('salesSummaryReport.grid.columns.invoiceNo') || 'Invoice No', align: 'center', width: '140' },
            { key: 'date_display', label: t('salesSummaryReport.grid.columns.date') || 'Date', align: 'center', width: '120' },
            { key: 'party', label: t('salesSummaryReport.grid.columns.party') || 'Party', align: 'left', width: '220' },
            { key: 'taxableamt', label: t('salesSummaryReport.grid.columns.taxableAmount') || 'Taxable Amt', align: 'right', width: '130' },
            { key: 'totaltax', label: t('salesSummaryReport.grid.columns.taxAmount') || 'Total Tax', align: 'right', width: '110' },
            { key: 'billamount', label: t('salesSummaryReport.grid.columns.totalAmount') || 'Total Amount', align: 'right', width: '130' }
        ];
    }, [t]);

    // Cell renderer
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const numericFields = ['taxableamt', 'totaltax', 'billamount'];

        if (numericFields.includes(key)) {
            return (
                <div className="text-right tabular-nums">
                    {row[key] !== undefined && row[key] !== null
                        ? Number(row[key]).toFixed(decimalPart)
                        : '0.00'}
                </div>
            );
        }

        if (key === 'SNo') {
            return <div className="text-center">{row.SNo}</div>;
        }

        return row[key] ?? '-';
    };

    // Footer totals
    const footerData = useMemo(() => {
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

        return {
            SNo: '',
            invoiceno: '',
            date_display: '',
            party: <strong>{t('salesSummaryReport.grid.total') || 'Total'}</strong>,
            taxableamt: calculateSum('taxableamt').toFixed(decimalPart),
            totaltax: calculateSum('totaltax').toFixed(decimalPart),
            billamount: calculateSum('billamount').toFixed(decimalPart)
        };
    }, [reportData, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row) => ({
            SlNo: row.SNo,
            InvoiceNo: row.invoiceno,
            Date: row.date_display,
            Party: row.party,
            TaxableAmt: Number(row.taxableamt || 0).toFixed(decimalPart),
            TotalTax: Number(row.totaltax || 0).toFixed(decimalPart),
            TotalAmount: Number(row.billamount || 0).toFixed(decimalPart)
        }));

        return {
            fileName: 'Sales_Summary_Report',
            sheetName: 'Sales Summary',
            title: t('salesSummaryReport.breadcrumb.title') || 'Sales Summary Report',
            subtitle: `${t('common.fromDate')}: ${filters.fromDate} | ${t('common.toDate')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SlNo', label: '#', align: 'center', width: 5 },
                { key: 'InvoiceNo', label: t('salesSummaryReport.grid.columns.invoiceNo') || 'Invoice No', align: 'center', width: 14 },
                { key: 'Date', label: t('salesSummaryReport.grid.columns.date') || 'Date', align: 'center', width: 12 },
                { key: 'Party', label: t('salesSummaryReport.grid.columns.party') || 'Party', align: 'left', width: 22 },
                { key: 'TaxableAmt', label: t('salesSummaryReport.grid.columns.taxableAmount') || 'Taxable Amt', align: 'right', width: 13 },
                { key: 'TotalTax', label: t('salesSummaryReport.grid.columns.taxAmount') || 'Total Tax', align: 'right', width: 11 },
                { key: 'TotalAmount', label: t('salesSummaryReport.grid.columns.totalAmount') || 'Total Amount', align: 'right', width: 13 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesSummaryReport.messages.noDataToExport') || 'No data to export' });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesSummaryReport.messages.noDataToExport') || 'No data to export' });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesSummaryReport.messages.noDataToExport') || 'No data to export' });
            return;
        }
        exportGenericToCsv(options);
    };

    const breadcrumbConfig = {
        routes: [
            { title: t("salesSummaryDataReport.breadcrumb.group") || "Reports", url: "#" },
            { title: t("salesSummaryDataReport.breadcrumb.title") || "Sales Summary Report", url: "#" }
        ],
        heading: {
            icon: ShoppingCart,
            title: t("salesSummaryDataReport.breadcrumb.title") || "Sales Summary Report"
        }
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb routes={breadcrumbConfig.routes} heading={breadcrumbConfig.heading} />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb routes={breadcrumbConfig.routes} heading={breadcrumbConfig.heading} />
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
                routes={breadcrumbConfig.routes}
                heading={breadcrumbConfig.heading}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('salesSummaryReport.export.label') || 'Export'
                } : null}
            />

            <div className="px-1">
                {/* Filter section */}
                <div className="flex flex-wrap items-end gap-3 mb-4 p-3 border rounded-md bg-white">
                    <DateInput
                        label={t('salesSummaryReport.filters.fromDate') || 'From Date'}
                        name="fromDate"
                        value={filters.fromDate}
                        onChange={(e, value) => handleFilterChange('fromDate', value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full"
                    />

                    <DateInput
                        label={t('salesSummaryReport.filters.toDate') || 'To Date'}
                        name="toDate"
                        value={filters.toDate}
                        onChange={(e, value) => handleFilterChange('toDate', value)}
                        required
                        min={filters.fromDate}
                        className="w-full"
                    />

                    {isMainBranch && (
                        <SearchableDropdown
                            label={t('salesSummaryDataReport.filters.branch') || 'Branch'}
                            name="branchId"
                            value={filters.selectedBranchId ?? null}
                            onChange={(value) => handleFilterChange('selectedBranchId', value ?? null)}
                            options={branchOptions}
                            placeholder={t('salesSummaryDataReport.filters.branch') || 'All Branches'}
                            searchPlaceholder={t('salesSummaryDataReport.filters.searchBranch') || 'Search branch...'}
                            clearable
                            className="w-[250px]"
                        />
                    )}

                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="h-[36px] px-5 main-bg dark:main-bg text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    {t('salesSummaryReport.filters.loading') || 'Loading...'}
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" />
                                    {t('salesSummaryReport.filters.show') || 'Show'}
                                </>
                            )}
                        </button>
                        <button
                            onClick={resetFilters}
                            disabled={loading}
                            className="h-[36px] px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {t('salesSummaryReport.filters.reset') || 'Reset'}
                        </button>
                    </div>
                </div>

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable={true}
                    serverPagination={false}
                    tableId="sales-summary-report-table"
                    pageSize={80}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 295px)"
                    stickyActions={false}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
};

export default SalesSummaryReport;