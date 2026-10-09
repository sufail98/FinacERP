import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { CreditCard, Landmark, ReceiptText, Trash2, Wallet } from 'lucide-react';
import AlertBox from '@/components/common/AlertBox';
import BreadCrumb from '@/components/common/BreadCrumb';
import ContentTable from '@/components/common/ContentTable';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import DateFilterSection from './Transactions/Components/DateFilterSection';

const DeleteSalesEntry = () => {
  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);
  const { selectedBranchId } = useAuth();

  const [activeTab, setActiveTab] = useState('salesInvoice');
  const [invoiceList, setInvoiceList] = useState([]);
  const [returnList, setReturnList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // ---- Invoice filter state ----
  const [invoiceFromDate, setInvoiceFromDate] = useState(getTodayDate());
  const [invoiceToDate, setInvoiceToDate] = useState(getTodayDate());
  const [invoiceVoucherCode, setInvoiceVoucherCode] = useState('');
  const [invoiceCustomerSearch, setInvoiceCustomerSearch] = useState('');
  const invoiceVoucherDebounce = useRef(null);
  const invoiceCustomerDebounce = useRef(null);

  // ---- Return filter state ----
  const [returnFromDate, setReturnFromDate] = useState(getTodayDate());
  const [returnToDate, setReturnToDate] = useState(getTodayDate());
  const [returnVoucherCode, setReturnVoucherCode] = useState('');
  const [returnCustomerSearch, setReturnCustomerSearch] = useState('');
  const returnVoucherDebounce = useRef(null);
  const returnCustomerDebounce = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const format = generalSettings?.dateformat || 'dd-MM-yyyy';
    return format.replace('dd', dd).replace('MM', MM).replace('yyyy', yyyy);
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return '';
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${hours}:${minutes} ${ampm}`;
  };

  // ---- Fetch invoices ----
  const fetchSalesInvoices = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : invoiceVoucherCode;
      const currentCustomerSearch = params.customerSearch !== undefined ? params.customerSearch : invoiceCustomerSearch;
      const currentFromDate = params.fromDate !== undefined ? params.fromDate : invoiceFromDate;
      const currentToDate = params.toDate !== undefined ? params.toDate : invoiceToDate;
      const isSearching = currentVoucherCode?.trim();

      const payload = {
        fromDate: isSearching ? null : currentFromDate,
        toDate: isSearching ? null : currentToDate,
        limits: 80,
        page: 1,
        branchId: selectedBranchId,
        vouchercode: currentVoucherCode?.trim() || null,
        customername: currentCustomerSearch?.trim() || null,
        taxType: 'Applicable to product',
      };

      const res = await axiosInstance.post('sales', payload);
      const formattedData = (res?.data?.data || []).map((item, index) => ({
        ...item,
        SNo: index + 1,
        date: formatDate(item.date),
      }));
      setInvoiceList(formattedData);
    } catch (error) {
      console.error('Error fetching sales invoices', error);
      setAlert({
        id: Date.now(),
        type: 'error',
        message: error.response?.data?.message || 'Error fetching sales invoices',
      });
    } finally {
      setLoading(false);
    }
  }, [generalSettings?.dateformat, selectedBranchId, invoiceVoucherCode, invoiceCustomerSearch, invoiceFromDate, invoiceToDate]);

  // ---- Fetch returns ----
  const fetchSalesReturns = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const currentVoucherCode = params.voucherCode !== undefined ? params.voucherCode : returnVoucherCode;
      const currentCustomerSearch = params.customerSearch !== undefined ? params.customerSearch : returnCustomerSearch;
      const currentFromDate = params.fromDate !== undefined ? params.fromDate : returnFromDate;
      const currentToDate = params.toDate !== undefined ? params.toDate : returnToDate;
      const isSearching = currentVoucherCode?.trim() || currentCustomerSearch?.trim();

      const payload = {
        fromDate: isSearching ? null : currentFromDate,
        toDate: isSearching ? null : currentToDate,
        limits: 80,
        page: 1,
        branchId: selectedBranchId,
        vouchercode: currentVoucherCode?.trim() || null,
        customername: currentCustomerSearch?.trim() || null,
      };

      const res = await axiosInstance.post('sales-returns', payload);
      const formattedData = (res?.data?.data || []).map((item, index) => ({
        ...item,
        SNo: index + 1,
        date: (() => {
          const datePart = formatDate(item.date);
          const timePart = formatTime(item.CreatedDate);
          return timePart ? `${datePart} ${timePart}` : datePart;
        })(),
      }));
      setReturnList(formattedData);
    } catch (error) {
      console.error('Error fetching sales returns', error);
      setAlert({
        id: Date.now(),
        type: 'error',
        message: error.response?.data?.message || 'Error fetching sales returns',
      });
    } finally {
      setLoading(false);
    }
  }, [generalSettings?.dateformat, selectedBranchId, returnVoucherCode, returnCustomerSearch, returnFromDate, returnToDate]);

  // Initial load
  useEffect(() => {
    fetchSalesInvoices();
    fetchSalesReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Invoice filter handlers ----
  const handleInvoiceVoucherChange = (e) => {
    const value = e.target.value;
    setInvoiceVoucherCode(value);
    if (invoiceVoucherDebounce.current) clearTimeout(invoiceVoucherDebounce.current);
    invoiceVoucherDebounce.current = setTimeout(() => {
      fetchSalesInvoices({ voucherCode: value, customerSearch: invoiceCustomerSearch });
    }, 300);
  };

  const handleInvoiceCustomerChange = (e) => {
    const value = e.target.value;
    setInvoiceCustomerSearch(value);
    if (invoiceCustomerDebounce.current) clearTimeout(invoiceCustomerDebounce.current);
    invoiceCustomerDebounce.current = setTimeout(() => {
      fetchSalesInvoices({ customerSearch: value, voucherCode: invoiceVoucherCode });
    }, 300);
  };

  const clearInvoiceVoucher = () => {
    setInvoiceVoucherCode('');
    fetchSalesInvoices({ voucherCode: '', customerSearch: invoiceCustomerSearch });
  };

  const clearInvoiceCustomer = () => {
    setInvoiceCustomerSearch('');
    fetchSalesInvoices({ customerSearch: '', voucherCode: invoiceVoucherCode });
  };

  const handleInvoiceFilter = () => {
    if (invoiceVoucherCode?.trim() || invoiceCustomerSearch?.trim()) return;
    if (invoiceFromDate > invoiceToDate) {
      setAlert({ id: Date.now(), type: 'error', message: 'From Date cannot be greater than To Date' });
      return;
    }
    fetchSalesInvoices({ fromDate: invoiceFromDate, toDate: invoiceToDate, voucherCode: '', customerSearch: '' });
  };

  const handleInvoiceReset = () => {
    const today = getTodayDate();
    if (invoiceVoucherDebounce.current) clearTimeout(invoiceVoucherDebounce.current);
    if (invoiceCustomerDebounce.current) clearTimeout(invoiceCustomerDebounce.current);
    setInvoiceFromDate(today);
    setInvoiceToDate(today);
    setInvoiceVoucherCode('');
    setInvoiceCustomerSearch('');
    fetchSalesInvoices({ fromDate: today, toDate: today, voucherCode: '', customerSearch: '' });
  };

  // ---- Return filter handlers ----
  const handleReturnVoucherChange = (e) => {
    const value = e.target.value;
    setReturnVoucherCode(value);
    if (returnVoucherDebounce.current) clearTimeout(returnVoucherDebounce.current);
    returnVoucherDebounce.current = setTimeout(() => {
      fetchSalesReturns({ voucherCode: value, customerSearch: returnCustomerSearch });
    }, 300);
  };

  const handleReturnCustomerChange = (e) => {
    const value = e.target.value;
    setReturnCustomerSearch(value);
    if (returnCustomerDebounce.current) clearTimeout(returnCustomerDebounce.current);
    returnCustomerDebounce.current = setTimeout(() => {
      fetchSalesReturns({ customerSearch: value, voucherCode: returnVoucherCode });
    }, 300);
  };

  const clearReturnVoucher = () => {
    setReturnVoucherCode('');
    fetchSalesReturns({ voucherCode: '', customerSearch: returnCustomerSearch });
  };

  const clearReturnCustomer = () => {
    setReturnCustomerSearch('');
    fetchSalesReturns({ customerSearch: '', voucherCode: returnVoucherCode });
  };

  const handleReturnFilter = () => {
    if (returnVoucherCode?.trim() || returnCustomerSearch?.trim()) return;
    if (returnFromDate > returnToDate) {
      setAlert({ id: Date.now(), type: 'error', message: 'From Date cannot be greater than To Date' });
      return;
    }
    fetchSalesReturns({ fromDate: returnFromDate, toDate: returnToDate, voucherCode: '', customerSearch: '' });
  };

  const handleReturnReset = () => {
    const today = getTodayDate();
    if (returnVoucherDebounce.current) clearTimeout(returnVoucherDebounce.current);
    if (returnCustomerDebounce.current) clearTimeout(returnCustomerDebounce.current);
    setReturnFromDate(today);
    setReturnToDate(today);
    setReturnVoucherCode('');
    setReturnCustomerSearch('');
    fetchSalesReturns({ fromDate: today, toDate: today, voucherCode: '', customerSearch: '' });
  };

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (invoiceVoucherDebounce.current) clearTimeout(invoiceVoucherDebounce.current);
      if (invoiceCustomerDebounce.current) clearTimeout(invoiceCustomerDebounce.current);
      if (returnVoucherDebounce.current) clearTimeout(returnVoucherDebounce.current);
      if (returnCustomerDebounce.current) clearTimeout(returnCustomerDebounce.current);
    };
  }, []);

  const handleDelete = async (id, type) => {
    const result = await Swal.fire({
      title: t('delete.title') || 'Delete record?',
      text: t('delete.text') || 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: t('delete.confirm') || 'Delete',
      cancelButtonText: t('delete.cancel') || 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const endpoint = type === 'invoice' ? `delete-sales/${id}/${selectedBranchId}` : `delete-sales-return/${id}/${selectedBranchId}`;
      const res = await axiosInstance.get(endpoint);
      if (!res.data.error) {
        setAlert({ id: Date.now(), type: 'success', message: t('deleteSuccess') || 'Deleted successfully' });
        if (type === 'invoice') {
          fetchSalesInvoices();
        } else {
          fetchSalesReturns();
        }
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Error deleting record';
      setAlert({ id: Date.now(), type: 'error', message: errMsg });
    }
  };

  const invoiceColumns = useMemo(() => [
    { key: 'SNo', label: t('salesInvoice.list.columns.sno') || 'SNo', sortable: true, align: 'center', width: '60px' },
    { key: 'invoiceNo', label: t('salesInvoice.list.columns.invoiceNo') || 'Invoice No', sortable: true, align: 'left', width: '120px' },
    { key: 'date', label: t('salesInvoice.list.columns.date') || 'Date', sortable: true, align: 'left', width: '140px' },
    { key: 'LedgerName', label: t('salesInvoice.list.columns.cashParty') || 'Ledger', sortable: true, align: 'left', width: '180px' },
    { key: 'customerName', label: t('salesInvoice.list.columns.customerName') || 'Customer', sortable: true, align: 'left', width: '180px' },
    { key: 'paymentMode', label: t('salesInvoice.list.columns.paymentMode') || 'Payment', sortable: true, align: 'left', width: '110px' },
    { key: 'totalAmount', label: t('salesInvoice.list.columns.totalAmt') || 'Total', sortable: true, align: 'right', width: '120px' },
  ], [t]);

  const returnColumns = useMemo(() => [
    { key: 'SNo', label: t('salesInvoice.list.columns.sno') || 'SNo', sortable: true, align: 'center', width: '60px' },
    { key: 'returnNo', label: t('salesInvoice.list.columns.invoiceNo') || 'Return No', sortable: true, align: 'left', width: '120px' },
    { key: 'date', label: t('salesInvoice.list.columns.date') || 'Date', sortable: true, align: 'left', width: '140px' },
    { key: 'LedgerName', label: t('salesInvoice.list.columns.cashParty') || 'Ledger', sortable: true, align: 'left', width: '180px' },
    { key: 'totalAmount', label: t('salesInvoice.list.columns.totalAmt') || 'Total', sortable: true, align: 'right', width: '120px' },
  ], [t]);

  const renderInvoiceCell = (key, row) => {
    if (key === 'totalAmount') {
      return <div className="text-sm text-right">{Number(row.totalAmount || 0).toFixed(generalSettings?.decimalPart || 2)}</div>;
    }
    if (key === 'date') {
      return <div className="text-sm">{row.date} {row.billTime ? row.billTime : ''}</div>;
    }
    if (key === 'paymentMode') {
      const paymentModes = {
        cash: { label: 'Cash', icon: Wallet, className: 'bg-green-100 text-green-700 border-green-200' },
        bank: { label: 'Bank', icon: Landmark, className: 'bg-blue-100 text-blue-700 border-blue-200' },
        credit: { label: 'Credit', icon: CreditCard, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      };
      const mode = paymentModes[row.paymentMode];
      if (!mode) return '-';
      const Icon = mode.icon;
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${mode.className}`}>
          <Icon className="h-3.5 w-3.5" />
          {mode.label}
        </span>
      );
    }
    return row[key] ?? '-';
  };

  const renderReturnCell = (key, row) => {
    if (key === 'totalAmount') {
      return <div className="text-sm text-right">{Number(row.totalAmount || 0).toFixed(generalSettings?.decimalPart || 2)}</div>;
    }
    return row[key] ?? '-';
  };

  const invoiceActions = useMemo(() => [{
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row) => handleDelete(row.salesMasterId, 'invoice'),
    className: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
    tooltip: 'Delete',
  }], []);

  const returnActions = useMemo(() => [{
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row) => handleDelete(row.ReturnMasterId, 'return'),
    className: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
    tooltip: 'Delete',
  }], []);

  const tabs = [
    { key: 'salesInvoice', label: 'Sales Invoice' },
    { key: 'salesReturn', label: 'Sales Return' },
  ];

  const activeData = activeTab === 'salesInvoice' ? invoiceList : returnList;
  const activeColumns = activeTab === 'salesInvoice' ? invoiceColumns : returnColumns;
  const activeActions = activeTab === 'salesInvoice' ? invoiceActions : returnActions;
  const activeRenderCell = activeTab === 'salesInvoice' ? renderInvoiceCell : renderReturnCell;

  if (loading && !invoiceList.length && !returnList.length) {
    return (
      <div className="bg-primary dark:bg-primary">
        <BreadCrumb
          routes={[{ title: 'Admin', url: '#' }, { title: 'Delete Sales Entry', url: '#' }]}
          heading={{ icon: ReceiptText, title: 'Delete Sales Entry' }}
        />
        <Preloader />
      </div>
    );
  }

  return (
    <div className="bg-primary dark:bg-primary min-h-screen">
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <BreadCrumb
        routes={[{ title: 'Admin', url: '#' }, { title: 'Delete Sales Entry', url: '#' }]}
        heading={{ icon: ReceiptText, title: 'Delete Sales Entry' }}
      />

      <div className="mx-auto max-w-7xl p-3">
        <div className="mb-4 flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === tab.key ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'salesInvoice' ? (
          <DateFilterSection
            fromDate={invoiceFromDate}
            toDate={invoiceToDate}
            onFromDateChange={(e) => setInvoiceFromDate(e.target.value)}
            onToDateChange={(e) => setInvoiceToDate(e.target.value)}
            onFilter={handleInvoiceFilter}
            onReset={handleInvoiceReset}
            loading={loading}
            totalRecords={invoiceList.length}
            showTotalRecords={true}
            showVoucherCode={true}
            voucherCode={invoiceVoucherCode}
            onVoucherCodeChange={handleInvoiceVoucherChange}
            onClearVoucherCode={clearInvoiceVoucher}
            voucherCodePlaceholder={t('Search by Invoice No...')}
            voucherCodeLabel={t('Invoice No')}
            disableDates={!!invoiceVoucherCode?.trim()}
            staticSearchable={true}
            customerSearch={invoiceCustomerSearch}
            onCustomerSearchChange={handleInvoiceCustomerChange}
            onClearCustomerSearch={clearInvoiceCustomer}
            customerSearchPlaceholder={t('Search by Customer Name and Number')}
            customerSearchLabel={t('Customer Name and Number')}
            filterButtonText={t('common.show') || 'Show'}
          />
        ) : (
          <DateFilterSection
            fromDate={returnFromDate}
            toDate={returnToDate}
            onFromDateChange={(e) => setReturnFromDate(e.target.value)}
            onToDateChange={(e) => setReturnToDate(e.target.value)}
            onFilter={handleReturnFilter}
            onReset={handleReturnReset}
            loading={loading}
            totalRecords={returnList.length}
            showTotalRecords={true}
            showVoucherCode={true}
            voucherCode={returnVoucherCode}
            onVoucherCodeChange={handleReturnVoucherChange}
            onClearVoucherCode={clearReturnVoucher}
            voucherCodePlaceholder={t('Search by Return No...')}
            voucherCodeLabel={t('Return No')}
            disableDates={!!returnVoucherCode?.trim() || !!returnCustomerSearch?.trim()}
            staticSearchable={true}
            customerSearch={returnCustomerSearch}
            onCustomerSearchChange={handleReturnCustomerChange}
            onClearCustomerSearch={clearReturnCustomer}
            customerSearchPlaceholder={t('Search by Ledger Name...')}
            customerSearchLabel={t('Ledger Name')}
            filterButtonText={t('common.show') || 'Show'}
          />
        )}

        <ContentTable
          columns={activeColumns}
          data={activeData}
          actions={activeActions}
          loading={loading}
          renderCell={activeRenderCell}
          tableId={activeTab === 'salesInvoice' ? 'delete-sales-invoice-table' : 'delete-sales-return-table'}
          maxHeight="65vh"
          stickyActions={true}
        />
      </div>
    </div>
  );
};

export default DeleteSalesEntry;