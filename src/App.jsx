import './App.css'
import { Routes, Route, HashRouter } from 'react-router-dom'
import 'devextreme/dist/css/dx.light.css';
import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useDispatch, useSelector } from 'react-redux'
import { initializeTheme } from './lib/themeHelper'
import { useLocation } from 'react-router-dom';
import PlanExpiryMarquee from './components/common/PlanExpiryMarquee';

//Pages Import
import BranchSwitchOverlay from './components/common/BranchSwitchOverlay';
import UpdateNotification from './components/common/UpdateNotification';
import UpdatePage from './components/pages/Update/UpdatePage';
import Login from './components/pages/Login'
import Dashboard from './components/pages/DashboardPage/Dashboard'
import Layout from './components/common/Layout'
import EditCompany from './components/pages/Company/EditCompany'
import Navbar from './components/common/Navbar'
import AddBranch from './components/pages/Branch/AddBranch'
import BranchesList from './components/pages/Branch/BranchList'
import AddUser from './components/pages/User/AddUser'
import UserList from './components/pages/User/UserList'
import UserGroups from './components/pages/Master/singleMaster/UserGroups'
import CostCenter from './components/pages/Master/singleMaster/CostCenter'
import Unit from './components/pages/Master/singleMaster/Unit'
import Brand from './components/pages/Master/singleMaster/Brand'
import Godown from './components/pages/Master/singleMaster/Godown'
import PricingLevel from './components/pages/Master/singleMaster/PricingLevel'
import RouteMaster from './components/pages/Master/singleMaster/Route/Route'
import Area from './components/pages/Master/singleMaster/Area'
import Market from './components/pages/Master/singleMaster/Market/Market'
import Settings from './components/pages/Settings/Settings'
import ChangeUserPassword from './components/pages/Settings/ChangeUserPassword'
import PrivateRoute from './components/common/PrivateRoute'
import AccountGroups from './components/pages/Master/multiMasterForms/AccountGroups/AccountGroups'
import NotFound from './components/common/404'
import StockReorderPage from '@/components/pages/notifications/StockReorderPage';

