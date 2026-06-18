import { useEffect, useState } from "react";
import { Warehouse, TrendingDown, TrendingUp, Package, RefreshCw } from "lucide-react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";

/**
 * GodownStockTab
 * Props:
 *   productCode  – string, required
 */
const GodownStockTab = ({ productCode }) => {
  const { selectedBranchId } = useAuth();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStock = async () => {
    if (!productCode) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("get-product-stock", {
        productCode,
        branchId: selectedBranchId,
        godownId: null,
      });
      if (!response.data.error) {
        setStockData(response.data.data || []);
      } else {
        setError("Failed to load stock data.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [productCode, selectedBranchId]);

  // Aggregate totals
  const totals = stockData.reduce(
    (acc, row) => ({
      inward: acc.inward + parseFloat(row.totalInward || 0),
      outward: acc.outward + parseFloat(row.totalOutward || 0),
      stock: acc.stock + parseFloat(row.currentStock || 0),
    }),
    { inward: 0, outward: 0, stock: 0 }
  );

  const formatQty = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? "0.000" : n.toFixed(3);
  };

  const stockColor = (val) => {
    const n = parseFloat(val);
    if (n > 0) return "text-emerald-600 dark:text-emerald-400";
    if (n < 0) return "text-red-500 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Stock by Godown
          </span>
          {!loading && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
              ({stockData.length} location{stockData.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchStock}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600
                     text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh stock"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Package className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchStock}
            className="text-xs underline text-teal-600 dark:text-teal-400 hover:no-underline mt-1"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && stockData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <Warehouse className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No stock records found.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            This product has no godown transactions yet.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && stockData.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Godown
                </th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Total Inward
                  </span>
                </th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  <span className="flex items-center justify-end gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    Total Outward
                  </span>
                </th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Current Stock
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {stockData.map((row, idx) => (
                <tr
                  key={row.godownId ?? idx}
                  className="bg-white dark:bg-[#1e1e1e] hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors"
                >
                  {/* Godown name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {row.godownName}
                      </span>
                    </div>
                  </td>

                  {/* Inward */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {formatQty(row.totalInward)}
                    </span>
                  </td>

                  {/* Outward */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-orange-500 dark:text-orange-400 font-mono text-xs">
                      {formatQty(row.totalOutward)}
                    </span>
                  </td>

                  {/* Current stock */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold font-mono text-xs px-2 py-0.5 rounded-full
                        ${parseFloat(row.currentStock) > 0
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : parseFloat(row.currentStock) < 0
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400"
                        }`}
                    >
                      {formatQty(row.currentStock)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="bg-gray-100 dark:bg-[#2a2a2a] border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Total
                </td>
                <td className="px-4 py-2.5 text-right font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {formatQty(totals.inward)}
                </td>
                <td className="px-4 py-2.5 text-right font-bold font-mono text-xs text-orange-500 dark:text-orange-400">
                  {formatQty(totals.outward)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`font-bold font-mono text-xs px-2 py-0.5 rounded-full
                      ${totals.stock > 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : totals.stock < 0
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                  >
                    {formatQty(totals.stock)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default GodownStockTab;