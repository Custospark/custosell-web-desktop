import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useBusiness } from '../../../modules/settings/api/settings/BusinessQueries';
import { resolveBusinessDisplayName, resolveBusinessLogoPath } from '../../utils/shellDisplay';
import { avatarUrl } from '../../utils/avatarUrl';
import { isBusinessOwner } from '../../utils/moduleAccess';
import { cn } from '../../utils/cn';
import {
  Building2, ChevronDown, ExternalLink, Settings, CreditCard, CircleUser,
  FileText, MapPin, Phone, Mail, GitBranch,
} from 'lucide-react';

type DetailRow = { icon: typeof MapPin; value: string };

/** Business context trigger - the Custosell equivalent of Custocare's context switcher. */
export default function BusinessDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAppSelector((s) => s.auth.user);
  const activeLocationId = useAppSelector((s) => s.auth.activeLocationId);
  const { data: business } = useBusiness();

  const businessName =
    user?.account_type === 'personal' ? 'Personal'
    : user?.account_type === 'storefront_buyer' ? 'Shopping'
    : resolveBusinessDisplayName(user, business);
  const businessLogoUrl = avatarUrl(resolveBusinessLogoPath(user, business));

  const isPersonal = user?.account_type === 'personal';
  const isBusiness = user?.account_type === 'business';
  const isOwner = isBusinessOwner(user);
  const activeLocation =
    user?.locations?.find((loc) => loc.id === activeLocationId) ??
    user?.locations?.find((loc) => loc.is_default) ??
    user?.location;
  const subtitle =
    user?.account_type === 'personal' ? 'Personal account'
    : user?.account_type === 'storefront_buyer' ? 'Shopping account'
    : (activeLocation?.name ?? 'Business account');

  const businessDetails = useMemo<DetailRow[]>(() => {
    if (!business) return [];
    const rows: DetailRow[] = [];
    if (business.description?.trim()) {
      rows.push({ icon: FileText, value: business.description.trim() });
    }
    const location = [business.address, business.city, business.state, business.country]
      .filter(Boolean)
      .join(', ')
      .trim();
    if (location) {
      rows.push({ icon: MapPin, value: location });
    }
    const phone = (business.business_phone ?? business.phone)?.trim();
    if (phone) {
      rows.push({ icon: Phone, value: phone });
    }
    const email = (business.business_email ?? business.email)?.trim();
    if (email) {
      rows.push({ icon: Mail, value: email });
    }
    return rows;
  }, [business]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavigate = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  if (!businessName || user?.account_type === 'storefront_buyer') return null;

  const links: { label: string; icon: typeof Settings; to: string }[] = [];
  if (!isPersonal && isOwner) {
    links.push({ label: 'Business Settings', icon: Settings, to: ROUTES.SETTINGS.BUSINESS });
  }
  if (isOwner) {
    links.push({ label: 'Billing & Subscription', icon: CreditCard, to: ROUTES.SETTINGS.SUBSCRIPTION });
  }
  if (!isBusiness) {
    links.push({ label: 'My Account', icon: CircleUser, to: ROUTES.ACCOUNT.PROFILE });
  }

  const showDetailsSection = !isPersonal && Boolean(business && (businessDetails.length > 0 || isOwner));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 lg:gap-2 lg:px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition-colors',
          'text-xs lg:text-sm',
          open ? 'bg-blue-50 ring-blue-300' : 'bg-white ring-blue-200 hover:bg-blue-50/60 hover:ring-blue-300',
        )}
        title={businessName}
        aria-label={`${businessName} - business menu`}
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-blue-200 bg-blue-50 shrink-0 overflow-hidden">
          {businessLogoUrl ? (
            <img src={businessLogoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
          )}
        </div>
        <div className="hidden lg:flex items-center gap-1.5 min-w-0 max-w-[200px]">
          <div className="min-w-0">
            <span className="text-xs font-semibold truncate block text-gray-900">{businessName}</span>
            <span className="flex items-center gap-1 text-xs truncate text-gray-500">
              {isBusiness && <GitBranch className="w-3 h-3 text-gray-400 shrink-0" />}
              <span className="truncate">{subtitle}</span>
            </span>
          </div>
        </div>
        <ChevronDown className={cn('w-3 h-3 transition-transform shrink-0 text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl z-50 lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:-translate-x-0 lg:mt-2 lg:w-80">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-blue-200 bg-blue-50 shrink-0 overflow-hidden">
                {businessLogoUrl ? (
                  <img src={businessLogoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  <span className="truncate">{businessName}</span>
                </p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  {isBusiness && <GitBranch className="w-3 h-3 text-gray-400 shrink-0" />}
                  <span className="truncate">{subtitle}</span>
                </p>
              </div>
            </div>
          </div>

          {showDetailsSection && (
            <div className="px-4 py-3 border-b border-gray-200">
              {businessDetails.length > 0 ? (
                <div className="space-y-2">
                  {businessDetails.map((row, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <row.icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 min-w-0 break-words">{row.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavigate(ROUTES.SETTINGS.BUSINESS)}
                  className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg px-2 py-1.5 cursor-pointer"
                >
                  <span>Set in Business Settings</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </button>
              )}
            </div>
          )}

          <div className="p-2 space-y-1">
            {links.map((link) => (
              <button
                key={link.to}
                type="button"
                onClick={() => handleNavigate(link.to)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer text-gray-600 font-medium"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <link.icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
