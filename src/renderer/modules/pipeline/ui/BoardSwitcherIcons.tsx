import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, FolderOpen, MessageSquare, Plus, TrendingUp, Trophy } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface BoardSwitcherIconsProps {
  onOpenAll: () => void;
  onOpenResources?: () => void;
  resourcesCount?: number;
  onOpenProgress?: () => void;
  progressActive?: boolean;
  onOpenFame?: () => void;
  fameActive?: boolean;
  onOpenConversation?: () => void;
  conversationMessagesCount?: number;
  conversationUnreadCount?: number;
  onCreateNew: () => void;
  allowCreate?: boolean;
  className?: string;
}

export default function BoardSwitcherIcons({
  onOpenAll,
  onOpenResources,
  resourcesCount = 0,
  onOpenProgress,
  progressActive = false,
  onOpenFame,
  fameActive = false,
  onOpenConversation,
  conversationMessagesCount = 0,
  conversationUnreadCount = 0,
  onCreateNew,
  allowCreate = true,
  className,
}: BoardSwitcherIconsProps) {
  const queryClient = useQueryClient();
  const fameData = queryClient.getQueryData<unknown[]>(['wall-of-fame']);
  const fameCount = Array.isArray(fameData) ? fameData.length : 0;

  const badge = (count: number, color: string) => (
    <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full ${color} px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white`}>
      {count > 99 ? '99+' : count}
    </span>
  );

  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-center gap-3 border-t border-white/40 bg-white/85 px-3 py-2.5 backdrop-blur-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenAll}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border-2 border-indigo-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
          'bg-gradient-to-r from-indigo-50 via-white to-blue-50 text-indigo-800',
          'hover:border-indigo-400 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md hover:shadow-indigo-200/50',
          'active:scale-[0.98]',
        )}
        title="Switch boards"
        aria-label="Switch boards"
      >
        <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
        <span className="hidden sm:inline">Switch boards</span>
      </button>
      {onOpenResources && (
        <button
          type="button"
          onClick={onOpenResources}
          className={cn(
            'relative inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
            'bg-gradient-to-r from-emerald-50 via-white to-teal-50 text-emerald-800',
            'hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md hover:shadow-emerald-200/50',
            'active:scale-[0.98]',
          )}
          title="Board resources"
          aria-label={resourcesCount > 0 ? `Board resources (${resourcesCount})` : 'Board resources'}
        >
          <FolderOpen className="h-4 w-4 text-emerald-600" />
          <span className="hidden sm:inline-flex items-center gap-2">Resources{resourcesCount > 0 && badge(resourcesCount, 'bg-emerald-600')}</span>
        </button>
      )}
      {onOpenProgress && (
        <button
          type="button"
          onClick={onOpenProgress}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]',
            progressActive
              ? 'border-violet-500 bg-gradient-to-r from-violet-100 via-white to-fuchsia-100 text-violet-900 shadow-md shadow-violet-200/50'
              : 'border-violet-300/90 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 text-violet-800 hover:border-violet-400 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md hover:shadow-violet-200/50',
          )}
          title="Board progress"
          aria-label="Board progress"
          aria-pressed={progressActive}
        >
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <span className="hidden sm:inline">Progress</span>
        </button>
      )}
      {onOpenFame && (
        <button
          type="button"
          onClick={onOpenFame}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]',
            fameActive
              ? 'border-amber-500 bg-gradient-to-r from-amber-100 via-white to-yellow-100 text-amber-900 shadow-md shadow-amber-200/50'
              : 'border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-yellow-50 text-amber-800 hover:border-amber-400 hover:from-amber-100 hover:to-yellow-100 hover:shadow-md hover:shadow-amber-200/50',
          )}
          title="Wall of Fame"
          aria-label="Wall of Fame"
          aria-pressed={fameActive}
        >
          <Trophy className="h-4 w-4 text-amber-600" />
          <span className="hidden sm:inline-flex items-center gap-2">Fame{fameCount > 0 && badge(fameCount, 'bg-amber-600')}</span>
        </button>
      )}
      {onOpenConversation && (
        <button
          type="button"
          onClick={onOpenConversation}
          className={cn(
            'relative inline-flex items-center gap-2 rounded-xl border-2 border-blue-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
            'bg-gradient-to-r from-blue-50 via-white to-sky-50 text-blue-800',
            'hover:border-blue-400 hover:from-blue-100 hover:to-sky-100 hover:shadow-md hover:shadow-blue-200/50',
            'active:scale-[0.98]',
            conversationUnreadCount > 0 && 'border-blue-400 text-blue-900',
          )}
          title="Board discussion"
          aria-label={
            conversationMessagesCount > 0
              ? `Board discussion (${conversationMessagesCount} message${conversationMessagesCount === 1 ? '' : 's'}${conversationUnreadCount > 0 ? `, ${conversationUnreadCount} unread` : ''})`
              : 'Board discussion'
          }
        >
          <span className={cn('relative inline-flex shrink-0', conversationUnreadCount > 0 && 'after:absolute after:right-0 after:top-0 after:h-2 after:w-2 after:rounded-full after:bg-blue-500 after:ring-2 after:ring-white')}>
            <MessageSquare className={cn('h-4 w-4', conversationUnreadCount > 0 ? 'text-blue-700' : 'text-blue-600')} />
          </span>
          <span className="hidden sm:inline-flex items-center gap-2">Discussions{conversationMessagesCount > 0 && badge(conversationMessagesCount, conversationUnreadCount > 0 ? 'bg-blue-700' : 'bg-blue-600')}</span>
        </button>
      )}
      {allowCreate && (
        <button
          type="button"
          onClick={onCreateNew}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-violet-400/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
            'bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 text-violet-800',
            'hover:border-violet-500 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md hover:shadow-violet-200/50',
            'active:scale-[0.98]',
          )}
          title="New Board"
          aria-label="New Board"
        >
          <Plus className="h-4 w-4 text-violet-600" />
          <span className="hidden sm:inline">New Board</span>
        </button>
      )}
    </div>
  );
}
