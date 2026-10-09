// src/components/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Landmark,
  Wallet,
  Users,
  Truck,
  Building2
} from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import DateInput from '@/components/elements/theme/DateInput';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import dashboardIconOne from '../../../../public/assets/images/dashboard/Group 15.svg';
import dashboardIconTwo from '../../../../public/assets/images/dashboard/Group 16.svg';
import dashboardIconThree from '../../../../public/assets/images/dashboard/Group 16 (1).svg';
import dashboardIconFour from '../../../../public/assets/images/dashboard/Group 16 (2).svg';
import payableImg from '../../../../public/assets/images/dashboard/payable.svg';
import recivableImg from '../../../../public/assets/images/dashboard/racevable.svg';
import customerBalanceImg from '../../../../public/assets/images/dashboard/customerBalance.svg';
import supplierBalanceImg from '../../../../public/assets/images/dashboard/supplierBalance.svg';
import SalesChart from './SalesChart';
import BalanceCard from './BalanceCard';
import DashboardTable from './DashboardTable';
import TopSellingsProductTable from './TopSellingsProductTable';

const Dashboard = () => {
  const { selectedBranchId, currentCurrency, selectedBranchDetails } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true); // Separate loading for stats
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const mainBranch = selectedBranchDetails.mainBranch || false;
  const { generalSettings, financeSettings } = useSelector((state) => state.settings);


  const { t } = useTranslation()

  // Customer and Supplier data states
  const [customerData, setCustomerData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Main branch customer and supplier data
  const [allBranchCustomerData, setAllBranchCustomerData] = useState([]);
  const [allBranchSupplierData, setAllBranchSupplierData] = useState([]);
  const [allBranchCustomerLoading, setAllBranchCustomerLoading] = useState(true);
  const [allBranchSupplierLoading, setAllBranchSupplierLoading] = useState(true);

  useEffect(() => {
    if (selectedBranchId) {
      fetchDashboardData();
      if (mainBranch) {
        fetchAllBranchCustomerBalanceData();
        fetchAllBranchSupplierBalanceData();
      }
      // if (!mainBranch) {
      fetchCustomerData();
      fetchSupplierData();
      // }
    }
  }, [selectedBranchId, selectedDate, mainBranch]);

  const fetchDashboardData = async () => {
  setStatsLoading(true);

  try {
    const rangeDays = Number(financeSettings?.DashboardDateRangeInDays) || 0;

    // Calculate fromDate = selectedDate - rangeDays
    const toDateObj = new Date(selectedDate);
    const fromDateObj = new Date(toDateObj);
    fromDateObj.setDate(fromDateObj.getDate() - rangeDays);

    const fromDate = fromDateObj.toISOString().split('T')[0];

    const payload = {
      fromDate: fromDate,
      toDate: selectedDate,
      branchId: selectedBranchId,
      isShowOpeningBalance: true,
      isMainGroup: true,
      currencyId: currentCurrency.currencyId
    };

    const response = await axiosInstance.post('dashboard', payload);

    setDashboardData(response.data);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  } finally {
    setStatsLoading(false);
  }
};


  const fetchAllBranchCustomerBalanceData = async () => {
    setAllBranchCustomerLoading(true);

    try {
      const payload = {
        fromDate: selectedDate,
        toDate: selectedDate,
        isShowOpeningBalance: true,
        groupId: 5,
        currencyId: currentCurrency.currencyId
      };

      const response = await axiosInstance.post('all-branch-group-ledger-balance', payload);

      setAllBranchCustomerData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching all branch customer data:', error);
      setAllBranchCustomerData([]);
    } finally {
      setAllBranchCustomerLoading(false);
    }
  };

  const fetchAllBranchSupplierBalanceData = async () => {
    setAllBranchSupplierLoading(true);

    try {
      const payload = {
        fromDate: selectedDate,
        toDate: selectedDate,
        isShowOpeningBalance: true,
        groupId: 8,
        currencyId: currentCurrency.currencyId
      };

      const response = await axiosInstance.post('all-branch-group-ledger-balance', payload);

      setAllBranchSupplierData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching all branch supplier data:', error);
      setAllBranchSupplierData([]);
    } finally {
      setAllBranchSupplierLoading(false);
    }
  };

  const fetchCustomerData = async () => {
    setCustomerLoading(true);
    try {
      const res = await axiosInstance.post("accountgroup-detailed-report", {
        fromDate: selectedDate,
        toDate: selectedDate,
        branchId: selectedBranchId,
        groupId: 44,
        currencyId: currentCurrency?.currencyId || 1,
        isShowOpeningBalance: true,
        isMainGroup: true,
        costCentreId: null
      });
      setCustomerData(res.data.data || []);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setCustomerData([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const fetchSupplierData = async () => {
    setSupplierLoading(true);
    try {
      const res = await axiosInstance.post("accountgroup-detailed-report", {
        fromDate: selectedDate,
        toDate: selectedDate,
        branchId: selectedBranchId,
        groupId: 43,
        currencyId: currentCurrency?.currencyId || 1,
        isShowOpeningBalance: true,
        isMainGroup: true,
        costCentreId: null
      });
      setSupplierData(res.data.data || []);
    } catch (error) {
      console.error("Error fetching supplier data:", error);
      setSupplierData([]);
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      setSelectedDate(newDate);
    }
  };
  // Extract data with defaults
  const salesData = dashboardData?.sales?.[0] || { TotalSalesCount: 0, TotalSalesAmount: '0' };
  const purchaseData = dashboardData?.purchase?.[0] || { TotalPurchaseCount: 0, TotalPurchaseAmount: '0' };
  const bankBalance = dashboardData?.bankBalance?.currentbal
    || dashboardData?.bankBalance?.totalBalance
    || '0';

  const cashBalance = dashboardData?.cashBalance?.currentbal
    || dashboardData?.cashBalance?.totalBalance
    || '0';


  // Parse amounts
  const salesAmount = parseFloat(salesData.TotalSalesAmount) || 0;
  const purchaseAmount = parseFloat(purchaseData.TotalPurchaseAmount) || 0;
  const bankBalanceAmount = (parseFloat(bankBalance) || 0).toFixed(generalSettings.decimalPart);
  const cashBalanceAmount = (parseFloat(cashBalance) || 0).toFixed(generalSettings.decimalPart);

  // Format currency
  const formatCurrency = (amount) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toFixed(generalSettings.decimalPart);
    return `${isNegative ? '-' : ''} ${absAmount}`;
  };

  // Table columns for Customer/Supplier (current branch)
  const tableColumns = [
    { key: 'SlNO', label: '#', align: 'center' },
    { key: 'ledgerName', label: t('dashboard.tableColumns.ledgerName'), },
    { key: 'balance', label: t('dashboard.tableColumns.balance'), align: 'right' },
  ];

  // Table columns for All Branch Customer/Supplier (main branch)
  const allBranchTableColumns = [
    { key: 'SlNO', label: '#', align: 'center' },
    { key: 'branchCode', label: t('dashboard.tableColumns.branchCode'), align: 'left' },
    { key: 'ledgerName', label: t('dashboard.tableColumns.ledgerName'), align: 'left' },
    { key: 'balance', label: t('dashboard.tableColumns.balance'), align: 'right' },
  ];

  // Render cell for current branch tables
  const renderTableCell = (key, row, rowIdx) => {
    if (key === 'SlNO') {
      return row.SlNO || rowIdx + 1;
    }

    if (key === 'ledgerId') {
      return (
        <span className="text-gray-500 dark:text-gray-400 text-xs">
          #{row.ledgerId}
        </span>
      );
    }

    if (key === 'balance') {
      const op = parseFloat(row.op || 0);
      const debit = parseFloat(row.debit || 0);
      const credit = parseFloat(row.credit || 0);
      const balance = (op + debit) - credit;
      const label = balance < 0 ? 'Cr' : 'Dr';
      const amount = Math.abs(balance).toFixed(generalSettings.decimalPart);

      return (
        <span className={`font-medium ${balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {amount} {label}
        </span>
      );
    }

    if (key === 'ledgerName') {
      return (
        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] block">
          {row.ledgerName || '-'}
        </span>
      );
    }

    return row[key] ?? '-';
  };

  // Render cell for all branch customer/supplier tables
  const renderAllBranchCell = (key, row, rowIdx) => {
    if (key === 'SlNO') {
      return rowIdx + 1;
    }

    if (key === 'branchName') {
      return (
        <div>
          <span className="font-medium text-gray-900 dark:text-white block">
            {row.branchName || '-'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.branchCode || ''}
          </span>
        </div>
      );
    }

    if (key === 'ledgerName') {
      return (
        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] block">
          {row.ledgerName || '-'}
        </span>
      );
    }

    if (key === 'balance') {
      const balance = parseFloat(row.balance || 0);
      const label = balance < 0 ? 'Cr' : 'Dr';
      const amount = Math.abs(balance).toFixed(generalSettings.decimalPart);

      return (
        <span className={`font-medium ${balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {amount} {label}
        </span>
      );
    }

    return row[key] ?? '-';
  };

  // Stat Card Component - Redesigned to match the provided image
// Stat Card Component - Redesigned to match the provided image
const StatCard = ({ icon: Icon, title, amount, iconBgColor, iconColor, amountColor }) => (
  <div className="flex flex-col items-start justify-center gap-2 sm:gap-3 p-3 sm:p-5 bg-white dark:bg-gray-900 relative last:after:hidden after:content-[''] after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:h-[60%] after:w-px after:bg-gray-200 dark:after:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
    <div className="flex gap-1.5 sm:gap-2 items-center justify-center">
      <img src={Icon} alt={title} className='w-6 h-6 sm:w-8 sm:h-8' />
      <p className="text-xs sm:text-sm font-[500] text-gray-600 dark:text-gray-400">{title}</p>
    </div>
    <div className="w-full">
      <p className={`text-xl sm:text-3xl font-bold tracking-tight text-[#4D4D4D] dark:text-white`}>
        {formatCurrency(amount)}
      </p>
    </div>
  </div>
);

  // Skeleton Card Component for Stats - Updated design
  const SkeletonStatCard = () => (
    <div className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 last:border-r-0 animate-pulse">
      <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 w-12 h-12 flex-shrink-0"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
      </div>
    </div>
  );
  // Skeleton for Balance Cards (Payable/Receivable)
const SkeletonBalanceCard = () => (
  <div className="flex items-center gap-4 p-15 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 animate-pulse">
    <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 w-12 h-12 flex-shrink-0"></div>
    <div className="flex-1 min-w-0">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28 mb-2"></div>
      <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
    </div>
  </div>
);

  return (
    <div className="p-2 bg-[#F6F6F6] dark:bg-gray-950 ">
      <div className="mx-auto space-y-4">
        {/* Header with Date Picker */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="grid grid-cols-3 items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.heading')}</h1>
            <div className="flex justify-center">
              <div className="w-[160px]">
                <DateInput
                  name="selectedDate"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full"
                />
              </div>
            </div>
            <div></div>
          </div>
        </div>

        {/* Sales & Purchase Section - Updated Layout */}
        <div className="space-y-2">
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 rounded-[13.05px] overflow-hidden shadow-sm">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 rounded-[13.05px] overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
              <StatCard
                icon={dashboardIconOne}
                title={t('dashboard.statCard.totalSales')}
                amount={salesAmount}
                iconBgColor="bg-green-50 dark:bg-green-900/20"
                iconColor="text-green-600 dark:text-green-400"
                amountColor="text-green-600 dark:text-green-400"
              />
              <StatCard
                icon={dashboardIconTwo}
                title={t('dashboard.statCard.totalPurchases')}
                amount={purchaseAmount}
                iconBgColor="bg-blue-50 dark:bg-blue-900/20"
                iconColor="text-blue-600 dark:text-blue-400"
                amountColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={dashboardIconThree}
                title={t('dashboard.statCard.bankBalance')}
                amount={bankBalanceAmount}
                iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
                iconColor="text-indigo-600 dark:text-indigo-400"
                amountColor={bankBalanceAmount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}
              />
              <StatCard
                icon={dashboardIconFour}
                title={t('dashboard.statCard.cashBalance')}
                amount={cashBalanceAmount}
                iconBgColor="bg-amber-50 dark:bg-amber-900/20"
                iconColor="text-amber-600 dark:text-amber-400"
                amountColor={cashBalanceAmount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}
              />
            </div>
          )}
        </div>
        {/* NEW: Sales Chart & Balance Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Sales Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <SalesChart selectedDate={selectedDate} />
          </div>

          {/* Balance Cards - Takes 1 column */}
       {/* Balance Cards - Takes 1 column */}
<div className="space-y-2">
  {statsLoading ? (
    <>
      <SkeletonBalanceCard />
      <SkeletonBalanceCard />
    </>
  ) : (
    <>
      <BalanceCard
        title="Total Payable"
        amount={Number(dashboardData?.totalPayable || 0).toFixed(generalSettings.decimalPart)}
        type="payable"
        icon={payableImg}
      />
      <BalanceCard
        title="Total Receivable"
        amount={Number(dashboardData?.totalReceivable || 0).toFixed(generalSettings.decimalPart)}
        type="receivable"
        icon={recivableImg}
      />
    </>
  )}
</div>
        </div>
        <TopSellingsProductTable branchId={selectedBranchId} />

        {/* Conditional Rendering: Main Branch vs Non-Main Branch */}
        {mainBranch && (
          /* Main Branch: Show All Branch Customer & Supplier Balances */
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DashboardTable
                title={t('dashboard.statCard.allBranchBankBalance')}
                icon={Users}
                columns={allBranchTableColumns}
                data={allBranchCustomerData}
                loading={allBranchCustomerLoading}
                renderCell={renderAllBranchCell}
                emptyMessage="No customer data available"
                maxHeight="400px"
                iconBgColor="bg-cyan-50 dark:bg-cyan-900/20"
                iconColor="text-cyan-600 dark:text-cyan-400"
              />
              <DashboardTable
                title={t('dashboard.statCard.allBranchCashBalance')}
                icon={Truck}
                columns={allBranchTableColumns}
                data={allBranchSupplierData}
                loading={allBranchSupplierLoading}
                renderCell={renderAllBranchCell}
                emptyMessage="No supplier data available"
                maxHeight="400px"
                iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                iconColor="text-orange-600 dark:text-orange-400"
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">
            Party Balances
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DashboardTable
              title="Customer Balances"
              icon={customerBalanceImg}
              columns={tableColumns}
              data={customerData}
              loading={customerLoading}
              renderCell={renderTableCell}
              emptyMessage="No customer data available"
              maxHeight="350px"
              iconBgColor="bg-cyan-50 dark:bg-cyan-900/20"
              iconColor="text-cyan-600 dark:text-cyan-400"
            />
            <DashboardTable
              title="Supplier Balances"
              icon={supplierBalanceImg}
              columns={tableColumns}
              data={supplierData}
              loading={supplierLoading}
              renderCell={renderTableCell}
              emptyMessage="No supplier data available"
              maxHeight="350px"
              iconBgColor="bg-orange-50 dark:bg-orange-900/20"
              iconColor="text-orange-600 dark:text-orange-400"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;