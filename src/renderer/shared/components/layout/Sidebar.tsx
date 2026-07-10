import { useState, useEffect, useMemo } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { version } from '../../../../../package.json';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, Settings,
  ChevronDown, ChevronRight,
  Plus, History, RotateCcw, FolderTree, ClipboardList,
  UserCog, Shield, Building2, ListOrdered, Clock, Bell, Scale,
  GraduationCap, HelpCircle, MessageSquareHeart, CircleUser, Headset, BellRing,
  Mail, Phone, BookOpen, BookType, FileText, BarChart3, Percent,
  Kanban, Briefcase, TrendingUp, SlidersHorizontal, FileSpreadsheet, FolderKanban, LayoutTemplate, LayoutGrid, Files,
  IdCard, CalendarDays, Wallet, ClipboardCheck, Building,
} from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import LogoImage from '../../assets/LogoImage';
import { CUSTOSELL_SUPPORT } from '../../../modules/guide/guideSupportConfig';
import { canAccessModule, hasEstimatesBoardsAccess, isBusinessOwner, isLimitedEstimatesUser, NAV_GROUP_MODULE } from '../../utils/moduleAccess';
import { SHELL_HEADER_HEIGHT_CLASS } from './layoutConstants';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubItem {
  to: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

interface NavGroup {
  icon: React.ElementType;
  label: string;
  subItems: SubItem[];
}

function isSidebarSubItemActive(pathname: string, itemTo: string): boolean {
  if (pathname === itemTo) return true;
  if (itemTo === ROUTES.PIPELINE.BOARDS) {
    return /^\/pipeline\/boards\/\d+/.test(pathname);
  }
  if (itemTo === ROUTES.ESTIMATES.BOARDS) {
    return /^\/estimates\/boards\/\d+/.test(pathname) || pathname === ROUTES.ESTIMATES.BOARDS;
  }
  if (itemTo === ROUTES.ESTIMATES.PROJECTS) {
    return /^\/estimates\/projects\/\d+/.test(pathname);
  }
  if (itemTo === ROUTES.ESTIMATES.INDEX) {
    return /^\/estimates\/\d+/.test(pathname);
  }
  return pathname.startsWith(`${itemTo}/`);
}

const baseSubRoutes = [
  ROUTES.DASHBOARD,
  ROUTES.SALES.NEW, ROUTES.SALES.HISTORY, ROUTES.SALES.REFUNDS,
  ROUTES.INVENTORY.PRODUCTS, ROUTES.INVENTORY.CATEGORIES, ROUTES.INVENTORY.STOCK,
  ROUTES.CUSTOMERS.INDEX,
  ROUTES.PIPELINE.BOARDS, ROUTES.PIPELINE.MY_WORK, ROUTES.PIPELINE.LEADS,
  ROUTES.PIPELINE.INSIGHTS, ROUTES.PIPELINE.SETTINGS,
  ROUTES.ESTIMATES.INDEX, ROUTES.ESTIMATES.PROJECTS, ROUTES.ESTIMATES.BOARDS,
  ROUTES.ESTIMATES.INSIGHTS, ROUTES.ESTIMATES.TEMPLATES,
  ROUTES.INVOICES.INDEX,
  ROUTES.EXPENSES.CATEGORIES, ROUTES.EXPENSES.LIST,
  ROUTES.DOCUMENTS.INDEX,
  ROUTES.ACCOUNTING.RATIOS, ROUTES.ACCOUNTING.STATEMENTS,
  ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS, ROUTES.ACCOUNTING.JOURNAL_ENTRIES,
  ROUTES.GUIDE.TUTORIALS, ROUTES.GUIDE.FAQS, ROUTES.GUIDE.FEEDBACK, ROUTES.GUIDE.CONTACT,
  ROUTES.ACCOUNT.NOTIFICATIONS, ROUTES.ACCOUNT.PROFILE,
  ROUTES.SETTINGS.BUSINESS, ROUTES.SETTINGS.TAX, ROUTES.SETTINGS.SUBSCRIPTION, ROUTES.SETTINGS.STAFF, ROUTES.SETTINGS.ROLES, ROUTES.SETTINGS.MODULES,
];

const platformSubRoutes = [
  ROUTES.PLATFORM.OVERVIEW,
  ROUTES.PLATFORM.BUSINESSES,
  ROUTES.PLATFORM.USERS,
  ROUTES.PLATFORM.ROLES,
  ROUTES.PLATFORM.SENT_MESSAGES,
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
    { to: ROUTES.PLATFORM.SENT_MESSAGES, label: 'Sent messages', icon: BellRing },
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
      { to: ROUTES.INVOICES.INDEX, label: 'Invoices', icon: FileText },
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
    icon: Kanban,
    label: 'Pipeline',
    subItems: [
      { to: ROUTES.PIPELINE.BOARDS, label: 'Boards', icon: Kanban },
      { to: ROUTES.PIPELINE.MY_WORK, label: 'My Work', icon: Briefcase },
      { to: ROUTES.PIPELINE.LEADS, label: 'All Leads', icon: Users },
      { to: ROUTES.PIPELINE.INSIGHTS, label: 'Insights', icon: TrendingUp },
      { to: ROUTES.PIPELINE.SETTINGS, label: 'Settings', icon: SlidersHorizontal },
    ],
  },
  {
    icon: FileSpreadsheet,
    label: 'Projects & Estimates',
    subItems: [
      { to: ROUTES.ESTIMATES.INDEX, label: 'All estimates', icon: FileSpreadsheet },
      { to: ROUTES.ESTIMATES.PROJECTS, label: 'Projects', icon: FolderKanban },
      { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban },
      { to: ROUTES.ESTIMATES.INSIGHTS, label: 'Insights', icon: TrendingUp },
      { to: ROUTES.ESTIMATES.TEMPLATES, label: 'Templates', icon: LayoutTemplate },
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
    icon: Files,
    label: 'Documents',
    subItems: [
      { to: ROUTES.DOCUMENTS.INDEX, label: 'Business files', icon: Files },
    ],
  },
  {
    icon: IdCard,
    label: 'HR & Payroll',
    subItems: [
      { to: ROUTES.HR.PEOPLE, label: 'People', icon: Users },
      { to: ROUTES.HR.DEPARTMENTS, label: 'Departments', icon: Building },
      { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
      { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
      { to: ROUTES.HR.PAYROLL, label: 'Payroll', icon: Wallet },
      { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
      { to: ROUTES.HR.REPORTS, label: 'Reports', icon: BarChart3 },
      { to: ROUTES.HR.SETTINGS, label: 'HR settings', icon: SlidersHorizontal },
    ],
  },
  {
    icon: BookOpen,
    label: 'Accounting',
    subItems: [
      { to: ROUTES.ACCOUNTING.RATIOS, label: 'Financial Ratios', icon: Percent },
      { to: ROUTES.ACCOUNTING.STATEMENTS, label: 'Financial Statements', icon: BarChart3 },
      { to: ROUTES.ACCOUNTING.CHART_OF_ACCOUNTS, label: 'Chart of Accounts', icon: BookType },
      { to: ROUTES.ACCOUNTING.JOURNAL_ENTRIES, label: 'Journal Entries', icon: FileText },
    ],
  },
  {
    icon: GraduationCap,
    label: 'Custosell Guide',
    subItems: [
      { to: ROUTES.GUIDE.TUTORIALS, label: 'Tutorials', icon: GraduationCap },
      { to: ROUTES.GUIDE.FAQS, label: 'FAQs', icon: HelpCircle },
      { to: ROUTES.GUIDE.FEEDBACK, label: 'Feedback', icon: MessageSquareHeart },
      { to: ROUTES.GUIDE.CONTACT, label: 'Contact & Help', icon: Headset },
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
      { to: ROUTES.SETTINGS.TAX, label: 'Tax & VAT', icon: Scale },
      // { to: ROUTES.SETTINGS.SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
      { to: ROUTES.SETTINGS.STAFF, label: 'Staff', icon: UserCog },
      { to: ROUTES.SETTINGS.ROLES, label: 'Roles', icon: Shield },
      { to: ROUTES.SETTINGS.MODULES, label: 'Module access', icon: LayoutGrid, ownerOnly: true },
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
      if (group.label === 'Projects & Estimates') {
        return hasEstimatesBoardsAccess(user);
      }
      return canAccessModule(user, moduleSlug);
    }).map((group) => {
      if (group.label === 'Projects & Estimates' && isLimitedEstimatesUser(user)) {
        return {
          ...group,
          subItems: [
            { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban },
          ],
        };
      }
      if (group.label === 'Settings') {
        return {
          ...group,
          subItems: group.subItems.filter((item) => !item.ownerOnly || isBusinessOwner(user)),
        };
      }
      return group;
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenGroup(currentGroupIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupIndex]);

  return <SidebarInner isOpen={isOpen} onClose={onClose} openGroup={openGroup} setOpenGroup={setOpenGroup} navGroups={navGroups} />;
}

function SidebarInner({ isOpen, onClose, openGroup, setOpenGroup, navGroups }: SidebarProps & { openGroup: number | null; setOpenGroup: (i: number | null) => void; navGroups: NavGroup[] }) {
  const { state } = useAppContext();
  const collapsed = state.sidebarCollapsed;
  const location = useLocation();

  return (
    <aside
      className={cn(
        'absolute left-0 top-0 bottom-0 z-30 flex h-full flex-col',
        'border-r border-gray-200 bg-white transition-all duration-200 transform',
        collapsed ? 'w-[64px]' : 'w-[247px]',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}
    >
      <div
        className={cn(
          'shrink-0 border-b border-gray-200 flex items-center gap-2.5',
          SHELL_HEADER_HEIGHT_CLASS,
          collapsed ? 'justify-center px-2' : 'px-6',
        )}
      >
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

          const hasActiveChild = group.subItems.some((item) =>
            isSidebarSubItemActive(location.pathname, item.to),
          );

          return (
            <div key={group.label}>
              <button
                onClick={() => setOpenGroup(isOpen ? null : groupIndex)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isOpen || hasActiveChild
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isOpen && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                  {group.subItems.map((item) => {
                    const isChildActive = isSidebarSubItemActive(location.pathname, item.to);
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

      <div className="shrink-0 p-4 border-t border-gray-200/50">
        {!collapsed && (
          <div className="p-3 rounded-xl border bg-linear-to-br from-gray-50 to-gray-100/50 border-gray-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-cyan-100">
                  <Headset className="w-4 h-4 text-cyan-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Quick Support</p>

                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 mt-0.5">
                    <a
                      href={`mailto:${CUSTOSELL_SUPPORT.email}`}
                      className="text-xs truncate hover:underline inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                    >
                      {CUSTOSELL_SUPPORT.email}
                    </a>

                    {CUSTOSELL_SUPPORT.phones.map((phone) => (
                      <a
                        key={phone.tel}
                        href={`tel:${phone.tel}`}
                        className="text-xs truncate hover:underline inline-flex items-center gap-1 text-gray-600 hover:text-gray-700"
                      >
                        {phone.display}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2">
            <a
              href={`mailto:${CUSTOSELL_SUPPORT.email}`}
              className="text-gray-400 hover:text-cyan-600 transition-colors"
              title={`Email: ${CUSTOSELL_SUPPORT.email}`}
            >
              <Mail className="w-4 h-4" />
            </a>
            <a
              href={`tel:${CUSTOSELL_SUPPORT.phones[0].tel}`}
              className="text-gray-400 hover:text-cyan-600 transition-colors"
              title={`Call: ${CUSTOSELL_SUPPORT.phones[0].display}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
