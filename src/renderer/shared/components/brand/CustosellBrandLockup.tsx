import { cn } from '../../utils/cn';
import LogoImage from '../../assets/LogoImage';
import { TAGLINE } from '../../brand/custosellBrand';

interface CustosellBrandLockupProps {
  /** Show the tagline underneath the product name. */
  showTagline?: boolean;
  /** Stack the wordmark below the logo instead of beside it. */
  stacked?: boolean;
  logoSize?: 'sm' | 'md' | 'lg';
  nameClassName?: string;
  taglineClassName?: string;
  className?: string;
}

/**
 * Custosell product lockup — logo + gradient wordmark (+ optional tagline),
 * mirroring Custocare's `BrandName` treatment. Used in the sidebar header and
 * the top navbar so branding stays consistent.
 */
export function CustosellBrandLockup({
  showTagline = false,
  stacked = false,
  logoSize = 'sm',
  nameClassName,
  taglineClassName,
  className,
}: CustosellBrandLockupProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2',
        stacked && 'flex-col text-center',
        className,
      )}
    >
      <LogoImage size={logoSize} />
      <div className="min-w-0 leading-tight">
        <span
          className={cn(
            'block truncate font-bold text-blue-600',
            stacked && 'w-full',
            nameClassName,
          )}
        >
          Custosell
        </span>
        {showTagline && (
          <span
            className={cn(
              'block truncate text-[10px] font-semibold text-blue-600',
              taglineClassName,
            )}
          >
            {TAGLINE}
          </span>
        )}
      </div>
    </div>
  );
}
