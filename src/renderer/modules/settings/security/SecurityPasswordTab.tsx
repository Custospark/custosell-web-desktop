import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Button } from '../../../shared/components/buttons/Button';
import { useToast } from '../../../app/contexts/useToast';
import { KeyRound, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ApiError } from '../../../shared/api/account/AccountTypes';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

export default function SecurityPasswordTab() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [pendingNewPassword, setPendingNewPassword] = useState('');

  const passwordsMatch = password === confirmation;
  const valid = currentPassword.length > 0 && password.length >= 6 && passwordsMatch;

  const initiateMutation = useMutation<{ message: string; requires_password_confirmation: boolean }, AxiosError<ApiError>, {
    current_password: string;
    password: string;
    password_confirmation: string;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ message: string; requires_password_confirmation: boolean }>(
        AUTH.PASSWORD_INITIATE,
        payload,
      );
      return data;
    },
    onSuccess: (data, vars) => {
      setPendingNewPassword(vars.password);
      setCode('');
      setCurrentPassword('');
      showToast('success', data.message);
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Could not start the password change.');
    },
  });

  const confirmMutation = useMutation<{ message: string }, AxiosError<ApiError>, { code: string }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ message: string }>(AUTH.PASSWORD_CONFIRM, payload);
      return data;
    },
    onSuccess: (data) => {
      setPassword('');
      setConfirmation('');
      setCode('');
      setPendingNewPassword('');
      showToast('success', data.message);
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'That security code is invalid or has expired.');
    },
  });

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    initiateMutation.mutate({
      current_password: currentPassword,
      password,
      password_confirmation: confirmation,
    });
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    confirmMutation.mutate({ code });
  };

  if (pendingNewPassword) {
    return (
      <form onSubmit={handleConfirm} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
          <div className="rounded-xl bg-green-50 p-2.5 text-green-600 shrink-0">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Confirm the password change</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              We sent a 6-digit security code to your email. Enter it to finish updating your password.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <label className={labelClass}>Security code</label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              className={inputClass}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">The code expires shortly. Your password won't change until it's confirmed.</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-4 py-4 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPendingNewPassword('')}
            disabled={confirmMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
          <Button type="submit" loading={confirmMutation.isPending} disabled={!code.trim()}>
            Confirm password change
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleInitiate} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Change your password</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Use at least 6 characters. We'll email you a code to confirm the change.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
        <div>
          <label className={labelClass}>Current password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              className={inputClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </div>
        </div>
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
        <Button type="submit" loading={initiateMutation.isPending} disabled={!valid}>
          Send security code
        </Button>
      </div>
    </form>
  );
}