import CurrencyList from './components/pages/Master/multiMasterForms/Currency/CurrencyList'
import ProductMainGroup from './components/pages/Master/multiMasterForms/ProductMainGroup/ProductMainGroup'
import ProductGroup from './components/pages/Master/multiMasterForms/ProductGroup/ProductGroup'
import TaxMaster from './components/pages/Master/multiMasterForms/TaxMaster/TaxMaster'
import AccountLedger from './components/pages/Master/AccountLedger/AccountLedger'
import Bank from './components/pages/Master/Bank/Bank'
import CustomerList from './components/pages/Master/Customer&Supplier/CustomerList'
import AddCustomerPage from './components/pages/Master/Customer&Supplier/AddCustomer'
import SupplierList from './components/pages/Master/Customer&Supplier/SupplierList'
import AddSupplierPage from './components/pages/Master/Customer&Supplier/AddSupplierForm'
import MenuPrivilegeManager from './components/pages/Previlage/SetPrivilage'
import SetPlanVisibleAdmin from './components/pages/AdminPrevilage/SetPlanVisibleAdmin'
import AddBankPage from './components/pages/Master/Bank/AddBank'
import useAuth from './redux/hook/auth/useAuth'
import ProductList from './components/pages/Master/multiMasterForms/Product/ProductList'
import axiosInstance from './lib/axiosConfig'
import FinancialYearList from './components/pages/Master/multiMasterForms/FinancialYear/FinancialYearList'
import CurrencyConvertionList from './components/pages/Master/multiMasterForms/CurrencyConvertion/CurrencyConvertionList'
import DesignationList from './components/pages/Master/multiMasterForms/Designation/DesignationList'
import DepartmentList from './components/pages/Master/multiMasterForms/Department/DepartmentList'
import WorkLocationList from './components/pages/Master/singleMaster/WorkLocation/WorkLocation'
import SuffixPrefixSettings from './components/pages/Settings/SuffixPrefixSettings'
import BulkUpload from './components/pages/Settings/BulkUpload'
import EmployeeList from './components/pages/Payroll/Employee/EmployeeList'
import EmployeeForm from './components/pages/Payroll/Employee/EmployeeForm'
import SalesInvoiceSkin from './components/pages/Transactions/SalesInvoice/SalesInvoiceSkin'
import SalesInvoiceList from './components/pages/Transactions/SalesInvoice/SalesInvoiceList/SalesInvoiceList'
import SalesReturnSkin from './components/pages/Transactions/SalesReturn/SalesReturnSkin'
import SalesReturnList from './components/pages/Transactions/SalesReturn/SalesReturnList/SalesReturnList'
import RecieptVoucherList from './components/pages/Transactions/RecieptVoucher/RecieptVoucherList'
import ReceptVoucherForm from './components/pages/Transactions/RecieptVoucher/ReceptVoucherForm'
import DefaultDataSetupPage from './components/pages/DefaultDataSetupPage/DefaultDataSetupPage'
import SalesQuotationSkin from './components/pages/Transactions/SalesQuotation/SalesQuotationSkin'
import SalesQuotationList from './components/pages/Transactions/SalesQuotation/SalesQuotationList/SalesQuotationList'
import PerformaInvoiceSkin from './components/pages/Transactions/PerformaInvoice/PerformaInvoiceSkin'
import ProformaInvoiceList from './components/pages/Transactions/PerformaInvoice/ProformaInvoiceList/ProformaInvoiceList'
import SalesOrderSkin from './components/pages/Transactions/SalesOrder/SalesOrderSkin'
import SalesOrderList from './components/pages/Transactions/SalesOrder/SalesOrderList/SalesOrderList'
import DeliveryNoteSkin from './components/pages/Transactions/Delivery Note/DeliveryNoteSkin'
import DeliveryNoteList from './components/pages/Transactions/Delivery Note/DeliveryNoteList/DeliveryNoteList'
import useKeyboardShortcuts from './lib/hooks/useKeyboardShortcuts'
import PurchaseCartSkin from './components/pages/Transactions/PurchaseCart/PurchaseCartSkin'
import PurchaseCartList from './components/pages/Transactions/PurchaseCart/PurchaseCartList/PurchaseCartList'
import PurchaseQuotationReport from './components/pages/Reports/PurchaseQuotationReport/PurchaseQuotationReport'
import PurchaseOrderSkin from './components/pages/Transactions/PurchaseOrder/PurchaseOrderSkin'
import PurchaseOrderList from './components/pages/Transactions/PurchaseOrder/PurchaseOrderList/PurchaseOrderList'
import PurchaseInvoiceSkin from './components/pages/Transactions/PurchaseInvoice/PurchaseInvoiceSkin'
import PurchaseInvoiceList from './components/pages/Transactions/PurchaseInvoice/PurchaseInvoiceList/PurchaseInvoiceList'
import PurchaseReturnSkin from './components/pages/Transactions/PurchaseRturn/PurchaseReturnSkin'
import PaymentVoucherForm from './components/pages/Transactions/PaymentVoucher/PaymentVoucherForm'
import PaymentVoucherList from './components/pages/Transactions/PaymentVoucher/PaymentVoucherList'
import ContraVoucherList from './components/pages/Transactions/ContraVoucher/ContraVoucherList'
import ContraVoucherForm from './components/pages/Transactions/ContraVoucher/ContraVoucherForm'
import JournalVoucherList from './components/pages/Transactions/JournalVoucher/JournalVoucherList'
import JournalVoucherForm from './components/pages/Transactions/JournalVoucher/JournalVoucherForm'
import MaterialReceiptSkin from './components/pages/Transactions/MaterialReceipt/MaterialReceiptSkin'
import MaterialReceiptList from './components/pages/Transactions/MaterialReceipt/MaterialReceiptList/MaterialReceiptList'
import PayableVoucherSkin from './components/pages/Transactions/PayableVoucher/PayableVoucherSkin'
import PayableVoucherList from './components/pages/Transactions/PayableVoucher/PayableVoucherList/PayableVoucherList'
import ReceivableVoucherSkin from './components/pages/Transactions/ReceivableVoucher/ReceivableVoucherSkin'
import PhysicalStockSkin from './components/pages/Transactions/PhysicalStock/PhysicalStockSkin'
import PhysicalStockList from './components/pages/Transactions/PhysicalStock/PhysicalStockList/PhysicalStockList'
import DamageStockSkin from './components/pages/Transactions/DamageStock/DamageStockSkin'
import BatchList from './components/pages/Master/multiMasterForms/Batch/BatchList';
import DamageStockList from './components/pages/Transactions/DamageStock/DamageStockList/DamageStockList'
import PrinterSettings from './components/pages/Settings/PrinterSettings'
import PurchaseReturnList from './components/pages/Transactions/PurchaseRturn/PurchaseReturnList/PurchaseReturnList'
import RouteScrollToTop from './components/common/RouteScrollToTop'
import RecievableVoucherList from './components/pages/Transactions/ReceivableVoucher/RecievableVoucherList/RecievableVoucherList';
import HomePage from './components/pages/Home/HomePage';
import GernalReminderList from './components/pages/GeneralReminders/GernalReminderList';
import GenaralReminderForm from './components/pages/GeneralReminders/GenaralReminderForm';
import PrintInvoicePage from './components/pages/Transactions/SalesInvoice/PrintInvoicePage';
import AccountGroupReport from './components/pages/Reports/AccountGroupReport';
import CustomerSuplierReport from './components/pages/Reports/CustomerSuplierReport';
import BarcodeGenerator from './components/pages/BarcodeGenerator/BarcodeGenerator';
import CustomerSupplierStatementReport from './components/pages/Reports/CustomerSupplierStatementReport';
import CashAndBankBook from './components/pages/Reports/CashAndBankBook';
import UnusedStock from './components/pages/Reports/InventoryReports/UnusedStock';
import ReorderLevelStock from './components/pages/Reports/InventoryReports/ReorderLevelStock';
import MaximumLevelStock from './components/pages/Reports/InventoryReports/MaximumLevelStock';
import MinimumLevelStock from './components/pages/Reports/InventoryReports/MinimumLevelStock';
import SlowMovingStock from './components/pages/Reports/InventoryReports/SlowMovingStock';
import FastMovingStock from './components/pages/Reports/InventoryReports/FastMovingStock';
import AccountLedgerReport from './components/pages/Reports/AccountLedgerReport';
import PaymentReport from './components/pages/Reports/PaymentReport/PaymentReport';
import ReceiptReport from './components/pages/Reports/RecieptReport/ReceiptReport';
import DayBookReport from './components/pages/Reports/DayBookReport/DayBookReport';
import TaxSummaryReport from './components/pages/Reports/TaxSummeryReport/TaxSummaryReport';
import ContraReport from './components/pages/Reports/ContraReport/ContraReport';
import JournalReport from './components/pages/Reports/JournalReport/journalReport';
import LedgerDetailedReport from './components/pages/Reports/LedgerDetailedReport/LedgerDetailedReport';
import AddressBookReport from './components/pages/Reports/Cus&SuppAddressBook/AddressBookReport';
import TaxDetailedReport from './components/pages/Reports/TaxDetailedReport/TaxDetailedReport';
import GodownTransferSkin from './components/pages/Transactions/GodownStockTransfer/GodownTransferSkin';
import TaxConsolidatedReport from './components/pages/Reports/TaxConsolidatedReport';
import PriceListReport from './components/pages/Reports/PriceListReport';
import GodownTransferList from './components/pages/Transactions/GodownStockTransfer/GodownTransferList/GodownTransferList';
import StockValueReport from './components/pages/Reports/StockValueReport/StockValueReport';
import StockReport from './components/pages/Reports/StockReport/StockReport';
import ProfitAndLossAnalysis from './components/pages/Reports/ProfitAndLossAnalysis/ProfitAndLossAnalysis';
import IncomAndExpenceReport from './components/pages/Reports/IncomAndExpenceReport/IncomAndExpenceReport';
import IncomAndExpendeetureReport from './components/pages/Reports/IncomAndExpendeetureReport/IncomAndExpendeetureReport';
import CashFlowSummary from './components/pages/Reports/CashFlowSummary/CashFlowSummary';
import FundFlow from './components/pages/Reports/FundFlow/FundFlow';
import AccountGroupChart from './components/pages/Reports/AccountGroupChart/AccountGroupChart';
import AgeingReport from './components/pages/Reports/AgeingReport/AgeingReport';
import SalesOrderVsProductReport from './components/pages/Reports/SalesOrderVsProductReport/SalesOrderVsProductReport';
import DayBookSummary from './components/pages/Reports/DayBookSummary/DayBookSummary';
import SalesOrderReport from './components/pages/Reports/SalesOrderReport/SalesOrderReport';
import MaterialReceiptReport from './components/pages/Reports/MaterialReceiptReport/MaterialReceiptReport';
import PurchaseOrderReport from './components/pages/Reports/PurchaseOrderReport/PurchaseOrderReport';
import DeliveryNoteDetailedReport from './components/pages/Reports/DeliveryNoteDetailedReport/DeliveryNoteDetailedReport';
import SalesReturnDetailedReport from './components/pages/Reports/SalesReturnDetailedReport/SalesReturnDetailedReport';
import PurchaseReport from './components/pages/Reports/PurchaseReport/PurchaseReport';
import ProformaInvoiceDetailedReport from './components/pages/Reports/ProformaInvoiceDetailedReport/ProformaInvoiceDetailedReport';
import MyAccount from './components/pages/Master/MyAccount/MyAccount';
import CostCentreReport from './components/pages/Reports/CostCentreReport.jsx/CostCentreReport';
import BalanceSheetReport from './components/pages/Reports/BalanceSheetReport/BalanceSheetReport';
import PayableVoucherReport from './components/pages/Reports/PayableVoucherReport/PayableVoucherReport';
import PhysicalStockReport from './components/pages/Reports/PhysicalStockReport/PhysicalStockRepot';
import ProductForm from './components/pages/Master/multiMasterForms/Product/ProductForm';
import PurchaseDayReport from './components/pages/Reports/PurchaseDayReport/PurchaseDayReport';
import SalesReport from './components/pages/Reports/SalesReport/SalesReport';
import SalesProfitReport from './components/pages/Reports/SalesProfitReport/SalesProfitReport';
import PurchaseReturnReport from './components/pages/Reports/PurchaseReturnReport/PurchaseReturnReport';
import SalesDayReport from './components/pages/Reports/SalesDayReport/SalesDayReport';
import SalesmanWiseSalesReport from './components/pages/Reports/SalesmanWiseSalesReport/SalesmanWiseSalesReport';
import SalesmanWiseSalesOrderReport from './components/pages/Reports/SalesmanWiseSalesOrderReport/SalesmanWiseSalesOrderReport';
import SalesmanWiseBillsPending from './components/pages/Reports/SalesmanWiseBillsPending/SalesmanWiseBillsPending';
import AreaWiseSalesReport from './components/pages/Reports/AreaWiseSalesReport/AreaWiseSalesReport';
import ProductVsSalesManReport from './components/pages/Reports/ProductVsSalesManReport/ProductVsSalesManReport';
import ProductWiseSalesmanReport from './components/pages/Reports/ProductWiseSalesmanReport/ProductWiseSalesmanReport';
import ProductWiseSalesSummaryReport from './components/pages/Reports/ProductWiseSalesSummaryReport/ProductWiseSalesSummaryReport';
import ProductSearchVoucherWise from './components/pages/Search/ProductSearchVoucherWise/ProductSearchVoucherWise';
// Van Sales
import VanExecutive from './components/pages/Master/VanSales/VanExecutive/VanExecutive'
import AddVanExecutive from './components/pages/Master/VanSales/VanExecutive/AddVanExecutive'
import VanExecutiveSettings from './components/pages/Master/VanSales/VanExecutiveSettings/VanExecutiveSettings'
import AddVanExecutiveSettings from './components/pages/Master/VanSales/VanExecutiveSettings/AddVanExecutiveSettings'
import OfferCreation from './components/pages/Master/OfferCreation/OfferCreation';
import OfferForm from './components/pages/Master/OfferCreation/OfferForm';

