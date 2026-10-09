import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Preloader from "./Preloader";

// ── Sort cycle: null → "asc" → "desc" → null
const nextSortDir = (current) => {
    if (!current) return "asc";
    if (current === "asc") return "desc";
    return null;
};

// ── Generic comparator aware of numbers vs strings
const compareValues = (a, b, direction) => {
    if (a === null || a === undefined) a = "";
    if (b === null || b === undefined) b = "";

    const aNum = Number(a);
    const bNum = Number(b);
    const isNumeric = !isNaN(aNum) && !isNaN(bNum) && a !== "" && b !== "";

    let result;
    if (isNumeric) {
        result = aNum - bNum;
    } else {
        result = String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
    }
    return direction === "asc" ? result : -result;
};

// ── Sort icon component
const SortIcon = ({ columnKey, sortKey, sortDir }) => {
    if (sortKey !== columnKey) {
        return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />;
    }
    if (sortDir === "asc") return <ArrowUp className="h-3 w-3 opacity-90 shrink-0" />;
    if (sortDir === "desc") return <ArrowDown className="h-3 w-3 opacity-90 shrink-0" />;
    return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />;
};

const ContentTable = ({
    onRowClick,
    columns,
    data,
    actions,
    renderCell,
    currentPage,
    totalItems,
    totalPages,
    onPageChange,
    itemsPerPage,
    loading = false,
    serverPagination = false,
    staticSearchable = false,
    footerData = null,
    minColumnWidth = 50,
    tableId = "default",
    stickyActions = true,
    pageSize = 4000,
    autoFocusSearch = false,
    maxHeight = "72vh",
    // ── Sorting prop ────────────────────────────────────────────────────────
    // sortable: when true, clicking any column header toggles A→Z / Z→A / unsorted
    // (or 0→1 / 1→0 for numeric columns). Sorting is client-side only.
    sortable = false,
    // ── Grouping props ──────────────────────────────────────────────────────
    groupBy = null,
    mergedColumns = [],
}) => {
    const { t } = useTranslation();
    const { generalSettings, saleSettings } = useSelector((state) => state.settings);
    const containerRef = useRef(null);
    const tableRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const filteredColumns = useMemo(() => {
        return columns.filter((col) => {
            const keyLowerCase = col.key.toLowerCase();
            if (keyLowerCase.includes("costcentre")) {
                return generalSettings?.costCentre === true;
            }
            if (keyLowerCase.includes("godown")) {
                return saleSettings?.ActiveGodown === true;
            }
            return true;
        });
    }, [columns, generalSettings?.costCentre, saleSettings?.ActiveGodown]);

    const searchInputRef = useCallback(
        (node) => {
            if (node && autoFocusSearch && staticSearchable) {
                setTimeout(() => { node.focus(); }, 0);
            }
        },
        [autoFocusSearch, staticSearchable]
    );

    const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
    const [columnWidths, setColumnWidths] = useState({});
    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);
    const [clientPage, setClientPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // ── Sort state ──────────────────────────────────────────────────────────
    const [sortKey, setSortKey] = useState(null);   // column key being sorted
    const [sortDir, setSortDir] = useState(null);   // "asc" | "desc" | null

    const handleHeaderClick = useCallback(
        (col) => {
            if (!sortable || col.key === "SNo") return;
            setSortKey((prevKey) => {
                if (prevKey !== col.key) {
                    setSortDir("asc");
                    return col.key;
                }
                const next = nextSortDir(sortDir);
                setSortDir(next);
                if (!next) return null;
                return col.key;
            });
        },
        [sortable, sortDir]
    );

    const activePage = serverPagination ? currentPage : clientPage;
    const activeItemsPerPage = serverPagination ? itemsPerPage : pageSize;

    const totalTableWidth = useMemo(() => {
        const columnsWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
        return columnsWidth > 0 ? columnsWidth : "auto";
    }, [columnWidths]);

    useEffect(() => {
        const checkHorizontalScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollWidth, clientWidth } = scrollContainerRef.current;
                setHasHorizontalScroll(scrollWidth > clientWidth);
            }
        };
        checkHorizontalScroll();
        window.addEventListener("resize", checkHorizontalScroll);
        const timeoutId = setTimeout(checkHorizontalScroll, 100);
        return () => {
            window.removeEventListener("resize", checkHorizontalScroll);
            clearTimeout(timeoutId);
        };
    }, [data, columnWidths, totalTableWidth]);

    useEffect(() => {
        const initializeColumnWidths = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.offsetWidth - 2;
            const actionsWidth = actions?.length > 0 ? 120 : 0;
            const snoWidth = 50;
            const columnsWithExplicitWidth = columns.filter((col) => col.width && col.key !== "SNo");
            const columnsWithoutExplicitWidth = columns.filter((col) => !col.width && col.key !== "SNo");
            const explicitWidthTotal = columnsWithExplicitWidth.reduce((sum, col) => {
                const parsedWidth = parseInt(col.width);
                return sum + (isNaN(parsedWidth) ? 0 : parsedWidth);
            }, 0);
            const availableWidth = containerWidth - actionsWidth - snoWidth - explicitWidthTotal;
            const defaultWidth = Math.max(
                minColumnWidth,
                Math.floor(availableWidth / Math.max(1, columnsWithoutExplicitWidth.length))
            );
            let savedWidths = {};
            const savedWidthsStr = localStorage.getItem(`table-widths-${tableId}`);
            if (savedWidthsStr) {
                try { savedWidths = JSON.parse(savedWidthsStr); } catch (e) { console.error("Failed to parse saved column widths", e); }
            }
            const initialWidths = {};
            columns.forEach((col) => {
                if (col.key === "SNo") { initialWidths[col.key] = snoWidth; }
                else if (col.width) { const p = parseInt(col.width); initialWidths[col.key] = isNaN(p) ? defaultWidth : p; }
                else if (savedWidths[col.key]) { initialWidths[col.key] = savedWidths[col.key]; }
                else { initialWidths[col.key] = defaultWidth; }
            });
            if (actions?.length > 0) { initialWidths["__actions__"] = savedWidths["__actions__"] || actionsWidth; }
            setColumnWidths(initialWidths);
        };
        initializeColumnWidths();
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => { initializeColumnWidths(); }, 250);
        };
        window.addEventListener("resize", handleResize);
        return () => { window.removeEventListener("resize", handleResize); clearTimeout(resizeTimeout); };
    }, [columns, actions, tableId, minColumnWidth]);

    useEffect(() => {
        if (Object.keys(columnWidths).length > 0) {
            const widthsToSave = {};
            columns.forEach((col) => { if (!col.width && columnWidths[col.key]) { widthsToSave[col.key] = columnWidths[col.key]; } });
            if (columnWidths["__actions__"]) { widthsToSave["__actions__"] = columnWidths["__actions__"]; }
            localStorage.setItem(`table-widths-${tableId}`, JSON.stringify(widthsToSave));
        }
    }, [columnWidths, tableId, columns]);

    const handleResizeStart = useCallback((e, columnKey) => {
        e.preventDefault(); e.stopPropagation();
        setIsResizing(true); setResizingColumn(columnKey);
        setStartX(e.clientX); setStartWidth(columnWidths[columnKey] || 100);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, [columnWidths]);

    const handleResizeMove = useCallback((e) => {
        if (!isResizing || !resizingColumn) return;
        const diff = e.clientX - startX;
        const newWidth = Math.max(minColumnWidth, startWidth + diff);
        setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }));
    }, [isResizing, resizingColumn, startX, startWidth, minColumnWidth]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false); setResizingColumn(null);
        document.body.style.cursor = ""; document.body.style.userSelect = "";
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener("mousemove", handleResizeMove);
            document.addEventListener("mouseup", handleResizeEnd);
            return () => {
                document.removeEventListener("mousemove", handleResizeMove);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    const resetColumnWidths = useCallback(() => {
        localStorage.removeItem(`table-widths-${tableId}`);
        setColumnWidths({});
        setTimeout(() => { window.dispatchEvent(new Event("resize")); }, 0);
    }, [tableId]);

    const getAlignmentClass = (align) => {
        switch (align) {
            case "right": return "text-right";
            case "center": return "text-center";
            default: return "text-left";
        }
    };

    const getColumnWidthStyle = (columnKey) => {
        const width = columnWidths[columnKey];
        if (width) return { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };
        return {};
    };

    const getStickyActionStyles = (isHeader = false, isFooter = false) => {
        if (!stickyActions || !actions?.length) return {};
        return { position: "sticky", right: 0, zIndex: isHeader ? 30 : isFooter ? 30 : 10 };
    };

    const getRowBgClass = (rowIndex) => rowIndex % 2 === 0
        ? "bg-white dark:bg-[#1a1a1a]"
        : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";

    const getActionBgClass = (rowIndex) => rowIndex % 2 === 0
        ? "bg-white dark:bg-[#1a1a1a]"
        : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";

    const getActionHoverBg = () => "group-hover:bg-indigo-50/60 dark:group-hover:bg-[#252540]";

    // ── Filter ──────────────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (serverPagination || !staticSearchable || !searchQuery.trim()) return data;
        const query = searchQuery.toLowerCase();
        return data?.filter((row) =>
            columns.some((col) => {
                if (col.key === "SNo") return false;
                const value = row[col.key];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(query);
            })
        );
    }, [data, searchQuery, columns, serverPagination, staticSearchable]);

    // ── Sort (client-side only, skipped when serverPagination=true) ─────────
    const sortedData = useMemo(() => {
        if (serverPagination || !sortable || !sortKey || !sortDir) return filteredData;
        return [...(filteredData || [])].sort((a, b) =>
            compareValues(a[sortKey], b[sortKey], sortDir)
        );
    }, [filteredData, serverPagination, sortable, sortKey, sortDir]);

    const { paginatedData, clientTotalPages, clientTotalItems } = useMemo(() => {
        if (serverPagination) return { paginatedData: data, clientTotalPages: totalPages, clientTotalItems: totalItems };
        const total = sortedData?.length || 0;
        const pages = Math.ceil(total / pageSize);
        const startIdx = (clientPage - 1) * pageSize;
        const slicedData = sortedData?.slice(startIdx, startIdx + pageSize);
        return { paginatedData: slicedData, clientTotalPages: pages, clientTotalItems: total };
    }, [serverPagination, sortedData, clientPage, totalPages, totalItems, pageSize]);

    const displayData = paginatedData;
    const displayTotalPages = serverPagination ? totalPages : clientTotalPages;
    const displayTotalItems = serverPagination ? totalItems : clientTotalItems;
    const startIndex = (activePage - 1) * activeItemsPerPage;
    const endIndex = Math.min(startIndex + activeItemsPerPage, displayTotalItems);

    useEffect(() => {
        if (!serverPagination && clientPage > clientTotalPages && clientTotalPages > 0) setClientPage(1);
    }, [serverPagination, clientPage, clientTotalPages]);

    useEffect(() => {
        if (!serverPagination && searchQuery) setClientPage(1);
    }, [searchQuery, serverPagination]);

    // Reset to page 1 when sort changes
    useEffect(() => {
        if (!serverPagination) setClientPage(1);
    }, [sortKey, sortDir, serverPagination]);

    const handlePrevious = () => {
        if (activePage > 1) serverPagination ? onPageChange(activePage - 1) : setClientPage(activePage - 1);
    };
    const handleNext = () => {
        if (activePage < displayTotalPages) serverPagination ? onPageChange(activePage + 1) : setClientPage(activePage + 1);
    };
    const handlePageChange = (page) => serverPagination ? onPageChange(page) : setClientPage(page);
    const handleClearSearch = () => setSearchQuery("");

    const getColumnBorderClass = (index, totalColumns, hasActions = false) => {
        const isLastColumn = hasActions ? false : index === totalColumns - 1;
        return isLastColumn ? "" : "border-r border-gray-200/60 dark:border-gray-700/40";
    };

    // ── Group display data ──────────────────────────────────────────────────
    const groupedDisplayData = useMemo(() => {
        if (!groupBy || !displayData?.length) return null;
        const map = new Map();
        const order = [];
        displayData.forEach((row) => {
            const key = row[groupBy];
            if (!map.has(key)) { map.set(key, []); order.push(key); }
            map.get(key).push(row);
        });
        return order.map((key) => ({ groupKey: key, rows: map.get(key) }));
    }, [groupBy, displayData]);

    const ResizeHandle = ({ columnKey, isLast = false }) => (
        <div
            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize group hover:bg-indigo-400 
                ${resizingColumn === columnKey ? "bg-indigo-400" : "bg-transparent"} 
                ${isLast ? "hidden" : ""}`}
            style={{ transform: "translateX(50%)", zIndex: 10 }}
            onMouseDown={(e) => handleResizeStart(e, columnKey)}
        >
            <div className={`absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20
                ${resizingColumn === columnKey ? "bg-indigo-400/20" : ""}`} />
        </div>
    );

    const PaginationControls = () => {
        if (displayTotalItems <= 0 || displayTotalPages <= 1) return null;
        return (
            <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mr-2">
                    {startIndex + 1}-{endIndex} of {displayTotalItems}
                </div>
                <button
                    onClick={handlePrevious}
                    disabled={activePage === 1 || loading}
                    className="flex items-center gap-1 text-xs sm:text-sm px-1.5 py-1.5 rounded bg-[#4e2348] dark:bg-[#3a1a35] text-white hover:bg-[#5a2954] dark:hover:bg-[#4e2348] disabled:opacity-40 transition-colors duration-200"
                >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={activePage === displayTotalPages || loading}
                    className="flex items-center gap-1 text-xs sm:text-sm px-1.5 py-1.5 rounded bg-[#4e2348] dark:bg-[#3a1a35] text-white hover:bg-[#5a2954] dark:hover:bg-[#4e2348] disabled:opacity-40 transition-colors duration-200"
                >
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
            </div>
        );
    };

    // ── Grouped tbody renderer ─────────────────────────────────────────────
    const renderGroupedRows = () => {
        if (!groupedDisplayData?.length) return (
            <tr>
                <td
                    colSpan={filteredColumns.length + (actions?.length ? 1 : 0)}
                    className="text-center text-slate-400 dark:text-slate-500 py-12 bg-white dark:bg-[#1a1a1a]"
                >
                    <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm">
                            {loading ? "Loading..." : searchQuery ? "No matching results found" : "No data available"}
                        </span>
                    </div>
                </td>
            </tr>
        );

        const mergedSet = new Set(mergedColumns);
        const rows = [];

        groupedDisplayData.forEach(({ rows: groupRows }, groupIndex) => {
            const rowspan = groupRows.length;
            const stripeBg = groupIndex % 2 === 0
                ? "bg-white dark:bg-[#1a1a1a]"
                : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";
            const actionBg = groupIndex % 2 === 0
                ? "bg-white dark:bg-[#1a1a1a]"
                : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";

            groupRows.forEach((row, rowInGroup) => {
                const isFirst = rowInGroup === 0;
                const isLastInGroup = rowInGroup === groupRows.length - 1;

                const tds = filteredColumns.map((col, colIndex) => {
                    const isMerged = mergedSet.has(col.key);
                    if (isMerged && !isFirst) return null;

                    const cellStyle = isMerged
                        ? { ...getColumnWidthStyle(col.key), borderRight: "2px solid rgb(203 213 225 / 0.6)" }
                        : getColumnWidthStyle(col.key);

                    const mergedBorderClass = isMerged
                        ? "dark:[border-right:2px_solid_rgb(51_65_85_/_0.4)]"
                        : "";

                    const content = col.key === "SNo"
                        ? (startIndex + groupIndex + 1)
                        : renderCell
                            ? renderCell(col.key, row)
                            : (row[col.key] !== "" && row[col.key] !== null && row[col.key] !== undefined
                                ? row[col.key]
                                : "-");

                    return (
                        <td
                            key={col.key}
                            rowSpan={isMerged ? rowspan : 1}
                            style={cellStyle}
                            className={`
                                px-4 py-1 text-slate-700 dark:text-slate-200
                                ${col.key === "SNo" ? "font-medium text-slate-500 dark:text-slate-400" : ""}
                                ${getAlignmentClass(col.align || (col.key === "SNo" ? "center" : "left"))}
                                ${getColumnBorderClass(colIndex, filteredColumns.length, actions?.length > 0)}
                                ${mergedBorderClass}
                                ${isMerged ? stripeBg : ""}
                                ${isLastInGroup && !isMerged
                                    ? "border-b border-slate-200 dark:border-slate-700/50"
                                    : isMerged
                                        ? "border-b border-slate-200 dark:border-slate-700/50"
                                        : "border-b border-slate-100/70 dark:border-slate-700/20"
                                }
                            `}
                        >
                            {isMerged ? (
                                <div className={`text-sm ${col.key === "SNo" ? "" : "break-words"}`}>{content}</div>
                            ) : (
                                <div
                                    className="truncate text-sm"
                                    title={renderCell
                                        ? String(renderCell(col.key, row) || "")
                                        : (row[col.key] ?? "-")}
                                >
                                    {content}
                                </div>
                            )}
                        </td>
                    );
                });

                const actionTd = actions?.length > 0 && isFirst ? (
                    <td
                        key="__actions__"
                        rowSpan={rowspan}
                        className={`px-4 py-1 ${actionBg} ${getActionHoverBg()} transition-colors duration-150 border-b border-slate-200 dark:border-slate-700/50
                            ${hasHorizontalScroll && stickyActions
                                ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]"
                                : ""}`}
                        style={{ ...getColumnWidthStyle("__actions__"), ...getStickyActionStyles(false) }}
                    >
                        <div className="flex gap-3 justify-center">
                            {actions.map((action, idx) => (
                                <span key={idx}>
                                    <button
                                        title={action.tooltip || action.label}
                                        className={`${action.className || ""} border-none transition-transform duration-150 hover:scale-110`}
                                        onClick={(e) => { e.stopPropagation(); action.onClick(row); }}
                                        disabled={loading}
                                    >
                                        {action.icon || action.label}
                                    </button>
                                </span>
                            ))}
                        </div>
                    </td>
                ) : null;

                rows.push(
                    <tr
                        key={`${row[groupBy]}-${rowInGroup}`}
                        onDoubleClick={() => onRowClick?.(row)}
                        className={`cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-[#252540] transition-colors duration-150 group ${stripeBg}`}
                    >
                        {tds}
                        {actionTd}
                    </tr>
                );
            });
        });

        return rows;
    };

    // ── Sort tooltip label ─────────────────────────────────────────────────
    const getSortLabel = (col) => {
        if (!sortable || col.key === "SNo") return "";
        if (sortKey !== col.key) return "Click to sort";
        if (sortDir === "asc") return "Sorted ascending — click for descending";
        if (sortDir === "desc") return "Sorted descending — click to clear";
        return "Click to sort";
    };

    return (
        <>
            {/* HEADER SECTION */}
            <div className="mb-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {!serverPagination && staticSearchable && (
                    <div className="flex items-center gap-2 flex-1 w-full lg:w-auto">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search in table..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex h-8 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1e1e2a] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500 transition-all duration-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetColumnWidths}
                            className="text-xs whitespace-nowrap border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-[#252540]"
                            title="Reset column widths"
                        >
                            Reset Columns
                        </Button>
                        {searchQuery && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                Found {displayTotalItems} result{displayTotalItems !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                    <PaginationControls />
                </div>
            </div>

            <div className="w-full" ref={containerRef}>
                {loading && <Preloader />}

                {/* Mobile Card View */}
                <div className="block md:hidden">
                    <div className="overflow-visible">
                        {displayData?.length > 0 ? (
                            <div className="space-y-3 pb-4">
                                {displayData?.map((row, rowIndex) => (
                                    <div
                                        key={rowIndex}
                                        className="bg-white dark:bg-[#1e1e2a] border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm hover:shadow-md dark:shadow-black/20 dark:hover:shadow-black/40 transition-all duration-200"
                                    >
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                                            #{startIndex + rowIndex + 1}
                                        </div>
                                        <div className="space-y-2">
                                            {filteredColumns.filter((col) => col.key !== "SNo").map((col) => (
                                                <div key={col.key} className="flex gap-1 sm:flex-row sm:justify-between">
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 sm:mb-0">
                                                        <strong>{col.label}: </strong>
                                                    </span>
                                                    <span className={`text-sm text-slate-800 dark:text-slate-200 break-words ${getAlignmentClass(col.align)}`}>
                                                        {renderCell
                                                            ? renderCell(col.key, row)
                                                            : (row[col.key] !== "" && row[col.key] !== null && row[col.key] !== undefined
                                                                ? row[col.key]
                                                                : "-")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {actions?.length > 0 && (
                                            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/40">
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {actions.map((action, idx) => (
                                                        <span key={idx}>
                                                            <Button
                                                                title={action.tooltip || action.label}
                                                                size="sm"
                                                                variant={action.variant || "outline"}
                                                                className={`${action.className || ""} border-none`}
                                                                onClick={() => action.onClick(row)}
                                                                disabled={loading}
                                                            >
                                                                {action.icon || action.label}
                                                            </Button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {footerData && (
                                    <div className="bg-slate-50 dark:bg-[#252540] border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 font-semibold">
                                        {filteredColumns.filter((col) => col.key !== "SNo" && footerData[col.key]).map((col) => (
                                            <div key={col.key} className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-300">{footerData.label || col.label}:</span>
                                                <span className="text-slate-900 dark:text-slate-100">{footerData[col.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-8 bg-white dark:bg-[#1e1e2a] border border-slate-200 dark:border-slate-700/50 rounded-xl">
                                {searchQuery ? "No matching results found" : "No data available"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <div
                        ref={scrollContainerRef}
                        className="border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-black/20 overflow-auto"
                        style={{ maxHeight }}
                    >
                        <table
                            ref={tableRef}
                            className="w-full"
                            style={{
                                tableLayout: "fixed",
                                minWidth: typeof totalTableWidth === "number" ? `${totalTableWidth}px` : "max-content",
                            }}
                        >
                            <colgroup>
                                {filteredColumns.map((col) => (
                                    <col key={col.key} style={getColumnWidthStyle(col.key)} />
                                ))}
                                {actions?.length > 0 && <col style={getColumnWidthStyle("__actions__")} />}
                            </colgroup>

                            {/* HEADER */}
                            <thead className="bg-gradient-to-r from-[#4e2348] to-[#3b1a36] dark:from-[#3a1a35] dark:to-[#2a1226] sticky top-0 z-20">
                                <tr>
                                    {filteredColumns.map((col, colIndex) => {
                                        const isSortableCol = sortable && col.key !== "SNo";
                                        return (
                                            <th
                                                key={col.key}
                                                style={getColumnWidthStyle(col.key)}
                                                title={getSortLabel(col)}
                                                onClick={() => handleHeaderClick(col)}
                                                className={`relative font-semibold whitespace-nowrap px-4 py-2 border-b border-slate-600/30 dark:border-slate-600/20 text-white/90 dark:text-slate-200 text-[13px] tracking-wide
                                                    ${getAlignmentClass(col.align || "left")}
                                                    ${colIndex !== filteredColumns.length - 1 || actions?.length > 0
                                                        ? "border-r border-r-slate-600/20 dark:border-r-slate-600/15"
                                                        : ""}
                                                    ${isSortableCol ? "cursor-pointer select-none hover:bg-white/10 transition-colors duration-150" : ""}`}
                                            >
                                                <div className="flex items-center justify-between gap-2 pr-2">
                                                    <span className="truncate capitalize">{col.label}</span>
                                                    {isSortableCol && (
                                                        <SortIcon
                                                            columnKey={col.key}
                                                            sortKey={sortKey}
                                                            sortDir={sortDir}
                                                        />
                                                    )}
                                                </div>
                                                <ResizeHandle
                                                    columnKey={col.key}
                                                    isLast={colIndex === filteredColumns.length - 1 && !actions?.length}
                                                />
                                            </th>
                                        );
                                    })}
                                    {actions?.length > 0 && (
                                        <th
                                            className={`relative whitespace-nowrap text-center px-4 py-2 border-b border-[#4e2348]/30 dark:border-[#4e2348]/20 text-white/90 dark:text-white text-[13px] tracking-wide capitalize bg-gradient-to-r from-[#4e2348] to-[#3b1a36] dark:from-[#3a1a35] dark:to-[#2a1226]
                                                ${hasHorizontalScroll && stickyActions
                                                    ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.5)]"
                                                    : ""}`}
                                            style={{ ...getColumnWidthStyle("__actions__"), ...getStickyActionStyles(true) }}
                                        >
                                            {t("actions")}
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody>
                                {groupBy && groupedDisplayData
                                    ? renderGroupedRows()
                                    : displayData?.length > 0
                                        ? displayData.map((row, rowIndex) => (
                                            <tr
                                                onDoubleClick={() => onRowClick?.(row)}
                                                key={rowIndex}
                                                className={`cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-[#252540] border-b border-slate-100 dark:border-slate-700/30 transition-colors duration-150 group ${getRowBgClass(rowIndex)}`}
                                            >
                                                {filteredColumns.map((col, colIndex) => {
                                                    if (col.key === "SNo") {
                                                        return (
                                                            <td
                                                                key={col.key}
                                                                style={getColumnWidthStyle(col.key)}
                                                                className={`whitespace-nowrap px-4 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 ${getAlignmentClass(col.align || "right")} ${getColumnBorderClass(colIndex, filteredColumns.length, actions?.length > 0)}`}
                                                            >
                                                                {startIndex + rowIndex + 1}
                                                            </td>
                                                        );
                                                    }
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            style={getColumnWidthStyle(col.key)}
                                                            className={`px-4 py-1 text-slate-700 dark:text-slate-200 ${getAlignmentClass(col.align || "left")} ${getColumnBorderClass(colIndex, filteredColumns.length, actions?.length > 0)}`}
                                                        >
                                                            <div
                                                                className="truncate text-sm"
                                                                title={renderCell ? String(renderCell(col.key, row) || "") : (row[col.key] ?? "-")}
                                                            >
                                                                {renderCell
                                                                    ? renderCell(col.key, row)
                                                                    : (row[col.key] !== "" && row[col.key] !== null && row[col.key] !== undefined
                                                                        ? row[col.key]
                                                                        : "-")}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                {actions?.length > 0 && (
                                                    <td
                                                        className={`px-4 py-1 ${getActionBgClass(rowIndex)} ${getActionHoverBg()} transition-colors duration-150
                                                            ${hasHorizontalScroll && stickyActions
                                                                ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]"
                                                                : ""}`}
                                                        style={{ ...getColumnWidthStyle("__actions__"), ...getStickyActionStyles(false) }}
                                                    >
                                                        <div className="flex gap-3 justify-center">
                                                            {actions.map((action, idx) => (
                                                                <span key={idx}>
                                                                    <button
                                                                        title={action.tooltip || action.label}
                                                                        className={`${action.className || ""} border-none transition-transform duration-150 hover:scale-110`}
                                                                        onClick={(e) => { e.stopPropagation(); action.onClick(row); }}
                                                                        disabled={loading}
                                                                    >
                                                                        {action.icon || action.label}
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                        : (
                                            <tr>
                                                <td
                                                    colSpan={filteredColumns.length + (actions?.length ? 1 : 0)}
                                                    className="text-center text-slate-400 dark:text-slate-500 py-12 bg-white dark:bg-[#1a1a1a]"
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                                        <span className="text-sm">
                                                            {loading ? "Loading..." : searchQuery ? "No matching results found" : "No data available"}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                }
                            </tbody>

                            {/* FOOTER */}
                            {footerData && displayData?.length > 0 && (
                                <tfoot
                                    className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1e1e2a] dark:to-[#1a1a2e] border-t-2 border-slate-300 dark:border-slate-600/50"
                                    style={{ position: "sticky", bottom: 0, zIndex: 15 }}
                                >
                                    <tr style={{ position: "sticky", bottom: 0 }}>
                                        {filteredColumns.map((col, colIndex) => (
                                            <td
                                                key={col.key}
                                                style={{
                                                    ...getColumnWidthStyle(col.key),
                                                    position: "sticky",
                                                    bottom: 0,
                                                    background: "inherit",
                                                    zIndex: 1,
                                                }}
                                                className={`px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 ${getAlignmentClass(col.align || "left")} ${getColumnBorderClass(colIndex, filteredColumns.length, actions?.length > 0)}`}
                                            >
                                                {footerData[col.key] || ""}
                                            </td>
                                        ))}
                                        {actions?.length > 0 && (
                                            <td
                                                className={`bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1e1e2a] dark:to-[#1a1a2e]
                                                    ${hasHorizontalScroll && stickyActions
                                                        ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.4)]"
                                                        : ""}`}
                                                style={{
                                                    ...getColumnWidthStyle("__actions__"),
                                                    ...getStickyActionStyles(false, true),
                                                    position: "sticky",
                                                    right: 0,
                                                    bottom: 0,
                                                    background: "inherit",
                                                    zIndex: 1,
                                                }}
                                            />
                                        )}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            {isResizing && (
                <style>{`* { cursor: col-resize !important; user-select: none !important; }`}</style>
            )}
        </>
    );
};

ContentTable.propTypes = {
    onRowClick: PropTypes.func,
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        align: PropTypes.oneOf(["left", "center", "right"]),
        sortable: PropTypes.bool,
        width: PropTypes.string,
    })).isRequired,
    data: PropTypes.array,
    actions: PropTypes.array,
    renderCell: PropTypes.func,
    currentPage: PropTypes.number,
    totalItems: PropTypes.number,
    totalPages: PropTypes.number,
    onPageChange: PropTypes.func,
    loading: PropTypes.bool,
    serverPagination: PropTypes.bool,
    staticSearchable: PropTypes.bool,
    footerData: PropTypes.object,
    minColumnWidth: PropTypes.number,
    tableId: PropTypes.string,
    stickyActions: PropTypes.bool,
    pageSize: PropTypes.number,
    autoFocusSearch: PropTypes.bool,
    // Sorting
    sortable: PropTypes.bool,
    // Grouping
    groupBy: PropTypes.string,
    mergedColumns: PropTypes.arrayOf(PropTypes.string),
};

export default ContentTable;