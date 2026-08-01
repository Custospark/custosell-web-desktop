import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { ProfileSectionCard } from './ProfileSectionCard';
import { ProfilePasswordSection } from './ProfilePasswordSection';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setUser } from '../../../app/store/slices/authSlice';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { useToast } from '../../../app/contexts/useToast';
import { AUTH } from '../../../shared/api/endpoints/endpoints';
import { Badge } from '../../../shared/components/badges/Badge';
import { Button } from '../../../shared/components/buttons/Button';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import {
  buildInternationalPhone,
  formatPhoneDisplay,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import { buildFullName, splitFullName } from '../../../shared/utils/userDisplayName';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import {
  User,
  Mail,
  Phone,
  Camera,
  Image,
  Pencil,
  Building2,
  WifiOff,
} from 'lucide-react';

const inputClass =
  'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

type ProfileResponse = { data?: AuthUser } | AuthUser;
type ProfileError = { message?: string };

interface ProfileBaseline {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  localPhone: string;
  password: string;
  password_confirmation: string;
}

export type { ProfileFormState };

function baselineFromUser(user: AuthUser): ProfileBaseline {
  const { firstName, lastName } = splitFullName(user.name);
  return {
    firstName,
    lastName,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || null,
  };
}

function formFromUser(user: AuthUser): { form: ProfileFormState; countryCode: CountryCode } {
  const parsed = parseInternationalPhone(user.phone);
  const { firstName, lastName } = splitFullName(user.name);
  return {
    countryCode: parsed.countryCode,
    form: {
      firstName,
      lastName,
      email: user.email || '',
      localPhone: parsed.localNumber,
      password: '',
      password_confirmation: '',
    },
  };
}

export default function ProfileSettingsForm() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [baseline, setBaseline] = useState<ProfileBaseline>({
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    avatar: null,
  });
  const [countryCode, setCountryCode] = useState<CountryCode>(
    () => parseInternationalPhone(null).countryCode,
  );
  const [form, setForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    localPhone: '',
    password: '',
    password_confirmation: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFileSelected, setAvatarFileSelected] = useState(false);

  const resetFromUser = useCallback((user: AuthUser) => {
    const next = formFromUser(user);
    setBaseline(baselineFromUser(user));
    setCountryCode(next.countryCode);
    setForm(next.form);
    setAvatarPreview(avatarUrl(user.avatar) ?? null);
    setAvatarFileSelected(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  useEffect(() => {
    if (authUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form reset when authUser updates
      resetFromUser(authUser);
    }
  }, [authUser, resetFromUser]);

  const update = (field: keyof ProfileFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const fullPhone = buildInternationalPhone(countryCode, form.localPhone) ?? '';

  const combinedName = buildFullName(form.firstName, form.lastName);

  const hasChanges = useMemo(() => {
    if (!isEditing) return false;
    return (
      form.firstName.trim() !== baseline.firstName
      || form.lastName.trim() !== baseline.lastName
      || form.email.trim() !== baseline.email
      || fullPhone !== baseline.phone
      || form.password.trim().length > 0
      || avatarFileSelected
    );
  }, [baseline, form, fullPhone, isEditing, avatarFileSelected]);

  const passwordsValid =
    !form.password.trim() || form.password === form.password_confirmation;

  const canSave =
    hasChanges
    && form.firstName.trim().length > 0
    && form.lastName.trim().length > 0
    && form.email.trim().length > 0
    && passwordsValid
    && !isCompletelyOffline;

  const mutation = useMutation<ProfileResponse, AxiosError<ProfileError>, FormData>({
    mutationFn: async (formData) => {
      const { data } = await axiosInstance.post(`${AUTH.PROFILE}?_method=PUT`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      const userData = 'data' in data && data.data ? data.data : data;
      const user = userData as AuthUser;
      dispatch(setUser(user));
      resetFromUser(user);
      setIsEditing(false);
      showToast('success', 'Profile updated successfully');
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      setAvatarFileSelected(true);
    }
  };

  const handleCancel = () => {
    if (authUser) resetFromUser(authUser);
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    const formData = new FormData();
    formData.append('name', combinedName);
    formData.append('email', form.email.trim());
    if (fullPhone) formData.append('phone', fullPhone);
    if (form.password.trim()) {
      formData.append('password', form.password.trim());
      formData.append('password_confirmation', form.password_confirmation.trim());
    }
    if (fileRef.current?.files?.[0]) {
      formData.append('avatar', fileRef.current.files[0]);
    }
    mutation.mutate(formData);
  };

  const roleLabel = authUser?.role?.name
    ?? (authUser?.is_business_owner ? 'Business owner' : null)
    ?? (authUser?.is_platform_admin ? 'Platform admin' : null);

  return (
    <form onSubmit={handleSubmit} className="relative w-full min-h-full space-y-6 pb-28">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
            <User className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Account</p>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your personal information, photo, and password
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isCompletelyOffline}
            title={isCompletelyOffline ? 'Requires internet connection' : undefined}
            className="shrink-0"
          >
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            Edit profile
          </Button>
        ) : (
          <Badge variant="primary">Editing</Badge>
        )}
      </div>

      {isCompletelyOffline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Profile and password changes require an internet connection.</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="space-y-4 p-4 sm:p-6">
          {!isEditing && (
            <article className="rounded-xl border-2 border-blue-200 bg-blue-50/40 shadow-sm">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-md sm:mx-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-900">{baseline.name || 'Your name'}</h2>
                  <p className="mt-1 text-sm text-gray-600">{baseline.email || '—'}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {roleLabel ? <Badge variant="primary">{roleLabel}</Badge> : null}
                    {authUser?.business_name ? (
                      <Badge variant="neutral">
                        <Building2 className="mr-1 inline h-3 w-3" aria-hidden />
                        {authUser.business_name}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )}

          {isEditing && (
            <ProfileSectionCard
              icon={Image}
              title="Profile picture"
              description="Upload a photo so your team can recognise you."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 sm:mx-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" aria-hidden />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Camera className="mr-1.5 h-4 w-4" aria-hidden />
                    Upload photo
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
            </ProfileSectionCard>
          )}

          <ProfileSectionCard
            icon={User}
            title="Personal information"
            description="Your name and contact details."
          >
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      First name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        className={inputClass}
                        value={form.firstName}
                        onChange={update('firstName')}
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        className={inputClass}
                        value={form.lastName}
                        onChange={update('lastName')}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                        type="email"
                        value={form.email}
                        readOnly
                        tabIndex={-1}
                        placeholder="Email address"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Email is your login and cannot be changed.</p>
                  </div>
                  <PhoneNumberField
                    label="Phone"
                    countryCode={countryCode}
                    onCountryCodeChange={setCountryCode}
                    value={form.localPhone}
                    onChange={(localPhone) => setForm((p) => ({ ...p, localPhone }))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ProfileViewField label="First name" icon={<User className="h-4 w-4 text-blue-600" />}>
                  {baseline.firstName || '—'}
                </ProfileViewField>
                <ProfileViewField label="Last name" icon={<User className="h-4 w-4 text-blue-600" />}>
                  {baseline.lastName || '—'}
                </ProfileViewField>
                <ProfileViewField label="Email" icon={<Mail className="h-4 w-4 text-blue-600" />}>
                  {baseline.email || '—'}
                </ProfileViewField>
                <ProfileViewField label="Phone" icon={<Phone className="h-4 w-4 text-blue-600" />}>
                  {formatPhoneDisplay(baseline.phone)}
                </ProfileViewField>
              </div>
            )}
          </ProfileSectionCard>

          {isEditing && (
            <ProfilePasswordSection
              form={form}
              update={update}
              passwordsValid={passwordsValid}
            />
          )}
        </div>
      </div>

      {isEditing && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t-2 border-gray-200 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-600">
              {hasChanges ? 'You have unsaved changes' : 'Update your details, then save'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending} disabled={!canSave}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function ProfileViewField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
          {icon}
        </span>
        <span className="min-w-0 break-words">{children}</span>
      </dd>
    </div>
  );
}
