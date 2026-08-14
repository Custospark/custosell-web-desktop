import type { FormEvent, ReactNode } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from './hrFormFields';
import { employeeDisplayName, type HrEmployee, type HrOnboardingTemplate } from '../api/hrTypes';
import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  MessageSquare,
  Star,
  ThumbsUp,
  User,
  Users,
} from 'lucide-react';

export interface HrTalentForms {
  templateName: string;
  onTemplateNameChange: (value: string) => void;
  templateTasks: string;
  onTemplateTasksChange: (value: string) => void;
  taskForm: { employee_id: string; title: string; due_date: string; template_id: string };
  onTaskFormChange: (patch: Partial<HrTalentForms['taskForm']>) => void;
  reviewForm: {
    employee_id: string;
    period_label: string;
    rating: string;
    strengths: string;
    improvements: string;
  };
  onReviewFormChange: (patch: Partial<HrTalentForms['reviewForm']>) => void;
}

interface HrTalentModalsProps extends HrTalentForms {
  templateOpen: boolean;
  taskOpen: boolean;
  reviewOpen: boolean;
  onCloseTemplate: () => void;
  onCloseTask: () => void;
  onCloseReview: () => void;
  employees: HrEmployee[];
  templates: HrOnboardingTemplate[];
  creatingTemplate: boolean;
  creatingTask: boolean;
  creatingReview: boolean;
  onSubmitTemplate: (e: FormEvent) => void;
  onSubmitTask: (e: FormEvent) => void;
  onSubmitReview: (e: FormEvent) => void;
}

function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  onSubmit,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      <form onSubmit={onSubmit} className="space-y-5">
        {children}
        {footer}
      </form>
    </Modal>
  );
}

export default function HrTalentModals(props: HrTalentModalsProps) {
  const {
    templateOpen,
    taskOpen,
    reviewOpen,
    onCloseTemplate,
    onCloseTask,
    onCloseReview,
    employees,
    templates,
    creatingTemplate,
    creatingTask,
    creatingReview,
    onSubmitTemplate,
    onSubmitTask,
    onSubmitReview,
    templateName,
    onTemplateNameChange,
    templateTasks,
    onTemplateTasksChange,
    taskForm,
    onTaskFormChange,
    reviewForm,
    onReviewFormChange,
  } = props;

  return (
    <>
      <FormModal
        isOpen={templateOpen}
        onClose={onCloseTemplate}
        title="Onboarding template"
        subtitle="A reusable checklist for new hires."
        onSubmit={onSubmitTemplate}
        footer={
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={onCloseTemplate}>Cancel</Button>
            <Button type="submit" loading={creatingTemplate}>Create template</Button>
          </HrModalFooter>
        }
      >
        <HrModalHero
          icon={ClipboardList}
          title="New onboarding template"
          description="List each task on its own line - you can apply this template when assigning tasks to someone."
          tone="blue"
        />
        <HrFormSection title="Checklist" icon={ListChecks} description="Keep tasks short and actionable.">
          <HrIconField label="Template name" icon={ClipboardList} required>
            <input
              required
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
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
              onChange={(e) => onTemplateTasksChange(e.target.value)}
              className={hrInputClass}
            />
          </HrIconField>
        </HrFormSection>
      </FormModal>

      <FormModal
        isOpen={taskOpen}
        onClose={onCloseTask}
        title="Onboarding task"
        subtitle="Assign a step for someone to complete."
        onSubmit={onSubmitTask}
        footer={
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={onCloseTask}>Cancel</Button>
            <Button type="submit" loading={creatingTask}>Create task</Button>
          </HrModalFooter>
        }
      >
        <HrModalHero
          icon={ClipboardCheck}
          title="New onboarding task"
          description="Great for one-off steps - or pick a template to stay consistent across hires."
          tone="emerald"
        />
        <HrFormSection title="Assignment" icon={User}>
          <HrIconField label="Employee" icon={Users} required>
            <select
              required
              value={taskForm.employee_id}
              onChange={(e) => onTaskFormChange({ employee_id: e.target.value })}
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
              onChange={(e) => onTaskFormChange({ template_id: e.target.value })}
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
              onChange={(e) => onTaskFormChange({ title: e.target.value })}
              placeholder="Complete HR paperwork"
              className={hrInputClass}
            />
          </HrIconField>
          <HrIconField label="Due date" icon={Calendar}>
            <input
              type="date"
              value={taskForm.due_date}
              onChange={(e) => onTaskFormChange({ due_date: e.target.value })}
              className={hrInputClass}
            />
          </HrIconField>
        </HrFormSection>
      </FormModal>

      <FormModal
        isOpen={reviewOpen}
        onClose={onCloseReview}
        title="Performance review"
        subtitle="Start as a draft - submit when you're ready to share."
        onSubmit={onSubmitReview}
        footer={
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={onCloseReview}>Cancel</Button>
            <Button type="submit" loading={creatingReview}>Create draft</Button>
          </HrModalFooter>
        }
      >
        <HrModalHero
          icon={Star}
          title="New performance review"
          description="Capture what went well and where to grow - ratings are optional but helpful for trends."
          tone="indigo"
        />
        <HrFormSection title="Review period" icon={User}>
          <HrIconField label="Employee" icon={Users} required>
            <select
              required
              value={reviewForm.employee_id}
              onChange={(e) => onReviewFormChange({ employee_id: e.target.value })}
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
                onChange={(e) => onReviewFormChange({ period_label: e.target.value })}
                className={hrInputClass}
              />
            </HrIconField>
            <HrIconField label="Rating (1-5)" icon={Star}>
              <input
                type="number"
                min={1}
                max={5}
                value={reviewForm.rating}
                onChange={(e) => onReviewFormChange({ rating: e.target.value })}
                className={hrInputClass}
              />
            </HrIconField>
          </div>
        </HrFormSection>
        <HrFormSection title="Feedback" icon={MessageSquare} description="Be specific - it helps the conversation feel constructive.">
          <HrIconField label="Strengths" icon={ThumbsUp}>
            <textarea
              rows={2}
              value={reviewForm.strengths}
              onChange={(e) => onReviewFormChange({ strengths: e.target.value })}
              placeholder="What they did exceptionally well…"
              className={hrInputClass}
            />
          </HrIconField>
          <HrIconField label="Areas to improve" icon={MessageSquare}>
            <textarea
              rows={2}
              value={reviewForm.improvements}
              onChange={(e) => onReviewFormChange({ improvements: e.target.value })}
              placeholder="Growth opportunities for next period…"
              className={hrInputClass}
            />
          </HrIconField>
        </HrFormSection>
      </FormModal>
    </>
  );
}
