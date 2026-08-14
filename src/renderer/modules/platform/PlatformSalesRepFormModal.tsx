import { useState, useRef } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES_REPS, USERS } from '../../shared/api/endpoints/endpoints';
import { useToast } from '../../app/contexts/ToastContext';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import {
  Mail, UserCheck, UserPlus, Handshake, Phone, MapPinned, Landmark,
  Smartphone, Hash, Building, User, Key, Eye, EyeOff,
} from 'lucide-react';
import { PipelineModalHero, PipelineFormSection, PipelineIconField } from '../pipeline/ui/pipelineFormFields';
import { SalesRepCommissionSection } from './SalesRepCommissionSection';

export interface PlatformSalesRep {
  id: number;
  user_id: number;
  referral_code_id: number;
  commission_rate: string;
  discount_rate: string;
  commission_type: 'percentage' | 'flat';
  is_active: boolean;
  phone?: string | null;
  region?: string | null;
  payment_method?: 'mobile_money' | 'bank' | null;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  mobile_money_name?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string };
  referral_code?: { id: number; code: string };
  total_commission?: number;
  pending_commission?: number;
  paid_commission?: number;
  total_referrals?: number;
  active_referrals?: number;
}

interface SalesRepForm {
  email: string;
  name: string;
  password: string;
  phone: string;
  region: string;
  payment_method: 'mobile_money' | 'bank' | '';
  mobile_money_provider: string;
  mobile_money_number: string;
  mobile_money_name: string;
  bank_name: string;
  bank_branch: string;
  bank_account_name: string;
  bank_account_number: string;
  commission_rate: string;
  discount_rate: string;
  commission_type: 'percentage' | 'flat';
  is_active: boolean;
}

const REGIONS = ['Central', 'Eastern', 'Northern', 'Western', 'Kampala'];
const MM_PROVIDERS = ['MTN Mobile Money', 'Airtel Money'];

const emptyForm: SalesRepForm = {
  email: '', name: '', password: '', phone: '', region: '',
  payment_method: '', mobile_money_provider: '', mobile_money_number: '', mobile_money_name: '',
  bank_name: '', bank_branch: '', bank_account_name: '', bank_account_number: '',
  commission_rate: '', discount_rate: '', commission_type: 'percentage', is_active: true,
};

