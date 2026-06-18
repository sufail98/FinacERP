import React from 'react';
import { useSelector } from "react-redux";


const ProfitAndLossGrid = ({ data, reportType }) => {
    const { generalSettings } = useSelector((state) => state.settings);

const formatDecimal = (value) =>
  Number(value || 0).toFixed(generalSettings?.decimalPart ?? 2);
    if (!data) return null;

   const formatAmount = (amount) => formatDecimal(amount);

    const calculateTotals = () => {
        const openingStock = parseFloat(data.openingStock || 0);
        const closingStock = parseFloat(data.closingStock || 0);
        
        
        // Handle different API response structures
        let purchaseDebit, salesCredit, directExpenseDebit, directIncomeCredit;
        let indirectExpenseDebit, indirectIncomeCredit;
        
        if (reportType === 'detailed') {
            // Detailed API returns array of ledgers with 'balance' field
            purchaseDebit = data.Purchase?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            salesCredit = data.Sales?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            directExpenseDebit = data['Direct Expense']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            directIncomeCredit = data['Direct Income']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            indirectExpenseDebit = data['Indirect Expense']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
            indirectIncomeCredit = data['Indirect Income']?.reduce((sum, item) => sum + parseFloat(item.balance || 0), 0) || 0;
        } else {
            // Condensed API returns array with 'debit' and 'credit' fields
            purchaseDebit = data.Purchase?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            salesCredit = data.Sales?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
            directExpenseDebit = data['Direct Expense']?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            directIncomeCredit = data['Direct Income']?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
            indirectExpenseDebit = data['Indirect Expense']?.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0) || 0;
            indirectIncomeCredit = data['Indirect Income']?.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0) || 0;
        }
        
        
        const totalExpense = openingStock + purchaseDebit + directExpenseDebit;
        const totalIncome = closingStock + salesCredit + directIncomeCredit;
        
        const grossProfit = totalIncome > totalExpense ? totalIncome - totalExpense : 0;
        const grossLoss = totalExpense > totalIncome ? totalExpense - totalIncome : 0;
        
        const grandTotalExpense = grossLoss + indirectExpenseDebit;
        const grandTotalIncome = grossProfit + indirectIncomeCredit;
        
        const netProfit = grandTotalIncome > grandTotalExpense ? grandTotalIncome - grandTotalExpense : 0;
        const netLoss = grandTotalExpense > grandTotalIncome ? grandTotalExpense - grandTotalIncome : 0;
        
        return {
            openingStock, closingStock, purchaseDebit, salesCredit,
            directExpenseDebit, directIncomeCredit, totalExpense, totalIncome,
            grossProfit, grossLoss, indirectExpenseDebit, indirectIncomeCredit,
            grandTotalExpense: Math.max(grandTotalExpense, grandTotalIncome),
            netProfit, netLoss
        };
    };

    const totals = calculateTotals();

    const renderCondensedView = () => (
        <div className="grid grid-cols-2 gap-0 border border-gray-300">
            <div className="bg-gray-100 border-b border-r border-gray-300 p-2 font-bold text-center">Expense</div>
            <div className="bg-gray-100 border-b border-gray-300 p-2 font-bold text-center">Income</div>

            <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                <span>Opening Stock</span>
                <span className="font-medium">{formatAmount(totals.openingStock)}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between">
                <span>Closing Stock</span>
                <span className="font-medium">{formatAmount(totals.closingStock)}</span>
            </div>

            <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                <span>Purchase Accounts</span>
                <span className="font-medium">{formatAmount(totals.purchaseDebit)}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between">
                <span>Sales Accounts</span>
                <span className="font-medium">{formatAmount(totals.salesCredit)}</span>
            </div>

            <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                <span>Direct Expenses</span>
                <span className="font-medium">{formatAmount(totals.directExpenseDebit)}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between">
                <span>Direct Incomes</span>
                <span className="font-medium">{formatAmount(totals.directIncomeCredit)}</span>
            </div>

            {/* Show Gross Profit/Loss balancing row */}
            {totals.grossProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between bg-green-50">
                        <span className="text-green-700">Gross Profit c/d</span>
                        <span className="font-medium text-green-600">{formatAmount(totals.grossProfit)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between bg-red-50">
                        <span className="text-red-700">Gross Loss c/d</span>
                        <span className="font-medium text-red-600">{formatAmount(totals.grossLoss)}</span>
                    </div>
                </>
            )}

            <div className="border-b border-r border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Total</span>
                <span>{formatAmount(Math.max(totals.totalExpense, totals.totalIncome))}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Total</span>
                <span>{formatAmount(Math.max(totals.totalExpense, totals.totalIncome))}</span>
            </div>

            {/* Brought down items */}
            {totals.grossProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between">
                        <span>Gross Profit b/d</span>
                        <span className="font-medium">{formatAmount(totals.grossProfit)}</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                        <span>Gross Loss b/d</span>
                        <span className="font-medium">{formatAmount(totals.grossLoss)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            )}

            <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                <span>Indirect Expenses</span>
                <span className="font-medium">{formatAmount(totals.indirectExpenseDebit)}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between">
                <span>Indirect Incomes</span>
                <span className="font-medium">{formatAmount(totals.indirectIncomeCredit)}</span>
            </div>

            {/* Show Net Profit/Loss balancing row */}
            {totals.netProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between bg-green-50">
                        <span className="text-green-700 font-bold">Net Profit</span>
                        <span className="font-bold text-green-600">{formatAmount(totals.netProfit)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between bg-red-50">
                        <span className="text-red-700 font-bold">Net Loss</span>
                        <span className="font-bold text-red-600">{formatAmount(totals.netLoss)}</span>
                    </div>
                </>
            )}

            <div className="border-r border-gray-300 p-2 flex justify-between font-bold bg-gray-100">
                <span>Grand Total</span>
                <span>{formatAmount(totals.grandTotalExpense)}</span>
            </div>
            <div className="p-2 flex justify-between font-bold bg-gray-100">
                <span>Grand Total</span>
                <span>{formatAmount(totals.grandTotalExpense)}</span>
            </div>
        </div>
    );

    const renderDetailedView = () => (
        <div className="grid grid-cols-2 gap-0 border border-gray-300">
            <div className="bg-gray-100 border-b border-r border-gray-300 p-2 font-bold text-center">Expense</div>
            <div className="bg-gray-100 border-b border-gray-300 p-2 font-bold text-center">Income</div>

            <div className="border-b border-r border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Opening Stock</span>
                <span>{formatAmount(totals.openingStock)}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Closing Stock</span>
                <span>{formatAmount(totals.closingStock)}</span>
            </div>

            <div className="border-b border-r border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Purchase Account</span>
                    <span>{formatAmount(totals.purchaseDebit)}</span>
                </div>
                {data.Purchase?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            <div className="border-b border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Sales Account</span>
                    <span>{formatAmount(totals.salesCredit)}</span>
                </div>
                {data.Sales?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            <div className="border-b border-r border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Direct Expense</span>
                    <span>{formatAmount(totals.directExpenseDebit)}</span>
                </div>
                {data['Direct Expense']?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            <div className="border-b border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Direct Income</span>
                    <span>{formatAmount(totals.directIncomeCredit)}</span>
                </div>
                {data['Direct Income']?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            {/* Show Gross Profit/Loss balancing row */}
            {totals.grossProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between bg-green-50">
                        <span className="text-green-700">Gross Profit c/d</span>
                        <span className="font-medium text-green-600">{formatAmount(totals.grossProfit)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between bg-red-50">
                        <span className="text-red-700">Gross Loss c/d</span>
                        <span className="font-medium text-red-600">{formatAmount(totals.grossLoss)}</span>
                    </div>
                </>
            )}

            <div className="border-b border-r border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Total</span>
                <span>{formatAmount(Math.max(totals.totalExpense, totals.totalIncome))}</span>
            </div>
            <div className="border-b border-gray-300 p-2 flex justify-between font-bold bg-gray-50">
                <span>Total</span>
                <span>{formatAmount(Math.max(totals.totalExpense, totals.totalIncome))}</span>
            </div>

            {/* Brought down items */}
            {totals.grossProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between">
                        <span>Gross Profit b/d</span>
                        <span className="font-medium">{formatAmount(totals.grossProfit)}</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between">
                        <span>Gross Loss b/d</span>
                        <span className="font-medium">{formatAmount(totals.grossLoss)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            )}

            <div className="border-b border-r border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Indirect Expense</span>
                    <span>{formatAmount(totals.indirectExpenseDebit)}</span>
                </div>
                {data['Indirect Expense']?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            <div className="border-b border-gray-300">
                <div className="p-2 flex justify-between font-bold bg-gray-50">
                    <span>Indirect Income</span>
                    <span>{formatAmount(totals.indirectIncomeCredit)}</span>
                </div>
                {data['Indirect Income']?.map((item, idx) => (
                    <div key={idx} className="p-2 pl-6 flex justify-between text-sm border-t border-gray-200">
                        <span>{item.ledger_name}</span>
                        <span>{formatAmount(item.balance)}</span>
                    </div>
                ))}
            </div>

            {/* Show Net Profit/Loss balancing row */}
            {totals.netProfit > 0 ? (
                <>
                    <div className="border-b border-r border-gray-300 p-2 flex justify-between bg-green-50">
                        <span className="text-green-700 font-bold">Net Profit</span>
                        <span className="font-bold text-green-600">{formatAmount(totals.netProfit)}</span>
                    </div>
                    <div className="border-b border-gray-300 p-2"></div>
                </>
            ) : (
                <>
                    <div className="border-b border-r border-gray-300 p-2"></div>
                    <div className="border-b border-gray-300 p-2 flex justify-between bg-red-50">
                        <span className="text-red-700 font-bold">Net Loss</span>
                        <span className="font-bold text-red-600">{formatAmount(totals.netLoss)}</span>
                    </div>
                </>
            )}

            <div className="border-r border-gray-300 p-2 flex justify-between font-bold bg-gray-100">
                <span>Grand Total</span>
                <span>{formatAmount(totals.grandTotalExpense)}</span>
            </div>
            <div className="p-2 flex justify-between font-bold bg-gray-100">
                <span>Grand Total</span>
                <span>{formatAmount(totals.grandTotalExpense)}</span>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {reportType === 'condensed' ? renderCondensedView() : renderDetailedView()}
        </div>
    );
};

export default ProfitAndLossGrid;