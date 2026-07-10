import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { DocumentUserRef } from '../api/documentTypes';

interface DocumentMemberStackProps {
  members?: DocumentUserRef[];
  max?: number;
  className?: string;
}

export function DocumentMemberStack({ members = [], max = 3, className }: DocumentMemberStackProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className={className ?? 'flex items-center -space-x-2'}>
      {visible.map((member) => (
        <UserAvatar
          key={member.id}
          name={member.name}
          avatar={member.avatar}
          size="xs"
          title={member.name}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-700 ring-2 ring-white">
          +{overflow}
        </span>
      )}
    </div>
  );
}
