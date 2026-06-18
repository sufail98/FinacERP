// src/components/pages/Reports/DeliveryNoteDetailedReport/DeliveryNoteDetailedReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Truck } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DeliveryNoteDetailedReportFilter from './DeliveryNoteDetailedReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const DeliveryNoteDetailedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [customerData, setCustomerData] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Delivery Note Report");
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
        ledgerId: 0,
        salesManId: 0,
        isAccountsPosting: false,
        reportType: 'Detailed' // Default to Detailed like Proforma
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [customersRes, salesmanRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } }))
            ]);

            setCustomerData(customersRes.data.data || []);
            setSalesmanData(salesmanRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const customerOptions = useMemo(() => customerData.map(customer => ({
        label: customer.ledgerName,
        value: customer.ledgerId
    })), [customerData]);

    const salesmanOptions = useMemo(() => salesmanData.map(salesman => ({
        label: salesman.employeeName || salesman.name,
        value: salesman.employeeId || salesman.id
    })), [salesmanData]);

 const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.deliveryNoteMasterId) return;
        navigate(`/transaction/delivery-note/edit-delivery-note/${row.deliveryNoteMasterId}`);
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                fromDate:          filters.fromDate,
                toDate:            filters.toDate,
                branchId:          Number(selectedBranchId),
                currencyId:        currentCurrency?.currencyId || 1,
                partyName:         "All",
                userId:            userId || 1,
                ledgerId:          filters.ledgerId || 0,
                orderId:           0,
                quotationMasterId: 0,
                salesManId:        filters.salesManId || 0,
                condition:         "",
                isAccountsPosting: filters.isAccountsPosting,
                mode: filters.reportType || 'Detailed'
            };


            const response = await axiosInstance.post("delivery-note-detailed-report", payload);
            

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
                setAlert({ id: Date.now(), type: 'info', message: t('No data found for the selected filters') });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching delivery note report:", error);
            setAlert({ id: Date.now(), type: 'error', message: error.response?.data?.message || error.message });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // ─── Define columns for both modes ───────────────────────────────────────────
    const summaryColumns = useMemo(() => [
        { key: 'date', label: t('Date'), align: 'center', width: '100' },
        { key: 'deliveryNoteNo', label: t('Delivery No'), align: 'center', width: '120' },
        { key: 'customerName', label: t('Customer'), align: 'left', width: '180' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'totalAmount', label: t('Total Amount'), align: 'right', width: '120' },
        { key: 'billDiscount', label: t('Discount'), align: 'right', width: '100' },
        { key: 'taxableAmt', label: t('Taxable Amount'), align: 'right', width: '120' },
        { key: 'totalTax', label: t('Tax Amount'), align: 'right', width: '120' },
        { key: 'grandAmount', label: t('Grand Total'), align: 'right', width: '120' },
        { key: 'BillPending', label: t('Status'), align: 'center', width: '100' }
    ], [t]);

    const detailedColumns = useMemo(() => [
        { key: 'date', label: t('Date'), align: 'center', width: '100' },
        { key: 'deliveryNoteNo', label: t('Delivery No'), align: 'center', width: '120' },
        { key: 'customerName', label: t('Customer'), align: 'left', width: '160' },
        { key: 'CostCentre', label: t('Cost Centre'), align: 'left', width: '120' },
        { key: 'productCode', label: t('Item Code'), align: 'left', width: '100' },
        { key: 'productName', label: t('Product'), align: 'left', width: '180' },
        { key: 'UnitName', label: t('Unit'), align: 'center', width: '80' },
        { key: 'qty', label: t('Qty'), align: 'right', width: '80' },
        { key: 'rate', label: t('Rate'), align: 'right', width: '100' },
        { key: 'grossAmount', label: t('Gross Amount'), align: 'right', width: '120' },
        { key: 'taxableAmt', label: t('Taxable'), align: 'right', width: '120' },
        { key: 'taxAmount', label: t('Tax Amount'), align: 'right', width: '120' },
        { key: 'amount', label: t('Total Amount'), align: 'right', width: '120' },
        { key: 'BillPending', label: t('Status'), align: 'center', width: '100' }
    ], [t]);

    // Choose active columns based on mode
    const activeColumns = useMemo(() => 
        filters.reportType === 'Summary' ? summaryColumns : detailedColumns,
        [filters.reportType, summaryColumns, detailedColumns]
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
        if (key === 'BillPending') {
            const isPending = row.BillPending === true;
            const statusText = isPending ? t('Pending') : t('Billed');
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
            'qty', 'rate', 'grossAmount', 'taxableAmt', 'taxAmount', 'amount',
            'totalAmount', 'billDiscount', 'totalTax', 'grandAmount'
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
            case 'deliveryNoteNo': 
                return getValue('deliveryNoteNo', ['voucherno', 'voucherNo']);
            case 'date': 
                return getValue('date', ['deliverydate', 'deliveryDate']);
            case 'customerName': 
                return getValue('customerName', ['ledgerName', 'Party']);
            case 'CostCentre': 
                return getValue('CostCentre', ['costCentre']);
            case 'productCode':
                return getValue('productCode', ['ProductCode']);
            case 'productName': 
                return getValue('productName', ['ProductName']);
            case 'UnitName': 
                return getValue('UnitName', ['unitName', 'unit']);
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

        if (filters.reportType === 'Summary') {
            return {
                SNo: '',
                date: '',
                deliveryNoteNo: <strong>{t('Total')}</strong>,
                customerName: '',
                CostCentre: '',
                totalAmount: sumOf('totalAmount').toFixed(decimalPart),
                billDiscount: sumOf('billDiscount').toFixed(decimalPart),
                taxableAmt: sumOf('taxableAmt', 'taxableAmount').toFixed(decimalPart),
                totalTax: sumOf('totalTax').toFixed(decimalPart),
                grandAmount: sumOf('grandAmount').toFixed(decimalPart),
                BillPending: ''
            };
        }

        // Detailed mode
        return {
            SNo: '',
            date: '',
            deliveryNoteNo: <strong>{t('Total')}</strong>,
            customerName: '',
            CostCentre: '',
            productCode: '',
            productName: '',
            UnitName: '',
            qty: sumOf('qty', 'Qty').toFixed(3),
            rate: '',
            grossAmount: sumOf('grossAmount', 'GrossAmount').toFixed(decimalPart),
            taxableAmt: sumOf('taxableAmt', 'TaxableAmt').toFixed(decimalPart),
            taxAmount: sumOf('taxAmount', 'TaxAmount').toFixed(decimalPart),
            amount: sumOf('amount', 'Amount', 'totalamount').toFixed(decimalPart),
            BillPending: ''
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.reportType]);

    // ─── Export ──────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportType === 'Summary') {
            const exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row.date || '',
                DeliveryNo: row.deliveryNoteNo || '',
                Customer: row.customerName || '',
                CostCentre: row.CostCentre || '',
                TotalAmount: Number(row.totalAmount || 0).toFixed(decimalPart),
                Discount: Number(row.billDiscount || 0).toFixed(decimalPart),
                TaxableAmount: Number(row.taxableAmt || 0).toFixed(decimalPart),
                TaxAmount: Number(row.totalTax || 0).toFixed(decimalPart),
                GrandTotal: Number(row.grandAmount || 0).toFixed(decimalPart),
                Status: row.BillPending === true ? t('Pending') : t('Billed')
            }));

            return {
                fileName: 'Delivery_Note_Summary_Report',
                sheetName: 'Summary',
                title: t('Delivery Note Summary Report'),
                subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: 'Date', align: 'center', width: 10 },
                    { key: 'DeliveryNo', label: 'Delivery No', align: 'left', width: 12 },
                    { key: 'Customer', label: 'Customer', align: 'left', width: 18 },
                    { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                    { key: 'TotalAmount', label: 'Total Amount', align: 'right', width: 12 },
                    { key: 'Discount', label: 'Discount', align: 'right', width: 10 },
                    { key: 'TaxableAmount', label: 'Taxable Amount', align: 'right', width: 12 },
                    { key: 'TaxAmount', label: 'Tax Amount', align: 'right', width: 12 },
                    { key: 'GrandTotal', label: 'Grand Total', align: 'right', width: 12 },
                    { key: 'Status', label: 'Status', align: 'center', width: 10 }
                ]
            };
        }

        // Detailed mode export
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Date: row.date || '',
            DeliveryNo: row.deliveryNoteNo || '',
            Customer: row.customerName || '',
            CostCentre: row.CostCentre || '',
            ItemCode: row.productCode || '',
            Product: row.productName || '',
            Unit: row.UnitName || '',
            Qty: Number(row.qty || 0).toFixed(3),
            Rate: Number(row.rate || 0).toFixed(decimalPart),
            GrossAmount: Number(row.grossAmount || 0).toFixed(decimalPart),
            Taxable: Number(row.taxableAmt || 0).toFixed(decimalPart),
            TaxAmount: Number(row.taxAmount || 0).toFixed(decimalPart),
            TotalAmount: Number(row.amount || row.totalamount || 0).toFixed(decimalPart),
            Status: row.BillPending === true ? t('Pending') : t('Billed')
        }));

        return {
            fileName: 'Delivery_Note_Detailed_Report',
            sheetName: 'Detailed',
            title: t('Delivery Note Detailed Report'),
            subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: 'Date', align: 'center', width: 10 },
                { key: 'DeliveryNo', label: 'Delivery No', align: 'left', width: 12 },
                { key: 'Customer', label: 'Customer', align: 'left', width: 18 },
                { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                { key: 'ItemCode', label: 'Item Code', align: 'left', width: 10 },
                { key: 'Product', label: 'Product', align: 'left', width: 18 },
                { key: 'Unit', label: 'Unit', align: 'center', width: 8 },
                { key: 'Qty', label: 'Qty', align: 'right', width: 8 },
                { key: 'Rate', label: 'Rate', align: 'right', width: 10 },
                { key: 'GrossAmount', label: 'Gross Amount', align: 'right', width: 12 },
                { key: 'Taxable', label: 'Taxable', align: 'right', width: 12 },
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

    // ─── Filter handlers ─────────────────────────────────────────────────────────
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'reportType') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            ledgerId: 0,
            salesManId: 0,
            isAccountsPosting: false,
            reportType: 'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    // Dynamic report title
    const reportTitle = filters.reportType === 'Summary' 
        ? t('Delivery Note Summary Report') 
        : t('Delivery Note Detailed Report');

    // ─── Render ───────────────────────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" }, 
                        { title: t("Delivery Note Report"), url: "#" }
                    ]}
                    heading={{ icon: Truck, title: reportTitle }}
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
                        { title: t("Delivery Note Report"), url: "#" }
                    ]}
                    heading={{ icon: Truck, title: reportTitle }}
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
                    { title: t("Delivery Note Report"), url: "#" }
                ]}
                heading={{ icon: Truck, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <DeliveryNoteDetailedReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    customerOptions={customerOptions}
                    salesmanOptions={salesmanOptions}
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
                    tableId="delivery-note-detailed-report-table"
                    pageSize={50}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 280px)"
                    stickyActions={false}
                    onRowClick={handleRowClick}
                    // ✅ Row merging only in Detailed mode
                    groupBy={filters.reportType === 'Detailed' ? 'deliveryNoteNo' : null}
                    mergedColumns={filters.reportType === 'Detailed' ? [
                        'SNo', 'date', 'deliveryNoteNo', 'customerName', 'CostCentre', 'BillPending'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default DeliveryNoteDetailedReport;