import { useState } from 'react';
import { Button } from '../../shared/components/buttons/Button';
import { X, Shuffle } from 'lucide-react';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CHARS[(Math.random() * CHARS.length) | 0];
  return code;
}

interface CampaignCodeFormData {
  code: string;
  discount_type: string;
  discount_value: string;
  discount_duration_months: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
}

interface PlatformCampaignCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  initial?: CampaignCodeFormData | null;
  title?: string;
}

const EMPTY_FORM: CampaignCodeFormData = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  discount_duration_months: '1',
  max_uses: '',
  expires_at: '',
  is_active: true,
};

export default function PlatformCampaignCodeFormModal({
  isOpen, onClose, onSubmit, isPending, initial, title,
}: PlatformCampaignCodeFormModalProps) {
  const [form, setForm] = useState<CampaignCodeFormData>(() => initial ?? EMPTY_FORM);

  if (!isOpen) return null;

  const set = (patch: Partial<CampaignCodeFormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      code: form.code,
      owner_type: 'campaign',
      discount_type: form.discount_type,
      discount_duration_months: form.discount_duration_months ? Number(form.discount_duration_months) : 1,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
    if (form.discount_type === 'free_month') {
      payload.discount_value = 0;
    } else {
      payload.discount_value = form.discount_value ? Number(form.discount_value) : 0;
    }
    if (initial) payload.is_active = form.is_active;
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title ?? 'Create Campaign Code'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Code */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Code</legend>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. FESTIVE20"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => set({ code: generateCode() })}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer shrink-0"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Generate
              </button>
            </div>
          </fieldset>

          {/* Discount */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Discount</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => set({ discount_type: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat_amount">Flat Amount ($)</option>
                  <option value="free_month">Free Month</option>
                </select>
              </div>
              {form.discount_type !== 'free_month' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => set({ discount_value: e.target.value })}
                    placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 10.00'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (months)</label>
                <input
                  type="number"
                  value={form.discount_duration_months}
                  onChange={(e) => set({ discount_duration_months: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  max="12"
                />
              </div>
            </div>
          </fieldset>

          {/* Limits */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Limits &amp; Expiry</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max uses</label>
                <input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => set({ max_uses: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Expires at</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => set({ expires_at: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </fieldset>

          {/* Status */}
          {initial && (
            <fieldset>
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</legend>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => set({ is_active: !form.is_active })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
              </label>
            </fieldset>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={isPending}>
            {initial ? 'Save Changes' : 'Create Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}
