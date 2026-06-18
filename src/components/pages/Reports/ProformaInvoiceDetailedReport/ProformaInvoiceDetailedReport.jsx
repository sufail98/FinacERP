// src/components/pages/Reports/ProformaInvoiceDetailedReport/ProformaInvoiceDetailedReport.jsx
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
import ProformaInvoiceDetailedReportFilter from './ProformaInvoiceDetailedReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const ProformaInvoiceDetailedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [customerData, setCustomerData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);
    const [userData, setUserData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Proforma Invoice Report");
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
        ledgerId: 'All',
        costCentreId: 'All',
        userId: 'All',
        condition: 'All',
        dueOn: null,
        optional: false,
        reportMode: 'Detailed' // Default to Detailed
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [customersRes, costCentreRes, usersRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } }))
            ]);

            setCustomerData(customersRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
            setUserData(usersRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const customerOptions = useMemo(() => [
        { label: t('All Customers'), value: 'All' },
        ...customerData.map(customer => ({
            label: customer.ledgerName,
            value: customer.ledgerId
        }))
    ], [customerData, t]);

    const costCentreOptions = useMemo(() => [
        { label: t('All Cost Centres'), value: 'All' },
        ...costCentreData.map(cc => ({
            label: cc.CostCentre || cc.costCentreName || cc.CostCentreName,
            value: cc.costCentreId || cc.CostCentreId
        }))
    ], [costCentreData, t]);

    const userOptions = useMemo(() => [
        { label: t('All Users'), value: 'All' },
        ...userData.map(user => ({
            label: user.userName || user.name || user.username,
            value: user.userId || user.id
        }))
    ], [userData, t]);

    const conditionOptions = [
        { label: t('All'), value: 'All' },
        { label: t('Pending'), value: 'Pending' },
        { label: t('Completed'), value: 'Completed' },
        { label: t('Cancelled'), value: 'Cancelled' },
        { label: t('Partial'), value: 'Partial' }
    ];

    // ─── Fetch Report ────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                optional: filters.optional,
                condition: filters.condition,
                dueOn: filters.dueOn || filters.toDate,
                ledgerId: filters.ledgerId,
                branchId: Number(selectedBranchId),
                currencyId: currentCurrency?.currencyId || 1,
                userId: filters.userId,
                costCentreId: filters.costCentreId,
                mode: filters.reportMode || 'Detailed'
            };


            const response = await axiosInstance.post("proforma-invoice-detailed-report", payload);


            let data = null;
            if (response.data) {
                if (Array.isArray(response.data)) data = response.data;
                else if (Array.isArray(response.data.data)) data = response.data.data;
                else data = [];
            }

            const dataArray = Array.isArray(data) ? data : [];
            const dataWithSNo = dataArray.map((item, index) => ({ 
                ...item, 
                SNo: item.SNo || item.SlNo || (index + 1)
            }));

            if (!dataWithSNo || dataWithSNo.length === 0) {
                setAlert({ 
                    id: Date.now(), 
                    type: 'info', 
                    message: t('No data found for the selected filters') 
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ [fetchReport] Error:", error);
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

    // ─── Define columns for both modes ───────────────────────────────────────────
    const summaryColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), align: 'center', width: '100' },
        { key: 'OrderNo', label: t('Proforma No'), align: 'center', width: '120' },
        { key: 'Ledger', label: t('Customer'), align: 'left', width: '180' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'TotalAmount', label: t('Total Amount'), align: 'right', width: '120' },
        { key: 'BillDiscount', label: t('Discount'), align: 'right', width: '100' },
        { key: 'TaxableAmt', label: t('Taxable Amount'), align: 'right', width: '120' },
        { key: 'TotalTax', label: t('Tax Amount'), align: 'right', width: '120' },
        { key: 'GrandAmount', label: t('Grand Total'), align: 'right', width: '120' },
        { key: 'DueDate', label: t('Due Date'), align: 'center', width: '100' },
        { key: 'Status', label: t('Status'), align: 'center', width: '100' }
    ], [t]);

    const detailedColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), align: 'center', width: '100' },
        { key: 'OrderNo', label: t('Proforma No'), align: 'center', width: '120' },
        { key: 'Ledger', label: t('Customer'), align: 'left', width: '160' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'productCode', label: t('Item Code'), align: 'left', width: '100' },
        { key: 'productName', label: t('Product'), align: 'left', width: '180' },
        { key: 'unitName', label: t('Unit'), align: 'center', width: '80' },
        { key: 'qty', label: t('Qty'), align: 'right', width: '80' },
        { key: 'rate', label: t('Rate'), align: 'right', width: '100' },
        { key: 'grossAmount', label: t('Gross Amount'), align: 'right', width: '120' },
        { key: 'netAmount', label: t('Net Amount'), align: 'right', width: '120' },
        { key: 'taxAmount', label: t('Tax Amount'), align: 'right', width: '120' },
        { key: 'amount', label: t('Total Amount'), align: 'right', width: '120' },
        { key: 'Status', label: t('Status'), align: 'center', width: '100' }
    ], [t]);

    // Choose active columns based on mode
    const activeColumns = useMemo(() => 
        filters.reportMode === 'Summary' ? summaryColumns : detailedColumns,
        [filters.reportMode, summaryColumns, detailedColumns]
    );

    // ─── Cell renderer ───────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const getValue = (primaryKey, altKeys = []) => {
            if (row[primaryKey] !== undefined && row[primaryKey] !== null) return row[primaryKey];
            for (let altKey of altKeys) {
                if (row[altKey] !== undefined && row[altKey] !== null) return row[altKey];
            }
            return null;
        };

        // Status rendering
        if (key === 'Status') {
            const isPending = row.Pending;
            const statusText = isPending ? t('Pending') : t('Completed');
            const colorClass = isPending
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {statusText}
                </span>
            );
        }

        // Numeric fields
        const numericFields = [
            'qty', 'rate', 'grossAmount', 'netAmount', 'taxAmount', 'amount',
            'TotalAmount', 'BillDiscount', 'TaxableAmt', 'TotalTax', 'GrandAmount'
        ];

        if (numericFields.includes(key)) {
            const value = getValue(key);
            if (key === 'qty') {
                return <div className="text-right tabular-nums">{value !== null ? Number(value).toFixed(3) : '-'}</div>;
            }
            return <div className="text-right tabular-nums">{value !== null ? Number(value).toFixed(decimalPart) : '-'}</div>;
        }

        // Field mapping
        switch (key) {
            case 'SNo': 
                return row.SNo;
            case 'OrderNo': 
                return getValue('OrderNo', ['ProformaNo', 'proformaNo', 'voucherNo']);
            case 'Date': 
                return getValue('Date', ['date', 'proformaDate']);
            case 'DueDate': 
                return getValue('DueDate', ['dueDate']) || '-';
            case 'Ledger': 
                return getValue('Ledger', ['CustomerName', 'customerName', 'ledgerName', 'Party']);
            case 'CostCentre': 
                return getValue('CostCentre', ['costCentre']);
            case 'productCode':
                return getValue('productCode', ['ProductCode']);
            case 'productName': 
                return getValue('productName', ['ProductName']);
            case 'unitName': 
                return getValue('unitName', ['UnitName', 'unit']);
            default:
                return getValue(key) ?? '-';
        }
    };

    // ─── Footer totals ───────────────────────────────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        const sumOf = (...keys) => reportData.reduce((acc, row) => {
            for (const k of keys) {
                const v = parseFloat(row[k]);
                if (!isNaN(v)) return acc + v;
            }
            return acc;
        }, 0);

        if (filters.reportMode === 'Summary') {
            return {
                SNo: '',
                Date: '',
                OrderNo: <strong>{t('Total')}</strong>,
                Ledger: '',
                CostCentre: '',
                TotalAmount: sumOf('TotalAmount').toFixed(decimalPart),
                BillDiscount: sumOf('BillDiscount').toFixed(decimalPart),
                TaxableAmt: sumOf('TaxableAmt', 'TaxableAmount').toFixed(decimalPart),
                TotalTax: sumOf('TotalTax').toFixed(decimalPart),
                GrandAmount: sumOf('GrandAmount').toFixed(decimalPart),
                DueDate: '',
                Status: ''
            };
        }

        // Detailed mode
        return {
            SNo: '',
            Date: '',
            OrderNo: <strong>{t('Total')}</strong>,
            Ledger: '',
            CostCentre: '',
            productCode: '',
            productName: '',
            unitName: '',
            qty: sumOf('qty', 'Qty').toFixed(3),
            rate: '',
            grossAmount: sumOf('grossAmount', 'GrossAmount').toFixed(decimalPart),
            netAmount: sumOf('netAmount', 'NetAmount').toFixed(decimalPart),
            taxAmount: sumOf('taxAmount', 'TaxAmount').toFixed(decimalPart),
            amount: sumOf('amount', 'Amount').toFixed(decimalPart),
            Status: ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.reportMode]);

    // ─── Export ──────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            const exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row.Date || '',
                ProformaNo: row.OrderNo || '',
                Customer: row.Ledger || row.CustomerName || '',
                CostCentre: row.CostCentre || '',
                TotalAmount: Number(row.TotalAmount || 0).toFixed(decimalPart),
                Discount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxableAmount: Number(row.TaxableAmt || 0).toFixed(decimalPart),
                TaxAmount: Number(row.TotalTax || 0).toFixed(decimalPart),
                GrandTotal: Number(row.GrandAmount || 0).toFixed(decimalPart),
                DueDate: row.DueDate || '',
                Status: row.Pending ? 'Pending' : 'Completed'
            }));

            return {
                fileName: 'Proforma_Invoice_Summary_Report',
                sheetName: 'Summary',
                title: t('Proforma Invoice Summary Report'),
                subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: 'Date', align: 'center', width: 10 },
                    { key: 'ProformaNo', label: 'Proforma No', align: 'left', width: 12 },
                    { key: 'Customer', label: 'Customer', align: 'left', width: 18 },
                    { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                    { key: 'TotalAmount', label: 'Total Amount', align: 'right', width: 12 },
                    { key: 'Discount', label: 'Discount', align: 'right', width: 10 },
                    { key: 'TaxableAmount', label: 'Taxable Amount', align: 'right', width: 12 },
                    { key: 'TaxAmount', label: 'Tax Amount', align: 'right', width: 12 },
                    { key: 'GrandTotal', label: 'Grand Total', align: 'right', width: 12 },
                    { key: 'DueDate', label: 'Due Date', align: 'center', width: 10 },
                    { key: 'Status', label: 'Status', align: 'center', width: 10 }
                ]
            };
        }

        // Detailed mode export
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Date: row.Date || '',
            ProformaNo: row.OrderNo || '',
            Customer: row.Ledger || row.CustomerName || '',
            CostCentre: row.CostCentre || '',
            ItemCode: row.productCode || '',
            Product: row.productName || '',
            Unit: row.unitName || '',
            Qty: Number(row.qty || 0).toFixed(3),
            Rate: Number(row.rate || 0).toFixed(decimalPart),
            GrossAmount: Number(row.grossAmount || 0).toFixed(decimalPart),
            NetAmount: Number(row.netAmount || 0).toFixed(decimalPart),
            TaxAmount: Number(row.taxAmount || 0).toFixed(decimalPart),
            TotalAmount: Number(row.amount || 0).toFixed(decimalPart),
            Status: row.Pending ? 'Pending' : 'Completed'
        }));

        return {
            fileName: 'Proforma_Invoice_Detailed_Report',
            sheetName: 'Detailed',
            title: t('Proforma Invoice Detailed Report'),
            subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: 'Date', align: 'center', width: 10 },
                { key: 'ProformaNo', label: 'Proforma No', align: 'left', width: 12 },
                { key: 'Customer', label: 'Customer', align: 'left', width: 18 },
                { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                { key: 'ItemCode', label: 'Item Code', align: 'left', width: 10 },
                { key: 'Product', label: 'Product', align: 'left', width: 18 },
                { key: 'Unit', label: 'Unit', align: 'center', width: 8 },
                { key: 'Qty', label: 'Qty', align: 'right', width: 8 },
                { key: 'Rate', label: 'Rate', align: 'right', width: 10 },
                { key: 'GrossAmount', label: 'Gross Amount', align: 'right', width: 12 },
                { key: 'NetAmount', label: 'Net Amount', align: 'right', width: 12 },
                { key: 'TaxAmount', label: 'Tax Amount', align: 'right', width: 12 },
                { key: 'TotalAmount', label: 'Total Amount', align: 'right', width: 12 },
                { key: 'Status', label: 'Status', align: 'center', width: 10 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { 
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); 
            return; 
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { 
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); 
            return; 
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { 
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') }); 
            return; 
        }
        exportGenericToCsv(options);
    };

     const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.proformaMasterId) return;
        navigate(`/transaction/proforma-invoice/edit-proforma-invoice/${row.proformaMasterId}`);
    };

    // ─── Filter handlers ─────────────────────────────────────────────────────────
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'reportMode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            ledgerId: 'All',
            costCentreId: 'All',
            userId: 'All',
            condition: 'All',
            dueOn: null,
            optional: false,
            reportMode: 'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    // Dynamic report title
    const reportTitle = filters.reportMode === 'Summary' 
        ? t('Proforma Invoice Summary Report') 
        : t('Proforma Invoice Detailed Report');

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" }, 
                        { title: t("Proforma Invoice Report"), url: "#" }
                    ]}
                    heading={{ icon: FileText, title: reportTitle }}
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
                        { title: t("Proforma Invoice Report"), url: "#" }
                    ]}
                    heading={{ icon: FileText, title: reportTitle }}
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
                    { title: t("Reports"), url: "#" }, 
                    { title: t("Proforma Invoice Report"), url: "#" }
                ]}
                heading={{ icon: FileText, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <ProformaInvoiceDetailedReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    customerOptions={customerOptions}
                    costCentreOptions={costCentreOptions}
                    userOptions={userOptions}
                    conditionOptions={conditionOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={[
                        { key: 'SNo', label: '#', align: 'center', width: '50' },
                        ...activeColumns
                    ]}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable={true}
                    serverPagination={false}
                    tableId="proforma-invoice-detailed-report-table"
                    pageSize={50}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 280px)"
                    stickyActions={false}
                                        onRowClick={handleRowClick}

                    // ✅ Row merging only in Detailed mode
                    groupBy={filters.reportMode === 'Detailed' ? 'OrderNo' : null}
                    mergedColumns={filters.reportMode === 'Detailed' ? [
                        'SNo', 'Date', 'OrderNo', 'Ledger', 'CostCentre', 'Status'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default ProformaInvoiceDetailedReport;