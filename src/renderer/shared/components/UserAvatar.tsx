import { cn } from '../utils/cn';
import { avatarUrl } from '../utils/avatarUrl';

const sizeClasses = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
  title?: string;
}

export function UserAvatar({
  name,
  avatar,
  size = 'sm',
  className,
  title,
}: UserAvatarProps) {
  const src = avatarUrl(avatar);
  const label = title ?? name;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        title={label}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', sizeClasses[size], className)}
      />
    );
  }

  return (
    <span
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 font-semibold text-white ring-2 ring-white',
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  );
}
