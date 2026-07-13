import { Key, Eye, EyeOff } from 'lucide-react';

interface StaffPasswordFieldsProps {
  password: string;
  passwordConfirmation: string;
  passwordRequired: boolean;
  showConfirmPasswordField: boolean;
  passwordsMatch: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isEditing: boolean;
  isPendingCreate: boolean;
  inputClass: string;
  labelClass: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
}

export function StaffPasswordFields({
  password,
  passwordConfirmation,
  passwordRequired,
  showConfirmPasswordField,
  passwordsMatch,
  showPassword,
  showConfirmPassword,
  isEditing,
  isPendingCreate,
  inputClass,
  labelClass,
  onPasswordChange,
  onPasswordConfirmationChange,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
}: StaffPasswordFieldsProps) {
  return (
    <>
      <div>
        <label className={labelClass}>
          {isEditing && !isPendingCreate ? 'New password (optional)' : 'Password'}
          {passwordRequired && <span className="text-red-500"> *</span>}
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            className={`${inputClass} pr-12`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={passwordRequired ? 'Enter password' : 'Leave blank to keep current password'}
            required={passwordRequired}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {showConfirmPasswordField && (
        <div>
          <label className={labelClass}>
            Confirm Password {passwordRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className={`${inputClass} pr-12`}
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={(e) => onPasswordConfirmationChange(e.target.value)}
              placeholder="Confirm password"
              required={passwordRequired}
            />
            <button
              type="button"
              onClick={onToggleShowConfirmPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordConfirmation && !passwordsMatch && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>
      )}
    </>
  );
}
