import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import LogoImage from '../../../shared/assets/LogoImage';
import { BRAND_LOCKUP, PRODUCT_NAME } from '../../../shared/brand/custosellBrand';

export default function BookingLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <header className="border-b border-gray-100 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <LogoImage size="sm" />
            <span className="text-sm font-bold text-indigo-600">{PRODUCT_NAME}</span>
          </button>
          <span className="text-xs text-gray-400">Schedule a meeting</span>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 bg-white/50 py-8">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-4 flex w-16 items-center justify-center opacity-60">
            <LogoImage size="sm" />
          </div>
          <p className="mb-3 text-xs leading-relaxed text-gray-500">
            <span className="font-semibold text-gray-700">{PRODUCT_NAME}</span> is a unified
            business operating system featuring Point of Sale, Inventory &amp; Supply Chain,
            Accounting, HR &amp; Payroll, Sales Pipeline (CRM), Project Management, E-commerce
            Storefront, Invoicing, Expenses, Financial Forecasting, and Document Management
            &mdash; all working together with or without the internet.
          </p>
          <p className="text-xs text-gray-400">
            {BRAND_LOCKUP} &mdash; a product of{' '}
            <a
              href="https://www.custospark.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-500 hover:text-indigo-600 hover:underline"
            >
              Custospark Company Ltd
            </a>
            .
          </p>
          <p className="mt-3">
            <a
              href="https://www.custospark.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              Explore Custospark
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}