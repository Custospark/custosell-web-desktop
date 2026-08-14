import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import { OnboardingTaskStatusBadge } from './HrStatusBadges';
import { TALENT_SURFACE } from './talentSurface';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { employeeDisplayName, type OnboardingTaskStatus } from '../api/hrTypes';
import type { HrOnboardingTask, HrOnboardingTemplate } from '../api/hrTypes';
import { ClipboardCheck, ClipboardList, Plus } from 'lucide-react';

interface HrOnboardingTabProps {
  isFullHr: boolean;
  templates: HrOnboardingTemplate[];
  tasks: HrOnboardingTask[];
  loadingTasks: boolean;
  updateTaskPending: boolean;
  onOpenTemplate: () => void;
  onOpenTask: () => void;
  onUpdateTask: (id: number, status: OnboardingTaskStatus) => void;
}

export default function HrOnboardingTab({
  isFullHr,
  templates,
  tasks,
  loadingTasks,
  updateTaskPending,
  onOpenTemplate,
  onOpenTask,
  onUpdateTask,
}: HrOnboardingTabProps) {
  return (
    <div className="space-y-5">
      {isFullHr ? (
        <div className={TALENT_SURFACE.panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-600" />
              <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Onboarding templates</h4>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenTemplate}
              className="border-white/60 bg-white/80"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Template
            </Button>
          </div>
          {templates.length === 0 ? (
            <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>
              No templates yet - create a reusable checklist so every new hire gets the same warm welcome.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <div key={t.id} className={TALENT_SURFACE.rowCard}>
                  <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>{t.name}</p>
                  <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                    {(t.tasks_json?.length ?? 0)} task{(t.tasks_json?.length ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className={TALENT_SURFACE.panel}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-violet-600" />
            <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>
              {isFullHr ? 'Onboarding tasks' : 'My onboarding checklist'}
            </h4>
          </div>
          {isFullHr ? (
            <Button size="sm" variant="outline" onClick={onOpenTask} className="border-white/60 bg-white/80">
              <Plus className="mr-1 h-3.5 w-3.5" /> Task
            </Button>
          ) : null}
        </div>

        {loadingTasks ? (
          <div className="flex justify-center py-10"><CustosellLoader /></div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-slate-600 shadow-sm">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className={cn('text-base font-semibold', TALENT_SURFACE.textTitle)}>No onboarding tasks yet</h3>
              <p className={cn('mt-1.5 max-w-md text-sm', TALENT_SURFACE.textMuted)}>
                {isFullHr
                  ? 'Assign tasks to employees in onboarding - mark them done as each step is completed.'
                  : 'When HR assigns onboarding tasks, they will show up here.'}
              </p>
            </div>
            {isFullHr ? (
              <Button size="sm" variant="outline" onClick={onOpenTask} className="border-white/60 bg-white/80">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add a task
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const done = task.status === 'done';
              return (
                <div key={task.id} className={TALENT_SURFACE.rowCard}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>{task.title}</p>
                      <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                        {task.employee ? employeeDisplayName(task.employee) : `#${task.employee_id}`}
                        {task.due_date ? ` · due ${formatShiftDate(task.due_date)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OnboardingTaskStatusBadge status={task.status} />
                      <select
                        value={task.status}
                        disabled={updateTaskPending}
                        onChange={(e) => onUpdateTask(task.id, e.target.value as OnboardingTaskStatus)}
                        className="rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-xs text-slate-800 shadow-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="done">Done</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className={TALENT_SURFACE.barTrack}>
                      <div
                        className={cn(TALENT_SURFACE.barFill, done && 'bg-emerald-500')}
                        style={{ width: done ? '100%' : task.status === 'skipped' ? '100%' : '12%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
