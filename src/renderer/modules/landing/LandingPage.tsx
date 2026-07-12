import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import {
  UserPlus, LogIn, Sparkles, Shield,
  Store, Pill, Apple, Wrench, Building2, Shirt, Heart,
  Globe, UtensilsCrossed,
  Building, WifiOff, BarChart3, TrendingUp, Users, Receipt, Layers,
} from 'lucide-react';
import {
  PRODUCT_NAME,
  TAGLINE,
  TAGLINE_SHORT,
} from '../../shared/brand/custosellBrand';
import { LANDING_MODULES } from './landingModules';
import TestimonialCarousel from './ui/TestimonialCarousel';
import dashboardImg from '../../../../assets/dashboard.png';

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Works Offline' },
  { value: '10+', label: 'Integrated Tools' },
  { value: 'Free', label: 'To Get Started' },
];

const businessTypes = [
  { name: 'Retail', icon: Store, color: 'text-blue-600' },
  { name: 'Restaurant', icon: UtensilsCrossed, color: 'text-red-500' },
  { name: 'Pharmacy', icon: Pill, color: 'text-purple-600' },
  { name: 'Grocery', icon: Apple, color: 'text-green-600' },
  { name: 'Warehouse', icon: Building2, color: 'text-gray-600' },
  { name: 'Boutique', icon: Shirt, color: 'text-rose-500' },
  { name: 'Clinic', icon: Heart, color: 'text-red-500' },
  { name: 'Hardware', icon: Wrench, color: 'text-amber-600' },
  { name: 'Hotel', icon: Building, color: 'text-indigo-600' },
  { name: 'E-commerce', icon: Globe, color: 'text-blue-600' },
];

const BENEFITS = [
  {
    icon: WifiOff,
    title: 'Works without internet',
    description: 'Sell, record payments, and manage inventory even when the network is down. Syncs automatically when you reconnect.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Layers,
    title: 'Everything in one place',
    description: 'POS, Inventory &amp; Supply Chain, Accounting, HR &amp; Payroll, Projects, Sales Pipeline (CRM), Expenses, Financial Forecasting — all connected, no more juggling separate apps.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Know your numbers',
    description: 'Real-time dashboard, P&L statements, cash flow forecasts, and KPIs that show you how your business is really doing.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: TrendingUp,
    title: 'Buy & sell between businesses',
    description: 'Source stock from other businesses through the built-in marketplace. Create purchase orders, track fulfillment, and get invoiced — all inside Custosell.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Users,
    title: 'HR & Payroll',
    description: 'Track attendance, leave, payroll, and performance. Control who has access to what.',
    color: 'from-rose-500 to-rose-600',
  },
  {
    icon: Receipt,
    title: 'Invoicing & payments',
    description: 'Create invoices, email them as PDFs, record payments, and track what customers owe you. Works for both sales and supplier bills.',
    color: 'from-violet-500 to-violet-600',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleAction = (action: 'login' | 'signup') => {
    navigate(action === 'login' ? ROUTES.LOGIN : ROUTES.REGISTER);
  };

  return (
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:pt-12 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full shadow-lg shadow-blue-500/20 mx-auto lg:mx-0">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Work smarter, grow faster</span>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-semibold text-blue-600 uppercase tracking-widest">
              {TAGLINE_SHORT}
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
              {PRODUCT_NAME}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug tracking-tight -mt-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                {TAGLINE}
              </span>
            </motion.p>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <strong className="text-gray-700">Point of Sale (POS)</strong>, <strong className="text-gray-700">Inventory &amp; Supply Chain</strong>, <strong className="text-gray-700">Accounting</strong>, <strong className="text-gray-700">HR &amp; Payroll</strong>, <strong className="text-gray-700">Invoicing</strong>, <strong className="text-gray-700">Expenses</strong>, <strong className="text-gray-700">Project Management</strong>, <strong className="text-gray-700">Sales Pipeline (CRM)</strong>, <strong className="text-gray-700">Financial Forecasting</strong>, and <strong className="text-gray-700">Document Management</strong> — all in one connected system that works with or without the internet.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <button type="button" onClick={() => handleAction('signup')} className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer shadow-md">
                <UserPlus className="w-5 h-5 mr-2" />
                Start for Free Today
              </button>
              <button type="button" onClick={() => handleAction('login')} className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 cursor-pointer">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center lg:justify-start text-sm text-gray-400">
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> Free to use</span>
              <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> Works offline</span>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="lg:block">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 rounded-2xl -rotate-6 opacity-60" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-indigo-100 rounded-2xl rotate-6 opacity-40" />
              <img src={dashboardImg} alt={`${PRODUCT_NAME} dashboard`} className="relative rounded-2xl shadow-xl border border-gray-200 w-full h-auto" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Why business owners choose {PRODUCT_NAME}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            One system that replaces six — from the sales counter to the boardroom.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((ben, i) => {
            const Icon = ben.icon;
            return (
              <motion.div
                key={ben.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ben.color} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{ben.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{ben.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">What You Get in {PRODUCT_NAME}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            From the shop floor to the back office — every tool you need, built into one system.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LANDING_MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.03, 0.35) }}
                className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color} shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{mod.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{mod.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Trusted by businesses like yours</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              From retail shops in Kampala to growing enterprises across Africa — {PRODUCT_NAME} runs the businesses you know.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto mb-16">
            {businessTypes.map((type) => (
              <motion.div
                key={type.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <type.icon className={`w-5 h-5 ${type.color}`} />
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">{type.name}</span>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <TestimonialCarousel />
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div key={stat.label} className="relative overflow-hidden text-center p-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl bg-blue-500/10" />
              <div className="relative text-3xl sm:text-4xl font-bold text-blue-600">{stat.value}</div>
              <div className="relative text-sm text-gray-500 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="py-16 lg:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/40 to-blue-100/30" />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Your business deserves better than chaos</h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Stop juggling separate apps, offline blackouts, and spreadsheet stress. Get everything you need in one system — free to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button type="button" onClick={() => handleAction('signup')} className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer shadow-md">
              <UserPlus className="w-5 h-5 mr-2" />
              Start for Free Today
            </button>
            <button type="button" onClick={() => handleAction('login')} className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 cursor-pointer">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </button>
          </div>
          <p className="text-sm text-gray-400">No credit card required · Free to use · Works offline</p>
        </motion.div>
      </section>
    </>
  );
}
