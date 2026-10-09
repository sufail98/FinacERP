import axiosInstance from '@/lib/axiosConfig';
import { LuRefreshCcwDot } from "react-icons/lu";
import { store } from "@/redux/store";
const orgData = store.getState().organization;


import {
  // Finance Reports
  accountLedgerReportSvg,
  accountGroupReportSvg,
  customerReportSvg,
  ageingReportSvg,
  dayBookSummarySvg,
  supplierReportSvg,
  customerStatementReportSvg,
  supplierStatementReportSvg,
  cashBookSvg,
  bankBookSvg,
  paymentReportSvg,
  receiptReportSvg,
  dayBookReportSvg,
  customerAddressBookSvg,
  supplierAddressBookSvg,
  contraReportSvg,
  journalReportSvg,
  ledgerDetailedReportSvg,
  taxSummaryReportSvg,
  taxDetailedReportSvg,
  taxConsolidatedReportSvg,
  costCentreReportSvg,
  payableVoucherReportSvg,
  accountGroupChartSvg,
  // Finance Statements
  profitLossAnalysisSvg,
  balanceSheetReportSvg,
  fundFlowSvg,
  fundFlowDetailedSvg,
  trialBalanceSvg,
  // Sales Reports
  salesDayReportSvg,
  salesReportSvg,
  salesSummaryReportSvg,
  salesOrderReportSvg,
  salesOrderVsProductReportSvg,
  salesReturnDetailedReportSvg,
  deliveryNoteReportSvg,
  proformaInvoiceDetailedReportSvg,
  salesmanWiseSalesReportSvg,
  salesmanWiseSalesOrderReportSvg,
  salesmanWiseBillsPendingSvg,
  areaWiseSalesReportSvg,
  productVsSalesmanReportSvg,
  productWiseSalesmanReportSvg,
  productWiseSalesSummaryReportSvg,
  // Purchase Reports
  purchaseDayReportSvg,
  purchaseReportSvg,
  purchaseReturnReportSvg,
  materialReceiptReportSvg,
  purchaseOrderReportSvg,
  // Inventory Reports
  priceListReportSvg,
  stockValueReportSvg,
  stockReportSvg,
  productMovementReportSvg,
  physicalStockReportSvg,
  // Transaction - Sales
  salesQuotationSvg,
  proformaInvoiceSvg,
  salesOrderSvg,
  deliveryNoteSvg,
  salesInvoiceSvg,
  salesReturnSvg,
  // Transaction - Purchase
  purchaseCartSvg,
  purchaseQuotationSvg,
  purchaseOrderSvg,
  materialReceiptSvg,
  purchaseInvoiceSvg,
  purchaseReturnSvg,
  // Transaction - Vouchers
  receiptVoucherSvg,
  paymentVoucherSvg,
  contraVoucherSvg,
  journalVoucherSvg,
  payableVoucherSvg,
  receivableVoucherSvg,
  // Transaction - Stock
  physicalStockSvg,
  damageStockSvg,
  usedStockSvg,
  godownTransferSvg,
  // Masters - Finance
  accountLedgerMasterSvg,
  accountGroupMasterSvg,
  costCenterMasterSvg,
  bankMasterSvg,
  customerMasterSvg,
  supplierMasterSvg,
  // Masters - Inventory
  productCreationSvg,
  batchMasterSvg,
  transactionBatchSvg,
  productMainGroupSvg,
  productGroupSvg,
  unitMasterSvg,
  brandMasterSvg,
  godownMasterSvg,
  taxMasterSvg,
  // Masters - Sales
  pricingLevelSvg,
  routeMasterSvg,
  areaMasterSvg,
  marketMasterSvg,
  // Masters - Van Sales
  vanExecutiveSvg,
  vanExecutiveSettingsSvg,
  // Masters - General
  designationMasterSvg,
  departmentMasterSvg,
  workLocationMasterSvg,
  // Masters - User
  usersSvg,
  userGroupsSvg,
  employeeSvg,
  reminderSvg,
  newFinancialYearSvg,
  financialYearEditSvg,
  financialYearChangeSvg,
  financialYearCloseSvg,
  currencyMasterSvg,
  currencyConvertionSvg,
  suffixPrefixSettingsSvg,
  reportFileSettingsSvg,
  mainSettingsSvg
} from './reportSvgLogos';
import {
  Power,
  Split,
  BarChart3,
  Home,
  User,
  UserCog,
  UserRoundCog,
  BarChart,
  FileText,
  Shield,
  Database,
  CalendarDays,
  RotateCcw,
  Mail,
  PackageCheck,
  ClipboardList,
  Calendar,
  Building2,
  RefreshCcw,
  AlertTriangle,
  MapPin,
  Package,
  Truck,
  DollarSign,
  Route,
  Map,
  Store,
  Users,
  Coins,
  Archive,
  Calculator,
  CreditCard,
  Building,
  UserPlus,
  Warehouse,
  Tags,
  Layers,
  Search,
  Receipt,
  HandCoins,
  BookOpen,
  Banknote,
  ShoppingCart,
  UserCheck,
  PackagePlus,
  UserPen,
  Wallet,
  Briefcase,
  MapPinIcon,
  Wrench,
  Settings2,
  Settings,
  UsersRound,
  ScanLine,
  ReceiptText,
  BaggageClaim,
  Newspaper,
  ArrowLeftRight,
  LayoutDashboard,
  BookText,
  UserSquare,
  Landmark,
  GitBranch,
  TrendingUp,
  Clock,
  Boxes,
  LayoutGrid,
  Ruler,
  MapPinned,
  CalendarPlus,
  ListOrdered,
  CalendarCog,
  CalendarCheck,
  CalendarX,
  FileCheck,
  ShoppingBag,
  PackageOpen,
  Book,
  BookMarked,
  BookCopy,
  NotebookText,
  ScrollText,
  CalendarRange,
  Codesandbox,
  Bell,
  ShoppingBasket,
  QrCode,
  FileUp,
  PackageX,
  RefreshCw,
  ArrowUpToLine,
  ArrowDownToLine,
  Hourglass,
  Zap
} from 'lucide-react';


export const iconMap = {
  CalendarRange,
  Bell,
  PackageX,
  RefreshCw,
  ArrowUpToLine,
  ArrowDownToLine,
  Hourglass,
  Zap,
  QrCode,
  ClipboardList,
  ScrollText,
  NotebookText,
  BookCopy,
  Book,
  BookMarked,
  PackageOpen,
  ShoppingBag,
  FileCheck,
  CalendarX,
  CalendarCheck,
  Boxes,
  BarChart3,
  Briefcase,
  UserPen,
  Power,
  LayoutDashboard,
  LayoutGrid,
  BookOpen,
  PackageCheck,
  Split,
  AlertTriangle,
  ArrowLeftRight,
  Home,
  User,
  Wallet,
  RotateCcw,
  CalendarDays,
  UserCog,
  Search,
  HandCoins,
  UserRoundCog,
  Settings,
  BarChart,
  FileText,
  Shield,
  Database,
  Mail,
  Calendar,
  Building2,
  MapPin,
  Package,
  Truck,
  RefreshCcw,
  DollarSign,
  Route,
  Map,
  Store,
  Users,
  Coins,
  Archive,
  Calculator,
  CreditCard,
  Building,
  UserPlus,
  Warehouse,
  Tags,
  Layers,
  Receipt,
  Banknote,
  ShoppingCart,
  UserCheck,
  PackagePlus,
  MapPinIcon,
  Wrench,
  Settings2,
  UsersRound,
  ScanLine,
  ReceiptText,
  BaggageClaim,
  Newspaper,
  LuRefreshCcwDot,
  BookText,
  UserSquare,
  Landmark,
  GitBranch,
  TrendingUp,
  Clock,
  Ruler,
  MapPinned,
  CalendarPlus,
  ListOrdered,
  CalendarCog,
  Codesandbox,
  ShoppingBasket,
  FileUp
};


