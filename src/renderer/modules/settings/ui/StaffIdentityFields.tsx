import { User, Mail, ShieldCheck, Plus } from 'lucide-react';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import type { RoleWithSyncMeta } from '../../../app/store/offline/settings/localRolesStore';
import { StaffPasswordFields } from './StaffPasswordFields';

interface StaffIdentityFieldsProps {
  name: string;
  email: string;
  localPhone: string;
  countryCode: CountryCode;
  roleId: number | null;
  roles?: RoleWithSyncMeta[] | null;
  emailLocked: boolean;
  roleSelectionLocked: boolean;
  roleDisplayName: string;
  roleHelperText: string | null;
  isEditing: boolean;
  isPendingCreate: boolean;
  isAttachMode: boolean;
  lookupLoading: boolean;
  password: string;
  passwordConfirmation: string;
  passwordRequired: boolean;
  showConfirmPasswordField: boolean;
  passwordsMatch: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  inputClass: string;
  labelClass: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onCountryCodeChange: (code: CountryCode) => void;
  onLocalPhoneChange: (value: string) => void;
  onRoleChange: (roleId: number) => void;
  onAddRole: () => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
}

export function StaffIdentityFields({
  name,
  email,
  localPhone,
  countryCode,
  roleId,
  roles,
  emailLocked,
  roleSelectionLocked,
  roleDisplayName,
  roleHelperText,
  isEditing,
  isPendingCreate,
  isAttachMode,
  lookupLoading,
  password,
  passwordConfirmation,
  passwordRequired,
  showConfirmPasswordField,
  passwordsMatch,
  showPassword,
  showConfirmPassword,
  inputClass,
  labelClass,
  onNameChange,
  onEmailChange,
  onEmailBlur,
  onCountryCodeChange,
  onLocalPhoneChange,
  onRoleChange,
  onAddRole,
  onPasswordChange,
  onPasswordConfirmationChange,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
}: StaffIdentityFieldsProps) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Staff Information</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className={labelClass}>Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className={inputClass} value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Enter staff name" required />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className={`${inputClass}${emailLocked ? ' bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onBlur={onEmailBlur}
              placeholder="Enter email address"
              required
              readOnly={emailLocked}
              disabled={emailLocked}
              title={emailLocked ? 'Business owner email cannot be changed from staff settings.' : 'Staff email'}
            />
          </div>
          {emailLocked && (
            <p className="text-xs text-gray-500 mt-1">Business owner email is read-only.</p>
          )}
          {!isEditing && lookupLoading && (
            <p className="text-xs text-gray-500 mt-1">Checking email…</p>
          )}
        </div>
        <PhoneNumberField
          label="Phone"
          countryCode={countryCode}
          onCountryCodeChange={onCountryCodeChange}
          value={localPhone}
          onChange={onLocalPhoneChange}
        />
        <div>
          <label className={labelClass}>Role <span className="text-red-500">*</span></label>
          {roleSelectionLocked ? (
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <div className={`${inputClass} bg-gray-50 text-gray-700`} title={roleHelperText ?? 'Staff role'}>
                {roleDisplayName}
              </div>
            </div>
          ) : (
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                className={inputClass}
                value={roleId ?? 0}
                onChange={(e) => onRoleChange(Number(e.target.value))}
                required
                title="Staff role"
              >
                <option value={0}>Select a role</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.is_system ? ' (System)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {roleHelperText ? (
            <p className="text-xs text-gray-500 mt-1">{roleHelperText}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Job title only — what they can open is set under Module access below.</p>
          )}
          <button type="button" onClick={onAddRole}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
            <Plus className="w-3 h-3" />
            Add Role
          </button>
        </div>
        {!isAttachMode && (
          <StaffPasswordFields
            password={password}
            passwordConfirmation={passwordConfirmation}
            passwordRequired={passwordRequired}
            showConfirmPasswordField={showConfirmPasswordField}
            passwordsMatch={passwordsMatch}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            isEditing={isEditing}
            isPendingCreate={isPendingCreate}
            inputClass={inputClass}
            labelClass={labelClass}
            onPasswordChange={onPasswordChange}
            onPasswordConfirmationChange={onPasswordConfirmationChange}
            onToggleShowPassword={onToggleShowPassword}
            onToggleShowConfirmPassword={onToggleShowConfirmPassword}
          />
        )}
      </div>
    </div>
  );
}
