import axiosInstance from '@/lib/axiosConfig';
import { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';
import { Label } from '@/components/ui/label';
import CrDrLabel from '@/components/common/CrDrLabel';

const PaymentMode = ({ totals, formData, setFormData, finalGrandTotal, banks, cash }) => {

  const [balance, setBalance] = useState(0);
  const [paymentMode, setPaymentMode] = useState(formData.paymentMode || 'cash');
  // ✅ Local state for input values to allow free typing
  const [cashInputValue, setCashInputValue] = useState('');
  const [bankInputValue, setBankInputValue] = useState('');
  const { selectedBranchId, currentCurrency } = useAuth();

  // ✅ Refs to track if user is currently typing
  const isCashFocused = useRef(false);
  const isBankFocused = useRef(false);

  const { t } = useTranslation();
  const { generalSettings, financeSettings } = useSelector((state) => state.settings);
  const [cashLedgerBalance, setCashLedgerBalance] = useState(null);
  const [cashLedgerBalanceLoading, setCashLedgerBalanceLoading] = useState(false);

  const fetchLedgerBalance = async (ledgerId) => {
    try {
      const res = await axiosInstance.get(`get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency.currencyId}`);
      return res.data?.data || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  useEffect(() => {
    const fetchCashBalance = async () => {
      if (!formData.CashLedgerId || paymentMode !== 'cash') {
        setCashLedgerBalance(null);
        return;
      }
      setCashLedgerBalanceLoading(true);
      try {
        const data = await fetchLedgerBalance(formData.CashLedgerId);
        setCashLedgerBalance(data);
      } finally {
        setCashLedgerBalanceLoading(false);
      }
    };
    fetchCashBalance();
  }, [formData.CashLedgerId, paymentMode, selectedBranchId, currentCurrency]);


  // ✅ Memoized payment change handler to prevent recreating on every render
  const handlePaymentChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, [setFormData]);


  const handlePaymentModeChange = (mode) => {
    if (['card', 'transfer', 'cheque'].includes(mode) && banks.length === 0) return;
    setPaymentMode(mode);
    setFormData((prev) => ({ ...prev, paymentMode: mode }));
    // ✅ NEW
    if (mode !== 'cash') setCashLedgerBalance(null);
  };

  // ✅ Helper function to select all text on focus
  const handleSelectAll = (e) => {
    e.target.select();
  };

  // ✅ Handle Cash Amount Change
  const handleCashAmountChange = (e) => {
    const value = e.target.value;
    setCashInputValue(value);
    handlePaymentChange('CashAmount', parseFloat(value) || 0);
  };

  // ✅ Handle Cash Amount Blur (format on leave)
  const handleCashAmountBlur = () => {
    isCashFocused.current = false;
    const numValue = parseFloat(cashInputValue) || 0;
    setCashInputValue(numValue.toFixed(generalSettings?.decimalPart ?? 2));
    handlePaymentChange('CashAmount', numValue);
  };

  // ✅ Handle Cash Amount Focus
  const handleCashAmountFocus = (e) => {
    isCashFocused.current = true;
    const numValue = parseFloat(cashInputValue) || 0;
    if (numValue === 0) {
      setCashInputValue('');
    }
    handleSelectAll(e);
  };

  // ✅ Handle Bank Amount Change
  const handleBankAmountChange = (e) => {
    const value = e.target.value;
    setBankInputValue(value);
    handlePaymentChange('BankAmount', parseFloat(value) || 0);
  };

  // ✅ Handle Bank Amount Blur (format on leave)
  const handleBankAmountBlur = () => {
    isBankFocused.current = false;
    const numValue = parseFloat(bankInputValue) || 0;
    setBankInputValue(numValue.toFixed(generalSettings?.decimalPart ?? 2));
    handlePaymentChange('BankAmount', numValue);
  };

  // ✅ Handle Bank Amount Focus
  const handleBankAmountFocus = (e) => {
    isBankFocused.current = true;
    const numValue = parseFloat(bankInputValue) || 0;
    if (numValue === 0) {
      setBankInputValue('');
    }
    handleSelectAll(e);
  };

  // ✅ Handle payment amounts based on payment mode
  useEffect(() => {
    const total = Number(finalGrandTotal) || 0;

    if (paymentMode === 'cash') {
      handlePaymentChange('CashAmount', total);
      handlePaymentChange('BankAmount', 0);
      if (!isCashFocused.current) {
        setCashInputValue(total.toFixed(generalSettings?.decimalPart ?? 2));
      }
      if (!isBankFocused.current) {
        setBankInputValue((0).toFixed(generalSettings?.decimalPart ?? 2));
      }
      setBalance(0);
    }
    else if (['card', 'transfer', 'cheque'].includes(paymentMode)) {
      handlePaymentChange('CashAmount', 0);
      handlePaymentChange('BankAmount', total);
      if (!isCashFocused.current) {
        setCashInputValue((0).toFixed(generalSettings?.decimalPart ?? 2));
      }
      if (!isBankFocused.current) {
        setBankInputValue(total.toFixed(generalSettings?.decimalPart ?? 2));
      }
      setBalance(0);
    }
    else if (paymentMode === 'credit') {
      const currentCash = Number(formData.CashAmount) || 0;
      const currentBank = Number(formData.BankAmount) || 0;
      const currentTotal = currentCash + currentBank;

      if (currentTotal >= total) {
        handlePaymentChange('CashAmount', 0);
        handlePaymentChange('BankAmount', 0);
        if (!isCashFocused.current) {
          setCashInputValue((0).toFixed(generalSettings?.decimalPart ?? 2));
        }
        if (!isBankFocused.current) {
          setBankInputValue((0).toFixed(generalSettings?.decimalPart ?? 2));
        }
      }
    }
  }, [paymentMode, finalGrandTotal, generalSettings?.decimalPart]);

  // ✅ Sync local input values with formData ONLY when NOT focused
  useEffect(() => {
    const cashValue = Number(formData.CashAmount) || 0;
    const bankValue = Number(formData.BankAmount) || 0;

    if (!isCashFocused.current) {
      setCashInputValue(cashValue.toFixed(generalSettings?.decimalPart ?? 2));
    }

    if (!isBankFocused.current) {
      setBankInputValue(bankValue.toFixed(generalSettings?.decimalPart ?? 2));
    }
  }, [formData.CashAmount, formData.BankAmount, generalSettings?.decimalPart]);

  // ✅ Initialize input values on mount
  useEffect(() => {
    const cashValue = Number(formData.CashAmount) || 0;
    const bankValue = Number(formData.BankAmount) || 0;

    setCashInputValue(cashValue.toFixed(generalSettings?.decimalPart ?? 2));
    setBankInputValue(bankValue.toFixed(generalSettings?.decimalPart ?? 2));
  }, []); // Run only once on mount

  // ✅ Calculate balance
  useEffect(() => {
    const cashAmount = Number(formData.CashAmount) || 0;
    const bankAmount = Number(formData.BankAmount) || 0;
    const totalPaid = cashAmount + bankAmount;
    const remainingBalance = (Number(finalGrandTotal) || 0) - totalPaid;
    setBalance(remainingBalance);
  }, [formData.CashAmount, formData.BankAmount, finalGrandTotal]);

  // ✅ FIXED: Only update formData when values actually change
  useEffect(() => {
    const currentBalance = formData.BillBalanceAmount;
    const currentPaymentMode = formData.paymentMode;
    const currentTotalAmount = formData.totalAmount;

    // Only update if values have changed
    if (
      currentBalance !== balance ||
      currentPaymentMode !== paymentMode ||
      currentTotalAmount !== finalGrandTotal
    ) {
      setFormData((prev) => ({
        ...prev,
        BillBalanceAmount: balance,
        paymentMode,
        totalAmount: finalGrandTotal,
      }));
    }
  }, [balance, paymentMode, finalGrandTotal]);

  const isCreditBalanceInvalid = paymentMode === 'credit' && balance <= 0;
  const isBankEmpty = banks?.length === 0;

  return (
    <div className="p-1 bg-primary dark:bg-primary">
      <div className="bg-primary dark:bg-primary rounded">
        <div className="space-y-1">
          <div className='flex gap-2'>
            {/* Payment Mode Selector */}
            <div className="w-[100px]">
              <Label className="text-[11px] font-medium mb-1 flex justify-between text-gray-700 dark:text-gray-300">Payment Mode</Label>
              <select
                value={paymentMode}
                onChange={(e) => handlePaymentModeChange(e.target.value)}
                className="border border-themed dark:border-themed rounded px-2 py-1 text-xs w-full bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="null">NA</option>
                <option value="cash">Cash</option>
                <option value="card" disabled={isBankEmpty}>
                  Bank {isBankEmpty && '(No bank account)'}
                </option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              {/* Cash Row */}
              <div className="flex items-center gap-2 text-sm">
                <label className="w-16 text-xs font-medium text-secondary dark:text-secondary">
                  {t('salesInvoice.form.footerSection.paymentModeSection.cashLabel')}
                </label>
                <div className="flex flex-col">
                  <select
                    value={formData.CashLedgerId || ''}
                    onChange={(e) => handlePaymentChange('CashLedgerId', parseInt(e.target.value))}
                    className="border border-themed dark:border-themed rounded px-2 py-1 text-xs w-20 bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {cash?.map((data) => (
                      <option key={data.ledgerId} value={data.ledgerId}>
                        {data.ledgerName}
                      </option>
                    ))}
                  </select>

                  {/* ✅ NEW: Cash ledger balance */}
                  {paymentMode === 'cash' && financeSettings?.showLedgerbalance && (
                    <div className="flex items-center text-[10px] text-secondary dark:text-secondary mt-0.5 gap-1">
                      {cashLedgerBalanceLoading ? (
                        <span className="text-muted dark:text-muted">...</span>
                      ) : cashLedgerBalance?.crordr !== undefined ? (
                        <>
                          <span>{t('contraVoucher.form.label.ledgerBalance') || 'Bal'}:</span>
                          <CrDrLabel
                            crordr={cashLedgerBalance.crordr}
                            accountCalculationMethod={generalSettings?.AccountCalculationMethod}
                            balance={cashLedgerBalance.currentbal}
                            decimalPart={generalSettings?.decimalPart ?? 2}
                          />
                        </>
                      ) : (
                        <span className="font-semibold text-primary dark:text-primary">
                          {t('contraVoucher.form.label.ledgerBalance') || 'Bal'}: 0.00
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-secondary dark:text-secondary">
                  {t('salesInvoice.form.footerSection.paymentModeSection.paydAmt')}
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={cashInputValue}
                  onChange={handleCashAmountChange}
                  onFocus={handleCashAmountFocus}
                  onBlur={handleCashAmountBlur}
                  placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                  className="border border-themed dark:border-themed rounded px-2 py-1 text-xs w-24 bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />

                <div className="border border-themed dark:border-themed rounded px-2 py-1 text-xs bg-secondary dark:bg-secondary text-right font-medium">
                  <input
                    type="text"
                    className="focus:outline-none bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted"
                    placeholder={t('salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder')}
                    value={formData.CashRefNo || ''}
                    onChange={(e) => handlePaymentChange('CashRefNo', e.target.value)}
                    onFocus={handleSelectAll}
                  />
                </div>
              </div>

              {/* Bank Row */}
              <div className="flex items-center gap-2 text-sm">
                <label className="w-16 text-xs font-medium text-secondary dark:text-secondary">
                  {t('salesInvoice.form.footerSection.paymentModeSection.bankLabel')}
                </label>
                <select
                  value={formData.BankLedgerId || ''}
                  onChange={(e) => handlePaymentChange('BankLedgerId', parseInt(e.target.value))}
                  className="border border-themed dark:border-themed rounded px-2 py-1 text-xs w-20 bg-primary dark:bg-secondary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={isBankEmpty}
                >
                  {banks?.length > 0 ? (
                    banks?.map((data) => (
                      <option key={data?.ledgerId} value={data?.ledgerId}>
                        {data?.ledgerName}
                      </option>
                    ))
                  ) : (
                    <option value="">No bank accounts</option>
                  )}
                </select>
                <span className="text-xs font-medium text-secondary dark:text-secondary">
                  {t('salesInvoice.form.footerSection.paymentModeSection.paydAmt')}
                </span>

                <input
                  type="text"
                  inputMode="decimal"
                  value={bankInputValue}
                  onChange={handleBankAmountChange}
                  onFocus={handleBankAmountFocus}
                  onBlur={handleBankAmountBlur}
                  placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                  className="border border-themed dark:border-themed rounded px-2 py-1 text-xs w-24 bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  disabled={isBankEmpty}
                />

                <div className="border border-themed dark:border-themed rounded px-2 py-1 text-xs bg-secondary dark:bg-secondary text-right font-medium">
                  <input
                    type="text"
                    className="focus:outline-none bg-transparent text-primary dark:text-primary placeholder:text-muted dark:placeholder:text-muted"
                    placeholder={t('salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder')}
                    value={formData.BankRefNo || ''}
                    onChange={(e) => handlePaymentChange('BankRefNo', e.target.value)}
                    onFocus={handleSelectAll}
                    disabled={isBankEmpty}
                  />
                </div>
              </div>

              {/* Balance row */}
              <div className="mt-2 pt-2 border-t border-themed dark:border-themed">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-medium text-secondary dark:text-secondary">Balance</span>
                  <div
                    className={`border-2 rounded px-2 py-1 w-24 text-right font-bold text-sm ${balance === 0
                      ? 'border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                      : isCreditBalanceInvalid
                        ? 'border-red-500 dark:border-red-400 text-red-600 dark:text-red-400'
                        : 'border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400'
                      }`}
                  >
                    {balance.toFixed(generalSettings.decimalPart)}
                  </div>
                </div>

                {balance < 0 && (
                  <div className="flex justify-end text-xs text-red-600 dark:text-red-400 mt-1">
                    {t('salesInvoice.alert.billBalanceAmtError')}
                  </div>
                )}

                {isCreditBalanceInvalid && (
                  <div className="flex justify-end text-xs text-red-600 dark:text-red-400 mt-1">
                    Credit mode requires a balance amount greater than 0
                  </div>
                )}

                {paymentMode === 'credit' && balance > 0 && (
                  <div className="flex justify-end text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Split payment: Cash + Bank + Balance (Credit)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMode;

PaymentMode.propTypes = {
  totals: PropTypes.shape({
    grandTotal: PropTypes.number,
  }).isRequired,
  formData: PropTypes.shape({
    CashLedgerId: PropTypes.number,
    CashAmount: PropTypes.number,
    BankLedgerId: PropTypes.number,
    BankAmount: PropTypes.number,
    BankRefNo: PropTypes.string,
    CashRefNo: PropTypes.string,
    paymentMode: PropTypes.string,
    BillBalanceAmount: PropTypes.number,
    totalAmount: PropTypes.number,
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
  finalGrandTotal: PropTypes.number,
  banks: PropTypes.array,
  cash: PropTypes.array,
};