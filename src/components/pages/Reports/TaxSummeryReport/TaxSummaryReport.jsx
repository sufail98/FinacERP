// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxSummeryReport\TaxSummaryReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import ContentTable from '@/components/common/ContentTable'; // ← replaces TaxDetailedContentTable
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Receipt, FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TaxSummaryReportFilters from './TaxSummaryReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const TaxSummaryReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [inputTaxData, setInputTaxData] = useState([]);
    const [outputTaxData, setOutputTaxData] = useState([]);

    const [taxData, setTaxData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Tax Summary Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

    const decimalPart = generalSettings?.decimalPart || 2;

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        taxId: 'All',
        optional: false,
        formType: 'All'
    });

    const columns = [
        { key: 'SNo', label: '#', align: 'center', width: '50' },
        { key: 'Date', label: t('taxSummeryReport.columns.Date') || 'Date', align: 'center', width: '100' },
        { key: 'VoucherType', label: t('taxSummeryReport.columns.VoucherType') || 'Voucher Type', align: 'left' },
        { key: 'VoucherNo', label: t('taxSummeryReport.columns.VoucherNo') || 'Voucher No', align: 'left' },
        { key: 'TaxAmount', label: t('taxSummeryReport.columns.TaxAmount') || 'Tax Amount', align: 'right' },
        { key: 'BillAmount', label: t('taxSummeryReport.columns.BillAmount') || 'Bill Amount', align: 'right' },
    ];

    useEffect(() => {
        fetchTaxData();
    }, [selectedBranchId]);

    const fetchTaxData = async () => {
        try {
            const res = await axiosInstance.get("tax-masters");
            setTaxData(res.data.data || []);
        } catch (err) {
            console.error("❌ Error fetching tax data:", err);
        }
    };
    const handleRowClick = (row) => {
        if (!row.ID) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.ID}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.ID}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.ID}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.ID}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.ID}`,
            'Payment Voucher': `/transaction/payment-voucher/edit-payment-voucher/${row.ID}`,
            'Receipt Voucher': `/transaction/reciept-voucher/edit-reciept-voucher/${row.ID}`,
            'Contra Voucher': `/transaction/contra-voucher/edit-contra-voucher/${row.ID}`,
            'Material Receipt': `/transaction/material-receipt/edit/${row.ID}`,
            'Delivery Note': `/transaction/delivery-note/edit-delivery-note/${row.ID}`,
            'Payable': `/transaction/payable-voucher/edit/${row.ID}`,
            'Receivable': `/transaction/receivable-voucher/edit/${row.ID}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.ID}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.ID}`,
        };

        const path = routes[row.VoucherType];
        if (path) navigate(path);
    };
    const transformData = (data) => {
        return data.map((item, index) => ({
            SNo: index + 1,
            ID: item.ID,
            Date: item.Date,
            VoucherType: item['Voucher Type'],
            VoucherNo: item['Voucher No'],
            TaxAmount: item['Tax Amount'],
            BillAmount: item['Bill Amount']
        }));
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const base = {
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                taxId: filters.taxId,
                type: 'All',
                branchId: parseInt(selectedBranchId) || 1,
                optional: filters.optional,
                currencyId: parseInt(currentCurrency?.currencyId) || 1,
                formType: filters.formType
            };

            const [inputRes, outputRes] = await Promise.all([
                axiosInstance.post("tax-summery-report", { ...base, input: true }),
                axiosInstance.post("tax-summery-report", { ...base, input: false })
            ]);

            const inputData = transformData(inputRes.data.data || []);
            const outputData = transformData(outputRes.data.data || []);

            setInputTaxData(inputData);
            setOutputTaxData(outputData);
            setReportData([
                ...inputData.map(item => ({ ...item, Type: 'Input' })),
                ...outputData.map(item => ({ ...item, Type: 'Output' }))
            ]);
        } catch (error) {
            console.error("❌ Tax Summary Report Error:", error);
            setReportData(null);
            setInputTaxData([]);
            setOutputTaxData([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (data) => {
        if (!data?.length) return null;
        return data.reduce((acc, row) => ({
            TaxAmount: acc.TaxAmount + (parseFloat(row.TaxAmount) || 0),
            BillAmount: acc.BillAmount + (parseFloat(row.BillAmount) || 0)
        }), { TaxAmount: 0, BillAmount: 0 });
    };

    const inputTotals = useMemo(() => calculateTotals(inputTaxData), [inputTaxData]);
    const outputTotals = useMemo(() => calculateTotals(outputTaxData), [outputTaxData]);
    const combinedTotals = useMemo(() => calculateTotals(reportData), [reportData]);

    // footerData shape: key matches column key → value shown in that footer cell
    const inputFooterData = useMemo(() => {
        if (!inputTaxData.length || !inputTotals) return null;
        return {
            SNo: t('Total'),
            TaxAmount: inputTotals.TaxAmount.toFixed(decimalPart),
            BillAmount: inputTotals.BillAmount.toFixed(decimalPart),
        };
    }, [inputTaxData, inputTotals, decimalPart, t]);

    const outputFooterData = useMemo(() => {
        if (!outputTaxData.length || !outputTotals) return null;
        return {
            SNo: t('Total'),
            TaxAmount: outputTotals.TaxAmount.toFixed(decimalPart),
            BillAmount: outputTotals.BillAmount.toFixed(decimalPart),
        };
    }, [outputTaxData, outputTotals, decimalPart, t]);

    /* ── renderCell ─────────────────────────────────────────────────────── */
    const renderCell = (key, row) => {
        if (key === 'TaxAmount' || key === 'BillAmount') {
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
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Type: row.Type || '',
            Date: row.Date || '',
            VoucherType: row.VoucherType || '',
            VoucherNo: row.VoucherNo || '',
            TaxAmount: Number(row.TaxAmount || 0).toFixed(decimalPart),
            BillAmount: Number(row.BillAmount || 0).toFixed(decimalPart),
        }));

        const footer = { label: t('Total') };
        if (combinedTotals) {
            footer.TaxAmount = combinedTotals.TaxAmount.toFixed(decimalPart);
            footer.BillAmount = combinedTotals.BillAmount.toFixed(decimalPart);
        }

        return {
            fileName: 'Tax_Summary_Report',
            sheetName: 'Tax Summary',
            title: t('taxSummeryReport.breadcrumb.title') || 'Tax Summary Report',
            subtitle: `Input: ${inputTaxData.length} | Output: ${outputTaxData.length}`,
            reportInfo: {
                title: t('taxSummeryReport.breadcrumb.title') || 'Tax Summary Report',
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
                { key: 'SNo', label: '#', align: 'center', width: 8, type: 'number' },
                { key: 'Type', label: 'Type', align: 'center', width: 10 },
                { key: 'Date', label: t('taxSummeryReport.columns.Date') || 'Date', align: 'center', width: 12, type: 'date' },
                { key: 'VoucherType', label: t('taxSummeryReport.columns.VoucherType') || 'Voucher Type', align: 'left', width: 18 },
                { key: 'VoucherNo', label: t('taxSummeryReport.columns.VoucherNo') || 'Voucher No', align: 'left', width: 14 },
                { key: 'TaxAmount', label: t('taxSummeryReport.columns.TaxAmount') || 'Tax Amount', align: 'right', width: 14, type: 'currency' },
                { key: 'BillAmount', label: t('taxSummeryReport.columns.BillAmount') || 'Bill Amount', align: 'right', width: 14, type: 'currency' },
            ]
        };
    };

    const hasData = reportData?.length > 0;

    const handleExportExcel = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToExcel(getExportOptions()); };
    const handleExportPdf = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' }); };
    const handleExportCsv = () => { if (!hasData) { alert(t('No data to export')); return; } exportGenericToCsv(getExportOptions()); };

    /* ── Filter handlers ────────────────────────────────────────────────── */
    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        setFilters({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], taxId: 'All', optional: false, formType: 'All' });
        setReportData(null);
        setInputTaxData([]);
        setOutputTaxData([]);
    };

    /* ── Options ────────────────────────────────────────────────────────── */
    const taxOptions = [
        { label: 'All', value: 'All' },
        ...taxData.map(tax => ({ label: tax.taxName || tax.name, value: tax.taxId || tax.id }))
    ];

    const formTypeOptions = [
        { label: 'All', value: 'All' },
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

    /* ── Privilege guards ───────────────────────────────────────────────── */
    const breadcrumbRoutes = [
        { title: t("taxSummeryReport.breadcrumb.group"), url: "#" },
        { title: t("taxSummeryReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: Receipt, title: t("taxSummeryReport.breadcrumb.title") };

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

            <div className="px-1">
                <TaxSummaryReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    taxOptions={taxOptions}
                    formTypeOptions={formTypeOptions}
                    loading={loading}
                    hasReportData={hasData}
                    resetFilters={resetFilters}
                />

                {/* Split View: Input | Output */}
                <div className="grid grid-cols-2 gap-2">
                    {/* LEFT: Input Tax */}
                    <div className="min-w-0">
                        <div className="bg-gray-600 dark:bg-gray-700 text-white text-center py-1  text-xs font-semibold mb-1">
                            {t('Input Tax')} ({inputTaxData.length})
                        </div>
                        <ContentTable
                            tableId="tax-summary-input"
                            columns={columns}
                            data={inputTaxData}
                            loading={loading}
                            renderCell={renderCell}
                            footerData={inputFooterData}
                            staticSearchable
                            pageSize={80}
                            maxHeight="calc(100vh - 240px)"
                            onRowClick={handleRowClick}
                        />
                    </div>

                    {/* RIGHT: Output Tax */}
                    <div className="min-w-0">
                        <div className="bg-gray-600 dark:bg-gray-700 text-white text-center py-1 text-xs font-semibold mb-1">
                            {t('Output Tax')} ({outputTaxData.length})
                        </div>
                        <ContentTable
                            tableId="tax-summary-output"
                            columns={columns}
                            data={outputTaxData}
                            loading={loading}
                            renderCell={renderCell}
                            footerData={outputFooterData}
                            staticSearchable
                            pageSize={80}
                            maxHeight="calc(100vh - 240px)"
                            onRowClick={handleRowClick}
                        />
                    </div>
                </div>

                {!loading && reportData !== null && !hasData && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center mt-4">
                        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('No data found for the selected filters')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxSummaryReport;