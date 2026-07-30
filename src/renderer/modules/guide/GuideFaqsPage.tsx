import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Loader2, RefreshCw, Search, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { useGuideFaqs } from './api/GuideQueries';
import type { GuideFaqDto } from './api/GuideTypes';
import { GuideSearchBar } from './components/GuideSearchBar';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { cn } from '../../shared/utils/cn';

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

export default function GuideFaqsPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const [search, setSearch] = useState('');
  const [openUuid, setOpenUuid] = useState<string | null>(null);

  const { data: allItems = [], isLoading, isError, refetch } = useGuideFaqs({
    enabled: !isOffline,
  });

  const filtered = useMemo(() => filterFaqs(allItems, search), [allItems, search]);
  const hasSearch = search.trim().length > 0;

  const toggleFaq = useCallback((uuid: string) => {
    setOpenUuid((prev) => (prev === uuid ? null : uuid));
  }, []);

  const visibleCategories = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        items: filtered.filter((item) => isInRange(item, cat.range)),
      })).filter((cat) => cat.items.length > 0),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 shadow-sm">
          <HelpCircle className="h-7 w-7 text-white" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Guide</p>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Answers maintained by the Custosell team. Browse by category or use the search bar.
          </p>
        </div>
      </div>

      {isOffline && (
        <div
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800"
          role="status"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          FAQs require an internet connection.
        </div>
      )}

      {!isOffline && (
        <div className="space-y-3 rounded-xl border-2 border-gray-200 bg-white/80 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              disabled={isLoading}
              className="w-full rounded-lg border-2 border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
            />
          </div>
          {!isLoading && !isError && allItems.length > 0 && (
            <p className="text-xs text-gray-500">
              {filtered.length} of {allItems.length} article{allItems.length === 1 ? '' : 's'}
              {hasSearch ? ' matching your search' : ''}
            </p>
          )}
        </div>
      )}

      {isOffline && (
        <EmptyState
          icon={<WifiOff className="h-12 w-12" />}
          title="FAQs unavailable offline"
          description="Connect to the internet to browse frequently asked questions."
        />
      )}

      {!isOffline && isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading answers…
        </div>
      )}

      {!isOffline && isError && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-center" role="alert">
          Could not load FAQs.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}

      {!isOffline && !isLoading && !isError && allItems.length === 0 && (
        <EmptyState
          title="No published FAQs yet"
          description="Check back soon — the Custosell team will add answers here."
        />
      )}

      {!isOffline && !isLoading && !isError && allItems.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No answers match your search"
          description="Try different keywords or clear the search box."
          actionLabel="Clear search"
          onAction={() => setSearch('')}
        />
      )}

      {!isOffline && !isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-8">
          {visibleCategories.map((cat, ci) => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-sm">
                  <HelpCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{cat.label}</h2>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {cat.items.map((item) => {
                  const isOpen = openUuid === item.uuid;
                  return (
                    <div
                      key={item.uuid}
                      className={cn(
                        'overflow-hidden rounded-xl border-2 transition-colors',
                        isOpen ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white/80',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(item.uuid)}
                        className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left text-sm font-semibold leading-snug text-gray-900 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex-1">{item.question}</span>
                        <ChevronDown
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300',
                            isOpen && 'rotate-180',
                          )}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
