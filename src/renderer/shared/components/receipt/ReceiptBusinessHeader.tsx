import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useBusiness } from '../../../modules/settings/api/settings/BusinessQueries';

interface ReceiptBusinessHeaderProps {
  subtitle: string;
}

export default function ReceiptBusinessHeader({ subtitle }: ReceiptBusinessHeaderProps) {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: businessFromQuery } = useBusiness();
  const business = businessFromQuery ?? authUser?.business ?? null;
  const businessName = business?.name ?? authUser?.business_name ?? 'CUSTOSELL';
  const location = [business?.address, business?.city || business?.state, business?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="text-center mb-3">
      <h2 className="text-base font-bold text-gray-900 uppercase">{businessName.toUpperCase()}</h2>
      {business?.description && <p className="text-xs text-gray-500 mt-0.5">{business.description}</p>}
      {(business?.business_phone || business?.phone || authUser?.phone) && (
        <p className="text-xs text-gray-500 mt-0.5">
          Call/WhatsApp: {business?.business_phone || business?.phone || authUser?.phone}
        </p>
      )}
      {business?.business_email && <p className="text-xs text-gray-500">{business.business_email}</p>}
      {location && <p className="text-xs text-gray-400 mt-0.5">{location}</p>}
      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1.5">{subtitle}</p>
    </div>
  );
}

export function useReceiptBusiness() {
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: businessFromQuery } = useBusiness();
  return businessFromQuery ?? authUser?.business ?? null;
}
