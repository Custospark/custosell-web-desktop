import { OnlineOnlyModuleBanner } from '../../../../shared/components/layout/OnlineOnlyModuleBanner';

/** Prefer Main's OnlineOnlyModuleBanner for route pages; kept for settings supply card. */
export function SupplyOfflineBanner() {
  return (
    <OnlineOnlyModuleBanner
      title="Supply chain requires connection"
      message="Marketplace and purchase orders are online-only. Reconnect to browse catalogs, place orders, or fulfill stock."
    />
  );
}
