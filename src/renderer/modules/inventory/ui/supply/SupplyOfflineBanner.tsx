import { WifiOff } from 'lucide-react';

export function SupplyOfflineBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Supply chain requires connection</p>
        <p className="mt-0.5 text-amber-800">
          Marketplace and purchase orders are online-only. Reconnect to browse catalogs, place orders, or fulfill stock.
        </p>
      </div>
    </div>
  );
}