const defaultMenuData = {
  "menuItems": [
    // ==================== COMPANY ====================
    {
      "id": "company",
      "labelEn": "Company Details",
      "labelAr": "الشركة",
      "icon": "Building2",
      "children": [
        {
          "id": "company-group",
          "labelEn": "Company Details",
          "labelAr": "تفاصيل الشركة",
          "isGroupHeader": true,
          "icon": "Building2"
        },
        {
          "id": "all-branches",
          "labelEn": "Branch",
          "labelAr": "جميع الفروع",
          "icon": "MapPin",
          "url": "/all-branches",
          "group": "company"
        }
      ]
    },

    // ==================== MASTER ====================
    {
      "id": "master",
      "labelEn": "Master",
      "labelAr": "الرئيسي",
      "icon": "Settings",
      "children": [
        {
          "id": "finance-group",
          "labelEn": "Finance",
          "labelAr": "المالية",
          "isGroupHeader": true,
          "icon": "DollarSign"
        },
        {
          "id": "accountLedger",
          "labelEn": "Account Ledger",
          "labelAr": "دفتر الحسابات",
          "icon": "BookOpen",
          "url": "/master/account-ledger",
          "group": "finance",
          "svgLogo": accountLedgerMasterSvg
        },
        {
          "id": "accountGroup",
          "labelEn": "Account Group",
          "labelAr": "مجموعة الحسابات",
          "icon": "Layers",
          "url": "/master/account-groups",
          "group": "finance",
          "svgLogo": accountGroupMasterSvg
        },
        {
          "id": "constCenter",
          "labelEn": "Cost Center",
          "labelAr": "مركز التكلفة",
          "icon": "Calculator",
          "url": "/master/cost-center",
          "group": "finance",
          "requiresSetting": "costCentre",
          "svgLogo": costCenterMasterSvg
        },
        {
          "id": "bank",
          "labelEn": "Bank",
          "labelAr": "البنك",
          "icon": "CreditCard",
          "url": "/master/bank",
          "svgLogo": bankMasterSvg,
          "group": "finance"
        },
        {
          "id": "customer",
          "labelEn": "Customer",
          "labelAr": "العميل",
          "icon": "UserCheck",
          "url": "/master/customer",
          "group": "finance",
          "svgLogo": customerMasterSvg
        },
        {
          "id": "supplier",
          "labelEn": "Supplier",
          "labelAr": "المورد",
          "icon": "Truck",
          "url": "/master/supplier",
          "group": "finance",
          "svgLogo": supplierMasterSvg
        },
        {
          "id": "inventory-group",
          "labelEn": "Inventory",
          "labelAr": "إدارة المخزون",
          "isGroupHeader": true,
          "icon": "Boxes"
        },
        {
          "id": "productCreation",
          "labelEn": "Product Creation",
          "labelAr": "إنشاء المنتج",
          "shortKey": "Alt+C",
          "icon": "PackagePlus",
          "url": "/master/product-creation",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },
        {
          "id": "productList",
          "labelEn": "Product List",
          "labelAr": " قائمة المنتجات",
          // "shortKey": "Alt+L",
          "icon": "Package",
          "url": "/master/product-list",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },
        {
          "id": "barcodeGenerator",
          "labelEn": "Barcode Generator",
          "labelAr": "مولد الرموز الشريطية",
          "icon": "QrCode",
          "url": "/master/barcode-generator",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },
        {
          "id": "batch",
          "labelEn": "Batch",
          "labelAr": "الدفعة",
          "icon": "Boxes",
          "url": "/master/batch",
          "group": "inventory",
          "svgLogo": batchMasterSvg
        },
        {
          "id": "transactionBatch",
          "labelEn": "Transaction Batch",
          "labelAr": "دفعة المعاملات",
          "icon": "Codesandbox",
          "url": "/master/transaction-batch",
          "group": "inventory",
          "svgLogo": transactionBatchSvg
        },
        {
          "id": "productMainGroup",
          "labelEn": "Product Main Group",
          "labelAr": "المجموعة الرئيسية للمنتجات",
          "icon": "LayoutGrid",
          "url": "/master/product-main-group",
          "group": "inventory",
          "svgLogo": productMainGroupSvg
        },
        {
          "id": "productGroup",
          "labelEn": "Product Group",
          "labelAr": "مجموعة المنتجات",
          "icon": "Layers",
          "url": "/master/product-group",
          "group": "inventory",
          "svgLogo": productGroupSvg
        },
        {
          "id": "unit",
          "labelEn": "Unit",
          "labelAr": "الوحدة",
          "icon": "Ruler",
          "url": "/master/unit",
          "group": "inventory",
          "svgLogo": unitMasterSvg
        },
        {
          "id": "brand",
          "labelEn": "Brand",
          "labelAr": "العلامة التجارية",
          "icon": "Tags",
          "url": "/master/brand",
          "group": "inventory",
          "svgLogo": brandMasterSvg
        },
        {
          "id": "godown",
          "labelEn": "Godown",
          "labelAr": "المخزن",
          "icon": "Warehouse",
          "url": "/master/godown",
          "group": "inventory",
          "requiresSetting": "ActiveGodown",
          "svgLogo": godownMasterSvg
        },
        {
          "id": "taxMaster",
          "labelEn": "Tax Master",
          "labelAr": "الضرائب",
          "icon": "Receipt",
          "url": "/master/tax-master",
          "group": "inventory",
          "requiresSetting": "ActivateTax",
          "svgLogo": taxMasterSvg
        },
        {
          "id": "sales-group",
          "labelEn": "Sales",
          "labelAr": "المبيعات",
          "isGroupHeader": true,
          "icon": "DollarSign"
        },
        {
          "id": "pricingLevel",
          "labelEn": "Pricing Level",
          "labelAr": "مستوى التسعير",
          "icon": "DollarSign",
          "url": "/master/pricing-level",
          "group": "sales",
          "svgLogo": pricingLevelSvg
        },
        {
          "id": "route",
          "labelEn": "Route",
          "labelAr": "المسار",
          "icon": "Route",
          "url": "/master/route",
          "group": "sales",
          "svgLogo": routeMasterSvg
        },
        {
          "id": "area",
          "labelEn": "Area",
          "labelAr": "المنطقة",
          "icon": "Map",
          "url": "/master/area",
          "group": "sales",
          "svgLogo": areaMasterSvg
        },
        {
          "id": "market",
          "labelEn": "Market",
          "labelAr": "السوق",
          "icon": "Store",
          "url": "/master/market",
          "group": "sales",
          "svgLogo": marketMasterSvg
        },
        {
          "id": "van-sales-group",
          "labelEn": "Van Sales",
          "labelAr": "مبيعات الفان",
          "isGroupHeader": true,
          "icon": "Truck"
        },
        {
          "id": "vanExecutive",
          "labelEn": "Van Executive",
          "labelAr": "مندوب الفان",
          "icon": "Truck",
          "url": "/master/van-sales/van-executive",
          "group": "van-sales",
          "requiresSetting": "activateVanSale",
          "svgLogo": vanExecutiveSvg
        },
        {
          "id": "vanExecutiveSettings",
          "labelEn": "Van Executive Settings",
          "labelAr": "إعدادات مندوب الفان",
          "icon": "Settings2",
          "url": "/master/van-sales/van-executive-settings",
          "group": "van-sales",
          "requiresSetting": "activateVanSale",
          "svgLogo": vanExecutiveSettingsSvg
        },
        {
          "id": "general-group",
          "labelEn": "General",
          "labelAr": "عام",
          "isGroupHeader": true,
          "icon": "Settings2"
        },
        {
          "id": "designation",
          "labelEn": "Designation",
          "labelAr": "التعيين",
          "icon": "UserPen",
          "url": "/master/designation",
          "group": "general",
          "svgLogo": designationMasterSvg
        },
        {
          "id": "department",
          "labelEn": "Department",
          "labelAr": "القسم",
          "icon": "Briefcase",
          "url": "/master/department",
          "group": "general",
          "svgLogo": departmentMasterSvg
        },
        {
          "id": "worklocation",
          "labelEn": "Work Location",
          "labelAr": "موقع العمل",
          "icon": "MapPinned",
          "url": "/master/work-location",
          "group": "general",
          "svgLogo": workLocationMasterSvg
        }
      ].filter(Boolean)
    },

    // ==================== USER ====================
    {
      "id": "user",
      "labelEn": "User",
      "labelAr": "المستخدم",
      "icon": "User",
      "children": [
        {
          "id": "user-group",
          "labelEn": "User",
          "labelAr": "المستخدم",
          "isGroupHeader": true,
          "icon": "User"
        },
        {
          "id": "users",
          "labelEn": "Users",
          "labelAr": "المستخدمين",
          "icon": "Users",
          "url": "/user/users-list",
          "group": "user",
          "svgLogo": usersSvg
        },
        {
          "id": "userGroup",
          "labelEn": "User Group",
          "labelAr": "مجموعة المستخدمين",
          "icon": "UserCog",
          "url": "/master/user-groups",
          "group": "user",
          "svgLogo": userGroupsSvg
        }
      ]
    },

    // ==================== PAYROLL ====================
    {
      "id": "payroll",
      "labelEn": "Payroll",
      "labelAr": "الرواتب",
      "icon": "UsersRound",
      "children": [
        {
          "id": "payroll-group",
          "labelEn": "Payroll",
          "labelAr": "الرواتب",
          "isGroupHeader": true,
          "icon": "UsersRound"
        },
        {
          "id": "employee",
          "labelEn": "Employee",
          "labelAr": "الموظف",
          "icon": "UserPlus",
          "url": "/payroll/employee",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "salarySettings",
          "labelEn": "Salary Settings",
          "labelAr": "إعدادات الرواتب",
          "icon": "Settings2",
          "url": "/payroll/salary-settings",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "staffHolidayRegister",
          "labelEn": "Staff Holiday Register",
          "labelAr": "سجل الإجازات الخاصة بالموظفين",
          "icon": "Calendar",
          "url": "/payroll/staff-holiday-register",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "payHead",
          "labelEn": "Pay Head",
          "labelAr": "رأس الراتب",
          "icon": "DollarSign",
          "url": "/payroll/payhead",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "salaryMaster",
          "labelEn": "Salary Master",
          "labelAr": "سجل الرواتب",
          "icon": "DollarSign",
          "url": "/payroll/salary-master",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "staffAttentanceMaster",
          "labelEn": "Staff Attendance",
          "labelAr": "سجل حضور وغياب الموظفين",
          "icon": "UserCheck",
          "url": "/payroll/staff-attendance",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "bonusDeductionMaster",
          "labelEn": "Bonus and Deduction",
          "labelAr": "المكافآت والخصومات",
          "icon": "UserCheck",
          "url": "/payroll/bonus-deduction",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
        {
          "id": "advanceSalary",
          "labelEn": "Advance Salary",
          "labelAr": "سلفة الراتب",
          "icon": "UserCheck",
          "url": "/payroll/advance-salary",
          "group": "payroll",
          "svgLogo": employeeSvg
        },
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║          1. SALES (Transactions + Reports)       ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "sales",
      "labelEn": "Sales",
      "labelAr": "المبيعات",
      "icon": "ShoppingCart",
      "children": [
        // ── Transactions ──
        {
          "id": "sales-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "salesQuotation",
          "labelEn": "Sales Quotation",
          "labelAr": "عرض سعر المبيعات",
          "icon": "FileText",
          "url": "/transaction/sales-quotation",
          "svgLogo": salesQuotationSvg,
          "group": "sales-transactions"
        },
        {
          "id": "proformaInvoice",
          "labelEn": "Proforma Invoice",
          "labelAr": "فاتورة أولية",
          "icon": "FileCheck",
          "url": "/transaction/proforma-invoice",
          "svgLogo": proformaInvoiceSvg,
          "group": "sales-transactions"
        },
        {
          "id": "salesOrder",
          "labelEn": "Sales Order",
          "shortKey": "Ctrl+F3",
          "labelAr": "أمر المبيعات",
          "icon": "ShoppingBag",
          "url": "/transaction/sales-order",
          "svgLogo": salesOrderSvg,
          "group": "sales-transactions"
        },
        {
          "id": "deliveryNote",
          "labelEn": "Delivery Note",
          "labelAr": "إشعار التسليم",
          "shortKey": "Ctrl+F10",
          "icon": "PackageOpen",
          "url": "/transaction/delivery-note",
          "svgLogo": deliveryNoteSvg,
          "group": "sales-transactions"
        },
        {
          "id": "salesInvoice",
          "labelEn": "Sales Invoice",
          "shortKey": "Ctrl+F8",
          "labelAr": "فاتورة مبيعات",
          "icon": "ReceiptText",
          "url": "/transaction/sales-invoice",
          "svgLogo": salesInvoiceSvg,
          "group": "sales-transactions"
        },
        {
          "id": "salesReturn",
          "labelEn": "Sales Return",
          "labelAr": "مرتجع المبيعات",
          "icon": "RefreshCcw",
          "url": "/transaction/sales-return",
          "svgLogo": salesReturnSvg,
          "group": "sales-transactions"
        },

        // ── Reports ──
        {
          "id": "sales-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "sales-quotation-report",
          "labelEn": "Sales Quotation Report",
          "labelAr": "تقرير عرض سعر المبيعات",
          "icon": "FileText",
          "url": "/reports/sales-quotation-report",
          "svgLogo": salesQuotationSvg,
          "group": "sales-reports"
        },
        {
          "id": "proforma-invoice-report",
          "labelEn": "Proforma Invoice Report",
          "labelAr": "تقرير الفاتورة المؤقتة",
          "icon": "FileCheck",
          "url": "/reports/proforma-invoice-detailed-report",
          "svgLogo": proformaInvoiceDetailedReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "sales-order-report",
          "labelEn": "Sales Order Report",
          "labelAr": "تقرير أمر البيع",
          "icon": "ShoppingBag",
          "url": "/reports/sales-order-report",
          "svgLogo": salesOrderReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "delivery-note-report",
          "labelEn": "Delivery Note Report",
          "labelAr": "تقرير إشعار التسليم",
          "icon": "PackageOpen",
          "url": "/reports/delivery-note-report",
          "svgLogo": deliveryNoteReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "sales-report",
          "labelEn": "Sales Report",
          "labelAr": "تقرير المبيعات",
          "icon": "ReceiptText",
          "url": "/reports/sales-report",
          "svgLogo": salesReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "sales-return-report",
          "labelEn": "Sales Return Report",
          "labelAr": "تقرير مرتجع المبيعات",
          "icon": "RefreshCcw",
          "url": "/reports/sales-return-detailed-report",
          "svgLogo": salesReturnDetailedReportSvg,
          "group": "sales-reports"
        }
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║        2. PURCHASE (Transactions + Reports)      ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "purchase",
      "labelEn": "Purchase",
      "labelAr": "المشتريات",
      "icon": "ShoppingBag",
      "children": [
        // ── Transactions ──
        {
          "id": "purchase-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "purchaseCart",
          "labelEn": "Purchase Cart",
          "labelAr": "سلة الشراء",
          "icon": "ShoppingBasket",
          "url": "/transaction/purchase-cart",
          "svgLogo": purchaseCartSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseQuotation",
          "labelEn": "Purchase Quotation",
          "labelAr": "عرض سعر الشراء",
          "icon": "FileText",
          "url": "/transaction/purchase-quotation",
          "svgLogo": purchaseQuotationSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseOrder",
          "labelEn": "Purchase Order",
          "labelAr": "أمر شراء",
          "icon": "BaggageClaim",
          "url": "/transaction/purchase-order",
          "svgLogo": purchaseOrderSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "materialReceipt",
          "labelEn": "Material Receipt",
          "labelAr": "استلام المواد",
          "icon": "PackageCheck",
          "url": "/transaction/material-receipt",
          "svgLogo": materialReceiptSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseInvoice",
          "labelEn": "Purchase Invoice",
          "labelAr": "فاتورة الشراء",
          "shortKey": "Ctrl+F9",
          "icon": "Newspaper",
          "url": "/transaction/purchase-invoice",
          "svgLogo": purchaseInvoiceSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseReturn",
          "labelEn": "Purchase Return",
          "labelAr": "مرتجع المشتريات",
          "icon": "LuRefreshCcwDot",
          "url": "/transaction/purchase-return",
          "svgLogo": purchaseReturnSvg,
          "group": "purchase-transactions"
        },

        // ── Reports ──
        {
          "id": "purchase-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "purchase-cart-report",
          "labelEn": "Purchase Cart Report",
          "labelAr": "تقرير سلة الشراء",
          "icon": "ShoppingBasket",
          "url": "/reports/purchase-cart-report",
          "svgLogo": purchaseCartSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-quotation-report",
          "labelEn": "Purchase Quotation Report",
          "labelAr": "تقرير عرض سعر الشراء",
          "icon": "FileText",
          "url": "/reports/purchase-quotation-report",
          "svgLogo": purchaseQuotationSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-order-report",
          "labelEn": "Purchase Order Report",
          "labelAr": "تقرير أمر الشراء",
          "icon": "BaggageClaim",
          "url": "/reports/purchase-order-report",
          "svgLogo": purchaseOrderReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "material-receipt-report",
          "labelEn": "Material Receipt Report",
          "labelAr": "تقرير استلام المواد",
          "icon": "PackageCheck",
          "url": "/reports/material-receipt-report",
          "svgLogo": materialReceiptReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-invoice-report",
          "labelEn": "Purchase Report",
          "labelAr": "تقرير فاتورة الشراء",
          "icon": "Newspaper",
          "url": "/reports/purchase-report",
          "svgLogo": purchaseReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-return-report",
          "labelEn": "Purchase Return Report",
          "labelAr": "تقرير مرتجع المشتريات",
          "icon": "LuRefreshCcwDot",
          "url": "/reports/purchase-return-report",
          "svgLogo": purchaseReturnReportSvg,
          "group": "purchase-reports"
        }
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║       3. INVENTORY (Transactions + Reports)      ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "inventory",
      "labelEn": "Inventory",
      "labelAr": "المخزون",
      "icon": "Boxes",
      "children": [
        // ── Transactions ──
        {
          "id": "inventory-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "physicalStock",
          "labelEn": "Physical Stock",
          "labelAr": "المخزون الفعلي",
          "icon": "PackageCheck",
          "url": "/transaction/physical-stock",
          "svgLogo": physicalStockSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "damageStock",
          "labelEn": "Damage Stock",
          "labelAr": "المخزون التالف",
          "icon": "AlertTriangle",
          "url": "/transaction/damage-stock",
          "svgLogo": damageStockSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "usedStock",
          "labelEn": "Used Stock",
          "labelAr": "المخزون المستخدم",
          "icon": "PackageCheck",
          "url": "/transaction/used-stock",
          "svgLogo": usedStockSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "godownTransfer",
          "labelEn": "Stock Transfer",
          "labelAr": "نقل المخزن",
          "icon": "ArrowLeftRight",
          "url": "/transaction/godown-transfer",
          "requiresSetting": "ActiveGodown",
          "svgLogo": godownTransferSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "godownTransferList",
          "labelEn": "Stock Receipts",
          "labelAr": "استلام المخزن",
          "icon": "ArrowLeftRight",
          "url": "/transaction/godown-transfer/list",
          "requiresSetting": "ActiveGodown",
          "svgLogo": godownTransferSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "manufacturingGournal",
          "labelEn": "Manufacturing Journal",
          "labelAr": "مجلة التصنيع",
          "icon": "ArrowLeftRight",
          "url": "/transaction/manufacturing-journal",
          "svgLogo": godownTransferSvg,
          "group": "inventory-transactions"
        },

        // ── Reports ──
        {
          "id": "inventory-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "physical-stock-report",
          "labelEn": "Physical Stock Report",
          "labelAr": "تقرير المخزون الفعلي",
          "icon": "PackageCheck",
          "url": "/reports/physical-stock-report",
          "svgLogo": physicalStockReportSvg,
          "group": "inventory-reports"
        },
        {
          "id": "damage-stock-report",
          "labelEn": "Damage Stock Report",
          "labelAr": "تقرير المخزون التالف",
          "icon": "AlertTriangle",
          "url": "/reports/damage-stock-report",
          "svgLogo": damageStockSvg,
          "group": "inventory-reports"
        },
        {
          "id": "used-stock-report",
          "labelEn": "Used Stock Report",
          "labelAr": "تقرير المخزون المستخدم",
          "icon": "PackageCheck",
          "url": "/reports/used-stock-report",
          "svgLogo": usedStockSvg,
          "group": "inventory-reports"
        },
        {
          "id": "orderSummeryReport",
          "labelEn": "Order Summery Report",
          "labelAr": "طلب تقرير صيفي",
          "icon": "PackageCheck",
          "url": "/transactions/order-summery-report",
          "svgLogo": usedStockSvg,
          "group": "inventory-reports"
        },
        {
          "id": "godown-transfer-report",
          "labelEn": "Godown Transfer Report",
          "labelAr": "تقرير نقل المخزن",
          "icon": "ArrowLeftRight",
          "url": "/reports/godown-transfer-report",
          "requiresSetting": "ActiveGodown",
          "svgLogo": godownTransferSvg,
          "group": "inventory-reports"
        }
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║        4. FINANCE (Transactions + Reports)       ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "finance",
      "labelEn": "Finance",
      "labelAr": "المالية",
      "icon": "DollarSign",
      "children": [
        // ── Transactions ──
        {
          "id": "finance-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "recieptVoucher",
          "labelEn": "Receipt Voucher",
          "labelAr": "سند القبض",
          "shortKey": "Ctrl+F6",
          "icon": "Banknote",
          "url": "/transaction/reciept-voucher",
          "svgLogo": receiptVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "paymentVoucher",
          "labelEn": "Payment Voucher",
          "shortKey": "Ctrl+F5",
          "labelAr": "سند الدفع",
          "icon": "Wallet",
          "url": "/transaction/payment-voucher",
          "svgLogo": paymentVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "contraVoucher",
          "labelEn": "Contra Voucher",
          "labelAr": "قسيمة كونترا",
          "shortKey": "Ctrl+F4",
          "icon": "ArrowLeftRight",
          "url": "/transaction/contra-voucher",
          "svgLogo": contraVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "journalVoucher",
          "labelEn": "Journal Voucher",
          "labelAr": "قسيمة اليومية",
          "shortKey": "Ctrl+F7",
          "icon": "BookOpen",
          "url": "/transaction/journal-voucher",
          "svgLogo": journalVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "payableVoucher",
          "labelEn": "Payable Voucher",
          "labelAr": "قسيمة الدفع",
          "icon": "CreditCard",
          "url": "/transaction/payable-voucher",
          "svgLogo": payableVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "receivableVoucher",
          "labelEn": "Receivable Voucher",
          "labelAr": "قسيمة القبض",
          "icon": "HandCoins",
          "url": "/transaction/receivable-voucher",
          "svgLogo": receivableVoucherSvg,
          "group": "finance-transactions"
        },

        // ── Reports ──
        {
          "id": "finance-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },

        {
          "id": "receipt-report",
          "labelEn": "Receipt Report",
          "labelAr": "تقرير الإيصال",
          "icon": "Receipt",
          "url": "/reports/receipt-report",
          "svgLogo": receiptReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "payment-report",
          "labelEn": "Payment Report",
          "labelAr": "تقرير الدفع",
          "icon": "Wallet",
          "url": "/reports/payment-report",
          "svgLogo": paymentReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "contra-report",
          "labelEn": "Contra Report",
          "labelAr": "تقرير كونترا",
          "icon": "ArrowLeftRight",
          "url": "/reports/contra-report",
          "svgLogo": contraReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "journal-report",
          "labelEn": "Journal Report",
          "labelAr": "مجلة",
          "icon": "BookOpen",
          "url": "/reports/journal-report",
          "svgLogo": journalReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "payable-voucher-report",
          "labelEn": "Payable Voucher Report",
          "labelAr": "تقرير سند الدفع",
          "icon": "CreditCard",
          "url": "/reports/payable-voucher-report",
          "svgLogo": payableVoucherReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "receivable-voucher-report",
          "labelEn": "Receivable Voucher Report",
          "labelAr": "تقرير سند القبض",
          "icon": "HandCoins",
          "url": "/reports/receivable-voucher-report",
          "svgLogo": receivableVoucherSvg,
          "group": "finance-reports"
        }
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║              5. REPORTS (Main Section)            ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "reports",
      "labelEn": "Reports",
      "labelAr": "التقارير",
      "icon": "BarChart3",
      "children": [
        // ── 1. Accounts ──
        {
          "id": "accounts-group",
          "labelEn": "Accounts",
          "labelAr": "الحسابات",
          "isGroupHeader": true,
          "icon": "BookOpen"
        },
        {
          "id": "customer-report",
          "labelEn": "Party Balance",
          "labelAr": "رصيد الطرف",
          "icon": "Users",
          "url": "/reports/customer-report",
          "svgLogo": customerReportSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-report",
          "labelEn": "Supplier Report",
          "labelAr": "تقرير الموردين",
          "icon": "Truck",
          "url": "/reports/supplier-report",
          "svgLogo": supplierReportSvg,
          "group": "accounts"
        },
        {
          "id": "customer-statement-report",
          "labelEn": "Customer Statement",
          "labelAr": "كشف حساب العميل",
          "icon": "UserSquare",
          "url": "/reports/customer-statement-report",
          "svgLogo": customerStatementReportSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-statement-report",
          "labelEn": "Supplier Statement",
          "labelAr": "كشف حساب المورد",
          "icon": "FileText",
          "url": "/reports/supplier-statement-report",
          "svgLogo": supplierStatementReportSvg,
          "group": "accounts"
        },
        {
          "id": "ageing-report",
          "labelEn": "Ageing Report",
          "labelAr": "تقرير التقادم",
          "icon": "Clock",
          "url": "/reports/ageing-report",
          "svgLogo": ageingReportSvg,
          "group": "accounts"
        },
        {
          "id": "customer-address-book",
          "labelEn": "Customer Address Book",
          "labelAr": "دفتر عناوين العملاء",
          "icon": "Book",
          "url": "/reports/customer-address-book",
          "svgLogo": customerAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-address-book",
          "labelEn": "Supplier Address Book",
          "labelAr": "دفتر عناوين الموردين",
          "icon": "BookMarked",
          "url": "/reports/supplier-address-book",
          "svgLogo": supplierAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "bill-balance-report",
          "labelEn": "Bill Balance Report",
          "labelAr": "تقرير رصيد الفاتورة",
          "icon": "FileText",
          "url": "/reports/bill-balance-report",
          "svgLogo": supplierAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "tax-summary-report",
          "labelEn": "Tax Summary Report",
          "labelAr": "تقرير ملخص الضرائب",
          "icon": "Receipt",
          "url": "/reports/tax-summary-report",
          "svgLogo": taxSummaryReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "tax-detailed-report",
          "labelEn": "Tax Detailed Report",
          "labelAr": "تقرير الضريبة التفصيلي",
          "icon": "FileText",
          "url": "/reports/tax-detailed-report",
          "svgLogo": taxDetailedReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "tax-consolidated-report",
          "labelEn": "Tax Consolidated Report",
          "labelAr": "تقرير الضريبة الموحد",
          "icon": "FileText",
          "url": "/reports/tax-consolidated-report",
          "svgLogo": taxConsolidatedReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "costcentre-report",
          "labelEn": "Cost Centre Report",
          "labelAr": "تقرير مركز التكلفة",
          "icon": "Calculator",
          "url": "/reports/costcentre-report",
          "svgLogo": costCentreReportSvg,
          "group": "accounts",
          "requiresSetting": "costCentre"
        },



        // ── 3. Sales ──
        {
          "id": "report-sales-group",
          "labelEn": "Sales",
          "labelAr": "المبيعات",
          "isGroupHeader": true,
          "icon": "ShoppingCart"
        },
        {
          "id": "sales-day-report",
          "labelEn": "Sales Day Report",
          "labelAr": "تقرير مبيعات اليوم",
          "icon": "Calendar",
          "url": "/reports/sales-day-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-profit-report",
          "labelEn": "Sales Profit Report",
          "labelAr": "تقرير أرباح المبيعات",
          "icon": "Calendar",
          "url": "/reports/sales-profit-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-order-payment-report",
          "labelEn": "Sales Order Payment Report",
          "labelAr": "تقرير دفع أمر المبيعات",
          "icon": "Calendar",
          "url": "/reports/sales-order-payment-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },

        {
          "id": "sales-summary-report",
          "labelEn": "Sales Summary Report",
          "labelAr": "تقرير ملخص المبيعات",
          "icon": "BarChart3",
          "url": "/reports/sales-summary-report",
          "svgLogo": salesSummaryReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-order-vs-product-report",
          "labelEn": "Sales Order v/s Product",
          "labelAr": "أمر البيع مقابل المنتج",
          "icon": "BarChart3",
          "url": "/reports/sales-order-vs-product-report",
          "svgLogo": salesOrderVsProductReportSvg,
          "group": "report-sales"
        },
        {
          "id": "product-wise-sales-summary-report",
          "labelEn": "Product Wise Sales Summary",
          "labelAr": "ملخص المبيعات حسب المنتج",
          "icon": "Package",
          "url": "/reports/product-wise-sales-summary-report",
          "svgLogo": productWiseSalesSummaryReportSvg,
          "group": "report-sales"
        },

        // ── 4. Sales v/s Salesman ──
        {
          "id": "sales-vs-salesman-group",
          "labelEn": "Sales v/s Salesman",
          "labelAr": "المبيعات مقابل مندوب المبيعات",
          "isGroupHeader": true,
          "icon": "UserCheck"
        },
        {
          "id": "salesman-wise-sales-report",
          "labelEn": "Salesman Wise Sales",
          "labelAr": "المبيعات حسب مندوب المبيعات",
          "icon": "UserCheck",
          "url": "/reports/salesman-wise-sales-report",
          "svgLogo": salesmanWiseSalesReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "salesman-wise-sales-order-report",
          "labelEn": "Salesman Wise Sales Order",
          "labelAr": "أوامر البيع حسب مندوب المبيعات",
          "icon": "ClipboardList",
          "url": "/reports/salesman-wise-sales-order-report",
          "svgLogo": salesmanWiseSalesOrderReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "salesman-wise-bills-pending",
          "labelEn": "Salesman Wise Bill Pending",
          "labelAr": "الفواتير المعلقة حسب مندوب المبيعات",
          "icon": "Clock",
          "url": "/reports/salesman-wise-bills-pending",
          "svgLogo": salesmanWiseBillsPendingSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "area-wise-sales-report",
          "labelEn": "Area Wise Sales",
          "labelAr": "المبيعات حسب المنطقة",
          "icon": "MapPin",
          "url": "/reports/area-wise-sales-report",
          "svgLogo": areaWiseSalesReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "product-vs-salesman-report",
          "labelEn": "Product v/s Salesman",
          "labelAr": "المنتج مقابل مندوب المبيعات",
          "icon": "Package",
          "url": "/reports/product-vs-salesman-report",
          "svgLogo": productVsSalesmanReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "report-purchase-group",
          "labelEn": "Purchase",
          "labelAr": "المشتريات",
          "isGroupHeader": true,
          "icon": "ShoppingCart"
        },
        {
          "id": "purchase-day-report",
          "labelEn": "Purchase Day Report",
          "labelAr": "تقرير مشتريات اليوم",
          "icon": "Calendar",
          "url": "/reports/purchase-day-report",
          "svgLogo": purchaseDayReportSvg,
          "group": "report-purchase"

        },

        // ── 5. Inventory ──
        {
          "id": "inventory-group",
          "labelEn": "Inventory",
          "labelAr": "المخزون",
          "isGroupHeader": true,
          "icon": "Warehouse"
        },
        {
          "id": "price-list-report",
          "labelEn": "Price List",
          "labelAr": "قائمة الأسعار",
          "icon": "ListOrdered",
          "url": "/reports/price-list-report",
          "svgLogo": priceListReportSvg,
          "group": "inventory"
        },
        {
          "id": "stock-value-report",
          "labelEn": "Stock Value",
          "labelAr": "قيمة المخزون",
          "icon": "DollarSign",
          "url": "/reports/stock-value-report",
          "svgLogo": stockValueReportSvg,
          "group": "inventory"
        },
        {
          "id": "fast-moving-report",
          "labelEn": "Fast Moving",
          "labelAr": "سريع الحركة",
          "icon": "Zap",
          "url": "/reports/fast-moving-stock",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "slow-moving-report",
          "labelEn": "Slow Moving",
          "labelAr": "بطيء الحركة",
          "icon": "Hourglass",
          "url": "/reports/slow-moving-stock",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "minimum-level-report",
          "labelEn": "Minimum Level",
          "labelAr": "الحد الأدنى",
          "icon": "ArrowDownToLine",
          "url": "/reports/minimum-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "maximum-level-report",
          "labelEn": "Maximum Level",
          "labelAr": "الحد الأقصى",
          "icon": "ArrowUpToLine",
          "url": "/reports/maximum-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "reorder-level-report",
          "labelEn": "Reorder Level",
          "labelAr": "مستوى إعادة الطلب",
          "icon": "RefreshCw",
          "url": "/reports/reorder-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "unused-stock-report",
          "labelEn": "Unused Stock",
          "labelAr": "المخزون غير المستخدم",
          "icon": "PackageX",
          "url": "/reports/unused-stock",
          "svgLogo": physicalStockReportSvg,
          "group": "inventory"
        },
        {
          "id": "product-movement-report",
          "labelEn": "Product Movement",
          "labelAr": "حركة المنتج",
          "icon": "ArrowLeftRight",
          "url": "/reports/product-movement-report",
          "svgLogo": productMovementReportSvg,
          "group": "inventory"
        },
        {
          "id": "product-wise-voucher-search",
          "labelEn": "Product wise Voucher Search",
          "labelAr": "بحث القسائم حسب المنتج",
          "icon": "Search",
          "url": "/search/product-search-voucher-wise",
          "svgLogo": productWiseSalesSummaryReportSvg,
          "group": "inventory"
        }
      ]
    },
    {
      "id": "financialStatementsReports",
      "labelEn": "Financial Statement",
      "labelAr": "تقارير البيانات المالية",
      "icon": "FileText",
      "children": [
        // ── 2. Financial Statements ──
        {
          "id": "financial-statements-group",
          "labelEn": "Financial Statements",
          "labelAr": "البيانات المالية",
          "isGroupHeader": true,
          "icon": "Landmark"
        },
        {
          "id": "trial-balance",
          "labelEn": "Trial Balance",
          "labelAr": "ميزان المراجعة",
          "icon": "ArrowLeftRight",
          "url": "/reports/trial-balance",
          "svgLogo": trialBalanceSvg,
          "group": "financial-statements"
        },
        {
          "id": "profit-loss-analysis",
          "labelEn": "Profit & Loss Accounts",
          "labelAr": "حسابات الأرباح والخسائر",
          "icon": "TrendingUp",
          "url": "/reports/profit-loss-analysis",
          "svgLogo": profitLossAnalysisSvg,
          "group": "financial-statements"
        },
        {
          "id": "balance-sheet-report",
          "labelEn": "Balance Sheet",
          "labelAr": "الميزانية العمومية",
          "icon": "BarChart3",
          "url": "/reports/balance-sheet",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "income-expense-report",
          "labelEn": "Account Summery",
          "labelAr": "الإيرادات والمصروفات",
          "icon": "BarChart3",
          "url": "/reports/income-expense-report",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "income-expentiture-report",
          "labelEn": "Income & Expenditure",
          "labelAr": "الإيرادات والمصروفات",
          "icon": "BarChart3",
          "url": "/reports/income-expentiture-report",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "cash-flow-summary",
          "labelEn": "Cash Flow",
          "labelAr": "التدفق النقدي",
          "icon": "Wallet",
          "url": "/reports/cash-flow-summary",
          "svgLogo": fundFlowSvg,
          "group": "financial-statements"
        },
        {
          "id": "fund-flow",
          "labelEn": "Fund Flow",
          "labelAr": "تدفق الأموال",
          "icon": "ArrowLeftRight",
          "url": "/reports/fund-flow",
          "svgLogo": fundFlowSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-group-chart",
          "labelEn": "Chart of Accounts",
          "labelAr": "مخطط الحسابات",
          "icon": "GitBranch",
          "url": "/reports/account-group-chart",
          "svgLogo": accountGroupChartSvg,
          "group": "financial-statements"
        },
        {
          "id": "day-book-summary",
          "labelEn": "Daybook Summary",
          "labelAr": "ملخص دفتر اليوميات",
          "icon": "BookOpen",
          "url": "/reports/day-book-summary",
          "svgLogo": dayBookSummarySvg,
          "group": "financial-statements"
        },
        {
          "id": "cash-book",
          "labelEn": "Cash Book",
          "labelAr": "كتاب النقدية",
          "icon": "Wallet",
          "url": "/reports/cash-book",
          "svgLogo": cashBookSvg,
          "group": "financial-statements"
        },
        {
          "id": "bank-book",
          "labelEn": "Bank Book",
          "labelAr": "كتاب البنك",
          "icon": "Landmark",
          "url": "/reports/bank-book",
          "svgLogo": bankBookSvg,
          "group": "financial-statements"
        },
        {
          "id": "day-book-report",
          "labelEn": "Daybook",
          "labelAr": "دفتر اليوميات",
          "icon": "BookText",
          "url": "/reports/day-book-report",
          "svgLogo": dayBookReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "ledger-detailed-report",
          "labelEn": "Detailed Ledger Report",
          "labelAr": "تقرير دفتر الأستاذ المفصل",
          "icon": "ScrollText",
          "url": "/reports/ledger-detailed-report",
          "svgLogo": ledgerDetailedReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-group-report",
          "labelEn": "Account Group Report",
          "labelAr": "تقرير مجموعة الحسابات",
          "icon": "Layers",
          "url": "/reports/account-group-report",
          "svgLogo": accountGroupReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "ledger-report",
          "labelEn": "Ledger Report",
          "labelAr": "تقرير دفتر الحسابات",
          "icon": "BookText",
          "url": "/reports/ledger-report",
          "svgLogo": accountLedgerReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-ledger-report",
          "labelEn": "Account Ledger Report",
          "labelAr": "تقرير مجموعة الحسابات",
          "icon": "Layers",
          "url": "/reports/account-ledger-report",
          "svgLogo": accountGroupReportSvg,
          "group": "financial-statements"
        },

      ]
    },

    // ==================== GENERAL ====================
    {
      "id": "general",
      "labelEn": "General",
      "labelAr": "عام",
      "icon": "Settings",
      "children": [
        {
          "id": "general-group",
          "labelEn": "General",
          "labelAr": "عام",
          "isGroupHeader": true,
          "icon": "Settings"
        },
        {
          "id": "generalReminder",
          "labelEn": "Reminders",
          "labelAr": "التذكيرات",
          "icon": "Bell",
          "url": "/general/reminders",
          "group": "general",
          "svgLogo": reminderSvg
        }
      ]
    },

    // ==================== SETTINGS & TOOLS ====================
    {
      "id": "settings",
      "labelEn": "Settings & Tools",
      "labelAr": "الإعدادات والأدوات",
      "icon": "Wrench",
      "children": [
        {
          "id": "fin-year-group",
          "labelEn": "Financial Year",
          "labelAr": "السنة المالية",
          "isGroupHeader": true,
          "icon": "Calendar"
        },
        {
          "id": "financialYearNew",
          "labelEn": "New",
          "labelAr": "جديد السنة المالية",
          "icon": "CalendarPlus",
          "group": "fin-year",
          "svgLogo": newFinancialYearSvg
        },
        {
          "id": "financialYearEdit",
          "labelEn": "Edit",
          "labelAr": "تعديل السنة المالية",
          "icon": "CalendarCog",
          "group": "fin-year",
          "svgLogo": financialYearEditSvg
        },
        {
          "id": "financialYearChange",
          "labelEn": "Change",
          "labelAr": "تغيير السنة المالية",
          "icon": "CalendarCheck",
          "url": "/master/financial-year",
          "group": "fin-year",
          "svgLogo": financialYearChangeSvg
        },
        {
          "id": "financialYearClose",
          "labelEn": "Close Financial Year",
          "labelAr": "إغلاق السنة المالية",
          "icon": "CalendarX",
          "group": "fin-year",
          "svgLogo": financialYearCloseSvg
        },
        {
          "id": "other-settings-group",
          "labelEn": "Others",
          "labelAr": "أخرى",
          "isGroupHeader": true,
          "icon": "Settings"
        },
        {
          "id": "currency",
          "labelEn": "Currency",
          "labelAr": "العملة",
          "icon": "Coins",
          "url": "/master/currency",
          "group": "other-settings",
          "requiresSetting": "multiCurrency",
          "svgLogo": currencyMasterSvg
        },
        {
          "id": "currencyConvertion",
          "labelEn": "Exchange Rate",
          "labelAr": "تحويل العملة",
          "icon": "Coins",
          "url": "/master/currency-convertion",
          "requiresSetting": "multiCurrency",
          "group": "other-settings",
          "svgLogo": currencyConvertionSvg
        },
        {
          "id": "suffixPrefixSettings",
          "labelEn": "Suffix Prefix Settings",
          "labelAr": "إعدادات اللاحقة والبادئة",
          "icon": "Settings2",
          "url": "/settings/suffix-prefix-settings",
          "group": "other-settings",
          "svgLogo": suffixPrefixSettingsSvg
        },
        {
          "id": "reportFileSettings",
          "labelEn": "Report File Settings",
          "labelAr": "إعدادات ملف التقرير",
          "icon": "Settings",
          "url": "/settings/report-file-settings",
          "group": "other-settings",
          "svgLogo": reportFileSettingsSvg
        },
        {
          "id": "bulkUpload",
          "labelEn": "Bulk Upload",
          "labelAr": "الرفع الجماعي",
          "icon": "FileUp",
          "url": "/settings/bulk-upload",
          "group": "other-settings",
          "svgLogo": reportFileSettingsSvg
        },
        // ...(orgData?.organizationData?.userCount === 1
        //   ? [
        {
          id: "changeuserPassword",
          labelEn: "Change Password",
          labelAr: "تغيير كلمة المرور",
          icon: "Settings",
          url: "/settings/change-password",
          group: "other-settings",
          svgLogo: mainSettingsSvg,
        },
        // ]
        // : []),

        {
          "id": "mainSettings",
          "labelEn": "Settings",
          "labelAr": "الإعدادات",
          "icon": "Settings",
          "url": "/settings",
          "group": "other-settings",
          "svgLogo": mainSettingsSvg
        }
      ]
    }
  ].filter(Boolean)
};
export const basicMenuData = {
  "menuItems": [
    // ╔══════════════════════════════════════════════════╗
    // ║          MASTER (Basic - products data)         ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "company",
      "labelEn": "Company Details",
      "labelAr": "الشركة",
      "icon": "Building2",
      "children": [
        {
          "id": "company-group",
          "labelEn": "Company Details",
          "labelAr": "تفاصيل الشركة",
          "isGroupHeader": true,
          "icon": "Building2"
        },
        {
          "id": "all-branches",
          "labelEn": "Branch",
          "labelAr": "جميع الفروع",
          "icon": "MapPin",
          "url": "/all-branches",
          "group": "company"
        }
      ]
    },
    {
      "id": "master",
      "labelEn": "Master",
      "labelAr": "الرئيسي",
      "icon": "Settings",
      "children": [
        {
          "id": "finance-group",
          "labelEn": "Finance",
          "labelAr": "المالية",
          "isGroupHeader": true,
          "icon": "DollarSign"
        },
        {
          "id": "accountLedger",
          "labelEn": "Account Ledger",
          "labelAr": "دفتر الحسابات",
          "icon": "BookOpen",
          "url": "/master/account-ledger",
          "group": "finance",
          "svgLogo": accountLedgerMasterSvg
        },
        {
          "id": "accountGroup",
          "labelEn": "Account Group",
          "labelAr": "مجموعة الحسابات",
          "icon": "Layers",
          "url": "/master/account-groups",
          "group": "finance",
          "svgLogo": accountGroupMasterSvg
        },

        {
          "id": "bank",
          "labelEn": "Bank",
          "labelAr": "البنك",
          "icon": "CreditCard",
          "url": "/master/bank",
          "svgLogo": bankMasterSvg,
          "group": "finance"
        },
        {
          "id": "customer",
          "labelEn": "Customer",
          "labelAr": "العميل",
          "icon": "UserCheck",
          "url": "/master/customer",
          "group": "finance",
          "svgLogo": customerMasterSvg
        },
        {
          "id": "supplier",
          "labelEn": "Supplier",
          "labelAr": "المورد",
          "icon": "Truck",
          "url": "/master/supplier",
          "group": "finance",
          "svgLogo": supplierMasterSvg
        },
        {
          "id": "inventory-group",
          "labelEn": "Inventory",
          "labelAr": "إدارة المخزون",
          "isGroupHeader": true,
          "icon": "Boxes"
        },
        {
          "id": "productCreation",
          "labelEn": "Product Creation",
          "labelAr": "إنشاء المنتج",
          "shortKey": "Alt+C",
          "icon": "PackagePlus",
          "url": "/master/product-creation",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },
        {
          "id": "productList",
          "labelEn": "Product List",
          "labelAr": " قائمة المنتجات",
          // "shortKey": "Alt+L",
          "icon": "Package",
          "url": "/master/product-list",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },
        {
          "id": "barcodeGenerator",
          "labelEn": "Barcode Generator",
          "labelAr": "مولد الرموز الشريطية",
          "icon": "QrCode",
          "url": "/master/barcode-generator",
          "svgLogo": productCreationSvg,
          "group": "inventory"
        },


        {
          "id": "productMainGroup",
          "labelEn": "Product Main Group",
          "labelAr": "المجموعة الرئيسية للمنتجات",
          "icon": "LayoutGrid",
          "url": "/master/product-main-group",
          "group": "inventory",
          "svgLogo": productMainGroupSvg
        },
        {
          "id": "productGroup",
          "labelEn": "Product Group",
          "labelAr": "مجموعة المنتجات",
          "icon": "Layers",
          "url": "/master/product-group",
          "group": "inventory",
          "svgLogo": productGroupSvg
        },
        {
          "id": "unit",
          "labelEn": "Unit",
          "labelAr": "الوحدة",
          "icon": "Ruler",
          "url": "/master/unit",
          "group": "inventory",
          "svgLogo": unitMasterSvg
        },
        {
          "id": "brand",
          "labelEn": "Brand",
          "labelAr": "العلامة التجارية",
          "icon": "Tags",
          "url": "/master/brand",
          "group": "inventory",
          "svgLogo": brandMasterSvg
        },

        {
          "id": "taxMaster",
          "labelEn": "Tax Master",
          "labelAr": "الضرائب",
          "icon": "Receipt",
          "url": "/master/tax-master",
          "group": "inventory",
          "requiresSetting": "ActivateTax",
          "svgLogo": taxMasterSvg
        },
        {
          "id": "sales-group",
          "labelEn": "Sales",
          "labelAr": "المبيعات",
          "isGroupHeader": true,
          "icon": "DollarSign"
        },
        {
          "id": "route",
          "labelEn": "Route",
          "labelAr": "المسار",
          "icon": "Route",
          "url": "/master/route",
          "group": "sales",
          "svgLogo": routeMasterSvg
        },
        {
          "id": "area",
          "labelEn": "Area",
          "labelAr": "المنطقة",
          "icon": "Map",
          "url": "/master/area",
          "group": "sales",
          "svgLogo": areaMasterSvg
        },
        {
          "id": "market",
          "labelEn": "Market",
          "labelAr": "السوق",
          "icon": "Store",
          "url": "/master/market",
          "group": "sales",
          "svgLogo": marketMasterSvg
        },

        {
          "id": "pricingLevel",
          "labelEn": "Pricing Level",
          "labelAr": "مستوى التسعير",
          "icon": "DollarSign",
          "url": "/master/pricing-level",
          "group": "sales",
          "svgLogo": pricingLevelSvg
        },

      ].filter(Boolean)
    },
    // ╔══════════════════════════════════════════════════╗
    // ║          SALES (Basic - Invoice & Return)         ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "sales",
      "labelEn": "Sales",
      "labelAr": "المبيعات",
      "icon": "ShoppingCart",
      "children": [
        {
          "id": "sales-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "salesQuotation",
          "labelEn": "Sales Quotation",
          "labelAr": "عرض سعر المبيعات",
          "icon": "FileText",
          "url": "/transaction/sales-quotation",
          "svgLogo": salesQuotationSvg,
          "group": "sales-transactions"
        },
        {
          "id": "proformaInvoice",
          "labelEn": "Proforma Invoice",
          "labelAr": "فاتورة أولية",
          "icon": "FileCheck",
          "url": "/transaction/proforma-invoice",
          "svgLogo": proformaInvoiceSvg,
          "group": "sales-transactions"
        },
        {
          "id": "deliveryNote",
          "labelEn": "Delivery Note",
          "labelAr": "إشعار التسليم",
          "shortKey": "Ctrl+F10",
          "icon": "PackageOpen",
          "url": "/transaction/delivery-note",
          "svgLogo": deliveryNoteSvg,
          "group": "sales-transactions"
        },
        {
          "id": "salesInvoice",
          "labelEn": "Sales Invoice",
          "shortKey": "Ctrl+F8",
          "labelAr": "فاتورة مبيعات",
          "icon": "ReceiptText",
          "url": "/transaction/sales-invoice",
          "svgLogo": salesInvoiceSvg,
          "group": "sales-transactions"
        },
        {
          "id": "salesReturn",
          "labelEn": "Sales Return",
          "labelAr": "مرتجع المبيعات",
          "icon": "RefreshCcw",
          "url": "/transaction/sales-return",
          "svgLogo": salesReturnSvg,
          "group": "sales-transactions"
        },
        {
          "id": "sales-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "sales-quotation-report",
          "labelEn": "Sales Quotation Report",
          "labelAr": "تقرير عرض سعر المبيعات",
          "icon": "FileText",
          "url": "/reports/sales-quotation-report",
          "svgLogo": salesQuotationSvg,
          "group": "sales-reports"
        },
        {
          "id": "proforma-invoice-report",
          "labelEn": "Proforma Invoice Report",
          "labelAr": "تقرير الفاتورة المؤقتة",
          "icon": "FileCheck",
          "url": "/reports/proforma-invoice-detailed-report",
          "svgLogo": proformaInvoiceDetailedReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "delivery-note-report",
          "labelEn": "Delivery Note Report",
          "labelAr": "تقرير إشعار التسليم",
          "icon": "PackageOpen",
          "url": "/reports/delivery-note-report",
          "svgLogo": deliveryNoteReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "sales-report",
          "labelEn": "Sales Report",
          "labelAr": "تقرير المبيعات",
          "icon": "ReceiptText",
          "url": "/reports/sales-report",
          "svgLogo": salesReportSvg,
          "group": "sales-reports"
        },
        {
          "id": "sales-return-report",
          "labelEn": "Sales Return Report",
          "labelAr": "تقرير مرتجع المبيعات",
          "icon": "RefreshCcw",
          "url": "/reports/sales-return-detailed-report",
          "svgLogo": salesReturnDetailedReportSvg,
          "group": "sales-reports"
        }
      ]
    },
    {
      "id": "inventory",
      "labelEn": "Inventory",
      "labelAr": "المخزون",
      "icon": "Boxes",
      "children": [
        // ── Transactions ──
        {
          "id": "inventory-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "physicalStock",
          "labelEn": "Physical Stock",
          "labelAr": "المخزون الفعلي",
          "icon": "PackageCheck",
          "url": "/transaction/physical-stock",
          "svgLogo": physicalStockSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "damageStock",
          "labelEn": "Damage Stock",
          "labelAr": "المخزون التالف",
          "icon": "AlertTriangle",
          "url": "/transaction/damage-stock",
          "svgLogo": damageStockSvg,
          "group": "inventory-transactions"
        },
        {
          "id": "usedStock",
          "labelEn": "Used Stock",
          "labelAr": "المخزون المستخدم",
          "icon": "PackageCheck",
          "url": "/transaction/used-stock",
          "svgLogo": usedStockSvg,
          "group": "inventory-transactions"
        },

        // ── Reports ──
        {
          "id": "inventory-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "physical-stock-report",
          "labelEn": "Physical Stock Report",
          "labelAr": "تقرير المخزون الفعلي",
          "icon": "PackageCheck",
          "url": "/reports/physical-stock-report",
          "svgLogo": physicalStockReportSvg,
          "group": "inventory-reports"
        },
        {
          "id": "damage-stock-report",
          "labelEn": "Damage Stock Report",
          "labelAr": "تقرير المخزون التالف",
          "icon": "AlertTriangle",
          "url": "/reports/damage-stock-report",
          "svgLogo": damageStockSvg,
          "group": "inventory-reports"
        },
        {
          "id": "used-stock-report",
          "labelEn": "Used Stock Report",
          "labelAr": "تقرير المخزون المستخدم",
          "icon": "PackageCheck",
          "url": "/reports/used-stock-report",
          "svgLogo": usedStockSvg,
          "group": "inventory-reports"
        },

      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║        PURCHASE (Basic - Invoice & Return)        ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "purchase",
      "labelEn": "Purchase",
      "labelAr": "المشتريات",
      "icon": "ShoppingBag",
      "children": [
        {
          "id": "purchase-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "purchaseOrder",
          "labelEn": "Purchase Order",
          "labelAr": "أمر شراء",
          "icon": "BaggageClaim",
          "url": "/transaction/purchase-order",
          "svgLogo": purchaseOrderSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "materialReceipt",
          "labelEn": "Material Receipt",
          "labelAr": "استلام المواد",
          "icon": "PackageCheck",
          "url": "/transaction/material-receipt",
          "svgLogo": materialReceiptSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseInvoice",
          "labelEn": "Purchase Invoice",
          "labelAr": "فاتورة الشراء",
          "shortKey": "Ctrl+F9",
          "icon": "Newspaper",
          "url": "/transaction/purchase-invoice",
          "svgLogo": purchaseInvoiceSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchaseReturn",
          "labelEn": "Purchase Return",
          "labelAr": "مرتجع المشتريات",
          "icon": "LuRefreshCcwDot",
          "url": "/transaction/purchase-return",
          "svgLogo": purchaseReturnSvg,
          "group": "purchase-transactions"
        },
        {
          "id": "purchase-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },
        {
          "id": "purchase-order-report",
          "labelEn": "Purchase Order Report",
          "labelAr": "تقرير أمر الشراء",
          "icon": "BaggageClaim",
          "url": "/reports/purchase-order-report",
          "svgLogo": purchaseOrderReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "material-receipt-report",
          "labelEn": "Material Receipt Report",
          "labelAr": "تقرير استلام المواد",
          "icon": "PackageCheck",
          "url": "/reports/material-receipt-report",
          "svgLogo": materialReceiptReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-invoice-report",
          "labelEn": "Purchase Report",
          "labelAr": "تقرير فاتورة الشراء",
          "icon": "Newspaper",
          "url": "/reports/purchase-report",
          "svgLogo": purchaseReportSvg,
          "group": "purchase-reports"
        },
        {
          "id": "purchase-return-report",
          "labelEn": "Purchase Return Report",
          "labelAr": "تقرير مرتجع المشتريات",
          "icon": "LuRefreshCcwDot",
          "url": "/reports/purchase-return-report",
          "svgLogo": purchaseReturnReportSvg,
          "group": "purchase-reports"
        }
      ]
    },

    // ╔══════════════════════════════════════════════════╗
    // ║       FINANCE (Basic - 5 Vouchers + Reports)      ║
    // ╚══════════════════════════════════════════════════╝
    {
      "id": "finance",
      "labelEn": "Finance",
      "labelAr": "المالية",
      "icon": "DollarSign",
      "children": [
        // ── Transactions ──
        {
          "id": "finance-transactions-group",
          "labelEn": "Transactions",
          "labelAr": "المعاملات",
          "isGroupHeader": true,
          "icon": "ScanLine"
        },
        {
          "id": "recieptVoucher",
          "labelEn": "Receipt Voucher",
          "labelAr": "سند القبض",
          "shortKey": "Ctrl+F6",
          "icon": "Banknote",
          "url": "/transaction/reciept-voucher",
          "svgLogo": receiptVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "paymentVoucher",
          "labelEn": "Payment Voucher",
          "shortKey": "Ctrl+F5",
          "labelAr": "سند الدفع",
          "icon": "Wallet",
          "url": "/transaction/payment-voucher",
          "svgLogo": paymentVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "contraVoucher",
          "labelEn": "Contra Voucher",
          "labelAr": "قسيمة كونترا",
          "shortKey": "Ctrl+F4",
          "icon": "ArrowLeftRight",
          "url": "/transaction/contra-voucher",
          "svgLogo": contraVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "journalVoucher",
          "labelEn": "Journal Voucher",
          "labelAr": "قسيمة اليومية",
          "shortKey": "Ctrl+F7",
          "icon": "BookOpen",
          "url": "/transaction/journal-voucher",
          "svgLogo": journalVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "payableVoucher",
          "labelEn": "Payable Voucher",
          "labelAr": "قسيمة الدفع",
          "icon": "CreditCard",
          "url": "/transaction/payable-voucher",
          "svgLogo": payableVoucherSvg,
          "group": "finance-transactions"
        },
        {
          "id": "receivableVoucher",
          "labelEn": "Receivable Voucher",
          "labelAr": "قسيمة القبض",
          "icon": "HandCoins",
          "url": "/transaction/receivable-voucher",
          "svgLogo": receivableVoucherSvg,
          "group": "finance-transactions"
        },

        // ── Reports ──
        {
          "id": "finance-reports-group",
          "labelEn": "Reports",
          "labelAr": "التقارير",
          "isGroupHeader": true,
          "icon": "BarChart3"
        },

        {
          "id": "receipt-report",
          "labelEn": "Receipt Report",
          "labelAr": "تقرير الإيصال",
          "icon": "Receipt",
          "url": "/reports/receipt-report",
          "svgLogo": receiptReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "payment-report",
          "labelEn": "Payment Report",
          "labelAr": "تقرير الدفع",
          "icon": "Wallet",
          "url": "/reports/payment-report",
          "svgLogo": paymentReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "contra-report",
          "labelEn": "Contra Report",
          "labelAr": "تقرير كونترا",
          "icon": "ArrowLeftRight",
          "url": "/reports/contra-report",
          "svgLogo": contraReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "journal-report",
          "labelEn": "Journal Report",
          "labelAr": "مجلة",
          "icon": "BookOpen",
          "url": "/reports/journal-report",
          "svgLogo": journalReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "payable-voucher-report",
          "labelEn": "Payable Voucher Report",
          "labelAr": "تقرير سند الدفع",
          "icon": "CreditCard",
          "url": "/reports/payable-voucher-report",
          "svgLogo": payableVoucherReportSvg,
          "group": "finance-reports"
        },
        {
          "id": "receivable-voucher-report",
          "labelEn": "Receivable Voucher Report",
          "labelAr": "تقرير سند القبض",
          "icon": "HandCoins",
          "url": "/reports/receivable-voucher-report",
          "svgLogo": receivableVoucherSvg,
          "group": "finance-reports"
        }
      ]
    },
    {
      "id": "reports",
      "labelEn": "Reports",
      "labelAr": "التقارير",
      "icon": "BarChart3",
      "children": [
        // ── 1. Accounts ──
        {
          "id": "accounts-group",
          "labelEn": "Accounts",
          "labelAr": "الحسابات",
          "isGroupHeader": true,
          "icon": "BookOpen"
        },
        {
          "id": "customer-report",
          "labelEn": "Party Balance",
          "labelAr": "رصيد الطرف",
          "icon": "Users",
          "url": "/reports/customer-report",
          "svgLogo": customerReportSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-report",
          "labelEn": "Supplier Report",
          "labelAr": "تقرير الموردين",
          "icon": "Truck",
          "url": "/reports/supplier-report",
          "svgLogo": supplierReportSvg,
          "group": "accounts"
        },
        {
          "id": "customer-statement-report",
          "labelEn": "Customer Statement",
          "labelAr": "كشف حساب العميل",
          "icon": "UserSquare",
          "url": "/reports/customer-statement-report",
          "svgLogo": customerStatementReportSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-statement-report",
          "labelEn": "Supplier Statement",
          "labelAr": "كشف حساب المورد",
          "icon": "FileText",
          "url": "/reports/supplier-statement-report",
          "svgLogo": supplierStatementReportSvg,
          "group": "accounts"
        },
        {
          "id": "ageing-report",
          "labelEn": "Ageing Report",
          "labelAr": "تقرير التقادم",
          "icon": "Clock",
          "url": "/reports/ageing-report",
          "svgLogo": ageingReportSvg,
          "group": "accounts"
        },
        {
          "id": "customer-address-book",
          "labelEn": "Customer Address Book",
          "labelAr": "دفتر عناوين العملاء",
          "icon": "Book",
          "url": "/reports/customer-address-book",
          "svgLogo": customerAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "supplier-address-book",
          "labelEn": "Supplier Address Book",
          "labelAr": "دفتر عناوين الموردين",
          "icon": "BookMarked",
          "url": "/reports/supplier-address-book",
          "svgLogo": supplierAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "bill-balance-report",
          "labelEn": "Bill Balance Report",
          "labelAr": "تقرير رصيد الفاتورة",
          "icon": "FileText",
          "url": "/reports/bill-balance-report",
          "svgLogo": supplierAddressBookSvg,
          "group": "accounts"
        },
        {
          "id": "tax-summary-report",
          "labelEn": "Tax Summary Report",
          "labelAr": "تقرير ملخص الضرائب",
          "icon": "Receipt",
          "url": "/reports/tax-summary-report",
          "svgLogo": taxSummaryReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "tax-detailed-report",
          "labelEn": "Tax Detailed Report",
          "labelAr": "تقرير الضريبة التفصيلي",
          "icon": "FileText",
          "url": "/reports/tax-detailed-report",
          "svgLogo": taxDetailedReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "tax-consolidated-report",
          "labelEn": "Tax Consolidated Report",
          "labelAr": "تقرير الضريبة الموحد",
          "icon": "FileText",
          "url": "/reports/tax-consolidated-report",
          "svgLogo": taxConsolidatedReportSvg,
          "requiresSetting": "ActivateTax",
          "group": "accounts"
        },
        {
          "id": "costcentre-report",
          "labelEn": "Cost Centre Report",
          "labelAr": "تقرير مركز التكلفة",
          "icon": "Calculator",
          "url": "/reports/costcentre-report",
          "svgLogo": costCentreReportSvg,
          "group": "accounts",
          "requiresSetting": "costCentre"
        },



        // ── 3. Sales ──
        {
          "id": "report-sales-group",
          "labelEn": "Sales",
          "labelAr": "المبيعات",
          "isGroupHeader": true,
          "icon": "ShoppingCart"
        },
        {
          "id": "sales-day-report",
          "labelEn": "Sales Day Report",
          "labelAr": "تقرير مبيعات اليوم",
          "icon": "Calendar",
          "url": "/reports/sales-day-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-profit-report",
          "labelEn": "Sales Profit Report",
          "labelAr": "تقرير أرباح المبيعات",
          "icon": "Calendar",
          "url": "/reports/sales-profit-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-order-payment-report",
          "labelEn": "Sales Order Payment Report",
          "labelAr": "تقرير دفع أمر المبيعات",
          "icon": "Calendar",
          "url": "/reports/sales-order-payment-report",
          "svgLogo": salesDayReportSvg,
          "group": "report-sales"
        },

        {
          "id": "sales-summary-report",
          "labelEn": "Sales Summary Report",
          "labelAr": "تقرير ملخص المبيعات",
          "icon": "BarChart3",
          "url": "/reports/sales-summary-report",
          "svgLogo": salesSummaryReportSvg,
          "group": "report-sales"
        },
        {
          "id": "sales-order-vs-product-report",
          "labelEn": "Sales Order v/s Product",
          "labelAr": "أمر البيع مقابل المنتج",
          "icon": "BarChart3",
          "url": "/reports/sales-order-vs-product-report",
          "svgLogo": salesOrderVsProductReportSvg,
          "group": "report-sales"
        },
        {
          "id": "product-wise-sales-summary-report",
          "labelEn": "Product Wise Sales Summary",
          "labelAr": "ملخص المبيعات حسب المنتج",
          "icon": "Package",
          "url": "/reports/product-wise-sales-summary-report",
          "svgLogo": productWiseSalesSummaryReportSvg,
          "group": "report-sales"
        },

        // ── 4. Sales v/s Salesman ──
        {
          "id": "sales-vs-salesman-group",
          "labelEn": "Sales v/s Salesman",
          "labelAr": "المبيعات مقابل مندوب المبيعات",
          "isGroupHeader": true,
          "icon": "UserCheck"
        },
        {
          "id": "salesman-wise-sales-report",
          "labelEn": "Salesman Wise Sales",
          "labelAr": "المبيعات حسب مندوب المبيعات",
          "icon": "UserCheck",
          "url": "/reports/salesman-wise-sales-report",
          "svgLogo": salesmanWiseSalesReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "salesman-wise-sales-order-report",
          "labelEn": "Salesman Wise Sales Order",
          "labelAr": "أوامر البيع حسب مندوب المبيعات",
          "icon": "ClipboardList",
          "url": "/reports/salesman-wise-sales-order-report",
          "svgLogo": salesmanWiseSalesOrderReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "salesman-wise-bills-pending",
          "labelEn": "Salesman Wise Bill Pending",
          "labelAr": "الفواتير المعلقة حسب مندوب المبيعات",
          "icon": "Clock",
          "url": "/reports/salesman-wise-bills-pending",
          "svgLogo": salesmanWiseBillsPendingSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "area-wise-sales-report",
          "labelEn": "Area Wise Sales",
          "labelAr": "المبيعات حسب المنطقة",
          "icon": "MapPin",
          "url": "/reports/area-wise-sales-report",
          "svgLogo": areaWiseSalesReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "product-vs-salesman-report",
          "labelEn": "Product v/s Salesman",
          "labelAr": "المنتج مقابل مندوب المبيعات",
          "icon": "Package",
          "url": "/reports/product-vs-salesman-report",
          "svgLogo": productVsSalesmanReportSvg,
          "group": "sales-vs-salesman"
        },
        {
          "id": "report-purchase-group",
          "labelEn": "Purchase",
          "labelAr": "المشتريات",
          "isGroupHeader": true,
          "icon": "ShoppingCart"
        },
        {
          "id": "purchase-day-report",
          "labelEn": "Purchase Day Report",
          "labelAr": "تقرير مشتريات اليوم",
          "icon": "Calendar",
          "url": "/reports/purchase-day-report",
          "svgLogo": purchaseDayReportSvg,
          "group": "purchase-reports"
        },

        // ── 5. Inventory ──
        {
          "id": "inventory-group",
          "labelEn": "Inventory",
          "labelAr": "المخزون",
          "isGroupHeader": true,
          "icon": "Warehouse"
        },
        {
          "id": "price-list-report",
          "labelEn": "Price List",
          "labelAr": "قائمة الأسعار",
          "icon": "ListOrdered",
          "url": "/reports/price-list-report",
          "svgLogo": priceListReportSvg,
          "group": "inventory"
        },
        {
          "id": "stock-value-report",
          "labelEn": "Stock Value",
          "labelAr": "قيمة المخزون",
          "icon": "DollarSign",
          "url": "/reports/stock-value-report",
          "svgLogo": stockValueReportSvg,
          "group": "inventory"
        },
        {
          "id": "fast-moving-report",
          "labelEn": "Fast Moving",
          "labelAr": "سريع الحركة",
          "icon": "Zap",
          "url": "/reports/fast-moving-stock",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "slow-moving-report",
          "labelEn": "Slow Moving",
          "labelAr": "بطيء الحركة",
          "icon": "Hourglass",
          "url": "/reports/slow-moving-stock",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "minimum-level-report",
          "labelEn": "Minimum Level",
          "labelAr": "الحد الأدنى",
          "icon": "ArrowDownToLine",
          "url": "/reports/minimum-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "maximum-level-report",
          "labelEn": "Maximum Level",
          "labelAr": "الحد الأقصى",
          "icon": "ArrowUpToLine",
          "url": "/reports/maximum-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "reorder-level-report",
          "labelEn": "Reorder Level",
          "labelAr": "مستوى إعادة الطلب",
          "icon": "RefreshCw",
          "url": "/reports/reorder-level",
          "svgLogo": stockReportSvg,
          "group": "inventory"
        },
        {
          "id": "unused-stock-report",
          "labelEn": "Unused Stock",
          "labelAr": "المخزون غير المستخدم",
          "icon": "PackageX",
          "url": "/reports/unused-stock",
          "svgLogo": physicalStockReportSvg,
          "group": "inventory"
        },
        {
          "id": "product-movement-report",
          "labelEn": "Product Movement",
          "labelAr": "حركة المنتج",
          "icon": "ArrowLeftRight",
          "url": "/reports/product-movement-report",
          "svgLogo": productMovementReportSvg,
          "group": "inventory"
        },
        {
          "id": "product-wise-voucher-search",
          "labelEn": "Product wise Voucher Search",
          "labelAr": "بحث القسائم حسب المنتج",
          "icon": "Search",
          "url": "/search/product-search-voucher-wise",
          "svgLogo": productWiseSalesSummaryReportSvg,
          "group": "inventory"
        }
      ]
    },
    {
      "id": "financialStatementsReports",
      "labelEn": "Financial Statement",
      "labelAr": "تقارير البيانات المالية",
      "icon": "FileText",
      "children": [
        // ── 2. Financial Statements ──
        {
          "id": "financial-statements-group",
          "labelEn": "Financial Statements",
          "labelAr": "البيانات المالية",
          "isGroupHeader": true,
          "icon": "Landmark"
        },
        {
          "id": "trial-balance",
          "labelEn": "Trial Balance",
          "labelAr": "ميزان المراجعة",
          "icon": "ArrowLeftRight",
          "url": "/reports/trial-balance",
          "svgLogo": trialBalanceSvg,
          "group": "financial-statements"
        },
        {
          "id": "profit-loss-analysis",
          "labelEn": "Profit & Loss Accounts",
          "labelAr": "حسابات الأرباح والخسائر",
          "icon": "TrendingUp",
          "url": "/reports/profit-loss-analysis",
          "svgLogo": profitLossAnalysisSvg,
          "group": "financial-statements"
        },
        {
          "id": "balance-sheet-report",
          "labelEn": "Balance Sheet",
          "labelAr": "الميزانية العمومية",
          "icon": "BarChart3",
          "url": "/reports/balance-sheet",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "income-expense-report",
          "labelEn": "Account Summery",
          "labelAr": "الإيرادات والمصروفات",
          "icon": "BarChart3",
          "url": "/reports/income-expense-report",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "income-expentiture-report",
          "labelEn": "Income & Expenditure",
          "labelAr": "الإيرادات والمصروفات",
          "icon": "BarChart3",
          "url": "/reports/income-expentiture-report",
          "svgLogo": balanceSheetReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "cash-flow-summary",
          "labelEn": "Cash Flow",
          "labelAr": "التدفق النقدي",
          "icon": "Wallet",
          "url": "/reports/cash-flow-summary",
          "svgLogo": fundFlowSvg,
          "group": "financial-statements"
        },
        {
          "id": "fund-flow",
          "labelEn": "Fund Flow",
          "labelAr": "تدفق الأموال",
          "icon": "ArrowLeftRight",
          "url": "/reports/fund-flow",
          "svgLogo": fundFlowSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-group-chart",
          "labelEn": "Chart of Accounts",
          "labelAr": "مخطط الحسابات",
          "icon": "GitBranch",
          "url": "/reports/account-group-chart",
          "svgLogo": accountGroupChartSvg,
          "group": "financial-statements"
        },
        {
          "id": "day-book-summary",
          "labelEn": "Daybook Summary",
          "labelAr": "ملخص دفتر اليوميات",
          "icon": "BookOpen",
          "url": "/reports/day-book-summary",
          "svgLogo": dayBookSummarySvg,
          "group": "financial-statements"
        },
        {
          "id": "cash-book",
          "labelEn": "Cash Book",
          "labelAr": "كتاب النقدية",
          "icon": "Wallet",
          "url": "/reports/cash-book",
          "svgLogo": cashBookSvg,
          "group": "financial-statements"
        },
        {
          "id": "bank-book",
          "labelEn": "Bank Book",
          "labelAr": "كتاب البنك",
          "icon": "Landmark",
          "url": "/reports/bank-book",
          "svgLogo": bankBookSvg,
          "group": "financial-statements"
        },
        {
          "id": "day-book-report",
          "labelEn": "Daybook",
          "labelAr": "دفتر اليوميات",
          "icon": "BookText",
          "url": "/reports/day-book-report",
          "svgLogo": dayBookReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "ledger-detailed-report",
          "labelEn": "Detailed Ledger Report",
          "labelAr": "تقرير دفتر الأستاذ المفصل",
          "icon": "ScrollText",
          "url": "/reports/ledger-detailed-report",
          "svgLogo": ledgerDetailedReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-group-report",
          "labelEn": "Account Group Report",
          "labelAr": "تقرير مجموعة الحسابات",
          "icon": "Layers",
          "url": "/reports/account-group-report",
          "svgLogo": accountGroupReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "ledger-report",
          "labelEn": "Ledger Report",
          "labelAr": "تقرير دفتر الحسابات",
          "icon": "BookText",
          "url": "/reports/ledger-report",
          "svgLogo": accountLedgerReportSvg,
          "group": "financial-statements"
        },
        {
          "id": "account-ledger-report",
          "labelEn": "Account Ledger Report",
          "labelAr": "تقرير مجموعة الحسابات",
          "icon": "Layers",
          "url": "/reports/account-ledger-report",
          "svgLogo": accountGroupReportSvg,
          "group": "financial-statements"
        },

      ]
    },
    // ==================== GENERAL ====================
    {
      "id": "general",
      "labelEn": "General",
      "labelAr": "عام",
      "icon": "Settings",
      "children": [
        {
          "id": "general-group",
          "labelEn": "General",
          "labelAr": "عام",
          "isGroupHeader": true,
          "icon": "Settings"
        },
        {
          "id": "generalReminder",
          "labelEn": "Reminders",
          "labelAr": "التذكيرات",
          "icon": "Bell",
          "url": "/general/reminders",
          "group": "general",
          "svgLogo": reminderSvg
        }
      ]
    },
    {
      "id": "settings",
      "labelEn": "Settings & Tools",
      "labelAr": "الإعدادات والأدوات",
      "icon": "Wrench",
      "children": [
        {
          "id": "fin-year-group",
          "labelEn": "Financial Year",
          "labelAr": "السنة المالية",
          "isGroupHeader": true,
          "icon": "Calendar"
        },
        {
          "id": "financialYearNew",
          "labelEn": "New",
          "labelAr": "جديد السنة المالية",
          "icon": "CalendarPlus",
          "group": "fin-year",
          "svgLogo": newFinancialYearSvg
        },
        {
          "id": "financialYearEdit",
          "labelEn": "Edit",
          "labelAr": "تعديل السنة المالية",
          "icon": "CalendarCog",
          "group": "fin-year",
          "svgLogo": financialYearEditSvg
        },
        {
          "id": "financialYearChange",
          "labelEn": "Change",
          "labelAr": "تغيير السنة المالية",
          "icon": "CalendarCheck",
          "url": "/master/financial-year",
          "group": "fin-year",
          "svgLogo": financialYearChangeSvg
        },
        {
          "id": "financialYearClose",
          "labelEn": "Close Financial Year",
          "labelAr": "إغلاق السنة المالية",
          "icon": "CalendarX",
          "group": "fin-year",
          "svgLogo": financialYearCloseSvg
        },
        {
          "id": "other-settings-group",
          "labelEn": "Others",
          "labelAr": "أخرى",
          "isGroupHeader": true,
          "icon": "Settings"
        },
        {
          "id": "suffixPrefixSettings",
          "labelEn": "Suffix Prefix Settings",
          "labelAr": "إعدادات اللاحقة والبادئة",
          "icon": "Settings2",
          "url": "/settings/suffix-prefix-settings",
          "group": "other-settings",
          "svgLogo": suffixPrefixSettingsSvg
        },
        {
          id: "changeuserPassword",
          labelEn: "Change Password",
          labelAr: "تغيير كلمة المرور",
          icon: "Settings",
          url: "/settings/change-password",
          group: "other-settings",
          svgLogo: mainSettingsSvg,
        },
        {
          "id": "mainSettings",
          "labelEn": "Settings",
          "labelAr": "الإعدادات",
          "icon": "Settings",
          "url": "/settings",
          "group": "other-settings",
          "svgLogo": mainSettingsSvg
        }
      ]
    }
  ].filter(Boolean)
};
// Function to fetch user privileges
const fetchPrivileges = async () => {
  const userGroupId = localStorage.getItem('userRole');

  try {
    const response = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);

    return response.data.data;
  } catch (error) {
    console.error('Error fetching privileges:', error);
    throw error;
  }
};

// Function to check if user has access to a specific window/menu item
const hasMenuAccess = (privileges, menuLabel) => {
  const userGroupId = localStorage.getItem('userRole');

  if (userGroupId === 1) return true;
  const privilege = privileges.find(p => p.window_name === menuLabel);

  if (!privilege) return false;

  return (
    privilege.can_all ||
    privilege.can_view ||
    privilege.can_add ||
    privilege.can_edit ||
    privilege.can_delete ||
    privilege.can_post ||
    privilege.can_home
  );
};

// Function to filter menu data based on user privileges
const filterMenuByPrivileges = (menuData, privileges) => {
  const userGroupId = localStorage.getItem('userRole');

  // if (Number(userGroupId) === 1) return menuData;

  if (!privileges || privileges.length === 0) {
    return { menuItems: [] };
  }


  const filteredMenuItems = menuData.menuItems
    .map(parentItem => {
      const filteredChildren = parentItem.children
        ?.filter(child => child && typeof child === 'object')
        ?.filter(child => {
          if (child.isGroupHeader) return true;
          return hasMenuAccess(privileges, child.labelEn);
        }) || [];

      // Remove group headers if no items in that group are visible
      const finalChildren = filteredChildren.filter(child => {
        if (!child.isGroupHeader) return true;

        const groupItems = filteredChildren.filter(
          item => item.group === child.id.replace('-group', '')
        );
        return groupItems.length > 0;
      });

      if (finalChildren.length > 0) {
        return {
          ...parentItem,
          children: finalChildren
        };
      }

      return null;
    })
    .filter(item => item !== null);

  return { menuItems: filteredMenuItems };
};

const getFilteredMenuData = async () => {
  try {
    const userId = Number(localStorage.getItem('userId'));

    // if (userId === 1) {
    //   return defaultMenuData;
    // }

    const userGroupId = localStorage.getItem("userRole");
    const response = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);

    const privileges = response.data.data;

    const filteredMenuData = filterMenuByPrivileges(defaultMenuData, privileges);

    return filteredMenuData;
  } catch (error) {
    console.error("Error fetching filtered menu data:", error);
    return { menuItems: [] };
  }
};

const refreshMenuDataWithPrivileges = async () => {
  const userGroupId = localStorage.getItem('userRole');

  try {
    if (!userGroupId) {
      console.warn('No user role found');
      return { menuItems: [] };
    }

    const privileges = await fetchPrivileges();
    return filterMenuByPrivileges(defaultMenuData, privileges);
  } catch (error) {
    console.error('Error refreshing menu data with privileges:', error);
    return { menuItems: [] };
  }
};

const getMenuData = () => {
  const MENU_STORAGE_KEY = 'appMenuData';

  try {
    const menuData = localStorage.getItem(MENU_STORAGE_KEY);
    return menuData ? JSON.parse(menuData) : { menuItems: [] };
  } catch (error) {
    console.error('Error reading menu data from localStorage:', error);
    return { menuItems: [] };
  }
};

const clearMenuData = () => {
  const MENU_STORAGE_KEY = 'appMenuData';

  try {
    localStorage.removeItem(MENU_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing menu data:', error);
    return false;
  }
};

const isMenuItemAccessible = (menuItemLabel) => {
  const userGroupId = localStorage.getItem('userRole');

  if (!userGroupId) return false;

  return fetchPrivileges(userGroupId)
    .then(privileges => hasMenuAccess(privileges, menuItemLabel))
    .catch(error => {
      console.error('Error checking menu access:', error);
      return false;
    });
};

const getMenuDataSync = () => {
  const MENU_STORAGE_KEY = 'appMenuData';

  try {
    const menuData = localStorage.getItem(MENU_STORAGE_KEY);
    if (menuData) {
      return JSON.parse(menuData);
    } else {
      console.warn('No menu data found in localStorage. Call initializeMenuDataWithPrivileges first.');
      return { menuItems: [] };
    }
  } catch (error) {
    console.error('Error reading menu data from localStorage:', error);
    return { menuItems: [] };
  }
};

export {
  getMenuData,
  getMenuDataSync,
  getFilteredMenuData,
  refreshMenuDataWithPrivileges,
  clearMenuData,
  isMenuItemAccessible,
  hasMenuAccess,
  filterMenuByPrivileges,
  defaultMenuData
};