import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calendar,
  Clock,
  Download,
  LogIn,
  LogOut,
  Timer,
  User,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';
import { formatShiftDate, formatShiftDateTime, formatShiftTime } from '../../../shared/utils/formatDateTime';
import { cn } from '../../../shared/utils/cn';
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
import { AttendanceStatusBadge } from '../ui/HrStatusBadges';
import { HrFormSection, HrIconField, hrSelectClass } from '../ui/hrFormFields';
import { TALENT_SURFACE } from '../ui/talentSurface';

type HistoryRange = 'week' | 'month';

const STATUS_COLORS: Record<AttendanceDayStatus, string> = {
  present: '#10b981',
  absent: '#ef4444',
  leave: '#f59e0b',
  holiday: '#6366f1',
};

function todayIso() {
  const d = new Date();
  return toIsoDate(d);
}

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function shortDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startOfMonthIso(d = new Date()) {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonthIso(d = new Date()) {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function monthLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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
  /** Clock events panel always shows the current calendar month. */
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
                  onChange={(e) => setWorkDate(e.target.value)}
                  className={TALENT_SURFACE.input}
                />
              </div>
              <div className={TALENT_SURFACE.chipGroup}>
                <button
                  type="button"
                  onClick={() => setHistoryRange('week')}
                  className={cn(TALENT_SURFACE.chip, historyRange === 'week' && TALENT_SURFACE.chipActive)}
                >
                  Last 7 days
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryRange('month')}
                  className={cn(TALENT_SURFACE.chip, historyRange === 'month' && TALENT_SURFACE.chipActive)}
                >
                  Last 30 days
                </button>
              </div>
            </div>
          </div>

          <p className={cn('mt-3 text-xs', TALENT_SURFACE.textMuted)}>
            Charts · {formatShiftDate(rangeFrom)} - {formatShiftDate(rangeTo)}
            {(() => {
              if (!isFullHr) return '';
              const selected = employees.find((e) => e.id === Number(chartEmployeeId));
              return selected ? ` · ${employeeDisplayName(selected)}` : ' · whole team';
            })()}
          </p>
        </div>

        <div className={TALENT_SURFACE.panel}>
          <div className="mb-3 flex items-center gap-2">
            <LogIn className="h-4 w-4 text-violet-600" />
            <h2 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>
              {isFullHr ? 'Record a punch' : 'Clock in / out'}
            </h2>
          </div>
          <p className={cn('mb-4 text-xs', TALENT_SURFACE.textMuted)}>
            {isFullHr
              ? 'Clock someone in or out - the timestamp is captured now.'
              : selfEmployee
                ? `Punching as ${employeeDisplayName(selfEmployee)} - only you can do this for your own account.`
                : 'Your login is not linked to an HR profile yet. Ask an HR admin to link you.'}
          </p>
          <form onSubmit={(e) => void handleClock(e)} className="space-y-4">
            <HrFormSection title="Punch" icon={User}>
              <div className="grid gap-4 sm:grid-cols-2">
                {isFullHr ? (
                  <HrIconField label="Employee" icon={Users} required>
                    <select
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className={hrSelectClass}
                    >
                      <option value="">Select someone…</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                      ))}
                    </select>
                  </HrIconField>
                ) : null}
                <HrIconField label="Event type" icon={clockType === 'clock_out' ? LogOut : LogIn}>
                  <select
                    value={clockType}
                    onChange={(e) => setClockType(e.target.value as AttendanceEventType)}
                    className={hrSelectClass}
                  >
                    <option value="clock_in">Clock in</option>
                    <option value="clock_out">Clock out</option>
                    <option value="break_start">Break start</option>
                    <option value="break_end">Break end</option>
                  </select>
                </HrIconField>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  loading={clock.isPending}
                  disabled={!isFullHr && !selfEmployee}
                  className="inline-flex items-center gap-2 shadow-sm"
                >
                  {clockType === 'clock_out' ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {isFullHr ? 'Record punch' : 'Submit'}
                </Button>
              </div>
            </HrFormSection>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Hours in range" value={hoursLabel(totalMinutes)} hint={`${historyDays.length} day records`} />
          <MetricCard label="Days present" value={String(presentDays)} hint={`of ${historyDays.length || 0} recorded`} />
          <MetricCard label="Avg / recorded day" value={hoursLabel(avgMinutes)} hint="Minutes worked average" />
          <MetricCard label="Punches" value={String(punchesInRange)} hint={`Events · ${formatShiftDate(workDate)} focus`} />
        </div>

        {isFullHr ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={cn('mb-1 block text-[11px] font-medium', TALENT_SURFACE.textMuted)}>Chart employee</label>
              <select
                value={chartEmployeeId}
                onChange={(e) => setChartEmployeeId(e.target.value)}
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
              loading={importTimesheets.isPending}
              onClick={() => void handleImportTimesheets()}
              className="inline-flex items-center gap-2 border-white/60 bg-white/80"
            >
              <Download className="h-4 w-4" />
              Import timesheets (focus day)
            </Button>
          </div>
        ) : null}

        {loadingHistory ? (
          <div className={cn(TALENT_SURFACE.panel, 'flex justify-center py-16')}>
            <CustosellLoader />
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className={TALENT_SURFACE.chartPanel}>
                <div className="mb-3 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-violet-600" />
                  <div>
                    <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Hours over time</h3>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Minutes worked by day in the selected range</p>
                  </div>
                </div>
                {hoursTrend.every((row) => row.minutes === 0) ? (
                  <EmptyChart message="No worked minutes in this range yet - clock in to start the trend." />
                ) : (
                  <div className={TALENT_SURFACE.chartWell}>
                    <ChartContainer className="h-72">
                      {({ width, height }) => (
                        <BarChart width={width} height={height} data={hoursTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="h" />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(255,255,255,0.88)',
                              border: '1px solid rgba(255,255,255,0.7)',
                              borderRadius: 12,
                              backdropFilter: 'blur(12px)',
                              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                            }}
                            formatter={(value) => [`${value} h`, 'Hours']}
                            labelFormatter={(_, payload) => {
                              const row = payload?.[0]?.payload as { date?: string } | undefined;
                              return row?.date ? formatShiftDate(row.date) : '';
                            }}
                          />
                          <Bar dataKey="hours" name="Hours" fill="#8b5cf6" radius={[6, 6, 0, 0]} fillOpacity={0.9} />
                        </BarChart>
                      )}
                    </ChartContainer>
                  </div>
                )}
              </div>

              <div className={TALENT_SURFACE.chartPanel}>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  <div>
                    <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Presence mix</h3>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Status breakdown for the range</p>
                  </div>
                </div>
                {statusBreakdown.length === 0 ? (
                  <EmptyChart message="No day summaries yet for this range." />
                ) : (
                  <div className={TALENT_SURFACE.chartWell}>
                    <ChartContainer className="h-72">
                      {({ width, height }) => (
                        <PieChart width={width} height={height}>
                          <Pie
                            data={statusBreakdown}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                          >
                            {statusBreakdown.map((row) => (
                              <Cell key={row.status} fill={STATUS_COLORS[row.status]} fillOpacity={0.92} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(255,255,255,0.88)',
                              border: '1px solid rgba(255,255,255,0.7)',
                              borderRadius: 12,
                              backdropFilter: 'blur(12px)',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      )}
                    </ChartContainer>
                  </div>
                )}
              </div>
            </div>

            <div className={TALENT_SURFACE.chartPanel}>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                <div>
                  <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Daily presence</h3>
                  <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>Present / absent / leave / holiday by day</p>
                </div>
              </div>
              {presenceTrend.every((row) => row.present + row.absent + row.leave + row.holiday === 0) ? (
                <EmptyChart message="No presence records in this range yet." />
              ) : (
                <div className={TALENT_SURFACE.chartWell}>
                  <ChartContainer className="h-72">
                    {({ width, height }) => (
                      <LineChart width={width} height={height} data={presenceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(255,255,255,0.88)',
                            border: '1px solid rgba(255,255,255,0.7)',
                            borderRadius: 12,
                            backdropFilter: 'blur(12px)',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="leave" name="Leave" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="holiday" name="Holiday" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    )}
                  </ChartContainer>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className={TALENT_SURFACE.panel}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Daily register</h3>
                    <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                      Focus day · {formatShiftDate(workDate)}
                    </p>
                  </div>
                </div>
                {dayDays.length === 0 ? (
                  <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>
                    No day summaries for this date yet - punch events may still appear on the right.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayDays.map((day) => (
                      <div key={day.id} className={TALENT_SURFACE.rowCard}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
                              {day.employee ? employeeDisplayName(day.employee) : `#${day.employee_id}`}
                            </p>
                            <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                              {day.minutes_worked != null ? hoursLabel(day.minutes_worked) : 'No minutes yet'}
                            </p>
                          </div>
                          {isFullHr ? (
                            <select
                              value={day.status}
                              onChange={(e) => void handleStatusChange(day, e.target.value as AttendanceDayStatus)}
                              className="rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-xs text-slate-800 shadow-sm"
                              disabled={updateDay.isPending}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="leave">Leave</option>
                              <option value="holiday">Holiday</option>
                            </select>
                          ) : (
                            <AttendanceStatusBadge status={day.status} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={TALENT_SURFACE.panel}>
                <div className="mb-3">
                  <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Clock events</h3>
                  <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                    Punches this month · {monthLabel(monthFrom)}
                  </p>
                </div>
                {loadingMonthEvents ? (
                  <div className="flex justify-center py-8">
                    <CustosellLoader />
                  </div>
                ) : monthEvents.length === 0 ? (
                  <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>
                    No punch events this month yet.
                  </p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {monthEvents.map((ev) => (
                      <li key={ev.id} className={cn(TALENT_SURFACE.rowCard, 'flex items-center justify-between gap-3')}>
                        <div>
                          <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
                            {ev.employee ? employeeDisplayName(ev.employee) : `#${ev.employee_id}`}
                          </p>
                          <p className={cn('text-xs capitalize', TALENT_SURFACE.textMuted)}>
                            {ev.type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <time className={cn('shrink-0 text-xs', TALENT_SURFACE.textMuted)}>
                          {formatShiftDateTime(ev.occurred_at)}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {isFullHr ? (
              <div className={TALENT_SURFACE.panel}>
                <div className="mb-3">
                  <h3 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>POS shifts</h3>
                  <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                    Sales-floor clock-ins from Shifts - separate from HR attendance punches · {formatShiftDate(workDate)}
                  </p>
                </div>
                {posShifts.length === 0 ? (
                  <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>No POS shifts for this date.</p>
                ) : (
                  <ul className="space-y-2">
                    {posShifts.map((shift) => (
                      <li key={shift.id} className={cn(TALENT_SURFACE.rowCard, 'flex items-center justify-between gap-3')}>
                        <div>
                          <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
                            {shift.employee_name ?? `User #${shift.user_id}`}
                          </p>
                          <p className={cn('text-xs capitalize', TALENT_SURFACE.textMuted)}>{shift.status}</p>
                        </div>
                        <div className={cn('text-right text-xs', TALENT_SURFACE.textMuted)}>
                          <p>{formatShiftTime(shift.clock_in)}</p>
                          <p>{shift.clock_out ? formatShiftTime(shift.clock_out) : 'still open'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={TALENT_SURFACE.metricCard}>
      <p className={cn('text-xs font-medium', TALENT_SURFACE.textMuted)}>{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', TALENT_SURFACE.textTitle)}>{value}</p>
      <p className={cn('mt-1 text-[11px]', TALENT_SURFACE.textMuted)}>{hint}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center px-6 text-center">
      <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>{message}</p>
    </div>
  );
}
