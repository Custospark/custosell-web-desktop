import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
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
  useUpdateBoardPoll,
  useVotePoll,
} from '../api/usePipelineCollaborationQueries';
import type { PipelinePoll } from '../api/pipelineTypes';
import { datetimeLocalToIso, toDatetimeLocalValue } from '../api/pollDateTimeUtils';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { BarChart3, Megaphone } from 'lucide-react';
import BoardNoticesTab from './BoardNoticesTab';
import BoardPollsTab, { type PollEditDraft, type ResultsVisibility } from './BoardPollsTab';

interface BoardCollaborationDrawerProps {
  boardId: number;
  canManage: boolean;
  canContribute?: boolean;
  open: boolean;
  initialTab?: Tab;
  onClose: () => void;
}

type Tab = 'notices' | 'polls';

export default function BoardCollaborationDrawer({
  boardId,
  canManage,
  canContribute = true,
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
  const updatePoll = useUpdateBoardPoll(boardId);
  const votePoll = useVotePoll(boardId);
  const removePollVote = useRemovePollVote(boardId);
  const deletePoll = useDeleteBoardPoll(boardId);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollClosesAt, setPollClosesAt] = useState('');
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>('team');
  const [editingPollId, setEditingPollId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<PollEditDraft | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadNotices = useMemo(
    () => announcements.filter((item) => !item.is_read),
    [announcements],
  );
  const pendingPolls = useMemo(
    () => polls.filter((poll) => !poll.user_has_voted && !poll.is_closed && poll.can_vote !== false),
    [polls],
  );

  const resetForms = () => {
    setNoticeTitle('');
    setNoticeBody('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollClosesAt('');
    setResultsVisibility('team');
    setEditingPollId(null);
    setEditDraft(null);
  };

  const startEditPoll = (poll: PipelinePoll) => {
    setEditingPollId(poll.id);
    setEditDraft({
      question: poll.question,
      options: (poll.options ?? []).map((option) => ({ id: option.id, label: option.label })),
      closesAt: toDatetimeLocalValue(poll.closes_at),
      resultsVisibility: poll.results_visibility ?? 'team',
    });
  };

  const cancelEditPoll = () => {
    setEditingPollId(null);
    setEditDraft(null);
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

      {!canContribute && (
        <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          You have viewer access - notices and polls are read-only. You can still mark notices as read to track what is new.
        </p>
      )}

      {tab === 'notices' && (
        <BoardNoticesTab
          currentUserId={user?.id}
          canManage={canManage}
          canContribute={canContribute}
          unreadCount={unreadNotices.length}
          markingAllRead={markingAllRead}
          loading={noticesShowLoading}
          notices={announcements}
          noticeTitle={noticeTitle}
          onNoticeTitleChange={setNoticeTitle}
          noticeBody={noticeBody}
          onNoticeBodyChange={setNoticeBody}
          posting={createAnnouncement.isPending}
          onPost={() => {
            void createAnnouncement.mutateAsync({
              title: noticeTitle.trim(),
              body: noticeBody.trim(),
              is_pinned: false,
            }).then(() => {
              setNoticeTitle('');
              setNoticeBody('');
            });
          }}
          onMarkAllRead={() => void markAllNoticesRead()}
          onMarkRead={(id) => void setAnnouncementRead.mutateAsync({ id, is_read: true })}
          onToggleRead={(id) => void setAnnouncementRead.mutateAsync({ id, is_read: false })}
          onDelete={(id) => void deleteAnnouncement.mutate(id)}
          deleting={deleteAnnouncement.isPending}
        />
      )}

      {tab === 'polls' && (
        <BoardPollsTab
          currentUserId={user?.id}
          canManage={canManage}
          canContribute={canContribute}
          pendingCount={pendingPolls.length}
          loading={pollsShowLoading}
          polls={polls}
          question={pollQuestion}
          onQuestionChange={setPollQuestion}
          options={pollOptions}
          onOptionsChange={setPollOptions}
          closesAt={pollClosesAt}
          onClosesAtChange={setPollClosesAt}
          resultsVisibility={resultsVisibility}
          onResultsVisibilityChange={setResultsVisibility}
          creating={createPoll.isPending}
          onCreate={() => {
            const closesAt = datetimeLocalToIso(pollClosesAt);
            void createPoll.mutateAsync({
              question: pollQuestion.trim(),
              options: pollOptions.map((o) => o.trim()).filter(Boolean),
              results_visibility: resultsVisibility,
              closes_at: closesAt,
            }).then(() => {
              setPollQuestion('');
              setPollOptions(['', '']);
              setPollClosesAt('');
              setResultsVisibility('team');
            });
          }}
          onStartEdit={startEditPoll}
          onCancelEdit={cancelEditPoll}
          editingPollId={editingPollId}
          editDraft={editDraft}
          onDraftChange={setEditDraft}
          savingEdit={updatePoll.isPending}
          onSaveEdit={() => {
            if (!editDraft) return;
            void updatePoll.mutateAsync({
              pollId: editingPollId!,
              question: editDraft.question.trim(),
              options: editDraft.options
                .map((o) => ({ id: o.id, label: o.label.trim() }))
                .filter((o) => o.label),
              closes_at: editDraft.closesAt ? datetimeLocalToIso(editDraft.closesAt) ?? null : null,
              results_visibility: editDraft.resultsVisibility,
            }).then(() => cancelEditPoll());
          }}
          onVote={(pollId, optionId) => void votePoll.mutateAsync({ pollId, optionId })}
          onRemoveVote={(pollId) => void removePollVote.mutateAsync({ pollId })}
          onDeletePoll={(pollId) => void deletePoll.mutate(pollId)}
          voting={votePoll.isPending}
          removingVote={removePollVote.isPending}
        />
      )}
    </Modal>
  );
}
