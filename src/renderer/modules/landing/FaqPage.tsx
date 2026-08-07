import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Loader2, MessageCircle, RefreshCw, Search, WifiOff } from 'lucide-react';
import { usePublicFaqs } from '../guide/api/GuideQueries';
import type { GuideFaqDto } from '../guide/api/GuideTypes';
import { formatFaqAnswer } from '../../shared/utils/formatFaqAnswer';

const CATEGORIES: { label: string; range: [number, number]; description: string }[] = [
  {
    label: 'Getting Started & Plans',
    range: [1, 8],
    description: 'Learn about Custosell, create your account, and understand plans & billing.',
  },
  {
    label: 'For Personal Accounts',
    range: [9, 11],
    description: 'FAQs specific to freelancers, solopreneurs, and personal account holders.',
  },
  {
    label: 'For Business Accounts',
    range: [12, 13],
    description: 'FAQs for registered businesses using POS, inventory, staff management & more.',
  },
  {
    label: 'Technical & Data',
    range: [14, 15],
    description: 'Offline capability, security, encryption, and data ownership.',
  },
  {
    label: 'Features & Tools',
    range: [16, 27],
    description: 'What Custosell includes — POS, accounting, inventory, HR, storefront, CRM, projects, expenses, forecasting, and documents.',
  },
];

function isInRange(item: GuideFaqDto, range: [number, number]): boolean {
  return item.sort_order >= range[0] && item.sort_order <= range[1];
}

function filterFaqs(items: GuideFaqDto[], search: string): GuideFaqDto[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
  );
}

function AccordionItem({ item, index }: { item: GuideFaqDto; index: number }) {
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
          <span className="text-sm font-semibold text-gray-900 leading-snug">{item.question}</span>
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
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{formatFaqAnswer(item.answer)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategorySection({
  category,
  items,
  defaultExpanded,
}: {
  category: typeof CATEGORIES[0];
  items: GuideFaqDto[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 mb-3 cursor-pointer group"
        aria-expanded={expanded}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-sm">
          <HelpCircle className="h-4 w-4 text-white" />
        </div>
        <div className="text-left">
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {category.label}
          </h2>
          <p className="text-xs text-gray-500">{category.description}</p>
        </div>
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
            {items.map((item, i) => (
              <AccordionItem key={item.uuid} item={item} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const { data: allItems = [], isLoading, isError, refetch } = usePublicFaqs();

  const filtered = useMemo(() => filterFaqs(allItems, search), [allItems, search]);
  const hasSearch = search.trim().length > 0;

  const visibleCategories = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        items: filtered.filter((item) => isInRange(item, cat.range)),
      })).filter((cat) => cat.items.length > 0),
    [filtered],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
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
          Everything you need to know about Custosell — from getting started to advanced features.
        </p>
      </motion.div>

      <div className="relative mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions and answers…"
          disabled={isLoading}
          className="w-full rounded-xl border-2 border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        />
        {hasSearch && (
          <p className="mt-1.5 text-xs text-gray-500">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
            {filtered.length !== allItems.length && ` (filtered from ${allItems.length})`}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading answers…
        </div>
      )}

      {isError && (
        <div className="text-center py-12 space-y-4">
          <WifiOff className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-gray-500 text-sm">Could not load FAQs. Check your connection.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !isError && allItems.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No published FAQs yet. Check back soon.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && allItems.length > 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-3">No answers match your search.</p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Search
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-8">
          {visibleCategories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <CategorySection category={cat} items={cat.items} defaultExpanded={!hasSearch} />
            </motion.div>
          ))}
        </div>
      )}

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
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-900 transition-all shadow-md hover:shadow-lg"
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
