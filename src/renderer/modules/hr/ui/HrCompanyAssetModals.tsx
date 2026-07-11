import { useState } from 'react';
import { Package, UserRound } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { useHrEmployees } from '../api/useHrQueries';
import { employeeDisplayName } from '../api/hrTypes';
import type { AssetCategory, AssetCondition, FixedAsset } from '../../accounting/api/AccountingTypes';
import {
  useAssignHrCompanyAsset,
  useCreateHrCompanyAsset,
  useReturnHrCompanyAsset,
  useTransferHrCompanyAsset,
  type CreateCompanyAssetPayload,
} from '../api/useHrCompanyAssetsQueries';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';

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

const emptyCreate: CreateCompanyAssetPayload = {
  name: '',
  cost: 0,
  salvage_value: 0,
  useful_life_months: 36,
  purchase_date: new Date().toISOString().slice(0, 10),
  category: 'laptop',
  asset_tag: '',
  serial_number: '',
  location: '',
  condition: 'new',
  notes: '',
};

export function AddCompanyAssetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createAsset = useCreateHrCompanyAsset();
  const [form, setForm] = useState<CreateCompanyAssetPayload>(emptyCreate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createAsset.mutateAsync({
      ...form,
      asset_tag: form.asset_tag || null,
      serial_number: form.serial_number || null,
      location: form.location || null,
      notes: form.notes || null,
    });
    setForm(emptyCreate);
    onClose();
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add company asset" subtitle="Register equipment for custody tracking." size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <HrModalHero icon={Package} title="New asset" description="Cost and life feed Accounting; tag and condition stay with HR custody." tone="indigo" />
        <HrFormSection title="Basics" icon={Package}>
          <div className="grid gap-3 sm:grid-cols-2">
            <HrIconField label="Name" icon={Package} required>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Category" icon={Package}>
              <select value={form.category ?? 'other'} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AssetCategory }))} className={hrSelectClass}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </HrIconField>
            <HrIconField label="Cost" icon={Package} required>
              <input required type="number" min={0} step="0.01" value={form.cost || ''} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Salvage value" icon={Package} required>
              <input required type="number" min={0} step="0.01" value={form.salvage_value || ''} onChange={(e) => setForm((f) => ({ ...f, salvage_value: Number(e.target.value) }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Useful life (months)" icon={Package} required>
              <input required type="number" min={1} value={form.useful_life_months || ''} onChange={(e) => setForm((f) => ({ ...f, useful_life_months: Number(e.target.value) }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Purchase date" icon={Package} required>
              <input required type="date" value={form.purchase_date} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Asset tag" icon={Package}>
              <input value={form.asset_tag ?? ''} onChange={(e) => setForm((f) => ({ ...f, asset_tag: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Serial number" icon={Package}>
              <input value={form.serial_number ?? ''} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Location" icon={Package}>
              <input value={form.location ?? ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={hrInputClass} />
            </HrIconField>
            <HrIconField label="Condition" icon={Package}>
              <select value={form.condition ?? 'good'} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as AssetCondition }))} className={hrSelectClass}>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </HrIconField>
          </div>
          <HrIconField label="Notes" icon={Package}>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={hrInputClass} />
          </HrIconField>
        </HrFormSection>
        <HrModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createAsset.isPending}>Create asset</Button>
        </HrModalFooter>
      </form>
    </Modal>
  );
}

type CustodyAction = 'assign' | 'transfer' | 'return';

export function CustodyAssetModal({
  asset,
  action,
  onClose,
}: {
  asset: FixedAsset | null;
  action: CustodyAction | null;
  onClose: () => void;
}) {
  const { data: employees = [] } = useHrEmployees({ status: 'active' });
  const assign = useAssignHrCompanyAsset();
  const transfer = useTransferHrCompanyAsset();
  const returnAsset = useReturnHrCompanyAsset();
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');

  if (!asset || !action) return null;

  const pending = assign.isPending || transfer.isPending || returnAsset.isPending;
  const title = action === 'assign' ? 'Assign asset' : action === 'transfer' ? 'Transfer asset' : 'Return asset';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset || !action) return;
    if (action === 'return') {
      await returnAsset.mutateAsync({ id: asset.id, notes: notes || null });
    } else if (!employeeId) {
      return;
    } else if (action === 'assign') {
      await assign.mutateAsync({ id: asset.id, to_employee_id: Number(employeeId), notes: notes || null });
    } else {
      await transfer.mutateAsync({ id: asset.id, to_employee_id: Number(employeeId), notes: notes || null });
    }
    setEmployeeId('');
    setNotes('');
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} title={title} subtitle={asset.name} size="md">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <HrModalHero icon={UserRound} title={title} description={`Working with ${asset.name}${asset.asset_tag ? ` (${asset.asset_tag})` : ''}.`} tone="indigo" />
        {action !== 'return' ? (
          <HrIconField label="Employee" icon={UserRound} required>
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={hrSelectClass}>
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </HrIconField>
        ) : null}
        <HrIconField label="Notes" icon={UserRound}>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={hrInputClass} />
        </HrIconField>
        <HrModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Confirm</Button>
        </HrModalFooter>
      </form>
    </Modal>
  );
}

export { CATEGORIES, CONDITIONS };
