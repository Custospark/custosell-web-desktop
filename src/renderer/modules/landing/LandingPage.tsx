import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { UserPlus, LogIn, Sparkles, Shield, ShoppingCart, Package, BarChart3, Users, Receipt, Clock } from 'lucide-react';

const stats = [
  { value: '10K+', label: 'Businesses' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Offline Mode' },
  { value: '28', label: 'Business Types' },
];

const benefits = [
  { icon: ShoppingCart, title: 'Fast Sales', description: 'Ring up customers in seconds — cash, mobile money, or card. No more long queues.', color: 'from-blue-500 to-blue-600', image: '/screenshots/faster_sales.png' },
  { icon: Package, title: 'Smart Inventory', description: 'Track stock in real-time. Get low-stock alerts and know what to reorder.', color: 'from-emerald-500 to-emerald-600', image: '/screenshots/smart_inventory.png' },
  { icon: BarChart3, title: 'Real-time Dashboard', description: 'See daily revenue, sales trends, and business performance at a glance.', color: 'from-purple-500 to-purple-600', image: '/screenshots/real_time_dashboard.png' },
  { icon: Users, title: 'Customer Insights', description: 'Know your customers. Track purchase history and buying patterns.', color: 'from-amber-500 to-amber-600', image: '/screenshots/customer_insights.png' },
  { icon: Receipt, title: 'Expense Tracking', description: 'Log and categorize expenses. Understand where your money goes.', color: 'from-red-500 to-red-600', image: '/screenshots/expense_tracking.png' },
  { icon: Clock, title: 'Shift Management', description: 'Track staff shifts, sales per cashier, and end-of-day reconciliations.', color: 'from-indigo-500 to-indigo-600', image: '/screenshots/shift_managment.png' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleAction = (action: 'login' | 'signup') => {
    navigate(action === 'login' ? ROUTES.LOGIN : ROUTES.REGISTER);
  };

  return (
    <>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 lg:pt-8 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full shadow-lg shadow-blue-500/20 mx-auto lg:mx-0">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Trusted by 10,000+ businesses</span>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-1">
              Point of Sale System
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
              More Sales.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                Faster Business Growth.
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              From fast sales and smart inventory to customer insights, expense tracking, and shift management — one platform that works online and offline.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button type="button" onClick={() => handleAction('signup')} className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow cursor-pointer">
                <UserPlus className="w-5 h-5 mr-2" />
                Start Free Trial
              </button>
              <button type="button" onClick={() => handleAction('login')} className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 justify-center lg:justify-start text-sm text-gray-500">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-gray-500">No credit card required · Free 14-day trial · Offline mode included</span>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="hidden lg:block">
            <img src="/screenshots/real_time_dashboard.png" alt="Custosell Dashboard" className="rounded-2xl shadow-xl border border-gray-200 w-full h-auto" />
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything You Need to Run Your Business</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">From ringing up sales to tracking inventory and understanding your customers — Custosell does it all.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all duration-300 cursor-pointer"
              >
                <div className="p-6 pb-3">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${benefit.color} shadow-sm mb-4`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
                <div className="px-6 pb-6">
                  <img src={benefit.image} alt={benefit.title} className="rounded-lg border border-gray-100 w-full h-40 object-cover object-top" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Built for */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Built for Every Business</h2>
          <p className="text-gray-500">From retail shops to restaurants, pharmacies to hardware stores — Custosell works for your business type.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
          <table className="w-full text-sm text-gray-600">
            <tbody>
              {['Retail', 'Wholesale', 'Restaurant', 'Café', 'Supermarket', 'Pharmacy', 'Salon', 'Grocery', 'Hardware', 'Warehouse', 'Boutique', 'Bakery', 'Clinic', 'Bar', 'Auto Shop', 'Fashion', 'Electronics', 'Furniture', 'Bookstore', 'Pet Shop', 'E-commerce', 'Hotel / Lodge', 'Butchery', 'Farm / Agri', 'Tailor', 'Printing', 'Laundry', 'Fuel Station'].reduce<string[][]>((rows, type, i) => {
                const col = i % 7;
                if (col === 0) rows.push([]);
                rows[rows.length - 1].push(type);
                return rows;
              }, []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((type) => (
                    <td key={type} className="py-1.5 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {type}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="relative overflow-hidden text-center p-6 rounded-xl border-2 border-blue-500 bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer">
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl bg-blue-500/10" />
              <div className="relative text-2xl sm:text-3xl font-bold text-blue-600">{stat.value}</div>
              <div className="relative text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-blue-50/50 border-t border-b border-blue-100" />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto px-4 text-center space-y-6 relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ready to Grow Your Business?</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">Join thousands of businesses already using Custosell. Free trial, no credit card required.</p>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => handleAction('signup')} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow cursor-pointer">
              <UserPlus className="w-5 h-5 mr-2" />
              Create Account
            </button>
            <button type="button" onClick={() => handleAction('login')} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </button>
          </div>
        </motion.div>
      </section>
    </>
  );
}
