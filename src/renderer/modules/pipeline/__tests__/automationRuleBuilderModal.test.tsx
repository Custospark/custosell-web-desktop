import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AutomationRuleBuilderModal from '../ui/AutomationRuleBuilderModal';

vi.mock('../api/usePipelineAutomationRuleQueries', () => ({
  useCreateAutomationRule: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 99 }),
  }),
  useUpdateAutomationRule: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
  }),
}));

vi.mock('../api/usePipelineBoardQueries', () => ({
  usePipelineKanban: () => ({
    data: {
      stages: [
        { id: 1, name: 'New', sort_order: 1 },
        { id: 2, name: 'Qualified', sort_order: 2 },
      ],
    },
  }),
}));

vi.mock('../api/usePipelineMemberRoster', () => ({
  usePipelineMemberRoster: () => [
    { id: 5, name: 'Alice Ada' },
    { id: 6, name: 'Bob Builder' },
  ],
}));

vi.mock('../api/usePipelineMetaQueries', () => ({
  usePipelineLabels: () => ({ data: [{ id: 10, name: 'Hot lead', color: '#ef4444' }] }),
}));

vi.mock('../api/usePipelineMetaFieldQueries', () => ({
  usePipelineBoardMetaFields: () => ({ data: [{ id: 20, name: 'Priority reason' }] }),
}));

vi.mock('../../../shared/components/modals/Modal', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="mock-modal">
        {title ? <h2>{title}</h2> : null}
        {children}
      </div>
    ) : null,
}));

afterEach(() => {
  cleanup();
});

/**
 * Locks the automation rule builder: sections render, stage selectors appear,
 * scheduled triggers expose the frequency picker, and validation blocks an
 * empty name.
 */
describe('AutomationRuleBuilderModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders trigger, condition, and action sections', () => {
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={() => {}} />);
    expect(screen.getByLabelText(/Automation name/i)).toBeTruthy();
    expect(screen.getByText('Trigger')).toBeTruthy();
    expect(screen.getByText('Conditions')).toBeTruthy();
    expect(screen.getByText('Actions')).toBeTruthy();
  });

  it('shows a stage selector for the stage_entered trigger', () => {
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={() => {}} />);
    expect(screen.getByLabelText('Stage')).toBeTruthy();
  });

  it('blocks saving with an empty name', () => {
    const onClose = vi.fn();
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={onClose} />);
    fireEvent.click(screen.getByText('Create automation'));
    expect(screen.getByText(/Give the automation a name/)).toBeTruthy();
  });

  it('shows schedule options for a scheduled trigger', () => {
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={() => {}} />);
    const trigger = screen.getByLabelText('When') as HTMLSelectElement;
    fireEvent.change(trigger, { target: { value: 'due_date_passed' } });
    expect(screen.getByText('Schedule')).toBeTruthy();
    expect(screen.getByLabelText(/Time/i)).toBeTruthy();
  });

  it('switching trigger to recurring shows the recurring hint', () => {
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={() => {}} />);
    const trigger = screen.getByLabelText('When') as HTMLSelectElement;
    fireEvent.change(trigger, { target: { value: 'recurring' } });
    expect(screen.getByText(/Recurring rules create one card/i)).toBeTruthy();
  });
});