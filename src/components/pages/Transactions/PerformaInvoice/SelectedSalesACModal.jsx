import { useEffect, useState } from 'react'
import SalesInvoiceModalWizard from './SalesInvoiceModalWizard'
import { Button } from '@/components/ui/button'
import { Check, Search } from 'lucide-react'

const SelectedSalesACModal = ({ fetchSalesAccountLoading, open, handleClose, onSuccess, editId, formData, handleChange, salesAccounts = [] }) => {
    const [selectedAccount, setSelectedAccount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize with current value or first account when modal opens
    useEffect(() => {
        if (open) {
            setSearchQuery(''); // Reset search when modal opens
            if (formData?.salesAccount) {
                setSelectedAccount(formData.salesAccount);
            } else if (salesAccounts.length > 0) {
                setSelectedAccount(salesAccounts[0].ledgerId);
            }
        }
    }, [open, formData?.salesAccount, salesAccounts]);

    // Filter accounts based on search query
    const filteredAccounts = salesAccounts.filter(account =>
        account.ledgerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = () => {
        if (selectedAccount) {
            handleChange('salesAccount', selectedAccount);
        }
        handleClose();
    };

    const handleAccountSelect = (ledgerId) => {
        setSelectedAccount(ledgerId);
    };

    return (
        <SalesInvoiceModalWizard
            open={open}
            handleClose={handleClose}
            width={'500px'}
        >
            <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                    Select Sales Account
                </h2>

                {fetchSalesAccountLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 dark:border-blue-400 border-t-transparent mb-3"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading sales accounts...</p>
                    </div>
                ) : (
                    <>
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search sales account..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 
                                    bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-gray-100
                                    border border-gray-300 dark:border-gray-600 
                                    rounded-md 
                                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                                    transition-colors"
                            />
                        </div>

                        {/* Sales Accounts List */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-64 overflow-y-auto transition-colors">
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map((account) => (
                                    <div
                                        key={account.ledgerId}
                                        onClick={() => handleAccountSelect(account.ledgerId)}
                                        onDoubleClick={() => {
                                            handleAccountSelect(account.ledgerId);
                                            handleSubmit();
                                        }}
                                        className={`
                                            flex items-center justify-between px-4 py-3 cursor-pointer transition-colors
                                            ${selectedAccount === account.ledgerId
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600 dark:border-blue-400'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                                            }
                                        `}
                                    >
                                        <span
                                            className={`${selectedAccount === account.ledgerId
                                                    ? 'font-medium text-blue-900 dark:text-blue-300'
                                                    : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {account.ledgerName}
                                        </span>
                                        {selectedAccount === account.ledgerId && (
                                            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No accounts found
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="border-gray-300 dark:border-gray-600 
                                    text-gray-700 dark:text-gray-300
                                    hover:bg-gray-100 dark:hover:bg-gray-700"
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
                    </>
                )}
            </div>
        </SalesInvoiceModalWizard>
    )
}

export default SelectedSalesACModal