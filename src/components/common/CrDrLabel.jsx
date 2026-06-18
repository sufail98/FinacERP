import React from 'react';

/**
 * CrDrLabel Component
 * Displays Cr/Dr status with balance based on crordr flag and account calculation method
 * 
 * @param {boolean} crordr - true = Cr, false = Dr
 * @param {string} accountCalculationMethod - "CrDr" to show "Cr"/"Dr", else show "-"/"+"
 * @param {number|string} balance - Balance value to display (optional)
 * @param {number} decimalPart - Number of decimal places
 */
const CrDrLabel = ({ crordr, accountCalculationMethod, balance, decimalPart = 2 }) => {
    if (crordr === undefined || crordr === null) return null;

    // Determine label/symbol and if it's CrDr format
    const isCrDrFormat = accountCalculationMethod === "CrDr";
    const symbol = isCrDrFormat
        ? (crordr ? 'Cr' : 'Dr')
        : (crordr ? '' : '');

    // Determine color - Red for Cr (credit), Green for Dr (debit)
    const colorClass = crordr
        ? 'text-red-600 dark:text-red-400'
        : 'text-green-600 dark:text-green-400';

    // Format balance if provided
    // Format balance if provided
    let displayValue = balance;
    if (balance !== undefined && balance !== null) {
        const num = typeof balance === 'number' ? balance : parseFloat(balance);
        if (!isNaN(num)) {
            // ✅ FIX: In CrDr format, use absolute value (sign conveyed by Cr/Dr label)
            displayValue = isCrDrFormat
                ? Math.abs(num).toFixed(decimalPart)
                : num.toFixed(decimalPart);
        } else {
            displayValue = balance;
        }
    }
    return (
        <span className={`font-semibold ${colorClass}`}>
            {!isCrDrFormat && symbol}
            {displayValue !== undefined && displayValue !== null && (
                <> {displayValue}</>
            )}
            {isCrDrFormat && <> {symbol}</>}
        </span>
    );
};

export default CrDrLabel;
