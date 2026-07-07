import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import {
  useBoardAnnouncements,
  useBoardPolls,
  useCreateBoardAnnouncement,
  useCreateBoardPoll,
  useDeleteBoardAnnouncement,
  useVotePoll,
} from '../api/usePipelineCollaborationQueries';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { Bell, BarChart3, Megaphone, Pin, Plus, Trash2 } from 'lucide-react';

interface BoardCollaborationDrawerProps {
  boardId: number;
  canManage: boolean;
  open: boolean;
  onClose: () => void;
}

type Tab = 'notices' | 'polls';

export default function BoardCollaborationDrawer({
  boardId,
  canManage,
  open,
  onClose,
}: BoardCollaborationDrawerProps) {
  const user = useAppSelector((s) => s.auth.user);
  const [tab, setTab] = useState<Tab>('notices');
  const { data: announcements = [] } = useBoardAnnouncements(boardId, open);
  const { data: polls = [] } = useBoardPolls(boardId, undefined, open);
  const createAnnouncement = useCreateBoardAnnouncement(boardId);
  const deleteAnnouncement = useDeleteBoardAnnouncement(boardId);
  const createPoll = useCreateBoardPoll(boardId);
  const votePoll = useVotePoll(boardId);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const resetForms = () => {
    setNoticeTitle('');
    setNoticeBody('');
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        resetForms();
        onClose();
      }}
      title="Board collaboration"
      subtitle="Team notices, polls, and email alerts"
      size="lg"
    >
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setTab('notices')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'notices' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <Megaphone className="h-4 w-4" />
          Notices
        </button>
        <button
          type="button"
          onClick={() => setTab('polls')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'polls' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Polls
        </button>
      </div>

      {tab === 'notices' && (
        <div className="space-y-4">
          {canManage && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Post a board notice
              </p>
              <input
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="Notice title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Share an update with everyone on this board…"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
              />
              <Button
                type="button"
                size="sm"
                loading={createAnnouncement.isPending}
                disabled={!noticeTitle.trim() || !noticeBody.trim()}
                onClick={() => {
                  void createAnnouncement.mutateAsync({
                    title: noticeTitle.trim(),
                    body: noticeBody.trim(),
                    is_pinned: false,
                  }).then(() => {
                    setNoticeTitle('');
                    setNoticeBody('');
                  });
                }}
              >
                <Megaphone className="h-4 w-4 mr-1.5" />
                Send notice & email team
              </Button>
            </div>
          )}

          <ul className="max-h-[min(50vh,400px)] space-y-3 overflow-y-auto pr-1">
            {announcements.length === 0 ? (
              <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                No board notices yet.
              </li>
            ) : (
              announcements.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{item.body}</p>
                      <p className="mt-2 text-[11px] text-gray-400">
                        {item.creator?.name ?? 'Team'} · {item.created_at ? formatShiftDateTime(item.created_at) : ''}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => void deleteAnnouncement.mutate(item.id)}
                        className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {tab === 'polls' && (
        <div className="space-y-4">
          {canManage && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Create a poll
              </p>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll question"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[idx] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              ))}
              {pollOptions.length < 8 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-800 inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </button>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-4"
                loading={createPoll.isPending}
                disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                onClick={() => {
                  void createPoll.mutateAsync({
                    question: pollQuestion.trim(),
                    options: pollOptions.map((o) => o.trim()).filter(Boolean),
                  }).then(() => {
                    setPollQuestion('');
                    setPollOptions(['', '']);
                  });
                }}
              >
                Launch poll & notify team
              </Button>
            </div>
          )}

          <ul className="max-h-[min(50vh,400px)] space-y-3 overflow-y-auto pr-1">
            {polls.length === 0 ? (
              <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                No polls on this board yet.
              </li>
            ) : (
              polls.map((poll) => {
                const totalVotes = poll.votes?.length ?? 0;
                const myVotes = new Set(
                  (poll.votes ?? []).filter((v) => v.user_id === user?.id).map((v) => v.option_id),
                );
                return (
                  <li key={poll.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900">{poll.question}</h3>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {poll.creator?.name ?? 'Team'} · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                    </p>
                    <div className="mt-3 space-y-2">
                      {(poll.options ?? []).map((option) => {
                        const count = (poll.votes ?? []).filter((v) => v.option_id === option.id).length;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const voted = myVotes.has(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={votePoll.isPending}
                            onClick={() => void votePoll.mutateAsync({ pollId: poll.id, optionId: option.id })}
                            className={cn(
                              'relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                              voted
                                ? 'border-violet-300 bg-violet-50 text-violet-900'
                                : 'border-gray-200 hover:border-violet-200 hover:bg-violet-50/50',
                            )}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-violet-100/70"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="relative flex justify-between gap-2">
                              <span>{option.label}</span>
                              <span className="text-xs font-medium text-gray-500">{pct}%</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </Modal>
  );
}
