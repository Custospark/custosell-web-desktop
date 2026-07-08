import { useEffect, useRef } from 'react';
import type { PipelineBoard } from '../api/pipelineTypes';
import { useToast } from '../../../app/contexts/useToast';
import type { AuthUser } from '../../../app/store/slices/authSlice';
import { BOARD_ROLE_LABELS, type BoardMemberRole } from '../api/boardRoleUtils';
import { getSharedBoardMemberRole } from '../../../shared/utils/moduleAccess';
import { PIPELINE_VISIBILITY_META } from './pipelineBoardMeta';
import type { PipelineVisibility } from '../api/pipelineTypes';

type AccessSnapshot = {
  visibility: PipelineVisibility;
  role: BoardMemberRole | null;
  canContribute: boolean;
};

function boardAccessKey(board: PipelineBoard | undefined, user: AuthUser | null | undefined): string {
  if (!board || !user) return '';
  return [
    board.visibility,
    board.current_member_role ?? '',
    board.can_contribute ?? '',
    board.can_manage_settings ?? '',
    board.updated_at ?? '',
    board.members?.find((m) => m.user_id === user.id)?.role ?? '',
  ].join('|');
}

/**
 * Notifies the signed-in user when board visibility or their shared-board role
 * changes while they are viewing the board (access sync + kanban poll).
 */
export function useBoardAccessChangeNotice(
  board: PipelineBoard | undefined,
  user: AuthUser | null | undefined,
) {
  const { showToast } = useToast();
  const snapshotRef = useRef<AccessSnapshot | null>(null);
  const accessKey = boardAccessKey(board, user);

  useEffect(() => {
    if (!board || !user || !accessKey) return;

    const next: AccessSnapshot = {
      visibility: board.visibility,
      role: getSharedBoardMemberRole(user, board),
      canContribute: Boolean(board.can_contribute),
    };
    const prev = snapshotRef.current;

    if (prev) {
      if (prev.visibility !== next.visibility) {
        const from = PIPELINE_VISIBILITY_META[prev.visibility].label;
        const to = PIPELINE_VISIBILITY_META[next.visibility].label;
        showToast(
          'info',
          `Board visibility changed from ${from} to ${to}. Access and actions may have changed.`,
        );
      }

      if (board.visibility === 'shared' && prev.role && next.role && prev.role !== next.role) {
        showToast(
          'info',
          `Your role changed from ${BOARD_ROLE_LABELS[prev.role]} to ${BOARD_ROLE_LABELS[next.role]}.`,
        );
      } else if (
        board.visibility === 'shared'
        && !prev.canContribute
        && next.canContribute
        && prev.role === 'viewer'
      ) {
        showToast('info', 'You can now edit cards on this board.');
      } else if (
        board.visibility === 'shared'
        && prev.canContribute
        && !next.canContribute
        && next.role === 'viewer'
      ) {
        showToast('info', 'Your access is now view-only on this board.');
      }

      if (board.visibility === 'shared' && prev.role && !next.role && Number(board.created_by) !== user.id) {
        showToast(
          'warning',
          'You were removed from this shared board. You may lose access on the next refresh.',
        );
      }
    }

    snapshotRef.current = next;
  }, [accessKey, board, user, showToast]);
}
