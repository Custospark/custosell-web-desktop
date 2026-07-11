import { useState } from 'react';
import { Ban, TriangleAlert } from 'lucide-react';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import { useRejectPurchaseOrder } from '../../api/purchaseOrders/usePurchaseOrderQueries';
import type { PurchaseOrder } from '../../api/purchaseOrders/purchaseOrderTypes';

interface RejectPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function RejectPurchaseOrderModal({ purchaseOrder: po, isOpen, onClose }: RejectPurchaseOrderModalProps) {
  const rejectPo = useRejectPurchaseOrder();
  const [reason, setReason] = useState('');

  async function handleReject() {
    if (!reason.trim()) return;
    await rejectPo.mutateAsync({ id: po.id, rejection_reason: reason.trim() });
    setReason('');
    onClose();
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="sm">
      <div className="p-5 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <TriangleAlert className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center">Reject purchase order</h2>
        <div className="rounded-lg border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">{po.po_number}</p>
          <p className="text-xs text-red-600/80 mt-0.5">
            Buyer: {po.buyer_business?.name ?? `Business #${po.buyer_business_id}`}
          </p>
        </div>

        <p className="text-sm text-gray-600">
          This order will be rejected and the buyer will see your reason.
        </p>

        <div className="space-y-1">
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why you cannot fulfill this order…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={rejectPo.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleReject()}
            loading={rejectPo.isPending}
            disabled={!reason.trim() || rejectPo.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Ban className="w-4 h-4 mr-1.5" />
            Reject order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
