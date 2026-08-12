import type { PipelineVisibility } from '../api/pipelineTypes';
import { BOARD_ROLE_BADGE_CLASS, BOARD_ROLE_LABELS, type BoardMemberRole } from '../api/boardRoleUtils';
import { PIPELINE_VISIBILITY_META } from './pipelineBoardMeta';
import { cn } from '../../../shared/utils/cn';

interface BoardAccessBadgesProps {
  visibility: PipelineVisibility;
  memberRole?: BoardMemberRole | null;
  className?: string;
}

export default function BoardAccessBadges({ visibility, memberRole, className }: BoardAccessBadgesProps) {
  const vis = PIPELINE_VISIBILITY_META[visibility];

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {memberRole && (
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
            BOARD_ROLE_BADGE_CLASS[memberRole],
          )}
        >
          {BOARD_ROLE_LABELS[memberRole]}
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          vis.className,
        )}
      >
        <vis.icon className="h-3 w-3" aria-hidden />
        {vis.label}
      </span>
    </div>
  );
}
