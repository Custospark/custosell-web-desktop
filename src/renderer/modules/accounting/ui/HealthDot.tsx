import { cn } from '../../../shared/utils/cn';
import type { HealthStatus } from './ratioTypes';

export function HealthDot({ status }: { status: HealthStatus }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full inline-block shrink-0',
        status === 'healthy' && 'bg-green-500',
        status === 'warning' && 'bg-amber-400',
        status === 'danger' && 'bg-red-500',
      )}
    />
  );
}
