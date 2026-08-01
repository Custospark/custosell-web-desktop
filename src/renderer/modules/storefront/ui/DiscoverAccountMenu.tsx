import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleUser, GraduationCap, Heart, LayoutDashboard, LogOut, Package, Gift, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useLogoutAction } from '../../../app/contexts/useLogoutActions';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { getDefaultRoute, isStorefrontBuyer } from '../../../shared/utils/moduleAccess';
import { cn } from '../../../shared/utils/cn';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { ReferralsModal } from '../../../modules/referral/components/ReferralsModal';
import { ProfileModal } from '../../../modules/settings/ui/ProfileModal';

interface DiscoverAccountMenuProps {
  user: AuthUser;
  className?: string;
  /** Compact trigger for mobile header */
  compact?: boolean;
}

function initials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

/**
 * Discover header account chip — name, email, dashboard/orders, logout.
 */
export function DiscoverAccountMenu({ user, className, compact = false }: DiscoverAccountMenuProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { logout, isLoggingOut } = useLogoutAction();
  const [open, setOpen] = useState(false);
  const [referralsOpen, setReferralsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log out?',
      message: `${user.name?.split(/\s+/)[0] || 'You'}, you will stay on Discover as a guest until you sign in again.`,
      confirmText: 'Log out',
      cancelText: 'Stay signed in',
      variant: 'warning',
    });
    if (!confirmed) return;
    setOpen(false);
    void logout();
  };

  const goHome = () => {
    setOpen(false);
    navigate(getDefaultRoute(user));
  };

  const goOrders = () => {
    setOpen(false);
    navigate(ROUTES.DISCOVER_MY_ORDERS);
  };

  const goWishlist = () => {
    setOpen(false);
    navigate(ROUTES.DISCOVER_WISHLIST);
  };

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex max-w-[11rem] items-center gap-1.5 border font-semibold shadow-sm transition sm:max-w-[14rem]',
          compact
            ? 'rounded-md border-slate-300/90 bg-white px-1.5 py-1 text-[11px]'
            : 'rounded-xl border-2 border-slate-300/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-2 py-1.5 text-xs hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-800">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-slate-900">{user.name?.split(/\s+/)[0] || 'Account'}</span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-500 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-[10050] mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={goWishlist}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-rose-50"
            >
              <Heart className="h-4 w-4 text-rose-600" />
              Wishlist
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={goOrders}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-indigo-50"
            >
              <Package className="h-4 w-4 text-indigo-700" />
              My orders
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); navigate(ROUTES.ACCOUNT.NOTIFICATIONS); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <CircleUser className="h-4 w-4 text-slate-600" />
              Account
            </button>
            {isStorefrontBuyer(user) ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); setReferralsOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-indigo-50"
                >
                  <Gift className="h-4 w-4 text-indigo-600" />
                  Referrals
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); setProfileOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <UserRound className="h-4 w-4 text-slate-600" />
                  Profile
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); navigate(ROUTES.GUIDE.TUTORIALS); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <GraduationCap className="h-4 w-4 text-slate-600" />
                Custosell Guide
              </button>
            )}
            <hr className="my-1 border-slate-100" />
            {!isStorefrontBuyer(user) ? (
              <button
                type="button"
                role="menuitem"
                onClick={goHome}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <LayoutDashboard className="h-4 w-4 text-slate-600" />
                {user.business_id ? 'App home' : 'Account home'}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      ) : null}

      <ReferralsModal isOpen={referralsOpen} onClose={() => setReferralsOpen(false)} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
