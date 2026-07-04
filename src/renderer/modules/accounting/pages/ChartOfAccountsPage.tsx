import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Input } from '../../../shared/components/inputs/Input';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useChartOfAccounts, useChartOfAccountsTree, useCreateChartOfAccount, useUpdateChartOfAccount, useDeleteChartOfAccount } from '../api/AccountingQueries';
import type { ChartOfAccount } from '../api/AccountingTypes';
import { BookOpen, Plus, List, TreePine, Search, ChevronLeft, ChevronRight, Edit3, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

const PAGE_SIZE = 15;

const accountTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'Expense', label: 'Expense' },
];

export default function ChartOfAccountsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [treeView, setTreeView] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filters = typeFilter ? { account_type: typeFilter } : undefined;
  const { data: accounts, isLoading } = useChartOfAccounts(treeView ? undefined : filters);
  const { data: treeData, isLoading: treeLoading } = useChartOfAccountsTree();
  const createAccount = useCreateChartOfAccount();
  const updateAccount = useUpdateChartOfAccount();
  const deleteAccount = useDeleteChartOfAccount();

  const filtered = useMemo(() => {
    if (!accounts) return [];
    const q = search.toLowerCase();
    return accounts.filter((a) => {
      if (q && !a.code.toLowerCase().includes(q) && !a.name.toLowerCase().includes(q)) return false;
      if (typeFilter && a.account_type?.name !== typeFilter) return false;
      return true;
    });
  }, [accounts, search, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleStatus(account: ChartOfAccount) {
    if (!account.is_system) {
      updateAccount.mutate({ id: account.id, data: { is_active: !account.is_active } });
    }
  }

  function startEdit(account: ChartOfAccount) {
    setEditingId(account.id);
    setEditName(account.name);
  }

  function saveEdit(id: number) {
    if (editName.trim()) {
      updateAccount.mutate({ id, data: { name: editName } });
    }
    setEditingId(null);
  }

  function confirmDelete(id: number) {
    setDeletingId(id);
  }

  const columns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'account_type',
      header: 'Type',
      render: (item: ChartOfAccount) => item.account_type?.name ?? '-',
    },
    {
      key: 'normal_balance',
      header: 'Normal Balance',
      render: (item: ChartOfAccount) => (
        <span className={cn('capitalize', item.normal_balance === 'debit' ? 'text-amber-600' : 'text-blue-600')}>
          {item.normal_balance}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: ChartOfAccount) => (
        <button
          onClick={() => toggleStatus(item)}
          disabled={item.is_system}
          className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
            item.is_system ? 'cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-gray-300',
            item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}
          title={item.is_system ? 'System account' : 'Click to toggle status'}
        >
          {item.is_system ? '' : item.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
          {item.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: ChartOfAccount) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {editingId === item.id ? (
            <>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                autoFocus
              />
              <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:text-green-800"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : item.is_system ? (
            <span className="text-xs text-gray-300 italic">System</span>
          ) : (
            <>
              <button onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit name"><Edit3 className="w-3.5 h-3.5" /></button>
              {deletingId === item.id ? (
                <>
                  <span className="text-xs text-red-500">Delete?</span>
                  <button onClick={() => { deleteAccount.mutate(item.id); setDeletingId(null); }} className="p-1 text-red-600 hover:text-red-800"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeletingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <button onClick={() => confirmDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete account"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  function renderTree(node: ChartOfAccount, depth = 0) {
    return (
      <div key={node.id}>
        <div className={cn('flex items-center gap-2 px-4 py-2 text-sm', depth > 0 && 'ml-6 border-l border-gray-200')}>
          <span className="font-mono text-gray-500">{node.code}</span>
          <span className="text-gray-900 font-medium">{node.name}</span>
          <span className="text-gray-400 text-xs">({node.account_type?.name ?? '-'})</span>
          <span className={cn('capitalize text-xs', node.normal_balance === 'debit' ? 'text-amber-600' : 'text-blue-600')}>
            {node.normal_balance}
          </span>
        </div>
        {node.children?.map((child) => renderTree(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Chart of Accounts</h1>
              <p className="text-sm text-gray-500">Manage your general ledger accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setTreeView(!treeView)}>
              {treeView ? <List className="w-4 h-4 mr-1.5" /> : <TreePine className="w-4 h-4 mr-1.5" />}
              {treeView ? 'Flat View' : 'Tree View'}
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Account
            </Button>
          </div>
        </div>
      </Card>

      {!treeView && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select
            options={accountTypeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-40"
          />
          <span className="text-xs text-gray-400">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {treeView ? (
        <Card>
          {treeLoading ? <LoadingSpinner /> : (
            <div className="divide-y divide-gray-100">
              {treeData?.map((node) => renderTree(node))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <Table columns={columns} data={paged} loading={isLoading} rowKey={(item) => item.id} />
          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)} className={cn('px-2.5 py-1 rounded text-sm', i === safePage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100')}>{i + 1}</button>
                ))}
                <button onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <AddAccountForm
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => {
            createAccount.mutate(data, { onSuccess: () => setFormOpen(false) });
          }}
          loading={createAccount.isPending}
        />
      )}
    </div>
  );
}

function AddAccountForm({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<ChartOfAccount>) => void;
  loading: boolean;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [typeName, setTypeName] = useState('Asset');
  const [normalBalance, setNormalBalance] = useState<'debit' | 'credit'>('debit');

  const typeIdMap: Record<string, number> = { Asset: 1, Liability: 2, Equity: 3, Revenue: 4, Expense: 5 };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ code, name, type_id: typeIdMap[typeName] ?? 1, normal_balance: normalBalance, is_active: true });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Add Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Account Code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. 1000" />
          <Input label="Account Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cash" />
          <Select
            label="Account Type"
            options={[
              { value: 'Asset', label: 'Asset' },
              { value: 'Liability', label: 'Liability' },
              { value: 'Equity', label: 'Equity' },
              { value: 'Revenue', label: 'Revenue' },
              { value: 'Expense', label: 'Expense' },
            ]}
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
          />
          <Select
            label="Normal Balance"
            options={[
              { value: 'debit', label: 'Debit' },
              { value: 'credit', label: 'Credit' },
            ]}
            value={normalBalance}
            onChange={(e) => setNormalBalance(e.target.value as 'debit' | 'credit')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
