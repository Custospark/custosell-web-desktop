import type { ReactNode } from 'react';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cn } from '../../../../shared/utils/cn';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';
import { purchaseOrderStatusBadge } from './purchaseOrderBadges';

interface PurchaseOrderMobileCardProps {
  purchaseOrder: PurchaseOrder;
  partyLabel: string;
  partyName: string;
  actions?: ReactNode;
  onOpen?: () => void;
}

/** Card fallback for PO tables on viewports below `md`. */
export function PurchaseOrderMobileCard({
  purchaseOrder: po,
  partyLabel,
  partyName,
  actions,
  onOpen,
}: PurchaseOrderMobileCardProps) {
  return (
    <article
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-3 shadow-sm',
        onOpen && 'cursor-pointer active:bg-gray-50',
      )}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{po.po_number}</p>
          <p className="mt-0.5 truncate text-sm text-gray-600">
            <span className="text-gray-500">{partyLabel}: </span>
            {partyName}
          </p>
        </div>
        <div className="shrink-0">{purchaseOrderStatusBadge(po.status)}</div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-gray-100 pt-3">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(po.total_amount))}</p>
        </div>
        <div className="text-right">
          {po.invoice ? (
            <p className="text-xs text-gray-600">
              <span className="font-medium tabular-nums">{po.invoice.payments_count ?? 0}</span>
              {' '}payment{(po.invoice.payments_count ?? 0) === 1 ? '' : 's'}
            </p>
          ) : null}
          <p className="text-xs text-gray-500">{new Date(po.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {actions ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}
