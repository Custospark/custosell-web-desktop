import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { UserPlus, LogIn, Sparkles, Shield, ShoppingCart, Package, BarChart3, Users, Receipt, Clock, Store, Coffee, Pill, Scissors, Apple, Wrench, Building2, Shirt, Heart, Wine, Car, Monitor, BookOpen, Globe, Printer, Droplets, Fuel, Wheat, Ruler, PawPrint, Sofa, ChefHat, UtensilsCrossed, Building } from 'lucide-react';
import TestimonialCarousel from './ui/TestimonialCarousel';

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
                Start Free Trial Today
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

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="lg:block">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for Every Business</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">From retail shops to restaurants, pharmacies to hardware stores — Custosell works for your business type.</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 max-w-5xl mx-auto">
          {[
            { name: 'Retail', icon: Store, color: 'text-blue-600' },
            { name: 'Wholesale', icon: Package, color: 'text-indigo-600' },
            { name: 'Restaurant', icon: UtensilsCrossed, color: 'text-red-500' },
            { name: 'Café', icon: Coffee, color: 'text-amber-600' },
            { name: 'Supermarket', icon: ShoppingCart, color: 'text-green-600' },
            { name: 'Pharmacy', icon: Pill, color: 'text-purple-600' },
            { name: 'Salon', icon: Scissors, color: 'text-pink-500' },
            { name: 'Grocery', icon: Apple, color: 'text-green-600' },
            { name: 'Hardware', icon: Wrench, color: 'text-amber-600' },
            { name: 'Warehouse', icon: Building2, color: 'text-gray-600' },
            { name: 'Boutique', icon: Shirt, color: 'text-rose-500' },
            { name: 'Bakery', icon: ChefHat, color: 'text-amber-600' },
            { name: 'Clinic', icon: Heart, color: 'text-red-500' },
            { name: 'Bar', icon: Wine, color: 'text-purple-600' },
            { name: 'Auto Shop', icon: Car, color: 'text-blue-600' },
            { name: 'Fashion', icon: Sparkles, color: 'text-pink-500' },
            { name: 'Electronics', icon: Monitor, color: 'text-blue-600' },
            { name: 'Furniture', icon: Sofa, color: 'text-amber-600' },
            { name: 'Bookstore', icon: BookOpen, color: 'text-indigo-600' },
            { name: 'Pet Shop', icon: PawPrint, color: 'text-amber-600' },
            { name: 'E-commerce', icon: Globe, color: 'text-blue-600' },
            { name: 'Hotel / Lodge', icon: Building, color: 'text-indigo-600' },
            { name: 'Butchery', icon: UtensilsCrossed, color: 'text-red-500' },
            { name: 'Farm / Agri', icon: Wheat, color: 'text-green-600' },
            { name: 'Tailor', icon: Ruler, color: 'text-purple-600' },
            { name: 'Printing', icon: Printer, color: 'text-blue-600' },
            { name: 'Laundry', icon: Droplets, color: 'text-blue-600' },
            { name: 'Fuel Station', icon: Fuel, color: 'text-amber-600' },
          ].map((type) => (
            <motion.div
              key={type.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <type.icon className={`w-5 h-5 ${type.color}`} />
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{type.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Trusted Across Africa</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Business owners from across the continent rely on Custosell to run their businesses every day.</p>
        </motion.div>
        <TestimonialCarousel />
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">10,000+ Businesses Trust Custosell</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">From small shops to growing enterprises — businesses rely on Custosell every day.</p>
        </motion.div>
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
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Start Growing Your Business Today</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">Join thousands of businesses already using Custosell. Free trial, no credit card required.</p>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => handleAction('signup')} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow cursor-pointer">
              <UserPlus className="w-5 h-5 mr-2" />
              Start Free Trial Today
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
