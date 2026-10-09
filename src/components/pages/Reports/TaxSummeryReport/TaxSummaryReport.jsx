// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxSummeryReport\TaxSummaryReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Receipt, FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TaxSummaryReportFilters from './TaxSummaryReportFilters';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TaxSummaryReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [inputTaxData, setInputTaxData] = useState([]);
    const [outputTaxData, setOutputTaxData] = useState([]);

    const [taxData, setTaxData] = useState([]);
    const { selectedBranchId, currentCurrency, selectedBranchDetails, branches } = useAuth();
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

    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Tax Summary Report");
    const { generalSettings } = useSelector((state) => state.settings);

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
                branchId: isMainBranch
                    ? (filters.selectedBranchId ?? null)
                    : Number(selectedBranchId) || 1,
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

    const hasData = (inputTaxData.length > 0 || outputTaxData.length > 0);

    const totalTaxPayable = (outputTotals?.TaxAmount || 0) - (inputTotals?.TaxAmount || 0);

    const exportColumns = [
        { key: 'SNo', label: '#', align: 'center', width: 8 },
        { key: 'Date', label: t('taxSummeryReport.columns.Date') || 'Date', align: 'center', width: 12 },
        { key: 'VoucherType', label: t('taxSummeryReport.columns.VoucherType') || 'Voucher Type', align: 'left', width: 18 },
        { key: 'VoucherNo', label: t('taxSummeryReport.columns.VoucherNo') || 'Voucher No', align: 'left', width: 14 },
        { key: 'TaxAmount', label: t('taxSummeryReport.columns.TaxAmount') || 'Tax Amount', align: 'right', width: 14 },
        { key: 'BillAmount', label: t('taxSummeryReport.columns.BillAmount') || 'Bill Amount', align: 'right', width: 14 },
    ];

    /* ══════════════════════════════════════════════════════════════════
       EXPORT #1 — EXCEL
       ══════════════════════════════════════════════════════════════════ */
    const handleExportExcel = async () => {
        if (!hasData) { alert(t('No data to export')); return; }

        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const rows = [];

        rows.push([t('taxSummeryReport.breadcrumb.title') || 'Tax Summary Report']);
        rows.push([`Period: ${filters.fromDate} to ${filters.toDate}`]);
        rows.push([]);
        rows.push(exportColumns.map(c => c.label));

        rows.push(['Input']);
        inputTaxData.forEach((row, i) => {
            rows.push([
                i + 1,
                row.Date || '',
                row.VoucherType || '',
                row.VoucherNo || '',
                Number(row.TaxAmount || 0).toFixed(decimalPart),
                Number(row.BillAmount || 0).toFixed(decimalPart),
            ]);
        });
        rows.push(['', '', '', 'TOTAL',
            inputTotals ? inputTotals.TaxAmount.toFixed(decimalPart) : '0.00',
            inputTotals ? inputTotals.BillAmount.toFixed(decimalPart) : '0.00']);

        rows.push(['Output']);
        outputTaxData.forEach((row, i) => {
            rows.push([
                i + 1,
                row.Date || '',
                row.VoucherType || '',
                row.VoucherNo || '',
                Number(row.TaxAmount || 0).toFixed(decimalPart),
                Number(row.BillAmount || 0).toFixed(decimalPart),
            ]);
        });
        rows.push(['', '', '', 'TOTAL',
            outputTotals ? outputTotals.TaxAmount.toFixed(decimalPart) : '0.00',
            outputTotals ? outputTotals.BillAmount.toFixed(decimalPart) : '0.00']);

        rows.push([]);
        rows.push(['', '', '', 'Total Tax Payable', totalTaxPayable.toFixed(decimalPart)]);

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Track which row indices are section headers, to bold/shade them
        const inputSectionRow = 4; // 0-indexed row of 'Input'
        const outputSectionRow = 5 + inputTaxData.length + 1; // after input rows + total row

        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r: inputSectionRow, c: 0 }, e: { r: inputSectionRow, c: 5 } });
        ws['!merges'].push({ s: { r: outputSectionRow, c: 0 }, e: { r: outputSectionRow, c: 5 } });

        const styleCell = (addr, style) => {
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };
            ws[addr].s = style;
        };

        const sectionStyle = {
            fill: { fgColor: { rgb: '4B5563' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
            alignment: { horizontal: 'left', vertical: 'center' }
        };

        styleCell(XLSX.utils.encode_cell({ r: inputSectionRow, c: 0 }), sectionStyle);
        styleCell(XLSX.utils.encode_cell({ r: outputSectionRow, c: 0 }), sectionStyle);

        ws['!cols'] = exportColumns.map(c => ({ wch: (c.width || 12) + 4 }));

        XLSX.utils.book_append_sheet(wb, ws, 'Tax Summary');
        XLSX.writeFile(wb, `Tax_Summary_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
    };

    /* ══════════════════════════════════════════════════════════════════
       EXPORT #2 — PDF
       ══════════════════════════════════════════════════════════════════ */
    const handleExportPdf = () => {
        if (!hasData) { alert(t('No data to export')); return; }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        let currentY = margin;

        const companyName = selectedBranchDetails?.branchName || selectedBranchDetails?.companyName || '';
        const companyAddress = selectedBranchDetails?.address || '';
        const companyPhone = selectedBranchDetails?.phone || selectedBranchDetails?.mobile || '';

        const HEADER_BG = [44, 62, 80];
        const HEADER_TEXT = [255, 255, 255];
        const SECTION_BG = [75, 85, 99];
        const SECTION_TEXT = [255, 255, 255];
        const TOTAL_BG = [225, 229, 232];
        const FOOTER_BG = [213, 216, 220];
        const BORDER = [149, 165, 166];

        const formatDate = (d) => {
            const dt = new Date(d);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${String(dt.getDate()).padStart(2,'0')}-${months[dt.getMonth()]}-${dt.getFullYear()}`;
        };

        if (companyName) {
            doc.setFillColor(...HEADER_BG);
            doc.rect(margin, currentY, pageWidth - margin * 2, 12, 'F');
            doc.setTextColor(...HEADER_TEXT);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, pageWidth / 2, currentY + 8, { align: 'center' });
            currentY += 12;
        }

        if (companyAddress || companyPhone) {
            doc.setFillColor(52, 73, 94);
            doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const contact = [companyAddress, companyPhone ? `Phone: ${companyPhone}` : ''].filter(Boolean).join(' | ');
            doc.text(contact, pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 8;
        }

        currentY += 2;

        doc.setFillColor(236, 240, 241);
        doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(...HEADER_BG);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('taxSummeryReport.breadcrumb.title') || 'Tax Summary Report', pageWidth / 2, currentY + 7, { align: 'center' });
        currentY += 10;

        doc.setFillColor(236, 240, 241);
        doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
        doc.setTextColor(102, 102, 102);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${formatDate(filters.fromDate)} to ${formatDate(filters.toDate)}`, margin + 5, currentY + 5);
        doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - margin - 5, currentY + 5, { align: 'right' });
        currentY += 9;

        const tableHeaders = exportColumns.map(c => c.label);
        const rowMeta = [];

        const buildDataRow = (row, idx) => {
            rowMeta.push('data');
            return [
                idx + 1,
                row.Date || '',
                row.VoucherType || '',
                row.VoucherNo || '',
                Number(row.TaxAmount || 0).toFixed(decimalPart),
                Number(row.BillAmount || 0).toFixed(decimalPart),
            ];
        };

        const buildTotalRow = (totals) => {
            rowMeta.push('total');
            return ['', '', '', 'TOTAL',
                totals ? totals.TaxAmount.toFixed(decimalPart) : '0.00',
                totals ? totals.BillAmount.toFixed(decimalPart) : '0.00'];
        };

        const buildSectionRow = (label) => {
            rowMeta.push('section');
            return [label, '', '', '', '', ''];
        };

        const tableData = [
            buildSectionRow('Input'),
            ...inputTaxData.map(buildDataRow),
            buildTotalRow(inputTotals),
            buildSectionRow('Output'),
            ...outputTaxData.map(buildDataRow),
            buildTotalRow(outputTotals),
        ];

        rowMeta.push('grandfooter');
        tableData.push(['', '', '', 'Total Tax Payable', totalTaxPayable.toFixed(decimalPart), '']);

        const availableWidth = pageWidth - margin * 2;
        const totalDefinedWidth = exportColumns.reduce((sum, c) => sum + c.width, 0);
        const columnStyles = {};
        exportColumns.forEach((col, index) => {
            columnStyles[index] = {
                halign: col.align || 'left',
                cellWidth: (col.width / totalDefinedWidth) * availableWidth,
                cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }
            };
        });

        autoTable(doc, {
            head: [tableHeaders],
            body: tableData,
            startY: currentY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
                lineColor: BORDER,
                lineWidth: 0.1,
                textColor: [51, 51, 51],
                font: 'helvetica'
            },
            headStyles: {
                fillColor: HEADER_BG,
                textColor: HEADER_TEXT,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 9
            },
            bodyStyles: { fillColor: [255, 255, 255], minCellHeight: 6 },
            alternateRowStyles: { fillColor: [248, 249, 249] },
            columnStyles,
            didParseCell: (data) => {
                if (data.section !== 'body') return;
                const type = rowMeta[data.row.index];

                if (type === 'section') {
                    data.cell.styles.fillColor = SECTION_BG;
                    data.cell.styles.textColor = SECTION_TEXT;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 10;
                    data.cell.styles.halign = 'left';
                    data.cell.styles.minCellHeight = 8;
                    if (data.column.index !== 0) data.cell.text = [];
                }

                if (type === 'total') {
                    data.cell.styles.fillColor = TOTAL_BG;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 8.5;
                }

                if (type === 'grandfooter') {
                    data.cell.styles.fillColor = FOOTER_BG;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 10;
                    data.cell.styles.textColor = [192, 57, 43];
                }
            },
            willDrawCell: (data) => {
                if (data.section === 'body' && rowMeta[data.row.index] === 'section' && data.column.index === 0) {
                    const fullWidth = data.table.columns.reduce((sum, c) => sum + c.width, 0);
                    doc.setFillColor(...SECTION_BG);
                    doc.rect(data.cell.x, data.cell.y, fullWidth, data.cell.height, 'F');
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && rowMeta[data.row.index] === 'section' && data.column.index === 0) {
                    doc.setTextColor(...SECTION_TEXT);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(String(data.row.raw[0] || ''), data.cell.x + 3, data.cell.y + data.cell.height / 2 + 1.5);
                }
            },
            didDrawPage: () => {
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.setFont('helvetica', 'normal');
                doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
            }
        });

        doc.save(`Tax_Summary_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
    };

    /* ══════════════════════════════════════════════════════════════════
       EXPORT #3 — CSV
       ══════════════════════════════════════════════════════════════════ */
    const handleExportCsv = () => {
        if (!hasData) { alert(t('No data to export')); return; }

        const escapeCsv = (val) => {
            const str = String(val ?? '');
            return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const lines = [];
        lines.push([t('taxSummeryReport.breadcrumb.title') || 'Tax Summary Report'].join(','));
        lines.push([`Period: ${filters.fromDate} to ${filters.toDate}`].join(','));
        lines.push('');
        lines.push(exportColumns.map(c => escapeCsv(c.label)).join(','));

        lines.push(',,--- INPUT ---,,,');
        inputTaxData.forEach((row, i) => {
            lines.push([
                i + 1,
                escapeCsv(row.Date || ''),
                escapeCsv(row.VoucherType || ''),
                escapeCsv(row.VoucherNo || ''),
                Number(row.TaxAmount || 0).toFixed(decimalPart),
                Number(row.BillAmount || 0).toFixed(decimalPart),
            ].join(','));
        });
        lines.push([
            '', '', '', 'TOTAL',
            inputTotals ? inputTotals.TaxAmount.toFixed(decimalPart) : '0.00',
            inputTotals ? inputTotals.BillAmount.toFixed(decimalPart) : '0.00'
        ].join(','));

        lines.push(',,--- OUTPUT ---,,,');
        outputTaxData.forEach((row, i) => {
            lines.push([
                i + 1,
                escapeCsv(row.Date || ''),
                escapeCsv(row.VoucherType || ''),
                escapeCsv(row.VoucherNo || ''),
                Number(row.TaxAmount || 0).toFixed(decimalPart),
                Number(row.BillAmount || 0).toFixed(decimalPart),
            ].join(','));
        });
        lines.push([
            '', '', '', 'TOTAL',
            outputTotals ? outputTotals.TaxAmount.toFixed(decimalPart) : '0.00',
            outputTotals ? outputTotals.BillAmount.toFixed(decimalPart) : '0.00'
        ].join(','));

        lines.push('');
        lines.push(['', '', '', 'Total Tax Payable', totalTaxPayable.toFixed(decimalPart)].join(','));

        const csvContent = lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Tax_Summary_Report_${filters.fromDate}_to_${filters.toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        setFilters({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], taxId: 'All', optional: false, formType: 'All' });
        setReportData(null);
        setInputTaxData([]);
        setOutputTaxData([]);
    };

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

    const breadcrumbRoutes = [
        { title: t("taxSummeryReport.breadcrumb.group"), url: "#" },
        { title: t("taxSummeryReport.breadcrumb.title"), url: "#" },
    ];
    const breadcrumbHeading = { icon: Receipt, title: t("taxSummeryReport.breadcrumb.title") };

    if (privilegeLoading) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><Preloader /></div>;
    if (!hasAccess) return <div><BreadCrumb routes={breadcrumbRoutes} heading={breadcrumbHeading} /><NoAcessComponent message={message} /></div>;

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
                    isMainBranch={isMainBranch}
                    branchOptions={branchOptions}
                />

                <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                        <div className="bg-gray-600 dark:bg-gray-700 text-white text-center py-1 text-xs font-semibold mb-1">
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