import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
  { quote: 'Custosell transformed how we manage our shop. Sales are faster, inventory is always accurate, and I can see my business performance anytime - even offline.', name: 'James Opiyo', business: 'Oscar Shop', location: 'Kampala', country: 'Uganda', initials: 'JO', color: 'bg-blue-600' },
  { quote: 'Switching to Custosell was the best decision for our restaurant. Tracking orders and payments is seamless, and the offline mode saved us during network outages.', name: 'Amina Diallo', business: 'Le Quartier Gourmet', location: 'Dakar', country: 'Senegal', initials: 'AD', color: 'bg-emerald-600' },
  { quote: 'We run a wholesale business with high volume daily. Custosell handles it all - stock tracking, customer credit, and end-of-day reports without breaking a sweat.', name: 'Chidi Okonkwo', business: 'Okonkwo Wholesale', location: 'Lagos', country: 'Nigeria', initials: 'CO', color: 'bg-purple-600' },
  { quote: 'As a pharmacist, accuracy is everything. Custosell helps me track expiry dates, manage stock, and serve customers faster. A must-have for any pharmacy.', name: 'Grace Mwangi', business: 'Mwangi Pharmacy', location: 'Nairobi', country: 'Kenya', initials: 'GM', color: 'bg-rose-600' },
  { quote: 'Our salon handles dozens of customers daily. Custosell makes booking, payment, and product sales so much easier. My staff learned it in one day.', name: 'Fatima Ahmed', business: 'Zuri Beauty Lounge', location: 'Dar es Salaam', country: 'Tanzania', initials: 'FA', color: 'bg-pink-500' },
  { quote: 'Running a hardware store means tracking thousands of items. Custosell\'s inventory management is a game changer. I finally know what\'s in stock without walking the floor.', name: 'Kwame Asante', business: 'Asante Hardware', location: 'Accra', country: 'Ghana', initials: 'KA', color: 'bg-amber-600' },
  { quote: 'We use Custosell across our supermarket chain. The dashboard gives me a real-time view of all locations - sales, stock, and staff performance. Unbelievable value.', name: 'Mpho Tshabalala', business: 'Tshabalala Supermarkets', location: 'Johannesburg', country: 'South Africa', initials: 'MT', color: 'bg-indigo-600' },
  { quote: 'I started my boutique with just a few items. Custosell grew with me. Now with over 500 products, I manage everything from one screen - sales, suppliers, and customers.', name: 'Ngozi Eze', business: 'Ngozi Fashion House', location: 'Abuja', country: 'Nigeria', initials: 'NE', color: 'bg-sky-600' },
  { quote: 'My butchery serves hundreds of customers on market days. Custosell\'s fast checkout keeps the line moving. The sales reports help me plan my stock orders perfectly.', name: 'Jean-Pierre Habimana', business: 'Habimana Meats', location: 'Kigali', country: 'Rwanda', initials: 'JH', color: 'bg-red-600' },
  { quote: 'We run a farm supply business across three counties. Custosell helps us track sales to farmers, manage credit, and reconcile daily - even when we\'re in the field.', name: 'Sarah Wanjiku', business: 'Wanjiku Agri Supplies', location: 'Nakuru', country: 'Kenya', initials: 'SW', color: 'bg-green-600' },
  { quote: 'Custosell made it possible for our electronics store to track serial numbers, warranties, and repairs. Our customers love the fast service.', name: 'Carlos Mendes', business: 'Mendes Electronics', location: 'Maputo', country: 'Mozambique', initials: 'CM', color: 'bg-teal-600' },
  { quote: 'From our hotel reception to the restaurant and bar, Custosell ties everything together. Check-ins, billing, and inventory - all in one place.', name: 'Aisha Mohammed', business: 'Lagos Continental Hotel', location: 'Lagos', country: 'Nigeria', initials: 'AM', color: 'bg-violet-600' },
  { quote: 'We distribute building materials across three regions. Custosell\'s multi-branch tracking lets me see stock levels at each warehouse in real time.', name: 'Elias Hailu', business: 'Hailu Building Materials', location: 'Addis Ababa', country: 'Ethiopia', initials: 'EH', color: 'bg-orange-600' },
  { quote: 'My tailoring shop went from handwritten receipts to digital in one day. Custosell is simple, fast, and my customers appreciate the printed receipts.', name: 'Mariam Bello', business: 'Bello Tailoring', location: 'Niamey', country: 'Niger', initials: 'MB', color: 'bg-cyan-600' },
  { quote: 'We run a chain of pharmacies in Lusaka. Custosell helps us manage prescriptions, track low stock, and comply with health regulations effortlessly.', name: 'Brian Phiri', business: 'Phiri Health', location: 'Lusaka', country: 'Zambia', initials: 'BP', color: 'bg-lime-600' },
  { quote: 'I run an online store and a physical shop. Custosell syncs inventory across both automatically. No more overselling or manual stock counts.', name: 'David Ochieng', business: 'Ochieng Goods', location: 'Kisumu', country: 'Kenya', initials: 'DO', color: 'bg-blue-600' },
  { quote: 'Our family restaurant has been using Custosell for two years. The shift management feature helps us track which waitstaff processed which orders.', name: 'Sophie Kabore', business: 'Café Ouaga', location: 'Ouagadougou', country: 'Burkina Faso', initials: 'SK', color: 'bg-amber-600' },
  { quote: 'As a bookshop owner, I love the customer insights. I can see who buys what, send them notifications when new books arrive, and track loyalty points.', name: 'Thomas Mwila', business: 'Mwila Bookstore', location: 'Ndola', country: 'Zambia', initials: 'TM', color: 'bg-indigo-600' },
  { quote: 'Custosell works perfectly for our hardware store in Cairo. The offline mode is essential - we process sales even when the internet is down.', name: 'Youssef Ibrahim', business: 'Ibrahim Hardware', location: 'Cairo', country: 'Egypt', initials: 'YI', color: 'bg-red-600' },
  { quote: 'I started with one food truck. Now I have five. Custosell helps me track sales per truck, manage ingredients, and know which locations perform best.', name: 'Lindiwe Nkosi', business: 'Nkosi Food Trucks', location: 'Durban', country: 'South Africa', initials: 'LN', color: 'bg-green-600' },
];

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setActive((prev) => (prev + 1) % testimonials.length);
      }, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPaused]);

  const t = testimonials[active];

  return (
    <div className="max-w-4xl mx-auto" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className="relative min-h-[280px] sm:min-h-[240px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="text-center p-8 sm:p-10 rounded-2xl border border-blue-100 bg-blue-50/50"
          >
            <svg className="w-8 h-8 text-blue-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
            <blockquote className="text-base sm:text-lg text-gray-700 font-medium leading-relaxed mb-6">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-bold text-white shrink-0`}>{t.initials}</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.business}</p>
                <p className="text-xs font-medium text-blue-600">{t.location}, {t.country}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-2 mt-6">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === active ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
