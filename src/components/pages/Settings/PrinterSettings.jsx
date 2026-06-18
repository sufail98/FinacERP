import React, { useEffect, useState } from 'react';
import { AlertCircle, Printer, RefreshCw, Check, Loader2 } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  isElectron, 
  getPrinters, 
  getPrinterPreference, 
  savePrinterPreference 
} from '@/utils/electronPrint';
import AlertBox from '@/components/common/AlertBox';
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';

const PrinterSettings = () => {
    const [alert, setAlert] = useState(null);
    const [isElectronApp, setIsElectronApp] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const [printers, setPrinters] = useState([]);
    const [selectedThermal, setSelectedThermal] = useState('');
    const [selectedA4, setSelectedA4] = useState('');
    const [selectedBarcode, setSelectedBarcode] = useState('');

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            const electronDetected = isElectron();
            setIsElectronApp(electronDetected);

            if (electronDetected) {
                await loadPrinters();
                await loadSavedPreferences();
            }
            
            setLoading(false);
        };

        initialize();
    }, []);

    const loadPrinters = async () => {
        try {
            const systemPrinters = await getPrinters();
            setPrinters(systemPrinters);
        } catch (error) {
            console.error('❌ [SETTINGS] Error loading printers:', error);
            showAlert('error', 'Failed to load printers');
        }
    };

    const loadSavedPreferences = async () => {
        try {
            const thermalPrinter = await getPrinterPreference('thermal');
            const a4Printer = await getPrinterPreference('a4');
            const barcodePrinter = await getPrinterPreference('barcode');
            
            if (thermalPrinter) setSelectedThermal(thermalPrinter);
            if (a4Printer) setSelectedA4(a4Printer);
            if (barcodePrinter) setSelectedBarcode(barcodePrinter);
        } catch (error) {
            console.error('❌ [SETTINGS] Error loading preferences:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPrinters();
        setRefreshing(false);
        showAlert('success', 'Printer list refreshed');
    };

    const handleSave = async () => {
        if (!isElectronApp) return;
        
        setSaving(true);
        
        try {
            if (selectedThermal) {
                await savePrinterPreference('thermal', selectedThermal);
            }
            if (selectedA4) {
                await savePrinterPreference('a4', selectedA4);
            }
            if (selectedBarcode) {
                await savePrinterPreference('barcode', selectedBarcode);
            }
            
            showToast.success("Settings updated successfully");
        } catch (error) {
            console.error('❌ [SETTINGS] Save error:', error);
            showToast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSelectedThermal('');
        setSelectedA4('');
        setSelectedBarcode('');
    };

    const showAlert = (type, message) => {
        showToast[type](message);
        setTimeout(() => setAlert(null), 3000);
    };

    const handleTestPrint = async (printerName, printType) => {
        if (!printerName) {
            showAlert('error', 'Please select a printer first');
            return;
        }

        let testHtml;

        if (printType === 'barcode') {
            // Barcode-specific test print: narrow label layout
            testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        @page { margin: 0; size: 50mm 30mm; }
                        body { 
                            font-family: 'Courier New', monospace;
                            width: 50mm;
                            padding: 3mm;
                            text-align: center;
                            font-size: 8pt;
                        }
                        .title { font-size: 10pt; font-weight: bold; margin-bottom: 2mm; }
                        .barcode { font-size: 28pt; letter-spacing: 2px; margin: 1mm 0; }
                        .info { font-size: 7pt; color: #555; }
                    </style>
                </head>
                <body>
                    <div class="title">TEST LABEL</div>
                    <div class="barcode">||||| ||| ||</div>
                    <div>123456789</div>
                    <div class="info">${printerName}</div>
                    <div class="info">${new Date().toLocaleString()}</div>
                </body>
                </html>
            `;
        } else {
            testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 20px; 
                            text-align: center;
                        }
                        h1 { color: #333; }
                        .info { margin: 10px 0; color: #666; }
                    </style>
                </head>
                <body>
                    <h1>🖨️ Test Print</h1>
                    <div class="info">Printer: ${printerName}</div>
                    <div class="info">Type: ${printType}</div>
                    <div class="info">Time: ${new Date().toLocaleString()}</div>
                    <p>If you can see this, printing is working!</p>
                </body>
                </html>
            `;
        }

        try {
            const { printSilent } = await import('@/utils/electronPrint');
            const result = await printSilent(testHtml, printerName, printType);
            
            if (result.success) {
                showAlert('success', 'Test print sent successfully!');
            } else {
                showAlert('error', `Print failed: ${result.error}`);
            }
        } catch (error) {
            showAlert('error', `Print error: ${error.message}`);
        }
    };

    // Web mode - show disabled message
    if (!isElectronApp) {
        return (
            <div className="p-6 bg-white dark:bg-[#121212] transition-colors">
                <div className="max-w-2xl">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Printer Settings</h1>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 rounded-md">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                    Feature Not Available
                                </h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Printer settings are only available in the Electron desktop application. 
                                    Please use the desktop app to configure printer settings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-6 bg-white dark:bg-[#121212] transition-colors">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading printers...</span>
                </div>
            </div>
        );
    }

    // Electron version - fully functional
    return (
        <>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            
            <div className="p-2 bg-white dark:bg-[#121212] transition-colors">
                <div className="max-w-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            Printer Settings
                        </h1>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 text-sm 
                                     bg-gray-100 dark:bg-[#242424] 
                                     hover:bg-gray-200 dark:hover:bg-[#2a2a2a] 
                                     text-gray-700 dark:text-gray-300
                                     border border-gray-300 dark:border-gray-600
                                     rounded-md transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {/* No printers found */}
                    {printers.length === 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 
                                      border border-yellow-200 dark:border-yellow-800 
                                      rounded-md p-4 mb-6">
                            <p className="text-yellow-800 dark:text-yellow-200">
                                No printers found. Make sure your printers are properly connected and installed.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {/* Thermal Printer Selection */}
                        <div className="bg-white dark:bg-[#1e1e1e]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                🧾 Thermal Printer (for receipts)
                            </label>
                            <div className="flex gap-2">
                                <Select value={selectedThermal} onValueChange={setSelectedThermal}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="-- Select Thermal Printer --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {printers.map((printer) => (
                                            <SelectItem key={printer.name} value={printer.name}>
                                                {printer.name} {printer.isDefault ? '(Default)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <button
                                    onClick={() => handleTestPrint(selectedThermal, 'thermal')}
                                    disabled={!selectedThermal}
                                    className="px-4 py-2 
                                             bg-gray-600 dark:bg-gray-700 
                                             text-white rounded-md 
                                             hover:bg-gray-700 dark:hover:bg-gray-600 
                                             disabled:bg-gray-300 dark:disabled:bg-gray-800 
                                             disabled:text-gray-500 dark:disabled:text-gray-500
                                             disabled:cursor-not-allowed transition-colors"
                                >
                                    Test
                                </button>
                            </div>
                            {selectedThermal && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                    ✓ Selected: {selectedThermal}
                                </p>
                            )}
                        </div>

                        {/* A4 Printer Selection */}
                        <div className="bg-white dark:bg-[#1e1e1e]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📄 A4 Printer
                            </label>
                            <div className="flex gap-2">
                                <Select value={selectedA4} onValueChange={setSelectedA4}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="-- Select A4 Printer --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {printers.map((printer) => (
                                            <SelectItem key={printer.name} value={printer.name}>
                                                {printer.name} {printer.isDefault ? '(Default)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <button
                                    onClick={() => handleTestPrint(selectedA4, 'a4')}
                                    disabled={!selectedA4}
                                    className="px-4 py-2 
                                             bg-gray-600 dark:bg-gray-700 
                                             text-white rounded-md 
                                             hover:bg-gray-700 dark:hover:bg-gray-600 
                                             disabled:bg-gray-300 dark:disabled:bg-gray-800 
                                             disabled:text-gray-500 dark:disabled:text-gray-500
                                             disabled:cursor-not-allowed transition-colors"
                                >
                                    Test
                                </button>
                            </div>
                            {selectedA4 && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                    ✓ Selected: {selectedA4}
                                </p>
                            )}
                        </div>

                        {/* Barcode Printer Selection */}
                        <div className="bg-white dark:bg-[#1e1e1e]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                🏷️ Barcode Printer (for labels)
                            </label>
                            <div className="flex gap-2">
                                <Select value={selectedBarcode} onValueChange={setSelectedBarcode}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="-- Select Barcode Printer --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {printers.map((printer) => (
                                            <SelectItem key={printer.name} value={printer.name}>
                                                {printer.name} {printer.isDefault ? '(Default)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <button
                                    onClick={() => handleTestPrint(selectedBarcode, 'barcode')}
                                    disabled={!selectedBarcode}
                                    className="px-4 py-2 
                                             bg-gray-600 dark:bg-gray-700 
                                             text-white rounded-md 
                                             hover:bg-gray-700 dark:hover:bg-gray-600 
                                             disabled:bg-gray-300 dark:disabled:bg-gray-800 
                                             disabled:text-gray-500 dark:disabled:text-gray-500
                                             disabled:cursor-not-allowed transition-colors"
                                >
                                    Test
                                </button>
                            </div>
                            {selectedBarcode && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                    ✓ Selected: {selectedBarcode}
                                </p>
                            )}
                        </div>

                        {/* Available Printers List */}
                        <div className="bg-gray-50 dark:bg-[#1a1a1a] 
                                      border border-gray-200 dark:border-gray-700 
                                      rounded-lg p-4">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Available Printers ({printers.length})
                            </h3>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {printers.map((printer) => (
                                    <div 
                                        key={printer.name} 
                                        className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                                    >
                                        <Printer className="h-3 w-3" />
                                        {printer.name}
                                        {printer.isDefault && (
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 
                                                           text-blue-700 dark:text-blue-300 
                                                           px-1.5 py-0.5 rounded">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                            <Button
                                onClick={handleSave}
                                disabled={saving || (!selectedThermal && !selectedA4 && !selectedBarcode)}
                                className="flex items-center gap-2 
                                         main-bg dark:main-bg 
                                         text-white py-2 px-6 rounded-md 
                                         hover:bg-blue-700 dark:hover:bg-blue-700 
                                         disabled:bg-gray-400 dark:disabled:bg-gray-700 
                                         disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </Button>
                            <Button
                                onClick={handleReset}
                                className="bg-gray-200 dark:bg-[#242424] 
                                         text-gray-700 dark:text-gray-300 
                                         py-2 px-6 rounded-md 
                                         hover:bg-gray-300 dark:hover:bg-[#2a2a2a] 
                                         border border-gray-300 dark:border-gray-600
                                         transition-colors"
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrinterSettings;