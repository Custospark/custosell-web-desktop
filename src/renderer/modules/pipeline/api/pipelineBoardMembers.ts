import type { BoardMemberInput, PipelineBoardMember } from './pipelineTypes';

export function membersFromBoard(members?: PipelineBoardMember[]): BoardMemberInput[] {
  return (members ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    name: m.user?.name,
  }));
}
