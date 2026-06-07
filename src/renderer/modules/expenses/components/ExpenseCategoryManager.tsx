import { useState } from 'react';
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '../api/ExpenseQueries';
import { getBusinessCurrency } from '../../../shared/utils/formatCurrency';
import { Card } from '../../../shared/components/cards/Card';
import { Table } from '../../../shared/components/tables/Table';
import { Button } from '../../../shared/components/buttons/Button';
import { Badge } from '../../../shared/components/badges/Badge';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Pencil, Trash2, Plus, FolderOpen, Tag, FileText, DollarSign, Clock } from 'lucide-react';
import type { ExpenseCategoryWithSyncMeta } from '../api/ExpenseTypes';

interface ExpenseCategoryManagerProps {
  inline?: boolean;
}

export default function ExpenseCategoryManager({ inline }: ExpenseCategoryManagerProps) {
  const { data: categories, isLoading } = useExpenseCategories();
  const createMutation = useCreateExpenseCategory();
  const updateMutation = useUpdateExpenseCategory();
  const deleteMutation = useDeleteExpenseCategory();
  const { confirm } = useConfirm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryWithSyncMeta | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState('monthly');

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setBudgetAmount('');
    setBudgetPeriod('monthly');
    setDrawerOpen(true);
  };

  const openEdit = (cat: ExpenseCategoryWithSyncMeta) => {
    if (cat._pendingSync) return;
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setBudgetAmount(cat.budget_amount ? parseFloat(cat.budget_amount).toString() : '');
    setBudgetPeriod(cat.budget_period || 'monthly');
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      description: description || null,
      sort_order: editingCategory?.sort_order ?? 0,
      budget_amount: budgetAmount ? parseFloat(budgetAmount) : null,
      budget_period: budgetAmount ? budgetPeriod : null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data }, { onSuccess: () => setDrawerOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setDrawerOpen(false) });
    }
  };

  const handleDelete = async (cat: ExpenseCategoryWithSyncMeta) => {
    if (cat._pendingSync) return;
    const ok = await confirm({
      title: 'Delete category?',
      message: `Delete "${cat.name}"? Existing expenses in this category will not be affected.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (ok) deleteMutation.mutate(cat.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !!name.trim();

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-gray-500" /> Expense Categories</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage categories and set budgets</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Category</Button>
      </div>

      <Table<ExpenseCategoryWithSyncMeta>
        rowKey={(c) => c.id}
        columns={[
          { key: 'name', header: 'Name', render: (c) => (
            <div className="flex items-center gap-2">
              <span>{c.name}</span>
              {c._pendingSync && <Badge variant="warning">Pending sync</Badge>}
            </div>
          ) },
          { key: 'description', header: 'Description', render: (c) => c.description || <span className="text-gray-400">—</span> },
          { key: 'budget', header: 'Budget', render: (c) => c.budget_amount ? <span>{formatCurrency(c.budget_amount)} <span className="text-xs text-gray-400">/{c.budget_period}</span></span> : <span className="text-gray-400">—</span> },
          { key: 'sort_order', header: 'Order' },
          { key: 'actions', header: 'Actions', render: (c) => (
            <div className="flex gap-1">
              <button title={c._pendingSync ? 'Sync before editing' : 'Edit'} disabled={c._pendingSync} onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Pencil className="w-4 h-4" />
              </button>
              <button title={c._pendingSync ? 'Sync before deleting' : 'Delete'} disabled={c._pendingSync} onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )},
        ]}
        data={(categories ?? []).filter(Boolean) as ExpenseCategoryWithSyncMeta[]}
      />
    </>
  );

  return (
    <>
      {inline ? content : <Card>{content}</Card>}

      <SlideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        subtitle="Create or edit an expense category"
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        canSubmit={canSubmit}
      >
        <div className="space-y-5">

          {/* Section: Category Info */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Tag className="w-4 h-4 text-gray-400" /> Category Info</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px]" placeholder="Optional description" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Budget */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> Budget</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{getBusinessCurrency()}</span>
                    <input type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select aria-label="Budget period" value={budgetPeriod} onChange={(e) => setBudgetPeriod(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </SlideDrawer>
    </>
  );
}
