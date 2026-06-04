import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  heroImage?: string;
  heroDescription?: string;
}

const HERO_IMAGES = {
  login: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
  register: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
};

export function AuthLayout({ title, subtitle, heroImage, heroDescription, children }: PropsWithChildren<AuthLayoutProps>) {
  const image = heroImage || HERO_IMAGES.login;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to={ROUTES.DASHBOARD} className="text-white text-2xl font-bold tracking-tight">
            Custosell
          </Link>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              More Sales. Faster Business Growth.
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed">
              {heroDescription || 'A complete POS system for retail and wholesale businesses.'}
            </p>
            <div className="mt-10 flex gap-5">
              {[
                { value: '10K+', label: 'Businesses' },
                { value: '99%', label: 'Uptime' },
                { value: 'Offline', label: 'First' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-white min-w-[110px] text-center">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <p className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-3">Built for</p>
              <div className="flex flex-wrap gap-x-2 gap-y-2.5">
                {[
                  'Retail', 'Wholesale', 'Restaurant', 'Café', 'Pharmacy',
                  'Salon', 'Grocery', 'Hardware', 'Warehouse', 'Boutique',
                  'Bakery', 'Clinic', 'Bar', 'Auto Shop', 'Fashion',
                  'Electronics', 'Furniture', 'Bookstore', 'Pet Shop', 'E-commerce',
                ].map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-blue-100 backdrop-blur-sm border border-white/10">
                    <svg className="w-3 h-3 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-blue-300 text-sm">
            &copy; {new Date().getFullYear()} Custosell. All rights reserved.
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Custosell</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-center">{title}</h2>
          {subtitle && <p className="text-gray-500 mb-8 text-center">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
