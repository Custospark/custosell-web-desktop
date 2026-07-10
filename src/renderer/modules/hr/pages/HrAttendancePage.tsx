import { useMemo, useState } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
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
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

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
    <div className="space-y-4">
      <HrPageHeader
        title="Attendance"
        description="Clock in/out and review the daily register. Correct day status when needed."
      />

      <HrSectionCard title="Clock" description="Record a punch for an employee">
        <form onSubmit={handleClock} className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700">Employee</span>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-[160px] text-sm">
            <span className="mb-1 block font-medium text-gray-700">Event</span>
            <select
              value={clockType}
              onChange={(e) => setClockType(e.target.value as AttendanceEventType)}
              className={inputClass}
            >
              <option value="clock_in">Clock in</option>
              <option value="clock_out">Clock out</option>
              <option value="break_start">Break start</option>
              <option value="break_end">Break end</option>
            </select>
          </label>
          <Button type="submit" loading={clock.isPending} className="inline-flex items-center gap-2">
            {clockType === 'clock_out' ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            Record
          </Button>
        </form>
      </HrSectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Work date
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          loading={importTimesheets.isPending}
          onClick={() => void handleImportTimesheets()}
        >
          Import approved timesheets
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : days.length === 0 && events.length === 0 ? (
        <HrEmptyState
          icon={<Clock className="h-6 w-6" />}
          title="No attendance for this day"
          description="Clock an employee in, or pick another date to review the register."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <HrSectionCard title="Daily register">
            {days.length === 0 ? (
              <p className="text-sm text-gray-500">No day summaries yet — events may still appear on the right.</p>
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

          <HrSectionCard title="Clock events">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No punch events for this filter.</p>
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
            title="POS shifts (read-only)"
            description="Sales-floor clock-in from Shifts — not the same as HR attendance."
          >
            {posShifts.length === 0 ? (
              <p className="text-sm text-gray-500">No POS shifts for this date.</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {posShifts.map((shift) => (
                  <li key={shift.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-medium text-gray-900">
                        {shift.employee_name ?? `User #${shift.user_id}`}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{shift.status}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{shift.clock_in ? new Date(shift.clock_in).toLocaleTimeString() : '—'}</p>
                      <p>{shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString() : 'open'}</p>
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
