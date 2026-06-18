import axiosInstance from '@/lib/axiosConfig';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import useAuth from '@/redux/hook/auth/useAuth';

const PaymentMode = ({ totals, formData, setFormData, finalGrandTotal }) => {
  const [banks, setBanks] = useState([]);
  const [cash, setCash] = useState([]);
  const [balance, setBalance] = useState(0);
  const [paymentMode, setPaymentMode] = useState(formData.paymentMode || 'cash');
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings)
  useEffect(() => {
    fetchBank();
    fetchCash();
  }, []);
  const {selectedBranchId}=useAuth()

  const fetchBank = async () => {
    try {
      const res = await axiosInstance.post('bank-account-ledgers', { group_ids: [5, 6],branchId:selectedBranchId });
      if (res.data && !res.data.error) setBanks(res.data.data);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  const fetchCash = async () => {
    try {
      const res = await axiosInstance.post('bank-account-ledgers', { group_ids: [8],branchId:selectedBranchId });
      if (res.data && !res.data.error) setCash(res.data.data);
    } catch (err) {
      console.error('Error fetching cash:', err);
    }
  };

  const handlePaymentChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    setFormData((prev) => ({
      ...prev,
      paymentMode: mode,
    }));
  };

  useEffect(() => {
    const total = Number(finalGrandTotal) || 0;

    if (paymentMode === 'cash') {
      handlePaymentChange('CashAmount', total);
      handlePaymentChange('BankAmount', 0);
      setBalance(0);
    }
    else if (['card', 'transfer', 'cheque'].includes(paymentMode)) {
      handlePaymentChange('CashAmount', 0);
      handlePaymentChange('BankAmount', total);
      setBalance(0);
    }
    else if (paymentMode === 'credit') {
      handlePaymentChange('CashAmount', 0);
      handlePaymentChange('BankAmount', 0);
      setBalance(total);
    }
  }, [paymentMode, finalGrandTotal]);

  useEffect(() => {
    const cashAmount = Number(formData.CashAmount) || 0;
    const bankAmount = Number(formData.BankAmount) || 0;
    const totalPaid = cashAmount + bankAmount;
    const remainingBalance = (Number(finalGrandTotal) || 0) - totalPaid;
    setBalance(remainingBalance);
  }, [formData.CashAmount, formData.BankAmount, finalGrandTotal]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      BillBalanceAmount: balance,
      paymentMode,
      totalAmount: finalGrandTotal,
    }));
  }, [balance, paymentMode, finalGrandTotal, setFormData]);

  return (
    <div className="p-1 bg-primary dark:bg-primary">
      <div className="bg-secondary dark:bg-secondary rounded p-3">
        <div className="space-y-1">
          {/* Payment Mode Selector */}
          <div className="w-[200px]">
            <select
              value={paymentMode}
              onChange={(e) => handlePaymentModeChange(e.target.value)}
              className="border-themed bg-primary dark:bg-tertiary text-primary dark:text-primary rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          {/* Cash Row */}
          <div className="flex items-center gap-2 text-sm">
            <label className="w-16 text-xs font-medium text-secondary dark:text-secondary">
              {t('salesInvoice.form.footerSection.paymentModeSection.cashLabel')}
            </label>
            <select
              value={formData.CashLedgerId || ''}
              onChange={(e) => handlePaymentChange('CashLedgerId', parseInt(e.target.value))}
              className="border-themed bg-primary dark:bg-tertiary text-primary dark:text-primary rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {cash.map((data) => (
                <option key={data.ledgerId} value={data.ledgerId}>
                  {data.ledgerName}
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-secondary dark:text-secondary">
              {t('salesInvoice.form.footerSection.paymentModeSection.paydAmt')}
            </span>

            <input
              type="number"
               value={Number(formData.CashAmount || 0).toFixed(generalSettings.decimalPart)}
              onChange={(e) => handlePaymentChange('CashAmount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="border-themed bg-primary dark:bg-tertiary text-primary dark:text-primary rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />

            <div className="border-themed rounded px-2 py-1 text-xs bg-tertiary dark:bg-hover text-right font-medium">
              <input
                type="text"
                className="focus:outline-none bg-transparent text-primary dark:text-primary w-full"
                placeholder={t('salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder')}
                value={formData.CashRefNo || ''}
                onChange={(e) => handlePaymentChange('CashRefNo', e.target.value)}
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
              className="border-themed bg-primary dark:bg-tertiary text-primary dark:text-primary rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {banks.map((data) => (
                <option key={data.ledgerId} value={data.ledgerId}>
                  {data.ledgerName}
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-secondary dark:text-secondary">
              {t('salesInvoice.form.footerSection.paymentModeSection.paydAmt')}
            </span>

            <input
              type="number"
             value={Number(formData.BankAmount || 0).toFixed(generalSettings.decimalPart)}
              onChange={(e) => handlePaymentChange('BankAmount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="border-themed bg-primary dark:bg-tertiary text-primary dark:text-primary rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />

            <div className="border-themed rounded px-2 py-1 text-xs bg-tertiary dark:bg-hover text-right font-medium">
              <input
                type="text"
                className="focus:outline-none bg-transparent text-primary dark:text-primary w-full"
                placeholder={t('salesInvoice.form.footerSection.paymentSummery.remarkPlaceHolder')}
                value={formData.BankRefNo || ''}
                onChange={(e) => handlePaymentChange('BankRefNo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Balance Row */}
        <div className="mt-2 pt-2 border-t border-themed">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-medium text-secondary dark:text-secondary">Balance</span>
            <div
              className={`border-2 rounded px-2 py-1 w-24 text-right font-bold text-sm ${balance === 0
                  ? 'border-green-500 text-green-600 dark:border-green-400 dark:text-green-400'
                  : 'border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                }`}
            >
              {balance.toFixed(generalSettings.decimalPart)}
            </div>
          </div>

          {balance < 0 && (
            <div className="flex justify-end text-sm text-red-600 dark:text-red-400">
              {t('salesInvoice.alert.billBalanceAmtError')}
            </div>
          )}
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
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
  finalGrandTotal: PropTypes.number,
};