import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { ClipboardList, Plus, FolderOpen } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const accountType = useAppSelector((s) => s.auth.user?.account_type);
  const isPersonal = accountType === 'personal';

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{isPersonal ? 'My Expenses' : 'Expense List'}</h1>
              <p className="text-sm text-gray-500">
                {isPersonal ? 'Track, filter, and manage your personal spending' : 'View, filter, and manage your business expenses'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isPersonal && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(ROUTES.EXPENSES.CATEGORIES)}>
              <FolderOpen className="w-4 h-4 mr-1.5" />Categories
            </Button>
            )}
            <Button className="w-full sm:w-auto" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Expense
            </Button>
          </div>
        </div>
      </Card>

      <ExpenseList />

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
