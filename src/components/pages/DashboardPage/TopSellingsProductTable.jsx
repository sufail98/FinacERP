import React, { useState, useEffect } from 'react';
import DashboardTable from './DashboardTable';
import topSellingIcon from '../../../../public/assets/images/dashboard/top selling producticon.svg';
import axiosInstance from '@/lib/axiosConfig';

const TopSellingsProductTable = ({ branchId = 1, showFilters = true }) => {
    // Helper function to get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState('daily');
    const [customDates, setCustomDates] = useState({
        fromDate: getTodayDate(),
        toDate: getTodayDate()
    });

    useEffect(() => {
        fetchTopSellingProducts();
    }, [filterType, branchId]);

    const fetchTopSellingProducts = async () => {
        try {
            setLoading(true);

            const payload = {
                filterType: filterType,
                branchId: branchId
            };

            if (filterType === 'custom' && customDates.fromDate && customDates.toDate) {
                payload.fromDate = customDates.fromDate;
                payload.toDate = customDates.toDate;
            }

            const res = await axiosInstance.post('dashboard/top-selling-products', payload);
            

            if (res.data && !res.data.error) {
                const top10 = (res.data.data || []).slice(0, 10);
                setData(top10);
            }
        } catch (error) {
            console.error('Error fetching top selling products:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilterType) => {
        setFilterType(newFilterType);
        
        // Reset custom dates to today when switching to custom filter
        if (newFilterType === 'custom') {
            setCustomDates({
                fromDate: getTodayDate(),
                toDate: getTodayDate()
            });
        }
    };

    const handleCustomDateFilter = () => {
        if (customDates.fromDate && customDates.toDate) {
            fetchTopSellingProducts();
        }
    };

    const columns = [
        { key: 'index', label: '', align: 'left' },
        { key: 'productcode', label: 'Product Code', align: 'left' },
        { key: 'productname', label: 'Product Name', align: 'left' },
        { key: 'category', label: 'Category', align: 'left' },
        { key: 'totalsold', label: 'Total Sold', align: 'left' },
        { key: 'totalamount', label: 'Total Amount', align: 'left' }
    ];

    const renderCell = (key, row, rowIdx) => {
        switch (key) {
            case 'index':
                return rowIdx + 1;
            case 'productcode':
                return row.productcode || '-';
            case 'productname':
                return row.productname || '-';
            case 'category':
                return row.category || 'Category';
            case 'totalsold':
                return parseFloat(row.totalsold || 0).toFixed(0);
            case 'totalamount':
                return parseFloat(row.totalamount || 0).toFixed(0);
            default:
                return row[key] ?? '-';
        }
    };

    return (
        <DashboardTable
            title="Top Selling Product"
            icon={topSellingIcon}
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="No top selling products found"
            renderCell={renderCell}
            maxHeight="400px"
            iconBgColor="bg-pink-500"
            filterable={showFilters}
            filterType={filterType}
            onFilterChange={handleFilterChange}
            customDates={customDates}
            onCustomDatesChange={setCustomDates}
            onApplyCustomFilter={handleCustomDateFilter}
        />
    );
};

export default TopSellingsProductTable;