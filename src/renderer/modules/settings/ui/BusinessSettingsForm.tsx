import { useState, useEffect, useRef } from 'react';
import { useBusiness, useUpdateBusiness } from '../api/settings/BusinessQueries';
import type { UpdateBusinessData } from '../api/settings/BusinessTypes';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useToast } from '../../../app/contexts/useToast';
import { CURRENCIES } from '../../../shared/utils/currencies';
import { Building2, Save, Globe, MapPin, Receipt, Store, Mail, Phone, Globe2, MapPinned, Building, Hash, Tag, Clock, Coins, FileText, ChevronDown } from 'lucide-react';
import { countryCodes } from '../../../shared/utils/countryCodes';
import type { CountryCode } from '../../../shared/utils/countryCodes';

const emptyForm: UpdateBusinessData = {
  name: '', email: null, phone: null, website: null, address: null,
  city: null, state: null, postal_code: null, country: null,
  tax_id: null, timezone: null, business_type: null,
  currency: null, receipt_footer: null,
};

const inputCls = "w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
const selectCls = "w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none";

export default function BusinessSettingsForm() {
  const { data: business, isLoading, error } = useBusiness();
  const mutation = useUpdateBusiness();
  const { showToast } = useToast();
  const [form, setForm] = useState<UpdateBusinessData>(emptyForm);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>(countryCodes.find((c) => c.code === 'UG') || countryCodes[0]);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const currencyRef = useRef<HTMLDivElement>(null);

  const filteredCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(phoneSearch.toLowerCase()) || c.dial_code.includes(phoneSearch) || c.code.toLowerCase().includes(phoneSearch)
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(e.target as Node)) {
        setPhoneDropdownOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        email: business.email ?? null,
        phone: business.phone ?? null,
        phoneLocal: business.phone ?? '',
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your business profile, currency, and receipt settings</p>
        </div>
        <Button type="submit" loading={mutation.isPending}>
          <Save className="w-4 h-4 mr-1.5" />Save Changes
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800">Business Profile</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelCls}>Business Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Store className={iconCls} />
              <input className={inputCls} value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Enter business name" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <Mail className={iconCls} />
                <input className={inputCls} type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value || null)} placeholder="business@example.com" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <div className="relative">
                <Phone className={iconCls} />
                <input className={inputCls} value={form.phone || ''} onChange={(e) => update('phone', e.target.value || null)} placeholder="+256 700 000 000" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <div className="relative">
              <Globe2 className={iconCls} />
              <input className={inputCls} type="url" value={form.website || ''} onChange={(e) => update('website', e.target.value || null)} placeholder="https://example.com" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800">Business Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Address</label>
              <div className="relative">
                <MapPin className={iconCls} />
                <textarea className={`${inputCls} resize-none pl-9`} rows={2} value={form.address || ''} onChange={(e) => update('address', e.target.value || null)} placeholder="Street address" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>City</label>
                <div className="relative">
                  <Building className={iconCls} />
                  <input className={inputCls} value={form.city || ''} onChange={(e) => update('city', e.target.value || null)} placeholder="Kampala" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>State</label>
                  <div className="relative">
                    <MapPinned className={iconCls} />
                    <input className={inputCls} value={form.state || ''} onChange={(e) => update('state', e.target.value || null)} placeholder="Central" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <div className="relative">
                    <Hash className={iconCls} />
                    <input className={inputCls} value={form.postal_code || ''} onChange={(e) => update('postal_code', e.target.value || null)} placeholder="+256" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <div className="relative">
                  <Globe className={iconCls} />
                  <input className={inputCls} value={form.country || ''} onChange={(e) => update('country', e.target.value || null)} placeholder="Uganda" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tax / VAT ID</label>
              <div className="relative">
                <Tag className={iconCls} />
                <input className={inputCls} value={form.tax_id || ''} onChange={(e) => update('tax_id', e.target.value || null)} placeholder="Tax registration number" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Business Type</label>
              <div className="relative">
                <Building2 className={iconCls} />
                <select className={selectCls} value={form.business_type || ''} onChange={(e) => update('business_type', e.target.value || null)}>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Timezone</label>
              <div className="relative">
                <Clock className={iconCls} />
                <input className={inputCls} value={form.timezone || ''} onChange={(e) => update('timezone', e.target.value || null)} placeholder="Africa/Kampala" />
              </div>
            </div>
            <div ref={currencyRef}>
              <label className={labelCls}>Currency</label>
              <div className="relative">
                <Coins className={iconCls} />
                <button type="button" onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-between">
                  <span className={form.currency ? 'text-gray-900' : 'text-gray-400'}>{form.currency ? `${CURRENCIES.find((c) => c.code === form.currency)?.code || form.currency} — ${CURRENCIES.find((c) => c.code === form.currency)?.symbol || ''} — ${CURRENCIES.find((c) => c.code === form.currency)?.name || form.currency}` : 'Select currency'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
                {currencyOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                      <input type="text" placeholder="Search currency..." value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    </div>
                    {CURRENCIES.filter((c) => c.code.toLowerCase().includes(currencySearch.toLowerCase()) || c.name.toLowerCase().includes(currencySearch.toLowerCase())).map((c) => (
                      <button key={c.code} type="button" onClick={() => { update('currency', c.code); setCurrencyOpen(false); setCurrencySearch(''); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition-colors cursor-pointer ${form.currency === c.code ? 'bg-blue-50 font-medium' : ''}`}>
                        <span className="text-gray-800">{c.code}</span>
                        <span className="text-gray-400">{c.symbol}</span>
                        <span className="text-gray-500 ml-auto truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800">Receipt Settings</h3>
        </div>
        <div className="p-4">
          <label className={labelCls}>Receipt Footer</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4 pointer-events-none" />
            <textarea className={`${inputCls} resize-none pl-9`} rows={4} value={form.receipt_footer || ''} onChange={(e) => update('receipt_footer', e.target.value || null)} placeholder="Thank you for your business!" />
          </div>
        </div>
      </div>
    </form>
  );
}
