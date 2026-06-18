// src/components/pages/Reports/ProductWiseSalesmanReport/ProductWiseSalesmanReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Users } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductWiseSalesmanReportFilter from './ProductWiseSalesmanReportFilter';
import ProductWiseSalesmanReportGrid from './ProductWiseSalesmanReportGrid';
import useReportExport from '@/hooks/useReportExport';

const ProductWiseSalesmanReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [employeeData, setEmployeeData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Productwise Salesman Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

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
        salesmanId: 0,
        mode: 'Detailed'
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const employeeRes = await axiosInstance.get("employees").catch(() => ({ data: { data: [] } }));
            setEmployeeData(employeeRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Dropdown options
    const salesmanOptions = useMemo(() => {
        return [
            { label: t('productWiseSalesmanReport.filters.all'), value: 0 },
            ...employeeData.map(emp => ({
                label: emp.employeeName || emp.EmployeeName || emp.name,
                value: emp.employeeId || emp.EmployeeId || emp.id
            }))
        ];
    }, [employeeData, t]);

    const modeOptions = [
        { label: t('productWiseSalesmanReport.filters.detailed'), value: 'Detailed' },
        { label: t('productWiseSalesmanReport.filters.summary'), value: 'Summary' }
    ];

    // Fetch Report
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                salesmanId: filters.salesmanId,
                branchId: Number(selectedBranchId),
                mode: filters.mode
            };


            const response = await axiosInstance.post("productwise-saleman-report", payload);
            const data = response.data.data || response.data;


            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('productWiseSalesmanReport.messages.noDataFound')
                });
                setReportData([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("❌ Error fetching product wise salesman report:", error);
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
  // Calculate totals based on actual API response
const totals = useMemo(() => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
        return null;
    }

    const decimalPart = generalSettings?.decimalPart || 2;

    const totalAmount = reportData.reduce((sum, row) => {
        // Use TotalAmountDetailed for detailed mode
        const value = parseFloat(row['TotalAmountDetailed'] || row['TotalAmount'] || 0);
        return sum + value;
    }, 0);

    const totalQty = reportData.reduce((sum, row) => {
        const value = parseFloat(row['Qty'] || 0);
        return sum + value;
    }, 0);

    return {
        totalAmount: totalAmount.toFixed(decimalPart),
        totalQty: totalQty.toFixed(3),
        count: reportData.length
    };
}, [reportData, generalSettings?.decimalPart]);
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
            salesmanId: 0,
            mode: 'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Export ------------------------------ */
   const getExportOptions = () => {
    if (!reportData || reportData.length === 0) return null;

    const decimalPart = generalSettings?.decimalPart || 2;

    const exportData = reportData.map((row) => ({
        SNo: row['SlNO'] || '-',
        Date: row['Date'] || '-',
        BillNo: row['BillNo'] || '-',
        ProductCode: row['ProductCode'] || '-',
        ProductName: row['ProductName'] || '-',
        Customer: row['CustomerName'] || '-',
        Salesman: row['Salesman'] || '-',
        Qty: Number(row['Qty'] || 0).toFixed(3),
        Rate: Number(row['Rate'] || 0).toFixed(decimalPart),
        Amount: Number(row['TotalAmountDetailed'] || row['TotalAmount'] || 0).toFixed(decimalPart)
    }));

    return {
        fileName: 'Product_Wise_Salesman_Report',
        sheetName: 'Product Wise Salesman',
        title: t('productWiseSalesmanReport.breadcrumb.title'),
        subtitle: `${t('common.fromDate')}: ${filters.fromDate} - ${t('common.toDate')}: ${filters.toDate} | Mode: ${filters.mode}`,
        data: exportData,
        footer: totals,
        theme: 'professional',
        decimalPlaces: decimalPart,
        columns: [
            { key: 'SNo', label: '#', align: 'center', width: 5 },
            { key: 'Date', label: t('productWiseSalesmanReport.grid.columns.date'), align: 'center', width: 10 },
            { key: 'BillNo', label: t('productWiseSalesmanReport.grid.columns.billNo'), align: 'center', width: 10 },
            { key: 'ProductCode', label: t('productWiseSalesmanReport.grid.columns.productCode'), align: 'center', width: 10 },
            { key: 'ProductName', label: t('productWiseSalesmanReport.grid.columns.productName'), align: 'left', width: 15 },
            { key: 'Customer', label: t('productWiseSalesmanReport.grid.columns.customer'), align: 'left', width: 12 },
            { key: 'Salesman', label: t('productWiseSalesmanReport.grid.columns.salesman'), align: 'left', width: 10 },
            { key: 'Qty', label: t('productWiseSalesmanReport.grid.columns.qty'), align: 'right', width: 8 },
            { key: 'Rate', label: t('productWiseSalesmanReport.grid.columns.rate'), align: 'right', width: 10 },
            { key: 'Amount', label: t('productWiseSalesmanReport.grid.columns.amount'), align: 'right', width: 12 }
        ]
    };
};

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesmanReport.messages.noDataToExport') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesmanReport.messages.noDataToExport') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('productWiseSalesmanReport.messages.noDataToExport') });
            return;
        }
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("productWiseSalesmanReport.breadcrumb.group"), url: "#" },
                        { title: t("productWiseSalesmanReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Users, title: t("productWiseSalesmanReport.breadcrumb.title") }}
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
                        { title: t("productWiseSalesmanReport.breadcrumb.group"), url: "#" },
                        { title: t("productWiseSalesmanReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: Users, title: t("productWiseSalesmanReport.breadcrumb.title") }}
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
                    { title: t("productWiseSalesmanReport.breadcrumb.group"), url: "#" },
                    { title: t("productWiseSalesmanReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: Users, title: t("productWiseSalesmanReport.breadcrumb.title") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('productWiseSalesmanReport.export.label')
                } : null}
            />

            <div className="px-1">
                <ProductWiseSalesmanReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    salesmanOptions={salesmanOptions}
                    modeOptions={modeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ProductWiseSalesmanReportGrid
                    data={reportData}
                    loading={loading}
                    totals={totals}
                    decimalPart={generalSettings?.decimalPart || 2}
                    mode={filters.mode}
                />
            </div>
        </div>
    );
};

export default ProductWiseSalesmanReport;