import type { ElementType } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, Settings,
  Plus, History, RotateCcw, FolderTree, ClipboardList,
  UserCog, Shield, Building2, ListOrdered, Clock, Bell, Scale,
  GraduationCap, HelpCircle, MessageSquareHeart, CircleUser, Headset, BellRing,
  BookOpen, BookType, FileText, BarChart3, Percent,
  Kanban, Briefcase, TrendingUp, SlidersHorizontal, FileSpreadsheet, FolderKanban, LayoutTemplate, LayoutGrid, Files,
  IdCard, CalendarDays, Wallet, ClipboardCheck, Building, LineChart, Target, Layers,
  Store, Truck, PackageCheck, Compass, ShoppingBag, Download,
  CreditCard,
  DollarSign,
  Gift,
  GitBranch,
  ArrowRightLeft,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';

export interface SidebarSubItem {
  to: string;
  label: string;
  icon: ElementType;
  ownerOnly?: boolean;
}

export interface SidebarNavGroup {
  icon: ElementType;
  label: string;
  subItems: SidebarSubItem[];
}

export const baseSubRoutes = [
  ROUTES.DASHBOARD,
  ROUTES.DISCOVER, ROUTES.DISCOVER_MY_ORDERS,
  ROUTES.SALES.NEW, ROUTES.SALES.ORDERS, ROUTES.SALES.HISTORY, ROUTES.SALES.REFUNDS,
  ROUTES.INVENTORY.PRODUCTS, ROUTES.INVENTORY.CATEGORIES, ROUTES.INVENTORY.STOCK,
  ROUTES.CUSTOMERS.INDEX, ROUTES.CUSTOMERS.OVERVIEW,
  ROUTES.PIPELINE.BOARDS, ROUTES.PIPELINE.MY_WORK, ROUTES.PIPELINE.LEADS,
  ROUTES.PIPELINE.INSIGHTS, ROUTES.PIPELINE.SETTINGS, ROUTES.PIPELINE.REFERRALS,
  ROUTES.ESTIMATES.INDEX, ROUTES.ESTIMATES.PROJECTS, ROUTES.ESTIMATES.BOARDS,
  ROUTES.ESTIMATES.INSIGHTS, ROUTES.ESTIMATES.TEMPLATES,
  ROUTES.INVOICES.INDEX,
  ROUTES.INVOICES.SUPPLIER,
  ROUTES.EXPENSES.OVERVIEW, ROUTES.EXPENSES.INCOME, ROUTES.EXPENSES.BUDGETS, ROUTES.EXPENSES.CATEGORIES, ROUTES.EXPENSES.LIST,
  ROUTES.DOCUMENTS.INDEX,
  ROUTES.HR.OVERVIEW, ROUTES.HR.PEOPLE, ROUTES.HR.DEPARTMENTS, ROUTES.HR.COMPANY_ASSETS,
  ROUTES.HR.ATTENDANCE, ROUTES.HR.LEAVE, ROUTES.HR.PAYROLL, ROUTES.HR.TALENT,
  ROUTES.HR.TRANSFERS, ROUTES.HR.REPORTS, ROUTES.HR.SETTINGS,
  ROUTES.ACCOUNTING.RATIOS, ROUTES.ACCOUNTING.STATEMENTS,
  ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS, ROUTES.ACCOUNTING.JOURNAL_ENTRIES,
  ROUTES.ACCOUNTING.FIXED_ASSETS,
  ROUTES.FORECASTING.OVERVIEW, ROUTES.FORECASTING.BUDGETS,
  ROUTES.FORECASTING.KPIS, ROUTES.FORECASTING.SCENARIOS,
  ROUTES.GUIDE.TUTORIALS, ROUTES.GUIDE.FAQS, ROUTES.GUIDE.FEEDBACK, ROUTES.GUIDE.CONTACT,
  ROUTES.ACCOUNT.NOTIFICATIONS, ROUTES.ACCOUNT.PROFILE, ROUTES.REFERRAL,
  ROUTES.SETTINGS.BUSINESS, ROUTES.SETTINGS.SALES_CHANNELS, ROUTES.SETTINGS.TAX, ROUTES.SETTINGS.SUBSCRIPTION, ROUTES.SETTINGS.STAFF, ROUTES.SETTINGS.ROLES, ROUTES.SETTINGS.MODULES, ROUTES.SETTINGS.LOCATIONS, ROUTES.SETTINGS.DATA_EXPORT,
];

export const platformSubRoutes = [
  ROUTES.PLATFORM.OVERVIEW,
  ROUTES.PLATFORM.PLANS,
  ROUTES.PLATFORM.SUBSCRIPTIONS,
  ROUTES.PLATFORM.BUSINESSES,
  ROUTES.PLATFORM.USERS,
  ROUTES.PLATFORM.ROLES,
  ROUTES.PLATFORM.SENT_MESSAGES,
  ROUTES.PLATFORM.GUIDE.TUTORIALS,
  ROUTES.PLATFORM.SALES_REPS,
  ROUTES.PLATFORM.PAYOUTS,
  ROUTES.PLATFORM.CAMPAIGN_CODES,
  ROUTES.PLATFORM.GUIDE.FAQS,
  ROUTES.PLATFORM.GUIDE.FEEDBACK,
];

