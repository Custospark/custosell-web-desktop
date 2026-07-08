import type { BoardMemberInput, PipelineBoardMember } from './pipelineTypes';
import { normalizeBoardMemberRole } from './boardRoleUtils';

export function membersFromBoard(members?: PipelineBoardMember[]): BoardMemberInput[] {
  return (members ?? []).map((m) => ({
    user_id: m.user_id,
    role: normalizeBoardMemberRole(m.role),
    name: m.user?.name,
  }));
}
