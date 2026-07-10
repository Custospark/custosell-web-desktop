import { Link } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canAccessModule, canViewFullHr } from '../../../shared/utils/moduleAccess';
import { cn } from '../../../shared/utils/cn';

interface EvaluateStaffPerformanceLinkProps {
  userId: number | null | undefined;
  className?: string;
  /** When true, only show for full HR (managers evaluating others). */
  requireFullHr?: boolean;
  label?: string;
}

/** Deep-link into HR Talent work performance for a Pipeline/Projects assignee. */
export function EvaluateStaffPerformanceLink({
  userId,
  className,
  requireFullHr = true,
  label = 'Evaluate performance',
}: EvaluateStaffPerformanceLinkProps) {
  const user = useAppSelector((s) => s.auth.user);
  if (!userId || !canAccessModule(user, 'hr')) return null;
  if (requireFullHr && !canViewFullHr(user)) return null;
  if (!requireFullHr && userId !== user?.id && !canViewFullHr(user)) return null;

  return (
    <Link
      to={`${ROUTES.HR.TALENT}?user_id=${userId}`}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline',
        className,
      )}
    >
      <Gauge className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
