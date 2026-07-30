import { Link } from 'react-router-dom';
import { Store, CircleUser, LogIn, ChevronRight } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';

interface Props {
  onSelect: (type: 'business' | 'personal') => void;
}

export function AccountTypeSelector({ onSelect }: Props) {
  return (
    <>
      <p className="text-center text-base font-bold text-gray-900 mb-5">
        How will you use {PRODUCT_NAME}?
      </p>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onSelect('business')}
          className="animate-sparkle-border flex w-full items-center gap-4 rounded-xl border-2 bg-white p-5 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
            <Store className="h-6 w-6 text-blue-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900">For my business</p>
            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
              Point of Sale, E-commerce Storefront, Inventory, Accounting, HR &amp; Payroll, Invoicing, Expenses, CRM, Forecasting &amp; more — all in one system that works with or without the internet.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onSelect('personal')}
          className="animate-sparkle-border-personal flex w-full items-center gap-4 rounded-xl border-2 bg-white p-5 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
            <CircleUser className="h-6 w-6 text-indigo-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900">For personal use</p>
            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
              Project Management, Productivity, Expense Tracking, Bookkeeping, Document Management &amp; more — stay organized and productive, even offline.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <p className="mb-3 text-center text-sm font-medium text-gray-700">Already have an account?</p>
        <Link
          to={ROUTES.LOGIN}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Sign In
        </Link>
      </div>
    </>
  );
}
