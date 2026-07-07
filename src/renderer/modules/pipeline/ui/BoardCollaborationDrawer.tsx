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
  useSetAnnouncementRead,
  useVotePoll,
} from '../api/usePipelineCollaborationQueries';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import {
  BarChart3,
  Bell,
  Check,
  EyeOff,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

interface BoardCollaborationDrawerProps {
  boardId: number;
  canManage: boolean;
  open: boolean;
  onClose: () => void;
}

type Tab = 'notices' | 'polls';
type ResultsVisibility = 'team' | 'creator_only';

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
  const setAnnouncementRead = useSetAnnouncementRead(boardId);
  const createPoll = useCreateBoardPoll(boardId);
  const votePoll = useVotePoll(boardId);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>('team');

  const unreadNotices = announcements.filter((item) => !item.is_read).length;
  const pendingPolls = polls.filter((poll) => !poll.user_has_voted).length;

  const resetForms = () => {
    setNoticeTitle('');
    setNoticeBody('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setResultsVisibility('team');
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
            'relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'notices' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <Megaphone className="h-4 w-4" />
          Notices
          {unreadNotices > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {unreadNotices > 9 ? '9+' : unreadNotices}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('polls')}
          className={cn(
            'relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
            tab === 'polls' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Polls
          {pendingPolls > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
              {pendingPolls > 9 ? '9+' : pendingPolls}
            </span>
          )}
        </button>
      </div>

      {tab === 'notices' && (
        <div className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
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
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                <Megaphone className="mr-1.5 h-4 w-4" />
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
              announcements.map((item) => {
                const showReadStats = canManage || item.created_by === user?.id;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'rounded-xl border bg-white p-4 shadow-sm',
                      item.is_read ? 'border-gray-200' : 'border-amber-200 ring-1 ring-amber-100',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          {!item.is_read && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.body}</p>
                        <p className="mt-2 text-[11px] text-gray-400">
                          {item.creator?.name ?? 'Team'} · {item.created_at ? formatShiftDateTime(item.created_at) : ''}
                          {showReadStats && item.read_count != null && item.team_member_count != null && (
                            <span className="ml-2 text-gray-500">
                              · {item.read_count}/{item.team_member_count} read
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => void setAnnouncementRead.mutateAsync({ id: item.id, is_read: !item.is_read })}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1',
                            item.is_read
                              ? 'bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100'
                              : 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100',
                          )}
                          title={item.is_read ? 'Mark as unread' : 'Mark as read'}
                        >
                          {item.is_read ? <EyeOff className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          {item.is_read ? 'Unread' : 'Read'}
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => void deleteAnnouncement.mutate(item.id)}
                            className="inline-flex items-center justify-center rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {tab === 'polls' && (
        <div className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
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
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </button>
              )}
              <div className="rounded-lg border border-violet-200 bg-white/80 p-3">
                <p className="text-xs font-semibold text-violet-900">Results visible to</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setResultsVisibility('team')}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold ring-1',
                      resultsVisibility === 'team'
                        ? 'bg-violet-600 text-white ring-violet-600'
                        : 'bg-white text-gray-600 ring-gray-200 hover:bg-violet-50',
                    )}
                  >
                    All team members
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsVisibility('creator_only')}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold ring-1',
                      resultsVisibility === 'creator_only'
                        ? 'bg-violet-600 text-white ring-violet-600'
                        : 'bg-white text-gray-600 ring-gray-200 hover:bg-violet-50',
                    )}
                  >
                    Only me (poll creator)
                  </button>
                </div>
              </div>
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
                    results_visibility: resultsVisibility,
                  }).then(() => {
                    setPollQuestion('');
                    setPollOptions(['', '']);
                    setResultsVisibility('team');
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
                const canSeeResults = poll.can_see_results ?? true;
                const totalVotes = poll.total_votes ?? poll.votes?.length ?? 0;
                const myVotes = new Set(
                  (poll.votes ?? []).filter((v) => v.user_id === user?.id).map((v) => v.option_id),
                );
                const isCreator = poll.created_by === user?.id;

                return (
                  <li key={poll.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{poll.question}</h3>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {poll.creator?.name ?? 'Team'}
                          {canSeeResults && (
                            <> · {totalVotes} vote{totalVotes === 1 ? '' : 's'}</>
                          )}
                          {poll.results_visibility === 'creator_only' && (
                            <span className="ml-2 text-violet-600">· Results hidden from team</span>
                          )}
                        </p>
                      </div>
                      {!poll.user_has_voted && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                          Vote needed
                        </span>
                      )}
                    </div>

                    {poll.results_hidden && !poll.user_has_voted && (
                      <p className="mt-2 text-xs text-gray-500">
                        Results are only visible to the poll creator. Cast your vote to confirm your choice.
                      </p>
                    )}

                    <div className="mt-3 space-y-2">
                      {(poll.options ?? []).map((option) => {
                        const count = option.votes_count ?? (poll.votes ?? []).filter((v) => v.option_id === option.id).length;
                        const pct = canSeeResults && totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
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
                            {canSeeResults && (
                              <div
                                className="absolute inset-y-0 left-0 bg-violet-100/70"
                                style={{ width: `${pct}%` }}
                              />
                            )}
                            <span className="relative flex justify-between gap-2">
                              <span>{option.label}</span>
                              {canSeeResults ? (
                                <span className="text-xs font-medium text-gray-500">{pct}%</span>
                              ) : voted ? (
                                <span className="text-xs font-medium text-violet-600">Your vote</span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isCreator && (poll.participants?.length ?? 0) > 0 && (
                      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <Users className="h-3.5 w-3.5" />
                          Team participation
                        </p>
                        <ul className="space-y-1.5">
                          {poll.participants!.map((participant) => (
                            <li
                              key={participant.user.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="truncate font-medium text-gray-800">
                                {participant.user.name ?? 'Team member'}
                              </span>
                              {participant.has_voted ? (
                                <span className="shrink-0 text-violet-700">
                                  {participant.voted_option_label ?? 'Voted'}
                                </span>
                              ) : (
                                <span className="shrink-0 text-gray-400">Not voted</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
