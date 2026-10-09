// src/components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWiseGrid.jsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ContentTable from '@/components/common/ContentTable';

const ProductSearchVoucherWiseGrid = ({ data, loading, totals, decimalPart = 2 }) => {
    const { t } = useTranslation();

    const columns = useMemo(() => ([
        { key: 'SNo', label: '#', align: 'center', width: '50' },
        { key: 'date', label: t('productSearchVoucherWise.grid.columns.date'), align: 'center', width: '110' },
        { key: 'Type', label: t('productSearchVoucherWise.grid.columns.voucherType'), align: 'center', width: '110' },
        { key: 'voucherNo', label: t('productSearchVoucherWise.grid.columns.voucherNo'), align: 'center', width: '90' },
        { key: 'productCode', label: t('productSearchVoucherWise.grid.columns.productCode'), align: 'center', width: '100' },
        { key: 'productName', label: t('productSearchVoucherWise.grid.columns.productName'), align: 'left' },
        { key: 'UnitName', label: t('productSearchVoucherWise.grid.columns.unit'), align: 'center', width: '80' },
        { key: 'inwardQty', label: t('productSearchVoucherWise.grid.columns.inwardQty'), align: 'right', width: '100' },
        { key: 'outwardQty', label: t('productSearchVoucherWise.grid.columns.outwardQty'), align: 'right', width: '100' },
        { key: 'rate', label: t('productSearchVoucherWise.grid.columns.rate'), align: 'right', width: '100' },
        { key: 'Cost', label: t('productSearchVoucherWise.grid.columns.amount'), align: 'right', width: '120' },
    ]), [t]);

    // Format date "2026-08-05 00:00:00" -> "05-08-2026"
    const formatDate = (value) => {
        if (!value) return '-';
        const datePart = String(value).split(' ')[0];
        const [y, m, d] = datePart.split('-');
        if (!y || !m || !d) return datePart;
        return `${d}-${m}-${y}`;
    };

    const formatNumber = (value, decimals = 3) => {
        const num = Number(value);
        if (isNaN(num)) return '-';
        return num.toFixed(decimals);
    };

    const renderCell = (key, row) => {
        switch (key) {
            case 'date':
                return formatDate(row.date);
            case 'Type':
                return row.Type || '-';
            case 'voucherNo':
                return row.voucherNo ?? '-';
            case 'productCode':
                return row.productCode ?? '-';
            case 'productName':
                return row.productName || '-';
            case 'UnitName':
                return row.UnitName || '-';
            case 'inwardQty':
                return formatNumber(row.inwardQty, 3);
            case 'outwardQty':
                return formatNumber(row.outwardQty, 3);
            case 'rate':
                return formatNumber(row.rate, decimalPart);
            case 'Cost':
                return formatNumber(row.Cost, decimalPart);
            default:
                return row[key] ?? '-';
        }
    };

    const footerData = totals ? {
        label: t('productSearchVoucherWise.grid.total'),
        productName: t('productSearchVoucherWise.grid.total'),
        inwardQty: Number(
            (data || []).reduce((sum, r) => sum + parseFloat(r.inwardQty || 0), 0)
        ).toFixed(3),
        outwardQty: Number(
            (data || []).reduce((sum, r) => sum + parseFloat(r.outwardQty || 0), 0)
        ).toFixed(3),
        Cost: totals.totalAmount,
    } : null;

    return (
        <ContentTable
            columns={columns}
            data={data || []}
            renderCell={renderCell}
            loading={loading}
            footerData={footerData}
            staticSearchable={true}
            sortable={true}
            tableId="product-search-voucher-wise"
            pageSize={100}
            maxHeight="65vh"
        />
    );
};

export default ProductSearchVoucherWiseGrid;