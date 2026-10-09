// src/components/pages/Reports/PriceListReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { DollarSign } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import PriceListReportFilters from './PriceListReportFilters';
import useReportExport from '@/hooks/useReportExport';

const PriceListReport = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [groupData, setGroupData] = useState([]);
    const { selectedBranchId, currentCurrency } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Price List");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const { 
        exportGenericToExcel, 
        exportGenericToPdf, 
        exportGenericToCsv 
    } = useReportExport();

    const [filters, setFilters] = useState({
        groupId: 0,
    });

    useEffect(() => {
        fetchGroupData();
    }, [selectedBranchId]);

    const fetchGroupData = async () => {
        try {
            const res = await axiosInstance.get("product-groups");
            setGroupData(res.data.data || []);
        } catch (err) {
            console.error("❌ Error fetching group data:", err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        
        const requestBody = {
            group_id: parseInt(filters.groupId) || 0,
            branch_id: parseInt(selectedBranchId) || 1,
            currency_id: parseInt(currentCurrency?.currencyId) || 1
        };

        try {
            const res = await axiosInstance.post("price-list-report", requestBody);
            
            const dataWithSNo = (res.data.data || []).map((item, index) => ({
                ...item,
                SNo: index + 1
            }));
            
            setReportData(dataWithSNo);
        } catch (error) {
            console.error("❌ Price List Report Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const selectedGroup = groupData.find(g => (g.groupId || g.id) === filters.groupId);
        const groupName = selectedGroup?.groupName || selectedGroup?.name || t('All Groups');

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            productCode: row.productCode || '',
            Item: row.Item || '',
            Unit: row.Unit || '',
            PurchaseRate: (row['Purchase Rate'] === 'NaN' || isNaN(row['Purchase Rate'])) ? '0.00' : Number(row['Purchase Rate'] || 0).toFixed(decimalPart),
            LastSalesRate: (row['Last Sales Rate'] === 'NaN' || isNaN(row['Last Sales Rate'])) ? '0.00' : Number(row['Last Sales Rate'] || 0).toFixed(decimalPart),
            StandardRate: (row['Standard Rate'] === 'NaN' || isNaN(row['Standard Rate'])) ? '0.00' : Number(row['Standard Rate'] || 0).toFixed(decimalPart),
            salesRate: (row.salesRate === 'NaN' || isNaN(row.salesRate)) ? '0.00' : Number(row.salesRate || 0).toFixed(decimalPart),
            MRP: (row.MRP === 'NaN' || isNaN(row.MRP)) ? '0.00' : Number(row.MRP || 0).toFixed(decimalPart)
        }));

        return {
            fileName: `Price_List_Report_${groupName.replace(/\s+/g, '_')}`,
            sheetName: 'Price List',
            title: t('Price List Report'),
            subtitle: groupName,
            reportInfo: {
                title: t('Price List Report'),
                subtitle: groupName
            },
            data: exportData,
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: t('S.No'), align: 'center', width: 8 },
                { key: 'productCode', label: t('Product Code'), align: 'left', width: 14 },
                { key: 'Item', label: t('Product Name'), align: 'left', width: 30 },
                { key: 'Unit', label: t('Unit'), align: 'center', width: 10 },
                { key: 'PurchaseRate', label: t('Purchase Rate'), align: 'right', width: 14, type: 'currency' },
                { key: 'LastSalesRate', label: t('Last Sales Rate'), align: 'right', width: 14, type: 'currency' },
                { key: 'StandardRate', label: t('Standard Rate'), align: 'right', width: 14, type: 'currency' },
                { key: 'salesRate', label: t('Sales Rate'), align: 'right', width: 14, type: 'currency' },
                { key: 'MRP', label: t('MRP'), align: 'right', width: 14, type: 'currency' }
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

    /* ------------------------------ Filter Handlers ------------------------------ */

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            groupId: 0,
        });
        setReportData(null);
    };

    // Dropdown options
    const groupOptions = [
        { label: 'All', value: 0 },
        ...groupData.map(group => ({
            label: group.groupName || group.name,
            value: group.groupId || group.id
        }))
    ];

    const columns = [
        { key: 'SNo', label: t('S.No'), align: 'center' },
        { key: 'productCode', label: t('Product Code'), align: 'left' },
        { key: 'Item', label: t('Product Name'), align: 'left' },
        { key: 'Unit', label: t('Unit'), align: 'center' },
        { key: 'Purchase Rate', label: t('Purchase Rate'), align: 'right' },
        { key: 'Last Sales Rate', label: t('Last Sales Rate'), align: 'right' },
        { key: 'Standard Rate', label: t('Standard Rate'), align: 'right' },
        { key: 'salesRate', label: t('Sales Rate'), align: 'right' },
        { key: 'MRP', label: t('MRP'), align: 'right' }
    ];

    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        
        if (key === 'Purchase Rate' || key === 'Last Sales Rate' || key === 'Standard Rate' || key === 'salesRate' || key === 'MRP') {
            const value = row[key];
            if (value === 'NaN' || isNaN(value)) {
                return <div className="text-right">0.00</div>;
            }
            return (
                <div className="text-right">
                    {Number(value || 0).toFixed(decimalPart)}
                </div>
            );
        }
        return row[key] ?? '-';
    };

    if ( privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Price List Report"), url: "#" },
                    ]}
                    heading={{ icon: DollarSign, title: t("Price List Report") }}
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
                        { title: t("Price List Report"), url: "#" },
                    ]}
                    heading={{ icon: DollarSign, title: t("Price List Report") }}
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
                    { title: t("Price List Report"), url: "#" },
                ]}
                heading={{ icon: DollarSign, title: t("Price List Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <PriceListReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    groupOptions={groupOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                />
            </div>
        </div>
    );
};

export default PriceListReport;