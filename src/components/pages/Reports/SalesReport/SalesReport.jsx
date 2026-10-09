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
import SalesReportFilter from './SalesReportFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesReport = () => {
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
        selectedBranchId: null,
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

    const getPaidAmount = (row) =>
      (parseFloat(row.CashAmount) || 0) + (parseFloat(row.BankAmount) || 0);

    const getBalanceAmount = (row) => parseFloat(row.CreditAmount) || 0;

    // Fetch Report
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const isSummary = filters.reportMode === 'Summary';
            const endpoint = isSummary ? "sales-summary-report" : "sales-report";
            const resolvedBranchId = isMainBranch
                ? (filters.selectedBranchId ?? null)
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

    // ─── COLUMNS ────────────────────────────────────────────────────────────────
    // FIX: Summary columns now match actual API keys exactly.
    //      Removed CashAmount/BankAmount/CreditAmount (not in API response).
    //      Added OtherCharge, RoundOff, PaidAmount, Balance, ProfitAmt.
    //
    // FIX: Detailed columns use the exact API keys (Date, InvoiceNo capital) so
    //      renderCell doesn't need fragile fallbacks.
    // ────────────────────────────────────────────────────────────────────────────
    const columns = useMemo(() => {
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            return [
                { key: 'SNo',          label: '#',                                                              align: 'center', width: '60'  },
                { key: 'Date',         label: t('salesSummaryReport.grid.columns.date')         || 'Date',      align: 'center', width: '110' },
                { key: 'InvoiceNo',    label: t('salesSummaryReport.grid.columns.invoiceNo')    || 'Invoice No',align: 'center', width: '130' },
                { key: 'Type',         label: t('salesSummaryReport.grid.columns.type')         || 'Type',      align: 'center', width: '120' },
                { key: 'Party',        label: t('salesSummaryReport.grid.columns.party')        || 'Party',     align: 'left',   width: '180' },
                // { key: 'TotalAmount',  label: t('salesSummaryReport.grid.columns.totalAmount')  || 'Total Amt', align: 'right',  width: '120' },
                { key: 'BillDiscount', label: t('salesSummaryReport.grid.columns.discount')     || 'Discount',  align: 'right',  width: '100' },
                { key: 'OtherCharge',  label: t('salesSummaryReport.grid.columns.otherCharge')  || 'Other Chg', align: 'right',  width: '100' },
                { key: 'TaxableAmt',   label: t('salesSummaryReport.grid.columns.taxableAmount')|| 'Taxable Amt',align: 'right', width: '120' },
                { key: 'TotalTax',     label: t('salesSummaryReport.grid.columns.taxAmount')    || 'Tax',       align: 'right',  width: '100' },
                { key: 'RoundOff',     label: t('salesSummaryReport.grid.columns.roundOff')     || 'Round Off', align: 'right',  width: '90'  },
                { key: 'BillAmount',   label: t('salesSummaryReport.grid.columns.billAmount')   || 'Bill Amt',  align: 'right',  width: '120' },
                { key: 'PaidAmount',   label: t('salesSummaryReport.grid.columns.paidAmount')   || 'Paid',      align: 'right',  width: '110' },
                { key: 'Balance',      label: t('salesSummaryReport.grid.columns.balance')      || 'Balance',   align: 'right',  width: '100' },
            ];
        }

        // Detailed mode — keys match API response exactly (capital D / capital I)
        return [
            { key: 'SNo',                label: '#',                                                align: 'center', width: '50'  },
            { key: 'Date',               label: t('salesReport.grid.columns.date'),                 align: 'center', width: '100' },
            { key: 'InvoiceNo',          label: t('salesReport.grid.columns.invoiceNo'),            align: 'center', width: '120' },
            { key: 'customerName',       label: t('salesReport.grid.columns.customer'),             align: 'left',   width: '180' },
            { key: 'productName',        label: t('salesReport.grid.columns.product'),              align: 'left',   width: '180' },
            { key: 'unitName',           label: t('salesReport.grid.columns.unit'),                 align: 'center', width: '80'  },
            { key: 'qty',                label: t('salesReport.grid.columns.qty'),                  align: 'right',  width: '80'  },
            { key: 'rate',               label: t('salesReport.grid.columns.rate'),                 align: 'right',  width: '100' },
            { key: 'grossAmount',        label: t('salesReport.grid.columns.grossAmount'),          align: 'right',  width: '120' },
            { key: 'discountPercentage', label: t('salesReport.grid.columns.discount') || 'Disc%', align: 'right',  width: '80'  },
            { key: 'TaxableAmt',         label: t('salesReport.grid.columns.taxableAmount'),        align: 'right',  width: '120' },
            { key: 'taxAmount',          label: t('salesReport.grid.columns.taxAmount'),            align: 'right',  width: '120' },
            { key: 'amount',             label: t('salesReport.grid.columns.amount'),               align: 'right',  width: '120' },
        ];
    }, [t, generalSettings?.decimalPart, filters.reportMode]);

    // ─── RENDER CELL ────────────────────────────────────────────────────────────
    // FIX: Summary numeric fields now include OtherCharge, RoundOff, PaidAmount,
    //      Balance, ProfitAmt.
    // FIX: Detailed mode uses exact API key names — no more fragile fallback chains.
    // ────────────────────────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            const numericFields = [
                'TotalAmount', 'BillDiscount', 'OtherCharge', 'TaxableAmt',
                'TotalTax', 'RoundOff', 'BillAmount',  'ProfitAmt'
            ];

              if (key === "PaidAmount") {
                return (
                  <div className="text-right tabular-nums">
                    {getPaidAmount(row).toFixed(decimalPart)}
                  </div>
                );
              }

              if (key === "Balance") {
                return (
                  <div className="text-right tabular-nums">
                    {getBalanceAmount(row).toFixed(decimalPart)}
                  </div>
                );
              }

            if (numericFields.includes(key)) {
                const val = Number(row[key]);
                return (
                    <div className="text-right tabular-nums">
                        {!isNaN(val) ? val.toFixed(decimalPart) : '0.00'}
                    </div>
                );
            }

            if (key === 'SNo') return <div className="text-center">{row.SNo}</div>;

            return row[key] ?? '-';
        }

        // ── Detailed mode ──
        switch (key) {
            case 'SNo':
                return <div className="text-center">{row.SNo}</div>;

            // API returns 'Date' (capital D) — column key is now 'Date' too ✓
            case 'Date':
                return row.Date || '-';

            // API returns 'InvoiceNo' (capital I+N) — column key matches ✓
            case 'InvoiceNo':
                return row.InvoiceNo || '-';

            case 'customerName':
                return row.customerName || '-';

            case 'productName':
                return row.productName || '-';

            case 'unitName':
                return row.unitName || '-';

            case 'qty':
                return row.qty !== undefined && row.qty !== null
                    ? Number(row.qty).toFixed(3)
                    : '-';

            case 'rate':
                return row.rate !== undefined && row.rate !== null
                    ? Number(row.rate).toFixed(decimalPart)
                    : '-';

            case 'grossAmount':
                return row.grossAmount !== undefined && row.grossAmount !== null
                    ? Number(row.grossAmount).toFixed(decimalPart)
                    : '-';

            // FIX: use per-line discountPercentage instead of invoice-level BillDiscount
            case 'discountPercentage':
                return row.discountPercentage !== undefined && row.discountPercentage !== null
                    ? Number(row.discountPercentage).toFixed(2)
                    : '0.00';

            // FIX: API key is 'TaxableAmt' (capital T+A) — now matches column key ✓
            case 'TaxableAmt':
                return row.TaxableAmt !== undefined && row.TaxableAmt !== null
                    ? Number(row.TaxableAmt).toFixed(decimalPart)
                    : '-';

            case 'taxAmount':
                return row.taxAmount !== undefined && row.taxAmount !== null
                    ? Number(row.taxAmount).toFixed(decimalPart)
                    : '-';

            case 'amount':
                return row.amount !== undefined && row.amount !== null
                    ? Number(row.amount).toFixed(decimalPart)
                    : '-';

            default:
                return row[key] ?? '-';
        }
    };

    // ─── FOOTER TOTALS ──────────────────────────────────────────────────────────
    // FIX: Summary footer now totals all actual API fields (removed CashAmount,
    //      BankAmount, CreditAmount; added OtherCharge, RoundOff, PaidAmount,
    //      Balance, ProfitAmt).
    // FIX: Detailed footer uses exact API key 'TaxableAmt' (was 'taxableAmt' → 0).
    //      Also uses 'discountPercentage' not 'BillDiscount'.
    // ────────────────────────────────────────────────────────────────────────────
    const footerData = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;

        const sum = (key) =>
            reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

        if (filters.reportMode === 'Summary') {
            return {
              SNo: "",
              Date: "",
              InvoiceNo: "",
              Type: "",
              Party: (
                <strong>{t("salesSummaryReport.grid.total") || "Total"}</strong>
              ),
              TotalAmount: sum("TotalAmount").toFixed(decimalPart),
              BillDiscount: sum("BillDiscount").toFixed(decimalPart),
              OtherCharge: sum("OtherCharge").toFixed(decimalPart),
              TaxableAmt: sum("TaxableAmt").toFixed(decimalPart),
              TotalTax: sum("TotalTax").toFixed(decimalPart),
              RoundOff: sum("RoundOff").toFixed(decimalPart),
              BillAmount: sum("BillAmount").toFixed(decimalPart),
              PaidAmount: reportData
                .reduce((acc, row) => acc + getPaidAmount(row), 0)
                .toFixed(decimalPart),
              Balance: reportData
                .reduce((acc, row) => acc + getBalanceAmount(row), 0)
                .toFixed(decimalPart),
              ProfitAmt: sum("ProfitAmt").toFixed(decimalPart),
            };
        }

        // Detailed mode — all keys match API exactly
        return {
            SNo:                '',
            Date:               '',
            InvoiceNo:          '',
            customerName:       <strong>{t('salesReport.grid.total')}</strong>,
            productName:        '',
            unitName:           '',
            qty:                sum('qty').toFixed(3),
            rate:               '',
            grossAmount:        sum('grossAmount').toFixed(decimalPart),
            discountPercentage: '',                                    // avg % doesn't make sense to sum
            TaxableAmt:         sum('TaxableAmt').toFixed(decimalPart), // FIX: was 'taxableAmt' → always 0
            taxAmount:          sum('taxAmount').toFixed(decimalPart),
            amount:             sum('amount').toFixed(decimalPart),
        };
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
            selectedBranchId: null,
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

    // ─── EXPORT ─────────────────────────────────────────────────────────────────
    // FIX: Summary export columns match corrected column list.
    // FIX: Detailed export uses exact API keys.
    // ────────────────────────────────────────────────────────────────────────────
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
              TotalAmount: Number(row.TotalAmount || 0).toFixed(decimalPart),
              BillDiscount: Number(row.BillDiscount || 0).toFixed(decimalPart),
              OtherCharge: Number(row.OtherCharge || 0).toFixed(decimalPart),
              TaxableAmt: Number(row.TaxableAmt || 0).toFixed(decimalPart),
              TotalTax: Number(row.TotalTax || 0).toFixed(decimalPart),
              RoundOff: Number(row.RoundOff || 0).toFixed(decimalPart),
              BillAmount: Number(row.BillAmount || 0).toFixed(decimalPart),
              PaidAmount: getPaidAmount(row).toFixed(decimalPart),
              Balance: getBalanceAmount(row).toFixed(decimalPart),
              ProfitAmt: Number(row.ProfitAmt || 0).toFixed(decimalPart),
            }));

            return {
                fileName:  'Sales_Summary_Report',
                sheetName: 'Sales Summary',
                title:     t('salesSummaryReport.breadcrumb.title') || 'Sales Summary Report',
                subtitle:  `${t('common.fromDate')}: ${filters.fromDate} | ${t('common.toDate')}: ${filters.toDate}`,
                data:      exportData,
                footer:    footerData,
                theme:     'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SlNo',         label: '#',                                                               align: 'center', width: 5  },
                    { key: 'Date',         label: t('salesSummaryReport.grid.columns.date')          || 'Date',      align: 'center', width: 10 },
                    { key: 'InvoiceNo',    label: t('salesSummaryReport.grid.columns.invoiceNo')     || 'Invoice No',align: 'center', width: 12 },
                    { key: 'Type',         label: t('salesSummaryReport.grid.columns.type')          || 'Type',      align: 'center', width: 10 },
                    { key: 'Party',        label: t('salesSummaryReport.grid.columns.party')         || 'Party',     align: 'left',   width: 18 },
                    { key: 'TotalAmount',  label: t('salesSummaryReport.grid.columns.totalAmount')   || 'Total Amt', align: 'right',  width: 10 },
                    { key: 'BillDiscount', label: t('salesSummaryReport.grid.columns.discount')      || 'Discount',  align: 'right',  width: 8  },
                    { key: 'OtherCharge',  label: t('salesSummaryReport.grid.columns.otherCharge')   || 'Other Chg', align: 'right',  width: 8  },
                    { key: 'TaxableAmt',   label: t('salesSummaryReport.grid.columns.taxableAmount') || 'Taxable',   align: 'right',  width: 10 },
                    { key: 'TotalTax',     label: t('salesSummaryReport.grid.columns.taxAmount')     || 'Tax',       align: 'right',  width: 8  },
                    { key: 'RoundOff',     label: t('salesSummaryReport.grid.columns.roundOff')      || 'Round Off', align: 'right',  width: 8  },
                    { key: 'BillAmount',   label: t('salesSummaryReport.grid.columns.billAmount')    || 'Bill Amt',  align: 'right',  width: 10 },
                    { key: 'PaidAmount',   label: t('salesSummaryReport.grid.columns.paidAmount')    || 'Paid',      align: 'right',  width: 8  },
                    { key: 'Balance',      label: t('salesSummaryReport.grid.columns.balance')       || 'Balance',   align: 'right',  width: 8  },
                    { key: 'ProfitAmt',    label: t('salesSummaryReport.grid.columns.profit')        || 'Profit',    align: 'right',  width: 8  },
                ]
            };
        }

        // Detailed export
        const exportData = reportData.map((row) => ({
            SNo:                row.SNo,
            Date:               row.Date         || '',
            InvoiceNo:          row.InvoiceNo    || '',
            Customer:           row.customerName || '',
            Product:            row.productName  || '',
            Unit:               row.unitName     || '',
            Qty:                Number(row.qty   || 0).toFixed(3),
            Rate:               Number(row.rate  || 0).toFixed(decimalPart),
            GrossAmount:        Number(row.grossAmount        || 0).toFixed(decimalPart),
            DiscountPct:        Number(row.discountPercentage || 0).toFixed(2),
            TaxableAmount:      Number(row.TaxableAmt         || 0).toFixed(decimalPart), // FIX: was row.taxableAmt
            TaxAmount:          Number(row.taxAmount          || 0).toFixed(decimalPart),
            Amount:             Number(row.amount             || 0).toFixed(decimalPart),
        }));

        return {
            fileName:  'Sales_Report',
            sheetName: 'Sales Report',
            title:     t('salesReport.breadcrumb.title'),
            subtitle:  `${t('common.fromDate')}: ${filters.fromDate} | ${t('common.toDate')}: ${filters.toDate}`,
            data:      exportData,
            footer:    footerData,
            theme:     'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',           label: '#',                                         align: 'center', width: 5  },
                { key: 'Date',          label: t('salesReport.grid.columns.date'),           align: 'center', width: 10 },
                { key: 'InvoiceNo',     label: t('salesReport.grid.columns.invoiceNo'),      align: 'center', width: 12 },
                { key: 'Customer',      label: t('salesReport.grid.columns.customer'),       align: 'left',   width: 18 },
                { key: 'Product',       label: t('salesReport.grid.columns.product'),        align: 'left',   width: 18 },
                { key: 'Unit',          label: t('salesReport.grid.columns.unit'),           align: 'center', width: 8  },
                { key: 'Qty',           label: t('salesReport.grid.columns.qty'),            align: 'right',  width: 8  },
                { key: 'Rate',          label: t('salesReport.grid.columns.rate'),           align: 'right',  width: 10 },
                { key: 'GrossAmount',   label: t('salesReport.grid.columns.grossAmount'),    align: 'right',  width: 10 },
                { key: 'DiscountPct',   label: t('salesReport.grid.columns.discount')||'Disc%', align: 'right', width: 7 },
                { key: 'TaxableAmount', label: t('salesReport.grid.columns.taxableAmount'), align: 'right',  width: 10 },
                { key: 'TaxAmount',     label: t('salesReport.grid.columns.taxAmount'),     align: 'right',  width: 10 },
                { key: 'Amount',        label: t('salesReport.grid.columns.amount'),        align: 'right',  width: 10 },
            ]
        };
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
                        { title: t("salesReport.breadcrumb.group"), url: "#" },
                        { title: t("salesReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ShoppingCart, title: t("salesReport.breadcrumb.title") }}
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
                        { title: t("salesReport.breadcrumb.group"), url: "#" },
                        { title: t("salesReport.breadcrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ShoppingCart, title: t("salesReport.breadcrumb.title") }}
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
                    { title: t("salesReport.breadcrumb.group"), url: "#" },
                    {
                        title: filters.reportMode === 'Summary'
                            ? t("salesSummaryReport.breadcrumb.title") || "Sales Summary Report"
                            : t("salesReport.breadcrumb.title"),
                        url: "#"
                    },
                ]}
                heading={{
                    icon: ShoppingCart,
                    title: filters.reportMode === 'Summary'
                        ? t("salesSummaryReport.breadcrumb.title") || "Sales Summary Report"
                        : t("salesReport.breadcrumb.title")
                }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label: t('salesReport.export.label')
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
                    groupBy={filters.reportMode === 'Detailed' ? 'salesMasterId' : null}
                    mergedColumns={filters.reportMode === 'Detailed' ? [
                        'SNo', 'Date', 'InvoiceNo', 'customerName',
                        'TaxableAmt', 'taxAmount', 'amount'
                        // FIX: removed 'BillDiscount' from mergedColumns — it was invoice-level
                        // and could be confusing when merged across product rows.
                        // discountPercentage is now per-line so no merging needed.
                    ] : []}
                />
            </div>
        </div>
    );
};

export default SalesReport;