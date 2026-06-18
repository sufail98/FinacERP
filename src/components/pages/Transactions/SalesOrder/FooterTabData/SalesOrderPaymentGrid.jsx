import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import { useTranslation } from 'react-i18next';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';

const SalesOrderPaymentGrid = ({ salesOrderMasterId, editMode, paymentRows, setFormData }) => {
    const { t } = useTranslation();
    const { selectedBranchId, userId } = useAuth();
    const [isInitialized] = useState(false);

    const { generalSettings } = useSelector((state) => state.settings);
    const [rows, setRows] = useState(() => {
        if (paymentRows && paymentRows.length > 0) {
            return paymentRows.map((item, index) => ({
                id: index + 1,
                ledgerId: item.ledgerId,
                amount: item.amount,
                date: item.Date,
                remarks: item.Remarks,
            }));
        } else {
            return Array.from({ length: 1 }, (_, index) => ({
                id: index + 1,
                ledgerId: '',
                amount: '',
                date: '',
                remarks: ''
            }));
        }
    });

    const [bankCashAccounts, setBankCashAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [focusedRow, setFocusedRow] = useState(null); // Track which row is focused

    useEffect(() => {
        if (paymentRows && paymentRows.length > 0 && isInitialized) {
            const mappedRows = paymentRows.map((item, index) => ({
                id: index + 1,
                ledgerId: item.ledgerId,
                amount: item.amount,
                date: item.date,
                remarks: item.remarks,
            }));
            setRows(mappedRows);
        }
    }, [paymentRows, editMode]);

    useEffect(() => {
        fetchBankCashAccounts();
       
    }, [salesOrderMasterId, editMode]);

    const fetchBankCashAccounts = async () => {
        try {
            const res = await axiosInstance.post("bank-account-ledgers", {
                group_ids: [5, 6, 8], // Bank/Cash group
                branchId: selectedBranchId
            });
            setBankCashAccounts(res.data.data || []);
        } catch (error) {
            console.error('Error fetching bank/cash accounts:', error);
        }
    };

    useEffect(() => {
        const filledRows = rows.filter(row =>
            row.ledgerId && row.date.trim() !== ''
        );

        const payments = filledRows.map((row, index) => ({
            ledgerId: row.ledgerId,
            amount: row.amount,
            date: row.date,
            remarks: row.remarks,
        }));

        setFormData(prev => ({
            ...prev,
            payments,
        }));
    }, [rows, selectedBranchId]);

    const addNewRow = () => {
        const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
        const newRow = {
            id: newId,
            ledgerId: '',
            amount: '',
            date: '',
            remarks: '',
        };
        setRows([...rows, newRow]);
    };

    const deleteRow = (id) => {
        if (rows.length === 1) {
            Swal.fire({
                icon: 'warning',
                title: t('Cannot Delete'),
                text: t('At least one row is required'),
            });
            return;
        }
        setRows(prevRows => prevRows.filter(row => row.id !== id));
    };

    const handleInputChange = (id, field, value) => {
        setRows(prevRows =>
            prevRows.map(row => {
                if (row.id === id) {
                    // If ledger is being selected and date is empty, auto-fill current date
                    if (field === 'ledgerId' && value && !row.date) {
                        const currentDate = new Date().toISOString().split('T')[0];
                        return { ...row, [field]: value, date: currentDate };
                    }
                    return { ...row, [field]: value };
                }
                return row;
            })
        );
    };

    const handleAmountChange = (id, value) => {
        // Allow empty string, numbers, and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            handleInputChange(id, 'amount', value);
        }
    };

    const handleAmountBlur = (id, value) => {
        setFocusedRow(null);
        // Format to decimal places on blur if there's a value
        if (value && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                const formatted = numValue.toFixed(generalSettings?.decimalPart ?? 2);
                handleInputChange(id, 'amount', formatted);
            }
        }
    };

    const handleAmountFocus = (id, e) => {
        setFocusedRow(id);
        e.target.select();
    };

    const getDisplayAmount = (row) => {
        // If this row is focused, show raw value for editing
        if (focusedRow === row.id) {
            return row.amount;
        }
        
        // If not focused and has value, show formatted
        if (row.amount !== '' && row.amount !== null && row.amount !== undefined) {
            const numValue = parseFloat(row.amount);
            if (!isNaN(numValue)) {
                return numValue.toFixed(generalSettings?.decimalPart ?? 2);
            }
        }
        
        // Empty case
        return '';
    };

    if (loading) {
        return <div className="text-center py-4">Loading payments...</div>;
    }

    return (
        <div className="mt-2">
            <h3 className="text-sm font-semibold mb-2 text-primary dark:text-primary">
                {t("Payment Details")}
            </h3>
            <div className="">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-400 dark:bg-black border-b-2 border-themed dark:border-themed">
                            <th className="p-2 text-left font-semibold border border-themed dark:border-themed w-[250px]">
                                {t("Bank/Cash Account")}
                            </th>
                            <th className="p-2 text-left font-semibold border border-themed dark:border-themed w-[100px]">
                                {t("Amount")}
                            </th>
                            <th className="p-2 text-left font-semibold border border-themed dark:border-themed w-[120px]">
                                {t("Date")}
                            </th>
                            <th className="p-2 text-left font-semibold border border-themed dark:border-themed">
                                {t("Remarks")}
                            </th>
                            <th className="p-2 text-center font-semibold border border-themed dark:border-themed w-[80px]">
                                {t("Action")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-themed dark:border-themed hover:bg-hover dark:hover:bg-hover">
                                <td className="p-1 border border-themed dark:border-themed">
                                    <SearchableDropdown
                                        options={bankCashAccounts.map(acc => ({
                                            value: acc.ledgerId,
                                            label: acc.ledgerName
                                        }))}
                                        value={row.ledgerId}
                                        onChange={(value) => handleInputChange(row.id, 'ledgerId', value)}
                                        placeholder={t("Select Account")}
                                        searchPlaceholder={t("Search Account")}
                                        clearable
                                        className="w-full"
                                    />
                                </td>
                                <td className="p-1 border border-themed dark:border-themed">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDisplayAmount(row)}
                                        onChange={(e) => handleAmountChange(row.id, e.target.value)}
                                        onFocus={(e) => handleAmountFocus(row.id, e)}
                                        onBlur={(e) => handleAmountBlur(row.id, e.target.value)}
                                        className="w-full px-2 py-1 border-0 text-right text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                        placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                                    />
                                </td>
                                <td className="p-1 border border-themed dark:border-themed">
                                    <input
                                        type="text"
                                        value={row.date}
                                        readOnly
                                        className="w-full px-2 py-1 border-0 bg-secondary dark:bg-secondary text-primary dark:text-primary rounded cursor-not-allowed"
                                    />
                                </td>
                                <td className="p-1 border border-themed dark:border-themed">
                                    <input
                                        type="text"
                                        value={row.remarks}
                                        onChange={(e) => handleInputChange(row.id, 'remarks', e.target.value)}
                                        className="w-full px-2 py-1 border-0 text-primary dark:text-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
                                        placeholder={t("Enter remarks")}
                                    />
                                </td>
                                <td className="p-1 border border-themed dark:border-themed text-center">
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                        title={t("Delete")}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end mt-2">
                <button
                    onClick={addNewRow}
                    className="flex items-center gap-2 main-bg text-white text-sm px-4 py-1 rounded-sm hover:bg-blue-700 dark:hover:main-bg transition"
                >
                    <Plus size={15} />
                    {t("Add Payment Row")}
                </button>
            </div>
        </div>
    );
};

export default SalesOrderPaymentGrid;