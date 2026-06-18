// src/components/pages/Master/OfferCreation/FilterPanel.jsx
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { X, Loader2, Filter, RotateCcw } from "lucide-react";

const FilterPanel = ({
    open,
    onClose,
    onApply,
    isFiltering,
    productMainGroups = [],
    prodSubGroupByCatOne = [],
    prodSubGroupByCatTwo = [],
    prodSubGroupByCatThree = [],
    prodSubGroupByCatFour = [],
    groupLoadings = {},
}) => {
    const [filterData, setFilterData] = useState({
        maingroup: "", group1: "", group2: "", group3: "", group4: "",
    });
    const panelRef = useRef(null);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape" && open) onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    useEffect(() => {
        const handleClick = (e) => {
            if (open && panelRef.current && !panelRef.current.contains(e.target)) {
                const trigger = document.getElementById("filter-trigger-btn");
                if (trigger && trigger.contains(e.target)) return;
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open, onClose]);

    const handleClear = () => {
        setFilterData({ maingroup: "", group1: "", group2: "", group3: "", group4: "" });
    };

    const handleApply = () => {
        onApply({
            maingroup: filterData.maingroup || null,
            group1: filterData.group1 || null,
            group2: filterData.group2 || null,
            group3: filterData.group3 || null,
            group4: filterData.group4 || null,
        });
    };

    const activeCount = Object.values(filterData).filter(Boolean).length;

    const SelectField = ({ label, value, options, onChange, loading, placeholder }) => (
        <div className="mb-3">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={loading}
                    className="w-full px-2.5 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-[#242424] text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500
                             disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-8 transition-colors"
                >
                    <option value="" className="text-gray-900 bg-white dark:text-gray-100 dark:bg-[#242424]">
                        {placeholder || "— All —"}
                    </option>
                    {options?.map((opt, i) => (
                        <option
                            key={`fp-${label}-${opt.value || i}`}
                            value={opt.value}
                            className="text-gray-900 bg-white dark:text-gray-100 dark:bg-[#242424]"
                        >
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loading ? <Loader2 size={13} className="animate-spin text-gray-400" /> : (
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] bg-white dark:bg-[#1a1a1a] shadow-2xl dark:shadow-black/60 z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#4e2348] dark:text-[#d4a0cc]" />
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Product Filter</h3>
                        {activeCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4e2348] text-white min-w-[18px] text-center">{activeCount}</span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                    <SelectField label="Main Group *" value={filterData.maingroup}
                        options={productMainGroups.map(g => ({ value: g.groupCode, label: g.groupName }))}
                        onChange={(v) => setFilterData(p => ({ ...p, maingroup: v }))}
                        loading={groupLoadings.mainGroup} placeholder="Select Main Group" />
                    <SelectField label="Group 1" value={filterData.group1}
                        options={prodSubGroupByCatOne.map(g => ({ value: g.groupId?.toString(), label: g.groupName }))}
                        onChange={(v) => setFilterData(p => ({ ...p, group1: v }))}
                        loading={groupLoadings.group1} />
                    <SelectField label="Group 2" value={filterData.group2}
                        options={prodSubGroupByCatTwo.map(g => ({ value: g.groupId?.toString(), label: g.groupName }))}
                        onChange={(v) => setFilterData(p => ({ ...p, group2: v }))}
                        loading={groupLoadings.group2} />
                    <SelectField label="Group 3" value={filterData.group3}
                        options={prodSubGroupByCatThree.map(g => ({ value: g.groupId?.toString(), label: g.groupName }))}
                        onChange={(v) => setFilterData(p => ({ ...p, group3: v }))}
                        loading={groupLoadings.group3} />
                    <SelectField label="Group 4" value={filterData.group4}
                        options={prodSubGroupByCatFour.map(g => ({ value: g.groupId?.toString(), label: g.groupName }))}
                        onChange={(v) => setFilterData(p => ({ ...p, group4: v }))}
                        loading={groupLoadings.group4} />
                </div>

                <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141414] space-y-2">
                    <button onClick={handleApply} disabled={isFiltering || !filterData.maingroup}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[#4e2348] hover:bg-[#5a2954] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isFiltering ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : <><Filter className="h-4 w-4" /> Load Products</>}
                    </button>
                    <button onClick={handleClear}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                    </button>
                </div>
            </div>
        </>
    );
};

FilterPanel.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    isFiltering: PropTypes.bool,
    productMainGroups: PropTypes.array,
    prodSubGroupByCatOne: PropTypes.array,
    prodSubGroupByCatTwo: PropTypes.array,
    prodSubGroupByCatThree: PropTypes.array,
    prodSubGroupByCatFour: PropTypes.array,
    groupLoadings: PropTypes.object,
};

export default FilterPanel;