import { MapPin } from 'lucide-react';
import { cn } from '../../../../shared/utils/cn';

interface DeliveryPopoverProps {
  address?: string | null;
  city?: string | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function DeliveryPopover({ address, city, open, onToggle, onClose }: DeliveryPopoverProps) {
  const hasDelivery = Boolean(address || city);

  if (!hasDelivery) {
    return (
      <span className="text-xs text-gray-400">—</span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 hover:underline"
      >
        <MapPin className="h-3 w-3" />
        {city || 'View'}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div
            className={cn(
              'absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg',
            )}
          >
            <p className="text-xs font-semibold text-slate-900">Delivery details</p>
            {address ? (
              <p className="mt-1 text-xs text-slate-700">
                <span className="font-medium">Address:</span> {address}
              </p>
            ) : null}
            {city ? (
              <p className="mt-0.5 text-xs text-slate-700">
                <span className="font-medium">City:</span> {city}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
