import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { ClipboardList, Plus, FolderOpen } from 'lucide-react';

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Expense List</h1>
              <p className="text-sm text-gray-500">View, filter, and manage your expenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.EXPENSES.CATEGORIES)}>
              <FolderOpen className="w-4 h-4 mr-1.5" />Categories
            </Button>
            <Button onClick={() => setFormOpen(true)}>
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
