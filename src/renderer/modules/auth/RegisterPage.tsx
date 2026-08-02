import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useRegisterBusiness } from '../../shared/api/account/AccountQueries';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { useValidateReferralCode } from '../../modules/referral/api/useReferralQueries';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { AccountTypeSelector } from './AccountTypeSelector';
import { SimpleAccountForm } from './SimpleAccountForm';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { countryCodes, type CountryCode } from '../../shared/utils/countryCodes';
import { getPhonePlaceholder } from '../../shared/utils/phoneNumber';
import { CURRENCIES } from '../../shared/utils/currencies';
import {
  Store, Mail, Lock, User, Phone, ChevronDown, ChevronLeft, Eye, EyeOff,
  UserPlus, Coins, Tag, CheckCircle, XCircle, ArrowLeft,
} from 'lucide-react';
export default function RegisterPage() {
  const businessMutation = useRegisterBusiness();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { planId?: number; billingCycle?: 'monthly' | 'yearly' } | null;
  const { data: plans, isLoading: plansLoading, isError: plansError } = useActivePlans();
  const businessPlans = plans?.filter((p) => p.type !== 'personal') ?? [];
  const referralCode = searchParams.get('ref') ?? searchParams.get('campaign') ?? undefined;

  const [accountType, setAccountType] = useState<'business' | 'personal' | 'shopping' | null>(null);
  const [manualReferralCode, setManualReferralCode] = useState('');

  const { data: validation, isFetching: validating } = useValidateReferralCode(manualReferralCode);

  const planId = state?.planId ?? businessPlans[0]?.id;
  const billingCycle = state?.billingCycle ?? 'monthly';
  const activeReferralCode = manualReferralCode || referralCode;

  const [form, setForm] = useState({
    owner_first_name: '',
    owner_last_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [countryCode, setCountryCode] = useState<CountryCode>(countryCodes.find((c) => c.code === 'UG') || countryCodes[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState('UGX');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const currencyRef = useRef<HTMLDivElement>(null);

  const filtered = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial_code.includes(search) || c.code.toLowerCase().includes(search)
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordsMatch = form.password === form.password_confirmation;
  const businessFormValid =
    Boolean(form.password) &&
    Boolean(form.password_confirmation) &&
    passwordsMatch &&
    privacyConsent;

  const handleProceed = () => {
    if (!form.owner_first_name || !form.owner_last_name || !form.name || !form.email) return;
    setStep(2);
  };

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    if (form.password_confirmation.length > 0 && !passwordsMatch) return;

    const fullPhone = form.phone ? `${countryCode.dial_code}${form.phone.replace(/\D/g, '')}` : undefined;

    businessMutation.mutate({
      owner_name: [form.owner_first_name, form.owner_last_name]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' '),
      name: form.name,
      email: form.email,
      phone: fullPhone,
      password: form.password,
      password_confirmation: form.password_confirmation,
      privacy_consent: privacyConsent,
      plan_id: planId,
      billing_cycle: billingCycle,
      referral_code: activeReferralCode || undefined,
      currency,
    });
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm";

  const renderPhoneInput = (required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone {required ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}</label>
      <div className="flex gap-2">
        <div ref={dropdownRef} className="relative shrink-0">
          <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 h-[46px] px-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors cursor-pointer">
            <span className="text-lg">{countryCode.flag}</span>
            <span className="text-sm font-medium text-gray-700">{countryCode.dial_code}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 min-w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
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
  );

  const renderPasswordFields = () => (
    <>
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
    </>
  );

  if (!accountType) {
    return (
      <AuthLayout
        title="Create Account"
        heroImage={AUTH_HERO_IMAGES.register}
      >
        <AccountTypeSelector onSelect={setAccountType} />
      </AuthLayout>
    );
  }

  if (accountType === 'personal' || accountType === 'shopping') {
    const isShopping = accountType === 'shopping';
    return (
      <AuthLayout
        title={isShopping ? 'Create Shopping Account' : 'Create Personal Account'}
        subtitle={isShopping ? 'Setting up your Shopping Account' : 'Setting up your Personal Account'}
        subtitleClassName="text-blue-600"
        heroImage={AUTH_HERO_IMAGES.register}
      >
        <SimpleAccountForm mode={accountType} onBack={() => setAccountType(null)} />
      </AuthLayout>
    );
  }

  return (
      <AuthLayout
        title="Create Business Account"
        subtitle="Setting up your Business Account"
        subtitleClassName="text-blue-600"
        heroImage={AUTH_HERO_IMAGES.register}
      >
        <form onSubmit={handleBusinessSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Step {step} of 2</span>
          <div className="flex gap-1">
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 1 ? 'bg-blue-600' : 'bg-blue-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 2 ? 'bg-blue-600' : 'bg-blue-200'}`} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
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

            {renderPhoneInput(true)}

            <div className="flex gap-3">
              <button type="button" onClick={() => setAccountType(null)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-blue-300 bg-white px-4 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button
                type="button"
                onClick={handleProceed}
                className="flex-1 gap-2 py-3.5"
                disabled={!form.owner_first_name || !form.owner_last_name || !form.name || !form.email}
              >
                Proceed
                <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {renderPasswordFields()}

            <div ref={currencyRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white py-3.5 pl-11 pr-3 text-left text-sm transition-colors hover:border-gray-400 cursor-pointer"
                >
                  <span className={currency ? 'text-gray-900' : 'text-gray-400'}>
                    {currency ? `${currency} ${CURRENCIES.find((c) => c.code === currency)?.symbol ?? ''}` : 'Select currency'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                </button>
                {currencyOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                      <input
                        type="text"
                        placeholder="Search currency..."
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    {CURRENCIES.filter(
                      (c) =>
                        c.code.toLowerCase().includes(currencySearch.toLowerCase())
                        || c.name.toLowerCase().includes(currencySearch.toLowerCase()),
                    ).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code);
                          setCurrencyOpen(false);
                          setCurrencySearch('');
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-blue-50 ${currency === c.code ? 'bg-blue-50 font-medium' : ''}`}
                      >
                        <span className="text-gray-800">{c.code}</span>
                        <span className="text-gray-400">{c.symbol}</span>
                        <span className="ml-auto truncate text-gray-500">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Promo or referral code (optional)"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value.toUpperCase())}
                className={`${inputCls} pr-10`}
              />
              {referralCode && !manualReferralCode && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5">
                  <Tag className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs font-mono font-medium text-indigo-700">{referralCode}</span>
                </div>
              )}
            </div>

            {manualReferralCode.length >= 3 && validating && (
              <p className="text-xs text-gray-400 mt-1 ml-1">Checking code...</p>
            )}
            {manualReferralCode.length >= 3 && !validating && validation && (
              <p className={`text-xs mt-1 ml-1 flex items-center gap-1 ${validation.valid ? 'text-green-600' : 'text-red-500'}`}>
                {validation.valid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {validation.message}
              </p>
            )}

            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">
                I agree to the{' '}
                <Link
                  to={ROUTES.PRIVACY}
                  className="text-gray-500 hover:text-blue-600 underline"
                >
                  Data & Privacy Policy
                </Link>
              </span>
            </label>
            {!privacyConsent && (
              <p className="text-xs text-red-500 text-center -mt-1">You must agree to the Data & Privacy Policy to create an account.</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-blue-300 bg-white px-4 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <Button type="submit" className="flex-1 gap-2 py-3.5" loading={businessMutation.isPending} disabled={!planId || !businessFormValid}>
                <UserPlus className="h-4 w-4" aria-hidden />
                Create Account
              </Button>
            </div>
            {plansLoading && !planId && (
              <p className="text-xs text-gray-400 text-center">Loading available plans...</p>
            )}
            {!planId && !plansLoading && (
              <p className="text-xs text-red-500 text-center">
                {plansError ? 'Plans could not be loaded. Please check your connection and try again.' : 'No plans are currently available. Please try again later.'}
              </p>
            )}
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