export const platformNavGroup: SidebarNavGroup = {
  icon: Shield,
  label: 'Platform',
  subItems: [
    { to: ROUTES.PLATFORM.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
    { to: ROUTES.PLATFORM.PLANS, label: 'Manage Plans', icon: CreditCard },
    { to: ROUTES.PLATFORM.SUBSCRIPTIONS, label: 'Manage Subscriptions', icon: Receipt },
    { to: ROUTES.PLATFORM.BUSINESSES, label: 'Businesses', icon: Building2 },
    { to: ROUTES.PLATFORM.USERS, label: 'All Users', icon: Users },
    { to: ROUTES.PLATFORM.ROLES, label: 'Platform Roles', icon: Shield },
    { to: ROUTES.PLATFORM.SENT_MESSAGES, label: 'Sent messages', icon: BellRing },
    { to: ROUTES.PLATFORM.SALES_REPS, label: 'Sales Reps', icon: Percent },
    { to: ROUTES.PLATFORM.PAYOUTS, label: 'Payouts', icon: DollarSign },
    { to: ROUTES.PLATFORM.CAMPAIGN_CODES, label: 'Campaign Codes', icon: Gift },
  ],
};

export const guideSettingsNavGroup: SidebarNavGroup = {
  icon: GraduationCap,
  label: 'Guide Settings',
  subItems: [
    { to: ROUTES.PLATFORM.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
    { to: ROUTES.PLATFORM.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
    { to: ROUTES.PLATFORM.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
  ],
};

export const baseNavGroups: SidebarNavGroup[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    subItems: [{ to: ROUTES.DASHBOARD, label: 'Overview', icon: LayoutDashboard }],
  },
  {
    icon: ShoppingCart,
    label: 'Sales',
    subItems: [
      { to: ROUTES.SALES.NEW, label: 'New Sale', icon: Plus },
      { to: ROUTES.SALES.ORDERS, label: 'Orders', icon: ListOrdered },
      { to: ROUTES.SALES.HISTORY, label: 'History', icon: History },
      { to: ROUTES.SALES.REFUNDS, label: 'Refunds', icon: RotateCcw },
      { to: ROUTES.SALES.MY_SHIFT, label: 'My Shift', icon: Clock },
      { to: ROUTES.INVOICES.INDEX, label: 'Sales invoices', icon: FileText },
    ],
  },
  {
    icon: Package,
    label: 'Inventory & Supply Chain',
    subItems: [
      { to: ROUTES.INVENTORY.PRODUCTS, label: 'Products', icon: Package },
      { to: ROUTES.INVENTORY.CATEGORIES, label: 'Categories', icon: FolderTree },
      { to: ROUTES.INVENTORY.STOCK, label: 'Stock Ledger', icon: ClipboardList },
      { to: ROUTES.INVENTORY.MARKETPLACE, label: 'Marketplace', icon: Store },
      { to: ROUTES.INVENTORY.PURCHASE_ORDERS, label: 'Purchase orders', icon: Truck },
      { to: ROUTES.INVENTORY.INCOMING_ORDERS, label: 'Incoming orders', icon: PackageCheck },
      { to: ROUTES.INVOICES.SUPPLIER, label: 'Supplier invoices', icon: Receipt },
    ],
  },
  {
    icon: Users,
    label: 'Customers',
    subItems: [
      { to: ROUTES.CUSTOMERS.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.CUSTOMERS.INDEX, label: 'Customer List', icon: Users },
    ],
  },
  {
    icon: Compass,
    label: 'Online Shopping',
    subItems: [
      { to: ROUTES.DISCOVER, label: 'Browse & Order', icon: Compass },
      { to: ROUTES.DISCOVER_MY_ORDERS, label: 'My Orders', icon: ShoppingBag },
    ],
  },
  {
    icon: Kanban,
    label: 'Sales Funnel',
    subItems: [
      { to: ROUTES.PIPELINE.BOARDS, label: 'Boards', icon: Kanban },
      { to: ROUTES.PIPELINE.MY_WORK, label: 'My Work', icon: Briefcase },
      { to: ROUTES.PIPELINE.LEADS, label: 'All Leads', icon: Users },
      { to: ROUTES.PIPELINE.INSIGHTS, label: 'Insights', icon: TrendingUp },
      { to: ROUTES.PIPELINE.SETTINGS, label: 'Settings', icon: SlidersHorizontal },
      { to: ROUTES.PIPELINE.REFERRALS, label: 'Referrals', icon: Gift },
    ],
  },
  {
    icon: FileSpreadsheet,
    label: 'Projects & Estimates',
    subItems: [
      { to: ROUTES.ESTIMATES.INDEX, label: 'All estimates', icon: FileSpreadsheet },
      { to: ROUTES.ESTIMATES.PROJECTS, label: 'Projects', icon: FolderKanban },
      { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban },
      { to: ROUTES.ESTIMATES.INSIGHTS, label: 'Insights', icon: TrendingUp },
      { to: ROUTES.ESTIMATES.TEMPLATES, label: 'Templates', icon: LayoutTemplate },
    ],
  },
  {
    icon: Receipt,
    label: 'Income & Expenses',
    subItems: [
      { to: ROUTES.EXPENSES.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.EXPENSES.INCOME, label: 'Income', icon: Wallet },
      { to: ROUTES.EXPENSES.BUDGETS, label: 'My Budgets', icon: Target },
      { to: ROUTES.EXPENSES.LIST, label: 'Expense List', icon: ListOrdered },
      { to: ROUTES.EXPENSES.CATEGORIES, label: 'Expense Categories', icon: Receipt },
    ],
  },
  {
    icon: Files,
    label: 'Documents',
    subItems: [
      { to: ROUTES.DOCUMENTS.INDEX, label: 'Business files', icon: Files },
    ],
  },
  {
    icon: IdCard,
    label: 'HR & Payroll',
    subItems: [
      { to: ROUTES.HR.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.HR.PEOPLE, label: 'People', icon: Users },
      { to: ROUTES.HR.DEPARTMENTS, label: 'Departments', icon: Building },
      { to: ROUTES.HR.COMPANY_ASSETS, label: 'Company Assets', icon: Package },
      { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
      { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
      { to: ROUTES.HR.PAYROLL, label: 'Payroll', icon: Wallet },
      { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
      { to: ROUTES.HR.TRANSFERS, label: 'Transfers', icon: ArrowRightLeft },
      { to: ROUTES.HR.REPORTS, label: 'Reports', icon: BarChart3 },
      { to: ROUTES.HR.SETTINGS, label: 'HR settings', icon: SlidersHorizontal },
    ],
  },
  {
    icon: BookOpen,
    label: 'Accounting',
    subItems: [
      { to: ROUTES.ACCOUNTING.RATIOS, label: 'Financial Ratios', icon: Percent },
      { to: ROUTES.ACCOUNTING.STATEMENTS, label: 'Financial Statements', icon: BarChart3 },
      { to: ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS, label: 'Chart of Accounts', icon: BookType },
      { to: ROUTES.ACCOUNTING.JOURNAL_ENTRIES, label: 'Journal Entries', icon: FileText },
      { to: ROUTES.ACCOUNTING.FIXED_ASSETS, label: 'Fixed Assets', icon: Building2 },
    ],
  },
  {
    icon: LineChart,
    label: 'Forecasting',
    subItems: [
      { to: ROUTES.FORECASTING.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
      { to: ROUTES.FORECASTING.BUDGETS, label: 'Budgets', icon: Layers },
      { to: ROUTES.FORECASTING.KPIS, label: 'KPIs', icon: Target },
      { to: ROUTES.FORECASTING.SCENARIOS, label: 'Scenarios', icon: TrendingUp },
    ],
  },
  {
    icon: GraduationCap,
    label: 'Custosell Guide',
    subItems: [
      { to: ROUTES.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
      { to: ROUTES.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
      { to: ROUTES.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
      { to: ROUTES.GUIDE.CONTACT, label: 'Contact & Help', icon: Headset },
    ],
  },
  {
    icon: CircleUser,
    label: 'Account',
    subItems: [
      { to: ROUTES.ACCOUNT.NOTIFICATIONS, label: 'Notifications', icon: Bell },
      { to: ROUTES.ACCOUNT.PROFILE, label: 'My Profile', icon: UserCog },
      { to: ROUTES.ACCOUNT.SECURITY, label: 'Security', icon: Shield },
      { to: ROUTES.ACCOUNT.REFERRALS, label: 'Referrals', icon: Gift },
    ],
  },
  {
    icon: Settings,
    label: 'Settings',
    subItems: [
      { to: ROUTES.SETTINGS.BUSINESS, label: 'Business', icon: Building2 },
      { to: ROUTES.SETTINGS.SALES_CHANNELS, label: 'Sales channels', icon: Store },
      { to: ROUTES.SETTINGS.TAX, label: 'Tax & VAT', icon: Scale },
      { to: ROUTES.SETTINGS.STAFF, label: 'Staff', icon: UserCog },
      { to: ROUTES.SETTINGS.ROLES, label: 'Roles', icon: Shield },
      { to: ROUTES.SETTINGS.LOCATIONS, label: 'Branches', icon: GitBranch },
      { to: ROUTES.SETTINGS.MODULES, label: 'Module access', icon: LayoutGrid, ownerOnly: true },
      { to: ROUTES.SETTINGS.SUBSCRIPTION, label: 'Billing & Subscription', icon: CreditCard, ownerOnly: true },
      { to: ROUTES.SETTINGS.DATA_EXPORT, label: 'Data & Export', icon: Download },
    ],
  },
];
