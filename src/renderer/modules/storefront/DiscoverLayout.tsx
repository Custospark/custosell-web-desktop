import { NavLink, Outlet } from 'react-router-dom';
import { Compass, ShoppingBag } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { cn } from '../../shared/utils/cn';

const TABS = [
  { to: ROUTES.DISCOVER, label: 'Discover', icon: Compass },
  { to: ROUTES.DISCOVER + '/my-orders', label: 'My Orders', icon: ShoppingBag },
];

export default function DiscoverLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Storefronts</h1>
        <p className="text-sm text-slate-500 mb-5">Browse public shops or track orders you have placed.</p>

        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === ROUTES.DISCOVER}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                    isActive
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
