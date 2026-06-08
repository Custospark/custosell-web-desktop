import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Loader2, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGuideFaqs } from './api/GuideQueries';
import { cn } from '../../shared/utils/cn';
import { searchInputClass } from '../../shared/utils/inputStyles';

export default function GuideFaqsPage() {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  const { data: allItems = [], isLoading, isError, refetch } = useGuideFaqs();

  const items = useMemo(() => {
    if (!debounced) return allItems;
    return allItems.filter(
      (item) =>
        item.question.toLowerCase().includes(debounced) || item.answer.toLowerCase().includes(debounced),
    );
  }, [allItems, debounced]);

  const [openUuid, setOpenUuid] = useState<string | null>(null);

  const toggleFaq = useCallback((uuid: string) => {
    setOpenUuid((prev) => (prev === uuid ? null : uuid));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <HelpCircle className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Guide</p>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Answers maintained by the Custosell team. Open a question to read the full response.
          </p>
        </div>
      </div>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          className={searchInputClass}
          placeholder="Search questions and answers…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search FAQs"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading answers…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          Could not load FAQs.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-gray-600">
          {debounced
            ? 'No published answers match that search. Try different keywords.'
            : 'No published FAQs yet. Check back soon.'}
        </p>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {items.length} article{items.length === 1 ? '' : 's'}
          </p>
          {items.map((item) => {
            const isOpen = openUuid === item.uuid;
            return (
              <div
                key={item.uuid}
                className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  isOpen ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(item.uuid)}
                  className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left text-sm font-semibold leading-snug text-gray-900 transition-colors hover:bg-gray-50"
                >
                  <span className="flex-1">{item.question}</span>
                  <ChevronDown
                    className={cn('mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300', isOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="whitespace-pre-wrap border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
