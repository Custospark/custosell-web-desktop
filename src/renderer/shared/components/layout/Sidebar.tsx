import { useState, useEffect, useMemo } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { version } from '../../../../../package.json';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, Settings,
  LogOut, PanelLeftClose, PanelLeft, ChevronDown, ChevronRight,
  Plus, History, RotateCcw, FolderTree, ClipboardList,
  UserCog, Shield, Building2, ListOrdered, Clock, Bell,
  GraduationCap, HelpCircle, MessageSquareHeart, CircleUser,
} from 'lucide-react';
import { useLogoutAction } from '../../../app/contexts/LogoutContext';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useConfirm } from '../Feedback/ConfirmContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectShowOfflineBanner } from '../../../app/store/slices/networkSlice';
import LogoImage from '../../assets/LogoImage';
import { getUserFirstName } from '../../utils/userDisplayName';
import { canAccessModule, NAV_GROUP_MODULE } from '../../utils/moduleAccess';

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

const baseSubRoutes = [
  ROUTES.DASHBOARD,
  ROUTES.SALES.NEW, ROUTES.SALES.HISTORY, ROUTES.SALES.REFUNDS,
  ROUTES.INVENTORY.PRODUCTS, ROUTES.INVENTORY.CATEGORIES, ROUTES.INVENTORY.STOCK,
  ROUTES.CUSTOMERS.INDEX,
  ROUTES.EXPENSES.CATEGORIES, ROUTES.EXPENSES.LIST,
  ROUTES.GUIDE.TUTORIALS, ROUTES.GUIDE.FAQS, ROUTES.GUIDE.FEEDBACK,
  ROUTES.ACCOUNT.NOTIFICATIONS, ROUTES.ACCOUNT.PROFILE,
  ROUTES.SETTINGS.BUSINESS, ROUTES.SETTINGS.SUBSCRIPTION, ROUTES.SETTINGS.STAFF, ROUTES.SETTINGS.ROLES,
];

const platformSubRoutes = [
  ROUTES.PLATFORM.OVERVIEW,
  ROUTES.PLATFORM.BUSINESSES,
  ROUTES.PLATFORM.USERS,
  ROUTES.PLATFORM.ROLES,
  ROUTES.PLATFORM.GUIDE.TUTORIALS,
  ROUTES.PLATFORM.GUIDE.FAQS,
  ROUTES.PLATFORM.GUIDE.FEEDBACK,
];

const platformNavGroup: NavGroup = {
  icon: Shield,
  label: 'Platform',
  subItems: [
    { to: ROUTES.PLATFORM.OVERVIEW, label: 'Overview', icon: LayoutDashboard },
    { to: ROUTES.PLATFORM.BUSINESSES, label: 'Businesses', icon: Building2 },
    { to: ROUTES.PLATFORM.USERS, label: 'All Users', icon: Users },
    { to: ROUTES.PLATFORM.ROLES, label: 'Platform Roles', icon: Shield },
  ],
};

const guideSettingsNavGroup: NavGroup = {
  icon: GraduationCap,
  label: 'Guide Settings',
  subItems: [
    { to: ROUTES.PLATFORM.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
    { to: ROUTES.PLATFORM.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
    { to: ROUTES.PLATFORM.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
  ],
};

const baseNavGroups: NavGroup[] = [
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
      { to: ROUTES.SALES.MY_SHIFT, label: 'My Shift', icon: Clock },
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
      { to: ROUTES.EXPENSES.CATEGORIES, label: 'Expense Categories', icon: Receipt },
      { to: ROUTES.EXPENSES.LIST, label: 'Expense List', icon: ListOrdered },
    ],
  },
  {
    icon: GraduationCap,
    label: 'Custosell Guide',
    subItems: [
      { to: ROUTES.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
      { to: ROUTES.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
      { to: ROUTES.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
    ],
  },
  {
    icon: CircleUser,
    label: 'Account',
    subItems: [
      { to: ROUTES.ACCOUNT.NOTIFICATIONS, label: 'Notifications', icon: Bell },
      { to: ROUTES.ACCOUNT.PROFILE, label: 'My Profile', icon: UserCog },
    ],
  },
  {
    icon: Settings,
    label: 'Settings',
    subItems: [
      { to: ROUTES.SETTINGS.BUSINESS, label: 'Business', icon: Building2 },
      // { to: ROUTES.SETTINGS.SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
      { to: ROUTES.SETTINGS.STAFF, label: 'Staff', icon: UserCog },
      { to: ROUTES.SETTINGS.ROLES, label: 'Roles', icon: Shield },
    ],
  },
];

function getGroupIndexForPath(pathname: string, navGroups: NavGroup[], allSubRoutes: string[]): number | null {
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
  const user = useAppSelector((s) => s.auth.user);
  const navGroups = useMemo(() => {
    const businessGroups = baseNavGroups.filter((group) => {
      const moduleSlug = NAV_GROUP_MODULE[group.label];
      if (!moduleSlug) return true;
      return canAccessModule(user, moduleSlug);
    });

    if (user?.is_platform_admin) {
      return [...businessGroups, platformNavGroup, guideSettingsNavGroup];
    }

    return businessGroups;
  }, [user]);
  const allSubRoutes = useMemo(
    () => (user?.is_platform_admin ? [...baseSubRoutes, ...platformSubRoutes] : baseSubRoutes),
    [user?.is_platform_admin],
  );
  const currentGroupIndex = getGroupIndexForPath(location.pathname, navGroups, allSubRoutes);
  const [openGroup, setOpenGroup] = useState<number | null>(currentGroupIndex);

  useEffect(() => {
    if (currentGroupIndex !== null && openGroup !== currentGroupIndex) {
      setOpenGroup(currentGroupIndex);
    }
  }, [currentGroupIndex]);

  return <SidebarInner isOpen={isOpen} onClose={onClose} openGroup={openGroup} setOpenGroup={setOpenGroup} navGroups={navGroups} />;
}

function SidebarInner({ isOpen, onClose, openGroup, setOpenGroup, navGroups }: SidebarProps & { openGroup: number | null; setOpenGroup: (i: number | null) => void; navGroups: NavGroup[] }) {
  const { logout, isLoggingOut } = useLogoutAction();
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const { confirm } = useConfirm();
  const collapsed = state.sidebarCollapsed;
  const location = useLocation();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Logout',
      message: `${getUserFirstName(user?.name)}, are you sure you want to logout?`,
      confirmText: 'Logout',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    onClose();
    void logout();
  };

  const showOfflineBanner = useAppSelector(selectShowOfflineBanner);

  return (
    <aside
      className={`fixed left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-200 ${
        showOfflineBanner ? 'top-10 h-[calc(100vh-2.5rem)]' : 'top-0 h-full'
      } ${collapsed ? 'w-[64px]' : 'w-[247px]'} ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 flex flex-col`}
    >
      <div className={`border-b border-gray-200 flex items-center gap-2.5 ${collapsed ? 'justify-center py-4' : 'px-6 py-4'}`}>
        <LogoImage size="sm" />
        {!collapsed && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-blue-600">Custosell</span>
            <span className="text-[11px] font-semibold text-black ml-1">Version {version}</span>
          </div>
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
                    isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  isOpen ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isOpen && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
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
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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

      <div className="p-2 border-t border-gray-200 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' })}
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  );
}