// Redux imports
import {
  setFinancialYears,
  setLoading as setFYLoading,
  setError as setFYError,
} from "./redux/slice/financialYearSlice";
import { setError, setLoading, setSettings } from './redux/slice/settingsSlice'
import { checkAuth } from './redux/slice/auth/authSlice'
import { setTheme } from './redux/slice/theme/themeSlice'

import TrialBalance from './components/pages/Reports/TrialBalance/TrialBalance';
import ViewProduct from './components/pages/Master/multiMasterForms/Product/ViewProduct';
import TransactionBatch from './components/pages/Master/multiMasterForms/TransactionBatch/TransactionBatch';
import { fetchAllProducts, fetchAllProductsNoType } from './redux/slice/productSlice';
import ReportFileSettingsList from './components/pages/Settings/ReportFileSettings/ReportFileSettingsList';
import UsedStockSkin from './components/pages/Transactions/UsedStock/UsedStockSkin';
import UsedStockList from './components/pages/Transactions/UsedStock/UsedStockList/UsedStockList';
import PurchaseQuotationSkin from './components/pages/Transactions/PurchaseQuotation/PurchaseQuotationSkin';
import PurchaseQuotationList from './components/pages/Transactions/PurchaseQuotation/PurchaseQuotationList/PurchaseQuotationList';
import ACGroupReport from './components/pages/Reports/ACgroupReport/ACGroupReport';
import SalesQuotationReport from './components/pages/Reports/SalesQuotationReport/SalesQuotationReport';
import DocumentPDF from './components/pages/DocumentPDF';
import AppVersionManagement from './components/pages/AppVersionManagement';
import DeleteSalesEntry from './components/pages/DeleteSalesEntry';
import QRUpdatePage from './components/pages/QRUpdatePage';
import SalesOrderPaymentReport from './components/pages/Reports/SalesOrderPaymentReport/SalesOrderPaymentReport';
import ManufacturingJounralSkin from './components/pages/Transactions/ManufacturingJournal/ManufacturingJounralSkin';
import ManufacturingJournalList from './components/pages/Transactions/ManufacturingJournal/ManufacturingJournalList/ManufacturingJournalList';
import OrderSummeryReport from './components/pages/Reports/OrderSummeryReport/OrderSummeryReport';
import ViewOrderSummery from './components/pages/Reports/OrderSummeryReport/ViewOrderSummery';
import { ProductMovementReport } from './components/pages/Reports/ProductMovementReport/ProductMovementReport';
import PurchaseCartReport from './components/pages/Reports/PurchaseCartReport/PurchaseCartReport';
import StaffHolidayRegister from './components/pages/Payroll/StaffHolidayRegister/StaffHolidayRegister';
import SalaryMasterList from './components/pages/Payroll/SalaryMaster/SalaryMasterList';
import SalaryMasterForm from './components/pages/Payroll/SalaryMaster/SalaryMasterForm';
import PayheadList from './components/pages/Payroll/Payhead/PayheadList';
import SalarySettingsList from './components/pages/Payroll/SalarySettings/SalrySettingsList';
import StaffAttendanceMasterList from './components/pages/Payroll/Payhead/StaffAttendanceMaster/StaffAttendanceMasterList';
import StaffAttendanceMasterForm from './components/pages/Payroll/Payhead/StaffAttendanceMaster/StaffAttendanceMasterForm';
import BonusDeductionMasterList from './components/pages/Payroll/BonusDeductionMaster/BonusDeductionMasterList';
import BonusDeductionMasterForm from './components/pages/Payroll/BonusDeductionMaster/BonusDeductionMasterForm';
import AdvanceSalaryList from './components/pages/Payroll/AdvanceSalary/AdvanceSalaryList';
import AdvanceSalaryForm from './components/pages/Payroll/AdvanceSalary/AdvanceSalaryForm';
import ReceivableVoucherReport from './components/pages/Reports/ReceivableVoucherReport/ReceivableVoucherReport';
import DamageStockReport from './components/pages/Reports/DamageStockReport/DamageStockReport';
import UsedStockReport from './components/pages/Reports/UsedStockReport/UsedStockReport';
import GodownTransferReport from './components/pages/Reports/GodownTransferReport/GodownTransferReport';
import BillBalanceReport from './components/pages/Reports/BillBalanceReport/BillBalanceReport';
import QuickAccessMenu from './components/common/QuickAccessMenu';
import SalesSummaryReport from './components/pages/Reports/SalesSummaryReport/SalesSummaryReport';


