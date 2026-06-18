// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxDetailedReport\TaxDetailedReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import ContentTable from '@/components/common/ContentTable'; // ← replaces TaxDetailedContentTable
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TaxDetailedReportFilters from './TaxDetailedReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const TaxDetailedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [inputTaxData, setInputTaxData] = useState([]);
    const [outputTaxData, setOutputTaxData] = useState([]);

    const [taxData, setTaxData] = useState([]);
    const [supplierCustomerData, setSupplierCustomerData] = useState([]);

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Tax Detailed Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        taxId: null,
        voucherType: null,
        supplierOrCustomerId: null
    });

    // ── All columns definition ─────────────────────────────────────────────
    const allColumns = [
        { key: 'Date', label: t('Date'), defaultVisible: true, align: 'center' },
        { key: 'VoucherType', label: t('Type'), defaultVisible: false, align: 'left' },
        { key: 'VoucherNo', label: t('Vch No'), defaultVisible: true, align: 'left' },
        { key: 'BillTime', label: t('Time'), defaultVisible: false, align: 'center' },
        { key: 'PartyName', label: t('Party'), defaultVisible: true, align: 'left' },
        { key: 'VATNo', label: t('VAT No'), defaultVisible: false, align: 'left' },
        { key: 'VendorInvoiceNo', label: t('Vendor Inv'), defaultVisible: false, align: 'left' },
        { key: 'TaxableAmount', label: t('Taxable'), defaultVisible: true, align: 'right' },
        { key: 'TaxAmount', label: t('Tax'), defaultVisible: true, align: 'right' },
        { key: 'NetAmount', label: t('Net'), defaultVisible: false, align: 'right' },
        { key: 'Adjust', label: t('Adj'), defaultVisible: false, align: 'right' },
        { key: 'GrandTotal', label: t('Total'), defaultVisible: true, align: 'right' },
    ];

    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => { initial[col.key] = col.defaultVisible; });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    };

    // displayColumns passed to ContentTable — SNo first, then visible cols
    const displayColumns = useMemo(() => [
        { key: 'SNo', label: '#', align: 'center', width: '50' },
        ...allColumns.filter(col => visibleColumns[col.key])
    ], [visibleColumns]);

    useEffect(() => {
        fetchTaxData();
        fetchSupplierCustomerData();
    }, [selectedBranchId]);

    const fetchTaxData = async () => {
        try {
            const res = await axiosInstance.get("tax-masters");
            setTaxData(res.data.data || []);
        } catch (err) {
            console.error("❌ Error fetching tax data:", err);
        }
    };

    const fetchSupplierCustomerData = async () => {
        try {
            const response = await axiosInstance.post("customer-supplier-account-ledgers", {
                ledgerTypes: ["Customer", "Supplier"],
                branchId: selectedBranchId
            });
            setSupplierCustomerData(response.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching suppliers/customers:", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: parseInt(selectedBranchId) || 1,
            dummy: false,
            ledgerId: filters.supplierOrCustomerId ? parseInt(filters.supplierOrCustomerId) : null,
            voucherType: filters.voucherType || null,
            cashOrParty: null,
            output: false,
            taxId: filters.taxId ? parseInt(filters.taxId) : null
        };

        try {
            const res = await axiosInstance.post("tax-detailed-report", requestBody);
            const rawData = res.data.data || [];

            setReportData(rawData);

            const inputData = rawData
                .filter(item => item.InputorOutput === "Input")
                .map((item, idx) => ({ ...item, SNo: idx + 1 }));

            const outputData = rawData
                .filter(item => item.InputorOutput === "Output")
                .map((item, idx) => ({ ...item, SNo: idx + 1 }));

            setInputTaxData(inputData);
            setOutputTaxData(outputData);
        } catch (error) {
            console.error("❌ Tax Detailed Report Error:", error);
            setReportData(null);
            setInputTaxData([]);
            setOutputTaxData([]);
        } finally {
            setLoading(false);
        }
    };

    // ── Totals ─────────────────────────────────────────────────────────────
    const NUMERIC_KEYS = ['TaxableAmount', 'TaxAmount', 'NetAmount', 'Adjust', 'GrandTotal'];

    const calculateTotals = (data) => {
        if (!data?.length) return null;
        return data.reduce((acc, row) => {
            NUMERIC_KEYS.forEach(k => { acc[k] += parseFloat(row[k]) || 0; });
            return acc;
        }, Object.fromEntries(NUMERIC_KEYS.map(k => [k, 0])));
    };

    const inputTotals = useMemo(() => calculateTotals(inputTaxData), [inputTaxData]);
    const outputTotals = useMemo(() => calculateTotals(outputTaxData), [outputTaxData]);
    const combinedTotals = useMemo(() => calculateTotals(reportData), [reportData]);

    // footerData: SNo carries the "Total" label; numeric keys hold summed values
    const inputFooterData = useMemo(() => {
        if (!inputTaxData.length || !inputTotals) return null;
        return {
            SNo: t('Total'),
            ...Object.fromEntries(NUMERIC_KEYS.map(k => [k, inputTotals[k].toFixed(decimalPart)]))
        };
    }, [inputTaxData, inputTotals, decimalPart, t]);

    const outputFooterData = useMemo(() => {
        if (!outputTaxData.length || !outputTotals) return null;
        return {
            SNo: t('Total'),
            ...Object.fromEntries(NUMERIC_KEYS.map(k => [k, outputTotals[k].toFixed(decimalPart)]))
        };
    }, [outputTaxData, outputTotals, decimalPart, t]);

    // ── renderCell ─────────────────────────────────────────────────────────
    const renderCell = (key, row) => {
        if (NUMERIC_KEYS.includes(key)) {
            return (
                <span className="font-mono">
                    {(parseFloat(row[key]) || 0).toFixed(decimalPart)}
                </span>
            );
        }
        return row[key] ?? '-';
    };

    /* ── Export ─────────────────────────────────────────────────────────── */
    const getExportOptions = () => {
        const visibleColumnsList = allColumns.filter(col => visibleColumns[col.key]);

        const exportData = reportData.map((row, index) => {
            const exportRow = { SNo: index + 1, InputorOutput: row.InputorOutput || '' };
            visibleColumnsList.forEach(col => {
                exportRow[col.key] = NUMERIC_KEYS.includes(col.key)
                    ? Number(row[col.key] || 0).toFixed(decimalPart)
                    : row[col.key] || '';
            });
            return exportRow;
        });

        const footer = { label: t('Total') };
        if (combinedTotals) {
            NUMERIC_KEYS.forEach(k => {
                if (visibleColumns[k]) footer[k] = combinedTotals[k].toFixed(decimalPart);
            });
        }

        return {
            fileName: 'Tax_Detailed_Report',
            sheetName: 'Tax Detailed',
            title: t('taxDetailedReport.breadcrumb.title') || 'Tax Detailed Report',
            subtitle: `Input: ${inputTaxData.length} | Output: ${outputTaxData.length} | Total: ${reportData.length}`,
            reportInfo: {
                title: t('taxDetailedReport.breadcrumb.title') || 'Tax Detailed Report',
                subtitle: `Input: ${inputTaxData.length} | Output: ${outputTaxData.length}`,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 8 },
                { key: 'InputorOutput', label: 'Type', align: 'center', width: 10 },
                ...visibleColumnsList.map(col => ({
                    key: col.key,
                    label: col.label,
                    align: col.align || 'left',
                    width: 15,
                    type: NUMERIC_KEYS.includes(col.key) ? 'currency' : 'text'
                }))
            ]
        };
    };

    const hasData = reportData?.length > 0;

    const handleExportExcel = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToExcel(getExportOptions()); };
    const handleExportPdf = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' }); };
    const handleExportCsv = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToCsv(getExportOptions()); };

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        setFilters({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], taxId: null, voucherType: null, supplierOrCustomerId: null });
        setReportData(null);
        setInputTaxData([]);
        setOutputTaxData([]);
    };

    /* ── Options ────────────────────────────────────────────────────────── */
    const taxOptions = taxData.map(tax => ({ label: tax.taxName || tax.name, value: tax.taxId || tax.id }));

    const supplierCustomerOptions = supplierCustomerData.map(item => ({
        label: `${item.ledgerName} (${item.ledgerType})`,
        value: item.ledgerId
    }));

    const handleRowClick = (row) => {
        if (!row.Id) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.Id}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.Id}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.Id}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.Id}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.Id}`,
            'Payment Voucher': `/transaction/payment-voucher/edit-payment-voucher/${row.Id}`,
            'Receipt Voucher': `/transaction/reciept-voucher/edit-reciept-voucher/${row.Id}`,
            'Contra Voucher': `/transaction/contra-voucher/edit-contra-voucher/${row.Id}`,
            'Material Receipt': `/transaction/material-receipt/edit/${row.Id}`,
            'Delivery Note': `/transaction/delivery-note/edit-delivery-note/${row.Id}`,
            'Payable': `/transaction/payable-voucher/edit/${row.Id}`,
            'Receivable': `/transaction/receivable-voucher/edit/${row.Id}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.Id}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.Id}`,
        };

        const path = routes[row.VoucherType];
        if (path) navigate(path);
    };

    const voucherTypeOptions = [
        { label: 'Contra Voucher', value: 'Contra Voucher' },
        { label: 'Payment Voucher', value: 'Payment Voucher' },
        { label: 'Receipt Voucher', value: 'Receipt Voucher' },
        { label: 'Journal Voucher', value: 'Journal Voucher' },
        { label: 'Material Receipt', value: 'Material Receipt' },
        { label: 'Purchase Invoice', value: 'Purchase Invoice' },
        { label: 'Purchase Return', value: 'Purchase Return' },
        { label: 'Delivery Note', value: 'Delivery Note' },
        { label: 'Sales Invoice', value: 'Sales Invoice' },
        { label: 'Sales Return', value: 'Sales Return' },
        { label: 'Physical Stock', value: 'Physical Stock' },
        { label: 'Damage Stock', value: 'Damage Stock' },
        { label: 'Opening Balance', value: 'Opening Balance' },
        { label: 'Opening Stock', value: 'Opening Stock' },
        { label: 'Receivable', value: 'Receivable' },
        { label: 'Payable', value: 'Payable' },
    ];

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("taxDetailedReport.breadcrumb.group"), url: "#" },
        { title: t("taxDetailedReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: FileText, title: t("taxDetailedReport.breadcrumb.title") };

    if (privilegeLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

    /* ── Main Render ────────────────────────────────────────────────────── */
    return (
        <div>
            <BreadCrumb
                routes={breadcrumbRoutes}
                heading={breadcrumbHeading}
                exportConfig={hasData ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="flex gap-2 px-1">
                {/* Column Visibility Sidebar */}
                <div className="w-[120px] flex-shrink-0">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-2 border border-gray-200 dark:border-gray-700 sticky top-2">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                                {t('Columns')}
                            </span>
                            <span className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 py-0.5 rounded">
                                {checkedCount}
                            </span>
                        </div>
                        <div className="space-y-0.5 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {allColumns.map((column) => (
                                <label
                                    key={column.key}
                                    className="flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns[column.key]}
                                        onChange={() => toggleColumn(column.key)}
                                        className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0"
                                    />
                                    <span className="text-[10px] text-gray-700 dark:text-gray-300 truncate">
                                        {column.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <TaxDetailedReportFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        taxOptions={taxOptions}
                        supplierCustomerOptions={supplierCustomerOptions}
                        voucherTypeOptions={voucherTypeOptions}
                        loading={loading}
                        hasReportData={hasData}
                        resetFilters={resetFilters}
                    />

                    {/* Split View: Input | Output */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* LEFT: Input Tax */}
                        <div className="min-w-0">
                            <div className="bg-gray-600 dark:bg-gray-700 text-white text-center py-1 rounded-t-lg text-xs font-semibold">
                                {t('Input Tax')} ({inputTaxData.length})
                            </div>
                            <ContentTable
                                tableId="tax-detailed-input"
                                columns={displayColumns}
                                data={inputTaxData}
                                loading={loading}
                                renderCell={renderCell}
                                footerData={inputFooterData}
                                staticSearchable
                                pageSize={80}
                                maxHeight="calc(100vh - 270px)"
                                onRowClick={handleRowClick}
                            />
                        </div>

                        {/* RIGHT: Output Tax */}
                        <div className="min-w-0">
                            <div className="bg-gray-600 dark:bg-gray-700 text-white text-center py-1 rounded-t-lg text-xs font-semibold">
                                {t('Output Tax')} ({outputTaxData.length})
                            </div>
                            <ContentTable
                                tableId="tax-detailed-output"
                                columns={displayColumns}
                                data={outputTaxData}
                                loading={loading}
                                renderCell={renderCell}
                                footerData={outputFooterData}
                                staticSearchable
                                pageSize={80}
                                maxHeight="calc(100vh - 270px)"
                                onRowClick={handleRowClick}
                            />
                        </div>
                    </div>

                    {!loading && reportData !== null && !hasData && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('No data found for the selected filters')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxDetailedReport;