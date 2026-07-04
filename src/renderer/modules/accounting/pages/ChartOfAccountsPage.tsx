import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { Input } from '../../../shared/components/inputs/Input';
import { Select } from '../../../shared/components/inputs/Select';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useChartOfAccounts, useChartOfAccountsTree, useCreateChartOfAccount } from '../api/AccountingQueries';
import type { ChartOfAccount } from '../api/AccountingTypes';
import { BookOpen, Plus, List, TreePine } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

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

  const filters = typeFilter ? { account_type: typeFilter } : undefined;
  const { data: accounts, isLoading } = useChartOfAccounts(treeView ? undefined : filters);
  const { data: treeData, isLoading: treeLoading } = useChartOfAccountsTree();
  const createAccount = useCreateChartOfAccount();

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
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
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
        <div className="flex gap-4 items-center">
          <Select
            options={accountTypeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-48"
          />
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
        <Table columns={columns} data={accounts ?? []} loading={isLoading} rowKey={(item) => item.id} />
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
