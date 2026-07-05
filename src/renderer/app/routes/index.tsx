import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { ROUTES } from './constants/shared.paths';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { ErrorBoundary } from '../../shared/components/Feedback/ErrorBoundary';
import { PublicRoute } from './PublicRoute';
import { AuthMiddlewareRoute } from './middleware/AuthMiddlewareRoute';
import { ModuleAccessMiddleware } from './middleware/ModuleAccessMiddleware';
import { ModuleLandingRedirect } from './middleware/ModuleLandingRedirect';
import { AppChrome } from '../../shared/components/layout/AppChrome';
import { Layout } from '../../shared/components/layout/Layout';
import NewSalePage from '../../modules/sales/NewSale';
import SalesHistoryPage from '../../modules/sales/SalesHistoryPage';
import RefundsPage from '../../modules/sales/RefundsPage';
import MyShiftPage from '../../modules/shifts/MyShiftPage';
import DashboardPage from '../../modules/dashboard/DashboardPage';
import RecordExpensePage from '../../modules/expenses/RecordExpensePage';
import ExpenseListPage from '../../modules/expenses/ExpenseListPage';
import LoginPage from '../../modules/auth/LoginPage';
import RegisterPage from '../../modules/auth/RegisterPage';
import ForgotPasswordPage from '../../modules/auth/ForgotPasswordPage';
import ResetPasswordPage from '../../modules/auth/ResetPasswordPage';
import ProductsPage from '../../modules/inventory/ProductsPage';
import CategoriesPage from '../../modules/inventory/CategoriesPage';
import StockLedgerPage from '../../modules/inventory/StockLedgerPage';
import CustomerListPage from '../../modules/customers/CustomerListPage';
import InvoicesPage from '../../modules/invoices/InvoicesPage';
import SettingsPage from '../../modules/settings/SettingsPage';
import BusinessSettingsPage from '../../modules/settings/BusinessSettingsPage';
import TaxCompliancePage from '../../modules/settings/TaxCompliancePage';
import ProfileSettingsPage from '../../modules/settings/ProfileSettingsPage';
import StaffSettingsPage from '../../modules/settings/StaffSettingsPage';
import RoleSettingsPage from '../../modules/settings/RoleSettingsPage';
import PlatformOverviewPage from '../../modules/platform/PlatformOverviewPage';
import PlatformBusinessesPage from '../../modules/platform/PlatformBusinessesPage';
import PlatformUsersPage from '../../modules/platform/PlatformUsersPage';
import PlatformRolesPage from '../../modules/platform/PlatformRolesPage';
import PlatformGuideTutorialsPage from '../../modules/platform/PlatformGuideTutorialsPage';
import PlatformGuideFaqsPage from '../../modules/platform/PlatformGuideFaqsPage';
import PlatformGuideFeedbackPage from '../../modules/platform/PlatformGuideFeedbackPage';
import PlatformSentMessagesPage from '../../modules/platform/PlatformSentMessagesPage';
import AccountPage from '../../modules/account/AccountPage';
import NotificationsPage from '../../modules/notifications/NotificationsPage';
import ChartOfAccountsPage from '../../modules/accounting/pages/ChartOfAccountsPage';
import AccountingReportingLayout from '../../modules/accounting/AccountingReportingLayout';
import JournalEntriesPage from '../../modules/accounting/pages/JournalEntriesPage';
import TrialBalancePage from '../../modules/accounting/pages/TrialBalancePage';
import IncomeStatementPage from '../../modules/accounting/pages/IncomeStatementPage';
import BalanceSheetPage from '../../modules/accounting/pages/BalanceSheetPage';
import RatiosPage from '../../modules/accounting/pages/RatiosPage';
import FinancialStatementsPage from '../../modules/accounting/pages/FinancialStatementsPage';
import AccountingPeriodsPage from '../../modules/accounting/pages/AccountingPeriodsPage';
import FixedAssetsPage from '../../modules/accounting/pages/FixedAssetsPage';
import AccountingSettingsPage from '../../modules/accounting/pages/AccountingSettingsPage';
import GuideTutorialsPage from '../../modules/guide/GuideTutorialsPage';
import GuideFaqsPage from '../../modules/guide/GuideFaqsPage';
import GuideFeedbackPage from '../../modules/guide/GuideFeedbackPage';
import GuideContactPage from '../../modules/guide/GuideContactPage';
import { PlatformAdminRoute } from './middleware/PlatformAdminRoute';
// import SubscriptionSettingsPage from '../../modules/settings/SubscriptionSettingsPage';
import LandingLayout from '../../modules/landing/LandingLayout';
import LandingPage from '../../modules/landing/LandingPage';
import PrivacyPage from '../../modules/landing/PrivacyPage';
import PricingPage from '../../modules/landing/PricingPage';

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<SuspenseWrapper><LandingLayout /></SuspenseWrapper>}>
          <Route path="/" element={<SuspenseWrapper><LandingPage /></SuspenseWrapper>} />
          <Route path={ROUTES.PRICING} element={<SuspenseWrapper><PricingPage /></SuspenseWrapper>} />
          <Route path={ROUTES.PRIVACY} element={<SuspenseWrapper><PrivacyPage /></SuspenseWrapper>} />
        </Route>
        <Route path={ROUTES.LOGIN} element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path={ROUTES.REGISTER} element={<SuspenseWrapper><RegisterPage /></SuspenseWrapper>} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>} />
        <Route path={ROUTES.RESET_PASSWORD} element={<SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>} />
      </Route>
      <Route element={<AuthMiddlewareRoute />}>
        <Route element={<AppChrome />}>
        <Route element={<Layout />}>
          <Route path="/app" element={<ModuleLandingRedirect />} />
          <Route element={<ModuleAccessMiddleware module="dashboard" />}>
            <Route path={ROUTES.DASHBOARD} element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="sales" />}>
            <Route path={ROUTES.SALES.INDEX} element={<Navigate to={ROUTES.SALES.NEW} replace />} />
            <Route path={ROUTES.SALES.NEW} element={<SuspenseWrapper><NewSalePage /></SuspenseWrapper>} />
            <Route path={ROUTES.SALES.HISTORY} element={<SuspenseWrapper><SalesHistoryPage /></SuspenseWrapper>} />
            <Route path={ROUTES.SALES.REFUNDS} element={<SuspenseWrapper><RefundsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.SALES.MY_SHIFT} element={<SuspenseWrapper><MyShiftPage /></SuspenseWrapper>} />
            <Route path={ROUTES.INVOICES.INDEX} element={<SuspenseWrapper><InvoicesPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="inventory" />}>
            <Route path={ROUTES.INVENTORY.INDEX} element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
            <Route path={ROUTES.INVENTORY.PRODUCTS} element={<SuspenseWrapper><ProductsPage /></SuspenseWrapper>} />
            <Route path="/inventory/products/new" element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
            <Route path="/inventory/products/:id/edit" element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
            <Route path={ROUTES.INVENTORY.CATEGORIES} element={<SuspenseWrapper><CategoriesPage /></SuspenseWrapper>} />
            <Route path={ROUTES.INVENTORY.STOCK} element={<SuspenseWrapper><StockLedgerPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="customers" />}>
            <Route path={ROUTES.CUSTOMERS.INDEX} element={<SuspenseWrapper><CustomerListPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="expenses" />}>
            <Route path={ROUTES.EXPENSES.INDEX} element={<Navigate to={ROUTES.EXPENSES.LIST} replace />} />
            <Route path={ROUTES.EXPENSES.LIST} element={<SuspenseWrapper><ExpenseListPage /></SuspenseWrapper>} />
            <Route path={ROUTES.EXPENSES.CATEGORIES} element={<SuspenseWrapper><RecordExpensePage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="account" />}>
            <Route path={ROUTES.ACCOUNT.INDEX} element={<SuspenseWrapper><AccountPage /></SuspenseWrapper>}>
              <Route index element={<Navigate to={ROUTES.ACCOUNT.NOTIFICATIONS} replace />} />
              <Route path="notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
              <Route path="profile" element={<SuspenseWrapper><ProfileSettingsPage /></SuspenseWrapper>} />
            </Route>
          </Route>
          <Route path="/notifications" element={<Navigate to={ROUTES.ACCOUNT.NOTIFICATIONS} replace />} />
          <Route path="/settings/profile" element={<Navigate to={ROUTES.ACCOUNT.PROFILE} replace />} />
          <Route path="/settings/notifications" element={<Navigate to={ROUTES.ACCOUNT.NOTIFICATIONS} replace />} />
          <Route element={<ModuleAccessMiddleware module="accounting" />}>
            <Route path={ROUTES.ACCOUNTING.INDEX} element={<Navigate to={ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS} replace />} />
            <Route path={ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS} element={<SuspenseWrapper><ChartOfAccountsPage /></SuspenseWrapper>} />
            <Route element={<AccountingReportingLayout />}>
              <Route path={ROUTES.ACCOUNTING.JOURNAL_ENTRIES} element={<SuspenseWrapper><JournalEntriesPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ACCOUNTING.RATIOS} element={<SuspenseWrapper><RatiosPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ACCOUNTING.STATEMENTS} element={<SuspenseWrapper><FinancialStatementsPage /></SuspenseWrapper>} />
            </Route>
            <Route path={ROUTES.ACCOUNTING.TRIAL_BALANCE} element={<SuspenseWrapper><TrialBalancePage /></SuspenseWrapper>} />
            <Route path={ROUTES.ACCOUNTING.INCOME_STATEMENT} element={<SuspenseWrapper><IncomeStatementPage /></SuspenseWrapper>} />
            <Route path={ROUTES.ACCOUNTING.BALANCE_SHEET} element={<SuspenseWrapper><BalanceSheetPage /></SuspenseWrapper>} />
            <Route path={ROUTES.ACCOUNTING.PERIODS} element={<SuspenseWrapper><AccountingPeriodsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.ACCOUNTING.FIXED_ASSETS} element={<SuspenseWrapper><FixedAssetsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.ACCOUNTING.SETTINGS} element={<SuspenseWrapper><AccountingSettingsPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="guide" />}>
            <Route path={ROUTES.GUIDE.INDEX} element={<Navigate to={ROUTES.GUIDE.TUTORIALS} replace />} />
            <Route path={ROUTES.GUIDE.TUTORIALS} element={<SuspenseWrapper><GuideTutorialsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.GUIDE.FAQS} element={<SuspenseWrapper><GuideFaqsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.GUIDE.FEEDBACK} element={<SuspenseWrapper><GuideFeedbackPage /></SuspenseWrapper>} />
            <Route path={ROUTES.GUIDE.CONTACT} element={<SuspenseWrapper><GuideContactPage /></SuspenseWrapper>} />
          </Route>
          <Route element={<ModuleAccessMiddleware module="settings" />}>
            <Route path={ROUTES.SETTINGS.INDEX} element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>}>
              <Route index element={<Navigate to={ROUTES.SETTINGS.BUSINESS} replace />} />
              <Route path="business" element={<SuspenseWrapper><BusinessSettingsPage /></SuspenseWrapper>} />
              <Route path="tax" element={<SuspenseWrapper><TaxCompliancePage /></SuspenseWrapper>} />
              <Route path="staff" element={<SuspenseWrapper><StaffSettingsPage /></SuspenseWrapper>} />
              <Route path="roles" element={<SuspenseWrapper><RoleSettingsPage /></SuspenseWrapper>} />
              {/* <Route path="subscription" element={<SuspenseWrapper><SubscriptionSettingsPage /></SuspenseWrapper>} /> */}
            </Route>
          </Route>
          <Route element={<PlatformAdminRoute />}>
            <Route path={ROUTES.PLATFORM.INDEX} element={<Navigate to={ROUTES.PLATFORM.OVERVIEW} replace />} />
            <Route path={ROUTES.PLATFORM.OVERVIEW} element={<SuspenseWrapper><PlatformOverviewPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.BUSINESSES} element={<SuspenseWrapper><PlatformBusinessesPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.USERS} element={<SuspenseWrapper><PlatformUsersPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.ROLES} element={<SuspenseWrapper><PlatformRolesPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.SENT_MESSAGES} element={<SuspenseWrapper><PlatformSentMessagesPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.GUIDE.INDEX} element={<Navigate to={ROUTES.PLATFORM.GUIDE.TUTORIALS} replace />} />
            <Route path={ROUTES.PLATFORM.GUIDE.TUTORIALS} element={<SuspenseWrapper><PlatformGuideTutorialsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.GUIDE.FAQS} element={<SuspenseWrapper><PlatformGuideFaqsPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.GUIDE.FEEDBACK} element={<SuspenseWrapper><PlatformGuideFeedbackPage /></SuspenseWrapper>} />
          </Route>
        </Route>
        </Route>
      </Route>
    </Routes>
  );
}
