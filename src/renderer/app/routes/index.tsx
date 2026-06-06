import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ROUTES } from './constants/shared.paths';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { PublicRoute } from './PublicRoute';
import { AuthMiddlewareRoute } from './middleware/AuthMiddlewareRoute';
import { Layout } from '../../shared/components/layout/Layout';

const LoginPage = lazy(() => import('../../modules/auth/LoginPage'));
const RegisterPage = lazy(() => import('../../modules/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../../modules/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../modules/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../../modules/dashboard/DashboardPage'));
const NewSalePage = lazy(() => import('../../modules/sales/NewSale'));

// eslint-disable-next-line react-refresh/only-export-components -- route component
const SalesHistoryPage = lazy(() => import('../../modules/sales/SalesHistoryPage'));
const RefundsPage = lazy(() => import('../../modules/sales/RefundsPage'));
const MyShiftPage = lazy(() => import('../../modules/shifts/MyShiftPage'));
const ProductsPage = lazy(() => import('../../modules/inventory/ProductsPage'));
const CategoriesPage = lazy(() => import('../../modules/inventory/CategoriesPage'));
const StockLedgerPage = lazy(() => import('../../modules/inventory/StockLedgerPage'));

const CustomerListPage = lazy(() => import('../../modules/customers/CustomerListPage'));
const RecordExpensePage = lazy(() => import('../../modules/expenses/RecordExpensePage'));
const ExpenseListPage = lazy(() => import('../../modules/expenses/ExpenseListPage'));
const SettingsPage = lazy(() => import('../../modules/settings/SettingsPage'));
const BusinessSettingsPage = lazy(() => import('../../modules/settings/BusinessSettingsPage'));
const ProfileSettingsPage = lazy(() => import('../../modules/settings/ProfileSettingsPage'));
const StaffSettingsPage = lazy(() => import('../../modules/settings/StaffSettingsPage'));
const RoleSettingsPage = lazy(() => import('../../modules/settings/RoleSettingsPage'));
const SubscriptionSettingsPage = lazy(() => import('../../modules/settings/SubscriptionSettingsPage'));
const LandingLayout = lazy(() => import('../../modules/landing/LandingLayout'));
const LandingPage = lazy(() => import('../../modules/landing/LandingPage'));
const PrivacyPage = lazy(() => import('../../modules/landing/PrivacyPage'));
const PricingPage = lazy(() => import('../../modules/landing/PricingPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
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
          <Route path={ROUTES.SETTINGS.INDEX} element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>}>
            <Route index element={<Navigate to={ROUTES.SETTINGS.BUSINESS} replace />} />
            <Route path="business" element={<SuspenseWrapper><BusinessSettingsPage /></SuspenseWrapper>} />
            <Route path="profile" element={<SuspenseWrapper><ProfileSettingsPage /></SuspenseWrapper>} />
            <Route path="staff" element={<SuspenseWrapper><StaffSettingsPage /></SuspenseWrapper>} />
            <Route path="roles" element={<SuspenseWrapper><RoleSettingsPage /></SuspenseWrapper>} />
            <Route path="subscription" element={<SuspenseWrapper><SubscriptionSettingsPage /></SuspenseWrapper>} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
