import { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, MapPin, Package, Search, Store } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { cn } from '../../../../shared/utils/cn';
import type { MarketplaceBusiness } from '../../api/marketplace/marketplaceTypes';

interface BrowseSuppliersModalProps {
  open: boolean;
  onClose: () => void;
  suppliers: MarketplaceBusiness[];
  selectedId: number | null;
  loading?: boolean;
  savingId?: number | null;
  onSelect: (supplier: MarketplaceBusiness) => void;
  onToggleSave: (supplier: MarketplaceBusiness) => void;
}

function locationLabel(biz: MarketplaceBusiness): string {
  return [biz.city, biz.state, biz.country].filter(Boolean).join(', ') || 'Location not set';
}

export function BrowseSuppliersModal({
  open,
  onClose,
  suppliers,
  selectedId,
  loading = false,
  savingId = null,
  onSelect,
  onToggleSave,
}: BrowseSuppliersModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (biz) =>
        biz.name.toLowerCase().includes(q)
        || (biz.supply_headline?.toLowerCase().includes(q) ?? false)
        || (biz.description?.toLowerCase().includes(q) ?? false)
        || locationLabel(biz).toLowerCase().includes(q),
    );
  }, [suppliers, query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  function handleSelect(biz: MarketplaceBusiness) {
    setQuery('');
    onSelect(biz);
    onClose();
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Browse suppliers"
      subtitle="Search open-for-supply businesses. Save favorites to My suppliers for a faster start."
      size="2xl"
      titleCentered
      panelClassName="h-[min(92vh,900px)]"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-3"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, headline, or city…"
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              {loading ? 'Loading…' : `${filtered.length} supplier${filtered.length === 1 ? '' : 's'}`}
            </span>
            {query.trim() ? (
              <button
                type="button"
                className="font-semibold text-teal-800 hover:underline"
                onClick={() => setQuery('')}
              >
                Clear search
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          {loading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Store className="h-10 w-10 text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">No matching suppliers</p>
              <p className="max-w-xs text-sm text-slate-600">
                Try another name or city. Only businesses open for supply appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 pb-1 sm:grid-cols-2">
              {filtered.map((biz) => {
                const active = biz.id === selectedId;
                const saved = !!biz.is_saved;
                const saveBusy = savingId === biz.id;
                return (
                  <div
                    key={biz.id}
                    className={cn(
                      'group relative rounded-xl border-2 p-3.5 text-left transition-all',
                      active
                        ? 'border-teal-700 bg-teal-50 shadow-md shadow-teal-200/50'
                        : 'border-slate-200 bg-white hover:border-teal-500 hover:shadow-md',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(biz)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3 pr-8">
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                            active
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-200 text-slate-800 group-hover:bg-teal-100 group-hover:text-teal-900',
                          )}
                        >
                          {biz.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{biz.name}</p>
                          {biz.supply_headline ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-700">{biz.supply_headline}</p>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-600">Wholesale catalog available</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                              <span className="truncate">{locationLabel(biz)}</span>
                            </span>
                            {typeof biz.listed_products_count === 'number' ? (
                              <span className="inline-flex items-center gap-1">
                                <Package className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                {biz.listed_products_count} listed
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title={saved ? 'Remove from My suppliers' : 'Save to My suppliers'}
                      aria-label={saved ? 'Remove from My suppliers' : 'Save to My suppliers'}
                      disabled={saveBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(biz);
                      }}
                      className={cn(
                        'absolute right-2.5 top-2.5 rounded-lg p-1.5 transition-colors',
                        saved
                          ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-800',
                        'disabled:opacity-50',
                      )}
                    >
                      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
