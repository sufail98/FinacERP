// E:\Users\Roshan\Finac\Web-FinacERP\src\components\pages\Reports\TaxConsolidatedReport.jsx

import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { FileText } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import TaxConsolidatedReportFilters from './TaxConsolidatedReportFilters';
import useReportExport from '@/hooks/useReportExport';

const TaxConsolidatedReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const { selectedBranchId, selectedBranchDetails } = useAuth();
    const isMainBranch = selectedBranchDetails?.mainBranch === true;

    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Tax Consolidated Report");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });

    const fetchAllReports = async () => {
        setLoading(true);

        const requestBody = {
            from_date: filters.fromDate,
            to_date: filters.toDate,
            branch_id: selectedBranchId,
            // branch_id: isMainBranch
            //     ? (filters.selectedBranchId ?? null)
            //     : Number(selectedBranchId) || 1
        };
        const carryForwardRequestBody = {
            taxLedgerId: 30,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            branchId: selectedBranchId
        };

        try {
            const [
                standardRatedSales,
                zeroRatedDomesticSales,
                exemptSales,
                standardRatedPurchase,
                zeroRatedDomesticPurchase,
                exemptPurchase,
                vatPaidThisPeriod
            ] = await Promise.all([
                axiosInstance.post("tax-consolidated/tax-return-standard-rated-sales-report", requestBody),
                axiosInstance.post("tax-consolidated/tax-return-zero-rated-domestic-sales-report", requestBody),
                axiosInstance.post("tax-consolidated/tax-return-exempt-sales-report", requestBody),
                axiosInstance.post("tax-consolidated/tax-return-standard-rated-purchase", requestBody),
                axiosInstance.post("tax-consolidated/tax-return-zero-rated-domestic-purchase", requestBody),
                axiosInstance.post("tax-consolidated/tax-return-exempt-purchase", requestBody),
                axiosInstance.post("tax-consolidated/vat-credit-carryforward", carryForwardRequestBody)
            ]);

            const extractData = (responseData) => {
                const dataArray = responseData?.data || [];
                return dataArray.length > 0 ? dataArray[0] : {};
            };

            // vat-credit-carryforward response shape is:
            // { status, error, message, data: "87235.120000" }  <-- a plain numeric string, not an array
            const extractAmount = (responseData) => {
                const raw = responseData?.data;
                const value = parseFloat(raw ?? 0);
                return Number.isNaN(value) ? 0 : value;
            };

            const consolidatedData = {
                standardRatedSales: extractData(standardRatedSales.data),
                zeroRatedDomesticSales: extractData(zeroRatedDomesticSales.data),
                exemptSales: extractData(exemptSales.data),
                standardRatedPurchase: extractData(standardRatedPurchase.data),
                zeroRatedDomesticPurchase: extractData(zeroRatedDomesticPurchase.data),
                exemptPurchase: extractData(exemptPurchase.data),
                // shown on the "VAT paid on this period(s)" line, not on "VAT credit carried forward"
                vatPaidThisPeriod: extractAmount(vatPaidThisPeriod.data)
            };

            setReportData(consolidatedData);
        } catch (error) {
            console.error("❌ CRITICAL ERROR in Tax Consolidated Report:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: new Date().toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0]
        });
        setReportData(null);
    };

    const totals = useMemo(() => {
        if (!reportData) {
            return { salesVAT: 0, purchasesVAT: 0, totalVATDue: 0, vatPaidThisPeriod: 0, netVAT: 0 };
        }

        const decimalPart = generalSettings?.decimalPart || 2;
        const standardSalesVAT = parseFloat(reportData.standardRatedSales?.['VAT Amount'] || 0);
        const totalSalesVAT = standardSalesVAT;
        const standardPurchaseVAT = parseFloat(reportData.standardRatedPurchase?.['VAT Amount'] || 0);
        const totalPurchasesVAT = standardPurchaseVAT;

        // VAT due before applying VAT already paid this period
        const totalVATDue = totalSalesVAT - totalPurchasesVAT;

        const vatPaidThisPeriod = parseFloat(reportData.vatPaidThisPeriod || 0);

        // Net VAT due (or claim) after applying VAT already paid this period
        const netVAT = totalVATDue - vatPaidThisPeriod;

        return {
            salesVAT: totalSalesVAT.toFixed(decimalPart),
            purchasesVAT: totalPurchasesVAT.toFixed(decimalPart),
            totalVATDue: totalVATDue.toFixed(decimalPart),
            vatPaidThisPeriod: vatPaidThisPeriod.toFixed(decimalPart),
            netVAT: netVAT.toFixed(decimalPart)
        };
    }, [reportData, generalSettings?.decimalPart]);

    const formatNumber = (value) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        return Number(value || 0).toFixed(decimalPart);
    };

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;

        const exportData = [
            { Title: t('VAT on sales'), Amount: '', Adjustment: '', VATAmount: '', isHeader: true },
            {
                Title: t('Standard rated sales'),
                Amount: formatNumber(reportData.standardRatedSales?.Amount),
                Adjustment: formatNumber(reportData.standardRatedSales?.Adjustment),
                VATAmount: formatNumber(reportData.standardRatedSales?.['VAT Amount'])
            },
            {
                Title: t('Private health care/Private education/First house sales'),
                Amount: '0.000',
                Adjustment: '0',
                VATAmount: '0'
            },
            {
                Title: t('Zero rated domestic sales'),
                Amount: formatNumber(reportData.zeroRatedDomesticSales?.Amount),
                Adjustment: formatNumber(reportData.zeroRatedDomesticSales?.Adjustment),
                VATAmount: formatNumber(reportData.zeroRatedDomesticSales?.['VAT Amount'])
            },
            { Title: t('Exports'), Amount: '0.000', Adjustment: '0', VATAmount: '0' },
            {
                Title: t('Exempt sales'),
                Amount: formatNumber(reportData.exemptSales?.Amount),
                Adjustment: formatNumber(reportData.exemptSales?.Adjustment),
                VATAmount: formatNumber(reportData.exemptSales?.['VAT Amount'])
            },
            {
                Title: t('Total sales'),
                Amount: formatNumber(
                    parseFloat(reportData.standardRatedSales?.Amount || 0) +
                    parseFloat(reportData.zeroRatedDomesticSales?.Amount || 0) +
                    parseFloat(reportData.exemptSales?.Amount || 0)
                ),
                Adjustment: formatNumber(
                    parseFloat(reportData.standardRatedSales?.Adjustment || 0) +
                    parseFloat(reportData.zeroRatedDomesticSales?.Adjustment || 0) +
                    parseFloat(reportData.exemptSales?.Adjustment || 0)
                ),
                VATAmount: totals.salesVAT,
                isTotal: true
            },
            { Title: '', Amount: '', Adjustment: '', VATAmount: '' },
            { Title: t('VAT On Purchases'), Amount: '', Adjustment: '', VATAmount: '', isHeader: true },
            {
                Title: t('Standard rate domestic purchases'),
                Amount: formatNumber(reportData.standardRatedPurchase?.Amount),
                Adjustment: formatNumber(reportData.standardRatedPurchase?.Adjustment),
                VATAmount: formatNumber(reportData.standardRatedPurchase?.['VAT Amount'])
            },
            { Title: t('Imports subject to VAT paid at customs'), Amount: '0.000', Adjustment: '0', VATAmount: '0' },
            { Title: t('Imports subject to VAT (reverse charge)'), Amount: '0.000', Adjustment: '0', VATAmount: '0' },
            {
                Title: t('Zero rated purchases'),
                Amount: formatNumber(reportData.zeroRatedDomesticPurchase?.Amount),
                Adjustment: formatNumber(reportData.zeroRatedDomesticPurchase?.Adjustment),
                VATAmount: formatNumber(reportData.zeroRatedDomesticPurchase?.['VAT Amount'])
            },
            {
                Title: t('Exempt purchases'),
                Amount: formatNumber(reportData.exemptPurchase?.Amount),
                Adjustment: formatNumber(reportData.exemptPurchase?.Adjustment),
                VATAmount: formatNumber(reportData.exemptPurchase?.['VAT Amount'])
            },
            {
                Title: t('Total purchases'),
                Amount: formatNumber(
                    parseFloat(reportData.standardRatedPurchase?.Amount || 0) +
                    parseFloat(reportData.zeroRatedDomesticPurchase?.Amount || 0) +
                    parseFloat(reportData.exemptPurchase?.Amount || 0)
                ),
                Adjustment: formatNumber(
                    parseFloat(reportData.standardRatedPurchase?.Adjustment || 0) +
                    parseFloat(reportData.zeroRatedDomesticPurchase?.Adjustment || 0) +
                    parseFloat(reportData.exemptPurchase?.Adjustment || 0)
                ),
                VATAmount: totals.purchasesVAT,
                isTotal: true
            },
            { Title: '', Amount: '', Adjustment: '', VATAmount: '' },
            { Title: t('Total VAT due for current period'), Amount: '-', Adjustment: '-', VATAmount: totals.totalVATDue },
            { Title: t('Corrections from previous period'), Amount: '-', Adjustment: '-', VATAmount: '0.000' },
            { Title: t('VAT credit carried forward from previous period(s)'), Amount: '-', Adjustment: '-', VATAmount: '0.000' },
            { Title: t('VAT paid on this period(s)'), Amount: '-', Adjustment: '-', VATAmount: totals.vatPaidThisPeriod },
            { Title: t('Net VAT due (or claim)'), Amount: '-', Adjustment: '-', VATAmount: totals.netVAT, isTotal: true }
        ];

        return {
            fileName: 'Tax_Consolidated_Report',
            sheetName: 'Tax Consolidated',
            title: t('Tax Consolidated Report'),
            subtitle: 'VAT Return Summary',
            reportInfo: {
                title: t('Tax Consolidated Report'),
                subtitle: 'VAT Return Summary',
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'Title', label: t('Title'), align: 'left', width: 45 },
                { key: 'Amount', label: t('Amount (SAR)'), align: 'right', width: 15, type: 'currency' },
                { key: 'Adjustment', label: t('Adjustment (SAR)'), align: 'right', width: 15, type: 'currency' },
                { key: 'VATAmount', label: t('VAT Amount (SAR)'), align: 'right', width: 15, type: 'currency' }
            ]
        };
    };

    const handleExportExcel = () => {
        if (!reportData) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'portrait' });
    };

    const handleExportCsv = () => {
        if (!reportData) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    if (loading || privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Tax Consolidated Report"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("Tax Consolidated Report") }}
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
                        { title: t("Tax Consolidated Report"), url: "#" },
                    ]}
                    heading={{ icon: FileText, title: t("Tax Consolidated Report") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Tax Consolidated Report"), url: "#" },
                ]}
                heading={{ icon: FileText, title: t("Tax Consolidated Report") }}
                exportConfig={reportData ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <TaxConsolidatedReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchAllReports}
                    loading={loading}
                    hasReportData={!!reportData}
                    resetFilters={resetFilters}
                />

                {reportData && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                                        <th className="px-4 py-3 text-left font-semibold dark:text-white">{t('Title')}</th>
                                        <th className="px-4 py-3 text-right font-semibold dark:text-white min-w-[120px]">{t('Amount (SAR)')}</th>
                                        <th className="px-4 py-3 text-right font-semibold dark:text-white min-w-[140px]">{t('Adjustment (SAR)')}</th>
                                        <th className="px-4 py-3 text-right font-semibold dark:text-white min-w-[140px]">{t('VAT Amount (SAR)')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
                                        <td colSpan="4" className="px-4 py-2 font-semibold dark:text-white">{t('VAT on sales')}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Standard rated sales')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedSales?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedSales?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedSales?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Private health care/Private education/First house sales to citizens')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Zero rated domestic sales')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticSales?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticSales?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticSales?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Exports')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Exempt sales')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptSales?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptSales?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptSales?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 font-semibold">
                                        <td className="px-4 py-2 dark:text-white">{t('Total sales')}</td>
                                        <td className="px-4 py-2 text-right dark:text-white">
                                            {formatNumber(
                                                parseFloat(reportData.standardRatedSales?.Amount || 0) +
                                                parseFloat(reportData.zeroRatedDomesticSales?.Amount || 0) +
                                                parseFloat(reportData.exemptSales?.Amount || 0)
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right dark:text-white">
                                            {formatNumber(
                                                parseFloat(reportData.standardRatedSales?.Adjustment || 0) +
                                                parseFloat(reportData.zeroRatedDomesticSales?.Adjustment || 0) +
                                                parseFloat(reportData.exemptSales?.Adjustment || 0)
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right dark:text-white">{totals.salesVAT}</td>
                                    </tr>

                                    <tr className="bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
                                        <td colSpan="4" className="px-4 py-2 font-semibold dark:text-white">{t('VAT On Purchases')}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Standard rate domestic purchases')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedPurchase?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedPurchase?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.standardRatedPurchase?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Imports subject to VAT paid at customs')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Imports subject to VAT accounted for through reverse charge mechanism')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Zero rated purchases')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticPurchase?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticPurchase?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.zeroRatedDomesticPurchase?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Exempt purchases')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptPurchase?.Amount)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptPurchase?.Adjustment)}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{formatNumber(reportData.exemptPurchase?.['VAT Amount'])}</td>
                                    </tr>
                                    <tr className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 font-semibold">
                                        <td className="px-4 py-2 dark:text-white">{t('Total purchases')}</td>
                                        <td className="px-4 py-2 text-right dark:text-white">
                                            {formatNumber(
                                                parseFloat(reportData.standardRatedPurchase?.Amount || 0) +
                                                parseFloat(reportData.zeroRatedDomesticPurchase?.Amount || 0) +
                                                parseFloat(reportData.exemptPurchase?.Amount || 0)
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right dark:text-white">
                                            {formatNumber(
                                                parseFloat(reportData.standardRatedPurchase?.Adjustment || 0) +
                                                parseFloat(reportData.zeroRatedDomesticPurchase?.Adjustment || 0) +
                                                parseFloat(reportData.exemptPurchase?.Adjustment || 0)
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right dark:text-white">{totals.purchasesVAT}</td>
                                    </tr>

                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Total VAT due for current period')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{totals.totalVATDue}</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('Corrections from previous period')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('VAT credit carried forward from previous period(s)')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">0.000</td>
                                    </tr>
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2 dark:text-gray-300">{t('VAT paid on this period(s)')}</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">-</td>
                                        <td className="px-4 py-2 text-right dark:text-gray-300">{totals.vatPaidThisPeriod}</td>
                                    </tr>

                                    <tr className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold">
                                        <td className="px-4 py-3">{t('Net VAT due (or claim)')}</td>
                                        <td className="px-4 py-3 text-right">-</td>
                                        <td className="px-4 py-3 text-right">-</td>
                                        <td className="px-4 py-3 text-right">{totals.netVAT}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!reportData && !loading && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
                        {t('Click Generate to view the Tax Consolidated Report')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxConsolidatedReport;