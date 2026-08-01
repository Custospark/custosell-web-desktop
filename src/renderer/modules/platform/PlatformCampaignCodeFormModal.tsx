import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../pipeline/ui/pipelineFormFields';
import {
  Tag, KeyRound, Percent, BadgePercent, CalendarDays, Timer, Repeat, CalendarClock, Shuffle, Check, Power,
} from 'lucide-react';

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
  const isEditing = !!initial;
  const [form, setForm] = useState<CampaignCodeFormData>(() => initial ?? EMPTY_FORM);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      queueMicrotask(() => setForm(initial ?? EMPTY_FORM));
    }
    wasOpen.current = isOpen;
  }, [isOpen, initial]);

  const set = (patch: Partial<CampaignCodeFormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title ?? 'Create Campaign Code'}
      subtitle={isEditing ? 'Update the discount code details' : 'Create a promo code to reward campaigns'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PipelineModalHero
          icon={Tag}
          tone="blue"
          title={isEditing ? 'Update campaign code' : 'New campaign code'}
          description={isEditing ? 'Edit the details of this promotional code' : 'Create a promo code to offer a discount'}
        />

        <PipelineFormSection title="Campaign code" icon={Tag}>
          <PipelineIconField label="Code" icon={KeyRound} required hint="Uppercase letters and numbers">
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. FESTIVE20"
                className={pipelineInputClass}
                required
              />
              <button
                type="button"
                onClick={() => set({ code: generateCode() })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Generate
              </button>
            </div>
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Discount" icon={Percent}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PipelineIconField label="Type" icon={Percent} required>
              <select value={form.discount_type} onChange={(e) => set({ discount_type: e.target.value })} className={pipelineSelectClass}>
                <option value="percentage">Percentage (%)</option>
                <option value="flat_amount">Flat Amount ($)</option>
                <option value="free_month">Free Month</option>
              </select>
            </PipelineIconField>
            {form.discount_type !== 'free_month' && (
              <PipelineIconField label="Value" icon={BadgePercent} required>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => set({ discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 10.00'}
                  className={pipelineInputClass}
                  min="0"
                  required
                />
              </PipelineIconField>
            )}
            <PipelineIconField label="Duration (months)" icon={CalendarDays} hint="How long the discount lasts after redemption">
              <input
                type="number"
                value={form.discount_duration_months}
                onChange={(e) => set({ discount_duration_months: e.target.value })}
                placeholder="e.g. 1"
                className={pipelineInputClass}
                min="1"
                max="12"
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Limits & Expiry" icon={Timer}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PipelineIconField label="Max uses" icon={Repeat} hint="Leave blank for unlimited">
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => set({ max_uses: e.target.value })}
                placeholder="Unlimited"
                className={pipelineInputClass}
                min="1"
              />
            </PipelineIconField>
            <PipelineIconField label="Expires at" icon={CalendarClock}>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => set({ expires_at: e.target.value })}
                className={pipelineInputClass}
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        {isEditing && (
          <PipelineFormSection title="Status" icon={Power}>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => set({ is_active: !form.is_active })}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
            </label>
          </PipelineFormSection>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            <Check className="h-4 w-4" />
            {isEditing ? 'Save Changes' : 'Create Code'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
