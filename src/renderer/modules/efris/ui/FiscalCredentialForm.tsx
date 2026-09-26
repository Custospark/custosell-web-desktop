import { useEffect, useState } from 'react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { useLocations } from '../../settings/api/settings/LocationQueries';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import type { FiscalCredential, FiscalCredentialFormState } from '../api/fiscalCredentialTypes';
import { emptyCredentialForm, formFromCredential, payloadFromForm } from '../api/fiscalCredentialTypes';
import { useCreateFiscalCredential, useUpdateFiscalCredential } from '../api/useFiscalCredentialQueries';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

interface FiscalCredentialFormProps {
  open: boolean;
  credential: FiscalCredential | null;
  onClose: () => void;
}

export function FiscalCredentialForm({ open, credential, onClose }: FiscalCredentialFormProps) {
  const isNew = credential === null;
  const { data: locations = [] } = useLocations();
  const { isCompletelyOffline } = useNetworkStatus();
  const createMutation = useCreateFiscalCredential();
  const updateMutation = useUpdateFiscalCredential();
  const [form, setForm] = useState<FiscalCredentialFormState>(emptyCredentialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setForm(credential ? formFromCredential(credential) : emptyCredentialForm());
      setErrors({});
    });
  }, [open, credential]);

  const set = <K extends keyof FiscalCredentialFormState>(key: K, value: FiscalCredentialFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.tin.trim()) next.tin = 'TIN is required.';
    if (!form.device_no.trim()) next.device_no = 'Device number is required.';
    if (!form.api_username.trim()) next.api_username = 'API username is required.';
    if (isNew && form.api_password.length < 4) next.api_password = 'API password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload = payloadFromForm(form, isNew);
    if (isNew) {
      createMutation.mutate(payload, { onSuccess: onClose });
    } else if (credential) {
      updateMutation.mutate({ id: credential.id, payload }, { onSuccess: onClose });
    }
  }

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add fiscal credentials' : 'Edit fiscal credentials'}
      subtitle="One set per branch - leave branch empty for the business default."
      onSubmit={handleSubmit}
      isSubmitting={saving}
      canSubmit={!isCompletelyOffline}
    >
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Step 1 - Which branch is this for?</h3>
        </div>
        <div className="p-4 space-y-4">
          <Field
            label="Branch"
            hint="Leave as business default unless URA gave this branch its own device."
          >
            <select
              value={form.location_id}
              onChange={(e) => set('location_id', e.target.value === '' ? '' : Number(e.target.value))}
              className={`${inputClass} bg-white`}
            >
              <option value="">Business default (all branches)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country" required>
              <input
                value={form.country}
                onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UG"
                className={inputClass}
              />
            </Field>
            <Field
              label="Environment"
              required
              hint="Sandbox first - switch to live URA only after testing."
            >
              <select
                value={form.environment}
                onChange={(e) => set('environment', e.target.value as 'sandbox' | 'production')}
                className={`${inputClass} bg-white`}
              >
                <option value="sandbox">Sandbox (test)</option>
                <option value="production">Production (live URA)</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Step 2 - Business identity from URA</h3>
        </div>
        <div className="p-4 space-y-4">
          <Field
            label="Company TIN"
            required
            error={errors.tin}
            hint="The tax number on your URA registration certificate."
          >
            <input
              value={form.tin}
              onChange={(e) => set('tin', e.target.value)}
              placeholder="1000123456"
              inputMode="numeric"
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Device number"
              required
              error={errors.device_no}
              hint="The virtual device registered for this business in the EFRIS portal."
            >
              <input
                value={form.device_no}
                onChange={(e) => set('device_no', e.target.value)}
                placeholder="e.g. 1000123456_01"
                className={inputClass}
              />
            </Field>
            <Field
              label="Branch ID"
              hint="Only if URA assigned this branch its own ID - otherwise leave empty."
            >
              <input
                value={form.branch_id}
                onChange={(e) => set('branch_id', e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Step 3 - System login URA gave you</h3>
        </div>
        <div className="p-4 space-y-4">
          <Field
            label="API username"
            required
            error={errors.api_username}
            hint="The system-to-system user created in the EFRIS portal - not your URA password."
          >
            <input
              value={form.api_username}
              onChange={(e) => set('api_username', e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </Field>
          <Field
            label="API password"
            required={isNew}
            error={errors.api_password}
            hint={isNew ? 'Stored encrypted - never shown back.' : 'Leave blank to keep the stored secret.'}
          >
            <input
              type="password"
              value={form.api_password}
              onChange={(e) => set('api_password', e.target.value)}
              autoComplete="new-password"
              placeholder={isNew ? '' : 'Leave blank to keep the stored secret'}
              className={inputClass}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Active - use these details when fiscalizing
          </label>
        </div>
      </div>

      {isCompletelyOffline && (
        <p className="text-xs text-amber-700">Reconnect to save - credentials live on the server, never on this device alone.</p>
      )}
    </SlideDrawer>
  );
}
