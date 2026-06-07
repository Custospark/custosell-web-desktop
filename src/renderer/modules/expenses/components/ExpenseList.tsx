import { useState, useMemo } from 'react';
import { useExpenses, useDeleteExpense, useExpenseCategories } from '../api/ExpenseQueries';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { Badge } from '../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Receipt, Pencil, Trash2, Eye } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import type { ExpenseWithSyncMeta } from '../api/ExpenseTypes';

interface ExpenseListProps {
  filters?: Record<string, string>;
}

export default function ExpenseList({ filters }: ExpenseListProps) {
  const { data: expenses, isLoading, error } = useExpenses(filters);
  const { data: categories } = useExpenseCategories();
  const deleteMutation = useDeleteExpense();
  const { confirm } = useConfirm();
  const [editExpense, setEditExpense] = useState<ExpenseWithSyncMeta | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const filtered = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => {
      if (filterCategory && e.expense_category_id !== Number(filterCategory)) return false;
      if (filterDateFrom && e.expense_date < filterDateFrom) return false;
      if (filterDateTo && e.expense_date > filterDateTo) return false;
      return true;
    });
  }, [expenses, filterCategory, filterDateFrom, filterDateTo]);

  const paginated = usePagination(filtered, 15);

  const handleDelete = async (expense: ExpenseWithSyncMeta) => {
    if (expense._pendingSync) return;
    const ok = await confirm({
      title: 'Delete expense?',
      message: `Delete "${expense.description}" for ${formatCurrency(expense.amount)}?`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (ok) deleteMutation.mutate(expense.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) return <EmptyState icon={<Receipt className="w-12 h-12" />} title="Failed to load expenses" actionLabel="Retry" onAction={() => window.location.reload()} />;

  return (
    <>
      <Card>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="w-48">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All Categories</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-44">
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="From date" />
          </div>
          <div className="w-44">
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="To date" />
          </div>
        </div>

        <Table<ExpenseWithSyncMeta>
          rowKey={(e) => e.id}
          columns={[
            { key: 'date', header: 'Date', render: (e) => new Date(e.expense_date).toLocaleDateString() },
            { key: 'category', header: 'Category', render: (e) => e.expense_category?.name || <span className="text-gray-400">—</span> },
            { key: 'description', header: 'Description', render: (e) => (
              <div className="flex items-center gap-2">
                <span>{e.description}</span>
                {e._pendingSync && <Badge variant="warning">Pending sync</Badge>}
              </div>
            ) },
            { key: 'amount', header: 'Amount', render: (e) => formatCurrency(e.amount) },
            { key: 'reference', header: 'Reference', render: (e) => e.reference || <span className="text-gray-400">—</span> },
            { key: 'receipt', header: 'Receipt', render: (e) => {
              if (e.receipt_url) return <a href={e.receipt_url} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 text-blue-600" /></a>;
              if (e._pendingReceipt) return <Badge variant="warning">Pending receipt</Badge>;
              return <span className="text-gray-400">—</span>;
            } },
            { key: 'recurring', header: 'Recurring', render: (e) => e.is_recurring ? <Badge variant="primary">{e.recurrence_interval}</Badge> : <span className="text-gray-400">—</span> },
            { key: 'actions', header: 'Actions', render: (e) => (
              <div className="flex gap-1">
                <button title={e._pendingSync ? 'Sync before editing' : 'Edit'} disabled={e._pendingSync} onClick={() => setEditExpense(e)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Pencil className="w-4 h-4" />
                </button>
                <button title={e._pendingSync ? 'Sync before deleting' : 'Delete'} disabled={e._pendingSync} onClick={() => handleDelete(e)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )},
          ]}
          data={paginated.data}
        />
        <Pagination
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          totalItems={paginated.totalItems}
          pageSize={paginated.pageSize}
          onPageChange={paginated.setPage}
          onPageSizeChange={paginated.setPageSize}
        />
      </Card>

      {editExpense && (
        <ExpenseForm open={!!editExpense} onClose={() => setEditExpense(null)} expense={editExpense} />
      )}
    </>
  );
}
