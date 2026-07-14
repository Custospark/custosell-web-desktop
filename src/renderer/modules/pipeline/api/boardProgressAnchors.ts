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

/** Anchor the decomposition tree to the period the user is currently viewing. */
export function anchorsForPeriod(
  period: ProgressPeriod,
  planningLevel: PlanningLevel,
  customFrom?: string,
  customTo?: string,
): { anchor_start?: string; anchor_end?: string } {
  if (period === 'custom' && customFrom && customTo) {
    return { anchor_start: customFrom, anchor_end: customTo };
  }

  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (period === 'day' || planningLevel === 'day') {
    const day = iso(now);
    return { anchor_start: day, anchor_end: day };
  }

  if (period === 'week' || planningLevel === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { anchor_start: iso(start), anchor_end: iso(end) };
  }

  if (period === 'month' || planningLevel === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { anchor_start: iso(start), anchor_end: iso(end) };
  }

  if (period === 'quarter' || planningLevel === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { anchor_start: iso(start), anchor_end: iso(end) };
  }

  if (period === 'year' || planningLevel === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { anchor_start: iso(start), anchor_end: iso(end) };
  }

  return {};
}
