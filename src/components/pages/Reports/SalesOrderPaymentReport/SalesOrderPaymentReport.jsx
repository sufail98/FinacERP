// src/components/pages/Reports/SalesOrderPaymentReport/SalesOrderPaymentReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { CreditCard } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import useReportExport from '@/hooks/useReportExport';
import ContentTable from '@/components/common/ContentTable';
import SalesOrderPaymentReportFilters from './SalesOrderPaymentReportFilter';
import { useNavigate } from 'react-router-dom';

const SalesOrderPaymentReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);

    // Dropdown data
    const [partyData, setPartyData] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);
    const [cashOrBankData, setCashOrBankData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Sales Order Payment Report");
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
        cashOrBank: 0,
        status: 'All',
        payStatus: 'All',
        partyName: 'All'
    });

    // All available columns matching API response keys
    const allColumns = [
        { key: 'SalesOrderDate', label: t('Order Date'), defaultVisible: true, minWidth: '100px', align: 'center' },
        { key: 'SalesOrderNo', label: t('Order No'), defaultVisible: true, minWidth: '90px', align: 'left' },
        { key: 'LedgerName', label: t('Ledger Name'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'PartyName', label: t('Party Name'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'BillAmount', label: t('Bill Amt'), defaultVisible: true, minWidth: '100px', align: 'right' },
        { key: 'PreviousCollectedAmount', label: t('Prev. Collected'), defaultVisible: true, minWidth: '120px', align: 'right' },
        { key: 'PaidAmount', label: t('Paid Amt'), defaultVisible: true, minWidth: '100px', align: 'right' },
        { key: 'Balance', label: t('Balance'), defaultVisible: true, minWidth: '100px', align: 'right' },
    ];

    // Column visibility state
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => {
            initial[col.key] = col.defaultVisible;
        });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({
            ...prev,
            [columnKey]: !prev[columnKey]
        }));
    };
    const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.orderMasterId) return;

        navigate(`/transaction/sales-order/edit-sales-order/${row.orderMasterId}`);
    };
    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [partyRes, salesmanRes, cashOrBankRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer", "Supplier","Customer&Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("employees").catch(() => ({ data: { data: [] } })),
                axiosInstance.post("bank-account-ledgers", {
                    group_ids: [5, 8],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } }))
            ]);

            setPartyData(partyRes.data.data || []);
            setSalesmanData(salesmanRes.data.data || []);
            setCashOrBankData(cashOrBankRes.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching dropdown data:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: parseInt(selectedBranchId) || 1,
            currencyId: currentCurrency?.currencyId || 1,
            ledgerId: filters.ledgerId || 0,
            salesManId: filters.salesManId || 0,
            cashOrBank: filters.cashOrBank || 0,
            status: filters.status || 'All',
            payStatus: filters.payStatus || 'All',
            partyName: filters.partyName || 'All'
        };

        try {
            const res = await axiosInstance.post("sales-order-payment/report", requestBody);

            const responseData = res.data.data || [];

            const dataWithSNo = (Array.isArray(responseData) ? responseData : []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));

            setReportData(dataWithSNo);

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("❌ Sales Order Payment Report Error:", error);
            const errorMessage = error.response?.data?.message || error.message;
            setAlert({
                id: Date.now(),
                type: 'error',
                message: errorMessage
            });
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // Numeric column keys
    const numericKeys = ['BillAmount', 'PreviousCollectedAmount', 'PaidAmount', 'Balance'];

    // Calculate totals
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        return reportData.reduce((acc, row) => ({
            billAmount: acc.billAmount + (parseFloat(row.BillAmount) || 0),
            previousCollectedAmount: acc.previousCollectedAmount + (parseFloat(row.PreviousCollectedAmount) || 0),
            paidAmount: acc.paidAmount + (parseFloat(row.PaidAmount) || 0),
            balance: acc.balance + (parseFloat(row.Balance) || 0),
        }), {
            billAmount: 0,
            previousCollectedAmount: 0,
            paidAmount: 0,
            balance: 0,
        });
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const dp = generalSettings?.decimalPart || 2;

        return {
            label: t('Total'),
            BillAmount: totals.billAmount.toFixed(dp),
            PreviousCollectedAmount: totals.previousCollectedAmount.toFixed(dp),
            PaidAmount: totals.paidAmount.toFixed(dp),
            Balance: totals.balance.toFixed(dp),
        };
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const dp = generalSettings?.decimalPart || 2;
        const visibleColumnsList = allColumns.filter(col => visibleColumns[col.key]);

        const exportData = reportData.map((row, index) => {
            const exportRow = { SNo: row.SNo || index + 1 };
            visibleColumnsList.forEach(col => {
                if (numericKeys.includes(col.key)) {
                    exportRow[col.key] = Number(row[col.key] || 0).toFixed(dp);
                } else {
                    exportRow[col.key] = row[col.key] || '';
                }
            });
            return exportRow;
        });

        const exportColumns = [
            { key: 'SNo', label: '#', align: 'center', width: 5 },
            ...visibleColumnsList.map(col => ({
                key: col.key,
                label: col.label,
                align: col.align || 'left',
                width: parseInt(col.minWidth) / 6 || 15,
                type: numericKeys.includes(col.key) ? 'number' : 'text'
            }))
        ];

        const footer = { label: t('Total') };
        if (visibleColumns.BillAmount) footer.BillAmount = totals.billAmount.toFixed(dp);
        if (visibleColumns.PreviousCollectedAmount) footer.PreviousCollectedAmount = totals.previousCollectedAmount.toFixed(dp);
        if (visibleColumns.PaidAmount) footer.PaidAmount = totals.paidAmount.toFixed(dp);
        if (visibleColumns.Balance) footer.Balance = totals.balance.toFixed(dp);

        let subtitle = `${t('From')}: ${filters.fromDate} ${t('To')}: ${filters.toDate}`;
        if (filters.payStatus !== 'All') subtitle += ` | ${t('Pay Status')}: ${filters.payStatus}`;
        if (filters.status !== 'All') subtitle += ` | ${t('Order Status')}: ${filters.status}`;

        return {
            fileName: `Sales_Order_Payment_Report_${filters.fromDate}_to_${filters.toDate}`,
            sheetName: 'Sales Order Payment Report',
            title: t('Sales Order Payment Report'),
            subtitle,
            reportInfo: {
                title: t('Sales Order Payment Report'),
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer,
            theme: 'professional',
            decimalPlaces: dp,
            columns: exportColumns
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) { alert(t('No data to export')); return; }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) { alert(t('No data to export')); return; }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) { alert(t('No data to export')); return; }
        exportGenericToCsv(getExportOptions());
    };

    /* ------------------------------ Filter Handlers ------------------------------ */

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            ledgerId: 0,
            salesManId: 0,
            cashOrBank: 0,
            status: 'All',
            payStatus: 'All',
            partyName: 'All'
        });
        setReportData(null);
        setAlert(null);
    };

    // Dropdown options
    const partyOptions = useMemo(() => [
        { label: t('All Parties'), value: 0 },
        ...partyData.map(party => ({
            label: `${party.ledgerName}${party.ledgerType ? ` (${party.ledgerType})` : ''}`,
            value: party.ledgerId
        }))
    ], [partyData, t]);

    const salesmanOptions = useMemo(() => [
        { label: t('All Salesmen'), value: 0 },
        ...salesmanData.map(salesman => ({
            label: salesman.employeeName || salesman.name,
            value: salesman.employeeId || salesman.id
        }))
    ], [salesmanData, t]);

    const cashOrBankOptions = useMemo(() => [
        { label: t('All'), value: 0 },
        ...cashOrBankData.map(account => ({
            label: account.ledgerName || account.name,
            value: account.ledgerId || account.id
        }))
    ], [cashOrBankData, t]);

    const statusOptions = useMemo(() => [
        { label: t('All'), value: "All" },
        { label: t('Pending'), value: 'Pending' },
        { label: t('Production Completed'), value: 'Production Completed' },
        { label: t('Completed'), value: 'Completed' },
        { label: t('Billed'), value: 'Billed' },
        { label: t('Cancelled'), value: 'Cancelled' },
        { label: t('Cash Received'), value: 'Cash Received' },
        { label: t('Delivered'), value: 'Delivered' },
        { label: t('Customer Collected'), value: 'Customer Collected' },
        
    ], [t]);

    const payStatusOptions = useMemo(() => [
        { label: t('All'), value: 'All' },
        { label: t('Pending'), value: 'Pending' },
        { label: t('Fully Paid'), value: 'Fully Paid' },
        // { label: t('Paid'), value: 'Paid' }
    ], [t]);

    // Display columns (SNo + only visible ones)
    const displayColumns = [
        { key: 'SNo', label: '#', minWidth: '40px', align: 'center' },
        ...allColumns.filter(col => visibleColumns[col.key])
    ];

    /* ------------------------------ Cell Renderer ------------------------------ */

    const renderCell = (key, row) => {
        const dp = generalSettings?.decimalPart || 2;
        const value = row[key];

        // Numeric columns
        if (numericKeys.includes(key)) {
            const num = parseFloat(value) || 0;

            if (num === 0) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            if (key === 'BillAmount') {
                return <div className="text-right font-medium">{num.toFixed(dp)}</div>;
            }
            if (key === 'PreviousCollectedAmount') {
                return <div className="text-right text-blue-600 dark:text-blue-400 font-medium">{num.toFixed(dp)}</div>;
            }
            if (key === 'PaidAmount') {
                return <div className="text-right text-green-600 dark:text-green-400 font-semibold">{num.toFixed(dp)}</div>;
            }
            if (key === 'Balance') {
                return (
                    <div className={`text-right font-semibold ${num > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        {num.toFixed(dp)}
                    </div>
                );
            }

            return <div className="text-right">{num.toFixed(dp)}</div>;
        }

        // Order No badge
        if (key === 'SalesOrderNo') {
            return (
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">
                    {value || '-'}
                </span>
            );
        }

        // Date columns — centred
        if (key === 'SalesOrderDate') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // Text fallback
        return value ?? '-';
    };

    /* ------------------------------ Render Guards ------------------------------ */

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Sales Order Payment Report"), url: "#" },
                    ]}
                    heading={{ icon: CreditCard, title: t("Sales Order Payment Report") }}
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
                        { title: t("Reports"), url: "#" },
                        { title: t("Sales Order Payment Report"), url: "#" },
                    ]}
                    heading={{ icon: CreditCard, title: t("Sales Order Payment Report") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    /* ------------------------------ Main Render ------------------------------ */

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
                    { title: t("Reports"), url: "#" },
                    { title: t("Sales Order Payment Report"), url: "#" },
                ]}
                heading={{ icon: CreditCard, title: t("Sales Order Payment Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="flex gap-2 px-1">
                <div className="flex-1 min-w-0">
                    <SalesOrderPaymentReportFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        partyOptions={partyOptions}
                        salesmanOptions={salesmanOptions}
                        cashOrBankOptions={cashOrBankOptions}
                        statusOptions={statusOptions}
                        payStatusOptions={payStatusOptions}
                        loading={loading}
                        resetFilters={resetFilters}
                    />

                    <ContentTable
                        columns={allColumns}
                        data={reportData}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        maxHeight='calc(100vh -210px)'
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderPaymentReport;