import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Button } from '../../../shared/components/buttons/Button';
import { useToast } from '../../../app/contexts/useToast';
import { KeyRound, Lock } from 'lucide-react';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import type { ApiError } from '../../../shared/api/account/AccountTypes';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

export default function SecurityPasswordTab() {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const passwordsMatch = password === confirmation;
  const valid = password.length >= 6 && passwordsMatch;

  const mutation = useMutation<{ message: string } | AuthUser, AxiosError<ApiError>, FormData>({
    mutationFn: async (formData) => {
      const { data } = await axiosInstance.post(`${AUTH.PROFILE}?_method=PUT`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      setPassword('');
      setConfirmation('');
      showToast('success', 'Password updated successfully.');
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update password.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const formData = new FormData();
    formData.append('password', password);
    formData.append('password_confirmation', confirmation);
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Change your password</h2>
          <p className="mt-0.5 text-sm text-gray-500">Use at least 6 characters. You'll be signed in on your next login.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
        <div>
          <label className={labelClass}>New password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
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
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {confirmation && !passwordsMatch && (
        <p className="px-5 pb-1 text-sm font-medium text-red-600">Passwords do not match</p>
      )}

      <div className="flex justify-end border-t border-gray-200 px-4 py-4 sm:px-5">
        <Button type="submit" loading={mutation.isPending} disabled={!valid}>
          Update password
        </Button>
      </div>
    </form>
  );
}