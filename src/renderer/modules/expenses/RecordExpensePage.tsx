import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import ExpenseCategoryManager from './components/ExpenseCategoryManager';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Receipt, ListOrdered } from 'lucide-react';

export default function RecordExpensePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Expense Categories</h1>
              <p className="text-sm text-gray-500">Manage categories, set budgets, and record expenses</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(ROUTES.EXPENSES.LIST)}>
            <ListOrdered className="w-4 h-4 mr-1.5" />Expense List
          </Button>
        </div>
      </Card>

      <ExpenseCategoryManager />
    </div>
  );
}
