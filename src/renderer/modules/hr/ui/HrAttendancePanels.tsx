import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import { TALENT_SURFACE } from './talentSurface';
import { AttendanceStatusBadge } from './HrStatusBadges';
import { hoursLabel, monthLabel } from './attendanceUtils';
import { formatShiftDateTime, formatShiftDate, formatShiftTime } from '../../../shared/utils/formatDateTime';
import { employeeDisplayName, type AttendanceDayStatus, type HrAttendanceDay, type HrAttendanceEvent } from '../api/hrTypes';

export interface HrPosShiftView {
  id: number;
  user_id: number;
  employee_id: number | null;
  employee_name: string | null;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  total_sales: number;
}

interface HrAttendancePanelsProps {
  isFullHr: boolean;
  workDate: string;
  monthFrom: string;
  dayDays: HrAttendanceDay[];
  loadingMonthEvents: boolean;
  monthEvents: HrAttendanceEvent[];
  posShifts: HrPosShiftView[];
  updateDayPending: boolean;
  onStatusChange: (day: HrAttendanceDay, status: AttendanceDayStatus) => void;
}

export default function HrAttendancePanels({
  isFullHr,
  workDate,
  monthFrom,
  dayDays,
  loadingMonthEvents,
  monthEvents,
  posShifts,
  updateDayPending,
  onStatusChange,
}: HrAttendancePanelsProps) {
  return (
    <>
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
                        onChange={(e) => onStatusChange(day, e.target.value as AttendanceDayStatus)}
                        className="rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-xs text-slate-800 shadow-sm"
                        disabled={updateDayPending}
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
  );
}
