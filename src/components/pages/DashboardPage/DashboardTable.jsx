// src/components/common/DashboardTable.jsx
import React from 'react';

const DashboardTable = ({
  title,
  icon: Icon,
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  renderCell,
  maxHeight = "300px",
  iconBgColor = "bg-pink-500",
  iconColor = "text-white",
  filterable = false,
  filterType = 'daily',
  onFilterChange,
  customDates,
  onCustomDatesChange,
  onApplyCustomFilter
}) => {
  
  // Skeleton rows for loading state
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {columns.map((_, idx) => (
        <td key={idx} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="bg-white min-h-[400px] dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header with Title and Filters */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4 mb-0">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className={`rounded-lg ${iconBgColor}`}>
                <img src={Icon} alt="" className="w-8" />
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>

          {/* Filter Buttons */}
          {filterable && (
            <div className="flex gap-2">
              {['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'].map((type) => (
                <button
                  key={type}
                  onClick={() => onFilterChange && onFilterChange(type.toLowerCase())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filterType === type.toLowerCase()
                      ? ' text-[#0258FF] font-bold'
                      : '  text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Date Range (shows when custom is selected) */}
        {filterable && filterType === 'custom' && customDates && onCustomDatesChange && (
          <div className="flex flex-wrap items-end gap-3 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={customDates.fromDate}
                onChange={(e) => onCustomDatesChange({ ...customDates, fromDate: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={customDates.toDate}
                onChange={(e) => onCustomDatesChange({ ...customDates, toDate: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={onApplyCustomFilter}
              disabled={!customDates.fromDate || !customDates.toDate}
              className="px-4 py-1.5 text-sm bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          <thead className="bg-[#b4b5c9] dark:bg-[#E6E7FE]/20">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-400 ${
                    column.align === 'right' ? 'text-right' : 
                    column.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton
              [...Array(5)].map((_, idx) => <SkeletonRow key={idx} />)
            ) : !data || data.length === 0 ? (
              // Empty state
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, rowIdx) => (
                <tr 
                  key={rowIdx}
                  className={`${
                    rowIdx % 2 === 0 
                      ? 'bg-[#E6E7FE] dark:bg-[#E6E7FE]/10' 
                      : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  {columns.map((column, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-sm ${
                        column.align === 'right' ? 'text-right' : 
                        column.align === 'center' ? 'text-center' : 'text-left'
                      } ${
                        column.key === 'name' 
                          ? 'text-gray-900 dark:text-white font-medium' 
                          : column.key === 'amount'
                          ? 'text-green-600 dark:text-green-500 font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {renderCell ? renderCell(column.key, row, rowIdx) : (row[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardTable;