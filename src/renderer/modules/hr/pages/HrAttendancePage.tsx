import { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  LogIn,
  LogOut,
  User,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useHrAttendance,
  useHrClock,
  useHrEmployees,
  useHrPosShifts,
  useImportHrTimesheets,
  useUpdateHrAttendanceDay,
} from '../api/useHrQueries';
import type { AttendanceDayStatus, AttendanceEventType } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { AttendanceStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HrFormSection, HrIconField, hrInputClass, hrSelectClass } from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function HrAttendancePage() {
  const [workDate, setWorkDate] = useState(todayIso());
  const [employeeId, setEmployeeId] = useState('');
  const [clockType, setClockType] = useState<AttendanceEventType>('clock_in');

  const { data: employees = [] } = useHrEmployees({ status: 'active' });
  const { data: register, isLoading } = useHrAttendance({ work_date: workDate });
  const { data: posShifts = [] } = useHrPosShifts({ work_date: workDate });
  const clock = useHrClock();
  const updateDay = useUpdateHrAttendanceDay();
  const importTimesheets = useImportHrTimesheets();

  const days = useMemo(() => register?.days ?? [], [register]);
  const events = useMemo(() => register?.events ?? [], [register]);

  async function handleClock(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    await clock.mutateAsync({
      employee_id: Number(employeeId),
      type: clockType,
      occurred_at: new Date().toISOString(),
    });
  }

  async function handleStatusChange(day: { id: number; employee_id: number; work_date: string }, status: AttendanceDayStatus) {
    await updateDay.mutateAsync({
      employee_id: day.employee_id,
      work_date: day.work_date.slice(0, 10),
      status,
    });
  }

  async function handleImportTimesheets() {
    await importTimesheets.mutateAsync({
      date_from: workDate,
      date_to: workDate,
    });
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Clock}
        title="Attendance"
        description="Record punches, review the daily register, and correct status when someone was on leave or absent."
      />

      <HrSectionCard title="Record a punch" description="Clock someone in or out — the time stamp is captured now.">
        <form onSubmit={handleClock} className="space-y-4">
          <HrFormSection title="Who & what" icon={User} description="Pick the employee and the type of punch.">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <Button type="submit" loading={clock.isPending} className="inline-flex items-center gap-2">
                {clockType === 'clock_out' ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                Record punch
              </Button>
            </div>
          </HrFormSection>
        </form>
      </HrSectionCard>

      <div className={HR_SURFACE.toolbar}>
        <HrIconField label="Work date" icon={Calendar}>
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className={hrInputClass}
          />
        </HrIconField>
        <Button
          type="button"
          variant="outline"
          loading={importTimesheets.isPending}
          onClick={() => void handleImportTimesheets()}
          className="inline-flex items-center gap-2 self-end"
        >
          <Download className="h-4 w-4" />
          Import approved timesheets
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : days.length === 0 && events.length === 0 ? (
        <HrEmptyState
          icon={<Clock className="h-6 w-6" />}
          title="Quiet day so far"
          description="No punches recorded for this date. Clock someone in above, or pick another day to review history."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HrSectionCard title="Daily register" description="Summary per employee — adjust status if needed.">
            {days.length === 0 ? (
              <p className="text-sm text-gray-500">No day summaries yet — individual punch events may still appear on the right.</p>
            ) : (
              <div className={HR_SURFACE.tableWrap}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Minutes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {days.map((day) => (
                      <tr key={day.id}>
                        <td className="px-3 py-2">
                          {day.employee ? employeeDisplayName(day.employee) : `#${day.employee_id}`}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={day.status}
                            onChange={(e) => handleStatusChange(day, e.target.value as AttendanceDayStatus)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                            disabled={updateDay.isPending}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="holiday">Holiday</option>
                          </select>
                          <div className="mt-1">
                            <AttendanceStatusBadge status={day.status} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{day.minutes_worked ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HrSectionCard>

          <HrSectionCard title="Clock events" description="Every punch in chronological order.">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No punch events for this date yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-medium text-gray-900">
                        {ev.employee ? employeeDisplayName(ev.employee) : `#${ev.employee_id}`}
                      </p>
                      <p className="text-xs capitalize text-gray-500">{ev.type.replace(/_/g, ' ')}</p>
                    </div>
                    <time className="text-xs text-gray-500">
                      {new Date(ev.occurred_at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </HrSectionCard>

          <HrSectionCard
            title="POS shifts"
            description="Sales-floor clock-ins from Shifts — separate from HR attendance punches."
            className="lg:col-span-2"
          >
            {posShifts.length === 0 ? (
              <p className="text-sm text-gray-500">No POS shifts for this date — that&apos;s normal if nobody opened a sales shift.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {posShifts.map((shift) => (
                  <li key={shift.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-medium text-gray-900">
                        {shift.employee_name ?? `User #${shift.user_id}`}
                      </p>
                      <p className="text-xs capitalize text-gray-500">{shift.status}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{shift.clock_in ? new Date(shift.clock_in).toLocaleTimeString() : '—'}</p>
                      <p>{shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString() : 'still open'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HrSectionCard>
        </div>
      )}
    </div>
  );
}
