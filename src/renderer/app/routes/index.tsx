import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ROUTES } from './constants/shared.paths';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { ErrorBoundary } from '../../shared/components/Feedback/ErrorBoundary';
import { PublicRoute } from './PublicRoute';
import { AuthMiddlewareRoute } from './middleware/AuthMiddlewareRoute';
import { ModuleAccessMiddleware } from './middleware/ModuleAccessMiddleware';
import { EstimatesAccessMiddleware } from './middleware/EstimatesAccessMiddleware';
import { HrAccessMiddleware, HrIndexRedirect } from './middleware/HrAccessMiddleware';
import { ModuleLandingRedirect } from './middleware/ModuleLandingRedirect';
import { AppChrome } from '../../shared/components/layout/AppChrome';
import { Layout } from '../../shared/components/layout/Layout';
import NewSalePage from '../../modules/sales/NewSale';
import SalesHistoryPage from '../../modules/sales/SalesHistoryPage';
import OrdersPage from '../../modules/sales/OrdersPage';
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
import ModuleAccessSettingsPage from '../../modules/settings/ModuleAccessSettingsPage';
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
import PipelineLayout from '../../modules/pipeline/pages/PipelineLayout';
import BoardsPage from '../../modules/pipeline/pages/BoardsPage';
import BoardKanbanPage from '../../modules/pipeline/pages/BoardKanbanPage';
import MyWorkPage from '../../modules/pipeline/pages/MyWorkPage';
import AllLeadsPage from '../../modules/pipeline/pages/AllLeadsPage';
import InsightsPage from '../../modules/pipeline/pages/InsightsPage';
import PipelineSettingsPage from '../../modules/pipeline/pages/PipelineSettingsPage';
import DocumentsLayout from '../../modules/documents/pages/DocumentsLayout';
import CabinetsPage from '../../modules/documents/pages/CabinetsPage';
import DocumentsCabinetPage from '../../modules/documents/pages/DocumentsCabinetPage';
import { PlatformAdminRoute } from './middleware/PlatformAdminRoute';
// import SubscriptionSettingsPage from '../../modules/settings/SubscriptionSettingsPage';
import LandingLayout from '../../modules/landing/LandingLayout';
import LandingPage from '../../modules/landing/LandingPage';
import PrivacyPage from '../../modules/landing/PrivacyPage';
import PricingPage from '../../modules/landing/PricingPage';

