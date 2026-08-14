import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../pipeline/ui/pipelineFormFields';
import { CampaignDiscountGuardHint } from './CampaignDiscountGuardHint';
import {
  Tag, KeyRound, Percent, BadgePercent, CalendarDays, Timer, Repeat, CalendarClock, Shuffle, Check, Power, Lock,
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
  const [form, setForm] = useState<CampaignCodeFormData>(() => initial
    ? { ...initial, discount_duration_months: '1' }
    : EMPTY_FORM);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      queueMicrotask(() => setForm(initial
        ? { ...initial, discount_duration_months: '1' }
        : EMPTY_FORM));
    }
    wasOpen.current = isOpen;
  }, [isOpen, initial]);

  const set = (patch: Partial<CampaignCodeFormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const canSubmit = useMemo(() => form.code.trim().length > 0, [form.code]);

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: Record<string, unknown> = {
      code: form.code,
      owner_type: 'campaign',
      discount_type: form.discount_type,
      discount_duration_months: 1,
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
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Tag}
          tone="blue"
          title={isEditing ? 'Update campaign code' : 'New campaign code'}
          description={isEditing ? 'Edit the details of this promotional code' : 'Create a promo code to offer a discount'}
        />

        <PipelineFormSection
          title="Campaign code"
          icon={Tag}
          description="Short code customers enter at signup."
        >
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">
                Code
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ code: generateCode() })}>
                <Shuffle className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. FESTIVE20"
                className={pipelineInputClass}
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Uppercase letters and numbers only.</p>
          </div>
        </PipelineFormSection>

        <PipelineFormSection
          title="Discount"
          icon={Percent}
          description="What the code takes off at signup."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <PipelineIconField label="Duration (months)" icon={CalendarDays} hint="Campaign codes are single-period - locked to 1">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="number"
                  value={1}
                  disabled
                  className={pipelineInputClass.concat(' text-gray-400')}
                />
              </div>
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <CampaignDiscountGuardHint
          discountType={form.discount_type}
          discountValue={form.discount_value}
          discountDurationMonths={form.discount_duration_months}
        />

        <PipelineFormSection
          title="Limits & Expiry"
          icon={Timer}
          description="Optional caps and an end date."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <PipelineFormSection
            title="Status"
            icon={Power}
            description="Whether customers can still redeem this code."
          >
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

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isPending}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {isEditing ? 'Save Changes' : 'Create Code'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
