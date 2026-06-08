import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { ROUTES } from './constants/shared.paths';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { ErrorBoundary } from '../../shared/components/Feedback/ErrorBoundary';
import { PublicRoute } from './PublicRoute';
import { AuthMiddlewareRoute } from './middleware/AuthMiddlewareRoute';
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
import SettingsPage from '../../modules/settings/SettingsPage';
import BusinessSettingsPage from '../../modules/settings/BusinessSettingsPage';
import ProfileSettingsPage from '../../modules/settings/ProfileSettingsPage';
import StaffSettingsPage from '../../modules/settings/StaffSettingsPage';
import RoleSettingsPage from '../../modules/settings/RoleSettingsPage';
import PlatformOverviewPage from '../../modules/platform/PlatformOverviewPage';
import PlatformBusinessesPage from '../../modules/platform/PlatformBusinessesPage';
import PlatformUsersPage from '../../modules/platform/PlatformUsersPage';
import PlatformTeamPage from '../../modules/platform/PlatformTeamPage';
import NotificationsPage from '../../modules/notifications/NotificationsPage';
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
        <Route element={<Layout />}>
          <Route path={ROUTES.DASHBOARD} element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.INDEX} element={<Navigate to={ROUTES.SALES.NEW} replace />} />
          <Route path={ROUTES.SALES.NEW} element={<SuspenseWrapper><NewSalePage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.HISTORY} element={<SuspenseWrapper><SalesHistoryPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.REFUNDS} element={<SuspenseWrapper><RefundsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.MY_SHIFT} element={<SuspenseWrapper><MyShiftPage /></SuspenseWrapper>} />
          <Route path={ROUTES.INVENTORY.INDEX} element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
          <Route path={ROUTES.INVENTORY.PRODUCTS} element={<SuspenseWrapper><ProductsPage /></SuspenseWrapper>} />
          <Route path="/inventory/products/new" element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
          <Route path="/inventory/products/:id/edit" element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
          <Route path={ROUTES.INVENTORY.CATEGORIES} element={<SuspenseWrapper><CategoriesPage /></SuspenseWrapper>} />
          <Route path={ROUTES.INVENTORY.STOCK} element={<SuspenseWrapper><StockLedgerPage /></SuspenseWrapper>} />
          <Route path={ROUTES.CUSTOMERS.INDEX} element={<SuspenseWrapper><CustomerListPage /></SuspenseWrapper>} />
          <Route path={ROUTES.EXPENSES.INDEX} element={<Navigate to={ROUTES.EXPENSES.LIST} replace />} />
          <Route path={ROUTES.EXPENSES.LIST} element={<SuspenseWrapper><ExpenseListPage /></SuspenseWrapper>} />
          <Route path={ROUTES.EXPENSES.CATEGORIES} element={<SuspenseWrapper><RecordExpensePage /></SuspenseWrapper>} />
          <Route path={ROUTES.NOTIFICATIONS.INDEX} element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SETTINGS.INDEX} element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>}>
            <Route index element={<Navigate to={ROUTES.SETTINGS.BUSINESS} replace />} />
            <Route path="business" element={<SuspenseWrapper><BusinessSettingsPage /></SuspenseWrapper>} />
            <Route path="profile" element={<SuspenseWrapper><ProfileSettingsPage /></SuspenseWrapper>} />
            <Route path="staff" element={<SuspenseWrapper><StaffSettingsPage /></SuspenseWrapper>} />
            <Route path="roles" element={<SuspenseWrapper><RoleSettingsPage /></SuspenseWrapper>} />
            <Route path="notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
            {/* <Route path="subscription" element={<SuspenseWrapper><SubscriptionSettingsPage /></SuspenseWrapper>} /> */}
          </Route>
          <Route element={<PlatformAdminRoute />}>
            <Route path={ROUTES.PLATFORM.INDEX} element={<Navigate to={ROUTES.PLATFORM.OVERVIEW} replace />} />
            <Route path={ROUTES.PLATFORM.OVERVIEW} element={<SuspenseWrapper><PlatformOverviewPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.BUSINESSES} element={<SuspenseWrapper><PlatformBusinessesPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.USERS} element={<SuspenseWrapper><PlatformUsersPage /></SuspenseWrapper>} />
            <Route path={ROUTES.PLATFORM.TEAM} element={<SuspenseWrapper><PlatformTeamPage /></SuspenseWrapper>} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
