// src/components/pages/Reports/SalesReport/SalesReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ShoppingCart } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesReportFilter from '../SalesReport/SalesReportFilter'
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesProfitReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [customerData, setCustomerData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);
    const [batchData, setBatchData] = useState([]);

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
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Report");
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
        reportMode: 'Summary',
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        selectedBranchId: null,   // ← new
        ledgerId: null,
        costCentreId: null,
        batchId: null,
        paymentMode: null,
        taxType: 'Applicable to product',
        condition: 'All',
        dueOn: null,
        optional: false,
        package: false,
        isAccountsOnly: false,
        isAccountsPosting: false,
        partyName: null
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [customersRes, costCentreRes, batchRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer", "Customer&Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("batches").catch(() => ({ data: { data: [] } }))
            ]);

            setCustomerData(customersRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
            setBatchData(batchRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Dropdown options
    const customerOptions = useMemo(() => {
        return customerData.map(customer => ({
            label: customer.ledgerName,
            value: customer.ledgerId
        }));
    }, [customerData]);

    const costCentreOptions = useMemo(() => {
        return costCentreData.map(cc => ({
            label: cc.CostCentre || cc.costCentreName,
            value: cc.costCentreId
        }));
    }, [costCentreData]);

    const batchOptions = useMemo(() => {
        return batchData.map(batch => ({
            label: batch.batchName || batch.BatchName,
            value: batch.batchId || batch.BatchId
        }));
    }, [batchData]);

    const taxTypeOptions = [
        { label: 'NA', value: 'NA' },
        { label: 'Applicable to product', value: 'Applicable to product' }
    ];

    const conditionOptions = [
        { label: t('salesReport.filters.conditionAll'), value: 'All' },
        { label: t('salesReport.filters.conditionFull'), value: 'Full' },
        { label: t('salesReport.filters.conditionPartial'), value: 'Partial' },
        { label: t('salesReport.filters.conditionUnpaid'), value: 'Unpaid' },
        { label: t('salesReport.filters.conditionDue'), value: 'Due' }
    ];

    const paymentModeOptions = [
        { label: t('salesReport.filters.paymentModeAll'), value: null },
        { label: t('salesReport.filters.paymentModeCash'), value: 'cash' },
        { label: t('salesReport.filters.paymentModeBank'), value: 'bank' },
        { label: t('salesReport.filters.paymentModeCredit'), value: 'credit' }
    ];

    // Format datetime for API
    const formatDateTimeForAPI = (dateString, isEndOfDay = false) => {
        if (!dateString) return null;
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
            const isSummary = filters.reportMode === 'Summary';
            const endpoint = isSummary ? "sales-summary-report" : "sales-report";
            const resolvedBranchId = isMainBranch
                ? (filters.selectedBranchId ?? null)          // null = All
                : Number(selectedBranchId);
            const payload = isSummary ? {
                reportType: filters.condition || 'All',
                branchId: resolvedBranchId,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                ledgerId: filters.ledgerId || null,
                finacUserId: null,
                posUserId: null,
                posCounterId: null,
                salesmanId: null,
                isAccountsPosting: filters.isAccountsPosting,
                currencyId: currentCurrency?.currencyId || 1
            } : {
                fromDate: formatDateTimeForAPI(filters.fromDate, false),
                toDate: formatDateTimeForAPI(filters.toDate, true),
                branchId: resolvedBranchId,
                ledgerId: filters.ledgerId || null,
                costCentreId: filters.costCentreId || null,
                batchId: filters.batchId || null,
                paymentMode: filters.paymentMode || null,
                taxType: filters.taxType,
                condition: filters.condition,
                dueOn: filters.dueOn ? formatDateTimeForAPI(filters.dueOn, true) : null,
                optional: filters.optional,
                package: filters.package,
                isAccountsOnly: filters.isAccountsOnly,
                isAccountsPosting: filters.isAccountsPosting,
                partyName: filters.partyName || null,
                currencyId: currentCurrency?.currencyId || 1
            };


            const response = await axiosInstance.post(endpoint, payload);
            const data = response.data.data || response.data;


            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));

            if (!dataWithSNo || dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('salesReport.messages.noDataFound')
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching sales report:", error);
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

    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.salesMasterId) return;
        navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.salesMasterId}`);
    };

    // Define columns for ContentTable
    const columns = useMemo(() => {
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            return [
                { key: 'SNo', label: '#', align: 'center', width: '60' },
                { key: 'Date', label: t('salesSummaryReport.grid.columns.date') || 'Date', align: 'center', width: '110' },
                { key: 'InvoiceNo', label: t('salesSummaryReport.grid.columns.invoiceNo') || 'Invoice No', align: 'center', width: '130' },
                { key: 'Type', label: t('salesSummaryReport.grid.columns.type') || 'Type', align: 'center', width: '120' },
                { key: 'Party', label: t('salesSummaryReport.grid.columns.party') || 'Party', align: 'left', width: '180' },
                { key: 'Salesman', label: t('salesSummaryReport.grid.columns.salesman') || 'Salesman', align: 'left', width: '140' },
                // { key: 'Qty', label: t('Qty') || 'Qty', align: 'center', width: '140' },
                { key: 'PurchaseRate', label: t('PurchaseRate'), align: 'right', width: '140' },
                { key: 'NetAmount', label: t('NetAmount'), align: 'right', width: '140' },
                { key: 'TotalAmount', label: t('salesSummaryReport.grid.columns.totalAmount') || 'Total Amount', align: 'right', width: '120' },
                { key: 'BillDiscount', label: t('salesSummaryReport.grid.columns.discount') || 'Discount', align: 'right', width: '100' },
                { key: 'TaxableAmt', label: t('salesSummaryReport.grid.columns.taxableAmount') || 'Taxable Amt', align: 'right', width: '120' },
                { key: 'TotalTax', label: t('salesSummaryReport.grid.columns.taxAmount') || 'Total Tax', align: 'right', width: '100' },
                { key: 'BillAmount', label: t('salesSummaryReport.grid.columns.billAmount') || 'Bill Amount', align: 'right', width: '120' },
                { key: 'CashAmount', label: t('salesSummaryReport.grid.columns.cash') || 'Cash', align: 'right', width: '100' },
                { key: 'BankAmount', label: t('salesSummaryReport.grid.columns.bank') || 'Bank', align: 'right', width: '100' },
                { key: 'CreditAmount', label: t('salesSummaryReport.grid.columns.credit') || 'Credit', align: 'right', width: '110' },
                { key: 'ProfitAmt', label: t('salesSummaryReport.grid.columns.ProfitAmt') || 'Credit', align: 'right', width: '110' },
                { key: 'ProfitPercentage', label: t('salesSummaryReport.grid.columns.ProfitPercentage') || 'Credit', align: 'center', width: '110' },
                { key: 'DoneBy', label: t('salesSummaryReport.grid.columns.doneBy') || 'Done By', align: 'center', width: '110' }
            ];
        }

        return [
            { key: 'SNo', label: '#', align: 'center', width: '50' },
            { key: 'date', label: t('salesReport.grid.columns.date'), align: 'center', width: '100' },
            { key: 'invoiceNo', label: t('salesReport.grid.columns.invoiceNo'), align: 'center', width: '120' },
            { key: 'customerName', label: t('salesReport.grid.columns.customer'), align: 'left', width: '180' },
            { key: 'productName', label: t('salesReport.grid.columns.product'), align: 'left', width: '180' },
            { key: 'unitName', label: t('salesReport.grid.columns.unit'), align: 'center', width: '80' },
            { key: 'qty', label: t('salesReport.grid.columns.qty'), align: 'right', width: '80' },
            { key: 'rate', label: t('salesReport.grid.columns.rate'), align: 'right', width: '100' },
            { key: 'grossAmount', label: t('salesReport.grid.columns.grossAmount'), align: 'right', width: '120' },
            { key: 'BillDiscount', label: t('salesReport.grid.columns.discount'), align: 'right', width: '100' },
            { key: 'taxableAmt', label: t('salesReport.grid.columns.taxableAmount'), align: 'right', width: '120' },
            { key: 'taxAmount', label: t('salesReport.grid.columns.taxAmount'), align: 'right', width: '120' },
            { key: 'amount', label: t('salesReport.grid.columns.amount'), align: 'right', width: '120' }
        ];
    }, [t, generalSettings?.decimalPart, filters.reportMode]);

    // Custom cell renderer for formatting numbers
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;

  if (filters.reportMode === 'Summary') {
    const numericFields = [
        'TotalAmount', 'BillDiscount', 'TaxableAmt', 'TotalTax',
        'BillAmount', 'CashAmount', 'BankAmount', 'CreditAmount',
        'ProfitAmt', 'ProfitPercentage', 'NetAmount', 'PurchaseRate'
    ];

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
}

        // Detailed mode rendering
        const getValue = (primaryKey, altKeys = []) => {
            if (row[primaryKey] !== undefined && row[primaryKey] !== null) {
                return row[primaryKey];
            }
            for (let altKey of altKeys) {
                if (row[altKey] !== undefined && row[altKey] !== null) {
                    return row[altKey];
                }
            }
            return null;
        };

        switch (key) {
            case 'SNo':
                return <div className="text-center">{row.SNo}</div>;

            case 'date':
                return getValue('date', ['Date', 'invoiceDate']) || '-';

            case 'invoiceNo':
                return getValue('invoiceNo', ['InvoiceNo', 'voucherNo']) || '-';

            case 'customerName':
                return getValue('customerName', ['CustomerName', 'ledgerName', 'Party']) || '-';

            case 'productName':
                return getValue('productName', ['ProductName']) || '-';

            case 'unitName':
                return getValue('unitName', ['UnitName']) || '-';

            case 'qty':
                const qty = getValue('qty', ['Qty']);
                return qty !== null ? Number(qty).toFixed(3) : '-';

            case 'rate':
                const rate = getValue('rate', ['Rate']);
                return rate !== null ? Number(rate).toFixed(decimalPart) : '-';

            case 'grossAmount':
                const gross = getValue('grossAmount', ['GrossAmount']);
                return gross !== null ? Number(gross).toFixed(decimalPart) : '-';

            case 'BillDiscount':
                const discount = getValue('BillDiscount', ['billDiscount']);
                return discount !== null ? Number(discount).toFixed(decimalPart) : '-';

            case 'taxableAmt':
                const taxable = getValue('taxableAmt', ['TaxableAmt']);
                return taxable !== null ? Number(taxable).toFixed(decimalPart) : '-';

            case 'taxAmount':
                const tax = getValue('taxAmount', ['TaxAmount']);
                return tax !== null ? Number(tax).toFixed(decimalPart) : '-';

            case 'amount':
                const amount = getValue('amount', ['Amount', 'totalAmount']);
                return amount !== null ? Number(amount).toFixed(decimalPart) : '-';

            default:
                return row[key] ?? '-';
        }
    };

    // Calculate totals for footer
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

        if (filters.reportMode === 'Summary') {
         return {
    SNo: '',
    Date: '',
    InvoiceNo: '',
    Type: '',
    Party: <strong>{t('salesSummaryReport.grid.total') || 'Total'}</strong>,
    Salesman: '',
    TotalAmount: calculateSum('TotalAmount').toFixed(decimalPart),
    Qty: calculateSum('Qty').toFixed(decimalPart),
    PurchaseRate: calculateSum('PurchaseRate').toFixed(decimalPart),
    NetAmount: calculateSum('NetAmount').toFixed(decimalPart),
    BillDiscount: calculateSum('BillDiscount').toFixed(decimalPart),
    TaxableAmt: calculateSum('TaxableAmt').toFixed(decimalPart),
    TotalTax: calculateSum('TotalTax').toFixed(decimalPart),
    BillAmount: calculateSum('BillAmount').toFixed(decimalPart),
    CashAmount: calculateSum('CashAmount').toFixed(decimalPart),
    ProfitAmt: calculateSum('ProfitAmt').toFixed(decimalPart),
    BankAmount: calculateSum('BankAmount').toFixed(decimalPart),
    CreditAmount: calculateSum('CreditAmount').toFixed(decimalPart),
    DoneBy: ''
};
        } else {
            return {
                SNo: '',
                date: '',
                invoiceNo: '',
                customerName: <strong>{t('salesReport.grid.total')}</strong>,
                productName: '',
                unitName: '',
                qty: (calculateSum('qty') || calculateSum('Qty')).toFixed(3),
                rate: '',
                grossAmount: (calculateSum('grossAmount') || calculateSum('GrossAmount')).toFixed(decimalPart),
                BillDiscount: calculateSum('BillDiscount').toFixed(decimalPart),
                taxableAmt: (calculateSum('taxableAmt') || calculateSum('TaxableAmt')).toFixed(decimalPart),
                taxAmount: (calculateSum('taxAmount') || calculateSum('TaxAmount')).toFixed(decimalPart),
                amount: (calculateSum('amount') || calculateSum('Amount') || calculateSum('totalAmount')).toFixed(decimalPart)
            };
        }
    }, [reportData, generalSettings?.decimalPart, t, filters.reportMode]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            reportMode: 'Summary',
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            selectedBranchId: null,   // ← new
            ledgerId: null,
            costCentreId: null,
            batchId: null,
            paymentMode: null,
            taxType: 'Applicable to product',
            condition: 'All',
            dueOn: null,
            optional: false,
            package: false,
            isAccountsOnly: false,
            isAccountsPosting: false,
            partyName: null
        });
        setReportData(null);
        setAlert(null);
    };

    /* ------------------------------ Export Configuration ------------------------------ */
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            const exportData = reportData.map((row) => ({
                SlNo: row.SNo || row.SlNo,
                Date: row.Date,
                InvoiceNo: row.InvoiceNo,
                Type: row.Type,
                Party: row.Party,
                Salesman: row.Salesman || '',
                TotalAmount: Number(row.TotalAmount || 0).toFixed(decimalPart),
                BillDiscount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxableAmt: Number(row.TaxableAmt || 0).toFixed(decimalPart),
                TotalTax: Number(row.TotalTax || 0).toFixed(decimalPart),
                BillAmount: Number(row.BillAmount || 0).toFixed(decimalPart),
                CashAmount: Number(row.CashAmount || 0).toFixed(decimalPart),
                BankAmount: Number(row.BankAmount || 0).toFixed(decimalPart),
                CreditAmount: Number(row.CreditAmount || 0).toFixed(decimalPart),
                DoneBy: row.DoneBy || ''
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
                    { key: 'Date', label: t('salesSummaryReport.grid.columns.date') || 'Date', align: 'center', width: 10 },
                    { key: 'InvoiceNo', label: t('salesSummaryReport.grid.columns.invoiceNo') || 'Invoice No', align: 'center', width: 12 },
                    { key: 'Type', label: t('salesSummaryReport.grid.columns.type') || 'Type', align: 'center', width: 10 },
                    { key: 'Party', label: t('salesSummaryReport.grid.columns.party') || 'Party', align: 'left', width: 18 },
                    { key: 'Salesman', label: t('salesSummaryReport.grid.columns.salesman') || 'Salesman', align: 'left', width: 12 },
                    { key: 'TotalAmount', label: t('salesSummaryReport.grid.columns.totalAmount') || 'Total Amount', align: 'right', width: 10 },
                    { key: 'BillDiscount', label: t('salesSummaryReport.grid.columns.discount') || 'Discount', align: 'right', width: 8 },
                    { key: 'TaxableAmt', label: t('salesSummaryReport.grid.columns.taxableAmount') || 'Taxable Amt', align: 'right', width: 10 },
                    { key: 'TotalTax', label: t('salesSummaryReport.grid.columns.taxAmount') || 'Tax Amount', align: 'right', width: 8 },
                    { key: 'BillAmount', label: t('salesSummaryReport.grid.columns.billAmount') || 'Bill Amount', align: 'right', width: 10 },
                    { key: 'CashAmount', label: t('salesSummaryReport.grid.columns.cash') || 'Cash', align: 'right', width: 8 },
                    { key: 'BankAmount', label: t('salesSummaryReport.grid.columns.bank') || 'Bank', align: 'right', width: 8 },
                    { key: 'CreditAmount', label: t('salesSummaryReport.grid.columns.credit') || 'Credit', align: 'right', width: 8 },
                    { key: 'DoneBy', label: t('salesSummaryReport.grid.columns.doneBy') || 'Done By', align: 'center', width: 8 }
                ]
            };
        } else {
            const exportData = reportData.map((row) => ({
                SNo: row.SNo,
                Date: row.date || row.Date || row.invoiceDate || '',
                InvoiceNo: row.invoiceNo || row.InvoiceNo || row.voucherNo || '',
                Customer: row.customerName || row.CustomerName || row.ledgerName || row.Party || '',
                Product: row.productName || row.ProductName || '',
                Unit: row.unitName || row.UnitName || '',
                Qty: Number(row.qty || row.Qty || 0).toFixed(3),
                Rate: Number(row.rate || row.Rate || 0).toFixed(decimalPart),
                GrossAmount: Number(row.grossAmount || row.GrossAmount || 0).toFixed(decimalPart),
                Discount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxableAmount: Number(row.taxableAmt || row.TaxableAmt || 0).toFixed(decimalPart),
                TaxAmount: Number(row.taxAmount || row.TaxAmount || 0).toFixed(decimalPart),
                Amount: Number(row.amount || row.Amount || 0).toFixed(decimalPart)
            }));

            return {
                fileName: 'Sales_Report',
                sheetName: 'Sales Report',
                title: t('salesReport.breadcrumb.title'),
                subtitle: `${t('common.fromDate')}: ${filters.fromDate} | ${t('common.toDate')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: t('salesReport.grid.columns.date'), align: 'center', width: 10 },
                    { key: 'InvoiceNo', label: t('salesReport.grid.columns.invoiceNo'), align: 'center', width: 12 },
                    { key: 'Customer', label: t('salesReport.grid.columns.customer'), align: 'left', width: 18 },
                    { key: 'Product', label: t('salesReport.grid.columns.product'), align: 'left', width: 18 },
                    { key: 'Unit', label: t('salesReport.grid.columns.unit'), align: 'center', width: 8 },
                    { key: 'Qty', label: t('salesReport.grid.columns.qty'), align: 'right', width: 8 },
                    { key: 'Rate', label: t('salesReport.grid.columns.rate'), align: 'right', width: 10 },
                    { key: 'GrossAmount', label: t('salesReport.grid.columns.grossAmount'), align: 'right', width: 10 },
                    { key: 'Discount', label: t('salesReport.grid.columns.discount'), align: 'right', width: 8 },
                    { key: 'TaxableAmount', label: t('salesReport.grid.columns.taxableAmount'), align: 'right', width: 10 },
                    { key: 'TaxAmount', label: t('salesReport.grid.columns.taxAmount'), align: 'right', width: 10 },
                    { key: 'Amount', label: t('salesReport.grid.columns.amount'), align: 'right', width: 10 }
                ]
            };
        }
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesReport.messages.noDataToExport') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesReport.messages.noDataToExport') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('salesReport.messages.noDataToExport') });
            return;
        }
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("salesProfitReport.breadcrumb.group"), url: "#" },
                        {
                            title: filters.reportMode === 'Summary'
                                ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                                : t("salesProfitReport.breadcrumb.title"),
                            url: "#"
                        },
                    ]}
                    heading={{
                        icon: ShoppingCart,
                        title: filters.reportMode === 'Summary'
                            ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                            : t("salesProfitReport.breadcrumb.title")
                    }}
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
                        { title: t("salesProfitReport.breadcrumb.group"), url: "#" },
                        {
                            title: filters.reportMode === 'Summary'
                                ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                                : t("salesProfitReport.breadcrumb.title"),
                            url: "#"
                        },
                    ]}
                    heading={{
                        icon: ShoppingCart,
                        title: filters.reportMode === 'Summary'
                            ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                            : t("salesProfitReport.breadcrumb.title")
                    }}
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
                    { title: t("salesProfitReport.breadcrumb.group"), url: "#" },
                    {
                        title: filters.reportMode === 'Summary'
                            ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                            : t("salesProfitReport.breadcrumb.title"),
                        url: "#"
                    },
                ]}
                heading={{
                    icon: ShoppingCart,
                    title: filters.reportMode === 'Summary'
                        ? t("salesProfitReport.breadcrumb.title") || "Sales Summary Report"
                        : t("salesProfitReport.breadcrumb.title")
                }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('salesProfitReport.export.label')
                } : null}
            />

            <div className="px-1">
                <SalesReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    customerOptions={customerOptions}
                    costCentreOptions={costCentreOptions}
                    batchOptions={batchOptions}
                    taxTypeOptions={taxTypeOptions}
                    conditionOptions={conditionOptions}
                    paymentModeOptions={paymentModeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                    branchOptions={branchOptions}
                    isMainBranch={isMainBranch}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable={true}
                    serverPagination={false}
                    tableId="sales-report-table"
                    pageSize={80}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 295px)"
                    stickyActions={false}
                    onRowClick={handleRowClick}
                    // ── Grouping: only active in Detailed mode ──
                    groupBy={filters.reportMode === 'Detailed' ? 'salesMasterId' : null}
                    mergedColumns={filters.reportMode === 'Detailed' ? [
                        'SNo', 'date', 'invoiceNo', 'customerName', 'BillDiscount', 'taxableAmt', 'taxAmount', 'amount'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default SalesProfitReport;