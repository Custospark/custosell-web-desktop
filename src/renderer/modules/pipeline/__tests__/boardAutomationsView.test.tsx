import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import BoardAutomationsView from '../ui/BoardAutomationsView';
import type { PipelineAutomationRule } from '../api/pipelineAutomationRuleTypes';

const rules: PipelineAutomationRule[] = [
  {
    id: 1,
    board_id: 10,
    name: 'Escalate hot leads',
    trigger: { type: 'status_changed' },
    conditions: [{ field: 'priority', operator: 'is', value: 'high' }],
    actions: [{ type: 'move_to_stage', stage_id: 2 }],
    is_active: true,
    run_count: 5,
    last_run_at: '2026-08-22T09:00:00.000Z',
    paused_at: null,
    created_by: 1,
    creator: { id: 1, name: 'Owner' },
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 2,
    board_id: 10,
    name: 'Weekly review card',
    trigger: { type: 'recurring', frequency: 'weekly', days_of_week: [1, 3], time: '06:00' },
    conditions: null,
    actions: [{ type: 'create_card', title: 'Weekly review' }],
    is_active: false,
    run_count: 12,
    last_run_at: null,
    paused_at: '2026-08-10T00:00:00.000Z',
    created_by: 1,
    creator: { id: 1, name: 'Owner' },
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
];

const { toggleMock, deleteMock } = vi.hoisted(() => ({
  toggleMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('../api/usePipelineAutomationRuleQueries', () => ({
  useBoardAutomationRules: () => ({ data: rules, isLoading: false }),
  useToggleAutomationRule: () => ({ mutateAsync: toggleMock }),
  useDeleteAutomationRule: () => ({ mutateAsync: deleteMock }),
  isOptimisticRule: (rule: { id: number }) => rule.id < 0,
}));

vi.mock('../../../shared/components/Feedback/ConfirmContext', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../../../shared/components/modals/Modal', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('../ui/AutomationRuleBuilderModal', () => ({
  default: () => <div data-testid="builder-modal" />,
}));

vi.mock('../../../shared/components/loading/CustosellLoader', () => ({
  CustosellLoader: ({ message }: { message?: string }) => <div>{message ?? 'Loading'}</div>,
}));

afterEach(() => {
  cleanup();
  toggleMock.mockReset();
  deleteMock.mockReset();
});

/**
 * Locks the automations board view: it lists rules, searches client-side,
 * toggles active state, and deletes with confirmation.
 */
describe('BoardAutomationsView', () => {

  it('renders all rules with run counts', () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    expect(screen.getByText('Escalate hot leads')).toBeTruthy();
    expect(screen.getByText('Weekly review card')).toBeTruthy();
    expect(screen.getAllByText(/Runs:/).length).toBe(2);
  });

  it('shows active and paused badges', () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  it('searches rules client-side', () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    fireEvent.change(screen.getByLabelText('Search automations'), { target: { value: 'weekly' } });
    expect(screen.getByText('Weekly review card')).toBeTruthy();
    expect(screen.queryByText('Escalate hot leads')).toBeNull();
  });

  it('shows the no-match state when search finds nothing', () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    fireEvent.change(screen.getByLabelText('Search automations'), { target: { value: 'zzz' } });
    expect(screen.getByText(/No automations match your search/i)).toBeTruthy();
  });

  it('toggles a rule on and off', () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    const buttons = screen.getAllByTitle('Pause');
    fireEvent.click(buttons[0]);
    expect(toggleMock).toHaveBeenCalledWith({ ruleId: 1, is_active: false });
  });

  it('deletes a rule after confirmation', async () => {
    render(<BoardAutomationsView boardId={10} canManage />);
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
  });

  it('does not show manage buttons when canManage is false', () => {
    render(<BoardAutomationsView boardId={10} canManage={false} />);
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.getAllByText(/view automations but not manage/i).length).toBe(2);
  });
});