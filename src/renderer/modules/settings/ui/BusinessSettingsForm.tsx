import { useState, useEffect } from 'react';
import { useBusiness, useUpdateBusiness } from '../api/settings/BusinessQueries';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Button } from '../../../shared/components/buttons/Button';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useToast } from '../../../app/contexts/useToast';
import { CURRENCIES } from '../../../shared/utils/currencies';
import { Building2, Save } from 'lucide-react';

const emptyForm: UpdateBusinessData = {
  name: '', email: null, phone: null, website: null, address: null,
  city: null, state: null, postal_code: null, country: null,
  tax_id: null, timezone: null, business_type: null,
  currency: null, receipt_footer: null,
};

export default function BusinessSettingsForm() {
  const { data: business, isLoading, error } = useBusiness();
  const mutation = useUpdateBusiness();
  const { showToast } = useToast();
  const [form, setForm] = useState<UpdateBusinessData>(emptyForm);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        email: business.email ?? null,
        phone: business.phone ?? null,
        website: business.website ?? null,
        address: business.address ?? null,
        city: business.city ?? null,
        state: business.state ?? null,
        postal_code: business.postal_code ?? null,
        country: business.country ?? null,
        tax_id: business.tax_id ?? null,
        timezone: business.timezone ?? null,
        business_type: business.business_type ?? null,
        currency: business.currency ?? null,
        receipt_footer: business.receipt_footer ?? null,
      });
    }
  }, [business]);

  const update = <K extends keyof UpdateBusinessData>(key: K, val: UpdateBusinessData[K]) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form, {
      onSuccess: () => showToast('success', 'Business settings updated'),
    });
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<Building2 className="w-12 h-12" />} title="Failed to load business settings"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your business profile, currency, and receipt settings</p>
        </div>
        <Button type="submit" loading={mutation.isPending}><Save className="w-4 h-4 mr-1.5" />Save Changes</Button>
      </div>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Business Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Business Name <span className="text-red-500">*</span></label>
            <input className={inputClass} value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Enter business name" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value || null)} placeholder="business@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={form.phone || ''} onChange={(e) => update('phone', e.target.value || null)} placeholder="+256 700 000 000" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input className={inputClass} type="url" value={form.website || ''} onChange={(e) => update('website', e.target.value || null)} placeholder="https://example.com" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Business Details</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Address</label>
              <textarea className={inputClass + ' resize-none'} rows={2} value={form.address || ''} onChange={(e) => update('address', e.target.value || null)} placeholder="Street address" />
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={form.city || ''} onChange={(e) => update('city', e.target.value || null)} placeholder="Kampala" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>State</label>
                  <input className={inputClass} value={form.state || ''} onChange={(e) => update('state', e.target.value || null)} placeholder="Central" />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input className={inputClass} value={form.postal_code || ''} onChange={(e) => update('postal_code', e.target.value || null)} placeholder="+256" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input className={inputClass} value={form.country || ''} onChange={(e) => update('country', e.target.value || null)} placeholder="Uganda" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tax / VAT ID</label>
              <input className={inputClass} value={form.tax_id || ''} onChange={(e) => update('tax_id', e.target.value || null)} placeholder="Tax registration number" />
            </div>
            <div>
              <label className={labelClass}>Business Type</label>
              <select className={inputClass} value={form.business_type || ''} onChange={(e) => update('business_type', e.target.value || null)}>
                <option value="">Select business type</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Café</option>
                <option value="service">Service</option>
                <option value="salon">Salon</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="grocery">Grocery</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Timezone</label>
              <input className={inputClass} value={form.timezone || ''} onChange={(e) => update('timezone', e.target.value || null)} placeholder="Africa/Kampala" />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} value={form.currency || ''} onChange={(e) => update('currency', e.target.value || null)}>
                <option value="">Select currency</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.symbol} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 -mx-6 -mt-6 mb-6 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800">Receipt Settings</h3>
        </div>
        <div>
          <label className={labelClass}>Receipt Footer</label>
          <textarea className={inputClass + ' resize-none'} rows={4} value={form.receipt_footer || ''} onChange={(e) => update('receipt_footer', e.target.value || null)} placeholder="Thank you for your business!" />
        </div>
      </Card>
    </form>
  );
}
