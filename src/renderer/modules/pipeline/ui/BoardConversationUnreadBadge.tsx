import { MessageSquare } from 'lucide-react';

interface BoardConversationUnreadBadgeProps {
  totalMessages: number;
  unreadCount: number;
}

export default function BoardConversationUnreadBadge({
  totalMessages,
  unreadCount,
}: BoardConversationUnreadBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
      <span className="relative inline-flex">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        {totalMessages > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {totalMessages > 99 ? '99+' : totalMessages}
          </span>
        )}
      </span>
      <span>
        <span className="font-semibold text-gray-900">{totalMessages}</span> message
        {totalMessages === 1 ? '' : 's'}
      </span>
      {unreadCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          {unreadCount} new
        </span>
      )}
    </div>
  );
}