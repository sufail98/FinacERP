// src/components/pages/Reports/AgeingReport/AgeingReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { Clock } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import AgeingReportFilter from './AgeingReportFilter';
import AgeingReportGrid from './AgeingReportGrid';
import useReportExport from '@/hooks/useReportExport';

const AgeingReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    
    const [allCustomers, setAllCustomers] = useState([]);
    const [allSuppliers, setAllSuppliers] = useState([]);
    const [salesmanData, setSalesmanData] = useState([]);

    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Ageing Report");
    const { generalSettings } = useSelector((state) => state.settings);

    // ✅ Add export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const getDefaultDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const [filters, setFilters] = useState({
        ageingDate: getDefaultDate(),
        reportType: 'ledger',
        partyType: 'customer',
        ledgerId: null,
        ledgerName: '',
        salesmanId: null
    });

    // ══════════════════════════════════════════════════════════════
    // DEBUG: Log state changes
    // ══════════════════════════════════════════════════════════════


    useEffect(() => {
        fetchAllData();
    }, [selectedBranchId]);

    const fetchAllData = async () => {
        setInitialLoading(true);
        
        try {
            const [customersRes, suppliersRes, salesmenRes] = await Promise.all([
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Customer"],
                    branchId: selectedBranchId
                }),
                axiosInstance.post("customer-supplier-account-ledgers", {
                    ledgerTypes: ["Supplier"],
                    branchId: selectedBranchId
                }),
                axiosInstance.get("employees")
            ]);

            setAllCustomers(customersRes.data.data || []);
            setAllSuppliers(suppliersRes.data.data || []);
            setSalesmanData(salesmenRes.data.data || []);

        } catch (error) {
            console.error("❌ [AGEING REPORT] Dropdown fetch error:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const ledgerOptions = useMemo(() => {
        const data = filters.partyType === 'customer' ? allCustomers : allSuppliers;
        return data.map(ledger => ({
            label: ledger.ledgerName,
            value: ledger.ledgerId
        }));
    }, [filters.partyType, allCustomers, allSuppliers]);

    const salesmanOptions = useMemo(() => {
        return salesmanData.map(salesman => ({
            label: salesman.employeeName || salesman.name,
            value: salesman.employeeId || salesman.id
        }));
    }, [salesmanData]);

    // ══════════════════════════════════════════════════════════════
    // FETCH REPORT with comprehensive logging
    // ══════════════════════════════════════════════════════════════
    const fetchReport = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const payload = {
                ageingDate: filters.ageingDate,
                branchId: Number(selectedBranchId),
                status: filters.reportType,
                ledgerId: filters.ledgerId || null,
                currencyId: currentCurrency?.currencyId || 30,
                ledgerBy: null,
                salesmanId: filters.salesmanId ? String(filters.salesmanId) : null,
                ledgerName: filters.ledgerName || ''
            };

            const endpoint = filters.partyType === 'customer' 
                ? "ageing/receivable" 
                : "ageing/payable";

            const response = await axiosInstance.post(endpoint, payload);

            const data = response.data.data || response.data;
            

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: response.data?.message || t('No data found for the selected filters')
                });
                setReportData([]);
            } else {
                setReportData(data);
            }
        } catch (error) {

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

    // Calculate totals
    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return null;
        }

        const decimalPart = generalSettings?.decimalPart || 2;

        const calculateSum = (key) => {
            return reportData.reduce((sum, row) => {
                const value = parseFloat(row[key]) || 0;
                return sum + value;
            }, 0);
        };

        const days1to30 = calculateSum('1to30');
        const days31to60 = calculateSum('31to60');
        const days61to90 = calculateSum('61to90');
        const days91to120 = calculateSum('91to120');
        const above120 = calculateSum('120above');
        const total = days1to30 + days31to60 + days61to90 + days91to120 + above120;
        const billAmount = calculateSum('Bill Amount') || calculateSum('BillAmount') || 0;

        return {
            total: total.toFixed(decimalPart),
            billAmount: billAmount.toFixed(decimalPart),
            days1to30: days1to30.toFixed(decimalPart),
            days31to60: days31to60.toFixed(decimalPart),
            days61to90: days61to90.toFixed(decimalPart),
            days91to120: days91to120.toFixed(decimalPart),
            above120: above120.toFixed(decimalPart),
            count: reportData.length
        };
    }, [reportData, generalSettings?.decimalPart]);

    const handleFilterChange = (field, value) => {
        
        if (field === 'partyType') {
            setFilters(prev => ({ 
                ...prev, 
                [field]: value, 
                ledgerId: null, 
                ledgerName: '' 
            }));
            setReportData(null);
        } else {
            setFilters(prev => ({ ...prev, [field]: value }));
        }
    };

    const resetFilters = () => {
        setFilters({
            ageingDate: getDefaultDate(),
            reportType: 'ledger',
            partyType: 'customer',
            ledgerId: null,
            ledgerName: '',
            salesmanId: null
        });
        setReportData(null);
        setAlert(null);
    };

    const getPageTitle = () => {
        return filters.partyType === 'customer' 
            ? t("Ageing Report - Receivable") 
            : t("Ageing Report - Payable");
    };

    // ══════════════════════════════════════════════════════════════
    // EXPORT CONFIGURATION
    // ══════════════════════════════════════════════════════════════
    const getExportOptions = () => {
        if (!reportData || reportData.length === 0) return null;

        const decimalPart = generalSettings?.decimalPart || 2;
        const isVoucher = filters.reportType === 'voucher';

        const formatNum = (num) => Number(num || 0).toFixed(decimalPart);

        // Build export data based on report type
        const exportData = reportData.map((row, index) => {
            if (isVoucher) {
                return {
                    SlNo: index + 1,
                    AccountLedger: row['Account Ledger'] || row['AccountLedger'] || '',
                    Date: row['Date'] || row['date'] || '',
                    VoucherType: row['Voucher Type'] || row['voucherType'] || '',
                    VoucherNo: row['Voucher No'] || row['voucherNo'] || '',
                    RefNo: row['Ref No'] || row['refNo'] || '',
                    BillAmount: formatNum(row['Bill Amount'] || row['BillAmount']),
                    Days1to30: formatNum(row['1to30']),
                    Days31to60: formatNum(row['31to60']),
                    Days61to90: formatNum(row['61to90']),
                    Days91to120: formatNum(row['91to120']),
                    Days120Above: formatNum(row['120above']),
                    Narration: row['Narration'] || row['narration'] || ''
                };
            } else {
                // Ledger wise
                const rowTotal = (
                    parseFloat(row['1to30'] || 0) +
                    parseFloat(row['31to60'] || 0) +
                    parseFloat(row['61to90'] || 0) +
                    parseFloat(row['91to120'] || 0) +
                    parseFloat(row['120above'] || 0)
                );
                return {
                    SlNo: index + 1,
                    AccountLedger: row['Account Ledger'] || row['AccountLedger'] || '',
                    LastPaymentDate: row['LastRcptPaymentDate'] || row['LastPaymentDate'] || '',
                    Days1to30: formatNum(row['1to30']),
                    Days31to60: formatNum(row['31to60']),
                    Days61to90: formatNum(row['61to90']),
                    Days91to120: formatNum(row['91to120']),
                    Days120Above: formatNum(row['120above']),
                    TotalAmount: formatNum(row['TotalAmt'] || rowTotal)
                };
            }
        });

        // Define columns based on report type
        const voucherColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'AccountLedger', label: t('Account Ledger'), align: 'left', width: 20 },
            { key: 'Date', label: t('Date'), align: 'center', width: 10 },
            { key: 'VoucherType', label: t('Voucher Type'), align: 'left', width: 12 },
            { key: 'VoucherNo', label: t('Voucher No'), align: 'left', width: 10 },
            { key: 'RefNo', label: t('Ref No'), align: 'left', width: 10 },
            { key: 'BillAmount', label: t('Bill Amount'), align: 'right', width: 12, type: 'currency' },
            { key: 'Days1to30', label: t('1-30 Days'), align: 'right', width: 10, type: 'currency' },
            { key: 'Days31to60', label: t('31-60 Days'), align: 'right', width: 10, type: 'currency' },
            { key: 'Days61to90', label: t('61-90 Days'), align: 'right', width: 10, type: 'currency' },
            { key: 'Days91to120', label: t('91-120 Days'), align: 'right', width: 10, type: 'currency' },
            { key: 'Days120Above', label: t('120+ Days'), align: 'right', width: 10, type: 'currency' },
            { key: 'Narration', label: t('Narration'), align: 'left', width: 15 }
        ];

        const ledgerColumns = [
            { key: 'SlNo', label: '#', align: 'center', width: 5 },
            { key: 'AccountLedger', label: t('Account Ledger'), align: 'left', width: 25 },
            { key: 'LastPaymentDate', label: t('Last Payment Date'), align: 'center', width: 15 },
            { key: 'Days1to30', label: t('1-30 Days'), align: 'right', width: 12, type: 'currency' },
            { key: 'Days31to60', label: t('31-60 Days'), align: 'right', width: 12, type: 'currency' },
            { key: 'Days61to90', label: t('61-90 Days'), align: 'right', width: 12, type: 'currency' },
            { key: 'Days91to120', label: t('91-120 Days'), align: 'right', width: 12, type: 'currency' },
            { key: 'Days120Above', label: t('120+ Days'), align: 'right', width: 12, type: 'currency' },
            { key: 'TotalAmount', label: t('Total'), align: 'right', width: 12, type: 'currency' }
        ];

        const partyTypeLabel = filters.partyType === 'customer' ? 'Receivable' : 'Payable';
        const reportTypeLabel = isVoucher ? 'Voucher Wise' : 'Ledger Wise';

        return {
            fileName: `Ageing_Report_${partyTypeLabel}_${reportTypeLabel}`,
            sheetName: 'Ageing Report',
            title: `${t('Ageing Report')} - ${partyTypeLabel}`,
            subtitle: `${reportTypeLabel} | ${t('As of')}: ${filters.ageingDate}`,
            reportInfo: {
                title: `${t('Ageing Report')} - ${partyTypeLabel}`,
                subtitle: reportTypeLabel,
                ageingDate: filters.ageingDate
            },
            data: exportData,
            columns: isVoucher ? voucherColumns : ledgerColumns,
            footer: totals ? {
                label: t('Total'),
                Days1to30: totals.days1to30,
                Days31to60: totals.days31to60,
                Days61to90: totals.days61to90,
                Days91to120: totals.days91to120,
                Days120Above: totals.above120,
                TotalAmount: totals.total,
                BillAmount: totals.billAmount
            } : null,
            theme: 'professional',
            decimalPlaces: decimalPart
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
                        { title: t("Ageing Report"), url: "#" },
                    ]}
                    heading={{ icon: Clock, title: getPageTitle() }}
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
                        { title: t("Ageing Report"), url: "#" },
                    ]}
                    heading={{ icon: Clock, title: getPageTitle() }}
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
                    { title: t("Reports"), url: "#" },
                    { title: t("Ageing Report"), url: "#" },
                ]}
                heading={{ icon: Clock, title: getPageTitle() }}
                // ✅ ADD EXPORT CONFIG
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">

                <AgeingReportFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    ledgerOptions={ledgerOptions}
                    salesmanOptions={salesmanOptions}
                    loading={loading}
                    resetFilters={resetFilters}
                />

                <AgeingReportGrid
                    data={reportData}
                    loading={loading}
                    totals={totals}
                    reportType={filters.reportType}
                    partyType={filters.partyType}
                    decimalPart={generalSettings?.decimalPart || 2}
                />
            </div>
        </div>
    );
};

export default AgeingReport;