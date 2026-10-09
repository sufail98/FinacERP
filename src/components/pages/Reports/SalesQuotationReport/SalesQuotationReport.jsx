// src/components/pages/Reports/SalesQuotationReport/SalesQuotationReport.jsx
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
import SalesQuotationReportFilter from './SalesQuotationFilter';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const SalesQuotationReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data states
    const [customerData, setCustomerData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Quotation Report");
    const { generalSettings } = useSelector((state) => state.settings);
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.quotationMasterId) return;
        navigate(`/transaction/sales-quotation/edit-quotation/${row.quotationMasterId}`);
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
        reportMode: 'Summary',
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        branchId: selectedBranchId,
        currencyId: currentCurrency?.currencyId || 1,
        ledgerId: null,
        salesManId: null,
        costCentreId: null,
        partyName: null,
        condition: null,
        userId: userId
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [customersRes, costCentreRes, salesmanRes, usersRes, currencyRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer","Customer&Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } }))
            ]);

            setCustomerData(customersRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
            setSalesmanData(salesmanRes.data.data || []);
            setUsersData(usersRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Dropdown options
    const customerOptions = useMemo(() => customerData.map(c => ({
        label: c.ledgerName,
        value: c.ledgerId
    })), [customerData]);

    const costCentreOptions = useMemo(() => costCentreData.map(cc => ({
        label: cc.CostCentre || cc.costCentreName,
        value: cc.costCentreId
    })), [costCentreData]);

    const salesmanOptions = useMemo(() => salesmanData.map(s => ({
        label: s.employeeName || s.name,
        value: s.employeeId || s.id
    })), [salesmanData]);

    const userOptions = useMemo(() => usersData.map(u => ({
        label: u.userName || u.name,
        value: u.userId || u.id
    })), [usersData]);

    const currencyOptions = useMemo(() => currencyData.map(c => ({
        label: `${c.currencySymbol} - ${c.currencyName}`,
        value: c.currencyId
    })), [currencyData]);

    const conditionOptions = [
      {
        label: t("salesQuotationReport.filters.approved") || "Approved",
        value: "Approved",
      },
      {
        label: t("salesQuotationReport.filters.pending") || "Pending",
        value: "Pending",
      },
      
    ];

    // ─── Fetch Report ────────────────────────────────────────────────────────────
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const isSummary = filters.reportMode === 'Summary';
            const endpoint = isSummary ? "quotation-report-summary" : "quotation-report-detailed";

            const payload = {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                branchId: Number(filters.branchId || selectedBranchId),
                currencyId: Number(filters.currencyId || currentCurrency?.currencyId || 1),
                ledgerId: filters.ledgerId || null,
                salesManId: filters.salesManId || null,
                costCentreId: filters.costCentreId || null,
                partyName: filters.partyName || null,
                condition: filters.condition || null,
                userId: filters.userId || userId
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
                    message: t('salesQuotationReport.messages.noDataFound') || 'No data found.'
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching quotation report:", error);
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

    // ─── Columns ─────────────────────────────────────────────────────────────────
    const columns = useMemo(() => {
        if (filters.reportMode === 'Summary') {
            return [
              { key: "SNo", label: "#", align: "center", width: "60" },
              {
                key: "Date",
                label: t("salesQuotationReport.grid.columns.date") || "Date",
                align: "center",
                width: "110",
              },
              {
                key: "QuotationNo",
                label:
                  t("salesQuotationReport.grid.columns.quotationNo") ||
                  "Quotation No",
                align: "center",
                width: "130",
              },
              //   {
              //     key: "Type",
              //     label: t("salesQuotationReport.grid.columns.type") || "Type",
              //     align: "center",
              //     width: "100",
              //   },
              {
                key: "CustomerName",
                label: t("salesQuotationReport.grid.columns.party") || "Party",
                align: "left",
                width: "180",
              },
              {
                key: "Salesman",
                label:
                  t("salesQuotationReport.grid.columns.salesman") || "Salesman",
                align: "left",
                width: "140",
              },
            //   {
            //     key: "TotalAmount",
            //     label:
            //       t("salesQuotationReport.grid.columns.totalAmount") ||
            //       "Total Amount",
            //     align: "right",
            //     width: "120",
            //   },
              {
                key: "BillDiscount",
                label:
                  t("salesQuotationReport.grid.columns.discount") || "Discount",
                align: "right",
                width: "100",
              },
              {
                key: "TaxableAmt",
                label:
                  t("salesQuotationReport.grid.columns.taxableAmount") ||
                  "Taxable Amt",
                align: "right",
                width: "120",
              },
              {
                key: "TotalTax",
                label:
                  t("salesQuotationReport.grid.columns.taxAmount") ||
                  "Total Tax",
                align: "right",
                width: "100",
              },
              {
                key: "Amount",
                label:
                  t("salesQuotationReport.grid.columns.grandAmount") ||
                  "Grand Amount",
                align: "right",
                width: "120",
              },
              {
                key: "Approved",
                label:
                  t("salesQuotationReport.grid.columns.approved") || "Approved",
                align: "center",
                width: "90",
              },
              {
                key: "DoneBy",
                label:
                  t("salesQuotationReport.grid.columns.doneBy") || "Done By",
                align: "center",
                width: "110",
              },
            ];
        }

        // Detailed
        return [
          { key: "SNo", label: "#", align: "center", width: "50" },
          {
            key: "date",
            label: t("salesQuotationReport.grid.columns.date") || "Date",
            align: "center",
            width: "100",
          },
          {
            key: "quotationNo",
            label:
              t("salesQuotationReport.grid.columns.quotationNo") ||
              "Quotation No",
            align: "center",
            width: "120",
          },
          {
            key: "customerName",
            label:
              t("salesQuotationReport.grid.columns.customer") || "Customer",
            align: "left",
            width: "180",
          },
          {
            key: "productName",
            label: t("salesQuotationReport.grid.columns.product") || "Product",
            align: "left",
            width: "200",
          },
          {
            key: "unitName",
            label: t("salesQuotationReport.grid.columns.unit") || "Unit",
            align: "center",
            width: "80",
          },
          {
            key: "qty",
            label: t("salesQuotationReport.grid.columns.qty") || "Qty",
            align: "right",
            width: "80",
          },
          {
            key: "rate",
            label: t("salesQuotationReport.grid.columns.rate") || "Rate",
            align: "right",
            width: "100",
          },
          {
            key: "grossAmount",
            label:
              t("salesQuotationReport.grid.columns.grossAmount") ||
              "Gross Amount",
            align: "right",
            width: "120",
          },
          // { key: 'BillDiscount', label: t('salesQuotationReport.grid.columns.discount')     || 'Discount',       align: 'right',  width: '100' },
          {
            key: "BillDiscOnProduct",
            label:
              t("salesQuotationReport.grid.columns.discount") || "Discount",
            align: "right",
            width: "100",
          },
          {
            key: "OtherChargeOnProduct",
            label:
              t("salesQuotationReport.grid.columns.othercharge") ||
              "Other Charge",
            align: "right",
            width: "100",
          },
          {
            key: "taxableAmt",
            label:
              t("salesQuotationReport.grid.columns.taxableAmount") ||
              "Taxable Amt",
            align: "right",
            width: "120",
          },
          {
            key: "taxAmount",
            label:
              t("salesQuotationReport.grid.columns.taxAmount") || "Tax Amount",
            align: "right",
            width: "120",
          },
          {
            key: "amount",
            label: t("salesQuotationReport.grid.columns.amount") || "Amount",
            align: "right",
            width: "120",
          },
        ];
    }, [t, filters.reportMode]);

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

        // ── Summary mode ────────────────────────────────────────────────────────
        if (filters.reportMode === 'Summary') {
            const numericFields = ['TotalAmount', 'BillDiscount', 'TaxableAmt', 'TotalTax', 'GrandAmount'];
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
            if (key === 'Approved') {
                return (
                    <div className="text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            row.Approved
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            {row.Approved ? 'Yes' : 'No'}
                        </span>
                    </div>
                );
            }
            return row[key] ?? '-';
        }

        // ── Detailed mode ────────────────────────────────────────────────────────
        switch (key) {
            case 'SNo':
                return <div className="text-center">{row.SNo}</div>;

            case 'date':
                return getValue('date', ['Date', 'quotationDate', 'QuotationDate']) || '-';

            case 'quotationNo':
                return getValue('quotationNo', ['QuotationNo', 'voucherNo']) || '-';

            case 'customerName':
                return getValue('customerName', ['CustomerName', 'ledgerName', 'Party']) || '-';

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

            case 'BillDiscount': {
                const discount = getValue('BillDiscount', ['billDiscount']);
                return discount !== null ? Number(discount).toFixed(decimalPart) : '-';
            }

            case 'taxableAmt': {
                const taxable = getValue('taxableAmt', ['TaxableAmt', 'netAmount']);
                return taxable !== null ? Number(taxable).toFixed(decimalPart) : '-';
            }

            case 'taxAmount': {
                const tax = getValue('taxAmount', ['TaxAmount']);
                return tax !== null ? Number(tax).toFixed(decimalPart) : '-';
            }

            case 'amount': {
                const amount = getValue('amount', ['Amount', 'totalAmount', 'GrandAmount']);
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

        if (filters.reportMode === 'Summary') {
            return {
                SNo:          '',
                Date:         '',
                QuotationNo:  '',
                // Type:         '',
                Party:        <strong>{t('salesQuotationReport.grid.total') || 'Total'}</strong>,
                Salesman:     '',
                TotalAmount:  sum('TotalAmount').toFixed(decimalPart),
                BillDiscount: sum('BillDiscount').toFixed(decimalPart),
                TaxableAmt:   sum('TaxableAmt').toFixed(decimalPart),
                TotalTax:     sum('TotalTax').toFixed(decimalPart),
                Amount:  sum('Amount').toFixed(decimalPart),
                Approved:     '',
                DoneBy:       ''
            };
        }

        return {
            SNo:          '',
            date:         '',
            quotationNo:  '',
            customerName: <strong>{t('salesQuotationReport.grid.total') || 'Total'}</strong>,
            productName:  '',
            unitName:     '',
            qty:          (sum('qty') || sum('Qty')).toFixed(3),
            rate:         '',
            grossAmount:  (sum('grossAmount') || sum('GrossAmount')).toFixed(decimalPart),
            BillDiscount: sum('BillDiscount').toFixed(decimalPart),
            taxableAmt:   (sum('taxableAmt') || sum('TaxableAmt') || sum('netAmount')).toFixed(decimalPart),
            taxAmount:    (sum('taxAmount') || sum('TaxAmount')).toFixed(decimalPart),
            amount:       (sum('amount') || sum('Amount') || sum('GrandAmount')).toFixed(decimalPart)
        };
    }, [reportData, generalSettings?.decimalPart, t, filters.reportMode]);

    // ─── Filter Handlers ─────────────────────────────────────────────────────────
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            reportMode:   'Summary',
            fromDate:     dates.fromDate,
            toDate:       dates.toDate,
            branchId:     selectedBranchId,
            currencyId:   currentCurrency?.currencyId || 1,
            ledgerId:     null,
            salesManId:   null,
            costCentreId: null,
            partyName:    null,
            condition:    null,
            userId:       userId
        });
        setReportData(null);
        setAlert(null);
    };

    // ─── Export ───────────────────────────────────────────────────────────────────
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;

        if (filters.reportMode === 'Summary') {
            const exportData = reportData.map((row) => ({
                SlNo:         row.SNo,
                Date:         row.Date || '',
                QuotationNo:  row.QuotationNo || '',
                Type:         row.Type || '',
                Party:        row.Party || '',
                Salesman:     row.Salesman || '',
                TotalAmount:  Number(row.TotalAmount  || 0).toFixed(decimalPart),
                BillDiscount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                TaxableAmt:   Number(row.TaxableAmt   || 0).toFixed(decimalPart),
                TotalTax:     Number(row.TotalTax     || 0).toFixed(decimalPart),
                GrandAmount:  Number(row.GrandAmount  || 0).toFixed(decimalPart),
                Approved:     row.Approved ? 'Yes' : 'No',
                DoneBy:       row.DoneBy || ''
            }));
            return {
                fileName:     'Sales_Quotation_Summary_Report',
                sheetName:    'Quotation Summary',
                title:        t('salesQuotationSummaryReport.breadcrumb.title') || 'Sales Quotation Summary Report',
                subtitle:     `From: ${filters.fromDate} | To: ${filters.toDate}`,
                data:         exportData,
                footer:       footerData,
                theme:        'professional',
                decimalPlaces: decimalPart,
                columns: [
                    { key: 'SlNo',         label: '#',              align: 'center', width: 5  },
                    { key: 'Date',         label: 'Date',           align: 'center', width: 12 },
                    { key: 'QuotationNo',  label: 'Quotation No',   align: 'center', width: 12 },
                    { key: 'Type',         label: 'Type',           align: 'center', width: 10 },
                    { key: 'Party',        label: 'Party',          align: 'left',   width: 18 },
                    { key: 'Salesman',     label: 'Salesman',       align: 'left',   width: 12 },
                    { key: 'TotalAmount',  label: 'Total Amount',   align: 'right',  width: 12 },
                    { key: 'BillDiscount', label: 'Discount',       align: 'right',  width: 10 },
                    { key: 'TaxableAmt',   label: 'Taxable Amt',    align: 'right',  width: 12 },
                    { key: 'TotalTax',     label: 'Total Tax',      align: 'right',  width: 10 },
                    { key: 'GrandAmount',  label: 'Grand Amount',   align: 'right',  width: 12 },
                    { key: 'Approved',     label: 'Approved',       align: 'center', width: 8  },
                    { key: 'DoneBy',       label: 'Done By',        align: 'center', width: 10 }
                ]
            };
        }

        // Detailed
        const exportData = reportData.map((row) => ({
            SNo:           row.SNo,
            Date:          row.date   || row.Date   || row.QuotationDate || '',
            QuotationNo:   row.quotationNo || row.QuotationNo || '',
            Customer:      row.customerName || row.CustomerName || row.ledgerName || '',
            Product:       row.productName  || row.ProductName  || '',
            Unit:          row.unitName     || row.UnitName     || '',
            Qty:           Number(row.qty   || row.Qty          || 0).toFixed(3),
            Rate:          Number(row.rate  || row.Rate         || 0).toFixed(decimalPart),
            GrossAmount:   Number(row.grossAmount || row.GrossAmount || 0).toFixed(decimalPart),
            Discount:      Number(row.BillDiscount || 0).toFixed(decimalPart),
            TaxableAmount: Number(row.taxableAmt || row.TaxableAmt || row.netAmount || 0).toFixed(decimalPart),
            TaxAmount:     Number(row.taxAmount  || row.TaxAmount  || 0).toFixed(decimalPart),
            Amount:        Number(row.amount     || row.Amount     || row.GrandAmount || 0).toFixed(decimalPart)
        }));
        return {
            fileName:     'Sales_Quotation_Report',
            sheetName:    'Sales Quotation Report',
            title:        t('salesQuotationReport.breadcrumb.title') || 'Sales Quotation Report',
            subtitle:     `From: ${filters.fromDate} | To: ${filters.toDate}`,
            data:         exportData,
            footer:       footerData,
            theme:        'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo',           label: '#',              align: 'center', width: 5  },
                { key: 'Date',          label: 'Date',           align: 'center', width: 12 },
                { key: 'QuotationNo',   label: 'Quotation No',   align: 'center', width: 12 },
                { key: 'Customer',      label: 'Customer',       align: 'left',   width: 18 },
                { key: 'Product',       label: 'Product',        align: 'left',   width: 20 },
                { key: 'Unit',          label: 'Unit',           align: 'center', width: 8  },
                { key: 'Qty',           label: 'Qty',            align: 'right',  width: 8  },
                { key: 'Rate',          label: 'Rate',           align: 'right',  width: 10 },
                { key: 'GrossAmount',   label: 'Gross Amount',   align: 'right',  width: 12 },
                { key: 'Discount',      label: 'Discount',       align: 'right',  width: 10 },
                { key: 'TaxableAmount', label: 'Taxable Amt',    align: 'right',  width: 12 },
                { key: 'TaxAmount',     label: 'Tax Amount',     align: 'right',  width: 10 },
                { key: 'Amount',        label: 'Amount',         align: 'right',  width: 12 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesQuotationReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToExcel(options);
    };
    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesQuotationReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };
    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) { setAlert({ id: Date.now(), type: 'warning', message: t('salesQuotationReport.messages.noDataToExport') || 'No data to export.' }); return; }
        exportGenericToCsv(options);
    };

    // ─── Dynamic title ────────────────────────────────────────────────────────────
    const pageTitle = filters.reportMode === 'Summary'
        ? t('salesQuotationSummaryReport.breadcrumb.title') || 'Sales Quotation Summary Report'
        : t('salesQuotationReport.breadcrumb.title') || 'Sales Quotation Report';

    // ─── Loading / Access guards ──────────────────────────────────────────────────
    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("salesQuotationReport.breadcrumb.group"), url: "#" },
                        { title: pageTitle, url: "#" }
                    ]}
                    heading={{ icon: FileText, title: pageTitle }}
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
                        { title: t("salesQuotationReport.breadcrumb.group"), url: "#" },
                        { title: pageTitle, url: "#" }
                    ]}
                    heading={{ icon: FileText, title: pageTitle }}
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
                    { title: t("salesQuotationReport.breadcrumb.group"), url: "#" },
                    { title: pageTitle, url: "#" }
                ]}
                heading={{ icon: FileText, title: pageTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf:   handleExportPdf,
                    onExportCsv:   handleExportCsv,
                    label:         t('salesQuotationReport.export.label') || 'Export'
                } : null}
            />

            <div className="px-1">
                <SalesQuotationReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    customerOptions={customerOptions}
                    costCentreOptions={costCentreOptions}
                    salesmanOptions={salesmanOptions}
                    userOptions={userOptions}
                    currencyOptions={currencyOptions}
                    conditionOptions={conditionOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    staticSearchable={true}
                    serverPagination={false}
                    tableId="sales-quotation-report-table"
                    pageSize={50}
                    autoFocusSearch={false}
                    maxHeight="calc(100vh - 290px)"
                    stickyActions={false}
                    onRowClick={handleRowClick}
                    // Row merging only in Detailed mode — group by quotationMasterId
                    groupBy={filters.reportMode === 'Detailed' ? 'quotationMasterId' : null}
                    mergedColumns={filters.reportMode === 'Detailed' ? [
                        'SNo', 'date', 'quotationNo', 'customerName', 
                    ] : []}
                />
            </div>
        </div>
    );
};

export default SalesQuotationReport;