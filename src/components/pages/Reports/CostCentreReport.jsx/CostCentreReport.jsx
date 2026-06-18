// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\CostCentreReport\CostCentreReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CostCentreReportFilter from './CostCentreReportFilter';
import ContentTable from '@/components/common/ContentTable';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

const CostCentreReport = ({ type }) => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [costCenterData, setCostCenterData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Cost Centre Report");
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);
const navigate = useNavigate();
    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        costCentreId: '',
    });

    useEffect(() => {
        fetchCostCenterData();
    }, []);

    const calculateRowTotal = (index, dcDebit, dcCredit, strPreBalance) => {
        let rowBalance = 0;
        let strCrOrDr = "";

        if (index > 0 && strPreBalance) {
            const strLastBalance = strPreBalance.toString().trim().split(' ');
            if (strLastBalance.length >= 2) {
                const lastAmount = parseFloat(strLastBalance[0]) || 0;
                const lastType = strLastBalance[1];

                if (lastType === "Dr") {
                    dcDebit = lastAmount + dcDebit;
                } else if (lastType === "Cr") {
                    dcCredit = lastAmount + dcCredit;
                }
            } else {
                const lastAmount = parseFloat(strPreBalance) || 0;
                if (lastAmount > 0) {
                    dcDebit = lastAmount + dcDebit;
                } else {
                    dcCredit = Math.abs(lastAmount) + dcCredit;
                }
            }
        }

        rowBalance = dcDebit - dcCredit;

        const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
        if (isCrDr) {
            if (rowBalance > 0) {
                strCrOrDr = " Dr";
            } else if (rowBalance < 0) {
                rowBalance = Math.abs(rowBalance);
                strCrOrDr = " Cr";
            }
        } else {
            strCrOrDr = "";
        }

        return rowBalance.toFixed(generalSettings?.decimalPart || 2) + strCrOrDr;
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.post("costcentre-report", {
                fromdate: filters.fromDate,
                todate: filters.toDate,
                branchid: selectedBranchId,
                currencyid: currentCurrency.currencyId,
                costcentreid: filters.costCentreId || null
            });

            if (res.data.data && Array.isArray(res.data.data)) {
                const dataWithBalance = [];

                for (let index = 0; index < res.data.data.length; index++) {
                    const row = res.data.data[index];
                    let strBal = "";

                    if (index === 0) {
                        strBal = calculateRowTotal(0, parseFloat(row.debit || 0), parseFloat(row.credit || 0), "");
                    } else {
                        const prevBalance = dataWithBalance[index - 1]?.Balance || "";
                        strBal = calculateRowTotal(index, parseFloat(row.debit || 0), parseFloat(row.credit || 0), prevBalance);
                    }

                    dataWithBalance.push({ ...row, Balance: strBal });
                }

                setReportData(dataWithBalance);
            } else {
                setReportData(null);
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (row) => {
    if (!row.masterid) return;

    const routes = {
        'Sales Invoice':    `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.masterid}`,
        'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.masterid}`,
        'Sales Return':     `/transaction/sales-return/return-list/edit-sales-return/${row.masterid}`,
        'Purchase Return':  `/transaction/purchase-return/edit-purchase-return/${row.masterid}`,
        'Journal Voucher':  `/transaction/journal-voucher/edit-journal-voucher/${row.masterid}`,
        'Payment Voucher':  `/transaction/payment-voucher/edit-payment-voucher/${row.masterid}`,
        'Receipt Voucher':  `/transaction/reciept-voucher/edit-reciept-voucher/${row.masterid}`,
        'Contra Voucher':   `/transaction/contra-voucher/edit-contra-voucher/${row.masterid}`,
        'Material Receipt': `/transaction/material-receipt/edit/${row.masterid}`,
        'Delivery Note':    `/transaction/delivery-note/edit-delivery-note/${row.masterid}`,
        'Payable':          `/transaction/payable-voucher/edit/${row.masterid}`,
        'Receivable':       `/transaction/receivable-voucher/edit/${row.masterid}`,
        'Physical Stock':   `/transaction/physical-stock/edit/${row.masterid}`,
        'Damage Stock':     `/transaction/damage-stock/edit/${row.masterid}`,
    };

    const path = routes[row.voucherType];
    if (path) navigate(path);
};

    const fetchCostCenterData = async () => {
        try {
            const res = await axiosInstance.get("cost-centres");
            setCostCenterData(res.data.data || []);
        } catch (err) {
            console.error("Error fetching cost centers:", err);
        }
    };

    const { totalDebit, totalCredit, closingBalance } = useMemo(() => {
        if (!reportData || !Array.isArray(reportData)) {
            return { totalDebit: 0, totalCredit: 0, closingBalance: '' };
        }

        let debit = 0;
        let credit = 0;
        let balance = '';

        reportData.forEach((row) => {
            debit += parseFloat(row.debit || 0);
            credit += parseFloat(row.credit || 0);
            balance = row.Balance;
        });

        return { totalDebit: debit, totalCredit: credit, closingBalance: balance };
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        return {
            label: t('Total'),
            debit: totalDebit.toFixed(generalSettings?.decimalPart || 2),
            credit: totalCredit.toFixed(generalSettings?.decimalPart || 2),
            balance: closingBalance
        };
    }, [reportData, totalDebit, totalCredit, closingBalance, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const selectedCostCenter = costCenterData.find(c => c.costCentreId === filters.costCentreId);
        const costCenterName = selectedCostCenter?.CostCentre || 'All Cost Centres';

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            date: row.date || '',
            voucherType: row.voucherType || '',
            voucherNo: row.voucherNo || '',
            ledgername: row.ledgername || '',
            Narration: row.Narration || '',
            debit: Number(row.debit || 0).toFixed(decimalPart),
            credit: Number(row.credit || 0).toFixed(decimalPart),
            balance: row.Balance || ''
        }));

        return {
            fileName: `Cost_Centre_Report_${costCenterName.replace(/\s+/g, '_')}`,
            sheetName: 'Cost Centre Report',
            title: t('costeCentreReport.breadcrumb.heading') || 'Cost Centre Report',
            subtitle: costCenterName,
            reportInfo: {
                title: t('costeCentreReport.breadcrumb.heading') || 'Cost Centre Report',
                subtitle: costCenterName,
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: {
                label: t('Total'),
                debit: totalDebit.toFixed(decimalPart),
                credit: totalCredit.toFixed(decimalPart),
                balance: closingBalance
            },
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 8 },
                { key: 'date', label: t('costeCentreReport.grid.columns.date') || 'Date', align: 'center', width: 12, type: 'date' },
                { key: 'voucherType', label: t('costeCentreReport.grid.columns.voucherType') || 'Voucher Type', align: 'left', width: 16 },
                { key: 'voucherNo', label: t('costeCentreReport.grid.columns.voucherNo') || 'Voucher No', align: 'left', width: 12 },
                { key: 'ledgername', label: t('costeCentreReport.grid.columns.ledgername') || 'Ledger Name', align: 'left', width: 25 },
                { key: 'Narration', label: t('costeCentreReport.grid.columns.Narration') || 'Narration', align: 'left', width: 25 },
                { key: 'debit', label: t('costeCentreReport.grid.columns.debit') || 'Debit', align: 'right', width: 14, type: 'currency' },
                { key: 'credit', label: t('costeCentreReport.grid.columns.credit') || 'Credit', align: 'right', width: 14, type: 'currency' },
                { key: 'balance', label: t('costeCentreReport.grid.columns.balance') || 'Balance', align: 'right', width: 16, type: 'balance' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0],
            costCentreId: '',
        });
        setReportData(null);
    };

    const costCenterOptions = costCenterData.map(center => ({
        label: center.CostCentre,
        value: center.costCentreId
    }));

    const columns = [
        { key: 'SNo', label: "#" },
        { key: 'date', label: t('costeCentreReport.grid.columns.date') },
        { key: 'voucherType', label: t('costeCentreReport.grid.columns.voucherType') },
        { key: 'voucherNo', label: t('costeCentreReport.grid.columns.voucherNo') },
        { key: 'ledgername', label: t('costeCentreReport.grid.columns.ledgername') },
        { key: 'Narration', label: t('costeCentreReport.grid.columns.Narration') },
        { key: 'debit', label: t('costeCentreReport.grid.columns.debit'), align: "right" },
        { key: 'credit', label: t('costeCentreReport.grid.columns.credit'), align: "right" },
        { key: 'balance', label: t('costeCentreReport.grid.columns.balance'), align: "right" },
    ];

    const renderCell = (key, row) => {
        if (!row) return "-";

        if (key === "balance") {
            const balanceStr = (row.Balance || row.balance || "0").toString();
            const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
            
            let displayBalance = "";
            let isNegative = false;
            
            if (isCrDr) {
                const parts = balanceStr.trim().split(' ');
                const amount = parseFloat(parts[0]) || 0;
                const label = parts[1] || "";
                displayBalance = `${amount.toFixed(generalSettings?.decimalPart || 2)} ${label}`.trim();
                isNegative = label === "Cr";
            } else {
                const amount = parseFloat(balanceStr) || 0;
                displayBalance = amount < 0 
                    ? `-${Math.abs(amount).toFixed(generalSettings?.decimalPart || 2)}` 
                    : Math.abs(amount).toFixed(generalSettings?.decimalPart || 2);
                isNegative = amount < 0;
            }

            return (
                <span style={{ color: isNegative ? "#dc2626" : "#16a34a", fontWeight: 500, textAlign: 'right' }}>
                    {displayBalance}
                </span>
            );
        }

        if (key === "credit") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.credit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }

        if (key === "debit") {
            return (
                <div className="text-sm">
                    <div className="flex items-center justify-end gap-1">
                        <span>{Number(row.debit || 0).toFixed(generalSettings?.decimalPart || 2)}</span>
                    </div>
                </div>
            );
        }

        return row[key] ?? "-";
    };

    if ( privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t(`costeCentreReport.breadcrumb.group`), url: "#" },
                        { title: t(`costeCentreReport.breadcrumb.heading`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`costeCentreReport.breadcrumb.heading`) }}
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
                        { title: t(`costeCentreReport.breadcrumb.group`), url: "#" },
                        { title: t(`costeCentreReport.breadcrumb.heading`), url: "#" },
                    ]}
                    heading={{ icon: BookOpen, title: t(`costeCentreReport.breadcrumb.heading`) }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t(`costeCentreReport.breadcrumb.group`), url: "#" },
                    { title: t(`costeCentreReport.breadcrumb.heading`), url: "#" },
                ]}
                heading={{ icon: BookOpen, title: t(`costeCentreReport.breadcrumb.heading`) }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />
            <CostCentreReportFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onGenerateReport={fetchReport}
                costCenterOptions={costCenterOptions}
                loading={loading}
                hasReportData={!!reportData}
                resetFilters={resetFilters}
            />
            <div className='px-1'>
                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    maxHeight='calc(100vh - 220px)'
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
};

export default CostCentreReport;