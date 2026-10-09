// src/components/pages/Reports/SalesReturnDetailedReport/SalesReturnDetailedReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { RotateCcw } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SalesReturnDetailedReportFilter from './SalesReturnDetailedReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesReturnDetailedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [customerData, setCustomerData] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Return Report");
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
        ledgerId: 0,
        salesManId: 0,
        costCentreId: 0,
        isAccountsPosting: false,
        isPosted: false,
        isCancelled: false,
        taxType: 'Applicable to product',
        reportType: 'Detailed'
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [customersRes, salesmanRes, costCentreRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer","Customer&Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } }))
            ]);

            setCustomerData(customersRes.data.data || []);
            setSalesmanData(salesmanRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const customerOptions = useMemo(() => customerData.map(c => ({
        label: c.ledgerName,
        value: c.ledgerId
    })), [customerData]);

    const salesmanOptions = useMemo(() => salesmanData.map(s => ({
        label: s.employeeName || s.name,
        value: s.employeeId || s.id
    })), [salesmanData]);

    const costCentreOptions = useMemo(() => costCentreData.map(cc => ({
        label: cc.CostCentre || cc.costCentreName,
        value: cc.costCentreId
    })), [costCentreData]);

    const taxTypeOptions = [
        { label: 'None', value: 'None' },
        { label: 'Applicable to product', value: 'Applicable to product' }
    ];

    // ─── Fetch Report ─────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            let endpoint, payload;

            if (filters.reportType === 'Detailed') {
                endpoint = "sales-return-detailed-report";
                payload = {
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    branchId: Number(selectedBranchId),
                    ledgerId: filters.ledgerId || 0,
                    salesMasterId: 0,
                    salesManId: filters.salesManId || 0,
                    costCentreId: filters.costCentreId || 0,
                    currencyId: currentCurrency?.currencyId || 1,
                    userId: userId || 1,
                    isAccountsPosting: filters.isAccountsPosting,
                    isPosted: filters.isPosted,
                    isCancelled: filters.isCancelled,
                    taxType: filters.taxType
                };
            } else {
                endpoint = "sales-return-summary-report";
                payload = {
                    branchId: Number(selectedBranchId) || null,
                    ledgerId: filters.ledgerId || null,
                    fromDate: filters.fromDate,
                    toDate: filters.toDate,
                    salesManId: filters.salesManId || null,
                    finacUserId: userId || null,
                    reportType: "All",
                    isAccountsPosting: filters.isAccountsPosting
                };
            }


            const response = await axiosInstance.post(endpoint, payload);
            const data = response.data.data || response.data;


            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: item.SNo || item.SlNo || item.SlNO || (index + 1)
            }));

            if (!dataWithSNo || dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('salesReturnReport.messages.noDataFound') || 'No data found for the selected filters.'
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching sales return report:", error);
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
        if (!row.salesReturnMasterId) return;
        navigate(`/transaction/sales-return/return-list/edit-sales-return/${row.salesReturnMasterId}`);
    };
    // ─── Columns ──────────────────────────────────────────────────────────────────
    const columns = useMemo(() => {
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportType === 'Summary') {
            return [
                { key: 'SNo',          label: '#',                                                          align: 'center', width: '60'  },
                { key: 'ReturnDate',   label: t('salesReturnReport.grid.columns.date')         || 'Date',           align: 'center', width: '110' },
                { key: 'ReturnNo',     label: t('salesReturnReport.grid.columns.voucherNo')    || 'Return No',      align: 'center', width: '130' },
                { key: 'Type',         label: t('salesReturnReport.grid.columns.type')         || 'Type',            align: 'center', width: '120' },
                { key: 'Party',        label: t('salesReturnReport.grid.columns.party')        || 'Party',           align: 'left',   width: '180' },
                { key: 'Salesman',     label: t('salesReturnReport.grid.columns.salesman')     || 'Salesman',        align: 'left',   width: '140' },
                // { key: 'TotalAmount',  label: t('salesReturnReport.grid.columns.totalAmount')  || 'Total Amount',    align: 'right',  width: '120' },
                { key: 'BillDiscount', label: t('salesReturnReport.grid.columns.discount')     || 'Discount',        align: 'right',  width: '100' },
                { key: 'TaxableAmt',   label: t('salesReturnReport.grid.columns.taxableAmount')|| 'Taxable Amt',     align: 'right',  width: '120' },
                { key: 'TotalTax',     label: t('salesReturnReport.grid.columns.taxAmount')    || 'Total Tax',       align: 'right',  width: '100' },
                { key: 'BillAmount',   label: t('salesReturnReport.grid.columns.billAmount')   || 'Bill Amount',     align: 'right',  width: '120' },
                { key: 'CashAmount',   label: t('salesReturnReport.grid.columns.cash')         || 'Cash',            align: 'right',  width: '100' },
                { key: 'BankAmount',   label: t('salesReturnReport.grid.columns.bank')         || 'Bank',            align: 'right',  width: '100' },
                { key: 'CreditAmount', label: t('salesReturnReport.grid.columns.credit')       || 'Credit',          align: 'right',  width: '110' },
                { key: 'DoneBy',       label: t('salesReturnReport.grid.columns.doneBy')       || 'Done By',         align: 'center', width: '110' }
            ];
        }

        // Detailed
        return [
            { key: 'SNo',          label: '#',                                                          align: 'center', width: '50'  },
            { key: 'Date',         label: t('salesReturnReport.grid.columns.date')         || 'Date',           align: 'center', width: '100' },
            { key: 'ReturnNo',     label: t('salesReturnReport.grid.columns.voucherNo')    || 'Return No',      align: 'center', width: '120' },
            { key: 'partyName',    label: t('salesReturnReport.grid.columns.customer')     || 'Customer',        align: 'left',   width: '180' },
            { key: 'productName',  label: t('salesReturnReport.grid.columns.product')      || 'Product',         align: 'left',   width: '200' },
            { key: 'unitName',     label: t('salesReturnReport.grid.columns.unit')         || 'Unit',            align: 'center', width: '80'  },
            { key: 'qty',          label: t('salesReturnReport.grid.columns.qty')          || 'Qty',             align: 'right',  width: '80'  },
            { key: 'rate',         label: t('salesReturnReport.grid.columns.rate')         || 'Rate',            align: 'right',  width: '100' },
            { key: 'grossAmount',  label: t('salesReturnReport.grid.columns.grossAmount')  || 'Gross Amount',    align: 'right',  width: '120' },
            // { key: 'netAmount',    label: t('salesReturnReport.grid.columns.netAmount')    || 'Net Amount',      align: 'right',  width: '120' },
            { key: 'taxAmount',    label: t('salesReturnReport.grid.columns.taxAmount')    || 'Tax Amount',      align: 'right',  width: '120' },
            { key: 'amount',       label: t('salesReturnReport.grid.columns.amount')       || 'Amount',          align: 'right',  width: '120' }
        ];
    }, [t, generalSettings?.decimalPart, filters.reportType]);

    // ─── Cell Renderer ────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const getValue = (primaryKey, altKeys = []) => {
            if (row[primaryKey] !== undefined && row[primaryKey] !== null) return row[primaryKey];
            for (const altKey of altKeys) {
                if (row[altKey] !== undefined && row[altKey] !== null) return row[altKey];
            }
            return null;
        };

        // ── Summary mode ─────────────────────────────────────────────────────────
        if (filters.reportType === 'Summary') {
            const numericFields = [
                'TotalAmount', 'BillDiscount', 'TaxableAmt', 'TotalTax',
                'BillAmount', 'CashAmount', 'BankAmount', 'CreditAmount'
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
            if (key === 'SNo') return <div className="text-center">{row.SNo}</div>;
            return row[key] ?? '-';
        }

        // ── Detailed mode ─────────────────────────────────────────────────────────
        switch (key) {
            case 'SNo':
                return <div className="text-center">{row.SNo}</div>;

            case 'Date':
                return getValue('Date', ['date', 'ReturnDate', 'voucherDate']) || '-';

            case 'ReturnNo':
                return getValue('ReturnNo', ['voucherNo', 'invoiceNo', 'InvoiceNo']) || '-';

            case 'partyName':
                return getValue('partyName', ['Party', 'customerName', 'AccLedger', 'ledgerName']) || '-';

            case 'productName':
                return getValue('productName', ['ProductName']) || '-';

            case 'unitName':
                return getValue('unitName', ['UnitName', 'unit']) || '-';

            case 'qty': {
                const qty = getValue('qty', ['Qty']);
                return qty !== null ? Number(qty).toFixed(3) : '-';
            }

            case 'rate': {
                const rate = getValue('rate', ['Rate']);
                return rate !== null ? Number(rate).toFixed(decimalPart) : '-';
            }

            case 'grossAmount': {
                const gross = getValue('grossAmount', ['GrossAmount']);
                return gross !== null ? Number(gross).toFixed(decimalPart) : '-';
            }

            case 'netAmount': {
                const net = getValue('netAmount', ['NetAmount']);
                return net !== null ? Number(net).toFixed(decimalPart) : '-';
            }

            case 'taxAmount': {
                const tax = getValue('taxAmount', ['TaxAmount']);
                return tax !== null ? Number(tax).toFixed(decimalPart) : '-';
            }

            case 'amount': {
                const amount = getValue('amount', ['Amount', 'totalAmount', 'BillAmount']);
                return amount !== null ? Number(amount).toFixed(decimalPart) : '-';
            }

            default:
                return row[key] ?? '-';
        }
    };

    // ─── Footer Totals ────────────────────────────────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;
        const sum = (key) => reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

        if (filters.reportType === 'Summary') {
            return {
                SNo:          '',
                ReturnDate:   '',
                ReturnNo:     '',
                Type:         '',
                Party:        <strong>{t('salesReturnReport.grid.total') || 'Total'}</strong>,
                Salesman:     '',
                TotalAmount:  sum('TotalAmount').toFixed(decimalPart),
                BillDiscount: sum('BillDiscount').toFixed(decimalPart),
                TaxableAmt:   sum('TaxableAmt').toFixed(decimalPart),
                TotalTax:     sum('TotalTax').toFixed(decimalPart),
                BillAmount:   sum('BillAmount').toFixed(decimalPart),
                CashAmount:   sum('CashAmount').toFixed(decimalPart),
                BankAmount:   sum('BankAmount').toFixed(decimalPart),
                CreditAmount: sum('CreditAmount').toFixed(decimalPart),
                DoneBy:       ''
            };
        }

        // Detailed
        return {
            SNo:          '',
            Date:         '',
            ReturnNo:     '',
            partyName:    <strong>{t('salesReturnReport.grid.total') || 'Total'}</strong>,
            productName:  '',
            unitName:     '',
            qty:          (sum('qty') || sum('Qty')).toFixed(3),
            rate:         '',
            grossAmount:  (sum('grossAmount') || sum('GrossAmount')).toFixed(decimalPart),
            netAmount:    (sum('netAmount') || sum('NetAmount')).toFixed(decimalPart),
            taxAmount:    (sum('taxAmount')  || sum('TaxAmount')).toFixed(decimalPart),
            amount:       (sum('amount')     || sum('Amount') || sum('BillAmount')).toFixed(decimalPart)
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.reportType]);

    // ─── Filter Handlers ──────────────────────────────────────────────────────────
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
            costCentreId: 0,
            isAccountsPosting: false,
            isPosted: false,
            isCancelled: false,
            taxType: 'Applicable to product',
            reportType: 'Detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Export ───────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportType === 'Detailed') {
            const exportData = reportData.map((row, index) => ({
                SNo:           row.SNo || row.SlNo || row.SlNO || (index + 1),
                Date:          row.Date || row.date || row.ReturnDate || '',
                ReturnNo:      row.ReturnNo || row.voucherNo || row.VoucherNo || '',
                Customer:      row.partyName || row.Party || row.customerName || row.AccLedger || '',
                Product:       row.productName  || row.ProductName  || '',
                Unit:          row.unitName     || row.UnitName     || '',
                Qty:           Number(row.qty   || row.Qty          || 0).toFixed(3),
                Rate:          Number(row.rate  || row.Rate         || 0).toFixed(decimalPart),
                GrossAmount:   Number(row.grossAmount || row.GrossAmount || 0).toFixed(decimalPart),
                NetAmount:     Number(row.netAmount  || row.NetAmount  || 0).toFixed(decimalPart),
                TaxAmount:     Number(row.taxAmount   || row.TaxAmount   || 0).toFixed(decimalPart),
                Amount:        Number(row.amount      || row.Amount      || 0).toFixed(decimalPart)
            }));
            return {
                fileName:      'Sales_Return_Detailed_Report',
                sheetName:     'Sales Return Detailed',
                title:         t('salesReturnReport.breadcrumb.detailedTitle') || 'Sales Return Detailed Report',
                subtitle:      `${t('common.fromDate') || 'From'}: ${filters.fromDate} - ${t('common.toDate') || 'To'}: ${filters.toDate}`,
                data:          exportData,
                footer:        footerData,
                theme:         'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SNo',           label: '#',              align: 'center', width: 5  },
                    { key: 'Date',          label: 'Date',           align: 'center', width: 10 },
                    { key: 'ReturnNo',      label: 'Return No',      align: 'center', width: 12 },
                    { key: 'Customer',      label: 'Customer',       align: 'left',   width: 18 },
                    { key: 'Product',       label: 'Product',        align: 'left',   width: 20 },
                    { key: 'Unit',          label: 'Unit',           align: 'center', width: 8  },
                    { key: 'Qty',           label: 'Qty',            align: 'right',  width: 8  },
                    { key: 'Rate',          label: 'Rate',           align: 'right',  width: 10 },
                    { key: 'GrossAmount',   label: 'Gross Amount',   align: 'right',  width: 12 },
                    { key: 'NetAmount',     label: 'Net Amount',     align: 'right',  width: 12 },
                    { key: 'TaxAmount',     label: 'Tax Amount',     align: 'right',  width: 10 },
                    { key: 'Amount',        label: 'Amount',         align: 'right',  width: 10 }
                ]
            };
        }

        // Summary
        const exportData = reportData.map((row, index) => ({
            SNo:           row.SNo || row.SlNo || (index + 1),
            Date:          row.ReturnDate || row.Date || '',
            ReturnNo:      row.ReturnNo || row.VoucherNo || '',
            Type:          row.Type || '',
            Party:         row.Party || row.CustomerName || '',
            Salesman:      row.Salesman || '',
            TotalAmount:   Number(row.TotalAmount  || 0).toFixed(decimalPart),
            BillDiscount:  Number(row.BillDiscount || 0).toFixed(decimalPart),
            TaxableAmt:    Number(row.TaxableAmt   || 0).toFixed(decimalPart),
            TotalTax:      Number(row.TotalTax     || 0).toFixed(decimalPart),
            BillAmount:    Number(row.BillAmount   || 0).toFixed(decimalPart),
            CashAmount:    Number(row.CashAmount   || 0).toFixed(decimalPart),
            BankAmount:    Number(row.BankAmount   || 0).toFixed(decimalPart),
            CreditAmount:  Number(row.CreditAmount || 0).toFixed(decimalPart),
            DoneBy:        row.DoneBy || ''
        }));
        return {
            fileName:      'Sales_Return_Summary_Report',
            sheetName:     'Sales Return Summary',
            title:         t('salesReturnReport.breadcrumb.summaryTitle') || 'Sales Return Summary Report',
            subtitle:      `${t('common.fromDate') || 'From'}: ${filters.fromDate} - ${t('common.toDate') || 'To'}: ${filters.toDate}`,
            data:          exportData,
            footer:        footerData,
            theme:         'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',          label: '#',              align: 'center', width: 5  },
                { key: 'Date',         label: 'Date',           align: 'center', width: 10 },
                { key: 'ReturnNo',     label: 'Return No',      align: 'center', width: 12 },
                { key: 'Type',         label: 'Type',           align: 'center', width: 12 },
                { key: 'Party',        label: 'Party',          align: 'left',   width: 18 },
                { key: 'Salesman',     label: 'Salesman',       align: 'left',   width: 14 },
                { key: 'TotalAmount',  label: 'Total Amount',   align: 'right',  width: 12 },
                { key: 'BillDiscount', label: 'Discount',       align: 'right',  width: 10 },
                { key: 'TaxableAmt',   label: 'Taxable Amt',    align: 'right',  width: 12 },
                { key: 'TotalTax',     label: 'Total Tax',      align: 'right',  width: 10 },
                { key: 'BillAmount',   label: 'Bill Amount',    align: 'right',  width: 12 },
                { key: 'CashAmount',   label: 'Cash',           align: 'right',  width: 10 },
                { key: 'BankAmount',   label: 'Bank',           align: 'right',  width: 10 },
                { key: 'CreditAmount', label: 'Credit',         align: 'right',  width: 10 },
                { key: 'DoneBy',       label: 'Done By',        align: 'center', width: 11 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesReturnReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(options);
    };
    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesReturnReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesReturnReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToCsv(options);
    };

    // ─── Dynamic title ────────────────────────────────────────────────────────────
    const reportTitle = filters.reportType === 'Detailed'
        ? t('salesReturnReport.breadcrumb.detailedTitle') || 'Sales Return Detailed Report'
        : t('salesReturnReport.breadcrumb.summaryTitle') || 'Sales Return Summary Report';

    // ─── Loading / Access guards ──────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t('salesReturnReport.breadcrumb.group') || 'Reports', url: '#' },
                        { title: reportTitle, url: '#' }
                    ]}
                    heading={{ icon: RotateCcw, title: reportTitle }}
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
                        { title: t('salesReturnReport.breadcrumb.group') || 'Reports', url: '#' },
                        { title: reportTitle, url: '#' }
                    ]}
                    heading={{ icon: RotateCcw, title: reportTitle }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && (
                <AlertBox key={alert.id} message={alert.message} type={alert.type} />
            )}

            <BreadCrumb
                routes={[
                    { title: t('salesReturnReport.breadcrumb.group') || 'Reports', url: '#' },
                    { title: reportTitle, url: '#' }
                ]}
                heading={{ icon: RotateCcw, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label:         t('salesReturnReport.export.label') || 'Export'
                } : null}
            />

            <div className="px-1">
                <SalesReturnDetailedReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    customerOptions={customerOptions}
                    salesmanOptions={salesmanOptions}
                    costCentreOptions={costCentreOptions}
                    taxTypeOptions={taxTypeOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    onRowClick={handleRowClick}
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable={true}
                    serverPagination={false}
                    tableId="sales-return-report-table"
                    pageSize={50}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 270px)"
                    stickyActions={false}
                    // Row merging only in Detailed mode — group by ReturnNo
                    groupBy={filters.reportType === 'Detailed' ? 'ReturnNo' : null}
                    mergedColumns={filters.reportType === 'Detailed' ? [
                        'SNo', 'Date', 'ReturnNo', 'partyName'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default SalesReturnDetailedReport;