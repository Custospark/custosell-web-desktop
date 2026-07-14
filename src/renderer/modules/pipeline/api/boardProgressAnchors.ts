import type { PlanningLevel } from '../api/boardProgressTypes';
import type { ProgressPeriod } from '../api/pipelineProgressTerms';

export function periodToPlanningLevel(period: ProgressPeriod): PlanningLevel {
  if (period === 'day') return 'day';
  if (period === 'week') return 'week';
  if (period === 'month') return 'month';
  if (period === 'quarter') return 'quarter';
  if (period === 'year') return 'year';
  return 'month';
}

/** Local calendar YYYY-MM-DD (avoid UTC day-shift from toISOString). */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type AnchorRange = { anchor_start: string; anchor_end: string };

/**
 * Planning-horizon anchors for goal / KPI / OKR decomposition.
 * Independent of the Progress view chip (Today / This month / …).
 *
 * Decade / 5-year start at Jan 1 of the current year and roll forward —
 * so a Decade goal created in 2026 covers 2026…2035 with yearly shares.
 */
export function anchorsForPlanningLevel(
  planningLevel: PlanningLevel,
  asOf: Date = new Date(),
): AnchorRange {
  const y = asOf.getFullYear();
  const startOfYear = () => new Date(y, 0, 1);

  if (planningLevel === 'day') {
    const day = localIsoDate(asOf);
    return { anchor_start: day, anchor_end: day };
  }

  if (planningLevel === 'week') {
    const start = new Date(asOf);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { anchor_start: localIsoDate(start), anchor_end: localIsoDate(end) };
  }

  if (planningLevel === 'month') {
    const start = new Date(y, asOf.getMonth(), 1);
    const end = new Date(y, asOf.getMonth() + 1, 0);
    return { anchor_start: localIsoDate(start), anchor_end: localIsoDate(end) };
  }

  if (planningLevel === 'quarter') {
    const q = Math.floor(asOf.getMonth() / 3);
    const start = new Date(y, q * 3, 1);
    const end = new Date(y, q * 3 + 3, 0);
    return { anchor_start: localIsoDate(start), anchor_end: localIsoDate(end) };
  }

  if (planningLevel === 'year') {
    return {
      anchor_start: localIsoDate(startOfYear()),
      anchor_end: localIsoDate(new Date(y, 11, 31)),
    };
  }

  if (planningLevel === 'five_year') {
    const start = startOfYear();
    const end = new Date(y + 5, 0, 0); // day 0 of Jan (y+5) = Dec 31 of y+4
    return { anchor_start: localIsoDate(start), anchor_end: localIsoDate(end) };
  }

  // decade — rolling 10 calendar years from Jan 1 this year
  const start = startOfYear();
  const end = new Date(y + 10, 0, 0);
  return { anchor_start: localIsoDate(start), anchor_end: localIsoDate(end) };
}

/** Progress canvas view window only — never use for target decomposition. */
export function anchorsForViewPeriod(
  period: ProgressPeriod,
  customFrom?: string,
  customTo?: string,
  asOf: Date = new Date(),
): Partial<AnchorRange> {
  if (period === 'custom' && customFrom && customTo) {
    return { anchor_start: customFrom, anchor_end: customTo };
  }
  return anchorsForPlanningLevel(periodToPlanningLevel(period), asOf);
}

/**
 * @deprecated Use anchorsForPlanningLevel for decomposition.
 * Kept so older call sites keep type-checking until migrated.
 */
export function anchorsForPeriod(
  period: ProgressPeriod,
  planningLevel: PlanningLevel,
  customFrom?: string,
  customTo?: string,
): Partial<AnchorRange> {
  void period;
  void customFrom;
  void customTo;
  return anchorsForPlanningLevel(planningLevel);
}

export function formatAnchorRange(anchors: AnchorRange): string {
  return `${anchors.anchor_start} → ${anchors.anchor_end}`;
}
