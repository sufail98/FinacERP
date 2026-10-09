import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { ArrowLeftRight } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ProductMovementReportFilters from './ProductMovementReportFilters';
import useReportExport from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

export const ProductMovementReport = () => {
    const { allProducts: productData } = useSelector((state) => state.products)
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [alert, setAlert] = useState(null);
    const [dropdownLoading, setDropdownLoading] = useState(false)
    const navigate = useNavigate();
    const [partyData, setPartyData] = useState([]);
    const [godownData, setGodownData] = useState([]);


    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Product Movement");
    const { generalSettings } = useSelector((state) => state.settings);

    // Use the unified export hook
    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const getDefaultDates = () => {
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return {
            fromDate: oneYearAgo.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
        };
    };

    const defaultDates = getDefaultDates();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const format = generalSettings?.dateformat || 'dd-MM-yyyy';
        return format
            .replace('dd', dd)
            .replace('MM', MM)
            .replace('yyyy', yyyy);
    };

    const [filters, setFilters] = useState({
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        voucherType: 'All',
        productCode: '',
        party: null,
        godownId: null
    });

    useEffect(() => {
        fetchDropdownData();
    }, [selectedBranchId]);

    const fetchDropdownData = async () => {
        setDropdownLoading(true)
        try {
            const [partyRes, godownRes] = await Promise.all([
                axiosInstance.post("account-ledgers", {
                    group_ids: [5, 6, 28, 29],
                    branchId: selectedBranchId
                }).catch(() => ({ data: { data: [] } })),
                axiosInstance.get(`godowns/${selectedBranchId}`).catch(() => ({ data: { data: [] } }))
            ]);

            // setProductData(productRes.data.data || []);
            setPartyData(partyRes.data.data || []);
            setGodownData(godownRes.data.data || []);
        } catch (error) {
            console.error("❌ Error fetching dropdown data:", error);
        } finally {
            setDropdownLoading(false)
        }
    };

    const fetchReport = async () => {
        if (!filters.productCode) {
            setAlert({
                id: Date.now(),
                type: 'warning',
                message: t('Please select a product')
            });
            return;
        }

        setLoading(true);
        setAlert(null);

        const requestBody = {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            voucherType: filters.voucherType,
            productCode: filters.productCode,
            party: filters.party || null,
            branchId:null,
            godownId: filters.godownId ? parseInt(filters.godownId) : null
        };

        try {
            const res = await axiosInstance.post("product-movement-report", requestBody);

            let runningBalance = 0;
            const dataWithSNo = (res.data.data || []).map((item, index) => {
                runningBalance += (parseFloat(item.InwardQty) || 0) - (parseFloat(item.OutwardQty) || 0);
                return {
                    ...item,
                    SNo: index + 1,
                    Balance: runningBalance,
                    Date: formatDate(item.Date)
                };
            });

            setReportData(dataWithSNo);

            if (dataWithSNo.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: res.data.message || t('No data found for the selected filters')
                });
            }
        } catch (error) {
            console.error("❌ Product Movement Report Error:", error);

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

    const totals = useMemo(() => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;

        return reportData.reduce((acc, row) => ({
            'InwardQty': (acc['InwardQty'] || 0) + (parseFloat(row['InwardQty']) || 0),
            'OutwardQty': (acc['OutwardQty'] || 0) + (parseFloat(row['OutwardQty']) || 0),
            'VoucherQty': (acc['VoucherQty'] || 0) + (parseFloat(row['VoucherQty']) || 0),
            'Balance': (acc['Balance'] || 0) + (parseFloat(row['InwardQty']) || 0) - (parseFloat(row['OutwardQty']) || 0),
        }), {});
    }, [reportData]);

    const footerData = useMemo(() => {
        if (!reportData || reportData.length === 0 || !totals) return null;
        const decimalPart = generalSettings?.decimalPart || 2;

        return {
            label: t('Total'),
            'InwardQty': totals['InwardQty']?.toFixed(decimalPart) || '0.00',
            'OutwardQty': totals['OutwardQty']?.toFixed(decimalPart) || '0.00',
            'VoucherQty': totals['VoucherQty']?.toFixed(decimalPart) || '0.00',
            'Balance': totals['Balance']?.toFixed(decimalPart) || '0.00'   // ← add this
        };
    }, [reportData, totals, generalSettings?.decimalPart, t]);

    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const selectedProduct = productData.find(p => p.productCode === filters.productCode);
        const productName = selectedProduct?.productName || filters.productCode;

        const exportData = reportData.map((row, index) => ({
            SNo: row.SNo || index + 1,
            Date: row.Date || '',
            VoucherType: row.VoucherType || '',
            VoucherNo: row.VoucherNo || '',
            Party: row.Party || '',
            VoucherUnit: row.VoucherUnit || '',
            VoucherQty: Number(row.VoucherQty || 0).toFixed(decimalPart),
            VoucherRate: Number(row.VoucherRate || 0).toFixed(decimalPart),
            InwardQty: Number(row.InwardQty || 0).toFixed(decimalPart),
            OutwardQty: Number(row.OutwardQty || 0).toFixed(decimalPart),
            Rate: Number(row.Rate || 0).toFixed(decimalPart)
        }));

        return {
            fileName: `Product_Movement_${filters.productCode}`,
            sheetName: 'Product Movement',
            title: t('Product Movement Report'),
            subtitle: productName,
            reportInfo: {
                title: t('Product Movement Report'),
                subtitle: productName,
                fromDate: filters.fromDate,
                toDate: filters.toDate
            },
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            data: exportData,
            footer: {
                label: t('Total'),
                InwardQty: totals['InwardQty']?.toFixed(decimalPart) || '0.00',
                OutwardQty: totals['OutwardQty']?.toFixed(decimalPart) || '0.00',
                VoucherQty: totals['VoucherQty']?.toFixed(decimalPart) || '0.00'
            },
            theme: 'professional',
            decimalPlaces: decimalPart,
            columns: [
                { key: 'SNo', label: '#', align: 'center', width: 6 },
                { key: 'Date', label: t('Date'), align: 'center', width: 12 },
                { key: 'VoucherType', label: t('Voucher Type'), align: 'left', width: 16 },
                { key: 'VoucherNo', label: t('Voucher No'), align: 'left', width: 14 },
                { key: 'Party', label: t('Party'), align: 'left', width: 20 },
                { key: 'VoucherUnit', label: t('Unit'), align: 'center', width: 8 },
                { key: 'VoucherQty', label: t('Voucher Qty'), align: 'right', width: 12, type: 'currency' },
                { key: 'VoucherRate', label: t('Voucher Rate'), align: 'right', width: 12, type: 'currency' },
                { key: 'InwardQty', label: t('Inward Qty'), align: 'right', width: 12, type: 'currency' },
                { key: 'OutwardQty', label: t('Outward Qty'), align: 'right', width: 12, type: 'currency' },
                { key: 'Rate', label: t('Rate'), align: 'right', width: 12, type: 'currency' }
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
        const dates = getDefaultDates();
        setFilters({
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            voucherType: 'All',
            productCode: '',
            party: null,
            godownId: null
        });
        setReportData(null);
        setAlert(null);
    };

    const productOptions = productData.map(product => ({
        label: `${product.productCode} - ${product.productName}`,
        value: product.productCode
    }));

    const partyOptions = partyData.map(party => ({
        label: party.ledgerName,
        value: party.ledgerName
    }));

    const godownOptions = [
        { label: t('All'), value: null },
        ...godownData.map(godown => ({
            label: godown.GodownName || godown.godownName,
            value: godown.GodownId || godown.godownId
        }))
    ];

    const voucherTypeOptions = [
        { label: t('All'), value: 'All' },
        { label: t('Sales Invoice'), value: 'Sales Invoice' },
        { label: t('Sales Return'), value: 'Sales Return' },
        { label: t('Purchase Invoice'), value: 'Purchase Invoice' },
        { label: t('Purchase Return'), value: 'Purchase Return' },
        { label: t('Physical Stock'), value: 'Physical Stock' },
        { label: t('Damage Stock'), value: 'Damage Stock' },
        { label: t('Stock Journal'), value: 'Stock Journal' },
        { label: t('Opening Stock'), value: 'Opening Stock' }
    ];

    const columns = [
        { key: 'SNo', label: '#', align: 'center' },
        { key: 'Date', label: t('Date'), align: 'center' },
        { key: 'VoucherType', label: t('Voucher Type'), align: 'left' },
        { key: 'VoucherNo', label: t('Voucher No'), align: 'left' },
        { key: 'Party', label: t('Party'), align: 'left' },
        { key: 'VoucherUnit', label: t('Unit'), align: 'center' },
        { key: 'VoucherQty', label: t('Voucher Qty'), align: 'right' },
        { key: 'VoucherRate', label: t('Voucher Rate'), align: 'right' },
        { key: 'InwardQty', label: t('Inward Qty'), align: 'right' },
        { key: 'OutwardQty', label: t('Outward Qty'), align: 'right' },
        { key: 'Balance', label: t('Balance'), align: 'right' }
    ];

    const handleRowClick = (row) => {
        if (!row.MasterId) return;

        const routes = {
            'Sales Invoice': `/transaction/sales-invoice/invoice-list/edit-sales-invoice/${row.MasterId}`,
            'Purchase Invoice': `/transaction/purchase-invoice/edit-purchase-invoice/${row.MasterId}`,
            'Sales Return': `/transaction/sales-return/return-list/edit-sales-return/${row.MasterId}`,
            'Purchase Return': `/transaction/purchase-return/edit-purchase-return/${row.MasterId}`,
            'Journal Voucher': `/transaction/journal-voucher/edit-journal-voucher/${row.MasterId}`,
            'Payable Voucher': `/transaction/payable-voucher/edit/${row.MasterId}`,
            'Receivable Voucher': `/transaction/receivable-voucher/edit/${row.MasterId}`,
            'Manufacturing Journal': `/transaction/manufacturing-journal/edit/${row.MasterId}`,
            'Physical Stock': `/transaction/physical-stock/edit/${row.MasterId}`,
            'Damage Stock': `/transaction/damage-stock/edit/${row.MasterId}`,
        };

        const path = routes[row.VoucherType];
        if (path) {
            navigate(path);
        }
    };
    const renderCell = (key, row) => {
        const decimalPart = generalSettings?.decimalPart || 2;
        const value = row[key];

        // ✅ Handle Date
        if (key === 'Date') {
            return <div className="text-center">{value || '-'}</div>;
        }

        // ✅ Handle Balance FIRST
        if (key === 'Balance') {
            const numValue = parseFloat(value) || 0;
            const colorClass = numValue > 0
                ? 'text-green-600'
                : numValue < 0
                    ? 'text-red-600'
                    : 'text-gray-500';
            return <div className={`text-right font-semibold ${colorClass}`}>{numValue.toFixed(decimalPart)}</div>;
        }

        const numericKeys = ['InwardQty', 'OutwardQty', 'VoucherQty', 'VoucherRate'];

        if (numericKeys.includes(key)) {
            if (value === null || value === undefined || value === 'NaN' || isNaN(parseFloat(value))) {
                return <div className="text-right text-gray-400">0.00</div>;
            }

            const numValue = parseFloat(value);

            if (key === 'InwardQty' && numValue > 0) {
                return <div className="text-right text-green-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }
            if (key === 'OutwardQty' && numValue > 0) {
                return <div className="text-right text-red-600 font-medium">{numValue.toFixed(decimalPart)}</div>;
            }

            return <div className="text-right">{numValue.toFixed(decimalPart)}</div>;
        }

        if (key === 'VoucherNo') {
            return value || '-';
        }

        if (key === 'VoucherType') {
            const colorMap = {
                'Sales Invoice': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                'Sales Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                'Purchase Invoice': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                'Purchase Return': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                'Physical Stock': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                'Damage Stock': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            };

            return (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-800'}`}>
                    {value || '-'}
                </span>
            );
        }

        return value ?? '-';
    };

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Product Movement Report"), url: "#" },
                    ]}
                    heading={{ icon: ArrowLeftRight, title: t("Product Movement Report") }}
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
                        { title: t("Product Movement Report"), url: "#" },
                    ]}
                    heading={{ icon: ArrowLeftRight, title: t("Product Movement Report") }}
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
                    { title: t("Product Movement Report"), url: "#" },
                ]}
                heading={{ icon: ArrowLeftRight, title: t("Product Movement Report") }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />

            <div className="px-1">
                <ProductMovementReportFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onGenerateReport={fetchReport}
                    productOptions={productOptions}
                    partyOptions={partyOptions}
                    godownOptions={godownOptions}
                    voucherTypeOptions={voucherTypeOptions}
                    loading={loading}
                    hasReportData={!!reportData && reportData.length > 0}
                    resetFilters={resetFilters}
                    dropdownLoading={dropdownLoading}
                />

                <ContentTable
                    columns={columns}
                    data={reportData}
                    loading={loading}
                    renderCell={renderCell}
                    footerData={footerData}
                    maxHeight='calc(100vh - 270px)'
                    onRowClick={handleRowClick}

                />
            </div>
        </div>
    );
};
