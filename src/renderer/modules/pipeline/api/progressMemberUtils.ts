import type { BoardProgressMember } from './boardProgressTypes';
import type { PipelineBoard, PipelineBoardMember, PipelineUserRef } from './pipelineTypes';
import type { ProjectMember } from '../../estimates/api/projectTypes';

export function mapResourceMembersToProgress(members: PipelineUserRef[]): BoardProgressMember[] {
  return members.map((member) => ({
    user_id: member.id,
    name: member.name,
    avatar: member.avatar ?? null,
    metrics: {},
  }));
}

export function mapProjectMembersToProgress(members: ProjectMember[]): BoardProgressMember[] {
  return members.map((member) => ({
    user_id: member.user_id,
    name: member.user?.name ?? `User ${member.user_id}`,
    avatar: member.user?.avatar ?? null,
    metrics: {},
  }));
}

export function mapBoardMembersToProgress(members: PipelineBoardMember[]): BoardProgressMember[] {
  return members.map((member) => ({
    user_id: member.user_id,
    name: member.user?.name ?? `User ${member.user_id}`,
    avatar: member.user?.avatar ?? null,
    metrics: {},
  }));
}

/** Prefer resource API roster, then board/project members, then progress activity list. */
export function resolveTargetAssigneeMembers(options: {
  resourceMembers?: PipelineUserRef[];
  board?: Pick<PipelineBoard, 'members'> | null;
  projectMembers?: ProjectMember[];
  progressMembers?: BoardProgressMember[];
}): BoardProgressMember[] {
  const { resourceMembers, board, projectMembers, progressMembers = [] } = options;

  if (resourceMembers && resourceMembers.length > 0) {
    return mapResourceMembersToProgress(resourceMembers);
  }

  if (projectMembers && projectMembers.length > 0) {
    return mapProjectMembersToProgress(projectMembers);
  }

  if (board?.members && board.members.length > 0) {
    return mapBoardMembersToProgress(board.members);
  }

  return progressMembers;
}
