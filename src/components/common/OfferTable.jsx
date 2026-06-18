// src/components/common/OfferTable.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const OfferTable = ({
    columns,
    data,
    onDataChange,
    onAddRow,
    onDeleteRow,
    renderEditCell,
    footerData = null,
    minColumnWidth = 60,
    tableId = "offer-table",
    maxHeight = "60vh",
    showAddRow = true,
    showDeleteAction = true,
    showSearch = true,
    pageSize = 50,
    loading = false,
    readOnly = false,
    onCellChange,
    stickyActions = true,
}) => {
    const { t } = useTranslation();
    const containerRef = useRef(null);
    const tableRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
    const [columnWidths, setColumnWidths] = useState({});
    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);
    const [activeCell, setActiveCell] = useState({ row: null, col: null });
    const [searchQuery, setSearchQuery] = useState("");
    const [clientPage, setClientPage] = useState(1);

    // Calculate total table width
    const totalTableWidth = useMemo(() => {
        const columnsWidth = Object.values(columnWidths).reduce(
            (sum, width) => sum + width,
            0
        );
        return columnsWidth > 0 ? columnsWidth : "auto";
    }, [columnWidths]);

    // Check for horizontal scroll
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

    // Initialize column widths
    useEffect(() => {
        const initializeColumnWidths = () => {
            if (!containerRef.current) return;

            const containerWidth = containerRef.current.offsetWidth - 2;
            const actionsWidth = showDeleteAction ? 80 : 0;
            const snoWidth = 50;

            const columnsWithExplicitWidth = columns.filter(
                (col) => col.width && col.key !== "SNo"
            );
            const columnsWithoutExplicitWidth = columns.filter(
                (col) => !col.width && col.key !== "SNo"
            );

            const explicitWidthTotal = columnsWithExplicitWidth.reduce(
                (sum, col) => {
                    const parsedWidth = parseInt(col.width);
                    return sum + (isNaN(parsedWidth) ? 0 : parsedWidth);
                },
                0
            );

            const availableWidth =
                containerWidth - actionsWidth - snoWidth - explicitWidthTotal;
            const defaultWidth = Math.max(
                minColumnWidth,
                Math.floor(
                    availableWidth /
                    Math.max(1, columnsWithoutExplicitWidth.length)
                )
            );

            let savedWidths = {};
            const savedWidthsStr = localStorage.getItem(`table-widths-${tableId}`);
            if (savedWidthsStr) {
                try {
                    savedWidths = JSON.parse(savedWidthsStr);
                } catch (e) {
                    console.error("Failed to parse saved column widths", e);
                }
            }

            const initialWidths = {};
            columns.forEach((col) => {
                if (col.key === "SNo") {
                    initialWidths[col.key] = snoWidth;
                } else if (col.width) {
                    const parsedWidth = parseInt(col.width);
                    initialWidths[col.key] = isNaN(parsedWidth) ? defaultWidth : parsedWidth;
                } else if (savedWidths[col.key]) {
                    initialWidths[col.key] = savedWidths[col.key];
                } else {
                    initialWidths[col.key] = defaultWidth;
                }
            });

            if (showDeleteAction) {
                initialWidths["__actions__"] = savedWidths["__actions__"] || actionsWidth;
            }

            setColumnWidths(initialWidths);
        };

        initializeColumnWidths();

        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initializeColumnWidths();
            }, 250);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(resizeTimeout);
        };
    }, [columns, showDeleteAction, tableId, minColumnWidth]);

    // Save column widths
    useEffect(() => {
        if (Object.keys(columnWidths).length > 0) {
            const widthsToSave = {};
            columns.forEach((col) => {
                if (!col.width && columnWidths[col.key]) {
                    widthsToSave[col.key] = columnWidths[col.key];
                }
            });
            if (columnWidths["__actions__"]) {
                widthsToSave["__actions__"] = columnWidths["__actions__"];
            }
            localStorage.setItem(`table-widths-${tableId}`, JSON.stringify(widthsToSave));
        }
    }, [columnWidths, tableId, columns]);

    // Resize handlers
    const handleResizeStart = useCallback(
        (e, columnKey) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
            setResizingColumn(columnKey);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnKey] || 100);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [columnWidths]
    );

    const handleResizeMove = useCallback(
        (e) => {
            if (!isResizing || !resizingColumn) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(minColumnWidth, startWidth + diff);
            setColumnWidths((prev) => ({
                ...prev,
                [resizingColumn]: newWidth,
            }));
        },
        [isResizing, resizingColumn, startX, startWidth, minColumnWidth]
    );

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        setResizingColumn(null);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
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
        setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
        }, 0);
    }, [tableId]);

    // Navigation with Tab/Enter between cells
    const handleCellKeyDown = useCallback(
        (e, rowIndex, colIndex) => {
            const editableColumns = columns.filter((col) => col.key !== "SNo" && col.editable !== false);

            if (e.key === "Tab" || e.key === "Enter") {
                e.preventDefault();

                let nextRow = rowIndex;
                let nextColIdx = colIndex;

                if (e.shiftKey) {
                    // Move backward
                    nextColIdx--;
                    if (nextColIdx < 0) {
                        nextRow--;
                        nextColIdx = editableColumns.length - 1;
                    }
                } else {
                    // Move forward
                    nextColIdx++;
                    if (nextColIdx >= editableColumns.length) {
                        nextRow++;
                        nextColIdx = 0;
                    }
                }

                // If we've gone past the last row, add a new row
                if (nextRow >= data.length && !e.shiftKey && showAddRow && !readOnly) {
                    onAddRow?.();
                    setTimeout(() => {
                        setActiveCell({ row: nextRow, col: editableColumns[0]?.key });
                    }, 100);
                    return;
                }

                if (nextRow >= 0 && nextRow < data.length) {
                    const nextColKey = editableColumns[nextColIdx]?.key;
                    if (nextColKey) {
                        setActiveCell({ row: nextRow, col: nextColKey });
                    }
                }
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (rowIndex < data.length - 1) {
                    setActiveCell({ row: rowIndex + 1, col: activeCell.col });
                }
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (rowIndex > 0) {
                    setActiveCell({ row: rowIndex - 1, col: activeCell.col });
                }
            }
        },
        [columns, data, activeCell, showAddRow, readOnly, onAddRow]
    );

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!showSearch || !searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase();
        return data?.filter((row) => {
            return columns.some((col) => {
                if (col.key === "SNo") return false;
                const value = row[col.key];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, searchQuery, columns, showSearch]);

    // Pagination
    const { paginatedData, totalPages, totalItems } = useMemo(() => {
        const total = filteredData?.length || 0;
        const pages = Math.ceil(total / pageSize);
        const startIdx = (clientPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const slicedData = filteredData?.slice(startIdx, endIdx);

        return {
            paginatedData: slicedData,
            totalPages: pages,
            totalItems: total,
        };
    }, [filteredData, clientPage, pageSize]);

    const startIndex = (clientPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    useEffect(() => {
        if (clientPage > totalPages && totalPages > 0) {
            setClientPage(1);
        }
    }, [clientPage, totalPages]);

    useEffect(() => {
        if (searchQuery) setClientPage(1);
    }, [searchQuery]);

    // Helper functions
    const getAlignmentClass = (align) => {
        switch (align) {
            case "right": return "text-right";
            case "center": return "text-center";
            default: return "text-left";
        }
    };

    const getColumnWidthStyle = (columnKey) => {
        const width = columnWidths[columnKey];
        if (width) {
            return {
                width: `${width}px`,
                minWidth: `${width}px`,
                maxWidth: `${width}px`,
            };
        }
        return {};
    };

    const getStickyActionStyles = (isHeader = false) => {
        if (!stickyActions || !showDeleteAction) return {};
        return {
            position: "sticky",
            right: 0,
            zIndex: isHeader ? 30 : 10,
        };
    };

    const getRowBgClass = (rowIndex) => {
        return rowIndex % 2 === 0
            ? "bg-white dark:bg-[#1a1a1a]"
            : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";
    };

    const getActionBgClass = (rowIndex) => {
        return rowIndex % 2 === 0
            ? "bg-white dark:bg-[#1a1a1a]"
            : "bg-[#f8f9fc] dark:bg-[#1e1e2a]";
    };

    const getColumnBorderClass = (index, totalColumns, hasActions = false) => {
        const isLastColumn = hasActions ? false : index === totalColumns - 1;
        return isLastColumn ? "" : "border-r border-gray-200/60 dark:border-gray-700/40";
    };

    // Default cell renderer for editable cells
    const defaultEditCellRenderer = (col, row, rowIndex) => {
        const isActive = activeCell.row === rowIndex && activeCell.col === col.key;
        const value = row[col.key] ?? "";

        if (col.editable === false || readOnly) {
            return (
                <div className="truncate text-sm px-1 py-0.5 text-slate-700 dark:text-slate-200">
                    {value !== "" && value !== null && value !== undefined ? value : "-"}
                </div>
            );
        }

        if (col.type === "select") {
            return (
                <select
                    value={value}
                    onChange={(e) => onCellChange?.(rowIndex, col.key, e.target.value)}
                    onFocus={() => setActiveCell({ row: rowIndex, col: col.key })}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, columns.filter(c => c.key !== "SNo" && c.editable !== false).indexOf(col))}
                    className={`w-full text-sm px-1.5 py-1 rounded border bg-transparent focus:outline-none transition-all duration-150
                        ${isActive
                            ? "border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30 dark:ring-indigo-500/30 bg-white dark:bg-[#242424]"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                >
                    <option value="">Select...</option>
                    {col.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        if (col.type === "date") {
            return (
                <input
                    type="date"
                    value={value}
                    onChange={(e) => onCellChange?.(rowIndex, col.key, e.target.value)}
                    onFocus={() => setActiveCell({ row: rowIndex, col: col.key })}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, columns.filter(c => c.key !== "SNo" && c.editable !== false).indexOf(col))}
                    className={`w-full text-sm px-1.5 py-1 rounded border bg-transparent focus:outline-none transition-all duration-150
                        ${isActive
                            ? "border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30 dark:ring-indigo-500/30 bg-white dark:bg-[#242424]"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                />
            );
        }

        return (
            <input
                type={col.type === "number" ? "number" : "text"}
                step={col.type === "number" ? col.step || "any" : undefined}
                value={value}
                onChange={(e) => onCellChange?.(rowIndex, col.key, e.target.value)}
                onFocus={() => setActiveCell({ row: rowIndex, col: col.key })}
                onBlur={() => {
                    // Keep activeCell for styling but allow blur
                }}
                onKeyDown={(e) => handleCellKeyDown(e, rowIndex, columns.filter(c => c.key !== "SNo" && c.editable !== false).indexOf(col))}
                placeholder={col.placeholder || ""}
                autoFocus={isActive}
                className={`w-full text-sm px-1.5 py-1 rounded border bg-transparent focus:outline-none transition-all duration-150
                    ${isActive
                        ? "border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30 dark:ring-indigo-500/30 bg-white dark:bg-[#242424]"
                        : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }
                    ${col.type === "number" ? "text-right" : ""}
                    text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500`}
            />
        );
    };

    // Resize handle
    const ResizeHandle = ({ columnKey, isLast = false }) => (
        <div
            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize group hover:bg-indigo-400 
                ${resizingColumn === columnKey ? "bg-indigo-400" : "bg-transparent"} 
                ${isLast ? "hidden" : ""}`}
            style={{ transform: "translateX(50%)", zIndex: 10 }}
            onMouseDown={(e) => handleResizeStart(e, columnKey)}
        >
            <div
                className={`absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20
                    ${resizingColumn === columnKey ? "bg-indigo-400/20" : ""}`}
            />
        </div>
    );

    // Pagination controls
    const PaginationControls = () => {
        if (totalItems <= 0 || totalPages <= 1) return null;

        return (
            <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mr-2">
                    {startIndex + 1}-{endIndex} of {totalItems}
                </div>
                <button
                    onClick={() => clientPage > 1 && setClientPage(clientPage - 1)}
                    disabled={clientPage === 1 || loading}
                    className="flex items-center text-xs px-1.5 py-1.5 rounded bg-[#4e2348] dark:bg-[#3a1a35] text-white hover:bg-[#5a2954] dark:hover:bg-[#4e2348] disabled:opacity-40 transition-colors duration-200"
                >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                    onClick={() => clientPage < totalPages && setClientPage(clientPage + 1)}
                    disabled={clientPage === totalPages || loading}
                    className="flex items-center text-xs px-1.5 py-1.5 rounded bg-[#4e2348] dark:bg-[#3a1a35] text-white hover:bg-[#5a2954] dark:hover:bg-[#4e2348] disabled:opacity-40 transition-colors duration-200"
                >
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
            </div>
        );
    };

    return (
        <>
            {/* Header - Search, Add Row, Pagination */}
            <div className="mb-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 w-full lg:w-auto">
                    {showSearch && (
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search in table..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex h-8 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1e1e2a] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500 transition-all duration-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {showAddRow && !readOnly && (
                        <button
                            type="button"
                            onClick={() => onAddRow?.()}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-200 whitespace-nowrap"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Row
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={resetColumnWidths}
                        className="text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-[#252540] text-slate-600 dark:text-slate-400 transition-colors whitespace-nowrap"
                        title="Reset column widths"
                    >
                        Reset Columns
                    </button>

                    {searchQuery && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            Found {totalItems} result{totalItems !== 1 ? "s" : ""}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                    <PaginationControls />
                </div>
            </div>

            <div className="w-full" ref={containerRef}>
                {/* Mobile Card View */}
                <div className="block md:hidden">
                    <div className="overflow-visible">
                        {paginatedData?.length > 0 ? (
                            <div className="space-y-3 pb-4">
                                {paginatedData.map((row, rowIndex) => {
                                    const actualIndex = startIndex + rowIndex;
                                    return (
                                        <div
                                            key={rowIndex}
                                            className="bg-white dark:bg-[#1e1e2a] border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm"
                                        >
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                                                #{actualIndex + 1}
                                            </div>
                                            <div className="space-y-2">
                                                {columns.filter((col) => col.key !== "SNo").map((col) => (
                                                    <div key={col.key} className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                            {col.label}
                                                        </span>
                                                        <div>
                                                            {renderEditCell
                                                                ? renderEditCell(col, row, actualIndex)
                                                                : defaultEditCellRenderer(col, row, actualIndex)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {showDeleteAction && !readOnly && (
                                                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/40 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteRow?.(actualIndex)}
                                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-8 bg-white dark:bg-[#1e1e2a] border border-slate-200 dark:border-slate-700/50 rounded-xl">
                                {searchQuery ? "No matching results found" : "No data available. Click 'Add Row' to start."}
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <div
                        ref={scrollContainerRef}
                        className="border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm dark:shadow-black/20 overflow-auto"
                        style={{ maxHeight }}
                    >
                        <table
                            ref={tableRef}
                            className="w-full"
                            style={{
                                tableLayout: "fixed",
                                minWidth:
                                    typeof totalTableWidth === "number"
                                        ? `${totalTableWidth}px`
                                        : "max-content",
                            }}
                        >
                            <colgroup>
                                {columns.map((col) => (
                                    <col key={col.key} style={getColumnWidthStyle(col.key)} />
                                ))}
                                {showDeleteAction && (
                                    <col style={getColumnWidthStyle("__actions__")} />
                                )}
                            </colgroup>

                            {/* Header */}
                            <thead className="bg-gradient-to-r from-[#4e2348] to-[#3b1a36] dark:from-[#3a1a35] dark:to-[#2a1226] sticky top-0 z-20">
                                <tr>
                                    {columns.map((col, colIndex) => (
                                        <th
                                            key={col.key}
                                            style={getColumnWidthStyle(col.key)}
                                            className={`relative font-semibold whitespace-nowrap px-3 py-2 border-b border-slate-600/30 dark:border-slate-600/20 text-white/90 dark:text-slate-200 text-[12px] tracking-wide ${getAlignmentClass(col.align || "left")} ${colIndex !== columns.length - 1 || showDeleteAction ? "border-r border-r-slate-600/20 dark:border-r-slate-600/15" : ""}`}
                                        >
                                            <div className="flex items-center justify-between gap-1 pr-2">
                                                <span className="truncate capitalize">{col.label}</span>
                                                {col.required && (
                                                    <span className="text-red-300 text-[10px]">*</span>
                                                )}
                                            </div>
                                            <ResizeHandle
                                                columnKey={col.key}
                                                isLast={colIndex === columns.length - 1 && !showDeleteAction}
                                            />
                                        </th>
                                    ))}
                                    {showDeleteAction && (
                                        <th
                                            className={`relative whitespace-nowrap text-center px-3 py-2 border-b border-[#4e2348]/30 dark:border-[#4e2348]/20 text-white/90 dark:text-white text-[12px] tracking-wide capitalize bg-gradient-to-r from-[#4e2348] to-[#3b1a36] dark:from-[#3a1a35] dark:to-[#2a1226] ${hasHorizontalScroll && stickyActions ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.5)]" : ""}`}
                                            style={{
                                                ...getColumnWidthStyle("__actions__"),
                                                ...getStickyActionStyles(true),
                                            }}
                                        >
                                            {t("actions")}
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            {/* Body */}
                            <tbody>
                                {paginatedData?.length > 0 ? (
                                    paginatedData.map((row, rowIndex) => {
                                        const actualIndex = startIndex + rowIndex;
                                        return (
                                            <tr
                                                key={rowIndex}
                                                className={`border-b border-slate-100 dark:border-slate-700/30 transition-colors duration-150 group ${getRowBgClass(rowIndex)} hover:bg-indigo-50/40 dark:hover:bg-[#252540]`}
                                            >
                                                {columns.map((col, colIndex) => {
                                                    if (col.key === "SNo") {
                                                        return (
                                                            <td
                                                                key={col.key}
                                                                style={getColumnWidthStyle(col.key)}
                                                                className={`whitespace-nowrap px-3 py-0.5 text-sm font-medium text-slate-500 dark:text-slate-400 text-center ${getColumnBorderClass(colIndex, columns.length, showDeleteAction)}`}
                                                            >
                                                                {actualIndex + 1}
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td
                                                            key={col.key}
                                                            style={getColumnWidthStyle(col.key)}
                                                            className={`px-1 py-0.5 ${getAlignmentClass(col.align || "left")} ${getColumnBorderClass(colIndex, columns.length, showDeleteAction)}`}
                                                            onClick={() => {
                                                                if (col.editable !== false && !readOnly) {
                                                                    setActiveCell({ row: actualIndex, col: col.key });
                                                                }
                                                            }}
                                                        >
                                                            {renderEditCell
                                                                ? renderEditCell(col, row, actualIndex, activeCell, setActiveCell, handleCellKeyDown)
                                                                : defaultEditCellRenderer(col, row, actualIndex)}
                                                        </td>
                                                    );
                                                })}

                                                {/* Delete action */}
                                                {showDeleteAction && (
                                                    <td
                                                        className={`px-3 py-0.5 text-center ${getActionBgClass(rowIndex)} group-hover:bg-indigo-50/60 dark:group-hover:bg-[#252540] transition-colors duration-150 ${hasHorizontalScroll && stickyActions ? "shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]" : ""}`}
                                                        style={{
                                                            ...getColumnWidthStyle("__actions__"),
                                                            ...getStickyActionStyles(false),
                                                        }}
                                                    >
                                                        {!readOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onDeleteRow?.(actualIndex)}
                                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-150 hover:scale-110 p-0.5"
                                                                title="Delete Row"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={columns.length + (showDeleteAction ? 1 : 0)}
                                            className="text-center text-slate-400 dark:text-slate-500 py-12 bg-white dark:bg-[#1a1a1a]"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                                <span className="text-sm">
                                                    {loading
                                                        ? "Loading..."
                                                        : searchQuery
                                                            ? "No matching results found"
                                                            : "No data available. Click 'Add Row' to start."}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* Footer */}
                            {footerData && paginatedData?.length > 0 && (
                                <tfoot className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1e1e2a] dark:to-[#1a1a2e] border-t-2 border-slate-300 dark:border-slate-600/50 sticky bottom-0">
                                    <tr>
                                        {columns.map((col, colIndex) => (
                                            <td
                                                key={col.key}
                                                style={getColumnWidthStyle(col.key)}
                                                className={`px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 ${getAlignmentClass(col.align || "left")} ${getColumnBorderClass(colIndex, columns.length, showDeleteAction)}`}
                                            >
                                                {footerData[col.key] || ""}
                                            </td>
                                        ))}
                                        {showDeleteAction && (
                                            <td
                                                className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1e1e2a] dark:to-[#1a1a2e]"
                                                style={{
                                                    ...getColumnWidthStyle("__actions__"),
                                                    ...getStickyActionStyles(false),
                                                }}
                                            ></td>
                                        )}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            {isResizing && (
                <style>{`
                    * {
                        cursor: col-resize !important;
                        user-select: none !important;
                    }
                `}</style>
            )}
        </>
    );
};

OfferTable.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            align: PropTypes.oneOf(["left", "center", "right"]),
            width: PropTypes.string,
            editable: PropTypes.bool,
            type: PropTypes.oneOf(["text", "number", "date", "select"]),
            options: PropTypes.arrayOf(
                PropTypes.shape({
                    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                    label: PropTypes.string,
                })
            ),
            required: PropTypes.bool,
            placeholder: PropTypes.string,
            step: PropTypes.string,
        })
    ).isRequired,
    data: PropTypes.array.isRequired,
    onDataChange: PropTypes.func,
    onAddRow: PropTypes.func,
    onDeleteRow: PropTypes.func,
    renderEditCell: PropTypes.func,
    footerData: PropTypes.object,
    minColumnWidth: PropTypes.number,
    tableId: PropTypes.string,
    maxHeight: PropTypes.string,
    showAddRow: PropTypes.bool,
    showDeleteAction: PropTypes.bool,
    showSearch: PropTypes.bool,
    pageSize: PropTypes.number,
    loading: PropTypes.bool,
    readOnly: PropTypes.bool,
    onCellChange: PropTypes.func,
    stickyActions: PropTypes.bool,
};

export default OfferTable;