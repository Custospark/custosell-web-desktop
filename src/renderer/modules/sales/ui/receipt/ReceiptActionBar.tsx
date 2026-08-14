import { useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import { cn } from '../../../../shared/utils/cn';

export type ReceiptBarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  title?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Filled primary CTA (e.g. New sale / Done). */
  primary?: boolean;
};

const actionBtnClass = 'min-h-11 py-2.5 px-4 text-sm';

interface ReceiptActionBarProps {
  actions: ReceiptBarAction[];
  moreActions?: ReceiptBarAction[];
  className?: string;
}

/**
 * Shared receipt footer - Sale completed pattern:
 * primary row (Download PDF · Print · optional CTA) + More overflow for secondary.
 */
export function ReceiptActionBar({
  actions,
  moreActions = [],
  className,
}: ReceiptActionBarProps) {
  const [showMore, setShowMore] = useState(false);
  const hasMore = moreActions.length > 0;

  return (
    <div className={cn('no-print flex flex-wrap justify-center gap-2.5 sm:gap-3', className)}>
      {actions.map((a) => (
        <Button
          key={a.key}
          className={actionBtnClass}
          variant={a.primary ? 'primary' : 'outline'}
          onClick={a.onClick}
          title={a.title ?? a.label}
          loading={a.loading}
          disabled={a.disabled}
        >
          <span className="mr-1.5 inline-flex shrink-0">{a.icon}</span>
          {a.label}
        </Button>
      ))}

      {hasMore ? (
        <div className="relative">
          <Button
            className={actionBtnClass}
            variant="outline"
            onClick={() => setShowMore((p) => !p)}
            onBlur={() => setTimeout(() => setShowMore(false), 200)}
            title="More actions"
            aria-label="More actions"
            aria-expanded={showMore}
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" />
          </Button>

          {showMore ? (
            <div className="absolute bottom-full right-0 z-50 mb-2 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
              <div className="py-1">
                {moreActions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    disabled={a.disabled || a.loading}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    title={a.title ?? a.label}
                    onClick={() => {
                      a.onClick();
                      setShowMore(false);
                    }}
                  >
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-gray-500">
                      {a.icon}
                    </span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
