import ContentTable from '@/components/common/ContentTable';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const AccountGroupDetailTable = ({ fromDate, toDate, ledgerId, costCenterId }) => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const { currentCurrency, selectedBranchId } = useAuth();
    const { t } = useTranslation();
    const { generalSettings } = useSelector((state) => state.settings);

    useEffect(() => {
        if (ledgerId) {
            fetchReport();
        }
    }, [ledgerId, fromDate, toDate, costCenterId]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.post("accountledger-detailed-report", {
                fromDate,
                toDate,
                branchId: selectedBranchId,
                ledgerId,
                currencyId: currentCurrency.currencyId,
                isShowOpeningBalance: true,
                costCentreId: costCenterId || null
            });
            setReportData(res.data.data);
        } catch (error) {
            console.error("Error fetching report:", error);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const dp = generalSettings?.decimalPart || 2;

    // Mirrors formatClosingBalance from AccountGroupReport,
    // but applied as a running balance row-by-row
    const rowsWithBalance = useMemo(() => {
        if (!Array.isArray(reportData)) return [];

        let runningBalance = 0;

        return reportData.map((row) => {
            const isOpeningRow = row.voucherType === 'Opening Balance';

            if (isOpeningRow) {
                // Opening row carries its own op value; set running balance from it
                runningBalance = parseFloat(row.op ?? row.Debit ?? 0) - parseFloat(row.Credit ?? 0);
            } else {
                runningBalance =
                    runningBalance +
                    parseFloat(row.Debit || 0) -
                    parseFloat(row.Credit || 0);
            }

            const absBalance = Math.abs(runningBalance);
            const label = runningBalance < 0 ? 'Cr' : 'Dr';

            return {
                ...row,
                _balance: runningBalance,
                _balanceDisplay: `${absBalance.toFixed(dp)} ${label}`
            };
        });
    }, [reportData, dp]);

    const columns = [
        { key: 'SNo',         label: t('acLedgerReport.grid.columns.SINO') },
        { key: 'ledgerCode',  label: t('acLedgerReport.grid.columns.ledgerCode'),width:'80px' },
        { key: 'Date',        label: t('acLedgerReport.grid.columns.Date') },
        { key: 'voucherType', label: t('acLedgerReport.grid.columns.voucherType') },
        { key: 'voucherNo',   label: t('acLedgerReport.grid.columns.voucherNo') },
        { key: 'Narration',   label: t('acLedgerReport.grid.columns.Narration') },
        { key: 'Debit',       label: t('acLedgerReport.grid.columns.Debit'),   width:'140px' ,   align: 'right' },
        { key: 'Credit',      label: t('acLedgerReport.grid.columns.Credit'),  width:'140px' ,   align: 'right' },
        { key: 'CostCentre',  label: t('acLedgerReport.grid.columns.CostCentre') },
        { key: 'balance',     label: t('acLedgerReport.grid.columns.balance') || 'Balance', align: 'right' ,width:'120px' },
    ];

    const navigate = useNavigate();

    const handleRowClick = (row) => {
        if (row.voucherType === 'Sales Invoice') {
            navigate(`/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.MasterId}`);
        }
        if (row.voucherType === 'Purchase Invoice') {
            navigate(`/transaction/purchase-invoice/edit-purchase-invoice/${row.MasterId}`);
        }
        if (row.voucherType === 'Sales Return') {
            navigate(`/transaction/sales-return/return-list/edit-sales-return/${row.MasterId}`);
        }
        if (row.voucherType === 'Journal Voucher') {
            navigate(`/transaction/journal-voucher/edit-journal-voucher/${row.MasterId}`);
        }
        if (row.voucherType === 'Payable Voucher') {
            navigate(`/transaction/payable-voucher/edit/${row.MasterId}`);
        }
        if (row.voucherType === 'Receivable Voucher') {
            navigate(`/transaction/receivable-voucher/edit/${row.MasterId}`);
        }
    };

    const renderCell = (key, row) => {
        if (key === 'Date' && row[key]) {
            return new Date(row[key]).toLocaleDateString();
        }

        if (key === 'Debit') {
            return (
                <div className="text-sm text-right">
                    {Number(row.Debit || 0).toFixed(dp)}
                </div>
            );
        }

        if (key === 'Credit') {
            return (
                <div className="text-sm text-right">
                    {Number(row.Credit || 0).toFixed(dp)}
                </div>
            );
        }

        if (key === 'balance') {
            const colorClass = row._balance < 0 ? 'text-red-600' : 'text-green-600';
            return (
                <span className={`font-semibold ${colorClass}`} style={{ textAlign: 'right', display: 'block' }}>
                    {row._balanceDisplay}
                </span>
            );
        }

        return row[key] ?? '-';
    };

    return (
        <div>
            <ContentTable
                columns={columns}
                data={rowsWithBalance}
                loading={loading}
                renderCell={renderCell}
                onRowClick={handleRowClick}
                maxHeight='calc(100vh - 240px)'
            />
        </div>
    );
};

export default AccountGroupDetailTable;