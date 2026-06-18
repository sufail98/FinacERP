import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import printInvoiceOne from '@/utils/prints/salesInvoicePrints/InvoicePrintOne';
import printThermalInvoice from '@/utils/prints/salesInvoicePrints/thermal/printThermalInvoiceOne';
import Preloader from '@/components/common/Preloader';

const PrintInvoicePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Get invoice data from sessionStorage
        const invoiceToPrintStr = sessionStorage.getItem('invoiceToPrint');
        
        if (!invoiceToPrintStr) {
            // No invoice data found, redirect to list
            navigate('/transaction/sales-invoice/invoice-list');
            return;
        }

        try {
            const { invoiceData, branchDetails, time, printType } = JSON.parse(invoiceToPrintStr);
            
            // Clear the session storage
            sessionStorage.removeItem('invoiceToPrint');
            
            // Trigger print after component mounts
            setTimeout(() => {
                if (printType === 'a4') {
                    printInvoiceOne(invoiceData, branchDetails, time);
                } else if (printType === 'thermal') {
                    printThermalInvoice(invoiceData, branchDetails, time);
                }
                
                // After print dialog is shown, close this tab
                setTimeout(() => {
                    window.close();
                    // Fallback if window.close() doesn't work
                    if (!window.closed) {
                        navigate('/transaction/sales-invoice/invoice-list');
                    }
                }, 1000);
            }, 500);
            
        } catch (error) {
            console.error('Error printing invoice:', error);
            navigate('/transaction/sales-invoice/invoice-list');
        }
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
                <Preloader />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Preparing invoice for printing...</p>
            </div>
        </div>
    );
};

export default PrintInvoicePage;