import type { ReactNode } from 'react';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import type { PipelineUserRef } from '../api/pipelineTypes';

interface PipelineUserAttributionProps {
  user?: PipelineUserRef | null;
  timestamp?: string;
  suffix?: ReactNode;
  className?: string;
}

export function PipelineUserAttribution({
  user,
  timestamp,
  suffix,
  className,
}: PipelineUserAttributionProps) {
  const name = user?.name ?? 'Team member';

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2 text-[11px] text-gray-500'}>
      <UserAvatar name={name} avatar={user?.avatar} size="xs" title={name} />
      <span className="font-medium text-gray-700">{name}</span>
      {timestamp && <span className="text-gray-400">· {formatShiftDateTime(timestamp)}</span>}
      {suffix}
    </div>
  );
}
