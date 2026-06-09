import { useMemo, useState } from 'react';
import { ExternalLink, GraduationCap, Loader2, PlayCircle, WifiOff } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { useGuideTutorials } from './api/GuideQueries';
import { resolveGuideTutorialThumbnailSrc } from './api/guideTutorialThumbnail';
import {
  GUIDE_TUTORIAL_CATEGORIES,
  type GuideTutorialCategory,
  type GuideTutorialDto,
} from './api/GuideTypes';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { Badge } from '../../shared/components/badges/Badge';
import { GuideSearchBar } from './components/GuideSearchBar';
import { cn } from '../../shared/utils/cn';

type CategoryFilter = GuideTutorialCategory | 'all';

function excerpt(text: string | null, max = 160) {
  if (!text?.trim()) return '';
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

function categoryLabel(category: GuideTutorialCategory): string {
  return GUIDE_TUTORIAL_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function filterTutorials(
  items: GuideTutorialDto[],
  search: string,
  categoryFilter: CategoryFilter,
): GuideTutorialDto[] {
  let list = items;

  if (categoryFilter !== 'all') {
    list = list.filter((t) => t.category === categoryFilter);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q)
        || (t.description?.toLowerCase().includes(q) ?? false),
    );
  }

  return list;
}

export default function GuideTutorialsPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const { data: items = [], isLoading, isError, refetch } = useGuideTutorials({
    enabled: !isOffline,
  });

  const filtered = useMemo(
    () => filterTutorials(items, search, categoryFilter),
    [items, search, categoryFilter],
  );

  const hasActiveFilters = categoryFilter !== 'all' || search.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <GraduationCap className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Guide</p>
          <h1 className="text-2xl font-bold text-gray-900">Tutorials</h1>
          <p className="mt-1 text-sm text-gray-600">
            Short videos from the Custosell team to help you get the most from the app.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        {isOffline && (
          <div
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
            role="status"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Tutorials require an internet connection.
          </div>
        )}

        <GuideSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search tutorials by title or description…"
          title="Search tutorials"
          disabled={isLoading}
        />

        <div className="flex flex-wrap gap-2">
          <CategoryChip
            label="All"
            active={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
            disabled={isLoading}
          />
          {GUIDE_TUTORIAL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.value}
              label={cat.label}
              active={categoryFilter === cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              disabled={isLoading}
            />
          ))}
        </div>

        {!isLoading && !isError && items.length > 0 && (
          <p className="text-xs text-gray-500">
            {filtered.length} of {items.length} tutorial{items.length === 1 ? '' : 's'}
            {hasActiveFilters ? ' matching your filters' : ''}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading tutorials…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          Could not load tutorials.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          title="No tutorials yet"
          description="When the Custosell team publishes tutorials, they will appear here."
        />
      )}

      {!isLoading && !isError && items.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No tutorials match your search"
          description="Try a different keyword or clear the category filter."
          actionLabel="Clear filters"
          onAction={() => {
            setSearch('');
            setCategoryFilter('all');
          }}
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <TutorialCard key={m.uuid} tutorial={m} isOffline={isOffline} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TutorialCard({ tutorial: m, isOffline }: { tutorial: GuideTutorialDto; isOffline: boolean }) {
  const thumbSrc = resolveGuideTutorialThumbnailSrc(m);
  const disabledClass = isOffline
    ? 'cursor-not-allowed opacity-50 hover:border-gray-200 hover:shadow-none'
    : 'hover:border-blue-300 hover:shadow-md';

  const thumbnail = (
    <>
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100">
          <PlayCircle className="h-14 w-14 text-gray-400" aria-hidden />
        </div>
      )}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900 shadow">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Watch
      </span>
    </>
  );

  return (
    <li>
      <article
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow',
          disabledClass,
        )}
      >
        {isOffline ? (
          <div
            className="relative block aspect-video w-full overflow-hidden bg-black/5"
            title="Unavailable offline"
            aria-disabled
          >
            {thumbnail}
          </div>
        ) : (
          <a
            href={m.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-video w-full overflow-hidden bg-black/5 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Watch video: ${m.title}`}
          >
            {thumbnail}
          </a>
        )}

        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-gray-900">{m.title}</h3>
            <Badge variant="neutral">{categoryLabel(m.category)}</Badge>
          </div>
          {m.description ? (
            <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{excerpt(m.description)}</p>
          ) : null}
          <div className="mt-3">
            {isOffline ? (
              <span
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                title="Unavailable offline"
              >
                Open video
                <ExternalLink className="h-4 w-4" aria-hidden />
              </span>
            ) : (
              <a
                href={m.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Open video
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50',
      )}
    >
      {label}
    </button>
  );
}
