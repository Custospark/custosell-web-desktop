import { useState } from 'react';
import { useIncomeSources, useDeleteIncome } from './api/IncomeQueries';
import IncomeForm from './components/IncomeForm';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { IncomeSource } from './api/IncomeTypes';

export default function IncomeListPage() {
  const { data: incomes = [], isLoading, isError, refetch } = useIncomeSources();
  const deleteMutation = useDeleteIncome();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);

  const { data: paginated, page, totalPages, totalItems, pageSize, setPage, setPageSize } = usePagination(incomes, 10);

  const handleEdit = (item: IncomeSource) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this income record?')) return;
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) return <CustosellLoader message="Loading income records…" />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Income</h1>
              <p className="text-sm text-gray-500">Record and manage money coming in</p>
            </div>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Record Income
          </Button>
        </div>
      </Card>

      {isError && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-center">
          Could not load income records.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>Try again</button>
        </div>
      )}

      {!isError && incomes.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No income recorded yet.</p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Record Your First Income
          </Button>
        </div>
      )}

      {!isError && incomes.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border-2 border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50/80">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Source</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Description</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.source_name}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(parseFloat(item.amount))}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(item.income_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-[200px] truncate">
                      {item.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      <IncomeForm open={formOpen} onClose={handleClose} income={editing} />
    </div>
  );
}
