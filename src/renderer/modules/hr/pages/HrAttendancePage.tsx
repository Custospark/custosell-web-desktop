import { useState } from 'react';
import {
  useHrAttendance,
  useHrClock,
  useHrEmployees,
  useHrPosShifts,
  useImportHrTimesheets,
  useUpdateHrAttendanceDay,
} from '../api/useHrQueries';
import type { AttendanceDayStatus, AttendanceEventType, HrAttendanceDay } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { TALENT_SURFACE } from '../ui/talentSurface';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';
import HrAttendanceHero from '../ui/HrAttendanceHero';
import AttendanceClockForm from '../ui/AttendanceClockForm';
import HrAttendanceCharts from '../ui/HrAttendanceCharts';
import HrAttendancePanels, { type HrPosShiftView } from '../ui/HrAttendancePanels';
import HrMetricCard from '../ui/HrMetricCard';
import {
  addDays,
  endOfMonthIso,
  hoursLabel,
  shortDayLabel,
  startOfMonthIso,
  todayIso,
  type HistoryRange,
} from '../ui/attendanceUtils';

export default function HrAttendancePage() {
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);

  const [workDate, setWorkDate] = useState(todayIso());
  const [historyRange, setHistoryRange] = useState<HistoryRange>('week');
  const [employeeId, setEmployeeId] = useState('');
  const [clockType, setClockType] = useState<AttendanceEventType>('clock_in');
  const [chartEmployeeId, setChartEmployeeId] = useState('');

  const rangeFrom = historyRange === 'week' ? addDays(workDate, -6) : addDays(workDate, -29);
  const rangeTo = workDate;
  const monthFrom = startOfMonthIso();
  const monthTo = endOfMonthIso();

  const { data: employees = [] } = useHrEmployees({ status: 'active' });
  const selfEmployee = employees.find((e) => e.user_id != null && user?.id != null && e.user_id === user.id) ?? null;
  const selfEmployeeId = selfEmployee?.id;

  const historyEmployeeId = isFullHr
    ? (chartEmployeeId ? Number(chartEmployeeId) : undefined)
    : selfEmployeeId;

  const { data: history, isLoading: loadingHistory } = useHrAttendance({
    from: rangeFrom,
    to: rangeTo,
    employee_id: historyEmployeeId,
  });
  const { data: monthAttendance, isLoading: loadingMonthEvents } = useHrAttendance({
    from: monthFrom,
    to: monthTo,
    employee_id: historyEmployeeId,
  });
  const { data: posShifts = [] } = useHrPosShifts({ work_date: workDate }, isFullHr);
  const clock = useHrClock();
  const updateDay = useUpdateHrAttendanceDay();
  const importTimesheets = useImportHrTimesheets();

  const historyDaysRaw = history?.days ?? [];
  const historyDays = isFullHr || selfEmployeeId == null
    ? historyDaysRaw
    : historyDaysRaw.filter((d) => d.employee_id === selfEmployeeId);

  const historyEventsRaw = history?.events ?? [];
  const historyEvents = isFullHr || selfEmployeeId == null
    ? historyEventsRaw
    : historyEventsRaw.filter((e) => e.employee_id === selfEmployeeId);

  const monthEventsRaw = monthAttendance?.events ?? [];
  const monthEventsScoped = isFullHr || selfEmployeeId == null
    ? monthEventsRaw
    : monthEventsRaw.filter((e) => e.employee_id === selfEmployeeId);
  const monthEvents = [...monthEventsScoped].sort((a, b) => {
    const aAt = a.occurred_at ?? '';
    const bAt = b.occurred_at ?? '';
    return bAt.localeCompare(aAt);
  });

  const dayDays = historyDays.filter((d) => d.work_date.slice(0, 10) === workDate);

  const hoursTrend = (() => {
    const byDate = new Map<string, number>();
    for (let cursor = rangeFrom; cursor <= rangeTo; cursor = addDays(cursor, 1)) {
      byDate.set(cursor, 0);
    }
    for (const day of historyDays) {
      const key = day.work_date.slice(0, 10);
      if (!byDate.has(key)) continue;
      byDate.set(key, (byDate.get(key) ?? 0) + (day.minutes_worked ?? 0));
    }
    return [...byDate.entries()].map(([date, minutes]) => ({
      date,
      label: shortDayLabel(date),
      hours: Math.round((minutes / 60) * 10) / 10,
      minutes,
    }));
  })();

  const statusBreakdown = (() => {
    const counts: Record<AttendanceDayStatus, number> = {
      present: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
    };
    for (const day of historyDays) {
      counts[day.status] = (counts[day.status] ?? 0) + 1;
    }
    return (Object.keys(counts) as AttendanceDayStatus[])
      .map((status) => ({ status, label: status, value: counts[status] }))
      .filter((row) => row.value > 0);
  })();

  const presenceTrend = (() => {
    const byDate = new Map<string, { present: number; absent: number; leave: number; holiday: number }>();
    for (let cursor = rangeFrom; cursor <= rangeTo; cursor = addDays(cursor, 1)) {
      byDate.set(cursor, { present: 0, absent: 0, leave: 0, holiday: 0 });
    }
    for (const day of historyDays) {
      const key = day.work_date.slice(0, 10);
      const bucket = byDate.get(key);
      if (!bucket) continue;
      bucket[day.status] += 1;
    }
    return [...byDate.entries()].map(([date, counts]) => ({
      date,
      label: shortDayLabel(date),
      ...counts,
    }));
  })();

  const totalMinutes = historyDays.reduce((sum, d) => sum + (d.minutes_worked ?? 0), 0);
  const presentDays = historyDays.filter((d) => d.status === 'present').length;
  const avgMinutes = historyDays.length > 0 ? Math.round(totalMinutes / historyDays.length) : 0;
  const punchesInRange = historyEvents.length;

  async function handleClock(e: React.FormEvent) {
    e.preventDefault();
    const id = isFullHr ? employeeId : (selfEmployee ? String(selfEmployee.id) : '');
    if (!id) return;
    await clock.mutateAsync({
      employee_id: Number(id),
      type: clockType,
      occurred_at: new Date().toISOString(),
    });
  }

  async function handleStatusChange(day: HrAttendanceDay, status: AttendanceDayStatus) {
    if (!isFullHr) return;
    await updateDay.mutateAsync({
      employee_id: day.employee_id,
      work_date: day.work_date.slice(0, 10),
      status,
    });
  }

  async function handleImportTimesheets() {
    if (!isFullHr) return;
    await importTimesheets.mutateAsync({
      date_from: workDate,
      date_to: workDate,
    });
  }

  return (
    <div className={TALENT_SURFACE.canvas}>
      <div className={TALENT_SURFACE.canvasGlow} aria-hidden />
      <div className={TALENT_SURFACE.canvasMesh} aria-hidden />

      <div className={TALENT_SURFACE.content}>
        <HrAttendanceHero
          isFullHr={isFullHr}
          workDate={workDate}
          onWorkDateChange={setWorkDate}
          historyRange={historyRange}
          onHistoryRangeChange={setHistoryRange}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          employees={employees}
          chartEmployeeId={chartEmployeeId}
          onChartEmployeeChange={setChartEmployeeId}
          importPending={importTimesheets.isPending}
          onImport={() => void handleImportTimesheets()}
        />

        <AttendanceClockForm
          isFullHr={isFullHr}
          selfEmployeeName={selfEmployee ? employeeDisplayName(selfEmployee) : null}
          selfEmployeeLinked={!!selfEmployee}
          employees={employees}
          employeeId={employeeId}
          onEmployeeIdChange={setEmployeeId}
          clockType={clockType}
          onClockTypeChange={setClockType}
          submitting={clock.isPending}
          onSubmit={(e) => void handleClock(e)}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HrMetricCard label="Hours in range" value={hoursLabel(totalMinutes)} hint={`${historyDays.length} day records`} />
          <HrMetricCard label="Days present" value={String(presentDays)} hint={`of ${historyDays.length || 0} recorded`} />
          <HrMetricCard label="Avg / recorded day" value={hoursLabel(avgMinutes)} hint="Minutes worked average" />
          <HrMetricCard label="Punches" value={String(punchesInRange)} hint={`Events · ${workDate} focus`} />
        </div>

        {loadingHistory ? (
          <div className={cn(TALENT_SURFACE.panel, 'flex justify-center py-16')}>
            <CustosellLoader />
          </div>
        ) : (
          <>
            <HrAttendanceCharts
              hoursTrend={hoursTrend}
              statusBreakdown={statusBreakdown}
              presenceTrend={presenceTrend}
            />

            <HrAttendancePanels
              isFullHr={isFullHr}
              workDate={workDate}
              monthFrom={monthFrom}
              dayDays={dayDays}
              loadingMonthEvents={loadingMonthEvents}
              monthEvents={monthEvents}
              posShifts={posShifts as HrPosShiftView[]}
              updateDayPending={updateDay.isPending}
              onStatusChange={(day, status) => void handleStatusChange(day, status)}
            />
          </>
        )}
      </div>
    </div>
  );
}
