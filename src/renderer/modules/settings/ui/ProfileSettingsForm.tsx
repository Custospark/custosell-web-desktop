import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import { useToast } from '../../../app/contexts/useToast';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { User, Mail, Phone, Lock, Camera } from 'lucide-react';

const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function ProfileSettingsForm() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
      setForm({
        name: authUser.name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        password: '',
        password_confirmation: '',
      });
      setAvatarPreview(authUser.avatar || null);
    }
  }, [authUser]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const mutation = useMutation<any, AxiosError, FormData>({
    mutationFn: async (formData) => {
      const { data } = await axiosInstance.post(AUTH.PROFILE + '?_method=PUT', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      const userData = data?.data ?? data;
      dispatch(setUser(userData));
      showToast('success', 'Profile updated successfully');
    },
    onError: (e) => {
      showToast('error', (e.response?.data as any)?.message || 'Failed to update profile');
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', form.name.trim());
    formData.append('email', form.email.trim());
    if (form.phone.trim()) formData.append('phone', form.phone.trim());
    if (form.password.trim()) {
      formData.append('password', form.password.trim());
      formData.append('password_confirmation', form.password_confirmation.trim());
    }
    if (fileRef.current?.files?.[0]) {
      formData.append('avatar', fileRef.current.files[0]);
    }
    mutation.mutate(formData);
  };

  const canSubmit = form.name.trim().length > 0 && form.email.trim().length > 0 &&
    (!form.password.trim() || form.password === form.password_confirmation);

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information and password</p>
        </div>
        <Button type="submit" loading={mutation.isPending} disabled={!canSubmit}>
          <User className="w-4 h-4 mr-1.5" />Save Changes
        </Button>
      </div>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Profile Picture</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1.5" />Upload Photo
            </Button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Personal Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={update('name')} placeholder="Your name" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} type="email" value={form.email} onChange={update('email')} placeholder="Email address" required />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className={inputClass} value={form.phone} onChange={update('phone')} placeholder="Phone number" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Change Password</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4 -mt-3">Leave blank to keep your current password</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="password" value={form.password} onChange={update('password')} placeholder="Min 6 characters" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="password" value={form.password_confirmation} onChange={update('password_confirmation')} placeholder="Confirm password" />
            </div>
          </div>
        </div>
        {form.password && form.password !== form.password_confirmation && (
          <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
        )}
      </Card>
    </form>
  );
}
