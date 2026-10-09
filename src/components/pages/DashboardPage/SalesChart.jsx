import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const SalesChart = ({ selectedDate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
  const mainBranch = selectedBranchDetails.mainBranch || false;



  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      getChartData(selectedPeriod);
    } else if (fromDate && toDate) {
      getChartData(selectedPeriod);
    }
  }, [selectedPeriod, selectedBranchId, selectedDate]); // 👈 add selectedDate

  const getChartData = async (period) => {
    try {
      setLoading(true);

      const payload = {
        period: period,
        branchId: selectedBranchId,
        isMainBranch: mainBranch,

      };

      // Pass dashboard date when daily is selected
      if (period === 'daily' && selectedDate) {
        payload.p_from_date = selectedDate;
        payload.p_to_date = selectedDate;
      }

      // Add date range if custom period
      if (period === 'custom' && fromDate && toDate) {
        payload.fromDate = fromDate;
        payload.toDate = toDate;
      }

      const res = await axiosInstance.post('dashboard/sales-graph', payload);

      if (res.data && res.data.data) {
        setChartData(res.data.data);
      }

    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateSubmit = () => {
    if (fromDate && toDate) {
      getChartData('custom');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Sales</h3>

        {/* Period Tabs */}
        <div className="flex items-center gap-1 rounded-lg p-1 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 text-sm font-bold rounded-md transition-all ${selectedPeriod === period.key
                  ? ' text-[#0258FF]'
                  : ' dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {selectedPeriod === 'custom' && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              From:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              To:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleCustomDateSubmit}
            disabled={!fromDate || !toDate}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${fromDate && toDate
                ? 'main-bg text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
          >
            Apply
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="h-[280px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              {selectedPeriod === 'custom' && (!fromDate || !toDate)
                ? 'Please select a date range'
                : 'No data available'}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value) => new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currentCurrency?.currencySymbol || 'SAR',
                }).format(value)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SalesChart;