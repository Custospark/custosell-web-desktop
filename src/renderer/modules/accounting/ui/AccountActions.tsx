import { useState } from 'react';
import { Check, Edit3, Trash2, X } from 'lucide-react';
import { useUpdateChartOfAccount, useDeleteChartOfAccount } from '../api/AccountingQueries';
import type { ChartOfAccount } from '../api/AccountingTypes';

/** Row actions (inline rename + delete confirm) for a chart-of-accounts row, shared by desktop table and mobile cards. */
export function AccountActions({ account }: { account: ChartOfAccount }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [confirming, setConfirming] = useState(false);
  const updateAccount = useUpdateChartOfAccount();
  const deleteAccount = useDeleteChartOfAccount();

  if (account.is_system) {
    return <span className="text-xs text-gray-300 italic">System</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-24 sm:w-32 px-2 py-1 text-sm border border-gray-300 rounded"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            if (name.trim()) updateAccount.mutate({ id: account.id, data: { name: name.trim() } });
            setEditing(false);
          }}
          className="p-1 text-green-600 hover:text-green-800"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-red-500">Delete?</span>
        <button
          type="button"
          onClick={() => {
            deleteAccount.mutate(account.id);
            setConfirming(false);
          }}
          className="p-1 text-red-600 hover:text-red-800"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => { setName(account.name); setEditing(true); }}
        className="p-1 text-gray-400 hover:text-blue-600"
        title="Edit name"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="p-1 text-gray-400 hover:text-red-600"
        title="Delete account"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
