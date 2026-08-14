import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { TALENT_SURFACE } from './talentSurface';
import type { HistoryRange } from './attendanceUtils';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { employeeDisplayName, type HrEmployee } from '../api/hrTypes';
import { Clock, Download } from 'lucide-react';

interface HrAttendanceHeroProps {
  isFullHr: boolean;
  workDate: string;
  onWorkDateChange: (value: string) => void;
  historyRange: HistoryRange;
  onHistoryRangeChange: (range: HistoryRange) => void;
  rangeFrom: string;
  rangeTo: string;
  employees: HrEmployee[];
  chartEmployeeId: string;
  onChartEmployeeChange: (value: string) => void;
  importPending: boolean;
  onImport: () => void;
}

export default function HrAttendanceHero({
  isFullHr,
  workDate,
  onWorkDateChange,
  historyRange,
  onHistoryRangeChange,
  rangeFrom,
  rangeTo,
  employees,
  chartEmployeeId,
  onChartEmployeeChange,
  importPending,
  onImport,
}: HrAttendanceHeroProps) {
  return (
    <div className={TALENT_SURFACE.hero}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 shrink-0 text-violet-600" />
            <h1 className={cn('text-xl font-bold', TALENT_SURFACE.textTitle)}>Attendance</h1>
          </div>
          <p className={cn('mt-1 max-w-2xl text-sm', TALENT_SURFACE.textBody)}>
            {isFullHr
              ? 'Clock punches, review the daily register, and see hours and presence trends over time.'
              : 'Clock yourself in and out, then watch your attendance pattern over the last week or month.'}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className={cn('mb-1 block text-[11px] font-medium', TALENT_SURFACE.textMuted)}>Focus day</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => onWorkDateChange(e.target.value)}
              className={TALENT_SURFACE.input}
            />
          </div>
          <div className={TALENT_SURFACE.chipGroup}>
            <button
              type="button"
              onClick={() => onHistoryRangeChange('week')}
              className={cn(TALENT_SURFACE.chip, historyRange === 'week' && TALENT_SURFACE.chipActive)}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => onHistoryRangeChange('month')}
              className={cn(TALENT_SURFACE.chip, historyRange === 'month' && TALENT_SURFACE.chipActive)}
            >
              Last 30 days
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
          Charts · {formatShiftDate(rangeFrom)} - {formatShiftDate(rangeTo)}
          {isFullHr
            ? (() => {
                const selected = employees.find((e) => e.id === Number(chartEmployeeId));
                return selected ? ` · ${employeeDisplayName(selected)}` : ' · whole team';
              })()
            : ''}
        </p>

        {isFullHr ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={cn('mb-1 block text-[11px] font-medium', TALENT_SURFACE.textMuted)}>Chart employee</label>
              <select
                value={chartEmployeeId}
                onChange={(e) => onChartEmployeeChange(e.target.value)}
                className={cn(TALENT_SURFACE.input, 'min-w-[200px]')}
              >
                <option value="">Whole team</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              loading={importPending}
              onClick={onImport}
              className="inline-flex items-center gap-2 border-white/60 bg-white/80"
            >
              <Download className="h-4 w-4" />
              Import timesheets (focus day)
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
