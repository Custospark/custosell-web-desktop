import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { HrWorkPerformancePanel } from '../ui/HrWorkPerformancePanel';
import { TALENT_SURFACE } from '../ui/talentSurface';
import HrTalentHero from '../ui/HrTalentHero';
import HrOnboardingTab from '../ui/HrOnboardingTab';
import HrReviewsTab from '../ui/HrReviewsTab';
import HrTalentModals, { type HrTalentForms } from '../ui/HrTalentModals';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canViewFullHr } from '../../../shared/utils/moduleAccess';
import type { TalentTab } from '../ui/talentTabType';
import type { ProgressPeriod } from '../../pipeline/api/pipelineProgressTerms';

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

  const forms: HrTalentForms = {
    templateName,
    onTemplateNameChange: setTemplateName,
    templateTasks,
    onTemplateTasksChange: setTemplateTasks,
    taskForm,
    onTaskFormChange: (patch) => setTaskForm((f) => ({ ...f, ...patch })),
    reviewForm,
    onReviewFormChange: (patch) => setReviewForm((f) => ({ ...f, ...patch })),
  };

  return (
    <div className={TALENT_SURFACE.canvas}>
      <div className={TALENT_SURFACE.canvasGlow} aria-hidden />
      <div className={TALENT_SURFACE.canvasMesh} aria-hidden />

      <div className={TALENT_SURFACE.content}>
        <HrTalentHero
          tab={tab}
          onSelectTab={selectTab}
          period={period}
          onSelectPeriod={selectPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onSetCustomRange={setCustomRange}
          isFullHr={isFullHr}
          pendingOnboarding={pendingOnboarding}
          draftReviews={draftReviews}
          visibleTaskCount={visibleTasks.length}
          reviewsCount={reviews.length}
          onOpenTemplate={() => setTemplateOpen(true)}
          onOpenTask={() => setTaskOpen(true)}
          onOpenReview={() => setReviewOpen(true)}
        />

        {tab === 'performance' ? (
          <HrWorkPerformancePanel
            isFullHr={isFullHr}
            selectedEmployeeId={selectedEmployeeId ?? selfEmployee?.id ?? null}
            onSelectEmployee={selectPerformanceEmployee}
            periodFilters={periodFilters}
          />
        ) : null}

        {tab === 'onboarding' ? (
          <HrOnboardingTab
            isFullHr={isFullHr}
            templates={templates}
            tasks={visibleTasks}
            loadingTasks={loadingTasks}
            updateTaskPending={updateTask.isPending}
            onOpenTemplate={() => setTemplateOpen(true)}
            onOpenTask={() => setTaskOpen(true)}
            onUpdateTask={(id, status) =>
              updateTask.mutate({
                id,
                status,
                completed_at: status === 'done' ? new Date().toISOString() : null,
              })
            }
          />
        ) : null}

        {tab === 'reviews' && isFullHr ? (
          <HrReviewsTab
            reviews={reviews}
            loadingReviews={loadingReviews}
            updateReviewPending={updateReview.isPending}
            onOpenReview={() => setReviewOpen(true)}
            onUpdateReview={(id, status) => updateReview.mutate({ id, status })}
          />
        ) : null}
      </div>

      <HrTalentModals
        {...forms}
        templateOpen={templateOpen}
        taskOpen={taskOpen}
        reviewOpen={reviewOpen}
        onCloseTemplate={() => setTemplateOpen(false)}
        onCloseTask={() => setTaskOpen(false)}
        onCloseReview={() => setReviewOpen(false)}
        employees={employees}
        templates={templates}
        creatingTemplate={createTemplate.isPending}
        creatingTask={createTask.isPending}
        creatingReview={createReview.isPending}
        onSubmitTemplate={handleTemplate}
        onSubmitTask={handleTask}
        onSubmitReview={handleReview}
      />
    </div>
  );
}
