import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { cn } from '../../../shared/utils/cn';
import {
  useBoardAnnouncements,
  useBoardPolls,
  useCreateBoardAnnouncement,
  useCreateBoardPoll,
  useDeleteBoardAnnouncement,
  useDeleteBoardPoll,
  useRemovePollVote,
  useSetAnnouncementRead,
  useVotePoll,
} from '../api/usePipelineCollaborationQueries';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { PipelineUserAttribution } from './pipelineUserAttribution';
import {
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Circle,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';

interface BoardCollaborationDrawerProps {
  boardId: number;
  canManage: boolean;
  open: boolean;
  initialTab?: Tab;
  onClose: () => void;
}

type Tab = 'notices' | 'polls';
type ResultsVisibility = 'team' | 'creator_only';

function CollaborationLoading() {
  return (
    <div className="flex justify-center py-12">
      <LoadingSpinner />
    </div>
  );
}

export default function BoardCollaborationDrawer({
  boardId,
  canManage,
  open,
  initialTab = 'notices',
  onClose,
}: BoardCollaborationDrawerProps) {
  const user = useAppSelector((s) => s.auth.user);
  const [tab, setTab] = useState<Tab>(initialTab);
  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    isFetching: announcementsFetching,
  } = useBoardAnnouncements(boardId, open);
  const {
    data: polls = [],
    isLoading: pollsLoading,
    isFetching: pollsFetching,
  } = useBoardPolls(boardId, undefined, open);
  const createAnnouncement = useCreateBoardAnnouncement(boardId);
  const deleteAnnouncement = useDeleteBoardAnnouncement(boardId);
  const setAnnouncementRead = useSetAnnouncementRead(boardId);
  const createPoll = useCreateBoardPoll(boardId);
  const votePoll = useVotePoll(boardId);
  const removePollVote = useRemovePollVote(boardId);
  const deletePoll = useDeleteBoardPoll(boardId);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>('team');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadNotices = useMemo(
    () => announcements.filter((item) => !item.is_read),
    [announcements],
  );
  const pendingPolls = useMemo(
    () => polls.filter((poll) => !poll.user_has_voted),
    [polls],
  );

  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => Number(a.is_read) - Number(b.is_read)),
    [announcements],
  );

  const sortedPolls = useMemo(
    () =>
      [...polls].sort((a, b) => {
        const pendingDiff = Number(a.user_has_voted) - Number(b.user_has_voted);
        if (pendingDiff !== 0) return pendingDiff;
        const votesA = a.total_votes ?? 0;
        const votesB = b.total_votes ?? 0;
        return votesB - votesA;
      }),
    [polls],
  );

  const resetForms = () => {
    setNoticeTitle('');
    setNoticeBody('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setResultsVisibility('team');
  };

  const markNoticeRead = (id: number) => {
    void setAnnouncementRead.mutateAsync({ id, is_read: true });
  };

  const markAllNoticesRead = async () => {
    if (unreadNotices.length === 0) return;
    setMarkingAllRead(true);
    try {
      await Promise.all(
        unreadNotices.map((item) => setAnnouncementRead.mutateAsync({ id: item.id, is_read: true })),
      );
    } finally {
      setMarkingAllRead(false);
    }
  };

  const noticesShowLoading = announcementsLoading || (announcementsFetching && announcements.length === 0);
  const pollsShowLoading = pollsLoading || (pollsFetching && polls.length === 0);

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
          {unreadNotices.length > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {unreadNotices.length > 9 ? '9+' : unreadNotices.length}
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
          {pendingPolls.length > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
              {pendingPolls.length > 9 ? '9+' : pendingPolls.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'notices' && (
        <div className="space-y-4">
          {unreadNotices.length > 0 && !noticesShowLoading && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                {unreadNotices.length} unread notice{unreadNotices.length === 1 ? '' : 's'}
              </p>
              <Button
                type="button"
                size="sm"
                loading={markingAllRead}
                onClick={() => void markAllNoticesRead()}
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

          {noticesShowLoading ? (
            <CollaborationLoading />
          ) : (
            <ul className="max-h-[min(50vh,400px)] space-y-3 overflow-y-auto pr-1">
              {sortedAnnouncements.length === 0 ? (
                <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                  No board notices yet.
                </li>
              ) : (
                sortedAnnouncements.map((item) => {
                  const showReadStats = canManage || item.created_by === user?.id;
                  const canDeleteNotice = item.can_delete ?? (canManage || item.created_by === user?.id);
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
                        {canDeleteNotice && (
                          <button
                            type="button"
                            onClick={() => void deleteAnnouncement.mutate(item.id)}
                            className="shrink-0 rounded-md bg-red-50 p-2 text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                            title="Remove notice for everyone"
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
                            loading={setAnnouncementRead.isPending}
                            onClick={() => markNoticeRead(item.id)}
                            className="min-h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 sm:flex-none"
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Got it — mark as read
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void setAnnouncementRead.mutateAsync({ id: item.id, is_read: false })}
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
      )}

      {tab === 'polls' && (
        <div className="space-y-4">
          {pendingPolls.length > 0 && !pollsShowLoading && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              <span className="font-semibold">Tap any option to vote instantly.</span>
              {' '}No extra submit step needed.
            </div>
          )}

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

          {pollsShowLoading ? (
            <CollaborationLoading />
          ) : (
            <ul className="max-h-[min(50vh,400px)] space-y-4 overflow-y-auto pr-1">
              {sortedPolls.length === 0 ? (
                <li className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
                  No polls on this board yet.
                </li>
              ) : (
                sortedPolls.map((poll) => {
                  const canSeeResults = poll.can_see_results ?? true;
                  const totalVotes = poll.total_votes ?? poll.votes?.length ?? 0;
                  const myVotes = new Set(
                    (poll.votes ?? []).filter((v) => v.user_id === user?.id).map((v) => v.option_id),
                  );
                  const canManagePoll = poll.can_manage_poll ?? (poll.created_by === user?.id || canManage);
                  const needsVote = !poll.user_has_voted;
                  const canRemoveOwnVote = poll.can_remove_own_vote ?? poll.user_has_voted;

                  return (
                    <li
                      key={poll.id}
                      className={cn(
                        'rounded-xl border bg-white p-4 shadow-sm',
                        needsVote ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-200',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-gray-900">{poll.question}</h3>
                          <div className="mt-1.5">
                            <PipelineUserAttribution
                              user={poll.creator}
                              timestamp={poll.created_at}
                              suffix={
                                canSeeResults ? (
                                  <span className="text-gray-500">
                                    · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                                  </span>
                                ) : poll.results_visibility === 'creator_only' ? (
                                  <span className="text-violet-600">· Results hidden from team</span>
                                ) : undefined
                              }
                            />
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {needsVote ? (
                            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                              Your vote
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Voted
                            </span>
                          )}
                          {canManagePoll && (
                            <button
                              type="button"
                              onClick={() => void deletePoll.mutate(poll.id)}
                              className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                            >
                              Delete poll
                            </button>
                          )}
                        </div>
                      </div>

                      {needsVote && (
                        <p className="mt-2 text-sm font-medium text-violet-800">
                          Choose one option — your vote saves immediately.
                        </p>
                      )}

                      {canRemoveOwnVote && !needsVote && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => void removePollVote.mutateAsync({ pollId: poll.id })}
                            disabled={removePollVote.isPending}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Remove my vote
                          </button>
                        </div>
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
                                'relative flex min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.99]',
                                voted
                                  ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                                  : needsVote
                                    ? 'border-violet-200 bg-white text-gray-800 hover:border-violet-400 hover:bg-violet-50'
                                    : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:border-violet-200 hover:bg-violet-50/40',
                              )}
                            >
                              {canSeeResults && (
                                <div
                                  className="absolute inset-y-0 left-0 bg-violet-100/60"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                              <span className="relative shrink-0">
                                {voted ? (
                                  <CheckCircle2 className="h-5 w-5 text-violet-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300" />
                                )}
                              </span>
                              <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                                <span className="truncate">{option.label}</span>
                                {canSeeResults ? (
                                  <span className="shrink-0 text-xs font-semibold text-gray-600">
                                    {count} · {pct}%
                                  </span>
                                ) : voted ? (
                                  <span className="shrink-0 text-xs font-semibold text-violet-600">Your pick</span>
                                ) : needsVote ? (
                                  <span className="shrink-0 text-xs font-semibold text-violet-500">Tap to vote</span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {canManagePoll && (poll.participants?.length ?? 0) > 0 && (
                        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            <Users className="h-3.5 w-3.5" />
                            Team participation
                          </p>
                          <ul className="space-y-2">
                            {poll.participants!.map((participant) => (
                              <li
                                key={participant.user.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <UserAvatar
                                    name={participant.user.name ?? 'Team member'}
                                    avatar={participant.user.avatar}
                                    size="xs"
                                  />
                                  <span className="truncate font-medium text-gray-800">
                                    {participant.user.name ?? 'Team member'}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {participant.has_voted ? (
                                    <span className="text-violet-700">
                                      {participant.voted_option_label ?? 'Voted'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Not voted</span>
                                  )}
                                  {participant.has_voted && (
                                    <button
                                      type="button"
                                      title="Remove this member's vote"
                                      onClick={() => void removePollVote.mutateAsync({
                                        pollId: poll.id,
                                        userId: participant.user.id,
                                      })}
                                      className="rounded p-1 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
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
          )}
        </div>
      )}
    </Modal>
  );
}
