import { useMemo } from 'react';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { useBoardResourceMembers } from './usePipelineResourceQueries';
import { usePipelineKanban } from './usePipelineBoardQueries';
import type { PipelineUserRef } from './pipelineTypes';

/**
 * Resolves the full candidate roster for people-pickers, matching the Members
 * view (board creator + invited board members), with resource members and
 * business staff merged in, deduped by user id and sorted by name.
 */
export function usePipelineMemberRoster(boardId?: number): PipelineUserRef[] {
  const { data: staff = [] } = useStaff();
  const { data: kanbanBoard } = usePipelineKanban(boardId ?? 0);
  const { data: resourceMembers = [] } = useBoardResourceMembers(boardId ?? 0, Boolean(boardId));

  return useMemo(() => {
    const map = new Map<number, PipelineUserRef>();

    if (kanbanBoard) {
      if (kanbanBoard.creator) {
        map.set(kanbanBoard.creator.id, kanbanBoard.creator);
      }
      for (const member of kanbanBoard.members ?? []) {
        if (member.user) {
          map.set(member.user.id, member.user);
        } else if (member.user_id) {
          map.set(member.user_id, { id: member.user_id, name: `Member #${member.user_id}` });
        }
      }
    }

    for (const member of resourceMembers) {
      if (!map.has(member.id)) map.set(member.id, member);
    }

    for (const member of staff) {
      if (!map.has(member.id)) {
        map.set(member.id, {
          id: member.id,
          name: member.name,
          email: member.email ?? null,
          avatar: member.avatar ?? null,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [kanbanBoard, resourceMembers, staff]);
}