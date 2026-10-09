// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxDetailedReport\TaxDetailedReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TaxDetailedReportFilters from './TaxDetailedReportFilters';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TaxDetailedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [inputTaxData, setInputTaxData] = useState([]);
    const [outputTaxData, setOutputTaxData] = useState([]);

    const [taxData, setTaxData] = useState([]);
    const [supplierCustomerData, setSupplierCustomerData] = useState([]);

    const { selectedBranchId, selectedBranchDetails } = useAuth();
    const isMainBranch = selectedBranchDetails?.mainBranch === true;

    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Tax Detailed Report");
    const { generalSettings } = useSelector((state) => state.settings);

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
        { key: 'VATNo', label: t('VAT No'), defaultVisible: true, align: 'left' },
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
                ledgerTypes: ["Customer", "Supplier", "Customer&Supplier"],
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
            branchId: isMainBranch
                ? (filters.selectedBranchId ?? null)
                : Number(selectedBranchId) || 1,
            dummy: false,
            ledgerId: filters.supplierOrCustomerId ? parseInt(filters.supplierOrCustomerId) : null,
            voucherType: filters.voucherType || null,
            cashOrParty: filters.supplierOrCustomerId ? parseInt(filters.supplierOrCustomerId) : null,
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

    const hasData = reportData?.length > 0;

    const visibleColumnsList = useMemo(
        () => allColumns.filter(col => visibleColumns[col.key]),
        [visibleColumns]
    );

    const exportColumns = useMemo(() => [
        { key: 'SNo', label: '#', align: 'center', width: 8 },
        ...visibleColumnsList.map(col => ({
            key: col.key,
            label: col.label,
            align: col.align || 'left',
            width: NUMERIC_KEYS.includes(col.key) ? 14 : 16,
            isNumeric: NUMERIC_KEYS.includes(col.key)
        }))
    ], [visibleColumnsList]);

    /* ══════════════════════════════════════════════════════════════════
       EXPORT #1 — EXCEL
       ══════════════════════════════════════════════════════════════════ */
    const handleExportExcel = async () => {
        if (!hasData) { alert(t('No data to export')); return; }

        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const rows = [];

        rows.push([t('taxDetailedReport.breadcrumb.title') || 'Tax Detailed Report']);
        rows.push([`Period: ${filters.fromDate} to ${filters.toDate}`]);
        rows.push([]);
        rows.push(exportColumns.map(c => c.label));

        const buildRow = (row, idx) => [
            idx + 1,
            ...visibleColumnsList.map(col =>
                NUMERIC_KEYS.includes(col.key)
                    ? Number(row[col.key] || 0).toFixed(decimalPart)
                    : (row[col.key] || '')
            )
        ];

        const buildTotalLabelRow = (totals) => {
            const arr = new Array(exportColumns.length).fill('');
            const labelIdx = exportColumns.findIndex(c => !c.isNumeric && c.key !== 'SNo');
            arr[labelIdx >= 0 ? labelIdx : 1] = 'TOTAL';
            exportColumns.forEach((c, i) => {
                if (c.isNumeric && totals) arr[i] = totals[c.key].toFixed(decimalPart);
            });
            return arr;
        };

        const inputSectionRowIdx = rows.length;
        rows.push(['Input']);
        inputTaxData.forEach((row, i) => rows.push(buildRow(row, i)));
        rows.push(buildTotalLabelRow(inputTotals));

        const outputSectionRowIdx = rows.length;
        rows.push(['Output']);
        outputTaxData.forEach((row, i) => rows.push(buildRow(row, i)));
        rows.push(buildTotalLabelRow(outputTotals));

        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws['!merges'] = ws['!merges'] || [];
        const lastCol = exportColumns.length - 1;
        ws['!merges'].push({ s: { r: inputSectionRowIdx, c: 0 }, e: { r: inputSectionRowIdx, c: lastCol } });
        ws['!merges'].push({ s: { r: outputSectionRowIdx, c: 0 }, e: { r: outputSectionRowIdx, c: lastCol } });

        const sectionStyle = {
            fill: { fgColor: { rgb: '4B5563' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
            alignment: { horizontal: 'left', vertical: 'center' }
        };
        const styleCell = (addr, style) => {
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };
            ws[addr].s = style;
        };
        styleCell(XLSX.utils.encode_cell({ r: inputSectionRowIdx, c: 0 }), sectionStyle);
        styleCell(XLSX.utils.encode_cell({ r: outputSectionRowIdx, c: 0 }), sectionStyle);

        ws['!cols'] = exportColumns.map(c => ({ wch: (c.width || 12) + 4 }));

        XLSX.utils.book_append_sheet(wb, ws, 'Tax Detailed');
        XLSX.writeFile(wb, `Tax_Detailed_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`);
    };

    /* ══════════════════════════════════════════════════════════════════
       EXPORT #2 — PDF
       ══════════════════════════════════════════════════════════════════ */
    const handleExportPdf = () => {
        if (!hasData) { alert(t('No data to export')); return; }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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
        doc.text(t('taxDetailedReport.breadcrumb.title') || 'Tax Detailed Report', pageWidth / 2, currentY + 7, { align: 'center' });
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
        const labelColIdx = exportColumns.findIndex(c => !c.isNumeric && c.key !== 'SNo');

        const buildDataRow = (row, idx) => {
            rowMeta.push('data');
            return [
                idx + 1,
                ...visibleColumnsList.map(col =>
                    NUMERIC_KEYS.includes(col.key)
                        ? Number(row[col.key] || 0).toFixed(decimalPart)
                        : (row[col.key] || '')
                )
            ];
        };

        const buildTotalRow = (totals) => {
            rowMeta.push('total');
            const arr = new Array(exportColumns.length).fill('');
            arr[labelColIdx >= 0 ? labelColIdx : 1] = 'TOTAL';
            exportColumns.forEach((c, i) => {
                if (c.isNumeric && totals) arr[i] = totals[c.key].toFixed(decimalPart);
            });
            return arr;
        };

        const buildSectionRow = (label) => {
            rowMeta.push('section');
            const arr = new Array(exportColumns.length).fill('');
            arr[0] = label;
            return arr;
        };

        const tableData = [
            buildSectionRow('Input'),
            ...inputTaxData.map(buildDataRow),
            buildTotalRow(inputTotals),
            buildSectionRow('Output'),
            ...outputTaxData.map(buildDataRow),
            buildTotalRow(outputTotals),
        ];

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
                fontSize: 7.5,
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
                fontSize: 8.5
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
                    data.cell.styles.fontSize = 8;
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

        doc.save(`Tax_Detailed_Report_${filters.fromDate}_to_${filters.toDate}.pdf`);
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

        const labelColIdx = exportColumns.findIndex(c => !c.isNumeric && c.key !== 'SNo');

        const buildRow = (row, idx) => [
            idx + 1,
            ...visibleColumnsList.map(col =>
                NUMERIC_KEYS.includes(col.key)
                    ? Number(row[col.key] || 0).toFixed(decimalPart)
                    : escapeCsv(row[col.key] || '')
            )
        ].join(',');

        const buildTotalRow = (totals) => {
            const arr = new Array(exportColumns.length).fill('');
            arr[labelColIdx >= 0 ? labelColIdx : 1] = 'TOTAL';
            exportColumns.forEach((c, i) => {
                if (c.isNumeric && totals) arr[i] = totals[c.key].toFixed(decimalPart);
            });
            return arr.join(',');
        };

        const lines = [];
        lines.push([t('taxDetailedReport.breadcrumb.title') || 'Tax Detailed Report'].join(','));
        lines.push([`Period: ${filters.fromDate} to ${filters.toDate}`].join(','));
        lines.push('');
        lines.push(exportColumns.map(c => escapeCsv(c.label)).join(','));

        lines.push(',--- INPUT ---' + ','.repeat(Math.max(0, exportColumns.length - 2)));
        inputTaxData.forEach((row, i) => lines.push(buildRow(row, i)));
        lines.push(buildTotalRow(inputTotals));

        lines.push(',--- OUTPUT ---' + ','.repeat(Math.max(0, exportColumns.length - 2)));
        outputTaxData.forEach((row, i) => lines.push(buildRow(row, i)));
        lines.push(buildTotalRow(outputTotals));

        const csvContent = lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Tax_Detailed_Report_${filters.fromDate}_to_${filters.toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

    const resetFilters = () => {
        setFilters({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], taxId: null, voucherType: null, supplierOrCustomerId: null });
        setReportData(null);
        setInputTaxData([]);
        setOutputTaxData([]);
    };

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

                    <div className="grid grid-cols-2 gap-2">
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