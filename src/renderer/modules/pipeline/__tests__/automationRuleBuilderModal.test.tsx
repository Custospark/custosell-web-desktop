import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AutomationRuleBuilderModal from '../ui/AutomationRuleBuilderModal';

const createMutateMock = vi.fn();
const updateMutateMock = vi.fn();

vi.mock('../api/usePipelineAutomationRuleQueries', () => ({
  useCreateAutomationRule: () => ({
    mutate: createMutateMock,
    isPending: false,
  }),
  useUpdateAutomationRule: () => ({
    mutate: updateMutateMock,
    isPending: false,
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
  createMutateMock.mockReset();
  updateMutateMock.mockReset();
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

  it('closes the modal immediately on create and fires the optimistic mutation', () => {
    const onClose = vi.fn();
    render(<AutomationRuleBuilderModal boardId={1} open mode="create" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Automation name/i), { target: { value: 'Escalate hot' } });
    fireEvent.click(screen.getByText('Create automation'));

    // Optimistic: onClose runs before/without waiting on the server.
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createMutateMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Escalate hot' }));
  });

  it('fires the update mutation when editing', () => {
    const onClose = vi.fn();
    const rule = {
      id: 7,
      board_id: 1,
      name: 'Existing rule',
      trigger: { type: 'status_changed' as const },
      conditions: null,
      actions: [{ type: 'archive' as const }],
      is_active: true,
      run_count: 1,
      last_run_at: null,
      paused_at: null,
      created_by: 1,
      creator: null,
      created_at: 'x',
      updated_at: 'x',
    };
    render(<AutomationRuleBuilderModal boardId={1} open mode="edit" rule={rule} onClose={onClose} />);
    fireEvent.click(screen.getByText('Save changes'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateMutateMock).toHaveBeenCalledWith({ ruleId: 7, payload: expect.objectContaining({ name: 'Existing rule' }) });
  });

  it('pre-populates the form from the rule being edited', () => {
    const rule = {
      id: 9,
      board_id: 1,
      name: 'Escalate hot leads',
      trigger: { type: 'due_date_passed' as const, frequency: 'daily' as const, time: '06:00' },
      conditions: [
        { field: 'priority' as const, operator: 'is' as const, value: 'high' },
      ],
      actions: [{ type: 'set_priority' as const, priority: 'urgent' as const }],
      is_active: true,
      run_count: 3,
      last_run_at: null,
      paused_at: null,
      created_by: 1,
      creator: null,
      created_at: 'x',
      updated_at: 'x',
    };
    render(<AutomationRuleBuilderModal boardId={1} open mode="edit" rule={rule} onClose={() => {}} />);

    expect((screen.getByLabelText(/Automation name/i) as HTMLInputElement).value).toBe('Escalate hot leads');
    expect((screen.getByLabelText('When') as HTMLSelectElement).value).toBe('due_date_passed');
  });
});