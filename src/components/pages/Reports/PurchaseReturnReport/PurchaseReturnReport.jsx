// src/components/pages/Reports/PurchaseReturnReport/PurchaseReturnReport.jsx
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
import PurchaseReturnReportFilter from './PurchaseReturnReportFilter';
import useReportExport from '@/hooks/useReportExport';

const PurchaseReturnReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    const [supplierData, setSupplierData] = useState([]);
    const [costCentreData, setCostCentreData] = useState([]);
    const [purchaseData, setPurchaseData] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [currencyData, setCurrencyData] = useState([]);

    const { selectedBranchId, currentCurrency, userId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Return Report");
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
        reportType: 'Detailed',
        ledgerId: null,
        purchaseMasterId: null,
        costCentreId: null,
        currencyId: null,
        userId: null,
        optional: false,
        isAccountsPosting: false
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [suppliersRes, costCentreRes, purchaseRes, usersRes, currencyRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centres").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("purchase-invoices").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("users").catch(() => ({ data: { data: [] } })),
                axiosInstance.get("currencies").catch(() => ({ data: { data: [] } }))
            ]);

            setSupplierData(suppliersRes.data.data || []);
            setCostCentreData(costCentreRes.data.data || []);
            setPurchaseData(purchaseRes.data.data || []);
            setUsersData(usersRes.data.data || []);
            setCurrencyData(currencyRes.data.data || []);
        } catch (error) {
            console.error("❌ [fetchDropdownData] Error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const supplierOptions = useMemo(() => {
        return supplierData.map(supplier => ({
            label: supplier.ledgerName,
            value: supplier.ledgerId
        }));
    }, [supplierData]);

    const costCentreOptions = useMemo(() => {
        return costCentreData.map(cc => ({
            label: cc.CostCentre || cc.costCentreName,
            value: cc.costCentreId
        }));
    }, [costCentreData]);

    const purchaseOptions = useMemo(() => {
        return purchaseData.map(purchase => ({
            label: purchase.invoiceNo || purchase.voucherNo || `#${purchase.purchaseMasterId}`,
            value: purchase.purchaseMasterId
        }));
    }, [purchaseData]);

    const userOptions = useMemo(() => {
        return usersData.map(user => ({
            label: user.userName || user.name,
            value: user.userId || user.id
        }));
    }, [usersData]);

    const currencyOptions = useMemo(() => {
        return currencyData.map(currency => ({
            label: `${currency.currencySymbol} - ${currency.currencyName}`,
            value: currency.currencyId
        }));
    }, [currencyData]);

    const formatDateTimeForAPI = (dateString, isEndOfDay = false) => {
        if (!dateString) return null;
        return isEndOfDay ? `${dateString} 23:59:59` : `${dateString} 00:00:00`;
    };

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

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            let endpoint, payload;

            if (filters.reportType === 'Detailed') {
                endpoint = "purchase-return/report-detailed";
                payload = {
                    from_date: filters.fromDate,
                    to_date: filters.toDate,
                    branch_id: Number(selectedBranchId),
                    ledger_id: filters.ledgerId || null,
                    purchase_master_id: filters.purchaseMasterId || null,
                    cost_centre_id: filters.costCentreId || null,
                    optional: filters.optional,
                    is_accounts_posting: filters.isAccountsPosting
                };
            } else {
                endpoint = "purchase-return/report-summary";
                payload = {
                    fromDate: formatDateTimeForAPI(filters.fromDate, false),
                    toDate: formatDateTimeForAPI(filters.toDate, true),
                    branchId: Number(selectedBranchId) || null,
                    ledgerId: filters.ledgerId || null,
                    purchaseMasterId: filters.purchaseMasterId || null,
                    costCentreId: filters.costCentreId || null,
                    currencyId: filters.currencyId || currentCurrency?.currencyId || 1,
                    userId: filters.userId || null,
                    isAccountsPosting: filters.isAccountsPosting
                };
            }

            const response = await axiosInstance.post(endpoint, payload);
            const data = response.data.data || response.data;


            const dataWithSNo = (Array.isArray(data) ? data : []).map((item, index) => ({
                ...item,
                SNo: index + 1,
                date: formatDate(item.ReturnDate || item.Date),
                Date: formatDate(item.ReturnDate || item.Date)
            }));

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('purchaseReturnReport.messages.noDataFound')
                });
                setReportData([]);
            } else {
                setReportData(dataWithSNo);
            }
        } catch (error) {
            console.error("❌ Error fetching purchase return report:", error);
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

    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;
        const sum = (key) =>
            reportData.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

        if (filters.reportType === 'Detailed') {
            return {
                grossAmount: sum('grossAmount').toFixed(decimalPart),
                taxableAmount: sum('taxableAmt').toFixed(decimalPart),
                taxAmount: sum('taxAmount').toFixed(decimalPart),
                totalAmount: sum('amount').toFixed(decimalPart),
                quantity: sum('qty').toFixed(3),
                count: reportData.length
            };
        } else {
            return {
                totalAmount: sum('TotalAmount').toFixed(decimalPart),
                billDiscount: sum('BillDiscount').toFixed(decimalPart),
                otherCharge: sum('OtherCharge').toFixed(decimalPart),
                taxableAmount: sum('TaxableAmt').toFixed(decimalPart),
                totalTax: sum('TotalTax').toFixed(decimalPart),
                roundOff: sum('RoundOff').toFixed(decimalPart),
                amount: sum('Amount').toFixed(decimalPart),
                count: reportData.length
            };
        }
    }, [reportData, generalSettings?.decimalPart, filters.reportType]);

    /* ------------------------------ ContentTable columns per reportType ------------------------------ */
    const columns = useMemo(() => {
        if (filters.reportType === 'Detailed') {
            return [
                { key: 'SNo', label: '#', align: 'center', width: '60' },
                { key: 'date', label: t('purchaseReturnReport.grid.columns.date'), align: 'center', width: '110' },
                { key: 'returnNo', label: t('purchaseReturnReport.grid.columns.returnNo'), align: 'center', width: '130' },
                { key: 'ledgerName', label: t('purchaseReturnReport.grid.columns.supplier'), align: 'left', width: '160' },
                { key: 'productName', label: t('purchaseReturnReport.grid.columns.product'), align: 'left' },
                { key: 'UnitName', label: t('purchaseReturnReport.grid.columns.unit'), align: 'center', width: '80' },
                { key: 'qty', label: t('purchaseReturnReport.grid.columns.qty'), align: 'right', width: '90' },
                { key: 'rate', label: t('purchaseReturnReport.grid.columns.rate'), align: 'right', width: '100' },
                { key: 'grossAmount', label: t('purchaseReturnReport.grid.columns.grossAmount'), align: 'right', width: '110' },
                { key: 'billDiscount', label: t('purchaseReturnReport.grid.columns.discount'), align: 'right', width: '100' },
                { key: 'taxableAmt', label: t('purchaseReturnReport.grid.columns.taxableAmount'), align: 'right', width: '110' },
                { key: 'taxAmount', label: t('purchaseReturnReport.grid.columns.taxAmount'), align: 'right', width: '100' },
                { key: 'amount', label: t('purchaseReturnReport.grid.columns.amount'), align: 'right', width: '110' },
            ];
        }

        // Summary
        return [
            { key: 'SNo', label: '#', align: 'center', width: '60' },
            { key: 'Date', label: t('purchaseReturnReport.grid.columns.date'), align: 'center', width: '110' },
            { key: 'ReturnNo', label: t('purchaseReturnReport.grid.columns.returnNo'), align: 'center', width: '130' },
            { key: 'A/C Ledger', label: t('purchaseReturnReport.grid.columns.supplier'), align: 'left', width: '160' },
            // { key: 'ReturnNo',    label: t('purchaseReturnReport.grid.columns.invoiceNo')    || 'Invoice No',                  align: 'center', width: '120' },
            { key: 'TotalAmount', label: t('purchaseReturnReport.grid.columns.totalAmount'), align: 'right', width: '110' },
            { key: 'BillDiscount', label: t('purchaseReturnReport.grid.columns.discount'), align: 'right', width: '100' },
            { key: 'OtherCharge', label: t('purchaseReturnReport.grid.columns.otherCharge') || 'Other Charge', align: 'right', width: '100' },
            { key: 'TaxableAmt', label: t('purchaseReturnReport.grid.columns.taxableAmount'), align: 'right', width: '110' },
            { key: 'TotalTax', label: t('purchaseReturnReport.grid.columns.taxAmount'), align: 'right', width: '100' },
            { key: 'RoundOff', label: t('purchaseReturnReport.grid.columns.roundOff') || 'Round Off', align: 'right', width: '90' },
            { key: 'Amount', label: t('purchaseReturnReport.grid.columns.amount'), align: 'right', width: '110' },
            { key: 'Narration', label: t('purchaseReturnReport.grid.columns.narration') || 'Narration', align: 'left', width: '140' },
            { key: 'DoneBy', label: t('purchaseReturnReport.grid.columns.doneBy'), align: 'center', width: '110' },
            { key: 'CostCentre', label: t('purchaseReturnReport.grid.columns.costCentre') || 'Cost Centre', align: 'center', width: '110' },
        ];
    }, [filters.reportType, t]);

    /* ------------------------------ Footer row for ContentTable ------------------------------ */
    const footerData = useMemo(() => {
        if (!totals || !reportData?.length) return null;

        const base = { label: t('common.total') };

        if (filters.reportType === 'Detailed') {
            return {
                ...base,
                qty: totals.quantity,
                grossAmount: totals.grossAmount,
                taxableAmt: totals.taxableAmount,
                taxAmount: totals.taxAmount,
                amount: totals.totalAmount
            };
        }

        // Summary — keys must match column keys exactly (PascalCase from API)
        return {
            ...base,
            TotalAmount: totals.totalAmount,
            BillDiscount: totals.billDiscount,
            OtherCharge: totals.otherCharge,
            TaxableAmt: totals.taxableAmount,
            TotalTax: totals.totalTax,
            RoundOff: totals.roundOff,
            Amount: totals.amount
        };
    }, [totals, reportData, filters.reportType, t]);

    /* ------------------------------ renderCell — date formatting ------------------------------ */
    const renderCell = (key, row) => {
        // Date fields are already formatted in data transformation
        if (key === 'date' || key === 'Date') return row[key] ?? '-';
        return row[key] ?? '-';
    };

    /* ------------------------------ Export Configuration ------------------------------ */
   const getExportOptions = () => {
    if (!reportData || reportData.length === 0) return null;

    const decimalPart = generalSettings?.decimalPart || 2;
    const isDetailed = filters.reportType === 'Detailed';

    // ── Export data keys must match the UI column keys exactly ──
    const exportData = reportData.map((row, index) => {
        if (isDetailed) {
            return {
                SNo:          row.SNo || index + 1,
                date:         row.date || '',
                returnNo:     row.returnNo || '',
                ledgerName:   row.ledgerName || '',
                productName:  row.productName || '',
                UnitName:     row.UnitName || '',
                qty:          Number(row.qty || 0).toFixed(3),
                rate:         Number(row.rate || 0).toFixed(decimalPart),
                grossAmount:  Number(row.grossAmount || 0).toFixed(decimalPart),
                billDiscount: Number(row.billDiscount || 0).toFixed(decimalPart),
                taxableAmt:   Number(row.taxableAmt || 0).toFixed(decimalPart),
                taxAmount:    Number(row.taxAmount || 0).toFixed(decimalPart),
                amount:       Number(row.amount || 0).toFixed(decimalPart),
            };
        } else {
            return {
                SNo:          row.SNo || index + 1,
                Date:         row.Date || '',
                ReturnNo:     row.ReturnNo || '',
                'A/C Ledger': row['A/C Ledger'] || '',
                TotalAmount:  Number(row.TotalAmount || 0).toFixed(decimalPart),
                BillDiscount: Number(row.BillDiscount || 0).toFixed(decimalPart),
                OtherCharge:  Number(row.OtherCharge || 0).toFixed(decimalPart),
                TaxableAmt:   Number(row.TaxableAmt || 0).toFixed(decimalPart),
                TotalTax:     Number(row.TotalTax || 0).toFixed(decimalPart),
                RoundOff:     Number(row.RoundOff || 0).toFixed(decimalPart),
                Amount:       Number(row.Amount || 0).toFixed(decimalPart),
                Narration:    row.Narration || '',
                CostCentre:   row.CostCentre || '',
            };
        }
    });

    const footer = totals
        ? isDetailed
            ? {
                label:        t('common.total'),
                qty:          totals.quantity,
                grossAmount:  totals.grossAmount,
                taxableAmt:   totals.taxableAmount,
                taxAmount:    totals.taxAmount,
                amount:       totals.totalAmount,
            }
            : {
                label:        t('common.total'),
                TotalAmount:  totals.totalAmount,
                BillDiscount: totals.billDiscount,
                OtherCharge:  totals.otherCharge,
                TaxableAmt:   totals.taxableAmount,
                TotalTax:     totals.totalTax,
                RoundOff:     totals.roundOff,
                Amount:       totals.amount,
            }
        : null;

    // ── Export columns mirror UI `columns` exactly (same key/label/order) ──
    const detailedExportColumns = [
        { key: 'SNo',         label: '#',                                                          align: 'center', width: 5  },
        { key: 'date',        label: t('purchaseReturnReport.grid.columns.date'),                  align: 'center', width: 10 },
        { key: 'returnNo',    label: t('purchaseReturnReport.grid.columns.returnNo'),              align: 'center', width: 12 },
        { key: 'ledgerName',  label: t('purchaseReturnReport.grid.columns.supplier'),              align: 'left',   width: 18 },
        { key: 'productName', label: t('purchaseReturnReport.grid.columns.product'),               align: 'left',   width: 18 },
        { key: 'UnitName',    label: t('purchaseReturnReport.grid.columns.unit'),                  align: 'center', width: 8  },
        { key: 'qty',         label: t('purchaseReturnReport.grid.columns.qty'),         type: 'number',   align: 'right', width: 8  },
        { key: 'rate',        label: t('purchaseReturnReport.grid.columns.rate'),        type: 'currency', align: 'right', width: 10 },
        { key: 'grossAmount', label: t('purchaseReturnReport.grid.columns.grossAmount'), type: 'currency', align: 'right', width: 10 },
        { key: 'billDiscount',label: t('purchaseReturnReport.grid.columns.discount'),   type: 'currency', align: 'right', width: 10 },
        { key: 'taxableAmt',  label: t('purchaseReturnReport.grid.columns.taxableAmount'), type: 'currency', align: 'right', width: 10 },
        { key: 'taxAmount',   label: t('purchaseReturnReport.grid.columns.taxAmount'),  type: 'currency', align: 'right', width: 10 },
        { key: 'amount',      label: t('purchaseReturnReport.grid.columns.amount'),     type: 'currency', align: 'right', width: 10 },
    ];

    const summaryExportColumns = [
        { key: 'SNo',          label: '#',                                                                       align: 'center', width: 5  },
        { key: 'Date',         label: t('purchaseReturnReport.grid.columns.date'),                               align: 'center', width: 10 },
        { key: 'ReturnNo',     label: t('purchaseReturnReport.grid.columns.returnNo'),                           align: 'center', width: 10 },
        { key: 'A/C Ledger',   label: t('purchaseReturnReport.grid.columns.supplier'),                           align: 'left',   width: 16 },
        { key: 'TotalAmount',  label: t('purchaseReturnReport.grid.columns.totalAmount'),  type: 'currency', align: 'right', width: 10 },
        { key: 'BillDiscount', label: t('purchaseReturnReport.grid.columns.discount'),    type: 'currency', align: 'right', width: 8  },
        { key: 'OtherCharge',  label: t('purchaseReturnReport.grid.columns.otherCharge') || 'Other Charge', type: 'currency', align: 'right', width: 8  },
        { key: 'TaxableAmt',   label: t('purchaseReturnReport.grid.columns.taxableAmount'), type: 'currency', align: 'right', width: 10 },
        { key: 'TotalTax',     label: t('purchaseReturnReport.grid.columns.taxAmount'),   type: 'currency', align: 'right', width: 8  },
        { key: 'RoundOff',     label: t('purchaseReturnReport.grid.columns.roundOff') || 'Round Off', type: 'currency', align: 'right', width: 8  },
        { key: 'Amount',       label: t('purchaseReturnReport.grid.columns.amount'),      type: 'currency', align: 'right', width: 10 },
        { key: 'Narration',    label: t('purchaseReturnReport.grid.columns.narration') || 'Narration',           align: 'left',   width: 14 },
        { key: 'CostCentre',   label: t('purchaseReturnReport.grid.columns.costCentre') || 'Cost Centre',        align: 'center', width: 10 },
    ];

    return {
        fileName:     isDetailed ? 'Purchase_Return_Detailed_Report' : 'Purchase_Return_Summary_Report',
        sheetName:    isDetailed ? 'Purchase Return Detailed'        : 'Purchase Return Summary',
        title:        reportTitle,
        subtitle:     `${t('common.fromDate') || 'From'}: ${filters.fromDate}  ${t('common.toDate') || 'To'}: ${filters.toDate}`,
        fromDate:     filters.fromDate,
        toDate:       filters.toDate,
        data:         exportData,
        footer,
        theme:        'professional',
        decimalPlaces: decimalPart,
        columns:      isDetailed ? detailedExportColumns : summaryExportColumns,
    };
};
    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseReturnReport.messages.noDataToExport') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseReturnReport.messages.noDataToExport') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('purchaseReturnReport.messages.noDataToExport') });
            return;
        }
        exportGenericToCsv(options);
    };

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
            reportType: 'Detailed',
            ledgerId: null,
            purchaseMasterId: null,
            costCentreId: null,
            currencyId: null,
            userId: null,
            optional: false,
            isAccountsPosting: false,
        });
        setReportData(null);
        setAlert(null);
    };

    const reportTitle = filters.reportType === 'Detailed'
        ? t("purchaseReturnReport.breadcrumb.detailedTitle")
        : t("purchaseReturnReport.breadcrumb.summaryTitle");

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("purchaseReturnReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseReturnReport.breadcrumb.title"), url: "#" },
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
                        { title: t("purchaseReturnReport.breadcrumb.group"), url: "#" },
                        { title: t("purchaseReturnReport.breadcrumb.title"), url: "#" },
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
                <AlertBox
                    key={alert.id}
                    message={alert.message}
                    type={alert.type}
                />
            )}

            <BreadCrumb
                routes={[
                    { title: t("purchaseReturnReport.breadcrumb.group"), url: "#" },
                    { title: t("purchaseReturnReport.breadcrumb.title"), url: "#" },
                ]}
                heading={{ icon: RotateCcw, title: reportTitle }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('purchaseReturnReport.export.label')
                } : null}
            />

            <div className="px-1">
                <PurchaseReturnReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    supplierOptions={supplierOptions}
                    costCentreOptions={costCentreOptions}
                    purchaseOptions={purchaseOptions}
                    userOptions={userOptions}
                    currencyOptions={currencyOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData || []}
                    loading={loading}
                    footerData={footerData}
                    renderCell={renderCell}
                    staticSearchable
                    tableId="purchase-return-report"
                    pageSize={80}
                    maxHeight="calc(100vh - 340px)"
                    // ── Grouping: only active in Detailed mode ──
                    groupBy={filters.reportType === 'Detailed' ? 'returnMasterId' : null}
                    mergedColumns={filters.reportType === 'Detailed' ? [
                        'SNo', 'date', 'returnNo', 'ledgerName',
                        'billDiscount', 'taxableAmt', 'taxAmount', 'amount'
                    ] : []}
                />
            </div>
        </div>
    );
};

export default PurchaseReturnReport;