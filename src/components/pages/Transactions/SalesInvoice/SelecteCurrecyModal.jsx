import React, { useEffect, useState } from 'react'
import SalesInvoiceModalWizard from './SalesInvoiceModalWizard'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import { Check, Search } from 'lucide-react'

const SelecteCurrecyModal = ({ open, handleClose, onSuccess, editId, formData, handleChange, currency: data = [], currencyConvertionData = [] }) => {
    const { t } = useTranslation();
    const { currentCurrency: currentCurrencyFromStore } = useAuth(); // note: setCurrency intentionally NOT used here

    const [selectedCurrency, setSelectedCurrency] = useState(currentCurrencyFromStore?.currencyId);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Initialize selection from this invoice's own formData (not the global store),
    // falling back to the global current currency only if the form has none set yet.
    useEffect(() => {
        if (open) {
            const currentConversion = currencyConvertionData?.find(
                c => c.currencyConversionId === formData?.currencyConversionId
            );
            setSelectedCurrency(currentConversion?.currencyId ?? currentCurrencyFromStore?.currencyId);
        }
    }, [open, formData?.currencyConversionId, currentCurrencyFromStore?.currencyId, currencyConvertionData]);

    const filteredCurrencies = data?.filter(currency => {
        const searchLower = searchQuery.toLowerCase();
        return (
            currency?.currencyName?.toLowerCase().includes(searchLower) ||
            currency?.narration?.toLowerCase().includes(searchLower)
        );
    });

    const handleCurrencySelect = (currencyId) => {
        setSelectedCurrency(currencyId);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        // Find the matching conversion record for the selected currency
        const selectedConversion = currencyConvertionData?.find(
            c => c.currencyId === selectedCurrency
        );
        // Find the currency's display meta (name/narration) from the currency list
        const selectedCurrencyMeta = data.find(c => c.currencyid === selectedCurrency);

        if (selectedConversion) {
            // ✅ Only update THIS form's local state (formData) — no Redux dispatch,
            // so the app-wide current currency stays untouched.
            handleChange('currencyConversionId', selectedConversion.currencyConversionId);
            handleChange('currencyId', selectedConversion.currencyId);
            handleChange('exchangeRate', selectedConversion.rate);
            handleChange('exchangeDate', selectedConversion.date);
            handleChange(
                'currencyName',
                selectedCurrencyMeta
                    ? `${selectedCurrencyMeta.currencyname} - ${selectedCurrencyMeta.narration}`
                    : ''
            );

            if (onSuccess) onSuccess();
        }

        handleClose();
    };

    let clickTimeout = null;
    const handleRowClick = (id) => {
        if (clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => handleCurrencySelect(id), 200);
    };

    const handleRowDoubleClick = (id) => {
        clearTimeout(clickTimeout);
        handleCurrencySelect(id);
        handleSubmit();
    };

    return (
        <SalesInvoiceModalWizard
            open={open}
            handleClose={handleClose}
            width="400px"
        >
            <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-primary dark:text-primary">Select Currency</h2>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search currency..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-themed rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-primary dark:bg-tertiary text-primary dark:text-primary"
                    />
                </div>

                {/* Currency List */}
                <div className="border border-themed rounded-md max-h-64 overflow-y-auto custom-scrollbar bg-secondary dark:bg-secondary">
                    {loading ? (
                        <div className="px-4 py-8 text-center text-secondary dark:text-secondary">
                            Loading currencies...
                        </div>
                    ) : filteredCurrencies.length > 0 ? (
                        filteredCurrencies.map((currency) => (
                            <div
                                key={currency.currencyid}
                                onClick={() => handleRowClick(currency.currencyid)}
                                onDoubleClick={() => handleRowDoubleClick(currency.currencyid)}
                                className={`
                                    flex items-center justify-between px-4 py-3 cursor-pointer transition-colors
                                    ${selectedCurrency === currency.currencyid
                                        ? 'bg-blue-50 dark:bg-[#1e3a8a] border-l-4 border-blue-600 dark:border-blue-400'
                                        : 'hover:bg-gray-50 dark:hover:bg-[#2c2c2c] border-l-4 border-transparent'
                                    }
                                `}
                            >
                                <div className="flex flex-col">
                                    <span
                                        className={`
                                            ${selectedCurrency === currency.currencyid
                                                ? 'font-medium text-blue-900 dark:text-blue-300'
                                                : 'text-primary dark:text-primary'
                                            }
                                        `}
                                    >
                                        {currency.currencyname} - {currency.narration}
                                    </span>
                                </div>
                                {selectedCurrency === currency.currencyid && (
                                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-secondary dark:text-secondary">
                            No currencies found
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="main-bg"
                        onClick={handleSubmit}
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </SalesInvoiceModalWizard>
    );
};

export default SelecteCurrecyModal;