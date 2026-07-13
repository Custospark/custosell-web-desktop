import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import { cn } from '../../../../shared/utils/cn';

export type SlugCheckStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'own';

export interface ShopUsernameFieldProps {
  slug: string;
  disabled?: boolean;
  checkStatus: SlugCheckStatus;
  hint: string | null;
  checkPending: boolean;
  onSlugChange: (next: string) => void;
  onCheck: () => void;
  onBlurCheck: () => void;
}

/** Shop username input + Check button + availability status. */
export function ShopUsernameField({
  slug,
  disabled,
  checkStatus,
  hint,
  checkPending,
  onSlugChange,
  onCheck,
  onBlurCheck,
}: ShopUsernameFieldProps) {
  const canCheck = Boolean(slug.trim()) && !disabled && checkStatus !== 'checking';

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="shop_slug">
        Shop username
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-sm text-gray-500" aria-hidden>
            @
          </span>
          <input
            id="shop_slug"
            className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:min-h-0 sm:py-2 sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={slug}
            disabled={disabled}
            onChange={(e) =>
              onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            onBlur={onBlurCheck}
            placeholder="your-shop-name"
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canCheck || checkPending}
          loading={checkPending}
          className="w-full shrink-0 sm:w-auto sm:self-stretch"
          onClick={onCheck}
        >
          Check username
        </Button>
      </div>
      {hint ? (
        <p
          className={cn(
            'mt-1.5 flex items-start gap-1.5 text-xs leading-snug sm:items-center',
            checkStatus === 'available' || checkStatus === 'own'
              ? 'text-emerald-700'
              : checkStatus === 'unavailable'
                ? 'text-amber-800'
                : checkStatus === 'checking'
                  ? 'text-gray-500'
                  : 'text-gray-600',
          )}
          role="status"
        >
          <span className="mt-0.5 shrink-0 sm:mt-0">
            {checkStatus === 'checking' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {checkStatus === 'available' || checkStatus === 'own' ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            ) : null}
            {checkStatus === 'unavailable' ? <XCircle className="h-3.5 w-3.5" aria-hidden /> : null}
          </span>
          <span className="min-w-0 break-words">{hint}</span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-snug text-gray-500">
          Check that your username is available before saving.
        </p>
      )}
    </div>
  );
}
