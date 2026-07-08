import { cn } from '../../../shared/utils/cn';

function ColumnSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex h-full min-h-[320px] w-[292px] shrink-0 flex-col rounded-2xl border border-gray-200/80 bg-white/70 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
    >
      <div className="border-b border-gray-100 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-6 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
            style={{ animationDelay: `${delay + i * 80}ms` }}
          >
            <div className="flex gap-2">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <div className="h-5 w-14 animate-pulse rounded-md bg-gray-100" />
              <div className="h-5 w-16 animate-pulse rounded-md bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface KanbanBoardSkeletonProps {
  columnCount?: number;
  className?: string;
}

export default function KanbanBoardSkeleton({ columnCount = 4, className }: KanbanBoardSkeletonProps) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 gap-3 overflow-x-auto p-3 pb-1', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading board columns"
    >
      {Array.from({ length: columnCount }, (_, i) => (
        <ColumnSkeleton key={i} delay={i * 60} />
      ))}
    </div>
  );
}

export function LeadDetailSkeleton() {
  return (
    <div className="space-y-5 pb-2 animate-pulse" role="status" aria-busy="true" aria-label="Loading card">
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="flex items-start gap-4 p-4">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-4 w-32 rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-gray-50" />
    </div>
  );
}

export function LeadCommentsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-busy="true" aria-label="Loading comments">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-gray-100 p-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-4/5 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
