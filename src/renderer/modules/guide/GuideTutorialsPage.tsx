import { ExternalLink, GraduationCap, Loader2, PlayCircle } from 'lucide-react';
import { useGuideTutorials } from './api/GuideQueries';
import { resolveGuideTutorialThumbnailSrc } from './api/guideTutorialThumbnail';
import { EmptyState } from '../../shared/components/cards/EmptyState';

function excerpt(text: string | null, max = 160) {
  if (!text?.trim()) return '';
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

export default function GuideTutorialsPage() {
  const { data: items = [], isLoading, isError, refetch } = useGuideTutorials();

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

      {!isLoading && !isError && items.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => {
            const thumbSrc = resolveGuideTutorialThumbnailSrc(m);
            return (
              <li key={m.uuid}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:border-blue-300 hover:shadow-md">
                  <a
                    href={m.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-video w-full overflow-hidden bg-black/5 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`Watch video: ${m.title}`}
                  >
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
                  </a>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-base font-semibold leading-snug text-gray-900">{m.title}</h3>
                    {m.description ? (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{excerpt(m.description)}</p>
                    ) : null}
                    <div className="mt-3">
                      <a
                        href={m.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Open video
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
