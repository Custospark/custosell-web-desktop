export interface RankingRow {
  name: string;
  sku?: string | null;
  metric: string;
  secondary?: string;
  /** 0–100 bar width; omit to hide the progress bar. */
  share?: number;
}

interface OverviewRankingListProps {
  rows: RankingRow[];
  emptyMessage?: string;
}

/** Numbered ranking list with optional magnitude bar (e.g. top profit). */
export function OverviewRankingList({ rows, emptyMessage = 'No products match yet' }: OverviewRankingListProps) {
  if (!rows.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={`${row.name}-${i}`} className="group">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-5 h-5 shrink-0 rounded-md bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{row.name}</p>
                <p className="text-xs text-gray-400 truncate">{row.sku ?? '—'}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{row.metric}</p>
              {row.secondary && <p className="text-xs text-gray-400 tabular-nums">{row.secondary}</p>}
            </div>
          </div>
          {row.share !== undefined && (
            <div className="mt-1.5 ml-7 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, row.share))}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}