const EstimatesLayout = lazy(() => import('../../modules/estimates/pages/EstimatesLayout'));
const EstimatesPage = lazy(() => import('../../modules/estimates/pages/EstimatesPage'));
const EstimateDetailPage = lazy(() => import('../../modules/estimates/pages/EstimateDetailPage'));
const ProjectsPage = lazy(() => import('../../modules/estimates/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('../../modules/estimates/pages/ProjectDetailPage'));
const ProjectBoardsPage = lazy(() => import('../../modules/estimates/pages/ProjectBoardsPage'));
const ProjectBoardPage = lazy(() => import('../../modules/estimates/pages/ProjectBoardPage'));
const EstimatesInsightsPage = lazy(() => import('../../modules/estimates/pages/EstimatesInsightsPage'));
const EstimateTemplatesPage = lazy(() => import('../../modules/estimates/pages/EstimateTemplatesPage'));

const HrLayout = lazy(() => import('../../modules/hr/pages/HrLayout'));
const HrOverviewPage = lazy(() => import('../../modules/hr/pages/HrOverviewPage'));
const HrPeoplePage = lazy(() => import('../../modules/hr/pages/HrPeoplePage'));
const HrEmployeeDetailPage = lazy(() => import('../../modules/hr/pages/HrEmployeeDetailPage'));
const HrDepartmentsPage = lazy(() => import('../../modules/hr/pages/HrDepartmentsPage'));
const HrAttendancePage = lazy(() => import('../../modules/hr/pages/HrAttendancePage'));
const HrLeavePage = lazy(() => import('../../modules/hr/pages/HrLeavePage'));
const HrPayrollPage = lazy(() => import('../../modules/hr/pages/HrPayrollPage'));
const HrPayRunDetailPage = lazy(() => import('../../modules/hr/pages/HrPayRunDetailPage'));
const HrTalentPage = lazy(() => import('../../modules/hr/pages/HrTalentPage'));
const HrReportsPage = lazy(() => import('../../modules/hr/pages/HrReportsPage'));
const HrSettingsPage = lazy(() => import('../../modules/hr/pages/HrSettingsPage'));

const ForecastingOverviewPage = lazy(() => import('../../modules/forecasting/pages/ForecastingOverviewPage'));
const ForecastingBudgetsPage = lazy(() => import('../../modules/forecasting/pages/ForecastingBudgetsPage'));
const ForecastingBudgetDetailPage = lazy(() => import('../../modules/forecasting/pages/ForecastingBudgetDetailPage'));
const ForecastingKpisPage = lazy(() => import('../../modules/forecasting/pages/ForecastingKpisPage'));
const ForecastingScenariosPage = lazy(() => import('../../modules/forecasting/pages/ForecastingScenariosPage'));

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
            <Route path={ROUTES.SALES.ORDERS} element={<SuspenseWrapper><OrdersPage /></SuspenseWrapper>} />
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
          <Route element={<ModuleAccessMiddleware module="pipeline" />}>
            <Route path={ROUTES.PIPELINE.INDEX} element={<Navigate to={ROUTES.PIPELINE.BOARDS} replace />} />
            <Route element={<SuspenseWrapper><PipelineLayout /></SuspenseWrapper>}>
              <Route path={ROUTES.PIPELINE.BOARDS} element={<SuspenseWrapper><BoardsPage /></SuspenseWrapper>} />
              <Route path="/pipeline/boards/:boardId" element={<SuspenseWrapper><BoardKanbanPage /></SuspenseWrapper>} />
              <Route path={ROUTES.PIPELINE.MY_WORK} element={<SuspenseWrapper><MyWorkPage /></SuspenseWrapper>} />
              <Route path={ROUTES.PIPELINE.LEADS} element={<SuspenseWrapper><AllLeadsPage /></SuspenseWrapper>} />
              <Route path={ROUTES.PIPELINE.INSIGHTS} element={<SuspenseWrapper><InsightsPage /></SuspenseWrapper>} />
              <Route path={ROUTES.PIPELINE.SETTINGS} element={<SuspenseWrapper><PipelineSettingsPage /></SuspenseWrapper>} />
            </Route>
          </Route>
          <Route element={<EstimatesAccessMiddleware />}>
            <Route element={<SuspenseWrapper><EstimatesLayout /></SuspenseWrapper>}>
              <Route path={ROUTES.ESTIMATES.INDEX} element={<SuspenseWrapper><EstimatesPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ESTIMATES.MY_PROJECTS} element={<Navigate to={ROUTES.ESTIMATES.BOARDS} replace />} />
              <Route path={ROUTES.ESTIMATES.PROJECTS} element={<SuspenseWrapper><ProjectsPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ESTIMATES.BOARDS} element={<SuspenseWrapper><ProjectBoardsPage /></SuspenseWrapper>} />
              <Route path="/estimates/boards/:boardId" element={<SuspenseWrapper><BoardKanbanPage /></SuspenseWrapper>} />
              <Route path="/estimates/projects/:id" element={<SuspenseWrapper><ProjectDetailPage /></SuspenseWrapper>} />
              <Route path="/estimates/projects/:id/board" element={<SuspenseWrapper><ProjectBoardPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ESTIMATES.INSIGHTS} element={<SuspenseWrapper><EstimatesInsightsPage /></SuspenseWrapper>} />
              <Route path={ROUTES.ESTIMATES.TEMPLATES} element={<SuspenseWrapper><EstimateTemplatesPage /></SuspenseWrapper>} />
              <Route path="/estimates/:id" element={<SuspenseWrapper><EstimateDetailPage /></SuspenseWrapper>} />
            </Route>
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
          <Route element={<ModuleAccessMiddleware module="documents" />}>
            <Route path={ROUTES.DOCUMENTS.INDEX} element={<SuspenseWrapper><DocumentsLayout /></SuspenseWrapper>}>
              <Route index element={<SuspenseWrapper><CabinetsPage /></SuspenseWrapper>} />
              <Route path="cabinets/:cabinetId" element={<SuspenseWrapper><DocumentsCabinetPage /></SuspenseWrapper>} />
            </Route>
          </Route>
          <Route element={<ModuleAccessMiddleware module="hr" />}>
            <Route element={<HrAccessMiddleware />}>
              <Route path="/hr" element={<SuspenseWrapper><HrLayout /></SuspenseWrapper>}>
                <Route index element={<HrIndexRedirect />} />
                <Route path="overview" element={<SuspenseWrapper><HrOverviewPage /></SuspenseWrapper>} />
                <Route path="people" element={<SuspenseWrapper><HrPeoplePage /></SuspenseWrapper>} />
                <Route path="people/:employeeId" element={<SuspenseWrapper><HrEmployeeDetailPage /></SuspenseWrapper>} />
                <Route path="departments" element={<SuspenseWrapper><HrDepartmentsPage /></SuspenseWrapper>} />
                <Route path="attendance" element={<SuspenseWrapper><HrAttendancePage /></SuspenseWrapper>} />
                <Route path="leave" element={<SuspenseWrapper><HrLeavePage /></SuspenseWrapper>} />
                <Route path="payroll" element={<SuspenseWrapper><HrPayrollPage /></SuspenseWrapper>} />
                <Route path="payroll/runs/:payRunId" element={<SuspenseWrapper><HrPayRunDetailPage /></SuspenseWrapper>} />
                <Route path="talent" element={<SuspenseWrapper><HrTalentPage /></SuspenseWrapper>} />
                <Route path="reports" element={<SuspenseWrapper><HrReportsPage /></SuspenseWrapper>} />
                <Route path="settings" element={<SuspenseWrapper><HrSettingsPage /></SuspenseWrapper>} />
              </Route>
            </Route>
          </Route>
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
          <Route element={<ModuleAccessMiddleware module="forecasting" />}>
            <Route path={ROUTES.FORECASTING.INDEX} element={<Navigate to={ROUTES.FORECASTING.OVERVIEW} replace />} />
            <Route path={ROUTES.FORECASTING.OVERVIEW} element={<SuspenseWrapper><ForecastingOverviewPage /></SuspenseWrapper>} />
            <Route path={ROUTES.FORECASTING.BUDGETS} element={<SuspenseWrapper><ForecastingBudgetsPage /></SuspenseWrapper>} />
            <Route path="/forecasting/budgets/:budgetId" element={<SuspenseWrapper><ForecastingBudgetDetailPage /></SuspenseWrapper>} />
            <Route path={ROUTES.FORECASTING.KPIS} element={<SuspenseWrapper><ForecastingKpisPage /></SuspenseWrapper>} />
            <Route path={ROUTES.FORECASTING.SCENARIOS} element={<SuspenseWrapper><ForecastingScenariosPage /></SuspenseWrapper>} />
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
              <Route path="modules" element={<SuspenseWrapper><ModuleAccessSettingsPage /></SuspenseWrapper>} />
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
