import { useMemo } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import type { PipelineUserRef } from '../api/pipelineTypes';
import { PipelineUserAttribution } from './pipelineUserAttribution';
import {
  Bell,
  Check,
  CheckCircle2,
  Megaphone,
  Pin,
  Trash2,
} from 'lucide-react';

export interface BoardNotice {
  id: number;
  title: string;
  body: string;
  is_pinned?: boolean;
  is_read: boolean;
  created_at?: string;
  creator?: PipelineUserRef | null;
  read_count?: number | null;
  team_member_count?: number | null;
  can_delete?: boolean;
  can_dismiss?: boolean;
}

export interface BoardNoticesTabProps {
  currentUserId?: number | null;
  canManage: boolean;
  canContribute: boolean;
  unreadCount: number;
  markingAllRead: boolean;
  loading: boolean;
  notices: BoardNotice[];
  noticeTitle: string;
  onNoticeTitleChange: (value: string) => void;
  noticeBody: string;
  onNoticeBodyChange: (value: string) => void;
  posting: boolean;
  onPost: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
  onToggleRead: (id: number) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
}

export default function BoardNoticesTab({
  currentUserId,
  canManage,
  canContribute,
  unreadCount,
  markingAllRead,
  loading,
  notices,
  noticeTitle,
  onNoticeTitleChange,
  noticeBody,
  onNoticeBodyChange,
  posting,
  onPost,
  onMarkAllRead,
  onMarkRead,
  onToggleRead,
  onDelete,
  deleting,
}: BoardNoticesTabProps) {
  const sorted = useMemo(
    () => [...notices].sort((a, b) => Number(a.is_read) - Number(b.is_read)),
    [notices],
  );

  return (
    <div className="space-y-4">
      {unreadCount > 0 && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {unreadCount} unread notice{unreadCount === 1 ? '' : 's'}
          </p>
          <Button
            type="button"
            size="sm"
            loading={markingAllRead}
            onClick={onMarkAllRead}
            className="shrink-0 bg-amber-600 hover:bg-amber-700"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      )}

      {canManage && (
        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Bell className="h-4 w-4" />
            Post a board notice
          </p>
          <input
            value={noticeTitle}
            onChange={(e) => onNoticeTitleChange(e.target.value)}
            placeholder="Notice title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={noticeBody}
            onChange={(e) => onNoticeBodyChange(e.target.value)}
            placeholder="Share an update with everyone on this board…"
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button
            type="button"
            size="sm"
            loading={posting}
            disabled={!noticeTitle.trim() || !noticeBody.trim()}
            onClick={onPost}
          >
            <Megaphone className="mr-1.5 h-4 w-4" />
            Send notice & email team
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <CustosellLoader />
        </div>
      ) : (
        <ul className="max-h-[min(50vh,400px)] space-y-3 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
              No board notices yet.
            </li>
          ) : (
            sorted.map((item) => {
              const showReadStats = canManage || item.created_by === currentUserId;
              const canDeleteNotice = item.can_delete ?? false;
              const canDismissNotice = item.can_dismiss ?? !canDeleteNotice;
              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-xl border bg-white p-4 shadow-sm',
                    item.is_read ? 'border-gray-200' : 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        {!item.is_read && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{item.body}</p>
                      <div className="mt-2">
                        <PipelineUserAttribution
                          user={item.creator}
                          timestamp={item.created_at}
                          suffix={
                            showReadStats && item.read_count != null && item.team_member_count != null ? (
                              <span className="text-gray-500">
                                · {item.read_count}/{item.team_member_count} read
                              </span>
                            ) : undefined
                          }
                        />
                      </div>
                    </div>
                    {(canContribute && (canDeleteNotice || canDismissNotice)) && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="shrink-0 rounded-md bg-red-50 p-2 text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                        title={canDeleteNotice ? 'Remove notice for everyone' : 'Remove from my view'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!item.is_read ? (
                      <Button
                        type="button"
                        size="sm"
                        loading={deleting}
                        onClick={() => onMarkRead(item.id)}
                        className="min-h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 sm:flex-none"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Got it - mark as read
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleRead(item.id)}
                        className="min-h-10 rounded-lg px-4 text-sm font-medium text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
                      >
                        Mark as unread
                      </button>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
