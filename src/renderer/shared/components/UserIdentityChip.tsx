import { cn } from '../utils/cn';
import { shortDisplayName } from '../utils/userDisplayName';
import { UserAvatar } from './UserAvatar';

export interface UserIdentityChipProps {
  name: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
}

export function UserIdentityChip({
  name,
  avatar,
  size = 'xs',
  className,
  nameClassName,
}: UserIdentityChipProps) {
  const label = shortDisplayName(name);

  return (
    <span
      className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}
      title={name}
    >
      <UserAvatar name={name} avatar={avatar} size={size} />
      <span className={cn('truncate text-[11px] font-medium text-gray-700', nameClassName)}>
        {label}
      </span>
    </span>
  );
}
