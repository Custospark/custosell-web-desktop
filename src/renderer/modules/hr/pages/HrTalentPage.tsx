import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  MessageSquare,
  Plus,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import {
  useCreateHrOnboardingTask,
  useCreateHrOnboardingTemplate,
  useCreateHrReview,
  useHrEmployees,
  useHrOnboardingTasks,
  useHrOnboardingTemplates,
  useHrPerformanceByUser,
  useHrReviews,
  useUpdateHrOnboardingTask,
  useUpdateHrReview,
} from '../api/useHrQueries';
import type { OnboardingTaskStatus, ReviewStatus } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { OnboardingTaskStatusBadge, ReviewStatusBadge } from '../ui/HrStatusBadges';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { HrWorkPerformancePanel } from '../ui/HrWorkPerformancePanel';
import { TALENT_SURFACE } from '../ui/talentSurface';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';
import { cn } from '../../../shared/utils/cn';
import { PROGRESS_PERIOD_OPTIONS, type ProgressPeriod } from '../../pipeline/api/pipelineProgressTerms';

type TalentTab = 'performance' | 'onboarding' | 'reviews';

export default function HrTalentPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isFullHr = canViewFullHr(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEmployeeId = Number(searchParams.get('employee_id') || '') || null;
  const deepLinkUserId = Number(searchParams.get('user_id') || '') || null;
  const tabParam = searchParams.get('tab');
  const tab: TalentTab =
    tabParam === 'onboarding' || tabParam === 'reviews' || tabParam === 'performance'
      ? tabParam
      : 'performance';
  const periodParam = searchParams.get('period');
  const period: ProgressPeriod =
    periodParam === 'day' || periodParam === 'week' || periodParam === 'month'
      || periodParam === 'quarter' || periodParam === 'year' || periodParam === 'custom'
      ? periodParam
      : 'month';
  const customFrom = searchParams.get('from') ?? '';
  const customTo = searchParams.get('to') ?? '';
  const periodFilters = {
    period,
    from: period === 'custom' ? customFrom || undefined : undefined,
    to: period === 'custom' ? customTo || undefined : undefined,
  };

  const { data: templates = [] } = useHrOnboardingTemplates(isFullHr);
  const { data: tasks = [], isLoading: loadingTasks } = useHrOnboardingTasks();
  const { data: reviews = [], isLoading: loadingReviews } = useHrReviews(undefined, isFullHr);
  const { data: employees = [] } = useHrEmployees();
  const { data: byUserSnapshot } = useHrPerformanceByUser(
    deepLinkUserId,
    periodFilters,
    !!deepLinkUserId && !selectedEmployeeId,
  );
  const createTemplate = useCreateHrOnboardingTemplate();
  const createTask = useCreateHrOnboardingTask();
  const updateTask = useUpdateHrOnboardingTask();
  const createReview = useCreateHrReview();
  const updateReview = useUpdateHrReview();

  const selfEmployee = employees.find((e) => e.user_id != null && user?.id != null && e.user_id === user.id) ?? null;
  const visibleTasks = isFullHr || !selfEmployee
    ? tasks
    : tasks.filter((t) => t.employee_id === selfEmployee.id);

  useEffect(() => {
    if (!byUserSnapshot?.employee?.id || selectedEmployeeId) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('employee_id', String(byUserSnapshot.employee.id));
      next.delete('user_id');
      next.set('tab', 'performance');
      return next;
    }, { replace: true });
  }, [byUserSnapshot?.employee?.id, selectedEmployeeId, setSearchParams]);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateTasks, setTemplateTasks] = useState('Welcome pack\nIT setup\nPolicy acknowledgment');
  const [taskForm, setTaskForm] = useState({ employee_id: '', title: '', due_date: '', template_id: '' });
  const [reviewForm, setReviewForm] = useState({
    employee_id: '',
    period_label: '',
    rating: '',
    strengths: '',
    improvements: '',
  });

  function selectTab(next: TalentTab) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tab', next);
      return params;
    }, { replace: true });
  }

  function selectPeriod(next: ProgressPeriod) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('period', next);
      if (next !== 'custom') {
        params.delete('from');
        params.delete('to');
      }
      return params;
    }, { replace: true });
  }

  function setCustomRange(from: string, to: string) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('period', 'custom');
      if (from) params.set('from', from);
      else params.delete('from');
      if (to) params.set('to', to);
      else params.delete('to');
      return params;
    }, { replace: true });
  }

  function selectPerformanceEmployee(employeeId: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('employee_id', String(employeeId));
      next.delete('user_id');
      next.set('tab', 'performance');
      return next;
    });
  }

  async function handleTemplate(e: React.FormEvent) {
    e.preventDefault();
    const tasksJson = templateTasks
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title) => ({ title }));
    await createTemplate.mutateAsync({ name: templateName.trim(), tasks_json: tasksJson });
    setTemplateOpen(false);
    setTemplateName('');
  }

  async function handleTask(e: React.FormEvent) {
    e.preventDefault();
    await createTask.mutateAsync({
      employee_id: Number(taskForm.employee_id),
      title: taskForm.title.trim(),
      due_date: taskForm.due_date || null,
      template_id: taskForm.template_id ? Number(taskForm.template_id) : null,
    });
    setTaskOpen(false);
    setTaskForm({ employee_id: '', title: '', due_date: '', template_id: '' });
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    await createReview.mutateAsync({
      employee_id: Number(reviewForm.employee_id),
      period_label: reviewForm.period_label.trim(),
      rating: reviewForm.rating ? Number(reviewForm.rating) : null,
      strengths: reviewForm.strengths || null,
      improvements: reviewForm.improvements || null,
      status: 'draft',
    });
    setReviewOpen(false);
    setReviewForm({ employee_id: '', period_label: '', rating: '', strengths: '', improvements: '' });
  }

  const pendingOnboarding = visibleTasks.filter((t) => t.status === 'pending').length;
  const draftReviews = reviews.filter((r) => r.status === 'draft').length;

  return (
    <div className={TALENT_SURFACE.canvas}>
      <div className={TALENT_SURFACE.canvasGlow} aria-hidden />
      <div className={TALENT_SURFACE.canvasMesh} aria-hidden />

      <div className={TALENT_SURFACE.content}>
        <div className={TALENT_SURFACE.hero}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
                <h1 className={cn('text-xl font-bold', TALENT_SURFACE.textTitle)}>Talent</h1>
              </div>
              <p className={cn('mt-1 max-w-2xl text-sm', TALENT_SURFACE.textBody)}>
                {isFullHr
                  ? 'Evaluate goal pace from Pipeline & Projects, guide onboarding, and run performance reviews — the same frosted Progress experience, for people.'
                  : 'Your onboarding checklist and personal work progress from boards and projects.'}
              </p>
            </div>

            {isFullHr ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTemplateOpen(true)}
                  className="inline-flex items-center gap-1.5 border-white/60 bg-white/80 backdrop-blur-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTaskOpen(true)}
                  className="inline-flex items-center gap-1.5 border-white/60 bg-white/80 backdrop-blur-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Task
                </Button>
                <Button size="sm" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Review
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/40 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={TALENT_SURFACE.chipGroup}>
                {PROGRESS_PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectPeriod(option.value)}
                    className={cn(TALENT_SURFACE.chip, period === option.value && TALENT_SURFACE.chipActive)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {period === 'custom' ? (
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomRange(e.target.value, customTo)}
                  className={TALENT_SURFACE.input}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomRange(customFrom, e.target.value)}
                  className={TALENT_SURFACE.input}
                  aria-label="To date"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={TALENT_SURFACE.chipGroup}>
              <button
                type="button"
                onClick={() => selectTab('performance')}
                className={cn(TALENT_SURFACE.chip, tab === 'performance' && TALENT_SURFACE.chipActive)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {isFullHr ? 'Work performance' : 'My progress'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => selectTab('onboarding')}
                className={cn(TALENT_SURFACE.chip, tab === 'onboarding' && TALENT_SURFACE.chipActive)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Onboarding
                  {pendingOnboarding > 0 ? (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      tab === 'onboarding' ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700',
                    )}>
                      {pendingOnboarding}
                    </span>
                  ) : null}
                </span>
              </button>
              {isFullHr ? (
                <button
                  type="button"
                  onClick={() => selectTab('reviews')}
                  className={cn(TALENT_SURFACE.chip, tab === 'reviews' && TALENT_SURFACE.chipActive)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    Reviews
                    {draftReviews > 0 ? (
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        tab === 'reviews' ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700',
                      )}>
                        {draftReviews}
                      </span>
                    ) : null}
                  </span>
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="rounded-lg border border-white/50 bg-white/70 px-2.5 py-1 backdrop-blur-sm">
                {visibleTasks.length} onboarding task{visibleTasks.length === 1 ? '' : 's'}
              </span>
              {isFullHr ? (
                <span className="rounded-lg border border-white/50 bg-white/70 px-2.5 py-1 backdrop-blur-sm">
                  {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            </div>
          </div>
        </div>

        {tab === 'performance' ? (
          <HrWorkPerformancePanel
            isFullHr={isFullHr}
            selectedEmployeeId={selectedEmployeeId ?? selfEmployee?.id ?? null}
            onSelectEmployee={selectPerformanceEmployee}
            periodFilters={periodFilters}
          />
        ) : null}

        {tab === 'onboarding' ? (
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
                    onClick={() => setTemplateOpen(true)}
                    className="border-white/60 bg-white/80"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Template
                  </Button>
                </div>
                {templates.length === 0 ? (
                  <p className={cn('text-sm', TALENT_SURFACE.textMuted)}>
                    No templates yet — create a reusable checklist so every new hire gets the same warm welcome.
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
                  <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="border-white/60 bg-white/80">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Task
                  </Button>
                ) : null}
              </div>

              {loadingTasks ? (
                <div className="flex justify-center py-10"><CustosellLoader /></div>
              ) : visibleTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-slate-600 shadow-sm">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={cn('text-base font-semibold', TALENT_SURFACE.textTitle)}>No onboarding tasks yet</h3>
                    <p className={cn('mt-1.5 max-w-md text-sm', TALENT_SURFACE.textMuted)}>
                      {isFullHr
                        ? 'Assign tasks to employees in onboarding — mark them done as each step is completed.'
                        : 'When HR assigns onboarding tasks, they will show up here.'}
                    </p>
                  </div>
                  {isFullHr ? (
                    <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="border-white/60 bg-white/80">
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add a task
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleTasks.map((task) => {
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
                              disabled={updateTask.isPending}
                              onChange={(e) =>
                                updateTask.mutate({
                                  id: task.id,
                                  status: e.target.value as OnboardingTaskStatus,
                                  completed_at: e.target.value === 'done' ? new Date().toISOString() : null,
                                })
                              }
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
        ) : null}

        {tab === 'reviews' && isFullHr ? (
          <div className={TALENT_SURFACE.panel}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-violet-600" />
                <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Performance reviews</h4>
              </div>
              <Button size="sm" onClick={() => setReviewOpen(true)} className="shadow-sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> Review
              </Button>
            </div>

            {loadingReviews ? (
              <div className="flex justify-center py-10"><CustosellLoader /></div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-slate-600 shadow-sm">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={cn('text-base font-semibold', TALENT_SURFACE.textTitle)}>No reviews yet</h3>
                  <p className={cn('mt-1.5 max-w-md text-sm', TALENT_SURFACE.textMuted)}>
                    Start with a draft — or seed one from Work performance after evaluating Pipeline/Projects goals.
                  </p>
                </div>
                <Button size="sm" onClick={() => setReviewOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create a review
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div key={review.id} className={TALENT_SURFACE.rowCard}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
                          {review.employee ? employeeDisplayName(review.employee) : `#${review.employee_id}`}
                        </p>
                        <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                          {review.period_label}
                          {review.rating != null ? ` · rating ${review.rating}/5` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReviewStatusBadge status={review.status} />
                        <select
                          value={review.status}
                          disabled={updateReview.isPending}
                          onChange={(e) =>
                            updateReview.mutate({ id: review.id, status: e.target.value as ReviewStatus })
                          }
                          className="rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-xs text-slate-800 shadow-sm"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    {review.rating != null ? (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Rating</span>
                          <span className="font-semibold text-gray-800">{review.rating}/5</span>
                        </div>
                        <div className={TALENT_SURFACE.barTrack}>
                          <div
                            className={TALENT_SURFACE.barFill}
                            style={{ width: `${Math.min(100, (Number(review.rating) / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="Onboarding template"
        subtitle="A reusable checklist for new hires."
      >
        <form onSubmit={handleTemplate} className="space-y-5">
          <HrModalHero
            icon={ClipboardList}
            title="New onboarding template"
            description="List each task on its own line — you can apply this template when assigning tasks to someone."
            tone="blue"
          />
          <HrFormSection title="Checklist" icon={ListChecks} description="Keep tasks short and actionable.">
            <HrIconField label="Template name" icon={ClipboardList} required>
              <input
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Standard new hire"
                className={hrInputClass}
                autoFocus
              />
            </HrIconField>
            <HrIconField label="Tasks (one per line)" icon={ListChecks} required>
              <textarea
                required
                rows={5}
                value={templateTasks}
                onChange={(e) => setTemplateTasks(e.target.value)}
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createTemplate.isPending}>Create template</Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Onboarding task"
        subtitle="Assign a step for someone to complete."
      >
        <form onSubmit={handleTask} className="space-y-5">
          <HrModalHero
            icon={ClipboardCheck}
            title="New onboarding task"
            description="Great for one-off steps — or pick a template to stay consistent across hires."
            tone="emerald"
          />
          <HrFormSection title="Assignment" icon={User}>
            <HrIconField label="Employee" icon={Users} required>
              <select
                required
                value={taskForm.employee_id}
                onChange={(e) => setTaskForm((f) => ({ ...f, employee_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">Select someone…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Template (optional)" icon={ClipboardList}>
              <select
                value={taskForm.template_id}
                onChange={(e) => setTaskForm((f) => ({ ...f, template_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Task title" icon={ListChecks} required>
              <input
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Complete HR paperwork"
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Due date" icon={Calendar}>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createTask.isPending}>Create task</Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Performance review"
        subtitle="Start as a draft — submit when you're ready to share."
        size="lg"
      >
        <form onSubmit={handleReview} className="space-y-5">
          <HrModalHero
            icon={Star}
            title="New performance review"
            description="Capture what went well and where to grow — ratings are optional but helpful for trends."
            tone="indigo"
          />
          <HrFormSection title="Review period" icon={User}>
            <HrIconField label="Employee" icon={Users} required>
              <select
                required
                value={reviewForm.employee_id}
                onChange={(e) => setReviewForm((f) => ({ ...f, employee_id: e.target.value }))}
                className={hrSelectClass}
              >
                <option value="">Select someone…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
                ))}
              </select>
            </HrIconField>
            <div className="grid gap-4 sm:grid-cols-2">
              <HrIconField label="Period label" icon={Calendar} required>
                <input
                  required
                  placeholder="Q1 2026"
                  value={reviewForm.period_label}
                  onChange={(e) => setReviewForm((f) => ({ ...f, period_label: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
              <HrIconField label="Rating (1–5)" icon={Star}>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))}
                  className={hrInputClass}
                />
              </HrIconField>
            </div>
          </HrFormSection>
          <HrFormSection title="Feedback" icon={MessageSquare} description="Be specific — it helps the conversation feel constructive.">
            <HrIconField label="Strengths" icon={ThumbsUp}>
              <textarea
                rows={2}
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm((f) => ({ ...f, strengths: e.target.value }))}
                placeholder="What they did exceptionally well…"
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Areas to improve" icon={MessageSquare}>
              <textarea
                rows={2}
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm((f) => ({ ...f, improvements: e.target.value }))}
                placeholder="Growth opportunities for next period…"
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createReview.isPending}>Create draft</Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
