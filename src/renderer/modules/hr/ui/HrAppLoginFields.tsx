import { Eye, EyeOff, KeyRound, LayoutGrid, Mail, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import {
  BUSINESS_MODULE_SLUGS,
  MODULE_LABELS,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';
import { HrFormSection, HrIconField, hrInputClass, hrSelectClass } from './hrFormFields';

export interface HrAppLoginFormState {
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
  modules: BusinessModuleSlug[];
}

interface HrAppLoginFieldsProps {
  value: HrAppLoginFormState;
  onChange: (next: HrAppLoginFormState) => void;
  roles: Array<{ id: number; name: string }>;
  emailRequired?: boolean;
  description?: string;
}

export const emptyAppLoginForm = (): HrAppLoginFormState => ({
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  modules: ['sales'],
});

export function HrAppLoginFields({
  value,
  onChange,
  roles,
  emailRequired = true,
  description = 'You set their password now — share it securely. They can change it later from their profile or forgot-password.',
}: HrAppLoginFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function toggleModule(slug: BusinessModuleSlug) {
    const has = value.modules.includes(slug);
    const next = has ? value.modules.filter((m) => m !== slug) : [...value.modules, slug];
    onChange({ ...value, modules: next });
  }

  return (
    <div className="space-y-4">
      <HrFormSection title="App login" icon={KeyRound} description={description}>
        <HrIconField label="Login email" icon={Mail} required={emailRequired} hint="Must be unique — this is how they sign in.">
          <input
            type="email"
            required={emailRequired}
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="name@business.com"
            className={hrInputClass}
          />
        </HrIconField>

        <div className="grid gap-4 sm:grid-cols-2">
          <HrIconField label="Password" icon={KeyRound} required hint="At least 6 characters.">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              className={cn(hrInputClass, 'pr-10')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </HrIconField>
          <HrIconField label="Confirm password" icon={KeyRound} required>
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={6}
              value={value.password_confirmation}
              onChange={(e) => onChange({ ...value, password_confirmation: e.target.value })}
              className={cn(hrInputClass, 'pr-10')}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </HrIconField>
        </div>

        <HrIconField label="Role" icon={Shield} hint="Controls permissions beyond module access.">
          <select
            value={value.role_id}
            onChange={(e) => onChange({ ...value, role_id: e.target.value })}
            className={hrSelectClass}
          >
            <option value="">No role assigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </HrIconField>
      </HrFormSection>

      <HrFormSection
        title="Module access"
        icon={LayoutGrid}
        description="Choose which parts of Custosell they can open. You can change this later in Settings → Staff."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {BUSINESS_MODULE_SLUGS.map((slug) => (
            <label
              key={slug}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                value.modules.includes(slug)
                  ? 'border-indigo-200 bg-indigo-50/80 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              <input
                type="checkbox"
                checked={value.modules.includes(slug)}
                onChange={() => toggleModule(slug)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {MODULE_LABELS[slug]}
            </label>
          ))}
        </div>
      </HrFormSection>
    </div>
  );
}
