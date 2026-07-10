import { UserAvatar } from '../../../shared/components/UserAvatar';
import { truncateDisplayName } from '../api/documentDisplayUtils';
import type { DocumentUserRef } from '../api/documentTypes';

interface ExplorerRowOwnerProps {
  user?: DocumentUserRef | null;
  className?: string;
}

/** Compact avatar + name shown inline after explorer file/folder labels. */
export function ExplorerRowOwner({ user, className }: ExplorerRowOwnerProps) {
  if (!user?.name && !user?.avatar) return null;

  const name = user.name ?? 'Team member';
  const firstName = name.trim().split(/\s+/)[0] || name;
  const shortName = truncateDisplayName(firstName, 10);

  return (
    <span
      className={className ?? 'inline-flex shrink-0 items-center gap-1 text-[10px] text-gray-500'}
      title={name}
    >
      <UserAvatar
        name={name}
        avatar={user.avatar}
        size="xs"
        className="!h-4 !w-4 !text-[8px] ring-1 ring-white"
        title={name}
      />
      <span className="max-w-[2.75rem] truncate font-medium text-gray-600">{shortName}</span>
    </span>
  );
}
