// src/components/pages/Reports/PurchaseQuotationReport/PurchaseQuotationReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PurchaseQuotationReportFilters from './PurchaseQuotationReportFilters';
import useReportExport from '@/hooks/useReportExport';
import ContentTable from '@/components/common/ContentTable';
import { useNavigate } from 'react-router-dom';

const PurchaseQuotationReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    
    const [partyData, setPartyData] = useState([]);
    const [costCenterData, setCostCenterData] = useState([]);
    
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Purchase Quotation Report");
    const { generalSettings } = useSelector((state) => state.settings);

    const { exportGenericToExcel, exportGenericToPdf, exportGenericToCsv } = useReportExport();

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
        ledgerId: 'All',
        costCenterId: 'All',
        partyName: 'All',
        condition: 'Active',
        mode: 'detailed'
    });

    // ✅ Define columns for BOTH summary and detailed modes
    const summaryColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), defaultVisible: true, minWidth: '100px', align: 'center' },
        { key: 'VoucherNo', label: t('Quotation No'), defaultVisible: true, minWidth: '110px', align: 'left' },
        { key: 'ledgerName', label: t('Supplier'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'totalAmount', label: t('Total Amount'), defaultVisible: true, minWidth: '120px', align: 'right' },
        { key: 'Status', label: t('Status'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'CostCentre', label: t('Cost Centre'), defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'Narration', label: t('Narration'), defaultVisible: false, minWidth: '150px', align: 'left', wrap: true }
    ], [t]);

    const detailedColumns = useMemo(() => [
        { key: 'Date', label: t('Date'), defaultVisible: true, minWidth: '100px', align: 'center' },
        { key: 'VoucherNo', label: t('Quotation No'), defaultVisible: true, minWidth: '110px', align: 'left' },
        { key: 'ledgerName', label: t('Supplier'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'productCode', label: t('Item Code'), defaultVisible: true, minWidth: '100px', align: 'left' },
        { key: 'productName', label: t('Item'), defaultVisible: true, minWidth: '150px', align: 'left', wrap: true },
        { key: 'qty', label: t('Qty'), defaultVisible: true, minWidth: '70px', align: 'right' },
        { key: 'rate', label: t('Rate'), defaultVisible: true, minWidth: '90px', align: 'right' },
        { key: 'taxAmount', label: t('Tax'), defaultVisible: true, minWidth: '90px', align: 'right' },
        { key: 'amount', label: t('Net Amount'), defaultVisible: true, minWidth: '100px', align: 'right' },
        { key: 'Status', label: t('Status'), defaultVisible: true, minWidth: '90px', align: 'center' },
        { key: 'CostCentre', label: t('Cost Centre'), defaultVisible: false, minWidth: '100px', align: 'left' },
        { key: 'Narration', label: t('Narration'), defaultVisible: false, minWidth: '150px', align: 'left', wrap: true }
    ], [t]);
    
    const activeColumns = useMemo(() => 
        filters.mode === 'summary' ? summaryColumns : detailedColumns,
        [filters.mode, summaryColumns, detailedColumns]
    );

    const [visibleColumns, setVisibleColumns] = useState({});

    useEffect(() => {
        const initialVisibility = {};
        activeColumns.forEach(col => {
            initialVisibility[col.key] = col.defaultVisible;
        });
        setVisibleColumns(initialVisibility);
    }, [activeColumns]);

    useEffect(() => { 
        fetchDropdownData(); 
    }, [selectedBranchId]);

     const navigate = useNavigate();
    const handleRowClick = (row) => {
        if (!row.quotationMasterId) return;
        navigate(`/transaction/purchase-quotation/edit-purchase-quotation/${row.quotationMasterId}`);
    };

    const fetchDropdownData = async () => {
        setInitialLoading(true);
        try {
            const [partyRes, costCenterRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Supplier"],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get("cost-centers").catch(() => ({ data: { data: [] } }))
            ]);
            setPartyData(partyRes.data.data || []);
            setCostCenterData(costCenterRes.data.data || []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);
        
        const requestPayload = {
            from_date: filters.fromDate,
            to_date: filters.toDate,
            branch_id: parseInt(selectedBranchId) || 1,
            ledger_id: filters.ledgerId === 'All' || !filters.ledgerId ? 'All' : filters.ledgerId,
            costcenter_id: filters.costCenterId === 'All' || !filters.costCenterId ? 'All' : filters.costCenterId,
            party_name: filters.partyName || 'All',
            condition: filters.condition || 'Active',
            currency_id: currentCurrency?.currencyId || 1,
            mode: filters.mode || 'detailed'
        };

        try {
            const response = await axiosInstance.post("purchase-quotation/report", requestPayload);
            const data = response.data.data || [];
            
            // ✅ Process data differently for summary and detailed modes
            let processedData;
            
            if (filters.mode === 'summary') {
                // For summary mode, we need to fetch detailed data to calculate totals
                // Or alternatively, make a separate API call
                // For now, let's try fetching detailed data and aggregating
                const detailedPayload = { ...requestPayload, mode: 'detailed' };
                const detailedResponse = await axiosInstance.post("purchase-quotation/report", detailedPayload);
                const detailedData = detailedResponse.data.data || [];
                
                // Group by VoucherNo and calculate totals
                const groupedData = {};
                detailedData.forEach(item => {
                    const key = item.VoucherNo || item.quotationMasterId;
                    if (!groupedData[key]) {
                        groupedData[key] = {
                            ...item,
                            totalAmount: 0,
                            totalQty: 0,
                            totalTax: 0
                        };
                    }
                    groupedData[key].totalAmount += parseFloat(item.amount || 0);
                    groupedData[key].totalQty += parseFloat(item.qty || 0);
                    groupedData[key].totalTax += parseFloat(item.taxAmount || 0);
                });
                
                processedData = Object.values(groupedData).map((item, index) => ({
                    ...item,
                    SNo: index + 1
                }));
            } else {
                // Detailed mode - use data as is
                processedData = data.map((item, index) => ({
                    ...item,
                    SNo: index + 1
                }));
            }
            
            setReportData(processedData);

            if (processedData.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("Error fetching report:", error);
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

    // ✅ Totals calculation
    const totals = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;

        if (filters.mode === 'summary') {
            return {
                totalAmount: reportData.reduce((acc, row) => acc + (parseFloat(row.totalAmount) || 0), 0)
            };
        }
        
        // Detailed mode
        return {
            qty: reportData.reduce((acc, row) => acc + (parseFloat(row.qty) || 0), 0),
            taxAmount: reportData.reduce((acc, row) => acc + (parseFloat(row.taxAmount) || 0), 0),
            netAmount: reportData.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0)
        };
    }, [reportData, filters.mode]);

    // ✅ Footer data
    const footerData = useMemo(() => {
        if (!reportData || !totals) return null;
        const dec = generalSettings?.decimalPart || 2;

        if (filters.mode === 'summary') {
            return {
                SNo: '',
                Date: '',
                VoucherNo: '',
                ledgerName: <strong>{t('Total')}</strong>,
                totalAmount: totals.totalAmount.toFixed(dec),
                Status: '',
                CostCentre: '',
                Narration: ''
            };
        }
        
        // Detailed mode
        return {
            SNo: '',
            Date: '',
            VoucherNo: '',
            ledgerName: <strong>{t('Total')}</strong>,
            productCode: '',
            productName: '',
            qty: totals.qty.toFixed(dec),
            rate: '',
            taxAmount: totals.taxAmount.toFixed(dec),
            amount: totals.netAmount.toFixed(dec),
            Status: '',
            CostCentre: '',
            Narration: ''
        };
    }, [reportData, totals, generalSettings, t, filters.mode]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        if (field === 'mode') {
            setReportData(null);
            setAlert(null);
        }
    };

    const resetFilters = () => {
        setFilters({
            fromDate: defaultDates.fromDate,
            toDate: defaultDates.toDate,
            ledgerId: 'All',
            costCenterId: 'All',
            partyName: 'All',
            condition: 'Active',
            mode: 'detailed'
        });
        setReportData(null);
        setAlert(null);
    };

    const partyOptions = useMemo(() => [
        { label: t('All Parties'), value: 'All' },
        ...partyData.map(p => ({ label: p.ledgerName, value: p.ledgerId }))
    ], [partyData, t]);

    const costCenterOptions = useMemo(() => [
        { label: t('All Cost Centers'), value: 'All' },
        ...costCenterData.map(c => ({ label: c.costCenterName || c.name, value: c.costCenterId || c.id }))
    ], [costCenterData, t]);

    const renderCell = (key, row) => {
        const dec = generalSettings?.decimalPart || 2;
        const val = row[key];

        if (key === 'Status') {
            const isCancelled = row.Cancelled;
            const statusText = isCancelled ? t('Cancelled') : t('Active');
            const colorClass = isCancelled
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            return (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                    {statusText}
                </span>
            );
        }

        if (['qty', 'rate', 'amount', 'taxAmount', 'totalAmount'].includes(key)) {
            return <div className="text-right tabular-nums">{(parseFloat(val) || 0).toFixed(dec)}</div>;
        }

        if (key === 'VoucherNo') {
            return <span className="font-mono text-xs">{val || '-'}</span>;
        }

        if (key === 'Narration') {
            return val ? <span className="text-xs">{val}</span> : '-';
        }

        return val ?? '-';
    };

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    };

    // ✅ Export handlers
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;
        const dec = generalSettings?.decimalPart || 2;

        if (filters.mode === 'summary') {
            const exportData = reportData.map((row, index) => ({
                SNo: index + 1,
                Date: row.Date || '',
                QuotationNo: row.VoucherNo || '',
                Supplier: row.ledgerName || '',
                TotalAmount: Number(row.totalAmount || 0).toFixed(dec),
                Status: row.Cancelled ? 'Cancelled' : 'Active',
                CostCentre: row.CostCentre || '',
                Narration: row.Narration || ''
            }));

            return {
                fileName: 'Purchase_Quotation_Summary_Report',
                sheetName: 'Summary',
                title: t('Purchase Quotation Summary Report'),
                subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
                data: exportData,
                footer: footerData,
                theme: 'professional',
                decimalPlaces: dec,
                columns: [
                    { key: 'SNo', label: '#', align: 'center', width: 5 },
                    { key: 'Date', label: 'Date', align: 'center', width: 10 },
                    { key: 'QuotationNo', label: 'Quotation No', align: 'left', width: 12 },
                    { key: 'Supplier', label: 'Supplier', align: 'left', width: 18 },
                    { key: 'TotalAmount', label: 'Total Amount', align: 'right', width: 12 },
                    { key: 'Status', label: 'Status', align: 'center', width: 10 },
                    { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                    { key: 'Narration', label: 'Narration', align: 'left', width: 15 }
                ]
            };
        }

        // Detailed mode
        const exportData = reportData.map((row, index) => ({
            SNo: index + 1,
            Date: row.Date || '',
            QuotationNo: row.VoucherNo || '',
            Supplier: row.ledgerName || '',
            ItemCode: row.productCode || '',
            Item: row.productName || '',
            Qty: Number(row.qty || 0).toFixed(dec),
            Rate: Number(row.rate || 0).toFixed(dec),
            Tax: Number(row.taxAmount || 0).toFixed(dec),
            NetAmount: Number(row.amount || 0).toFixed(dec),
            Status: row.Cancelled ? 'Cancelled' : 'Active',
            CostCentre: row.CostCentre || '',
            Narration: row.Narration || ''
        }));

        return {
            fileName: 'Purchase_Quotation_Detailed_Report',
            sheetName: 'Detailed',
            title: t('Purchase Quotation Detailed Report'),
            subtitle: `${t('From')}: ${filters.fromDate} - ${t('To')}: ${filters.toDate}`,
            data: exportData,
            footer: footerData,
            theme: 'professional',
            decimalPlaces: dec,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 5 },
                { key: 'Date', label: 'Date', align: 'center', width: 10 },
                { key: 'QuotationNo', label: 'Quotation No', align: 'left', width: 12 },
                { key: 'Supplier', label: 'Supplier', align: 'left', width: 18 },
                { key: 'ItemCode', label: 'Item Code', align: 'left', width: 10 },
                { key: 'Item', label: 'Item', align: 'left', width: 18 },
                { key: 'Qty', label: 'Qty', align: 'right', width: 8 },
                { key: 'Rate', label: 'Rate', align: 'right', width: 10 },
                { key: 'Tax', label: 'Tax', align: 'right', width: 10 },
                { key: 'NetAmount', label: 'Net Amount', align: 'right', width: 12 },
                { key: 'Status', label: 'Status', align: 'center', width: 10 },
                { key: 'CostCentre', label: 'Cost Centre', align: 'left', width: 12 },
                { key: 'Narration', label: 'Narration', align: 'left', width: 15 }
            ]
        };
    };

    const handleExportExcel = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') });
            return;
        }
        exportGenericToExcel(options);
    };

    const handleExportPdf = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') });
            return;
        }
        exportGenericToPdf({ ...options, orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        const options = getExportOptions();
        if (!options) {
            setAlert({ id: Date.now(), type: 'warning', message: t('No data to export') });
            return;
        }
        exportGenericToCsv(options);
    };

    if (privilegeLoading || initialLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Purchase Quotation Report"), url: "#" }
                    ]}
                    heading={{ icon: FileText, title: t("Purchase Quotation Report") }}
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
                        { title: t("Purchase Quotation Report"), url: "#" }
                    ]}
                    heading={{ icon: FileText, title: t("Purchase Quotation Report") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            
            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Purchase Quotation Report"), url: "#" }
                ]}
                heading={{ icon: FileText, title: t("Purchase Quotation Report") }}
                exportConfig={reportData?.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export')
                } : null}
            />

            <div className="flex gap-2 px-1">
              
                <div className="flex-1 min-w-0">
                    <PurchaseQuotationReportFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        partyOptions={partyOptions}
                        costCenterOptions={costCenterOptions}
                        loading={loading}
                        resetFilters={resetFilters}
                    />
                    
                    <ContentTable
                        columns={[
                            { key: 'SNo', label: '#', minWidth: '40px', align: 'center' },
                            ...activeColumns.filter(c => visibleColumns[c.key])
                        ]}
                                            onRowClick={handleRowClick}

                        data={reportData}
                        loading={loading}
                        renderCell={renderCell}
                        footerData={footerData}
                        staticSearchable={true}
                        serverPagination={false}
                        tableId="purchase-quotation-report-table"
                        pageSize={50}
                        autoFocusSearch={false}
                        maxHeight="calc(100vh - 270px)"
                        stickyActions={false}
                        groupBy={filters.mode === 'detailed' ? 'VoucherNo' : null}
                        mergedColumns={filters.mode === 'detailed' ? [
                            'SNo', 'Date', 'VoucherNo', 'ledgerName', 'Status', 'CostCentre', 'Narration'
                        ] : []}
                    />
                </div>
            </div>
        </div>
    );
};

export default PurchaseQuotationReport;