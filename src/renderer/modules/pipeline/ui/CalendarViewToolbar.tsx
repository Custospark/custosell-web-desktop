import { cn } from '../../../shared/utils/cn';
import type { PipelineCalendarDateField } from '../api/pipelineTypes';
import { DATE_FIELD_OPTIONS } from './calendarViewShared';

type CalendarScope = 'board' | 'all';
type CalendarViewMode = 'month' | 'week' | 'day';

interface CalendarViewToolbarProps {
  scope: CalendarScope;
  onScopeChange: (scope: CalendarScope) => void;
  dateField: PipelineCalendarDateField;
  onDateFieldChange: (field: PipelineCalendarDateField) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  workspace: 'pipeline' | 'estimates';
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-gray-900 text-white shadow-sm'
          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-gray-300" />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{children}</span>;
}

export default function CalendarViewToolbar({
  scope,
  onScopeChange,
  dateField,
  onDateFieldChange,
  viewMode,
  onViewModeChange,
  workspace,
}: CalendarViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <GroupLabel>Show</GroupLabel>
        <Toggle active={scope === 'board'} onClick={() => onScopeChange('board')}>
          This board
        </Toggle>
        <Toggle active={scope === 'all'} onClick={() => onScopeChange('all')}>
          All {workspace === 'estimates' ? 'project boards' : 'pipeline boards'}
        </Toggle>
      </div>

      <Divider />

      <div className="flex flex-wrap items-center gap-1.5">
        <GroupLabel>Dates</GroupLabel>
        {DATE_FIELD_OPTIONS.map((opt) => (
          <Toggle key={opt.value} active={dateField === opt.value} onClick={() => onDateFieldChange(opt.value)}>
            {opt.shortLabel}
          </Toggle>
        ))}
      </div>

      <Divider />

      <div className="flex flex-wrap items-center gap-1.5">
        <GroupLabel>View</GroupLabel>
        {(['month', 'week', 'day'] as const).map((mode) => (
          <Toggle key={mode} active={viewMode === mode} onClick={() => onViewModeChange(mode)}>
            {mode === 'month' ? 'Month' : mode === 'week' ? 'Week' : 'Day'}
          </Toggle>
        ))}
      </div>
    </div>
  );
}
