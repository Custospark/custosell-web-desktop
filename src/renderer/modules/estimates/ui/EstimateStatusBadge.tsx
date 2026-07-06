import { cn } from '../../../shared/utils/cn';
import type { EstimateStatus } from '../api/estimateTypes';

const STATUS_STYLES: Record<EstimateStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  approved: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  expired: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  converted: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
};

const STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted',
};

interface EstimateStatusBadgeProps {
  status: EstimateStatus;
  className?: string;
}

export default function EstimateStatusBadge({ status, className }: EstimateStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function isEstimateExpired(validUntil: string | null, status: EstimateStatus): boolean {
  if (!validUntil || status === 'approved' || status === 'converted' || status === 'rejected') return false;
  const due = new Date(validUntil);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export function displayEstimateStatus(
  status: EstimateStatus,
  validUntil: string | null,
): EstimateStatus {
  if (isEstimateExpired(validUntil, status) && status !== 'expired') return 'expired';
  return status;
}
