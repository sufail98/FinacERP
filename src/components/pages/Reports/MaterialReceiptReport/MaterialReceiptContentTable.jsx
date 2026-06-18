// src/components/pages/Reports/MaterialReceiptReport/MaterialReceiptContentTable.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const MaterialReceiptContentTable = ({
    columns,
    data,
    renderCell,
    loading = false,
    staticSearchable = true,
    footerData = null
}) => {
    const { t } = useTranslation();
    const [tableHeight, setTableHeight] = useState("auto");
    const containerRef = useRef(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const itemsPerPageOptions = [25, 50, 100];
    
    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    // Filter data
    const filteredData = useMemo(() => {
        if (!data) return data;
        
        if (!staticSearchable || !searchQuery.trim()) {
            return data;
        }

        const query = searchQuery.toLowerCase();
        return data?.filter((row) => {
            return columns.some((col) => {
                if (col.key === "SNo") return false;
                const value = row[col.key];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, searchQuery, columns, staticSearchable]);

    // Pagination logic
    const { paginatedData, totalPages, totalItems } = useMemo(() => {
        const total = filteredData?.length || 0;
        const pages = Math.ceil(total / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const paginated = filteredData?.slice(startIdx, endIdx);
        
        return {
            paginatedData: paginated,
            totalPages: pages,
            totalItems: total,
        };
    }, [filteredData, currentPage, itemsPerPage]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    // Reset page on search
    useEffect(() => {
        if (searchQuery) setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
    }, [itemsPerPage, currentPage, totalPages]);

    // Dynamic height
    useEffect(() => {
        const calculateHeight = () => {
            if (containerRef.current) {
                const viewportHeight = window.innerHeight;
                const top = containerRef.current.getBoundingClientRect().top;
                const availableHeight = viewportHeight - top - 60;
                setTableHeight(`${Math.max(300, availableHeight)}px`);
            }
        };
        calculateHeight();
        window.addEventListener("resize", calculateHeight);
        return () => window.removeEventListener("resize", calculateHeight);
    }, []);

    return (
        <div className="w-full" ref={containerRef}>
            {/* Search + Pagination Controls */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
                {/* Search */}
                {staticSearchable && (
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t("Search...")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-6 pl-7 pr-7 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )}

                {/* Items per page + Info */}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {searchQuery && <span>{totalItems} {t('found')}</span>}
                    
                    <div className="flex items-center gap-1">
                        <span>{t('Rows')}:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="h-5 px-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100"
                        >
                            {itemsPerPageOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {totalItems > 0 && (
                        <span>{startIndex + 1}-{endIndex} {t('of')} {totalItems}</span>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* TABLE */}
            {!loading && (
                <div 
                    className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
                    style={{ height: tableHeight }}
                >
                    <div className="overflow-auto h-full">
                        <table className="w-max min-w-full border-collapse">
                            {/* Sticky Header */}
                            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-[#2a2a2a]">
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col.key}
                                            style={{ 
                                                minWidth: col.minWidth || 'auto',
                                                width: col.key === 'SNo' ? '40px' : 'auto'
                                            }}
                                            className={`px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 ${
                                                col.align === 'center' ? 'text-center' : 
                                                col.align === 'right' ? 'text-right' : 'text-left'
                                            } whitespace-nowrap`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Body */}
                            <tbody className="bg-white dark:bg-[#1e1e1e]">
                                {paginatedData?.length > 0 ? (
                                    paginatedData.map((row, rowIndex) => (
                                        <tr
                                            key={rowIndex}
                                            className="hover:bg-gray-50 dark:hover:bg-[#252525] border-b border-gray-100 dark:border-gray-800"
                                        >
                                            {columns.map((col) => {
                                                const isSerialNo = col.key === 'SNo';
                                                const cellContent = isSerialNo 
                                                    ? startIndex + rowIndex + 1
                                                    : (renderCell ? renderCell(col.key, row) : (row[col.key] ?? "-"));

                                                return (
                                                    <td
                                                        key={col.key}
                                                        style={{ 
                                                            minWidth: col.minWidth || 'auto',
                                                            maxWidth: col.wrap ? (col.minWidth || '200px') : 'none',
                                                            width: col.key === 'SNo' ? '40px' : 'auto'
                                                        }}
                                                        className={`px-2 py-1 text-[11px] text-gray-800 dark:text-gray-200 ${
                                                            col.align === 'center' ? 'text-center' : 
                                                            col.align === 'right' ? 'text-right' : 'text-left'
                                                        } ${
                                                            isSerialNo ? 'text-gray-500' : ''
                                                        } ${
                                                            col.wrap ? 'whitespace-normal break-words leading-tight' : 'whitespace-nowrap truncate'
                                                        }`}
                                                        title={!col.wrap && cellContent ? String(cellContent) : undefined}
                                                    >
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="text-center text-gray-400 py-8 text-xs"
                                        >
                                            {searchQuery ? t("No results found") : t("No data available")}
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* Sticky Footer */}
                            {footerData && paginatedData?.length > 0 && (
                                <tfoot className="sticky bottom-0 z-10 bg-gray-100 dark:bg-[#2a2a2a] border-t-2 border-gray-300 dark:border-gray-600">
                                    <tr>
                                        {columns.map((col, colIndex) => {
                                            let cellContent = '';
                                            
                                            if (colIndex === 0) {
                                                cellContent = footerData.label || t('Total');
                                            } else if (footerData[col.key] !== undefined) {
                                                cellContent = footerData[col.key];
                                            }

                                            return (
                                                <td
                                                    key={col.key}
                                                    style={{ 
                                                        minWidth: col.minWidth || 'auto',
                                                        width: col.key === 'SNo' ? '40px' : 'auto'
                                                    }}
                                                    className={`px-2 py-1.5 text-[11px] font-bold text-gray-800 dark:text-gray-100 ${
                                                        col.align === 'center' ? 'text-center' : 
                                                        col.align === 'right' ? 'text-right' : 'text-left'
                                                    } whitespace-nowrap`}
                                                >
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-end gap-1 mt-1.5">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-5 w-5 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-[#333]"
                    >
                        <ChevronLeft className="h-3 w-3" />
                    </button>

                    {/* Page numbers */}
                    {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        
                        if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                            pages.push(1);
                            
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);
                            
                            if (currentPage <= 2) { start = 2; end = 4; }
                            if (currentPage >= totalPages - 1) { start = totalPages - 3; end = totalPages - 1; }
                            
                            if (start > 2) pages.push('...');
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (end < totalPages - 1) pages.push('...');
                            
                            pages.push(totalPages);
                        }
                        
                        return pages.map((page, idx) => (
                            page === '...' ? (
                                <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">...</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`h-5 min-w-[20px] px-1.5 text-[10px] rounded border ${
                                        currentPage === page
                                            ? 'main-bg text-white border-blue-500'
                                            : 'bg-white dark:bg-[#242424] border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-[#333]'
                                    }`}
                                >
                                    {page}
                                </button>
                            )
                        ));
                    })()}

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-5 w-5 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#242424] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-[#333]"
                    >
                        <ChevronRight className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

MaterialReceiptContentTable.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            minWidth: PropTypes.string,
            wrap: PropTypes.bool,
            align: PropTypes.string,
        })
    ).isRequired,
    data: PropTypes.arrayOf(PropTypes.object),
    renderCell: PropTypes.func,
    loading: PropTypes.bool,
    staticSearchable: PropTypes.bool,
    footerData: PropTypes.object,
};

export default MaterialReceiptContentTable;