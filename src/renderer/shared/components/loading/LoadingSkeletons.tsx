import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ShimmerProps {
  className?: string;
  delay?: number;
}

function Shimmer({ className, delay = 0 }: ShimmerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-gray-200 ${className ?? ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"
        style={{ backgroundSize: '200% 100%' }}
      />
    </div>
  );
}

interface LoadingSkeletonProps {
  variant?: 'default' | 'dashboard' | 'table' | 'card' | 'list' | 'minimal' | 'page';
  message?: string;
  detail?: string;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'default',
  message,
  detail,
  className,
}: LoadingSkeletonProps) {
  if (variant === 'page') {
    return (
      <div
        className={cn(
          'flex min-h-[min(60vh,28rem)] w-full flex-col items-center justify-center gap-5 px-6 py-12 text-center',
          className,
        )}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          className="h-12 w-12 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin"
          aria-hidden
        />
        <div className="max-w-sm space-y-1.5">
          <p className="text-base font-semibold text-slate-900">{message ?? 'Loading…'}</p>
          <p className="text-sm text-slate-600">
            {detail ?? 'Hang tight - this usually takes just a moment.'}
          </p>
        </div>
        <div className="grid w-full max-w-sm grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-16 rounded-xl" delay={i * 80} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={cn('p-6 space-y-6', className)} role="status" aria-busy="true">
        <div className="flex items-center justify-between">
          <Shimmer className="h-8 w-48 rounded-lg" />
          <Shimmer className="h-10 w-32 rounded-lg" delay={100} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 space-y-3 border border-gray-100" style={{ animationDelay: `${i * 50}ms` }}>
              <Shimmer className="h-10 w-10 rounded-lg" delay={i * 100} />
              <Shimmer className="h-8 w-24 rounded" delay={i * 100 + 50} />
              <Shimmer className="h-3 w-32 rounded" delay={i * 100 + 100} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 space-y-4 border border-gray-100">
              <Shimmer className="h-6 w-40 rounded" delay={i * 100} />
              <Shimmer className="h-48 w-full rounded-lg" delay={i * 100 + 100} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('p-6 space-y-4', className)} role="status" aria-busy="true">
        <div className="flex items-center justify-between">
          <Shimmer className="h-8 w-40 rounded-lg" />
          <Shimmer className="h-10 w-28 rounded-lg" delay={50} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (<Shimmer key={i} className="h-4 rounded" delay={i * 30} />))}
            </div>
          </div>
          {[...Array(5)].map((_, row) => (
            <div key={row} className="p-4 border-b border-gray-50 last:border-0">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, col) => (<Shimmer key={col} className="h-4 rounded" delay={row * 30 + col * 15} />))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('p-6 space-y-6', className)} role="status" aria-busy="true">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <Shimmer className="h-32 w-full" delay={i * 50} />
              <div className="p-4 space-y-2">
                <Shimmer className="h-5 w-3/4 rounded" delay={i * 50 + 25} />
                <Shimmer className="h-3 w-full rounded" delay={i * 50 + 50} />
                <Shimmer className="h-3 w-2/3 rounded" delay={i * 50 + 75} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('p-4 space-y-2', className)} role="status" aria-busy="true">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Shimmer className="h-10 w-10 rounded-lg flex-shrink-0" delay={i * 30} />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-4 w-3/4 rounded" delay={i * 30 + 15} />
              <Shimmer className="h-3 w-1/2 rounded" delay={i * 30 + 30} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('inline-flex items-center gap-2 py-2', className)} role="status" aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        {message && <span className="text-sm text-gray-500">{message}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)} role="status" aria-busy="true">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
      </div>
      {message && <p className="mt-4 text-sm text-gray-500">{message}</p>}
    </div>
  );
}
