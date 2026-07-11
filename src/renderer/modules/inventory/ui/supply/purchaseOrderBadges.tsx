import { Badge } from '../../../../shared/components/badges/Badge';
import type { PurchaseOrderStatus } from '../../api/purchaseOrders/purchaseOrderTypes';

export function purchaseOrderStatusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case 'draft':
      return <Badge variant="neutral">Draft</Badge>;
    case 'submitted':
      return <Badge variant="warning">Submitted</Badge>;
    case 'accepted':
      return <Badge variant="primary">Accepted</Badge>;
    case 'rejected':
      return <Badge variant="danger">Rejected</Badge>;
    case 'fulfilled':
      return <Badge variant="primary">Fulfilled</Badge>;
    case 'received':
      return <Badge variant="success">Received</Badge>;
    case 'cancelled':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
