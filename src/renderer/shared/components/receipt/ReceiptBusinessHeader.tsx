/* eslint-disable react-refresh/only-export-components -- header + useReceiptBusiness hook */
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useBusiness } from '../../../modules/settings/api/settings/BusinessQueries';

/** Minimal business snapshot for receipt/invoice letterheads (issuer may differ from viewer). */
export interface ReceiptBusinessSnapshot {
  id?: number;
  name?: string | null;
  description?: string | null;
  business_phone?: string | null;
  phone?: string | null;
  business_email?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  currency?: string | null;
  receipt_footer?: string | null;
}

interface ReceiptBusinessHeaderProps {
  subtitle: string;
  /** When set (e.g. supplier invoice viewed by buyer), letterhead uses the issuer - not the logged-in business. */
  business?: ReceiptBusinessSnapshot | null;
}

export default function ReceiptBusinessHeader({ subtitle, business: businessOverride }: ReceiptBusinessHeaderProps) {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: businessFromQuery } = useBusiness();
  const business = businessOverride ?? businessFromQuery ?? authUser?.business ?? null;
  const businessName = business?.name ?? authUser?.business_name ?? 'CUSTOSELL';
  const location = [business?.address, business?.city || business?.state, business?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="text-center mb-3">
      <h2 className="text-base font-bold text-gray-900 uppercase">{businessName.toUpperCase()}</h2>
      {business?.description && <p className="text-xs text-gray-500 mt-0.5">{business.description}</p>}
      {(business?.business_phone || business?.phone || (!businessOverride && authUser?.phone)) && (
        <p className="text-xs text-gray-500 mt-0.5">
          Call/WhatsApp: {business?.business_phone || business?.phone || authUser?.phone}
        </p>
      )}
      {(business?.business_email || business?.email) && (
        <p className="text-xs text-gray-500">{business?.business_email || business?.email}</p>
      )}
      {location && <p className="text-xs text-gray-400 mt-0.5">{location}</p>}
      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1.5">{subtitle}</p>
    </div>
  );
}

export function useReceiptBusiness(override?: ReceiptBusinessSnapshot | null) {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: businessFromQuery } = useBusiness();
  return override ?? businessFromQuery ?? authUser?.business ?? null;
}
