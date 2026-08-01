import { Lock } from 'lucide-react';
import { ProfileSectionCard } from './ProfileSectionCard';
import type { ProfileFormState } from './ProfileSettingsForm';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

export function ProfilePasswordSection({
  form,
  update,
  passwordsValid,
}: {
  form: ProfileFormState;
  update: (field: keyof ProfileFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  passwordsValid: boolean;
}) {
  return (
    <ProfileSectionCard
      icon={Lock}
      title="Change password"
      description="Leave blank to keep your current password."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                className={inputClass}
                type="password"
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
                placeholder="Confirm password"
              />
            </div>
          </div>
        </div>
        {form.password && !passwordsValid && (
          <p className="text-sm font-medium text-red-600">Passwords do not match</p>
        )}
      </div>
    </ProfileSectionCard>
  );
}
