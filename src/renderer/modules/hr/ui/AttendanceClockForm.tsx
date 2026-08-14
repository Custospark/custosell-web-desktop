import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { TALENT_SURFACE } from './talentSurface';
import { HrFormSection, HrIconField, hrSelectClass } from './hrFormFields';
import { employeeDisplayName, type AttendanceEventType, type HrEmployee } from '../api/hrTypes';
import { LogIn, LogOut, User, Users } from 'lucide-react';

interface AttendanceClockFormProps {
  isFullHr: boolean;
  selfEmployeeName?: string | null;
  selfEmployeeLinked: boolean;
  employees: HrEmployee[];
  employeeId: string;
  onEmployeeIdChange: (value: string) => void;
  clockType: AttendanceEventType;
  onClockTypeChange: (type: AttendanceEventType) => void;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
}

export default function AttendanceClockForm({
  isFullHr,
  selfEmployeeName,
  selfEmployeeLinked,
  employees,
  employeeId,
  onEmployeeIdChange,
  clockType,
  onClockTypeChange,
  submitting,
  onSubmit,
}: AttendanceClockFormProps) {
  return (
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
          : selfEmployeeLinked
            ? `Punching as ${selfEmployeeName} - only you can do this for your own account.`
            : 'Your login is not linked to an HR profile yet. Ask an HR admin to link you.'}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <HrFormSection title="Punch" icon={User}>
          <div className="grid gap-4 sm:grid-cols-2">
            {isFullHr ? (
              <HrIconField label="Employee" icon={Users} required>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => onEmployeeIdChange(e.target.value)}
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
                onChange={(e) => onClockTypeChange(e.target.value as AttendanceEventType)}
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
              loading={submitting}
              disabled={!isFullHr && !selfEmployeeLinked}
              className="inline-flex items-center gap-2 shadow-sm"
            >
              {clockType === 'clock_out' ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isFullHr ? 'Record punch' : 'Submit'}
            </Button>
          </div>
        </HrFormSection>
      </form>
    </div>
  );
}
