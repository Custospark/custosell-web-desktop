import { NavLink } from 'react-router-dom';
import { ClipboardList, Package, Plus } from 'lucide-react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useOpenOrders } from '../../../modules/sales/api/orders/useOrderQueries';
import { canAccessModule } from '../../utils/moduleAccess';
import { cn } from '../../utils/cn';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-all shrink-0',
    'h-11 w-11 sm:h-8 sm:w-8 xl:h-9 xl:w-auto xl:min-w-[2rem] xl:px-2.5',
    'text-xs xl:text-sm',
    isActive
      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white'
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  );

/**
 * Header quick access — Open Orders (with a live count that polls every 30s)
 * and Products, so businesses can jump straight to what needs attention.
 * Gated by module access: orders → sales, products → inventory.
 */
export function HeaderQuickNav() {
  const user = useAppSelector((s) => s.auth.user);
  const canSales = canAccessModule(user, 'sales');
  const canInventory = canAccessModule(user, 'inventory');
  const { data: openOrders } = useOpenOrders(canSales, { poll: canSales });
  const openCount = openOrders?.length ?? 0;

  if (!canSales && !canInventory) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" data-tour="navbar-quick">
      {canSales && (
        <NavLink
          to={ROUTES.SALES.NEW}
          title="New Sale"
          aria-label="New Sale"
          className={navLinkClass}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden xl:inline truncate">New Sale</span>
        </NavLink>
      )}
      {canSales && (
        <NavLink
          to={ROUTES.SALES.ORDERS}
          title={openCount > 0 ? `${openCount} open order${openCount === 1 ? '' : 's'} to attend to` : 'Open orders'}
          aria-label={`Open orders${openCount > 0 ? `, ${openCount} open` : ''}`}
          className={navLinkClass}
        >
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden xl:inline truncate">Open Orders</span>
          {openCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] sm:min-w-4 sm:h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] sm:text-[9px] font-bold leading-none animate-pulse">
              {openCount > 99 ? '99+' : openCount}
            </span>
          )}
        </NavLink>
      )}
      {canInventory && (
        <NavLink
          to={ROUTES.INVENTORY.PRODUCTS}
          title="Products"
          aria-label="Products"
          className={navLinkClass}
        >
          <Package className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden xl:inline truncate">Products</span>
        </NavLink>
      )}
    </div>
  );
}
