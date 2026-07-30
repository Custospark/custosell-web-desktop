import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Home } from 'lucide-react';
import LogoImage from '../../shared/assets/LogoImage';
import {
  PRODUCT_NAME,
  SUPPORTING_LINE,
  TAGLINE,
  TAGLINE_SHORT,
} from '../../shared/brand/custosellBrand';
import { AUTH_HERO_IMAGES } from './authHeroImages';

const AUTH_HERO_DESCRIPTION = SUPPORTING_LINE;

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  heroImage?: string;
  heroDescription?: string;
}

const AUTH_HIGHLIGHTS = [
  { value: 'Offline', label: 'First' },
  { value: '99%', label: 'Uptime' },
  { value: '30-day', label: 'Trial' },
] as const;

export function AuthLayout({ title, subtitle, subtitleClassName, heroImage, heroDescription, children }: PropsWithChildren<AuthLayoutProps>) {
  const image = heroImage || AUTH_HERO_IMAGES.login;
  const description = heroDescription || AUTH_HERO_DESCRIPTION;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-blue-900/85 to-slate-950/80" />
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
          <Link to={ROUTES.HOME} className="inline-flex w-fit group">
            <span className="text-white text-xl font-bold tracking-tight group-hover:text-blue-100 transition-colors">
              {PRODUCT_NAME}
            </span>
          </Link>

          <div className="max-w-md space-y-5">
            <div>
              <p className="text-white text-xs font-semibold uppercase tracking-[0.2em] mb-3">
                {TAGLINE_SHORT}
              </p>
              <h1 className="text-3xl xl:text-4xl font-bold text-white mb-3 leading-tight">
                {TAGLINE}
              </h1>
              <p className="text-blue-100/90 text-base leading-relaxed">{description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {AUTH_HIGHLIGHTS.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white min-w-[100px] text-center border border-white/10"
                >
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-blue-200/90 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <p className="text-blue-200/80 text-sm">
              No credit card required · 30-day trial · Works offline
            </p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-white/70 text-sm">
              {PRODUCT_NAME} is a product of{' '}
              <a
                href="https://www.custospark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white underline underline-offset-2 transition-colors"
              >
                Custospark Company Ltd
              </a>
            </p>
            <div className="text-white/55 text-xs">
              &copy; {new Date().getFullYear()} Custospark. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
            <LogoImage size="md" />
            <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
          </Link>
          <div className="ml-auto">
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
              aria-label="Home"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-8 sm:px-8 sm:py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden relative h-44 sm:h-48 mb-8 overflow-hidden rounded-2xl shadow-md ring-1 ring-gray-200/80">
              <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-900/55 to-blue-900/25" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-white text-[11px] font-semibold uppercase tracking-[0.18em] mb-1.5">
                  {TAGLINE_SHORT}
                </p>
                <p className="text-white text-lg font-bold leading-snug">{TAGLINE}</p>
                <p className="text-blue-100/80 text-xs mt-2 line-clamp-2">{description}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 lg:border-0 lg:shadow-none lg:bg-transparent lg:p-0">
              <div className="text-center mb-7">
                <h2 className="text-2xl sm:text-[1.65rem] font-bold text-gray-900 mb-1.5">{title}</h2>
                {subtitle && <p className={`text-sm sm:text-base leading-relaxed ${subtitleClassName ?? 'text-gray-500'}`}>{subtitle}</p>}
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
