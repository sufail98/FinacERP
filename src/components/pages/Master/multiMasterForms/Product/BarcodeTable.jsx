import { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle, Undo2, X } from "lucide-react";
import NormalSelectInput from "@/components/elements/theme/NormalSelectInput";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";

const BarcodeTable = ({
    units = [],
    onDataChange,
    baseUnitId,
    onSelectedUnitsChange,
    initialData = [{ id: 1, unit: '', conversion: 1, barcode: '' }],
    viewMode = false
}) => {
    const { t } = useTranslation();
    const [barcodeRows, setBarcodeRows] = useState(initialData);
    const [validationErrors, setValidationErrors] = useState({});
    const [deletedRow, setDeletedRow] = useState(null);
    const [undoTimer, setUndoTimer] = useState(null);
    const { generalSettings } = useSelector(state => state.settings);

    useEffect(() => {
        setBarcodeRows(initialData);
        validateUnitConversions(initialData);
    }, [initialData]);

    useEffect(() => {
        return () => {
            if (undoTimer) {
                clearTimeout(undoTimer);
            }
        };
    }, [undoTimer]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                if (deletedRow && !viewMode) {
                    event.preventDefault();
                    undoDeleteRow();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [deletedRow, viewMode]);

    const validateUnitConversions = (rows) => {
        const unitConversions = {};
        const errors = {};

        rows.forEach(row => {
            if (row.unit && row.conversion) {
                if (!unitConversions[row.unit]) {
                    unitConversions[row.unit] = row.conversion;
                } else if (unitConversions[row.unit] !== row.conversion) {
                    errors[row.id] = `Unit already has conversion: ${unitConversions[row.unit]}`;
                }
            }
        });

        Object.keys(unitConversions).forEach(unitId => {
            const conflictingRows = rows.filter(row =>
                row.unit === unitId &&
                row.conversion &&
                row.conversion !== unitConversions[unitId]
            );

            conflictingRows.forEach(row => {
                errors[row.id] = `Unit already has conversion: ${unitConversions[unitId]}`;
            });
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getExistingConversion = (unitId, excludeRowId = null) => {
        const existingRow = barcodeRows.find(row =>
            row.unit === unitId &&
            row.conversion &&
            row.id !== excludeRowId
        );
        return existingRow ? existingRow.conversion : null;
    };

    const hasRowData = (row) => {
        return row.unit || row.conversion || row.barcode;
    };

    const sanitizeConversionInput = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') return String(value);

        return value.replace(/[^\d]/g, '');
    };

    const shouldAddNewRow = (updatedRows) => {
        const lastRow = updatedRows[updatedRows.length - 1];
        return hasRowData(lastRow);
    };

    const handleBarcodeChange = (id, field, value) => {
        let newValue = value;

        if (field === "barcode") {
            newValue = value.replace(/[\\/:*?"<>|]/g, "");
        }

        if (field === "conversion") {
            newValue = sanitizeConversionInput(value);
        }

        let updatedRows = barcodeRows.map((row) => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: newValue };

                if (field === 'unit' && newValue) {
                    const existingConversion = getExistingConversion(newValue, id);
                    if (existingConversion) {
                        updatedRow.conversion = existingConversion;
                    }
                }

                if (field === 'unit' && row.conversion) {
                    const existingConversion = getExistingConversion(newValue, id);
                    if (existingConversion && existingConversion !== row.conversion) {
                        updatedRow.conversion = existingConversion;
                    }
                }

                return updatedRow;
            }
            return row;
        });

        const isValid = validateUnitConversions(updatedRows);

        if (field === 'conversion' && value) {
            const currentRow = updatedRows.find(row => row.id === id);
            if (currentRow && currentRow.unit) {
                const existingConversion = getExistingConversion(currentRow.unit, id);
                if (existingConversion && existingConversion !== value) {
                    return;
                }
            }
        }

        let finalRows = updatedRows;
        const currentRowIndex = updatedRows.findIndex(row => row.id === id);
        const isLastRow = currentRowIndex === updatedRows.length - 1;

        if (isLastRow && shouldAddNewRow(updatedRows)) {
            const newId = Math.max(...updatedRows.map(row => row.id)) + 1;
            finalRows = [...updatedRows, { id: newId, unit: '', conversion: '', barcode: '' }];
        }

        setBarcodeRows(finalRows);
        setTimeout(() => validateUnitConversions(finalRows), 0);

        if (onDataChange) {
            onDataChange(finalRows);
        }

        if (onSelectedUnitsChange) {
            const selectedUnits = finalRows
                .filter(row => row.unit)
                .map(row => {
                    const unit = units.find(u =>
                        u.unitId === row.unit || u.UnitName === row.unit
                    );
                    return unit ? { unitId: unit.unitId, UnitName: unit.UnitName } : null;
                })
                .filter(Boolean);

            onSelectedUnitsChange(selectedUnits);
        }
    };

    const addBarcodeRow = () => {
        const newId = Math.max(...barcodeRows.map(row => row.id)) + 1;
        const updatedRows = [...barcodeRows, { id: newId, unit: '', conversion: '1', barcode: '' }];
        setBarcodeRows(updatedRows);

        if (onDataChange) {
            onDataChange(updatedRows);
        }
    };

    const removeBarcodeRow = async (id) => {
        if (barcodeRows.length <= 1) return;

        if (generalSettings?.askConfirmationRowRemove) {
            const result = await Swal.fire({
                title: t("delete.title"),
                text: t("delete.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: t("delete.confirm"),
                cancelButtonText: t("delete.cancel"),
            });

            if (!result.isConfirmed) return;
        }

        const rowToDelete = barcodeRows.find(row => row.id === id);
        const updatedRows = barcodeRows.filter(row => row.id !== id);

        setBarcodeRows(updatedRows);

        if (rowToDelete) {
            setDeletedRow({
                ...rowToDelete,
                deletedAt: Date.now()
            });

            if (undoTimer) {
                clearTimeout(undoTimer);
            }

            const timer = setTimeout(() => {
                setDeletedRow(null);
            }, 10000);

            setUndoTimer(timer);
        }

        validateUnitConversions(updatedRows);

        if (onDataChange) {
            onDataChange(updatedRows);
        }

        if (onSelectedUnitsChange) {
            const selectedUnits = updatedRows
                .filter(row => row.unit)
                .map(row => {
                    const unit = units.find(u => u.unitId === row.unit);
                    return unit ? { unitId: unit.unitId, UnitName: unit.UnitName } : null;
                })
                .filter(Boolean);

            onSelectedUnitsChange(selectedUnits);
        }
    };

    const undoDeleteRow = () => {
        if (deletedRow) {
            const { deletedAt, ...restoredRow } = deletedRow;
            const updatedRows = [...barcodeRows, restoredRow].sort((a, b) => a.id - b.id);

            setBarcodeRows(updatedRows);
            setDeletedRow(null);

            if (undoTimer) {
                clearTimeout(undoTimer);
                setUndoTimer(null);
            }

            validateUnitConversions(updatedRows);

            if (onDataChange) {
                onDataChange(updatedRows);
            }

            if (onSelectedUnitsChange) {
                const selectedUnits = updatedRows
                    .filter(row => row.unit)
                    .map(row => {
                        const unit = units.find(u => u.unitId === row.unit);
                        return unit ? { unitId: unit.unitId, UnitName: unit.UnitName } : null;
                    })
                    .filter(Boolean);

                onSelectedUnitsChange(selectedUnits);
            }
        }
    };

    const dismissUndo = () => {
        setDeletedRow(null);
        if (undoTimer) {
            clearTimeout(undoTimer);
            setUndoTimer(null);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                {t("product.tables.barcode")}
            </h3>

            {/* Undo Notification */}
            {deletedRow && (
                <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                        <span>Row deleted successfully</span>
                        <span className="text-xs text-orange-600 dark:text-orange-400">(Press Ctrl+Z to undo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={undoDeleteRow}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 dark:bg-orange-800 hover:bg-orange-200 dark:hover:bg-orange-700 text-orange-800 dark:text-orange-100 rounded transition-colors"
                        >
                            <Undo2 className="w-3 h-3" />
                            Undo
                        </button>
                        <button
                            onClick={dismissUndo}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-visible bg-white dark:bg-[#1e1e1e]">                <div className="overflow-y-visible">
                <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 dark:bg-[#2c2c2c]">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 w-10">
                                #
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[120px]">
                                {t("product.tables.unit")}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[100px]">
                                {t("product.tables.conversion")}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[120px]">
                                {t("product.tables.barcodeLabel")}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-12">
                                {t("product.tables.action")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {barcodeRows.map((row, index) => (
                            <tr
                                key={row.id}
                                className={validationErrors[row.id] ? "bg-red-50 dark:bg-red-900/20" : ""}
                            >
                                <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {index + 1}
                                </td>
                                <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600 relative">
                                    {row.unit === baseUnitId ? (
                                        // Base unit row — locked, show as read-only text
                                        <div
                                            className="w-full p-1 text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1 cursor-not-allowed"
                                            title="Base unit cannot be changed"
                                        >
                                            <span>{units.find(u => u.unitId === baseUnitId)?.UnitName || ''}</span>
                                            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">(base)</span>
                                        </div>
                                    ) : (
                                        <NormalSelectInput
                                            menuPortalTarget={document.body}
                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                            name={`barcode-unit-${row.id}`}
                                            value={row.unit}
                                            onChange={(e) => {
                                                handleBarcodeChange(row.id, 'unit', e.target.value);
                                            }}
                                            options={units
                                                .map((data) => ({ value: data.unitId, label: data.UnitName }))}
                                            placeholder={t("product.tables.unit")}
                                            className="min-w-0"
                                            disabled={viewMode}
                                        />
                                    )}
                                </td>
                                <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600 relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        onFocus={(e) => e.target.select()}
                                        value={row.conversion}
                                        onChange={(e) => handleBarcodeChange(row.id, 'conversion', e.target.value)}
                                        placeholder={t("product.placeholders.conversion")}
                                        className={`w-full border-0 p-1 text-xs focus:outline-none min-w-0 bg-transparent
                                                text-gray-900 dark:text-gray-100
                                                placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                ${validationErrors[row.id] ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''
                                            }`}
                                        disabled={row.unit && getExistingConversion(row.unit, row.id)}
                                        readOnly={viewMode}
                                    />
                                    {validationErrors[row.id] && (
                                        <div className="absolute top-full left-0 right-0 z-10 mt-1">
                                            <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded px-2 py-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {validationErrors[row.id]}
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                                    <input
                                        type="text"
                                        value={row.barcode}
                                        onChange={(e) => handleBarcodeChange(row.id, 'barcode', e.target.value)}
                                        placeholder={t("product.placeholders.barcode")}
                                        className="w-full border-0 p-1 text-xs focus:outline-none min-w-0 bg-transparent
                                                text-gray-900 dark:text-gray-100
                                                placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        readOnly={viewMode}
                                    />
                                </td>
                                <td className="px-2 py-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => removeBarcodeRow(row.id)}
                                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={barcodeRows.length === 1 || viewMode}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
                <div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2c2c2c]">
                    <button
                        type="button"
                        onClick={addBarcodeRow}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={viewMode}
                    >
                        <Plus className="w-4 h-4" />
                        {t("product.buttons.addRow")}
                    </button>
                </div>
            </div>
        </div>
    );
};

BarcodeTable.propTypes = {
    units: PropTypes.array,
    baseUnitId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // ← ADD
    onDataChange: PropTypes.func,
    onSelectedUnitsChange: PropTypes.func,
    initialData: PropTypes.array,
    viewMode: PropTypes.bool,
};
export default BarcodeTable;