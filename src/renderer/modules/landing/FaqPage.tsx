import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_CATEGORIES: { label: string; icon: typeof HelpCircle; items: FaqItem[] }[] = [
  {
    label: 'Getting Started',
    icon: HelpCircle,
    items: [
      {
        q: 'What is Custosell?',
        a: 'Custosell is an all-in-one business operating system for businesses of all sizes — from small shops to large enterprises. It replaces your cash register, receipt book, customer ledger, stock book, expense notebook, invoice book, and payroll sheets — all in one app that works with or without internet.',
      },
      {
        q: 'How do I get started?',
        a: 'Create a free account, choose your plan, pay the one-time setup fee, and you get a 30-day trial to test everything. No credit card required to start.',
      },
      {
        q: 'What platforms does Custosell support?',
        a: 'Custosell runs on Windows laptops and tablets. Support for Mac and Linux is coming soon. The public storefront (Discover) works on any phone browser.',
      },
    ],
  },
  {
    label: 'Plans & Billing',
    icon: MessageCircle,
    items: [
      {
        q: 'How much does Custosell cost?',
        a: 'Essential starts at 75,000/month, Professional at 200,000/month, and Enterprise at 500,000/month. Each plan has a one-time onboarding fee. All plans include a 30-day trial after setup.',
      },
      {
        q: 'Is there a free version?',
        a: 'No, there is no free tier. But you get a full 30-day trial to test every feature before you pay. No credit card required.',
      },
      {
        q: 'Can I switch plans later?',
        a: 'Yes. Upgrade or downgrade anytime. Changes take effect on your next billing cycle.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'Card payments, mobile money, and bank transfer (availability depends on your region).',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Month-to-month, no lock-in contracts. Cancel anytime and your access continues until the end of your billing period.',
      },
    ],
  },
  {
    label: 'Offline & Technical',
    icon: HelpCircle,
    items: [
      {
        q: 'Does Custosell work without internet?',
        a: 'Yes. Custosell is offline-first. You can ring up sales, add customers, record expenses, and manage inventory without any internet connection. Everything syncs automatically when you reconnect.',
      },
      {
        q: 'What happens if my device breaks?',
        a: 'Your data is stored locally and synced to the cloud. Install Custosell on a new device, log in, and your data restores from the cloud.',
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your data belongs to you — we never share or sell it.',
      },
    ],
  },
  {
    label: 'Features',
    icon: HelpCircle,
    items: [
      {
        q: 'What modules are included in each plan?',
        a: 'Essential includes POS, inventory, customers, expenses, dashboard, and a public online storefront. Professional adds pipeline, estimates, documents, and marketplace. Enterprise adds accounting, HR & payroll, and forecasting.',
      },
      {
        q: 'Can I control what my staff see?',
        a: 'Yes. You control which modules each staff member can access. A cashier sees only the POS. Your inventory manager sees only stock-related sections.',
      },
      {
        q: 'Are receipts tax-compliant?',
        a: 'Yes. Custosell generates fiscal receipts compliant with local tax regulations, including URA/EFRIS in Uganda. Works offline too — receipts are queued and synced when you reconnect.',
      },
      {
        q: 'Can I sell online with Custosell?',
        a: 'Yes. Every business gets a public storefront with a shareable link. Customers browse products and place orders. You fulfil from your POS. Share the link on WhatsApp, TikTok, or Facebook.',
      },
    ],
  },
];

function AccordionItem({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-900 leading-snug">{item.q}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategorySection({ category }: { category: typeof FAQ_CATEGORIES[0] }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = category.icon;

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 mb-3 cursor-pointer group"
        aria-expanded={expanded}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-sm">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          {category.label}
        </h2>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-3 overflow-hidden"
          >
            {category.items.map((item, i) => (
              <AccordionItem key={item.q} item={item} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700 mb-5">
          <HelpCircle className="w-3.5 h-3.5" />
          Help & Support
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          Frequently Asked{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
            Questions
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          From small shops to large enterprises — everything you need to know about Custosell. Can't find what you're looking for? Reach out to us.
        </p>
      </motion.div>

      <div className="space-y-8">
        {FAQ_CATEGORIES.map((category, i) => (
          <motion.div
            key={category.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <CategorySection category={category} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8"
      >
        <MessageCircle className="h-8 w-8 text-blue-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Still have questions?</h2>
        <p className="text-sm text-gray-600 mb-4">
          We're here to help. Send us a message and we'll get back to you within 24 hours.
        </p>
        <a
          href="mailto:support@custosell.com"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-md"
        >
          <MessageCircle className="h-4 w-4" />
          Contact Support
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-xs text-gray-400"
      >
        <p>Last updated: July 2026</p>
      </motion.div>
    </div>
  );
}
