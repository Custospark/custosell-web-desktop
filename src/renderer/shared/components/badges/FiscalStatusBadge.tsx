import { Badge } from './Badge';
import { normalizeFiscalStatus, type FiscalStatus } from './fiscalStatus';

const LABELS: Record<Exclude<FiscalStatus, 'none'>, string> = {
  pending: 'Fiscal pending',
  fiscalized: 'Fiscalized',
  failed: 'Fiscal failed',
};

const VARIANTS: Record<Exclude<FiscalStatus, 'none'>, 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  fiscalized: 'success',
  failed: 'danger',
};

interface FiscalStatusBadgeProps {
  status?: string | null;
  className?: string;
  /** When true, show nothing for `none` (default). */
  hideWhenNone?: boolean;
}

/** Read-only chip for URA EFRIS fiscalization state (no credentials). */
export function FiscalStatusBadge({
  status,
  className,
  hideWhenNone = true,
}: FiscalStatusBadgeProps) {
  const normalized = normalizeFiscalStatus(status);
  if (normalized === 'none' && hideWhenNone) return null;

  if (normalized === 'none') {
    return (
      <Badge variant="neutral" className={className}>
        Not fiscalized
      </Badge>
    );
  }

  return (
    <Badge variant={VARIANTS[normalized]} className={className}>
      {LABELS[normalized]}
    </Badge>
  );
}