export function SalesRepFormModal({ show, editing, onClose }: {
  show: boolean;
  editing: PlatformSalesRep | null;
  onClose: (refetch?: boolean) => void;
}) {
  const { showToast } = useToast();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<SalesRepForm>(() => editing ? {
    email: editing.user?.email ?? '',
    name: editing.user?.name ?? '',
    password: '',
    phone: editing.phone ?? '',
    region: editing.region ?? '',
    payment_method: editing.payment_method ?? '',
    mobile_money_provider: editing.mobile_money_provider ?? '',
    mobile_money_number: editing.mobile_money_number ?? '',
    mobile_money_name: editing.mobile_money_name ?? '',
    bank_name: editing.bank_name ?? '',
    bank_branch: editing.bank_branch ?? '',
    bank_account_name: editing.bank_account_name ?? '',
    bank_account_number: editing.bank_account_number ?? '',
    commission_rate: String(editing.commission_rate),
    discount_rate: String(editing.discount_rate ?? 20),
    commission_type: editing.commission_type,
    is_active: editing.is_active,
  } : emptyForm);
  const [searchedUser, setSearchedUser] = useState<{ id: number; name: string; email: string } | null>(editing?.user ?? null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const reset = () => {
    setForm(emptyForm);
    setSearchedUser(null);
  };

  const doSearch = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSearching(true);
    setSearchedUser(null);
    try {
      const { data } = await axiosInstance.get(USERS.LOOKUP, { params: { email } });
      const u = data?.data?.user;
      if (u) {
        setSearchedUser(u);
        setForm((f) => ({ ...f, name: u.name }));
      }
    } catch {
      setSearchedUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setForm((f) => ({ ...f, email }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (email.includes('@')) {
      searchTimeout.current = setTimeout(() => doSearch(email), 600);
    }
  };

  const handleSave = async () => {
    if (!editing && !searchedUser && !form.password) {
      showToast('error', 'Set a password - a personal account will be created for this rep');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await axiosInstance.put(SALES_REPS.BY_ID(editing.id), {
          commission_rate: form.commission_rate,
          discount_rate: form.discount_rate,
          commission_type: form.commission_type,
          is_active: form.is_active,
          phone: form.phone || null,
          region: form.region || null,
          payment_method: form.payment_method || null,
          mobile_money_provider: form.mobile_money_provider || null,
          mobile_money_number: form.mobile_money_number || null,
          mobile_money_name: form.mobile_money_name || null,
          bank_name: form.bank_name || null,
          bank_branch: form.bank_branch || null,
          bank_account_name: form.bank_account_name || null,
          bank_account_number: form.bank_account_number || null,
        });
      } else {
        await axiosInstance.post(SALES_REPS.BASE, {
          email: form.email,
          name: form.name || undefined,
          password: form.password || undefined,
          commission_rate: form.commission_rate,
          discount_rate: form.discount_rate,
          commission_type: form.commission_type,
          is_active: form.is_active,
          phone: form.phone || null,
          region: form.region || null,
          payment_method: form.payment_method || null,
          mobile_money_provider: form.mobile_money_provider || null,
          mobile_money_number: form.mobile_money_number || null,
          mobile_money_name: form.mobile_money_name || null,
          bank_name: form.bank_name || null,
          bank_branch: form.bank_branch || null,
          bank_account_name: form.bank_account_name || null,
          bank_account_number: form.bank_account_number || null,
        });
      }
      showToast('success', editing ? 'Sales rep updated' : 'Sales rep created');
      reset();
      onClose(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      showToast('error', axiosErr.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={show} onClose={() => { reset(); onClose(); }} title="" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={Handshake}
          title={editing ? 'Edit Sales Representative' : 'New Sales Representative'}
          description={editing ? `Updating ${editing.user?.name ?? 'sales rep'}` : 'Register a sales rep or assign an existing user'}
          tone="emerald"
        />

        {!editing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="rep@example.com"
                />
              </div>
              <Button variant="secondary" onClick={() => doSearch(form.email)} disabled={searching || !form.email}>
                {searching ? '...' : 'Search'}
              </Button>
            </div>
            {searching && <p className="mt-1.5 text-xs text-gray-500">Looking up user...</p>}
            {searchedUser && !searching && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">{searchedUser.name}</p>
                  <p className="text-xs text-green-600">{searchedUser.email}</p>
                  <p className="text-xs text-green-500">Existing user - will be added as a sales rep</p>
                </div>
              </div>
            )}
            {!searching && form.email && !searchedUser && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <UserPlus className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-700">No user found with this email.</p>
                  <p className="text-xs text-amber-600">A new account will be created. Fill in their details below.</p>
                </div>
              </div>
            )}
          {!editing && !searchedUser && form.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-12 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Set a password for their sign-in (min 6)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">They'll use this to sign in to their personal account and view their Referral Dashboard.</p>
            </div>
          )}
          </div>
        )}

        {editing && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{editing.user?.name}</p>
              <p className="text-xs text-gray-500">{editing.user?.email}</p>
            </div>
          </div>
        )}

        <PipelineFormSection title="Contact Information" icon={Phone}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label="Full Name" icon={User} required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={editing ? editing.user?.name : 'Sales rep name'}
              />
            </PipelineIconField>
            <PipelineIconField label="Phone" icon={Phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="+256 700 000 000"
              />
            </PipelineIconField>
          </div>
          <PipelineIconField label="Region" icon={MapPinned}>
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select region</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Payout Method" icon={Landmark} description="Where commission payouts will be sent">
          <PipelineIconField label="Preferred Method" icon={Smartphone}>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as SalesRepForm['payment_method'] }))}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select payment method</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </PipelineIconField>

          {form.payment_method === 'mobile_money' && (
            <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mobile Money Details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PipelineIconField label="Provider" icon={Smartphone}>
                  <select
                    value={form.mobile_money_provider}
                    onChange={(e) => setForm((f) => ({ ...f, mobile_money_provider: e.target.value }))}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select provider</option>
                    {MM_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </PipelineIconField>
                <PipelineIconField label="Account Name" icon={User}>
                  <input
                    type="text"
                    value={form.mobile_money_name}
                    onChange={(e) => setForm((f) => ({ ...f, mobile_money_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Name on MM account"
                  />
                </PipelineIconField>
              </div>
              <PipelineIconField label="Mobile Money Number" icon={Phone}>
                <input
                  type="tel"
                  value={form.mobile_money_number}
                  onChange={(e) => setForm((f) => ({ ...f, mobile_money_number: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+256 700 000 000"
                />
              </PipelineIconField>
            </div>
          )}

          {form.payment_method === 'bank' && (
            <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bank Account Details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PipelineIconField label="Bank Name" icon={Landmark}>
                  <input
                    type="text"
                    value={form.bank_name}
                    onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. Stanbic Bank"
                  />
                </PipelineIconField>
                <PipelineIconField label="Branch" icon={Building}>
                  <input
                    type="text"
                    value={form.bank_branch}
                    onChange={(e) => setForm((f) => ({ ...f, bank_branch: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. Kampala Road"
                  />
                </PipelineIconField>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PipelineIconField label="Account Name" icon={User}>
                  <input
                    type="text"
                    value={form.bank_account_name}
                    onChange={(e) => setForm((f) => ({ ...f, bank_account_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Name on bank account"
                  />
                </PipelineIconField>
                <PipelineIconField label="Account Number" icon={Hash}>
                  <input
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => setForm((f) => ({ ...f, bank_account_number: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. 0123456789"
                  />
                </PipelineIconField>
              </div>
            </div>
          )}
        </PipelineFormSection>

        <SalesRepCommissionSection
          commissionRate={form.commission_rate}
          discountRate={form.discount_rate}
          commissionType={form.commission_type}
          isActive={form.is_active}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!editing && !form.email)}>
            {saving ? 'Saving...' : editing ? 'Update Sales Rep' : 'Create Sales Rep'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
