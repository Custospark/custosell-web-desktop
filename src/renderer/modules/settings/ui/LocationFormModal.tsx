import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreateLocation, useUpdateLocation } from '../api/settings/LocationQueries';
import type { Location, CreateLocationData } from '../api/settings/LocationTypes';

interface LocationFormModalProps {
  open: boolean;
  onClose: () => void;
  location?: Location | null;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function LocationFormModal({ open, onClose, location }: LocationFormModalProps) {
  const isEditing = Boolean(location);
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();

  const [form, setForm] = useState<CreateLocationData>({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    is_default: false,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const hydrated = location ? {
      name: location.name ?? '',
      code: location.code ?? '',
      address: location.address ?? '',
      city: location.city ?? '',
      state: location.state ?? '',
      postal_code: location.postal_code ?? '',
      country: location.country ?? '',
      phone: location.phone ?? '',
      is_default: location.is_default,
      is_active: location.is_active,
    } : {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      phone: '',
      is_default: false,
      is_active: true,
    };
    queueMicrotask(() => {
      setForm(hydrated);
      setSubmitting(false);
    });
  }, [open, location]);

  const update = <K extends keyof CreateLocationData>(key: K, val: CreateLocationData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const canSubmit = form.name.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload: CreateLocationData = {
      ...form,
      name: form.name.trim(),
      code: form.code?.trim() || null,
      address: form.address?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      country: form.country?.trim() || null,
      phone: form.phone?.trim() || null,
    };

    const onSettled = () => setSubmitting(false);
    if (isEditing && location) {
      updateMutation.mutate({ id: location.id, data: payload }, { onSettled });
      onClose();
    } else {
      createMutation.mutate(payload, { onSettled });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? 'Edit branch' : 'Add branch'}
      subtitle={isEditing ? `Update ${location?.name ?? 'branch'} details` : 'Create a new branch for your business'}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">{isEditing ? 'Branch profile' : 'New branch'}</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Branches let you track stock, sales, and shifts per location.
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Branch name *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Kampala Main"
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>Branch code</label>
          <input
            className={inputClass}
            value={form.code ?? ''}
            onChange={(e) => update('code', e.target.value || null)}
            placeholder="KLA-01"
          />
          <p className="mt-1 text-xs text-gray-500">Short, unique code used on receipts and reports.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              className={inputClass}
              value={form.phone ?? ''}
              onChange={(e) => update('phone', e.target.value || null)}
              placeholder="+256 700 000 000"
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city ?? ''}
              onChange={(e) => update('city', e.target.value || null)}
              placeholder="Kampala"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={form.address ?? ''}
            onChange={(e) => update('address', e.target.value || null)}
            placeholder="Street address"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>State / region</label>
            <input
              className={inputClass}
              value={form.state ?? ''}
              onChange={(e) => update('state', e.target.value || null)}
              placeholder="Central"
            />
          </div>
          <div>
            <label className={labelClass}>Postal code</label>
            <input
              className={inputClass}
              value={form.postal_code ?? ''}
              onChange={(e) => update('postal_code', e.target.value || null)}
              placeholder="00100"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Country</label>
          <input
            className={inputClass}
            value={form.country ?? ''}
            onChange={(e) => update('country', e.target.value || null)}
            placeholder="UG"
            maxLength={10}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active !== false}
              onChange={(e) => update('is_active', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Active branch
          </label>
          {!location?.is_default && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.is_default)}
                onChange={(e) => update('is_default', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Make default branch
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            {isEditing ? 'Save changes' : 'Create branch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
