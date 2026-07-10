import type { CabinetVisibility, DocumentMemberRole } from '../api/documentTypes';
import { CABINET_VISIBILITY_META } from './cabinetMeta';
import { BOARD_ROLE_BADGE_CLASS, BOARD_ROLE_LABELS, normalizeBoardMemberRole } from '../../pipeline/api/boardRoleUtils';
import { cn } from '../../../shared/utils/cn';

interface CabinetAccessBadgesProps {
  visibility: CabinetVisibility;
  memberRole?: DocumentMemberRole | null;
  className?: string;
}

export default function CabinetAccessBadges({ visibility, memberRole, className }: CabinetAccessBadgesProps) {
  const vis = CABINET_VISIBILITY_META[visibility];
  const role = memberRole ? normalizeBoardMemberRole(memberRole) : null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          vis.className,
        )}
      >
        <vis.icon className="h-3 w-3" aria-hidden />
        {vis.label}
      </span>
      {role && (
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
            BOARD_ROLE_BADGE_CLASS[role],
          )}
        >
          {BOARD_ROLE_LABELS[role]}
        </span>
      )}
    </div>
  );
}
