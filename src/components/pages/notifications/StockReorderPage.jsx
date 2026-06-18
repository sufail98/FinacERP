// pages/notifications/StockReorderPage.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Package, AlertCircle, PackageX, TrendingDown,
  ArrowLeft, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import ContentTable from '@/components/common/ContentTable';

const StockReorderPage = () => {
  const [reorderItems, setReorderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { selectedBranchId } = useAuth();

  // ── Fetch Data ──
  const fetchReorderItems = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('notifications/reorder', {
        branchid: selectedBranchId || 1
      });
      setReorderItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching reorder items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReorderItems();
  }, [selectedBranchId]);

  // ── Summary Stats ──
  const stats = useMemo(() => {
    const critical = reorderItems.filter((i) => parseFloat(i.CurrentStock) < 0).length;
    const outOfStock = reorderItems.filter((i) => parseFloat(i.CurrentStock) === 0).length;
    const lowStock = reorderItems.filter((i) => {
      const c = parseFloat(i.CurrentStock);
      const r = parseFloat(i.CriteriaValue);
      return c > 0 && c <= r;
    }).length;
    const totalValue = reorderItems.reduce((sum, i) => sum + parseFloat(i.StockValue || 0), 0);

    return { critical, outOfStock, lowStock, total: reorderItems.length, totalValue };
  }, [reorderItems]);

  // ── Table Columns ──
  const columns = [
    { key: 'SNo', label: '#', align: 'center', width: '50' },
    { key: 'ProductCode', label: 'Code', align: 'left', width: '100' },
    { key: 'ProductName', label: 'Product', align: 'left' },
    { key: 'BrandName', label: 'Brand', align: 'left', width: '100' },
    { key: 'UnitName', label: 'Unit', align: 'center', width: '60' },
    { key: 'CriteriaValue', label: 'Reorder Lvl', align: 'right', width: '100' },
    { key: 'CurrentStock', label: 'Stock', align: 'right', width: '100' },
    { key: 'PurchaseRate', label: 'Rate', align: 'right', width: '100' },
    { key: 'StockValue', label: 'Value', align: 'right', width: '110' },
    { key: 'Status', label: 'Status', align: 'center', width: '110' },
  ];

  // ── Helpers ──
  const formatNumber = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStockStatus = (item) => {
    const current = parseFloat(item.CurrentStock);
    const criteria = parseFloat(item.CriteriaValue);

    if (current < 0) return { label: 'Negative', type: 'critical' };
    if (current === 0) return { label: 'Out of Stock', type: 'outOfStock' };
    if (current <= criteria) return { label: 'Low', type: 'low' };
    return { label: 'OK', type: 'inStock' };
  };

  const getStatusBadge = (type, label) => {
    const styles = {
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      outOfStock: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      low: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      inStock: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles[type]}`}>
        {label}
      </span>
    );
  };

  // ── Custom Cell Render ──
  const renderCell = (key, row) => {
    switch (key) {
      case 'ProductCode':
        return (
          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
            {row.ProductCode}
          </span>
        );

      case 'ProductName':
        return (
          <div className="flex items-center gap-1.5">
            {row.ProductImage && (
              <img
                src={`http://127.0.0.1:8000/storage/${row.ProductImage}`}
                alt=""
                className="w-5 h-5 rounded object-cover flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="truncate text-gray-800 dark:text-gray-200 text-[13px]">
              {row.ProductName}
            </span>
          </div>
        );

      case 'BrandName':
        return (
          <span className={`text-[12px] ${row.BrandName === 'NA' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
            {row.BrandName === 'NA' ? '—' : row.BrandName}
          </span>
        );

      case 'CriteriaValue':
        return <span className="text-[12px] text-gray-500 dark:text-gray-400">{formatNumber(row.CriteriaValue)}</span>;

      case 'CurrentStock': {
        const status = getStockStatus(row);
        const colorClass = {
          critical: 'text-red-600 dark:text-red-400 font-bold',
          outOfStock: 'text-orange-600 dark:text-orange-400 font-bold',
          low: 'text-amber-600 dark:text-amber-400 font-semibold',
          inStock: 'text-emerald-600 dark:text-emerald-400',
        };
        return <span className={`text-[12px] ${colorClass[status.type]}`}>{formatNumber(row.CurrentStock)}</span>;
      }

      case 'PurchaseRate':
        return <span className="text-[12px] text-gray-600 dark:text-gray-300">{formatNumber(row.PurchaseRate)}</span>;

      case 'StockValue': {
        const val = parseFloat(row.StockValue);
        return (
          <span className={`text-[12px] font-medium ${val < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {formatNumber(row.StockValue)}
          </span>
        );
      }

      case 'Status': {
        const status = getStockStatus(row);
        return getStatusBadge(status.type, status.label);
      }

      default:
        return row[key] ?? '—';
    }
  };

  // ── Footer Data ──
  const footerData = useMemo(() => {
    if (reorderItems.length === 0) return null;

    const totalStockValue = reorderItems.reduce((sum, i) => sum + parseFloat(i.StockValue || 0), 0);
    const totalCurrentStock = reorderItems.reduce((sum, i) => sum + parseFloat(i.CurrentStock || 0), 0);

    return {
      SNo: '',
      ProductCode: '',
      ProductName: `${reorderItems.length} Products`,
      BrandName: '',
      UnitName: '',
      CriteriaValue: '',
      CurrentStock: formatNumber(totalCurrentStock),
      PurchaseRate: '',
      StockValue: `${formatNumber(totalStockValue)}`,
      Status: '',
    };
  }, [reorderItems]);

  return (
    <div className="p-3 md:p-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Stock Reorder Alerts</h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Products requiring attention</p>
          </div>
        </div>

        <button
          onClick={fetchReorderItems}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
            main-bg hover:bg-blue-700 text-white transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Compact Summary ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Package size={14} className="text-blue-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Total:</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.total}</span>
        </div>

        {stats.critical > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400">Negative:</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats.critical}</span>
          </div>
        )}

        {stats.outOfStock > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <PackageX size={14} className="text-orange-500" />
            <span className="text-xs text-orange-600 dark:text-orange-400">Out:</span>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{stats.outOfStock}</span>
          </div>
        )}

        {stats.lowStock > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <TrendingDown size={14} className="text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400">Low:</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.lowStock}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Value:</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(stats.totalValue)}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <ContentTable
        columns={columns}
        data={reorderItems}
        renderCell={renderCell}
        loading={loading}
        staticSearchable={true}
        footerData={footerData}
        tableId="stock-reorder"
        pageSize={100}
      />
    </div>
  );
};

export default StockReorderPage;