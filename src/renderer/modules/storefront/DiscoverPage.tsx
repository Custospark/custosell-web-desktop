import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { avatarUrl } from '../../shared/utils/avatarUrl';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { useStorefrontCategories, useStorefrontDiscover } from './api/storefrontQueries';

export default function DiscoverPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const { data: categories = [] } = useStorefrontCategories();
  const { data, isLoading, isError } = useStorefrontDiscover(q.trim(), category);

  const products = data?.products ?? [];
  const total = data?.meta?.total ?? products.length;

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: String(c.id), label: `${c.name} (${c.product_count})` })),
    [categories],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-600 mb-1">Discover</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Browse shops on Custosell</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Find products from businesses that list their public shop. Place an order request — they will call or deliver.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products or shops"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="minimal" message="Loading products…" />
      ) : isError ? (
        <p className="text-sm text-red-600">Could not load Discover. Try again online.</p>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Store className="w-12 h-12" />}
          title="No shops listing yet"
          description="When businesses enable their public shop and list products, they will appear here."
        />
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-4">{total} listing{total === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const currency = p.business?.currency || 'UGX';
              const shopSlug = p.business?.slug;
              return (
                <article key={`${p.id}-${shopSlug}`} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="aspect-[4/3] bg-slate-100">
                    {p.image_path ? (
                      <img src={avatarUrl(p.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900 line-clamp-1">{p.name}</h2>
                    <p className="text-sm font-medium text-blue-700 mt-1 tabular-nums">
                      {formatCurrency(Number(p.unit_price), currency)}
                    </p>
                    {p.business ? (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {p.business.name}{p.business.city ? ` · ${p.business.city}` : ''}
                      </p>
                    ) : null}
                    {shopSlug ? (
                      <Link
                        to={ROUTES.SHOP(shopSlug)}
                        className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View shop →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
