import { useState } from 'react';
import { ClipboardCheck, Plus, Star } from 'lucide-react';
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
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

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
    <div className="space-y-4">
      <HrPageHeader
        title="Talent"
        description="Onboarding checklists and performance reviews."
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

      <HrSectionCard title="Onboarding templates">
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">No templates yet. Create a reusable checklist for new hires.</p>
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

      <HrSectionCard title="Onboarding tasks">
        {loadingTasks ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : tasks.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="No onboarding tasks"
            description="Assign tasks to employees in onboarding status."
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

      <HrSectionCard title="Performance reviews">
        {loadingReviews ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : reviews.length === 0 ? (
          <HrEmptyState
            className="border-0 bg-transparent shadow-none"
            icon={<Star className="h-5 w-5" />}
            title="No reviews yet"
            description="Create a draft review, then mark it submitted or completed."
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

      <Modal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} title="Onboarding template">
        <form onSubmit={handleTemplate} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input required value={templateName} onChange={(e) => setTemplateName(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Tasks (one per line)</span>
            <textarea required rows={5} value={templateTasks} onChange={(e) => setTemplateTasks(e.target.value)} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createTemplate.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={taskOpen} onClose={() => setTaskOpen(false)} title="Onboarding task">
        <form onSubmit={handleTask} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Employee</span>
            <select required value={taskForm.employee_id} onChange={(e) => setTaskForm((f) => ({ ...f, employee_id: e.target.value }))} className={inputClass}>
              <option value="">Select…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Template (optional)</span>
            <select value={taskForm.template_id} onChange={(e) => setTaskForm((f) => ({ ...f, template_id: e.target.value }))} className={inputClass}>
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Title</span>
            <input required value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Due date</span>
            <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createTask.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Performance review" size="lg">
        <form onSubmit={handleReview} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Employee</span>
            <select required value={reviewForm.employee_id} onChange={(e) => setReviewForm((f) => ({ ...f, employee_id: e.target.value }))} className={inputClass}>
              <option value="">Select…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeDisplayName(emp)}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Period label</span>
              <input required placeholder="Q1 2026" value={reviewForm.period_label} onChange={(e) => setReviewForm((f) => ({ ...f, period_label: e.target.value }))} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Rating (1–5)</span>
              <input type="number" min={1} max={5} value={reviewForm.rating} onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Strengths</span>
            <textarea rows={2} value={reviewForm.strengths} onChange={(e) => setReviewForm((f) => ({ ...f, strengths: e.target.value }))} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Improvements</span>
            <textarea rows={2} value={reviewForm.improvements} onChange={(e) => setReviewForm((f) => ({ ...f, improvements: e.target.value }))} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createReview.isPending}>Create draft</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
