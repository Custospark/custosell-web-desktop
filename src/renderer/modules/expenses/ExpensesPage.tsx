import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

export default function ExpensesPage() {
  return <Navigate to={ROUTES.EXPENSES.LIST} replace />;
}
