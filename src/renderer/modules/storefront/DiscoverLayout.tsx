import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, ShoppingBag, LayoutList } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { cn } from '../../shared/utils/cn';

const NAV_ITEMS = [
  {
    to: ROUTES.DISCOVER,
    label: 'Browse',
    icon: Compass,
    color: 'teal',
    desc: 'Browse shops & products',
  },
  {
    to: ROUTES.DISCOVER + '/my-orders',
    label: 'My Orders',
    icon: ShoppingBag,
    color: 'blue',
    desc: 'Track your orders',
    authRequired: true,
  },
  {
    to: ROUTES.DISCOVER,
    label: 'Cart',
    icon: LayoutList,
    color: 'emerald',
    desc: 'Your order cart',
  },
];

const COLOR_STYLES: Record<string, { border: string; from: string; to: string; text: string; icon: string; hoverBorder: string; hoverFrom: string; hoverTo: string }> = {
  teal: {
    border: 'border-teal-300/90',
    from: 'from-teal-50',
    to: 'to-cyan-50',
    text: 'text-teal-900',
    icon: 'text-teal-600',
    hoverBorder: 'hover:border-teal-400',
    hoverFrom: 'hover:from-teal-100',
    hoverTo: 'hover:to-cyan-100',
  },
  blue: {
    border: 'border-blue-300/90',
    from: 'from-blue-50',
    to: 'to-sky-50',
    text: 'text-blue-900',
    icon: 'text-blue-600',
    hoverBorder: 'hover:border-blue-400',
    hoverFrom: 'hover:from-blue-100',
    hoverTo: 'hover:to-sky-100',
  },
  emerald: {
    border: 'border-emerald-300/90',
    from: 'from-emerald-50',
    to: 'to-teal-50',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-400',
    hoverFrom: 'hover:from-emerald-100',
    hoverTo: 'hover:to-teal-100',
  },
};

export default function DiscoverLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white flex flex-col">
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Storefronts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Browse public shops or track your orders.</p>
        </div>
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto overscroll-x-contain px-2 pb-2.5 sm:gap-3 sm:px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const colors = COLOR_STYLES[item.color];
            const isActive = item.to === ROUTES.DISCOVER
              ? path === ROUTES.DISCOVER
              : path.startsWith(item.to);

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                title={item.desc}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold shadow-sm transition-all sm:gap-2 sm:px-4 sm:py-2.5',
                  isActive
                    ? `${colors.border} ${colors.from} ${colors.to} ${colors.text} shadow-md`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? colors.icon : 'text-slate-400')} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
