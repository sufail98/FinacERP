import usePrivileges from '@/lib/hooks/usePrivileges';
import { MoreVertical, FileText, ClipboardList, Truck, Receipt } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

const ConvertMenu = ({ onConvert, page }) => {
    const { hasAccess:salesOrderAccess } = usePrivileges("Sales Order");
    const { hasAccess:proformaAccess } = usePrivileges("Proforma Invoice");
    const { hasAccess:deliveryNoteAccess } = usePrivileges("Delivery Note");
    const { hasAccess:salesInvoiceAccess } = usePrivileges("Sales Invoice");

    const [open, setOpen] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [visible, setVisible] = useState(false);
    const ref = useRef(null);
    const closeTimeoutRef = useRef(null);

    const allOptions = [
        { label: 'Convert to Proforma', icon: FileText, value: 'proforma', hasAccess: proformaAccess },
        { label: 'Convert to Order', icon: ClipboardList, value: 'order', hasAccess: salesOrderAccess },
        { label: 'Convert to Delivery Note', icon: Truck, value: 'deliveryNote', hasAccess: deliveryNoteAccess },
        { label: 'Convert to Sale', icon: Receipt, value: 'sale', hasAccess: salesInvoiceAccess },
    ];

    // Define which option values are visible per page
    const pageOptionsMap = {
        quotation: ['proforma', 'order', 'deliveryNote', 'sale'],
        proforma: ['order', 'deliveryNote', 'sale'],
        order: ['deliveryNote', 'sale'],
        deliveryNote: ['sale'],
    };

    const allowedValues = pageOptionsMap[page] || [];
    const options = allOptions.filter(opt => allowedValues.includes(opt.value) && opt.hasAccess);

    // Drive mount/visibility state off `open`
    useEffect(() => {
        if (open) {
            clearTimeout(closeTimeoutRef.current);
            setShouldRender(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
        } else {
            setVisible(false);
            closeTimeoutRef.current = setTimeout(() => setShouldRender(false), 150);
        }
        return () => clearTimeout(closeTimeoutRef.current);
    }, [open]);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Don't render the trigger button at all if there are no options for this page
    if (options.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Convert options"
                title="Convert quotation"
            >
                <MoreVertical className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>

            {shouldRender && (
                <div
                    className={`absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 origin-top-right
                        transition-all duration-150 ease-out
                        ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1'}`}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { onConvert(opt.value); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <opt.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConvertMenu;