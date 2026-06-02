import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)} role="status">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  );
}
