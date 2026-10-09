// src/components/pages/Reports/SalesmanWiseSalesOrderReport/SalesmanWiseSalesOrderReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ClipboardList } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesmanWiseSalesOrderReportFilter from './SalesmanWiseSalesOrderReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesmanWiseSalesOrderReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [employeeData, setEmployeeData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);
    const [brandData, setBrandData] = useState([]);

    const { selectedBranchId ,currentCurrency} = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Salesman Wise Sales Order");
    const { generalSettings } = useSelector((state) => state.settings);

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
        employeeId: null,
        mode: 'Voucher Wise',
        currencyId: currentCurrency?.currencyId,
        brandId: null,
        isAccountsPosting: generalSettings?.AccountPosting
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [employeeRes, currencyRes, brandRes] = await Promise.all([
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("brands").catch(() => ({ data: { data: [] } }))
            ]);

            setEmployeeData(employeeRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
            setBrandData(brandRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Dropdown options
    const employeeOptions = useMemo(() => {
        return employeeData.map(emp => ({
            label: emp.employeeName || emp.name,
            value: emp.employeeId || emp.id
        }));
    }, [employeeData]);

    const currencyOptions = useMemo(() => {
        return [
            { label: t('salesmanWiseSalesOrderReport.filters.all'), value: 0 },
            ...currencyData.map(currency => ({
                label: `${currency.currencySymbol} - ${currency.currencyName}`,
                value: currency.currencyId
            }))
        ];
    }, [currencyData, t]);

    const brandOptions = useMemo(() => {
        return [
            { label: t('salesmanWiseSalesOrderReport.filters.all'), value: 0 },
            ...brandData.map(brand => ({
                label: brand.brandName || brand.BrandName,
                value: brand.brandId || brand.BrandId
            }))
        ];
    }, [brandData, t]);

    const modeOptions = [
        { label: t('salesmanWiseSalesOrderReport.filters.voucherWise'), value: 'Voucher Wise' },
        { label: t('salesmanWiseSalesOrderReport.filters.productWise'), value: 'Product Wise' },
        // { label: t('salesmanWiseSalesOrderReport.filters.salesmanWise'), value: 'Salesman Wise' }
    ];
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
    // Fetch Report
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                from_date: filters.fromDate,
                to_date: filters.toDate,
                employee_id: filters.employeeId || null,
                mode: filters.mode,
                branch_id: Number(selectedBranchId),
                currency_id: filters.currencyId || currentCurrency?.currencyId,
                brand_id: filters.brandId,
                is_accounts_posting: filters.isAccountsPosting
            };

            const response = await axiosInstance.post("sales-man-wise-sales-order-report", payload);
            const data = response.data.data || response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('salesmanWiseSalesOrderReport.messages.noDataFound')
                });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching salesman wise sales order report:", error);
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

    // Calculate totals based on actual API response
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;

        const totalAmount = reportData.reduce((sum, row) => {
            const value = parseFloat(row['Amount'] || row['amount'] || 0);
            return sum + value;
        }, 0);

        const totalQty = reportData.reduce((sum, row) => {
            const value = parseFloat(row['Qty'] || row['qty'] || 0);
            return sum + value;
        }, 0);

        const totalFree = reportData.reduce((sum, row) => {
            const value = parseFloat(row['Free'] || row['free'] || 0);
            return sum + value;
        }, 0);

        return {
            totalAmount: totalAmount.toFixed(decimalPart),
            totalQty: totalQty.toFixed(3),
            totalFree: totalFree.toFixed(3),
            count: reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    // Clear data when mode changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));

        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            employeeId: null,
            mode: 'Voucher Wise',
            currencyId: currentCurrency?.currencyId,
            brandId: 0,
            isAccountsPosting: generalSettings?.AccountPosting
        });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ ContentTable columns per mode ------------------------------ */
    const columns = useMemo(() => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const mode = filters.mode;

        if (mode === 'Voucher Wise') {
            return [
                { key: 'SNo', label: '#', align: 'center', width: '60' },
                { key: 'Date', label: t('salesmanWiseSalesOrderReport.grid.columns.date'), align: 'center', width: '120' },
                { key: 'Voucher No', label: t('salesmanWiseSalesOrderReport.grid.columns.voucherNo'), align: 'center', width: '130' },
                { key: 'Done By', label: t('salesmanWiseSalesOrderReport.grid.columns.doneBy'), align: 'left' },
                { key: 'Amount', label: t('salesmanWiseSalesOrderReport.grid.columns.amount'), align: 'right', width: '130' },
            ];
        }

        if (mode === 'Product Wise') {
            return [
                { key: 'SNo', label: '#', align: 'center', width: '60' },
                { key: 'Date', label: t('salesmanWiseSalesOrderReport.grid.columns.date'), align: 'center', width: '110' },
                { key: 'Voucher No', label: t('salesmanWiseSalesOrderReport.grid.columns.voucherNo'), align: 'center', width: '120' },
                { key: 'Code', label: t('salesmanWiseSalesOrderReport.grid.columns.code'), align: 'center', width: '100' },
                { key: 'Item', label: t('salesmanWiseSalesOrderReport.grid.columns.item'), align: 'left' },
                { key: 'Qty', label: t('salesmanWiseSalesOrderReport.grid.columns.qty'), align: 'right', width: '90' },
                { key: 'Free', label: t('salesmanWiseSalesOrderReport.grid.columns.free'), align: 'right', width: '90' },
                { key: 'Rate', label: t('salesmanWiseSalesOrderReport.grid.columns.rate'), align: 'right', width: '110' },
                { key: 'Amount', label: t('salesmanWiseSalesOrderReport.grid.columns.amount'), align: 'right', width: '120' },
            ];
        }

        // Salesman Wise
        return [
            { key: 'SNo', label: '#', align: 'center', width: '60' },
            { key: 'Code', label: t('salesmanWiseSalesOrderReport.grid.columns.code'), align: 'center', width: '140' },
            { key: 'Item', label: t('salesmanWiseSalesOrderReport.grid.columns.item'), align: 'left' },
            { key: 'Qty', label: t('salesmanWiseSalesOrderReport.grid.columns.qty'), align: 'right', width: '120' },
            { key: 'Free', label: t('salesmanWiseSalesOrderReport.grid.columns.free'), align: 'right', width: '120' },
        ];
    }, [filters.mode, generalSettings?.decimalPart, t]);

    /* ------------------------------ Footer row for ContentTable ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;

        const mode = filters.mode;
        const decimalPart = generalSettings?.decimalPart || 2;

        const base = { label: t('common.total') };

        if (mode === 'Voucher Wise') {
            return { ...base, 'Amount': totals.totalAmount };
        }
        if (mode === 'Product Wise') {
            return { ...base, 'Qty': totals.totalQty, 'Free': totals.totalFree, 'Amount': totals.totalAmount };
        }
        // Salesman Wise
        return { ...base, 'Qty': totals.totalQty, 'Free': totals.totalFree };
    }, [totals, reportData, filters.mode, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;
        const mode = filters.mode;

        let exportData = [];
        let exportColumns = [];

        if (mode === 'Voucher Wise') {
            exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row['Date'] || '-',
                VoucherNo: row['Voucher No'] || '-',
                DoneBy: row['Done By'] || '-',
                Amount: Number(row['Amount'] || 0).toFixed(decimalPart)
            }));
            exportColumns = [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: t('salesmanWiseSalesOrderReport.grid.columns.date'), align: 'center', width: 12 },
                { key: 'VoucherNo', label: t('salesmanWiseSalesOrderReport.grid.columns.voucherNo'), align: 'center', width: 12 },
                { key: 'DoneBy', label: t('salesmanWiseSalesOrderReport.grid.columns.doneBy'), align: 'left', width: 15 },
                { key: 'Amount', label: t('salesmanWiseSalesOrderReport.grid.columns.amount'), align: 'right', width: 12 }
            ];
        } else if (mode === 'Product Wise') {
            exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row['Date'] || '-',
                VoucherNo: row['Voucher No'] || '-',
                Code: row['Code'] || '-',
                Item: row['Item'] || '-',
                Qty: Number(row['Qty'] || 0).toFixed(3),
                Free: Number(row['Free'] || 0).toFixed(3),
                Rate: Number(row['Rate'] || 0).toFixed(decimalPart),
                Amount: Number(row['Amount'] || 0).toFixed(decimalPart)
            }));
            exportColumns = [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: t('salesmanWiseSalesOrderReport.grid.columns.date'), align: 'center', width: 10 },
                { key: 'VoucherNo', label: t('salesmanWiseSalesOrderReport.grid.columns.voucherNo'), align: 'center', width: 10 },
                { key: 'Code', label: t('salesmanWiseSalesOrderReport.grid.columns.code'), align: 'center', width: 10 },
                { key: 'Item', label: t('salesmanWiseSalesOrderReport.grid.columns.item'), align: 'left', width: 18 },
                { key: 'Qty', label: t('salesmanWiseSalesOrderReport.grid.columns.qty'), align: 'right', width: 8 },
                { key: 'Free', label: t('salesmanWiseSalesOrderReport.grid.columns.free'), align: 'right', width: 8 },
                { key: 'Rate', label: t('salesmanWiseSalesOrderReport.grid.columns.rate'), align: 'right', width: 10 },
                { key: 'Amount', label: t('salesmanWiseSalesOrderReport.grid.columns.amount'), align: 'right', width: 12 }
            ];
        } else {
            // Salesman Wise
            exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Code: row['Code'] || '-',
                Item: row['Item'] || '-',
                Qty: Number(row['Qty'] || 0).toFixed(3),
                Free: Number(row['Free'] || 0).toFixed(3)
            }));
            exportColumns = [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Code', label: t('salesmanWiseSalesOrderReport.grid.columns.code'), align: 'center', width: 15 },
                { key: 'Item', label: t('salesmanWiseSalesOrderReport.grid.columns.item'), align: 'left', width: 25 },
                { key: 'Qty', label: t('salesmanWiseSalesOrderReport.grid.columns.qty'), align: 'right', width: 12 },
                { key: 'Free', label: t('salesmanWiseSalesOrderReport.grid.columns.free'), align: 'right', width: 12 }
            ];
        }

        return {
            fileName: 'Salesman_Wise_Sales_Order_Report',
            sheetName: 'Salesman Sales Order',
            title: t('salesmanWiseSalesOrderReport.breadcrumb.title'),
            subtitle: `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Mode: ${mode}`,
            data: exportData,
            footer: totals,
            theme: 'professional',
            decimalPlaces: generalSettings?.decimalPart || 2,
            columns: exportColumns
        };
    };

      const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.ID) return;

        navigate(`/transaction/sales-order/edit-sales-order/${row.ID}`);
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) return;
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) return;
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) return;
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("salesmanWiseSalesOrderReport.breadcrumb.group"), url: "#" },
                        { title: t("salesmanWiseSalesOrderReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ClipboardList, title: t("salesmanWiseSalesOrderReport.breadcrumb.title") }}
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
                        { title: t("salesmanWiseSalesOrderReport.breadcrumb.group"), url: "#" },
                        { title: t("salesmanWiseSalesOrderReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ClipboardList, title: t("salesmanWiseSalesOrderReport.breadcrumb.title") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("salesmanWiseSalesOrderReport.breadcrumb.group"), url: "#" },
                    { title: t("salesmanWiseSalesOrderReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: ClipboardList, title: t("salesmanWiseSalesOrderReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('salesmanWiseSalesOrderReport.export.label')
                } : null}
            />

            <div className="px-1">
                <SalesmanWiseSalesOrderReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    employeeOptions={employeeOptions}
                    currencyOptions={currencyOptions}
                    brandOptions={brandOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    footerData={footerData}
                    staticSearchable
                    tableId="salesman-wise-sales-order-report"
                    pageSize={80}
                    maxHeight="calc(100vh - 300px)"
                    onRowClick={handleRowClick}
                    renderCell={(key, row) => {
                        if (key === 'Date') return formatDate(row['Date']);
                        return row[key] ?? '-';
                    }}
                />
            </div>
        </div>
    );
};

export default SalesmanWiseSalesOrderReport;