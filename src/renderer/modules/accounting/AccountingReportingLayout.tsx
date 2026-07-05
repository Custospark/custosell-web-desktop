import { Outlet } from 'react-router-dom';
import { AccountingPeriodSelectionProvider } from './context/AccountingPeriodSelectionContext';

/** Shared period/year selection for journals, statements, and ratios. */
export default function AccountingReportingLayout() {
  return (
    <AccountingPeriodSelectionProvider>
      <Outlet />
    </AccountingPeriodSelectionProvider>
  );
}
