import { Link } from 'react-router-dom';
import { Store, CircleUser, ShoppingBag, LogIn, ChevronRight } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';

interface Props {
  onSelect: (type: 'business' | 'personal' | 'shopping') => void;
}

export function AccountTypeSelector({ onSelect }: Props) {
  return (
    <>
      <p className="text-center text-base font-bold text-gray-900 mb-4">
        How will you use {PRODUCT_NAME}?
      </p>

      <div className="space-y-2.5 sm:space-y-4">
        <button
          type="button"
          onClick={() => onSelect('business')}
          className="animate-sparkle-border flex w-full items-center gap-3 rounded-xl border-2 bg-white p-2.5 text-left transition-all hover:shadow-md cursor-pointer group sm:gap-4 sm:p-5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors sm:h-12 sm:w-12">
            <Store className="h-4.5 w-4.5 text-blue-700 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 sm:text-base">For my business</p>
            <p className="mt-0.5 hidden text-xs text-gray-500 leading-relaxed sm:block">
              Point of Sale, E-commerce Storefront, Inventory, Accounting, HR &amp; Payroll, Invoicing, Expenses, CRM, Forecasting &amp; more — all in one system that works with or without the internet.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onSelect('shopping')}
          className="animate-sparkle-border flex w-full items-center gap-3 rounded-xl border-2 bg-white p-2.5 text-left transition-all hover:shadow-md cursor-pointer group sm:gap-4 sm:p-5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors sm:h-12 sm:w-12">
            <ShoppingBag className="h-4.5 w-4.5 text-emerald-700 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 sm:text-base">Online shopping</p>
            <p className="mt-0.5 hidden text-xs text-gray-500 leading-relaxed sm:block">
              Browse products and services from every business on Custosell, add them to your cart, save to your wishlist, place orders, and track everything in your orders — free, with no setup.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onSelect('personal')}
          className="animate-sparkle-border-personal flex w-full items-center gap-3 rounded-xl border-2 bg-white p-2.5 text-left transition-all hover:shadow-md cursor-pointer group sm:gap-4 sm:p-5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors sm:h-12 sm:w-12">
            <CircleUser className="h-4.5 w-4.5 text-indigo-700 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 sm:text-base">For personal use</p>
            <p className="mt-0.5 hidden text-xs text-gray-500 leading-relaxed sm:block">
              Project Management, Productivity, Expense Tracking, Bookkeeping, Document Management &amp; more — stay organized and productive, even offline.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
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
