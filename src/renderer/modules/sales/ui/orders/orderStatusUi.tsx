import { Ban, CircleCheck, Clock, FileText, LayoutList } from 'lucide-react';
import { Badge } from '../../../../shared/components/badges/Badge';
import type { OrderStatus } from '../../api/orders/orderTypes';

export const ORDER_STATUS_TABS: {
  id: OrderStatus | 'all';
  label: string;
  icon: typeof LayoutList;
}[] = [
  { id: 'all', label: 'All', icon: LayoutList },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CircleCheck },
  { id: 'invoiced', label: 'Invoiced', icon: FileText },
  { id: 'cancelled', label: 'Cancelled', icon: Ban },
];

export function orderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'open':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3" /> Open
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" className="gap-1">
          <CircleCheck className="w-3 h-3" /> Completed
        </Badge>
      );
    case 'invoiced':
      return (
        <Badge variant="primary" className="gap-1">
          <FileText className="w-3 h-3" /> Invoiced
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="danger" className="gap-1">
          <Ban className="w-3 h-3" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
