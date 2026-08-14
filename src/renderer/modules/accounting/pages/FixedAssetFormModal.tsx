import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Hash,
  MapPin,
  Package,
  Pencil,
  Tag,
  Wallet,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';
import { useChartOfAccounts, useCreateFixedAsset, useUpdateFixedAsset } from '../api/AccountingQueries';
import type { AssetCategory, AssetCondition, FixedAsset } from '../api/AccountingTypes';

function FormModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'phone', label: 'Phone' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'retired', label: 'Retired' },
];

type FormState = {
  name: string;
  cost: string;
  salvage_value: string;
  useful_life_months: string;
  purchase_date: string;
  account_id: string;
  category: AssetCategory;
  asset_tag: string;
  serial_number: string;
  location: string;
  condition: AssetCondition;
  notes: string;
  status: FixedAsset['status'];
};

function emptyForm(): FormState {
  return {
    name: '',
    cost: '',
    salvage_value: '',
    useful_life_months: '36',
    purchase_date: new Date().toISOString().slice(0, 10),
    account_id: '',
    category: 'laptop',
    asset_tag: '',
    serial_number: '',
    location: '',
    condition: 'new',
    notes: '',
    status: 'active',
  };
}

function assetToForm(asset: FixedAsset): FormState {
  return {
    name: asset.name,
    cost: String(asset.cost ?? ''),
    salvage_value: String(asset.salvage_value ?? ''),
    useful_life_months: String(asset.useful_life_months ?? ''),
    purchase_date: (asset.purchase_date ?? '').slice(0, 10),
    account_id: asset.account_id ? String(asset.account_id) : '',
    category: asset.category ?? 'other',
    asset_tag: asset.asset_tag ?? '',
    serial_number: asset.serial_number ?? '',
    location: asset.location ?? '',
    condition: asset.condition ?? 'good',
    notes: asset.notes ?? '',
    status: asset.status,
  };
}

function toPayload(form: FormState, accountId: number): Partial<FixedAsset> {
  return {
    name: form.name.trim(),
    cost: Number(form.cost),
    salvage_value: Number(form.salvage_value),
    useful_life_months: Number(form.useful_life_months),
    purchase_date: form.purchase_date,
    account_id: accountId,
    category: form.category,
    asset_tag: form.asset_tag.trim() || null,
    serial_number: form.serial_number.trim() || null,
    location: form.location.trim() || null,
    condition: form.condition,
    notes: form.notes.trim() || null,
    status: form.status,
    book_value: Number(form.cost),
  };
}

export function FixedAssetFormModal({
  open,
  asset,
  onClose,
}: {
  open: boolean;
  asset?: FixedAsset | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(asset);
  const createAsset = useCreateFixedAsset();
  const updateAsset = useUpdateFixedAsset();
  const { data: accounts = [] } = useChartOfAccounts();
  const [form, setForm] = useState<FormState>(emptyForm);

  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.is_active && String(a.code).startsWith('12') && a.code !== '1205'),
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setForm(asset ? assetToForm(asset) : emptyForm());
    });
  }, [open, asset]);

  const pending = createAsset.isPending || updateAsset.isPending;
  const resolvedAccountId = form.account_id
    ? Number(form.account_id)
    : assetAccounts[0]?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedAccountId) return;
    const payload = toPayload(form, resolvedAccountId);
    if (isEdit && asset) {
      const updatePayload = { ...payload };
      delete updatePayload.book_value;
      await updateAsset.mutateAsync({ id: asset.id, ...updatePayload });
    } else {
      await createAsset.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit fixed asset' : 'Add fixed asset'}
      subtitle={isEdit ? 'Update the shared register used by Accounting and HR.' : 'Register an asset for depreciation and company custody.'}
      size="lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <PipelineModalHero
          icon={isEdit ? Pencil : Building2}
          title={isEdit ? 'Edit asset' : 'New fixed asset'}
          description="Same source of truth as HR Company Assets - financial fields here, custody visible to both."
          tone="indigo"
        />

        <PipelineFormSection title="Identity" icon={Package} description="How this asset appears in HR and Accounting.">
          <div className="grid gap-3 sm:grid-cols-2">
            <PipelineIconField label="Name" icon={Package} required>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dell Latitude 5540"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Category" icon={Tag}>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AssetCategory }))}
                className={pipelineSelectClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Asset tag" icon={Hash}>
              <input
                value={form.asset_tag}
                onChange={(e) => setForm((f) => ({ ...f, asset_tag: e.target.value }))}
                placeholder="e.g. LAP-0042"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Serial number" icon={Hash}>
              <input
                value={form.serial_number}
                onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                placeholder="e.g. SN-5Y8K2L9P"
                className={pipelineInputClass}
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Financial" icon={Wallet} description="Feeds book value and straight-line depreciation.">
          <div className="grid gap-3 sm:grid-cols-2">
            <PipelineIconField label="Cost" icon={Wallet} required>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="e.g. 3200000"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Salvage value (worth at end of life)" icon={Wallet} required>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.salvage_value}
                onChange={(e) => setForm((f) => ({ ...f, salvage_value: e.target.value }))}
                placeholder="e.g. 200000"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Useful life (months)" icon={Calendar} required>
              <input
                required
                type="number"
                min={1}
                value={form.useful_life_months}
                onChange={(e) => setForm((f) => ({ ...f, useful_life_months: e.target.value }))}
                placeholder="e.g. 36"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Purchase date" icon={Calendar} required>
              <input
                required
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="GL account (12xx)" icon={Building2} required>
              <select
                required={!assetAccounts[0]}
                value={form.account_id}
                onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
                className={pipelineSelectClass}
              >
                <option value="">
                  {assetAccounts[0]
                    ? `Default: ${assetAccounts[0].code} - ${assetAccounts[0].name}`
                    : 'Select account…'}
                </option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </PipelineIconField>
            {isEdit ? (
              <PipelineIconField label="Status" icon={Tag}>
                <select
                  value={form.status ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FixedAsset['status'] }))}
                  className={pipelineSelectClass}
                >
                  <option value="active">Active</option>
                  <option value="fully_depreciated">Fully depreciated</option>
                  <option value="disposed">Disposed</option>
                </select>
              </PipelineIconField>
            ) : null}
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Custody details" icon={MapPin} description="Visible in HR Company Assets for who holds the item.">
          <div className="grid gap-3 sm:grid-cols-2">
            <PipelineIconField label="Location" icon={MapPin}>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Kampala HQ · Desk 12"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <PipelineIconField label="Condition" icon={Package}>
              <select
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as AssetCondition }))}
                className={pipelineSelectClass}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>
          <PipelineIconField label="Notes" icon={Package}>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Includes charger and laptop bag"
              className={pipelineInputClass}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <FormModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending} disabled={!resolvedAccountId}>
            {isEdit ? 'Save changes' : 'Create asset'}
          </Button>
        </FormModalFooter>
      </form>
    </Modal>
  );
}
