import { useState } from 'react';
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
  User,
  Users,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useCreateHrOnboardingTask,
  useCreateHrOnboardingTemplate,
  useCreateHrReview,
  useHrEmployees,
  useHrOnboardingTasks,
  useHrOnboardingTemplates,
  useHrReviews,
  useUpdateHrOnboardingTask,
  useUpdateHrReview,
} from '../api/useHrQueries';
import type { OnboardingTaskStatus, ReviewStatus } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { OnboardingTaskStatusBadge, ReviewStatusBadge } from '../ui/HrStatusBadges';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

export default function HrTalentPage() {
  const { data: templates = [] } = useHrOnboardingTemplates();
  const { data: tasks = [], isLoading: loadingTasks } = useHrOnboardingTasks();
  const { data: reviews = [], isLoading: loadingReviews } = useHrReviews();
  const { data: employees = [] } = useHrEmployees();
  const createTemplate = useCreateHrOnboardingTemplate();
  const createTask = useCreateHrOnboardingTask();
  const updateTask = useUpdateHrOnboardingTask();
  const createReview = useCreateHrReview();
  const updateReview = useUpdateHrReview();

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

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Sparkles}
        title="Talent"
        description="Onboarding checklists and performance reviews — help new hires settle in and celebrate growth."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setTemplateOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Task
            </Button>
            <Button size="sm" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Review
            </Button>
          </>
        }
      />

      <HrSectionCard title="Onboarding templates" description="Reusable checklists — one line per task when you create a template.">
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No templates yet — create a reusable checklist so every new hire gets the same warm welcome.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="py-2.5">
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">
                  {(t.tasks_json?.length ?? 0)} task{(t.tasks_json?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </HrSectionCard>

      <HrSectionCard title="Onboarding tasks" description="Track what each person still needs to complete.">
        {loadingTasks ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : tasks.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="No onboarding tasks yet"
            description="Assign tasks to employees in onboarding status — mark them done as each step is completed."
            action={
              <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add a task
              </Button>
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-3 py-2">{task.employee ? employeeDisplayName(task.employee) : `#${task.employee_id}`}</td>
                    <td className="px-3 py-2 font-medium">{task.title}</td>
                    <td className="px-3 py-2 text-gray-600">{task.due_date ?? '—'}</td>
                    <td className="px-3 py-2"><OnboardingTaskStatusBadge status={task.status} /></td>
                    <td className="px-3 py-2 text-right">
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
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="done">Done</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <HrSectionCard title="Performance reviews" description="Draft, submit, and complete reviews for your team.">
        {loadingReviews ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : reviews.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<Star className="h-5 w-5" />}
            title="No reviews yet"
            description="Start with a draft review — capture strengths and areas to grow, then mark it submitted when ready."
            action={
              <Button size="sm" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create a review
              </Button>
            }
          />
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td className="px-3 py-2">{review.employee ? employeeDisplayName(review.employee) : `#${review.employee_id}`}</td>
                    <td className="px-3 py-2">{review.period_label}</td>
                    <td className="px-3 py-2">{review.rating ?? '—'}</td>
                    <td className="px-3 py-2"><ReviewStatusBadge status={review.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <select
                        value={review.status}
                        disabled={updateReview.isPending}
                        onChange={(e) =>
                          updateReview.mutate({ id: review.id, status: e.target.value as ReviewStatus })
                        }
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

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
