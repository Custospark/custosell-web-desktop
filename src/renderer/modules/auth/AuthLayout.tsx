import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Home } from 'lucide-react';
import LogoImage from '../../shared/assets/LogoImage';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  heroImage?: string;
  heroDescription?: string;
}

export const AUTH_HERO_IMAGES = {
  login: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
  register: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  /** Laptop workspace — enter email for reset link */
  forgotPassword: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80',
  /** Person at laptop — check your inbox for the reset link */
  forgotPasswordSent: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&q=80',
  /** Lock on keyboard — choose a new password */
  resetPassword: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=1200&q=80',
  /** Secure workspace — password updated successfully */
  resetPasswordSuccess: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
} as const;

export function AuthLayout({ title, subtitle, heroImage, heroDescription, children }: PropsWithChildren<AuthLayoutProps>) {
  const image = heroImage || AUTH_HERO_IMAGES.login;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <span className="text-white text-2xl font-bold tracking-tight">Custosell</span>
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              Sell More. Track All. Grow Fast.
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              {heroDescription || 'A complete POS system for retail and wholesale businesses.'}
            </p>
            <div className="mt-6 flex gap-4">
              {[
                { value: 'Offline', label: 'First' },
                { value: '99%', label: 'Uptime' },
                { value: 'Free', label: 'Trial' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-white min-w-[90px] text-center">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-blue-300/70 text-sm">
              Custosell is a product of{' '}
              <a href="https://www.custospark.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-white underline transition-colors">Custospark Company Ltd</a>
            </p>
            <div className="text-blue-300 text-xs">
              &copy; {new Date().getFullYear()} Custospark. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 bg-white">
          <LogoImage size="md" />
          <span className="text-xl font-bold text-blue-600">Custosell</span>
          <div className="ml-auto">
            <Link to={ROUTES.HOME} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-8 sm:p-12 bg-gray-50">
          <div className="w-full max-w-md">
            <div className="lg:hidden relative h-40 sm:h-44 -mx-2 sm:-mx-4 mb-7 overflow-hidden rounded-2xl shadow-sm">
              <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/60 to-blue-900/40" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-center">{title}</h2>
            {subtitle && <p className="text-gray-500 mb-8 text-center">{subtitle}</p>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
