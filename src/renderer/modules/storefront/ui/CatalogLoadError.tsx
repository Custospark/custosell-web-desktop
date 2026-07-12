import { RefreshCw } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { marketplaceGlassPanel } from '../../inventory/ui/marketplace/marketplaceTheme';

interface CatalogLoadErrorProps {
  title: string;
  detail?: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}

/** Centered catalog failure with an explicit Retry action. */
export function CatalogLoadError({
  title,
  detail = 'Check your connection, then try again.',
  onRetry,
  retrying,
  className,
  compact,
}: CatalogLoadErrorProps) {
  return (
    <div
      className={cn(
        marketplaceGlassPanel,
        compact
          ? 'flex flex-wrap items-center justify-between gap-2 px-3 py-2.5'
          : 'mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <div className={cn(!compact && 'space-y-1')}>
        <p className={cn('font-semibold text-slate-900', compact ? 'text-sm' : 'text-base')}>{title}</p>
        <p className={cn('text-slate-600', compact ? 'text-xs' : 'text-sm')}>{detail}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        loading={retrying}
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