// Custom hook to detect network status
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [hasShownAlert, setHasShownAlert] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth()).then(() => {
    });
  }, []);

  const checkInternetConnectivity = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // const response = await fetch('https://www.google.com/favicon.ico', {
      //   method: 'HEAD',
      //   mode: 'no-cors',
      //   cache: 'no-cache',
      //   signal: controller.signal
      // });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch('https://cloudflare.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true;
      } catch (secondError) {
        return false;
      }
    }
  };

  useEffect(() => {
    let checkInterval;

    const updateOnlineStatus = async () => {
      const hasInternet = await checkInternetConnectivity();
      setIsOnline(hasInternet);

      if (hasInternet && !isOnline) {
        setHasShownAlert(false);
      }
    };

    const handleOnline = async () => {
      const hasInternet = await checkInternetConnectivity();
      setIsOnline(hasInternet);
      if (hasInternet) {
        setHasShownAlert(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateOnlineStatus();

    checkInterval = setInterval(updateOnlineStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline && !hasShownAlert) {
      let styleElement = null;

      Swal.fire({
        text: 'Connect internet for better performance',
        confirmButtonText: 'Ok',
        allowOutsideClick: false,
        customClass: {
          popup: 'network-alert-popup',
          confirmButton: 'network-alert-button'
        },
        didOpen: () => {
          styleElement = document.createElement('style');
          styleElement.setAttribute('data-network-alert', 'true');
          styleElement.textContent = `
            .network-alert-popup {
              width: 400px !important;
              height: 120px !important;
              padding: 10px !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              overflow: hidden !important;
            }
            .network-alert-button {
              background-color: #2b216a !important;
              border: none !important;
              padding: 8px 24px !important;
              font-size: 14px !important;
              border-radius: 4px !important;
              cursor: pointer !important;
            }
            .network-alert-button:hover {
              background-color: #3b2d94 !important;
            }
            .network-alert-popup .swal2-actions {
              justify-content: flex-end !important;
              margin-top: auto !important;
              width: 100% !important;
            }
            .network-alert-popup .swal2-html-container {
              text-align: left !important;
              overflow-y: hidden !important;
              padding: 10px !important;
            }
          `;
          document.head.appendChild(styleElement);
        },
        willClose: () => {
          if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
          }
        }
      }).then(() => {
        setHasShownAlert(true);
      });
    }
  }, [isOnline, hasShownAlert]);

  return isOnline;
};

const KeyboardShortcutsWrapper = () => {
  useKeyboardShortcuts({
    "CTRL+F6": (navigate) => navigate("/transaction/reciept-voucher/create-reciept-voucher"),
    "CTRL+F5": (navigate) => navigate("/transaction/payment-voucher/create-payment-voucher"),
    "CTRL+F4": (navigate) => navigate("/transaction/contra-voucher/create-contra-voucher"),
    "CTRL+F7": (navigate) => navigate("/transaction/journal-voucher/create-journal-voucher"),
    "CTRL+F9": (navigate) => navigate("/transaction/purchase-invoice"),
    "ALT+C": (navigate) => navigate("/master/product-creation"),
    "CTRL+D": (navigate) => navigate("/"),
    "CTRL+F8": (navigate) => navigate("/transaction/sales-invoice"),
    "CTRL+F3": (navigate) => navigate("/transaction/sales-order"),
    "CTRL+F10": (navigate) => navigate("/transaction/delivery-note"),
    "CTRL+SHIFT+S": () => alert("Shortcut triggered!"),
  });

  return null;
};

// Network Status Banner Component
const NetworkStatusBanner = ({ isOnline }) => {
  const [showBanner, setShowBanner] = useState(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '12px',
        color: 'white',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        backgroundColor: isOnline ? '#10b981' : '#ef4444',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {isOnline ? (
          <>
            <span>📶</span>
            <span>Connection restored!</span>
          </>
        ) : (
          <>
            <span>❌</span>
            <span>⚠️</span>
            <span>Please connect to the internet</span>
          </>
        )}
      </div>
    </div>
  );
};

function App() {
  const isOnline = useNetworkStatus();
  const dispatch = useDispatch();
  const { organizationData } = useSelector((state) => state.organization);
  const expDate = organizationData?.ExpiryDate
  const { selectedBranchId } = useAuth();
  //  useAutoLogoutOnClose();
  const PurchaseCartWrapper = () => {
    const location = useLocation();
    return <PurchaseCartSkin key={location.key} />;
  };
  // Initialize theme on app load
  useEffect(() => {
    const theme = initializeTheme();
    dispatch(setTheme(theme));
  }, [dispatch]);

  const getBranchSettings = (response, selectedBranchId) => {

    return (
      response?.data?.data?.find(
        item => Number(item.branchId) === Number(selectedBranchId)
      ) || {}
    );
  };

  // Add a new function specifically for zatca settings
  const getZatcaBarcodeSettings = (response) => {
    // Zatca returns data as an array with a single object or directly
    if (response?.data?.data && Array.isArray(response.data.data)) {

      return response.data.data[0] || {};
    }

    return response?.data?.data || {};
  };
  const getPrintSettings = (response) => {
    const data = response?.data?.data;
    if (!Array.isArray(data)) return {};

    return data.reduce((acc, item) => {
      const { formName, printType } = item;

      if (!acc[formName]) acc[formName] = { types: {}, default: null };

      acc[formName].types[printType] = item;

      // Store default print type for this formName
      if (item.isDefault) {
        acc[formName].default = item;
      }

      return acc;
    }, {});
  };
  const initializeSettings = async () => {

    if (!selectedBranchId) return;

    dispatch(setLoading(true));

    try {
      const [general, finance, inventory, purchase, sales, zatca, barcodeSettings, reportFile] = await Promise.all([
        axiosInstance.get("general-settings"),
        axiosInstance.get("finance-settings"),
        axiosInstance.get("inventory-settings"),
        axiosInstance.get("purchase-settings"),
        axiosInstance.get("sales-settings"),
        axiosInstance.get(`zatca/${selectedBranchId}`),
        axiosInstance.get(`get-all-barcodesettings/${selectedBranchId}`),
        axiosInstance.get(`report-file-dev/${selectedBranchId}`), // 👈 added
      ]);


      dispatch(
        setSettings({
          generalSettings: getBranchSettings(general, selectedBranchId),
          financeSettings: getBranchSettings(finance, selectedBranchId),
          inventorySettings: getBranchSettings(inventory, selectedBranchId),
          purchaseSettings: getBranchSettings(purchase, selectedBranchId),
          saleSettings: getBranchSettings(sales, selectedBranchId),
          zatcaSettings: getZatcaBarcodeSettings(zatca),
          barcodeAlignmentSettings: getZatcaBarcodeSettings(barcodeSettings), // 👈 added
          printSettings: getPrintSettings(reportFile), // 👈 added
        })
      );
    } catch (error) {
      console.error("❌ [SETTINGS] Error loading settings:", error);
      dispatch(setError(error.response?.data || "Failed to load settings"));
    }
  };


  useEffect(() => {
    const initializeFinancialYears = async () => {
      if (!selectedBranchId) return;

      dispatch(setFYLoading(true));
      try {
        const res = await axiosInstance.get("financial-years");
        dispatch(setFinancialYears(res.data?.data || []));
      } catch (error) {
        dispatch(setFYError(error.response?.data || "Failed to load financial years"));
      }
    };

    if (selectedBranchId) {
      initializeFinancialYears();
    }
  }, [selectedBranchId, dispatch]);

  useEffect(() => {
    if (selectedBranchId) {
      initializeSettings();
    }
  }, [selectedBranchId]);
  // ----------------------------------Load Products for Invoice Start----------------------------------
  useEffect(() => {
    dispatch(fetchAllProducts());
    dispatch(fetchAllProductsNoType());
  }, [selectedBranchId]);

  // ----------------------------------Load Products for Invoice End----------------------------------
  const hideNavbar = window.location.hash.includes('/invoicepdf');




  return (
    <>
      <BranchSwitchOverlay />
      <HashRouter>
        <NetworkStatusBanner isOnline={isOnline} />
        <PlanExpiryMarquee expDate={expDate} />
        <KeyboardShortcutsWrapper />


        <div style={{ paddingTop: !isOnline ? '48px' : '0px', transition: 'padding-top 0.3s ease' }}>
          {!hideNavbar && <Navbar />}
          <QuickAccessMenu />
          <RouteScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/update" element={<UpdatePage />} />
            <Route path="/app-version-management" element={<AppVersionManagement />} />
            <Route element={<Layout />}>


              <Route path="/qr" element={<PrivateRoute><QRUpdatePage /></PrivateRoute>} />


              <Route path="/master/batch" element={<PrivateRoute><BatchList /></PrivateRoute>} />
              <Route path="/default/set-default-data" element={<DefaultDataSetupPage />} />
              <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/create-new-branch" element={<PrivateRoute><AddBranch /></PrivateRoute>} />
              <Route path="/edit-branch/:branchId" element={<PrivateRoute><AddBranch /></PrivateRoute>} />
              <Route path="/all-branches" element={<PrivateRoute><BranchesList /></PrivateRoute>} />
              <Route path="/add-new-user" element={<PrivateRoute><AddUser /></PrivateRoute>} />
              <Route path="/edit-user/:userId" element={<PrivateRoute><AddUser /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/settings/report-file-settings" element={<PrivateRoute><ReportFileSettingsList /></PrivateRoute>} />
              <Route path="/settings/bulk-upload" element={<PrivateRoute><BulkUpload /></PrivateRoute>} />
              <Route path="/settings/printers" element={<PrivateRoute><PrinterSettings /></PrivateRoute>} />
              {/* Master Pages */}
              <Route path="/master/offer-creation" element={<PrivateRoute><OfferCreation /></PrivateRoute>} />
              <Route path="/master/offer-creation/add" element={<PrivateRoute><OfferForm /></PrivateRoute>} />
              <Route path="/master/offer-creation/edit/:id" element={<PrivateRoute><OfferForm /></PrivateRoute>} />
              <Route path="/master/user-groups" element={<PrivateRoute><UserGroups /></PrivateRoute>} />
              <Route path="/master/user-group/set-privilege/:userGroupId" element={<PrivateRoute><MenuPrivilegeManager /></PrivateRoute>} />
              <Route path="/admin/planvisible/:userGroupId" element={<PrivateRoute><SetPlanVisibleAdmin /></PrivateRoute>} />
              <Route path="/master/account-groups" element={<PrivateRoute><AccountGroups /></PrivateRoute>} />
              <Route path="/master/currency" element={<PrivateRoute><CurrencyList /></PrivateRoute>} />
              <Route path="/master/product-main-group" element={<PrivateRoute><ProductMainGroup /></PrivateRoute>} />
              <Route path="/master/product-group" element={<PrivateRoute><ProductGroup /></PrivateRoute>} />
              <Route path="/master/tax-master" element={<PrivateRoute><TaxMaster /></PrivateRoute>} />
              {/* Single Master Pages */}
              <Route path="/user/users-list" element={<PrivateRoute><UserList /></PrivateRoute>} />
              <Route path="/master/users-list" element={<PrivateRoute><UserList /></PrivateRoute>} />
              <Route path="/master/cost-center" element={<PrivateRoute><CostCenter /></PrivateRoute>} />
              <Route path="/master/unit" element={<PrivateRoute><Unit /></PrivateRoute>} />
              <Route path="/master/brand" element={<PrivateRoute><Brand /></PrivateRoute>} />
              <Route path="/master/godown" element={<PrivateRoute><Godown /></PrivateRoute>} />
              <Route path="/master/pricing-level" element={<PrivateRoute><PricingLevel /></PrivateRoute>} />
              <Route path="/master/route" element={<PrivateRoute><RouteMaster /></PrivateRoute>} />
              <Route path="/master/area" element={<PrivateRoute><Area /></PrivateRoute>} />
              <Route path="/master/market" element={<PrivateRoute><Market /></PrivateRoute>} />
              <Route path="/master/account-ledger" element={<PrivateRoute><AccountLedger /></PrivateRoute>} />
              <Route path="/master/transaction-batch" element={<PrivateRoute><TransactionBatch /></PrivateRoute>} />
              <Route path="/master/bank" element={<PrivateRoute><Bank /></PrivateRoute>} />
              <Route path="/master/bank/create" element={<PrivateRoute><AddBankPage /></PrivateRoute>} />
              <Route path="/master/bank/edit-bank/:editId" element={<PrivateRoute><AddBankPage /></PrivateRoute>} />
              <Route path="/master/customer" element={<PrivateRoute><CustomerList /></PrivateRoute>} />
              <Route path="/master/customer/add-customer" element={<PrivateRoute><AddCustomerPage /></PrivateRoute>} />
              <Route path="/master/customer/edit-customer/:customerId" element={<PrivateRoute><AddCustomerPage /></PrivateRoute>} />
              <Route path="/master/supplier" element={<PrivateRoute><SupplierList /></PrivateRoute>} />
              <Route path="/master/supplier/add-supplier" element={<PrivateRoute><AddSupplierPage /></PrivateRoute>} />
              <Route path="/master/supplier/edit-supplier/:customerId" element={<PrivateRoute><AddSupplierPage /></PrivateRoute>} />
              <Route path="/master/product-creation" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
              <Route path="/master/barcode-generator" element={<PrivateRoute><BarcodeGenerator /></PrivateRoute>} />
              <Route path="/master/product-list/edit-product/:productCode" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
              <Route path="/master/product-list" element={<PrivateRoute><ProductList /></PrivateRoute>} />
              <Route path="/master/product-list/product-details/:productCode" element={<PrivateRoute><ViewProduct /></PrivateRoute>} />
              <Route path="/master/financial-year" element={<PrivateRoute><FinancialYearList /></PrivateRoute>} />
              <Route path="/master/currency-convertion" element={<PrivateRoute><CurrencyConvertionList /></PrivateRoute>} />
              <Route path="/master/designation" element={<PrivateRoute><DesignationList /></PrivateRoute>} />
              <Route path="/master/department" element={<PrivateRoute><DepartmentList /></PrivateRoute>} />
              <Route path="/master/work-location" element={<PrivateRoute><WorkLocationList /></PrivateRoute>} />
              <Route path="/settings/suffix-prefix-settings" element={<PrivateRoute><SuffixPrefixSettings /></PrivateRoute>} />
              <Route path="/settings/change-password" element={<PrivateRoute><ChangeUserPassword /></PrivateRoute>} />
              <Route path="/payroll/employee" element={<PrivateRoute><EmployeeList /></PrivateRoute>} />
              <Route path="/payroll/employee/add-new" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/payroll/employee/edit-employee/:employeeId" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/payroll/staff-holiday-register" element={<PrivateRoute><StaffHolidayRegister /></PrivateRoute>} />
              <Route path="/payroll/payhead" element={<PrivateRoute><PayheadList /></PrivateRoute>} />
              <Route path="/payroll/salary-master" element={<PrivateRoute><SalaryMasterList /></PrivateRoute>} />
              <Route path="/payroll/salary-master/add-new" element={<PrivateRoute><SalaryMasterForm /></PrivateRoute>} />
              <Route path="/payroll/salary-master/edit-salary-master/:salaryMasterId" element={<PrivateRoute><SalaryMasterForm /></PrivateRoute>} />
              <Route path="/payroll/salary-settings" element={<PrivateRoute><SalarySettingsList /></PrivateRoute>} />
              <Route path="/payroll/staff-attendance" element={<StaffAttendanceMasterList />} />
              <Route path="/payroll/staff-attendance/add-new" element={<StaffAttendanceMasterForm />} />
              <Route path="/payroll/staff-attendance/edit/:attendanceId" element={<StaffAttendanceMasterForm />} />
              <Route path="/payroll/bonus-deduction" element={<BonusDeductionMasterList />} />
              <Route path="/payroll/bonus-deduction/add-new" element={<BonusDeductionMasterForm />} />
              <Route path="/payroll/bonus-deduction/edit/:bonusDeductionId" element={<BonusDeductionMasterForm />} />
              <Route path="/payroll/advance-salary" element={<AdvanceSalaryList />} />
              <Route path="/payroll/advance-salary/add-new" element={<AdvanceSalaryForm />} />
              <Route path="/payroll/advance-salary/edit/:advanceSalaryId" element={<AdvanceSalaryForm />} />
              {/* My Account */}
              <Route path="/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
              {/* General Reminders */}
              <Route path="/general/reminders" element={<PrivateRoute><GernalReminderList /></PrivateRoute>} />
              <Route path="/general-reminder/create" element={<PrivateRoute><GenaralReminderForm /></PrivateRoute>} />
              <Route path="/general-reminder/edit/:id" element={<PrivateRoute><GenaralReminderForm /></PrivateRoute>} />
              {/* Transactions - Sales */}
              <Route path="/transaction/sales-invoice" element={<PrivateRoute><SalesInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-invoice/invoice-list/edit-sales-invoice/:salesMasterId" element={<PrivateRoute><SalesInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-invoice/invoice-list" element={<PrivateRoute><SalesInvoiceList /></PrivateRoute>} />
              <Route path="/print-invoice" element={<PrivateRoute><PrintInvoicePage /></PrivateRoute>} />
              {/* Sales Return Routes */}
              <Route path="/transaction/sales-return" element={<PrivateRoute><SalesReturnSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-return/return-list/edit-sales-return/:returnMasterId" element={<PrivateRoute><SalesReturnSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-return/sales-return-list" element={<PrivateRoute><SalesReturnList /></PrivateRoute>} />
              {/* Receipt Voucher Routes */}
              <Route path="/transaction/reciept-voucher" element={<PrivateRoute><RecieptVoucherList /></PrivateRoute>} />
              <Route path="/transaction/reciept-voucher/create-reciept-voucher" element={<PrivateRoute><ReceptVoucherForm /></PrivateRoute>} />
              <Route path="/transaction/reciept-voucher/edit-reciept-voucher/:reciptVoucherId" element={<PrivateRoute><ReceptVoucherForm /></PrivateRoute>} />
              {/* Payment Voucher Routes */}
              <Route path="/transaction/payment-voucher" element={<PrivateRoute><PaymentVoucherList /></PrivateRoute>} />
              <Route path="/transaction/payment-voucher/create-payment-voucher" element={<PrivateRoute><PaymentVoucherForm /></PrivateRoute>} />
              <Route path="/transaction/payment-voucher/edit-payment-voucher/:paymentVoucherId" element={<PrivateRoute><PaymentVoucherForm /></PrivateRoute>} />
              {/* Contra Voucher Routes */}
              <Route path="/transaction/contra-voucher" element={<PrivateRoute><ContraVoucherList /></PrivateRoute>} />
              <Route path="/transaction/contra-voucher/create-contra-voucher" element={<PrivateRoute><ContraVoucherForm /></PrivateRoute>} />
              <Route path="/transaction/contra-voucher/edit-contra-voucher/:contraVoucherId" element={<PrivateRoute><ContraVoucherForm /></PrivateRoute>} />
              {/* Journal Voucher Routes */}
              <Route path="/transaction/journal-voucher" element={<PrivateRoute><JournalVoucherList /></PrivateRoute>} />
              <Route path="/transaction/journal-voucher/create-journal-voucher" element={<PrivateRoute><JournalVoucherForm /></PrivateRoute>} />
              <Route path="/transaction/journal-voucher/edit-journal-voucher/:journalVoucherId" element={<PrivateRoute><JournalVoucherForm /></PrivateRoute>} />
              {/* Sales Quotation Routes */}
              <Route path="/transaction/sales-quotation" element={<PrivateRoute><SalesQuotationSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-quotation/edit-quotation/:saleQuotationId" element={<PrivateRoute><SalesQuotationSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-quotation/quotations" element={<PrivateRoute><SalesQuotationList /></PrivateRoute>} />
              {/* Proforma Invoice Routes */}
              <Route path="/transaction/proforma-invoice" element={<PrivateRoute><PerformaInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/proforma-invoice/edit-proforma-invoice/:proformaInvoiceId" element={<PrivateRoute><PerformaInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/proforma-invoice/proforma-invoice-list" element={<PrivateRoute><ProformaInvoiceList /></PrivateRoute>} />
              {/* Sales Order Routes */}
              <Route path="/transaction/sales-order" element={<PrivateRoute><SalesOrderSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-order/edit-sales-order/:salesOrderId" element={<PrivateRoute><SalesOrderSkin /></PrivateRoute>} />
              <Route path="/transaction/sales-order/sales-order-list" element={<PrivateRoute><SalesOrderList /></PrivateRoute>} />
              {/* Delivery Note Routes */}
              <Route path="/transaction/delivery-note" element={<PrivateRoute><DeliveryNoteSkin /></PrivateRoute>} />
              <Route path="/transaction/delivery-note/edit-delivery-note/:dlvryNoteId" element={<PrivateRoute><DeliveryNoteSkin /></PrivateRoute>} />
              <Route path="/transaction/delivery-note/delivery-note-list" element={<PrivateRoute><DeliveryNoteList /></PrivateRoute>} />
              {/* Purchase Cart Routes */}
              <Route path="/transaction/purchase-cart" element={<PrivateRoute><PurchaseCartWrapper /></PrivateRoute>} />
              <Route path="/transaction/purchase-cart/edit-purchase-cart/:purchaseCartmasterId" element={<PrivateRoute><PurchaseCartSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-cart/purchase-cart-list" element={<PrivateRoute><PurchaseCartList /></PrivateRoute>} />
              {/* Purchase Quotation Routes */}
              <Route path="/transaction/purchase-quotation" element={<PrivateRoute><PurchaseQuotationSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-quotation/edit-purchase-quotation/:purchaseQuotationmasterId" element={<PrivateRoute><PurchaseQuotationSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-quotation/purchase-quotation-list" element={<PrivateRoute><PurchaseQuotationList /></PrivateRoute>} />
              {/* Purchase Order Routes */}
              <Route path="/transaction/purchase-order" element={<PrivateRoute><PurchaseOrderSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-order/edit-purchase-order/:purchaseOrdermasterId" element={<PrivateRoute><PurchaseOrderSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-order/purchase-order-list" element={<PrivateRoute><PurchaseOrderList /></PrivateRoute>} />
              {/* Purchase Invoice Routes */}
              <Route path="/transaction/purchase-invoice" element={<PrivateRoute><PurchaseInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-invoice/edit-purchase-invoice/:purchaseInvoicemasterId" element={<PrivateRoute><PurchaseInvoiceSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-invoice/purchase-invoice-list" element={<PrivateRoute><PurchaseInvoiceList /></PrivateRoute>} />
              {/* Purchase Return Routes */}
              <Route path="/transaction/purchase-return" element={<PrivateRoute><PurchaseReturnSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-return/edit-purchase-return/:purchaseReturnmasterId" element={<PrivateRoute><PurchaseReturnSkin /></PrivateRoute>} />
              <Route path="/transaction/purchase-return/purchase-return-list" element={<PrivateRoute><PurchaseReturnList /></PrivateRoute>} />
              {/* Material Receipt Routes */}
              <Route path="/transaction/material-receipt" element={<PrivateRoute><MaterialReceiptSkin /></PrivateRoute>} />
              <Route path="/transaction/material-receipt/edit/:materialReceiptId" element={<PrivateRoute><MaterialReceiptSkin /></PrivateRoute>} />
              <Route path="/transaction/material-receipt/list" element={<PrivateRoute><MaterialReceiptList /></PrivateRoute>} />
              {/* Payable Voucher Routes */}
              <Route path="/transaction/payable-voucher" element={<PrivateRoute><PayableVoucherSkin /></PrivateRoute>} />
              <Route path="/transaction/payable-voucher/edit/:payableVoucherId" element={<PrivateRoute><PayableVoucherSkin /></PrivateRoute>} />
              <Route path="/transaction/payable-voucher/list" element={<PrivateRoute><PayableVoucherList /></PrivateRoute>} />
              {/* Receivable Voucher Routes */}
              <Route path="/transaction/receivable-voucher" element={<PrivateRoute><ReceivableVoucherSkin /></PrivateRoute>} />
              <Route path="/transaction/receivable-voucher/edit/:receivableVoucherId" element={<PrivateRoute><ReceivableVoucherSkin /></PrivateRoute>} />
              <Route path="/transaction/receivable-voucher/list" element={<PrivateRoute><RecievableVoucherList /></PrivateRoute>} />
              {/* Physical Stock Routes */}
              <Route path="/transaction/physical-stock" element={<PrivateRoute><PhysicalStockSkin /></PrivateRoute>} />
              <Route path="/transaction/physical-stock/edit/:physicalStockId" element={<PrivateRoute><PhysicalStockSkin /></PrivateRoute>} />
              <Route path="/transaction/physical-stock/list" element={<PrivateRoute><PhysicalStockList /></PrivateRoute>} />
              {/* Damage Stock Routes */}
              <Route path="/transaction/damage-stock" element={<PrivateRoute><DamageStockSkin /></PrivateRoute>} />
              <Route path="/transaction/damage-stock/edit/:damageStockId" element={<PrivateRoute><DamageStockSkin /></PrivateRoute>} />
              <Route path="/transaction/damage-stock/list" element={<PrivateRoute><DamageStockList /></PrivateRoute>} />
              {/* Used Stock Routes */}
              <Route path="/transaction/used-stock" element={<PrivateRoute><UsedStockSkin /></PrivateRoute>} />
              <Route path="/transaction/used-stock/edit/:usedStockId" element={<PrivateRoute><UsedStockSkin /></PrivateRoute>} />
              <Route path="/transaction/used-stock/list" element={<PrivateRoute><UsedStockList /></PrivateRoute>} />
              {/* Manufacturing Journal Routes */}
              <Route path="/transaction/manufacturing-journal" element={<PrivateRoute><ManufacturingJounralSkin /></PrivateRoute>} />
              <Route path="/transaction/manufacturing-journal/edit/:journalId" element={<PrivateRoute><ManufacturingJounralSkin /></PrivateRoute>} />
              <Route path="/transaction/manufacturing-journal/list" element={<PrivateRoute><ManufacturingJournalList /></PrivateRoute>} />
              {/* Godown Transfer */}
              <Route path="/transaction/godown-transfer" element={<PrivateRoute><GodownTransferSkin /></PrivateRoute>} />
              <Route path="/transaction/godown-transfer/list" element={<PrivateRoute><GodownTransferList /></PrivateRoute>} />
              <Route path="/transaction/godown-transfer/list/edit-godown-transfer/:transferMasterId" element={<PrivateRoute><GodownTransferSkin /></PrivateRoute>} />
              {/* ========== REPORTS ========== */}
              {/* Account Ledger Report */}
              <Route path="/reports/ledger-report" element={<PrivateRoute><AccountLedgerReport /></PrivateRoute>} />
              {/* Account Group Report */}
              <Route path="/reports/account-ledger-report" element={<PrivateRoute><AccountGroupReport /></PrivateRoute>} />
              {/* Customer & Supplier Report */}
              <Route path="/reports/customer-report" element={<PrivateRoute><CustomerSuplierReport type='customer' /></PrivateRoute>} />
              <Route path="/reports/supplier-report" element={<PrivateRoute><CustomerSuplierReport type='supplier' /></PrivateRoute>} />
              {/* Customer & Supplier Statement Report */}
              <Route path="/reports/customer-statement-report" element={<PrivateRoute><CustomerSupplierStatementReport type='customer' /></PrivateRoute>} />
              <Route path="/reports/supplier-statement-report" element={<PrivateRoute><CustomerSupplierStatementReport type='supplier' /></PrivateRoute>} />
              {/* Cash Book And Bank Book */}
              <Route path="/reports/cash-book" element={<PrivateRoute><CashAndBankBook type='cash' /></PrivateRoute>} />
              <Route path="/reports/bank-book" element={<PrivateRoute><CashAndBankBook type='bank' /></PrivateRoute>} />
              {/* Payment Report */}
              <Route path="/reports/payment-report" element={<PrivateRoute><PaymentReport /></PrivateRoute>} />
              {/* Receipt Report */}
              <Route path="/reports/receipt-report" element={<PrivateRoute><ReceiptReport /></PrivateRoute>} />
              {/* Day Book Report */}
              <Route path="/reports/day-book-report" element={<PrivateRoute><DayBookReport /></PrivateRoute>} />
              {/* Customer Address Book */}
              <Route path="/reports/customer-address-book" element={<PrivateRoute><AddressBookReport type='customer' /></PrivateRoute>} />
              {/* Supplier Address Book */}
              <Route path="/reports/supplier-address-book" element={<PrivateRoute><AddressBookReport type='supplier' /></PrivateRoute>} />
              {/* Contra Report */}
              <Route path="/reports/contra-report" element={<PrivateRoute><ContraReport /></PrivateRoute>} />
              {/* Journal Report */}
              <Route path="/reports/journal-report" element={<PrivateRoute><JournalReport /></PrivateRoute>} />
              {/* Detailed Ledger Report */}
              <Route path="/reports/ledger-detailed-report" element={<PrivateRoute><LedgerDetailedReport /></PrivateRoute>} />
              {/* Tax Summary Report */}
              <Route path="/reports/tax-summary-report" element={<PrivateRoute><TaxSummaryReport /></PrivateRoute>} />
              {/* Tax Detailed Report */}
              <Route path="/reports/tax-detailed-report" element={<PrivateRoute><TaxDetailedReport /></PrivateRoute>} />
              {/* Tax Consolidated Report */}
              <Route path="/reports/tax-consolidated-report" element={<PrivateRoute><TaxConsolidatedReport /></PrivateRoute>} />
              {/* Price List Report */}
              <Route path="/reports/price-list-report" element={<PrivateRoute><PriceListReport /></PrivateRoute>} />
              {/* Stock Value Report */}
              <Route path="/reports/stock-value-report" element={<PrivateRoute><StockValueReport /></PrivateRoute>} />
              {/* Stock Report */}
              <Route path="/reports/stock-report" element={<PrivateRoute><StockReport /></PrivateRoute>} />
              {/* Profit And Loss Analysis */}
              <Route path="/reports/profit-loss-analysis" element={<PrivateRoute><ProfitAndLossAnalysis /></PrivateRoute>} />
              <Route path="/reports/income-expense-report" element={<PrivateRoute><IncomAndExpenceReport /></PrivateRoute>} />
              <Route path="/reports/income-expentiture-report" element={<PrivateRoute><IncomAndExpendeetureReport /></PrivateRoute>} />
              {/* Product Movement Report */}
              <Route path="/reports/product-movement-report" element={<PrivateRoute><ProductMovementReport /></PrivateRoute>} />
              {/* Cost Centre Report */}
              <Route path="/reports/costcentre-report" element={<PrivateRoute><CostCentreReport /></PrivateRoute>} />
              {/* Balance Sheet Report */}
              <Route path="/reports/balance-sheet" element={<PrivateRoute><BalanceSheetReport /></PrivateRoute>} />
              {/* Payable Voucher Report */}
              <Route path="/reports/payable-voucher-report" element={<PrivateRoute><PayableVoucherReport /></PrivateRoute>} />
              {/* Physical Stock Report */}
              <Route path="/reports/physical-stock-report" element={<PrivateRoute><PhysicalStockReport /></PrivateRoute>} />
              <Route path="/reports/sales-quotation-report" element={<PrivateRoute><SalesQuotationReport /></PrivateRoute>} />

              {/* Cash Flow Summary */}
              <Route path="/reports/cash-flow-summary" element={<PrivateRoute><CashFlowSummary /></PrivateRoute>} />
              {/* Fund Flow Reports */}
              <Route path="/reports/fund-flow" element={<PrivateRoute><FundFlow /></PrivateRoute>} />
              <Route path="/reports/purchase-cart-report" element={<PrivateRoute><PurchaseCartReport /></PrivateRoute>} />

              <Route path="/reports/receivable-voucher-report" element={<PrivateRoute><ReceivableVoucherReport /></PrivateRoute>} />
              <Route path="/reports/damage-stock-report" element={<PrivateRoute><DamageStockReport /></PrivateRoute>} />
              <Route path="/reports/used-stock-report" element={<PrivateRoute><UsedStockReport /></PrivateRoute>} />
              <Route path="/reports/godown-transfer-report" element={<PrivateRoute><GodownTransferReport /></PrivateRoute>} />
              <Route path="/reports/bill-balance-report" element={<PrivateRoute><BillBalanceReport /></PrivateRoute>} />
              <Route path="/reports/account-group-chart" element={<PrivateRoute><AccountGroupChart /></PrivateRoute>} />
              <Route path="/reports/ageing-report" element={<PrivateRoute><AgeingReport /></PrivateRoute>} />
              <Route path="/reports/sales-order-vs-product-report" element={<PrivateRoute><SalesOrderVsProductReport /></PrivateRoute>} />
              <Route path="/reports/day-book-summary" element={<PrivateRoute><DayBookSummary /></PrivateRoute>} />
              <Route path="/reports/sales-order-report" element={<PrivateRoute><SalesOrderReport /></PrivateRoute>} />
              <Route path="/transactions/order-summery-report" element={<PrivateRoute><OrderSummeryReport /></PrivateRoute>} />
              <Route path="/transaction/order-summery-report/view/:orderMasterId" element={<PrivateRoute><ViewOrderSummery /></PrivateRoute>} />
              <Route path="/reports/material-receipt-report" element={<PrivateRoute><MaterialReceiptReport /></PrivateRoute>} />
              <Route path="/reports/purchase-order-report" element={<PrivateRoute><PurchaseOrderReport /></PrivateRoute>} />
              <Route path="/reports/purchase-quotation-report" element={<PrivateRoute><PurchaseQuotationReport /></PrivateRoute>} />
              <Route path="/reports/delivery-note-report" element={<PrivateRoute><DeliveryNoteDetailedReport /></PrivateRoute>} />
              <Route path="/reports/sales-return-detailed-report" element={<PrivateRoute><SalesReturnDetailedReport /></PrivateRoute>} />
              <Route path="/reports/purchase-report" element={<PrivateRoute><PurchaseReport /></PrivateRoute>} />
              <Route path="/reports/proforma-invoice-detailed-report" element={<PrivateRoute><ProformaInvoiceDetailedReport /></PrivateRoute>} />
              <Route path="/reports/purchase-day-report" element={<PrivateRoute><PurchaseDayReport /></PrivateRoute>} />
              <Route path="/reports/sales-report" element={<PrivateRoute><SalesReport /></PrivateRoute>} />
              <Route path="/reports/sales-profit-report" element={<PrivateRoute><SalesProfitReport /></PrivateRoute>} />
              <Route path="/reports/purchase-return-report" element={<PrivateRoute><PurchaseReturnReport /></PrivateRoute>} />
              <Route path="/reports/sales-day-report" element={<PrivateRoute><SalesDayReport /></PrivateRoute>} />
              <Route path="/reports/sales-quotation-report" element={<PrivateRoute><SalesQuotationReport /></PrivateRoute>} />
              <Route path="/reports/salesman-wise-sales-report" element={<PrivateRoute><SalesmanWiseSalesReport /></PrivateRoute>} />
              <Route path="/reports/salesman-wise-sales-order-report" element={<PrivateRoute><SalesmanWiseSalesOrderReport /></PrivateRoute>} />
              <Route path="/reports/salesman-wise-bills-pending" element={<PrivateRoute><SalesmanWiseBillsPending /></PrivateRoute>} />
              <Route path="/reports/area-wise-sales-report" element={<PrivateRoute><AreaWiseSalesReport /></PrivateRoute>} />
              <Route path="/reports/product-vs-salesman-report" element={<PrivateRoute><ProductVsSalesManReport /></PrivateRoute>} />
              <Route path="/reports/product-wise-salesman-report" element={<PrivateRoute><ProductWiseSalesmanReport /></PrivateRoute>} />
              <Route path="/reports/product-wise-sales-summary-report" element={<PrivateRoute><ProductWiseSalesSummaryReport /></PrivateRoute>} />
              <Route path="/search/product-search-voucher-wise" element={<PrivateRoute><ProductSearchVoucherWise /></PrivateRoute>} />
              <Route path="/reports/trial-balance" element={<PrivateRoute><TrialBalance /></PrivateRoute>} />
              <Route path="/reports/account-group-report" element={<PrivateRoute><ACGroupReport /></PrivateRoute>} />
              <Route path="/reports/sales-order-payment-report" element={<PrivateRoute><SalesOrderPaymentReport /></PrivateRoute>} />
              <Route path="/reports/fast-moving-stock" element={<FastMovingStock />} />
              <Route path="/reports/slow-moving-stock" element={<SlowMovingStock />} />
              <Route path="/reports/unused-stock" element={<UnusedStock />} />
              <Route path="/reports/reorder-level" element={<ReorderLevelStock />} />
              <Route path="/reports/maximum-level" element={<MaximumLevelStock />} />
              <Route path="/reports/minimum-level" element={<MinimumLevelStock />} />
              <Route path="/admin/delete-sales-entry" element={<PrivateRoute><DeleteSalesEntry /></PrivateRoute>} />
              <Route path="/reports/sales-summary-report" element={<PrivateRoute><SalesSummaryReport/></PrivateRoute>} />

              {/* Van Sales - Van Executive */}
              <Route path="/master/van-sales/van-executive" element={<PrivateRoute><VanExecutive /></PrivateRoute>} />
              <Route path="/master/van-sales/van-executive/create" element={<PrivateRoute><AddVanExecutive /></PrivateRoute>} />
              <Route path="/master/van-sales/van-executive/edit/:editId" element={<PrivateRoute><AddVanExecutive /></PrivateRoute>} />

              {/* Van Sales - Van Executive Settings */}
              <Route path="/master/van-sales/van-executive-settings" element={<PrivateRoute><VanExecutiveSettings /></PrivateRoute>} />
              <Route path="/master/van-sales/van-executive-settings/create" element={<PrivateRoute><AddVanExecutiveSettings /></PrivateRoute>} />
              <Route path="/master/van-sales/van-executive-settings/edit/:editId" element={<PrivateRoute><AddVanExecutiveSettings /></PrivateRoute>} />
              <Route path="/notifications/stock-reorder" element={<StockReorderPage />} />

              <Route path="/invoicepdf/:salesMasterId" element={<DocumentPDF />} />
              {/* 404 Not Found */}
              <Route path="*" element={<NotFound type="notFound" />} />
            </Route>
          </Routes>
        </div>
      </HashRouter>
    </>
  )
}

export default App;