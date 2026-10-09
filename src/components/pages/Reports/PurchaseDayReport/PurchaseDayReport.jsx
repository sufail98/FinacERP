// src/components/pages/Reports/PurchaseDayReport/PurchaseDayReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseDayReportFilter from './PurchaseDayReportFilter';
import useReportExport from '@/hooks/useReportExport';

const PurchaseDayReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [usersData, setUsersData] = useState([]);

    const { selectedBranchId, selectedBranchDetails } = useAuth();
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

        return {
            fromDate: today.toISOString().split('T')[0],
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
                branchId: selectedBranchDetails?.mainBranch ? null : Number(selectedBranchId),
                createdUser: filters.createdUser || 'all',
                isAccountsPosting: filters.isAccountsPosting
            };

            const response = await axiosInstance.post("purchase/day-report", payload);
            const data = response.data.data || response.data;

            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: item.SLNo || index + 1
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

        const totalAmount = calculateSum('TotalAmount');

        return {
            totalAmount: totalAmount.toFixed(decimalPart),
            count: reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    // Footer row for ContentTable (matches column keys)
    const footerData = useMemo(() => {
        if (!totals) return null;
        return {
            label: t('purchaseDayReport.grid.total'),
            Date: t('purchaseDayReport.grid.total'),
            TotalAmount: totals.totalAmount
        };
    }, [totals, t]);

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

    // ── ContentTable column config ──────────────────────────────────────────
    const columns = [
        { key: 'SNo', label: '#', align: 'center', width: 60 },
        { key: 'Date', label: t('purchaseDayReport.grid.columns.date'), align: 'center' },
        { key: 'TotalAmount', label: t('purchaseDayReport.grid.columns.totalAmount'), align: 'right' }
    ];

    const renderCell = (key, row) => {
        if (key === 'TotalAmount') {
            const decimalPart = generalSettings?.decimalPart || 2;
            return Number(row.TotalAmount || 0).toFixed(decimalPart);
        }
        return row[key] ?? '-';
    };

    /* ------------------------------ Export Configuration ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Date: row.Date || '',
            TotalAmount: Number(row.TotalAmount || 0).toFixed(decimalPart)
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
                TotalAmount: totals.totalAmount
            } : null,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 6 },
                { key: 'Date', label: t('purchaseDayReport.grid.columns.date'), align: 'center', width: 14 },
                { key: 'TotalAmount', label: t('purchaseDayReport.grid.columns.totalAmount'), align: 'right', width: 14, type: 'currency' }
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

                <div className="mt-4">
                    <ContentTable
                        columns={columns}
                        data={reportData || []}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        serverPagination={false}
                        staticSearchable={true}
                        sortable={true}
                        tableId="purchase-day-report"
                        pageSize={4000}
                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseDayReport;