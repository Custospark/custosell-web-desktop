import { Megaphone } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useBoardCollaborationSummary } from '../api/usePipelineCollaborationQueries';

interface BoardCollaborationButtonProps {
  boardId: number;
  onClick: () => void;
}

export default function BoardCollaborationButton({ boardId, onClick }: BoardCollaborationButtonProps) {
  const { data: summary } = useBoardCollaborationSummary(boardId, boardId > 0);

  const unreadNotices = summary?.unread_announcements_count ?? 0;
  const pendingPolls = summary?.polls_pending_vote_count ?? 0;
  const hasAttention = summary?.has_attention ?? (unreadNotices > 0 || pendingPolls > 0);

  const tooltipParts: string[] = [];
  if (unreadNotices > 0) {
    tooltipParts.push(`${unreadNotices} new notice${unreadNotices === 1 ? '' : 's'}`);
  }
  if (pendingPolls > 0) {
    tooltipParts.push(`${pendingPolls} poll${pendingPolls === 1 ? '' : 's'} to vote on`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative shrink-0 rounded-lg p-2 transition-colors',
        hasAttention
          ? 'text-violet-700 hover:bg-violet-50 hover:text-violet-900'
          : 'text-violet-600 hover:bg-violet-50 hover:text-violet-800',
      )}
      title={
        hasAttention
          ? tooltipParts.join(' · ')
          : 'Board notices & polls'
      }
      aria-label={
        hasAttention
          ? `Board collaboration: ${tooltipParts.join(', ')}`
          : 'Board notices and polls'
      }
    >
      <Megaphone className="h-4 w-4" />
      {unreadNotices > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
          {unreadNotices > 9 ? '9+' : unreadNotices}
        </span>
      )}
      {pendingPolls > 0 && (
        <span
          className={cn(
            'absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white',
            unreadNotices > 0 ? '-bottom-0.5 -right-0.5' : '-right-0.5 -top-0.5',
          )}
        >
          {pendingPolls > 9 ? '9+' : pendingPolls}
        </span>
      )}
    </button>
  );
}
