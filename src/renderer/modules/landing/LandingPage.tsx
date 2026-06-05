import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { Store, Sparkles, Shield, ShoppingCart, Package, BarChart3, Users, Receipt, Clock, TrendingUp } from 'lucide-react';

const stats = [
  { value: '10K+', label: 'Businesses' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Offline Mode' },
  { value: '28', label: 'Business Types' },
];

const benefits = [
  { icon: ShoppingCart, title: 'Fast Sales', description: 'Process transactions in seconds with an intuitive POS interface.', color: 'from-blue-500 to-blue-600' },
  { icon: Package, title: 'Smart Inventory', description: 'Track stock in real-time. Get low-stock alerts and know what to reorder.', color: 'from-emerald-500 to-emerald-600' },
  { icon: BarChart3, title: 'Real-time Dashboard', description: 'See daily revenue, sales trends, and business performance at a glance.', color: 'from-purple-500 to-purple-600' },
  { icon: Users, title: 'Customer Insights', description: 'Know your customers. Track purchase history and buying patterns.', color: 'from-amber-500 to-amber-600' },
  { icon: Receipt, title: 'Expense Tracking', description: 'Log and categorize expenses. Understand where your money goes.', color: 'from-red-500 to-red-600' },
  { icon: Clock, title: 'Shift Management', description: 'Track staff shifts, sales per cashier, and end-of-day reconciliations.', color: 'from-indigo-500 to-indigo-600' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleAction = (action: 'login' | 'signup') => {
    navigate(action === 'login' ? ROUTES.LOGIN : ROUTES.REGISTER);
  };

  return (
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full shadow-lg shadow-blue-500/20 mx-auto lg:mx-0">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Trusted by 10,000+ businesses</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
              More Sales.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                Faster Business Growth.
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              A complete POS system for retail, wholesale, and service businesses. Sales, inventory, customers, expenses — all in one place, online or offline.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base" onClick={() => handleAction('signup')}>
                <Store className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base" onClick={() => handleAction('login')}>
                Sign In
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 justify-center lg:justify-start text-sm text-gray-500">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>No credit card required · Free 14-day trial · Offline mode included</span>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="hidden lg:block">
            <img src="/screenshots/real_time_dashboard.png" alt="Custosell Dashboard" className="rounded-2xl shadow-xl border border-gray-200 w-full" />
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything You Need to Run Your Business</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">From ringing up sales to tracking inventory and understanding your customers — Custosell does it all.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="group p-6 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${benefit.color} shadow-sm mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-emerald-600 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Grow Your Business?</h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">Join thousands of businesses already using Custosell. Free trial, no credit card required.</p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3.5 text-base" onClick={() => handleAction('signup')}>Start Free Trial</Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 px-8 py-3.5 text-base" onClick={() => handleAction('login')}>Sign In</Button>
          </div>
        </motion.div>
      </section>
    </>
  );
}
