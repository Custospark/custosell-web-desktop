import { useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, Settings,
  LogOut, PanelLeftClose, PanelLeft, ChevronDown, ChevronRight,
  Plus, History, RotateCcw, FolderTree, ClipboardList,
  UserCog, Shield, CreditCard, Building2, ListOrdered,
} from 'lucide-react';
import { useLogout } from '../../../shared/api/account/AccountQueries';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useConfirm } from '../Feedback/ConfirmContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  icon: React.ElementType;
  label: string;
  subItems: SubItem[];
}

const allSubRoutes = [
  ROUTES.DASHBOARD,
  ROUTES.SALES.NEW, ROUTES.SALES.HISTORY, ROUTES.SALES.REFUNDS,
  ROUTES.INVENTORY.PRODUCTS, ROUTES.INVENTORY.CATEGORIES, ROUTES.INVENTORY.STOCK,
  ROUTES.CUSTOMERS.INDEX,
  ROUTES.EXPENSES.CATEGORIES, ROUTES.EXPENSES.LIST,
  ROUTES.SETTINGS.BUSINESS, ROUTES.SETTINGS.SUBSCRIPTION, ROUTES.SETTINGS.STAFF, ROUTES.SETTINGS.ROLES,
];

const navGroups: NavGroup[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    subItems: [{ to: ROUTES.DASHBOARD, label: 'Overview', icon: LayoutDashboard }],
  },
  {
    icon: ShoppingCart,
    label: 'Sales',
    subItems: [
      { to: ROUTES.SALES.NEW, label: 'New Sale', icon: Plus },
      { to: ROUTES.SALES.HISTORY, label: 'History', icon: History },
      { to: ROUTES.SALES.REFUNDS, label: 'Refunds', icon: RotateCcw },
    ],
  },
  {
    icon: Package,
    label: 'Inventory',
    subItems: [
      { to: ROUTES.INVENTORY.PRODUCTS, label: 'Products', icon: Package },
      { to: ROUTES.INVENTORY.CATEGORIES, label: 'Categories', icon: FolderTree },
      { to: ROUTES.INVENTORY.STOCK, label: 'Stock Ledger', icon: ClipboardList },
    ],
  },
  {
    icon: Users,
    label: 'Customers',
    subItems: [
      { to: ROUTES.CUSTOMERS.INDEX, label: 'Customer List', icon: Users },
    ],
  },
  {
    icon: Receipt,
    label: 'Expenses',
    subItems: [
      { to: ROUTES.EXPENSES.CATEGORIES, label: 'Record Expense', icon: Receipt },
      { to: ROUTES.EXPENSES.LIST, label: 'Expense List', icon: ListOrdered },
    ],
  },
  {
    icon: Settings,
    label: 'Settings',
    subItems: [
      { to: ROUTES.SETTINGS.BUSINESS, label: 'Business', icon: Building2 },
      { to: ROUTES.SETTINGS.SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
      { to: ROUTES.SETTINGS.STAFF, label: 'Staff', icon: UserCog },
      { to: ROUTES.SETTINGS.ROLES, label: 'Roles', icon: Shield },
    ],
  },
];

function getGroupIndexForPath(pathname: string): number | null {
  for (const route of allSubRoutes) {
    if (route === pathname || pathname.startsWith(route + '/') || pathname.startsWith(route + '?')) {
      for (let i = 0; i < navGroups.length; i++) {
        if (navGroups[i].subItems.some((s) => s.to === route || (route !== ROUTES.DASHBOARD && s.to.startsWith(route)))) {
          return i;
        }
      }
    }
  }
  return null;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const currentGroupIndex = getGroupIndexForPath(location.pathname);
  const [openGroup, setOpenGroup] = useState<number | null>(currentGroupIndex);

  useEffect(() => {
    if (currentGroupIndex !== null && openGroup !== currentGroupIndex) {
      setOpenGroup(currentGroupIndex);
    }
  }, [currentGroupIndex]);

  return <SidebarInner isOpen={isOpen} onClose={onClose} openGroup={openGroup} setOpenGroup={setOpenGroup} />;
}

function SidebarInner({ isOpen, onClose, openGroup, setOpenGroup }: SidebarProps & { openGroup: number | null; setOpenGroup: (i: number | null) => void }) {
  const logoutMutation = useLogout();
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const { confirm } = useConfirm();
  const collapsed = state.sidebarCollapsed;
  const location = useLocation();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Logout',
      message: `${user?.name || 'User'}, are you sure you want to logout?`,
      confirmText: 'Logout',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    onClose();
    logoutMutation.mutate();
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-full bg-[#1e293b] text-white transform transition-all duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[260px]'
      } ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}
    >
      <div className={`border-b border-gray-700 flex items-center ${collapsed ? 'justify-center p-3' : 'p-6'}`}>
        {collapsed ? (
          <h1 className="text-lg font-bold">C</h1>
        ) : (
          <h1 className="text-xl font-bold">Custosell</h1>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navGroups.map((group, groupIndex) => {
          const isOpen = openGroup === groupIndex;
          const Icon = group.icon;
          const isSingle = group.subItems.length === 1;

          if (collapsed) {
            return (
              <div key={group.label} className="space-y-1">
                <div className="flex justify-center py-2.5 text-gray-400" title={group.label}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          }

          if (isSingle) {
            const item = group.subItems[0];
            return (
              <NavLink
                key={group.label}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{group.label}</span>
              </NavLink>
            );
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => setOpenGroup(isOpen ? null : groupIndex)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isOpen ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isOpen && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                  {group.subItems.map((item) => {
                    const isChildActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          isChildActive
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-700 space-y-1">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' })}
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors`}
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  );
}
