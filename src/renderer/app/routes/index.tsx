import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ROUTES } from './constants/shared.paths';
import { LoadingSpinner } from '../../shared/components/loading/LoadingSpinner';
import { PublicRoute } from './PublicRoute';
import { AuthMiddlewareRoute } from './middleware/AuthMiddlewareRoute';
import { Layout } from '../../shared/components/layout/Layout';

const LoginPage = lazy(() => import('../../modules/auth/LoginPage'));
const RegisterPage = lazy(() => import('../../modules/auth/RegisterPage'));
const DashboardPage = lazy(() => import('../../modules/dashboard/DashboardPage'));
const NewSalePage = lazy(() => import('../../modules/sales/NewSalePage'));
const SalesHistoryPage = lazy(() => import('../../modules/sales/SalesHistoryPage'));
const RefundsPage = lazy(() => import('../../modules/sales/RefundsPage'));
const ProductsPage = lazy(() => import('../../modules/inventory/ProductsPage'));
const CategoriesPage = lazy(() => import('../../modules/inventory/CategoriesPage'));
const StockLedgerPage = lazy(() => import('../../modules/inventory/StockLedgerPage'));
const ProductFormPage = lazy(() => import('../../modules/inventory/ProductFormPage'));
const CustomerListPage = lazy(() => import('../../modules/customers/CustomerListPage'));
const RecordExpensePage = lazy(() => import('../../modules/expenses/RecordExpensePage'));
const ExpenseListPage = lazy(() => import('../../modules/expenses/ExpenseListPage'));
const BusinessSettingsPage = lazy(() => import('../../modules/settings/BusinessSettingsPage'));
const StaffSettingsPage = lazy(() => import('../../modules/settings/StaffSettingsPage'));
const RoleSettingsPage = lazy(() => import('../../modules/settings/RoleSettingsPage'));
const SubscriptionSettingsPage = lazy(() => import('../../modules/settings/SubscriptionSettingsPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path={ROUTES.LOGIN} element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path={ROUTES.REGISTER} element={<SuspenseWrapper><RegisterPage /></SuspenseWrapper>} />
      </Route>
      <Route element={<AuthMiddlewareRoute />}>
        <Route element={<Layout />}>
          <Route path={ROUTES.DASHBOARD} element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.INDEX} element={<Navigate to={ROUTES.SALES.NEW} replace />} />
          <Route path={ROUTES.SALES.NEW} element={<SuspenseWrapper><NewSalePage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.HISTORY} element={<SuspenseWrapper><SalesHistoryPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SALES.REFUNDS} element={<SuspenseWrapper><RefundsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.INVENTORY.INDEX} element={<Navigate to={ROUTES.INVENTORY.PRODUCTS} replace />} />
          <Route path={ROUTES.INVENTORY.PRODUCTS} element={<SuspenseWrapper><ProductsPage /></SuspenseWrapper>} />
          <Route path="/inventory/products/new" element={<SuspenseWrapper><ProductFormPage /></SuspenseWrapper>} />
          <Route path="/inventory/products/:id/edit" element={<SuspenseWrapper><ProductFormPage /></SuspenseWrapper>} />
          <Route path={ROUTES.INVENTORY.CATEGORIES} element={<SuspenseWrapper><CategoriesPage /></SuspenseWrapper>} />
          <Route path={ROUTES.INVENTORY.STOCK} element={<SuspenseWrapper><StockLedgerPage /></SuspenseWrapper>} />
          <Route path={ROUTES.CUSTOMERS.INDEX} element={<SuspenseWrapper><CustomerListPage /></SuspenseWrapper>} />
          <Route path={ROUTES.EXPENSES.INDEX} element={<Navigate to={ROUTES.EXPENSES.CATEGORIES} replace />} />
          <Route path={ROUTES.EXPENSES.CATEGORIES} element={<SuspenseWrapper><RecordExpensePage /></SuspenseWrapper>} />
          <Route path="/expenses/list" element={<SuspenseWrapper><ExpenseListPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SETTINGS.INDEX} element={<Navigate to={ROUTES.SETTINGS.BUSINESS} replace />} />
          <Route path={ROUTES.SETTINGS.BUSINESS} element={<SuspenseWrapper><BusinessSettingsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SETTINGS.STAFF} element={<SuspenseWrapper><StaffSettingsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SETTINGS.ROLES} element={<SuspenseWrapper><RoleSettingsPage /></SuspenseWrapper>} />
          <Route path={ROUTES.SETTINGS.SUBSCRIPTION} element={<SuspenseWrapper><SubscriptionSettingsPage /></SuspenseWrapper>} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
