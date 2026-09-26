import { useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import type { FiscalCredential } from '../api/fiscalCredentialTypes';
import {
  useDeleteFiscalCredential,
  useFiscalCredentials,
} from '../api/useFiscalCredentialQueries';
import { FiscalCredentialForm } from './FiscalCredentialForm';

function scopeLabel(c: FiscalCredential): string {
  if (c.location_id && c.location_name) return c.location_name;
  if (c.location_id) return `Branch #${c.location_id}`;
  return 'Business default';
}

export function FiscalCredentialList() {
  const { data: credentials = [], isLoading } = useFiscalCredentials();
  const deleteMutation = useDeleteFiscalCredential();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<FiscalCredential | null | undefined>(undefined);

  async function handleDelete(c: FiscalCredential) {
    const ok = await confirm({
      title: 'Remove fiscal credentials?',
      message: `Sales for ${scopeLabel(c)} will fall back to the deployment credentials, or stay unfiscalized when those are incomplete.`,
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(c.id);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Branch credentials</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            One set per branch - leave branch empty for the business default. Secrets are
            encrypted on the server and never shown back.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading credentials…</p>
        ) : credentials.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
            <Building2 className="mx-auto h-6 w-6 text-gray-400" aria-hidden />
            <p className="mt-2 text-sm font-medium text-gray-700">No branch credentials yet</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Fiscalization falls back to the deployment credentials until you add a set.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {credentials.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {scopeLabel(c)}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {c.environment}
                    </span>
                    {!c.is_active && (
                      <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Off
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    TIN {c.tin} · {c.device_no} · {c.api_username}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(c)}
                  aria-label={`Edit credentials for ${scopeLabel(c)}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete(c)}
                  aria-label={`Remove credentials for ${scopeLabel(c)}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing !== undefined && (
        <FiscalCredentialForm
          open
          credential={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
