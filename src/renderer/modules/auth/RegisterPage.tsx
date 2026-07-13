import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRegisterBusiness } from '../../shared/api/account/AccountQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { countryCodes, type CountryCode } from '../../shared/utils/countryCodes';
import { getPhonePlaceholder } from '../../shared/utils/phoneNumber';
import { Store, Mail, Lock, User, Phone, ChevronDown, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const registerMutation = useRegisterBusiness();
  const [form, setForm] = useState({
    owner_first_name: '',
    owner_last_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>(countryCodes.find((c) => c.code === 'UG') || countryCodes[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial_code.includes(search) || c.code.toLowerCase().includes(search)
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordsMatch = form.password === form.password_confirmation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fullPhone = form.phone ? `${countryCode.dial_code}${form.phone.replace(/\D/g, '')}` : undefined;

    registerMutation.mutate({
      owner_name: [form.owner_first_name, form.owner_last_name]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' '),
      name: form.name,
      email: form.email,
      phone: fullPhone,
      password: form.password,
      password_confirmation: form.password_confirmation,
    });
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Let's set up your account now."
      heroImage={AUTH_HERO_IMAGES.register}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              placeholder="First name"
              value={form.owner_first_name}
              onChange={handleChange('owner_first_name')}
              required
              className={inputCls}
            />
          </div>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              placeholder="Last name"
              value={form.owner_last_name}
              onChange={handleChange('owner_last_name')}
              required
              className={inputCls}
            />
          </div>
        </div>
        <div className="relative">
          <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input placeholder="Business, Company, or Institution name" value={form.name} onChange={handleChange('name')} required className={inputCls} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type="email" placeholder="Email address" value={form.email} onChange={handleChange('email')} required className={inputCls} />
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <div ref={dropdownRef} className="relative shrink-0">
              <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 h-[46px] px-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors cursor-pointer">
                <span className="text-lg">{countryCode.flag}</span>
                <span className="text-sm font-medium text-gray-700">{countryCode.dial_code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                    <input type="text" placeholder="Search country..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                  </div>
                  {filtered.map((c) => (
                    <button key={c.code} type="button" onClick={() => { setCountryCode(c); setDropdownOpen(false); setSearch(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 transition-colors cursor-pointer ${c.code === countryCode.code ? 'bg-blue-50 font-medium' : ''}`}>
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-gray-800">{c.name}</span>
                      <span className="ml-auto text-gray-400">{c.dial_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input type="tel" placeholder={getPhonePlaceholder(countryCode)} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d\s\-()]/g, '') }))}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm" />
            </div>
          </div>
          {form.phone && (
            <p className="text-xs text-gray-400 mt-1">Full number: {countryCode.dial_code} {form.phone}</p>
          )}
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange('password')} required className={`${inputCls} pr-12`} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={form.password_confirmation} onChange={handleChange('password_confirmation')} required className={`${inputCls} pr-12`} />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {form.password_confirmation && !passwordsMatch && (
          <p className="text-xs text-red-500 -mt-1">Passwords do not match</p>
        )}
        <Button type="submit" className="w-full py-3.5" loading={registerMutation.isPending} disabled={form.password_confirmation.length > 0 && !passwordsMatch}>
          Create Account
        </Button>
        <div className="space-y-3 border-t border-gray-100 pt-5">
          <p className="text-center text-sm font-medium text-gray-700">
            Already have an account?
          </p>
          <Link
            to={ROUTES.LOGIN}
            className="flex w-full items-center justify-center rounded-lg border-2 border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
