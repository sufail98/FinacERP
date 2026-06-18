import React, { useState, useRef, useEffect } from 'react';
import { FileDown, FileSpreadsheet, FileText, Table, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExportDropdown = ({ 
    onExportExcel, 
    onExportPdf, 
    onExportCsv, 
    loading = false,
    disabled = false,
    label = "Export",
    size = "sm"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = (type) => {
        setIsOpen(false);
        switch (type) {
            case 'excel':
                onExportExcel?.();
                break;
            case 'pdf':
                onExportPdf?.();
                break;
            case 'csv':
                onExportCsv?.();
                break;
            default:
                break;
        }
    };

    const exportOptions = [
        {
            type: 'excel',
            label: 'Excel (.xlsx)',
            icon: FileSpreadsheet,
            color: 'text-green-600 dark:text-green-400',
            bgHover: 'hover:bg-green-50 dark:hover:bg-green-900/20',
            available: !!onExportExcel
        },
        {
            type: 'pdf',
            label: 'PDF (.pdf)',
            icon: FileText,
            color: 'text-red-600 dark:text-red-400',
            bgHover: 'hover:bg-red-50 dark:hover:bg-red-900/20',
            available: !!onExportPdf
        },
        {
            type: 'csv',
            label: 'CSV (.csv)',
            icon: Table,
            color: 'text-blue-600 dark:text-blue-400',
            bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
            available: !!onExportCsv
        }
    ].filter(option => option.available);

    if (exportOptions.length === 0) return null;

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || loading}
                size={size}
                className="main-bg text-white hover:opacity-90 flex items-center gap-1 md:gap-2"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FileDown className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden text-xs">{label.length > 6 ? label.substring(0, 4) + '...' : label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Export Format
                        </p>
                    </div>
                    
                    {exportOptions.map((option) => (
                        <button
                            key={option.type}
                            onClick={() => handleExport(option.type)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 ${option.bgHover} transition-colors duration-150`}
                        >
                            <option.icon className={`w-4 h-4 ${option.color}`} />
                            <span className="flex-1">{option.label}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">
                                {option.type}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExportDropdown;