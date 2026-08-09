import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, CircleUser, ShoppingBag, LogIn, ChevronRight, Info, X } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { cn } from '../../shared/utils/cn';

interface Props {
  onSelect: (type: 'business' | 'personal' | 'shopping') => void;
}

const OPTIONS: {
  id: 'business' | 'shopping' | 'personal';
  title: string;
  description: string;
  icon: typeof Store;
  iconClass: string;
  ringClass: string;
  chevronClass: string;
}[] = [
  {
    id: 'business',
    title: 'For my business',
    description: 'Point of Sale, E-commerce Storefront, Inventory, Accounting, HR & Payroll, Invoicing, Expenses, CRM, Forecasting & more — all in one system that works with or without the internet.',
    icon: Store,
    iconClass: 'bg-blue-100 group-hover:bg-blue-200',
    iconColor: 'text-blue-700',
    ringClass: 'animate-sparkle-border',
    chevronClass: 'text-blue-400 group-hover:text-blue-600',
  },
  {
    id: 'shopping',
    title: 'Online shopping',
    description: 'Browse products and services from every business on Custosell, add them to your cart, save to your wishlist, place orders, and track everything in your orders — free, with no setup.',
    icon: ShoppingBag,
    iconClass: 'bg-emerald-100 group-hover:bg-emerald-200',
    iconColor: 'text-emerald-700',
    ringClass: 'animate-sparkle-border',
    chevronClass: 'text-emerald-400 group-hover:text-emerald-600',
  },
  {
    id: 'personal',
    title: 'For personal use',
    description: 'Project Management, Productivity, Expense Tracking, Bookkeeping, Document Management & more — stay organized and productive, even offline, and earn rewards with referral tracking.',
    icon: CircleUser,
    iconClass: 'bg-indigo-100 group-hover:bg-indigo-200',
    iconColor: 'text-indigo-700',
    ringClass: 'animate-sparkle-border-personal',
    chevronClass: 'text-indigo-400 group-hover:text-indigo-600',
  },
];

export function AccountTypeSelector({ onSelect }: Props) {
  const [expanded, setExpanded] = useState<'business' | 'shopping' | 'personal' | null>(null);

  return (
    <>
      <p className="text-center text-base font-bold text-gray-900 mb-4">
        How will you use {PRODUCT_NAME}?
      </p>

      <div className="space-y-2.5 sm:space-y-4">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isOpen = expanded === opt.id;
          return (
            <div
              key={opt.id}
              className={cn('rounded-xl border-2 bg-white', opt.ringClass)}
            >
              <div className="flex items-center gap-3 p-2.5 sm:gap-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer group sm:gap-4"
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-12 sm:w-12', opt.iconClass)}>
                    <Icon className={cn('h-4.5 w-4.5 sm:h-6 sm:w-6', opt.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 sm:text-base">{opt.title}</p>
                    <p className="mt-0.5 hidden text-xs text-gray-500 leading-relaxed sm:block">{opt.description}</p>
                  </div>
                  <ChevronRight className={cn('hidden h-5 w-5 shrink-0 group-hover:translate-x-0.5 transition-all sm:block', opt.chevronClass)} />
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : opt.id)}
                  className="flex shrink-0 items-center gap-1 rounded-full py-1.5 pl-2 pr-2.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer sm:hidden"
                  aria-label={isOpen ? `Hide description for ${opt.title}` : `Learn more about ${opt.title}`}
                  aria-expanded={isOpen}
                >
                  {isOpen ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <span className="text-xs font-medium">{isOpen ? 'Close' : 'Learn more'}</span>
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-3 py-3 sm:hidden">
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 pt-3 mt-4">
        <p className="mb-2 text-center text-sm font-medium text-gray-700">Already have an account?</p>
        <Link
          to={ROUTES.LOGIN}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Sign In
        </Link>
      </div>
    </>
  );
}
